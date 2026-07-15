import { type NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import {
  getOwnerFinanceData,
  OwnerFinancePaginationError,
  OwnerFinanceScopeError,
} from "@/lib/owner-finance-repository"

export const dynamic = "force-dynamic"

const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

function readLimit(value: string | null) {
  if (value === null) return 40
  if (!/^\d{1,3}$/.test(value)) return null
  const limit = Number(value)
  return limit >= 1 && limit <= 100 ? limit : null
}

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      vary: "Cookie",
    },
  })
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson({ error: "Unauthorized.", code: "OWNER_FINANCE_UNAUTHORIZED" }, 401)
  }

  // The general finance endpoint remains reserved for internal finance roles.
  // This endpoint is a deliberately smaller projection for verified owners;
  // it never accepts write methods or returns provider/audit payloads.
  if (profile.role !== "owner") {
    return privateJson(
      {
        error: "Only an authenticated owner can view an own-unit statement.",
        code: "OWNER_FINANCE_FORBIDDEN",
      },
      403
    )
  }

  const params = request.nextUrl.searchParams
  const allowedParameters = new Set(["limit", "cursor", "snapshotAt", "unitNo"])
  if (
    [...params.keys()].some((key) => !allowedParameters.has(key)) ||
    [...allowedParameters].some((key) => params.getAll(key).length > 1)
  ) {
    return privateJson(
      { error: "Invalid statement query.", code: "OWNER_FINANCE_QUERY_INVALID" },
      400
    )
  }

  const limit = readLimit(params.get("limit"))
  if (limit === null) {
    return privateJson(
      { error: "Invalid history limit.", code: "OWNER_FINANCE_LIMIT_INVALID" },
      400
    )
  }

  const unitNo = params.get("unitNo")
  if (unitNo && unitNo.trim().length > 32) {
    return privateJson(
      { error: "Invalid unit reference.", code: "OWNER_FINANCE_UNIT_INVALID" },
      400
    )
  }

  try {
    const data = await getOwnerFinanceData({
      limit,
      cursor: params.get("cursor"),
      snapshotAt: params.get("snapshotAt"),
      unitNo,
      useLocalAccessProfile: profile.id === LOCAL_ACCESS_PROFILE_ID,
    })
    return privateJson(data)
  } catch (error) {
    if (error instanceof OwnerFinanceScopeError) {
      return privateJson({ error: error.message, code: error.code }, 403)
    }
    if (error instanceof OwnerFinancePaginationError) {
      return privateJson({ error: error.message, code: error.code }, 400)
    }

    return privateJson(
      {
        error: "Your unit statement is temporarily unavailable.",
        code: "OWNER_FINANCE_UNAVAILABLE",
      },
      500
    )
  }
}
