import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import {
  complianceDecisions,
  ComplianceRepositoryError,
  decideComplianceCase,
  getComplianceCockpitData,
  type ComplianceDecision,
} from "@/lib/compliance-repository"
import { hasPermission } from "@/lib/rbac"

export const dynamic = "force-dynamic"

const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
}
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readLimit(value: string | null): number {
  const parsed = Number(value ?? 100)
  if (!Number.isFinite(parsed)) return 100
  return Math.min(Math.max(Math.trunc(parsed), 1), 250)
}

function isComplianceDecision(value: unknown): value is ComplianceDecision {
  return complianceDecisions.includes(value as ComplianceDecision)
}

function readExpectedVersion(
  request: NextRequest,
  payload: Record<string, unknown>
): number | null {
  const bodyVersion = payload.expectedVersion
  if (
    typeof bodyVersion === "number" &&
    Number.isInteger(bodyVersion) &&
    bodyVersion > 0
  ) {
    return bodyVersion
  }

  const ifMatch = request.headers.get("If-Match")?.trim()
  const match = ifMatch?.match(/^(?:W\/)?"?(\d+)"?$/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function errorResponse(error: unknown) {
  if (error instanceof ComplianceRepositoryError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.httpStatus, headers: privateHeaders }
    )
  }
  console.error("Compliance cockpit operation failed.", error)
  return NextResponse.json(
    {
      error: "The compliance cockpit is temporarily unavailable.",
      code: "COMPLIANCE_UNAVAILABLE",
    },
    { status: 503, headers: privateHeaders }
  )
}

async function authorizedProfile() {
  const profile = await getUserProfile()
  if (!profile) return { profile: null, response: NextResponse.json(
    { error: "Authentication is required.", code: "AUTH_REQUIRED" },
    { status: 401, headers: privateHeaders }
  ) }

  if (!hasPermission(profile.role, "eids_compliance", "view")) {
    return { profile: null, response: NextResponse.json(
      {
        error: "Your role cannot access organization compliance cases.",
        code: "COMPLIANCE_FORBIDDEN",
      },
      { status: 403, headers: privateHeaders }
    ) }
  }

  return { profile, response: null }
}

export async function GET(request: NextRequest) {
  const authorization = await authorizedProfile()
  if (!authorization.profile) return authorization.response

  try {
    const data = await getComplianceCockpitData(
      authorization.profile,
      readLimit(request.nextUrl.searchParams.get("limit"))
    )
    return NextResponse.json(data, { headers: privateHeaders })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorizedProfile()
  if (!authorization.profile) return authorization.response

  if (!hasPermission(authorization.profile.role, "eids_compliance", "approve")) {
    return NextResponse.json(
      {
        error: "Human compliance-decision authority is required.",
        code: "COMPLIANCE_DECISION_FORBIDDEN",
      },
      { status: 403, headers: privateHeaders }
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = asRecord(await request.json())
  } catch {
    return NextResponse.json(
      {
        error: "Request body must be valid JSON.",
        code: "COMPLIANCE_INVALID_JSON",
      },
      { status: 400, headers: privateHeaders }
    )
  }

  const caseId = asString(payload.caseId)
  const expectedVersion = readExpectedVersion(request, payload)
  const decision = payload.decision
  const rationale = asString(payload.rationale)
  const idempotencyKey =
    request.headers.get("Idempotency-Key")?.trim() ??
    asString(payload.idempotencyKey)

  if (!caseId || !uuidPattern.test(caseId)) {
    return NextResponse.json(
      {
        error: "A valid compliance case id is required.",
        code: "COMPLIANCE_CASE_ID_INVALID",
      },
      { status: 400, headers: privateHeaders }
    )
  }
  if (!expectedVersion) {
    return NextResponse.json(
      {
        error: "A positive expectedVersion or If-Match value is required.",
        code: "COMPLIANCE_VERSION_REQUIRED",
      },
      { status: 428, headers: privateHeaders }
    )
  }
  if (!isComplianceDecision(decision)) {
    return NextResponse.json(
      {
        error: "The requested compliance decision is not supported.",
        code: "COMPLIANCE_DECISION_INVALID",
      },
      { status: 422, headers: privateHeaders }
    )
  }
  if (!rationale || rationale.length < 10 || rationale.length > 1000) {
    return NextResponse.json(
      {
        error: "A rationale between 10 and 1000 characters is required.",
        code: "COMPLIANCE_RATIONALE_REQUIRED",
      },
      { status: 422, headers: privateHeaders }
    )
  }
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return NextResponse.json(
      {
        error: "An Idempotency-Key between 8 and 200 characters is required.",
        code: "COMPLIANCE_IDEMPOTENCY_REQUIRED",
      },
      { status: 400, headers: privateHeaders }
    )
  }

  try {
    const data = await decideComplianceCase(authorization.profile, {
      caseId,
      expectedVersion,
      decision,
      rationale,
      idempotencyKey,
    })
    const updated = data.cases.find((item) => item.id === caseId)
    const responseHeaders = {
      ...privateHeaders,
      ...(updated ? { ETag: `"${updated.version}"` } : {}),
    }
    return NextResponse.json(
      { data, updatedCase: updated ?? null, idempotencyKey },
      { headers: responseHeaders }
    )
  } catch (error) {
    return errorResponse(error)
  }
}
