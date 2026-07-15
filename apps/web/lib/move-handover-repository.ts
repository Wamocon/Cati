import "server-only"

import { isSupabaseConfigured } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const MOVE_HANDOVER_CONTRACT_VERSION = "move-handover.v1" as const

export type MoveHandoverJsonValue =
  | string
  | number
  | boolean
  | null
  | MoveHandoverJsonObject
  | MoveHandoverJsonArray

export interface MoveHandoverJsonObject {
  readonly [key: string]: MoveHandoverJsonValue
}

export type MoveHandoverJsonArray = readonly MoveHandoverJsonValue[]

export type MoveHandoverRecord = MoveHandoverJsonObject

export type MoveHandoverAppointmentKind = "move_in" | "move_out" | "handover"
export type MoveHandoverTransition = "prepare" | "mark_ready" | "start" | "complete"
export type MoveHandoverChecklistStatus =
  | "pending"
  | "completed"
  | "blocked"
  | "not_applicable"
export type MoveHandoverAccessTruthState =
  | "blocked"
  | "manual_ready"
  | "provider_ready"
  | "revoked"
export type MoveHandoverAccessType = "mobile_code" | "card" | "plate" | "qr"
export type MoveHandoverEvidenceType =
  | "identity"
  | "condition"
  | "meter"
  | "key_handover"
  | "signature"
  | "other"
export type MoveHandoverMeterType =
  | "electricity"
  | "water"
  | "gas"
  | "heat"
  | "other"
export type MoveHandoverConditionState =
  | "good"
  | "fair"
  | "damaged"
  | "not_inspected"
export type MoveHandoverWorkType =
  | "cleaning"
  | "inspection"
  | "repair"
  | "key_return"
  | "access_revocation"
  | "other"
export type MoveHandoverRelationshipKind =
  | "owner"
  | "tenant"
  | "guest"
  | "family"
  | "authorized_contact"

export interface MoveHandoverRelationshipCandidate {
  id: string
  unitId: string
  residentId: string
  relationship: MoveHandoverRelationshipKind
  label: string
  startDate: string | null
  endDate: string | null
}

export interface MoveHandoverReservationCandidate {
  id: string
  siteId: string
  unitId: string
  residentId: string
  resourceId: string
  resourceName: string
  startsAt: string
  endsAt: string
  lifecycleStatus: "confirmed"
  version: number
}

export interface MoveHandoverDocumentCandidate {
  id: string
  siteId: string | null
  unitId: string | null
  residentId: string | null
  title: string
  category: string
}

export interface MoveHandoverCapabilities {
  canCreate: boolean
  canReschedule: boolean
  canCancel: boolean
  canOperate: boolean
  canPrepareAccess: boolean
  canApproveAccess: boolean
  canLinkDeposit: boolean
}

export interface MoveHandoverWorkspace {
  contractVersion: typeof MOVE_HANDOVER_CONTRACT_VERSION
  generatedAt: string
  scope: {
    siteId: string | null
    role: string
    financeOnly: boolean
    capabilities: MoveHandoverCapabilities
  }
  candidates: {
    relationships: readonly MoveHandoverRelationshipCandidate[]
    reservations: readonly MoveHandoverReservationCandidate[]
    documents: readonly MoveHandoverDocumentCandidate[]
  }
  appointments: readonly MoveHandoverRecord[]
  checklistItems: readonly MoveHandoverRecord[]
  evidence: readonly MoveHandoverRecord[]
  meterReadings: readonly MoveHandoverRecord[]
  conditionItems: readonly MoveHandoverRecord[]
  turnoverWorkItems: readonly MoveHandoverRecord[]
  accessRequests: readonly MoveHandoverRecord[]
  depositSettlements: readonly MoveHandoverRecord[]
  events: readonly MoveHandoverRecord[]
}

export interface MoveHandoverCommandReceipt {
  contractVersion: typeof MOVE_HANDOVER_CONTRACT_VERSION
  command: string
  entityType: "appointment"
  entityId: string
  appointmentId?: string
  version: number
  state: string
  replayed: boolean
}

export interface CreateMoveHandoverInput {
  reservationId: string
  relationshipId: string
  appointmentKind: MoveHandoverAppointmentKind
  idempotencyKey: string
}

export interface RescheduleMoveHandoverInput {
  appointmentId: string
  expectedVersion: number
  startsAt: string
  endsAt: string
  reason: string
  idempotencyKey: string
}

export interface CancelMoveHandoverInput {
  appointmentId: string
  expectedVersion: number
  reason: string
  idempotencyKey: string
}

export interface TransitionMoveHandoverInput {
  appointmentId: string
  expectedVersion: number
  transition: MoveHandoverTransition
  reason?: string | null
  idempotencyKey: string
}

export interface UpdateMoveHandoverChecklistInput {
  appointmentId: string
  expectedVersion: number
  itemCode: string
  status: MoveHandoverChecklistStatus
  notes?: string | null
  idempotencyKey: string
}

export interface AddMoveHandoverEvidenceInput {
  appointmentId: string
  expectedVersion: number
  documentId: string
  evidenceType: MoveHandoverEvidenceType
  notes?: string | null
  idempotencyKey: string
}

export interface RecordMoveHandoverMeterInput {
  appointmentId: string
  expectedVersion: number
  meterType: MoveHandoverMeterType
  readingNumeric: number
  readingUnit: string
  readAt: string
  evidenceDocumentId?: string | null
  idempotencyKey: string
}

export interface RecordMoveHandoverConditionInput {
  appointmentId: string
  expectedVersion: number
  areaCode: string
  conditionState: MoveHandoverConditionState
  notes?: string | null
  evidenceDocumentId?: string | null
  idempotencyKey: string
}

export interface PrepareMoveHandoverAccessInput {
  appointmentId: string
  expectedVersion: number
  accessType: MoveHandoverAccessType
  truthState: MoveHandoverAccessTruthState
  humanApproved: boolean
  reason: string
  idempotencyKey: string
}

export interface CreateMoveHandoverTurnoverInput {
  appointmentId: string
  expectedVersion: number
  workType: MoveHandoverWorkType
  assignedProfileId?: string | null
  dueAt?: string | null
  idempotencyKey: string
}

export interface LinkMoveHandoverDepositInput {
  appointmentId: string
  expectedVersion: number
  depositSettlementId: string
  idempotencyKey: string
}

export type MoveHandoverRepositoryErrorCode =
  | "MOVE_HANDOVER_BACKEND_UNAVAILABLE"
  | "MOVE_HANDOVER_AUTH_REQUIRED"
  | "MOVE_HANDOVER_FORBIDDEN"
  | "MOVE_HANDOVER_NOT_FOUND"
  | "MOVE_HANDOVER_VALIDATION_FAILED"
  | "MOVE_HANDOVER_VERSION_CONFLICT"
  | "MOVE_HANDOVER_IDEMPOTENCY_CONFLICT"
  | "MOVE_HANDOVER_INVALID_STATE"
  | "MOVE_HANDOVER_RESPONSE_INVALID"
  | "MOVE_HANDOVER_DATABASE_UNAVAILABLE"

export class MoveHandoverRepositoryError extends Error {
  constructor(
    readonly code: MoveHandoverRepositoryErrorCode,
    readonly status: number,
    message: string,
    readonly databaseCode?: string
  ) {
    super(message)
    this.name = "MoveHandoverRepositoryError"
  }
}

type MoveHandoverRpcName =
  | "move_handover_workspace"
  | "create_move_handover_command"
  | "reschedule_move_handover_command"
  | "cancel_move_handover_command"
  | "transition_move_handover_command"
  | "update_move_handover_checklist_command"
  | "add_move_handover_evidence_command"
  | "record_move_handover_meter_command"
  | "record_move_handover_condition_command"
  | "prepare_move_handover_access_command"
  | "create_move_handover_turnover_command"
  | "link_move_handover_deposit_command"

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
    name: MoveHandoverRpcName,
    args?: Record<string, unknown>
  ): PromiseLike<RpcResponse>
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const OFFSET_TIMESTAMP_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/
const APPOINTMENT_KINDS: readonly MoveHandoverAppointmentKind[] = [
  "move_in",
  "move_out",
  "handover",
]
const TRANSITIONS: readonly MoveHandoverTransition[] = [
  "prepare",
  "mark_ready",
  "start",
  "complete",
]
const CHECKLIST_STATUSES: readonly MoveHandoverChecklistStatus[] = [
  "pending",
  "completed",
  "blocked",
  "not_applicable",
]
const RELATIONSHIP_KINDS: readonly MoveHandoverRelationshipKind[] = [
  "owner",
  "tenant",
  "guest",
  "family",
  "authorized_contact",
]
const ACCESS_TRUTH_STATES: readonly MoveHandoverAccessTruthState[] = [
  "blocked",
  "manual_ready",
  "provider_ready",
  "revoked",
]
const ACCESS_TYPES: readonly MoveHandoverAccessType[] = [
  "mobile_code",
  "card",
  "plate",
  "qr",
]
const EVIDENCE_TYPES: readonly MoveHandoverEvidenceType[] = [
  "identity",
  "condition",
  "meter",
  "key_handover",
  "signature",
  "other",
]
const METER_TYPES: readonly MoveHandoverMeterType[] = [
  "electricity",
  "water",
  "gas",
  "heat",
  "other",
]
const CONDITION_STATES: readonly MoveHandoverConditionState[] = [
  "good",
  "fair",
  "damaged",
  "not_inspected",
]
const WORK_TYPES: readonly MoveHandoverWorkType[] = [
  "cleaning",
  "inspection",
  "repair",
  "key_return",
  "access_revocation",
  "other",
]

function repositoryError(
  code: MoveHandoverRepositoryErrorCode,
  status: number,
  message: string,
  databaseCode?: string
) {
  return new MoveHandoverRepositoryError(code, status, message, databaseCode)
}

function requireDatabase(): void {
  if (!isSupabaseConfigured()) {
    throw repositoryError(
      "MOVE_HANDOVER_BACKEND_UNAVAILABLE",
      503,
      "Move and handover persistence is unavailable because Supabase is not configured."
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
      "MOVE_HANDOVER_VALIDATION_FAILED",
      422,
      `${field} must be text.`
    )
  }
  const normalized = value.normalize("NFC").trim()
  if (normalized.length < minimum || normalized.length > maximum) {
    throw repositoryError(
      "MOVE_HANDOVER_VALIDATION_FAILED",
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

function identifier(value: unknown, field: string): string {
  const normalized = requiredText(value, field, 2, 64).toLowerCase()
  if (!IDENTIFIER_PATTERN.test(normalized)) {
    throw repositoryError(
      "MOVE_HANDOVER_VALIDATION_FAILED",
      422,
      `${field} must be a bounded lowercase identifier.`
    )
  }
  return normalized
}

function uuid(value: unknown, field: string): string {
  const normalized = requiredText(value, field, 36, 36).toLowerCase()
  if (!UUID_PATTERN.test(normalized)) {
    throw repositoryError(
      "MOVE_HANDOVER_VALIDATION_FAILED",
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
      "MOVE_HANDOVER_VALIDATION_FAILED",
      422,
      `${field} must be a positive integer.`
    )
  }
  return value as number
}

function timestamp(value: unknown, field: string): string {
  const normalized = requiredText(value, field, 20, 40)
  if (!OFFSET_TIMESTAMP_PATTERN.test(normalized)) {
    throw repositoryError(
      "MOVE_HANDOVER_VALIDATION_FAILED",
      422,
      `${field} must include an explicit UTC offset.`
    )
  }
  const parsed = new Date(normalized)
  if (!Number.isFinite(parsed.getTime())) {
    throw repositoryError(
      "MOVE_HANDOVER_VALIDATION_FAILED",
      422,
      `${field} must be a valid timestamp.`
    )
  }
  return parsed.toISOString()
}

function optionalTimestamp(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === "") return null
  return timestamp(value, field)
}

function optionalDate(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === "") return null
  const normalized = requiredText(value, field, 10, 10)
  if (!DATE_PATTERN.test(normalized)) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      `${field} must be an ISO calendar date.`
    )
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      `${field} must be a valid calendar date.`
    )
  }
  return normalized
}

function timeRange(startsAt: unknown, endsAt: unknown) {
  const starts = timestamp(startsAt, "startsAt")
  const ends = timestamp(endsAt, "endsAt")
  if (new Date(ends).getTime() <= new Date(starts).getTime()) {
    throw repositoryError(
      "MOVE_HANDOVER_VALIDATION_FAILED",
      422,
      "endsAt must be later than startsAt."
    )
  }
  return { starts, ends }
}

function idempotencyKey(value: unknown): string {
  return requiredText(value, "idempotencyKey", 8, 200)
}

function finiteReading(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value >= 1e14
  ) {
    throw repositoryError(
      "MOVE_HANDOVER_VALIDATION_FAILED",
      422,
      "readingNumeric must be a non-negative number within the supported range."
    )
  }
  return value
}

function oneOf<T extends string>(
  value: unknown,
  values: readonly T[],
  field: string
): T {
  if (typeof value !== "string" || !(values as readonly string[]).includes(value)) {
    throw repositoryError(
      "MOVE_HANDOVER_VALIDATION_FAILED",
      422,
      `${field} is not supported.`
    )
  }
  return value as T
}

function mapRpcError(error: RpcErrorShape): MoveHandoverRepositoryError {
  const source = [error.message, error.details, error.hint].filter(Boolean).join(" ")
  const message = source || "Move and handover command failed."
  const normalized = message.toLowerCase()

  if (
    error.code === "PGRST301" ||
    /authentication required|authenticated profile required|not authenticated/.test(normalized)
  ) {
    return repositoryError("MOVE_HANDOVER_AUTH_REQUIRED", 401, message, error.code)
  }
  if (error.code === "42501" || /forbidden|permission|scope denied|outside actor scope|not allowed/.test(normalized)) {
    return repositoryError("MOVE_HANDOVER_FORBIDDEN", 403, message, error.code)
  }
  if (error.code === "P0002" || /not found/.test(normalized)) {
    return repositoryError("MOVE_HANDOVER_NOT_FOUND", 404, message, error.code)
  }
  if (/idempotenc/.test(normalized) && /different|another|conflict|already/.test(normalized)) {
    return repositoryError("MOVE_HANDOVER_IDEMPOTENCY_CONFLICT", 409, message, error.code)
  }
  if (error.code === "40001" || /version conflict|stale .*version|expected version/.test(normalized)) {
    return repositoryError("MOVE_HANDOVER_VERSION_CONFLICT", 409, message, error.code)
  }
  if (/invalid transition|cannot transition|current state|not ready|only .* can|already completed|already cancelled/.test(normalized)) {
    return repositoryError("MOVE_HANDOVER_INVALID_STATE", 409, message, error.code)
  }
  if (
    error.code === "P0001" ||
    error.code === "22023" ||
    error.code === "23502" ||
    error.code === "23514" ||
    /invalid|required|must be/.test(normalized)
  ) {
    return repositoryError("MOVE_HANDOVER_VALIDATION_FAILED", 422, message, error.code)
  }
  return repositoryError(
    "MOVE_HANDOVER_DATABASE_UNAVAILABLE",
    503,
    "Move and handover persistence is temporarily unavailable.",
    error.code
  )
}

function jsonValue(value: unknown, path: string, depth = 0): MoveHandoverJsonValue {
  if (depth > 20) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      `Move and handover response exceeds the supported JSON depth at ${path}.`
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
    "MOVE_HANDOVER_RESPONSE_INVALID",
    502,
    `Move and handover response contains a non-JSON value at ${path}.`
  )
}

function jsonObject(value: unknown, path: string): MoveHandoverJsonObject {
  const normalized = jsonValue(value, path)
  if (!isRecord(normalized)) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      `Move and handover response must contain an object at ${path}.`
    )
  }
  return normalized as MoveHandoverJsonObject
}

function recordArray(value: unknown, path: string): readonly MoveHandoverRecord[] {
  if (!Array.isArray(value)) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      `Move and handover response must contain an array at ${path}.`
    )
  }
  return value.map((item, index) => jsonObject(item, `${path}[${index}]`))
}

function relationshipCandidateArray(
  value: unknown,
  path: string
): readonly MoveHandoverRelationshipCandidate[] {
  if (!Array.isArray(value)) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      `Move and handover response must contain an array at ${path}.`
    )
  }

  return value.map((item, index) => {
    const itemPath = `${path}[${index}]`
    if (!isRecord(item)) {
      throw repositoryError(
        "MOVE_HANDOVER_RESPONSE_INVALID",
        502,
        `Move and handover response must contain an object at ${itemPath}.`
      )
    }
    return {
      id: uuid(item.id, `${itemPath}.id`),
      unitId: uuid(item.unitId, `${itemPath}.unitId`),
      residentId: uuid(item.residentId, `${itemPath}.residentId`),
      relationship: oneOf(
        item.relationship,
        RELATIONSHIP_KINDS,
        `${itemPath}.relationship`
      ),
      label: requiredText(item.label, `${itemPath}.label`, 1, 1_000),
      startDate: optionalDate(item.startDate, `${itemPath}.startDate`),
      endDate: optionalDate(item.endDate, `${itemPath}.endDate`),
    }
  })
}

function reservationCandidateArray(
  value: unknown,
  path: string
): readonly MoveHandoverReservationCandidate[] {
  if (!Array.isArray(value)) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      `Move and handover response must contain an array at ${path}.`
    )
  }

  return value.map((item, index) => {
    const itemPath = `${path}[${index}]`
    if (!isRecord(item) || item.lifecycleStatus !== "confirmed") {
      throw repositoryError(
        "MOVE_HANDOVER_RESPONSE_INVALID",
        502,
        `Move and handover response contains a malformed reservation candidate at ${itemPath}.`
      )
    }
    const range = timeRange(item.startsAt, item.endsAt)
    return {
      id: uuid(item.id, `${itemPath}.id`),
      siteId: uuid(item.siteId, `${itemPath}.siteId`),
      unitId: uuid(item.unitId, `${itemPath}.unitId`),
      residentId: uuid(item.residentId, `${itemPath}.residentId`),
      resourceId: uuid(item.resourceId, `${itemPath}.resourceId`),
      resourceName: requiredText(item.resourceName, `${itemPath}.resourceName`, 1, 1_000),
      startsAt: range.starts,
      endsAt: range.ends,
      lifecycleStatus: "confirmed",
      version: positiveVersion(item.version, `${itemPath}.version`),
    }
  })
}

function documentCandidateArray(
  value: unknown,
  path: string
): readonly MoveHandoverDocumentCandidate[] {
  if (!Array.isArray(value)) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      `Move and handover response must contain an array at ${path}.`
    )
  }

  return value.map((item, index) => {
    const itemPath = `${path}[${index}]`
    if (!isRecord(item)) {
      throw repositoryError(
        "MOVE_HANDOVER_RESPONSE_INVALID",
        502,
        `Move and handover response must contain an object at ${itemPath}.`
      )
    }
    return {
      id: uuid(item.id, `${itemPath}.id`),
      siteId: optionalUuid(item.siteId, `${itemPath}.siteId`),
      unitId: optionalUuid(item.unitId, `${itemPath}.unitId`),
      residentId: optionalUuid(item.residentId, `${itemPath}.residentId`),
      title: requiredText(item.title, `${itemPath}.title`, 1, 1_000),
      category: requiredText(item.category, `${itemPath}.category`, 1, 200),
    }
  })
}

function capability(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      `Move and handover response must contain a boolean at ${path}.`
    )
  }
  return value
}

function workspaceFromRpc(value: unknown): MoveHandoverWorkspace {
  if (!isRecord(value) || value.contractVersion !== MOVE_HANDOVER_CONTRACT_VERSION) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      "Move and handover workspace returned an unsupported contract."
    )
  }
  if (
    !isRecord(value.scope) ||
    typeof value.scope.financeOnly !== "boolean" ||
    !isRecord(value.scope.capabilities)
  ) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      "Move and handover workspace scope is malformed."
    )
  }
  if (!isRecord(value.candidates)) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      "Move and handover workspace candidates are malformed."
    )
  }

  return {
    contractVersion: MOVE_HANDOVER_CONTRACT_VERSION,
    generatedAt: timestamp(value.generatedAt, "response.generatedAt"),
    scope: {
      siteId: optionalUuid(value.scope.siteId, "response.scope.siteId"),
      role: requiredText(value.scope.role, "response.scope.role", 1, 50),
      financeOnly: value.scope.financeOnly,
      capabilities: {
        canCreate: capability(
          value.scope.capabilities.canCreate,
          "response.scope.capabilities.canCreate"
        ),
        canReschedule: capability(
          value.scope.capabilities.canReschedule,
          "response.scope.capabilities.canReschedule"
        ),
        canCancel: capability(
          value.scope.capabilities.canCancel,
          "response.scope.capabilities.canCancel"
        ),
        canOperate: capability(
          value.scope.capabilities.canOperate,
          "response.scope.capabilities.canOperate"
        ),
        canPrepareAccess: capability(
          value.scope.capabilities.canPrepareAccess,
          "response.scope.capabilities.canPrepareAccess"
        ),
        canApproveAccess: capability(
          value.scope.capabilities.canApproveAccess,
          "response.scope.capabilities.canApproveAccess"
        ),
        canLinkDeposit: capability(
          value.scope.capabilities.canLinkDeposit,
          "response.scope.capabilities.canLinkDeposit"
        ),
      },
    },
    candidates: {
      relationships: relationshipCandidateArray(
        value.candidates.relationships,
        "response.candidates.relationships"
      ),
      reservations: reservationCandidateArray(
        value.candidates.reservations,
        "response.candidates.reservations"
      ),
      documents: documentCandidateArray(
        value.candidates.documents,
        "response.candidates.documents"
      ),
    },
    appointments: recordArray(value.appointments, "response.appointments"),
    checklistItems: recordArray(value.checklistItems, "response.checklistItems"),
    evidence: recordArray(value.evidence, "response.evidence"),
    meterReadings: recordArray(value.meterReadings, "response.meterReadings"),
    conditionItems: recordArray(value.conditionItems, "response.conditionItems"),
    turnoverWorkItems: recordArray(value.turnoverWorkItems, "response.turnoverWorkItems"),
    accessRequests: recordArray(value.accessRequests, "response.accessRequests"),
    depositSettlements: recordArray(value.depositSettlements, "response.depositSettlements"),
    events: recordArray(value.events, "response.events"),
  }
}

function commandReceiptFromRpc(value: unknown): MoveHandoverCommandReceipt {
  if (
    !isRecord(value) ||
    value.contractVersion !== MOVE_HANDOVER_CONTRACT_VERSION ||
    value.entityType !== "appointment" ||
    typeof value.replayed !== "boolean"
  ) {
    throw repositoryError(
      "MOVE_HANDOVER_RESPONSE_INVALID",
      502,
      "Move and handover command returned an unsupported contract."
    )
  }
  jsonObject(value, "response")
  const appointmentId = optionalUuid(value.appointmentId, "response.appointmentId")

  return {
    contractVersion: MOVE_HANDOVER_CONTRACT_VERSION,
    command: requiredText(value.command, "response.command", 1, 100),
    entityType: "appointment",
    entityId: uuid(value.entityId, "response.entityId"),
    ...(appointmentId ? { appointmentId } : {}),
    version: positiveVersion(value.version, "response.version"),
    state: requiredText(value.state, "response.state", 1, 100),
    replayed: value.replayed,
  }
}

async function callRpc(
  name: MoveHandoverRpcName,
  args: Record<string, unknown>
): Promise<unknown> {
  requireDatabase()
  try {
    const client = (await createClient()) as unknown as RpcClient
    const response = await client.rpc(name, args)
    if (response.error) throw mapRpcError(response.error)
    return response.data
  } catch (error) {
    if (error instanceof MoveHandoverRepositoryError) throw error
    throw repositoryError(
      "MOVE_HANDOVER_DATABASE_UNAVAILABLE",
      503,
      "Move and handover persistence is temporarily unavailable."
    )
  }
}

async function callCommand(
  name: Exclude<MoveHandoverRpcName, "move_handover_workspace">,
  args: Record<string, unknown>
): Promise<MoveHandoverCommandReceipt> {
  return commandReceiptFromRpc(await callRpc(name, args))
}

export async function getMoveHandoverWorkspace(
  siteId: string | null = null
): Promise<MoveHandoverWorkspace> {
  return workspaceFromRpc(
    await callRpc("move_handover_workspace", {
      p_site_id: optionalUuid(siteId, "siteId"),
    })
  )
}

export async function createMoveHandover(
  input: CreateMoveHandoverInput
): Promise<MoveHandoverCommandReceipt> {
  return callCommand("create_move_handover_command", {
    p_reservation_id: uuid(input.reservationId, "reservationId"),
    p_relationship_id: uuid(input.relationshipId, "relationshipId"),
    p_appointment_kind: oneOf(input.appointmentKind, APPOINTMENT_KINDS, "appointmentKind"),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function rescheduleMoveHandover(
  input: RescheduleMoveHandoverInput
): Promise<MoveHandoverCommandReceipt> {
  const range = timeRange(input.startsAt, input.endsAt)
  return callCommand("reschedule_move_handover_command", {
    p_appointment_id: uuid(input.appointmentId, "appointmentId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_starts_at: range.starts,
    p_ends_at: range.ends,
    p_reason: requiredText(input.reason, "reason", 1, 1_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function cancelMoveHandover(
  input: CancelMoveHandoverInput
): Promise<MoveHandoverCommandReceipt> {
  return callCommand("cancel_move_handover_command", {
    p_appointment_id: uuid(input.appointmentId, "appointmentId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_reason: requiredText(input.reason, "reason", 1, 1_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function transitionMoveHandover(
  input: TransitionMoveHandoverInput
): Promise<MoveHandoverCommandReceipt> {
  return callCommand("transition_move_handover_command", {
    p_appointment_id: uuid(input.appointmentId, "appointmentId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_transition: oneOf(input.transition, TRANSITIONS, "transition"),
    p_reason: optionalText(input.reason, "reason", 1_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function updateMoveHandoverChecklist(
  input: UpdateMoveHandoverChecklistInput
): Promise<MoveHandoverCommandReceipt> {
  return callCommand("update_move_handover_checklist_command", {
    p_appointment_id: uuid(input.appointmentId, "appointmentId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_item_code: identifier(input.itemCode, "itemCode"),
    p_status: oneOf(input.status, CHECKLIST_STATUSES, "status"),
    p_notes: optionalText(input.notes, "notes", 2_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function addMoveHandoverEvidence(
  input: AddMoveHandoverEvidenceInput
): Promise<MoveHandoverCommandReceipt> {
  return callCommand("add_move_handover_evidence_command", {
    p_appointment_id: uuid(input.appointmentId, "appointmentId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_document_id: uuid(input.documentId, "documentId"),
    p_evidence_type: oneOf(input.evidenceType, EVIDENCE_TYPES, "evidenceType"),
    p_notes: optionalText(input.notes, "notes", 2_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function recordMoveHandoverMeter(
  input: RecordMoveHandoverMeterInput
): Promise<MoveHandoverCommandReceipt> {
  return callCommand("record_move_handover_meter_command", {
    p_appointment_id: uuid(input.appointmentId, "appointmentId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_meter_type: oneOf(input.meterType, METER_TYPES, "meterType"),
    p_reading_numeric: finiteReading(input.readingNumeric),
    p_reading_unit: requiredText(input.readingUnit, "readingUnit", 1, 24),
    p_read_at: timestamp(input.readAt, "readAt"),
    p_evidence_document_id: optionalUuid(input.evidenceDocumentId, "evidenceDocumentId"),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function recordMoveHandoverCondition(
  input: RecordMoveHandoverConditionInput
): Promise<MoveHandoverCommandReceipt> {
  return callCommand("record_move_handover_condition_command", {
    p_appointment_id: uuid(input.appointmentId, "appointmentId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_area_code: identifier(input.areaCode, "areaCode"),
    p_condition_state: oneOf(input.conditionState, CONDITION_STATES, "conditionState"),
    p_notes: optionalText(input.notes, "notes", 2_000),
    p_evidence_document_id: optionalUuid(input.evidenceDocumentId, "evidenceDocumentId"),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function prepareMoveHandoverAccess(
  input: PrepareMoveHandoverAccessInput
): Promise<MoveHandoverCommandReceipt> {
  if (typeof input.humanApproved !== "boolean") {
    throw repositoryError(
      "MOVE_HANDOVER_VALIDATION_FAILED",
      422,
      "humanApproved must be boolean."
    )
  }
  return callCommand("prepare_move_handover_access_command", {
    p_appointment_id: uuid(input.appointmentId, "appointmentId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_access_type: oneOf(input.accessType, ACCESS_TYPES, "accessType"),
    p_truth_state: oneOf(input.truthState, ACCESS_TRUTH_STATES, "truthState"),
    p_human_approved: input.humanApproved,
    p_reason: requiredText(input.reason, "reason", 1, 1_000),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function createMoveHandoverTurnover(
  input: CreateMoveHandoverTurnoverInput
): Promise<MoveHandoverCommandReceipt> {
  return callCommand("create_move_handover_turnover_command", {
    p_appointment_id: uuid(input.appointmentId, "appointmentId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_work_type: oneOf(input.workType, WORK_TYPES, "workType"),
    p_assigned_profile_id: optionalUuid(input.assignedProfileId, "assignedProfileId"),
    p_due_at: optionalTimestamp(input.dueAt, "dueAt"),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}

export async function linkMoveHandoverDeposit(
  input: LinkMoveHandoverDepositInput
): Promise<MoveHandoverCommandReceipt> {
  return callCommand("link_move_handover_deposit_command", {
    p_appointment_id: uuid(input.appointmentId, "appointmentId"),
    p_expected_version: positiveVersion(input.expectedVersion),
    p_deposit_settlement_id: uuid(input.depositSettlementId, "depositSettlementId"),
    p_idempotency_key: idempotencyKey(input.idempotencyKey),
  })
}
