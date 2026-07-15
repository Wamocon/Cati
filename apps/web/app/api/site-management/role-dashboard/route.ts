import { NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { getRoleDashboardSnapshot } from "@/lib/role-dashboard-repository"

export const dynamic = "force-dynamic"

const supportedRoles = new Set(["accountant", "staff", "owner", "tenant"])

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!supportedRoles.has(profile.role)) {
    return NextResponse.json(
      { error: "Use the operations dashboard for this role." },
      { status: 403 }
    )
  }

  try {
    const snapshot = await getRoleDashboardSnapshot(profile)
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Vary: "Cookie",
      },
    })
  } catch (error) {
    console.error("Role dashboard projection failed.", error)
    return NextResponse.json(
      { error: "Your dashboard data is temporarily unavailable." },
      { status: 500 }
    )
  }
}
