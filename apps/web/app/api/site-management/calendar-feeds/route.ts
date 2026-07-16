import { NextRequest, NextResponse } from "next/server"
import { getUserProfile, isSupabaseConfigured } from "@/lib/auth"
import { digestOpaqueFeedToken, generateOpaqueFeedToken, opaqueFeedTokenHint } from "@/lib/ics-calendar"
import { hasAnyPermission } from "@/lib/rbac"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type RpcError = { code?: string; message: string }
type RpcResponse = { data: unknown; error: RpcError | null }
type RpcClient = { rpc(name: string, args?: Record<string, unknown>): Promise<RpcResponse> }

class InvalidRequest extends Error {}
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidRequest("body"); return value as Record<string, unknown> }
function required(value: unknown, field: string) { if (typeof value !== "string" || !value.trim()) throw new InvalidRequest(field); return value.trim() }
function optional(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null }
function commandKey(request: NextRequest) { const value = request.headers.get("Idempotency-Key")?.trim(); if (!value || value.length < 8 || value.length > 200) throw new InvalidRequest("idempotencyKey"); return value }
function json(payload: unknown, status = 200) { const response = NextResponse.json(payload, { status }); response.headers.set("Cache-Control", "no-store, private"); return response }
function dbError(error: RpcError) { const conflict = error.code === "23505" || error.code === "P0001"; return json({ error: { code: conflict ? "ICS_CONFLICT" : "ICS_DATABASE_UNAVAILABLE", messageKey: conflict ? "calendar.feedConflict" : "calendar.feedUnavailable" } }, conflict ? 409 : 503) }

async function client(): Promise<RpcClient | null> {
  if (!isSupabaseConfigured()) return null
  return (await createClient()) as unknown as RpcClient
}

async function authorize() {
  const profile = await getUserProfile()
  if (!profile) return { response: json({ error: { code: "ICS_AUTH_REQUIRED", messageKey: "calendar.authRequired" } }, 401), profile: null }
  if (!hasAnyPermission(profile.role, "calendar", ["view"])) return { response: json({ error: { code: "ICS_FORBIDDEN", messageKey: "calendar.forbidden" } }, 403), profile: null }
  return { response: null, profile }
}

export async function GET() {
  const auth = await authorize()
  if (auth.response) return auth.response
  const supabase = await client()
  if (!supabase) return json({ error: { code: "ICS_CONFIGURATION_UNAVAILABLE", messageKey: "calendar.feedUnavailable" } }, 503)
  const result = await supabase.rpc("list_my_calendar_feeds")
  if (result.error) return dbError(result.error)
  return json({ contractVersion: "calendar-feeds.v1", generatedAt: new Date().toISOString(), source: "supabase", feeds: Array.isArray(result.data) ? result.data : [] })
}

export async function POST(request: NextRequest) {
  const auth = await authorize()
  if (auth.response) return auth.response
  try {
    const body = object(await request.json())
    const action = required(body.action, "action")
    const idempotencyKey = commandKey(request)
    const supabase = await client()
    if (!supabase) return json({ error: { code: "ICS_CONFIGURATION_UNAVAILABLE", messageKey: "calendar.feedUnavailable" } }, 503)

    if (action === "create" || action === "rotate") {
      const token = generateOpaqueFeedToken()
      const digest = await digestOpaqueFeedToken(token)
      const hint = opaqueFeedTokenHint(token)
      const result = action === "create"
        ? await supabase.rpc("create_calendar_feed_token_command", {
            p_label: required(body.label, "label"), p_token_digest: digest, p_token_hint: hint,
            p_scope_type: required(body.scopeType, "scopeType"), p_idempotency_key: idempotencyKey,
            p_site_id: optional(body.siteId), p_expires_at: optional(body.expiresAt),
          })
        : await supabase.rpc("rotate_calendar_feed_token_command", {
            p_feed_id: required(body.feedId, "feedId"), p_new_token_digest: digest,
            p_new_token_hint: hint, p_idempotency_key: idempotencyKey,
          })
      if (result.error) return dbError(result.error)
      const feedUrl = new URL("/api/calendar/ics", request.nextUrl.origin)
      feedUrl.searchParams.set("token", token)
      return json({
        contractVersion: "calendar-feeds.v1", action, feed: Array.isArray(result.data) ? result.data[0] ?? null : result.data,
        secret: { token, feedUrl: feedUrl.toString(), shownOnce: true },
        warning: "Store this URL securely. Rotating or revoking it invalidates the previous token.",
      }, action === "create" ? 201 : 200)
    }

    if (action === "revoke") {
      const result = await supabase.rpc("revoke_calendar_feed_token_command", {
        p_feed_id: required(body.feedId, "feedId"), p_reason: required(body.reason, "reason"), p_idempotency_key: idempotencyKey,
      })
      if (result.error) return dbError(result.error)
      return json({ contractVersion: "calendar-feeds.v1", action, feed: Array.isArray(result.data) ? result.data[0] ?? null : result.data })
    }
    throw new InvalidRequest("action")
  } catch (error) {
    if (error instanceof InvalidRequest || error instanceof SyntaxError) return json({ error: { code: "ICS_REQUEST_INVALID", messageKey: "calendar.requestInvalid", field: error.message } }, 400)
    return json({ error: { code: "ICS_UNEXPECTED", messageKey: "calendar.feedUnavailable" } }, 500)
  }
}
