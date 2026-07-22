import { NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { isAdmin } from "@/lib/rbac"
import { getPendingApprovals } from "@/lib/approvals-repository"

export const dynamic = "force-dynamic"

// Read-only aggregation endpoint for the admin "Needs your approval" inbox.
// There is intentionally NO PATCH here: each decision is dispatched to the
// existing per-kind endpoint (actions / tickets), which remains the single
// server-side authority and human-approval gate for that decision.
export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json(
      { error: "Authentication is required.", code: "AUTH_REQUIRED" },
      { status: 401 }
    )
  }
  if (!isAdmin(profile.role)) {
    return NextResponse.json(
      {
        error: "Organization administrator authority is required.",
        code: "APPROVALS_FORBIDDEN",
      },
      { status: 403 }
    )
  }

  try {
    const { items, source } = await getPendingApprovals(profile)
    return NextResponse.json({ items, source })
  } catch (error) {
    console.error("Pending approvals query failed.", error)
    return NextResponse.json(
      {
        error: "The approvals inbox is temporarily unavailable.",
        code: "APPROVALS_UNAVAILABLE",
      },
      { status: 503 }
    )
  }
}
