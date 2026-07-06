import { NextResponse } from "next/server"
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

export function GET() {
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
