import { NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import {
  accessHandoffs,
  bookingReadinessRecords,
  bookings,
  depositSettlements,
  getBookingOperationsSummary,
  turnoverTasks,
} from "@/lib/site-management-data"
import {
  visibleAccessHandoffsForRole,
  visibleBookingReadinessForRole,
  visibleBookingsForRole,
  visibleDepositSettlementsForRole,
  visibleTurnoverTasksForRole,
} from "@/lib/role-scoped-views"

export const dynamic = "force-dynamic"

export async function GET() {
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

  return NextResponse.json({
    contractVersion: "phase-10-booking-operations.v1",
    source: "local-demo-contract",
    providerMode: "simulation",
    generatedAt: new Date().toISOString(),
    role: profile.role,
    summary: getBookingOperationsSummary(),
    bookings: visibleBookingsForRole(profile.role, bookings),
    readinessQueue: visibleBookingReadinessForRole(profile.role, bookingReadinessRecords),
    turnoverTasks: visibleTurnoverTasksForRole(profile.role, turnoverTasks),
    accessHandoffs: visibleAccessHandoffsForRole(profile.role, accessHandoffs),
    depositSettlements: visibleDepositSettlementsForRole(profile.role, depositSettlements),
    quality: {
      availabilityGuard: "modeled_for_supabase_exclusion_constraint",
      settlementMath: "itemized_demo",
      accessSafety: "manual_approval_before_live_provider",
      liveProviderConnected: false,
    },
  })
}
