import { NextRequest, NextResponse } from "next/server"
import { searchOperationalRecords } from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
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
