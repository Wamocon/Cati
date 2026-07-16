import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import {
  createTenantAccessInvitation,
  getTenantAccessData,
  mutateTenantAccessInvitation,
  TenantAccessRepositoryError,
} from "@/lib/tenant-access-repository"
import {
  tenantAccessScopes,
  type TenantAccessScope,
} from "@/lib/tenant-access"

export const dynamic = "force-dynamic"

const privateHeaders = { "Cache-Control": "private, no-store" }
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function jsonError(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status, headers: privateHeaders })
}

function repositoryError(error: unknown) {
  if (error instanceof TenantAccessRepositoryError) {
    return jsonError(error.message, error.code, error.httpStatus)
  }
  console.error("Tenant access operation failed.", error)
  return jsonError(
    "Tenant access is temporarily unavailable.",
    "TENANT_ACCESS_UNAVAILABLE",
    503
  )
}

async function readPayload(request: NextRequest) {
  try {
    return asRecord(await request.json())
  } catch {
    return null
  }
}

function idempotencyKey(request: NextRequest, payload: Record<string, unknown>) {
  return request.headers.get("Idempotency-Key")?.trim() ?? asString(payload.idempotencyKey)
}

function validIdempotencyKey(value: string | null): value is string {
  return Boolean(value && value.length >= 8 && value.length <= 200)
}

function validReason(value: string | null): value is string {
  return Boolean(value && value.length >= 10 && value.length <= 1000)
}

function validDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
}

function validTimestamp(value: string | null): value is string {
  return Boolean(value && value.length <= 40 && !Number.isNaN(Date.parse(value)))
}

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return jsonError("Authentication is required.", "AUTH_REQUIRED", 401)
  if (!(["admin", "owner", "tenant"] as const).includes(profile.role as "admin" | "owner" | "tenant")) {
    return jsonError(
      "This role does not participate in tenant invitation workflows.",
      "TENANT_ACCESS_FORBIDDEN",
      403
    )
  }
  try {
    return NextResponse.json(await getTenantAccessData(profile), {
      headers: privateHeaders,
    })
  } catch (error) {
    return repositoryError(error)
  }
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return jsonError("Authentication is required.", "AUTH_REQUIRED", 401)
  if (profile.role !== "owner" && profile.role !== "admin") {
    return jsonError(
      "Only an exact unit owner or organization administrator may create an invitation.",
      "TENANT_ACCESS_FORBIDDEN",
      403
    )
  }
  const payload = await readPayload(request)
  if (!payload) return jsonError("Request body must be valid JSON.", "TENANT_ACCESS_INVALID_JSON", 400)

  const unitId = asString(payload.unitId)
  const sponsorOwnerProfileId =
    profile.role === "owner" ? profile.id : asString(payload.sponsorOwnerProfileId)
  const tenantName = asString(payload.tenantName)
  const tenantEmail = asString(payload.tenantEmail)?.toLocaleLowerCase("en-US") ?? null
  const accessValidFrom = asString(payload.accessValidFrom)
  const accessValidUntil = asString(payload.accessValidUntil)
  const redeemFrom = asString(payload.redeemFrom)
  const redeemUntil = asString(payload.redeemUntil)
  const reason = asString(payload.reason)
  const key = idempotencyKey(request, payload)
  const rawScopes = payload.allowedScopes

  if (!unitId || !uuidPattern.test(unitId) || !sponsorOwnerProfileId || !uuidPattern.test(sponsorOwnerProfileId)) {
    return jsonError("A valid unit and sponsoring owner are required.", "TENANT_ACCESS_RELATIONSHIP_INVALID", 400)
  }
  if (!tenantName || tenantName.length < 2 || tenantName.length > 160) {
    return jsonError("Tenant name must be between 2 and 160 characters.", "TENANT_ACCESS_NAME_INVALID", 400)
  }
  if (!tenantEmail || tenantEmail.length > 254 || !emailPattern.test(tenantEmail)) {
    return jsonError("A valid tenant email is required.", "TENANT_ACCESS_EMAIL_INVALID", 400)
  }
  if (!Array.isArray(rawScopes) || rawScopes.length === 0) {
    return jsonError("Choose at least one access scope.", "TENANT_ACCESS_SCOPES_INVALID", 400)
  }
  const allowedScopes = [...new Set(rawScopes)]
  if (!allowedScopes.every((scope): scope is TenantAccessScope => typeof scope === "string" && tenantAccessScopes.includes(scope as TenantAccessScope))) {
    return jsonError("One or more access scopes are invalid.", "TENANT_ACCESS_SCOPES_INVALID", 400)
  }
  if (!validDate(accessValidFrom) || !validDate(accessValidUntil) || accessValidFrom > accessValidUntil) {
    return jsonError("The tenant access date range is invalid.", "TENANT_ACCESS_WINDOW_INVALID", 400)
  }
  const accessDays = Math.round(
    (Date.parse(`${accessValidUntil}T00:00:00Z`) - Date.parse(`${accessValidFrom}T00:00:00Z`)) /
      86_400_000
  )
  if (accessDays > 730) {
    return jsonError("Tenant access may not exceed two years.", "TENANT_ACCESS_WINDOW_INVALID", 422)
  }
  if (!validTimestamp(redeemFrom) || !validTimestamp(redeemUntil) || Date.parse(redeemFrom) >= Date.parse(redeemUntil)) {
    return jsonError("The invitation redemption window is invalid.", "TENANT_ACCESS_REDEEM_WINDOW_INVALID", 400)
  }
  if (!validReason(reason)) {
    return jsonError("A reason between 10 and 1000 characters is required.", "TENANT_ACCESS_REASON_REQUIRED", 422)
  }
  if (!validIdempotencyKey(key)) {
    return jsonError("An Idempotency-Key between 8 and 200 characters is required.", "TENANT_ACCESS_IDEMPOTENCY_REQUIRED", 400)
  }

  try {
    const invitation = await createTenantAccessInvitation(profile, {
      unitId,
      sponsorOwnerProfileId,
      tenantName,
      tenantEmail,
      allowedScopes,
      accessValidFrom,
      accessValidUntil,
      redeemFrom,
      redeemUntil,
      reason,
      idempotencyKey: key,
    })
    return NextResponse.json(
      { invitation, oneTimeCode: invitation.inviteCode ?? null },
      { status: invitation.replayed ? 200 : 201, headers: privateHeaders }
    )
  } catch (error) {
    return repositoryError(error)
  }
}

export async function PATCH(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return jsonError("Authentication is required.", "AUTH_REQUIRED", 401)
  const payload = await readPayload(request)
  if (!payload) return jsonError("Request body must be valid JSON.", "TENANT_ACCESS_INVALID_JSON", 400)

  const action = asString(payload.action)
  const invitationId = asString(payload.invitationId)
  const key = idempotencyKey(request, payload)
  if (!invitationId || !uuidPattern.test(invitationId)) {
    return jsonError("A valid invitation id is required.", "TENANT_ACCESS_INVITATION_INVALID", 400)
  }
  if (!validIdempotencyKey(key)) {
    return jsonError("An Idempotency-Key between 8 and 200 characters is required.", "TENANT_ACCESS_IDEMPOTENCY_REQUIRED", 400)
  }

  try {
    if (action === "redeem") {
      if (profile.role !== "tenant") {
        return jsonError("Only the invited tenant may redeem this code.", "TENANT_ACCESS_FORBIDDEN", 403)
      }
      const inviteCode = asString(payload.inviteCode)
      if (!inviteCode || inviteCode.length < 12 || inviteCode.length > 256) {
        return jsonError("A valid invitation code is required.", "TENANT_ACCESS_CODE_INVALID", 400)
      }
      const invitation = await mutateTenantAccessInvitation(profile, {
        action,
        invitationId,
        inviteCode,
        idempotencyKey: key,
      })
      return NextResponse.json({ invitation }, { headers: privateHeaders })
    }

    if (profile.role !== "owner" && profile.role !== "admin") {
      return jsonError("Only the sponsor or organization administrator may change this invitation.", "TENANT_ACCESS_FORBIDDEN", 403)
    }
    const expectedVersion = Number(payload.expectedVersion)
    const reason = asString(payload.reason)
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      return jsonError("A valid expectedVersion is required.", "TENANT_ACCESS_VERSION_INVALID", 400)
    }
    if (!validReason(reason)) {
      return jsonError("A reason between 10 and 1000 characters is required.", "TENANT_ACCESS_REASON_REQUIRED", 422)
    }

    if (action === "revoke") {
      const invitation = await mutateTenantAccessInvitation(profile, {
        action,
        invitationId,
        expectedVersion,
        idempotencyKey: key,
        reason,
      })
      return NextResponse.json({ invitation }, { headers: privateHeaders })
    }
    if (action === "extend") {
      const accessValidUntil = payload.accessValidUntil === null ? null : asString(payload.accessValidUntil)
      const redeemUntil = payload.redeemUntil === null ? null : asString(payload.redeemUntil)
      if (accessValidUntil !== null && !validDate(accessValidUntil)) {
        return jsonError("accessValidUntil must be a valid date or null.", "TENANT_ACCESS_WINDOW_INVALID", 400)
      }
      if (redeemUntil !== null && !validTimestamp(redeemUntil)) {
        return jsonError("redeemUntil must be a valid timestamp or null.", "TENANT_ACCESS_REDEEM_WINDOW_INVALID", 400)
      }
      const invitation = await mutateTenantAccessInvitation(profile, {
        action,
        invitationId,
        expectedVersion,
        accessValidUntil,
        redeemUntil,
        idempotencyKey: key,
        reason,
      })
      return NextResponse.json({ invitation }, { headers: privateHeaders })
    }
    return jsonError("Unsupported tenant access action.", "TENANT_ACCESS_ACTION_INVALID", 400)
  } catch (error) {
    return repositoryError(error)
  }
}
