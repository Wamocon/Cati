// Activities / extra-services catalog + wallet-funded bookings repository.
//
// Supabase-first with a file-backed local-seed fallback for access-profile / QA
// mode, mirroring wallet-repository.ts. Every response carries a
// `source: "supabase" | "local-seed"` field. Every booking takes an idempotency
// key and is idempotent: a retried call returns the original booking.
//
// A priced booking spends from the booker's own wallet. In the Supabase path the
// SECURITY DEFINER book_activity RPC calls wallet_spend, which enforces the
// no-negative / insufficient-credit invariant and the age gate in one place. The
// local path is a QA convenience: it records the booking and a synthetic funding
// reference without a live overdraft check (that authority lives only in the
// cloud RPC). Amounts are integer minor units (kuruş / cents).

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
import { formatDualFromCents } from "@/lib/currency"
import { hasAnyRolePermission, type Role } from "@/lib/rbac"
import {
  ACTIVITIES_LOCAL_SEED,
  type ActivityAgeBand,
} from "@/lib/activities-data"

export const ACTIVITIES_CONTRACT_VERSION = "activities.v1" as const

export type ActivitiesSource = "supabase" | "local-seed"
export type BookingStatus = "booked" | "cancelled" | "completed"

const CHILD_ROLES: readonly Role[] = ["child_owner", "child_tenant", "child_guest"]
const MAX_PARTY_SIZE = 50

export interface ActivityView {
  id: string
  name: string
  description: string | null
  category: string | null
  ageBand: ActivityAgeBand
  priceCents: number
  currency: NativeCurrency
  capacity: number | null
  imageKey: string | null
  /** Dual ₺/€ label for the price, computed once for display convenience. */
  priceLabel: string
}

export interface ActivityCatalog {
  contractVersion: typeof ACTIVITIES_CONTRACT_VERSION
  source: ActivitiesSource
  generatedAt: string
  /** True when the viewer is a minor and adult-only activities were filtered out. */
  ageFiltered: boolean
  activities: ActivityView[]
  warning?: string
}

export interface BookingView {
  id: string
  activityId: string | null
  activityName: string | null
  ageBand: ActivityAgeBand | null
  partySize: number
  scheduledAt: string | null
  status: BookingStatus
  amountCents: number | null
  currency: NativeCurrency | null
  walletTransactionId: string | null
  createdAt: string
  /** Dual ₺/€ label for the charged amount, when priced. */
  amountLabel: string | null
}

export interface BookingList {
  source: ActivitiesSource
  bookings: BookingView[]
}

export interface BookingMutationResult {
  source: ActivitiesSource
  booking: BookingView
}

export interface BookActivityInput {
  activityId: string
  partySize: number
  scheduledAt: string | null
  idempotencyKey: string
}

export interface CancelBookingInput {
  bookingId: string
  idempotencyKey: string
}

export class ActivitiesDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "ActivitiesDomainError"
  }
}

// --------------------------------------------------------------------------
// Capability + shaping helpers (RLS / the RPC are the real authority).
// --------------------------------------------------------------------------

function canViewActivities(profile: UserProfile) {
  return hasAnyRolePermission(profile.roles, "activities", "view")
}

function canBookActivities(profile: UserProfile) {
  return hasAnyRolePermission(profile.roles, "activities", "create")
}

/** A minor viewer (any child_* role) never sees adult-only activities. */
function isMinorActor(profile: UserProfile) {
  return profile.roles.some((role) => CHILD_ROLES.includes(role))
}

function normalizeAgeBand(value: unknown): ActivityAgeBand {
  return value === "adult" || value === "under_18" ? value : "all"
}

function normalizeCurrency(value: unknown): NativeCurrency {
  return value === "EUR" ? "EUR" : "TRY"
}

function normalizeStatus(value: unknown): BookingStatus {
  return value === "cancelled" || value === "completed" ? value : "booked"
}

function priceLabel(cents: number, currency: NativeCurrency): string {
  return cents > 0 ? formatDualFromCents(cents, currency) : "Free"
}

function amountLabel(
  cents: number | null,
  currency: NativeCurrency | null
): string | null {
  if (cents === null || cents <= 0) return null
  return formatDualFromCents(cents, currency ?? "TRY")
}

function validatePartySize(partySize: number) {
  if (
    !Number.isSafeInteger(partySize) ||
    partySize < 1 ||
    partySize > MAX_PARTY_SIZE
  ) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_PARTY_INVALID",
      `The party size must be between 1 and ${MAX_PARTY_SIZE}.`,
      422
    )
  }
}

function validateIdempotencyKey(key: string) {
  if (!key || key.length > 200) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_IDEMPOTENCY_INVALID",
      "A valid idempotency key is required.",
      422
    )
  }
}

function validateScheduledAt(value: string | null): string | null {
  if (value === null) return null
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_SCHEDULE_INVALID",
      "The scheduled time is not a valid date.",
      422
    )
  }
  return new Date(parsed).toISOString()
}

// --------------------------------------------------------------------------
// Local-seed path (no database, or explicit access-profile QA mode).
// --------------------------------------------------------------------------

interface LocalBooking {
  id: string
  activityId: string
  activityName: string
  ageBand: ActivityAgeBand
  bookerProfileId: string
  partySize: number
  scheduledAt: string | null
  status: BookingStatus
  amountCents: number
  currency: NativeCurrency
  walletTransactionId: string | null
  idempotencyKey: string
  createdAt: string
}

interface LocalActivitiesState {
  version: 1
  bookings: LocalBooking[]
}

const stateNamespace =
  process.env.CATI_LOCAL_STATE_NAMESPACE ??
  Buffer.from(process.cwd()).toString("base64url").slice(-64)
const statePath = join(tmpdir(), `cati-activities-${stateNamespace}.v1.json`)
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
  throw new ActivitiesDomainError(
    "ACTIVITIES_BUSY",
    "The local activities workspace is busy; retry the request.",
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

function readState(): LocalActivitiesState {
  try {
    const parsed = JSON.parse(
      readFileSync(statePath, "utf8")
    ) as Partial<LocalActivitiesState>
    if (parsed.version !== 1 || !Array.isArray(parsed.bookings)) {
      throw new Error("Unsupported activities local state.")
    }
    return { version: 1, bookings: parsed.bookings }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, bookings: [] }
    }
    throw error
  }
}

function writeState(state: LocalActivitiesState) {
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
  operation: (state: LocalActivitiesState) => T
) {
  if (!localPersistenceEnabled()) {
    return operation({ version: 1, bookings: [] })
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

/** Test-only: drop accumulated local bookings so serial e2e runs stay isolated. */
export function resetActivitiesStateForTesting() {
  withLocalState(true, (state) => {
    state.bookings.length = 0
  })
}

function localActivityView(seed: (typeof ACTIVITIES_LOCAL_SEED)[number]): ActivityView {
  return {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    category: seed.category,
    ageBand: seed.ageBand,
    priceCents: seed.priceCents,
    currency: seed.currency,
    capacity: seed.capacity,
    imageKey: seed.imageKey,
    priceLabel: priceLabel(seed.priceCents, seed.currency),
  }
}

function localBookingView(booking: LocalBooking): BookingView {
  return {
    id: booking.id,
    activityId: booking.activityId,
    activityName: booking.activityName,
    ageBand: booking.ageBand,
    partySize: booking.partySize,
    scheduledAt: booking.scheduledAt,
    status: booking.status,
    amountCents: booking.amountCents,
    currency: booking.currency,
    walletTransactionId: booking.walletTransactionId,
    createdAt: booking.createdAt,
    amountLabel: amountLabel(booking.amountCents, booking.currency),
  }
}

function localCatalog(profile: UserProfile, warning?: string): ActivityCatalog {
  const minor = isMinorActor(profile)
  const activities = ACTIVITIES_LOCAL_SEED.filter(
    (seed) => !(minor && seed.ageBand === "adult")
  ).map(localActivityView)
  return {
    contractVersion: ACTIVITIES_CONTRACT_VERSION,
    source: "local-seed",
    generatedAt: new Date().toISOString(),
    ageFiltered: minor,
    activities,
    warning,
  }
}

function localBook(
  profile: UserProfile,
  input: BookActivityInput
): BookingMutationResult {
  const seed = ACTIVITIES_LOCAL_SEED.find((item) => item.id === input.activityId)
  if (!seed) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_NOT_FOUND",
      "The activity was not found.",
      404
    )
  }
  if (isMinorActor(profile) && seed.ageBand === "adult") {
    throw new ActivitiesDomainError(
      "ACTIVITIES_AGE_RESTRICTED",
      "This activity is restricted to adults.",
      403
    )
  }
  if (seed.capacity !== null && input.partySize > seed.capacity) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_CAPACITY_EXCEEDED",
      "The party size exceeds this activity's capacity.",
      422
    )
  }

  return withLocalState(true, (state) => {
    const replay = state.bookings.find(
      (booking) => booking.idempotencyKey === input.idempotencyKey
    )
    if (replay) {
      return { source: "local-seed" as const, booking: localBookingView(replay) }
    }

    const amountCents = seed.priceCents * input.partySize
    const booking: LocalBooking = {
      id: randomUUID(),
      activityId: seed.id,
      activityName: seed.name,
      ageBand: seed.ageBand,
      bookerProfileId: profile.id,
      partySize: input.partySize,
      scheduledAt: input.scheduledAt,
      status: "booked",
      amountCents,
      currency: seed.currency,
      // QA convenience: reference a synthetic funding txn. The real wallet spend
      // and no-overdraft enforcement happen in the cloud book_activity RPC.
      walletTransactionId: amountCents > 0 ? randomUUID() : null,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
    }
    state.bookings.push(booking)
    return { source: "local-seed" as const, booking: localBookingView(booking) }
  })
}

function localCancel(
  profile: UserProfile,
  input: CancelBookingInput
): BookingMutationResult {
  return withLocalState(true, (state) => {
    const booking = state.bookings.find((item) => item.id === input.bookingId)
    if (!booking) {
      throw new ActivitiesDomainError(
        "ACTIVITIES_BOOKING_NOT_FOUND",
        "The booking was not found.",
        404
      )
    }
    // In offline QA every local booking belongs to the single access profile.
    if (booking.bookerProfileId !== profile.id && profile.role !== "admin") {
      throw new ActivitiesDomainError(
        "ACTIVITIES_CANCEL_FORBIDDEN",
        "You cannot cancel this booking.",
        403
      )
    }
    if (booking.status === "completed") {
      throw new ActivitiesDomainError(
        "ACTIVITIES_CANCEL_COMPLETED",
        "A completed booking cannot be cancelled.",
        422
      )
    }
    booking.status = "cancelled"
    return { source: "local-seed" as const, booking: localBookingView(booking) }
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

function nullableNum(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function canUseLocalSeedFallback() {
  return isAccessProfileEnabled()
}

function mapSupabaseError(error: { message?: string; code?: string }) {
  if (error.code === "42501") {
    return new ActivitiesDomainError(
      "ACTIVITIES_SCOPE_FORBIDDEN",
      "You cannot perform this activity operation.",
      403
    )
  }
  if (error.code === "23514") {
    return new ActivitiesDomainError(
      "ACTIVITIES_INSUFFICIENT_FUNDS",
      "Insufficient wallet balance for this booking.",
      422
    )
  }
  return new ActivitiesDomainError(
    "ACTIVITIES_OPERATION_FAILED",
    "The activity operation could not be completed. Review the details and retry.",
    422
  )
}

function mapActivityRow(row: unknown): ActivityView {
  const record = asRecord(row)
  const priceCents = num(record.price_cents)
  const currency = normalizeCurrency(record.currency)
  const capacity = nullableNum(record.capacity)
  return {
    id: str(record.id),
    name: str(record.name),
    description: nullableStr(record.description),
    category: nullableStr(record.category),
    ageBand: normalizeAgeBand(record.age_band),
    priceCents,
    currency,
    capacity,
    imageKey: nullableStr(record.image_key),
    priceLabel: priceLabel(priceCents, currency),
  }
}

/** Map a joined activity_bookings SELECT row (booking + nested activity). */
function mapBookingRow(row: unknown): BookingView {
  const record = asRecord(row)
  const activity = related(record.activities)
  const amountCents = nullableNum(record.amount_cents)
  const currency = record.currency ? normalizeCurrency(record.currency) : null
  return {
    id: str(record.id),
    activityId: nullableStr(record.activity_id),
    activityName: nullableStr(activity.name),
    ageBand: activity.age_band ? normalizeAgeBand(activity.age_band) : null,
    partySize: num(record.party_size) || 1,
    scheduledAt: nullableStr(record.scheduled_at),
    status: normalizeStatus(record.status),
    amountCents,
    currency,
    walletTransactionId: nullableStr(record.wallet_transaction_id),
    createdAt: str(record.created_at),
    amountLabel: amountLabel(amountCents, currency),
  }
}

/** Map the { booking, activity, source } payload returned by the RPCs. */
function mapBookingJson(data: unknown): BookingMutationResult {
  const record = asRecord(data)
  const booking = asRecord(record.booking)
  const activity = asRecord(record.activity)
  const amountCents = nullableNum(booking.amountCents)
  const currency = booking.currency ? normalizeCurrency(booking.currency) : null
  return {
    source: record.source === "supabase" ? "supabase" : "local-seed",
    booking: {
      id: str(booking.id),
      activityId: nullableStr(booking.activityId),
      activityName: nullableStr(activity.name),
      ageBand: activity.ageBand ? normalizeAgeBand(activity.ageBand) : null,
      partySize: num(booking.partySize) || 1,
      scheduledAt: nullableStr(booking.scheduledAt),
      status: normalizeStatus(booking.status),
      amountCents,
      currency,
      walletTransactionId: nullableStr(booking.walletTransactionId),
      createdAt: str(booking.createdAt),
      amountLabel: amountLabel(amountCents, currency),
    },
  }
}

const BOOKING_SELECT =
  "id, activity_id, party_size, scheduled_at, status, amount_cents, currency, wallet_transaction_id, created_at, activities:activity_id(name, category, age_band, image_key)"

async function loadCatalogFromSupabase(
  supabase: SupabaseClient
): Promise<ActivityView[]> {
  const response = await supabase
    .from("activities")
    .select(
      "id, name, description, category, age_band, price_cents, currency, capacity, image_key"
    )
    .eq("active", true)
    .order("category", { ascending: true })
    .order("price_cents", { ascending: true })
  if (response.error) throw response.error
  return (response.data ?? []).map(mapActivityRow)
}

async function loadChildProfileIds(
  supabase: SupabaseClient,
  guardianId: string
): Promise<string[]> {
  const response = await supabase
    .from("guardianships")
    .select("child_profile_id")
    .eq("guardian_profile_id", guardianId)
    .eq("status", "active")
    .is("revoked_at", null)
  if (response.error) throw response.error
  return (response.data ?? [])
    .map((row) => str(asRecord(row).child_profile_id))
    .filter((id) => id.length > 0)
}

// --------------------------------------------------------------------------
// Public API.
// --------------------------------------------------------------------------

/** Catalog for the actor, age-filtered so minors never see adult-only activities. */
export async function getActivitiesForRole(
  profile: UserProfile,
  { useLocalAccessProfile = false } = {}
): Promise<ActivityCatalog> {
  if (!canViewActivities(profile)) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_VIEW_FORBIDDEN",
      "Your role cannot view the activities catalog.",
      403
    )
  }

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localCatalog(profile)
  }

  try {
    const supabase = await createClient()
    const all = await loadCatalogFromSupabase(supabase)
    const minor = isMinorActor(profile)
    const activities = minor
      ? all.filter((activity) => activity.ageBand !== "adult")
      : all
    return {
      contractVersion: ACTIVITIES_CONTRACT_VERSION,
      source: "supabase",
      generatedAt: new Date().toISOString(),
      ageFiltered: minor,
      activities,
    }
  } catch (error) {
    if (error instanceof ActivitiesDomainError) throw error
    if (canUseLocalSeedFallback()) {
      return localCatalog(
        profile,
        "Live activity data was unavailable; showing the local reference set."
      )
    }
    throw error
  }
}

/** Bookings the actor made themselves. */
export async function getMyBookings(
  profile: UserProfile,
  { limit = 20, useLocalAccessProfile = false } = {}
): Promise<BookingList> {
  if (!canViewActivities(profile)) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_VIEW_FORBIDDEN",
      "Your role cannot view activity bookings.",
      403
    )
  }
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return withLocalState(false, (state) => ({
      source: "local-seed" as const,
      bookings: [...state.bookings]
        .filter((booking) => booking.bookerProfileId === profile.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, boundedLimit)
        .map(localBookingView),
    }))
  }

  try {
    const supabase = await createClient()
    const response = await supabase
      .from("activity_bookings")
      .select(BOOKING_SELECT)
      .eq("booker_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(boundedLimit)
    if (response.error) throw response.error
    return {
      source: "supabase",
      bookings: (response.data ?? []).map(mapBookingRow),
    }
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return { source: "local-seed", bookings: [] }
    }
    throw error
  }
}

/**
 * Bookings made by the actor's managed children. This is how a guardian sees
 * what their child booked; RLS additionally guarantees only an active guardian
 * (or admin) can read those rows.
 */
export async function getChildBookings(
  profile: UserProfile,
  { limit = 50, useLocalAccessProfile = false } = {}
): Promise<BookingList> {
  if (!canViewActivities(profile)) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_VIEW_FORBIDDEN",
      "Your role cannot view activity bookings.",
      403
    )
  }
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 200)

  // Guardianship relationships are not modeled in the offline seed, so QA mode
  // has no child bookings to surface.
  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return { source: "local-seed", bookings: [] }
  }

  try {
    const supabase = await createClient()
    const childIds = await loadChildProfileIds(supabase, profile.id)
    if (childIds.length === 0) {
      return { source: "supabase", bookings: [] }
    }
    const response = await supabase
      .from("activity_bookings")
      .select(BOOKING_SELECT)
      .in("booker_profile_id", childIds)
      .order("created_at", { ascending: false })
      .limit(boundedLimit)
    if (response.error) throw response.error
    return {
      source: "supabase",
      bookings: (response.data ?? []).map(mapBookingRow),
    }
  } catch (error) {
    if (canUseLocalSeedFallback()) {
      return { source: "local-seed", bookings: [] }
    }
    throw error
  }
}

/** Book an activity for the actor, spending from their wallet when priced. */
export async function bookActivity(
  profile: UserProfile,
  input: BookActivityInput,
  { useLocalAccessProfile = false } = {}
): Promise<BookingMutationResult> {
  if (!canBookActivities(profile)) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_BOOK_FORBIDDEN",
      "Your role cannot book activities.",
      403
    )
  }
  validatePartySize(input.partySize)
  validateIdempotencyKey(input.idempotencyKey)
  const scheduledAt = validateScheduledAt(input.scheduledAt)
  if (!input.activityId || input.activityId.length > 100) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_ID_INVALID",
      "Select a valid activity.",
      422
    )
  }

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localBook(profile, { ...input, scheduledAt })
  }

  const supabase = await createClient()
  const response = await supabase.rpc("book_activity", {
    p_activity_id: input.activityId,
    p_party_size: input.partySize,
    p_scheduled_at: scheduledAt,
    p_idempotency_key: input.idempotencyKey,
  })
  if (response.error) throw mapSupabaseError(response.error)
  return mapBookingJson(response.data)
}

/** Cancel a booking (booker, active guardian, or same-company admin/manager). */
export async function cancelBooking(
  profile: UserProfile,
  input: CancelBookingInput,
  { useLocalAccessProfile = false } = {}
): Promise<BookingMutationResult> {
  if (!canViewActivities(profile)) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_CANCEL_FORBIDDEN",
      "Your role cannot cancel activity bookings.",
      403
    )
  }
  validateIdempotencyKey(input.idempotencyKey)
  if (!input.bookingId || input.bookingId.length > 100) {
    throw new ActivitiesDomainError(
      "ACTIVITIES_BOOKING_ID_INVALID",
      "Select a valid booking.",
      422
    )
  }

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localCancel(profile, input)
  }

  const supabase = await createClient()
  const response = await supabase.rpc("cancel_activity_booking", {
    p_booking_id: input.bookingId,
    p_idempotency_key: input.idempotencyKey,
  })
  if (response.error) throw mapSupabaseError(response.error)
  return mapBookingJson(response.data)
}
