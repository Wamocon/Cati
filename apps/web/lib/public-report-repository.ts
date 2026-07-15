import "server-only"

import { createHash, createHmac } from "node:crypto"
import { isSupabaseConfigured } from "@/lib/auth"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import type {
  PublicReportPlacement,
  PublicReportPlacementAction,
  PublicReportReceipt,
  PublicReportReviewAction,
  PublicReportReviewData,
  PublicReportSubmission,
  PublicReportTrackingStatus,
} from "@/lib/public-report"
import {
  PUBLIC_REPORT_CONSENT_TEXT,
  PUBLIC_REPORT_CONSENT_VERSION,
} from "@/lib/public-report"

interface RpcErrorShape {
  code?: string
  message?: string
  details?: string
}

interface RpcResponse {
  data: unknown
  error: RpcErrorShape | null
}

interface RpcClient {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<RpcResponse>
}

export class PublicReportRepositoryError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message = code
  ) {
    super(message)
    this.name = "PublicReportRepositoryError"
  }
}

function requireDatabase() {
  if (!isSupabaseConfigured()) {
    throw new PublicReportRepositoryError(
      "PUBLIC_REPORT_DATABASE_NOT_CONFIGURED",
      503,
      "Public reporting persistence is not configured."
    )
  }
}

function securitySecret() {
  const secret = process.env.PUBLIC_REPORT_SECURITY_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new PublicReportRepositoryError(
      "PUBLIC_REPORT_SECURITY_NOT_CONFIGURED",
      503,
      "Public reporting security is not configured."
    )
  }
  return secret
}

function hmac(secret: string, namespace: string, value: string) {
  return createHmac("sha256", secret).update(`${namespace}\u0000${value}`, "utf8").digest("hex")
}

function normalizedForFingerprint(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ")
}

function errorFromRpc(error: RpcErrorShape): PublicReportRepositoryError {
  const source = `${error.message ?? ""} ${error.details ?? ""}`
  const knownCodes = [
    ["PUBLIC_REPORT_RATE_LIMITED", 429],
    ["PUBLIC_REPORT_QR_NOT_FOUND", 404],
    ["PUBLIC_REPORT_NOT_FOUND", 404],
    ["PUBLIC_REPORT_VERSION_CONFLICT", 409],
    ["PUBLIC_REPORT_IDEMPOTENCY_CONFLICT", 409],
    ["PUBLIC_REPORT_SITE_SCOPE_DENIED", 403],
    ["PUBLIC_REPORT_MANAGER_AUTH_REQUIRED", 401],
    ["PUBLIC_REPORT_PLACEMENT_NOT_FOUND", 404],
    ["PUBLIC_REPORT_PLACEMENT_CONFLICT", 409],
    ["PUBLIC_REPORT_PLACEMENT_INVALID", 422],
    ["PUBLIC_REPORT_INVALID_TRANSITION", 409],
    ["PUBLIC_REPORT_REVIEW_REASON_REQUIRED", 422],
    ["PUBLIC_REPORT_112_ACKNOWLEDGEMENT_REQUIRED", 422],
    ["PUBLIC_REPORT_IDENTITY_DATA_FORBIDDEN", 422],
    ["PUBLIC_REPORT_SPAM_REJECTED", 422],
  ] as const
  const match = knownCodes.find(([code]) => source.includes(code))
  if (match) return new PublicReportRepositoryError(match[0], match[1])
  if (error.code === "42501") {
    return new PublicReportRepositoryError("PUBLIC_REPORT_FORBIDDEN", 403)
  }
  if (error.code === "40001" || error.code === "23505") {
    return new PublicReportRepositoryError("PUBLIC_REPORT_CONFLICT", 409)
  }
  if (error.code === "22023") {
    return new PublicReportRepositoryError("PUBLIC_REPORT_INVALID", 422)
  }
  return new PublicReportRepositoryError(
    "PUBLIC_REPORT_DATABASE_ERROR",
    503,
    "Public reporting persistence is temporarily unavailable."
  )
}

async function callRpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  requireDatabase()
  const client = (await createClient()) as unknown as RpcClient
  const { data, error } = await client.rpc(name, args)
  if (error) throw errorFromRpc(error)
  return data as T
}

async function callServiceRpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  requireDatabase()
  const client = createServiceRoleClient() as unknown as RpcClient | null
  if (!client) {
    throw new PublicReportRepositoryError(
      "PUBLIC_REPORT_DATABASE_NOT_CONFIGURED",
      503,
      "Public reporting service persistence is not configured."
    )
  }
  const { data, error } = await client.rpc(name, args)
  if (error) throw errorFromRpc(error)
  return data as T
}

export async function resolvePublicReportPlacement(
  qrToken: string
): Promise<PublicReportPlacement> {
  const data = await callRpc<PublicReportPlacement | null>("resolve_public_report_qr", {
    p_public_code: qrToken,
  })
  if (!data) throw new PublicReportRepositoryError("PUBLIC_REPORT_QR_NOT_FOUND", 404)
  return data
}

export async function submitPublicProblemReport(
  input: PublicReportSubmission,
  context: { idempotencyKey: string; abuseSource: string; agentSource: string }
): Promise<PublicReportReceipt> {
  const secret = securitySecret()
  requireDatabase()

  const trackingToken = createHmac("sha256", secret)
    .update(`tracking\u0000${input.qrToken}\u0000${context.idempotencyKey}`, "utf8")
    .digest("base64url")
  const consent = PUBLIC_REPORT_CONSENT_TEXT[input.consentLocale]
  const consentTextDigest = createHash("sha256").update(consent, "utf8").digest("hex")
  const abuseDigest = hmac(secret, "abuse-ip", context.abuseSource)
  const agentDigest = hmac(secret, "abuse-agent", context.agentSource)
  const duplicateFingerprint = hmac(
    secret,
    "duplicate",
    [
      input.qrToken,
      input.category,
      normalizedForFingerprint(input.locationDetail ?? ""),
      normalizedForFingerprint(input.description),
    ].join("\u0000")
  )

  const receipt = await callServiceRpc<Omit<PublicReportReceipt, "trackingToken">>(
    "submit_public_problem_report",
    {
      p_qr_code: input.qrToken,
      p_payload: {
        category: input.category,
        description: input.description,
        locationDetail: input.locationDetail,
        language: input.language,
        contactKind: input.contactKind,
        contactValue: input.contactValue,
        consent: true,
        consentVersion: PUBLIC_REPORT_CONSENT_VERSION,
        consentTextDigest,
        consentLocale: input.consentLocale,
        safetyAcknowledged: input.safetyAcknowledged,
        companyWebsite: "",
      },
      p_tracking_token: trackingToken,
      p_submission_key: context.idempotencyKey,
      p_abuse_digest: abuseDigest,
      p_agent_digest: agentDigest,
      p_duplicate_fingerprint: duplicateFingerprint,
    }
  )

  return { ...receipt, trackingToken }
}

export async function trackPublicProblemReport(
  reference: string,
  trackingToken: string
): Promise<PublicReportTrackingStatus> {
  const data = await callRpc<PublicReportTrackingStatus | null>(
    "get_public_problem_report_status",
    { p_reference: reference, p_tracking_token: trackingToken }
  )
  if (!data) throw new PublicReportRepositoryError("PUBLIC_REPORT_NOT_FOUND", 404)
  return data
}

export async function getPublicProblemReportReviewData(): Promise<PublicReportReviewData> {
  const data = await callRpc<PublicReportReviewData | null>(
    "get_public_problem_report_review_data"
  )
  return data ?? { reports: [], placements: [], sites: [] }
}

export async function reviewPublicProblemReport(input: {
  reportId: string
  expectedVersion: number
  action: PublicReportReviewAction
  publicMessage: string
  internalReason: string | null
  idempotencyKey: string
}) {
  return callRpc<{
    id: string
    reference: string
    status: string
    version: number
    convertedTicketId: string | null
    replayed: boolean
  }>("review_public_problem_report_command", {
    p_report_id: input.reportId,
    p_expected_version: input.expectedVersion,
    p_action: input.action,
    p_public_message: input.publicMessage,
    p_internal_reason: input.internalReason,
    p_idempotency_key: input.idempotencyKey,
  })
}

export async function managePublicReportPlacement(input: {
  action: PublicReportPlacementAction
  siteId: string | null
  placementId: string | null
  zoneCode: string | null
  zoneLabels: Record<"tr" | "en" | "de" | "ru", string> | null
  validUntil: string | null
  idempotencyKey: string
}) {
  return callRpc<{
    placement: PublicReportReviewData["placements"][number]
    replayed: boolean
  }>("manage_public_report_qr_placement_command", {
    p_action: input.action,
    p_site_id: input.siteId,
    p_placement_id: input.placementId,
    p_zone_code: input.zoneCode,
    p_zone_labels: input.zoneLabels,
    p_valid_until: input.validUntil,
    p_idempotency_key: input.idempotencyKey,
  })
}

export const publicReportConsent = {
  version: PUBLIC_REPORT_CONSENT_VERSION,
  text: PUBLIC_REPORT_CONSENT_TEXT,
} as const
