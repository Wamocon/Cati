import { createHash, randomUUID } from "node:crypto"
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
import { flats } from "@/lib/site-management-data"
import { createClient } from "@/lib/supabase/server"

export const MANUAL_PAYMENT_CONTRACT_VERSION = "manual-payments.v1" as const
export const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export type ManualPaymentMethod =
  | "bank_transfer"
  | "cash"
  | "card_terminal"
  | "other"
export type ManualPaymentStatus = "posted" | "reversed"
export type ManualPaymentSource = "supabase" | "local-qa"

export interface ManualPaymentAccount {
  id: string
  unitId: string
  unitNo: string
  ownerResidentId: string
  ownerName: string
  currency: string
}

export interface ManualPaymentRecord {
  id: string
  unitId: string
  unitNo: string
  ownerResidentId: string
  ownerName: string
  amountCents: number
  currency: string
  receivedAt: string
  reference: string
  method: ManualPaymentMethod
  businessNote: string
  reconciliationStatus: "unreconciled" | "reconciled"
  status: ManualPaymentStatus
  version: number
  createdAt: string
  reversedAt: string | null
  reversalReason: string | null
  replayed: boolean
  source: ManualPaymentSource
}

export interface ManualPaymentWorkspace {
  contractVersion: typeof MANUAL_PAYMENT_CONTRACT_VERSION
  source: ManualPaymentSource
  generatedAt: string
  truth: "manual_unreconciled_no_provider_confirmation"
  capabilities: {
    canPost: boolean
    canReverse: boolean
    readOnly: boolean
  }
  accounts: ManualPaymentAccount[]
  payments: ManualPaymentRecord[]
}

export interface PostManualPaymentInput {
  unitId: string
  ownerResidentId: string
  amountCents: number
  currency: string
  receivedAt: string
  reference: string
  method: ManualPaymentMethod
  businessNote: string
  idempotencyKey: string
}

export interface ReverseManualPaymentInput {
  paymentId: string
  expectedVersion: number
  reason: string
  idempotencyKey: string
}

export interface LocalManualPaymentLedgerProjection {
  id: string
  unitId: string
  entryType: "payment" | "adjustment"
  dueDate: null
  paidAt: string
  postedAt: string
  createdAt: string
  status: "paid" | "cancelled"
  amountCents: number
  currency: string
  description: string
  metadata: {
    source: "manual_payment" | "manual_payment_reversal"
    direction: "receipt" | "reversal"
    reconciliationStatus?: "unreconciled"
    manualPaymentId?: string
    reversesManualPaymentId?: string
  }
}

export class ManualPaymentDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "ManualPaymentDomainError"
  }
}

interface LocalPaymentFacts {
  id: string
  unitId: string
  ownerResidentId: string
  amountCents: number
  currency: string
  receivedAt: string
  reference: string
  method: ManualPaymentMethod
  businessNote: string
  idempotencyKey: string
  fingerprint: string
  createdBy: string
  createdAt: string
}

interface LocalReversalFacts {
  id: string
  paymentId: string
  reason: string
  idempotencyKey: string
  fingerprint: string
  createdBy: string
  createdAt: string
}

interface LocalManualPaymentState {
  version: 1
  payments: LocalPaymentFacts[]
  reversals: LocalReversalFacts[]
}

const stateNamespace =
  process.env.CATI_LOCAL_STATE_NAMESPACE ??
  Buffer.from(process.cwd()).toString("base64url").slice(-64)
const statePath = join(
  tmpdir(),
  `cati-manual-payments-${stateNamespace}.v1.json`
)
const lockPath = `${statePath}.lock`
const waitBuffer = new Int32Array(new SharedArrayBuffer(4))

function canWrite(role: UserProfile["role"]) {
  return role === "admin" || role === "accountant"
}

function canView(role: UserProfile["role"]) {
  return canWrite(role) || role === "manager"
}

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
        if ((lockError as NodeJS.ErrnoException).code !== "ENOENT") {
          throw lockError
        }
      }
      Atomics.wait(waitBuffer, 0, 0, 10)
    }
  }
  throw new ManualPaymentDomainError(
    "MANUAL_PAYMENT_BUSY",
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

function readState(): LocalManualPaymentState {
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8")) as Partial<LocalManualPaymentState>
    if (parsed.version !== 1 || !Array.isArray(parsed.payments) || !Array.isArray(parsed.reversals)) {
      throw new Error("Unsupported manual-payment local state.")
    }
    return {
      version: 1,
      payments: parsed.payments,
      reversals: parsed.reversals,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, payments: [], reversals: [] }
    }
    throw error
  }
}

function writeState(state: LocalManualPaymentState) {
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
      if ((unlinkError as NodeJS.ErrnoException).code !== "ENOENT") {
        throw unlinkError
      }
    }
    renameSync(temporaryPath, statePath)
  }
}

function withLocalState<T>(write: boolean, operation: (state: LocalManualPaymentState) => T) {
  if (!localPersistenceEnabled()) {
    return operation({ version: 1, payments: [], reversals: [] })
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

/** Test-only: clear accumulated local manual-payment facts so serial e2e runs stay
 * isolated. Reads still return the seed-derived accounts; only recorded
 * payments/reversals from prior tests are dropped. */
export function resetManualPaymentStateForTesting() {
  withLocalState(true, (state) => {
    state.payments.length = 0
    state.reversals.length = 0
  })
}

function localAccounts(): ManualPaymentAccount[] {
  return flats
    .filter((flat) => flat.ownerName.trim() && flat.ownerName !== "BoÅŸ")
    .slice(0, 250)
    .map((flat) => ({
      id: `${flat.id}:owner-${flat.id}`,
      unitId: flat.id,
      unitNo: flat.number,
      ownerResidentId: `owner-${flat.id}`,
      ownerName: flat.ownerName,
      currency: "TRY",
    }))
}

function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function reversalForPayment(
  state: LocalManualPaymentState,
  paymentId: string
) {
  return state.reversals.find((reversal) => reversal.paymentId === paymentId) ?? null
}

function localRecord(
  state: LocalManualPaymentState,
  payment: LocalPaymentFacts,
  replayed = false
): ManualPaymentRecord {
  const account = localAccounts().find(
    (candidate) =>
      candidate.unitId === payment.unitId &&
      candidate.ownerResidentId === payment.ownerResidentId
  )
  if (!account) {
    throw new ManualPaymentDomainError(
      "MANUAL_PAYMENT_ACCOUNT_STALE",
      "The payment account no longer exists in this QA data set.",
      409
    )
  }
  const reversal = reversalForPayment(state, payment.id)
  return {
    id: payment.id,
    unitId: payment.unitId,
    unitNo: account.unitNo,
    ownerResidentId: payment.ownerResidentId,
    ownerName: account.ownerName,
    amountCents: payment.amountCents,
    currency: payment.currency,
    receivedAt: payment.receivedAt,
    reference: payment.reference,
    method: payment.method,
    businessNote: payment.businessNote,
    reconciliationStatus: "unreconciled",
    status: reversal ? "reversed" : "posted",
    version: reversal ? 2 : 1,
    createdAt: payment.createdAt,
    reversedAt: reversal?.createdAt ?? null,
    reversalReason: reversal?.reason ?? null,
    replayed,
    source: "local-qa",
  }
}

function normalizeAccount(value: unknown): ManualPaymentAccount | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const id = typeof record.id === "string" ? record.id : ""
  const unitId = typeof record.unitId === "string" ? record.unitId : ""
  const unitNo = typeof record.unitNo === "string" ? record.unitNo : ""
  const ownerResidentId =
    typeof record.ownerResidentId === "string" ? record.ownerResidentId : ""
  const ownerName = typeof record.ownerName === "string" ? record.ownerName : ""
  const currency = typeof record.currency === "string" ? record.currency : "TRY"
  if (!id || !unitId || !unitNo || !ownerResidentId || !ownerName) return null
  return { id, unitId, unitNo, ownerResidentId, ownerName, currency }
}

function normalizePayment(
  value: unknown,
  fallbackSource: ManualPaymentSource
): ManualPaymentRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const string = (key: string) =>
    typeof record[key] === "string" ? (record[key] as string) : ""
  const nullableString = (key: string) => string(key) || null
  const amountCents = Number(record.amountCents)
  const version = Number(record.version)
  const method = string("method") as ManualPaymentMethod
  const status = string("status") as ManualPaymentStatus
  if (
    !string("id") ||
    !string("unitId") ||
    !string("unitNo") ||
    !string("ownerResidentId") ||
    !string("ownerName") ||
    !Number.isSafeInteger(amountCents) ||
    amountCents < 1 ||
    !Number.isSafeInteger(version) ||
    !["bank_transfer", "cash", "card_terminal", "other"].includes(method) ||
    !["posted", "reversed"].includes(status)
  ) {
    return null
  }
  return {
    id: string("id"),
    unitId: string("unitId"),
    unitNo: string("unitNo"),
    ownerResidentId: string("ownerResidentId"),
    ownerName: string("ownerName"),
    amountCents,
    currency: string("currency") || "TRY",
    receivedAt: string("receivedAt"),
    reference: string("reference"),
    method,
    businessNote: string("businessNote"),
    reconciliationStatus:
      string("reconciliationStatus") === "reconciled"
        ? "reconciled"
        : "unreconciled",
    status,
    version,
    createdAt: string("createdAt"),
    reversedAt: nullableString("reversedAt"),
    reversalReason: nullableString("reversalReason"),
    replayed: record.replayed === true,
    source: record.source === "local-qa" ? "local-qa" : fallbackSource,
  }
}

function normalizeWorkspace(value: unknown): ManualPaymentWorkspace {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Manual payment workspace returned an invalid payload.")
  }
  const record = value as Record<string, unknown>
  const capabilities =
    record.capabilities &&
    typeof record.capabilities === "object" &&
    !Array.isArray(record.capabilities)
      ? (record.capabilities as Record<string, unknown>)
      : {}
  return {
    contractVersion: MANUAL_PAYMENT_CONTRACT_VERSION,
    source: "supabase",
    generatedAt:
      typeof record.generatedAt === "string"
        ? record.generatedAt
        : new Date().toISOString(),
    truth: "manual_unreconciled_no_provider_confirmation",
    capabilities: {
      canPost: capabilities.canPost === true,
      canReverse: capabilities.canReverse === true,
      readOnly: capabilities.readOnly === true,
    },
    accounts: Array.isArray(record.accounts)
      ? record.accounts.flatMap((item) => {
          const normalized = normalizeAccount(item)
          return normalized ? [normalized] : []
        })
      : [],
    payments: Array.isArray(record.payments)
      ? record.payments.flatMap((item) => {
          const normalized = normalizePayment(item, "supabase")
          return normalized ? [normalized] : []
        })
      : [],
  }
}

function assertPostRole(profile: UserProfile) {
  if (!canWrite(profile.role)) {
    throw new ManualPaymentDomainError(
      "MANUAL_PAYMENT_POST_FORBIDDEN",
      "Only an organization admin or accountant may post a manual payment.",
      403
    )
  }
}

function mapSupabaseError(error: { message?: string; code?: string }) {
  const message = error.message ?? "Manual payment command failed."
  if (error.code === "42501") {
    return new ManualPaymentDomainError(
      "MANUAL_PAYMENT_SCOPE_FORBIDDEN",
      message,
      403
    )
  }
  if (error.code === "23505" || /already (?:used|recorded)/i.test(message)) {
    return new ManualPaymentDomainError(
      "MANUAL_PAYMENT_IDEMPOTENCY_CONFLICT",
      message,
      409
    )
  }
  if (error.code === "40001" || /conflict/i.test(message)) {
    return new ManualPaymentDomainError(
      "MANUAL_PAYMENT_VERSION_CONFLICT",
      message,
      409
    )
  }
  return new ManualPaymentDomainError(
    "MANUAL_PAYMENT_COMMAND_FAILED",
    "The payment command could not be completed. Review the details and retry.",
    422
  )
}

export async function getManualPaymentWorkspace(
  profile: UserProfile,
  { limit = 50, useLocalAccessProfile = false } = {}
): Promise<ManualPaymentWorkspace> {
  if (!canView(profile.role)) {
    throw new ManualPaymentDomainError(
      "MANUAL_PAYMENT_VIEW_FORBIDDEN",
      "The current role cannot view the manual payment workspace.",
      403
    )
  }
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return withLocalState(false, (state) => ({
      contractVersion: MANUAL_PAYMENT_CONTRACT_VERSION,
      source: "local-qa",
      generatedAt: new Date().toISOString(),
      truth: "manual_unreconciled_no_provider_confirmation",
      capabilities: {
        canPost: canWrite(profile.role),
        canReverse: canWrite(profile.role),
        readOnly: profile.role === "manager",
      },
      accounts: localAccounts(),
      payments: state.payments
        .map((payment) => localRecord(state, payment))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, boundedLimit),
    }))
  }

  const supabase = await createClient()
  const response = await supabase.rpc("manual_payment_workspace", {
    p_limit: boundedLimit,
  })
  if (response.error) throw mapSupabaseError(response.error)
  return normalizeWorkspace(response.data)
}

export async function postManualPayment(
  profile: UserProfile,
  input: PostManualPaymentInput,
  { useLocalAccessProfile = false } = {}
): Promise<ManualPaymentRecord> {
  assertPostRole(profile)
  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return withLocalState(true, (state) => {
      const account = localAccounts().find(
        (candidate) =>
          candidate.unitId === input.unitId &&
          candidate.ownerResidentId === input.ownerResidentId
      )
      if (!account) {
        throw new ManualPaymentDomainError(
          "MANUAL_PAYMENT_ACCOUNT_FORBIDDEN",
          "The selected unit and owner account are outside this workspace.",
          403
        )
      }
      if (input.currency !== account.currency) {
        throw new ManualPaymentDomainError(
          "MANUAL_PAYMENT_CURRENCY_MISMATCH",
          "Payment currency must match the selected account currency.",
          422
        )
      }
      const requestFingerprint = fingerprint(input)
      const idempotent = state.payments.find(
        (payment) => payment.idempotencyKey === input.idempotencyKey
      )
      if (idempotent) {
        if (idempotent.fingerprint !== requestFingerprint) {
          throw new ManualPaymentDomainError(
            "MANUAL_PAYMENT_IDEMPOTENCY_CONFLICT",
            "This idempotency key was already used with different payment facts.",
            409
          )
        }
        return localRecord(state, idempotent, true)
      }
      if (
        state.payments.some(
          (payment) =>
            payment.method === input.method &&
            payment.reference.toLocaleLowerCase("tr-TR") ===
              input.reference.toLocaleLowerCase("tr-TR")
        )
      ) {
        throw new ManualPaymentDomainError(
          "MANUAL_PAYMENT_REFERENCE_EXISTS",
          "This manual payment reference is already recorded.",
          409
        )
      }

      const payment: LocalPaymentFacts = {
        id: randomUUID(),
        unitId: input.unitId,
        ownerResidentId: input.ownerResidentId,
        amountCents: input.amountCents,
        currency: input.currency,
        receivedAt: input.receivedAt,
        reference: input.reference,
        method: input.method,
        businessNote: input.businessNote,
        idempotencyKey: input.idempotencyKey,
        fingerprint: requestFingerprint,
        createdBy: profile.id,
        createdAt: new Date().toISOString(),
      }
      state.payments.push(payment)
      return localRecord(state, payment)
    })
  }

  const supabase = await createClient()
  const response = await supabase.rpc("post_manual_payment_command", {
    p_unit_id: input.unitId,
    p_owner_resident_id: input.ownerResidentId,
    p_amount_cents: input.amountCents,
    p_currency: input.currency,
    p_received_at: input.receivedAt,
    p_reference: input.reference,
    p_method: input.method,
    p_business_note: input.businessNote,
    p_idempotency_key: input.idempotencyKey,
  })
  if (response.error) throw mapSupabaseError(response.error)
  const payment = normalizePayment(response.data, "supabase")
  if (!payment) throw new Error("Manual payment command returned an invalid payload.")
  return payment
}

export async function reverseManualPayment(
  profile: UserProfile,
  input: ReverseManualPaymentInput,
  { useLocalAccessProfile = false } = {}
): Promise<ManualPaymentRecord> {
  assertPostRole(profile)
  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return withLocalState(true, (state) => {
      const requestFingerprint = fingerprint(input)
      const existingReversal = state.reversals.find(
        (reversal) => reversal.idempotencyKey === input.idempotencyKey
      )
      if (existingReversal) {
        if (
          existingReversal.paymentId !== input.paymentId ||
          existingReversal.fingerprint !== requestFingerprint
        ) {
          throw new ManualPaymentDomainError(
            "MANUAL_PAYMENT_IDEMPOTENCY_CONFLICT",
            "This idempotency key was already used for another reversal.",
            409
          )
        }
        const payment = state.payments.find(
          (candidate) => candidate.id === existingReversal.paymentId
        )
        if (!payment) throw new Error("Local payment reversal lost its source payment.")
        return localRecord(state, payment, true)
      }

      const payment = state.payments.find(
        (candidate) => candidate.id === input.paymentId
      )
      if (!payment) {
        throw new ManualPaymentDomainError(
          "MANUAL_PAYMENT_NOT_FOUND",
          "Manual payment was not found.",
          404
        )
      }
      const currentVersion = reversalForPayment(state, payment.id) ? 2 : 1
      if (currentVersion !== input.expectedVersion || currentVersion !== 1) {
        throw new ManualPaymentDomainError(
          "MANUAL_PAYMENT_VERSION_CONFLICT",
          "This payment changed. Refresh the record before reversing it.",
          409
        )
      }
      state.reversals.push({
        id: randomUUID(),
        paymentId: payment.id,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        fingerprint: requestFingerprint,
        createdBy: profile.id,
        createdAt: new Date().toISOString(),
      })
      return localRecord(state, payment)
    })
  }

  const supabase = await createClient()
  const response = await supabase.rpc("reverse_manual_payment_command", {
    p_payment_id: input.paymentId,
    p_expected_version: input.expectedVersion,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  })
  if (response.error) throw mapSupabaseError(response.error)
  const payment = normalizePayment(response.data, "supabase")
  if (!payment) throw new Error("Manual payment reversal returned an invalid payload.")
  return payment
}

export function getLocalManualPaymentLedgerProjection(
  unitIds?: ReadonlySet<string>
): LocalManualPaymentLedgerProjection[] {
  if (!localPersistenceEnabled()) return []
  return withLocalState(false, (state) =>
    state.payments.flatMap((payment) => {
      if (unitIds && !unitIds.has(payment.unitId)) return []
      const receipt: LocalManualPaymentLedgerProjection = {
        id: `manual-payment-ledger-${payment.id}`,
        unitId: payment.unitId,
        entryType: "payment",
        dueDate: null,
        paidAt: payment.receivedAt,
        postedAt: payment.receivedAt,
        createdAt: payment.createdAt,
        status: "paid",
        amountCents: payment.amountCents,
        currency: payment.currency,
        description: payment.businessNote,
        metadata: {
          source: "manual_payment",
          direction: "receipt",
          reconciliationStatus: "unreconciled",
          manualPaymentId: payment.id,
        },
      }
      const reversal = reversalForPayment(state, payment.id)
      if (!reversal) return [receipt]
      return [
        receipt,
        {
          id: `manual-payment-reversal-ledger-${reversal.id}`,
          unitId: payment.unitId,
          entryType: "adjustment" as const,
          dueDate: null,
          paidAt: reversal.createdAt,
          postedAt: reversal.createdAt,
          createdAt: reversal.createdAt,
          status: "cancelled" as const,
          amountCents: payment.amountCents,
          currency: payment.currency,
          description: reversal.reason,
          metadata: {
            source: "manual_payment_reversal" as const,
            direction: "reversal" as const,
            reversesManualPaymentId: payment.id,
          },
        },
      ]
    })
  )
}
