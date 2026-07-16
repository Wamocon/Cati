import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { mutationOriginAllowed } from "@/lib/request-security"
import {
  classifyPublicReportSafety,
  isPublicReportCategory,
  isPublicReportLocale,
  isPublicReportPlacementAction,
  isPublicReportReviewAction,
  type PublicReportSubmission,
} from "@/lib/public-report"
import {
  getPublicProblemReportReviewData,
  managePublicReportPlacement,
  PublicReportRepositoryError,
  resolvePublicReportPlacement,
  reviewPublicProblemReport,
  submitPublicProblemReport,
  trackPublicProblemReport,
} from "@/lib/public-report-repository"
import { submitPublicReport } from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

const safeHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
}
const MAX_PUBLIC_REPORT_BODY_BYTES = 16_384
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: safeHeaders })
const stringValue = (value: unknown, max: number, empty = false) => {
  if (typeof value !== "string") return null
  const result = value.normalize("NFKC").trim()
  return ((!empty && !result) || result.length > max) ? null : result
}
const recordValue = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null

const uuidValue = (value: unknown) => {
  const result = stringValue(value, 36)
  return result && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)
    ? result
    : null
}

function placementLabels(value: unknown) {
  const labels = recordValue(value)
  const locales = ["tr", "en", "de", "ru"] as const
  if (!labels || Object.keys(labels).some((key) => !locales.includes(key as typeof locales[number]))) {
    return null
  }
  const entries = locales.map((locale) => [locale, stringValue(labels[locale], 120)] as const)
  if (entries.some(([, label]) => !label || label.length < 2)) return null
  return Object.fromEntries(entries) as Record<typeof locales[number], string>
}

function trustedClientAddress(request: NextRequest) {
  // Vercel overwrites this header at the trusted edge. Never mix attacker-controlled
  // User-Agent data into the primary rate-limit identity.
  const edgeAddress = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
  if (edgeAddress) return edgeAddress.slice(0, 80)
  const production = process.env.VERCEL_ENV === "production" || process.env.CATI_ENV === "production"
  if (production) return "trusted-edge-address-unavailable"
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local-address-unavailable"
  ).slice(0, 80)
}

async function readBody(request: Request) {
  const declaredLength = request.headers.get("content-length")
  if (declaredLength !== null) {
    const bytes = Number(declaredLength)
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > MAX_PUBLIC_REPORT_BODY_BYTES) {
      return null
    }
  }
  if (!request.body) return null
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_PUBLIC_REPORT_BODY_BYTES) {
        await reader.cancel().catch(() => undefined)
        return null
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
    return recordValue(JSON.parse(raw) as unknown)
  } catch {
    await reader.cancel().catch(() => undefined)
    return null
  }
}

function failure(error: unknown) {
  if (error instanceof PublicReportRepositoryError) {
    return reply({ ok: false, code: error.code }, error.status)
  }
  return reply({ ok: false, code: "PUBLIC_REPORT_UNAVAILABLE" }, 503)
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const qrToken = stringValue(params.get("qrToken"), 100)
  try {
    if (qrToken) {
      return reply({ ok: true, placement: await resolvePublicReportPlacement(qrToken) })
    }
    const profile = await getUserProfile()
    if (!profile) return reply({ ok: false, code: "PUBLIC_REPORT_UNAUTHORIZED" }, 401)
    if (profile.role !== "manager" && profile.role !== "admin") {
      return reply({ ok: false, code: "PUBLIC_REPORT_FORBIDDEN" }, 403)
    }
    return reply({ ok: true, queue: await getPublicProblemReportReviewData() })
  } catch (error) { return failure(error) }
}

export async function POST(request: NextRequest) {
  if (!mutationOriginAllowed(request)) {
    return reply({ ok: false, code: "PUBLIC_REPORT_ORIGIN_REJECTED" }, 403)
  }
  const body = await readBody(request)
  if (!body) return reply({ ok: false, code: "PUBLIC_REPORT_INVALID_JSON" }, 400)

  if (body.action === "track") {
    const reference = stringValue(body.reference, 40)
    const trackingToken = stringValue(body.trackingToken, 200)
    if (!reference || !trackingToken) {
      return reply({ ok: false, code: "PUBLIC_REPORT_TRACKING_AUTH_REQUIRED" }, 400)
    }
    try {
      return reply({ ok: true, report: await trackPublicProblemReport(reference, trackingToken) })
    } catch (error) { return failure(error) }
  }

  // Legacy flat anonymous report contract used by the public no-QR landing form
  // (<NlpReport/>). This path never carries a qrToken; the secure QR intake path
  // below requires one, so the two contracts never overlap. The mutation-origin
  // check (above) and the 16 KB body cap (readBody) still apply, and identity/PII
  // is still rejected. The QR honeypot/idempotency/consentLocale rules are QR-only.
  if (typeof body.qrToken === "undefined") {
    const zone = stringValue(body.zone, 80)
    const flatDescription = stringValue(body.description, 1200)
    if (!zone || !flatDescription || body.consent !== true) {
      return reply({ ok: false, code: "PUBLIC_REPORT_INVALID" }, 400)
    }
    if (/(passport|pasaport|reisepass|паспорт|tckn|kimlik|identity[ _-]?number|biometr)/iu
      .test(`${flatDescription} ${zone}`)) {
      return reply({ ok: false, code: "PUBLIC_REPORT_IDENTITY_DATA_FORBIDDEN" }, 422)
    }
    const category = stringValue(body.category, 40) ?? "other"
    const language = isPublicReportLocale(body.language) ? body.language : "tr"
    const contact = body.contact == null ? null : stringValue(body.contact, 160)
    try {
      const receipt = await submitPublicReport({
        category, zone, description: flatDescription, contact, language, consent: true,
      })
      return reply({ ok: true, reference: receipt.reference, source: receipt.source }, 201)
    } catch {
      return reply({ ok: false, code: "PUBLIC_REPORT_UNAVAILABLE" }, 503)
    }
  }

  if (typeof body.companyWebsite !== "string" || body.companyWebsite.trim()) {
    return reply({ ok: false, code: "PUBLIC_REPORT_SPAM_REJECTED" }, 422)
  }

  const idempotencyKey = stringValue(request.headers.get("idempotency-key"), 200)
  const qrToken = stringValue(body.qrToken, 100)
  const description = stringValue(body.description, 4000)
  const locationDetail = body.locationDetail
    ? stringValue(body.locationDetail, 240)
    : null
  const contactKind = body.contactKind === "email" || body.contactKind === "phone"
    ? body.contactKind : null
  const contactValue = body.contactValue ? stringValue(body.contactValue, 254) : null
  if (
    !idempotencyKey || idempotencyKey.length < 16 || !/^[\w.:-]+$/.test(idempotencyKey) ||
    !qrToken || !description || description.length < 10 ||
    !isPublicReportCategory(body.category) || !isPublicReportLocale(body.language) ||
    !isPublicReportLocale(body.consentLocale) || body.consent !== true ||
    (contactKind === null) !== (contactValue === null)
  ) return reply({ ok: false, code: "PUBLIC_REPORT_INVALID" }, 422)
  if (body.consentLocale !== body.language) {
    return reply({ ok: false, code: "PUBLIC_REPORT_CONSENT_LOCALE_MISMATCH" }, 422)
  }
  if (contactKind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue ?? "")) {
    return reply({ ok: false, code: "PUBLIC_REPORT_CONTACT_INVALID" }, 422)
  }
  if (contactKind === "phone" && !/^\+?[0-9 ()-]{7,30}$/.test(contactValue ?? "")) {
    return reply({ ok: false, code: "PUBLIC_REPORT_CONTACT_INVALID" }, 422)
  }
  if (/(passport|pasaport|reisepass|паспорт|tckn|kimlik|identity[ _-]?number|biometr)/iu
    .test(`${description} ${locationDetail ?? ""}`)) {
    return reply({ ok: false, code: "PUBLIC_REPORT_IDENTITY_DATA_FORBIDDEN" }, 422)
  }

  const safety = classifyPublicReportSafety(`${description} ${locationDetail ?? ""}`)
  if (safety.requiresEmergencyCall && body.safetyAcknowledged !== true) {
    return reply({ ok: false, code: "PUBLIC_REPORT_112_ACKNOWLEDGEMENT_REQUIRED" }, 422)
  }
  const input: PublicReportSubmission = {
    qrToken, category: body.category, description, locationDetail,
    language: body.language, contactKind, contactValue, consent: true,
    consentLocale: body.consentLocale,
    safetyAcknowledged: safety.requiresEmergencyCall,
    companyWebsite: "",
  }
  try {
    const receipt = await submitPublicProblemReport(input, {
      idempotencyKey,
      abuseSource: trustedClientAddress(request),
      agentSource: request.headers.get("user-agent")?.slice(0, 200) || "unknown",
    })
    return reply({ ok: true, receipt }, receipt.replayed ? 200 : 201)
  } catch (error) { return failure(error) }
}

export async function PATCH(request: NextRequest) {
  if (!mutationOriginAllowed(request)) {
    return reply({ ok: false, code: "PUBLIC_REPORT_ORIGIN_REJECTED" }, 403)
  }
  const profile = await getUserProfile()
  if (!profile) return reply({ ok: false, code: "PUBLIC_REPORT_UNAUTHORIZED" }, 401)
  if (profile.role !== "manager" && profile.role !== "admin") {
    return reply({ ok: false, code: "PUBLIC_REPORT_FORBIDDEN" }, 403)
  }
  const body = await readBody(request)
  const idempotencyKey = stringValue(request.headers.get("idempotency-key"), 200)
  if (body?.command === "manage_placement") {
    const action = body.placementAction
    const siteId = body.siteId ? uuidValue(body.siteId) : null
    const placementId = body.placementId ? uuidValue(body.placementId) : null
    const zoneCode = body.zoneCode ? stringValue(body.zoneCode, 80) : null
    const zoneLabels = body.zoneLabels ? placementLabels(body.zoneLabels) : null
    const validUntil = body.validUntil ? stringValue(body.validUntil, 40) : null
    if (
      !idempotencyKey || idempotencyKey.length < 16 ||
      !isPublicReportPlacementAction(action) ||
      (action === "create" && (
        !siteId || !zoneCode || !/^[a-z0-9][a-z0-9._-]{1,79}$/.test(zoneCode) ||
        !zoneLabels || (validUntil !== null && !Number.isFinite(Date.parse(validUntil)))
      )) ||
      (action !== "create" && !placementId)
    ) return reply({ ok: false, code: "PUBLIC_REPORT_PLACEMENT_INVALID" }, 422)
    try {
      const result = await managePublicReportPlacement({
        action, siteId, placementId, zoneCode, zoneLabels, validUntil, idempotencyKey,
      })
      return reply({ ok: true, result })
    } catch (error) { return failure(error) }
  }
  const reportId = stringValue(body?.reportId, 36)
  const publicMessage = stringValue(body?.publicMessage, 500, true)
  const internalReason = body?.internalReason ? stringValue(body.internalReason, 1000) : null
  if (
    !body || !idempotencyKey || idempotencyKey.length < 8 ||
    !reportId || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(reportId) ||
    !Number.isInteger(body.expectedVersion) || Number(body.expectedVersion) < 1 ||
    !isPublicReportReviewAction(body.action) || publicMessage === null
  ) return reply({ ok: false, code: "PUBLIC_REPORT_REVIEW_INVALID" }, 422)
  try {
    const result = await reviewPublicProblemReport({
      reportId, expectedVersion: Number(body.expectedVersion), action: body.action,
      publicMessage, internalReason, idempotencyKey,
    })
    return reply({ ok: true, result })
  } catch (error) { return failure(error) }
}
