import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { isAccessProfileEnabled, isSupabaseConfigured } from "@/lib/auth"
import {
  bookings,
  cashFlow,
  documentVault,
  flats,
  getBlockOverview,
  getDebtAccounts,
  getDebtAging,
  getResidentSummary,
  getStaffSummary,
  getImportSummary,
  getPaymentPlanSummary,
  getSummary,
  importBatches,
  importFindings,
  paymentPlans,
  roleCoverage,
  residents,
  serviceCatalogItems,
  serviceOrders,
  serviceTickets,
  siteActivities,
  staffMembers,
  workforceTasks,
  type BookingRecord,
  type DebtAccount,
  type PaymentPlanRecord,
  type ServiceCatalogItem,
  type ServiceOrderRecord,
  type ServiceTicket,
  type WorkforceTaskRecord,
} from "@/lib/site-management-data"

export type DataSource = "supabase" | "local-seed"

export type OperationalQualityStatus = "passed" | "warning" | "failed"

export interface OperationalQualityCheck {
  id: string
  label: string
  status: OperationalQualityStatus
  detail: string
}

export interface OperationalQualityReport {
  status: OperationalQualityStatus
  checks: OperationalQualityCheck[]
}

const PEOPLE_DIRECTORY_CONTRACT_VERSION = "phase-5-people-directory.v1"
const FINANCE_LEDGER_CONTRACT_VERSION = "phase-6-finance-ledger.v1"
const PAYMENT_RESTRICTION_CONTRACT_VERSION = "phase-7-payment-restriction.v1"
const SERVICE_TICKETING_CONTRACT_VERSION = "phase-8-9-service-operations.v1"

export interface DashboardSnapshot {
  source: DataSource
  generatedAt: string
  company: {
    id: string
    name: string
    slug?: string
    currency?: string
  }
  site: {
    id: string
    name: string
    code?: string
    city?: string
    district?: string
    totalUnits?: number
  }
  summary: {
    totalUnits: number
    occupiedUnits: number
    vacantUnits: number
    blockedUnits: number
    openTickets: number
    overdueTickets: number
    openLedgerCents: number
    activeReservations: number
    pendingAiActions: number
  }
  units: Array<Record<string, unknown>>
  tickets: Array<Record<string, unknown>>
  recentActions: Array<Record<string, unknown>>
  warning?: string
}

export interface OperationalSearchResult {
  entityTable: string
  entityId: string | null
  entityExternalId: string | null
  title: string
  summary: string | null
  rank: number
  metadata: Record<string, unknown>
}

export interface ClientActionInput {
  actionType: string
  entityTable?: string | null
  entityId?: string | null
  entityExternalId?: string | null
  title?: string | null
  metadata?: Record<string, unknown>
}

export interface ClientActionResult {
  id: string
  source: DataSource
  status: "logged" | "locally-logged"
}

export interface Phase4Unit {
  id: string
  unitNo: string
  unitType: string
  occupancyStatus: string
  ownershipStatus: string
  sizeSqm: number | null
  bedrooms: number | null
  blockName: string | null
  floorLabel: string | null
  floorLevel: number | null
  saleStatus: string
  listPriceEurCents: number | null
  nextPriceEurCents: number[]
  priceSource: string | null
  numberingSource: string | null
  sourceNotes: string | null
  sourceMetadata: Record<string, unknown>
  ownerName: string | null
  residentName: string | null
  balanceCents: number
  openFinanceEntries: number
  openTicketCount: number
  accessStatus: string
  paymentStatus: string
}

export interface Phase4Block {
  name: string
  sortOrder: number
  totalUnits: number
  occupiedUnits: number
  reservedUnits: number
  vacantUnits: number
  blockedUnits: number
  availableForSale: number
  soldUnits: number
  sourceMissingUnits: number
  minBuyNowEurCents: number | null
  maxBuyNowEurCents: number | null
  priceSourceStatus: "parsed" | "missing"
  numberingSource: string | null
}

export interface Phase4ImportBatch {
  id: string
  sourceName: string
  entityType: string
  totalRows: number
  validRows: number
  warningRows: number
  rejectedRows: number
  status: string
  checkedAt: string | null
  appliedAt: string | null
}

export interface Phase4ImportFinding {
  id: string
  importBatchId: string | null
  severity: "info" | "warning" | "error" | string
  area: string
  affectedRows: number
  message: string
  recommendedAction: string
  createdAt: string | null
}

export interface Phase4SiteData {
  source: DataSource
  generatedAt: string
  site: DashboardSnapshot["site"]
  summary: {
    totalUnits: number
    occupiedUnits: number
    reservedUnits: number
    vacantUnits: number
    blockedUnits: number
    blockCount: number
    floorCount: number
  }
  blocks: Phase4Block[]
  units: Phase4Unit[]
  importSummary: {
    totalRows: number
    validRows: number
    warningRows: number
    rejectedRows: number
    readyBatches: number
    readinessRate: number
  }
  importBatches: Phase4ImportBatch[]
  importFindings: Phase4ImportFinding[]
  recentActions: Array<Record<string, unknown>>
  warning?: string
}

export interface FinanceLedgerEntry {
  id: string
  entryType: string
  period: string | null
  dueDate: string | null
  paidAt: string | null
  postedAt: string | null
  status: string
  amountCents: number
  currency: string
  description: string | null
  unitNo: string | null
  residentName: string | null
  idempotencyKey: string | null
  reversalOf: string | null
}

export interface FinanceLedgerData {
  contractVersion: typeof FINANCE_LEDGER_CONTRACT_VERSION
  source: DataSource
  generatedAt: string
  quality: OperationalQualityReport
  summary: {
    currency: string
    openLedgerCents: number
    overdueLedgerCents: number
    paidThisMonthCents: number
    openEntries: number
    overdueEntries: number
    postedEntries: number
    restrictedUnits: number
    legalAccounts: number
    agingBuckets: Array<{ label: string; cents: number }>
  }
  entries: FinanceLedgerEntry[]
  recentActions: Array<Record<string, unknown>>
  warning?: string
}

export interface PeopleDirectoryStaffMember {
  id: string
  profileId: string | null
  name: string
  role: string
  team: string
  phone: string | null
  language: string
  activeTasks: number
  approvalLimitCents: number
  accessScope: string
  status: string
}

export interface PeopleDirectoryResident {
  id: string
  unitNo: string | null
  relationship: string
  isPrimary: boolean
  fullName: string
  phone: string | null
  email: string | null
  preferredLanguage: string
  preferredChannel: string
  identityStatus: string
  riskScore: number
  status: string
  startDate: string | null
  endDate: string | null
}

export interface PeopleRoleCoverage {
  id: string
  roleLabel: string
  usersCount: number
  canApproveFinance: boolean
  canRestrictAccess: boolean
  canManageUsers: boolean
  canExportData: boolean
}

export interface PeopleDirectoryData {
  contractVersion: typeof PEOPLE_DIRECTORY_CONTRACT_VERSION
  source: DataSource
  generatedAt: string
  quality: OperationalQualityReport
  summary: {
    staffTotal: number
    activeStaff: number
    residentTotal: number
    owners: number
    tenants: number
    guests: number
    highRiskResidents: number
    financeApprovers: number
    roleCount: number
  }
  staffMembers: PeopleDirectoryStaffMember[]
  residents: PeopleDirectoryResident[]
  roleCoverage: PeopleRoleCoverage[]
  recentActions: Array<Record<string, unknown>>
  warning?: string
}

export interface Phase7PaymentPlan {
  id: string
  dealName: string
  buyerName: string
  unitType: string
  listPriceEur: number
  paidEur: number
  nextDueEur: number
  nextDueAt: string
  dueInDays: number
  remainingEur: number
  completionPercent: number
  currencyRisk: string
  status: string
  approvalBlocker: string
  requiresFinanceApproval: boolean
}

export interface Phase7DepositDecision {
  id: string
  reservationId: string
  unitNo: string | null
  guestName: string | null
  checkInAt: string | null
  checkOutAt: string | null
  depositStatus: string
  accessCodeStatus: string
  cleaningStatus: string
  depositCents: number
  currency: string
  nextAction: string
}

export interface Phase7RestrictionDecision {
  id: string
  unitId: string | null
  unitNo: string | null
  residentName: string | null
  balanceCents: number
  currency: string
  agingBucket: string
  paymentStatus: string
  accessStatus: string
  riskLevel: "low" | "medium" | "high" | "critical"
  suggestedAction: string
  requiresHumanApproval: boolean
}

export interface Phase7ReconciliationItem {
  id: string
  provider: string
  providerReference: string | null
  status: string
  amountCents: number
  currency: string
  paidAt: string | null
  ledgerEntryId: string | null
  unitNo: string | null
  residentName: string | null
  needsReview: boolean
}

export interface PaymentRestrictionData {
  contractVersion: typeof PAYMENT_RESTRICTION_CONTRACT_VERSION
  source: DataSource
  generatedAt: string
  quality: OperationalQualityReport
  summary: {
    currency: string
    openPaymentPlans: number
    paymentPlansAtRisk: number
    openPlanExposureEur: number
    depositQueue: number
    depositExposureCents: number
    restrictionQueue: number
    restrictedUnits: number
    reconciliationQueue: number
    approvalQueue: number
  }
  paymentPlans: Phase7PaymentPlan[]
  depositDecisions: Phase7DepositDecision[]
  restrictionDecisions: Phase7RestrictionDecision[]
  reconciliation: Phase7ReconciliationItem[]
  recentActions: Array<Record<string, unknown>>
  warning?: string
}

export interface ServiceTicketQueueData {
  contractVersion: typeof SERVICE_TICKETING_CONTRACT_VERSION
  source: DataSource
  generatedAt: string
  quality: OperationalQualityReport
  summary: {
    totalTickets: number
    openTickets: number
    overdueTickets: number
    urgentTickets: number
    financeBlockedTickets: number
    approvalRequiredTickets: number
    mediaEvidenceCount: number
    estimatedCostCents: number
    averageSlaHoursRemaining: number
    catalogItems: number
    activeCatalogItems: number
    serviceOrders: number
    readyForDispatchOrders: number
    blockedOrders: number
    openWorkforceTasks: number
    slaBreachTasks: number
    managerApprovalTasks: number
    fieldTeams: number
    averageCompletionReadiness: number
  }
  tickets: ServiceTicket[]
  catalog: ServiceCatalogItem[]
  orders: ServiceOrderRecord[]
  workforceTasks: WorkforceTaskRecord[]
  strategy: {
    systemOfRecord: string
    crmRole: string
    escalationPolicy: string
    externalHelpdeskDecision: string
  }
  recentActions: Array<Record<string, unknown>>
  warning?: string
}

function localSeedSnapshot(warning?: string): DashboardSnapshot {
  const summary = getSummary()

  return {
    source: "local-seed",
    generatedAt: new Date().toISOString(),
    company: {
      id: "seed-company",
      name: "Ataberk Estate",
      slug: "ataberk-estate",
      currency: "TRY",
    },
    site: {
      id: "seed-site",
      name: "New Level Premium Avsallar",
      code: "NLP-AVS",
      city: "Alanya",
      district: "Avsallar",
      totalUnits: summary.totalFlats,
    },
    summary: {
      totalUnits: summary.totalFlats,
      occupiedUnits: summary.occupiedFlats,
      vacantUnits: summary.vacantFlats,
      blockedUnits: summary.blockedFlats,
      openTickets: summary.openTickets,
      overdueTickets: summary.overdueTickets,
      openLedgerCents: summary.totalDebtTry * 100,
      activeReservations: summary.activeBookings,
      pendingAiActions: summary.aiRiskCount,
    },
    units: flats.slice(0, 48).map((flat) => ({
      id: flat.id,
      unit_no: flat.number,
      unit_type: flat.type,
      occupancy_status: flat.status,
      ownership_status: flat.residentType,
      balance_try: flat.balanceTry,
    })),
    tickets: serviceTickets.slice(0, 12).map((ticket) => ({
      id: ticket.id,
      ticket_no: ticket.id,
      flat_number: ticket.flatNumber,
      title: ticket.title,
      priority: ticket.priority,
      status: ticket.status,
      category: ticket.category,
      assignee: ticket.assignee,
      sla_hours_remaining: ticket.slaHoursRemaining,
      estimated_cost_cents: ticket.estimatedCostTry * 100,
    })),
    recentActions: [],
    warning,
  }
}

function canUseLocalSeedFallback() {
  return isAccessProfileEnabled()
}

async function createDataClient() {
  const serviceClient = isAccessProfileEnabled() ? createServiceRoleClient() : null
  return serviceClient ?? (await createClient())
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function asNullableString(value: unknown) {
  return typeof value === "string" ? value : null
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function asNullableNumber(value: unknown) {
  if (value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function asNumberArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
}

function readinessRate(validRows: number, totalRows: number) {
  return Math.round((validRows / Math.max(totalRows, 1)) * 100)
}

function normalizeSnapshot(payload: unknown): DashboardSnapshot {
  const value = payload as Partial<DashboardSnapshot> | null
  if (!value || typeof value !== "object") {
    throw new Error("Dashboard snapshot payload is invalid.")
  }

  return {
    source: "supabase",
    generatedAt:
      typeof value.generatedAt === "string"
        ? value.generatedAt
        : new Date().toISOString(),
    company:
      value.company && typeof value.company === "object"
        ? (value.company as DashboardSnapshot["company"])
        : { id: "unknown", name: "Unknown company" },
    site:
      value.site && typeof value.site === "object"
        ? (value.site as DashboardSnapshot["site"])
        : { id: "unknown", name: "Unknown site" },
    summary:
      value.summary && typeof value.summary === "object"
        ? (value.summary as DashboardSnapshot["summary"])
        : localSeedSnapshot().summary,
    units: Array.isArray(value.units) ? value.units : [],
    tickets: Array.isArray(value.tickets) ? value.tickets : [],
    recentActions: Array.isArray(value.recentActions)
      ? value.recentActions
      : [],
  }
}

function normalizeSearchRows(payload: unknown): OperationalSearchResult[] {
  if (!Array.isArray(payload)) return []

  return payload.map((row) => {
    const record = row as Record<string, unknown>
    return {
      entityTable: String(record.entity_table ?? ""),
      entityId:
        typeof record.entity_id === "string" ? record.entity_id : null,
      entityExternalId:
        typeof record.entity_external_id === "string"
          ? record.entity_external_id
          : null,
      title: String(record.title ?? ""),
      summary: typeof record.summary === "string" ? record.summary : null,
      rank: Number(record.rank ?? 0),
      metadata:
        record.metadata && typeof record.metadata === "object"
          ? (record.metadata as Record<string, unknown>)
          : {},
    }
  })
}

function normalizePhase4(payload: unknown): Phase4SiteData {
  const value = asRecord(payload)
  const summary = asRecord(value.summary)
  const importSummary = asRecord(value.importSummary)
  const totalRows = asNumber(importSummary.totalRows)
  const validRows = asNumber(importSummary.validRows)

  return {
    source: "supabase",
    generatedAt: asString(value.generatedAt, new Date().toISOString()),
    site: Object.keys(asRecord(value.site)).length
      ? (asRecord(value.site) as DashboardSnapshot["site"])
      : { id: "unknown", name: "Unknown site" },
    summary: {
      totalUnits: asNumber(summary.totalUnits),
      occupiedUnits: asNumber(summary.occupiedUnits),
      reservedUnits: asNumber(summary.reservedUnits),
      vacantUnits: asNumber(summary.vacantUnits),
      blockedUnits: asNumber(summary.blockedUnits),
      blockCount: asNumber(summary.blockCount),
      floorCount: asNumber(summary.floorCount),
    },
    blocks: Array.isArray(value.blocks)
      ? value.blocks.map((row) => {
          const record = asRecord(row)
          return {
            name: asString(record.name),
            sortOrder: asNumber(record.sort_order),
            totalUnits: asNumber(record.total_units),
            occupiedUnits: asNumber(record.occupied_units),
            reservedUnits: asNumber(record.reserved_units),
            vacantUnits: asNumber(record.vacant_units),
            blockedUnits: asNumber(record.blocked_units),
            availableForSale: asNumber(record.available_for_sale, asNumber(record.vacant_units)),
            soldUnits: asNumber(record.sold_units, asNumber(record.occupied_units)),
            sourceMissingUnits: asNumber(record.source_missing_units),
            minBuyNowEurCents: asNullableNumber(record.min_buy_now_eur_cents),
            maxBuyNowEurCents: asNullableNumber(record.max_buy_now_eur_cents),
            priceSourceStatus:
              asString(record.price_source_status, "missing") === "parsed"
                ? "parsed"
                : "missing",
            numberingSource: asNullableString(record.numbering_source),
          }
        })
      : [],
    units: Array.isArray(value.units)
      ? value.units.map((row) => {
          const record = asRecord(row)
          return {
            id: asString(record.id),
            unitNo: asString(record.unit_no),
            unitType: asString(record.unit_type),
            occupancyStatus: asString(record.occupancy_status, "unknown"),
            ownershipStatus: asString(record.ownership_status, "unknown"),
            sizeSqm:
              record.size_sqm === null || record.size_sqm === undefined
                ? null
                : asNumber(record.size_sqm),
            bedrooms:
              record.bedrooms === null || record.bedrooms === undefined
                ? null
                : asNumber(record.bedrooms),
            blockName: asNullableString(record.block_name),
            floorLabel: asNullableString(record.floor_label),
            floorLevel:
              record.floor_level === null || record.floor_level === undefined
                ? null
                : asNumber(record.floor_level),
            saleStatus: asString(record.sale_status, "unknown"),
            listPriceEurCents: asNullableNumber(record.list_price_eur_cents),
            nextPriceEurCents: asNumberArray(record.next_price_eur_cents),
            priceSource: asNullableString(record.price_source),
            numberingSource: asNullableString(record.numbering_source),
            sourceNotes: asNullableString(record.source_notes),
            sourceMetadata: asRecord(record.source_metadata),
            ownerName: asNullableString(record.owner_name),
            residentName: asNullableString(record.resident_name),
            balanceCents: asNumber(record.balance_cents),
            openFinanceEntries: asNumber(record.open_finance_entries),
            openTicketCount: asNumber(record.open_ticket_count),
            accessStatus: asString(record.access_status, "active"),
            paymentStatus: asString(record.payment_status, "clear"),
          }
        })
      : [],
    importSummary: {
      totalRows,
      validRows,
      warningRows: asNumber(importSummary.warningRows),
      rejectedRows: asNumber(importSummary.rejectedRows),
      readyBatches: asNumber(importSummary.readyBatches),
      readinessRate: readinessRate(validRows, totalRows),
    },
    importBatches: Array.isArray(value.importBatches)
      ? value.importBatches.map((row) => {
          const record = asRecord(row)
          return {
            id: asString(record.id),
            sourceName: asString(record.source_name),
            entityType: asString(record.entity_type),
            totalRows: asNumber(record.total_rows),
            validRows: asNumber(record.valid_rows),
            warningRows: asNumber(record.warning_rows),
            rejectedRows: asNumber(record.rejected_rows),
            status: asString(record.status),
            checkedAt: asNullableString(record.checked_at),
            appliedAt: asNullableString(record.applied_at),
          }
        })
      : [],
    importFindings: Array.isArray(value.importFindings)
      ? value.importFindings.map((row) => {
          const record = asRecord(row)
          return {
            id: asString(record.id),
            importBatchId: asNullableString(record.import_batch_id),
            severity: asString(record.severity, "info"),
            area: asString(record.area),
            affectedRows: asNumber(record.affected_rows),
            message: asString(record.message),
            recommendedAction: asString(record.recommended_action),
            createdAt: asNullableString(record.created_at),
          }
        })
      : [],
    recentActions: Array.isArray(value.recentActions)
      ? value.recentActions.map(asRecord)
      : [],
  }
}

function relatedRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return asRecord(value[0])
  return asRecord(value)
}

function normalizeFinanceLedgerRows(rows: unknown): FinanceLedgerEntry[] {
  if (!Array.isArray(rows)) return []

  return rows.map((row) => {
    const record = asRecord(row)
    const unit = relatedRecord(record.units)
    const resident = relatedRecord(record.residents)

    return {
      id: asString(record.id),
      entryType: asString(record.entry_type),
      period: asNullableString(record.period),
      dueDate: asNullableString(record.due_date),
      paidAt: asNullableString(record.paid_at),
      postedAt: asNullableString(record.posted_at),
      status: asString(record.status, "open"),
      amountCents: asNumber(record.amount_cents),
      currency: asString(record.currency, "TRY"),
      description: asNullableString(record.description),
      unitNo: asNullableString(unit.unit_no),
      residentName: asNullableString(resident.full_name),
      idempotencyKey: asNullableString(record.idempotency_key),
      reversalOf: asNullableString(record.reversal_of),
    }
  })
}

function normalizeStaffRows(rows: unknown): PeopleDirectoryStaffMember[] {
  if (!Array.isArray(rows)) return []

  return rows.map((row) => {
    const record = asRecord(row)
    return {
      id: asString(record.id),
      profileId: asNullableString(record.profile_id),
      name: asString(record.name),
      role: asString(record.role, "staff"),
      team: asString(record.team),
      phone: asNullableString(record.phone),
      language: asString(record.language, "tr"),
      activeTasks: asNumber(record.active_tasks),
      approvalLimitCents: asNumber(record.approval_limit_cents),
      accessScope: asString(record.access_scope, "resident_only"),
      status: asString(record.status, "active"),
    }
  })
}

function normalizeRoleCoverageRows(rows: unknown): PeopleRoleCoverage[] {
  if (!Array.isArray(rows)) return []

  return rows.map((row) => {
    const record = asRecord(row)
    return {
      id: asString(record.id),
      roleLabel: asString(record.role_label),
      usersCount: asNumber(record.users_count),
      canApproveFinance: asBoolean(record.can_approve_finance),
      canRestrictAccess: asBoolean(record.can_restrict_access),
      canManageUsers: asBoolean(record.can_manage_users),
      canExportData: asBoolean(record.can_export_data),
    }
  })
}

function normalizeResidentLinkRows(rows: unknown): PeopleDirectoryResident[] {
  if (!Array.isArray(rows)) return []

  return rows.map((row) => {
    const record = asRecord(row)
    const unit = relatedRecord(record.units)
    const resident = relatedRecord(record.residents)

    return {
      id: asString(resident.id, asString(record.resident_id, asString(record.id))),
      unitNo: asNullableString(unit.unit_no),
      relationship: asString(record.relationship, "resident"),
      isPrimary: asBoolean(record.is_primary),
      fullName: asString(resident.full_name),
      phone: asNullableString(resident.phone),
      email: asNullableString(resident.email),
      preferredLanguage: asString(resident.preferred_language, "tr"),
      preferredChannel: asString(resident.preferred_channel, "portal"),
      identityStatus: asString(resident.identity_status, "unverified"),
      riskScore: asNumber(resident.risk_score),
      status: asString(resident.status, "active"),
      startDate: asNullableString(record.start_date),
      endDate: asNullableString(record.end_date),
    }
  })
}

function normalizeResidentRows(rows: unknown): PeopleDirectoryResident[] {
  if (!Array.isArray(rows)) return []

  return rows.map((row) => {
    const record = asRecord(row)
    return {
      id: asString(record.id),
      unitNo: null,
      relationship: "resident",
      isPrimary: false,
      fullName: asString(record.full_name),
      phone: asNullableString(record.phone),
      email: asNullableString(record.email),
      preferredLanguage: asString(record.preferred_language, "tr"),
      preferredChannel: asString(record.preferred_channel, "portal"),
      identityStatus: asString(record.identity_status, "unverified"),
      riskScore: asNumber(record.risk_score),
      status: asString(record.status, "active"),
      startDate: null,
      endDate: null,
    }
  })
}

function summarizePeopleDirectory(
  staff: PeopleDirectoryStaffMember[],
  people: PeopleDirectoryResident[],
  roles: PeopleRoleCoverage[]
): PeopleDirectoryData["summary"] {
  const uniqueResidents = new Set(people.map((resident) => resident.id).filter(Boolean))

  return {
    staffTotal: staff.length,
    activeStaff: staff.filter((member) => member.status === "active").length,
    residentTotal: uniqueResidents.size || people.length,
    owners: people.filter((resident) => resident.relationship === "owner").length,
    tenants: people.filter((resident) => resident.relationship === "tenant").length,
    guests: people.filter((resident) => resident.relationship === "guest").length,
    highRiskResidents: people.filter((resident) => resident.riskScore >= 70).length,
    financeApprovers: roles
      .filter((role) => role.canApproveFinance)
      .reduce((sum, role) => sum + role.usersCount, 0),
    roleCount: roles.length,
  }
}

function qualityStatus(checks: OperationalQualityCheck[]): OperationalQualityStatus {
  if (checks.some((check) => check.status === "failed")) return "failed"
  if (checks.some((check) => check.status === "warning")) return "warning"
  return "passed"
}

function qualityReport(checks: OperationalQualityCheck[]): OperationalQualityReport {
  return {
    status: qualityStatus(checks),
    checks,
  }
}

function buildPeopleDirectoryQuality(
  staff: PeopleDirectoryStaffMember[],
  people: PeopleDirectoryResident[],
  roles: PeopleRoleCoverage[]
): OperationalQualityReport {
  const uniqueResidents = new Set(people.map((resident) => resident.id).filter(Boolean))
  const relationshipTypes = new Set(people.map((resident) => resident.relationship).filter(Boolean))
  const languages = new Set([
    ...staff.map((member) => member.language).filter(Boolean),
    ...people.map((resident) => resident.preferredLanguage).filter(Boolean),
  ])
  const rolesWithSensitiveControls = roles.filter(
    (role) => role.canApproveFinance || role.canRestrictAccess || role.canManageUsers
  )

  return qualityReport([
    {
      id: "people.staff-present",
      label: "Staff directory has records",
      status: staff.length > 0 ? "passed" : "failed",
      detail: `${staff.length} staff records returned.`,
    },
    {
      id: "people.residents-present",
      label: "Resident directory has records",
      status: uniqueResidents.size > 0 ? "passed" : "failed",
      detail: `${uniqueResidents.size || people.length} unique resident records returned.`,
    },
    {
      id: "people.relationship-coverage",
      label: "Owner/tenant/guest relationships are represented",
      status: relationshipTypes.has("owner") && relationshipTypes.has("tenant") ? "passed" : "warning",
      detail: `${Array.from(relationshipTypes).join(", ") || "no relationships"} in the response.`,
    },
    {
      id: "people.role-matrix",
      label: "Role coverage matrix is available",
      status: roles.length >= 4 ? "passed" : "failed",
      detail: `${roles.length} role coverage rows returned.`,
    },
    {
      id: "people.sensitive-role-controls",
      label: "Sensitive role controls are explicit",
      status: rolesWithSensitiveControls.length > 0 ? "passed" : "failed",
      detail: `${rolesWithSensitiveControls.length} roles expose finance, access or user-management controls.`,
    },
    {
      id: "people.language-coverage",
      label: "Multilingual profile metadata is present",
      status: languages.size >= 2 ? "passed" : "warning",
      detail: `${languages.size} language values found.`,
    },
  ])
}

function isOpenLedgerStatus(status: string) {
  return status === "open" || status === "partially_paid" || status === "overdue"
}

function isOverdueLedgerEntry(entry: FinanceLedgerEntry) {
  if (entry.status === "overdue") return true
  if (!isOpenLedgerStatus(entry.status) || entry.entryType === "payment" || !entry.dueDate) {
    return false
  }
  const dueTime = new Date(entry.dueDate).getTime()
  return Number.isFinite(dueTime) && dueTime < Date.now()
}

function isPaidThisMonth(entry: FinanceLedgerEntry) {
  if (!entry.paidAt) return false
  const paidAt = new Date(entry.paidAt)
  const now = new Date()
  return (
    paidAt.getFullYear() === now.getFullYear() &&
    paidAt.getMonth() === now.getMonth()
  )
}

function summarizeFinanceRows(entries: FinanceLedgerEntry[]): FinanceLedgerData["summary"] {
  const openEntries = entries.filter((entry) => isOpenLedgerStatus(entry.status))
  const overdueEntries = entries.filter(isOverdueLedgerEntry)
  const currency = entries.find((entry) => entry.currency)?.currency ?? "TRY"
  const restrictedUnits = new Set(
    overdueEntries.map((entry) => entry.unitNo).filter(Boolean)
  ).size
  const agingBuckets = ["0-30", "31-60", "61-90", "90+"].map((label) => ({
    label,
    cents: 0,
  }))

  for (const entry of openEntries) {
    if (!entry.dueDate) continue
    const dueTime = new Date(entry.dueDate).getTime()
    if (!Number.isFinite(dueTime)) continue
    const ageDays = Math.max(0, Math.floor((Date.now() - dueTime) / 86_400_000))
    const bucket =
      ageDays >= 91
        ? "90+"
        : ageDays >= 61
          ? "61-90"
          : ageDays >= 31
            ? "31-60"
            : "0-30"
    const target = agingBuckets.find((item) => item.label === bucket)
    if (target) target.cents += entry.amountCents
  }

  return {
    currency,
    openLedgerCents: openEntries.reduce((sum, entry) => sum + entry.amountCents, 0),
    overdueLedgerCents: overdueEntries.reduce((sum, entry) => sum + entry.amountCents, 0),
    paidThisMonthCents: entries
      .filter(isPaidThisMonth)
      .reduce((sum, entry) => sum + entry.amountCents, 0),
    openEntries: openEntries.length,
    overdueEntries: overdueEntries.length,
    postedEntries: entries.filter((entry) => entry.postedAt).length,
    restrictedUnits,
    legalAccounts: overdueEntries.filter((entry) => entry.status === "overdue").length,
    agingBuckets,
  }
}

function buildFinanceLedgerQuality(
  entries: FinanceLedgerEntry[],
  summary: FinanceLedgerData["summary"]
): OperationalQualityReport {
  const uniqueIds = new Set(entries.map((entry) => entry.id).filter(Boolean))
  const agingTotalCents = summary.agingBuckets.reduce((sum, bucket) => sum + bucket.cents, 0)
  const postedEntriesWithoutControlKey = entries.filter(
    (entry) => entry.postedAt && !entry.idempotencyKey && !entry.reversalOf
  )

  return qualityReport([
    {
      id: "finance.entries-present",
      label: "Ledger entries are returned",
      status: entries.length > 0 ? "passed" : "failed",
      detail: `${entries.length} ledger entries returned for the requested page.`,
    },
    {
      id: "finance.unique-entry-ids",
      label: "Ledger entry identifiers are unique",
      status: uniqueIds.size === entries.length ? "passed" : "failed",
      detail: `${uniqueIds.size}/${entries.length} unique entry IDs.`,
    },
    {
      id: "finance.non-negative-totals",
      label: "Ledger totals are non-negative",
      status:
        summary.openLedgerCents >= 0 &&
        summary.overdueLedgerCents >= 0 &&
        summary.paidThisMonthCents >= 0
          ? "passed"
          : "failed",
      detail: `Open ${summary.openLedgerCents}, overdue ${summary.overdueLedgerCents}, paid ${summary.paidThisMonthCents} cents.`,
    },
    {
      id: "finance.overdue-contained-in-open",
      label: "Overdue balance is contained in open balance",
      status: summary.overdueLedgerCents <= summary.openLedgerCents ? "passed" : "failed",
      detail: `Overdue ${summary.overdueLedgerCents} of open ${summary.openLedgerCents} cents.`,
    },
    {
      id: "finance.aging-buckets",
      label: "Debt aging buckets are populated",
      status:
        summary.agingBuckets.length >= 4 &&
        summary.agingBuckets.every((bucket) => bucket.cents >= 0) &&
        agingTotalCents <= summary.openLedgerCents
          ? "passed"
          : "warning",
      detail: `${summary.agingBuckets.length} buckets, total ${agingTotalCents} cents.`,
    },
    {
      id: "finance.posted-entry-controls",
      label: "Posted entries carry an idempotency or reversal reference",
      status: postedEntriesWithoutControlKey.length === 0 ? "passed" : "warning",
      detail: `${postedEntriesWithoutControlKey.length} posted entries need stronger write-control metadata.`,
    },
  ])
}

function daysUntil(value: string | null) {
  if (!value) return 0
  const target = new Date(value).getTime()
  if (!Number.isFinite(target)) return 0
  return Math.ceil((target - Date.now()) / 86_400_000)
}

function paymentPlanPriority(status: string) {
  if (status === "blocked") return 0
  if (status === "overdue") return 1
  if (status === "due_soon") return 2
  return 3
}

function buildPaymentPlanQueue(plans: PaymentPlanRecord[], limit: number): Phase7PaymentPlan[] {
  return plans
    .slice()
    .sort((a, b) => paymentPlanPriority(a.status) - paymentPlanPriority(b.status))
    .slice(0, limit)
    .map((plan) => {
      const remainingEur = Math.max(plan.listPriceEur - plan.paidEur, 0)
      return {
        id: plan.id,
        dealName: plan.dealName,
        buyerName: plan.buyerName,
        unitType: plan.unitType,
        listPriceEur: plan.listPriceEur,
        paidEur: plan.paidEur,
        nextDueEur: plan.nextDueEur,
        nextDueAt: plan.nextDueAt,
        dueInDays: daysUntil(plan.nextDueAt),
        remainingEur,
        completionPercent: Math.min(
          100,
          Math.round((plan.paidEur / Math.max(plan.listPriceEur, 1)) * 100)
        ),
        currencyRisk: plan.currencyRisk,
        status: plan.status,
        approvalBlocker: plan.approvalBlocker,
        requiresFinanceApproval:
          plan.status === "blocked" ||
          plan.status === "overdue" ||
          plan.approvalBlocker.toLowerCase() !== "no blocker",
      }
    })
}

function depositActionFor(booking: Pick<BookingRecord, "depositStatus" | "accessCodeStatus" | "cleaningStatus">) {
  if (booking.depositStatus === "deduction_pending") return "Hasar ve temizlik kanitini muhasebe onayina bagla"
  if (booking.depositStatus === "refund_ready") return "Iade emrini finans onay kuyruguna al"
  if (booking.accessCodeStatus === "restricted" || booking.accessCodeStatus === "disabled") {
    return "Erisim kodunu depozito ve borc kontrolu kapanana kadar acma"
  }
  if (booking.cleaningStatus === "blocked") return "Temizlik blokajini operasyonla eslestir"
  if (booking.depositStatus === "held") return "Depozito tutarini checkout takibinde izle"
  return "Rezervasyon on kontrolunu tamamla"
}

function buildDepositQueue(records: BookingRecord[], limit: number): Phase7DepositDecision[] {
  return records
    .filter(
      (booking) =>
        booking.depositStatus !== "not_required" ||
        booking.accessCodeStatus !== "active" ||
        booking.cleaningStatus === "blocked"
    )
    .slice(0, limit)
    .map((booking) => ({
      id: `deposit-${booking.id}`,
      reservationId: booking.id,
      unitNo: booking.flatNumber,
      guestName: booking.guestName,
      checkInAt: booking.checkIn,
      checkOutAt: booking.checkOut,
      depositStatus: booking.depositStatus,
      accessCodeStatus: booking.accessCodeStatus,
      cleaningStatus: booking.cleaningStatus,
      depositCents: booking.depositTry * 100,
      currency: "TRY",
      nextAction: depositActionFor(booking),
    }))
}

function riskForDebt(account: Pick<DebtAccount, "paymentStatus" | "accessStatus" | "balanceTry">): Phase7RestrictionDecision["riskLevel"] {
  if (account.paymentStatus === "legal" || account.accessStatus === "restricted") return "critical"
  if (account.paymentStatus === "overdue") return "high"
  if (account.balanceTry >= 5000) return "medium"
  return "low"
}

function buildRestrictionQueue(accounts: DebtAccount[], limit: number): Phase7RestrictionDecision[] {
  return accounts
    .filter(
      (account) =>
        account.paymentStatus === "legal" ||
        account.paymentStatus === "overdue" ||
        account.accessStatus === "restricted"
    )
    .slice(0, limit)
    .map((account) => ({
      id: `restriction-${account.flatId}`,
      unitId: account.flatId,
      unitNo: account.flatNumber,
      residentName: account.ownerName,
      balanceCents: account.balanceTry * 100,
      currency: "TRY",
      agingBucket: account.agingBucket,
      paymentStatus: account.paymentStatus,
      accessStatus: account.accessStatus,
      riskLevel: riskForDebt(account),
      suggestedAction: account.suggestedAction,
      requiresHumanApproval: true,
    }))
}

function buildLocalReconciliationQueue(accounts: DebtAccount[], limit: number): Phase7ReconciliationItem[] {
  return accounts
    .filter((account) => account.paymentStatus === "overdue" || account.paymentStatus === "legal")
    .slice(0, Math.min(limit, 6))
    .map((account) => ({
      id: `recon-${account.flatId}`,
      provider: "bank-transfer",
      providerReference: `manual-${account.flatNumber}`,
      status: "pending_review",
      amountCents: account.balanceTry * 100,
      currency: "TRY",
      paidAt: null,
      ledgerEntryId: `seed-ledger-${account.flatId}`,
      unitNo: account.flatNumber,
      residentName: account.ownerName,
      needsReview: true,
    }))
}

function buildPaymentRestrictionSummary(
  plans: Phase7PaymentPlan[],
  deposits: Phase7DepositDecision[],
  restrictions: Phase7RestrictionDecision[],
  reconciliation: Phase7ReconciliationItem[]
): PaymentRestrictionData["summary"] {
  return {
    currency: "TRY",
    openPaymentPlans: paymentPlans.length,
    paymentPlansAtRisk: paymentPlans.filter((plan) => plan.status !== "on_track").length,
    openPlanExposureEur: getPaymentPlanSummary().openExposureEur,
    depositQueue: deposits.length,
    depositExposureCents: deposits.reduce((sum, item) => sum + item.depositCents, 0),
    restrictionQueue: restrictions.length,
    restrictedUnits: restrictions.filter((item) => item.accessStatus === "restricted").length,
    reconciliationQueue: reconciliation.filter((item) => item.needsReview).length,
    approvalQueue:
      plans.filter((plan) => plan.requiresFinanceApproval).length +
      deposits.filter((item) => item.depositStatus !== "held").length +
      restrictions.filter((item) => item.requiresHumanApproval).length +
      reconciliation.filter((item) => item.needsReview).length,
  }
}

function buildPaymentRestrictionQuality(
  plans: Phase7PaymentPlan[],
  deposits: Phase7DepositDecision[],
  restrictions: Phase7RestrictionDecision[],
  reconciliation: Phase7ReconciliationItem[],
  summary: PaymentRestrictionData["summary"]
): OperationalQualityReport {
  const uniqueIds = new Set([
    ...plans.map((item) => item.id),
    ...deposits.map((item) => item.id),
    ...restrictions.map((item) => item.id),
    ...reconciliation.map((item) => item.id),
  ])
  const allIdsCount = plans.length + deposits.length + restrictions.length + reconciliation.length
  const depositsWithoutAmount = deposits.filter(
    (item) => item.depositStatus !== "not_required" && item.depositCents <= 0
  )
  const autonomousRestrictions = restrictions.filter((item) => !item.requiresHumanApproval)

  return qualityReport([
    {
      id: "phase7.payment-plans-present",
      label: "Payment-plan queue is available",
      status: plans.length > 0 ? "passed" : "warning",
      detail: `${plans.length} payment-plan records returned.`,
    },
    {
      id: "phase7.unique-work-items",
      label: "Phase 7 work item identifiers are unique",
      status: uniqueIds.size === allIdsCount ? "passed" : "failed",
      detail: `${uniqueIds.size}/${allIdsCount} unique IDs across queues.`,
    },
    {
      id: "phase7.non-negative-money",
      label: "Payment, deposit and restriction totals are non-negative",
      status:
        summary.openPlanExposureEur >= 0 &&
        summary.depositExposureCents >= 0 &&
        restrictions.every((item) => item.balanceCents >= 0) &&
        reconciliation.every((item) => item.amountCents >= 0)
          ? "passed"
          : "failed",
      detail: `Plan ${summary.openPlanExposureEur} EUR, deposit ${summary.depositExposureCents} cents.`,
    },
    {
      id: "phase7.deposit-amounts",
      label: "Deposit decisions carry amount data where required",
      status: depositsWithoutAmount.length === 0 ? "passed" : "warning",
      detail: `${depositsWithoutAmount.length} deposit decisions need provider amount mapping.`,
    },
    {
      id: "phase7.human-approval-access",
      label: "Debt restriction decisions require human approval",
      status: autonomousRestrictions.length === 0 ? "passed" : "failed",
      detail: `${autonomousRestrictions.length} restriction decisions would bypass approval.`,
    },
    {
      id: "phase7.reconciliation-queue",
      label: "Reconciliation queue is represented",
      status: reconciliation.length > 0 || summary.paymentPlansAtRisk > 0 ? "passed" : "warning",
      detail: `${reconciliation.length} reconciliation records, ${summary.paymentPlansAtRisk} at-risk payment plans.`,
    },
  ])
}

function localSeedPaymentRestrictionData(limit = 8, warning?: string): PaymentRestrictionData {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const accounts = getDebtAccounts()
  const planQueue = buildPaymentPlanQueue(paymentPlans, safeLimit)
  const depositQueue = buildDepositQueue(bookings, safeLimit)
  const restrictionQueue = buildRestrictionQueue(accounts, safeLimit)
  const reconciliationQueue = buildLocalReconciliationQueue(accounts, safeLimit)
  const summary = buildPaymentRestrictionSummary(
    planQueue,
    depositQueue,
    restrictionQueue,
    reconciliationQueue
  )

  return {
    contractVersion: PAYMENT_RESTRICTION_CONTRACT_VERSION,
    source: "local-seed",
    generatedAt: new Date().toISOString(),
    quality: buildPaymentRestrictionQuality(
      planQueue,
      depositQueue,
      restrictionQueue,
      reconciliationQueue,
      summary
    ),
    summary,
    paymentPlans: planQueue,
    depositDecisions: depositQueue,
    restrictionDecisions: restrictionQueue,
    reconciliation: reconciliationQueue,
    recentActions: siteActivities.slice(0, 4),
    warning,
  }
}

function mapTicketPriority(value: string): ServiceTicket["priority"] {
  if (value === "urgent") return "urgent"
  if (value === "high") return "high"
  if (value === "low") return "low"
  return "medium"
}

function mapTicketStatus(value: string): ServiceTicket["status"] {
  if (value === "assigned") return "assigned"
  if (value === "in_progress") return "in_progress"
  if (value === "resolved") return "resolved"
  if (value === "closed" || value === "cancelled") return "closed"
  if (value === "waiting_approval") return "waiting_payment"
  return "open"
}

function slaHoursRemaining(value: string | null) {
  if (!value) return 0
  const dueAt = new Date(value).getTime()
  if (!Number.isFinite(dueAt)) return 0
  return Math.ceil((dueAt - Date.now()) / 3_600_000)
}

function catalogCategoryKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

function catalogItemForTicket(ticket: ServiceTicket, index: number) {
  const category = catalogCategoryKey(ticket.category)
  const matchedCode =
    category.includes("tesisat") || category.includes("su")
      ? "MAINT-PLUMB"
      : category.includes("klima") || category.includes("iklim")
        ? "MAINT-AC"
        : category.includes("temiz")
          ? "CLEAN-STD"
          : category.includes("depozito") || category.includes("hasar")
            ? "INSP-DAMAGE"
            : category.includes("erisim") || category.includes("guven") || category.includes("kamera")
              ? "SEC-ACCESS"
              : category.includes("ortak") || category.includes("havuz") || category.includes("finans")
                ? "AMENITY-SPA"
                : null

  return (
    serviceCatalogItems.find((item) => item.code === matchedCode) ??
    serviceCatalogItems[index % serviceCatalogItems.length]
  )
}

function servicePaymentDecisionForTicket(
  ticket: ServiceTicket,
  catalogItem: ServiceCatalogItem
): ServiceOrderRecord["paymentDecision"] {
  if (ticket.debtBlocked) return "hold"
  if (!catalogItem.requiresPayment || catalogItem.basePriceTry === 0) return "no_charge"
  if (ticket.paymentVerified) return "paid_or_debit_approved"
  if (catalogItem.debtPolicy === "allow") return "debit_to_account"
  return "collect_before_dispatch"
}

function serviceOrderStatusForTicket(ticket: ServiceTicket): ServiceOrderRecord["status"] {
  if (ticket.debtBlocked) return "blocked"
  if (ticket.status === "waiting_payment") return "payment_pending"
  if (ticket.status === "resolved" || ticket.status === "closed") return "completed"
  if (ticket.status === "assigned" || ticket.status === "in_progress") return "assigned"
  return "debt_check"
}

function serviceOrderNextAction(
  ticket: ServiceTicket,
  paymentDecision: ServiceOrderRecord["paymentDecision"]
) {
  if (ticket.debtBlocked) return "Finance approval must clear before dispatch."
  if (paymentDecision === "collect_before_dispatch") return "Collect payment or approve debit-to-account before dispatch."
  if (ticket.status === "open") return "Assign the task by SLA and field team capacity."
  if (ticket.status === "assigned") return "Send route slot and media checklist to staff."
  if (ticket.status === "in_progress") return "Review field note and closure evidence."
  if (ticket.status === "resolved") return "Collect resident confirmation and close."
  return "Archive and include in service reporting."
}

function buildServiceOrdersFromTickets(tickets: ServiceTicket[]): ServiceOrderRecord[] {
  return tickets.map((ticket, index) => {
    const catalogItem = catalogItemForTicket(ticket, index)
    const paymentDecision = servicePaymentDecisionForTicket(ticket, catalogItem)
    const quotedPriceTry =
      ticket.estimatedCostTry > 0 ? ticket.estimatedCostTry : catalogItem.basePriceTry

    return {
      id: `ORD-${ticket.id.replace(/^SRV-/, "")}`,
      orderNo: `ORD-${ticket.id.replace(/^SRV-/, "")}`,
      catalogItemId: catalogItem.id,
      catalogItemName: catalogItem.name,
      ticketId: ticket.id,
      flatNumber: ticket.flatNumber,
      requester: ticket.requester,
      status: serviceOrderStatusForTicket(ticket),
      debtCheckStatus: ticket.debtBlocked
        ? "blocked"
        : ticket.paymentVerified
          ? "clear"
          : "minor_debt_review",
      paymentDecision,
      quotedPriceTry,
      currency: "TRY",
      slaHours: catalogItem.slaHours,
      assignedTeam: catalogItem.team,
      taskCreated: ticket.status !== "open" && !ticket.debtBlocked,
      requestedForAt: ticket.dueAt || ticket.openedAt,
      createdAt: ticket.openedAt,
      nextAction: serviceOrderNextAction(ticket, paymentDecision),
    }
  })
}

const defaultChecklistByTeam: Record<string, string[]> = {
  Teknik: ["Verify issue", "Upload before photo", "Add work note", "Upload closure proof"],
  Guvenlik: ["Verify authority", "Update access record", "Check access log", "Confirm closure"],
  "Kat hizmetleri": ["Inspect unit", "Complete cleaning checklist", "Upload photo proof", "Add handover note"],
  Operasyon: ["Mark damage area", "Record deposit impact", "Request manager approval", "Publish closure report"],
  Rezervasyon: ["Confirm arrival time", "Assign provider", "Notify guest", "Confirm completion"],
  "Sakin destek": ["Verify scope", "Check slot availability", "Send notification", "Collect feedback"],
}

function taskCompletionReadiness(ticket: ServiceTicket) {
  const evidenceScore = Math.min(ticket.mediaCount * 18, 54)
  const statusScore =
    ticket.status === "closed" || ticket.status === "resolved"
      ? 40
      : ticket.status === "in_progress"
        ? 28
        : ticket.status === "assigned"
          ? 18
          : 8
  const financePenalty = ticket.debtBlocked ? 35 : 0
  return Math.max(0, Math.min(100, evidenceScore + statusScore - financePenalty))
}

function buildWorkforceTasksFromTickets(tickets: ServiceTicket[]): WorkforceTaskRecord[] {
  return tickets.map((ticket, index) => {
    const catalogItem = catalogItemForTicket(ticket, index)
    const checklist =
      defaultChecklistByTeam[catalogItem.team] ??
      ["Verify request", "Add field note", "Upload media proof", "Request closure approval"]

    return {
      id: `TASK-${ticket.id.replace(/^SRV-/, "")}`,
      ticketId: ticket.id,
      flatNumber: ticket.flatNumber,
      title: ticket.title,
      team: catalogItem.team,
      assignee: ticket.assignee,
      status: ticket.status,
      priority: ticket.priority,
      slaHoursRemaining: ticket.slaHoursRemaining,
      routeSlot:
        ticket.slaHoursRemaining < 0
          ? "Immediate"
          : index % 3 === 0
            ? "Morning"
            : index % 3 === 1
              ? "Midday"
              : "Evening",
      checklist,
      requiresMedia: ticket.status !== "closed",
      mediaCount: ticket.mediaCount,
      managerApprovalRequired: ticket.debtBlocked || ticket.estimatedCostTry >= 7000,
      lastUpdateAt: ticket.openedAt,
      fieldNote: ticket.debtBlocked
        ? "Finance approval is pending; field work is locked."
        : ticket.slaHoursRemaining < 0
          ? "SLA breach; team lead escalation is required."
          : "Assignment and evidence flow are ready.",
      completionReadiness: taskCompletionReadiness(ticket),
    }
  })
}

function mapCatalogCategory(value: string): ServiceCatalogItem["category"] {
  if (value === "cleaning") return "cleaning"
  if (value === "transfer") return "transfer"
  if (value === "amenity") return "amenity"
  if (value === "security") return "security"
  if (value === "inspection") return "inspection"
  if (value === "concierge") return "concierge"
  return "maintenance"
}

function mapDebtPolicy(value: string): ServiceCatalogItem["debtPolicy"] {
  if (value === "allow") return "allow"
  if (value === "block_until_clear") return "block_until_clear"
  return "manager_review"
}

function mapProviderType(value: string): ServiceCatalogItem["providerType"] {
  if (value === "vendor") return "vendor"
  if (value === "mixed") return "mixed"
  return "internal"
}

function mapServiceLevel(value: string): ServiceCatalogItem["serviceLevel"] {
  if (value === "premium") return "premium"
  if (value === "emergency") return "emergency"
  return "standard"
}

function mapOrderStatus(value: string): ServiceOrderRecord["status"] {
  if (value === "draft") return "draft"
  if (value === "payment_pending") return "payment_pending"
  if (value === "task_created") return "task_created"
  if (value === "assigned") return "assigned"
  if (value === "completed") return "completed"
  if (value === "blocked") return "blocked"
  if (value === "cancelled") return "cancelled"
  return "debt_check"
}

function mapDebtCheckStatus(value: string): ServiceOrderRecord["debtCheckStatus"] {
  if (value === "minor_debt_review") return "minor_debt_review"
  if (value === "blocked") return "blocked"
  return "clear"
}

function mapPaymentDecision(value: string): ServiceOrderRecord["paymentDecision"] {
  if (value === "no_charge") return "no_charge"
  if (value === "debit_to_account") return "debit_to_account"
  if (value === "paid_or_debit_approved") return "paid_or_debit_approved"
  if (value === "hold") return "hold"
  return "collect_before_dispatch"
}

function normalizeServiceCatalogRows(rows: unknown): ServiceCatalogItem[] {
  if (!Array.isArray(rows)) return []

  return rows.map((row, index) => {
    const record = asRecord(row)
    return {
      id: asString(record.id, `catalog-${index + 1}`),
      code: asString(record.code, `CAT-${index + 1}`),
      name: asString(record.name, "Service item"),
      category: mapCatalogCategory(asString(record.category, "maintenance")),
      description: asString(record.description),
      basePriceTry: Math.round(asNumber(record.base_price_cents) / 100),
      currency: "TRY",
      slaHours: asNumber(record.sla_hours, 24),
      debtPolicy: mapDebtPolicy(asString(record.debt_policy, "manager_review")),
      requiresPayment: asBoolean(record.requires_payment, true),
      requiresDeposit: asBoolean(record.requires_deposit),
      team: asString(record.team, "Operations"),
      providerType: mapProviderType(asString(record.provider_type, "internal")),
      active: asBoolean(record.active, true),
      serviceLevel: mapServiceLevel(asString(record.service_level, "standard")),
      popularityScore: asNumber(record.popularity_score),
    }
  })
}

function normalizeServiceOrderRows(rows: unknown): ServiceOrderRecord[] {
  if (!Array.isArray(rows)) return []

  return rows.map((row, index) => {
    const record = asRecord(row)
    const catalog = relatedRecord(record.service_catalog)
    const ticket = relatedRecord(record.service_tickets)
    const unit = relatedRecord(record.units)
    const resident = relatedRecord(record.residents)
    const status = mapOrderStatus(asString(record.status, "debt_check"))
    const debtCheckStatus = mapDebtCheckStatus(asString(record.debt_check_status, "clear"))
    const paymentDecision = mapPaymentDecision(asString(record.payment_decision, "collect_before_dispatch"))

    return {
      id: asString(record.id, `order-${index + 1}`),
      orderNo: asString(record.order_no, `ORD-${index + 1}`),
      catalogItemId: asString(catalog.id, asString(record.service_catalog_id)),
      catalogItemName: asString(catalog.name, "Service order"),
      ticketId: asString(ticket.ticket_no, asString(record.ticket_id)),
      flatNumber: asString(unit.unit_no, "Unassigned"),
      requester: asString(resident.full_name, "Site management"),
      status,
      debtCheckStatus,
      paymentDecision,
      quotedPriceTry: Math.round(asNumber(record.quoted_price_cents) / 100),
      currency: "TRY",
      slaHours: asNumber(catalog.sla_hours, 24),
      assignedTeam: asString(catalog.team, "Operations"),
      taskCreated: status === "task_created" || status === "assigned" || status === "completed",
      requestedForAt: asString(record.requested_for_at, asString(record.created_at, new Date().toISOString())),
      createdAt: asString(record.created_at, new Date().toISOString()),
      nextAction: asString(record.next_action, serviceOrderNextAction(
        {
          id: asString(ticket.ticket_no, `ticket-${index + 1}`),
          flatId: asString(record.unit_id),
          flatNumber: asString(unit.unit_no, "Unassigned"),
          title: asString(catalog.name, "Service order"),
          category: asString(catalog.category, "maintenance"),
          priority: "medium",
          status: "open",
          assignee: "Operations queue",
          requester: asString(resident.full_name, "Site management"),
          openedAt: asString(record.created_at, new Date().toISOString()),
          dueAt: asString(record.requested_for_at),
          slaHoursRemaining: 0,
          debtBlocked: debtCheckStatus === "blocked",
          paymentVerified: paymentDecision === "paid_or_debit_approved" || paymentDecision === "no_charge",
          mediaCount: 0,
          estimatedCostTry: Math.round(asNumber(record.quoted_price_cents) / 100),
        },
        paymentDecision
      )),
    }
  })
}

function normalizeWorkforceTaskRows(rows: unknown): WorkforceTaskRecord[] {
  if (!Array.isArray(rows)) return []

  return rows.map((row, index) => {
    const record = asRecord(row)
    const ticket = relatedRecord(record.service_tickets)
    const unit = relatedRecord(record.units)
    const staff = relatedRecord(record.staff_members)
    const rawChecklist = Array.isArray(record.checklist) ? record.checklist : []
    const status = mapTicketStatus(asString(record.status, "open"))
    const dueAt = asNullableString(record.sla_due_at)

    return {
      id: asString(record.task_no, asString(record.id, `task-${index + 1}`)),
      ticketId: asString(ticket.ticket_no, asString(record.ticket_id)),
      flatNumber: asString(unit.unit_no, "Unassigned"),
      title: asString(record.title, "Workforce task"),
      team: asString(record.team, "Operations"),
      assignee: asString(staff.name, "Operations queue"),
      status,
      priority: mapTicketPriority(asString(record.priority, "medium")),
      slaHoursRemaining: slaHoursRemaining(dueAt),
      routeSlot: asString(record.route_slot, "Unscheduled"),
      checklist: rawChecklist.map((item) => asString(item)).filter(Boolean),
      requiresMedia: asBoolean(record.requires_media, true),
      mediaCount: asNumber(record.media_count),
      managerApprovalRequired: asBoolean(record.manager_approval_required),
      lastUpdateAt: asString(record.updated_at, asString(record.created_at, new Date().toISOString())),
      fieldNote: asString(record.field_note),
      completionReadiness: asNumber(record.completion_readiness),
    }
  })
}

function ticketStrategy(): ServiceTicketQueueData["strategy"] {
  return {
    systemOfRecord: "1Cati keeps the operational service catalogue, service orders, SLA tasks and ticket events inside Supabase.",
    crmRole: "Twenty CRM remains the relationship/contact system; 1Cati remains the resident-service and field-operations system.",
    escalationPolicy: "Debt-blocked orders, overdue SLA tasks, access/security work and high-cost repairs create manager approval actions before closure.",
    externalHelpdeskDecision: "Use the internal ticketing system first; add Zendesk/Freshdesk/Jira Service Management later only if public omnichannel support becomes a client requirement.",
  }
}

function summarizeServiceTickets(
  tickets: ServiceTicket[],
  catalog: ServiceCatalogItem[],
  orders: ServiceOrderRecord[],
  tasks: WorkforceTaskRecord[]
): ServiceTicketQueueData["summary"] {
  const openTickets = tickets.filter((ticket) => ticket.status !== "closed" && ticket.status !== "resolved")
  const totalSla = tickets.reduce((sum, ticket) => sum + ticket.slaHoursRemaining, 0)
  const fieldTeams = new Set(tasks.map((task) => task.team).filter(Boolean))
  const totalReadiness = tasks.reduce((sum, task) => sum + task.completionReadiness, 0)

  return {
    totalTickets: tickets.length,
    openTickets: openTickets.length,
    overdueTickets: tickets.filter((ticket) => ticket.slaHoursRemaining < 0).length,
    urgentTickets: tickets.filter((ticket) => ticket.priority === "urgent").length,
    financeBlockedTickets: tickets.filter((ticket) => ticket.debtBlocked).length,
    approvalRequiredTickets: tickets.filter((ticket) => ticket.debtBlocked || !ticket.paymentVerified).length,
    mediaEvidenceCount: tickets.reduce((sum, ticket) => sum + ticket.mediaCount, 0),
    estimatedCostCents: tickets.reduce((sum, ticket) => sum + ticket.estimatedCostTry * 100, 0),
    averageSlaHoursRemaining: tickets.length > 0 ? Math.round(totalSla / tickets.length) : 0,
    catalogItems: catalog.length,
    activeCatalogItems: catalog.filter((item) => item.active).length,
    serviceOrders: orders.length,
    readyForDispatchOrders: orders.filter(
      (order) =>
        order.status === "assigned" ||
        order.status === "task_created" ||
        order.paymentDecision === "paid_or_debit_approved" ||
        order.paymentDecision === "no_charge"
    ).length,
    blockedOrders: orders.filter(
      (order) => order.status === "blocked" || order.debtCheckStatus === "blocked"
    ).length,
    openWorkforceTasks: tasks.filter(
      (task) => task.status !== "closed" && task.status !== "resolved"
    ).length,
    slaBreachTasks: tasks.filter((task) => task.slaHoursRemaining < 0).length,
    managerApprovalTasks: tasks.filter((task) => task.managerApprovalRequired).length,
    fieldTeams: fieldTeams.size,
    averageCompletionReadiness:
      tasks.length > 0 ? Math.round(totalReadiness / tasks.length) : 0,
  }
}

function buildServiceTicketingQuality(
  tickets: ServiceTicket[],
  catalog: ServiceCatalogItem[],
  orders: ServiceOrderRecord[],
  tasks: WorkforceTaskRecord[],
  summary: ServiceTicketQueueData["summary"]
): OperationalQualityReport {
  const openWithoutSla = tickets.filter(
    (ticket) => ticket.status !== "closed" && ticket.status !== "resolved" && !ticket.dueAt
  )
  const closedWithoutEvidence = tickets.filter(
    (ticket) => (ticket.status === "closed" || ticket.status === "resolved") && ticket.mediaCount === 0
  )
  const autonomousFinanceWork = tickets.filter(
    (ticket) => ticket.debtBlocked && ticket.paymentVerified
  )
  const activeCatalogueWithoutSla = catalog.filter(
    (item) => item.active && (!item.slaHours || item.slaHours <= 0)
  )
  const orderWithoutTicket = orders.filter((order) => !order.ticketId)
  const blockedButDispatchable = orders.filter(
    (order) => order.debtCheckStatus === "blocked" && order.taskCreated
  )
  const taskWithoutChecklist = tasks.filter((task) => task.checklist.length === 0)

  return qualityReport([
    {
      id: "service.catalog-present",
      label: "Service catalogue has active services",
      status: summary.activeCatalogItems >= 6 ? "passed" : "warning",
      detail: `${summary.activeCatalogItems} active service catalogue items returned.`,
    },
    {
      id: "service.catalog-sla-pricing",
      label: "Catalogue exposes price and SLA rules",
      status: activeCatalogueWithoutSla.length === 0 ? "passed" : "failed",
      detail: `${activeCatalogueWithoutSla.length} active catalogue items miss SLA hours.`,
    },
    {
      id: "service.order-ticket-link",
      label: "Service orders link to ticket workflow",
      status: orderWithoutTicket.length === 0 && orders.length > 0 ? "passed" : "warning",
      detail: `${orders.length} service orders returned; ${orderWithoutTicket.length} are missing ticket links.`,
    },
    {
      id: "service.debt-gate",
      label: "Debt-blocked orders are not dispatched",
      status: blockedButDispatchable.length === 0 ? "passed" : "failed",
      detail: `${blockedButDispatchable.length} blocked orders appear dispatchable.`,
    },
    {
      id: "ticketing.queue-present",
      label: "Internal ticket queue is available",
      status: tickets.length > 0 ? "passed" : "warning",
      detail: `${tickets.length} tickets returned.`,
    },
    {
      id: "ticketing.sla-visible",
      label: "Open tickets have SLA visibility",
      status: openWithoutSla.length === 0 ? "passed" : "warning",
      detail: `${openWithoutSla.length} open tickets do not expose SLA due dates.`,
    },
    {
      id: "ticketing.finance-gate",
      label: "Finance-blocked tickets require approval",
      status: autonomousFinanceWork.length === 0 ? "passed" : "failed",
      detail: `${autonomousFinanceWork.length} finance-blocked tickets look auto-approved.`,
    },
    {
      id: "ticketing.evidence-policy",
      label: "Closed work should keep evidence",
      status: closedWithoutEvidence.length === 0 ? "passed" : "warning",
      detail: `${closedWithoutEvidence.length} closed/resolved tickets have no media evidence count.`,
    },
    {
      id: "ticketing.priority-covered",
      label: "Priority and overdue queues are visible",
      status: summary.urgentTickets > 0 || summary.overdueTickets > 0 ? "passed" : "warning",
      detail: `${summary.urgentTickets} urgent and ${summary.overdueTickets} overdue tickets.`,
    },
    {
      id: "workforce.tasks-present",
      label: "Workforce task board is available",
      status: tasks.length > 0 ? "passed" : "warning",
      detail: `${tasks.length} workforce tasks returned across ${summary.fieldTeams} teams.`,
    },
    {
      id: "workforce.checklist-media",
      label: "Tasks carry checklist and media policy",
      status: taskWithoutChecklist.length === 0 ? "passed" : "failed",
      detail: `${taskWithoutChecklist.length} tasks have no checklist.`,
    },
  ])
}

function localSeedServiceTicketQueueData(limit = 24, warning?: string): ServiceTicketQueueData {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const tickets = serviceTickets.slice(0, safeLimit)
  const catalog = serviceCatalogItems
  const orders = serviceOrders.slice(0, safeLimit)
  const tasks = workforceTasks.slice(0, safeLimit)
  const summary = summarizeServiceTickets(tickets, catalog, orders, tasks)

  return {
    contractVersion: SERVICE_TICKETING_CONTRACT_VERSION,
    source: "local-seed",
    generatedAt: new Date().toISOString(),
    quality: buildServiceTicketingQuality(tickets, catalog, orders, tasks, summary),
    summary,
    tickets,
    catalog,
    orders,
    workforceTasks: tasks,
    strategy: ticketStrategy(),
    recentActions: siteActivities.slice(0, 4),
    warning,
  }
}

function normalizeServiceTicketRows(rows: unknown, limit: number): ServiceTicket[] {
  if (!Array.isArray(rows)) return []
  return rows.slice(0, limit).map((row, index) => {
    const record = asRecord(row)
    const unit = relatedRecord(record.units)
    const resident = relatedRecord(record.residents)
    const events = Array.isArray(record.service_ticket_events)
      ? record.service_ticket_events
      : []
    const rawStatus = asString(record.status, "open")
    const requiresFinanceApproval = asBoolean(record.requires_finance_approval)
    const ticketNo = asString(record.ticket_no, `TICKET-${index + 1}`)
    const dueAt = asNullableString(record.sla_due_at)

    return {
      id: ticketNo,
      flatId: asString(unit.id, asString(record.unit_id, `unit-${index + 1}`)),
      flatNumber: asString(unit.unit_no, "Unassigned"),
      title: asString(record.title, "Service ticket"),
      category: asString(record.category, "general"),
      priority: mapTicketPriority(asString(record.priority, "normal")),
      status: mapTicketStatus(rawStatus),
      assignee: asNullableString(record.assigned_to) ?? "Operations queue",
      requester: asNullableString(resident.full_name) ?? "Site management",
      openedAt: asString(record.created_at, new Date().toISOString()),
      dueAt: dueAt ?? "",
      slaHoursRemaining: slaHoursRemaining(dueAt),
      debtBlocked: requiresFinanceApproval || rawStatus === "waiting_approval",
      paymentVerified: !requiresFinanceApproval && rawStatus !== "waiting_approval",
      mediaCount: events.length,
      estimatedCostTry: Math.round(asNumber(record.estimated_cost_cents) / 100),
    }
  })
}

function normalizePaymentTransactionRows(rows: unknown, limit: number): Phase7ReconciliationItem[] {
  if (!Array.isArray(rows)) return []
  return rows.slice(0, limit).map((row, index) => {
    const record = asRecord(row)
    const ledger = relatedRecord(record.finance_ledger_entries)
    const unit = relatedRecord(ledger.units)
    const resident = relatedRecord(ledger.residents)
    const status = asString(record.status, "pending")

    return {
      id: asString(record.id, `payment-${index + 1}`),
      provider: asString(record.provider, "unknown"),
      providerReference: asNullableString(record.provider_reference),
      status,
      amountCents: asNumber(record.amount_cents),
      currency: asString(record.currency, "TRY"),
      paidAt: asNullableString(record.paid_at),
      ledgerEntryId: asNullableString(record.ledger_entry_id),
      unitNo: asNullableString(unit.unit_no),
      residentName: asNullableString(resident.full_name),
      needsReview: status === "pending" || status === "failed" || status === "cancelled",
    }
  })
}

function normalizeDepositLedgerRows(rows: unknown): Map<string, { amountCents: number; currency: string }> {
  const deposits = new Map<string, { amountCents: number; currency: string }>()
  if (!Array.isArray(rows)) return deposits

  rows.forEach((row) => {
    const record = asRecord(row)
    const unit = relatedRecord(record.units)
    const unitNo = asString(unit.unit_no)
    if (!unitNo || deposits.has(unitNo)) return

    deposits.set(unitNo, {
      amountCents: asNumber(record.amount_cents),
      currency: asString(record.currency, "TRY"),
    })
  })

  return deposits
}

function normalizeReservationRows(
  rows: unknown,
  limit: number,
  depositLedgerByUnit = new Map<string, { amountCents: number; currency: string }>()
): Phase7DepositDecision[] {
  if (!Array.isArray(rows)) return []
  return rows
    .slice(0, limit)
    .map((row, index) => {
      const record = asRecord(row)
      const unit = relatedRecord(record.units)
      const unitNo = asNullableString(unit.unit_no)
      const depositLedger = unitNo ? depositLedgerByUnit.get(unitNo) : null
      const depositStatus = asString(record.deposit_status, "not_required")
      const accessCodeStatus = asString(record.access_code_status, "pending")
      const cleaningStatus = asString(record.cleaning_status, "pending")

      return {
        id: `deposit-${asString(record.id, `reservation-${index + 1}`)}`,
        reservationId: asString(record.id),
        unitNo,
        guestName: asNullableString(record.guest_name),
        checkInAt: asNullableString(record.check_in_at),
        checkOutAt: asNullableString(record.check_out_at),
        depositStatus,
        accessCodeStatus,
        cleaningStatus,
        depositCents:
          depositLedger?.amountCents ??
          (depositStatus === "not_required" ? 0 : 500_000),
        currency: depositLedger?.currency ?? "TRY",
        nextAction:
          depositStatus === "held"
            ? "Checkout tamamlanana kadar depozitoyu bloke tut"
            : "Depozito ve erisim kararini finans onayina bagla",
      }
    })
    .filter((item) => item.depositStatus !== "not_required" || item.accessCodeStatus !== "issued")
}

function buildSupabaseRestrictionQueue(units: Array<Record<string, unknown>>, limit: number): Phase7RestrictionDecision[] {
  return units
    .filter((unit) => {
      const balanceCents = asNumber(unit.balanceCents ?? unit.balance_cents)
      const accessStatus = asString(unit.accessStatus ?? unit.access_status)
      const paymentStatus = asString(unit.paymentStatus ?? unit.payment_status)
      return balanceCents > 0 || accessStatus === "restricted" || paymentStatus === "overdue"
    })
    .slice(0, limit)
    .map((unit) => {
      const balanceCents = asNumber(unit.balanceCents ?? unit.balance_cents)
      const paymentStatus = asString(unit.paymentStatus ?? unit.payment_status, "minor_debt")
      const accessStatus = asString(unit.accessStatus ?? unit.access_status, "active")

      return {
        id: `restriction-${asString(unit.id, asString(unit.unitNo ?? unit.unit_no, "unit"))}`,
        unitId: asNullableString(unit.id),
        unitNo: asNullableString(unit.unitNo ?? unit.unit_no),
        residentName: asNullableString(unit.residentName ?? unit.resident_name ?? unit.ownerName ?? unit.owner_name),
        balanceCents,
        currency: "TRY",
        agingBucket: paymentStatus === "overdue" ? "61-90" : "31-60",
        paymentStatus,
        accessStatus,
        riskLevel:
          accessStatus === "restricted" || paymentStatus === "overdue"
            ? "critical"
            : balanceCents >= 500_000
              ? "high"
              : "medium",
        suggestedAction:
          accessStatus === "restricted"
            ? "Erisim kisitini hukuk ve finans onayiyla surdur"
            : "Tahsilat hatirlatmasi ve onayli kisit kontrolu ac",
        requiresHumanApproval: true,
      }
    })
}

function localSeedSearch(query: string, limit: number): OperationalSearchResult[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []

  const records: OperationalSearchResult[] = [
    ...flats.map((flat) => ({
      entityTable: "units",
      entityId: null,
      entityExternalId: flat.id,
      title: `${flat.number} unit`,
      summary: `${flat.ownerName} ${flat.residentName} ${flat.status} ${flat.paymentStatus}`,
      rank: 1,
      metadata: { unitNo: flat.number },
    })),
    ...serviceTickets.map((ticket) => ({
      entityTable: "service_tickets",
      entityId: null,
      entityExternalId: ticket.id,
      title: `${ticket.id} ${ticket.title}`,
      summary: `${ticket.flatNumber} ${ticket.category} ${ticket.priority} ${ticket.status}`,
      rank: 1,
      metadata: { ticketNo: ticket.id },
    })),
    ...residents.map((resident) => ({
      entityTable: "residents",
      entityId: null,
      entityExternalId: resident.id,
      title: resident.name,
      summary: `${resident.flatNumber} ${resident.phone} ${resident.email} ${resident.language}`,
      rank: 1,
      metadata: { flatNumber: resident.flatNumber },
    })),
    ...documentVault.map((document) => ({
      entityTable: "documents",
      entityId: null,
      entityExternalId: document.id,
      title: document.name,
      summary: `${document.flatNumber} ${document.ownerName} ${document.category} ${document.status}`,
      rank: 1,
      metadata: { documentId: document.id },
    })),
  ]

  return records
    .filter((record) =>
      `${record.title} ${record.summary ?? ""} ${record.entityExternalId ?? ""}`
        .toLowerCase()
        .includes(normalized)
    )
    .slice(0, Math.min(Math.max(limit, 1), 50))
}

function localSeedPhase4SiteData(
  query = "",
  limit = 769,
  warning?: string
): Phase4SiteData {
  const summary = getSummary()
  const importSummary = getImportSummary()
  const normalized = query.trim().toLowerCase()
  const filteredFlats = flats
    .filter((flat) => {
      if (!normalized) return true
      return `${flat.number} ${flat.displayNumber} ${flat.block} ${flat.ownerName} ${flat.residentName} ${flat.paymentStatus} ${flat.status} ${flat.saleStatus} ${flat.priceSource ?? ""} ${flat.areaText ?? ""}`
        .toLowerCase()
        .includes(normalized)
    })
    .slice(0, Math.min(Math.max(limit, 1), 1000))

  return {
    source: "local-seed",
    generatedAt: new Date().toISOString(),
    site: {
      id: "seed-site",
      name: "New Level Premium Avsallar",
      code: "NLP-AVS",
      city: "Alanya",
      district: "Avsallar",
      totalUnits: summary.totalFlats,
    },
    summary: {
      totalUnits: summary.totalFlats,
      occupiedUnits: summary.occupiedFlats,
      reservedUnits: flats.filter((flat) => flat.status === "reserved").length,
      vacantUnits: summary.vacantFlats,
      blockedUnits: summary.blockedFlats,
      blockCount: getBlockOverview().length,
      floorCount: new Set(flats.map((flat) => `${flat.block}-${flat.floor}`)).size,
    },
    blocks: getBlockOverview().map((block, index) => ({
      name: block.block,
      sortOrder: index + 1,
      totalUnits: block.total,
      occupiedUnits: block.occupied,
      reservedUnits: flats.filter(
        (flat) => flat.block === block.block && flat.status === "reserved"
      ).length,
      vacantUnits: block.vacant,
      blockedUnits: block.blocked,
      availableForSale: block.availableForSale,
      soldUnits: block.sold,
      sourceMissingUnits: block.sourceMissing,
      minBuyNowEurCents:
        block.minBuyNowEur === null ? null : Math.round(block.minBuyNowEur * 100),
      maxBuyNowEurCents:
        block.maxBuyNowEur === null ? null : Math.round(block.maxBuyNowEur * 100),
      priceSourceStatus: block.priceSourceStatus,
      numberingSource: block.numberingSource,
    })),
    units: filteredFlats.map((flat) => ({
      id: flat.id,
      unitNo: flat.number,
      unitType: flat.type,
      occupancyStatus: flat.status,
      ownershipStatus: flat.residentType,
      sizeSqm: null,
      bedrooms: null,
      blockName: flat.block,
      floorLabel: flat.floorLabel,
      floorLevel: flat.floor,
      saleStatus: flat.saleStatus,
      listPriceEurCents:
        flat.buyNowEur === null ? null : Math.round(flat.buyNowEur * 100),
      nextPriceEurCents: flat.nextPriceEur.map((price) => Math.round(price * 100)),
      priceSource: flat.priceSource,
      numberingSource: flat.numberingSource,
      sourceNotes: flat.sourceNotes,
      sourceMetadata: {
        displayNumber: flat.displayNumber,
        areaText: flat.areaText,
        interiorM2: flat.interiorM2,
        outdoorM2: flat.outdoorM2,
        typeLabel: flat.type,
      },
      ownerName: flat.ownerName,
      residentName: flat.residentName,
      balanceCents: flat.balanceTry * 100,
      openFinanceEntries: flat.balanceTry > 0 ? 1 : 0,
      openTicketCount: flat.serviceOpen,
      accessStatus: flat.accessStatus,
      paymentStatus: flat.paymentStatus,
    })),
    importSummary: {
      ...importSummary,
      readyBatches: importSummary.batchesReady,
    },
    importBatches: importBatches.map((batch) => ({
      id: batch.id,
      sourceName: batch.source,
      entityType: "client_file",
      totalRows: batch.totalRows,
      validRows: batch.validRows,
      warningRows: batch.warningRows,
      rejectedRows: batch.rejectedRows,
      status: batch.status,
      checkedAt: batch.checkedAt,
      appliedAt: null,
    })),
    importFindings: importFindings.map((finding) => ({
      id: finding.id,
      importBatchId: null,
      severity: finding.severity,
      area: finding.area,
      affectedRows: finding.affectedRows,
      message: finding.message,
      recommendedAction: finding.recommendedAction,
      createdAt: new Date().toISOString(),
    })),
    recentActions: [],
    warning,
  }
}

function localSeedFinanceLedgerData(limit = 16, warning?: string): FinanceLedgerData {
  const summary = getSummary()
  const accounts = getDebtAccounts()
  const latestCashFlow = cashFlow.at(-1)
  const entries = accounts.slice(0, Math.min(Math.max(limit, 1), 100)).map((account) => ({
    id: `seed-ledger-${account.flatId}`,
    entryType: "dues",
    period: "2026-06",
    dueDate: account.lastPaymentAt,
    paidAt: null,
    postedAt: account.lastPaymentAt,
    status: account.paymentStatus === "minor_debt" ? "open" : "overdue",
    amountCents: account.balanceTry * 100,
    currency: "TRY",
    description: account.suggestedAction,
    unitNo: account.flatNumber,
    residentName: account.ownerName,
    idempotencyKey: `seed-ledger-${account.flatId}-2026-06`,
    reversalOf: null,
  }))
  const overdueAccounts = accounts.filter(
    (account) => account.paymentStatus === "overdue" || account.paymentStatus === "legal"
  )
  const ledgerSummary: FinanceLedgerData["summary"] = {
    currency: "TRY",
    openLedgerCents: summary.totalDebtTry * 100,
    overdueLedgerCents: overdueAccounts.reduce((sum, account) => sum + account.balanceTry * 100, 0),
    paidThisMonthCents: (latestCashFlow?.collectedTry ?? 0) * 100,
    openEntries: accounts.length,
    overdueEntries: overdueAccounts.length,
    postedEntries: accounts.length,
    restrictedUnits: summary.restrictedAccess,
    legalAccounts: accounts.filter((account) => account.paymentStatus === "legal").length,
    agingBuckets: getDebtAging().map((bucket) => ({
      label: bucket.label,
      cents: bucket.value * 100,
    })),
  }

  return {
    contractVersion: FINANCE_LEDGER_CONTRACT_VERSION,
    source: "local-seed",
    generatedAt: new Date().toISOString(),
    quality: buildFinanceLedgerQuality(entries, ledgerSummary),
    summary: ledgerSummary,
    entries,
    recentActions: [],
    warning,
  }
}

function localSeedPeopleDirectoryData(limit = 80, warning?: string): PeopleDirectoryData {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 250)
  const residentSummary = getResidentSummary()
  const staffSummary = getStaffSummary()
  const localSeedStaff = staffMembers.map((member) => ({
    id: member.id,
    profileId: null,
    name: member.name,
    role: member.role,
    team: member.team,
    phone: member.phone,
    language: member.language,
    activeTasks: member.activeTasks,
    approvalLimitCents: member.approvalLimitTry * 100,
    accessScope: member.accessScope,
    status: member.status,
  }))
  const localSeedResidents = residents.slice(0, safeLimit).map((resident) => ({
    id: resident.id,
    unitNo: resident.flatNumber,
    relationship: resident.relation,
    isPrimary: true,
    fullName: resident.name,
    phone: resident.phone,
    email: resident.email,
    preferredLanguage: resident.language,
    preferredChannel: resident.communicationPreference,
    identityStatus: resident.riskScore >= 70 ? "pending" : "verified",
    riskScore: resident.riskScore,
    status: resident.accessStatus === "restricted" ? "blocked" : "active",
    startDate: resident.lastContactAt,
    endDate: null,
  }))
  const localSeedRoles = roleCoverage.map((role) => ({
    id: `role-${role.role.toLowerCase().replace(/\s+/g, "-")}`,
    roleLabel: role.role,
    usersCount: role.users,
    canApproveFinance: role.canApproveFinance,
    canRestrictAccess: role.canRestrictAccess,
    canManageUsers: role.canManageUsers,
    canExportData: role.canExportData,
  }))

  return {
    contractVersion: PEOPLE_DIRECTORY_CONTRACT_VERSION,
    source: "local-seed",
    generatedAt: new Date().toISOString(),
    quality: buildPeopleDirectoryQuality(localSeedStaff, localSeedResidents, localSeedRoles),
    summary: {
      staffTotal: staffSummary.total,
      activeStaff: staffSummary.active,
      residentTotal: residentSummary.total,
      owners: residentSummary.owners,
      tenants: residentSummary.tenants,
      guests: residentSummary.guests,
      highRiskResidents: residentSummary.highRisk,
      financeApprovers: staffSummary.financeApprovers,
      roleCount: localSeedRoles.length,
    },
    staffMembers: localSeedStaff,
    residents: localSeedResidents,
    roleCoverage: localSeedRoles,
    recentActions: [],
    warning,
  }
}

function isUuid(value: string | null | undefined) {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  )
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!isSupabaseConfigured()) {
    return localSeedSnapshot("External data service is not configured; using local seed data.")
  }

  try {
    const supabase = await createDataClient()
    const { data, error } = await supabase.rpc("get_site_dashboard_snapshot")
    if (error) throw error
    return normalizeSnapshot(data)
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return localSeedSnapshot(
        "Live data refresh failed; local seed data is available for this environment."
      )
    }
    throw error
  }
}

export async function searchOperationalRecords(
  query: string,
  limit = 20
): Promise<{ source: DataSource; results: OperationalSearchResult[] }> {
  if (!isSupabaseConfigured()) {
    return { source: "local-seed", results: localSeedSearch(query, limit) }
  }

  try {
    const supabase = await createDataClient()
    const { data, error } = await supabase.rpc("search_operational_records", {
      p_query: query,
      p_limit: limit,
    })
    if (error) throw error
    const results = normalizeSearchRows(data)
    if (results.length === 0 && canUseLocalSeedFallback()) {
      const fallbackResults = localSeedSearch(query, limit)
      if (fallbackResults.length > 0) {
        return { source: "local-seed", results: fallbackResults }
      }
    }
    return { source: "supabase", results }
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return { source: "local-seed", results: localSeedSearch(query, limit) }
    }
    throw error
  }
}

export async function getPhase4SiteData({
  query = "",
  limit = 769,
}: {
  query?: string
  limit?: number
} = {}): Promise<Phase4SiteData> {
  if (!isSupabaseConfigured()) {
    return localSeedPhase4SiteData(
      query,
      limit,
      "External data service is not configured; using local operations seed data."
    )
  }

  try {
    const supabase = await createDataClient()
    const { data, error } = await supabase.rpc("get_phase4_site_data", {
      p_query: query,
      p_limit: limit,
    })
    if (error) throw error
    return normalizePhase4(data)
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return localSeedPhase4SiteData(
        query,
        limit,
        "Live operations query failed; local seed data is available for this environment."
      )
    }
    throw error
  }
}

export async function getFinanceLedgerData({
  limit = 16,
}: {
  limit?: number
} = {}): Promise<FinanceLedgerData> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)

  if (!isSupabaseConfigured()) {
    return localSeedFinanceLedgerData(
      safeLimit,
      "External data service is not configured; using local finance seed data."
    )
  }

  try {
    const supabase = await createDataClient()
    const [entryResponse, summaryResponse, actionResponse] = await Promise.all([
      supabase
        .from("finance_ledger_entries")
        .select(`
          id,
          entry_type,
          period,
          due_date,
          paid_at,
          posted_at,
          status,
          amount_cents,
          currency,
          description,
          idempotency_key,
          reversal_of,
          units(unit_no),
          residents(full_name)
        `)
        .order("due_date", { ascending: false, nullsFirst: false })
        .limit(safeLimit),
      supabase
        .from("finance_ledger_entries")
        .select(`
          id,
          entry_type,
          period,
          due_date,
          paid_at,
          posted_at,
          status,
          amount_cents,
          currency,
          description,
          idempotency_key,
          reversal_of,
          units(unit_no),
          residents(full_name)
        `)
        .limit(1000),
      supabase
        .from("client_action_requests")
        .select("id, action_type, title, status, entity_table, entity_external_id, created_at")
        .eq("entity_table", "finance_ledger_entries")
        .order("created_at", { ascending: false })
        .limit(5),
    ])

    if (entryResponse.error) throw entryResponse.error
    if (summaryResponse.error) throw summaryResponse.error

    const entries = normalizeFinanceLedgerRows(entryResponse.data)
    const summaryEntries = normalizeFinanceLedgerRows(summaryResponse.data)
    const summary = summarizeFinanceRows(summaryEntries)

    return {
      contractVersion: FINANCE_LEDGER_CONTRACT_VERSION,
      source: "supabase",
      generatedAt: new Date().toISOString(),
      quality: buildFinanceLedgerQuality(entries, summary),
      summary,
      entries,
      recentActions: actionResponse.error
        ? []
        : Array.isArray(actionResponse.data)
          ? actionResponse.data.map(asRecord)
          : [],
    }
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return localSeedFinanceLedgerData(
        safeLimit,
        "Live finance query failed; local seed data is available for this environment."
      )
    }
    throw error
  }
}

export async function getPeopleDirectoryData({
  limit = 80,
}: {
  limit?: number
} = {}): Promise<PeopleDirectoryData> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 250)

  if (!isSupabaseConfigured()) {
    return localSeedPeopleDirectoryData(
      safeLimit,
      "External data service is not configured; using local people seed data."
    )
  }

  try {
    const supabase = await createDataClient()
    const [
      staffResponse,
      residentLinkResponse,
      directResidentResponse,
      roleResponse,
      actionResponse,
    ] = await Promise.all([
      supabase
        .from("staff_members")
        .select("id, profile_id, name, role, team, phone, language, active_tasks, approval_limit_cents, access_scope, status")
        .order("active_tasks", { ascending: false })
        .limit(100),
      supabase
        .from("unit_residents")
        .select(`
          id,
          resident_id,
          relationship,
          is_primary,
          start_date,
          end_date,
          units(unit_no),
          residents(id, full_name, phone, email, preferred_language, preferred_channel, identity_status, risk_score, status)
        `)
        .order("start_date", { ascending: false, nullsFirst: false })
        .limit(safeLimit),
      supabase
        .from("residents")
        .select("id, full_name, phone, email, preferred_language, preferred_channel, identity_status, risk_score, status")
        .order("risk_score", { ascending: false })
        .limit(safeLimit),
      supabase
        .from("role_coverage")
        .select("id, role_label, users_count, can_approve_finance, can_restrict_access, can_manage_users, can_export_data")
        .order("users_count", { ascending: false }),
      supabase
        .from("client_action_requests")
        .select("id, action_type, title, status, entity_table, entity_external_id, created_at")
        .in("entity_table", ["profiles", "staff_members", "role_coverage", "residents", "unit_residents"])
        .order("created_at", { ascending: false })
        .limit(5),
    ])

    if (staffResponse.error) throw staffResponse.error
    if (residentLinkResponse.error) throw residentLinkResponse.error
    if (directResidentResponse.error) throw directResidentResponse.error
    if (roleResponse.error) throw roleResponse.error

    const staff = normalizeStaffRows(staffResponse.data)
    const linkedResidents = normalizeResidentLinkRows(residentLinkResponse.data)
    const directResidents = normalizeResidentRows(directResidentResponse.data)
    const people = linkedResidents.length > 0 ? linkedResidents : directResidents
    const roles = normalizeRoleCoverageRows(roleResponse.data)

    return {
      contractVersion: PEOPLE_DIRECTORY_CONTRACT_VERSION,
      source: "supabase",
      generatedAt: new Date().toISOString(),
      quality: buildPeopleDirectoryQuality(staff, people, roles),
      summary: summarizePeopleDirectory(staff, people, roles),
      staffMembers: staff,
      residents: people,
      roleCoverage: roles,
      recentActions: actionResponse.error
        ? []
        : Array.isArray(actionResponse.data)
          ? actionResponse.data.map(asRecord)
          : [],
    }
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return localSeedPeopleDirectoryData(
        safeLimit,
        "Live people directory query failed; local seed data is available for this environment."
      )
    }
    throw error
  }
}

export async function getPaymentRestrictionData({
  limit = 8,
}: {
  limit?: number
} = {}): Promise<PaymentRestrictionData> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)

  if (!isSupabaseConfigured()) {
    return localSeedPaymentRestrictionData(
      safeLimit,
      "External data service is not configured; using local payment-control seed data."
    )
  }

  try {
    const supabase = await createDataClient()
    const [transactionResponse, reservationResponse, depositLedgerResponse, actionResponse, phase4Data] =
      await Promise.all([
        supabase
          .from("payment_transactions")
          .select(
            "id, provider, provider_reference, status, amount_cents, currency, paid_at, ledger_entry_id, finance_ledger_entries(id, unit_id, resident_id, units(id, unit_no), residents(id, full_name))"
          )
          .order("created_at", { ascending: false })
          .limit(safeLimit),
        supabase
          .from("reservations")
          .select(
            "id, guest_name, check_in_at, check_out_at, status, access_code_status, cleaning_status, deposit_status, units(id, unit_no)"
          )
          .order("check_out_at", { ascending: true })
          .limit(safeLimit),
        supabase
          .from("finance_ledger_entries")
          .select("id, entry_type, amount_cents, currency, unit_id, units(id, unit_no)")
          .in("entry_type", ["deposit", "refund"])
          .order("created_at", { ascending: false })
          .limit(safeLimit * 3),
        supabase
          .from("client_action_requests")
          .select("id, action_type, title, status, entity_table, entity_external_id, created_at")
          .in("entity_table", ["payment_transactions", "finance_ledger_entries", "reservations", "access_events"])
          .order("created_at", { ascending: false })
          .limit(5),
        getPhase4SiteData({ limit: 1000 }),
      ])

    if (transactionResponse.error) throw transactionResponse.error
    if (reservationResponse.error) throw reservationResponse.error
    if (depositLedgerResponse.error) throw depositLedgerResponse.error

    const planQueue = buildPaymentPlanQueue(paymentPlans, safeLimit)
    const depositQueue = normalizeReservationRows(
      reservationResponse.data,
      safeLimit,
      normalizeDepositLedgerRows(depositLedgerResponse.data)
    )
    const restrictionQueue = buildSupabaseRestrictionQueue(
      phase4Data.units.map((unit) => unit as unknown as Record<string, unknown>),
      safeLimit
    )
    const reconciliationQueue = normalizePaymentTransactionRows(
      transactionResponse.data,
      safeLimit
    )
    const summary = buildPaymentRestrictionSummary(
      planQueue,
      depositQueue,
      restrictionQueue,
      reconciliationQueue
    )

    return {
      contractVersion: PAYMENT_RESTRICTION_CONTRACT_VERSION,
      source: "supabase",
      generatedAt: new Date().toISOString(),
      quality: buildPaymentRestrictionQuality(
        planQueue,
        depositQueue,
        restrictionQueue,
        reconciliationQueue,
        summary
      ),
      summary,
      paymentPlans: planQueue,
      depositDecisions: depositQueue,
      restrictionDecisions: restrictionQueue,
      reconciliation: reconciliationQueue,
      recentActions: actionResponse.error
        ? []
        : Array.isArray(actionResponse.data)
          ? actionResponse.data.map(asRecord)
          : [],
    }
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return localSeedPaymentRestrictionData(
        safeLimit,
        "Live payment-control query failed; local seed data is available for this environment."
      )
    }
    throw error
  }
}

export async function getServiceTicketQueueData({
  limit = 24,
}: {
  limit?: number
} = {}): Promise<ServiceTicketQueueData> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)

  if (!isSupabaseConfigured()) {
    return localSeedServiceTicketQueueData(
      safeLimit,
      "External data service is not configured; using local ticket seed data."
    )
  }

  try {
    const supabase = await createDataClient()
    const [
      ticketResponse,
      catalogResponse,
      orderResponse,
      taskResponse,
      actionResponse,
    ] = await Promise.all([
      supabase
        .from("service_tickets")
        .select(
          "id, ticket_no, title, description, category, priority, status, sla_due_at, estimated_cost_cents, requires_finance_approval, unit_id, resident_id, assigned_to, created_at, units(id, unit_no), residents(id, full_name), service_ticket_events(id, event_type, metadata)"
        )
        .order("sla_due_at", { ascending: true })
        .limit(safeLimit),
      supabase
        .from("service_catalog")
        .select(
          "id, code, name, category, description, base_price_cents, currency, sla_hours, debt_policy, requires_payment, requires_deposit, team, provider_type, service_level, popularity_score, active"
        )
        .order("popularity_score", { ascending: false }),
      supabase
        .from("service_orders")
        .select(
          "id, service_catalog_id, ticket_id, unit_id, resident_id, order_no, status, debt_check_status, payment_decision, quoted_price_cents, requested_for_at, next_action, created_at, service_catalog(id, name, sla_hours, team, category), service_tickets(id, ticket_no), units(id, unit_no), residents(id, full_name)"
        )
        .order("created_at", { ascending: false })
        .limit(safeLimit),
      supabase
        .from("workforce_tasks")
        .select(
          "id, task_no, title, team, status, priority, sla_due_at, route_slot, checklist, requires_media, media_count, manager_approval_required, completion_readiness, field_note, created_at, updated_at, service_tickets(id, ticket_no), units(id, unit_no), staff_members(id, name)"
        )
        .order("sla_due_at", { ascending: true, nullsFirst: false })
        .limit(safeLimit),
      supabase
        .from("client_action_requests")
        .select("id, action_type, title, status, entity_table, entity_external_id, created_at")
        .in("entity_table", ["service_tickets", "service_catalog", "service_orders", "workforce_tasks", "media_reports"])
        .order("created_at", { ascending: false })
        .limit(5),
    ])

    if (ticketResponse.error) throw ticketResponse.error

    const tickets = normalizeServiceTicketRows(ticketResponse.data, safeLimit)
    const catalog =
      catalogResponse.error || !Array.isArray(catalogResponse.data) || catalogResponse.data.length === 0
        ? serviceCatalogItems
        : normalizeServiceCatalogRows(catalogResponse.data)
    const derivedOrders = buildServiceOrdersFromTickets(tickets)
    const orders =
      orderResponse.error || !Array.isArray(orderResponse.data) || orderResponse.data.length === 0
        ? derivedOrders
        : normalizeServiceOrderRows(orderResponse.data)
    const derivedTasks = buildWorkforceTasksFromTickets(tickets)
    const tasks =
      taskResponse.error || !Array.isArray(taskResponse.data) || taskResponse.data.length === 0
        ? derivedTasks
        : normalizeWorkforceTaskRows(taskResponse.data)
    const summary = summarizeServiceTickets(tickets, catalog, orders, tasks)

    return {
      contractVersion: SERVICE_TICKETING_CONTRACT_VERSION,
      source: "supabase",
      generatedAt: new Date().toISOString(),
      quality: buildServiceTicketingQuality(tickets, catalog, orders, tasks, summary),
      summary,
      tickets,
      catalog,
      orders,
      workforceTasks: tasks,
      strategy: ticketStrategy(),
      recentActions: actionResponse.error
        ? []
        : Array.isArray(actionResponse.data)
          ? actionResponse.data.map(asRecord)
          : [],
    }
  } catch {
    if (canUseLocalSeedFallback()) {
      return localSeedServiceTicketQueueData(
        safeLimit,
        "Live ticket query failed; local seed data is available for this environment."
      )
    }
    throw new Error("Service ticket queue is unavailable.")
  }
}

export async function logClientAction(
  input: ClientActionInput
): Promise<ClientActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      id: `local-action-${Date.now()}`,
      source: "local-seed",
      status: "locally-logged",
    }
  }

  try {
    const supabase = await createDataClient()
    const { data, error } = await supabase.rpc("log_client_action", {
      p_action_type: input.actionType,
      p_entity_table: input.entityTable ?? null,
      p_entity_id: isUuid(input.entityId) ? input.entityId : null,
      p_entity_external_id: input.entityExternalId ?? null,
      p_title: input.title ?? null,
      p_metadata: input.metadata ?? {},
    })
    if (error) throw error
    return {
      id: typeof data === "string" ? data : `action-${Date.now()}`,
      source: "supabase",
      status: "logged",
    }
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return {
        id: `local-action-${Date.now()}`,
        source: "local-seed",
        status: "locally-logged",
      }
    }
    throw error
  }
}
