// Wallet / credit-ledger repository.
//
// Supabase-first with a file-backed local-seed fallback for access-profile / QA
// mode, mirroring accountant-finance-repository.ts. Every response carries a
// `source: "supabase" | "local-seed"` field. Every write takes an idempotency
// key and is idempotent: a retried call returns the original transaction.
//
// Money is DEMO credit and provider-swappable. Top-up is a simulated funding
// step; a real payment provider drops in later behind the same functions and the
// same wallet_topup RPC. Amounts are integer minor units (kurus / cents).

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
import type { NativeCurrency } from "@/lib/currency"
import { hasAnyRolePermission } from "@/lib/rbac"
import { WALLET_LOCAL_SEED } from "@/lib/wallet-data"

export const WALLET_CONTRACT_VERSION = "wallet.v1" as const
export const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export type WalletSource = "supabase" | "local-seed"
export type WalletKind = "user" | "settlement" | "revenue"
export type WalletStatus = "active" | "frozen" | "closed"
export type WalletTransactionType =
  | "topup"
  | "spend"
  | "transfer"
  | "refund"
  | "offset"
export type WalletDirection = "in" | "out"

export interface WalletSummary {
  id: string
  kind: WalletKind
  currency: NativeCurrency
  balanceCents: number
  lowBalanceThresholdCents: number
  status: WalletStatus
  /** True when balanceCents <= lowBalanceThresholdCents. */
  lowBalance: boolean
}

export interface WalletTransactionView {
  id: string
  type: WalletTransactionType
  amountCents: number
  currency: NativeCurrency
  /** Direction relative to the actor's own wallet. */
  direction: WalletDirection
  operation: string | null
  reason: string | null
  status: string
  createdAt: string
}

export interface WalletCapabilities {
  canTopUp: boolean
  canSpend: boolean
  canTransfer: boolean
}

export interface WalletOverview {
  contractVersion: typeof WALLET_CONTRACT_VERSION
  source: WalletSource
  generatedAt: string
  wallet: WalletSummary
  capabilities: WalletCapabilities
  transactions: WalletTransactionView[]
  warning?: string
}

export interface WalletMutationResult {
  source: WalletSource
  wallet: WalletSummary
  transaction: WalletTransactionView
}

export interface TopUpInput {
  amountCents: number
  idempotencyKey: string
}

export interface SpendInput {
  amountCents: number
  operation: string
  reason: string | null
  idempotencyKey: string
}

export interface TransferInput {
  toWalletId: string
  amountCents: number
  idempotencyKey: string
}

export class WalletDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "WalletDomainError"
  }
}

const MAX_AMOUNT_CENTS = 1_000_000_000_000

// --------------------------------------------------------------------------
// Capability helpers (role gating; the RPC / RLS layer is the real authority)
// --------------------------------------------------------------------------

function walletManagerRole(role: UserProfile["role"]) {
  return role === "admin" || role === "accountant"
}

function computeCapabilities(profile: UserProfile): WalletCapabilities {
  const canCreate =
    hasAnyRolePermission(profile.roles, "wallet", "create") ||
    walletManagerRole(profile.role)
  return {
    canTopUp: canCreate,
    canSpend: canCreate,
    canTransfer:
      hasAnyRolePermission(profile.roles, "wallet", "create") ||
      profile.role === "admin",
  }
}

function canViewWallet(profile: UserProfile) {
  return (
    hasAnyRolePermission(profile.roles, "wallet", "view") ||
    walletManagerRole(profile.role)
  )
}

function normalizeCurrency(value: unknown): NativeCurrency {
  return value === "EUR" ? "EUR" : "TRY"
}

function normalizeKind(value: unknown): WalletKind {
  return value === "settlement" || value === "revenue"
    ? value
    : "user"
}

function normalizeStatus(value: unknown): WalletStatus {
  return value === "frozen" || value === "closed" ? value : "active"
}

function normalizeTxnType(value: unknown): WalletTransactionType {
  return value === "spend" ||
    value === "transfer" ||
    value === "refund" ||
    value === "offset"
    ? value
    : "topup"
}

function withLowBalance(summary: Omit<WalletSummary, "lowBalance">): WalletSummary {
  return {
    ...summary,
    lowBalance: summary.balanceCents <= summary.lowBalanceThresholdCents,
  }
}

function validateAmount(amountCents: number) {
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents < 1 ||
    amountCents > MAX_AMOUNT_CENTS
  ) {
    throw new WalletDomainError(
      "WALLET_AMOUNT_INVALID",
      "The amount must be between 0.01 and 10,000,000,000.00.",
      422
    )
  }
}

function validateIdempotencyKey(key: string) {
  if (!key || key.length > 200) {
    throw new WalletDomainError(
      "WALLET_IDEMPOTENCY_INVALID",
      "A valid idempotency key is required.",
      422
    )
  }
}

// --------------------------------------------------------------------------
// Local-seed path (no database, or explicit access-profile QA mode)
// --------------------------------------------------------------------------

interface LocalWalletTransaction {
  id: string
  type: WalletTransactionType
  amountCents: number
  currency: NativeCurrency
  direction: WalletDirection
  operation: string | null
  reason: string | null
  status: string
  idempotencyKey: string
  createdAt: string
}

interface LocalWalletState {
  version: 1
  transactions: LocalWalletTransaction[]
}

const stateNamespace =
  process.env.CATI_LOCAL_STATE_NAMESPACE ??
  Buffer.from(process.cwd()).toString("base64url").slice(-64)
const statePath = join(tmpdir(), `cati-wallet-${stateNamespace}.v1.json`)
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
  throw new WalletDomainError(
    "WALLET_BUSY",
    "The local wallet workspace is busy; retry the request.",
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

function readState(): LocalWalletState {
  try {
    const parsed = JSON.parse(
      readFileSync(statePath, "utf8")
    ) as Partial<LocalWalletState>
    if (parsed.version !== 1 || !Array.isArray(parsed.transactions)) {
      throw new Error("Unsupported wallet local state.")
    }
    return { version: 1, transactions: parsed.transactions }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, transactions: [] }
    }
    throw error
  }
}

function writeState(state: LocalWalletState) {
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
  operation: (state: LocalWalletState) => T
) {
  if (!localPersistenceEnabled()) {
    return operation({ version: 1, transactions: [] })
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

/** Test-only: drop accumulated local wallet transactions so serial e2e runs stay
 * isolated. The seed opening balance is always preserved. */
export function resetWalletStateForTesting() {
  withLocalState(true, (state) => {
    state.transactions.length = 0
  })
}

function localBalanceCents(transactions: LocalWalletTransaction[]) {
  return transactions.reduce(
    (balance, txn) =>
      balance + (txn.direction === "in" ? txn.amountCents : -txn.amountCents),
    WALLET_LOCAL_SEED.startingBalanceCents
  )
}

function localWalletSummary(
  transactions: LocalWalletTransaction[]
): WalletSummary {
  return withLowBalance({
    id: WALLET_LOCAL_SEED.id,
    kind: "user",
    currency: WALLET_LOCAL_SEED.currency,
    balanceCents: localBalanceCents(transactions),
    lowBalanceThresholdCents: WALLET_LOCAL_SEED.lowBalanceThresholdCents,
    status: "active",
  })
}

function localTransactionView(
  txn: LocalWalletTransaction
): WalletTransactionView {
  return {
    id: txn.id,
    type: txn.type,
    amountCents: txn.amountCents,
    currency: txn.currency,
    direction: txn.direction,
    operation: txn.operation,
    reason: txn.reason,
    status: txn.status,
    createdAt: txn.createdAt,
  }
}

function findLocalByKey(
  state: LocalWalletState,
  idempotencyKey: string
): LocalWalletTransaction | undefined {
  return state.transactions.find((txn) => txn.idempotencyKey === idempotencyKey)
}

function localOverview(
  profile: UserProfile,
  limit: number,
  warning?: string
): WalletOverview {
  return withLocalState(false, (state) => {
    const ordered = [...state.transactions].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    )
    return {
      contractVersion: WALLET_CONTRACT_VERSION,
      source: "local-seed",
      generatedAt: new Date().toISOString(),
      wallet: localWalletSummary(state.transactions),
      capabilities: computeCapabilities(profile),
      transactions: ordered.slice(0, limit).map(localTransactionView),
      warning,
    }
  })
}

function localAppend(
  profile: UserProfile,
  input: {
    type: WalletTransactionType
    amountCents: number
    direction: WalletDirection
    operation: string | null
    reason: string | null
    idempotencyKey: string
  }
): WalletMutationResult {
  return withLocalState(true, (state) => {
    const replay = findLocalByKey(state, input.idempotencyKey)
    if (replay) {
      return {
        source: "local-seed" as const,
        wallet: localWalletSummary(state.transactions),
        transaction: localTransactionView(replay),
      }
    }

    if (input.direction === "out") {
      const balance = localBalanceCents(state.transactions)
      if (balance < input.amountCents) {
        throw new WalletDomainError(
          "WALLET_INSUFFICIENT_FUNDS",
          "Insufficient wallet balance.",
          422
        )
      }
    }

    const txn: LocalWalletTransaction = {
      id: randomUUID(),
      type: input.type,
      amountCents: input.amountCents,
      currency: WALLET_LOCAL_SEED.currency,
      direction: input.direction,
      operation: input.operation,
      reason: input.reason,
      status: "posted",
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
    }
    state.transactions.push(txn)

    return {
      source: "local-seed" as const,
      wallet: localWalletSummary(state.transactions),
      transaction: localTransactionView(txn),
    }
  })
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

function mapWalletFromJson(value: unknown): WalletSummary {
  const record = asRecord(value)
  return withLowBalance({
    id: str(record.id),
    kind: normalizeKind(record.kind),
    currency: normalizeCurrency(record.currency),
    balanceCents: num(record.balanceCents),
    lowBalanceThresholdCents: num(record.lowBalanceThresholdCents),
    status: normalizeStatus(record.status),
  })
}

function canUseLocalSeedFallback() {
  return isAccessProfileEnabled()
}

function mapSupabaseError(error: { message?: string; code?: string }) {
  if (error.code === "42501") {
    return new WalletDomainError(
      "WALLET_SCOPE_FORBIDDEN",
      "You cannot perform this wallet operation.",
      403
    )
  }
  if (error.code === "23514") {
    return new WalletDomainError(
      "WALLET_INSUFFICIENT_FUNDS",
      "Insufficient wallet balance.",
      422
    )
  }
  return new WalletDomainError(
    "WALLET_OPERATION_FAILED",
    "The wallet operation could not be completed. Review the amount and retry.",
    422
  )
}

async function ensureWalletFromSupabase(
  supabase: SupabaseClient,
  currency: NativeCurrency
): Promise<WalletSummary> {
  const response = await supabase.rpc("ensure_user_wallet", {
    p_currency: currency,
  })
  if (response.error) throw mapSupabaseError(response.error)
  return mapWalletFromJson(asRecord(response.data).wallet)
}

async function loadTransactionsFromSupabase(
  supabase: SupabaseClient,
  walletId: string,
  limit: number
): Promise<WalletTransactionView[]> {
  const response = await supabase
    .from("wallet_ledger_entries")
    .select(
      "id, debit_cents, credit_cents, currency, operation, created_at, wallet_transactions:transaction_id(id, type, reason, status, created_at)"
    )
    .eq("wallet_id", walletId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (response.error) throw response.error

  return (response.data ?? []).map((row) => {
    const record = asRecord(row)
    const txn = related(record.wallet_transactions)
    const creditCents = num(record.credit_cents)
    const debitCents = num(record.debit_cents)
    return {
      id: str(txn.id, str(record.id)),
      type: normalizeTxnType(txn.type),
      amountCents: creditCents + debitCents,
      currency: normalizeCurrency(record.currency),
      direction: creditCents > 0 ? "in" : "out",
      operation: nullableStr(record.operation),
      reason: nullableStr(txn.reason),
      status: str(txn.status, "posted"),
      createdAt: str(txn.created_at, str(record.created_at)),
    }
  })
}

/** Build a mutation result from a wallet_transaction_json RPC payload, taken from
 * the perspective of the actor's own wallet. */
function mapMutationResult(
  data: unknown,
  actorWalletId: string
): WalletMutationResult {
  const record = asRecord(data)
  const transaction = asRecord(record.transaction)
  const entries = Array.isArray(record.entries) ? record.entries : []
  const wallets = Array.isArray(record.wallets) ? record.wallets : []

  const actorWalletRow = wallets
    .map(asRecord)
    .find((wallet) => str(wallet.id) === actorWalletId)
  const wallet = mapWalletFromJson(actorWalletRow ?? {})

  const actorEntry = entries
    .map(asRecord)
    .find((entry) => str(entry.walletId) === actorWalletId)
  const creditCents = num(actorEntry?.creditCents)
  const debitCents = num(actorEntry?.debitCents)

  return {
    source: record.source === "supabase" ? "supabase" : "local-seed",
    wallet,
    transaction: {
      id: str(transaction.id),
      type: normalizeTxnType(transaction.type),
      amountCents: creditCents + debitCents,
      currency: normalizeCurrency(actorEntry?.currency ?? wallet.currency),
      direction: creditCents > 0 ? "in" : "out",
      operation: nullableStr(actorEntry?.operation),
      reason: nullableStr(transaction.reason),
      status: str(transaction.status, "posted"),
      createdAt: str(transaction.createdAt),
    },
  }
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function getWalletOverview(
  profile: UserProfile,
  { limit = 20, useLocalAccessProfile = false } = {}
): Promise<WalletOverview> {
  if (!canViewWallet(profile)) {
    throw new WalletDomainError(
      "WALLET_VIEW_FORBIDDEN",
      "Your role cannot view the wallet workspace.",
      403
    )
  }
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localOverview(profile, boundedLimit)
  }

  try {
    const supabase = await createClient()
    const wallet = await ensureWalletFromSupabase(
      supabase,
      WALLET_LOCAL_SEED.currency
    )
    const transactions = await loadTransactionsFromSupabase(
      supabase,
      wallet.id,
      boundedLimit
    )
    return {
      contractVersion: WALLET_CONTRACT_VERSION,
      source: "supabase",
      generatedAt: new Date().toISOString(),
      wallet,
      capabilities: computeCapabilities(profile),
      transactions,
    }
  } catch (error) {
    if (error instanceof WalletDomainError) throw error
    if (canUseLocalSeedFallback()) {
      return localOverview(
        profile,
        boundedLimit,
        "Live wallet data was unavailable; showing the local reference set."
      )
    }
    throw error
  }
}

export async function topUpWallet(
  profile: UserProfile,
  input: TopUpInput,
  { useLocalAccessProfile = false } = {}
): Promise<WalletMutationResult> {
  if (!computeCapabilities(profile).canTopUp) {
    throw new WalletDomainError(
      "WALLET_TOPUP_FORBIDDEN",
      "Your role cannot top up a wallet.",
      403
    )
  }
  validateAmount(input.amountCents)
  validateIdempotencyKey(input.idempotencyKey)

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localAppend(profile, {
      type: "topup",
      amountCents: input.amountCents,
      direction: "in",
      operation: "topup",
      reason: null,
      idempotencyKey: input.idempotencyKey,
    })
  }

  const supabase = await createClient()
  const wallet = await ensureWalletFromSupabase(
    supabase,
    WALLET_LOCAL_SEED.currency
  )
  const response = await supabase.rpc("wallet_topup", {
    p_wallet_id: wallet.id,
    p_amount_cents: input.amountCents,
    p_idempotency_key: input.idempotencyKey,
  })
  if (response.error) throw mapSupabaseError(response.error)
  return mapMutationResult(response.data, wallet.id)
}

export async function spendFromWallet(
  profile: UserProfile,
  input: SpendInput,
  { useLocalAccessProfile = false } = {}
): Promise<WalletMutationResult> {
  if (!computeCapabilities(profile).canSpend) {
    throw new WalletDomainError(
      "WALLET_SPEND_FORBIDDEN",
      "Your role cannot spend from a wallet.",
      403
    )
  }
  validateAmount(input.amountCents)
  validateIdempotencyKey(input.idempotencyKey)
  const operation = input.operation.trim() || "spend"

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localAppend(profile, {
      type: "spend",
      amountCents: input.amountCents,
      direction: "out",
      operation,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    })
  }

  const supabase = await createClient()
  const wallet = await ensureWalletFromSupabase(
    supabase,
    WALLET_LOCAL_SEED.currency
  )
  const response = await supabase.rpc("wallet_spend", {
    p_wallet_id: wallet.id,
    p_amount_cents: input.amountCents,
    p_operation: operation,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  })
  if (response.error) throw mapSupabaseError(response.error)
  return mapMutationResult(response.data, wallet.id)
}

export async function transferAllowance(
  profile: UserProfile,
  input: TransferInput,
  { useLocalAccessProfile = false } = {}
): Promise<WalletMutationResult> {
  if (!computeCapabilities(profile).canTransfer) {
    throw new WalletDomainError(
      "WALLET_TRANSFER_FORBIDDEN",
      "Your role cannot transfer an allowance.",
      403
    )
  }
  validateAmount(input.amountCents)
  validateIdempotencyKey(input.idempotencyKey)
  if (!input.toWalletId || input.toWalletId.length > 120) {
    throw new WalletDomainError(
      "WALLET_TRANSFER_TARGET_INVALID",
      "Select a valid destination wallet.",
      422
    )
  }

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    // Offline QA has a single local wallet; model the allowance as an outflow.
    return localAppend(profile, {
      type: "transfer",
      amountCents: input.amountCents,
      direction: "out",
      operation: "transfer",
      reason: null,
      idempotencyKey: input.idempotencyKey,
    })
  }

  const supabase = await createClient()
  const fromWallet = await ensureWalletFromSupabase(
    supabase,
    WALLET_LOCAL_SEED.currency
  )
  const response = await supabase.rpc("wallet_transfer", {
    p_from_wallet: fromWallet.id,
    p_to_wallet: input.toWalletId,
    p_amount_cents: input.amountCents,
    p_idempotency_key: input.idempotencyKey,
  })
  if (response.error) throw mapSupabaseError(response.error)
  return mapMutationResult(response.data, fromWallet.id)
}
