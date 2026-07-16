import type { UserProfile } from "./auth"
import { isAccessProfileEnabled, isSupabaseConfigured } from "./auth"
import { hasPermission } from "./rbac"
import { createClient } from "./supabase/server"

const ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export const complianceCaseTypes = [
  "access",
  "deposit",
  "buyer_suitability",
] as const
export type ComplianceCaseType = (typeof complianceCaseTypes)[number]

export const complianceCaseStatuses = [
  "pending_review",
  "in_review",
  "approved",
  "rejected",
  "blocked",
  "closed",
] as const
export type ComplianceCaseStatus = (typeof complianceCaseStatuses)[number]

export const complianceDecisions = [
  "approve",
  "reject",
  "request_information",
  "block",
  "close",
  "reopen",
] as const
export type ComplianceDecision = (typeof complianceDecisions)[number]

export type ComplianceRiskLevel = "low" | "medium" | "high" | "critical"
export type ComplianceExecutionMode =
  | "internal_review"
  | "provider_ready"
  | "manual_only"
export type ComplianceProviderStatus =
  | "not_required"
  | "blocked_pending_contract"
  | "disconnected"
  | "test_connected"
  | "live_connected"
export type ComplianceDataOrigin =
  | "manual"
  | "client_import"
  | "operational_projection"
  | "demo_seed"

export interface ComplianceCase {
  id: string
  caseNumber: string
  caseType: ComplianceCaseType
  companyId: string
  siteId: string
  siteName: string
  siteCode: string | null
  unitId: string | null
  unitLabel: string | null
  subjectName: string
  subjectReference: string | null
  status: ComplianceCaseStatus
  riskLevel: ComplianceRiskLevel
  blocker: string | null
  nextAction: string | null
  financialExposureCents: number | null
  currency: string | null
  executionMode: ComplianceExecutionMode
  providerStatus: ComplianceProviderStatus
  dataOrigin: ComplianceDataOrigin
  sourceTable: string | null
  sourceId: string | null
  facts: Record<string, unknown>
  humanDecisionRequired: true
  externalExecutionAllowed: false
  version: number
  lastDecisionAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ComplianceDecisionEvent {
  id: string
  caseId: string
  fromStatus: ComplianceCaseStatus
  toStatus: ComplianceCaseStatus
  decision: ComplianceDecision
  rationale: string
  actorRole: "admin" | "manager"
  caseVersion: number
  policyVersion: string
  externalExecution: false
  createdAt: string
}

export interface ComplianceCockpitData {
  source: "supabase-live" | "local-demo-contract"
  generatedAt: string
  mutationAvailable: boolean
  unavailableReason: "real_auth_required" | "company_scope_required" | null
  providerBoundary: {
    accessExecution: "provider_ready_blocked" | "configured"
    moneyExecution: "separate_finance_approval"
    legalGuarantee: "not_provided"
  }
  summary: {
    total: number
    pending: number
    blocked: number
    critical: number
    access: number
    deposits: number
    buyerSuitability: number
    demoRecords: number
  }
  cases: ComplianceCase[]
  recentDecisions: ComplianceDecisionEvent[]
}

export interface DecideComplianceCaseInput {
  caseId: string
  expectedVersion: number
  decision: ComplianceDecision
  rationale: string
  idempotencyKey: string
}

export class ComplianceRepositoryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number
  ) {
    super(message)
    this.name = "ComplianceRepositoryError"
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
  const normalized = asString(value).trim()
  return normalized || null
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function relatedRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return asRecord(value[0])
  return asRecord(value)
}

function isCaseType(value: unknown): value is ComplianceCaseType {
  return complianceCaseTypes.includes(value as ComplianceCaseType)
}

function isCaseStatus(value: unknown): value is ComplianceCaseStatus {
  return complianceCaseStatuses.includes(value as ComplianceCaseStatus)
}

function isDecision(value: unknown): value is ComplianceDecision {
  return complianceDecisions.includes(value as ComplianceDecision)
}

function isRisk(value: unknown): value is ComplianceRiskLevel {
  return ["low", "medium", "high", "critical"].includes(asString(value))
}

function isExecutionMode(value: unknown): value is ComplianceExecutionMode {
  return ["internal_review", "provider_ready", "manual_only"].includes(
    asString(value)
  )
}

function isProviderStatus(value: unknown): value is ComplianceProviderStatus {
  return [
    "not_required",
    "blocked_pending_contract",
    "disconnected",
    "test_connected",
    "live_connected",
  ].includes(asString(value))
}

function isDataOrigin(value: unknown): value is ComplianceDataOrigin {
  return [
    "manual",
    "client_import",
    "operational_projection",
    "demo_seed",
  ].includes(asString(value))
}

function isRealScopedSession(profile: UserProfile): boolean {
  return Boolean(
    isSupabaseConfigured() &&
      profile.company_id &&
      profile.id !== ACCESS_PROFILE_ID
  )
}

function assertComplianceViewer(profile: UserProfile) {
  if (!hasPermission(profile.role, "eids_compliance", "view")) {
    throw new ComplianceRepositoryError(
      "COMPLIANCE_FORBIDDEN",
      "Access and buyer compliance is available to authorized managers and organization administrators only.",
      403
    )
  }
}

function throwComplianceDatabaseError(error: unknown): never {
  const record = asRecord(error)
  const code = asString(record.code)
  const message =
    asString(record.message) || "The compliance cockpit operation failed."

  if (code === "40001" || /version conflict/i.test(message)) {
    throw new ComplianceRepositoryError(
      "COMPLIANCE_VERSION_CONFLICT",
      "This case changed while it was open. The latest version has been loaded; review it before deciding again.",
      409
    )
  }
  if (code === "42501" || /outside the authorized|authentication is required/i.test(message)) {
    throw new ComplianceRepositoryError(
      "COMPLIANCE_FORBIDDEN",
      "This compliance case is outside your authorized organization or site scope.",
      403
    )
  }
  if (code === "P0002" || /not found/i.test(message)) {
    throw new ComplianceRepositoryError(
      "COMPLIANCE_NOT_FOUND",
      "The compliance case is no longer available in your scope.",
      404
    )
  }
  if (
    code === "22023" ||
    code === "23505" ||
    /requires|unsupported|not allowed|allowed only|idempotency/i.test(message)
  ) {
    throw new ComplianceRepositoryError(
      "COMPLIANCE_VALIDATION_FAILED",
      message,
      422
    )
  }
  if (code === "42P01" || code === "42883") {
    throw new ComplianceRepositoryError(
      "COMPLIANCE_MIGRATION_REQUIRED",
      "The compliance data contract is not installed in this environment.",
      503
    )
  }
  throw new ComplianceRepositoryError(
    "COMPLIANCE_UNAVAILABLE",
    "The compliance cockpit is temporarily unavailable.",
    503
  )
}

function mapCase(value: unknown): ComplianceCase | null {
  const row = asRecord(value)
  const site = relatedRecord(row.site)
  const unit = relatedRecord(row.unit)
  const id = asString(row.id)
  const caseNumber = asString(row.case_no)
  const companyId = asString(row.company_id)
  const siteId = asString(row.site_id)
  const caseType = row.case_type
  const status = row.status
  const riskLevel = row.risk_level
  const executionMode = row.execution_mode
  const providerStatus = row.provider_status
  const dataOrigin = row.data_origin
  const createdAt = asString(row.created_at)
  const updatedAt = asString(row.updated_at)

  if (
    !id ||
    !caseNumber ||
    !companyId ||
    !siteId ||
    !createdAt ||
    !updatedAt ||
    !isCaseType(caseType) ||
    !isCaseStatus(status) ||
    !isRisk(riskLevel) ||
    !isExecutionMode(executionMode) ||
    !isProviderStatus(providerStatus) ||
    !isDataOrigin(dataOrigin)
  ) {
    return null
  }

  return {
    id,
    caseNumber,
    caseType,
    companyId,
    siteId,
    siteName: optionalString(site.name) ?? "Assigned site",
    siteCode: optionalString(site.code),
    unitId: optionalString(row.unit_id),
    unitLabel: optionalString(unit.unit_no),
    subjectName: optionalString(row.subject_name) ?? "Compliance subject",
    subjectReference: optionalString(row.subject_reference),
    status,
    riskLevel,
    blocker: optionalString(row.blocker),
    nextAction: optionalString(row.next_action),
    financialExposureCents: optionalNumber(row.financial_exposure_cents),
    currency: optionalString(row.currency),
    executionMode,
    providerStatus,
    dataOrigin,
    sourceTable: optionalString(row.source_table),
    sourceId: optionalString(row.source_id),
    facts: asRecord(row.facts),
    humanDecisionRequired: true,
    externalExecutionAllowed: false,
    version: Math.max(1, Math.trunc(asNumber(row.version))),
    lastDecisionAt: optionalString(row.last_decision_at),
    createdAt,
    updatedAt,
  }
}

function mapDecision(value: unknown): ComplianceDecisionEvent | null {
  const row = asRecord(value)
  const id = asString(row.id)
  const caseId = asString(row.case_id)
  const fromStatus = row.from_status
  const toStatus = row.to_status
  const decision = row.decision
  const actorRole = row.actor_role
  const createdAt = asString(row.created_at)

  if (
    !id ||
    !caseId ||
    !createdAt ||
    !isCaseStatus(fromStatus) ||
    !isCaseStatus(toStatus) ||
    !isDecision(decision) ||
    (actorRole !== "admin" && actorRole !== "manager")
  ) {
    return null
  }

  return {
    id,
    caseId,
    fromStatus,
    toStatus,
    decision,
    rationale: optionalString(row.rationale) ?? "Human review decision",
    actorRole,
    caseVersion: Math.max(1, Math.trunc(asNumber(row.case_version))),
    policyVersion: optionalString(row.policy_version) ?? "compliance-review-v1",
    externalExecution: false,
    createdAt,
  }
}

function summarize(cases: ComplianceCase[]): ComplianceCockpitData["summary"] {
  return {
    total: cases.length,
    pending: cases.filter((item) =>
      ["pending_review", "in_review"].includes(item.status)
    ).length,
    blocked: cases.filter((item) => item.status === "blocked" || item.blocker)
      .length,
    critical: cases.filter((item) => item.riskLevel === "critical").length,
    access: cases.filter((item) => item.caseType === "access").length,
    deposits: cases.filter((item) => item.caseType === "deposit").length,
    buyerSuitability: cases.filter(
      (item) => item.caseType === "buyer_suitability"
    ).length,
    demoRecords: cases.filter((item) => item.dataOrigin === "demo_seed").length,
  }
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function localDemoCases(): ComplianceCase[] {
  const shared = {
    companyId: "local-demo-company",
    siteId: "local-demo-site",
    siteName: "New Level Premium – demo",
    siteCode: "NLP-DEMO",
    humanDecisionRequired: true as const,
    externalExecutionAllowed: false as const,
    sourceId: null,
    version: 1,
    lastDecisionAt: null,
    createdAt: isoMinutesAgo(180),
  }

  return [
    {
      ...shared,
      id: "local-access-1",
      caseNumber: "ACC-DEMO-001",
      caseType: "access",
      unitId: "local-unit-a-101",
      unitLabel: "A-101",
      subjectName: "Demo resident – arrival",
      subjectReference: "A-101",
      status: "pending_review",
      riskLevel: "high",
      blocker: "Identity evidence is incomplete and the access provider is not connected.",
      nextAction: "Verify identity and keep physical access provider-blocked.",
      financialExposureCents: null,
      currency: null,
      executionMode: "provider_ready",
      providerStatus: "blocked_pending_contract",
      dataOrigin: "demo_seed",
      sourceTable: "local_demo_contract",
      facts: { credentialType: "mobile_code", demo: true },
      updatedAt: isoMinutesAgo(12),
    },
    {
      ...shared,
      id: "local-deposit-1",
      caseNumber: "DEP-DEMO-001",
      caseType: "deposit",
      unitId: "local-unit-b-204",
      unitLabel: "B-204",
      subjectName: "Demo checkout file",
      subjectReference: "B-204",
      status: "in_review",
      riskLevel: "medium",
      blocker: "Checkout photos are awaiting manager review.",
      nextAction: "Review evidence; any refund or deduction stays in finance approval.",
      financialExposureCents: 3500000,
      currency: "TRY",
      executionMode: "internal_review",
      providerStatus: "not_required",
      dataOrigin: "demo_seed",
      sourceTable: "local_demo_contract",
      facts: { evidenceCount: 3, demo: true },
      updatedAt: isoMinutesAgo(21),
    },
    {
      ...shared,
      id: "local-buyer-1",
      caseNumber: "BUY-DEMO-001",
      caseType: "buyer_suitability",
      unitId: null,
      unitLabel: null,
      subjectName: "Demo buyer – investment",
      subjectReference: "2+1 Garden",
      status: "approved",
      riskLevel: "low",
      blocker: null,
      nextAction: "Proceed with reservation review and the ROI information pack.",
      financialExposureCents: 26000000,
      currency: "EUR",
      executionMode: "manual_only",
      providerStatus: "not_required",
      dataOrigin: "demo_seed",
      sourceTable: "local_demo_contract",
      facts: { buyerGoal: "investment", legalDisclaimer: "Pre-check only", demo: true },
      updatedAt: isoMinutesAgo(34),
    },
    {
      ...shared,
      id: "local-buyer-2",
      caseNumber: "BUY-DEMO-002",
      caseType: "buyer_suitability",
      unitId: null,
      unitLabel: null,
      subjectName: "Demo buyer – residence",
      subjectReference: "1+1",
      status: "blocked",
      riskLevel: "critical",
      blocker: "Current district suitability requires qualified legal review.",
      nextAction: "Do not promise suitability; request current partner advice.",
      financialExposureCents: 12000000,
      currency: "EUR",
      executionMode: "manual_only",
      providerStatus: "not_required",
      dataOrigin: "demo_seed",
      sourceTable: "local_demo_contract",
      facts: { buyerGoal: "residence", legalDisclaimer: "Pre-check only", demo: true },
      updatedAt: isoMinutesAgo(8),
    },
  ]
}

function providerBoundary(cases: ComplianceCase[]): ComplianceCockpitData["providerBoundary"] {
  return {
    accessExecution: cases.some(
      (item) =>
        item.caseType === "access" && item.providerStatus === "live_connected"
    )
      ? "configured"
      : "provider_ready_blocked",
    moneyExecution: "separate_finance_approval",
    legalGuarantee: "not_provided",
  }
}

function localDemoData(profile: UserProfile): ComplianceCockpitData {
  const cases = localDemoCases()
  return {
    source: "local-demo-contract",
    generatedAt: new Date().toISOString(),
    mutationAvailable: false,
    unavailableReason: profile.company_id
      ? "real_auth_required"
      : "company_scope_required",
    providerBoundary: providerBoundary(cases),
    summary: summarize(cases),
    cases,
    recentDecisions: [],
  }
}

export async function getComplianceCockpitData(
  profile: UserProfile,
  limit = 100
): Promise<ComplianceCockpitData> {
  assertComplianceViewer(profile)

  if (!isRealScopedSession(profile)) {
    if (isAccessProfileEnabled()) return localDemoData(profile)
    throw new ComplianceRepositoryError(
      "COMPLIANCE_REAL_AUTH_REQUIRED",
      "A real organization-scoped session is required for compliance data.",
      403
    )
  }

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 250)
  const supabase = await createClient()
  const [casesResponse, decisionsResponse] = await Promise.all([
    supabase
      .from("compliance_cases")
      .select(
        "id, company_id, site_id, unit_id, case_no, case_type, subject_name, subject_reference, status, risk_level, blocker, next_action, financial_exposure_cents, currency, execution_mode, provider_status, data_origin, source_table, source_id, facts, human_decision_required, external_execution_allowed, version, last_decision_at, created_at, updated_at, site:sites(name, code), unit:units(unit_no)"
      )
      .order("updated_at", { ascending: false })
      .limit(safeLimit),
    supabase
      .from("compliance_case_decisions")
      .select(
        "id, case_id, from_status, to_status, decision, rationale, actor_role, case_version, policy_version, external_execution, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(safeLimit * 3, 500)),
  ])

  const error = casesResponse.error ?? decisionsResponse.error
  if (error) throwComplianceDatabaseError(error)

  const cases = (casesResponse.data ?? []).flatMap((row) => {
    const mapped = mapCase(row)
    return mapped ? [mapped] : []
  })
  const recentDecisions = (decisionsResponse.data ?? []).flatMap((row) => {
    const mapped = mapDecision(row)
    return mapped ? [mapped] : []
  })

  return {
    source: "supabase-live",
    generatedAt: new Date().toISOString(),
    mutationAvailable: true,
    unavailableReason: null,
    providerBoundary: providerBoundary(cases),
    summary: summarize(cases),
    cases,
    recentDecisions,
  }
}

export async function decideComplianceCase(
  profile: UserProfile,
  input: DecideComplianceCaseInput
): Promise<ComplianceCockpitData> {
  assertComplianceViewer(profile)

  if (!isRealScopedSession(profile)) {
    throw new ComplianceRepositoryError(
      "COMPLIANCE_REAL_AUTH_REQUIRED",
      "Audited compliance decisions require a real organization-scoped session.",
      403
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("decide_compliance_case_v1", {
    p_case_id: input.caseId,
    p_expected_version: input.expectedVersion,
    p_decision: input.decision,
    p_rationale: input.rationale,
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) throwComplianceDatabaseError(error)

  return getComplianceCockpitData(profile)
}
