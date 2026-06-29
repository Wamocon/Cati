import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { searchOperationalRecords } from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!["admin", "manager"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Your role is not allowed to search global operations data." },
      { status: 403 }
    )
  }

  const { searchParams } = request.nextUrl
  const query = searchParams.get("q")?.trim() ?? ""
  const rawLimit = Number(searchParams.get("limit") ?? 20)
  const limit = Number.isFinite(rawLimit) ? rawLimit : 20

  if (!query) {
    return NextResponse.json(
      { error: "Search query is required." },
      { status: 400 }
    )
  }

  try {
    const payload = await searchOperationalRecords(query, limit)
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json(
      { error: "Operational search is unavailable." },
      { status: 500 }
    )
  }
}
