// Guardianship (parent <-> managed child account) repository.
//
// Supabase-first with a file-backed local-QA fallback for access-profile mode,
// mirroring user-role-admin-repository.ts (service-role writes) and
// wallet-repository.ts / activities-repository.ts (source field + local store).
// Every response carries a `source: "supabase" | "local-seed"` field.
//
// Backend model reused from earlier phases (all additive, nothing loosened):
//   * guardianships / delegated_grants (migration 43), writes are admin-only via
//     RLS; this module performs the parent flows with the SERVICE-ROLE client
//     after validating the caller is a parent owner/tenant/guest, mirroring
//     createManagedUser. The admin-only direct RLS stays intact; no migration 47
//     is introduced.
//   * wallet_transfer RPC (migration 44), parent -> child allowance; the RPC
//     re-enforces that the caller owns the source wallet AND is the active
//     guardian of the destination owner.
//   * client_action_requests (migration 3), the approval queue a child action
//     lands in; the guardian approves / declines by transitioning the row.
//   * getChildBookings + the wallets read, reused for each child's activity and
//     balance.
//
// Consent is DEMO-grade: the parent creates the child, self-declares the date of
// birth, and a consent record (consent_recorded_at / consent_by / consent_method)
// is written at creation. Money is DEMO credit; amounts are integer minor units.

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
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { formatDualFromCents, type NativeCurrency } from "@/lib/currency"
import { hasAnyRolePermission, type Role } from "@/lib/rbac"
import { getChildBookings, type BookingView } from "@/lib/activities-repository"

export const GUARDIANSHIP_CONTRACT_VERSION = "guardianship.v1" as const
export const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export type GuardianshipSource = "supabase" | "local-seed"

const MAX_AMOUNT_CENTS = 1_000_000_000_000
const CHILD_WALLET_CURRENCY: NativeCurrency = "TRY"
const CHILD_WALLET_LOW_THRESHOLD_CENTS = 50_000 // ₺500,00 friendly top-up hint
const PARENT_ROLES: readonly Role[] = ["owner", "tenant", "guest"]

// A parent's business role maps to the matching supervised child role.
const CHILD_ROLE_FOR_PARENT: Record<"owner" | "tenant" | "guest", Role> = {
  owner: "child_owner",
  tenant: "child_tenant",
  guest: "child_guest",
}

export interface ManagedChildWallet {
  balanceCents: number
  currency: NativeCurrency
  lowBalanceThresholdCents: number
  lowBalance: boolean
  /** Dual ₺/€ label for the balance. */
  balanceLabel: string
}

export interface ChildApprovalView {
  id: string
  title: string
  actionType: string
  status: string
  createdAt: string
}

export interface ManagedChildView {
  guardianshipId: string
  childProfileId: string
  fullName: string
  role: Role
  relation: string
  status: string
  isMinor: boolean
  ageBand: string | null
  dateOfBirth: string | null
  consentRecordedAt: string | null
  wallet: ManagedChildWallet | null
  recentBookings: BookingView[]
  pendingApprovals: ChildApprovalView[]
}

export interface GuardianWorkspace {
  contractVersion: typeof GUARDIANSHIP_CONTRACT_VERSION
  source: GuardianshipSource
  generatedAt: string
  capabilities: { canManage: boolean }
  children: ManagedChildView[]
  warning?: string
}

export interface AddChildInput {
  fullName: string
  dateOfBirth: string
  relation: string
  consent: boolean
  idempotencyKey: string
}

export interface AddChildResult {
  source: GuardianshipSource
  child: ManagedChildView
}

export interface GuardianshipAck {
  source: GuardianshipSource
  ok: true
  childProfileId?: string
}

export class GuardianshipDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "GuardianshipDomainError"
  }
}

// --------------------------------------------------------------------------
// Capability + shaping helpers (RLS / the RPC are the real authority).
// --------------------------------------------------------------------------

export function canViewGuardianship(profile: UserProfile) {
  return (
    hasAnyRolePermission(profile.roles, "guardianship", "view") ||
    profile.role === "admin"
  )
}

export function canManageGuardianship(profile: UserProfile) {
  return (
    hasAnyRolePermission(profile.roles, "guardianship", "create") ||
    profile.role === "admin"
  )
}

/** The supervised child role that matches the caller's parent role. Falls back to
 * child_guest for an admin (or any parent without a resident role). */
function childRoleForActor(profile: UserProfile): Role {
  for (const role of PARENT_ROLES) {
    if (profile.roles.includes(role)) {
      return CHILD_ROLE_FOR_PARENT[role as "owner" | "tenant" | "guest"]
    }
  }
  return "child_guest"
}

function walletView(
  balanceCents: number,
  currency: NativeCurrency,
  lowThresholdCents: number
): ManagedChildWallet {
  return {
    balanceCents,
    currency,
    lowBalanceThresholdCents: lowThresholdCents,
    lowBalance: balanceCents <= lowThresholdCents,
    balanceLabel: formatDualFromCents(balanceCents, currency),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
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

function normalizeChildRole(value: unknown): Role {
  return value === "child_owner" || value === "child_tenant" || value === "child_guest"
    ? value
    : "child_guest"
}

// --------------------------------------------------------------------------
// Input validation.
// --------------------------------------------------------------------------

function validateFullName(value: string): string {
  const name = value.trim()
  if (name.length < 2 || name.length > 120) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_NAME_INVALID",
      "Enter the child's name (2 to 120 characters).",
      422
    )
  }
  return name
}

interface DobFacts {
  dateOfBirth: string
  ageBand: string
  isMinor: boolean
}

/** Validate a self-declared date of birth and derive the minor / age-band facts.
 * DEMO-grade: a real workflow would verify guardianship and age; here the parent
 * self-declares and a consent record is written alongside. */
function validateDob(value: string): DobFacts {
  const raw = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_DOB_INVALID",
      "Enter a date of birth as YYYY-MM-DD.",
      422
    )
  }
  const parsed = Date.parse(`${raw}T00:00:00.000Z`)
  if (!Number.isFinite(parsed)) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_DOB_INVALID",
      "Enter a valid date of birth.",
      422
    )
  }
  const dob = new Date(parsed)
  const now = new Date()
  if (dob.getTime() > now.getTime()) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_DOB_FUTURE",
      "The date of birth cannot be in the future.",
      422
    )
  }
  // Whole years elapsed (UTC-based; deterministic, no locale drift).
  let age = now.getUTCFullYear() - dob.getUTCFullYear()
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1
  }
  if (age > 120) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_DOB_INVALID",
      "Enter a valid date of birth.",
      422
    )
  }
  const isMinor = age < 18
  return {
    dateOfBirth: raw,
    ageBand: isMinor ? "under_18" : "adult",
    isMinor,
  }
}

function validateRelation(value: string): string {
  const relation = value.trim() || "parent"
  if (relation !== "parent" && relation !== "guardian" && relation !== "delegate") {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_RELATION_INVALID",
      "Choose a relationship: parent, guardian, or delegate.",
      422
    )
  }
  return relation
}

function validateConsent(value: boolean) {
  if (value !== true) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_CONSENT_REQUIRED",
      "Confirm you are the parent or legal guardian and consent to managing this minor's account.",
      422
    )
  }
}

function validateAmount(amountCents: number) {
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents < 1 ||
    amountCents > MAX_AMOUNT_CENTS
  ) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_AMOUNT_INVALID",
      "The allowance must be greater than zero.",
      422
    )
  }
}

function validateIdempotencyKey(key: string) {
  if (!key || key.length > 200) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_IDEMPOTENCY_INVALID",
      "A valid idempotency key is required.",
      422
    )
  }
}

function validateChildId(childProfileId: string) {
  if (!childProfileId || childProfileId.length > 100) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_CHILD_ID_INVALID",
      "Select a valid child account.",
      422
    )
  }
}

// --------------------------------------------------------------------------
// Local-QA path (access-profile mode). File-backed so the workspace persists
// across requests in controlled QA, mirroring the user-role-admin local store.
// --------------------------------------------------------------------------

interface LocalManagedChild {
  guardianshipId: string
  childProfileId: string
  guardianId: string
  fullName: string
  role: Role
  relation: string
  status: "active" | "revoked"
  isMinor: boolean
  ageBand: string
  dateOfBirth: string
  consentRecordedAt: string
  allowanceCents: number
  idempotencyKey: string
  appliedAllowanceKeys: string[]
  createdAt: string
}

interface LocalApproval {
  id: string
  childProfileId: string
  guardianId: string
  title: string
  actionType: string
  status: "queued" | "approved" | "rejected"
  createdAt: string
}

interface LocalGuardianshipState {
  version: 1
  children: LocalManagedChild[]
  approvals: LocalApproval[]
}

const stateNamespace =
  process.env.CATI_LOCAL_STATE_NAMESPACE ??
  Buffer.from(process.cwd()).toString("base64url").slice(-64)
const statePath = join(tmpdir(), `cati-guardianship-${stateNamespace}.v1.json`)
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
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
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
  throw new GuardianshipDomainError(
    "GUARDIANSHIP_BUSY",
    "The local guardianship workspace is busy; retry the request.",
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

function readState(): LocalGuardianshipState {
  try {
    const parsed = JSON.parse(
      readFileSync(statePath, "utf8")
    ) as Partial<LocalGuardianshipState>
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.children) ||
      !Array.isArray(parsed.approvals)
    ) {
      throw new Error("Unsupported guardianship local state.")
    }
    return {
      version: 1,
      children: parsed.children,
      approvals: parsed.approvals,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, children: [], approvals: [] }
    }
    throw error
  }
}

function writeState(state: LocalGuardianshipState) {
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
  operation: (state: LocalGuardianshipState) => T
): T {
  if (!localPersistenceEnabled()) {
    return operation({ version: 1, children: [], approvals: [] })
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

/** Test-only: drop accumulated local guardianship state so serial e2e runs stay
 * isolated. */
export function resetGuardianshipStateForTesting() {
  withLocalState(true, (state) => {
    state.children.length = 0
    state.approvals.length = 0
  })
}

function localChildView(
  child: LocalManagedChild,
  approvals: LocalApproval[]
): ManagedChildView {
  return {
    guardianshipId: child.guardianshipId,
    childProfileId: child.childProfileId,
    fullName: child.fullName,
    role: child.role,
    relation: child.relation,
    status: child.status,
    isMinor: child.isMinor,
    ageBand: child.ageBand,
    dateOfBirth: child.dateOfBirth,
    consentRecordedAt: child.consentRecordedAt,
    wallet: walletView(
      child.allowanceCents,
      CHILD_WALLET_CURRENCY,
      CHILD_WALLET_LOW_THRESHOLD_CENTS
    ),
    recentBookings: [],
    pendingApprovals: approvals
      .filter(
        (approval) =>
          approval.childProfileId === child.childProfileId &&
          approval.status === "queued"
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((approval) => ({
        id: approval.id,
        title: approval.title,
        actionType: approval.actionType,
        status: approval.status,
        createdAt: approval.createdAt,
      })),
  }
}

function localActiveChildren(
  state: LocalGuardianshipState,
  guardianId: string
): LocalManagedChild[] {
  return state.children
    .filter((child) => child.guardianId === guardianId && child.status === "active")
    .sort((left, right) => left.fullName.localeCompare(right.fullName))
}

function localWorkspace(profile: UserProfile): GuardianWorkspace {
  return withLocalState(false, (state) => ({
    contractVersion: GUARDIANSHIP_CONTRACT_VERSION,
    source: "local-seed" as const,
    generatedAt: new Date().toISOString(),
    capabilities: { canManage: canManageGuardianship(profile) },
    children: localActiveChildren(state, profile.id).map((child) =>
      localChildView(child, state.approvals)
    ),
  }))
}

function localFindActiveChild(
  state: LocalGuardianshipState,
  guardianId: string,
  childProfileId: string
): LocalManagedChild {
  const child = state.children.find(
    (item) =>
      item.guardianId === guardianId &&
      item.childProfileId === childProfileId &&
      item.status === "active"
  )
  if (!child) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_CHILD_NOT_FOUND",
      "That managed child was not found.",
      404
    )
  }
  return child
}

// --------------------------------------------------------------------------
// Supabase path (service-role for the RLS-restricted profile / guardianship
// reads + writes; the session client for the guardian-scoped allowance RPC).
// --------------------------------------------------------------------------

type ServiceClient = NonNullable<ReturnType<typeof createServiceRoleClient>>

function requireService(): ServiceClient {
  const service = createServiceRoleClient()
  if (!service) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_SERVICE_ROLE_REQUIRED",
      "Managing child accounts requires the server service-role configuration.",
      503
    )
  }
  return service
}

interface GuardianshipRow {
  id: string
  childProfileId: string
  relation: string
  status: string
  consentRecordedAt: string | null
}

async function loadActiveGuardianships(
  service: ServiceClient,
  guardianId: string
): Promise<GuardianshipRow[]> {
  const { data, error } = await service
    .from("guardianships")
    .select("id, child_profile_id, relation, status, consent_recorded_at")
    .eq("guardian_profile_id", guardianId)
    .eq("status", "active")
    .is("revoked_at", null)
  if (error) throw error
  return (data ?? []).flatMap((row) => {
    const record = asRecord(row)
    const childProfileId = str(record.child_profile_id)
    if (!childProfileId) return []
    return [
      {
        id: str(record.id),
        childProfileId,
        relation: str(record.relation, "parent"),
        status: str(record.status, "active"),
        consentRecordedAt: nullableStr(record.consent_recorded_at),
      },
    ]
  })
}

async function assertActiveGuardian(
  service: ServiceClient,
  guardianId: string,
  childProfileId: string
): Promise<GuardianshipRow> {
  const guardianships = await loadActiveGuardianships(service, guardianId)
  const match = guardianships.find((row) => row.childProfileId === childProfileId)
  if (!match) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_CHILD_NOT_FOUND",
      "That managed child was not found for your account.",
      404
    )
  }
  return match
}

async function buildSupabaseChildView(
  service: ServiceClient,
  actor: UserProfile,
  guardianship: GuardianshipRow,
  bookingsByChild: Map<string, BookingView[]>
): Promise<ManagedChildView> {
  const [{ data: profileRow }, { data: walletRow }, { data: approvalRows }] =
    await Promise.all([
      service
        .from("profiles")
        .select("full_name, role, is_minor, age_band, date_of_birth")
        .eq("id", guardianship.childProfileId)
        .maybeSingle(),
      service
        .from("wallets")
        .select("balance_cents, currency, low_balance_threshold_cents")
        .eq("owner_profile_id", guardianship.childProfileId)
        .eq("kind", "user")
        .maybeSingle(),
      service
        .from("client_action_requests")
        .select("id, title, action_type, status, created_at")
        .eq("requested_by", guardianship.childProfileId)
        .eq("status", "queued")
        .order("created_at", { ascending: false })
        .limit(20),
    ])

  const profile = asRecord(profileRow)
  const wallet = asRecord(walletRow)
  const walletCurrency: NativeCurrency =
    wallet.currency === "EUR" ? "EUR" : "TRY"

  return {
    guardianshipId: guardianship.id,
    childProfileId: guardianship.childProfileId,
    fullName: str(profile.full_name).trim() || "Child account",
    role: normalizeChildRole(profile.role),
    relation: guardianship.relation,
    status: guardianship.status,
    isMinor: profile.is_minor !== false,
    ageBand: nullableStr(profile.age_band),
    dateOfBirth: nullableStr(profile.date_of_birth),
    consentRecordedAt: guardianship.consentRecordedAt,
    wallet: walletRow
      ? walletView(
          num(wallet.balance_cents),
          walletCurrency,
          num(wallet.low_balance_threshold_cents)
        )
      : null,
    recentBookings: (bookingsByChild.get(guardianship.childProfileId) ?? []).slice(
      0,
      5
    ),
    pendingApprovals: (approvalRows ?? []).map((row) => {
      const record = asRecord(row)
      return {
        id: str(record.id),
        title: str(record.title).trim() || "Pending request",
        actionType: str(record.action_type),
        status: str(record.status, "queued"),
        createdAt: str(record.created_at),
      }
    }),
  }
}

async function supabaseWorkspace(actor: UserProfile): Promise<GuardianWorkspace> {
  const service = requireService()
  const guardianships = await loadActiveGuardianships(service, actor.id)

  // Reuse getChildBookings (session client + RLS restricts to the caller's active
  // children) and attribute each booking to its child via bookerProfileId.
  const bookingsByChild = new Map<string, BookingView[]>()
  if (guardianships.length > 0) {
    try {
      const { bookings } = await getChildBookings(actor)
      for (const booking of bookings) {
        const owner = booking.bookerProfileId
        if (!owner) continue
        const list = bookingsByChild.get(owner) ?? []
        list.push(booking)
        bookingsByChild.set(owner, list)
      }
    } catch {
      // Bookings are supplementary; never fail the whole workspace on their read.
    }
  }

  const children = await Promise.all(
    guardianships.map((guardianship) =>
      buildSupabaseChildView(service, actor, guardianship, bookingsByChild)
    )
  )
  children.sort((left, right) => left.fullName.localeCompare(right.fullName))

  return {
    contractVersion: GUARDIANSHIP_CONTRACT_VERSION,
    source: "supabase",
    generatedAt: new Date().toISOString(),
    capabilities: { canManage: canManageGuardianship(actor) },
    children,
  }
}

/** Ensure the managed child's wallet exists (service-role; the guardian cannot
 * call ensure_user_wallet on the child's behalf). Returns the wallet id. */
async function ensureChildWallet(
  service: ServiceClient,
  companyId: string | null | undefined,
  childProfileId: string
): Promise<string> {
  const existing = await service
    .from("wallets")
    .select("id")
    .eq("owner_profile_id", childProfileId)
    .eq("currency", CHILD_WALLET_CURRENCY)
    .maybeSingle()
  if (existing.data) return str(asRecord(existing.data).id)

  const inserted = await service
    .from("wallets")
    .upsert(
      {
        company_id: companyId ?? null,
        owner_profile_id: childProfileId,
        kind: "user",
        currency: CHILD_WALLET_CURRENCY,
        low_balance_threshold_cents: CHILD_WALLET_LOW_THRESHOLD_CENTS,
      },
      { onConflict: "owner_profile_id,currency" }
    )
    .select("id")
    .maybeSingle()
  if (inserted.error) throw inserted.error
  return str(asRecord(inserted.data).id)
}

function mapWalletTransferError(error: {
  message?: string
  code?: string
}): GuardianshipDomainError {
  if (error.code === "23514") {
    return new GuardianshipDomainError(
      "GUARDIANSHIP_INSUFFICIENT_FUNDS",
      "Your own balance is too low for this allowance. Add funds and try again.",
      422
    )
  }
  if (error.code === "42501") {
    return new GuardianshipDomainError(
      "GUARDIANSHIP_ALLOWANCE_FORBIDDEN",
      "You cannot send an allowance to this account.",
      403
    )
  }
  return new GuardianshipDomainError(
    "GUARDIANSHIP_ALLOWANCE_FAILED",
    "The allowance could not be sent. Review the amount and try again.",
    422
  )
}

// --------------------------------------------------------------------------
// Public API.
// --------------------------------------------------------------------------

export async function getGuardianWorkspace(
  actor: UserProfile,
  { useLocalAccessProfile = false } = {}
): Promise<GuardianWorkspace> {
  if (!canViewGuardianship(actor)) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_VIEW_FORBIDDEN",
      "Your role cannot manage child accounts.",
      403
    )
  }
  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localWorkspace(actor)
  }
  try {
    return await supabaseWorkspace(actor)
  } catch (error) {
    if (error instanceof GuardianshipDomainError) throw error
    if (isAccessProfileEnabled()) return localWorkspace(actor)
    throw error
  }
}

export async function addManagedChild(
  actor: UserProfile,
  input: AddChildInput,
  { useLocalAccessProfile = false } = {}
): Promise<AddChildResult> {
  if (!canManageGuardianship(actor)) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_MANAGE_FORBIDDEN",
      "Your role cannot add a managed child account.",
      403
    )
  }
  const fullName = validateFullName(input.fullName)
  const dob = validateDob(input.dateOfBirth)
  const relation = validateRelation(input.relation)
  validateConsent(input.consent)
  validateIdempotencyKey(input.idempotencyKey)

  const childRole = childRoleForActor(actor)
  const consentRecordedAt = new Date().toISOString()

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return withLocalState(true, (state) => {
      const replay = state.children.find(
        (child) =>
          child.guardianId === actor.id &&
          child.idempotencyKey === input.idempotencyKey
      )
      if (replay) {
        return {
          source: "local-seed" as const,
          child: localChildView(replay, state.approvals),
        }
      }
      const childProfileId = randomUUID()
      const child: LocalManagedChild = {
        guardianshipId: randomUUID(),
        childProfileId,
        guardianId: actor.id,
        fullName,
        role: childRole,
        relation,
        status: "active",
        isMinor: dob.isMinor,
        ageBand: dob.ageBand,
        dateOfBirth: dob.dateOfBirth,
        consentRecordedAt,
        allowanceCents: 0,
        idempotencyKey: input.idempotencyKey,
        appliedAllowanceKeys: [],
        createdAt: consentRecordedAt,
      }
      state.children.push(child)
      // Seed one demo pending request so the approve / decline flow is
      // demonstrable in controlled QA (no dark pattern, a neutral activity ask).
      state.approvals.push({
        id: randomUUID(),
        childProfileId,
        guardianId: actor.id,
        title: `${fullName} wants to book Mini-Golf Round`,
        actionType: "activity.book",
        status: "queued",
        createdAt: consentRecordedAt,
      })
      return {
        source: "local-seed" as const,
        child: localChildView(child, state.approvals),
      }
    })
  }

  const service = requireService()
  const slug = createHash("sha256")
    .update(`${actor.id}:${input.idempotencyKey}`)
    .digest("hex")
    .slice(0, 24)
  const email = `child-${slug}@managed.cati.local`

  const created = await service.auth.admin.createUser({
    email,
    password: `${randomUUID()}${randomUUID()}`,
    email_confirm: true,
    user_metadata: { full_name: fullName, language: "tr", managed_child: true },
  })

  let childProfileId: string
  if (created.error || !created.data?.user) {
    // Idempotent replay: the deterministic email already exists, resolve the
    // existing child profile and re-run the (idempotent) linking steps.
    const existing = await service
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()
    const resolvedId = str(asRecord(existing.data).id)
    if (!resolvedId) {
      throw new GuardianshipDomainError(
        "GUARDIANSHIP_CHILD_CREATE_FAILED",
        "The child account could not be created.",
        502
      )
    }
    childProfileId = resolvedId
  } else {
    childProfileId = created.data.user.id
  }

  const profileUpdate = await service
    .from("profiles")
    .update({
      company_id: actor.company_id ?? null,
      full_name: fullName,
      role: childRole,
      is_active: true,
      is_minor: dob.isMinor,
      date_of_birth: dob.dateOfBirth,
      age_band: dob.ageBand,
      consent_recorded_at: consentRecordedAt,
      consent_by: actor.id,
    })
    .eq("id", childProfileId)
  if (profileUpdate.error) throw profileUpdate.error

  await service.from("profile_role_assignments").upsert(
    {
      profile_id: childProfileId,
      role: childRole,
      is_primary: true,
      granted_by: actor.id,
    },
    { onConflict: "profile_id,role" }
  )

  const guardianshipUpsert = await service
    .from("guardianships")
    .upsert(
      {
        guardian_profile_id: actor.id,
        child_profile_id: childProfileId,
        company_id: actor.company_id ?? null,
        relation,
        status: "active",
        consent_recorded_at: consentRecordedAt,
        consent_method: "parent_declared",
        revoked_at: null,
      },
      { onConflict: "guardian_profile_id,child_profile_id" }
    )
    .select("id, child_profile_id, relation, status, consent_recorded_at")
    .maybeSingle()
  if (guardianshipUpsert.error) throw guardianshipUpsert.error

  await ensureChildWallet(service, actor.company_id, childProfileId)

  const guardianshipRecord = asRecord(guardianshipUpsert.data)
  const child = await buildSupabaseChildView(
    service,
    actor,
    {
      id: str(guardianshipRecord.id),
      childProfileId,
      relation: str(guardianshipRecord.relation, relation),
      status: str(guardianshipRecord.status, "active"),
      consentRecordedAt: nullableStr(guardianshipRecord.consent_recorded_at),
    },
    new Map()
  )
  return { source: "supabase", child }
}

export async function allocateAllowance(
  actor: UserProfile,
  childProfileId: string,
  amountCents: number,
  idempotencyKey: string,
  { useLocalAccessProfile = false } = {}
): Promise<GuardianshipAck> {
  if (!canManageGuardianship(actor)) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_MANAGE_FORBIDDEN",
      "Your role cannot send an allowance.",
      403
    )
  }
  validateChildId(childProfileId)
  validateAmount(amountCents)
  validateIdempotencyKey(idempotencyKey)

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return withLocalState(true, (state) => {
      const child = localFindActiveChild(state, actor.id, childProfileId)
      // Idempotent: a replayed allowance key does not double-credit.
      const applied = child.appliedAllowanceKeys ?? []
      if (!applied.includes(idempotencyKey)) {
        child.allowanceCents += amountCents
        child.appliedAllowanceKeys = [...applied, idempotencyKey]
      }
      return { source: "local-seed" as const, ok: true as const, childProfileId }
    })
  }

  const service = requireService()
  await assertActiveGuardian(service, actor.id, childProfileId)
  const toWalletId = await ensureChildWallet(
    service,
    actor.company_id,
    childProfileId
  )

  // The transfer runs on the session client so wallet_transfer sees the guardian
  // as auth.uid() and re-enforces the parent -> child guardianship relationship.
  const supabase = await createClient()
  const walletResponse = await supabase.rpc("ensure_user_wallet", {
    p_currency: CHILD_WALLET_CURRENCY,
  })
  if (walletResponse.error) throw mapWalletTransferError(walletResponse.error)
  const fromWalletId = str(asRecord(asRecord(walletResponse.data).wallet).id)
  if (!fromWalletId) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_WALLET_UNAVAILABLE",
      "Your own wallet is unavailable; try again shortly.",
      503
    )
  }

  const transfer = await supabase.rpc("wallet_transfer", {
    p_from_wallet: fromWalletId,
    p_to_wallet: toWalletId,
    p_amount_cents: amountCents,
    p_idempotency_key: idempotencyKey,
  })
  if (transfer.error) throw mapWalletTransferError(transfer.error)
  return { source: "supabase", ok: true, childProfileId }
}

async function transitionChildRequest(
  actor: UserProfile,
  requestId: string,
  nextStatus: "approved" | "rejected",
  useLocalAccessProfile: boolean
): Promise<GuardianshipAck> {
  if (!canManageGuardianship(actor)) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_MANAGE_FORBIDDEN",
      "Your role cannot decide child requests.",
      403
    )
  }
  if (!requestId || requestId.length > 100) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_REQUEST_ID_INVALID",
      "Select a valid request.",
      422
    )
  }

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return withLocalState(true, (state) => {
      const approval = state.approvals.find(
        (item) => item.id === requestId && item.guardianId === actor.id
      )
      if (!approval) {
        throw new GuardianshipDomainError(
          "GUARDIANSHIP_REQUEST_NOT_FOUND",
          "That request was not found.",
          404
        )
      }
      if (approval.status !== "queued") {
        throw new GuardianshipDomainError(
          "GUARDIANSHIP_REQUEST_DECIDED",
          "That request has already been decided.",
          409
        )
      }
      approval.status = nextStatus
      return { source: "local-seed" as const, ok: true as const }
    })
  }

  const service = requireService()
  const { data: requestRow, error: readError } = await service
    .from("client_action_requests")
    .select("id, requested_by, status")
    .eq("id", requestId)
    .maybeSingle()
  if (readError) throw readError
  const request = asRecord(requestRow)
  const requestedBy = str(request.requested_by)
  if (!requestRow || !requestedBy) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_REQUEST_NOT_FOUND",
      "That request was not found.",
      404
    )
  }
  // The request must belong to one of the caller's active children.
  await assertActiveGuardian(service, actor.id, requestedBy)
  if (str(request.status) !== "queued") {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_REQUEST_DECIDED",
      "That request has already been decided.",
      409
    )
  }
  const update = await service
    .from("client_action_requests")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "queued")
  if (update.error) throw update.error
  return { source: "supabase", ok: true }
}

export async function approveChildRequest(
  actor: UserProfile,
  requestId: string,
  { useLocalAccessProfile = false } = {}
): Promise<GuardianshipAck> {
  return transitionChildRequest(actor, requestId, "approved", useLocalAccessProfile)
}

export async function declineChildRequest(
  actor: UserProfile,
  requestId: string,
  { useLocalAccessProfile = false } = {}
): Promise<GuardianshipAck> {
  return transitionChildRequest(actor, requestId, "rejected", useLocalAccessProfile)
}

export async function revokeGuardianship(
  actor: UserProfile,
  childProfileId: string,
  { useLocalAccessProfile = false } = {}
): Promise<GuardianshipAck> {
  if (!canManageGuardianship(actor)) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_MANAGE_FORBIDDEN",
      "Your role cannot revoke a guardianship.",
      403
    )
  }
  validateChildId(childProfileId)

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return withLocalState(true, (state) => {
      const child = localFindActiveChild(state, actor.id, childProfileId)
      child.status = "revoked"
      return { source: "local-seed" as const, ok: true as const, childProfileId }
    })
  }

  const service = requireService()
  const update = await service
    .from("guardianships")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("guardian_profile_id", actor.id)
    .eq("child_profile_id", childProfileId)
    .eq("status", "active")
    .select("id")
  if (update.error) throw update.error
  if (!update.data || update.data.length === 0) {
    throw new GuardianshipDomainError(
      "GUARDIANSHIP_CHILD_NOT_FOUND",
      "That managed child was not found for your account.",
      404
    )
  }
  return { source: "supabase", ok: true, childProfileId }
}
