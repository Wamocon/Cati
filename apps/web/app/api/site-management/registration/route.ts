import { createHash, createHmac } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import {
  decideRegistration,
  getRegistrationActivationStatus,
  getRegistrationPublicStatus,
  getRegistrationReviewData,
  recommendRegistration,
  redeemRegistrationActivation,
  RegistrationRepositoryError,
  submitRegistration,
} from "@/lib/registration-repository"
import {
  publicRegistrationRoles,
  type PublicRegistrationRole,
  type RegistrationRecommendation,
} from "@/lib/registration"
import {
  consumeRequestRateLimit,
  mutationOriginAllowed,
} from "@/lib/request-security"

export const dynamic = "force-dynamic"

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
}
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const consentVersion = "kvkk-registration-2026-07-v1"
const consentTextDigest = createHash("sha256")
  .update(
    "1Cati processes the submitted identity and contact evidence only to review the requested account, bind the approved organization scope, keep an audit trail, and meet the configured retention policy."
  )
  .digest("hex")

function protectedIdentityDigest(value: string) {
  const normalized = value.replace(/\s+/g, "").toLocaleUpperCase("tr-TR")
  const secret =
    process.env.REGISTRATION_IDENTITY_PEPPER ??
    (process.env.NODE_ENV !== "production"
      ? "local-qa-only-registration-identity-key"
      : null)
  if (!secret) return null
  return createHmac("sha256", secret).update(normalized).digest("hex")
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown, max = 1000): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized && normalized.length <= max ? normalized : null
}

function jsonError(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status, headers: privateHeaders })
}

function rateLimitError(retryAfterSeconds: number) {
  const response = jsonError(
    "Too many registration requests. Please retry after the cooling period.",
    "REGISTRATION_RATE_LIMITED",
    429
  )
  response.headers.set("Retry-After", String(retryAfterSeconds))
  return response
}

function repositoryError(error: unknown) {
  if (error instanceof RegistrationRepositoryError) {
    return jsonError(error.message, error.code, error.httpStatus)
  }
  console.error("Registration operation failed without applicant data.")
  return jsonError(
    "Registration is temporarily unavailable.",
    "REGISTRATION_UNAVAILABLE",
    503
  )
}

async function readBody(request: NextRequest) {
  try {
    return asRecord(await request.json())
  } catch {
    return null
  }
}

function isPublicRole(value: unknown): value is PublicRegistrationRole {
  return (
    typeof value === "string" &&
    publicRegistrationRoles.includes(value as PublicRegistrationRole)
  )
}

function locale(value: unknown): "tr" | "en" | "de" | "ru" {
  return value === "en" || value === "de" || value === "ru" ? value : "tr"
}

function idempotencyKey(request: NextRequest, payload: Record<string, unknown>) {
  return request.headers.get("Idempotency-Key")?.trim() ?? asString(payload.idempotencyKey, 200)
}

export async function POST(request: NextRequest) {
  if (!mutationOriginAllowed(request)) {
    return jsonError("Cross-site request rejected.", "REGISTRATION_ORIGIN_REJECTED", 403)
  }
  const body = await readBody(request)
  if (!body) return jsonError("Request body must be valid JSON.", "REGISTRATION_INVALID_JSON", 400)

  const publicAction = asString(body.action, 40)
  if (publicAction === "status" || publicAction === "activation_status") {
    const reference = asString(body.reference, 40)
    const token = asString(
      publicAction === "status" ? body.lookupToken : body.activationToken,
      256
    )
    if (!reference || !token) {
      return jsonError(
        "Registration reference and private receipt are required.",
        "REGISTRATION_RECEIPT_INVALID",
        400
      )
    }
    const lookupRate = consumeRequestRateLimit({
      request,
      scope: `registration-${publicAction}`,
      subject: reference,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    })
    if (!lookupRate.allowed) return rateLimitError(lookupRate.retryAfterSeconds)
    try {
      if (publicAction === "status") {
        const status = await getRegistrationPublicStatus(reference, token)
        if (!status) return jsonError("Registration receipt was not found.", "REGISTRATION_NOT_FOUND", 404)
        return NextResponse.json({ status }, { headers: privateHeaders })
      }
      const activation = await getRegistrationActivationStatus(reference, token)
      if (!activation) return jsonError("Activation invitation was not found.", "REGISTRATION_NOT_FOUND", 404)
      return NextResponse.json({ activation }, { headers: privateHeaders })
    } catch (error) {
      return repositoryError(error)
    }
  }

  if (!isPublicRole(body.role)) {
    return jsonError(
      "Only owner, tenant or staff access may be requested publicly. Management and finance authority is assigned internally.",
      "REGISTRATION_ROLE_FORBIDDEN",
      403
    )
  }
  const fullName = asString(body.fullName, 120)
  const email = asString(body.email, 254)?.toLocaleLowerCase("en-US") ?? null
  if (!fullName || fullName.length < 2 || !email || !emailPattern.test(email)) {
    return jsonError("A valid full name and email are required.", "REGISTRATION_IDENTITY_INVALID", 400)
  }
  const clientRate = consumeRequestRateLimit({
    request,
    scope: "registration-submit-client",
    limit: 20,
    windowMs: 60 * 60 * 1000,
  })
  const emailRate = consumeRequestRateLimit({
    request,
    scope: "registration-submit-email",
    subject: email,
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000,
  })
  if (!clientRate.allowed || !emailRate.allowed) {
    const deniedRetryWindows = [
      !clientRate.allowed ? clientRate.retryAfterSeconds : 0,
      !emailRate.allowed ? emailRate.retryAfterSeconds : 0,
    ]
    return rateLimitError(
      Math.max(...deniedRetryWindows)
    )
  }
  if (body.consent !== true) {
    return jsonError("Versioned KVKK consent is required.", "REGISTRATION_CONSENT_REQUIRED", 400)
  }
  const idType = asString(body.idType, 40)
  const idNumber = asString(body.idNumber, 60)
  const unitClaim = asString(body.unitClaim, 120)
  const proofType = asString(body.proofType, 40)
  const proofReference = asString(body.proofReference, 160)
  const inviteCode = asString(body.inviteCode, 256)
  const position = asString(body.position, 120)
  if ((body.role === "owner" || body.role === "tenant") && (!idType || !idNumber)) {
    return jsonError(
      "Owner and tenant requests require identity evidence for human review.",
      "REGISTRATION_EVIDENCE_REQUIRED",
      400
    )
  }
  if ((body.role === "owner" || body.role === "tenant") && !unitClaim) {
    return jsonError(
      "Owner and tenant requests must identify the claimed unit for human scope review.",
      "REGISTRATION_UNIT_REQUIRED",
      400
    )
  }
  if (body.role === "owner" && (!proofType || !proofReference)) {
    return jsonError(
      "Owner requests require a title, contract or reservation reference.",
      "REGISTRATION_OWNERSHIP_EVIDENCE_REQUIRED",
      400
    )
  }
  if (body.role === "tenant" && !inviteCode && !proofReference) {
    return jsonError(
      "Tenant requests require an owner invitation or tenancy evidence reference.",
      "REGISTRATION_TENANCY_EVIDENCE_REQUIRED",
      400
    )
  }
  if (body.role === "staff" && !position) {
    return jsonError(
      "Staff requests require a position or team for site-scope review.",
      "REGISTRATION_STAFF_POSITION_REQUIRED",
      400
    )
  }
  const identityDigest = idNumber ? protectedIdentityDigest(idNumber) : null
  if ((body.role === "owner" || body.role === "tenant") && !identityDigest) {
    return jsonError(
      "Identity evidence protection is not configured. The request was not stored.",
      "REGISTRATION_IDENTITY_PROTECTION_UNAVAILABLE",
      503
    )
  }
  const source = body.source === "signup" ? "signup" : "new-level-premium"
  const requestLocale = locale(body.language)
  try {
    const result = await submitRegistration({
      role: body.role,
      fullName,
      email,
      phone: asString(body.phone, 60),
      language: requestLocale,
      unitClaim,
      proofType,
      proofReference,
      inviteCode,
      position,
      idType,
      identityDigest,
      issuingCountry: asString(body.issuingCountry, 80),
      consent: true,
      consentVersion,
      consentTextDigest,
      consentLocale: locale(body.consentLocale ?? requestLocale),
      source,
      submissionKey: idempotencyKey(request, body),
    })
    return NextResponse.json(result, { status: result.replayed ? 200 : 201, headers: privateHeaders })
  } catch (error) {
    return repositoryError(error)
  }
}

export async function GET(request: NextRequest) {
  if (
    request.nextUrl.searchParams.has("lookupToken") ||
    request.nextUrl.searchParams.has("activationToken")
  ) {
    return jsonError(
      "Private registration receipts must be sent in a no-store POST body.",
      "REGISTRATION_SECRET_QUERY_REJECTED",
      405
    )
  }
  try {
    const profile = await getUserProfile()
    if (!profile) return jsonError("Authentication is required.", "AUTH_REQUIRED", 401)
    if (profile.role !== "admin" && profile.role !== "manager") {
      return jsonError("Registration review is limited to management.", "REGISTRATION_FORBIDDEN", 403)
    }
    return NextResponse.json(await getRegistrationReviewData(profile), {
      headers: privateHeaders,
    })
  } catch (error) {
    return repositoryError(error)
  }
}

export async function PATCH(request: NextRequest) {
  if (!mutationOriginAllowed(request)) {
    return jsonError("Cross-site request rejected.", "REGISTRATION_ORIGIN_REJECTED", 403)
  }
  const body = await readBody(request)
  if (!body) return jsonError("Request body must be valid JSON.", "REGISTRATION_INVALID_JSON", 400)
  const action = asString(body.action, 40)
  const key = idempotencyKey(request, body)
  if (!key || key.length < 8 || key.length > 200) {
    return jsonError("An Idempotency-Key is required.", "REGISTRATION_IDEMPOTENCY_REQUIRED", 400)
  }

  const profile = await getUserProfile()
  if (!profile) return jsonError("Authentication is required.", "AUTH_REQUIRED", 401)
  try {
    if (action === "activate") {
      const reference = asString(body.reference, 40)
      const activationToken = asString(body.activationToken, 256)
      if (!reference || !activationToken) {
        return jsonError("Activation reference and token are required.", "REGISTRATION_ACTIVATION_INVALID", 400)
      }
      return NextResponse.json(
        {
          activation: await redeemRegistrationActivation({
            reference,
            activationToken,
            idempotencyKey: key,
          }),
        },
        { headers: privateHeaders }
      )
    }

    if (profile.role !== "admin" && profile.role !== "manager") {
      return jsonError("Registration review is limited to management.", "REGISTRATION_FORBIDDEN", 403)
    }
    const requestId = asString(body.requestId, 40)
    const expectedVersion = Number(body.expectedVersion)
    const reason = asString(body.reason, 1000)
    if (!requestId || !uuidPattern.test(requestId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      return jsonError("A valid request and version are required.", "REGISTRATION_VERSION_INVALID", 400)
    }
    if (!reason || reason.length < 10) {
      return jsonError("A business reason of at least 10 characters is required.", "REGISTRATION_REASON_REQUIRED", 422)
    }

    if (action === "recommend") {
      const recommendation = asString(body.recommendation, 40)
      if (
        recommendation !== "approve" &&
        recommendation !== "reject" &&
        recommendation !== "more_information"
      ) {
        return jsonError("A valid recommendation is required.", "REGISTRATION_RECOMMENDATION_INVALID", 400)
      }
      const registration = await recommendRegistration({
        requestId,
        expectedVersion,
        recommendation: recommendation as RegistrationRecommendation,
        reason,
        idempotencyKey: key,
      })
      return NextResponse.json({ registration }, { headers: privateHeaders })
    }

    if (profile.role !== "admin") {
      return jsonError("Only an administrator may grant or reject account access.", "REGISTRATION_GRANT_FORBIDDEN", 403)
    }
    if (action !== "approve" && action !== "reject") {
      return jsonError("Unsupported registration action.", "REGISTRATION_ACTION_INVALID", 400)
    }
    const rawSiteIds = Array.isArray(body.siteIds) ? body.siteIds : []
    const siteIds = rawSiteIds.filter(
      (value): value is string => typeof value === "string" && uuidPattern.test(value)
    )
    if (siteIds.length !== rawSiteIds.length) {
      return jsonError("One or more site assignments are invalid.", "REGISTRATION_SCOPE_INVALID", 400)
    }
    const unitId = body.unitId === null ? null : asString(body.unitId, 40)
    if (unitId && !uuidPattern.test(unitId)) {
      return jsonError("The selected unit is invalid.", "REGISTRATION_SCOPE_INVALID", 400)
    }
    const activationExpiresAt =
      action === "approve" ? asString(body.activationExpiresAt, 50) : null
    if (
      action === "approve" &&
      (!activationExpiresAt || Number.isNaN(Date.parse(activationExpiresAt)))
    ) {
      return jsonError("A valid activation expiry is required.", "REGISTRATION_EXPIRY_INVALID", 400)
    }
    const registration = await decideRegistration({
      requestId,
      expectedVersion,
      decision: action,
      reason,
      activationExpiresAt,
      unitId,
      siteIds,
      idempotencyKey: key,
    })
    return NextResponse.json({ registration }, { headers: privateHeaders })
  } catch (error) {
    return repositoryError(error)
  }
}
