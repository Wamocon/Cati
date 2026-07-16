import "server-only"

import { isSupabaseConfigured } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const BOOKING_LIFECYCLE_CONTRACT_VERSION = "booking-lifecycle.v1" as const

export type BookingLifecycleJsonValue =
  | string
  | number
  | boolean
  | null
  | BookingLifecycleJsonObject
  | BookingLifecycleJsonArray

export interface BookingLifecycleJsonObject {
  readonly [key: string]: BookingLifecycleJsonValue
}

export type BookingLifecycleJsonArray = readonly BookingLifecycleJsonValue[]

export type BookingLifecycleRecord = BookingLifecycleJsonObject

export type BookingDecision = "approve" | "reject"

export type BookingFinanceState =
  | "not_required"
  | "manual_required"
  | "provider_ready"
  | "manual_verified"
  | "waived"
  | "unavailable"

export type ResourceBookingTransition =
  | "check_in"
  | "complete"
  | "no_show"
  | "revoke_access"

export type BookingBlackoutType =
  | "maintenance"
  | "commissioning"
  | "safety"
  | "admin"

export type BookingCommandEntityType =
  | "hold"
  | "waitlist"
  | "reservation"
  | "blackout"
  | "resource"

export interface BookingLifecycleWorkspace {
  contractVersion: typeof BOOKING_LIFECYCLE_CONTRACT_VERSION
  generatedAt: string
  scope: {
    siteId: string | null
    siteName: string | null
    siteCode: string | null
    role: string
  }
  resources: readonly BookingLifecycleRecord[]
  eligibleUnits: readonly BookingLifecycleRecord[]
  eligibleResidents: readonly BookingLifecycleRecord[]
  holds: readonly BookingLifecycleRecord[]
  bookings: readonly BookingLifecycleRecord[]
  waitlist: readonly BookingLifecycleRecord[]
  tasks: readonly BookingLifecycleRecord[]
  blackouts: readonly BookingLifecycleRecord[]
}

export interface BookingCommandReceipt {
  contractVersion: typeof BOOKING_LIFECYCLE_CONTRACT_VERSION
  command: string
  entityType: BookingCommandEntityType
  entityId: string
  version: number
  state: string
  replayed: boolean
  holdId?: string
  waitlistEntryId?: string
  reservationId?: string
  blackoutId?: string
  expiresAt?: string
}

export interface CreateBookingHoldInput {
  resourceId: string
  unitId: string
  residentId: string
  partySize: number
  startsAt: string
  endsAt: string
  waitlistIfFull: boolean
  idempotencyKey: string
}

export interface CommitResourceBookingInput {
  holdId: string
  expectedVersion: number
  guestName?: string | null
  notes?: string | null
  idempotencyKey: string
}

export interface DecideResourceBookingInput {
  reservationId: string
  expectedVersion: number
  decision: BookingDecision
  reason?: string | null
  idempotencyKey: string
}

export interface UpdateResourceBookingFinanceInput {
  reservationId: string
  expectedVersion: number
  paymentState: BookingFinanceState
  depositState: BookingFinanceState
  reason: string
  idempotencyKey: string
}

export interface TransitionResourceBookingInput {
  reservationId: string
  expectedVersion: number
  transition: ResourceBookingTransition
  reason?: string | null
  idempotencyKey: string
}

export interface CancelResourceBookingInput {
  reservationId: string
  expectedVersion: number
  reason: string
  idempotencyKey: string
}

export interface RescheduleResourceBookingInput {
  reservationId: string
  expectedVersion: number
  startsAt: string
  endsAt: string
  reason: string
  idempotencyKey: string
}

export interface CreateBookingBlackoutInput {
  resourceId: string
  startsAt: string
  endsAt: string
  blackoutType: BookingBlackoutType
  reason: string
  idempotencyKey: string
}

export interface CancelBookingBlackoutInput {
  blackoutId: string
  expectedVersion: number
  reason: string
  idempotencyKey: string
}

export interface PromoteBookingWaitlistInput {
  resourceId: string
  idempotencyKey: string
}

export type BookingLifecycleRepositoryErrorCode =
  | "BOOKING_BACKEND_UNAVAILABLE"
  | "BOOKING_AUTH_REQUIRED"
  | "BOOKING_FORBIDDEN"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_VALIDATION_FAILED"
  | "BOOKING_VERSION_CONFLICT"
  | "BOOKING_IDEMPOTENCY_CONFLICT"
  | "BOOKING_CAPACITY_CONFLICT"
  | "BOOKING_HOLD_EXPIRED"
  | "BOOKING_INVALID_STATE"
  | "BOOKING_RESPONSE_INVALID"
  | "BOOKING_DATABASE_UNAVAILABLE"

export class BookingLifecycleRepositoryError extends Error {
  constructor(
    readonly code: BookingLifecycleRepositoryErrorCode,
    readonly status: number,
    message: string,
    readonly databaseCode?: string
  ) {
    super(message)
    this.name = "BookingLifecycleRepositoryError"
  }
}

type BookingLifecycleRpcName =
  | "booking_lifecycle_workspace"
  | "create_booking_hold_command"
  | "commit_resource_booking_command"
  | "decide_resource_booking_command"
  | "update_resource_booking_finance_command"
  | "transition_resource_booking_command"
  | "cancel_resource_booking_command"
  | "reschedule_resource_booking_command"
  | "create_booking_blackout_command"
  | "cancel_booking_blackout_command"
  | "promote_booking_waitlist_command"

interface RpcErrorShape {
  code?: string
  message?: string
  details?: string
  hint?: string
}

interface RpcResponse {
  data: unknown
  error: RpcErrorShape | null
}

interface RpcClient {
  rpc(
    name: BookingLifecycleRpcName,
    args?: Record<string, unknown>
  ): PromiseLike<RpcResponse>
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const OFFSET_TIMESTAMP_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i
const FINANCE_STATES: readonly BookingFinanceState[] = [
  "not_required",
  "manual_required",
  "provider_ready",
  "manual_verified",
  "waived",
  "unavailable",
]
const TRANSITIONS: readonly ResourceBookingTransition[] = [
  "check_in",
  "complete",
  "no_show",
  "revoke_access",
]
const BLACKOUT_TYPES: readonly BookingBlackoutType[] = [
  "maintenance",
  "commissioning",
  "safety",
  "admin",
]
const ENTITY_TYPES: readonly BookingCommandEntityType[] = [
  "hold",
  "waitlist",
  "reservation",
  "blackout",
  "resource",
]

function repositoryError(
  code: BookingLifecycleRepositoryErrorCode,
  status: number,
  message: string,
  databaseCode?: string
) {
  return new BookingLifecycleRepositoryError(code, status, message, databaseCode)
}

function requireDatabase(): void {
  if (!isSupabaseConfigured()) {
    throw repositoryError(
      "BOOKING_BACKEND_UNAVAILABLE",
      503,
      "Booking persistence is unavailable because Supabase is not configured."
    )
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function requiredText(
  value: unknown,
  field: string,
  minimum = 1,
  maximum = 1_000
): string {
  if (typeof value !== "string") {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      `${field} must be text.`
    )
  }
  const normalized = value.normalize("NFC").trim()
  if (normalized.length < minimum || normalized.length > maximum) {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      `${field} must contain ${minimum} to ${maximum} characters.`
    )
  }
  return normalized
}

function optionalText(value: unknown, field: string, maximum: number): string | null {
  if (value === null || value === undefined || value === "") return null
  return requiredText(value, field, 1, maximum)
}

function uuid(value: unknown, field: string): string {
  const normalized = requiredText(value, field, 36, 36).toLowerCase()
  if (!UUID_PATTERN.test(normalized)) {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      `${field} must be a UUID.`
    )
  }
  return normalized
}

function optionalUuid(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === "") return null
  return uuid(value, field)
}

function positiveVersion(value: unknown, field = "expectedVersion"): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      `${field} must be a positive integer.`
    )
  }
  return value as number
}

function timestamp(value: unknown, field: string, requireOffset = true): string {
  const normalized = requiredText(value, field, 20, 40)
  if (requireOffset && !OFFSET_TIMESTAMP_PATTERN.test(normalized)) {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      `${field} must include an explicit UTC offset.`
    )
  }
  const parsed = new Date(normalized)
  if (!Number.isFinite(parsed.getTime())) {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      `${field} must be a valid timestamp.`
    )
  }
  return parsed.toISOString()
}

function timeRange(startsAt: unknown, endsAt: unknown) {
  const starts = timestamp(startsAt, "startsAt")
  const ends = timestamp(endsAt, "endsAt")
  if (new Date(ends).getTime() <= new Date(starts).getTime()) {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      "endsAt must be later than startsAt."
    )
  }
  return { starts, ends }
}

function idempotencyKey(value: unknown): string {
  return requiredText(value, "idempotencyKey", 8, 200)
}

function mapRpcError(error: RpcErrorShape): BookingLifecycleRepositoryError {
  const source = [error.message, error.details, error.hint].filter(Boolean).join(" ")
  const message = source || "Booking command failed."
  const normalized = message.toLowerCase()

  if (
    error.code === "PGRST301" ||
    /authentication required|authenticated profile required|not authenticated/.test(normalized)
  ) {
    return repositoryError("BOOKING_AUTH_REQUIRED", 401, message, error.code)
  }
  if (error.code === "42501" || /forbidden|permission|scope denied|not allowed/.test(normalized)) {
    return repositoryError("BOOKING_FORBIDDEN", 403, message, error.code)
  }
  if (error.code === "P0002" || /not found/.test(normalized)) {
    return repositoryError("BOOKING_NOT_FOUND", 404, message, error.code)
  }
  if (/idempotenc/.test(normalized) && /different|another|conflict|already/.test(normalized)) {
    return repositoryError("BOOKING_IDEMPOTENCY_CONFLICT", 409, message, error.code)
  }
  if (error.code === "40001" || /version conflict|stale version|expected version/.test(normalized)) {
    return repositoryError("BOOKING_VERSION_CONFLICT", 409, message, error.code)
  }
  if (error.code === "23P01" || /capacity|overlap|slot is full|fully booked/.test(normalized)) {
    return repositoryError("BOOKING_CAPACITY_CONFLICT", 409, message, error.code)
  }
  if (/hold.+(?:expired|no longer active)|expired hold/.test(normalized)) {
    return repositoryError("BOOKING_HOLD_EXPIRED", 409, message, error.code)
  }
  if (
    /invalid transition|unsupported booking transition|cannot transition|terminal state|not awaiting|not ready for check-in|cannot (?:change|be cancelled|be rescheduled)|current lifecycle state|current state|only .* can|staffing or safety task is incomplete/.test(
      normalized
    )
  ) {
    return repositoryError("BOOKING_INVALID_STATE", 409, message, error.code)
  }
  if (
    error.code === "P0001" ||
    error.code === "22023" ||
    error.code === "23502" ||
    error.code === "23514" ||
    /invalid|required|must be/.test(normalized)
  ) {
    return repositoryError("BOOKING_VALIDATION_FAILED", 422, message, error.code)
  }
  return repositoryError(
    "BOOKING_DATABASE_UNAVAILABLE",
    503,
    "Booking persistence is temporarily unavailable.",
    error.code
  )
}

function jsonValue(value: unknown, path: string, depth = 0): BookingLifecycleJsonValue {
  if (depth > 20) {
    throw repositoryError(
      "BOOKING_RESPONSE_INVALID",
      502,
      `Booking response exceeds the supported JSON depth at ${path}.`
    )
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value
  }
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (Array.isArray(value)) {
    return value.map((item, index) => jsonValue(item, `${path}[${index}]`, depth + 1))
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        jsonValue(item, `${path}.${key}`, depth + 1),
      ])
    )
  }
  throw repositoryError(
    "BOOKING_RESPONSE_INVALID",
    502,
    `Booking response contains a non-JSON value at ${path}.`
  )
}

function jsonObject(value: unknown, path: string): BookingLifecycleJsonObject {
  const normalized = jsonValue(value, path)
  if (!isRecord(normalized)) {
    throw repositoryError(
      "BOOKING_RESPONSE_INVALID",
      502,
      `Booking response must contain an object at ${path}.`
    )
  }
  return normalized as BookingLifecycleJsonObject
}

function recordArray(value: unknown, path: string): readonly BookingLifecycleRecord[] {
  if (!Array.isArray(value)) {
    throw repositoryError(
      "BOOKING_RESPONSE_INVALID",
      502,
      `Booking response must contain an array at ${path}.`
    )
  }
  return value.map((item, index) => jsonObject(item, `${path}[${index}]`))
}

function workspaceFromRpc(value: unknown): BookingLifecycleWorkspace {
  if (!isRecord(value) || value.contractVersion !== BOOKING_LIFECYCLE_CONTRACT_VERSION) {
    throw repositoryError(
      "BOOKING_RESPONSE_INVALID",
      502,
      "Booking workspace returned an unsupported contract."
    )
  }
  if (!isRecord(value.scope)) {
    throw repositoryError(
      "BOOKING_RESPONSE_INVALID",
      502,
      "Booking workspace scope is malformed."
    )
  }

  return {
    contractVersion: BOOKING_LIFECYCLE_CONTRACT_VERSION,
    generatedAt: timestamp(value.generatedAt, "response.generatedAt"),
    scope: {
      siteId: optionalUuid(value.scope.siteId, "response.scope.siteId"),
      siteName: optionalText(value.scope.siteName, "response.scope.siteName", 500),
      siteCode: optionalText(value.scope.siteCode, "response.scope.siteCode", 100),
      role: requiredText(value.scope.role, "response.scope.role", 1, 50),
    },
    resources: recordArray(value.resources, "response.resources"),
    eligibleUnits: recordArray(value.eligibleUnits, "response.eligibleUnits"),
    eligibleResidents: recordArray(
      value.eligibleResidents,
      "response.eligibleResidents"
    ),
    holds: recordArray(value.holds, "response.holds"),
    bookings: recordArray(value.bookings, "response.bookings"),
    waitlist: recordArray(value.waitlist, "response.waitlist"),
    tasks: recordArray(value.tasks, "response.tasks"),
    blackouts: recordArray(value.blackouts, "response.blackouts"),
  }
}

function optionalReceiptUuid(
  value: Record<string, unknown>,
  key: string
): string | undefined {
  const candidate = value[key]
  return candidate === null || candidate === undefined ? undefined : uuid(candidate, `response.${key}`)
}

function receiptFromRpc(value: unknown): BookingCommandReceipt {
  if (!isRecord(value) || value.contractVersion !== BOOKING_LIFECYCLE_CONTRACT_VERSION) {
    throw repositoryError(
      "BOOKING_RESPONSE_INVALID",
      502,
      "Booking command returned an unsupported contract."
    )
  }
  if (
    typeof value.entityType !== "string" ||
    !(ENTITY_TYPES as readonly string[]).includes(value.entityType)
  ) {
    throw repositoryError(
      "BOOKING_RESPONSE_INVALID",
      502,
      "Booking command returned an invalid entity type."
    )
  }
  if (typeof value.replayed !== "boolean") {
    throw repositoryError(
      "BOOKING_RESPONSE_INVALID",
      502,
      "Booking command replay status is missing."
    )
  }

  jsonObject(value, "response")
  const holdId = optionalReceiptUuid(value, "holdId")
  const waitlistEntryId = optionalReceiptUuid(value, "waitlistEntryId")
  const reservationId = optionalReceiptUuid(value, "reservationId")
  const blackoutId = optionalReceiptUuid(value, "blackoutId")

  return {
    contractVersion: BOOKING_LIFECYCLE_CONTRACT_VERSION,
    command: requiredText(value.command, "response.command", 1, 100),
    entityType: value.entityType as BookingCommandEntityType,
    entityId: uuid(value.entityId, "response.entityId"),
    version: positiveVersion(value.version, "response.version"),
    state: requiredText(value.state, "response.state", 1, 100),
    replayed: value.replayed,
    ...(holdId ? { holdId } : {}),
    ...(waitlistEntryId ? { waitlistEntryId } : {}),
    ...(reservationId ? { reservationId } : {}),
    ...(blackoutId ? { blackoutId } : {}),
    ...(value.expiresAt === null || value.expiresAt === undefined
      ? {}
      : { expiresAt: timestamp(value.expiresAt, "response.expiresAt") }),
  }
}

async function callRpc(
  name: BookingLifecycleRpcName,
  args: Record<string, unknown>
): Promise<unknown> {
  requireDatabase()
  try {
    const client = (await createClient()) as unknown as RpcClient
    const response = await client.rpc(name, args)
    if (response.error) throw mapRpcError(response.error)
    return response.data
  } catch (error) {
    if (error instanceof BookingLifecycleRepositoryError) throw error
    throw repositoryError(
      "BOOKING_DATABASE_UNAVAILABLE",
      503,
      "Booking persistence is temporarily unavailable."
    )
  }
}

async function callCommand(
  name: Exclude<BookingLifecycleRpcName, "booking_lifecycle_workspace">,
  args: Record<string, unknown>
) {
  return receiptFromRpc(await callRpc(name, args))
}

export async function getBookingLifecycleWorkspace(
  siteId: string | null = null
): Promise<BookingLifecycleWorkspace> {
  const data = await callRpc("booking_lifecycle_workspace", {
    p_site_id: optionalUuid(siteId, "siteId"),
  })
  return workspaceFromRpc(data)
}

export async function createBookingHold(
  input: CreateBookingHoldInput
): Promise<BookingCommandReceipt> {
  if (!Number.isSafeInteger(input.partySize) || input.partySize < 1 || input.partySize > 500) {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      "partySize must be an integer between 1 and 500."
    )
  }
  if (typeof input.waitlistIfFull !== "boolean") {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      "waitlistIfFull must be boolean."
    )
  }
  const range = timeRange(input.startsAt, input.endsAt)
  return callCommand("create_booking_hold_command", {
    p_resource_id: uuid(input.resourceId, "resourceId"),
    p_unit_id: uuid(input.unitId, "unitId"),
    p_resident_id: uuid(input.residentId, "residentId"),
    p_party_size: input.partySize,
    p_starts_at: range.starts,
    p_ends_at: range.ends,
    p_waitlist_if_full: input.waitlistIfFull,
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function commitResourceBooking(
  input: CommitResourceBookingInput
): Promise<BookingCommandReceipt> {
  return callCommand("commit_resource_booking_command", {
    p_hold_id: uuid(input.holdId, "holdId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_guest_name: optionalText(input.guestName, "guestName", 200),
    p_notes: optionalText(input.notes, "notes", 2_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function decideResourceBooking(
  input: DecideResourceBookingInput
): Promise<BookingCommandReceipt> {
  if (input.decision !== "approve" && input.decision !== "reject") {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      "decision must be approve or reject."
    )
  }
  return callCommand("decide_resource_booking_command", {
    p_reservation_id: uuid(input.reservationId, "reservationId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_decision: input.decision,
    p_reason: optionalText(input.reason, "reason", 1_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function updateResourceBookingFinance(
  input: UpdateResourceBookingFinanceInput
): Promise<BookingCommandReceipt> {
  if (!FINANCE_STATES.includes(input.paymentState) || !FINANCE_STATES.includes(input.depositState)) {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      "paymentState and depositState must use an allowed truth state."
    )
  }
  return callCommand("update_resource_booking_finance_command", {
    p_reservation_id: uuid(input.reservationId, "reservationId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_payment_state: input.paymentState,
    p_deposit_state: input.depositState,
    p_reason: requiredText(input.reason, "reason", 1, 1_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function transitionResourceBooking(
  input: TransitionResourceBookingInput
): Promise<BookingCommandReceipt> {
  if (!TRANSITIONS.includes(input.transition)) {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      "transition is not supported."
    )
  }
  return callCommand("transition_resource_booking_command", {
    p_reservation_id: uuid(input.reservationId, "reservationId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_transition: input.transition,
    p_reason: optionalText(input.reason, "reason", 1_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function cancelResourceBooking(
  input: CancelResourceBookingInput
): Promise<BookingCommandReceipt> {
  return callCommand("cancel_resource_booking_command", {
    p_reservation_id: uuid(input.reservationId, "reservationId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_reason: requiredText(input.reason, "reason", 1, 1_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function rescheduleResourceBooking(
  input: RescheduleResourceBookingInput
): Promise<BookingCommandReceipt> {
  const range = timeRange(input.startsAt, input.endsAt)
  return callCommand("reschedule_resource_booking_command", {
    p_reservation_id: uuid(input.reservationId, "reservationId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_starts_at: range.starts,
    p_ends_at: range.ends,
    p_reason: requiredText(input.reason, "reason", 1, 1_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function createBookingBlackout(
  input: CreateBookingBlackoutInput
): Promise<BookingCommandReceipt> {
  if (!BLACKOUT_TYPES.includes(input.blackoutType)) {
    throw repositoryError(
      "BOOKING_VALIDATION_FAILED",
      422,
      "blackoutType is not supported."
    )
  }
  const range = timeRange(input.startsAt, input.endsAt)
  return callCommand("create_booking_blackout_command", {
    p_resource_id: uuid(input.resourceId, "resourceId"),
    p_starts_at: range.starts,
    p_ends_at: range.ends,
    p_blackout_type: input.blackoutType,
    p_reason: requiredText(input.reason, "reason", 1, 1_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function cancelBookingBlackout(
  input: CancelBookingBlackoutInput
): Promise<BookingCommandReceipt> {
  return callCommand("cancel_booking_blackout_command", {
    p_blackout_id: uuid(input.blackoutId, "blackoutId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_reason: requiredText(input.reason, "reason", 1, 1_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function promoteBookingWaitlist(
  input: PromoteBookingWaitlistInput
): Promise<BookingCommandReceipt> {
  return callCommand("promote_booking_waitlist_command", {
    p_resource_id: uuid(input.resourceId, "resourceId"),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}
