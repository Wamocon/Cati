import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission, type Role } from "@/lib/rbac"
import {
  createReservation,
  getBookingOperationsData,
  logClientAction,
  updateReservationApproval,
} from "@/lib/site-management-repository"
import {
  canAccessUnitForRole,
  visibleBookingReadinessForRole,
  visibleBookingsForRole,
} from "@/lib/role-scoped-views"

export const dynamic = "force-dynamic"

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export async function PATCH(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 })
  }

  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  if (!hasAnyPermission(profile.role, "calendar", ["approve", "manage"])) {
    return NextResponse.json({ error: "Your role is not allowed to decide reservation requests." }, { status: 403 })
  }

  const payload = asRecord(body)
  const reservationId = asString(payload.reservationId)
  const approvalStatus = payload.approvalStatus === "approved" || payload.approvalStatus === "rejected"
    ? payload.approvalStatus
    : null
  if (!reservationId || !approvalStatus) {
    return NextResponse.json({ error: "A reservation id and valid decision are required." }, { status: 400 })
  }

  const result = await updateReservationApproval({
    reservationId,
    approvalStatus,
    actor: { id: profile.id, role: profile.role, companyId: profile.company_id, displayName: profile.full_name, email: profile.email },
  })
  if (!result) return NextResponse.json({ error: "Reservation was not found." }, { status: 404 })
  await logClientAction({
    actionType: `reservations.owner_${approvalStatus}`,
    entityTable: "reservations",
    entityExternalId: result.booking.id,
    title: `${approvalStatus} reservation ${result.booking.id}`,
    metadata: { decidedByRole: profile.role, approvalStatus },
  })
  return NextResponse.json(result)
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeDateTime(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

function scopeBookingOperationsForRole(
  data: Awaited<ReturnType<typeof getBookingOperationsData>>,
  role: Role
) {
  const scopedBookings = visibleBookingsForRole(role, data.bookings)

  return {
    ...data,
    role,
    bookings: scopedBookings,
    readinessQueue: visibleBookingReadinessForRole(role, data.readinessQueue),
    summary: {
      ...data.summary,
      totalBookings: scopedBookings.filter((booking) => booking.status !== "cancelled").length,
      moveInsToday: scopedBookings.filter((booking) => booking.status === "move_in_today").length,
      checkoutsToday: scopedBookings.filter((booking) => booking.status === "checkout_today").length,
      accessPending: scopedBookings.filter(
        (booking) =>
          booking.accessCodeStatus === "pending" ||
          booking.accessCodeStatus === "restricted"
      ).length,
    },
  }
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "calendar", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view booking operations." },
      { status: 403 }
    )
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50)
    const data = await getBookingOperationsData({ limit })
    return NextResponse.json(scopeBookingOperationsForRole(data, profile.role))
  } catch {
    return NextResponse.json(
      { error: "Booking operations data is unavailable." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    )
  }

  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "calendar", ["create", "manage"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to create reservations." },
      { status: 403 }
    )
  }

  const payload = asRecord(body)
  const unitNo = asString(payload.unitNo)?.toLocaleUpperCase("tr-TR") ?? null
  const resourceName = asString(payload.resourceName) ?? "Amenity"
  const guestName = asString(payload.guestName) ?? profile.full_name ?? profile.email ?? "Portal user"
  const checkInAt = normalizeDateTime(asString(payload.checkInAt))
  const checkOutAt = normalizeDateTime(asString(payload.checkOutAt))
  const notes = asString(payload.notes)

  if (!unitNo) {
    return NextResponse.json(
      { error: "A unit number is required for reservations." },
      { status: 400 }
    )
  }

  if (!canAccessUnitForRole(profile.role, unitNo)) {
    return NextResponse.json(
      { error: "Your role is not allowed to create reservations for this unit." },
      { status: 403 }
    )
  }

  if (!checkInAt || !checkOutAt || new Date(checkOutAt).getTime() <= new Date(checkInAt).getTime()) {
    return NextResponse.json(
      { error: "Reservation start and end times are invalid." },
      { status: 400 }
    )
  }

  try {
    const result = await createReservation({
      unitNo,
      resourceName,
      guestName,
      checkInAt,
      checkOutAt,
      notes,
      actor: {
        id: profile.id,
        role: profile.role,
        companyId: profile.company_id,
        displayName: profile.full_name,
        email: profile.email,
      },
    })

    await logClientAction({
      actionType: "reservations.create.portal",
      entityTable: "reservations",
      entityExternalId: result.booking.id,
      title: `${resourceName} reservation - ${unitNo}`,
      metadata: {
        requestedByRole: profile.role,
        unitNo,
        resourceName,
        checkInAt,
        checkOutAt,
        notes,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reservation could not be created."
    return NextResponse.json(
      { error: message },
      { status: message.includes("occupied") ? 409 : 500 }
    )
  }
}
