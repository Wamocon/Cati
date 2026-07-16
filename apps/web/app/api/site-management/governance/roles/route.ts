import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { isValidRole } from "@/lib/rbac"
import { buildRoleGovernanceDTO } from "@/lib/role-governance"
import {
  getGovernanceAdministration,
  GovernanceRepositoryError,
  setGovernanceMemberAuthority,
} from "@/lib/role-governance-repository"

export const dynamic = "force-dynamic"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const privateHeaders = { "Cache-Control": "private, no-store" }

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function errorResponse(error: unknown) {
  if (error instanceof GovernanceRepositoryError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.httpStatus, headers: privateHeaders }
    )
  }
  console.error("Role governance operation failed.", error)
  return NextResponse.json(
    {
      error: "Organization authority controls are temporarily unavailable.",
      code: "GOVERNANCE_UNAVAILABLE",
    },
    { status: 503, headers: privateHeaders }
  )
}

export async function GET() {
  const profile = await getUserProfile()

  if (!profile) {
    return NextResponse.json(
      { error: "Authentication is required." },
      {
        status: 401,
        headers: privateHeaders,
      }
    )
  }

  try {
    const administration =
      profile.role === "admin"
        ? await getGovernanceAdministration(profile)
        : undefined
    return NextResponse.json(
      { ...buildRoleGovernanceDTO(profile), administration },
      { headers: privateHeaders }
    )
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json(
      { error: "Authentication is required.", code: "AUTH_REQUIRED" },
      { status: 401, headers: privateHeaders }
    )
  }
  if (profile.role !== "admin") {
    return NextResponse.json(
      {
        error: "Organization administrator authority is required.",
        code: "GOVERNANCE_FORBIDDEN",
      },
      { status: 403, headers: privateHeaders }
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = asRecord(await request.json())
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON.", code: "GOVERNANCE_INVALID_JSON" },
      { status: 400, headers: privateHeaders }
    )
  }

  const profileId = asString(payload.profileId)
  const expectedUpdatedAt = asString(payload.expectedUpdatedAt)
  const officeId = payload.officeId === null ? null : asString(payload.officeId)
  const reason = asString(payload.reason)
  const idempotencyKey =
    request.headers.get("Idempotency-Key")?.trim() ??
    asString(payload.idempotencyKey)
  const role = payload.role
  const rawSiteIds = payload.siteIds

  if (!profileId || !uuidPattern.test(profileId)) {
    return NextResponse.json(
      { error: "A valid member profile id is required.", code: "GOVERNANCE_PROFILE_INVALID" },
      { status: 400, headers: privateHeaders }
    )
  }
  if (
    !expectedUpdatedAt ||
    Number.isNaN(Date.parse(expectedUpdatedAt)) ||
    expectedUpdatedAt.length > 40
  ) {
    return NextResponse.json(
      { error: "A valid expectedUpdatedAt value is required.", code: "GOVERNANCE_VERSION_INVALID" },
      { status: 400, headers: privateHeaders }
    )
  }
  if (!isValidRole(role) || role === "admin") {
    return NextResponse.json(
      {
        error: "This control may assign manager, accountant, staff, owner, or tenant roles only.",
        code: "GOVERNANCE_ROLE_INVALID",
      },
      { status: 422, headers: privateHeaders }
    )
  }
  if (officeId && !uuidPattern.test(officeId)) {
    return NextResponse.json(
      { error: "officeId must be a valid identifier or null.", code: "GOVERNANCE_OFFICE_INVALID" },
      { status: 400, headers: privateHeaders }
    )
  }
  if (!Array.isArray(rawSiteIds) || rawSiteIds.length > 100) {
    return NextResponse.json(
      { error: "siteIds must be an array of at most 100 identifiers.", code: "GOVERNANCE_SITES_INVALID" },
      { status: 400, headers: privateHeaders }
    )
  }
  const siteIds = [...new Set(rawSiteIds)]
  if (!siteIds.every((siteId): siteId is string => typeof siteId === "string" && uuidPattern.test(siteId))) {
    return NextResponse.json(
      { error: "Every site assignment must be a valid identifier.", code: "GOVERNANCE_SITES_INVALID" },
      { status: 400, headers: privateHeaders }
    )
  }
  if (!reason || reason.length < 10 || reason.length > 1000) {
    return NextResponse.json(
      { error: "A reason between 10 and 1000 characters is required.", code: "GOVERNANCE_REASON_REQUIRED" },
      { status: 422, headers: privateHeaders }
    )
  }
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return NextResponse.json(
      { error: "An Idempotency-Key between 8 and 200 characters is required.", code: "GOVERNANCE_IDEMPOTENCY_REQUIRED" },
      { status: 400, headers: privateHeaders }
    )
  }

  try {
    const member = await setGovernanceMemberAuthority(profile, {
      profileId,
      expectedUpdatedAt,
      role,
      officeId,
      siteIds,
      reason,
      idempotencyKey,
    })
    return NextResponse.json(
      { member, idempotencyKey },
      { headers: privateHeaders }
    )
  } catch (error) {
    return errorResponse(error)
  }
}
