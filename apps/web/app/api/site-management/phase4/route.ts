import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import { getPhase4SiteData } from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

function readLimit(value: string | null) {
  const limit = Number(value ?? 769)
  if (!Number.isFinite(limit)) return 769
  return Math.min(Math.max(Math.trunc(limit), 1), 1000)
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "listings", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view operations data." },
      { status: 403 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q") ?? ""
  const limit = readLimit(searchParams.get("limit"))

  try {
    const data = await getPhase4SiteData({ query, limit })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Operations data is unavailable." },
      { status: 500 }
    )
  }
}
