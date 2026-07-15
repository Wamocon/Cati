import { NextRequest, NextResponse } from "next/server"
import { getUserProfile, isSupabaseConfigured } from "@/lib/auth"
import {
  OfflineRepositoryError,
  createOfflineCommand,
  isOfflineSafeCommandType,
  parseOfflineCommandReceipt,
  toOfflineCommandRpcArgs,
  toOfflineConflictResolutionRpcArgs,
  type OfflineCommandEnvelope,
  type OfflineQueueOwnerScope,
  type OfflineTicketCreatePayload,
  type OfflineTicketFieldNotePayload,
} from "@/lib/offline-sync-repository"
import { hasAnyPermission } from "@/lib/rbac"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type RecordValue = Record<string, unknown>
type RpcError = { code?: string; message: string }
type RpcResponse = { data: unknown; error: RpcError | null }
type RpcClient = { rpc(name: string, args?: object): Promise<RpcResponse> }

class InvalidRequest extends Error {}
function record(value: unknown): RecordValue { if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidRequest("body"); return value as RecordValue }
function string(value: unknown, field: string) { if (typeof value !== "string" || !value.trim()) throw new InvalidRequest(field); return value.trim() }
function integer(value: unknown, field: string, minimum = 1) { if (!Number.isSafeInteger(value) || Number(value) < minimum) throw new InvalidRequest(field); return Number(value) }
function json(value: unknown, status = 200) { const response = NextResponse.json(value, { status }); response.headers.set("Cache-Control", "no-store, private"); return response }
function first(value: unknown): unknown { return Array.isArray(value) ? value[0] : value }

async function envelopeFromBody(body: RecordValue, profile: NonNullable<Awaited<ReturnType<typeof getUserProfile>>>) {
  const commandType = body.commandType
  if (!isOfflineSafeCommandType(commandType)) throw new InvalidRequest("commandType")
  const payload = record(body.payload)
  if (!profile.company_id) throw new InvalidRequest("company")
  const ownerScope: OfflineQueueOwnerScope = { userId: profile.id, companyId: profile.company_id, role: profile.role }
  const common = { clientInstanceId: string(body.clientId, "clientId"), sequence: integer(body.sequence, "sequence"), ownerScope, idempotencyKey: string(body.idempotencyKey, "idempotencyKey") }
  if (commandType === "ticket.create") {
    const ticket: OfflineTicketCreatePayload = {
      siteId: string(payload.siteId, "siteId"), unitId: string(payload.unitId, "unitId"), title: string(payload.title, "title"),
      ...(typeof payload.description === "string" && payload.description.trim() ? { description: payload.description.trim() } : {}),
      category: string(payload.category, "category"), priority: payload.priority === "low" ? "low" : payload.priority === "high" ? "high" : "normal",
    }
    return createOfflineCommand({ ...common, commandType, payload: ticket })
  }
  const expectedVersion = integer(payload.expectedVersion ?? body.expectedVersion, "expectedVersion")
  const note: OfflineTicketFieldNotePayload = { ticketId: string(payload.ticketId, "ticketId"), body: string(payload.body, "noteBody"), visibility: "internal" }
  return createOfflineCommand({ ...common, commandType, expectedVersion, payload: note })
}

function receiptResponse(value: unknown) {
  const receipt = parseOfflineCommandReceipt(first(value))
  if (receipt.status === "applied" || receipt.status === "discarded") return json({ status: "succeeded", code: receipt.errorCode, commandId: receipt.commandId, resultEntityId: receipt.resultEntityId, resultVersion: receipt.resultVersion, replayed: receipt.replayed })
  if (receipt.status === "conflict") return json({ status: "conflict", code: receipt.errorCode ?? "VERSION_CONFLICT", commandId: receipt.commandId, serverVersion: receipt.serverVersion }, 409)
  if (receipt.status === "retryable") return json({ status: "retry", code: receipt.errorCode ?? "RETRYABLE", commandId: receipt.commandId, nextRetryAt: receipt.nextRetryAt }, 503)
  return json({ status: "rejected", code: receipt.errorCode ?? "REJECTED", commandId: receipt.commandId }, 422)
}

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return json({ error: { code: "OFFLINE_AUTH_REQUIRED", messageKey: "offline.authRequired" } }, 401)
  if (!hasAnyPermission(profile.role, "offline_sync", ["view"])) return json({ error: { code: "OFFLINE_FORBIDDEN", messageKey: "offline.forbidden" } }, 403)
  const base = { generatedAt: new Date().toISOString(), contexts: [] as Array<{ siteId: string; unitId: string; label: string }>, quality: { authoritativeReplay: false, sensitiveActionsBlockedOffline: true, queueRetentionHours: 72, queueLimit: 50 } }
  if (!isSupabaseConfigured()) return json({ ...base, source: "unavailable", warningCode: "OFFLINE_CONFIGURATION_UNAVAILABLE" })
  try {
    const supabase = await createClient()
    const [unitResult, receiptResult] = await Promise.all([
      supabase.from("units").select("id,site_id,unit_no").order("unit_no").limit(200),
      (supabase as unknown as RpcClient).rpc("list_my_offline_sync_receipts"),
    ])
    if (unitResult.error || receiptResult.error) return json({ ...base, source: "unavailable", warningCode: "OFFLINE_DATABASE_UNAVAILABLE" })
    const contexts = (unitResult.data ?? []).flatMap((unit) => typeof unit.id === "string" && typeof unit.site_id === "string" ? [{ siteId: unit.site_id, unitId: unit.id, label: typeof unit.unit_no === "string" ? unit.unit_no : unit.id.slice(0, 8) }] : [])
    return json({ ...base, source: "supabase", contexts, quality: { ...base.quality, authoritativeReplay: true } })
  } catch {
    return json({ ...base, source: "unavailable", warningCode: "OFFLINE_DATABASE_UNAVAILABLE" })
  }
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return json({ status: "rejected", code: "OFFLINE_AUTH_REQUIRED" }, 401)
  if (!hasAnyPermission(profile.role, "offline_sync", ["create", "manage"])) return json({ status: "rejected", code: "OFFLINE_FORBIDDEN" }, 403)
  if (!isSupabaseConfigured()) return json({ status: "retry", code: "OFFLINE_CONFIGURATION_UNAVAILABLE" }, 503)
  try {
    const body = record(await request.json())
    const headerKey = request.headers.get("Idempotency-Key")?.trim()
    if (!headerKey) throw new InvalidRequest("idempotencyKey")
    const supabase = (await createClient()) as unknown as RpcClient
    if (body.action === "resolve") {
      const command = await envelopeFromBody(body, profile)
      const resolution = body.resolution === "discard" ? "discard" : "retry_with_current"
      const conflicted: OfflineCommandEnvelope = { ...command, id: string(body.commandId, "commandId"), status: "conflict" }
      const args = await toOfflineConflictResolutionRpcArgs(conflicted, resolution, headerKey, resolution === "retry_with_current" ? integer(body.serverVersion, "serverVersion") : null)
      const result = await supabase.rpc("resolve_offline_sync_conflict_command", args)
      if (result.error) return json({ status: "retry", code: result.error.code ?? "OFFLINE_DATABASE_UNAVAILABLE" }, 503)
      return receiptResponse(result.data)
    }
    if (headerKey !== body.idempotencyKey) throw new InvalidRequest("idempotencyKey")
    const command = await envelopeFromBody(body, profile)
    const result = await supabase.rpc("execute_offline_sync_command", toOfflineCommandRpcArgs(command))
    if (result.error) return json({ status: "retry", code: result.error.code ?? "OFFLINE_DATABASE_UNAVAILABLE" }, 503)
    return receiptResponse(result.data)
  } catch (error) {
    if (error instanceof OfflineRepositoryError) return json({ status: "rejected", code: error.code }, error.code === "OFFLINE_COMMAND_NOT_ALLOWED" ? 403 : 422)
    if (error instanceof InvalidRequest || error instanceof SyntaxError) return json({ status: "rejected", code: "OFFLINE_REQUEST_INVALID" }, 400)
    return json({ status: "retry", code: "OFFLINE_DATABASE_UNAVAILABLE" }, 503)
  }
}
