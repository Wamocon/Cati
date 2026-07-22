// Service-provider (vendor) invoicing repository.
//
// Supabase-first with a file-backed local-seed fallback for access-profile / QA
// mode, mirroring wallet-repository.ts / activities-repository.ts. Every response
// carries a `source: "supabase" | "local-seed"` field. Every submit takes an
// idempotency key and is idempotent: a retried call returns the original invoice.
//
// Two lifecycles live on an invoice and are never confused:
//   * accountingStatus (open/partially_offset/paid/void) is owned by the
//     accountant offset engine (migration 39/44) and is read-only here.
//   * submissionStatus (draft/submitted/in_review/approved/declined) is the vendor
//     workflow this module drives.
//
// Amounts are integer minor units (kuruş / cents); a single currency per invoice,
// rendered dual TRY / EUR at the display layer.

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
import { formatDualFromCents, type NativeCurrency } from "@/lib/currency"
import { hasAnyRolePermission } from "@/lib/rbac"
import {
  VENDOR_LOCAL_SEED,
  type VendorInvoiceAccountingStatus,
  type VendorInvoiceLineSeed,
  type VendorSubmissionStatus,
} from "@/lib/vendor-invoice-data"

export const VENDOR_INVOICE_CONTRACT_VERSION = "vendor-invoice.v1" as const
export const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export type VendorInvoiceSource = "supabase" | "local-seed"

const MAX_AMOUNT_CENTS = 1_000_000_000_000
const MAX_LINES = 200

export interface VendorJob {
  id: string
  orderNo: string | null
  title: string | null
  status: string
  quotedPriceCents: number
  currency: NativeCurrency
  requestedForAt: string | null
  /** Dual ₺/€ label for the quoted price. */
  quotedLabel: string
}

export interface VendorInvoiceLineView {
  id: string
  description: string | null
  quantity: number
  unitPriceCents: number
  taxRate: number
  lineTotalCents: number
}

export interface VendorInvoiceView {
  id: string
  invoiceNo: string
  submissionStatus: VendorSubmissionStatus
  /** Accountant offset lifecycle; read-only in the vendor workspace. */
  accountingStatus: VendorInvoiceAccountingStatus
  subtotalCents: number
  taxCents: number
  totalCents: number
  currency: NativeCurrency
  externalRef: string | null
  serviceOrderId: string | null
  issuedAt: string | null
  dueAt: string | null
  createdAt: string
  /** Dual ₺/€ label for the invoice total. */
  totalLabel: string
  lines: VendorInvoiceLineView[]
}

export interface VendorWorkspaceSummary {
  jobCount: number
  invoiceCount: number
  /** submitted + in_review (awaiting an accounting decision). */
  pendingCount: number
  approvedCount: number
  totalInvoicedCents: number
  currency: NativeCurrency
}

export interface VendorWorkspaceCapabilities {
  canSubmit: boolean
}

export interface VendorWorkspace {
  contractVersion: typeof VENDOR_INVOICE_CONTRACT_VERSION
  source: VendorInvoiceSource
  generatedAt: string
  vendorLinked: boolean
  vendorName: string | null
  capabilities: VendorWorkspaceCapabilities
  jobs: VendorJob[]
  invoices: VendorInvoiceView[]
  summary: VendorWorkspaceSummary
  warning?: string
}

export interface SubmitInvoiceLineInput {
  description: string | null
  quantity: number
  unitPriceCents: number
  taxRate: number
}

export interface SubmitInvoiceInput {
  invoiceNo: string
  lines: SubmitInvoiceLineInput[]
  serviceOrderId: string | null
  dueAt: string | null
  idempotencyKey: string
}

export interface SubmitInvoiceResult {
  source: VendorInvoiceSource
  invoice: VendorInvoiceView
}

export type ReviewDecision = "approve" | "decline" | "review"

export interface ReviewInvoiceInput {
  invoiceId: string
  decision: ReviewDecision
  reason: string | null
  idempotencyKey: string
}

export class VendorInvoiceDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "VendorInvoiceDomainError"
  }
}

// --------------------------------------------------------------------------
// Capability + shaping helpers (RLS / the RPC are the real authority).
// --------------------------------------------------------------------------

function canViewVendorInvoices(profile: UserProfile) {
  return hasAnyRolePermission(profile.roles, "vendor_invoices", "view")
}

function canSubmitVendorInvoices(profile: UserProfile) {
  return hasAnyRolePermission(profile.roles, "vendor_invoices", "create")
}

/** Reviewing (approve/decline/in_review) is an accounting decision. Authority is
 * enforced again in the SECURITY DEFINER RPC; this is the app-layer gate. */
function canReviewVendorInvoices(profile: UserProfile) {
  return profile.role === "admin" || profile.role === "accountant"
}

const REVIEW_TARGET_STATUS: Record<ReviewDecision, VendorSubmissionStatus> = {
  approve: "approved",
  decline: "declined",
  review: "in_review",
}

function normalizeCurrency(value: unknown): NativeCurrency {
  return value === "EUR" ? "EUR" : "TRY"
}

function normalizeSubmissionStatus(value: unknown): VendorSubmissionStatus {
  return value === "submitted" ||
    value === "in_review" ||
    value === "approved" ||
    value === "declined"
    ? value
    : "draft"
}

function normalizeAccountingStatus(value: unknown): VendorInvoiceAccountingStatus {
  return value === "partially_offset" || value === "paid" || value === "void"
    ? value
    : "open"
}

/** Compute net subtotal, tax and total from a line list. Mirrors the SQL RPC:
 * line net = round(quantity * unit_price_cents); tax = round(net * rate / 100). */
function totalsFor(lines: SubmitInvoiceLineInput[] | VendorInvoiceLineSeed[]): {
  subtotalCents: number
  taxCents: number
  totalCents: number
} {
  let subtotalCents = 0
  let taxCents = 0
  for (const line of lines) {
    const net = Math.round(line.quantity * line.unitPriceCents)
    subtotalCents += net
    taxCents += Math.round((net * line.taxRate) / 100)
  }
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents }
}

function validateSubmitInput(input: SubmitInvoiceInput) {
  const invoiceNo = input.invoiceNo.trim()
  if (!invoiceNo || invoiceNo.length > 120) {
    throw new VendorInvoiceDomainError(
      "VENDOR_INVOICE_NO_INVALID",
      "Enter an invoice number of at most 120 characters.",
      422
    )
  }
  if (!input.idempotencyKey || input.idempotencyKey.length > 200) {
    throw new VendorInvoiceDomainError(
      "VENDOR_INVOICE_IDEMPOTENCY_INVALID",
      "A valid idempotency key is required.",
      422
    )
  }
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new VendorInvoiceDomainError(
      "VENDOR_INVOICE_LINES_REQUIRED",
      "Add at least one invoice line.",
      422
    )
  }
  if (input.lines.length > MAX_LINES) {
    throw new VendorInvoiceDomainError(
      "VENDOR_INVOICE_LINES_TOO_MANY",
      `An invoice may not exceed ${MAX_LINES} lines.`,
      422
    )
  }
  for (const line of input.lines) {
    if (
      !Number.isFinite(line.quantity) ||
      line.quantity <= 0 ||
      line.quantity > 1_000_000
    ) {
      throw new VendorInvoiceDomainError(
        "VENDOR_INVOICE_LINE_QUANTITY_INVALID",
        "Each line quantity must be greater than zero.",
        422
      )
    }
    if (
      !Number.isSafeInteger(line.unitPriceCents) ||
      line.unitPriceCents < 0 ||
      line.unitPriceCents > MAX_AMOUNT_CENTS
    ) {
      throw new VendorInvoiceDomainError(
        "VENDOR_INVOICE_LINE_PRICE_INVALID",
        "Each line unit price must be a non-negative amount.",
        422
      )
    }
    if (!Number.isFinite(line.taxRate) || line.taxRate < 0 || line.taxRate > 100) {
      throw new VendorInvoiceDomainError(
        "VENDOR_INVOICE_LINE_TAX_INVALID",
        "Each line tax rate must be between 0 and 100.",
        422
      )
    }
  }
  const { subtotalCents, totalCents } = totalsFor(input.lines)
  if (subtotalCents < 1) {
    throw new VendorInvoiceDomainError(
      "VENDOR_INVOICE_TOTAL_INVALID",
      "The invoice total must be greater than zero.",
      422
    )
  }
  if (totalCents > MAX_AMOUNT_CENTS) {
    throw new VendorInvoiceDomainError(
      "VENDOR_INVOICE_TOTAL_TOO_LARGE",
      "The invoice total is out of range.",
      422
    )
  }
}

function summaryFor(
  jobs: VendorJob[],
  invoices: VendorInvoiceView[]
): VendorWorkspaceSummary {
  const issued = invoices.filter((invoice) => invoice.submissionStatus !== "draft")
  return {
    jobCount: jobs.length,
    invoiceCount: invoices.length,
    pendingCount: invoices.filter(
      (invoice) =>
        invoice.submissionStatus === "submitted" ||
        invoice.submissionStatus === "in_review"
    ).length,
    approvedCount: invoices.filter(
      (invoice) => invoice.submissionStatus === "approved"
    ).length,
    totalInvoicedCents: issued.reduce(
      (sum, invoice) => sum + invoice.totalCents,
      0
    ),
    currency: "TRY",
  }
}

// --------------------------------------------------------------------------
// Local-seed path (no database, or explicit access-profile QA mode).
// --------------------------------------------------------------------------

interface LocalVendorInvoice {
  id: string
  invoiceNo: string
  submissionStatus: VendorSubmissionStatus
  accountingStatus: VendorInvoiceAccountingStatus
  subtotalCents: number
  taxCents: number
  totalCents: number
  currency: NativeCurrency
  externalRef: string | null
  serviceOrderId: string | null
  issuedAt: string | null
  dueAt: string | null
  createdAt: string
  idempotencyKey: string
  lines: VendorInvoiceLineView[]
}

interface LocalVendorState {
  version: 1
  invoices: LocalVendorInvoice[]
}

const stateNamespace =
  process.env.CATI_LOCAL_STATE_NAMESPACE ??
  Buffer.from(process.cwd()).toString("base64url").slice(-64)
const statePath = join(tmpdir(), `cati-vendor-invoices-${stateNamespace}.v1.json`)
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
  throw new VendorInvoiceDomainError(
    "VENDOR_INVOICE_BUSY",
    "The local vendor workspace is busy; retry the request.",
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

function readState(): LocalVendorState {
  try {
    const parsed = JSON.parse(
      readFileSync(statePath, "utf8")
    ) as Partial<LocalVendorState>
    if (parsed.version !== 1 || !Array.isArray(parsed.invoices)) {
      throw new Error("Unsupported vendor-invoice local state.")
    }
    return { version: 1, invoices: parsed.invoices }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, invoices: [] }
    }
    throw error
  }
}

function writeState(state: LocalVendorState) {
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

function withLocalState<T>(
  write: boolean,
  operation: (state: LocalVendorState) => T
) {
  if (!localPersistenceEnabled()) {
    return operation({ version: 1, invoices: [] })
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

/** Test-only: drop accumulated local vendor invoices so serial e2e runs stay
 * isolated. The seed jobs and the seed draft invoice are always preserved. */
export function resetVendorInvoiceStateForTesting() {
  withLocalState(true, (state) => {
    state.invoices.length = 0
  })
}

function seedJobs(): VendorJob[] {
  return VENDOR_LOCAL_SEED.jobs.map((job) => ({
    id: job.id,
    orderNo: job.orderNo,
    title: job.title,
    status: job.status,
    quotedPriceCents: job.quotedPriceCents,
    currency: job.currency,
    requestedForAt: job.requestedForAt,
    quotedLabel: formatDualFromCents(job.quotedPriceCents, job.currency),
  }))
}

function seedInvoiceViews(): VendorInvoiceView[] {
  return VENDOR_LOCAL_SEED.invoices.map((invoice) => {
    const { subtotalCents, taxCents, totalCents } = totalsFor(invoice.lines)
    return {
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      submissionStatus: invoice.submissionStatus,
      accountingStatus: invoice.accountingStatus,
      subtotalCents,
      taxCents,
      totalCents,
      currency: invoice.currency,
      externalRef: invoice.externalRef,
      serviceOrderId: invoice.serviceOrderId,
      issuedAt: invoice.issuedAt,
      dueAt: invoice.dueAt,
      createdAt: invoice.issuedAt
        ? new Date(invoice.issuedAt).toISOString()
        : new Date(0).toISOString(),
      totalLabel: formatDualFromCents(totalCents, invoice.currency),
      lines: invoice.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        taxRate: line.taxRate,
        lineTotalCents: Math.round(line.quantity * line.unitPriceCents),
      })),
    }
  })
}

function localInvoiceView(invoice: LocalVendorInvoice): VendorInvoiceView {
  return {
    id: invoice.id,
    invoiceNo: invoice.invoiceNo,
    submissionStatus: invoice.submissionStatus,
    accountingStatus: invoice.accountingStatus,
    subtotalCents: invoice.subtotalCents,
    taxCents: invoice.taxCents,
    totalCents: invoice.totalCents,
    currency: invoice.currency,
    externalRef: invoice.externalRef,
    serviceOrderId: invoice.serviceOrderId,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt,
    createdAt: invoice.createdAt,
    totalLabel: formatDualFromCents(invoice.totalCents, invoice.currency),
    lines: invoice.lines,
  }
}

function localInvoices(state: LocalVendorState): VendorInvoiceView[] {
  const submitted = [...state.invoices]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(localInvoiceView)
  return [...submitted, ...seedInvoiceViews()]
}

function localWorkspace(
  profile: UserProfile,
  warning?: string
): VendorWorkspace {
  return withLocalState(false, (state) => {
    const jobs = seedJobs()
    const invoices = localInvoices(state)
    return {
      contractVersion: VENDOR_INVOICE_CONTRACT_VERSION,
      source: "local-seed",
      generatedAt: new Date().toISOString(),
      vendorLinked: true,
      vendorName: VENDOR_LOCAL_SEED.vendorName,
      capabilities: { canSubmit: canSubmitVendorInvoices(profile) },
      jobs,
      invoices,
      summary: summaryFor(jobs, invoices),
      warning,
    }
  })
}

function localSubmit(input: SubmitInvoiceInput): SubmitInvoiceResult {
  const invoiceNo = input.invoiceNo.trim()
  return withLocalState(true, (state) => {
    const replay = state.invoices.find(
      (invoice) => invoice.idempotencyKey === input.idempotencyKey
    )
    if (replay) {
      return { source: "local-seed" as const, invoice: localInvoiceView(replay) }
    }

    // Natural-key idempotency (mirrors the RPC): a matching invoice number, in the
    // stored submissions or the seed, is returned instead of duplicated.
    const existing = state.invoices.find(
      (invoice) => invoice.invoiceNo === invoiceNo
    )
    if (existing) {
      return { source: "local-seed" as const, invoice: localInvoiceView(existing) }
    }
    const seedMatch = seedInvoiceViews().find(
      (invoice) => invoice.invoiceNo === invoiceNo
    )
    if (seedMatch) {
      return { source: "local-seed" as const, invoice: seedMatch }
    }

    const { subtotalCents, taxCents, totalCents } = totalsFor(input.lines)
    const invoice: LocalVendorInvoice = {
      id: randomUUID(),
      invoiceNo,
      submissionStatus: "submitted",
      accountingStatus: "open",
      subtotalCents,
      taxCents,
      totalCents,
      currency: "TRY",
      externalRef: null,
      serviceOrderId: input.serviceOrderId,
      issuedAt: new Date().toISOString().slice(0, 10),
      dueAt: input.dueAt ? input.dueAt.slice(0, 10) : null,
      createdAt: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
      lines: input.lines.map((line) => ({
        id: randomUUID(),
        description: line.description,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        taxRate: line.taxRate,
        lineTotalCents: Math.round(line.quantity * line.unitPriceCents),
      })),
    }
    state.invoices.push(invoice)
    return { source: "local-seed" as const, invoice: localInvoiceView(invoice) }
  })
}

// --------------------------------------------------------------------------
// Supabase path.
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

function canUseLocalSeedFallback() {
  return isAccessProfileEnabled()
}

function mapSupabaseError(error: { message?: string; code?: string }) {
  if (error.code === "42501") {
    return new VendorInvoiceDomainError(
      "VENDOR_INVOICE_SCOPE_FORBIDDEN",
      "You cannot perform this vendor invoice operation.",
      403
    )
  }
  return new VendorInvoiceDomainError(
    "VENDOR_INVOICE_OPERATION_FAILED",
    "The invoice could not be submitted. Review the details and retry.",
    422
  )
}

function mapLineRow(value: unknown): VendorInvoiceLineView {
  const record = asRecord(value)
  return {
    id: str(record.id),
    description: nullableStr(record.description),
    quantity: num(record.quantity),
    unitPriceCents: num(record.unitPriceCents ?? record.unit_price_cents),
    taxRate: num(record.taxRate ?? record.tax_rate),
    lineTotalCents: num(record.lineTotalCents ?? record.line_total_cents),
  }
}

function mapInvoiceRow(row: unknown): VendorInvoiceView {
  const record = asRecord(row)
  const totalCents = num(record.total_cents ?? record.amount_cents)
  const currency = normalizeCurrency(record.currency)
  const rawLines = Array.isArray(record.service_provider_invoice_lines)
    ? record.service_provider_invoice_lines
    : []
  return {
    id: str(record.id),
    invoiceNo: str(record.invoice_no),
    submissionStatus: normalizeSubmissionStatus(record.submission_status),
    accountingStatus: normalizeAccountingStatus(record.status),
    subtotalCents: num(record.subtotal_cents),
    taxCents: num(record.tax_cents),
    totalCents,
    currency,
    externalRef: nullableStr(record.external_ref),
    serviceOrderId: nullableStr(record.service_order_id),
    issuedAt: nullableStr(record.issued_at),
    dueAt: nullableStr(record.due_at),
    createdAt: str(record.created_at),
    totalLabel: formatDualFromCents(totalCents, currency),
    lines: rawLines.map(mapLineRow),
  }
}

/** Map the { invoice, lines, source } payload returned by the RPCs. */
function mapInvoiceJson(data: unknown): SubmitInvoiceResult {
  const record = asRecord(data)
  const invoice = asRecord(record.invoice)
  const totalCents = num(invoice.totalCents ?? invoice.amountCents)
  const currency = normalizeCurrency(invoice.currency)
  const rawLines = Array.isArray(record.lines) ? record.lines : []
  return {
    source: record.source === "supabase" ? "supabase" : "local-seed",
    invoice: {
      id: str(invoice.id),
      invoiceNo: str(invoice.invoiceNo),
      submissionStatus: normalizeSubmissionStatus(invoice.submissionStatus),
      accountingStatus: normalizeAccountingStatus(invoice.status),
      subtotalCents: num(invoice.subtotalCents),
      taxCents: num(invoice.taxCents),
      totalCents,
      currency,
      externalRef: nullableStr(invoice.externalRef),
      serviceOrderId: nullableStr(invoice.serviceOrderId),
      issuedAt: nullableStr(invoice.issuedAt),
      dueAt: nullableStr(invoice.dueAt),
      createdAt: str(invoice.createdAt),
      totalLabel: formatDualFromCents(totalCents, currency),
      lines: rawLines.map(mapLineRow),
    },
  }
}

interface VendorRow {
  id: string
  name: string | null
}

async function loadVendorForProfile(
  supabase: SupabaseClient,
  profileId: string
): Promise<VendorRow | null> {
  const response = await supabase
    .from("vendors")
    .select("id, name")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true })
    .limit(1)
  if (response.error) throw response.error
  const row = (response.data ?? [])[0]
  if (!row) return null
  const record = asRecord(row)
  return { id: str(record.id), name: nullableStr(record.name) }
}

async function loadJobsForVendor(
  supabase: SupabaseClient,
  vendorId: string
): Promise<VendorJob[]> {
  // service_orders link to a vendor through their originating ticket
  // (service_tickets.vendor_id); an inner embed filters to this vendor's work.
  const response = await supabase
    .from("service_orders")
    .select(
      "id, order_no, status, quoted_price_cents, currency, requested_for_at, service_tickets:ticket_id!inner(title, vendor_id)"
    )
    .eq("service_tickets.vendor_id", vendorId)
    .order("requested_for_at", { ascending: false })
    .limit(25)
  if (response.error) throw response.error
  return (response.data ?? []).map((row) => {
    const record = asRecord(row)
    const ticket = related(record.service_tickets)
    const quotedPriceCents = num(record.quoted_price_cents)
    const currency = normalizeCurrency(record.currency)
    return {
      id: str(record.id),
      orderNo: nullableStr(record.order_no),
      title: nullableStr(ticket.title),
      status: str(record.status, "open"),
      quotedPriceCents,
      currency,
      requestedForAt: nullableStr(record.requested_for_at),
      quotedLabel: formatDualFromCents(quotedPriceCents, currency),
    }
  })
}

async function loadInvoicesForVendor(
  supabase: SupabaseClient,
  vendorId: string,
  limit: number
): Promise<VendorInvoiceView[]> {
  const response = await supabase
    .from("service_provider_invoices")
    .select(
      "id, invoice_no, submission_status, status, subtotal_cents, tax_cents, total_cents, amount_cents, currency, external_ref, service_order_id, issued_at, due_at, created_at, service_provider_invoice_lines(id, description, quantity, unit_price_cents, tax_rate, line_total_cents)"
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (response.error) throw response.error
  return (response.data ?? []).map(mapInvoiceRow)
}

function emptyWorkspace(
  profile: UserProfile,
  source: VendorInvoiceSource,
  warning?: string
): VendorWorkspace {
  return {
    contractVersion: VENDOR_INVOICE_CONTRACT_VERSION,
    source,
    generatedAt: new Date().toISOString(),
    vendorLinked: false,
    vendorName: null,
    capabilities: { canSubmit: canSubmitVendorInvoices(profile) },
    jobs: [],
    invoices: [],
    summary: summaryFor([], []),
    warning,
  }
}

// --------------------------------------------------------------------------
// Public API.
// --------------------------------------------------------------------------

export async function getVendorWorkspace(
  profile: UserProfile,
  { limit = 25, useLocalAccessProfile = false } = {}
): Promise<VendorWorkspace> {
  if (!canViewVendorInvoices(profile)) {
    throw new VendorInvoiceDomainError(
      "VENDOR_INVOICE_VIEW_FORBIDDEN",
      "Your role cannot view the vendor invoicing workspace.",
      403
    )
  }
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localWorkspace(profile)
  }

  try {
    const supabase = await createClient()
    const vendor = await loadVendorForProfile(supabase, profile.id)
    if (!vendor) {
      return emptyWorkspace(profile, "supabase")
    }
    const [jobs, invoices] = await Promise.all([
      loadJobsForVendor(supabase, vendor.id).catch(() => [] as VendorJob[]),
      loadInvoicesForVendor(supabase, vendor.id, boundedLimit),
    ])
    return {
      contractVersion: VENDOR_INVOICE_CONTRACT_VERSION,
      source: "supabase",
      generatedAt: new Date().toISOString(),
      vendorLinked: true,
      vendorName: vendor.name,
      capabilities: { canSubmit: canSubmitVendorInvoices(profile) },
      jobs,
      invoices,
      summary: summaryFor(jobs, invoices),
    }
  } catch (error) {
    if (error instanceof VendorInvoiceDomainError) throw error
    if (canUseLocalSeedFallback()) {
      return localWorkspace(
        profile,
        "Live vendor data was unavailable; showing the local reference set."
      )
    }
    throw error
  }
}

export async function submitInvoice(
  profile: UserProfile,
  input: SubmitInvoiceInput,
  { useLocalAccessProfile = false } = {}
): Promise<SubmitInvoiceResult> {
  if (!canSubmitVendorInvoices(profile)) {
    throw new VendorInvoiceDomainError(
      "VENDOR_INVOICE_SUBMIT_FORBIDDEN",
      "Your role cannot issue vendor invoices.",
      403
    )
  }
  validateSubmitInput(input)

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localSubmit(input)
  }

  const supabase = await createClient()
  const response = await supabase.rpc("submit_vendor_invoice", {
    p_invoice_no: input.invoiceNo.trim(),
    p_lines: input.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      taxRate: line.taxRate,
    })),
    p_service_order_id: input.serviceOrderId,
    p_due_at: input.dueAt,
    p_idempotency_key: input.idempotencyKey,
  })
  if (response.error) throw mapSupabaseError(response.error)
  return mapInvoiceJson(response.data)
}

export async function reviewInvoice(
  profile: UserProfile,
  input: ReviewInvoiceInput,
  { useLocalAccessProfile = false } = {}
): Promise<SubmitInvoiceResult> {
  if (!canReviewVendorInvoices(profile)) {
    throw new VendorInvoiceDomainError(
      "VENDOR_INVOICE_REVIEW_FORBIDDEN",
      "Only an admin or accountant may review a vendor invoice.",
      403
    )
  }
  if (!input.idempotencyKey || input.idempotencyKey.length > 200) {
    throw new VendorInvoiceDomainError(
      "VENDOR_INVOICE_IDEMPOTENCY_INVALID",
      "A valid idempotency key is required.",
      422
    )
  }
  if (!input.invoiceId || input.invoiceId.length > 100) {
    throw new VendorInvoiceDomainError(
      "VENDOR_INVOICE_ID_INVALID",
      "Select a valid invoice.",
      422
    )
  }

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    // Offline QA operates only on stored (submitted) invoices; the immutable seed
    // set is not review-mutated. The accountant-owned status is never touched.
    return withLocalState(true, (state) => {
      const invoice = state.invoices.find((item) => item.id === input.invoiceId)
      if (!invoice) {
        throw new VendorInvoiceDomainError(
          "VENDOR_INVOICE_NOT_FOUND",
          "The invoice was not found in this workspace.",
          404
        )
      }
      invoice.submissionStatus = REVIEW_TARGET_STATUS[input.decision]
      return { source: "local-seed" as const, invoice: localInvoiceView(invoice) }
    })
  }

  const supabase = await createClient()
  const response = await supabase.rpc("review_vendor_invoice", {
    p_invoice_id: input.invoiceId,
    p_decision: input.decision,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  })
  if (response.error) throw mapSupabaseError(response.error)
  return mapInvoiceJson(response.data)
}
