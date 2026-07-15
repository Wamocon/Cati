/**
 * Pure contracts and policy helpers for the offline-safe mutation queue.
 *
 * IndexedDB ownership/leases belong in client components; authenticated RPC
 * execution belongs in a route handler. Keeping this module runtime-neutral
 * lets both sides share the same allowlist, limits, fingerprints, ordering,
 * backoff, and conflict semantics without bundling server credentials.
 */

export const OFFLINE_SAFE_COMMAND_TYPES = [
  "ticket.create",
  "ticket.field_note.append",
] as const

export type OfflineSafeCommandType = (typeof OFFLINE_SAFE_COMMAND_TYPES)[number]

export const OFFLINE_QUEUE_MAX_ITEMS = 50
export const OFFLINE_QUEUE_RETENTION_MS = 72 * 60 * 60 * 1000
export const OFFLINE_QUEUE_MAX_PAYLOAD_BYTES = 8_192
export const OFFLINE_REPLAY_BATCH_SIZE = 10
export const OFFLINE_RETRY_BASE_MS = 2_000
export const OFFLINE_RETRY_MAX_MS = 5 * 60 * 1000
export const OFFLINE_RETRY_MAX_ATTEMPTS = 8

export type OfflineQueueStatus =
  | "queued"
  | "replaying"
  | "retry_wait"
  | "conflict"
  | "applied"
  | "discarded"
  | "rejected"
  | "expired"

export interface OfflineQueueOwnerScope {
  userId: string
  companyId: string
  role: "admin" | "manager" | "accountant" | "staff" | "owner" | "tenant"
}

export interface OfflineTicketCreatePayload {
  siteId: string
  unitId: string
  title: string
  description?: string
  category: string
  priority: "low" | "normal" | "high"
}

export interface OfflineTicketFieldNotePayload {
  ticketId: string
  body: string
  visibility: "internal"
}

export type OfflineCommandPayload =
  | OfflineTicketCreatePayload
  | OfflineTicketFieldNotePayload

export type OfflineCommandPayloadByType = {
  "ticket.create": OfflineTicketCreatePayload
  "ticket.field_note.append": OfflineTicketFieldNotePayload
}

export interface OfflineCommandEnvelope<
  TType extends OfflineSafeCommandType = OfflineSafeCommandType,
> {
  id: string
  clientInstanceId: string
  sequence: number
  idempotencyKey: string
  commandType: TType
  expectedVersion: number | null
  payload: OfflineCommandPayloadByType[TType]
  payloadDigest: string
  payloadBytes: number
  ownerScope: OfflineQueueOwnerScope
  status: OfflineQueueStatus
  attemptCount: number
  createdAt: string
  updatedAt: string
  expiresAt: string
  nextAttemptAt: string | null
  lastErrorCode: string | null
  serverVersion: number | null
  resultEntityId: string | null
}

export interface CreateOfflineCommandInput<TType extends OfflineSafeCommandType> {
  clientInstanceId: string
  sequence: number
  commandType: TType
  expectedVersion?: number | null
  payload: OfflineCommandPayloadByType[TType]
  ownerScope: OfflineQueueOwnerScope
  idempotencyKey?: string
  now?: Date
}

export interface OfflineCommandRpcArgs {
  p_client_instance_id: string
  p_client_sequence: number
  p_idempotency_key: string
  p_command_type: OfflineSafeCommandType
  p_expected_version: number | null
  p_payload: Record<string, unknown>
  p_payload_digest: string
  p_payload_bytes: number
}

export interface OfflineCommandReceipt {
  commandId: string
  status: "applied" | "conflict" | "retryable" | "rejected" | "discarded"
  commandType: OfflineSafeCommandType
  clientSequence: number
  resultEntityId: string | null
  resultVersion: number | null
  serverVersion: number | null
  errorCode: string | null
  nextRetryAt: string | null
  replayed: boolean
}

export interface OfflineConflictResolutionRpcArgs {
  p_command_id: string
  p_resolution: "discard" | "retry_with_current"
  p_new_expected_version: number | null
  p_payload: Record<string, unknown>
  p_payload_digest: string
  p_payload_bytes: number
  p_idempotency_key: string
}

export interface OfflineSyncClientState {
  clientInstanceId: string
  status: "active" | "revoked"
  roleSnapshot: OfflineQueueOwnerScope["role"]
  lastTerminalSequence: number
  blockedSequence: number | null
  lastSyncAt: string | null
  scopeIsCurrent: boolean
}

export type OfflineRepositoryErrorCode =
  | "OFFLINE_COMMAND_NOT_ALLOWED"
  | "OFFLINE_PAYLOAD_INVALID"
  | "OFFLINE_PAYLOAD_TOO_LARGE"
  | "OFFLINE_QUEUE_FULL"
  | "OFFLINE_SCOPE_INVALID"
  | "OFFLINE_SCOPE_CHANGED"
  | "OFFLINE_SEQUENCE_INVALID"
  | "OFFLINE_IDEMPOTENCY_INVALID"
  | "OFFLINE_RECEIPT_INVALID"

export class OfflineRepositoryError extends Error {
  constructor(
    readonly code: OfflineRepositoryErrorCode,
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "OfflineRepositoryError"
  }
}

const textEncoder = new TextEncoder()
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const QA_ZERO_UUID = "00000000-0000-0000-0000-000000000000"
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const PROHIBITED_PAYLOAD_KEYS = new Set([
  "amount",
  "bank",
  "card",
  "credential",
  "deposit",
  "dispatch",
  "document",
  "email",
  "emergency",
  "file",
  "identity",
  "media",
  "passport",
  "payment",
  "phone",
  "refund",
  "role",
  "signedurl",
  "token",
  "upload",
  "url",
  "access",
  "approval",
])

function runtimeCrypto(): Crypto {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    throw new OfflineRepositoryError(
      "OFFLINE_IDEMPOTENCY_INVALID",
      "Web Crypto is unavailable in this runtime."
    )
  }
  return globalThis.crypto
}

function randomUuid(): string {
  const cryptoApi = runtimeCrypto()
  if (typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID()

  const bytes = new Uint8Array(16)
  cryptoApi.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function assertUuid(value: unknown, field: string, allowQaZero = false): string {
  if (typeof value !== "string") {
    throw new OfflineRepositoryError("OFFLINE_PAYLOAD_INVALID", field + " must be a UUID.")
  }
  const normalized = value.trim().toLowerCase()
  if ((!allowQaZero || normalized !== QA_ZERO_UUID) && !UUID_PATTERN.test(normalized)) {
    throw new OfflineRepositoryError("OFFLINE_PAYLOAD_INVALID", field + " must be a UUID.")
  }
  return normalized
}

function assertText(value: unknown, field: string, minimum: number, maximum: number): string {
  if (typeof value !== "string") {
    throw new OfflineRepositoryError("OFFLINE_PAYLOAD_INVALID", field + " must be text.")
  }
  const normalized = value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new OfflineRepositoryError(
      "OFFLINE_PAYLOAD_INVALID",
      field + " must contain " + minimum + " to " + maximum + " characters."
    )
  }
  return normalized
}

function assertNoProhibitedKeys(value: unknown, path = "payload"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoProhibitedKeys(item, path + "[" + index + "]"))
    return
  }
  if (!isRecord(value)) return

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (PROHIBITED_PAYLOAD_KEYS.has(normalizedKey)) {
      throw new OfflineRepositoryError(
        "OFFLINE_COMMAND_NOT_ALLOWED",
        "Sensitive or online-only field is not allowed in the offline queue: " + path + "." + key
      )
    }
    assertNoProhibitedKeys(nestedValue, path + "." + key)
  }
}

function sortedJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedJsonValue)
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortedJsonValue(value[key])])
  )
}

export function canonicalOfflineCommandJson(value: unknown): string {
  return JSON.stringify(sortedJsonValue(value))
}

export async function sha256OfflinePayload(value: unknown): Promise<string> {
  const bytes = textEncoder.encode(canonicalOfflineCommandJson(value))
  const digest = await runtimeCrypto().subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function assertOfflineQueueOwnerScope(scope: OfflineQueueOwnerScope): OfflineQueueOwnerScope {
  if (!scope || typeof scope !== "object") {
    throw new OfflineRepositoryError("OFFLINE_SCOPE_INVALID", "Queue owner scope is required.")
  }
  const role = scope.role
  if (!["admin", "manager", "accountant", "staff", "owner", "tenant"].includes(role)) {
    throw new OfflineRepositoryError("OFFLINE_SCOPE_INVALID", "Queue owner role is invalid.")
  }
  return {
    userId: assertUuid(scope.userId, "ownerScope.userId", true),
    companyId: assertUuid(scope.companyId, "ownerScope.companyId", true),
    role,
  }
}

export function offlineQueueScopeKey(scope: OfflineQueueOwnerScope): string {
  const safe = assertOfflineQueueOwnerScope(scope)
  return safe.companyId + ":" + safe.userId + ":" + safe.role
}

export function offlineQueueRequiresPurge(
  storedScope: OfflineQueueOwnerScope,
  currentScope: OfflineQueueOwnerScope | null
): boolean {
  if (!currentScope) return true
  return offlineQueueScopeKey(storedScope) !== offlineQueueScopeKey(currentScope)
}

export function isOfflineSafeCommandType(value: unknown): value is OfflineSafeCommandType {
  return typeof value === "string" && (OFFLINE_SAFE_COMMAND_TYPES as readonly string[]).includes(value)
}

export function validateOfflinePayload<TType extends OfflineSafeCommandType>(
  commandType: TType,
  payload: unknown,
  expectedVersion: number | null
): OfflineCommandPayloadByType[TType] {
  if (!isRecord(payload)) {
    throw new OfflineRepositoryError("OFFLINE_PAYLOAD_INVALID", "Offline command payload must be an object.")
  }
  assertNoProhibitedKeys(payload)

  if (commandType === "ticket.create") {
    if (expectedVersion !== null) {
      throw new OfflineRepositoryError(
        "OFFLINE_PAYLOAD_INVALID",
        "Ticket creation must not carry an expected version."
      )
    }
    const priority = payload.priority
    if (priority !== "low" && priority !== "normal" && priority !== "high") {
      throw new OfflineRepositoryError(
        "OFFLINE_COMMAND_NOT_ALLOWED",
        "Urgent/emergency ticket dispatch requires an online authoritative check."
      )
    }
    const category = assertText(payload.category, "payload.category", 1, 100)
    const result: OfflineTicketCreatePayload = {
      siteId: assertUuid(payload.siteId, "payload.siteId"),
      unitId: assertUuid(payload.unitId, "payload.unitId"),
      title: assertText(payload.title, "payload.title", 1, 160),
      category,
      priority,
    }
    if (payload.description !== undefined && payload.description !== null && payload.description !== "") {
      result.description = assertText(payload.description, "payload.description", 1, 1_200)
    }
    return result as OfflineCommandPayloadByType[TType]
  }

  if (!Number.isSafeInteger(expectedVersion) || (expectedVersion ?? 0) < 1) {
    throw new OfflineRepositoryError(
      "OFFLINE_PAYLOAD_INVALID",
      "Field notes require the ticket version observed when the note was queued."
    )
  }
  if (payload.visibility !== "internal") {
    throw new OfflineRepositoryError(
      "OFFLINE_COMMAND_NOT_ALLOWED",
      "Offline field notes must remain internal until the server accepts them."
    )
  }
  return {
    ticketId: assertUuid(payload.ticketId, "payload.ticketId"),
    body: assertText(payload.body, "payload.body", 1, 1_000),
    visibility: "internal",
  } as OfflineCommandPayloadByType[TType]
}

function assertSequence(sequence: number): number {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new OfflineRepositoryError(
      "OFFLINE_SEQUENCE_INVALID",
      "Offline client sequence must be a positive integer."
    )
  }
  return sequence
}

export function assertOfflineIdempotencyKey(value: string): string {
  const normalized = value.trim()
  if (!IDEMPOTENCY_PATTERN.test(normalized)) {
    throw new OfflineRepositoryError(
      "OFFLINE_IDEMPOTENCY_INVALID",
      "Offline idempotency key must contain 8 to 200 safe characters."
    )
  }
  return normalized
}

export async function createOfflineCommand<TType extends OfflineSafeCommandType>(
  input: CreateOfflineCommandInput<TType>
): Promise<OfflineCommandEnvelope<TType>> {
  if (!isOfflineSafeCommandType(input.commandType)) {
    throw new OfflineRepositoryError(
      "OFFLINE_COMMAND_NOT_ALLOWED",
      "This command requires an online authoritative check."
    )
  }
  const clientInstanceId = assertUuid(input.clientInstanceId, "clientInstanceId")
  const sequence = assertSequence(input.sequence)
  const ownerScope = assertOfflineQueueOwnerScope(input.ownerScope)
  if (ownerScope.role === "accountant") {
    throw new OfflineRepositoryError(
      "OFFLINE_COMMAND_NOT_ALLOWED",
      "Finance actions require an online authoritative check."
    )
  }
  if (
    input.commandType === "ticket.create" &&
    !["admin", "manager", "owner", "tenant"].includes(ownerScope.role)
  ) {
    throw new OfflineRepositoryError(
      "OFFLINE_COMMAND_NOT_ALLOWED",
      "Offline ticket creation is limited to scoped administrators, managers, owners, and tenants."
    )
  }
  if (input.commandType === "ticket.field_note.append" && !["admin", "staff", "manager"].includes(ownerScope.role)) {
    throw new OfflineRepositoryError(
      "OFFLINE_COMMAND_NOT_ALLOWED",
      "Only administrators, assigned field staff, or scoped managers may queue an internal field note."
    )
  }

  const expectedVersion = input.expectedVersion ?? null
  const payload = validateOfflinePayload(input.commandType, input.payload, expectedVersion)
  const payloadJson = canonicalOfflineCommandJson(payload)
  const payloadBytes = textEncoder.encode(payloadJson).byteLength
  if (payloadBytes > OFFLINE_QUEUE_MAX_PAYLOAD_BYTES) {
    throw new OfflineRepositoryError(
      "OFFLINE_PAYLOAD_TOO_LARGE",
      "Offline command payload exceeds " + OFFLINE_QUEUE_MAX_PAYLOAD_BYTES + " bytes."
    )
  }

  const idempotencyKey = assertOfflineIdempotencyKey(
    input.idempotencyKey ?? "offline:" + clientInstanceId + ":" + sequence + ":" + randomUuid()
  )
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  if (!Number.isFinite(now.getTime())) {
    throw new OfflineRepositoryError("OFFLINE_PAYLOAD_INVALID", "Queue timestamp is invalid.")
  }
  const expiresAt = new Date(now.getTime() + OFFLINE_QUEUE_RETENTION_MS)
  const payloadDigest = await sha256OfflinePayload(payload)

  return {
    id: randomUuid(),
    clientInstanceId,
    sequence,
    idempotencyKey,
    commandType: input.commandType,
    expectedVersion,
    payload,
    payloadDigest,
    payloadBytes,
    ownerScope,
    status: "queued",
    attemptCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    nextAttemptAt: null,
    lastErrorCode: null,
    serverVersion: null,
    resultEntityId: null,
  }
}

export function assertOfflineQueueCapacity(
  records: readonly OfflineCommandEnvelope[],
  additionalItems = 1
): void {
  const active = records.filter((record) => !isOfflineTerminalStatus(record.status)).length
  if (
    !Number.isSafeInteger(additionalItems) ||
    additionalItems < 0 ||
    active + additionalItems > OFFLINE_QUEUE_MAX_ITEMS
  ) {
    throw new OfflineRepositoryError(
      "OFFLINE_QUEUE_FULL",
      "Offline queue is limited to " + OFFLINE_QUEUE_MAX_ITEMS + " pending commands."
    )
  }
}

export function isOfflineTerminalStatus(status: OfflineQueueStatus): boolean {
  return ["applied", "discarded", "rejected", "expired"].includes(status)
}

export function expireOfflineCommands(
  records: readonly OfflineCommandEnvelope[],
  now = new Date()
): OfflineCommandEnvelope[] {
  const timestamp = now.getTime()
  return records.map((record) => {
    if (isOfflineTerminalStatus(record.status) || new Date(record.expiresAt).getTime() > timestamp) {
      return record
    }
    return {
      ...record,
      status: "expired",
      updatedAt: now.toISOString(),
      lastErrorCode: "OFFLINE_COMMAND_EXPIRED",
      nextAttemptAt: null,
    }
  })
}

function deterministicJitterFactor(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  const normalized = (hash >>> 0) / 0xffffffff
  return 0.8 + normalized * 0.4
}

export function offlineRetryDelayMs(attemptCount: number, seed = "offline"): number {
  const safeAttempt = Math.max(1, Math.min(Math.trunc(attemptCount), OFFLINE_RETRY_MAX_ATTEMPTS))
  const exponential = Math.min(
    OFFLINE_RETRY_BASE_MS * 2 ** (safeAttempt - 1),
    OFFLINE_RETRY_MAX_MS
  )
  return Math.min(
    OFFLINE_RETRY_MAX_MS,
    Math.max(OFFLINE_RETRY_BASE_MS, Math.round(exponential * deterministicJitterFactor(seed)))
  )
}

export function scheduleOfflineRetry(
  record: OfflineCommandEnvelope,
  errorCode: string,
  now = new Date()
): OfflineCommandEnvelope {
  const attemptCount = record.attemptCount + 1
  if (attemptCount >= OFFLINE_RETRY_MAX_ATTEMPTS) {
    return {
      ...record,
      status: "rejected",
      attemptCount,
      updatedAt: now.toISOString(),
      nextAttemptAt: null,
      lastErrorCode: "OFFLINE_RETRY_EXHAUSTED:" + errorCode,
    }
  }
  const nextAttemptAt = new Date(
    now.getTime() + offlineRetryDelayMs(attemptCount, record.idempotencyKey)
  )
  return {
    ...record,
    status: "retry_wait",
    attemptCount,
    updatedAt: now.toISOString(),
    nextAttemptAt: nextAttemptAt.toISOString(),
    lastErrorCode: errorCode.slice(0, 120),
  }
}

export function orderedOfflineReplayBatch(
  records: readonly OfflineCommandEnvelope[],
  now = new Date(),
  limit = OFFLINE_REPLAY_BATCH_SIZE
): OfflineCommandEnvelope[] {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), OFFLINE_REPLAY_BATCH_SIZE))
  const ordered = [...records].sort((left, right) => left.sequence - right.sequence)
  const batch: OfflineCommandEnvelope[] = []

  for (const record of ordered) {
    if (isOfflineTerminalStatus(record.status)) continue
    if (record.status === "conflict" || record.status === "replaying") break
    if (new Date(record.expiresAt).getTime() <= now.getTime()) break
    if (record.nextAttemptAt && new Date(record.nextAttemptAt).getTime() > now.getTime()) break
    if (record.status !== "queued" && record.status !== "retry_wait") break
    batch.push(record)
    if (batch.length >= safeLimit) break
  }
  return batch
}

export function toOfflineCommandRpcArgs(record: OfflineCommandEnvelope): OfflineCommandRpcArgs {
  if (!SHA256_PATTERN.test(record.payloadDigest)) {
    throw new OfflineRepositoryError("OFFLINE_PAYLOAD_INVALID", "Offline payload digest is invalid.")
  }
  const payload = validateOfflinePayload(record.commandType, record.payload, record.expectedVersion)
  return {
    p_client_instance_id: assertUuid(record.clientInstanceId, "clientInstanceId"),
    p_client_sequence: assertSequence(record.sequence),
    p_idempotency_key: assertOfflineIdempotencyKey(record.idempotencyKey),
    p_command_type: record.commandType,
    p_expected_version: record.expectedVersion,
    p_payload: payload as unknown as Record<string, unknown>,
    p_payload_digest: record.payloadDigest,
    p_payload_bytes: record.payloadBytes,
  }
}

export async function toOfflineConflictResolutionRpcArgs(
  record: OfflineCommandEnvelope,
  resolution: "discard" | "retry_with_current",
  idempotencyKey: string,
  newExpectedVersion: number | null = null
): Promise<OfflineConflictResolutionRpcArgs> {
  if (record.status !== "conflict") {
    throw new OfflineRepositoryError(
      "OFFLINE_RECEIPT_INVALID",
      "Only a command with a visible server conflict can be resolved."
    )
  }
  if (
    resolution === "retry_with_current" &&
    (
      record.commandType !== "ticket.field_note.append" ||
      !Number.isSafeInteger(newExpectedVersion) ||
      (newExpectedVersion ?? 0) < 1
    )
  ) {
    throw new OfflineRepositoryError(
      "OFFLINE_COMMAND_NOT_ALLOWED",
      "Only an unchanged field note can be retried against an explicitly current ticket version."
    )
  }

  const expectedVersion =
    resolution === "retry_with_current" ? newExpectedVersion : record.expectedVersion
  const payload = validateOfflinePayload(
    record.commandType,
    record.payload,
    expectedVersion
  )
  const payloadJson = canonicalOfflineCommandJson(payload)

  return {
    p_command_id: assertUuid(record.id, "commandId"),
    p_resolution: resolution,
    p_new_expected_version:
      resolution === "retry_with_current" ? newExpectedVersion : null,
    p_payload: payload as unknown as Record<string, unknown>,
    p_payload_digest: await sha256OfflinePayload(payload),
    p_payload_bytes: textEncoder.encode(payloadJson).byteLength,
    p_idempotency_key: assertOfflineIdempotencyKey(idempotencyKey),
  }
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function nullableInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) ? (value as number) : null
}

export function parseOfflineCommandReceipt(value: unknown): OfflineCommandReceipt {
  if (!isRecord(value)) {
    throw new OfflineRepositoryError("OFFLINE_RECEIPT_INVALID", "Offline command receipt is missing.")
  }
  const commandId = nullableString(value.command_id ?? value.commandId)
  const status = nullableString(value.status)
  const commandType = value.command_type ?? value.commandType
  const clientSequence = value.client_sequence ?? value.clientSequence
  if (
    !commandId ||
    !isOfflineSafeCommandType(commandType) ||
    !Number.isSafeInteger(clientSequence) ||
    !status ||
    !["applied", "conflict", "retryable", "rejected", "discarded"].includes(status)
  ) {
    throw new OfflineRepositoryError("OFFLINE_RECEIPT_INVALID", "Offline command receipt is malformed.")
  }

  return {
    commandId,
    status: status as OfflineCommandReceipt["status"],
    commandType,
    clientSequence: clientSequence as number,
    resultEntityId: nullableString(value.result_entity_id ?? value.resultEntityId),
    resultVersion: nullableInteger(value.result_version ?? value.resultVersion),
    serverVersion: nullableInteger(value.server_version ?? value.serverVersion),
    errorCode: nullableString(value.error_code ?? value.errorCode),
    nextRetryAt: nullableString(value.next_retry_at ?? value.nextRetryAt),
    replayed: value.replayed === true,
  }
}

export function parseOfflineSyncClientState(value: unknown): OfflineSyncClientState {
  if (!isRecord(value)) {
    throw new OfflineRepositoryError(
      "OFFLINE_RECEIPT_INVALID",
      "Offline client state is missing."
    )
  }
  const clientInstanceId = nullableString(
    value.client_instance_id ?? value.clientInstanceId
  )
  const status = nullableString(value.status)
  const roleSnapshot = nullableString(value.role_snapshot ?? value.roleSnapshot)
  const lastTerminalSequence =
    value.last_terminal_sequence ?? value.lastTerminalSequence
  const blockedSequence = value.blocked_sequence ?? value.blockedSequence
  const lastSyncAt = nullableString(value.last_sync_at ?? value.lastSyncAt)
  const scopeIsCurrent = value.scope_is_current ?? value.scopeIsCurrent

  if (
    !clientInstanceId ||
    !UUID_PATTERN.test(clientInstanceId) ||
    (status !== "active" && status !== "revoked") ||
    !roleSnapshot ||
    !["admin", "manager", "staff", "owner", "tenant"].includes(roleSnapshot) ||
    !Number.isSafeInteger(lastTerminalSequence) ||
    (blockedSequence !== null && !Number.isSafeInteger(blockedSequence)) ||
    typeof scopeIsCurrent !== "boolean"
  ) {
    throw new OfflineRepositoryError(
      "OFFLINE_RECEIPT_INVALID",
      "Offline client state is malformed."
    )
  }

  return {
    clientInstanceId,
    status,
    roleSnapshot: roleSnapshot as OfflineSyncClientState["roleSnapshot"],
    lastTerminalSequence: lastTerminalSequence as number,
    blockedSequence: blockedSequence as number | null,
    lastSyncAt,
    scopeIsCurrent,
  }
}

export function applyOfflineReceipt(
  record: OfflineCommandEnvelope,
  receipt: OfflineCommandReceipt,
  now = new Date()
): OfflineCommandEnvelope {
  if (receipt.clientSequence !== record.sequence || receipt.commandType !== record.commandType) {
    throw new OfflineRepositoryError(
      "OFFLINE_RECEIPT_INVALID",
      "Offline receipt does not match the queued command."
    )
  }

  const status: OfflineQueueStatus =
    receipt.status === "applied"
      ? "applied"
      : receipt.status === "conflict"
        ? "conflict"
        : receipt.status === "retryable"
          ? "retry_wait"
          : receipt.status === "discarded"
            ? "discarded"
            : "rejected"

  return {
    ...record,
    status,
    attemptCount: receipt.status === "retryable" ? record.attemptCount + 1 : record.attemptCount,
    updatedAt: now.toISOString(),
    nextAttemptAt: receipt.nextRetryAt,
    lastErrorCode: receipt.errorCode,
    serverVersion: receipt.serverVersion,
    resultEntityId: receipt.resultEntityId,
  }
}

export function offlineCommandDataPolicy(): {
  allowed: readonly OfflineSafeCommandType[]
  forbidden: readonly string[]
} {
  return {
    allowed: OFFLINE_SAFE_COMMAND_TYPES,
    forbidden: [
      "financial posting, payment, deposit, or refund",
      "access credential or physical-access change",
      "role, permission, approval, or emergency dispatch",
      "identity/contact data, signed URLs, documents, or media",
    ],
  }
}
