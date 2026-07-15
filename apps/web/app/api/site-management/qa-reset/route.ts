import { NextResponse } from "next/server"
import { isAccessProfileEnabled } from "@/lib/auth"
import { resetLocalQaStateForTesting } from "@/lib/site-management-repository"
import { resetManualPaymentStateForTesting } from "@/lib/manual-payment-repository"

export const dynamic = "force-dynamic"

// Test-only: clears accumulated local-QA state so serial e2e runs stay isolated and
// fast. Guarded by isAccessProfileEnabled(), which is always false in production
// (see access-profile-policy.ts), so this 404s outside a controlled QA environment.
export async function POST() {
  if (!isAccessProfileEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }
  resetLocalQaStateForTesting()
  resetManualPaymentStateForTesting()
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  )
}
