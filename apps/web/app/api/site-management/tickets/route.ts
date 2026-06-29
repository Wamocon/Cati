import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import { getServiceTicketQueueData } from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

function readLimit(value: string | null) {
  const limit = Number(value ?? 24)
  if (!Number.isFinite(limit)) return 24
  return Math.min(Math.max(Math.trunc(limit), 1), 100)
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "tickets", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view service tickets." },
      { status: 403 }
    )
  }

  try {
    const limit = readLimit(request.nextUrl.searchParams.get("limit"))
    const data = await getServiceTicketQueueData({ limit })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Service ticket data is unavailable." },
      { status: 500 }
    )
  }
}
