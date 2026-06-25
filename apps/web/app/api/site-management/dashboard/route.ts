import { NextResponse } from "next/server"
import { getDashboardSnapshot } from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

export async function GET() {
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
