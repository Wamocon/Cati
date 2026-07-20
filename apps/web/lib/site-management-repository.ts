import {
  closeSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { createHash } from "node:crypto"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@/lib/supabase/server"
import { isAccessProfileEnabled, isSupabaseConfigured } from "@/lib/auth"
import {
  commitResourceBooking,
  createBookingHold,
  decideResourceBooking,
  getBookingLifecycleWorkspace,
  type BookingLifecycleWorkspace,
} from "@/lib/booking-lifecycle-repository"
import type { Role } from "@/lib/rbac"
import { normalizeSearchText } from "@/lib/search"
import { visibleTicketHistoryForRole } from "@/lib/ticket-history"
import {
  deriveDispatchState,
  derivePaymentState,
  persistedStatusForPrimaryState,
  primaryStateFromPersistedStatus,
  ticketSeverityForPriority,
  type TicketApprovalState,
  type TicketCommand,
  type TicketDispatchState,
  type OwnerApprovalContext,
  type TicketPaymentState,
  type TicketPrimaryState,
  type TicketSeverity,
} from "@/lib/ticket-workflow"
import {
  accessHandoffs,
  aiImageWorkflows,
  aiPremiumRecommendations,
  bookingReadinessRecords,
  bookings,
  cashFlow,
  communicationThreads,
  depositSettlements,
  documentPackets,
  documentVault,
  flats,
  getBookingOperationsSummary,
  getBlockOverview,
  getDebtAccounts,
  getDebtAging,
  getResidentSummary,
  getStaffSummary,
  getImportSummary,
  getPaymentPlanSummary,
  getSummary,
  guestLifecycleEvents,
  importBatches,
  importFindings,
  integrationProviders,
  messageTemplates,
  mobileWebCapabilities,
  notificationDeliveries,
  offlineSyncQueue,
  paymentPlans,
  roleCoverage,
  roleOnboardingPlans,
  residents,
  serviceCatalogItems,
  serviceOrders,
  serviceTickets,
  siteActivities,
  staffMembers,
  turnoverTasks,
  workforceTasks,
  type BookingRecord,
  type DebtAccount,
  type PaymentPlanRecord,
  type ServiceCatalogItem,
  type ServiceOrderRecord,
  type ServiceTicket,
  type ServiceTicketHistoryEvent,
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
  /** Explicit zero-UUID access-profile mode; never infer this from a global flag. */
  useLocalAccessProfile?: boolean
}

export interface ClientActionResult {
  id: string
  source: DataSource
  status:
    | "logged"
    | "locally-logged"
    | "approved"
    | "rejected"
    | "completed"
    | "failed"
}

export interface ClientActionRequestRecord {
  id: string
  companyId: string | null
  actionType: string
  entityTable: string | null
  entityId: string | null
  entityExternalId: string | null
  title: string | null
  status: string
  requestedBy: string | null
  metadata: Record<string, unknown>
  createdAt: string | null
}

export interface MaterializedTicketResult {
  id: string
  ticketNo: string
  source: DataSource
  serviceOrder?: {
    id: string
    orderNo: string
    catalogCode: string
    team: string
    providerQueue: string
    slaHours: number
  }
  workforceTask?: {
    id: string
    taskNo: string
    team: string
    assignee: string
    slaHours: number
  }
  notification?: {
    channel: string
    status: "queued" | "manual_review"
    recipient: string
  }
  humanApprovalBoundary?: {
    required: boolean
    approvedByRole: string
    approvedAt: string
  }
}

export interface TicketMutationActor {
  id: string
  role: string
  companyId?: string | null
  displayName?: string | null
  email?: string | null
}

export interface CreateServiceTicketInput {
  title: string
  description?: string | null
  category: string
  priority: ServiceTicket["priority"] | "normal"
  unitNo: string | null
  assignee?: string | null
  requiresOwnerApproval?: boolean
  suggestedAssignee?: string | null
  emergency?: boolean
  emergencyPolicyCode?: string | null
  routingReason?: string | null
  idempotencyKey?: string | null
  actor: TicketMutationActor
}

export interface UpdateServiceTicketInput {
  ticketId: string
  title?: string | null
  description?: string | null
  clearDescription?: boolean
  category?: string | null
  priority?: ServiceTicket["priority"] | "normal"
  status?: ServiceTicket["status"] | "triage" | "waiting_approval" | "cancelled"
  assignee?: string | null
  assigneeProfileId?: string | null
  command?: TicketCommand
  workflowState?: TicketPrimaryState
  approvalStatus?: TicketApprovalState
  dispatchStatus?: TicketDispatchState
  paymentStatus?: TicketPaymentState
  expectedVersion?: string | null
  idempotencyKey?: string | null
  reason?: string | null
  ownerApprovalContext?: OwnerApprovalContext | null
  actor: TicketMutationActor
}

export interface ServiceTicketMutationResult {
  source: DataSource
  ticket: ServiceTicket
  version: string
  replayed?: boolean
}

/**
 * Deterministic relationship scope for the local access-profile queue only.
 * Authenticated database reads remain governed by their RPC/RLS projection.
 */
export interface LocalTicketQueueScope {
  ticketIds?: readonly string[]
  unitNos?: readonly string[]
  assignee?: string
}

interface LocalTicketCreateReceipt {
  fingerprint: string
  result: ServiceTicketMutationResult
}

interface LocalTicketMutationReceipt {
  fingerprint: string
  result: ServiceTicketMutationResult
}

function serviceTicketCreateFingerprint(input: CreateServiceTicketInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        actorId: input.actor.id,
        actorRole: input.actor.role,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        priority: input.priority,
        unitNo: input.unitNo,
        emergency: Boolean(input.emergency),
        emergencyPolicyCode: input.emergencyPolicyCode ?? null,
      })
    )
    .digest("hex")
}

function serviceTicketMutationFingerprint(input: UpdateServiceTicketInput) {
  const ownerApproval = input.ownerApprovalContext
  const canonicalRequest = {
    actorId: input.actor.id,
    actorRole: input.actor.role,
    ticketId: input.ticketId,
    expectedVersion: input.expectedVersion ?? null,
    operation: input.command ?? "update_details",
    title: input.title ?? null,
    description: input.description ?? null,
    clearDescription: Boolean(input.clearDescription),
    category: input.category ?? null,
    priority: input.priority ?? null,
    assignee: input.assignee ?? null,
    assigneeProfileId: input.assigneeProfileId ?? null,
    reason: input.reason ?? null,
    ownerApprovalContext: ownerApproval
      ? {
          responsibility: ownerApproval.responsibility,
          policyCode: ownerApproval.policyCode,
          estimatedCostCents: ownerApproval.estimatedCostCents,
          approvalThresholdCents: ownerApproval.approvalThresholdCents,
        }
      : null,
  }
  return createHash("sha256")
    .update(JSON.stringify(canonicalRequest))
    .digest("hex")
}

export interface ServiceTicketWorkflowRecord {
  databaseId: string | null
  createdBy: string | null
  assignedTo: string | null
  ticket: ServiceTicket
  rawStatus: string
  workflowState: TicketPrimaryState
  approvalStatus: TicketApprovalState
  dispatchStatus: TicketDispatchState
  paymentStatus: TicketPaymentState
  severity: TicketSeverity
  emergency: boolean
  requiresFinanceApproval: boolean
  version: string
}

export type TicketRepositoryErrorCode =
  | "TICKET_WORKFLOW_UNAVAILABLE"
  | "TICKET_TRANSITION_FORBIDDEN"
  | "TICKET_INPUT_INVALID"
  | "TICKET_INVALID_TRANSITION"
  | "TICKET_VERSION_CONFLICT"
  | "TICKET_IDEMPOTENCY_CONFLICT"
  | "TICKET_NOT_FOUND"

export class TicketRepositoryError extends Error {
  constructor(
    readonly code: TicketRepositoryErrorCode,
    message: string,
    readonly httpStatus: number,
    readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "TicketRepositoryError"
  }
}

export interface BookingOperationsData {
  contractVersion: string
  source: DataSource
  providerMode: "simulation" | "supabase"
  generatedAt: string
  summary: ReturnType<typeof getBookingOperationsSummary>
  bookings: BookingRecord[]
  readinessQueue: typeof bookingReadinessRecords
  turnoverTasks: typeof turnoverTasks
  accessHandoffs: typeof accessHandoffs
  depositSettlements: typeof depositSettlements
  quality: {
    availabilityGuard: string
    settlementMath: string
    accessSafety: string
    liveProviderConnected: boolean
  }
  warning?: string
}

export interface CreateReservationInput {
  unitNo: string
  resourceName: string
  guestName: string
  checkInAt: string
  checkOutAt: string
  notes?: string | null
  actor: TicketMutationActor
}

export interface UpdateReservationApprovalInput {
  reservationId: string
  approvalStatus: "approved" | "rejected"
  actor: TicketMutationActor
}

export interface ReservationMutationResult {
  source: DataSource
  booking: BookingRecord
}

interface LocalSiteManagementState {
  clientActionRequests: Map<string, ClientActionRequestRecord>
  materializedTickets: ServiceTicket[]
  ticketOverrides: Map<string, ServiceTicket>
  materializedServiceOrders: ServiceOrderRecord[]
  materializedWorkforceTasks: WorkforceTaskRecord[]
  materializedBookings: BookingRecord[]
  actionSequence: number
}

// Next.js may evaluate route modules in separate VM globals during local QA.
// The Node process object is shared by those contexts, so it is the narrowest
// deterministic anchor for demo-only state without introducing production I/O.
const localStateProcess = process as typeof process & {
  __catiSiteManagementLocalState?: LocalSiteManagementState
}
const localSiteManagementState =
  localStateProcess.__catiSiteManagementLocalState ?? {
    clientActionRequests: new Map<string, ClientActionRequestRecord>(),
    materializedTickets: [],
    ticketOverrides: new Map<string, ServiceTicket>(),
    materializedServiceOrders: [],
    materializedWorkforceTasks: [],
    materializedBookings: [],
    actionSequence: 0,
  }
localStateProcess.__catiSiteManagementLocalState = localSiteManagementState

const localClientActionRequests = localSiteManagementState.clientActionRequests
const localMaterializedTickets = localSiteManagementState.materializedTickets
const localTicketOverrides = localSiteManagementState.ticketOverrides
const localMaterializedServiceOrders =
  localSiteManagementState.materializedServiceOrders
const localMaterializedWorkforceTasks =
  localSiteManagementState.materializedWorkforceTasks
const localMaterializedBookings = localSiteManagementState.materializedBookings

const localTicketWorkflowProcess = process as typeof process & {
  __catiTicketCreateIdempotency?: Map<string, LocalTicketCreateReceipt>
  __catiTicketMutationIdempotency?: Map<string, LocalTicketMutationReceipt>
}
const localTicketCreateIdempotency =
  localTicketWorkflowProcess.__catiTicketCreateIdempotency ??
  new Map<string, LocalTicketCreateReceipt>()
const localTicketMutationIdempotency =
  localTicketWorkflowProcess.__catiTicketMutationIdempotency ??
  new Map<string, LocalTicketMutationReceipt>()
localTicketWorkflowProcess.__catiTicketCreateIdempotency =
  localTicketCreateIdempotency
localTicketWorkflowProcess.__catiTicketMutationIdempotency =
  localTicketMutationIdempotency

interface PersistedLocalQaState {
  version: 1
  clientActionRequests: Array<[string, ClientActionRequestRecord]>
  materializedTickets: ServiceTicket[]
  ticketOverrides: Array<[string, ServiceTicket]>
  materializedServiceOrders: ServiceOrderRecord[]
  materializedWorkforceTasks: WorkforceTaskRecord[]
  materializedBookings: BookingRecord[]
  actionSequence: number
  ticketCreateIdempotency: Array<[string, LocalTicketCreateReceipt]>
  ticketMutationIdempotency: Array<[string, LocalTicketMutationReceipt]>
}

const localQaStateNamespace =
  process.env.CATI_LOCAL_STATE_NAMESPACE ??
  Buffer.from(process.cwd()).toString("base64url").slice(-64)
const localQaStatePath = join(
  tmpdir(),
  `cati-site-management-${localQaStateNamespace}.v1.json`
)
const localQaStateLockPath = `${localQaStatePath}.lock`
const localQaStateWaitBuffer = new Int32Array(new SharedArrayBuffer(4))

function localQaPersistenceEnabled() {
  return !isSupabaseConfigured() || isAccessProfileEnabled()
}

function acquireLocalQaStateLock() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const descriptor = openSync(localQaStateLockPath, "wx", 0o600)
      closeSync(descriptor)
      return
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== "EEXIST") throw error
      try {
        if (Date.now() - statSync(localQaStateLockPath).mtimeMs > 30_000) {
          unlinkSync(localQaStateLockPath)
          continue
        }
      } catch (lockError) {
        if ((lockError as NodeJS.ErrnoException).code !== "ENOENT")
          throw lockError
      }
      Atomics.wait(localQaStateWaitBuffer, 0, 0, 10)
    }
  }
  throw new Error("Local QA state is busy; retry the request.")
}

function releaseLocalQaStateLock() {
  try {
    unlinkSync(localQaStateLockPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
}

function replaceArray<T>(target: T[], source: unknown) {
  if (!Array.isArray(source)) return
  target.splice(0, target.length, ...(source as T[]))
}

function replaceMap<K, V>(target: Map<K, V>, source: unknown) {
  if (!Array.isArray(source)) return
  target.clear()
  for (const entry of source) {
    if (Array.isArray(entry) && entry.length === 2) {
      target.set(entry[0] as K, entry[1] as V)
    }
  }
}

function hydrateLocalQaState() {
  let raw: string
  try {
    raw = readFileSync(localQaStatePath, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return
    throw error
  }
  const persisted = JSON.parse(raw) as Partial<PersistedLocalQaState>
  if (persisted.version !== 1) {
    throw new Error("Local QA state has an unsupported version.")
  }
  replaceMap(localClientActionRequests, persisted.clientActionRequests)
  replaceArray(localMaterializedTickets, persisted.materializedTickets)
  replaceMap(localTicketOverrides, persisted.ticketOverrides)
  replaceArray(
    localMaterializedServiceOrders,
    persisted.materializedServiceOrders
  )
  replaceArray(
    localMaterializedWorkforceTasks,
    persisted.materializedWorkforceTasks
  )
  replaceArray(localMaterializedBookings, persisted.materializedBookings)
  replaceMap(
    localTicketCreateIdempotency,
    (persisted.ticketCreateIdempotency ?? []).filter((entry) => {
      const receipt = entry?.[1] as LocalTicketCreateReceipt | undefined
      return Boolean(
        receipt &&
        typeof receipt.fingerprint === "string" &&
        receipt.result &&
        typeof receipt.result.version === "string"
      )
    })
  )
  replaceMap(
    localTicketMutationIdempotency,
    (persisted.ticketMutationIdempotency ?? []).filter((entry) => {
      const receipt = entry?.[1] as LocalTicketMutationReceipt | undefined
      return Boolean(
        receipt &&
        typeof receipt.fingerprint === "string" &&
        receipt.result &&
        typeof receipt.result.version === "string"
      )
    })
  )
  localSiteManagementState.actionSequence = Number.isSafeInteger(
    persisted.actionSequence
  )
    ? Number(persisted.actionSequence)
    : 0
}

function persistLocalQaState() {
  const persisted: PersistedLocalQaState = {
    version: 1,
    clientActionRequests: [...localClientActionRequests.entries()],
    materializedTickets: localMaterializedTickets,
    ticketOverrides: [...localTicketOverrides.entries()],
    materializedServiceOrders: localMaterializedServiceOrders,
    materializedWorkforceTasks: localMaterializedWorkforceTasks,
    materializedBookings: localMaterializedBookings,
    actionSequence: localSiteManagementState.actionSequence,
    ticketCreateIdempotency: [...localTicketCreateIdempotency.entries()],
    ticketMutationIdempotency: [...localTicketMutationIdempotency.entries()],
  }
  const temporaryPath = `${localQaStatePath}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(temporaryPath, JSON.stringify(persisted), {
    encoding: "utf8",
    mode: 0o600,
  })
  try {
    renameSync(temporaryPath, localQaStatePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    unlinkSync(localQaStatePath)
    renameSync(temporaryPath, localQaStatePath)
  }
}

function withLocalQaState<T>(write: boolean, operation: () => T): T {
  if (!localQaPersistenceEnabled()) return operation()
  acquireLocalQaStateLock()
  try {
    hydrateLocalQaState()
    const result = operation()
    if (write) persistLocalQaState()
    return result
  } finally {
    releaseLocalQaStateLock()
  }
}

/**
 * Test-only: drop every accumulated local-QA mutation and shrink the shared state
 * file back to empty. Reads still return the static seed (localMerged* functions
 * merge the seed with these dynamic arrays), so the seed is preserved, only
 * cross-test accumulation and the resulting per-request latency are removed. This
 * clears inside withLocalQaState so the emptied state is persisted under the lock.
 */
export function resetLocalQaStateForTesting() {
  withLocalQaState(true, () => {
    localClientActionRequests.clear()
    localMaterializedTickets.length = 0
    localTicketOverrides.clear()
    localMaterializedServiceOrders.length = 0
    localMaterializedWorkforceTasks.length = 0
    localMaterializedBookings.length = 0
    localTicketCreateIdempotency.clear()
    localTicketMutationIdempotency.clear()
    localSiteManagementState.actionSequence = 0
  })
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
  // User-facing repositories always keep the authenticated session and RLS.
  // A QA access-profile flag must never silently promote ordinary reads or
  // writes to service-role authority; unauthenticated QA paths fall back to
  // explicit local seed adapters at their call boundary instead.
  return createClient()
}

type DataClient = Awaited<ReturnType<typeof createDataClient>>

interface OperationalContext {
  companyId: string
  siteId: string
  unitId: string | null
  unitNo: string | null
}

async function resolveOperationalContext(
  supabase: DataClient,
  {
    companyId,
    unitNo,
    requireUnit = false,
  }: {
    companyId?: string | null
    unitNo?: string | null
    requireUnit?: boolean
  }
): Promise<OperationalContext> {
  let resolvedCompanyId = companyId && isUuid(companyId) ? companyId : null

  if (!resolvedCompanyId) {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    resolvedCompanyId = asNullableString(asRecord(data).id)
  }

  if (!resolvedCompanyId) {
    throw new Error("No company is available for this operation.")
  }

  const normalizedUnitNo = unitNo?.trim()
    ? unitNo.trim().toLocaleUpperCase("tr-TR")
    : null
  const unitResponse = normalizedUnitNo
    ? await supabase
        .from("units")
        .select("id, site_id, unit_no")
        .eq("company_id", resolvedCompanyId)
        .eq("unit_no", normalizedUnitNo)
        .maybeSingle()
    : { data: null, error: null }

  if (unitResponse.error) throw unitResponse.error

  const unit = asRecord(unitResponse.data)
  const unitId = asNullableString(unit.id)
  let siteId = asNullableString(unit.site_id)

  if (requireUnit && !unitId) {
    throw new Error("The requested unit is not available for this operation.")
  }

  if (!siteId) {
    const { data, error } = await supabase
      .from("sites")
      .select("id")
      .eq("company_id", resolvedCompanyId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    siteId = asNullableString(asRecord(data).id)
  }

  if (!siteId) {
    throw new Error("No site is available for this operation.")
  }

  return {
    companyId: resolvedCompanyId,
    siteId,
    unitId,
    unitNo: normalizedUnitNo,
  }
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
      entityId: typeof record.entity_id === "string" ? record.entity_id : null,
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
            availableForSale: asNumber(
              record.available_for_sale,
              asNumber(record.vacant_units)
            ),
            soldUnits: asNumber(
              record.sold_units,
              asNumber(record.occupied_units)
            ),
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
      id: asString(
        resident.id,
        asString(record.resident_id, asString(record.id))
      ),
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
  const uniqueResidents = new Set(
    people.map((resident) => resident.id).filter(Boolean)
  )

  return {
    staffTotal: staff.length,
    activeStaff: staff.filter((member) => member.status === "active").length,
    residentTotal: uniqueResidents.size || people.length,
    owners: people.filter((resident) => resident.relationship === "owner")
      .length,
    tenants: people.filter((resident) => resident.relationship === "tenant")
      .length,
    guests: people.filter((resident) => resident.relationship === "guest")
      .length,
    highRiskResidents: people.filter((resident) => resident.riskScore >= 70)
      .length,
    financeApprovers: roles
      .filter((role) => role.canApproveFinance)
      .reduce((sum, role) => sum + role.usersCount, 0),
    roleCount: roles.length,
  }
}

function qualityStatus(
  checks: OperationalQualityCheck[]
): OperationalQualityStatus {
  if (checks.some((check) => check.status === "failed")) return "failed"
  if (checks.some((check) => check.status === "warning")) return "warning"
  return "passed"
}

function qualityReport(
  checks: OperationalQualityCheck[]
): OperationalQualityReport {
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
  const uniqueResidents = new Set(
    people.map((resident) => resident.id).filter(Boolean)
  )
  const relationshipTypes = new Set(
    people.map((resident) => resident.relationship).filter(Boolean)
  )
  const languages = new Set([
    ...staff.map((member) => member.language).filter(Boolean),
    ...people.map((resident) => resident.preferredLanguage).filter(Boolean),
  ])
  const rolesWithSensitiveControls = roles.filter(
    (role) =>
      role.canApproveFinance || role.canRestrictAccess || role.canManageUsers
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
      status:
        relationshipTypes.has("owner") && relationshipTypes.has("tenant")
          ? "passed"
          : "warning",
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
  return (
    status === "open" || status === "partially_paid" || status === "overdue"
  )
}

function isOverdueLedgerEntry(entry: FinanceLedgerEntry) {
  if (entry.status === "overdue") return true
  if (
    !isOpenLedgerStatus(entry.status) ||
    entry.entryType === "payment" ||
    !entry.dueDate
  ) {
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

function summarizeFinanceRows(
  entries: FinanceLedgerEntry[]
): FinanceLedgerData["summary"] {
  const openEntries = entries.filter((entry) =>
    isOpenLedgerStatus(entry.status)
  )
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
    openLedgerCents: openEntries.reduce(
      (sum, entry) => sum + entry.amountCents,
      0
    ),
    overdueLedgerCents: overdueEntries.reduce(
      (sum, entry) => sum + entry.amountCents,
      0
    ),
    paidThisMonthCents: entries
      .filter(isPaidThisMonth)
      .reduce((sum, entry) => sum + entry.amountCents, 0),
    openEntries: openEntries.length,
    overdueEntries: overdueEntries.length,
    postedEntries: entries.filter((entry) => entry.postedAt).length,
    restrictedUnits,
    legalAccounts: overdueEntries.filter((entry) => entry.status === "overdue")
      .length,
    agingBuckets,
  }
}

function buildFinanceLedgerQuality(
  entries: FinanceLedgerEntry[],
  summary: FinanceLedgerData["summary"]
): OperationalQualityReport {
  const uniqueIds = new Set(entries.map((entry) => entry.id).filter(Boolean))
  const agingTotalCents = summary.agingBuckets.reduce(
    (sum, bucket) => sum + bucket.cents,
    0
  )
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
      status:
        summary.overdueLedgerCents <= summary.openLedgerCents
          ? "passed"
          : "failed",
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
      status:
        postedEntriesWithoutControlKey.length === 0 ? "passed" : "warning",
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

function buildPaymentPlanQueue(
  plans: PaymentPlanRecord[],
  limit: number
): Phase7PaymentPlan[] {
  return plans
    .slice()
    .sort(
      (a, b) => paymentPlanPriority(a.status) - paymentPlanPriority(b.status)
    )
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

function depositActionFor(
  booking: Pick<
    BookingRecord,
    "depositStatus" | "accessCodeStatus" | "cleaningStatus"
  >
) {
  if (booking.depositStatus === "deduction_pending")
    return "Hasar ve temizlik kanitini muhasebe onayina bagla"
  if (booking.depositStatus === "refund_ready")
    return "Iade emrini finans onay kuyruguna al"
  if (
    booking.accessCodeStatus === "restricted" ||
    booking.accessCodeStatus === "disabled"
  ) {
    return "Erisim kodunu depozito ve borc kontrolu kapanana kadar acma"
  }
  if (booking.cleaningStatus === "blocked")
    return "Temizlik blokajini operasyonla eslestir"
  if (booking.depositStatus === "held")
    return "Depozito tutarini checkout takibinde izle"
  return "Rezervasyon on kontrolunu tamamla"
}

function buildDepositQueue(
  records: BookingRecord[],
  limit: number
): Phase7DepositDecision[] {
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

function riskForDebt(
  account: Pick<DebtAccount, "paymentStatus" | "accessStatus" | "balanceTry">
): Phase7RestrictionDecision["riskLevel"] {
  if (
    account.paymentStatus === "legal" ||
    account.accessStatus === "restricted"
  )
    return "critical"
  if (account.paymentStatus === "overdue") return "high"
  if (account.balanceTry >= 5000) return "medium"
  return "low"
}

function buildRestrictionQueue(
  accounts: DebtAccount[],
  limit: number
): Phase7RestrictionDecision[] {
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

function buildLocalReconciliationQueue(
  accounts: DebtAccount[],
  limit: number
): Phase7ReconciliationItem[] {
  return accounts
    .filter(
      (account) =>
        account.paymentStatus === "overdue" || account.paymentStatus === "legal"
    )
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
    paymentPlansAtRisk: paymentPlans.filter(
      (plan) => plan.status !== "on_track"
    ).length,
    openPlanExposureEur: getPaymentPlanSummary().openExposureEur,
    depositQueue: deposits.length,
    depositExposureCents: deposits.reduce(
      (sum, item) => sum + item.depositCents,
      0
    ),
    restrictionQueue: restrictions.length,
    restrictedUnits: restrictions.filter(
      (item) => item.accessStatus === "restricted"
    ).length,
    reconciliationQueue: reconciliation.filter((item) => item.needsReview)
      .length,
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
  const allIdsCount =
    plans.length + deposits.length + restrictions.length + reconciliation.length
  const depositsWithoutAmount = deposits.filter(
    (item) => item.depositStatus !== "not_required" && item.depositCents <= 0
  )
  const autonomousRestrictions = restrictions.filter(
    (item) => !item.requiresHumanApproval
  )

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
      status:
        reconciliation.length > 0 || summary.paymentPlansAtRisk > 0
          ? "passed"
          : "warning",
      detail: `${reconciliation.length} reconciliation records, ${summary.paymentPlansAtRisk} at-risk payment plans.`,
    },
  ])
}

function localSeedPaymentRestrictionData(
  limit = 8,
  warning?: string
): PaymentRestrictionData {
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
  if (value === "waiting_approval") return "waiting_approval"
  return "open"
}

export interface TicketAvailableUnit {
  id: string
  unitNo: string
  siteId: string | null
}

const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

function isLocalTicketAccessProfile(actor: TicketMutationActor) {
  return isAccessProfileEnabled() && actor.id === LOCAL_ACCESS_PROFILE_ID
}

function workflowMetadataFromEvents(events: unknown[]) {
  const ordered = events
    .map(asRecord)
    .sort((left, right) =>
      asString(right.created_at, "").localeCompare(
        asString(left.created_at, "")
      )
    )
  return (
    ordered
      .map((event) => asRecord(event.metadata))
      .find(
        (metadata) =>
          metadata.workflowState ||
          metadata.dispatchStatus ||
          metadata.paymentStatus
      ) ?? {}
  )
}

function ticketApprovalState(
  value: unknown,
  rawStatus: string
): TicketApprovalState {
  if (value === "pending_owner" || value === "approved" || value === "rejected")
    return value
  return rawStatus === "waiting_approval" ? "pending_owner" : "not_required"
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

function catalogItemForTicket(
  ticket: Pick<ServiceTicket, "category" | "title" | "description">,
  index: number
) {
  const requestContent = catalogCategoryKey(
    [ticket.category, ticket.title, ticket.description ?? ""].join(" ")
  )
  const hasCategory = (...terms: string[]) =>
    terms.some((term) => requestContent.includes(term))
  let matchedCode: string | null = null

  if (
    hasCategory("life", "can guven", "gaz", "duman", "yangin", "smoke", "fire")
  ) {
    matchedCode = "EMERG-LIFE-SAFETY"
  } else if (hasCategory("asansor", "elevator", "lift")) {
    matchedCode = "MAINT-ELEVATOR"
  } else if (hasCategory("elektrik", "electric", "power", "spark")) {
    matchedCode = "MAINT-ELEC"
  } else if (
    hasCategory("gider", "kanalizasyon", "sewer", "sewage", "toilet")
  ) {
    matchedCode = "MAINT-SEWER"
  } else if (hasCategory("tesisat", "su", "plumb")) {
    matchedCode = "MAINT-PLUMB"
  } else if (hasCategory("hvac", "acil klima")) {
    matchedCode = "MAINT-HVAC-URGENT"
  } else if (hasCategory("klima", "iklim")) {
    matchedCode = "MAINT-AC"
  } else if (hasCategory("temiz")) {
    matchedCode = "CLEAN-STD"
  } else if (hasCategory("depozito", "hasar")) {
    matchedCode = "INSP-DAMAGE"
  } else if (
    hasCategory(
      "lockout",
      "locked out",
      "access-maintenance",
      "access maintenance",
      "kapida kal",
      "acil erisim",
      "bariyer",
      "barrier"
    )
  ) {
    matchedCode = "SEC-LOCKOUT"
  } else if (hasCategory("erisim", "guven", "kamera")) {
    matchedCode = "SEC-ACCESS"
  } else if (
    hasCategory(
      "restoran olayi",
      "food",
      "restaurant incident",
      "etkinlik olayi"
    )
  ) {
    matchedCode = "AMENITY-FOOD-EVENT-INCIDENT"
  } else if (
    hasCategory("tiyatro", "theatre", "theater", "etkinlik", "event")
  ) {
    matchedCode = "AMENITY-THEATRE"
  } else if (hasCategory("restoran", "restaurant", "dining")) {
    matchedCode = "AMENITY-RESTAURANT"
  } else if (
    hasCategory(
      "gezi",
      "tur",
      "excursion",
      "quad",
      "bisiklet",
      "bike",
      "jeep",
      "dag",
      "mountain"
    )
  ) {
    matchedCode = "CONCIERGE-EXCURSION"
  } else if (hasCategory("havuz incident", "pool", "hijyen", "hygiene")) {
    matchedCode = "AMENITY-SPA-INCIDENT"
  } else if (hasCategory("ortak", "havuz", "spa", "fitness", "finans")) {
    matchedCode = "AMENITY-SPA"
  }

  return (
    serviceCatalogItems.find((item) => item.code === matchedCode) ??
    serviceCatalogItems[index % serviceCatalogItems.length]
  )
}

type EmergencyScenarioCode =
  | "life_safety"
  | "electrical"
  | "elevator"
  | "plumbing"
  | "sewer"
  | "hvac"
  | "access_security"
  | "amenity_spa_pool"
  | "amenity_food_event"
  | "general_service"

interface EmergencyScenarioDefinition {
  code: EmergencyScenarioCode
  catalogCode: string
  label: string
  triggerTerms: string[]
  routeSlot: string
  checklist: string[]
  notificationChannel: "Portal" | "Push" | "SMS"
  managerApprovalRequired: boolean
}

const emergencyScenarios: EmergencyScenarioDefinition[] = [
  {
    code: "life_safety",
    catalogCode: "EMERG-LIFE-SAFETY",
    label: "Life-safety / gas / smoke",
    triggerTerms: [
      "gas",
      "smoke",
      "fire",
      "alarm",
      "yangin",
      "duman",
      "gaz",
      "can guven",
      "rauch",
      "feuer",
      "gasgeruch",
      "пожар",
      "дым",
      "газ",
    ],
    routeSlot: "Immediate / 1h safety SLA",
    checklist: [
      "Confirm life-safety risk and affected area",
      "Notify security and manager duty line",
      "Block unsafe access if needed",
      "Record authority/vendor handoff",
      "Upload incident closure proof",
    ],
    notificationChannel: "Push",
    managerApprovalRequired: true,
  },
  {
    code: "elevator",
    catalogCode: "MAINT-ELEVATOR",
    label: "Elevator / trapped resident",
    triggerTerms: [
      "elevator",
      "lift",
      "asansor",
      "asansör",
      "stuck in lift",
      "kabinde",
      "aufzug",
      "лифт",
    ],
    routeSlot: "Immediate / 1h elevator SLA",
    checklist: [
      "Confirm whether anyone is trapped",
      "Notify security desk and elevator vendor",
      "Mark elevator out of service",
      "Log vendor arrival and action",
      "Upload restart or closure proof",
    ],
    notificationChannel: "Push",
    managerApprovalRequired: true,
  },
  {
    code: "electrical",
    catalogCode: "MAINT-ELEC",
    label: "Electrical outage / sparking",
    triggerTerms: [
      "electric",
      "power",
      "outage",
      "spark",
      "short circuit",
      "pano",
      "kivilcim",
      "kıvılcım",
      "elektrik",
      "strom",
      "kurzschluss",
      "искра",
      "электр",
      "свет",
    ],
    routeSlot: "Immediate / 2h electrical SLA",
    checklist: [
      "Confirm outage scope and safety risk",
      "Check panel/common-area impact",
      "Assign electrician or technical lead",
      "Upload before/after proof",
      "Confirm power restored",
    ],
    notificationChannel: "Portal",
    managerApprovalRequired: true,
  },
  {
    code: "sewer",
    catalogCode: "MAINT-SEWER",
    label: "Sewage / drain overflow",
    triggerTerms: [
      "sewage",
      "sewer",
      "drain overflow",
      "blocked toilet",
      "toilet overflow",
      "gider tas",
      "gider tikan",
      "tuvalet",
      "kanalizasyon",
      "abfluss",
      "toilette",
      "канал",
      "унитаз",
    ],
    routeSlot: "Immediate / 3h hygiene SLA",
    checklist: [
      "Confirm hygiene risk and water shutoff need",
      "Assign plumbing vendor queue",
      "Protect affected unit/common area",
      "Upload cleanup and repair proof",
      "Request resident confirmation",
    ],
    notificationChannel: "Portal",
    managerApprovalRequired: true,
  },
  {
    code: "plumbing",
    catalogCode: "MAINT-PLUMB",
    label: "Water leak / no water",
    triggerTerms: [
      "plumbing",
      "water leak",
      "no water",
      "leak",
      "pipe",
      "burst",
      "su kacagi",
      "su kaçağı",
      "su yok",
      "tesisat",
      "wasser",
      "leck",
      "kein wasser",
      "rohr",
      "вод",
      "протеч",
      "сантех",
    ],
    routeSlot: "Immediate / 4h SLA",
    checklist: [
      "Confirm water leak or no-water scope",
      "Secure the affected area before repair",
      "Upload before photo/video evidence",
      "Record plumber action and material use",
      "Upload closure proof and resident confirmation",
    ],
    notificationChannel: "Portal",
    managerApprovalRequired: true,
  },
  {
    code: "access_security",
    catalogCode: "SEC-LOCKOUT",
    label: "Access / lockout / gate",
    triggerTerms: [
      "lockout",
      "locked out",
      "access",
      "key",
      "door lock",
      "gate",
      "barrier",
      "qr",
      "card",
      "kapida kal",
      "kapıda kal",
      "kapi acilm",
      "bariyer",
      "plaka",
      "zugang",
      "tuer",
      "schloss",
      "доступ",
      "замок",
      "ключ",
    ],
    routeSlot: "Immediate / 2h access SLA",
    checklist: [
      "Verify identity and unit authority",
      "Notify security desk",
      "Check card/QR/gate log",
      "Restore access or issue temporary handoff",
      "Record audit note and proof",
    ],
    notificationChannel: "Portal",
    managerApprovalRequired: true,
  },
  {
    code: "hvac",
    catalogCode: "MAINT-HVAC-URGENT",
    label: "Urgent AC / comfort risk",
    triggerTerms: [
      "ac not working",
      "air conditioning",
      "hvac",
      "too hot",
      "klima",
      "sicak",
      "sıcak",
      "iklim",
      "klimaanlage",
      "heiss",
      "жарко",
      "кондиционер",
    ],
    routeSlot: "Same day / 8h comfort SLA",
    checklist: [
      "Confirm guest/resident comfort risk",
      "Check AC power and drainage symptoms",
      "Assign technical AC queue",
      "Upload service proof",
      "Confirm cooling restored",
    ],
    notificationChannel: "Portal",
    managerApprovalRequired: true,
  },
  {
    code: "amenity_spa_pool",
    catalogCode: "AMENITY-SPA-INCIDENT",
    label: "Spa / pool / shared-area incident",
    triggerTerms: [
      "spa incident",
      "pool",
      "fitness",
      "hygiene",
      "slip",
      "havuz",
      "ortak alan",
      "hijyen",
      "kayma",
      "wellness",
      "schwimmbad",
      "бассейн",
      "спа",
    ],
    routeSlot: "Immediate / 2h amenity SLA",
    checklist: [
      "Confirm guest safety and area status",
      "Notify amenity owner and manager",
      "Pause capacity if needed",
      "Upload incident proof",
      "Publish resident/guest update",
    ],
    notificationChannel: "Portal",
    managerApprovalRequired: true,
  },
  {
    code: "amenity_food_event",
    catalogCode: "AMENITY-FOOD-EVENT-INCIDENT",
    label: "Restaurant / event incident",
    triggerTerms: [
      "restaurant",
      "food",
      "event",
      "theatre",
      "crowd",
      "reservation conflict",
      "restoran",
      "yemek",
      "etkinlik",
      "tiyatro",
      "kalabalik",
      "veranstaltung",
      "ресторан",
      "мероприят",
    ],
    routeSlot: "Immediate / 2h guest SLA",
    checklist: [
      "Confirm guest impact and service owner",
      "Check booking/capacity context",
      "Notify restaurant or event queue",
      "Record resolution or compensation note",
      "Close with manager review",
    ],
    notificationChannel: "Portal",
    managerApprovalRequired: true,
  },
]

function detectEmergencyScenario(
  value: string
): EmergencyScenarioDefinition | null {
  const text = catalogCategoryKey(value)
  return (
    emergencyScenarios.find((scenario) =>
      scenario.triggerTerms.some((term) =>
        text.includes(catalogCategoryKey(term))
      )
    ) ?? null
  )
}

function textLooksLikeEmergencyPlumbing(value: string) {
  const text = catalogCategoryKey(value)
  return (
    text.includes("plumbing") ||
    text.includes("water leak") ||
    text.includes("no water") ||
    text.includes("leak") ||
    text.includes("su kacagi") ||
    text.includes("su yok") ||
    text.includes("tesisat") ||
    text.includes("gider") ||
    text.includes("wasser") ||
    text.includes("leck") ||
    text.includes("kein wasser") ||
    /вод|протеч|сантех/i.test(value)
  )
}

function serviceCatalogItemForAction(
  proposedPayload: Record<string, unknown>,
  fallbackIndex = 0
) {
  const actionText = [
    asString(proposedPayload.category),
    asString(proposedPayload.title),
    asString(proposedPayload.description),
  ].join(" ")
  const emergencyScenario = detectEmergencyScenario(actionText)

  if (emergencyScenario) {
    return (
      serviceCatalogItems.find(
        (item) => item.code === emergencyScenario.catalogCode
      ) ?? serviceCatalogItems[fallbackIndex % serviceCatalogItems.length]
    )
  }

  if (textLooksLikeEmergencyPlumbing(actionText)) {
    return (
      serviceCatalogItems.find((item) => item.code === "MAINT-PLUMB") ??
      serviceCatalogItems[fallbackIndex % serviceCatalogItems.length]
    )
  }

  return catalogItemForTicket(
    {
      title: asString(proposedPayload.title, "Approved service ticket"),
      category: asString(proposedPayload.category, "general"),
      description: asNullableString(proposedPayload.description),
    },
    fallbackIndex
  )
}

function servicePaymentDecisionForTicket(
  ticket: Pick<
    ServiceTicket,
    "emergency" | "estimatedCostTry" | "debtBlocked" | "paymentVerified"
  >,
  catalogItem: ServiceCatalogItem
): ServiceOrderRecord["paymentDecision"] {
  if (ticket.emergency) {
    return ticket.estimatedCostTry > 0 || catalogItem.basePriceTry > 0
      ? "post_emergency_review"
      : "no_charge"
  }
  if (ticket.debtBlocked) return "hold"
  if (!catalogItem.requiresPayment || catalogItem.basePriceTry === 0)
    return "no_charge"
  if (ticket.paymentVerified) return "paid_or_debit_approved"
  if (catalogItem.debtPolicy === "allow") return "debit_to_account"
  return "collect_before_dispatch"
}

function emergencyPaymentStateForTicket(
  ticket: Pick<
    ServiceTicket,
    | "category"
    | "title"
    | "description"
    | "emergency"
    | "estimatedCostTry"
    | "debtBlocked"
    | "paymentVerified"
  >,
  index = 0
): TicketPaymentState {
  const decision = servicePaymentDecisionForTicket(
    ticket,
    catalogItemForTicket(ticket, index)
  )
  return decision === "no_charge" ? "not_required" : "post_emergency_review"
}

function serviceOrderStatusForTicket(
  ticket: ServiceTicket
): ServiceOrderRecord["status"] {
  if (ticket.emergency) {
    if (ticket.status === "resolved" || ticket.status === "closed")
      return "completed"
    if (ticket.status === "assigned" || ticket.status === "in_progress")
      return "assigned"
    return "draft"
  }
  if (ticket.debtBlocked) return "blocked"
  if (ticket.status === "waiting_payment") return "payment_pending"
  if (ticket.status === "resolved" || ticket.status === "closed")
    return "completed"
  if (ticket.status === "assigned" || ticket.status === "in_progress")
    return "assigned"
  return "debt_check"
}

function serviceOrderNextAction(
  ticket: ServiceTicket,
  paymentDecision: ServiceOrderRecord["paymentDecision"]
) {
  if (ticket.emergency) {
    if (paymentDecision === "no_charge") {
      return "Continue emergency containment and complete the field safety checklist."
    }
    return "Continue emergency containment; complete finance review afterwards."
  }
  if (ticket.debtBlocked) return "Finance approval must clear before dispatch."
  if (paymentDecision === "collect_before_dispatch")
    return "Collect payment or approve debit-to-account before dispatch."
  if (ticket.status === "open")
    return "Assign the task by SLA and field team capacity."
  if (ticket.status === "assigned")
    return "Send route slot and media checklist to staff."
  if (ticket.status === "in_progress")
    return "Review field note and closure evidence."
  if (ticket.status === "resolved")
    return "Collect resident confirmation and close."
  return "Archive and include in service reporting."
}

function buildServiceOrdersFromTickets(
  tickets: ServiceTicket[]
): ServiceOrderRecord[] {
  return tickets.map((ticket, index) => {
    const catalogItem = catalogItemForTicket(ticket, index)
    const paymentDecision = servicePaymentDecisionForTicket(ticket, catalogItem)
    const quotedPriceTry =
      ticket.estimatedCostTry > 0
        ? ticket.estimatedCostTry
        : catalogItem.basePriceTry

    return {
      id: `ORD-${ticket.id.replace(/^SRV-/, "")}`,
      orderNo: `ORD-${ticket.id.replace(/^SRV-/, "")}`,
      catalogItemId: catalogItem.id,
      catalogItemName: catalogItem.name,
      ticketId: ticket.id,
      flatNumber: ticket.flatNumber,
      requester: ticket.requester,
      status: serviceOrderStatusForTicket(ticket),
      debtCheckStatus: ticket.emergency
        ? "clear"
        : ticket.debtBlocked
          ? "blocked"
          : ticket.paymentVerified
            ? "clear"
            : "minor_debt_review",
      paymentDecision,
      quotedPriceTry,
      currency: "TRY",
      slaHours: catalogItem.slaHours,
      assignedTeam: catalogItem.team,
      taskCreated:
        ticket.status !== "open" && (ticket.emergency || !ticket.debtBlocked),
      requestedForAt: ticket.dueAt || ticket.openedAt,
      createdAt: ticket.openedAt,
      nextAction: serviceOrderNextAction(ticket, paymentDecision),
    }
  })
}

const defaultChecklistByTeam: Record<string, string[]> = {
  Teknik: [
    "Verify issue",
    "Upload before photo",
    "Add work note",
    "Upload closure proof",
  ],
  Guvenlik: [
    "Verify authority",
    "Update access record",
    "Check access log",
    "Confirm closure",
  ],
  "Kat hizmetleri": [
    "Inspect unit",
    "Complete cleaning checklist",
    "Upload photo proof",
    "Add handover note",
  ],
  Operasyon: [
    "Mark damage area",
    "Record deposit impact",
    "Request manager approval",
    "Publish closure report",
  ],
  Rezervasyon: [
    "Confirm arrival time",
    "Assign provider",
    "Notify guest",
    "Confirm completion",
  ],
  "Sakin destek": [
    "Verify scope",
    "Check slot availability",
    "Send notification",
    "Collect feedback",
  ],
  Restoran: [
    "Confirm guest impact",
    "Check capacity and booking",
    "Notify venue lead",
    "Record resolution note",
  ],
  "Sosyal tesis": [
    "Secure shared area",
    "Check capacity or hygiene risk",
    "Notify facility lead",
    "Publish resident update",
  ],
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
  return Math.max(
    0,
    Math.min(100, evidenceScore + statusScore - financePenalty)
  )
}

function buildWorkforceTasksFromTickets(
  tickets: ServiceTicket[]
): WorkforceTaskRecord[] {
  return tickets.map((ticket, index) => {
    const catalogItem = catalogItemForTicket(ticket, index)
    const checklist = defaultChecklistByTeam[catalogItem.team] ?? [
      "Verify request",
      "Add field note",
      "Upload media proof",
      "Request closure approval",
    ]

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
      managerApprovalRequired:
        ticket.debtBlocked || ticket.estimatedCostTry >= 7000,
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

function mapDebtCheckStatus(
  value: string
): ServiceOrderRecord["debtCheckStatus"] {
  if (value === "minor_debt_review") return "minor_debt_review"
  if (value === "blocked") return "blocked"
  return "clear"
}

function mapPaymentDecision(
  value: string
): ServiceOrderRecord["paymentDecision"] {
  if (value === "no_charge") return "no_charge"
  if (value === "post_emergency_review") return "post_emergency_review"
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

function ensureServiceCatalogCoverage(catalog: ServiceCatalogItem[]) {
  const mergedByCode = new Map(catalog.map((item) => [item.code, item]))

  for (const item of serviceCatalogItems) {
    if (!mergedByCode.has(item.code)) {
      mergedByCode.set(item.code, item)
    }
  }

  return [...mergedByCode.values()]
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
    const debtCheckStatus = mapDebtCheckStatus(
      asString(record.debt_check_status, "clear")
    )
    const paymentDecision = mapPaymentDecision(
      asString(record.payment_decision, "collect_before_dispatch")
    )

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
      taskCreated:
        status === "task_created" ||
        status === "assigned" ||
        status === "completed",
      requestedForAt: asString(
        record.requested_for_at,
        asString(record.created_at, new Date().toISOString())
      ),
      createdAt: asString(record.created_at, new Date().toISOString()),
      nextAction: asString(
        record.next_action,
        serviceOrderNextAction(
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
            paymentVerified:
              paymentDecision === "paid_or_debit_approved" ||
              paymentDecision === "no_charge",
            mediaCount: 0,
            estimatedCostTry: Math.round(
              asNumber(record.quoted_price_cents) / 100
            ),
          },
          paymentDecision
        )
      ),
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
    const metadata = asRecord(record.metadata)
    const rawChecklist = Array.isArray(record.checklist) ? record.checklist : []
    const status = mapTicketStatus(asString(record.status, "open"))
    const dueAt = asNullableString(record.sla_due_at)

    return {
      id: asString(record.task_no, asString(record.id, `task-${index + 1}`)),
      ticketId: asString(ticket.ticket_no, asString(record.ticket_id)),
      flatNumber: asString(unit.unit_no, "Unassigned"),
      title: asString(record.title, "Workforce task"),
      team: asString(record.team, "Operations"),
      assignee: asString(
        staff.name,
        asString(metadata.assigneeLabel, "Operations queue")
      ),
      status,
      priority: mapTicketPriority(asString(record.priority, "medium")),
      slaHoursRemaining: slaHoursRemaining(dueAt),
      routeSlot: asString(record.route_slot, "Unscheduled"),
      checklist: rawChecklist.map((item) => asString(item)).filter(Boolean),
      requiresMedia: asBoolean(record.requires_media, true),
      mediaCount: asNumber(record.media_count),
      managerApprovalRequired: asBoolean(record.manager_approval_required),
      lastUpdateAt: asString(
        record.updated_at,
        asString(record.created_at, new Date().toISOString())
      ),
      fieldNote: asString(record.field_note),
      completionReadiness: asNumber(record.completion_readiness),
    }
  })
}

/** Empty live tables are authoritative. Synthetic operational records are
 * reserved for the explicit local QA adapter and must never mask RLS or live
 * data gaps. */
export function normalizeLiveServiceOperationRows(
  orderRows: unknown,
  taskRows: unknown
): { orders: ServiceOrderRecord[]; workforceTasks: WorkforceTaskRecord[] } {
  return {
    orders: normalizeServiceOrderRows(orderRows),
    workforceTasks: normalizeWorkforceTaskRows(taskRows),
  }
}

function ticketStrategy(): ServiceTicketQueueData["strategy"] {
  return {
    systemOfRecord:
      "1Cati keeps the operational service catalogue, service orders, SLA tasks and ticket events inside Supabase.",
    crmRole:
      "Twenty CRM remains the relationship/contact system; 1Cati remains the resident-service and field-operations system.",
    escalationPolicy:
      "Debt-blocked orders, overdue SLA tasks, access/security work and high-cost repairs create manager approval actions before closure.",
    externalHelpdeskDecision:
      "Use the internal ticketing system first; add Zendesk/Freshdesk/Jira Service Management later only if public omnichannel support becomes a client requirement.",
  }
}

function summarizeServiceTickets(
  tickets: ServiceTicket[],
  catalog: ServiceCatalogItem[],
  orders: ServiceOrderRecord[],
  tasks: WorkforceTaskRecord[]
): ServiceTicketQueueData["summary"] {
  const openTickets = tickets.filter(
    (ticket) => ticket.status !== "closed" && ticket.status !== "resolved"
  )
  const totalSla = tickets.reduce(
    (sum, ticket) => sum + ticket.slaHoursRemaining,
    0
  )
  const fieldTeams = new Set(tasks.map((task) => task.team).filter(Boolean))
  const totalReadiness = tasks.reduce(
    (sum, task) => sum + task.completionReadiness,
    0
  )

  return {
    totalTickets: tickets.length,
    openTickets: openTickets.length,
    overdueTickets: tickets.filter((ticket) => ticket.slaHoursRemaining < 0)
      .length,
    urgentTickets: tickets.filter((ticket) => ticket.priority === "urgent")
      .length,
    financeBlockedTickets: tickets.filter(
      (ticket) => ticket.debtBlocked && !ticket.emergency
    ).length,
    approvalRequiredTickets: tickets.filter(
      (ticket) =>
        !ticket.emergency && (ticket.debtBlocked || !ticket.paymentVerified)
    ).length,
    mediaEvidenceCount: tickets.reduce(
      (sum, ticket) => sum + ticket.mediaCount,
      0
    ),
    estimatedCostCents: tickets.reduce(
      (sum, ticket) => sum + ticket.estimatedCostTry * 100,
      0
    ),
    averageSlaHoursRemaining:
      tickets.length > 0 ? Math.round(totalSla / tickets.length) : 0,
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
      (order) =>
        order.status === "blocked" || order.debtCheckStatus === "blocked"
    ).length,
    openWorkforceTasks: tasks.filter(
      (task) => task.status !== "closed" && task.status !== "resolved"
    ).length,
    slaBreachTasks: tasks.filter((task) => task.slaHoursRemaining < 0).length,
    managerApprovalTasks: tasks.filter((task) => task.managerApprovalRequired)
      .length,
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
    (ticket) =>
      ticket.status !== "closed" &&
      ticket.status !== "resolved" &&
      !ticket.dueAt
  )
  const closedWithoutEvidence = tickets.filter(
    (ticket) =>
      (ticket.status === "closed" || ticket.status === "resolved") &&
      ticket.mediaCount === 0
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
  const taskWithoutChecklist = tasks.filter(
    (task) => task.checklist.length === 0
  )

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
      status:
        orderWithoutTicket.length === 0 && orders.length > 0
          ? "passed"
          : "warning",
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
      status:
        summary.urgentTickets > 0 || summary.overdueTickets > 0
          ? "passed"
          : "warning",
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

function localMergedServiceTickets(
  limit = 24,
  search = "",
  scope?: LocalTicketQueueScope
) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const materializedIds = new Set(
    localMaterializedTickets.map((ticket) => ticket.id)
  )
  const dynamicTickets = localMaterializedTickets.map(
    (ticket) => localTicketOverrides.get(ticket.id) ?? ticket
  )
  const seedTickets = serviceTickets
    .map((ticket) => localTicketOverrides.get(ticket.id) ?? ticket)
    .filter((ticket) => !materializedIds.has(ticket.id))

  const merged = [...dynamicTickets, ...seedTickets]
  const scopedTicketIds =
    scope?.ticketIds === undefined
      ? null
      : new Set(scope.ticketIds.map((ticketId) => ticketId.trim()))
  const scopedUnitNos =
    scope?.unitNos === undefined
      ? null
      : new Set(
          scope.unitNos.map((unitNo) =>
            unitNo.trim().toLocaleUpperCase("tr-TR")
          )
        )
  const scopedAssignee = scope?.assignee?.trim()
  const roleScoped = scope
    ? merged.filter((ticket) => {
        const ticketMatches =
          scopedTicketIds === null || scopedTicketIds.has(ticket.id)
        const unitMatches =
          scopedUnitNos === null ||
          scopedUnitNos.has(ticket.flatNumber.trim().toLocaleUpperCase("tr-TR"))
        const assigneeMatches =
          !scopedAssignee || ticket.assignee.trim() === scopedAssignee
        return ticketMatches && unitMatches && assigneeMatches
      })
    : merged

  const normalizedSearch = normalizeSearchText(search)
  const filtered = normalizedSearch
    ? roleScoped.filter((ticket) =>
        normalizeSearchText(
          `${ticket.id} ${ticket.flatNumber} ${ticket.title} ${ticket.description ?? ""} ${ticket.category} ${ticket.requester}`
        ).includes(normalizedSearch)
      )
    : roleScoped

  return filtered.slice(0, safeLimit)
}

function localMergedBookings(limit = 24) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const dynamicIds = new Set(
    localMaterializedBookings.map((booking) => booking.id)
  )
  return [
    ...localMaterializedBookings,
    ...bookings.filter((booking) => !dynamicIds.has(booking.id)),
  ].slice(0, safeLimit)
}

function localSeedServiceTicketQueueDataInMemory(
  limit = 24,
  warning?: string,
  search = "",
  scope?: LocalTicketQueueScope
): ServiceTicketQueueData {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const tickets = localMergedServiceTickets(safeLimit, search, scope)
  const catalog = serviceCatalogItems
  const ticketIds = new Set(tickets.map((ticket) => ticket.id))
  const mergedOrders = [...localMaterializedServiceOrders, ...serviceOrders]
  const mergedTasks = [...localMaterializedWorkforceTasks, ...workforceTasks]
  const orders = (
    scope
      ? mergedOrders.filter((order) => ticketIds.has(order.ticketId))
      : mergedOrders
  ).slice(0, safeLimit)
  const tasks = (
    scope
      ? mergedTasks.filter((task) => ticketIds.has(task.ticketId))
      : mergedTasks
  ).slice(0, safeLimit)
  const summary = summarizeServiceTickets(tickets, catalog, orders, tasks)

  return {
    contractVersion: SERVICE_TICKETING_CONTRACT_VERSION,
    source: "local-seed",
    generatedAt: new Date().toISOString(),
    quality: buildServiceTicketingQuality(
      tickets,
      catalog,
      orders,
      tasks,
      summary
    ),
    summary,
    tickets,
    catalog,
    orders,
    workforceTasks: tasks,
    strategy: ticketStrategy(),
    recentActions: [...localActionRows(5), ...siteActivities.slice(0, 4)].slice(
      0,
      5
    ),
    warning,
  }
}

function localSeedServiceTicketQueueData(
  limit = 24,
  warning?: string,
  search = "",
  scope?: LocalTicketQueueScope
): ServiceTicketQueueData {
  return withLocalQaState(false, () =>
    localSeedServiceTicketQueueDataInMemory(limit, warning, search, scope)
  )
}

function normalizeServiceTicketHistory(events: unknown) {
  if (!Array.isArray(events)) return []

  return events
    .map((event, index) => {
      const record = asRecord(event)
      const metadata = asRecord(record.metadata)
      const rawAudience = asNullableString(record.visibility)
      const audience: ServiceTicketHistoryEvent["audience"] =
        rawAudience === "resident" ||
        rawAudience === "internal" ||
        rawAudience === "finance"
          ? rawAudience
          : undefined
      const occurredAt = asString(record.created_at, new Date(0).toISOString())
      const version =
        asNullableString(record.ticket_version) ??
        asNullableString(metadata.workflowVersion)

      return {
        id: asString(record.id, `ticket-event-${index + 1}`),
        type: asString(record.event_type, "ticket_updated"),
        message: asString(record.body, "Service request updated."),
        occurredAt,
        audience,
        version: version ?? undefined,
        fromState:
          asNullableString(metadata.fromWorkflowState) ??
          asNullableString(metadata.fromStatus),
        toState:
          asNullableString(metadata.toWorkflowState) ??
          asNullableString(metadata.toStatus) ??
          asNullableString(metadata.workflowState),
      }
    })
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
}

/**
 * Ticket assignment UUIDs are relationship keys, never user-facing labels.
 * Keep a stable, non-identifying fallback when a responder is assigned but no
 * approved display label is available in the safe projection.
 */
export function safeServiceTicketAssigneeLabel({
  assignmentLabel,
  eventAssignmentLabel,
  assignedProfileId,
}: {
  assignmentLabel?: unknown
  eventAssignmentLabel?: unknown
  assignedProfileId?: unknown
}): string {
  const candidates = [assignmentLabel, eventAssignmentLabel]
    .map((value) => asNullableString(value)?.trim() ?? "")
    .filter(Boolean)
  const publicLabel = candidates.find((candidate) => !isUuid(candidate))
  if (publicLabel) return publicLabel

  const hasPrivateAssignment =
    candidates.some((candidate) => isUuid(candidate)) ||
    Boolean(asNullableString(assignedProfileId)?.trim())
  return hasPrivateAssignment ? "Assigned responder" : "Operations queue"
}

function normalizeServiceTicketRows(
  rows: unknown,
  limit: number
): ServiceTicket[] {
  if (!Array.isArray(rows)) return []
  return rows.slice(0, limit).map((row, index) => {
    const record = asRecord(row)
    const unit = relatedRecord(record.units)
    const resident = relatedRecord(record.residents)
    const events = Array.isArray(record.service_ticket_events)
      ? record.service_ticket_events
      : []
    const mediaReports = Array.isArray(record.media_reports)
      ? record.media_reports.map(asRecord)
      : []
    const rawStatus = asString(record.status, "open")
    const requiresFinanceApproval = asBoolean(record.requires_finance_approval)
    const ticketNo = asString(record.ticket_no, `TICKET-${index + 1}`)
    const dueAt = asNullableString(record.sla_due_at)
    const workflowMetadata = workflowMetadataFromEvents(events)
    const routingMetadata = asRecord(record.routing_metadata)
    const emergency =
      asString(record.emergency_classification) === "rule_matched_p0" ||
      asBoolean(routingMetadata.emergency)
    const workflowState = primaryStateFromPersistedStatus(
      rawStatus,
      record.workflow_state ?? workflowMetadata.workflowState
    )
    const approvalStatus = ticketApprovalState(
      record.approval_status,
      rawStatus
    )
    const priority = mapTicketPriority(asString(record.priority, "normal"))
    const assignmentEvent = events
      .map((event) => asRecord(asRecord(event).metadata))
      .find(
        (metadata) =>
          asNullableString(metadata.assignmentLabel) ??
          asNullableString(metadata.assigneeLabel)
      )
    const assignee = safeServiceTicketAssigneeLabel({
      assignmentLabel: record.assignment_label,
      eventAssignmentLabel:
        assignmentEvent?.assignmentLabel ?? assignmentEvent?.assigneeLabel,
      assignedProfileId: record.assigned_to,
    })
    const creationEvent = events
      .map(asRecord)
      .find((event) => asString(event.event_type) === "portal_ticket_created")
    const creationMetadata = asRecord(creationEvent?.metadata)
    const title = asString(record.title, "Service ticket")
    const description = asNullableString(record.description)
    const category = asString(record.category, "general")
    const estimatedCostTry = Math.round(
      asNumber(record.estimated_cost_cents) / 100
    )

    const ticket: ServiceTicket = {
      id: ticketNo,
      flatId: asString(unit.id, asString(record.unit_id, `unit-${index + 1}`)),
      flatNumber: asString(unit.unit_no, "Unassigned"),
      title,
      description,
      category,
      priority,
      status: mapTicketStatus(rawStatus),
      assignee,
      requester: asNullableString(resident.full_name) ?? "Site management",
      requesterRole:
        asNullableString(creationMetadata.requestedByRole) ?? undefined,
      requesterProfileId: asNullableString(record.created_by),
      assigneeProfileId: asNullableString(record.assigned_to),
      openedAt: asString(record.created_at, new Date().toISOString()),
      dueAt: dueAt ?? "",
      slaHoursRemaining: slaHoursRemaining(dueAt),
      debtBlocked:
        !emergency &&
        (requiresFinanceApproval || rawStatus === "waiting_approval"),
      paymentVerified:
        !emergency &&
        !requiresFinanceApproval &&
        rawStatus !== "waiting_approval",
      mediaCount: mediaReports.filter(
        (media) => asString(media.verification_status, "pending") !== "rejected"
      ).length,
      estimatedCostTry,
      version: asString(
        record.workflow_version,
        asString(record.updated_at, "1")
      ),
      workflowState,
      approvalStatus,
      dispatchStatus: deriveDispatchState(
        workflowState,
        assignee,
        workflowMetadata.dispatchStatus
      ),
      paymentWorkflowStatus: emergency
        ? emergencyPaymentStateForTicket(
            {
              title,
              description,
              category,
              emergency,
              estimatedCostTry,
              debtBlocked: false,
              paymentVerified: false,
            },
            index
          )
        : derivePaymentState(
            requiresFinanceApproval,
            false,
            workflowMetadata.paymentStatus
          ),
      severity: ticketSeverityForPriority(priority, emergency),
      emergency,
      history: normalizeServiceTicketHistory(events),
    }
    return ticket
  })
}

/**
 * Final browser-bound ticket projection. RLS remains authoritative for row
 * scope; this mapper independently removes relationship and finance metadata
 * that resident roles do not need.
 */
export function serviceTicketApiViewForRole(
  ticket: ServiceTicket,
  role: Role
): Record<string, unknown> {
  const clientRole = role === "owner" || role === "tenant"
  const visibleHistory = visibleTicketHistoryForRole(role, ticket.history)
  const result: Record<string, unknown> = {
    ...ticket,
    assignee: safeServiceTicketAssigneeLabel({
      assignmentLabel: ticket.assignee,
      assignedProfileId: ticket.assigneeProfileId,
    }),
    history: clientRole
      ? visibleHistory.map((event, index) => ({
          ...event,
          id: `${ticket.id}:event:${index + 1}`,
        }))
      : visibleHistory,
  }

  delete result.requesterProfileId
  delete result.assigneeProfileId
  if (clientRole) {
    delete result.flatId
    delete result.debtBlocked
    delete result.paymentVerified
    delete result.paymentWorkflowStatus
    // An owner must see who raised the request and the estimated cost of a ticket on
    // their own unit that is awaiting their approval decision, that sign-off is the
    // whole point of the owner-approval gate. The ticket set is already scoped to the
    // owner's units upstream, so every other client-role ticket keeps finance masked.
    const ownerDecisionPending =
      role === "owner" && ticket.approvalStatus === "pending_owner"
    if (!ownerDecisionPending) {
      delete result.requesterRole
      delete result.estimatedCostTry
    }
  }
  return result
}

function isMissingTicketWorkflowSchemaError(error: unknown) {
  const record = asRecord(error)
  const code = asString(record.code, "")
  const message = asString(record.message, "").toLowerCase()
  return (
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "42703" ||
    code === "42883" ||
    (message.includes("schema cache") &&
      (message.includes("workflow_version") || message.includes("function")))
  )
}

function normalizeSafeTicketProjectionRows(rows: unknown) {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => {
    const record = asRecord(row)
    const wrapped = record.read_service_ticket_queue_safe
    return wrapped && typeof wrapped === "object" && !Array.isArray(wrapped)
      ? wrapped
      : row
  })
}

async function readSafeTicketProjection(
  supabase: DataClient,
  {
    limit,
    search,
    identifier,
  }: { limit: number; search: string | null; identifier: string | null }
) {
  const response = await supabase.rpc("read_service_ticket_queue_safe", {
    p_limit: limit,
    p_search: search,
    p_identifier: identifier,
  })
  return {
    data: normalizeSafeTicketProjectionRows(response.data),
    error: response.error,
  }
}

async function getTicketQueueRows(
  supabase: DataClient,
  limit: number,
  search: string
) {
  return readSafeTicketProjection(supabase, {
    limit,
    search: search.trim() || null,
    identifier: null,
  })
}

function workflowRecordFromTicket(
  ticket: ServiceTicket,
  databaseId: string | null,
  rawStatus: string = ticket.status,
  createdBy: string | null = null
): ServiceTicketWorkflowRecord {
  const workflowState = primaryStateFromPersistedStatus(
    rawStatus,
    ticket.workflowState
  )
  const approvalStatus =
    ticket.approvalStatus ??
    (rawStatus === "waiting_approval" ? "pending_owner" : "not_required")
  const emergency = ticket.emergency ?? false
  const dispatchStatus =
    ticket.dispatchStatus ?? deriveDispatchState(workflowState, ticket.assignee)
  const paymentStatus = emergency
    ? emergencyPaymentStateForTicket(ticket)
    : (ticket.paymentWorkflowStatus ??
      derivePaymentState(ticket.debtBlocked, false))
  const version = ticket.version ?? "1"

  return {
    databaseId,
    createdBy,
    assignedTo: ticket.assigneeProfileId ?? null,
    ticket: {
      ...ticket,
      version,
      workflowState,
      approvalStatus,
      dispatchStatus,
      paymentWorkflowStatus: paymentStatus,
      severity:
        ticket.severity ??
        ticketSeverityForPriority(ticket.priority, emergency),
      emergency,
    },
    rawStatus,
    workflowState,
    approvalStatus,
    dispatchStatus,
    paymentStatus,
    severity:
      ticket.severity ?? ticketSeverityForPriority(ticket.priority, emergency),
    emergency,
    requiresFinanceApproval: ticket.debtBlocked,
    version,
  }
}

export async function getServiceTicketWorkflowRecord(
  ticketId: string,
  { useLocalAccessProfile = false }: { useLocalAccessProfile?: boolean } = {}
): Promise<ServiceTicketWorkflowRecord | null> {
  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return withLocalQaState(false, () => {
      const ticket =
        localMaterializedTickets.find(
          (candidate) => candidate.id === ticketId
        ) ??
        localTicketOverrides.get(ticketId) ??
        serviceTickets.find((candidate) => candidate.id === ticketId)
      return ticket ? workflowRecordFromTicket(ticket, null) : null
    })
  }

  const supabase = await createClient()
  const safeProjection = await readSafeTicketProjection(supabase, {
    limit: 1,
    search: null,
    identifier: ticketId,
  })
  const response: { data: unknown; error: unknown } = {
    data: safeProjection.data[0] ?? null,
    error: safeProjection.error,
  }
  if (response.error) throw response.error
  if (!response.data) return null

  const record = asRecord(response.data)
  const ticket = normalizeServiceTicketRows([record], 1)[0]
  if (!ticket) return null
  return workflowRecordFromTicket(
    ticket,
    asNullableString(record.id),
    asString(record.status, "open"),
    asNullableString(record.created_by)
  )
}

function normalizePaymentTransactionRows(
  rows: unknown,
  limit: number
): Phase7ReconciliationItem[] {
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
      needsReview:
        status === "pending" || status === "failed" || status === "cancelled",
    }
  })
}

function normalizeDepositLedgerRows(
  rows: unknown
): Map<string, { amountCents: number; currency: string }> {
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
  depositLedgerByUnit = new Map<
    string,
    { amountCents: number; currency: string }
  >()
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
    .filter(
      (item) =>
        item.depositStatus !== "not_required" ||
        item.accessCodeStatus !== "issued"
    )
}

function buildSupabaseRestrictionQueue(
  units: Array<Record<string, unknown>>,
  limit: number
): Phase7RestrictionDecision[] {
  return units
    .filter((unit) => {
      const balanceCents = asNumber(unit.balanceCents ?? unit.balance_cents)
      const accessStatus = asString(unit.accessStatus ?? unit.access_status)
      const paymentStatus = asString(unit.paymentStatus ?? unit.payment_status)
      return (
        balanceCents > 0 ||
        accessStatus === "restricted" ||
        paymentStatus === "overdue"
      )
    })
    .slice(0, limit)
    .map((unit) => {
      const balanceCents = asNumber(unit.balanceCents ?? unit.balance_cents)
      const paymentStatus = asString(
        unit.paymentStatus ?? unit.payment_status,
        "minor_debt"
      )
      const accessStatus = asString(
        unit.accessStatus ?? unit.access_status,
        "active"
      )

      return {
        id: `restriction-${asString(unit.id, asString(unit.unitNo ?? unit.unit_no, "unit"))}`,
        unitId: asNullableString(unit.id),
        unitNo: asNullableString(unit.unitNo ?? unit.unit_no),
        residentName: asNullableString(
          unit.residentName ??
            unit.resident_name ??
            unit.ownerName ??
            unit.owner_name
        ),
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

function normalizeOperationalSearch(value: string) {
  return normalizeSearchText(value)
}

function operationalSearchText(record: OperationalSearchResult) {
  return normalizeOperationalSearch(
    `${record.title} ${record.summary ?? ""} ${record.entityExternalId ?? ""} ${JSON.stringify(record.metadata)}`
  )
}

function operationalSearchRank(
  record: OperationalSearchResult,
  normalizedQuery: string
) {
  const externalId = normalizeOperationalSearch(record.entityExternalId ?? "")
  const title = normalizeOperationalSearch(record.title)
  if (externalId === normalizedQuery || title === normalizedQuery) return 0
  if (
    externalId.startsWith(normalizedQuery) ||
    title.startsWith(normalizedQuery)
  )
    return 0.25
  if (operationalSearchText(record).includes(normalizedQuery))
    return record.rank
  return 99
}

function localSeedSearch(
  query: string,
  limit: number
): OperationalSearchResult[] {
  const normalized = normalizeOperationalSearch(query.trim())
  if (!normalized) return []

  const records: OperationalSearchResult[] = [
    ...flats.map((flat) => ({
      entityTable: "units",
      entityId: null,
      entityExternalId: flat.displayNumber || flat.number || flat.id,
      title: `${flat.displayNumber} ${flat.number} unit`,
      summary: `${flat.block} ${flat.floorLabel} ${flat.type} ${flat.areaText ?? ""} ${flat.ownerName} ${flat.residentName} ${flat.status} ${flat.saleStatus} ${flat.accessStatus} ${flat.paymentStatus} ${flat.priceSource ?? ""} ${flat.sourceNotes ?? ""}`,
      rank: 1,
      metadata: {
        unitId: flat.id,
        unitNo: flat.number,
        displayNumber: flat.displayNumber,
        block: flat.block,
      },
    })),
    ...paymentPlans.map((plan) => ({
      entityTable: "payment_plans",
      entityId: null,
      entityExternalId: plan.id,
      title: plan.dealName,
      summary: `${plan.buyerName} ${plan.unitType} ${plan.status} ${plan.approvalBlocker}`,
      rank: 1,
      metadata: { buyerName: plan.buyerName, unitType: plan.unitType },
    })),
    ...serviceCatalogItems.map((service) => ({
      entityTable: "service_catalog",
      entityId: null,
      entityExternalId: service.code,
      title: service.name,
      summary: `${service.id} ${service.category} ${service.team} ${service.serviceLevel} ${service.debtPolicy}`,
      rank: 1,
      metadata: { serviceId: service.id, team: service.team },
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
    ...serviceOrders.map((order) => ({
      entityTable: "service_orders",
      entityId: null,
      entityExternalId: order.orderNo,
      title: `${order.orderNo} ${order.catalogItemName}`,
      summary: `${order.ticketId} ${order.flatNumber} ${order.requester} ${order.status} ${order.nextAction}`,
      rank: 1,
      metadata: { ticketId: order.ticketId, flatNumber: order.flatNumber },
    })),
    ...workforceTasks.map((task) => ({
      entityTable: "workforce_tasks",
      entityId: null,
      entityExternalId: task.id,
      title: `${task.id} ${task.title}`,
      summary: `${task.ticketId} ${task.flatNumber} ${task.team} ${task.assignee} ${task.status} ${task.fieldNote}`,
      rank: 1,
      metadata: { ticketId: task.ticketId, flatNumber: task.flatNumber },
    })),
    ...bookings.map((booking) => ({
      entityTable: "reservations",
      entityId: null,
      entityExternalId: booking.id,
      title: `${booking.id} ${booking.guestName}`,
      summary: `${booking.flatNumber} ${booking.channel} ${booking.status} ${booking.depositStatus} ${booking.accessCodeStatus} ${booking.cleaningStatus}`,
      rank: 1,
      metadata: { flatNumber: booking.flatNumber, channel: booking.channel },
    })),
    ...bookingReadinessRecords.map((record) => ({
      entityTable: "booking_readiness",
      entityId: null,
      entityExternalId: record.id,
      title: `${record.id} ${record.guestName}`,
      summary: `${record.bookingId} ${record.flatNumber} ${record.riskLevel} ${record.blocker} ${record.nextAction}`,
      rank: 1,
      metadata: { bookingId: record.bookingId, flatNumber: record.flatNumber },
    })),
    ...turnoverTasks.map((task) => ({
      entityTable: "turnover_tasks",
      entityId: null,
      entityExternalId: task.id,
      title: `${task.id} ${task.title}`,
      summary: `${task.bookingId} ${task.flatNumber} ${task.owner} ${task.status} ${task.priority}`,
      rank: 1,
      metadata: { bookingId: task.bookingId, flatNumber: task.flatNumber },
    })),
    ...accessHandoffs.map((handoff) => ({
      entityTable: "access_handoffs",
      entityId: null,
      entityExternalId: handoff.id,
      title: `${handoff.id} ${handoff.credential}`,
      summary: `${handoff.bookingId} ${handoff.flatNumber} ${handoff.status} ${handoff.provider} ${handoff.blocker}`,
      rank: 1,
      metadata: {
        bookingId: handoff.bookingId,
        flatNumber: handoff.flatNumber,
      },
    })),
    ...depositSettlements.map((settlement) => ({
      entityTable: "deposit_settlements",
      entityId: null,
      entityExternalId: settlement.id,
      title: `${settlement.id} ${settlement.guestName}`,
      summary: `${settlement.bookingId} ${settlement.flatNumber} ${settlement.status} ${settlement.nextAction}`,
      rank: 1,
      metadata: {
        bookingId: settlement.bookingId,
        flatNumber: settlement.flatNumber,
      },
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
    ...communicationThreads.map((thread) => ({
      entityTable: "communication_threads",
      entityId: null,
      entityExternalId: thread.id,
      title: `${thread.id} ${thread.subject}`,
      summary: `${thread.channel} ${thread.audience} ${thread.status} ${thread.priority} ${thread.relatedEntity} ${thread.nextAction}`,
      rank: 1,
      metadata: {
        channel: thread.channel,
        relatedEntity: thread.relatedEntity,
      },
    })),
    ...notificationDeliveries.map((delivery) => ({
      entityTable: "notification_deliveries",
      entityId: null,
      entityExternalId: delivery.id,
      title: `${delivery.id} ${delivery.recipient}`,
      summary: `${delivery.ruleId} ${delivery.channel} ${delivery.status} ${delivery.relatedEntity} ${delivery.providerMode}`,
      rank: 1,
      metadata: {
        relatedEntity: delivery.relatedEntity,
        channel: delivery.channel,
      },
    })),
    ...guestLifecycleEvents.map((event) => ({
      entityTable: "guest_lifecycle_events",
      entityId: null,
      entityExternalId: event.id,
      title: `${event.id} ${event.title}`,
      summary: `${event.bookingId} ${event.flatNumber} ${event.guestName} ${event.stage} ${event.channel} ${event.status} ${event.edgeCase} ${event.body}`,
      rank: 1,
      metadata: {
        bookingId: event.bookingId,
        flatNumber: event.flatNumber,
        stage: event.stage,
      },
    })),
    ...messageTemplates.map((template) => ({
      entityTable: "message_templates",
      entityId: null,
      entityExternalId: template.id,
      title: template.title,
      summary: `${template.useCase} ${template.channel} ${template.owner} ${template.approvalStatus} ${template.languages.join(" ")} ${template.preview}`,
      rank: 1,
      metadata: { templateId: template.id, useCase: template.useCase },
    })),
    ...roleOnboardingPlans.map((plan) => ({
      entityTable: "role_onboarding_plans",
      entityId: null,
      entityExternalId: `ONBOARD-${plan.role.toUpperCase()}`,
      title: plan.title,
      summary: `${plan.audience} ${plan.inviteMode} ${plan.identityOptions.join(" ")} ${plan.requiredChecks.join(" ")} ${plan.firstRunSteps.join(" ")}`,
      rank: 1,
      metadata: { role: plan.role, defaultChannel: plan.defaultChannel },
    })),
    ...mobileWebCapabilities.map((item) => ({
      entityTable: "mobile_web_capabilities",
      entityId: null,
      entityExternalId: item.id,
      title: `${item.id} ${item.title}`,
      summary: `${item.audience} ${item.surface} ${item.status} ${item.priority} ${item.description} ${item.evidence}`,
      rank: 1,
      metadata: { surface: item.surface, status: item.status },
    })),
    ...offlineSyncQueue.map((item) => ({
      entityTable: "offline_sync_jobs",
      entityId: null,
      entityExternalId: item.id,
      title: `${item.id} ${item.action}`,
      summary: `${item.role} ${item.module} ${item.status} ${item.device} ${item.retryPolicy} ${item.dataScope} ${item.guardrail}`,
      rank: 1,
      metadata: { role: item.role, module: item.module, status: item.status },
    })),
    ...integrationProviders.map((item) => ({
      entityTable: "integration_providers",
      entityId: null,
      entityExternalId: item.id,
      title: `${item.id} ${item.provider}`,
      summary: `${item.category} ${item.mode} ${item.status} ${item.idealNow} ${item.scalePath} ${item.requiredFromClient} ${item.fallback}`,
      rank: 1,
      metadata: {
        category: item.category,
        status: item.status,
        riskLevel: item.riskLevel,
      },
    })),
    ...aiPremiumRecommendations.map((item) => ({
      entityTable: "ai_recommendations",
      entityId: null,
      entityExternalId: item.id,
      title: `${item.id} ${item.title}`,
      summary: `${item.mode} ${item.audience} ${item.status} confidence ${item.confidence} ${item.languageSupport.join(" ")} ${item.recommendation} ${item.humanApproval}`,
      rank: 1,
      metadata: {
        mode: item.mode,
        audience: item.audience,
        status: item.status,
      },
    })),
    ...aiImageWorkflows.map((item) => ({
      entityTable: "ai_image_workflows",
      entityId: null,
      entityExternalId: item.id,
      title: `${item.id} ${item.title}`,
      summary: `${item.source} ${item.status} ${item.aiUse} ${item.guardrail} ${item.output}`,
      rank: 1,
      metadata: { source: item.source, status: item.status },
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
    ...documentPackets.map((packet) => ({
      entityTable: "document_packets",
      entityId: null,
      entityExternalId: packet.id,
      title: `${packet.id} ${packet.title}`,
      summary: `${packet.audience} ${packet.relatedEntity} ${packet.status} ${packet.signatureStatus} ${packet.nextAction}`,
      rank: 1,
      metadata: {
        relatedEntity: packet.relatedEntity,
        audience: packet.audience,
      },
    })),
  ]

  return records
    .filter((record) => operationalSearchText(record).includes(normalized))
    .map((record) => ({
      ...record,
      rank: operationalSearchRank(record, normalized),
    }))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.title.localeCompare(b.title, "tr", { numeric: true })
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
  const normalized = normalizeSearchText(query)
  const filteredFlats = flats
    .filter((flat) => {
      if (!normalized) return true
      return normalizeSearchText(
        `${flat.number} ${flat.displayNumber} ${flat.block} ${flat.floorLabel} ${flat.type} ${flat.ownerName} ${flat.residentName} ${flat.paymentStatus} ${flat.status} ${flat.saleStatus} ${flat.accessStatus} ${flat.priceSource ?? ""} ${flat.areaText ?? ""} ${flat.sourceNotes ?? ""}`
      ).includes(normalized)
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
      floorCount: new Set(flats.map((flat) => `${flat.block}-${flat.floor}`))
        .size,
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
        block.minBuyNowEur === null
          ? null
          : Math.round(block.minBuyNowEur * 100),
      maxBuyNowEurCents:
        block.maxBuyNowEur === null
          ? null
          : Math.round(block.maxBuyNowEur * 100),
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
      nextPriceEurCents: flat.nextPriceEur.map((price) =>
        Math.round(price * 100)
      ),
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

function localSeedFinanceLedgerData(
  limit = 16,
  warning?: string
): FinanceLedgerData {
  const summary = getSummary()
  const accounts = getDebtAccounts()
  const latestCashFlow = cashFlow.at(-1)
  const entries = accounts
    .slice(0, Math.min(Math.max(limit, 1), 100))
    .map((account) => ({
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
    (account) =>
      account.paymentStatus === "overdue" || account.paymentStatus === "legal"
  )
  const ledgerSummary: FinanceLedgerData["summary"] = {
    currency: "TRY",
    openLedgerCents: summary.totalDebtTry * 100,
    overdueLedgerCents: overdueAccounts.reduce(
      (sum, account) => sum + account.balanceTry * 100,
      0
    ),
    paidThisMonthCents: (latestCashFlow?.collectedTry ?? 0) * 100,
    openEntries: accounts.length,
    overdueEntries: overdueAccounts.length,
    postedEntries: accounts.length,
    restrictedUnits: summary.restrictedAccess,
    legalAccounts: accounts.filter(
      (account) => account.paymentStatus === "legal"
    ).length,
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

function localSeedPeopleDirectoryData(
  limit = 80,
  warning?: string
): PeopleDirectoryData {
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
    quality: buildPeopleDirectoryQuality(
      localSeedStaff,
      localSeedResidents,
      localSeedRoles
    ),
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

function normalizeActionRequestRow(
  row: unknown
): ClientActionRequestRecord | null {
  const record = asRecord(row)
  const id = asString(record.id)
  const actionType = asString(record.action_type)
  if (!id || !actionType) return null

  return {
    id,
    companyId: asNullableString(record.company_id),
    actionType,
    entityTable: asNullableString(record.entity_table),
    entityId: asNullableString(record.entity_id),
    entityExternalId: asNullableString(record.entity_external_id),
    title: asNullableString(record.title),
    status: asString(record.status, "queued"),
    requestedBy: asNullableString(record.requested_by),
    metadata: asRecord(record.metadata),
    createdAt: asNullableString(record.created_at),
  }
}

function storeLocalClientActionInMemory(
  input: ClientActionInput,
  status: ClientActionResult["status"] = "locally-logged"
): ClientActionResult {
  const id = `local-action-${Date.now()}-${++localSiteManagementState.actionSequence}`
  localClientActionRequests.set(id, {
    id,
    companyId: "local-company",
    actionType: input.actionType,
    entityTable: input.entityTable ?? null,
    entityId: input.entityId ?? null,
    entityExternalId: input.entityExternalId ?? null,
    title: input.title ?? null,
    status,
    requestedBy: asNullableString(
      asRecord(input.metadata?.workflow).requestedById
    ),
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  })

  return {
    id,
    source: "local-seed",
    status,
  }
}

function localActionRows(limit = 5) {
  return Array.from(localClientActionRequests.values())
    .sort(
      (a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "")
    )
    .slice(0, limit)
    .map((action) => ({
      id: action.id,
      action_type: action.actionType,
      title: action.title,
      status: action.status,
      entity_table: action.entityTable,
      entity_external_id: action.entityExternalId,
      metadata: action.metadata,
      created_at: action.createdAt,
    }))
}

function isTicketCreateRequest(action: ClientActionRequestRecord) {
  return (
    action.entityTable === "service_tickets" &&
    action.actionType === "ticket.create.ai_draft"
  )
}

function storeLocalClientAction(
  input: ClientActionInput,
  status: ClientActionResult["status"] = "locally-logged"
): ClientActionResult {
  return withLocalQaState(true, () =>
    storeLocalClientActionInMemory(input, status)
  )
}

function actionProposedPayload(action: ClientActionRequestRecord) {
  const proposedPayload = asRecord(action.metadata.proposedPayload)
  const workflowPayload = asRecord(
    asRecord(action.metadata.workflow).proposedPayload
  )
  return Object.keys(proposedPayload).length > 0
    ? proposedPayload
    : workflowPayload
}

function materializedTicketIdFromAction(action: ClientActionRequestRecord) {
  return (
    asNullableString(asRecord(action.metadata.workflow).materializedTicketId) ??
    asNullableString(action.metadata.materializedTicketId)
  )
}

function ticketTitleFromAction(action: ClientActionRequestRecord) {
  const proposedPayload = actionProposedPayload(action)
  return asString(
    proposedPayload.title,
    action.title ?? "Approved service ticket"
  )
}

function ticketPriorityForDb(value: unknown) {
  const priority = asString(value, "normal")
  if (priority === "urgent" || priority === "high" || priority === "low")
    return priority
  return "normal"
}

function ticketStatusForDb(value: unknown) {
  const status = asString(value, "open")
  if (status === "assigned") return "assigned"
  if (status === "waiting_approval") return "waiting_approval"
  if (status === "in_progress") return "in_progress"
  if (status === "resolved") return "resolved"
  if (status === "closed") return "closed"
  if (status === "cancelled") return "cancelled"
  if (status === "waiting_payment" || status === "waiting_approval")
    return "waiting_approval"
  if (status === "triage") return "triage"
  return "open"
}

function ticketPriorityForView(value: unknown): ServiceTicket["priority"] {
  return mapTicketPriority(ticketPriorityForDb(value))
}

function ticketDueAt(priority: string, serviceSlaHours?: number) {
  const priorityHours =
    priority === "urgent" ? 4 : priority === "high" ? 12 : 48
  const hours = serviceSlaHours
    ? Math.min(priorityHours, serviceSlaHours)
    : priorityHours
  return new Date(Date.now() + hours * 3_600_000).toISOString()
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!isSupabaseConfigured()) {
    return localSeedSnapshot(
      "External data service is not configured; using local seed data."
    )
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
        .select(
          `
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
        `
        )
        .order("due_date", { ascending: false, nullsFirst: false })
        .limit(safeLimit),
      supabase
        .from("finance_ledger_entries")
        .select(
          `
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
        `
        )
        .limit(1000),
      supabase
        .from("client_action_requests")
        .select(
          "id, action_type, title, status, entity_table, entity_external_id, metadata, created_at"
        )
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
        .select(
          "id, profile_id, name, role, team, phone, language, active_tasks, approval_limit_cents, access_scope, status"
        )
        .order("active_tasks", { ascending: false })
        .limit(100),
      supabase
        .from("unit_residents")
        .select(
          `
          id,
          resident_id,
          relationship,
          is_primary,
          start_date,
          end_date,
          units(unit_no),
          residents(id, full_name, phone, email, preferred_language, preferred_channel, identity_status, risk_score, status)
        `
        )
        .order("start_date", { ascending: false, nullsFirst: false })
        .limit(safeLimit),
      supabase
        .from("residents")
        .select(
          "id, full_name, phone, email, preferred_language, preferred_channel, identity_status, risk_score, status"
        )
        .order("risk_score", { ascending: false })
        .limit(safeLimit),
      supabase
        .from("role_coverage")
        .select(
          "id, role_label, users_count, can_approve_finance, can_restrict_access, can_manage_users, can_export_data"
        )
        .order("users_count", { ascending: false }),
      supabase
        .from("client_action_requests")
        .select(
          "id, action_type, title, status, entity_table, entity_external_id, metadata, created_at"
        )
        .in("entity_table", [
          "profiles",
          "staff_members",
          "role_coverage",
          "residents",
          "unit_residents",
        ])
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
    const people =
      linkedResidents.length > 0 ? linkedResidents : directResidents
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
    const reservationProjection = getBookingLifecycleWorkspace()
      .then((workspace) => ({
        data: roleProjectedReservationRows(workspace),
        error: null,
      }))
      .catch((error: unknown) => ({ data: null, error }))
    const [
      transactionResponse,
      reservationResponse,
      depositLedgerResponse,
      actionResponse,
      phase4Data,
    ] = await Promise.all([
      supabase
        .from("payment_transactions")
        .select(
          "id, provider, provider_reference, status, amount_cents, currency, paid_at, ledger_entry_id, finance_ledger_entries(id, unit_id, resident_id, units(id, unit_no), residents(id, full_name))"
        )
        .order("created_at", { ascending: false })
        .limit(safeLimit),
      reservationProjection,
      supabase
        .from("finance_ledger_entries")
        .select(
          "id, entry_type, amount_cents, currency, unit_id, units(id, unit_no)"
        )
        .in("entry_type", ["deposit", "refund"])
        .order("created_at", { ascending: false })
        .limit(safeLimit * 3),
      supabase
        .from("client_action_requests")
        .select(
          "id, action_type, title, status, entity_table, entity_external_id, created_at"
        )
        .in("entity_table", [
          "payment_transactions",
          "finance_ledger_entries",
          "reservations",
          "access_events",
        ])
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
      phase4Data.units.map(
        (unit) => unit as unknown as Record<string, unknown>
      ),
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
  search = "",
  allowLocalSeedFallback = isAccessProfileEnabled(),
  useLocalAccessProfile = false,
  localTicketScope,
}: {
  limit?: number
  search?: string
  allowLocalSeedFallback?: boolean
  useLocalAccessProfile?: boolean
  localTicketScope?: LocalTicketQueueScope
} = {}): Promise<ServiceTicketQueueData> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localSeedServiceTicketQueueData(
      safeLimit,
      "External data service is not configured; using local ticket seed data.",
      search,
      useLocalAccessProfile ? localTicketScope : undefined
    )
  }

  try {
    const supabase = await createClient()
    const [
      ticketResponse,
      catalogResponse,
      orderResponse,
      taskResponse,
      actionResponse,
    ] = await Promise.all([
      getTicketQueueRows(supabase, safeLimit, search),
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
          "id, task_no, title, team, status, priority, sla_due_at, route_slot, checklist, requires_media, media_count, manager_approval_required, completion_readiness, field_note, metadata, created_at, updated_at, service_tickets(id, ticket_no), units(id, unit_no), staff_members(id, name)"
        )
        .order("sla_due_at", { ascending: true, nullsFirst: false })
        .limit(safeLimit),
      supabase
        .from("client_action_requests")
        .select(
          "id, action_type, title, status, entity_table, entity_external_id, metadata, created_at"
        )
        .in("entity_table", [
          "service_tickets",
          "service_catalog",
          "service_orders",
          "workforce_tasks",
          "media_reports",
        ])
        .order("created_at", { ascending: false })
        .limit(5),
    ])

    if (ticketResponse.error) throw ticketResponse.error

    const tickets = normalizeServiceTicketRows(ticketResponse.data, safeLimit)
    const catalog = ensureServiceCatalogCoverage(
      catalogResponse.error ||
        !Array.isArray(catalogResponse.data) ||
        catalogResponse.data.length === 0
        ? serviceCatalogItems
        : normalizeServiceCatalogRows(catalogResponse.data)
    )
    if (orderResponse.error) throw orderResponse.error
    if (taskResponse.error) throw taskResponse.error
    const { orders, workforceTasks: tasks } = normalizeLiveServiceOperationRows(
      orderResponse.data,
      taskResponse.data
    )
    const summary = summarizeServiceTickets(tickets, catalog, orders, tasks)

    return {
      contractVersion: SERVICE_TICKETING_CONTRACT_VERSION,
      source: "supabase",
      generatedAt: new Date().toISOString(),
      quality: buildServiceTicketingQuality(
        tickets,
        catalog,
        orders,
        tasks,
        summary
      ),
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
    if (allowLocalSeedFallback && canUseLocalSeedFallback()) {
      return localSeedServiceTicketQueueData(
        safeLimit,
        "Live ticket query failed; local seed data is available for this environment.",
        search
      )
    }
    throw new Error("Service ticket queue is unavailable.")
  }
}

export async function getTicketAvailableUnits({
  fallbackUnitNos = null,
  useLocalAccessProfile = false,
}: {
  /**
   * Explicit QA/local scope. `null` means the operational roles may use the
   * local unit catalogue; an array means client roles may use only those units.
   * This value is never used to broaden a real authenticated RLS query.
   */
  fallbackUnitNos?: readonly string[] | null
  useLocalAccessProfile?: boolean
} = {}): Promise<TicketAvailableUnit[]> {
  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    const normalizedScope =
      fallbackUnitNos === null
        ? null
        : new Set(
            fallbackUnitNos.map((unitNo) =>
              unitNo.trim().toLocaleUpperCase("tr-TR")
            )
          )
    return flats
      .filter(
        (flat) => normalizedScope === null || normalizedScope.has(flat.number)
      )
      .map((flat) => ({
        id: flat.id,
        unitNo: flat.number,
        siteId: "seed-site",
      }))
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("units")
    .select("id, unit_no, site_id")
    .order("unit_no", { ascending: true })
    .limit(1000)

  if (error) throw error
  if (!Array.isArray(data)) return []
  return data
    .map(asRecord)
    .map((unit) => ({
      id: asString(unit.id),
      unitNo: asString(unit.unit_no),
      siteId: asNullableString(unit.site_id),
    }))
    .filter((unit) => Boolean(unit.id && unit.unitNo))
}

function buildTicketViewFromInput({
  id,
  title,
  description,
  category,
  priority,
  status,
  unitNo,
  assignee,
  requester,
  requesterRole,
  dueAt,
  estimatedCostTry,
  version = "1",
  workflowState,
  approvalStatus = "not_required",
  emergency = false,
}: {
  id: string
  title: string
  description?: string | null
  category: string
  priority: unknown
  status: unknown
  unitNo: string | null
  assignee?: string | null
  requester: string
  requesterRole?: string
  dueAt: string
  estimatedCostTry: number
  version?: string
  workflowState?: TicketPrimaryState
  approvalStatus?: TicketApprovalState
  emergency?: boolean
}): ServiceTicket {
  const normalizedPriority = ticketPriorityForView(priority)
  const normalizedAssignee = assignee?.trim() || "Operations queue"
  const normalizedWorkflowState =
    workflowState ?? primaryStateFromPersistedStatus(ticketStatusForDb(status))
  return {
    id,
    flatId: unitNo ? `unit-${unitNo}` : "unit-unassigned",
    flatNumber: unitNo ?? "Unassigned",
    title,
    description: description ?? null,
    category,
    priority: normalizedPriority,
    status: mapTicketStatus(ticketStatusForDb(status)),
    assignee: normalizedAssignee,
    requester,
    requesterRole,
    openedAt: new Date().toISOString(),
    dueAt,
    slaHoursRemaining: slaHoursRemaining(dueAt),
    debtBlocked: false,
    paymentVerified: !emergency,
    mediaCount: 0,
    estimatedCostTry,
    version,
    workflowState: normalizedWorkflowState,
    approvalStatus,
    dispatchStatus: deriveDispatchState(
      normalizedWorkflowState,
      normalizedAssignee
    ),
    paymentWorkflowStatus: emergency
      ? emergencyPaymentStateForTicket({
          title,
          description: description ?? null,
          category,
          emergency,
          estimatedCostTry,
          debtBlocked: false,
          paymentVerified: false,
        })
      : "not_required",
    severity: ticketSeverityForPriority(normalizedPriority, emergency),
    emergency,
    history: [
      {
        id: `local:${id}:created`,
        type: "ticket_created",
        message: "Service request received.",
        occurredAt: new Date().toISOString(),
        audience: "resident",
        version,
        fromState: null,
        toState: normalizedWorkflowState,
      },
    ],
  }
}

function localCreateServiceTicketInMemory(
  input: CreateServiceTicketInput
): ServiceTicketMutationResult {
  const idempotencyScope = `${input.actor.companyId ?? "local"}:${input.idempotencyKey ?? ""}`
  const requestFingerprint = serviceTicketCreateFingerprint(input)
  if (input.idempotencyKey) {
    const receipt = localTicketCreateIdempotency.get(idempotencyScope)
    if (receipt) {
      if (receipt.fingerprint !== requestFingerprint) {
        throw new TicketRepositoryError(
          "TICKET_IDEMPOTENCY_CONFLICT",
          "The idempotency key was already used for a different ticket submission.",
          409
        )
      }
      return { ...receipt.result, replayed: true }
    }
  }
  const catalogItem = serviceCatalogItemForAction({
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    unitNo: input.unitNo,
  })
  const priority = ticketPriorityForDb(input.priority)
  const dueAt = ticketDueAt(priority, catalogItem.slaHours)
  const ticketNo = `TCK-${Date.now().toString(36).toUpperCase()}-${localMaterializedTickets.length + 1}`
  const routedAssignee = input.assignee?.trim() || "Operations queue"
  const assignee = input.requiresOwnerApproval
    ? "Owner approval queue"
    : routedAssignee
  const workflowState: TicketPrimaryState = input.requiresOwnerApproval
    ? "submitted"
    : assignee === "Operations queue"
      ? "submitted"
      : "assigned"
  const ticket = buildTicketViewFromInput({
    id: ticketNo,
    title: input.title,
    description: input.description,
    category: input.category,
    priority,
    status: input.requiresOwnerApproval
      ? "waiting_approval"
      : assignee === "Operations queue"
        ? "open"
        : "assigned",
    unitNo: input.unitNo,
    assignee,
    requester: input.actor.displayName ?? input.actor.email ?? input.actor.role,
    requesterRole: input.actor.role,
    dueAt,
    estimatedCostTry: catalogItem.basePriceTry,
    version: "1",
    workflowState,
    approvalStatus: input.requiresOwnerApproval
      ? "pending_owner"
      : "not_required",
    emergency: Boolean(input.emergency),
  })

  localMaterializedTickets.unshift(ticket)

  // Emergency intake is operational immediately, even before assignment. Keep
  // a single draft order visible so P0 containment never inherits debt/payment
  // blocking semantics; assignment upgrades this same order and creates the
  // workforce task through the normal command path below.
  if (ticket.emergency) {
    const emergencyOrder = buildServiceOrdersFromTickets([ticket])[0]
    if (emergencyOrder) {
      localMaterializedServiceOrders.unshift(emergencyOrder)
    }
  }

  const result: ServiceTicketMutationResult = {
    source: "local-seed",
    ticket,
    version: "1",
  }
  if (input.idempotencyKey) {
    localTicketCreateIdempotency.set(idempotencyScope, {
      fingerprint: requestFingerprint,
      result,
    })
  }
  return result
}

function localCreateServiceTicket(input: CreateServiceTicketInput) {
  return withLocalQaState(true, () => localCreateServiceTicketInMemory(input))
}

function localUpdateServiceTicketInMemory(
  input: UpdateServiceTicketInput
): ServiceTicketMutationResult | null {
  const idempotencyScope = `${input.actor.companyId ?? "local"}:${input.idempotencyKey ?? ""}`
  const requestFingerprint = serviceTicketMutationFingerprint(input)
  if (input.idempotencyKey) {
    const receipt = localTicketMutationIdempotency.get(idempotencyScope)
    if (receipt) {
      if (receipt.fingerprint !== requestFingerprint) {
        throw new TicketRepositoryError(
          "TICKET_IDEMPOTENCY_CONFLICT",
          "The idempotency key was already used for a different ticket command.",
          409
        )
      }
      return { ...receipt.result, replayed: true }
    }
  }
  const existing =
    localMaterializedTickets.find((ticket) => ticket.id === input.ticketId) ??
    localTicketOverrides.get(input.ticketId) ??
    serviceTickets.find((ticket) => ticket.id === input.ticketId)

  if (!existing) return null

  const currentVersion = existing.version ?? "1"
  if (input.expectedVersion && input.expectedVersion !== currentVersion) {
    throw new TicketRepositoryError(
      "TICKET_VERSION_CONFLICT",
      "The ticket changed after it was loaded.",
      409,
      { expectedVersion: input.expectedVersion, currentVersion }
    )
  }

  const nextVersion = String(Math.max(Number(currentVersion) || 1, 1) + 1)
  const workflowState =
    input.workflowState ??
    (input.status
      ? primaryStateFromPersistedStatus(ticketStatusForDb(input.status))
      : primaryStateFromPersistedStatus(
          existing.status,
          existing.workflowState
        ))
  const nextStatus = input.workflowState
    ? mapTicketStatus(persistedStatusForPrimaryState(input.workflowState))
    : input.status
      ? mapTicketStatus(ticketStatusForDb(input.status))
      : existing.status

  const next: ServiceTicket = {
    ...existing,
    title: input.title ?? existing.title,
    description: input.clearDescription
      ? null
      : (input.description ?? existing.description ?? null),
    category: input.category ?? existing.category,
    priority: input.priority
      ? ticketPriorityForView(input.priority)
      : existing.priority,
    status: nextStatus,
    assignee: input.assignee?.trim() || existing.assignee,
    assigneeProfileId:
      input.command === "assign"
        ? (input.assigneeProfileId ?? null)
        : (existing.assigneeProfileId ?? null),
    version: nextVersion,
    workflowState,
    approvalStatus:
      input.approvalStatus ?? existing.approvalStatus ?? "not_required",
    dispatchStatus:
      input.dispatchStatus ??
      deriveDispatchState(
        workflowState,
        input.assignee?.trim() || existing.assignee,
        existing.dispatchStatus
      ),
    paymentWorkflowStatus: existing.emergency
      ? emergencyPaymentStateForTicket({
          title: input.title ?? existing.title,
          description: input.clearDescription
            ? null
            : (input.description ?? existing.description ?? null),
          category: input.category ?? existing.category,
          emergency: true,
          estimatedCostTry: existing.estimatedCostTry,
          debtBlocked: false,
          paymentVerified: false,
        })
      : (input.paymentStatus ??
        existing.paymentWorkflowStatus ??
        "not_required"),
    history: [
      ...(existing.history?.length
        ? existing.history
        : [
            {
              id: `local:${existing.id}:created`,
              type: "ticket_created",
              message: "Service request received.",
              occurredAt: existing.openedAt,
              audience: "resident" as const,
              version: currentVersion,
              fromState: null,
              toState: existing.workflowState ?? "submitted",
            },
          ]),
      {
        id: `local:${existing.id}:${nextVersion}`,
        type:
          input.command === "assign"
            ? "ticket_assigned"
            : input.command === "approve_owner_request" ||
                input.command === "reject_owner_request"
              ? "owner_approval_decided"
              : input.command
                ? "workflow_command"
                : "ticket_details_updated",
        message:
          input.command === "assign"
            ? "Ticket assignment updated."
            : input.command === "approve_owner_request"
              ? "The owner approved this service request."
              : input.command === "reject_owner_request"
                ? "The owner rejected this service request."
                : input.command === "cancel"
                  ? "Service request cancelled."
                  : input.command === "reopen"
                    ? "Service request reopened."
                    : input.command === "request_owner_approval"
                      ? "Owner approval requested after review."
                      : input.command
                        ? "Service request workflow updated."
                        : "Service request details updated.",
        occurredAt: new Date().toISOString(),
        audience: "resident",
        version: nextVersion,
        fromState: existing.workflowState ?? null,
        toState: workflowState,
      },
    ],
  }

  const materializedIndex = localMaterializedTickets.findIndex(
    (ticket) => ticket.id === input.ticketId
  )
  if (materializedIndex >= 0) {
    localMaterializedTickets[materializedIndex] = next
  } else {
    localTicketOverrides.set(input.ticketId, next)
  }

  // Acceptance is the business boundary that turns a request into executable
  // work. Persist the local QA order/task exactly once as well, so the demo
  // proves the same cross-role hand-off as the transactional database path.
  if (input.command === "accept" || input.command === "assign") {
    const derivedOrder = buildServiceOrdersFromTickets([next])[0]
    const orderIndex = localMaterializedServiceOrders.findIndex(
      (order) => order.ticketId === input.ticketId
    )
    if (orderIndex >= 0) {
      const existingOrder = localMaterializedServiceOrders[orderIndex]
      localMaterializedServiceOrders[orderIndex] = {
        ...derivedOrder,
        id: existingOrder.id,
        orderNo: existingOrder.orderNo,
        createdAt: existingOrder.createdAt,
      }
    } else {
      localMaterializedServiceOrders.unshift(derivedOrder)
    }

    const derivedTask = buildWorkforceTasksFromTickets([next])[0]
    const taskIndex = localMaterializedWorkforceTasks.findIndex(
      (task) => task.ticketId === input.ticketId
    )
    if (taskIndex >= 0) {
      const existingTask = localMaterializedWorkforceTasks[taskIndex]
      localMaterializedWorkforceTasks[taskIndex] = {
        ...derivedTask,
        id: existingTask.id,
        lastUpdateAt: new Date().toISOString(),
      }
    } else {
      localMaterializedWorkforceTasks.unshift(derivedTask)
    }
  } else {
    localMaterializedWorkforceTasks.forEach((task, index) => {
      if (task.ticketId !== input.ticketId) return
      localMaterializedWorkforceTasks[index] = {
        ...task,
        status: next.status,
        lastUpdateAt: new Date().toISOString(),
      }
    })
  }

  const result: ServiceTicketMutationResult = {
    source: "local-seed",
    ticket: next,
    version: nextVersion,
  }
  if (input.idempotencyKey) {
    localTicketMutationIdempotency.set(idempotencyScope, {
      fingerprint: requestFingerprint,
      result,
    })
  }
  return result
}

function localUpdateServiceTicket(input: UpdateServiceTicketInput) {
  return withLocalQaState(true, () => localUpdateServiceTicketInMemory(input))
}

function ticketMutationFromRpc(
  data: unknown,
  fallback: ServiceTicket
): ServiceTicketMutationResult {
  const row = asRecord(Array.isArray(data) ? data[0] : data)
  const priority = ticketPriorityForView(row.priority ?? fallback.priority)
  const rawStatus = asString(row.status, fallback.status)
  const workflowState = primaryStateFromPersistedStatus(
    rawStatus,
    row.workflow_state ?? fallback.workflowState
  )
  const emergency = asString(row.emergency_classification) === "rule_matched_p0"
  const requiresFinanceApproval =
    !emergency && asBoolean(row.requires_finance_approval, fallback.debtBlocked)
  const assignee = safeServiceTicketAssigneeLabel({
    assignmentLabel: row.assignment_label ?? fallback.assignee,
    assignedProfileId: row.assigned_to ?? fallback.assigneeProfileId,
  })
  const approvalStatus = ticketApprovalState(row.approval_status, rawStatus)
  const version = asString(row.workflow_version, fallback.version ?? "1")
  const paymentWorkflowStatus = emergency
    ? "not_required"
    : derivePaymentState(
        requiresFinanceApproval,
        false,
        fallback.paymentWorkflowStatus
      )
  const ticket: ServiceTicket = {
    ...fallback,
    id: asString(row.ticket_no, fallback.id),
    title: asString(row.title, fallback.title),
    description:
      row.description === null
        ? null
        : (asNullableString(row.description) ?? fallback.description),
    category: asString(row.category, fallback.category),
    priority,
    status: mapTicketStatus(rawStatus),
    assignee,
    assigneeProfileId:
      asNullableString(row.assigned_to) ?? fallback.assigneeProfileId ?? null,
    dueAt: asString(row.sla_due_at, fallback.dueAt),
    slaHoursRemaining: slaHoursRemaining(
      asNullableString(row.sla_due_at) ?? fallback.dueAt
    ),
    debtBlocked: requiresFinanceApproval,
    paymentVerified: !emergency && !requiresFinanceApproval,
    estimatedCostTry: Math.round(
      asNumber(row.estimated_cost_cents, fallback.estimatedCostTry * 100) / 100
    ),
    version,
    workflowState,
    approvalStatus,
    dispatchStatus: deriveDispatchState(
      workflowState,
      assignee,
      fallback.dispatchStatus
    ),
    paymentWorkflowStatus,
    severity: ticketSeverityForPriority(priority, emergency),
    emergency,
  }
  if (emergency) {
    ticket.paymentWorkflowStatus = emergencyPaymentStateForTicket(ticket)
  }
  return { source: "supabase", ticket, version }
}

function throwTicketRepositoryCommandError(error: unknown): never {
  const record = asRecord(error)
  const code = asString(record.code, "")
  const message = asString(record.message, "Ticket workflow command failed.")
  if (isMissingTicketWorkflowSchemaError(error)) {
    throw new TicketRepositoryError(
      "TICKET_WORKFLOW_UNAVAILABLE",
      "The hardened ticket workflow is not deployed in this environment.",
      503
    )
  }
  if (code === "40001" || /version conflict/i.test(message)) {
    throw new TicketRepositoryError(
      "TICKET_VERSION_CONFLICT",
      "The ticket changed after it was loaded. Refresh it before retrying.",
      409,
      { databaseCode: code }
    )
  }
  if (code === "23505" || /idempotency key/i.test(message)) {
    throw new TicketRepositoryError(
      "TICKET_IDEMPOTENCY_CONFLICT",
      "This idempotency key was already used for a different ticket command.",
      409,
      { databaseCode: code }
    )
  }
  if (/not found/i.test(message)) {
    throw new TicketRepositoryError(
      "TICKET_NOT_FOUND",
      "Ticket was not found.",
      404,
      { databaseCode: code }
    )
  }
  if (
    code === "42501" ||
    /permission|forbidden|(?:role|actor|account|user).{0,30}not allowed|^only .+ (?:may|can)|outside (?:the )?authorized|not the requester|not the unit owner/i.test(
      message
    )
  ) {
    throw new TicketRepositoryError(
      "TICKET_TRANSITION_FORBIDDEN",
      "Your account is not allowed to run this ticket command.",
      403,
      { databaseCode: code }
    )
  }
  if (
    /invalid transition|current state|already (?:approved|rejected|closed)|must be (?:accepted|approved)|not pending|approval (?:is )?(?:pending|rejected)|payment.{0,30}pending|cannot .{0,40}(?:state|approval|payment)/i.test(
      message
    )
  ) {
    throw new TicketRepositoryError(
      "TICKET_INVALID_TRANSITION",
      "The ticket command is not valid in its current workflow state.",
      409,
      { databaseCode: code }
    )
  }
  if (
    code === "22023" ||
    code === "23514" ||
    /invalid input|context|reason (?:is )?required|required field|must be provided/i.test(
      message
    )
  ) {
    throw new TicketRepositoryError(
      "TICKET_INPUT_INVALID",
      "The ticket command is missing required or valid workflow data.",
      422,
      { databaseCode: code }
    )
  }
  throw error
}

export async function createServiceTicket(
  input: CreateServiceTicketInput
): Promise<ServiceTicketMutationResult> {
  if (!isSupabaseConfigured() || isLocalTicketAccessProfile(input.actor)) {
    return localCreateServiceTicket(input)
  }

  const catalogItem = serviceCatalogItemForAction({
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    unitNo: input.unitNo,
  })
  const priority = ticketPriorityForDb(input.priority)
  const dueAt = ticketDueAt(priority, catalogItem.slaHours)
  const ticketNo = `TCK-${Date.now().toString(36).toUpperCase()}`

  try {
    const supabase = await createClient()
    const context = await resolveOperationalContext(supabase, {
      companyId: input.actor.companyId,
      unitNo: input.unitNo,
    })

    if (!input.idempotencyKey) {
      throw new TicketRepositoryError(
        "TICKET_WORKFLOW_UNAVAILABLE",
        "An idempotency key is required for ticket submission.",
        400
      )
    }
    const requestFingerprint = serviceTicketCreateFingerprint(input)

    const { data, error } = await supabase.rpc(
      "create_service_ticket_command",
      {
        p_idempotency_key: input.idempotencyKey,
        p_site_id: context.siteId,
        p_unit_id: context.unitId,
        p_title: input.title,
        p_description: input.description ?? null,
        p_category: input.category,
        p_priority: priority,
        p_resident_id: null,
        p_ticket_no: ticketNo,
        p_sla_due_at: dueAt,
        p_emergency_policy_code: input.emergencyPolicyCode ?? null,
        p_request_fingerprint: requestFingerprint,
      }
    )
    if (error) throwTicketRepositoryCommandError(error)

    const fallback = buildTicketViewFromInput({
      id: ticketNo,
      title: input.title,
      description: input.description,
      category: input.category,
      priority,
      status: "open",
      unitNo: context.unitNo,
      assignee: "Operations triage queue",
      requester:
        input.actor.displayName ?? input.actor.email ?? input.actor.role,
      requesterRole: input.actor.role,
      dueAt,
      estimatedCostTry: catalogItem.basePriceTry,
      version: "1",
      workflowState: "submitted",
      approvalStatus: "not_required",
      emergency: Boolean(input.emergencyPolicyCode),
    })
    return ticketMutationFromRpc(data, fallback)
  } catch (error) {
    if (error instanceof TicketRepositoryError) throw error
    throw error
  }
}

export async function replayServiceTicketMutation(
  input: UpdateServiceTicketInput
): Promise<ServiceTicketMutationResult | null> {
  if (!input.idempotencyKey) return null
  const requestFingerprint = serviceTicketMutationFingerprint(input)
  const idempotencyScope = `${input.actor.companyId ?? "local"}:${input.idempotencyKey}`

  if (!isSupabaseConfigured() || isLocalTicketAccessProfile(input.actor)) {
    return withLocalQaState(false, () => {
      const receipt = localTicketMutationIdempotency.get(idempotencyScope)
      if (!receipt) return null
      if (receipt.fingerprint !== requestFingerprint) {
        throw new TicketRepositoryError(
          "TICKET_IDEMPOTENCY_CONFLICT",
          "The idempotency key was already used for a different ticket command.",
          409
        )
      }
      return { ...receipt.result, replayed: true }
    })
  }

  const record = await getServiceTicketWorkflowRecord(input.ticketId)
  if (!record?.databaseId) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("service_ticket_transitions")
    .select("ticket_id, metadata")
    .eq("ticket_id", record.databaseId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle()
  if (error) {
    throw new TicketRepositoryError(
      "TICKET_WORKFLOW_UNAVAILABLE",
      "Ticket retry evidence could not be verified.",
      503,
      { databaseCode: error.code }
    )
  }
  if (!data) return null

  const metadata = asRecord(data.metadata)
  if (
    asString(data.ticket_id) !== record.databaseId ||
    asString(metadata.requestFingerprint) !== requestFingerprint
  ) {
    throw new TicketRepositoryError(
      "TICKET_IDEMPOTENCY_CONFLICT",
      "The idempotency key was already used for a different ticket command.",
      409
    )
  }

  return {
    source: "supabase",
    ticket: record.ticket,
    version: record.version,
    replayed: true,
  }
}

export async function updateServiceTicket(
  input: UpdateServiceTicketInput
): Promise<ServiceTicketMutationResult | null> {
  if (!isSupabaseConfigured() || isLocalTicketAccessProfile(input.actor)) {
    return localUpdateServiceTicket(input)
  }

  const record = await getServiceTicketWorkflowRecord(input.ticketId)
  if (!record?.databaseId) return null
  if (!input.idempotencyKey) {
    throw new TicketRepositoryError(
      "TICKET_WORKFLOW_UNAVAILABLE",
      "An idempotency key is required for ticket mutation.",
      400
    )
  }
  const expectedVersion = Number(input.expectedVersion ?? record.version)
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw new TicketRepositoryError(
      "TICKET_VERSION_CONFLICT",
      "A valid expected workflow version is required.",
      409
    )
  }
  const requestFingerprint = serviceTicketMutationFingerprint(input)

  const hasDetails =
    input.title !== undefined ||
    input.description !== undefined ||
    Boolean(input.clearDescription) ||
    input.category !== undefined ||
    input.priority !== undefined
  const supabase = await createClient()
  let data: unknown
  let error: unknown

  if (hasDetails) {
    const response = await supabase.rpc(
      "update_service_ticket_details_command",
      {
        p_ticket_id: record.databaseId,
        p_expected_version: expectedVersion,
        p_idempotency_key: input.idempotencyKey,
        p_title: input.title ?? null,
        p_description: input.description ?? null,
        p_clear_description: Boolean(input.clearDescription),
        p_category: input.category ?? null,
        p_priority: input.priority ? ticketPriorityForDb(input.priority) : null,
        p_reason: input.reason ?? null,
        p_metadata: {
          requestedByRole: input.actor.role,
          requestFingerprint,
        },
      }
    )
    data = response.data
    error = response.error
  } else if (input.command === "assign") {
    const response = await supabase.rpc("assign_service_ticket_command", {
      p_ticket_id: record.databaseId,
      p_expected_version: expectedVersion,
      p_assigned_profile_id: input.assigneeProfileId ?? null,
      p_assignment_label: input.assignee ?? null,
      p_idempotency_key: input.idempotencyKey,
      p_reason: input.reason ?? null,
      p_request_fingerprint: requestFingerprint,
    })
    data = response.data
    error = response.error
  } else if (
    input.command === "approve_owner_request" ||
    input.command === "reject_owner_request"
  ) {
    const response = await supabase.rpc(
      "decide_ticket_owner_approval_command",
      {
        p_ticket_id: record.databaseId,
        p_expected_version: expectedVersion,
        p_decision:
          input.command === "approve_owner_request" ? "approved" : "rejected",
        p_idempotency_key: input.idempotencyKey,
        p_reason: input.reason ?? null,
        p_request_fingerprint: requestFingerprint,
      }
    )
    data = response.data
    error = response.error
  } else if (input.command) {
    const commandAliases: Partial<Record<TicketCommand, string>> = {
      triage: "start_triage",
      accept: "accept",
      acknowledge: "acknowledge",
      start_work: "start_work",
      wait_for_resident: "wait_resident",
      resume_work: "resume_work",
      submit_for_review: "submit_for_review",
      request_owner_approval: "request_owner_approval",
      request_rework: "request_rework",
      approve_resolution: "resolve",
      close: "close",
      cancel: "cancel",
      reopen: "reopen",
    }
    const databaseCommand = commandAliases[input.command]
    if (!databaseCommand) {
      throw new TicketRepositoryError(
        "TICKET_WORKFLOW_UNAVAILABLE",
        `No database command is mapped for ${input.command}.`,
        422
      )
    }
    const response = await supabase.rpc(
      "execute_service_ticket_workflow_command",
      {
        p_ticket_id: record.databaseId,
        p_expected_version: expectedVersion,
        p_command: databaseCommand,
        p_idempotency_key: input.idempotencyKey,
        p_reason: input.reason ?? null,
        p_metadata: {
          requestedByRole: input.actor.role,
          requestFingerprint,
          workflowState: input.workflowState ?? null,
          dispatchStatus: input.dispatchStatus ?? null,
          paymentStatus: input.paymentStatus ?? null,
          transitionPurpose: record.emergency
            ? "emergency_containment"
            : "ordinary",
          ...(input.ownerApprovalContext ?? {}),
        },
      }
    )
    data = response.data
    error = response.error
  } else {
    throw new TicketRepositoryError(
      "TICKET_WORKFLOW_UNAVAILABLE",
      "A ticket command or versioned detail update is required.",
      422
    )
  }

  if (error) throwTicketRepositoryCommandError(error)
  const fallbackTicket: ServiceTicket = {
    ...record.ticket,
    workflowState: input.workflowState ?? record.workflowState,
    approvalStatus: input.approvalStatus ?? record.approvalStatus,
    dispatchStatus: input.dispatchStatus ?? record.dispatchStatus,
    paymentWorkflowStatus: record.emergency
      ? emergencyPaymentStateForTicket(record.ticket)
      : (input.paymentStatus ?? record.paymentStatus),
    assignee:
      input.command === "assign"
        ? (input.assignee ??
          (input.assigneeProfileId
            ? "Assigned responder"
            : record.ticket.assignee))
        : record.ticket.assignee,
    assigneeProfileId:
      input.command === "assign"
        ? (input.assigneeProfileId ?? null)
        : record.assignedTo,
  }
  return ticketMutationFromRpc(data, fallbackTicket)
}

function bookingStatusForView(
  record: Record<string, unknown>
): BookingRecord["status"] {
  const status = asString(record.status, "scheduled")
  const checkInAt = asNullableString(record.check_in_at)
  const checkOutAt = asNullableString(record.check_out_at)
  const now = Date.now()
  const checkIn = checkInAt ? new Date(checkInAt).getTime() : Number.NaN
  const checkOut = checkOutAt ? new Date(checkOutAt).getTime() : Number.NaN
  const dayMs = 86_400_000

  if (status === "cancelled" || status === "no_show") return "cancelled"
  if (status === "checked_out") return "deposit_review"
  if (status === "checked_in") return "move_in_today"
  if (Number.isFinite(checkOut) && Math.abs(checkOut - now) <= dayMs)
    return "checkout_today"
  if (Number.isFinite(checkIn) && Math.abs(checkIn - now) <= dayMs)
    return "move_in_today"
  if (Number.isFinite(checkIn) && checkIn > now) return "precheck_pending"
  return "confirmed"
}

function reservationAccessForView(
  value: unknown
): BookingRecord["accessCodeStatus"] {
  const status = asString(value, "pending")
  if (status === "issued" || status === "active") return "active"
  if (status === "revoked" || status === "expired" || status === "restricted")
    return "restricted"
  if (status === "disabled") return "disabled"
  return "pending"
}

function reservationDepositForView(
  value: unknown
): BookingRecord["depositStatus"] {
  const status = asString(value, "not_required")
  if (status === "held") return "held"
  if (status === "pending" || status === "reserved") return "reserved"
  if (status === "deducted") return "deduction_pending"
  if (status === "released" || status === "refund_ready") return "refund_ready"
  return "not_required"
}

function reservationCleaningForView(
  value: unknown
): BookingRecord["cleaningStatus"] {
  const status = asString(value, "pending")
  if (status === "done") return "done"
  if (status === "blocked") return "blocked"
  if (status === "assigned" || status === "in_progress") return "in_progress"
  return "scheduled"
}

function normalizeBookingRows(rows: unknown, limit: number): BookingRecord[] {
  if (!Array.isArray(rows)) return []

  return rows.slice(0, limit).map((row, index) => {
    const record = asRecord(row)
    const unit = relatedRecord(record.units)
    const id = asString(record.id, `BKG-LIVE-${index + 1}`)

    return {
      id,
      flatId: asString(unit.id, asString(record.unit_id, `unit-${index + 1}`)),
      flatNumber: asString(unit.unit_no, "Unassigned"),
      guestName: asString(record.guest_name, "Portal reservation"),
      resourceName: asNullableString(record.resource_name) ?? "Amenity",
      notes: asNullableString(record.notes),
      approvalStatus:
        asNullableString(record.approval_status) === "rejected"
          ? "rejected"
          : asNullableString(record.approval_status) === "pending_owner"
            ? "pending_owner"
            : "approved",
      channel: "Direct",
      checkIn: asString(record.check_in_at, new Date().toISOString()),
      checkOut: asString(
        record.check_out_at,
        new Date(Date.now() + 3_600_000).toISOString()
      ),
      status: bookingStatusForView(record),
      depositStatus: reservationDepositForView(record.deposit_status),
      depositTry:
        reservationDepositForView(record.deposit_status) === "not_required"
          ? 0
          : 5000,
      accessCodeStatus: reservationAccessForView(record.access_code_status),
      cleaningStatus: reservationCleaningForView(record.cleaning_status),
    }
  })
}

function summarizeBookingOperations(
  records: BookingRecord[]
): BookingOperationsData["summary"] {
  return {
    totalBookings: records.filter((booking) => booking.status !== "cancelled")
      .length,
    moveInsToday: records.filter(
      (booking) => booking.status === "move_in_today"
    ).length,
    checkoutsToday: records.filter(
      (booking) => booking.status === "checkout_today"
    ).length,
    readinessBlocked: bookingReadinessRecords.filter(
      (record) => record.riskLevel === "critical" || record.riskLevel === "high"
    ).length,
    averageReadiness: Math.round(
      bookingReadinessRecords.reduce(
        (sum, record) => sum + record.readinessScore,
        0
      ) / Math.max(bookingReadinessRecords.length, 1)
    ),
    turnoverTasks: turnoverTasks.length,
    blockedTurnoverTasks: turnoverTasks.filter(
      (task) => task.status === "blocked"
    ).length,
    accessPending: records.filter(
      (booking) =>
        booking.accessCodeStatus === "pending" ||
        booking.accessCodeStatus === "restricted"
    ).length,
    settlementsOpen: depositSettlements.filter(
      (settlement) => settlement.status !== "closed"
    ).length,
    settlementExposureTry: depositSettlements.reduce(
      (sum, settlement) => sum + settlement.depositTry,
      0
    ),
  }
}

function buildBookingOperationsData({
  source,
  bookings: bookingRows,
  warning,
}: {
  source: DataSource
  bookings: BookingRecord[]
  warning?: string
}): BookingOperationsData {
  return {
    contractVersion: "phase-10-booking-operations.v1",
    source,
    providerMode: source === "supabase" ? "supabase" : "simulation",
    generatedAt: new Date().toISOString(),
    summary: summarizeBookingOperations(bookingRows),
    bookings: bookingRows,
    readinessQueue: bookingReadinessRecords,
    turnoverTasks,
    accessHandoffs,
    depositSettlements,
    quality: {
      availabilityGuard:
        "unit window conflict checked before portal reservation insert",
      settlementMath: "itemized_demo",
      accessSafety: "manual_approval_before_live_provider",
      liveProviderConnected: source === "supabase",
    },
    warning,
  }
}

function localSeedBookingOperationsData(
  limit = 24,
  warning?: string
): BookingOperationsData {
  return buildBookingOperationsData({
    source: "local-seed",
    bookings: localMergedBookings(limit),
    warning,
  })
}

function localCreateReservation(
  input: CreateReservationInput
): ReservationMutationResult {
  const existingConflict = localMergedBookings(100).some((booking) => {
    if (booking.resourceName !== input.resourceName) return false
    if (booking.status === "cancelled") return false
    if (booking.approvalStatus === "rejected") return false
    return (
      new Date(booking.checkIn).getTime() <
        new Date(input.checkOutAt).getTime() &&
      new Date(booking.checkOut).getTime() > new Date(input.checkInAt).getTime()
    )
  })

  if (existingConflict) {
    throw new Error("Reservation window is already occupied.")
  }

  const booking: BookingRecord = {
    id: `RSV-${Date.now().toString(36).toUpperCase()}-${localMaterializedBookings.length + 1}`,
    flatId: `unit-${input.unitNo}`,
    flatNumber: input.unitNo,
    guestName: `${input.guestName} - ${input.resourceName}`,
    resourceName: input.resourceName,
    notes: input.notes ?? null,
    approvalStatus:
      input.actor.role === "tenant" ? "pending_owner" : "approved",
    channel: "Direct",
    checkIn: input.checkInAt,
    checkOut: input.checkOutAt,
    status: "precheck_pending",
    depositStatus: "not_required",
    depositTry: 0,
    accessCodeStatus: "pending",
    cleaningStatus: "scheduled",
  }

  localMaterializedBookings.unshift(booking)

  return {
    source: "local-seed",
    booking,
  }
}

export async function getBookingOperationsData({
  limit = 50,
}: {
  limit?: number
} = {}): Promise<BookingOperationsData> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)

  if (!isSupabaseConfigured()) {
    return localSeedBookingOperationsData(
      safeLimit,
      "External data service is not configured; using local booking seed data."
    )
  }

  try {
    const workspace = await getBookingLifecycleWorkspace()
    const data = roleProjectedReservationRows(workspace).slice(0, safeLimit)

    const liveBookings = normalizeBookingRows(data, safeLimit)
    const mergedBookings =
      liveBookings.length > 0
        ? [
            ...localMaterializedBookings,
            ...liveBookings.filter(
              (booking) =>
                !localMaterializedBookings.some(
                  (localBooking) => localBooking.id === booking.id
                )
            ),
          ].slice(0, safeLimit)
        : localMergedBookings(safeLimit)

    return buildBookingOperationsData({
      source: liveBookings.length > 0 ? "supabase" : "local-seed",
      bookings: mergedBookings,
      warning:
        liveBookings.length > 0
          ? undefined
          : "No live reservations returned; local seed bookings are shown.",
    })
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return localSeedBookingOperationsData(
        safeLimit,
        "Live booking query failed; local seed data is available for this environment."
      )
    }
    throw error
  }
}

export async function createReservation(
  input: CreateReservationInput
): Promise<ReservationMutationResult> {
  if (!isSupabaseConfigured()) {
    // Persist through the shared QA state so the conflict scan hydrates prior
    // reservations and the new booking survives later hydrations (otherwise a
    // subsequent read overwrites this in-memory-only write and cross-unit
    // shared-resource conflicts are missed).
    return withLocalQaState(true, () => localCreateReservation(input))
  }

  try {
    const workspace = await getBookingLifecycleWorkspace()
    const resource = workspace.resources.find((value) => {
      const row = asRecord(value)
      return (
        asString(row.name).localeCompare(input.resourceName, undefined, {
          sensitivity: "accent",
        }) === 0
      )
    })
    if (!resource) throw new Error("The requested resource is not bookable.")

    const resourceRow = asRecord(resource)
    const siteId = asString(resourceRow.siteId)
    const unit = workspace.eligibleUnits.find((value) => {
      const row = asRecord(value)
      return (
        asString(row.siteId) === siteId && asString(row.label) === input.unitNo
      )
    })
    const unitId = unit ? asString(asRecord(unit).id) : ""
    if (!unitId)
      throw new Error("The requested unit is outside the booking scope.")

    const eligibleResidentsForUnit = workspace.eligibleResidents.filter(
      (value) => {
        const row = asRecord(value)
        return asString(row.unitId) === unitId
      }
    )
    const primaryResidents = eligibleResidentsForUnit.filter((value) =>
      asBoolean(asRecord(value).isPrimary)
    )
    const resident =
      primaryResidents.length === 1
        ? primaryResidents[0]
        : eligibleResidentsForUnit.length === 1
          ? eligibleResidentsForUnit[0]
          : undefined
    const residentId = resident ? asString(asRecord(resident).id) : ""
    if (!residentId) {
      throw new Error(
        "The requested unit needs one eligible primary resident before a reservation can be created."
      )
    }

    const requestFingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          actor: input.actor.id,
          resourceId: asString(resourceRow.id),
          unitId,
          residentId,
          guestName: input.guestName,
          startsAt: input.checkInAt,
          endsAt: input.checkOutAt,
        })
      )
      .digest("hex")
    const hold = await createBookingHold({
      resourceId: asString(resourceRow.id),
      unitId,
      residentId,
      partySize: 1,
      startsAt: input.checkInAt,
      endsAt: input.checkOutAt,
      waitlistIfFull: false,
      idempotencyKey: `legacy-booking-hold:${requestFingerprint}`,
    })
    if (hold.entityType !== "hold")
      throw new Error("The requested reservation window is unavailable.")

    const committed = await commitResourceBooking({
      holdId: hold.holdId ?? hold.entityId,
      expectedVersion: hold.version,
      guestName: input.guestName,
      notes: input.notes ?? null,
      idempotencyKey: `legacy-booking-commit:${requestFingerprint}`,
    })
    const refreshed = await getBookingLifecycleWorkspace(siteId)
    const reservationId = committed.reservationId ?? committed.entityId
    const data = roleProjectedReservationRows(refreshed).find(
      (row) => asString(row.id) === reservationId
    )
    const booking = normalizeBookingRows(data ? [data] : [], 1)[0]
    if (!booking)
      throw new Error("Reservation was created but could not be normalized.")

    return {
      source: "supabase",
      booking,
    }
  } catch (error) {
    if (canUseLocalSeedFallback())
      return withLocalQaState(true, () => localCreateReservation(input))
    throw error
  }
}

export async function updateReservationApproval(
  input: UpdateReservationApprovalInput
): Promise<ReservationMutationResult | null> {
  const local = localMaterializedBookings.find(
    (booking) => booking.id === input.reservationId
  )
  if (!isSupabaseConfigured()) {
    // Hydrate the shared QA state, then mutate and persist so an approval/rejection
    // survives later hydrations (a rejected slot must stay rejected so it frees up
    // for a same-resource replacement booking).
    return withLocalQaState(true, () => {
      const current = localMaterializedBookings.find(
        (item) => item.id === input.reservationId
      )
      if (!current) return null
      const booking = {
        ...current,
        approvalStatus: input.approvalStatus,
        status:
          input.approvalStatus === "rejected"
            ? ("cancelled" as const)
            : current.status,
      }
      localMaterializedBookings[
        localMaterializedBookings.findIndex((item) => item.id === current.id)
      ] = booking
      return { source: "local-seed", booking }
    })
  }

  if (!isUuid(input.reservationId)) return null

  try {
    const workspace = await getBookingLifecycleWorkspace()
    const current = workspace.bookings.find(
      (value) => asString(asRecord(value).id) === input.reservationId
    )
    if (!current) return null
    const currentRow = asRecord(current)
    const expectedVersion = asNumber(currentRow.version)
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1)
      throw new Error("Reservation version is unavailable.")

    await decideResourceBooking({
      reservationId: input.reservationId,
      expectedVersion,
      decision: input.approvalStatus === "approved" ? "approve" : "reject",
      reason:
        input.approvalStatus === "rejected"
          ? "Rejected through the role-projected booking adapter."
          : "Approved through the role-projected booking adapter.",
      idempotencyKey: `legacy-booking-decision:${input.reservationId}:${expectedVersion}:${input.approvalStatus}`,
    })
    const refreshed = await getBookingLifecycleWorkspace()
    const data = roleProjectedReservationRows(refreshed).find(
      (row) => asString(row.id) === input.reservationId
    )
    const booking = normalizeBookingRows(data ? [data] : [], 1)[0]
    return booking ? { source: "supabase", booking } : null
  } catch (error) {
    if (canUseLocalSeedFallback() && local)
      return {
        source: "local-seed",
        booking: {
          ...local,
          approvalStatus: input.approvalStatus,
          status:
            input.approvalStatus === "rejected" ? "cancelled" : local.status,
        },
      }
    throw error
  }
}

export async function logClientAction(
  input: ClientActionInput
): Promise<ClientActionResult> {
  if (!isSupabaseConfigured() || input.useLocalAccessProfile) {
    return storeLocalClientAction(input)
  }

  try {
    const supabase = await createClient()
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
      return storeLocalClientAction(input)
    }
    throw error
  }
}

export async function getClientActionRequest(
  id: string,
  { useLocalAccessProfile = false }: { useLocalAccessProfile?: boolean } = {}
): Promise<ClientActionRequestRecord | null> {
  const localAction = withLocalQaState(false, () =>
    localClientActionRequests.get(id)
  )
  if (localAction) return localAction

  if (useLocalAccessProfile || !isSupabaseConfigured() || !isUuid(id))
    return null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("client_action_requests")
      .select(
        "id, company_id, action_type, entity_table, entity_id, entity_external_id, title, status, requested_by, metadata, created_at"
      )
      .eq("id", id)
      .single()

    if (error) throw error
    return normalizeActionRequestRow(data)
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return withLocalQaState(
        false,
        () => localClientActionRequests.get(id) ?? null
      )
    }
    throw error
  }
}

export async function materializeApprovedTicketRequest({
  request,
  actor,
  idempotencyKey,
}: {
  request: ClientActionRequestRecord
  actor: TicketMutationActor
  idempotencyKey?: string | null
}): Promise<ServiceTicketMutationResult | null> {
  if (!isTicketCreateRequest(request)) return null

  const useLocalAccessProfile = isLocalTicketAccessProfile(actor)
  const existingTicketId = materializedTicketIdFromAction(request)
  if (existingTicketId) {
    const existing = await getServiceTicketWorkflowRecord(existingTicketId, {
      useLocalAccessProfile,
    })
    return existing
      ? {
          source:
            useLocalAccessProfile || !isSupabaseConfigured()
              ? "local-seed"
              : "supabase",
          ticket: existing.ticket,
          version: existing.version,
          replayed: true,
        }
      : null
  }

  const proposedPayload = actionProposedPayload(request)
  const routingSuggestion = asRecord(request.metadata.routingSuggestion)
  const proposedEmergencyPolicyCode = asNullableString(
    routingSuggestion.emergencyPolicyCode
  )
  const emergencyPolicyCodes = new Set([
    "life_safety",
    "fire_smoke",
    "gas_leak",
    "medical_emergency",
    "electrical_hazard",
    "elevator_entrapment",
    "flooding_active",
    "security_threat",
  ])
  const emergencyPolicyCode =
    proposedEmergencyPolicyCode &&
    emergencyPolicyCodes.has(proposedEmergencyPolicyCode)
      ? proposedEmergencyPolicyCode
      : null
  const persistedIdempotencyKey =
    idempotencyKey ??
    asNullableString(request.metadata.idempotencyKey) ??
    `ticket-action:${request.id}`

  return createServiceTicket({
    title: ticketTitleFromAction(request),
    description: asNullableString(proposedPayload.description),
    category: asString(proposedPayload.category, "general"),
    priority: emergencyPolicyCode
      ? "urgent"
      : ticketPriorityForView(proposedPayload.priority),
    unitNo: asNullableString(proposedPayload.unitNo),
    assignee: null,
    suggestedAssignee: asNullableString(routingSuggestion.assignee),
    requiresOwnerApproval: false,
    emergency: Boolean(emergencyPolicyCode),
    emergencyPolicyCode,
    routingReason:
      asNullableString(routingSuggestion.reason) ??
      "AI draft approved for ordinary human triage",
    idempotencyKey: persistedIdempotencyKey,
    actor,
  })
}

function roleProjectedReservationRows(
  workspace: BookingLifecycleWorkspace
): Record<string, unknown>[] {
  const unitLabels = new Map(
    workspace.eligibleUnits.map((value) => {
      const unit = asRecord(value)
      return [
        asString(unit.id),
        asString(unit.label, "Authorized unit"),
      ] as const
    })
  )

  return workspace.bookings.map((value) => {
    const booking = asRecord(value)
    const lifecycle = asString(booking.lifecycleStatus, "requested")
    const approval = asString(booking.approvalState, "not_required")
    const deposit = asString(booking.depositTruthState, "not_required")
    const access = asString(
      booking.accessPreparationState,
      "blocked_until_confirmed"
    )
    const unitId = asString(booking.unitId)
    const status =
      lifecycle === "checked_in"
        ? "checked_in"
        : lifecycle === "completed"
          ? "checked_out"
          : lifecycle === "cancelled" ||
              lifecycle === "no_show" ||
              lifecycle === "rejected" ||
              lifecycle === "revoked"
            ? "cancelled"
            : "scheduled"

    return {
      id: booking.id,
      unit_id: unitId || null,
      guest_name: booking.guestName ?? null,
      resource_name: booking.resourceName ?? "Amenity",
      check_in_at: booking.startsAt,
      check_out_at: booking.endsAt,
      status,
      approval_status:
        approval === "rejected"
          ? "rejected"
          : approval === "pending_owner" || approval === "pending_manager"
            ? "pending_owner"
            : "approved",
      access_code_status: access === "revoked" ? "revoked" : "pending",
      cleaning_status: "pending",
      deposit_status:
        deposit === "not_required"
          ? "not_required"
          : deposit === "manual_verified"
            ? "held"
            : "pending",
      units: unitId
        ? { id: unitId, unit_no: unitLabels.get(unitId) ?? "Authorized unit" }
        : null,
    }
  })
}
export async function updateClientActionRequestStatus({
  id,
  status,
  metadata,
  useLocalAccessProfile = false,
}: {
  id: string
  status: "approved" | "rejected" | "completed" | "failed"
  metadata?: Record<string, unknown>
  useLocalAccessProfile?: boolean
}): Promise<ClientActionResult> {
  const localResult = withLocalQaState(true, () => {
    const localAction = localClientActionRequests.get(id)
    if (!localAction) return null
    localClientActionRequests.set(id, {
      ...localAction,
      status,
      metadata: metadata ?? localAction.metadata,
    })
    return { id, source: "local-seed" as const, status }
  })
  if (localResult) return localResult

  if (useLocalAccessProfile || !isSupabaseConfigured() || !isUuid(id)) {
    return {
      id,
      source: "local-seed",
      status,
    }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("client_action_requests")
      .update(metadata ? { status, metadata } : { status })
      .eq("id", id)
      .select("id")
      .single()

    if (error) throw error

    return {
      id: typeof data?.id === "string" ? data.id : id,
      source: "supabase",
      status,
    }
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return {
        id,
        source: "local-seed",
        status,
      }
    }
    throw error
  }
}

export interface PublicIntakeResult {
  reference: string
  source: DataSource
  status: "received"
}

export interface PublicReportInput {
  category: string
  zone: string
  description: string
  contact?: string | null
  language?: string | null
  consent: boolean
  metadata?: Record<string, unknown>
}

export interface PublicAiInterestInput {
  topic: string
  language?: string | null
  question: string
  answeredBy: "public-knowledge" | "local-ai"
  page?: string | null
  outcome?: string | null
  confidence?: number | null
  shouldEscalate?: boolean
  responseMs?: number | null
  sourceIds?: string[]
  evaluation?: unknown
}

export interface PublicAiEscalationInput {
  topic: string
  language?: string | null
  answeredBy: "public-knowledge" | "local-ai"
  page?: string | null
  outcome?: string | null
  reason?: string | null
  confidence?: number | null
  responseMs?: number | null
  sourceIds?: string[]
}

export interface PublicAiFeedbackInput {
  rating: "positive" | "negative"
  topic?: string | null
  language?: string | null
  answeredBy?: "public-knowledge" | "local-ai" | null
  page?: string | null
  outcome?: string | null
  confidence?: number | null
  responseMs?: number | null
  sourceIds?: string[]
  chatReference?: string | null
}

function publicIntakeReference(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6)
  return `${prefix}-${stamp}`
}

async function submitPublicIntake(
  actionType: string,
  title: string,
  metadata: Record<string, unknown>,
  referencePrefix: string
): Promise<PublicIntakeResult> {
  if (!isSupabaseConfigured()) {
    return {
      reference: publicIntakeReference(referencePrefix),
      source: "local-seed",
      status: "received",
    }
  }

  try {
    const supabase = await createDataClient()
    const { data, error } = await supabase.rpc("submit_public_intake", {
      p_action_type: actionType,
      p_title: title,
      p_metadata: metadata,
    })
    if (error) throw error
    return {
      reference:
        typeof data === "string"
          ? data
          : publicIntakeReference(referencePrefix),
      source: "supabase",
      status: "received",
    }
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return {
        reference: publicIntakeReference(referencePrefix),
        source: "local-seed",
        status: "received",
      }
    }
    throw error
  }
}

export async function submitPublicReport(
  input: PublicReportInput
): Promise<PublicIntakeResult> {
  const metadata: Record<string, unknown> = {
    verified: false,
    reportSource: "public",
    category: input.category,
    zone: input.zone,
    description: input.description,
    contact: input.contact ?? null,
    language: input.language ?? null,
    consent: input.consent,
    channel: "new-level-premium-landing",
    ...(input.metadata ?? {}),
  }

  return submitPublicIntake(
    "public.report",
    `Public report - ${input.category} @ ${input.zone}`,
    metadata,
    "NLP-RPT"
  )
}

export async function logPublicAiInterest(
  input: PublicAiInterestInput
): Promise<PublicIntakeResult> {
  const metadata: Record<string, unknown> = {
    kind: "ai_interest",
    topic: input.topic,
    language: input.language ?? null,
    questionLength: input.question.length,
    redactedQuestionPreview: input.question,
    answeredBy: input.answeredBy,
    outcome: input.outcome ?? null,
    confidence: input.confidence ?? null,
    shouldEscalate: input.shouldEscalate === true,
    responseMs: input.responseMs ?? null,
    sourceIds: input.sourceIds ?? [],
    evaluation: input.evaluation ?? null,
    page: input.page ?? null,
    channel: "landing-concierge",
  }

  return submitPublicIntake(
    "public.ai_question",
    `AI interest - ${input.topic}`,
    metadata,
    "NLP-AIQ"
  )
}

export async function logPublicAiEscalation(
  input: PublicAiEscalationInput
): Promise<PublicIntakeResult> {
  const metadata: Record<string, unknown> = {
    kind: "ai_escalation",
    topic: input.topic,
    language: input.language ?? null,
    answeredBy: input.answeredBy,
    outcome: input.outcome ?? null,
    reason: input.reason ?? null,
    confidence: input.confidence ?? null,
    responseMs: input.responseMs ?? null,
    sourceIds: input.sourceIds ?? [],
    page: input.page ?? null,
    channel: "landing-concierge",
  }

  return submitPublicIntake(
    "public.ai_escalation",
    `AI escalation - ${input.topic}`,
    metadata,
    "NLP-AIE"
  )
}

export async function logPublicAiFeedback(
  input: PublicAiFeedbackInput
): Promise<PublicIntakeResult> {
  const metadata: Record<string, unknown> = {
    kind: "ai_feedback",
    rating: input.rating,
    resolved: input.rating === "positive",
    topic: input.topic ?? null,
    language: input.language ?? null,
    answeredBy: input.answeredBy ?? null,
    outcome: input.outcome ?? null,
    confidence: input.confidence ?? null,
    responseMs: input.responseMs ?? null,
    sourceIds: input.sourceIds ?? [],
    chatReference: input.chatReference ?? null,
    page: input.page ?? null,
    channel: "landing-concierge",
  }

  return submitPublicIntake(
    "public.ai_feedback",
    `AI feedback - ${input.rating}`,
    metadata,
    "NLP-AIF"
  )
}
