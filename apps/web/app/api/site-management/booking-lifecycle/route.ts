import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import {
  BookingLifecycleRepositoryError,
  cancelBookingBlackout,
  cancelResourceBooking,
  commitResourceBooking,
  createBookingBlackout,
  createBookingHold,
  decideResourceBooking,
  getBookingLifecycleWorkspace,
  promoteBookingWaitlist,
  rescheduleResourceBooking,
  transitionResourceBooking,
  updateResourceBookingFinance,
  type BookingBlackoutType,
  type BookingDecision,
  type BookingFinanceState,
  type ResourceBookingTransition,
} from "@/lib/booking-lifecycle-repository"
import { hasAnyPermission } from "@/lib/rbac"

export const dynamic = "force-dynamic"

type JsonRecord = Record<string, unknown>
class RequestValidationError extends Error {}

function record(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestValidationError("invalid_body")
  return value as JsonRecord
}
function string(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new RequestValidationError(field)
  return value.trim()
}
function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}
function integer(value: unknown, field: string, minimum = 0): number {
  if (!Number.isInteger(value) || Number(value) < minimum) throw new RequestValidationError(field)
  return Number(value)
}
function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new RequestValidationError(field)
  return value
}
function oneOf<T extends string>(value: unknown, values: readonly T[], field: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new RequestValidationError(field)
  return value as T
}
function idempotencyKey(request: NextRequest): string {
  const value = request.headers.get("Idempotency-Key")?.trim()
  if (!value || value.length < 8 || value.length > 200) throw new RequestValidationError("idempotency_key")
  return value
}
function errorResponse(error: unknown) {
  if (error instanceof RequestValidationError) {
    return NextResponse.json({ error: { code: "BOOKING_REQUEST_INVALID", messageKey: "booking.requestInvalid", field: error.message } }, { status: 400 })
  }
  if (error instanceof BookingLifecycleRepositoryError) {
    return NextResponse.json({ error: { code: error.code, messageKey: `booking.${error.code}` } }, { status: error.status })
  }
  return NextResponse.json({ error: { code: "BOOKING_UNEXPECTED", messageKey: "booking.unavailable" } }, { status: 500 })
}
function canRun(role: Parameters<typeof hasAnyPermission>[0], action: string) {
  if (action === "finance") return hasAnyPermission(role, "finance", ["update", "approve", "manage"])
  if (["decide", "blackout.create", "blackout.cancel", "waitlist.promote"].includes(action)) {
    return hasAnyPermission(role, "calendar", ["approve", "manage"])
  }
  if (action === "transition") {
    return hasAnyPermission(role, "calendar", ["create", "update", "approve", "manage"])
  }
  return hasAnyPermission(role, "calendar", ["create", "manage"])
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: { code: "BOOKING_AUTH_REQUIRED", messageKey: "booking.authRequired" } }, { status: 401 })
  if (!hasAnyPermission(profile.role, "calendar", ["view"])) {
    return NextResponse.json({ error: { code: "BOOKING_FORBIDDEN", messageKey: "booking.forbidden" } }, { status: 403 })
  }
  try {
    return NextResponse.json(await getBookingLifecycleWorkspace(request.nextUrl.searchParams.get("siteId")))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: { code: "BOOKING_AUTH_REQUIRED", messageKey: "booking.authRequired" } }, { status: 401 })
  try {
    const body = record(await request.json())
    const action = string(body.action, "action")
    if (!canRun(profile.role, action)) {
      return NextResponse.json({ error: { code: "BOOKING_FORBIDDEN", messageKey: "booking.forbidden" } }, { status: 403 })
    }
    const key = idempotencyKey(request)

    if (action === "hold") return NextResponse.json(await createBookingHold({
      resourceId: string(body.resourceId, "resourceId"), unitId: string(body.unitId, "unitId"), residentId: string(body.residentId, "residentId"),
      partySize: integer(body.partySize, "partySize", 1), startsAt: string(body.startsAt, "startsAt"), endsAt: string(body.endsAt, "endsAt"),
      waitlistIfFull: boolean(body.waitlistIfFull, "waitlistIfFull"), idempotencyKey: key,
    }), { status: 201 })
    if (action === "commit") return NextResponse.json(await commitResourceBooking({
      holdId: string(body.holdId, "holdId"), expectedVersion: integer(body.expectedVersion, "expectedVersion", 1),
      guestName: optionalString(body.guestName), notes: optionalString(body.notes), idempotencyKey: key,
    }))
    if (action === "decide") return NextResponse.json(await decideResourceBooking({
      reservationId: string(body.reservationId, "reservationId"), expectedVersion: integer(body.expectedVersion, "expectedVersion", 1),
      decision: oneOf<BookingDecision>(body.decision, ["approve", "reject"], "decision"), reason: optionalString(body.reason), idempotencyKey: key,
    }))
    if (action === "finance") {
      const states: readonly BookingFinanceState[] = ["not_required", "manual_required", "provider_ready", "manual_verified", "waived", "unavailable"]
      return NextResponse.json(await updateResourceBookingFinance({
        reservationId: string(body.reservationId, "reservationId"), expectedVersion: integer(body.expectedVersion, "expectedVersion", 1),
        paymentState: oneOf(body.paymentState, states, "paymentState"), depositState: oneOf(body.depositState, states, "depositState"),
        reason: string(body.reason, "reason"), idempotencyKey: key,
      }))
    }
    if (action === "transition") {
      const transitions: readonly ResourceBookingTransition[] = ["check_in", "complete", "no_show", "revoke_access"]
      return NextResponse.json(await transitionResourceBooking({
        reservationId: string(body.reservationId, "reservationId"), expectedVersion: integer(body.expectedVersion, "expectedVersion", 1),
        transition: oneOf(body.transition, transitions, "transition"), reason: optionalString(body.reason), idempotencyKey: key,
      }))
    }
    if (action === "cancel") return NextResponse.json(await cancelResourceBooking({
      reservationId: string(body.reservationId, "reservationId"), expectedVersion: integer(body.expectedVersion, "expectedVersion", 1),
      reason: string(body.reason, "reason"), idempotencyKey: key,
    }))
    if (action === "reschedule") return NextResponse.json(await rescheduleResourceBooking({
      reservationId: string(body.reservationId, "reservationId"), expectedVersion: integer(body.expectedVersion, "expectedVersion", 1),
      startsAt: string(body.startsAt, "startsAt"), endsAt: string(body.endsAt, "endsAt"), reason: string(body.reason, "reason"), idempotencyKey: key,
    }))
    if (action === "blackout.create") {
      const types: readonly BookingBlackoutType[] = ["maintenance", "commissioning", "safety", "admin"]
      return NextResponse.json(await createBookingBlackout({
        resourceId: string(body.resourceId, "resourceId"), startsAt: string(body.startsAt, "startsAt"), endsAt: string(body.endsAt, "endsAt"),
        blackoutType: oneOf(body.blackoutType, types, "blackoutType"), reason: string(body.reason, "reason"), idempotencyKey: key,
      }), { status: 201 })
    }
    if (action === "blackout.cancel") return NextResponse.json(await cancelBookingBlackout({
      blackoutId: string(body.blackoutId, "blackoutId"), expectedVersion: integer(body.expectedVersion, "expectedVersion", 1),
      reason: string(body.reason, "reason"), idempotencyKey: key,
    }))
    if (action === "waitlist.promote") return NextResponse.json(await promoteBookingWaitlist({ resourceId: string(body.resourceId, "resourceId"), idempotencyKey: key }))
    throw new RequestValidationError("action")
  } catch (error) {
    return errorResponse(error)
  }
}
