import "server-only"
import type { UserProfile } from "./auth"
import { isSupabaseConfigured } from "./auth"
import { hasPermission } from "./rbac"
import { createClient } from "./supabase/server"

const ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export const reportTypes = [
  "finance_ledger",
  "unit_inventory",
  "ticket_operations",
  "compliance_cases",
] as const
export type ReportType = (typeof reportTypes)[number]
export type ReportStatus = "queued" | "generating" | "ready" | "failed"
export type CommentaryStatus = "pending_human_review" | "approved" | "rejected"

export interface ReportingSite {
  id: string
  name: string
  code: string | null
}

export interface ReportRequestRecord {
  id: string
  reportType: ReportType
  siteIds: string[]
  filters: Record<string, unknown>
  status: ReportStatus
  version: number
  failureCode: string | null
  failureMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface ReportArtifactRecord {
  id: string
  requestId: string
  reportType: ReportType
  fileName: string
  contentType: string
  byteSize: number
  rowCount: number
  sha256Hex: string
  sourceTables: string[]
  snapshotAt: string
  metrics: Record<string, unknown>
  limitations: string[]
  storageMode: "database" | "provider_ready"
  commentary: string | null
  commentaryGrounding: Record<string, unknown>
  commentaryStatus: CommentaryStatus | null
  commentaryVersion: number | null
  reviewReason: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface ReportingData {
  source: "supabase-live" | "unavailable"
  generatedAt: string
  mutationAvailable: boolean
  unavailableReason: "real_auth_required" | "company_scope_required" | null
  allowedReportTypes: ReportType[]
  maxInternalRows: 50000
  providerBoundary: {
    internalArtifacts: "persistent_database"
    bulkExports: "provider_ready"
    externalStorage: "provider_ready"
  }
  sites: ReportingSite[]
  requests: ReportRequestRecord[]
  artifacts: ReportArtifactRecord[]
}

export interface RequestReportInput {
  reportType: ReportType
  siteIds: string[]
  filters: Record<string, unknown>
  idempotencyKey: string
}

export interface ReviewCommentaryInput {
  artifactId: string
  expectedVersion: number
  decision: "approved" | "rejected"
  reason: string
  idempotencyKey: string
}

export interface ReportPayload {
  artifact: Pick<
    ReportArtifactRecord,
    "id" | "fileName" | "contentType" | "byteSize" | "rowCount" | "sha256Hex"
  >
  content: string
}

export class ReportingRepositoryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number
  ) {
    super(message)
    this.name = "ReportingRepositoryError"
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function optionalString(value: unknown): string | null {
  const result = asString(value).trim()
  return result || null
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function relatedRecord(value: unknown): Record<string, unknown> {
  return asRecord(Array.isArray(value) ? value[0] : value)
}

function isReportType(value: unknown): value is ReportType {
  return reportTypes.includes(value as ReportType)
}

function isRealScopedSession(profile: UserProfile): boolean {
  return Boolean(
    isSupabaseConfigured() && profile.company_id && profile.id !== ACCESS_PROFILE_ID
  )
}

function allowedTypes(profile: UserProfile): ReportType[] {
  return profile.role === "accountant" ? ["finance_ledger"] : [...reportTypes]
}

function assertViewer(profile: UserProfile) {
  if (!hasPermission(profile.role, "reports", "view")) {
    throw new ReportingRepositoryError(
      "REPORTING_FORBIDDEN",
      "Your role cannot access organization reports.",
      403
    )
  }
}

function assertRealSession(profile: UserProfile) {
  if (!isRealScopedSession(profile)) {
    throw new ReportingRepositoryError(
      "REPORTING_REAL_AUTH_REQUIRED",
      "Persistent report artifacts require a real organization-scoped session.",
      403
    )
  }
}

function databaseError(error: unknown): never {
  const record = asRecord(error)
  const code = asString(record.code)
  const message = asString(record.message) || "The reporting operation failed."
  if (code === "40001" || /version conflict/i.test(message)) {
    throw new ReportingRepositoryError("REPORTING_VERSION_CONFLICT", message, 409)
  }
  if (code === "42501" || /scope denied|access denied/i.test(message)) {
    throw new ReportingRepositoryError("REPORTING_FORBIDDEN", message, 403)
  }
  if (code === "P0002" || /not found/i.test(message)) {
    throw new ReportingRepositoryError("REPORTING_NOT_FOUND", message, 404)
  }
  if (code === "54000" || /50000-row/i.test(message)) {
    throw new ReportingRepositoryError("REPORTING_BULK_EXPORT_REQUIRED", message, 413)
  }
  if (code === "23505" || /idempotency/i.test(message)) {
    throw new ReportingRepositoryError("REPORTING_IDEMPOTENCY_CONFLICT", message, 409)
  }
  if (code === "23514" && message.includes("REPORTING_SOURCE_UNIT_SCOPE_INCONSISTENT")) {
    throw new ReportingRepositoryError(
      "REPORTING_SOURCE_UNIT_SCOPE_INCONSISTENT",
      "A source row references a unit outside its company or site scope.",
      409
    )
  }
  if (code === "22023" || code === "55000") {
    throw new ReportingRepositoryError("REPORTING_COMMAND_INVALID", message, 422)
  }
  if (code === "42P01" || code === "42883") {
    throw new ReportingRepositoryError(
      "REPORTING_MIGRATION_REQUIRED",
      "The persistent reporting schema is not installed yet.",
      503
    )
  }
  throw new ReportingRepositoryError("REPORTING_UNAVAILABLE", message, 503)
}

function mapRequest(value: unknown): ReportRequestRecord | null {
  const row = asRecord(value)
  if (!isReportType(row.report_type) || !asString(row.id)) return null
  const status = asString(row.status) as ReportStatus
  if (!["queued", "generating", "ready", "failed"].includes(status)) return null
  return {
    id: asString(row.id),
    reportType: row.report_type,
    siteIds: stringArray(row.site_ids),
    filters: asRecord(row.filters),
    status,
    version: asNumber(row.version),
    failureCode: optionalString(row.failure_code),
    failureMessage: optionalString(row.failure_message),
    startedAt: optionalString(row.started_at),
    completedAt: optionalString(row.completed_at),
    createdAt: asString(row.created_at),
  }
}

function mapArtifact(value: unknown): ReportArtifactRecord | null {
  const row = asRecord(value)
  if (!isReportType(row.report_type) || !asString(row.id)) return null
  const commentary = relatedRecord(row.commentary)
  const reviewStatus = optionalString(commentary.review_status)
  return {
    id: asString(row.id),
    requestId: asString(row.report_request_id),
    reportType: row.report_type,
    fileName: asString(row.file_name),
    contentType: asString(row.content_type),
    byteSize: asNumber(row.byte_size),
    rowCount: asNumber(row.row_count),
    sha256Hex: asString(row.sha256_hex),
    sourceTables: stringArray(row.source_tables),
    snapshotAt: asString(row.source_snapshot_at),
    metrics: asRecord(row.metrics),
    limitations: stringArray(row.limitations),
    storageMode: asString(row.storage_mode) === "provider_ready" ? "provider_ready" : "database",
    commentary: optionalString(commentary.commentary),
    commentaryGrounding: asRecord(commentary.grounding),
    commentaryStatus: ["pending_human_review", "approved", "rejected"].includes(reviewStatus ?? "")
      ? (reviewStatus as CommentaryStatus)
      : null,
    commentaryVersion: commentary.version == null ? null : asNumber(commentary.version),
    reviewReason: optionalString(commentary.review_reason),
    reviewedAt: optionalString(commentary.reviewed_at),
    createdAt: asString(row.created_at),
  }
}

function unavailableData(profile: UserProfile): ReportingData {
  return {
    source: "unavailable",
    generatedAt: new Date().toISOString(),
    mutationAvailable: false,
    unavailableReason: profile.id === ACCESS_PROFILE_ID ? "real_auth_required" : "company_scope_required",
    allowedReportTypes: allowedTypes(profile),
    maxInternalRows: 50000,
    providerBoundary: {
      internalArtifacts: "persistent_database",
      bulkExports: "provider_ready",
      externalStorage: "provider_ready",
    },
    sites: [],
    requests: [],
    artifacts: [],
  }
}

export async function getReportingData(profile: UserProfile, limit = 50): Promise<ReportingData> {
  assertViewer(profile)
  if (!isRealScopedSession(profile)) return unavailableData(profile)
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const supabase = await createClient()
  let managedSiteIds: string[] | null = null
  if (profile.role === "manager") {
    const now = new Date().toISOString()
    const assignmentsResponse = await supabase
      .from("profile_site_assignments")
      .select("site_id")
      .eq("company_id", profile.company_id as string)
      .eq("profile_id", profile.id)
      .eq("access_role", "manager")
      .eq("status", "active")
      .lte("valid_from", now)
      .or(`valid_until.is.null,valid_until.gt.${now}`)
    if (assignmentsResponse.error) databaseError(assignmentsResponse.error)
    managedSiteIds = (assignmentsResponse.data ?? [])
      .map((row) => asString(row.site_id))
      .filter(Boolean)
  }

  let sitesQuery = supabase
    .from("sites")
    .select("id, name, code")
    .eq("company_id", profile.company_id as string)
    .order("name")
  if (managedSiteIds) {
    if (managedSiteIds.length === 0) return unavailableData(profile)
    sitesQuery = sitesQuery.in("id", managedSiteIds)
  }
  const [requestsResponse, artifactsResponse, sitesResponse] = await Promise.all([
    supabase
      .from("report_requests")
      .select("id, report_type, site_ids, filters, status, version, failure_code, failure_message, started_at, completed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(safeLimit),
    supabase
      .from("report_artifacts")
      .select("id, report_request_id, report_type, file_name, content_type, byte_size, row_count, sha256_hex, source_tables, source_snapshot_at, metrics, limitations, storage_mode, created_at, commentary:report_artifact_commentary(commentary, grounding, review_status, review_reason, reviewed_at, version)")
      .order("created_at", { ascending: false })
      .limit(safeLimit),
    sitesQuery,
  ])
  const error = requestsResponse.error ?? artifactsResponse.error ?? sitesResponse.error
  if (error) databaseError(error)
  return {
    source: "supabase-live",
    generatedAt: new Date().toISOString(),
    mutationAvailable: true,
    unavailableReason: null,
    allowedReportTypes: allowedTypes(profile),
    maxInternalRows: 50000,
    providerBoundary: {
      internalArtifacts: "persistent_database",
      bulkExports: "provider_ready",
      externalStorage: "provider_ready",
    },
    sites: (sitesResponse.data ?? []).map((row) => ({
      id: asString(row.id), name: asString(row.name), code: optionalString(row.code),
    })),
    requests: (requestsResponse.data ?? []).flatMap((row) => mapRequest(row) ?? []),
    artifacts: (artifactsResponse.data ?? []).flatMap((row) => mapArtifact(row) ?? []),
  }
}

export async function requestReport(profile: UserProfile, input: RequestReportInput) {
  assertViewer(profile)
  assertRealSession(profile)
  if (!allowedTypes(profile).includes(input.reportType)) {
    throw new ReportingRepositoryError("REPORTING_FORBIDDEN", "This report type is outside your role.", 403)
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("request_report_generation_v1", {
    p_report_type: input.reportType,
    p_site_ids: input.siteIds,
    p_filters: input.filters,
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) databaseError(error)
  return asRecord(data)
}

export async function reviewReportCommentary(profile: UserProfile, input: ReviewCommentaryInput) {
  assertViewer(profile)
  assertRealSession(profile)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("review_report_commentary_v1", {
    p_artifact_id: input.artifactId,
    p_expected_version: input.expectedVersion,
    p_decision: input.decision,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) databaseError(error)
  return asRecord(data)
}

export async function getReportPayload(profile: UserProfile, artifactId: string): Promise<ReportPayload> {
  assertViewer(profile)
  assertRealSession(profile)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("report_artifacts")
    .select("id, file_name, content_type, byte_size, row_count, sha256_hex, payload:report_artifact_payloads(content_text)")
    .eq("id", artifactId)
    .maybeSingle()
  if (error) databaseError(error)
  if (!data) throw new ReportingRepositoryError("REPORTING_NOT_FOUND", "Report artifact not found.", 404)
  const row = asRecord(data)
  const payload = relatedRecord(row.payload)
  return {
    artifact: {
      id: asString(row.id),
      fileName: asString(row.file_name),
      contentType: asString(row.content_type),
      byteSize: asNumber(row.byte_size),
      rowCount: asNumber(row.row_count),
      sha256Hex: asString(row.sha256_hex),
    },
    content: asString(payload.content_text),
  }
}
