import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { canViewInternalFinance } from "@/lib/rbac"
import { getFinanceLedgerData } from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

function readLimit(value: string | null) {
  const limit = Number(value ?? 16)
  if (!Number.isFinite(limit)) return 16
  return Math.min(Math.max(Math.trunc(limit), 1), 100)
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!canViewInternalFinance(profile.role)) {
    return NextResponse.json(
      { error: "Your role is not allowed to view finance ledger data." },
      { status: 403 }
    )
  }

  try {
    const limit = readLimit(request.nextUrl.searchParams.get("limit"))
    const data = await getFinanceLedgerData({ limit })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Finance ledger data is unavailable." },
      { status: 500 }
    )
  }
}
