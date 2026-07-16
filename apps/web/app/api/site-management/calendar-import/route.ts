import { NextRequest, NextResponse } from "next/server"
import { getUserProfile, isSupabaseConfigured } from "@/lib/auth"
import { IcsCalendarError, MAX_ICS_IMPORT_BYTES, previewIcsImport, sha256Hex } from "@/lib/ics-calendar"
import { hasAnyPermission } from "@/lib/rbac"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type RpcError = { code?: string; message: string }
type RpcResponse = { data: unknown; error: RpcError | null }
type RpcClient = { rpc(name: string, args?: Record<string, unknown>): Promise<RpcResponse> }
type Row = Record<string, unknown>

function rows(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [] }
function json(value: unknown, status = 200) { const response = NextResponse.json(value, { status }); response.headers.set("Cache-Control", "no-store, private"); return response }
function error(code: string, status: number, field?: string) { return json({ error: { code, messageKey: `calendar.${code}`, ...(field ? { field } : {}) } }, status) }

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return error("ICS_AUTH_REQUIRED", 401)
  if (!hasAnyPermission(profile.role, "calendar", ["manage", "approve"])) return error("ICS_FORBIDDEN", 403)
  if (!isSupabaseConfigured()) return error("ICS_CONFIGURATION_UNAVAILABLE", 503)

  try {
    const form = await request.formData()
    const file = form.get("file")
    const siteId = form.get("siteId")
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim()
    if (!(file instanceof File) || typeof siteId !== "string" || !siteId || !idempotencyKey || idempotencyKey.length < 8) {
      return error("ICS_REQUEST_INVALID", 400)
    }
    if (file.size > MAX_ICS_IMPORT_BYTES) return error("ICS_INPUT_TOO_LARGE", 413, "file")
    const input = await file.text()
    const parsed = previewIcsImport(input)
    const sourceDigest = await sha256Hex(input)
    const items = await Promise.all(parsed.events.map(async (item) => ({
      externalUid: item.uid,
      occurrenceKey: item.recurrenceId ?? "",
      sequence: item.sequence,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      status: item.status,
      contentDigest: await sha256Hex(JSON.stringify({
        key: item.canonicalKey, sequence: item.sequence, startsAt: item.startsAt,
        endsAt: item.endsAt, status: item.status,
      })),
    })))

    const supabase = (await createClient()) as unknown as RpcClient
    const batchResult = await supabase.rpc("preview_calendar_import_command", {
      p_site_id: siteId,
      p_source_digest: sourceDigest,
      p_file_name: file.name.slice(0, 255) || "calendar.ics",
      p_total_bytes: new TextEncoder().encode(input).byteLength,
      p_items: items,
      p_idempotency_key: idempotencyKey,
    })
    if (batchResult.error) return error(batchResult.error.code === "23505" ? "ICS_IMPORT_CONFLICT" : "ICS_DATABASE_UNAVAILABLE", batchResult.error.code === "23505" ? 409 : 503)
    const batch = rows(batchResult.data)[0]
    if (!batch || typeof batch.batch_id !== "string") return error("ICS_DATABASE_UNAVAILABLE", 503)
    const detailResult = await supabase.rpc("get_calendar_import_preview", { p_batch_id: batch.batch_id })
    if (detailResult.error) return error("ICS_DATABASE_UNAVAILABLE", 503)

    return json({
      contractVersion: "calendar-import-preview.v1",
      generatedAt: new Date().toISOString(),
      source: "supabase-preview-only",
      batch,
      items: rows(detailResult.data),
      parser: {
        calendarName: parsed.calendarName,
        totals: parsed.totals,
        warnings: parsed.warnings,
        events: parsed.events.map((item) => ({
          uid: item.uid, sequence: item.sequence, startsAt: item.startsAt, endsAt: item.endsAt,
          status: item.status, summary: item.summary, classification: item.classification,
          duplicateOfIndex: item.duplicateOfIndex, errors: item.errors,
        })),
      },
      limitation: "Preview only. No imported event becomes authoritative until a separately approved commit workflow exists.",
    }, 201)
  } catch (caught) {
    if (caught instanceof IcsCalendarError) return error(caught.code, caught.code === "ICS_INPUT_TOO_LARGE" ? 413 : 422)
    return error("ICS_REQUEST_INVALID", 400)
  }
}
