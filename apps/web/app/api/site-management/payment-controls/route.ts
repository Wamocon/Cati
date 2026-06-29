import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import { getPaymentRestrictionData } from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

function readLimit(value: string | null) {
  const limit = Number(value ?? 8)
  if (!Number.isFinite(limit)) return 8
  return Math.min(Math.max(Math.trunc(limit), 1), 100)
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "finance", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view payment control data." },
      { status: 403 }
    )
  }

  try {
    const limit = readLimit(request.nextUrl.searchParams.get("limit"))
    const data = await getPaymentRestrictionData({ limit })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Payment control data is unavailable." },
      { status: 500 }
    )
  }
}
