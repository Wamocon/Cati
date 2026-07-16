import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import { mutationOriginAllowed } from "@/lib/request-security"
import {
  reportTypes,
  ReportingRepositoryError,
  requestReport,
  reviewReportCommentary,
  getReportingData,
  type ReportType,
} from "@/lib/reporting-repository"

export const dynamic = "force-dynamic"

const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_MUTATION_BODY_BYTES = 32 * 1024

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function errorResponse(error: unknown) {
  if (error instanceof ReportingRepositoryError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.httpStatus, headers: privateHeaders }
    )
  }
  console.error("Reporting operation failed.", error)
  return NextResponse.json(
    { error: "Reporting is temporarily unavailable.", code: "REPORTING_UNAVAILABLE" },
    { status: 503, headers: privateHeaders }
  )
}

async function authorization(action: "view" | "create" | "export") {
  const profile = await getUserProfile()
  if (!profile) {
    return { profile: null, response: NextResponse.json(
      { error: "Authentication is required.", code: "AUTH_REQUIRED" },
      { status: 401, headers: privateHeaders }
    ) }
  }
  if (!hasPermission(profile.role, "reports", action)) {
    return { profile: null, response: NextResponse.json(
      { error: "Your role cannot access this reporting operation.", code: "REPORTING_FORBIDDEN" },
      { status: 403, headers: privateHeaders }
    ) }
  }
  return { profile, response: null }
}

function readLimit(value: string | null): number {
  const parsed = Number(value ?? 50)
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 100) : 50
}

function readIdempotency(request: NextRequest, payload: Record<string, unknown>) {
  return request.headers.get("Idempotency-Key")?.trim() || string(payload.idempotencyKey)
}

function expectedVersion(request: NextRequest, payload: Record<string, unknown>): number | null {
  if (typeof payload.expectedVersion === "number" && Number.isInteger(payload.expectedVersion) && payload.expectedVersion > 0) {
    return payload.expectedVersion
  }
  const match = request.headers.get("If-Match")?.trim().match(/^(?:W\/)?"?(\d+)"?$/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
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
        await reader.cancel()
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
    const raw = new TextDecoder().decode(bytes)
    return { payload: record(JSON.parse(raw) as unknown), tooLarge: false }
  } catch {
    return { payload: null, tooLarge: false }
  }
}

function requestError(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status, headers: privateHeaders })
}

export async function GET(request: NextRequest) {
  const authorized = await authorization("view")
  if (!authorized.profile) return authorized.response
  try {
    return NextResponse.json(
      await getReportingData(authorized.profile, readLimit(request.nextUrl.searchParams.get("limit"))),
      { headers: privateHeaders }
    )
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  if (!mutationOriginAllowed(request)) {
    return requestError("Cross-site request rejected.", "REPORTING_ORIGIN_REJECTED", 403)
  }
  const authorized = await authorization("create")
  if (!authorized.profile) return authorized.response
  const body = await readMutationBody(request)
  if (body.tooLarge) return requestError("Request body exceeds 32 KB.", "REPORTING_BODY_TOO_LARGE", 413)
  if (!body.payload) return requestError("Request body must be valid JSON.", "REPORTING_INVALID_JSON", 400)
  const payload = body.payload
  const reportType = payload.reportType
  if (!reportTypes.includes(reportType as ReportType)) {
    return NextResponse.json(
      { error: "The report type is not supported.", code: "REPORTING_TYPE_INVALID" },
      { status: 422, headers: privateHeaders }
    )
  }
  const rawSites = payload.siteIds ?? []
  if (!Array.isArray(rawSites) || rawSites.length > 100 || rawSites.some((id) => typeof id !== "string" || !uuidPattern.test(id))) {
    return NextResponse.json(
      { error: "siteIds must contain at most 100 valid identifiers.", code: "REPORTING_SITE_SCOPE_INVALID" },
      { status: 422, headers: privateHeaders }
    )
  }
  const filters = record(payload.filters)
  if (Object.keys(filters).some((key) => !["from", "to", "status"].includes(key)) ||
      Object.values(filters).some((value) => typeof value !== "string" || value.length > 100)) {
    return NextResponse.json(
      { error: "Only bounded from, to, and status filters are supported.", code: "REPORTING_FILTERS_INVALID" },
      { status: 422, headers: privateHeaders }
    )
  }
  const idempotencyKey = readIdempotency(request, payload)
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return NextResponse.json(
      { error: "An Idempotency-Key between 8 and 200 characters is required.", code: "REPORTING_IDEMPOTENCY_REQUIRED" },
      { status: 400, headers: privateHeaders }
    )
  }
  try {
    const result = await requestReport(authorized.profile, {
      reportType: reportType as ReportType,
      siteIds: rawSites as string[],
      filters,
      idempotencyKey,
    })
    return NextResponse.json(result, {
      status: result.replayed === true ? 200 : 201,
      headers: privateHeaders,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  if (!mutationOriginAllowed(request)) {
    return requestError("Cross-site request rejected.", "REPORTING_ORIGIN_REJECTED", 403)
  }
  const authorized = await authorization("create")
  if (!authorized.profile) return authorized.response
  const body = await readMutationBody(request)
  if (body.tooLarge) return requestError("Request body exceeds 32 KB.", "REPORTING_BODY_TOO_LARGE", 413)
  if (!body.payload) return requestError("Request body must be valid JSON.", "REPORTING_INVALID_JSON", 400)
  const payload = body.payload
  const artifactId = string(payload.artifactId)
  const version = expectedVersion(request, payload)
  const decision = payload.decision
  const reason = string(payload.reason)
  const idempotencyKey = readIdempotency(request, payload)
  if (!artifactId || !uuidPattern.test(artifactId)) {
    return NextResponse.json({ error: "A valid artifactId is required.", code: "REPORTING_ARTIFACT_ID_INVALID" }, { status: 422, headers: privateHeaders })
  }
  if (!version) {
    return NextResponse.json({ error: "A positive expectedVersion or If-Match is required.", code: "REPORTING_VERSION_REQUIRED" }, { status: 428, headers: privateHeaders })
  }
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "Decision must be approved or rejected.", code: "REPORTING_REVIEW_INVALID" }, { status: 422, headers: privateHeaders })
  }
  if (!reason || reason.length < 10 || reason.length > 1000) {
    return NextResponse.json({ error: "A review reason between 10 and 1000 characters is required.", code: "REPORTING_REVIEW_REASON_REQUIRED" }, { status: 422, headers: privateHeaders })
  }
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return NextResponse.json({ error: "A bounded Idempotency-Key is required.", code: "REPORTING_IDEMPOTENCY_REQUIRED" }, { status: 400, headers: privateHeaders })
  }
  try {
    const result = await reviewReportCommentary(authorized.profile, {
      artifactId, expectedVersion: version, decision, reason, idempotencyKey,
    })
    return NextResponse.json(result, {
      headers: { ...privateHeaders, ETag: `"${String(result.version ?? version)}"` },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
