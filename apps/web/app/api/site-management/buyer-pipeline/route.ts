import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { mutationOriginAllowed } from "@/lib/request-security"
import {
  addBuyerProspectNote,
  buyerSources,
  buyerStages,
  BuyerPipelineRepositoryError,
  convertBuyerProspect,
  createBuyerProspect,
  getBuyerPipelineData,
  transitionBuyerProspect,
  updateBuyerProspect,
  type BuyerSource,
  type BuyerStage,
  type ConsentStatus,
} from "@/lib/buyer-pipeline-repository"

export const dynamic = "force-dynamic"

const ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"
const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
}
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const digestPattern = /^[0-9a-f]{64}$/i
const MAX_MUTATION_BODY_BYTES = 32 * 1024

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}
function optionalUuid(value: unknown): string | null | undefined {
  if (value == null || value === "") return null
  return typeof value === "string" && uuidPattern.test(value)
    ? value
    : undefined
}
function idempotency(request: NextRequest, payload: Record<string, unknown>) {
  return (
    request.headers.get("Idempotency-Key")?.trim() ||
    string(payload.idempotencyKey)
  )
}
function version(
  request: NextRequest,
  payload: Record<string, unknown>
): number | null {
  if (
    typeof payload.expectedVersion === "number" &&
    Number.isInteger(payload.expectedVersion) &&
    payload.expectedVersion > 0
  )
    return payload.expectedVersion
  const match = request.headers
    .get("If-Match")
    ?.trim()
    .match(/^(?:W\/)?"?(\d+)"?$/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function errorResponse(error: unknown) {
  if (error instanceof BuyerPipelineRepositoryError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.httpStatus, headers: privateHeaders }
    )
  }
  console.error("Buyer pipeline operation failed.", error)
  return NextResponse.json(
    {
      error: "The buyer pipeline is temporarily unavailable.",
      code: "BUYER_PIPELINE_UNAVAILABLE",
    },
    { status: 503, headers: privateHeaders }
  )
}

async function authorizedProfile() {
  const profile = await getUserProfile()
  if (!profile)
    return {
      profile: null,
      response: NextResponse.json(
        { error: "Authentication is required.", code: "AUTH_REQUIRED" },
        { status: 401, headers: privateHeaders }
      ),
    }
  if (profile.role !== "admin" && profile.role !== "manager") {
    return {
      profile: null,
      response: NextResponse.json(
        {
          error: "Your role cannot access the buyer pipeline.",
          code: "BUYER_PIPELINE_FORBIDDEN",
        },
        { status: 403, headers: privateHeaders }
      ),
    }
  }
  return { profile, response: null }
}

function localMutationResponse(profile: {
  id: string
  company_id?: string | null
}) {
  if (profile.id !== ACCESS_PROFILE_ID && profile.company_id) return null
  return NextResponse.json(
    {
      error:
        "Persistent buyer records require a real organization-scoped session.",
      code: "BUYER_PIPELINE_REAL_AUTH_REQUIRED",
    },
    { status: 403, headers: privateHeaders }
  )
}

function readLimit(value: string | null) {
  const parsed = Number(value ?? 100)
  return Number.isFinite(parsed)
    ? Math.min(Math.max(Math.trunc(parsed), 1), 250)
    : 100
}

function validationError(message: string, code: string, status = 422) {
  return NextResponse.json(
    { error: message, code },
    { status, headers: privateHeaders }
  )
}

async function readMutationBody(request: NextRequest) {
  const declared = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(declared) && declared > MAX_MUTATION_BODY_BYTES) {
    return { payload: null, tooLarge: true }
  }
  try {
    if (!request.body) return { payload: null, tooLarge: false }
    const reader = request.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_MUTATION_BODY_BYTES) {
        await reader.cancel().catch(() => undefined)
        return { payload: null, tooLarge: true }
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    return { payload: record(JSON.parse(raw) as unknown), tooLarge: false }
  } catch {
    return { payload: null, tooLarge: false }
  }
}

export async function GET(request: NextRequest) {
  const authorized = await authorizedProfile()
  if (!authorized.profile) return authorized.response
  try {
    return NextResponse.json(
      await getBuyerPipelineData(
        authorized.profile,
        readLimit(request.nextUrl.searchParams.get("limit"))
      ),
      { headers: privateHeaders }
    )
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  if (!mutationOriginAllowed(request))
    return validationError(
      "Cross-site request rejected.",
      "BUYER_PIPELINE_ORIGIN_REJECTED",
      403
    )
  const authorized = await authorizedProfile()
  if (!authorized.profile) return authorized.response
  const local = localMutationResponse(authorized.profile)
  if (local) return local
  const body = await readMutationBody(request)
  if (body.tooLarge)
    return validationError(
      "Request body exceeds 32 KB.",
      "BUYER_PIPELINE_BODY_TOO_LARGE",
      413
    )
  if (!body.payload)
    return validationError(
      "Request body must be valid JSON.",
      "BUYER_PIPELINE_INVALID_JSON",
      400
    )
  const payload = body.payload
  const fullName = string(payload.fullName)
  const email = string(payload.email)
  const phone = string(payload.phone)
  const source = payload.source
  const siteId = string(payload.siteId)
  const unitId = optionalUuid(payload.unitId)
  const managerId = string(payload.assignedManagerId)
  const consentStatus = (string(payload.consentStatus) ??
    "pending") as ConsentStatus
  const consentVersion = string(payload.consentVersion)
  const consentTextDigest =
    string(payload.consentTextDigest)?.toLowerCase() ?? null
  const preferredLocale = string(payload.preferredLocale) ?? "tr"
  const key = idempotency(request, payload)
  if (
    !fullName ||
    fullName.length < 2 ||
    fullName.length > 120 ||
    (!email && !phone)
  )
    return validationError(
      "A name and email or phone are required.",
      "BUYER_PIPELINE_CONTACT_INVALID"
    )
  if (!buyerSources.includes(source as BuyerSource))
    return validationError(
      "The buyer source is not supported.",
      "BUYER_PIPELINE_SOURCE_INVALID"
    )
  if (
    !siteId ||
    !uuidPattern.test(siteId) ||
    !managerId ||
    !uuidPattern.test(managerId) ||
    unitId === undefined
  )
    return validationError(
      "Valid site, manager, and optional unit identifiers are required.",
      "BUYER_PIPELINE_SCOPE_INVALID"
    )
  if (
    !["pending", "granted"].includes(consentStatus) ||
    !["tr", "en", "de", "ru"].includes(preferredLocale)
  )
    return validationError(
      "Consent status or locale is invalid.",
      "BUYER_PIPELINE_CONSENT_INVALID"
    )
  if (
    consentStatus === "granted" &&
    (!consentVersion ||
      !consentTextDigest ||
      !digestPattern.test(consentTextDigest))
  )
    return validationError(
      "Granted consent requires a version and 64-character evidence digest.",
      "BUYER_PIPELINE_CONSENT_EVIDENCE_REQUIRED"
    )
  if (consentStatus === "pending" && (consentVersion || consentTextDigest))
    return validationError(
      "Pending consent cannot contain grant evidence.",
      "BUYER_PIPELINE_CONSENT_INVALID"
    )
  if (!key || key.length < 8 || key.length > 200)
    return validationError(
      "An Idempotency-Key between 8 and 200 characters is required.",
      "BUYER_PIPELINE_IDEMPOTENCY_REQUIRED",
      400
    )
  const followUpAt = string(payload.followUpAt)
  if (followUpAt && !Number.isFinite(Date.parse(followUpAt)))
    return validationError(
      "followUpAt must be an ISO date.",
      "BUYER_PIPELINE_FOLLOW_UP_INVALID"
    )
  try {
    const result = await createBuyerProspect(authorized.profile, {
      fullName,
      email,
      phone,
      source: source as BuyerSource,
      sourceDetail: string(payload.sourceDetail),
      siteId,
      unitId,
      assignedManagerId: managerId,
      followUpAt,
      consentStatus,
      consentVersion,
      consentTextDigest,
      preferredLocale: preferredLocale as "tr" | "en" | "de" | "ru",
      idempotencyKey: key,
    })
    return NextResponse.json(result, {
      status: result.replayed === true || result.duplicate === true ? 200 : 201,
      headers: privateHeaders,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  if (!mutationOriginAllowed(request))
    return validationError(
      "Cross-site request rejected.",
      "BUYER_PIPELINE_ORIGIN_REJECTED",
      403
    )
  const authorized = await authorizedProfile()
  if (!authorized.profile) return authorized.response
  const local = localMutationResponse(authorized.profile)
  if (local) return local
  const body = await readMutationBody(request)
  if (body.tooLarge)
    return validationError(
      "Request body exceeds 32 KB.",
      "BUYER_PIPELINE_BODY_TOO_LARGE",
      413
    )
  if (!body.payload)
    return validationError(
      "Request body must be valid JSON.",
      "BUYER_PIPELINE_INVALID_JSON",
      400
    )
  const payload = body.payload
  const action = string(payload.action)
  const prospectId = string(payload.prospectId)
  const expectedVersion = version(request, payload)
  const key = idempotency(request, payload)
  if (!prospectId || !uuidPattern.test(prospectId))
    return validationError(
      "A valid prospectId is required.",
      "BUYER_PIPELINE_PROSPECT_ID_INVALID"
    )
  if (!expectedVersion)
    return validationError(
      "A positive expectedVersion or If-Match is required.",
      "BUYER_PIPELINE_VERSION_REQUIRED",
      428
    )
  if (!key || key.length < 8 || key.length > 200)
    return validationError(
      "A bounded Idempotency-Key is required.",
      "BUYER_PIPELINE_IDEMPOTENCY_REQUIRED",
      400
    )
  try {
    if (action === "transition") {
      const toStage = payload.toStage
      const reason = string(payload.reason)
      if (
        !buyerStages.includes(toStage as BuyerStage) ||
        (toStage === "lost" && (!reason || reason.length < 3))
      )
        return validationError(
          "A supported next stage and loss reason when applicable are required.",
          "BUYER_PIPELINE_STAGE_INVALID"
        )
      return NextResponse.json(
        await transitionBuyerProspect(authorized.profile, {
          prospectId,
          expectedVersion,
          toStage: toStage as BuyerStage,
          reason,
          idempotencyKey: key,
        }),
        { headers: privateHeaders }
      )
    }
    if (action === "note") {
      const body = string(payload.body)
      if (!body || body.length < 2 || body.length > 4000)
        return validationError(
          "A note between 2 and 4000 characters is required.",
          "BUYER_PIPELINE_NOTE_INVALID"
        )
      return NextResponse.json(
        await addBuyerProspectNote(authorized.profile, {
          prospectId,
          expectedVersion,
          body,
          idempotencyKey: key,
        }),
        { headers: privateHeaders }
      )
    }
    if (action === "convert") {
      const targetType = payload.targetType
      const targetId = string(payload.targetId)
      if (
        (targetType !== "registration_request" &&
          targetType !== "reservation") ||
        !targetId ||
        !uuidPattern.test(targetId)
      )
        return validationError(
          "An existing registration or reservation target is required.",
          "BUYER_PIPELINE_TARGET_INVALID"
        )
      return NextResponse.json(
        await convertBuyerProspect(authorized.profile, {
          prospectId,
          expectedVersion,
          targetType,
          targetId,
          idempotencyKey: key,
        }),
        { headers: privateHeaders }
      )
    }
    if (action === "update") {
      const managerId = string(payload.assignedManagerId)
      const email = string(payload.email)
      const phone = string(payload.phone)
      const consentStatus = string(payload.consentStatus) as ConsentStatus
      const consentTextDigest =
        string(payload.consentTextDigest)?.toLowerCase() ?? null
      const consentVersion = string(payload.consentVersion)
      const preferredLocale = string(payload.preferredLocale)
      const interests = payload.interestUnitIds ?? []
      if (
        !managerId ||
        !uuidPattern.test(managerId) ||
        (!email && !phone) ||
        !["pending", "granted", "withdrawn"].includes(consentStatus) ||
        !preferredLocale ||
        !["tr", "en", "de", "ru"].includes(preferredLocale) ||
        !Array.isArray(interests) ||
        interests.length > 20 ||
        interests.some((id) => typeof id !== "string" || !uuidPattern.test(id))
      )
        return validationError(
          "The buyer update payload is invalid.",
          "BUYER_PIPELINE_UPDATE_INVALID"
        )
      const hasConsentVersion = Boolean(consentVersion)
      const hasConsentDigest = Boolean(consentTextDigest)
      if (
        hasConsentVersion !== hasConsentDigest ||
        (consentTextDigest !== null && !digestPattern.test(consentTextDigest))
      )
        return validationError(
          "Consent evidence must be omitted or supplied as a valid version and digest pair.",
          "BUYER_PIPELINE_CONSENT_INVALID"
        )
      if (consentStatus === "pending" && hasConsentVersion)
        return validationError(
          "Pending consent cannot contain grant evidence.",
          "BUYER_PIPELINE_CONSENT_INVALID"
        )
      const followUpAt = string(payload.followUpAt)
      if (followUpAt && !Number.isFinite(Date.parse(followUpAt)))
        return validationError(
          "followUpAt must be an ISO date.",
          "BUYER_PIPELINE_FOLLOW_UP_INVALID"
        )
      return NextResponse.json(
        await updateBuyerProspect(authorized.profile, {
          prospectId,
          expectedVersion,
          email,
          phone,
          assignedManagerId: managerId,
          followUpAt,
          sourceDetail: string(payload.sourceDetail),
          consentStatus,
          consentVersion,
          consentTextDigest,
          preferredLocale: preferredLocale as "tr" | "en" | "de" | "ru",
          interestUnitIds: interests as string[],
          idempotencyKey: key,
        }),
        { headers: privateHeaders }
      )
    }
    return validationError(
      "The buyer pipeline action is not supported.",
      "BUYER_PIPELINE_ACTION_INVALID"
    )
  } catch (error) {
    return errorResponse(error)
  }
}
