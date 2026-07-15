export const OFFLINE_QUEUE_DATABASE = "cati-offline-commands-v1"
export const OFFLINE_QUEUE_RETENTION_MS = 72 * 60 * 60 * 1_000
export const OFFLINE_QUEUE_LIMIT = 50
export const OFFLINE_PAYLOAD_LIMIT_BYTES = 8_192
export const OFFLINE_REQUEST_TIMEOUT_MS = 12_000

const COMMAND_STORE = "commands"
const META_STORE = "meta"
const DATABASE_VERSION = 1
const CHANNEL_NAME = "cati-offline-sync-v1"

export type OfflineSafeCommandType = "ticket.create" | "ticket.field_note.append"
export type OfflineQueueStatus = "queued" | "syncing" | "retry" | "conflict"

export interface OfflineTicketCreatePayload {
  siteId: string
  unitId: string
  title: string
  description?: string
  category: string
  priority: "low" | "normal"
}

export interface OfflineFieldNotePayload {
  ticketId: string
  expectedVersion: number
  body: string
  visibility: "internal"
}

export type OfflineSafePayload = OfflineTicketCreatePayload | OfflineFieldNotePayload

export interface OfflineConflict {
  code: string
  message: string
  commandId?: string
  serverVersion?: number
  serverState?: Record<string, unknown>
}

export interface OfflineQueueItem {
  id: string
  idempotencyKey: string
  actorKey: string
  role: string
  clientId: string
  sequence: number
  commandType: OfflineSafeCommandType
  payload: OfflineSafePayload
  payloadFingerprint: string
  status: OfflineQueueStatus
  attempts: number
  createdAt: string
  updatedAt: string
  expiresAt: string
  nextAttemptAt: string | null
  lastError: string | null
  conflict: OfflineConflict | null
}

export interface OfflineQueueSnapshot {
  supported: boolean
  items: OfflineQueueItem[]
  lastSyncAt: string | null
  lastPurgeReason: string | null
}

export interface EnqueueOfflineCommandInput {
  actorKey: string
  role: string
  clientId: string
  commandType: OfflineSafeCommandType
  payload: OfflineSafePayload
}

export interface ReplayResult {
  processed: number
  succeeded: number
  conflicts: number
  deferred: number
  stoppedReason: "complete" | "offline" | "conflict" | "busy" | "unsupported"
}

interface ReplayResponse {
  status?: "succeeded" | "discarded" | "conflict" | "retry" | "rejected"
  code?: string
  error?: string
  commandId?: string
  serverVersion?: number
  serverState?: Record<string, unknown>
}

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined"
}

async function fetchOfflineSync(init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    OFFLINE_REQUEST_TIMEOUT_MS
  )

  try {
    return await fetch("/api/site-management/offline-sync", {
      ...init,
      signal: controller.signal,
    })
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true })
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed.")), {
      once: true,
    })
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true })
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted.")),
      { once: true }
    )
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB transaction failed.")),
      { once: true }
    )
  })
}

async function openDatabase(): Promise<IDBDatabase> {
  if (!isBrowser()) throw new Error("Offline queue is not supported in this browser.")

  const request = indexedDB.open(OFFLINE_QUEUE_DATABASE, DATABASE_VERSION)
  request.addEventListener("upgradeneeded", () => {
    const database = request.result
    if (!database.objectStoreNames.contains(COMMAND_STORE)) {
      const commands = database.createObjectStore(COMMAND_STORE, { keyPath: "id" })
      commands.createIndex("actor_sequence", ["actorKey", "sequence"], { unique: true })
      commands.createIndex("actor_status", ["actorKey", "status"], { unique: false })
      commands.createIndex("expires_at", "expiresAt", { unique: false })
    }
    if (!database.objectStoreNames.contains(META_STORE)) {
      database.createObjectStore(META_STORE, { keyPath: "key" })
    }
  })
  return requestResult(request)
}

function closeAfter(transaction: IDBTransaction, database: IDBDatabase) {
  return transactionComplete(transaction).finally(() => database.close())
}

function utf8Bytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

function assertUuid(value: string, field: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${field} must be a valid identifier.`)
  }
}

function assertText(value: string, field: string, maximum: number) {
  const normalized = value.trim()
  if (!normalized || normalized.length > maximum) {
    throw new Error(`${field} must contain 1 to ${maximum} characters.`)
  }
  if (/\b(?:https?:\/\/\S+[?&](?:token|signature|sig|key)=|bearer\s+|passport|kimlik|iban|card\s*number)\b/i.test(normalized)) {
    throw new Error(`${field} contains data that is not allowed in the offline queue.`)
  }
}

export function validateOfflineSafePayload(
  commandType: OfflineSafeCommandType,
  payload: OfflineSafePayload
): void {
  if (utf8Bytes(payload) > OFFLINE_PAYLOAD_LIMIT_BYTES) {
    throw new Error(`Offline payload exceeds ${OFFLINE_PAYLOAD_LIMIT_BYTES} bytes.`)
  }

  if (commandType === "ticket.create") {
    const ticket = payload as OfflineTicketCreatePayload
    assertUuid(ticket.siteId, "siteId")
    assertUuid(ticket.unitId, "unitId")
    assertText(ticket.title, "title", 160)
    if (ticket.description) assertText(ticket.description, "description", 1_000)
    assertText(ticket.category, "category", 100)
    if (ticket.priority !== "low" && ticket.priority !== "normal") {
      throw new Error("Urgent and emergency tickets require an online authoritative check.")
    }
    return
  }

  const note = payload as OfflineFieldNotePayload
  assertUuid(note.ticketId, "ticketId")
  if (!Number.isInteger(note.expectedVersion) || note.expectedVersion < 1) {
    throw new Error("A current ticket version is required for an offline field note.")
  }
  assertText(note.body, "body", 1_000)
  if (note.visibility !== "internal") {
    throw new Error("Offline field notes must remain internal until an online authoritative check.")
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function publishChange() {
  if (typeof BroadcastChannel === "undefined") return
  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.postMessage({ type: "queue-changed", at: new Date().toISOString() })
  channel.close()
}

async function getAllItems(database: IDBDatabase): Promise<OfflineQueueItem[]> {
  const transaction = database.transaction(COMMAND_STORE, "readonly")
  const items = await requestResult(
    transaction.objectStore(COMMAND_STORE).getAll() as IDBRequest<OfflineQueueItem[]>
  )
  await transactionComplete(transaction)
  return items.sort((left, right) => left.sequence - right.sequence)
}

async function getMeta(database: IDBDatabase, key: string): Promise<string | null> {
  const transaction = database.transaction(META_STORE, "readonly")
  const value = (await requestResult(transaction.objectStore(META_STORE).get(key))) as
    | { key: string; value: string }
    | undefined
  await transactionComplete(transaction)
  return value?.value ?? null
}

async function setMeta(key: string, value: string) {
  const database = await openDatabase()
  const transaction = database.transaction(META_STORE, "readwrite")
  transaction.objectStore(META_STORE).put({ key, value })
  await closeAfter(transaction, database)
}

export async function readOfflineQueue(actorKey?: string): Promise<OfflineQueueSnapshot> {
  if (!isBrowser()) {
    return { supported: false, items: [], lastSyncAt: null, lastPurgeReason: null }
  }

  const database = await openDatabase()
  const [items, lastSyncAt, lastPurgeReason] = await Promise.all([
    getAllItems(database),
    getMeta(database, "lastSyncAt"),
    getMeta(database, "lastPurgeReason"),
  ])
  database.close()
  return {
    supported: true,
    items: actorKey ? items.filter((item) => item.actorKey === actorKey) : items,
    lastSyncAt,
    lastPurgeReason,
  }
}

export async function enqueueOfflineCommand(
  input: EnqueueOfflineCommandInput
): Promise<OfflineQueueItem> {
  validateOfflineSafePayload(input.commandType, input.payload)
  if (!input.actorKey.trim() || !input.role.trim() || !input.clientId.trim()) {
    throw new Error("Offline commands require an actor, role, and client identifier.")
  }

  const database = await openDatabase()
  const existingItems = await getAllItems(database)
  const actorItems = existingItems.filter((item) => item.actorKey === input.actorKey)
  if (actorItems.length >= OFFLINE_QUEUE_LIMIT) {
    database.close()
    throw new Error(`Offline queue limit of ${OFFLINE_QUEUE_LIMIT} commands reached.`)
  }

  const now = new Date()
  const sequence = actorItems.reduce((maximum, item) => Math.max(maximum, item.sequence), 0) + 1
  const id = crypto.randomUUID()
  const canonicalPayload = JSON.stringify(input.payload)
  const item: OfflineQueueItem = {
    id,
    idempotencyKey: `offline:${input.clientId}:${id}`,
    actorKey: input.actorKey,
    role: input.role,
    clientId: input.clientId,
    sequence,
    commandType: input.commandType,
    payload: input.payload,
    payloadFingerprint: await sha256(`${input.commandType}:${canonicalPayload}`),
    status: "queued",
    attempts: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + OFFLINE_QUEUE_RETENTION_MS).toISOString(),
    nextAttemptAt: null,
    lastError: null,
    conflict: null,
  }

  const transaction = database.transaction(COMMAND_STORE, "readwrite")
  transaction.objectStore(COMMAND_STORE).add(item)
  await closeAfter(transaction, database)
  publishChange()
  return item
}

async function updateItem(item: OfflineQueueItem) {
  const database = await openDatabase()
  const transaction = database.transaction(COMMAND_STORE, "readwrite")
  transaction.objectStore(COMMAND_STORE).put(item)
  await closeAfter(transaction, database)
  publishChange()
}

async function deleteItem(id: string) {
  const database = await openDatabase()
  const transaction = database.transaction(COMMAND_STORE, "readwrite")
  transaction.objectStore(COMMAND_STORE).delete(id)
  await closeAfter(transaction, database)
  publishChange()
}

export async function discardOfflineCommand(id: string) {
  await deleteItem(id)
}

export async function resolveOfflineConflict(id: string, strategy: "discard" | "retry") {
  const snapshot = await readOfflineQueue()
  const item = snapshot.items.find((candidate) => candidate.id === id)
  if (!item || item.status !== "conflict") return

  const preserveConflict = async (code: string, message: string, response?: ReplayResponse) => {
    await updateItem({
      ...item,
      status: "conflict",
      nextAttemptAt: null,
      lastError: message,
      conflict: {
        ...item.conflict,
        code,
        message,
        commandId: response?.commandId ?? item.conflict?.commandId,
        serverVersion: response?.serverVersion ?? item.conflict?.serverVersion,
        serverState: response?.serverState ?? item.conflict?.serverState,
      },
      updatedAt: new Date().toISOString(),
    })
  }

  if (!navigator.onLine) {
    await preserveConflict(
      "OFFLINE_RESOLUTION_REQUIRES_ONLINE",
      "Conflict resolution requires an online authoritative check."
    )
    return
  }

  const commandId = item.conflict?.commandId
  if (!commandId) {
    await preserveConflict(
      "OFFLINE_SERVER_COMMAND_ID_REQUIRED",
      "The server conflict receipt is incomplete. Replay the command to obtain its authoritative identifier."
    )
    return
  }

  if (
    strategy === "retry" &&
    (item.commandType !== "ticket.field_note.append" || !item.conflict?.serverVersion)
  ) {
    await preserveConflict(
      "OFFLINE_CONFLICT_RETRY_NOT_ALLOWED",
      "Only a field note with a current server version can be retried."
    )
    return
  }

  const resolution = strategy === "discard" ? "discard" : "retry_with_current"
  const resolutionKey = `offline-resolve:${strategy}:${item.id}`

  try {
    const response = await fetchOfflineSync({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": resolutionKey,
      },
      body: JSON.stringify({
        action: "resolve",
        resolution,
        commandId,
        serverVersion: item.conflict?.serverVersion,
        clientId: item.clientId,
        sequence: item.sequence,
        originalIdempotencyKey: item.idempotencyKey,
        idempotencyKey: item.idempotencyKey,
        commandType: item.commandType,
        payload: item.payload,
        payloadFingerprint: item.payloadFingerprint,
        queuedAt: item.createdAt,
      }),
    })
    const body = (await response.json().catch(() => ({}))) as ReplayResponse
    if (response.ok && (body.status === "succeeded" || body.status === "discarded")) {
      await deleteItem(id)
      await setMeta("lastSyncAt", new Date().toISOString())
      return
    }

    const code = body.code ?? "OFFLINE_CONFLICT_RESOLUTION_PENDING"
    await preserveConflict(
      code,
      body.error ?? `Conflict resolution remains pending (${code}).`,
      body
    )
  } catch {
    await preserveConflict(
      "OFFLINE_CONFLICT_RESOLUTION_NETWORK_ERROR",
      "Conflict resolution could not reach the authoritative server."
    )
  }
}

export async function purgeOfflineQueue(reason: string) {
  if (!isBrowser()) return
  const database = await openDatabase()
  const transaction = database.transaction([COMMAND_STORE, META_STORE], "readwrite")
  transaction.objectStore(COMMAND_STORE).clear()
  transaction.objectStore(META_STORE).put({ key: "lastPurgeReason", value: reason.slice(0, 160) })
  await closeAfter(transaction, database)
  publishChange()
}

export async function purgeExpiredOfflineCommands(now = new Date()) {
  if (!isBrowser()) return 0
  const snapshot = await readOfflineQueue()
  const expired = snapshot.items.filter((item) => new Date(item.expiresAt).getTime() <= now.getTime())
  await Promise.all(expired.map((item) => deleteItem(item.id)))
  return expired.length
}

function retryDelayMs(attempts: number) {
  return Math.min(30_000, 1_000 * 2 ** Math.min(attempts, 5))
}

async function performReplay(actorKey: string): Promise<ReplayResult> {
  if (!navigator.onLine) {
    return { processed: 0, succeeded: 0, conflicts: 0, deferred: 0, stoppedReason: "offline" }
  }

  await purgeExpiredOfflineCommands()
  const snapshot = await readOfflineQueue(actorKey)
  const items = snapshot.items
    .filter((item) => item.status !== "conflict")
    .filter((item) => !item.nextAttemptAt || new Date(item.nextAttemptAt).getTime() <= Date.now())
    .sort((left, right) => left.sequence - right.sequence)

  let processed = 0
  let succeeded = 0
  let deferred = 0
  for (const item of items) {
    processed += 1
    const syncing: OfflineQueueItem = {
      ...item,
      status: "syncing",
      attempts: item.attempts + 1,
      updatedAt: new Date().toISOString(),
    }
    await updateItem(syncing)

    try {
      const response = await fetchOfflineSync({
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": item.idempotencyKey },
        body: JSON.stringify({
          clientId: item.clientId,
          sequence: item.sequence,
          idempotencyKey: item.idempotencyKey,
          payloadFingerprint: item.payloadFingerprint,
          commandType: item.commandType,
          payload: item.payload,
          queuedAt: item.createdAt,
        }),
      })
      const body = (await response.json().catch(() => ({}))) as ReplayResponse
      if (response.ok && body.status === "succeeded") {
        await deleteItem(item.id)
        succeeded += 1
        await setMeta("lastSyncAt", new Date().toISOString())
        continue
      }

      if (response.status === 409 || body.status === "conflict") {
        await updateItem({
          ...syncing,
          status: "conflict",
          nextAttemptAt: null,
          lastError: body.error ?? "The server record changed while this command was queued.",
          conflict: {
            code: body.code ?? "VERSION_CONFLICT",
            message: body.error ?? "Review the current server state before continuing.",
            commandId: body.commandId,
            serverVersion: body.serverVersion,
            serverState: body.serverState,
          },
          updatedAt: new Date().toISOString(),
        })
        return { processed, succeeded, conflicts: 1, deferred, stoppedReason: "conflict" }
      }

      const retryAt = new Date(Date.now() + retryDelayMs(syncing.attempts)).toISOString()
      await updateItem({
        ...syncing,
        status: "retry",
        nextAttemptAt: retryAt,
        lastError: body.error ?? `Server returned ${response.status}.`,
        updatedAt: new Date().toISOString(),
      })
      deferred += 1
      break
    } catch (error) {
      const retryAt = new Date(Date.now() + retryDelayMs(syncing.attempts)).toISOString()
      await updateItem({
        ...syncing,
        status: "retry",
        nextAttemptAt: retryAt,
        lastError: error instanceof Error ? error.message : "Network request failed.",
        updatedAt: new Date().toISOString(),
      })
      deferred += 1
      break
    }
  }

  return { processed, succeeded, conflicts: 0, deferred, stoppedReason: "complete" }
}

export async function replayOfflineQueue(actorKey: string): Promise<ReplayResult> {
  if (!isBrowser()) {
    return { processed: 0, succeeded: 0, conflicts: 0, deferred: 0, stoppedReason: "unsupported" }
  }

  if (navigator.locks) {
    const result = await navigator.locks.request(
      `cati-offline-replay:${actorKey}`,
      { ifAvailable: true },
      async (lock) =>
        lock
          ? performReplay(actorKey)
          : { processed: 0, succeeded: 0, conflicts: 0, deferred: 0, stoppedReason: "busy" as const }
    )
    return result
  }

  return performReplay(actorKey)
}

export function subscribeOfflineQueue(listener: () => void) {
  if (!isBrowser()) return () => undefined
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL_NAME)
  const handleMessage = () => listener()
  const handleNetwork = () => listener()
  channel?.addEventListener("message", handleMessage)
  window.addEventListener("online", handleNetwork)
  window.addEventListener("offline", handleNetwork)
  return () => {
    channel?.removeEventListener("message", handleMessage)
    channel?.close()
    window.removeEventListener("online", handleNetwork)
    window.removeEventListener("offline", handleNetwork)
  }
}
