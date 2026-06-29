import { NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { getDashboardSnapshot } from "@/lib/site-management-repository"
import type { Role } from "@/lib/rbac"

export const dynamic = "force-dynamic"

const globalDashboardRoles: Role[] = ["admin", "manager"]

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!globalDashboardRoles.includes(profile.role)) {
    return NextResponse.json(
      { error: "Your role is not allowed to view global dashboard data." },
      { status: 403 }
    )
  }

  try {
    const snapshot = await getDashboardSnapshot()
    return NextResponse.json(snapshot)
  } catch {
    return NextResponse.json(
      { error: "Dashboard snapshot is unavailable." },
      { status: 500 }
    )
  }
}
