import { randomUUID } from "node:crypto"
import {
  closeSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  isAccessProfileEnabled,
  isSupabaseConfigured,
  type UserProfile,
} from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { EUR_TRY_RATE } from "@/lib/currency"
import {
  ACCOUNTANT_FINANCE_BLOCKS,
  CREDIT_SUBJECT_ORDER,
  activityBookingSpendSeed,
  bankStatementsSeed,
  costEntriesSeed,
  creditBalancesSeed,
  invoiceCreditOffsetsSeed,
  serviceProviderInvoicesSeed,
  vendorSubmittedInvoicesSeed,
  walletCreditByRoleSeed,
  walletTopUpsThisPeriodSeed,
  type CreditSubjectType,
  type FinanceCurrency,
  type InvoiceStatus,
} from "@/lib/accountant-finance-data"
import type { VendorSubmissionStatus } from "@/lib/vendor-invoice-data"

export const ACCOUNTANT_FINANCE_CONTRACT_VERSION = "accountant-finance.v1" as const
export const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export type AccountantFinanceSource = "supabase" | "local-seed"

export interface AccountantFinanceInvoice {
  id: string
  providerName: string | null
  vendorId: string | null
  block: string | null
  invoiceNo: string
  amountCents: number
  offsetCents: number
  openCents: number
  currency: FinanceCurrency
  status: InvoiceStatus
  issuedAt: string | null
  dueAt: string | null
  notes: string | null
}

export interface AccountantFinanceCreditBalance {
  id: string
  subjectType: CreditSubjectType
  subjectRef: string
  providerName: string | null
  block: string | null
  amountCents: number
  currency: FinanceCurrency
}

export interface AccountantFinanceBankLine {
  id: string
  bookedAt: string
  description: string
  amountCents: number
  direction: "credit" | "debit"
}

export interface AccountantFinanceBankStatement {
  id: string
  statementDate: string
  bankName: string
  reference: string
  openingBalanceCents: number
  closingBalanceCents: number
  currency: FinanceCurrency
  netCents: number
  lines: AccountantFinanceBankLine[]
}

export interface AccountantFinanceOffset {
  id: string
  invoiceId: string
  invoiceNo: string
  creditBalanceId: string
  amountCents: number
  currency: FinanceCurrency
  reason: string | null
  createdAt: string
}

export interface AccountantFinanceBlockRow {
  block: string
  creditTryCents: number
  costTryCents: number
}

export interface AccountantFinanceRoleRow {
  role: CreditSubjectType
  creditTryCents: number
  costTryCents: number
}

export interface AccountantFinanceTotals {
  grossInvoicesTryCents: number
  openInvoicesTryCents: number
  invoiceCount: number
  openInvoiceCount: number
  creditTryCents: number
  costTryCents: number
  bankInflowTryCents: number
  bankOutflowTryCents: number
  bankStatementCount: number
}

// --------------------------------------------------------------------------
// Phase-7 (accountant sync): the money the new guest / vendor / child roles move
// (wallet credit + top-ups, activity-booking spend, vendor-submitted invoices),
// folded back into the accountant view so "everything is connected". All figures
// are TRY-normalized minor units for aggregation (individual currencies are kept
// where they still matter), consistent with byBlock / byRole above.
// --------------------------------------------------------------------------

export interface AccountantWalletRoleRow {
  /** Business role of the wallet owner (guest, service_provider, child_*, ...). */
  role: string
  creditTryCents: number
  walletCount: number
}

export interface AccountantWalletCredit {
  /** Outstanding user-wallet credit grouped by the owner's role. */
  byRole: AccountantWalletRoleRow[]
  totalUserCreditTryCents: number
  userWalletCount: number
  /** Gross top-ups posted this period. */
  topUpsTryCents: number
  topUpCount: number
  periodStart: string | null
}

export interface AccountantActivitySpend {
  totalSpendTryCents: number
  bookingCount: number
}

export interface AccountantVendorInvoice {
  id: string
  invoiceNo: string
  providerName: string | null
  /** Vendor-owned lifecycle (submitted / in_review / approved / ...). */
  submissionStatus: VendorSubmissionStatus
  /** Accountant-owned offset lifecycle; read-only here. */
  accountingStatus: InvoiceStatus
  totalCents: number
  currency: FinanceCurrency
  issuedAt: string | null
}

export interface AccountantVendorSubmissions {
  /** Vendor-issued invoices in the submission lifecycle (awaiting + approved). */
  invoices: AccountantVendorInvoice[]
  /** submitted + in_review, i.e. awaiting an accounting decision. */
  awaitingCount: number
  approvedCount: number
  awaitingTotalTryCents: number
}

export interface AccountantMoneyMovement {
  walletCredit: AccountantWalletCredit
  activitySpend: AccountantActivitySpend
  vendorSubmissions: AccountantVendorSubmissions
}

export interface AccountantFinanceOverview {
  contractVersion: typeof ACCOUNTANT_FINANCE_CONTRACT_VERSION
  source: AccountantFinanceSource
  generatedAt: string
  capabilities: { canOffset: boolean; readOnly: boolean }
  invoices: AccountantFinanceInvoice[]
  creditBalances: AccountantFinanceCreditBalance[]
  providerCredits: AccountantFinanceCreditBalance[]
  byBlock: AccountantFinanceBlockRow[]
  blockTotal: { creditTryCents: number; costTryCents: number }
  byRole: AccountantFinanceRoleRow[]
  bankStatements: AccountantFinanceBankStatement[]
  offsets: AccountantFinanceOffset[]
  totals: AccountantFinanceTotals
  /** Phase-7: wallet / activity / vendor money the new roles move. */
  moneyMovement: AccountantMoneyMovement
  warning?: string
}

export interface ApplyOffsetInput {
  invoiceId: string
  creditBalanceId: string
  amountCents: number
  reason: string | null
}

export interface ApplyOffsetResult {
  source: AccountantFinanceSource
  offset: AccountantFinanceOffset
  invoice: AccountantFinanceInvoice
  creditBalance: AccountantFinanceCreditBalance
}

export class AccountantFinanceDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "AccountantFinanceDomainError"
  }
}

interface CostEntry {
  block: string | null
  role: CreditSubjectType
  amountCents: number
  currency: FinanceCurrency
}

interface RawFinanceState {
  invoices: AccountantFinanceInvoice[]
  creditBalances: AccountantFinanceCreditBalance[]
  costEntries: CostEntry[]
  bankStatements: AccountantFinanceBankStatement[]
  offsets: AccountantFinanceOffset[]
}

const LEDGER_COST_ENTRY_TYPES = [
  "service_charge",
  "penalty",
  "adjustment",
  "refund",
]

function canWrite(role: UserProfile["role"]) {
  return role === "admin" || role === "accountant"
}

function canView(role: UserProfile["role"]) {
  return canWrite(role) || role === "manager"
}

function normalizeCurrency(value: unknown): FinanceCurrency {
  return value === "EUR" ? "EUR" : "TRY"
}

/** Normalize any native amount to Turkish Lira minor units for aggregation, so
 * mixed-currency block/role totals are meaningful. Individual rows keep their
 * own native currency. */
function toTryCents(cents: number, currency: FinanceCurrency) {
  return currency === "EUR" ? Math.round(cents * EUR_TRY_RATE) : cents
}

function deriveInvoiceStatus(
  seedStatus: InvoiceStatus,
  amountCents: number,
  offsetCents: number
): InvoiceStatus {
  if (seedStatus === "void") return "void"
  if (offsetCents >= amountCents) return "paid"
  if (offsetCents > 0) return "partially_offset"
  return "open"
}

// --------------------------------------------------------------------------
// Phase-7 money-movement helpers (wallet / activity / vendor).
// --------------------------------------------------------------------------

function normalizeSubmissionStatus(value: unknown): VendorSubmissionStatus {
  return value === "submitted" ||
    value === "in_review" ||
    value === "approved" ||
    value === "declined"
    ? value
    : "draft"
}

function isAwaitingSubmission(status: VendorSubmissionStatus) {
  return status === "submitted" || status === "in_review"
}

function buildVendorSubmissions(
  invoices: AccountantVendorInvoice[]
): AccountantVendorSubmissions {
  const awaiting = invoices.filter((invoice) =>
    isAwaitingSubmission(invoice.submissionStatus)
  )
  return {
    invoices,
    awaitingCount: awaiting.length,
    approvedCount: invoices.filter(
      (invoice) => invoice.submissionStatus === "approved"
    ).length,
    awaitingTotalTryCents: awaiting.reduce(
      (sum, invoice) => sum + toTryCents(invoice.totalCents, invoice.currency),
      0
    ),
  }
}

function emptyMoneyMovement(): AccountantMoneyMovement {
  return {
    walletCredit: {
      byRole: [],
      totalUserCreditTryCents: 0,
      userWalletCount: 0,
      topUpsTryCents: 0,
      topUpCount: 0,
      periodStart: null,
    },
    activitySpend: { totalSpendTryCents: 0, bookingCount: 0 },
    vendorSubmissions: {
      invoices: [],
      awaitingCount: 0,
      approvedCount: 0,
      awaitingTotalTryCents: 0,
    },
  }
}

function buildLocalMoneyMovement(): AccountantMoneyMovement {
  const roleTotals = new Map<
    string,
    { creditTryCents: number; walletCount: number }
  >()
  for (const seed of walletCreditByRoleSeed) {
    const current = roleTotals.get(seed.role) ?? {
      creditTryCents: 0,
      walletCount: 0,
    }
    current.creditTryCents += toTryCents(seed.balanceCents, seed.currency)
    current.walletCount += seed.walletCount
    roleTotals.set(seed.role, current)
  }
  const byRole: AccountantWalletRoleRow[] = Array.from(roleTotals.entries())
    .map(([role, value]) => ({ role, ...value }))
    .sort((left, right) => right.creditTryCents - left.creditTryCents)

  const vendorInvoices: AccountantVendorInvoice[] =
    vendorSubmittedInvoicesSeed.map((seed) => ({
      id: seed.id,
      invoiceNo: seed.invoiceNo,
      providerName: seed.providerName,
      submissionStatus: seed.submissionStatus,
      accountingStatus: seed.accountingStatus,
      totalCents: seed.totalCents,
      currency: seed.currency,
      issuedAt: seed.issuedAt,
    }))

  return {
    walletCredit: {
      byRole,
      totalUserCreditTryCents: walletCreditByRoleSeed.reduce(
        (sum, seed) => sum + toTryCents(seed.balanceCents, seed.currency),
        0
      ),
      userWalletCount: walletCreditByRoleSeed.reduce(
        (sum, seed) => sum + seed.walletCount,
        0
      ),
      topUpsTryCents: walletTopUpsThisPeriodSeed.reduce(
        (sum, seed) => sum + toTryCents(seed.amountCents, seed.currency),
        0
      ),
      topUpCount: walletTopUpsThisPeriodSeed.reduce(
        (sum, seed) => sum + seed.count,
        0
      ),
      periodStart: null,
    },
    activitySpend: {
      totalSpendTryCents: activityBookingSpendSeed.reduce(
        (sum, seed) => sum + toTryCents(seed.amountCents, seed.currency),
        0
      ),
      bookingCount: activityBookingSpendSeed.reduce(
        (sum, seed) => sum + seed.bookingCount,
        0
      ),
    },
    vendorSubmissions: buildVendorSubmissions(vendorInvoices),
  }
}

function deriveOverview(
  raw: RawFinanceState,
  options: {
    source: AccountantFinanceSource
    capabilities: { canOffset: boolean; readOnly: boolean }
    moneyMovement: AccountantMoneyMovement
    warning?: string
  }
): AccountantFinanceOverview {
  const byBlock: AccountantFinanceBlockRow[] = ACCOUNTANT_FINANCE_BLOCKS.map(
    (block) => ({
      block,
      creditTryCents: raw.creditBalances
        .filter((credit) => credit.block === block)
        .reduce((sum, credit) => sum + toTryCents(credit.amountCents, credit.currency), 0),
      costTryCents: raw.costEntries
        .filter((cost) => cost.block === block)
        .reduce((sum, cost) => sum + toTryCents(cost.amountCents, cost.currency), 0),
    })
  )

  const creditTryCents = raw.creditBalances.reduce(
    (sum, credit) => sum + toTryCents(credit.amountCents, credit.currency),
    0
  )
  const costTryCents = raw.costEntries.reduce(
    (sum, cost) => sum + toTryCents(cost.amountCents, cost.currency),
    0
  )

  const byRole: AccountantFinanceRoleRow[] = CREDIT_SUBJECT_ORDER.map((role) => ({
    role,
    creditTryCents: raw.creditBalances
      .filter((credit) => credit.subjectType === role)
      .reduce((sum, credit) => sum + toTryCents(credit.amountCents, credit.currency), 0),
    costTryCents: raw.costEntries
      .filter((cost) => cost.role === role)
      .reduce((sum, cost) => sum + toTryCents(cost.amountCents, cost.currency), 0),
  }))

  const liveInvoices = raw.invoices.filter((invoice) => invoice.status !== "void")
  const openInvoices = raw.invoices.filter(
    (invoice) => invoice.status === "open" || invoice.status === "partially_offset"
  )

  const totals: AccountantFinanceTotals = {
    grossInvoicesTryCents: liveInvoices.reduce(
      (sum, invoice) => sum + toTryCents(invoice.amountCents, invoice.currency),
      0
    ),
    openInvoicesTryCents: openInvoices.reduce(
      (sum, invoice) => sum + toTryCents(invoice.openCents, invoice.currency),
      0
    ),
    invoiceCount: raw.invoices.length,
    openInvoiceCount: openInvoices.length,
    creditTryCents,
    costTryCents,
    bankInflowTryCents: raw.bankStatements.reduce(
      (sum, statement) =>
        sum +
        statement.lines
          .filter((line) => line.direction === "credit")
          .reduce((lineSum, line) => lineSum + toTryCents(line.amountCents, statement.currency), 0),
      0
    ),
    bankOutflowTryCents: raw.bankStatements.reduce(
      (sum, statement) =>
        sum +
        statement.lines
          .filter((line) => line.direction === "debit")
          .reduce((lineSum, line) => lineSum + toTryCents(line.amountCents, statement.currency), 0),
      0
    ),
    bankStatementCount: raw.bankStatements.length,
  }

  return {
    contractVersion: ACCOUNTANT_FINANCE_CONTRACT_VERSION,
    source: options.source,
    generatedAt: new Date().toISOString(),
    capabilities: options.capabilities,
    invoices: raw.invoices,
    creditBalances: raw.creditBalances,
    providerCredits: raw.creditBalances.filter(
      (credit) => credit.subjectType === "service_provider"
    ),
    byBlock,
    blockTotal: { creditTryCents, costTryCents },
    byRole,
    bankStatements: raw.bankStatements,
    offsets: raw.offsets,
    totals,
    moneyMovement: options.moneyMovement,
    warning: options.warning,
  }
}

// --------------------------------------------------------------------------
// Local-seed path (no database, or explicit access-profile QA mode)
// --------------------------------------------------------------------------

interface LocalOffsetFact {
  id: string
  invoiceId: string
  creditBalanceId: string
  amountCents: number
  currency: FinanceCurrency
  reason: string | null
  createdBy: string
  createdAt: string
}

interface LocalFinanceState {
  version: 1
  offsets: LocalOffsetFact[]
}

const stateNamespace =
  process.env.CATI_LOCAL_STATE_NAMESPACE ??
  Buffer.from(process.cwd()).toString("base64url").slice(-64)
const statePath = join(
  tmpdir(),
  `cati-accountant-finance-${stateNamespace}.v1.json`
)
const lockPath = `${statePath}.lock`
const waitBuffer = new Int32Array(new SharedArrayBuffer(4))

function localPersistenceEnabled() {
  return !isSupabaseConfigured() || isAccessProfileEnabled()
}

function acquireLock() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const descriptor = openSync(lockPath, "wx", 0o600)
      closeSync(descriptor)
      return
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== "EEXIST") throw error
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > 30_000) {
          unlinkSync(lockPath)
          continue
        }
      } catch (lockError) {
        if ((lockError as NodeJS.ErrnoException).code !== "ENOENT") throw lockError
      }
      Atomics.wait(waitBuffer, 0, 0, 10)
    }
  }
  throw new AccountantFinanceDomainError(
    "ACCOUNTANT_FINANCE_BUSY",
    "The local finance workspace is busy; retry the request.",
    503
  )
}

function releaseLock() {
  try {
    unlinkSync(lockPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
}

function readState(): LocalFinanceState {
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8")) as Partial<LocalFinanceState>
    if (parsed.version !== 1 || !Array.isArray(parsed.offsets)) {
      throw new Error("Unsupported accountant-finance local state.")
    }
    return { version: 1, offsets: parsed.offsets }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, offsets: [] }
    }
    throw error
  }
}

function writeState(state: LocalFinanceState) {
  const temporaryPath = `${statePath}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(temporaryPath, JSON.stringify(state), {
    encoding: "utf8",
    mode: 0o600,
  })
  try {
    renameSync(temporaryPath, statePath)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "EEXIST" && code !== "EPERM") throw error
    try {
      unlinkSync(statePath)
    } catch (unlinkError) {
      if ((unlinkError as NodeJS.ErrnoException).code !== "ENOENT") throw unlinkError
    }
    renameSync(temporaryPath, statePath)
  }
}

function withLocalState<T>(write: boolean, operation: (state: LocalFinanceState) => T) {
  if (!localPersistenceEnabled()) {
    return operation({ version: 1, offsets: [] })
  }
  acquireLock()
  try {
    const state = readState()
    const result = operation(state)
    if (write) writeState(state)
    return result
  } finally {
    releaseLock()
  }
}

/** Test-only: drop accumulated local offsets so serial e2e runs stay isolated.
 * The seed invoices, credits and historical offsets are always preserved. */
export function resetAccountantFinanceStateForTesting() {
  withLocalState(true, (state) => {
    state.offsets.length = 0
  })
}

function buildLocalRaw(localOffsets: LocalOffsetFact[]): RawFinanceState {
  const invoiceExtraOffset = new Map<string, number>()
  const creditExtra = new Map<string, number>()
  for (const offset of localOffsets) {
    invoiceExtraOffset.set(
      offset.invoiceId,
      (invoiceExtraOffset.get(offset.invoiceId) ?? 0) + offset.amountCents
    )
    creditExtra.set(
      offset.creditBalanceId,
      (creditExtra.get(offset.creditBalanceId) ?? 0) + offset.amountCents
    )
  }

  const invoices: AccountantFinanceInvoice[] = serviceProviderInvoicesSeed.map(
    (seed) => {
      const offsetCents = seed.offsetCents + (invoiceExtraOffset.get(seed.id) ?? 0)
      const openCents = Math.max(0, seed.amountCents - offsetCents)
      return {
        id: seed.id,
        providerName: seed.providerName,
        vendorId: seed.vendorId,
        block: seed.block,
        invoiceNo: seed.invoiceNo,
        amountCents: seed.amountCents,
        offsetCents,
        openCents,
        currency: seed.currency,
        status: deriveInvoiceStatus(seed.status, seed.amountCents, offsetCents),
        issuedAt: seed.issuedAt,
        dueAt: seed.dueAt,
        notes: seed.notes,
      }
    }
  )

  const creditBalances: AccountantFinanceCreditBalance[] = creditBalancesSeed.map(
    (seed) => ({
      id: seed.id,
      subjectType: seed.subjectType,
      subjectRef: seed.subjectRef,
      providerName: seed.providerName,
      block: seed.block,
      amountCents: Math.max(0, seed.amountCents - (creditExtra.get(seed.id) ?? 0)),
      currency: seed.currency,
    })
  )

  const costEntries: CostEntry[] = [
    ...invoices
      .filter((invoice) => invoice.status !== "void")
      .map((invoice) => ({
        block: invoice.block,
        role: "service_provider" as CreditSubjectType,
        amountCents: invoice.amountCents,
        currency: invoice.currency,
      })),
    ...costEntriesSeed.map((cost) => ({
      block: cost.block,
      role: cost.role,
      amountCents: cost.amountCents,
      currency: cost.currency,
    })),
  ]

  const invoiceNoById = new Map(
    serviceProviderInvoicesSeed.map((seed) => [seed.id, seed.invoiceNo])
  )
  const offsets: AccountantFinanceOffset[] = [
    ...invoiceCreditOffsetsSeed.map((offset) => ({
      id: offset.id,
      invoiceId: offset.invoiceId,
      invoiceNo: offset.invoiceNo,
      creditBalanceId: offset.creditBalanceId,
      amountCents: offset.amountCents,
      currency: offset.currency,
      reason: offset.reason,
      createdAt: offset.createdAt,
    })),
    ...localOffsets.map((offset) => ({
      id: offset.id,
      invoiceId: offset.invoiceId,
      invoiceNo: invoiceNoById.get(offset.invoiceId) ?? offset.invoiceId,
      creditBalanceId: offset.creditBalanceId,
      amountCents: offset.amountCents,
      currency: offset.currency,
      reason: offset.reason,
      createdAt: offset.createdAt,
    })),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt))

  const bankStatements: AccountantFinanceBankStatement[] = bankStatementsSeed.map(
    (statement) => ({
      id: statement.id,
      statementDate: statement.statementDate,
      bankName: statement.bankName,
      reference: statement.reference,
      openingBalanceCents: statement.openingBalanceCents,
      closingBalanceCents: statement.closingBalanceCents,
      currency: statement.currency,
      netCents: statement.lines.reduce(
        (sum, line) => sum + (line.direction === "credit" ? line.amountCents : -line.amountCents),
        0
      ),
      lines: statement.lines.map((line) => ({
        id: line.id,
        bookedAt: line.bookedAt,
        description: line.description,
        amountCents: line.amountCents,
        direction: line.direction,
      })),
    })
  )

  return { invoices, creditBalances, costEntries, bankStatements, offsets }
}

function localOverview(
  profile: UserProfile,
  warning?: string
): AccountantFinanceOverview {
  return withLocalState(false, (state) =>
    deriveOverview(buildLocalRaw(state.offsets), {
      source: "local-seed",
      capabilities: {
        canOffset: canWrite(profile.role),
        readOnly: profile.role === "manager",
      },
      moneyMovement: buildLocalMoneyMovement(),
      warning,
    })
  )
}

// --------------------------------------------------------------------------
// Supabase path
// --------------------------------------------------------------------------

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function related(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return asRecord(value[0])
  return asRecord(value)
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function nullableStr(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function num(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  return value === "partially_offset" || value === "paid" || value === "void"
    ? value
    : "open"
}

function normalizeSubjectType(value: unknown): CreditSubjectType {
  return CREDIT_SUBJECT_ORDER.includes(value as CreditSubjectType)
    ? (value as CreditSubjectType)
    : "company"
}

async function loadFromSupabase(
  supabase: SupabaseClient,
  limit: number
): Promise<RawFinanceState> {
  const invoiceResponse = await supabase
    .from("service_provider_invoices")
    .select(
      "id, vendor_id, block, invoice_no, amount_cents, offset_cents, currency, status, issued_at, due_at, notes, vendors:vendor_id(name)"
    )
    .order("issued_at", { ascending: false })
    .limit(200)
  if (invoiceResponse.error) throw invoiceResponse.error

  const creditResponse = await supabase
    .from("credit_balances")
    .select(
      "id, subject_type, subject_ref, block, amount_cents, currency, vendors:vendor_id(name)"
    )
    .limit(300)
  if (creditResponse.error) throw creditResponse.error

  const bankResponse = await supabase
    .from("bank_statements")
    .select(
      "id, statement_date, bank_name, reference, opening_balance_cents, closing_balance_cents, currency, bank_statement_lines(id, booked_at, description, amount_cents, direction)"
    )
    .order("statement_date", { ascending: false })
    .limit(limit)
  if (bankResponse.error) throw bankResponse.error

  const offsetResponse = await supabase
    .from("invoice_credit_offsets")
    .select(
      "id, invoice_id, amount_cents, currency, reason, created_at, service_provider_invoices:invoice_id(invoice_no)"
    )
    .order("created_at", { ascending: false })
    .limit(50)
  if (offsetResponse.error) throw offsetResponse.error

  const ledgerResponse = await supabase
    .from("finance_ledger_entries")
    .select("id, entry_type, amount_cents, currency, units:unit_id(block:block_id(name))")
    .in("entry_type", LEDGER_COST_ENTRY_TYPES)
    .limit(400)
  if (ledgerResponse.error) throw ledgerResponse.error

  const invoices: AccountantFinanceInvoice[] = (invoiceResponse.data ?? []).map(
    (row) => {
      const record = asRecord(row)
      const amountCents = num(record.amount_cents)
      const offsetCents = num(record.offset_cents)
      return {
        id: str(record.id),
        providerName: nullableStr(related(record.vendors).name),
        vendorId: nullableStr(record.vendor_id),
        block: nullableStr(record.block),
        invoiceNo: str(record.invoice_no),
        amountCents,
        offsetCents,
        openCents: Math.max(0, amountCents - offsetCents),
        currency: normalizeCurrency(record.currency),
        status: normalizeInvoiceStatus(record.status),
        issuedAt: nullableStr(record.issued_at),
        dueAt: nullableStr(record.due_at),
        notes: nullableStr(record.notes),
      }
    }
  )

  const creditBalances: AccountantFinanceCreditBalance[] = (
    creditResponse.data ?? []
  ).map((row) => {
    const record = asRecord(row)
    return {
      id: str(record.id),
      subjectType: normalizeSubjectType(record.subject_type),
      subjectRef: str(record.subject_ref),
      providerName: nullableStr(related(record.vendors).name),
      block: nullableStr(record.block),
      amountCents: num(record.amount_cents),
      currency: normalizeCurrency(record.currency),
    }
  })

  const bankStatements: AccountantFinanceBankStatement[] = (
    bankResponse.data ?? []
  ).map((row) => {
    const record = asRecord(row)
    const currency = normalizeCurrency(record.currency)
    const rawLines = Array.isArray(record.bank_statement_lines)
      ? record.bank_statement_lines
      : []
    const lines: AccountantFinanceBankLine[] = rawLines.map((lineRow) => {
      const line = asRecord(lineRow)
      return {
        id: str(line.id),
        bookedAt: str(line.booked_at),
        description: str(line.description),
        amountCents: num(line.amount_cents),
        direction: line.direction === "debit" ? "debit" : "credit",
      }
    })
    return {
      id: str(record.id),
      statementDate: str(record.statement_date),
      bankName: str(record.bank_name),
      reference: str(record.reference),
      openingBalanceCents: num(record.opening_balance_cents),
      closingBalanceCents: num(record.closing_balance_cents),
      currency,
      netCents: lines.reduce(
        (sum, line) => sum + (line.direction === "credit" ? line.amountCents : -line.amountCents),
        0
      ),
      lines,
    }
  })

  const offsets: AccountantFinanceOffset[] = (offsetResponse.data ?? []).map(
    (row) => {
      const record = asRecord(row)
      return {
        id: str(record.id),
        invoiceId: str(record.invoice_id),
        invoiceNo: str(related(record.service_provider_invoices).invoice_no),
        creditBalanceId: str(record.credit_balance_id),
        amountCents: num(record.amount_cents),
        currency: normalizeCurrency(record.currency),
        reason: nullableStr(record.reason),
        createdAt: str(record.created_at),
      }
    }
  )

  const costEntries: CostEntry[] = [
    ...invoices
      .filter((invoice) => invoice.status !== "void")
      .map((invoice) => ({
        block: invoice.block,
        role: "service_provider" as CreditSubjectType,
        amountCents: invoice.amountCents,
        currency: invoice.currency,
      })),
    ...(ledgerResponse.data ?? []).map((row) => {
      const record = asRecord(row)
      const unit = related(record.units)
      const block = related(unit.block)
      return {
        block: nullableStr(block.name),
        role: "company" as CreditSubjectType,
        amountCents: num(record.amount_cents),
        currency: normalizeCurrency(record.currency),
      }
    }),
  ]

  return { invoices, creditBalances, costEntries, bankStatements, offsets }
}

// --------------------------------------------------------------------------
// Phase-7 money movement (Supabase path). Best-effort: each piece degrades to an
// empty structure on error so the core accounting overview is never broken by a
// missing table / RPC in an older environment. The `source` stays "supabase".
// --------------------------------------------------------------------------

function mapWalletCreditFromRpc(data: unknown): AccountantWalletCredit {
  const record = asRecord(data)

  const roleTotals = new Map<
    string,
    { creditTryCents: number; walletCount: number }
  >()
  const byRoleRaw = Array.isArray(record.byRole) ? record.byRole : []
  for (const row of byRoleRaw) {
    const item = asRecord(row)
    const role = str(item.role, "unknown") || "unknown"
    const currency = normalizeCurrency(item.currency)
    const current = roleTotals.get(role) ?? { creditTryCents: 0, walletCount: 0 }
    current.creditTryCents += toTryCents(num(item.balanceCents), currency)
    current.walletCount += num(item.walletCount)
    roleTotals.set(role, current)
  }
  const byRole: AccountantWalletRoleRow[] = Array.from(roleTotals.entries())
    .map(([role, value]) => ({ role, ...value }))
    .sort((left, right) => right.creditTryCents - left.creditTryCents)

  let totalUserCreditTryCents = 0
  let userWalletCount = 0
  const totalsRaw = Array.isArray(record.totalsByCurrency)
    ? record.totalsByCurrency
    : []
  for (const row of totalsRaw) {
    const item = asRecord(row)
    totalUserCreditTryCents += toTryCents(
      num(item.balanceCents),
      normalizeCurrency(item.currency)
    )
    userWalletCount += num(item.walletCount)
  }

  let topUpsTryCents = 0
  let topUpCount = 0
  const topUpsRaw = Array.isArray(record.topUpsByCurrency)
    ? record.topUpsByCurrency
    : []
  for (const row of topUpsRaw) {
    const item = asRecord(row)
    topUpsTryCents += toTryCents(
      num(item.amountCents),
      normalizeCurrency(item.currency)
    )
    topUpCount += num(item.count)
  }

  return {
    byRole,
    totalUserCreditTryCents,
    userWalletCount,
    topUpsTryCents,
    topUpCount,
    periodStart: nullableStr(record.periodStart),
  }
}

async function loadMoneyMovementFromSupabase(
  supabase: SupabaseClient
): Promise<AccountantMoneyMovement> {
  const movement = emptyMoneyMovement()

  // Wallet money summary via the SECURITY DEFINER aggregation helper (mig 47).
  // The profiles RLS blocks grouping wallet balances by owner role client-side,
  // so this grouping must be done server-side.
  try {
    const walletResponse = await supabase.rpc("accountant_wallet_money_summary", {})
    if (!walletResponse.error && walletResponse.data) {
      movement.walletCredit = mapWalletCreditFromRpc(walletResponse.data)
    }
  } catch {
    // Best-effort: keep the empty wallet-credit summary.
  }

  // Activity bookings (RLS grants same-company admin/manager/accountant SELECT).
  try {
    const bookingResponse = await supabase
      .from("activity_bookings")
      .select("amount_cents, currency, status")
      .neq("status", "cancelled")
      .limit(2000)
    if (!bookingResponse.error) {
      const rows = bookingResponse.data ?? []
      movement.activitySpend = {
        totalSpendTryCents: rows.reduce((sum, row) => {
          const record = asRecord(row)
          return (
            sum +
            toTryCents(num(record.amount_cents), normalizeCurrency(record.currency))
          )
        }, 0),
        bookingCount: rows.length,
      }
    }
  } catch {
    // Best-effort.
  }

  // Vendor-submitted invoices (RLS grants same-company accountant SELECT).
  try {
    const vendorResponse = await supabase
      .from("service_provider_invoices")
      .select(
        "id, invoice_no, submission_status, status, total_cents, amount_cents, currency, issued_at, vendors:vendor_id(name)"
      )
      .in("submission_status", ["submitted", "in_review", "approved"])
      .order("issued_at", { ascending: false })
      .limit(50)
    if (!vendorResponse.error) {
      const invoices: AccountantVendorInvoice[] = (
        vendorResponse.data ?? []
      ).map((row) => {
        const record = asRecord(row)
        const totalCents = num(record.total_cents) || num(record.amount_cents)
        return {
          id: str(record.id),
          invoiceNo: str(record.invoice_no),
          providerName: nullableStr(related(record.vendors).name),
          submissionStatus: normalizeSubmissionStatus(record.submission_status),
          accountingStatus: normalizeInvoiceStatus(record.status),
          totalCents,
          currency: normalizeCurrency(record.currency),
          issuedAt: nullableStr(record.issued_at),
        }
      })
      movement.vendorSubmissions = buildVendorSubmissions(invoices)
    }
  } catch {
    // Best-effort.
  }

  return movement
}

function normalizeOffsetResult(
  value: unknown,
  fallbackSource: AccountantFinanceSource
): ApplyOffsetResult {
  const record = asRecord(value)
  const offsetRow = asRecord(record.offset)
  const invoiceRow = asRecord(record.invoice)
  const creditRow = asRecord(record.creditBalance)
  const invoiceCurrency = normalizeCurrency(invoiceRow.currency)
  const amountCents = num(invoiceRow.amount_cents)
  const offsetCents = num(invoiceRow.offset_cents)
  return {
    source: record.source === "supabase" ? "supabase" : fallbackSource,
    offset: {
      id: str(offsetRow.id),
      invoiceId: str(offsetRow.invoiceId),
      invoiceNo: str(offsetRow.invoiceNo),
      creditBalanceId: str(offsetRow.creditBalanceId),
      amountCents: num(offsetRow.amountCents),
      currency: normalizeCurrency(offsetRow.currency),
      reason: nullableStr(offsetRow.reason),
      createdAt: str(offsetRow.createdAt),
    },
    invoice: {
      id: str(invoiceRow.id),
      providerName: nullableStr(invoiceRow.providerName),
      vendorId: nullableStr(invoiceRow.vendorId),
      block: nullableStr(invoiceRow.block),
      invoiceNo: str(invoiceRow.invoiceNo),
      amountCents,
      offsetCents,
      openCents: num(invoiceRow.openCents),
      currency: invoiceCurrency,
      status: normalizeInvoiceStatus(invoiceRow.status),
      issuedAt: nullableStr(invoiceRow.issuedAt),
      dueAt: nullableStr(invoiceRow.dueAt),
      notes: nullableStr(invoiceRow.notes),
    },
    creditBalance: {
      id: str(creditRow.id),
      subjectType: normalizeSubjectType(creditRow.subjectType),
      subjectRef: str(creditRow.subjectRef),
      providerName: null,
      block: nullableStr(creditRow.block),
      amountCents: num(creditRow.amountCents),
      currency: normalizeCurrency(creditRow.currency),
    },
  }
}

function mapSupabaseError(error: { message?: string; code?: string }) {
  const message = error.message ?? "The offset command failed."
  if (error.code === "42501") {
    return new AccountantFinanceDomainError(
      "ACCOUNTANT_FINANCE_SCOPE_FORBIDDEN",
      message,
      403
    )
  }
  return new AccountantFinanceDomainError(
    "ACCOUNTANT_FINANCE_OFFSET_FAILED",
    "The offset could not be applied. Review the amount and the selected credit balance, then retry.",
    422
  )
}

function canUseLocalSeedFallback() {
  return isAccessProfileEnabled()
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function getAccountantFinanceOverview(
  profile: UserProfile,
  { limit = 24, useLocalAccessProfile = false } = {}
): Promise<AccountantFinanceOverview> {
  if (!canView(profile.role)) {
    throw new AccountantFinanceDomainError(
      "ACCOUNTANT_FINANCE_VIEW_FORBIDDEN",
      "The current role cannot view the accounting finance workspace.",
      403
    )
  }
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localOverview(profile)
  }

  try {
    const supabase = await createClient()
    const raw = await loadFromSupabase(supabase, boundedLimit)
    const moneyMovement = await loadMoneyMovementFromSupabase(supabase)
    return deriveOverview(raw, {
      source: "supabase",
      capabilities: {
        canOffset: canWrite(profile.role),
        readOnly: profile.role === "manager",
      },
      moneyMovement,
    })
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return localOverview(
        profile,
        "Live accounting data was unavailable; showing the local reference set."
      )
    }
    throw error
  }
}

export async function applyInvoiceCreditOffset(
  profile: UserProfile,
  input: ApplyOffsetInput,
  { useLocalAccessProfile = false } = {}
): Promise<ApplyOffsetResult> {
  if (!canWrite(profile.role)) {
    throw new AccountantFinanceDomainError(
      "ACCOUNTANT_FINANCE_OFFSET_FORBIDDEN",
      "Only an organization admin or accountant may offset an invoice.",
      403
    )
  }

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return withLocalState(true, (state) => {
      const before = buildLocalRaw(state.offsets)
      const invoice = before.invoices.find((item) => item.id === input.invoiceId)
      if (!invoice) {
        throw new AccountantFinanceDomainError(
          "ACCOUNTANT_FINANCE_INVOICE_NOT_FOUND",
          "The invoice was not found in this workspace.",
          404
        )
      }
      if (invoice.status !== "open" && invoice.status !== "partially_offset") {
        throw new AccountantFinanceDomainError(
          "ACCOUNTANT_FINANCE_INVOICE_CLOSED",
          "This invoice can no longer be offset.",
          409
        )
      }
      const credit = before.creditBalances.find(
        (item) => item.id === input.creditBalanceId
      )
      if (!credit) {
        throw new AccountantFinanceDomainError(
          "ACCOUNTANT_FINANCE_CREDIT_NOT_FOUND",
          "The credit balance was not found in this workspace.",
          404
        )
      }
      if (credit.currency !== invoice.currency) {
        throw new AccountantFinanceDomainError(
          "ACCOUNTANT_FINANCE_CURRENCY_MISMATCH",
          "The credit balance currency must match the invoice currency.",
          422
        )
      }
      const max = Math.min(invoice.openCents, credit.amountCents)
      if (input.amountCents < 1 || input.amountCents > max) {
        throw new AccountantFinanceDomainError(
          "ACCOUNTANT_FINANCE_AMOUNT_INVALID",
          "The offset amount exceeds the open invoice amount or the available credit balance.",
          422
        )
      }

      const fact: LocalOffsetFact = {
        id: randomUUID(),
        invoiceId: invoice.id,
        creditBalanceId: credit.id,
        amountCents: input.amountCents,
        currency: invoice.currency,
        reason: input.reason,
        createdBy: profile.id,
        createdAt: new Date().toISOString(),
      }
      state.offsets.push(fact)

      const after = buildLocalRaw(state.offsets)
      const updatedInvoice = after.invoices.find((item) => item.id === invoice.id)
      const updatedCredit = after.creditBalances.find((item) => item.id === credit.id)
      if (!updatedInvoice || !updatedCredit) {
        throw new Error("The offset projection could not be rebuilt.")
      }
      return {
        source: "local-seed" as const,
        offset: {
          id: fact.id,
          invoiceId: fact.invoiceId,
          invoiceNo: invoice.invoiceNo,
          creditBalanceId: fact.creditBalanceId,
          amountCents: fact.amountCents,
          currency: fact.currency,
          reason: fact.reason,
          createdAt: fact.createdAt,
        },
        invoice: updatedInvoice,
        creditBalance: updatedCredit,
      }
    })
  }

  const supabase = await createClient()
  const response = await supabase.rpc("apply_invoice_credit_offset", {
    p_invoice_id: input.invoiceId,
    p_credit_id: input.creditBalanceId,
    p_amount_cents: input.amountCents,
    p_reason: input.reason,
  })
  if (response.error) throw mapSupabaseError(response.error)
  return normalizeOffsetResult(response.data, "supabase")
}
