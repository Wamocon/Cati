import { NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import {
  auditEvents,
  getEligibilitySummary,
  getImportSummary,
  getPhaseDeliverySummary,
  getPlatformControlSummary,
  getPaymentPlanSummary,
  getPurchaseChecklistSummary,
  getStaffSummary,
  getViewingSummary,
  importBatches,
  phaseDeliveryRecords,
  platformControls,
  roleCoverage,
} from "@/lib/site-management-data"

export const dynamic = "force-dynamic"

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  if (!hasAnyPermission(profile.role, "reports", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view phase-status data." },
      { status: 403 }
    )
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    phases: phaseDeliveryRecords,
    summaries: {
      delivery: getPhaseDeliverySummary(),
      platform: getPlatformControlSummary(),
      import: getImportSummary(),
      staff: getStaffSummary(),
      viewing: getViewingSummary(),
      paymentPlans: getPaymentPlanSummary(),
      purchaseChecklist: getPurchaseChecklistSummary(),
      eligibility: getEligibilitySummary(),
    },
    controls: platformControls,
    auditEvents,
    importBatches,
    roleCoverage,
  })
}
