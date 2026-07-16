import { NextRequest, NextResponse } from "next/server"
import { isSupabaseConfigured } from "@/lib/auth"
import {
  IcsCalendarError,
  digestOpaqueFeedToken,
  serializePrivacyReducedCalendar,
  type CalendarLifecycleStatus,
  type PrivacyReducedCalendarEvent,
} from "@/lib/ics-calendar"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type RpcError = { message: string }
type RpcResponse = { data: unknown; error: RpcError | null }
type RpcClient = { rpc(name: string, args?: Record<string, unknown>): Promise<RpcResponse> }
type Row = Record<string, unknown>

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []
}
function string(row: Row, key: string) { return typeof row[key] === "string" ? String(row[key]) : "" }
function number(row: Row, key: string) { return Number.isInteger(row[key]) ? Number(row[key]) : 0 }
function status(value: string): CalendarLifecycleStatus { return value === "tentative" || value === "cancelled" || value === "completed" ? value : "confirmed" }
function unavailable(statusCode = 404) {
  return NextResponse.json({ error: { code: "ICS_FEED_NOT_FOUND", messageKey: "calendar.feedNotFound" } }, { status: statusCode, headers: { "Cache-Control": "no-store, private" } })
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return unavailable(503)
  try {
    const token = request.nextUrl.searchParams.get("token") ?? ""
    const digest = await digestOpaqueFeedToken(token)
    const supabase = (await createClient()) as unknown as RpcClient
    const metadataResult = await supabase.rpc("resolve_calendar_feed_metadata", { p_token_digest: digest })
    if (metadataResult.error) return unavailable(503)
    const metadata = rows(metadataResult.data)[0]
    if (!metadata) return unavailable()

    const windowStart = new Date(Date.now() - 31 * 86_400_000).toISOString()
    const windowEnd = new Date(Date.now() + 366 * 86_400_000).toISOString()
    const eventResult = await supabase.rpc("get_privacy_reduced_calendar_feed", {
      p_token_digest: digest, p_window_start: windowStart, p_window_end: windowEnd,
    })
    if (eventResult.error) return unavailable(503)

    const events: PrivacyReducedCalendarEvent[] = rows(eventResult.data)
      .map((event) => ({
        uid: string(event, "event_uid"), sequence: number(event, "event_sequence"),
        startsAt: string(event, "starts_at"), endsAt: string(event, "ends_at"),
        updatedAt: string(event, "event_updated_at"), status: status(string(event, "lifecycle_status")),
        resourceLabel: string(event, "resource_label") || "1Çatı reservation",
      }))
      .filter((event) => event.uid && event.startsAt && event.endsAt && event.updatedAt)

    const calendar = serializePrivacyReducedCalendar({
      calendarName: string(metadata, "calendar_name") || "1Çatı reservations",
      events,
      generatedAt: string(metadata, "refreshed_at") || new Date(),
      genericDescription: "Open 1Çatı while online for current operational details.",
    })
    return new NextResponse(calendar, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "inline; filename=1cati-calendar.ics",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    })
  } catch (error) {
    if (error instanceof IcsCalendarError) return unavailable()
    return unavailable(503)
  }
}
