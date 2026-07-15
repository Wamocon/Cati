import { createHash, randomUUID } from "node:crypto"
import type { UserProfile } from "@/lib/auth"
import { isAccessProfileEnabled } from "@/lib/auth"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import {
  accessibleUnitsForRole,
  LOCAL_QA_STAFF_ASSIGNMENT_LABEL,
  visibleServiceTicketsForRole,
} from "@/lib/role-scoped-views"
import { getServiceTicketQueueData } from "@/lib/site-management-repository"

export const SERVICE_PROOF_CONTRACT_VERSION = "service-proof.v1"
export const SERVICE_PROOF_BUCKET = "cati-service-evidence"

export type ServiceProofMediaType = "photo" | "video" | "note"
export type ServiceProofReviewStatus = "pending" | "accepted" | "rejected"
export type ServiceProofUploadStatus =
  | "requested"
  | "stored"
  | "failed"
  | "provider_not_connected"
  | "not_required"
export type ServiceProofScanStatus =
  | "pending"
  | "clean"
  | "rejected"
  | "not_connected"
  | "not_applicable"

export interface ServiceProofEventRecord {
  id: string
  type: string
  version: number
  actorRole: string | null
  reason: string | null
  createdAt: string
}

export interface ServiceProofRecord {
  id: string
  ticketId: string
  workforceTaskId: string
  serviceOrderId: string | null
  mediaType: ServiceProofMediaType
  note: string
  originalFilename: string | null
  mimeType: string | null
  sizeBytes: number | null
  uploadStatus: ServiceProofUploadStatus
  scanStatus: ServiceProofScanStatus
  reviewStatus: ServiceProofReviewStatus
  reviewVersion: number
  submittedByRole: string | null
  submittedAt: string
  reviewedAt: string | null
  reviewReason: string | null
  overrideReason: string | null
  canOpenFile: boolean
  events: ServiceProofEventRecord[]
}

export interface ServiceProofFeed {
  contractVersion: typeof SERVICE_PROOF_CONTRACT_VERSION
  source: "supabase" | "local-qa"
  providerMode: "private-storage" | "not-connected"
  generatedAt: string
  permissions: {
    canSubmit: boolean
    canReview: boolean
    overrideReasonRequired: boolean
  }
  limits: {
    photoBytes: number
    videoBytes: number
    photoMimeTypes: string[]
    videoMimeTypes: string[]
  }
  evidence: ServiceProofRecord[]
  warning?: string
}

export interface SubmitServiceProofInput {
  profile: UserProfile
  ticketId: string
  workforceTaskId: string
  mediaType: ServiceProofMediaType
  note: string
  file?: File | null
  overrideReason?: string | null
  idempotencyKey: string
}

export interface ReviewServiceProofInput {
  profile: UserProfile
  evidenceId: string
  expectedVersion: number
  decision: "accepted" | "rejected"
  reason: string
  idempotencyKey: string
}

export interface ServiceProofFileReference {
  url: string
  filename: string
}

const PHOTO_LIMIT_BYTES = 10 * 1024 * 1024
const VIDEO_LIMIT_BYTES = 50 * 1024 * 1024
const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"]
const LOCAL_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export class ServiceProofRepositoryError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "ServiceProofRepositoryError"
  }
}

interface LocalProofState {
  evidence: ServiceProofRecord[]
  fingerprints: Map<string, string>
  reviewReceipts: Map<string, string>
}

const processWithProofState = process as typeof process & {
  __catiServiceProofState?: LocalProofState
}
const localProofState = processWithProofState.__catiServiceProofState ?? {
  evidence: [],
  fingerprints: new Map<string, string>(),
  reviewReceipts: new Map<string, string>(),
}
processWithProofState.__catiServiceProofState = localProofState

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null
}

function asNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null
}

function normalizeRpcRow(value: unknown) {
  return asRecord(Array.isArray(value) ? value[0] : value)
}

function isLocalQaProfile(profile: UserProfile) {
  const explicitlyIsolatedQa =
    process.env.NODE_ENV !== "production" &&
    process.env.CATI_ENV === "qa" &&
    process.env.CATI_DEMO_DATA_ISOLATED === "true"
  return (
    explicitlyIsolatedQa &&
    isAccessProfileEnabled() &&
    profile.id === LOCAL_PROFILE_ID &&
    !profile.company_id
  )
}

function isLiveProofStorageConnected() {
  return (
    process.env.CATI_SERVICE_EVIDENCE_STORAGE_MODE === "supabase-storage" &&
    Boolean(createServiceRoleClient())
  )
}

function canSubmit(role: UserProfile["role"]) {
  return role === "staff" || role === "manager" || role === "admin"
}

function canReview(role: UserProfile["role"]) {
  return role === "manager" || role === "admin"
}

function limits() {
  return {
    photoBytes: PHOTO_LIMIT_BYTES,
    videoBytes: VIDEO_LIMIT_BYTES,
    photoMimeTypes: [...PHOTO_MIME_TYPES],
    videoMimeTypes: [...VIDEO_MIME_TYPES],
  }
}

function safeFileName(name: string) {
  const extension = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ""
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 90)
  return `${base || "service-proof"}${extension ? `.${extension}` : ""}`
}

function validateText(
  value: string,
  label: string,
  minimum: number,
  maximum: number
) {
  const text = value.trim()
  if (text.length < minimum || text.length > maximum) {
    throw new ServiceProofRepositoryError(
      `${label} must be between ${minimum} and ${maximum} characters.`,
      400
    )
  }
  return text
}

function validateIdempotencyKey(value: string) {
  return validateText(value, "Idempotency key", 8, 200)
}

function validateFile(
  mediaType: ServiceProofMediaType,
  file: File | null | undefined
) {
  if (mediaType === "note") {
    if (file) {
      throw new ServiceProofRepositoryError(
        "Note evidence cannot include a file.",
        400
      )
    }
    return null
  }
  if (!file || file.size < 1) {
    throw new ServiceProofRepositoryError(
      "A photo or video file is required.",
      400
    )
  }
  const mime = file.type.toLowerCase()
  if (mediaType === "photo") {
    if (!PHOTO_MIME_TYPES.includes(mime) || file.size > PHOTO_LIMIT_BYTES) {
      throw new ServiceProofRepositoryError(
        "Photos must be JPEG, PNG or WebP and no larger than 10 MB.",
        400
      )
    }
  } else if (
    !VIDEO_MIME_TYPES.includes(mime) ||
    file.size > VIDEO_LIMIT_BYTES
  ) {
    throw new ServiceProofRepositoryError(
      "Videos must be MP4, MOV or WebM and no larger than 50 MB.",
      400
    )
  }
  return file
}

function mapEventRow(value: unknown): ServiceProofEventRecord {
  const row = asRecord(value)
  return {
    id: asString(row.id) ?? `event-${randomUUID()}`,
    type: asString(row.event_type) ?? "updated",
    version: asNumber(row.event_version) ?? 1,
    actorRole: asString(row.actor_role),
    reason: asString(row.reason),
    createdAt: asString(row.created_at) ?? new Date().toISOString(),
  }
}

function mapProofRow(
  value: unknown,
  events: ServiceProofEventRecord[] = []
): ServiceProofRecord {
  const row = asRecord(value)
  const mediaTypeValue = asString(row.media_type)
  const mediaType: ServiceProofMediaType =
    mediaTypeValue === "photo" || mediaTypeValue === "video"
      ? mediaTypeValue
      : "note"
  const uploadValue = asString(row.upload_status)
  const uploadStatus: ServiceProofUploadStatus =
    uploadValue === "requested" ||
    uploadValue === "stored" ||
    uploadValue === "failed" ||
    uploadValue === "not_required"
      ? uploadValue
      : "provider_not_connected"
  const scanValue = asString(row.virus_scan_status)
  const scanStatus: ServiceProofScanStatus =
    scanValue === "pending" ||
    scanValue === "clean" ||
    scanValue === "rejected" ||
    scanValue === "not_applicable"
      ? scanValue
      : "not_connected"
  const reviewValue = asString(row.verification_status)
  const reviewStatus: ServiceProofReviewStatus =
    reviewValue === "accepted" || reviewValue === "rejected"
      ? reviewValue
      : "pending"

  return {
    id: asString(row.id) ?? `proof-${randomUUID()}`,
    ticketId: asString(row.ticket_id) ?? "",
    workforceTaskId: asString(row.workforce_task_id) ?? "",
    serviceOrderId: asString(row.service_order_id),
    mediaType,
    note: asString(row.caption) ?? "",
    originalFilename: asString(row.original_filename),
    mimeType: asString(row.mime_type),
    sizeBytes: asNumber(row.size_bytes),
    uploadStatus,
    scanStatus,
    reviewStatus,
    reviewVersion: asNumber(row.review_version) ?? 1,
    submittedByRole: asString(row.submitter_role),
    submittedAt: asString(row.created_at) ?? new Date().toISOString(),
    reviewedAt: asString(row.reviewed_at),
    reviewReason: asString(row.review_reason),
    overrideReason: asString(row.override_reason),
    canOpenFile:
      asBoolean(row.can_open_file) ??
      (mediaType !== "note" &&
        uploadStatus === "stored" &&
        scanStatus === "clean"),
    events: [...events].sort((a, b) => a.version - b.version),
  }
}

function residentProofProjection(
  value: ServiceProofRecord
): ServiceProofRecord {
  const canOpenFile = value.mediaType !== "note" && value.canOpenFile
  return {
    id: value.id,
    ticketId: value.ticketId,
    workforceTaskId: value.workforceTaskId,
    serviceOrderId: null,
    mediaType: value.mediaType,
    note: value.note,
    originalFilename: null,
    mimeType: null,
    sizeBytes: null,
    uploadStatus:
      value.mediaType === "note"
        ? "not_required"
        : canOpenFile
          ? "stored"
          : "provider_not_connected",
    scanStatus:
      value.mediaType === "note"
        ? "not_applicable"
        : canOpenFile
          ? "clean"
          : "not_connected",
    reviewStatus: "accepted",
    reviewVersion: 1,
    submittedByRole: null,
    submittedAt: value.submittedAt,
    reviewedAt: null,
    reviewReason: null,
    overrideReason: null,
    canOpenFile,
    events: [],
  }
}

function feed(
  profile: UserProfile,
  source: ServiceProofFeed["source"],
  evidence: ServiceProofRecord[],
  warning?: string
): ServiceProofFeed {
  return {
    contractVersion: SERVICE_PROOF_CONTRACT_VERSION,
    source,
    providerMode: isLiveProofStorageConnected()
      ? "private-storage"
      : "not-connected",
    generatedAt: new Date().toISOString(),
    permissions: {
      canSubmit: canSubmit(profile.role),
      canReview: canReview(profile.role),
      overrideReasonRequired:
        profile.role === "manager" || profile.role === "admin",
    },
    limits: limits(),
    evidence,
    ...(warning ? { warning } : {}),
  }
}

function repositoryError(error: unknown): ServiceProofRepositoryError {
  if (error instanceof ServiceProofRepositoryError) return error
  const record = asRecord(error)
  const message = asString(record.message) ?? "Service evidence request failed."
  const code = asString(record.code)
  if (
    code === "42501" ||
    /outside|assigned|authority|role cannot|not allowed/i.test(message)
  ) {
    return new ServiceProofRepositoryError(message, 403)
  }
  if (code === "P0002" || /not found|does not belong/i.test(message)) {
    return new ServiceProofRepositoryError(message, 404)
  }
  if (
    code === "40001" ||
    code === "23505" ||
    /version conflict|idempotency/i.test(message)
  ) {
    return new ServiceProofRepositoryError(message, 409)
  }
  return new ServiceProofRepositoryError(message, 400)
}

function localServiceProofTaskMatchesScope(
  role: UserProfile["role"],
  candidate: { id: string; ticketId: string; assignee: string },
  requested: { ticketId: string; workforceTaskId: string },
  permittedTicketIds: ReadonlySet<string>
) {
  return (
    candidate.id === requested.workforceTaskId &&
    candidate.ticketId === requested.ticketId &&
    permittedTicketIds.has(candidate.ticketId) &&
    (role !== "staff" ||
      candidate.assignee.trim() === LOCAL_QA_STAFF_ASSIGNMENT_LABEL)
  )
}

async function assertLocalTaskScope(
  profile: UserProfile,
  ticketId: string,
  workforceTaskId: string
) {
  const scopedUnits = accessibleUnitsForRole(profile.role)
  const queue = await getServiceTicketQueueData({
    limit: 100,
    useLocalAccessProfile: true,
    allowLocalSeedFallback: true,
    localTicketScope:
      profile.role === "staff"
        ? {
            assignee: LOCAL_QA_STAFF_ASSIGNMENT_LABEL,
            ticketIds: [ticketId],
          }
        : scopedUnits
          ? { ticketIds: [ticketId], unitNos: [...scopedUnits] }
          : { ticketIds: [ticketId] },
  })
  const permittedTicketIds = new Set(
    visibleServiceTicketsForRole(profile.role, queue.tickets).map(
      (ticket) => ticket.id
    )
  )
  const task = queue.workforceTasks.find((candidate) =>
    localServiceProofTaskMatchesScope(
      profile.role,
      candidate,
      { ticketId, workforceTaskId },
      permittedTicketIds
    )
  )
  if (!task) {
    throw new ServiceProofRepositoryError(
      "The task does not belong to the requested ticket.",
      404
    )
  }
  if (
    !canSubmit(profile.role) &&
    profile.role !== "owner" &&
    profile.role !== "tenant"
  ) {
    throw new ServiceProofRepositoryError(
      "This role cannot access service evidence.",
      403
    )
  }
  return task
}

function localVisibleEvidence(
  profile: UserProfile,
  ticketId: string,
  workforceTaskId: string
) {
  const visible = localProofState.evidence.filter((item) => {
    if (item.ticketId !== ticketId || item.workforceTaskId !== workforceTaskId)
      return false
    return profile.role === "owner" || profile.role === "tenant"
      ? item.reviewStatus === "accepted"
      : true
  })
  return profile.role === "owner" || profile.role === "tenant"
    ? visible.map(residentProofProjection)
    : visible
}

export async function listServiceProofs({
  profile,
  ticketId,
  workforceTaskId,
}: {
  profile: UserProfile
  ticketId: string
  workforceTaskId: string
}): Promise<ServiceProofFeed> {
  if (isLocalQaProfile(profile)) {
    await assertLocalTaskScope(profile, ticketId, workforceTaskId)
    return feed(
      profile,
      "local-qa",
      localVisibleEvidence(profile, ticketId, workforceTaskId),
      "Local QA stores notes and file metadata only. No binary object or malware scan is simulated."
    )
  }

  try {
    const supabase = await createClient()
    if (profile.role === "owner" || profile.role === "tenant") {
      const residentResponse = await supabase.rpc(
        "list_resident_service_evidence",
        {
          p_ticket_id: ticketId,
          p_workforce_task_id: workforceTaskId,
        }
      )
      if (residentResponse.error) throw residentResponse.error
      const residentRows = Array.isArray(residentResponse.data)
        ? residentResponse.data
        : []
      return feed(
        profile,
        "supabase",
        residentRows.map((row) => residentProofProjection(mapProofRow(row)))
      )
    }

    const evidenceResponse = await supabase
      .from("media_reports")
      .select(
        "id, ticket_id, workforce_task_id, service_order_id, media_type, caption, original_filename, mime_type, size_bytes, upload_status, virus_scan_status, verification_status, review_version, submitter_role, created_at, reviewed_at, review_reason, override_reason"
      )
      .eq("ticket_id", ticketId)
      .eq("workforce_task_id", workforceTaskId)
      .order("created_at", { ascending: false })

    if (evidenceResponse.error) throw evidenceResponse.error
    const rows = Array.isArray(evidenceResponse.data)
      ? evidenceResponse.data
      : []
    const evidenceIds = rows
      .map((row) => asString(asRecord(row).id))
      .filter(Boolean) as string[]
    let eventRows: unknown[] = []
    if (evidenceIds.length > 0) {
      const eventResponse = await supabase
        .from("service_evidence_events")
        .select(
          "id, evidence_id, event_type, event_version, actor_role, reason, created_at"
        )
        .in("evidence_id", evidenceIds)
        .order("event_version", { ascending: true })
      if (eventResponse.error) throw eventResponse.error
      eventRows = Array.isArray(eventResponse.data) ? eventResponse.data : []
    }
    const eventsByEvidence = new Map<string, ServiceProofEventRecord[]>()
    for (const value of eventRows) {
      const row = asRecord(value)
      const evidenceId = asString(row.evidence_id)
      if (!evidenceId) continue
      const current = eventsByEvidence.get(evidenceId) ?? []
      current.push(mapEventRow(row))
      eventsByEvidence.set(evidenceId, current)
    }
    return feed(
      profile,
      "supabase",
      rows.map((row) => {
        const id = asString(asRecord(row).id) ?? ""
        return mapProofRow(row, eventsByEvidence.get(id) ?? [])
      })
    )
  } catch (error) {
    throw repositoryError(error)
  }
}

export async function submitServiceProof(
  input: SubmitServiceProofInput
): Promise<{
  feed: ServiceProofFeed
  proof: ServiceProofRecord
  replayed: boolean
}> {
  if (!canSubmit(input.profile.role)) {
    throw new ServiceProofRepositoryError(
      "This role cannot add service evidence.",
      403
    )
  }
  const note = validateText(input.note, "Evidence note", 3, 2000)
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const overrideReason = input.overrideReason?.trim() || null
  if (
    (input.profile.role === "manager" || input.profile.role === "admin") &&
    (!overrideReason ||
      overrideReason.length < 10 ||
      overrideReason.length > 1000)
  ) {
    throw new ServiceProofRepositoryError(
      "A manager or administrator override reason between 10 and 1000 characters is required.",
      400
    )
  }
  const file = validateFile(input.mediaType, input.file)
  const bytes = file ? Buffer.from(await file.arrayBuffer()) : null
  const checksum = bytes
    ? createHash("sha256").update(bytes).digest("hex")
    : null
  const filename = file ? safeFileName(file.name) : null
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        ticketId: input.ticketId,
        workforceTaskId: input.workforceTaskId,
        mediaType: input.mediaType,
        note,
        filename,
        mimeType: file?.type ?? null,
        size: file?.size ?? null,
        checksum,
        overrideReason,
      })
    )
    .digest("hex")

  if (isLocalQaProfile(input.profile)) {
    await assertLocalTaskScope(
      input.profile,
      input.ticketId,
      input.workforceTaskId
    )
    const receiptKey = `${input.profile.role}:${idempotencyKey}`
    const existingFingerprint = localProofState.fingerprints.get(receiptKey)
    const existing = localProofState.evidence.find(
      (item) => item.events[0]?.id === `local-event-${receiptKey}`
    )
    if (existingFingerprint) {
      if (existingFingerprint !== fingerprint || !existing) {
        throw new ServiceProofRepositoryError(
          "The idempotency key was already used for different evidence.",
          409
        )
      }
      return {
        feed: feed(
          input.profile,
          "local-qa",
          localVisibleEvidence(
            input.profile,
            input.ticketId,
            input.workforceTaskId
          )
        ),
        proof: existing,
        replayed: true,
      }
    }

    const now = new Date().toISOString()
    const proof: ServiceProofRecord = {
      id: `local-proof-${randomUUID()}`,
      ticketId: input.ticketId,
      workforceTaskId: input.workforceTaskId,
      serviceOrderId: null,
      mediaType: input.mediaType,
      note,
      originalFilename: file?.name ?? null,
      mimeType: file?.type ?? null,
      sizeBytes: file?.size ?? null,
      uploadStatus: file ? "provider_not_connected" : "not_required",
      scanStatus: file ? "not_connected" : "not_applicable",
      reviewStatus: "pending",
      reviewVersion: 1,
      submittedByRole: input.profile.role,
      submittedAt: now,
      reviewedAt: null,
      reviewReason: null,
      overrideReason,
      canOpenFile: false,
      events: [
        {
          id: `local-event-${receiptKey}`,
          type: "submitted",
          version: 1,
          actorRole: input.profile.role,
          reason: overrideReason ?? note,
          createdAt: now,
        },
      ],
    }
    localProofState.fingerprints.set(receiptKey, fingerprint)
    localProofState.evidence.unshift(proof)
    return {
      feed: feed(
        input.profile,
        "local-qa",
        localVisibleEvidence(
          input.profile,
          input.ticketId,
          input.workforceTaskId
        ),
        "File metadata was recorded for QA; no binary object or malware scan was simulated."
      ),
      proof,
      replayed: false,
    }
  }

  const liveStorage = Boolean(file) && isLiveProofStorageConnected()
  try {
    const supabase = await createClient()
    const createResponse = await supabase.rpc(
      "create_service_evidence_command",
      {
        p_ticket_id: input.ticketId,
        p_workforce_task_id: input.workforceTaskId,
        p_media_type: input.mediaType,
        p_caption: note,
        p_original_filename: file?.name ?? null,
        p_safe_filename: filename,
        p_mime_type: file?.type ?? null,
        p_size_bytes: file?.size ?? null,
        p_checksum_sha256: checksum,
        p_live_storage: liveStorage,
        p_override_reason: overrideReason,
        p_idempotency_key: idempotencyKey,
      }
    )
    if (createResponse.error) throw createResponse.error
    let row = normalizeRpcRow(createResponse.data)
    const proofId = asString(row.id)
    const replayed = asBoolean(row.replayed) ?? false
    if (!proofId) {
      throw new ServiceProofRepositoryError(
        "Evidence creation returned no identifier.",
        503
      )
    }

    if (file && liveStorage && bytes) {
      const serviceClient = createServiceRoleClient()
      if (!serviceClient) {
        throw new ServiceProofRepositoryError(
          "Private evidence storage is unavailable.",
          503
        )
      }
      const targetResponse = await serviceClient
        .from("media_reports")
        .select(
          "storage_bucket, storage_path, safe_filename, upload_status, checksum_sha256, size_bytes"
        )
        .eq("id", proofId)
        .maybeSingle()
      if (targetResponse.error) throw targetResponse.error
      const target = asRecord(targetResponse.data)
      const storagePath = asString(target.storage_path)
      const uploadStatus = asString(target.upload_status)
      if (
        asString(target.storage_bucket) !== SERVICE_PROOF_BUCKET ||
        !storagePath ||
        asString(target.safe_filename) !== filename ||
        asString(target.checksum_sha256) !== checksum ||
        Number(target.size_bytes) !== file.size
      ) {
        throw new ServiceProofRepositoryError(
          "The private upload target is unavailable or no longer writable.",
          409
        )
      }
      if (uploadStatus === "requested") {
        const uploadResponse = await serviceClient.storage
          .from(SERVICE_PROOF_BUCKET)
          .upload(storagePath, bytes, { contentType: file.type, upsert: false })
        if (uploadResponse.error) {
          // A prior attempt may have stored the immutable object and crashed before
          // finalizing the database command. Verify it; never overwrite evidence.
          const existingResponse = await serviceClient.storage
            .from(SERVICE_PROOF_BUCKET)
            .download(storagePath)
          if (existingResponse.error || !existingResponse.data) {
            throw new ServiceProofRepositoryError(
              "The private upload could not be confirmed. Metadata remains queued for a safe retry.",
              503
            )
          }
          const existingBytes = Buffer.from(
            await existingResponse.data.arrayBuffer()
          )
          const existingChecksum = createHash("sha256")
            .update(existingBytes)
            .digest("hex")
          if (
            existingBytes.byteLength !== bytes.byteLength ||
            existingChecksum !== checksum
          ) {
            throw new ServiceProofRepositoryError(
              "An immutable evidence object already exists but does not match this request.",
              409
            )
          }
        }

        const completeResponse = await serviceClient.rpc(
          "complete_service_evidence_upload_command",
          {
            p_evidence_id: proofId,
            p_outcome: "stored",
            p_idempotency_key: `upload:${idempotencyKey}`,
          }
        )
        if (completeResponse.error) throw completeResponse.error
        row = normalizeRpcRow(completeResponse.data)
      } else if (uploadStatus !== "stored") {
        throw new ServiceProofRepositoryError(
          "The private upload is no longer in a retryable state.",
          409
        )
      }
    }

    const currentFeed = await listServiceProofs({
      profile: input.profile,
      ticketId: input.ticketId,
      workforceTaskId: input.workforceTaskId,
    })
    const proof =
      currentFeed.evidence.find((candidate) => candidate.id === proofId) ??
      mapProofRow(row)
    return {
      feed: currentFeed,
      proof,
      replayed,
    }
  } catch (error) {
    throw repositoryError(error)
  }
}

export async function reviewServiceProof(
  input: ReviewServiceProofInput
): Promise<ServiceProofRecord> {
  if (!canReview(input.profile.role)) {
    throw new ServiceProofRepositoryError(
      "Only a scoped manager or administrator can review evidence.",
      403
    )
  }
  const reason = validateText(input.reason, "Review reason", 10, 1000)
  const key = validateIdempotencyKey(input.idempotencyKey)
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) {
    throw new ServiceProofRepositoryError(
      "A valid review version is required.",
      400
    )
  }

  if (isLocalQaProfile(input.profile)) {
    const receiptKey = `${input.profile.role}:${key}`
    const existingReceipt = localProofState.reviewReceipts.get(receiptKey)
    const proof = localProofState.evidence.find(
      (item) => item.id === input.evidenceId
    )
    if (!proof)
      throw new ServiceProofRepositoryError("Evidence was not found.", 404)
    if (existingReceipt) {
      if (existingReceipt !== `${proof.id}:${input.decision}:${reason}`) {
        throw new ServiceProofRepositoryError(
          "The idempotency key was already used for another review.",
          409
        )
      }
      return proof
    }
    if (
      proof.reviewVersion !== input.expectedVersion ||
      proof.reviewStatus !== "pending"
    ) {
      throw new ServiceProofRepositoryError(
        "Evidence review version conflict.",
        409
      )
    }
    if (
      input.decision === "accepted" &&
      proof.mediaType !== "note" &&
      (proof.uploadStatus !== "stored" || proof.scanStatus !== "clean")
    ) {
      throw new ServiceProofRepositoryError(
        "Binary evidence cannot be accepted until private storage and malware scanning are connected.",
        400
      )
    }
    const now = new Date().toISOString()
    proof.reviewStatus = input.decision
    proof.reviewVersion += 1
    proof.reviewedAt = now
    proof.reviewReason = reason
    proof.events.push({
      id: `local-review-${randomUUID()}`,
      type: input.decision,
      version: proof.events.length + 1,
      actorRole: input.profile.role,
      reason,
      createdAt: now,
    })
    localProofState.reviewReceipts.set(
      receiptKey,
      `${proof.id}:${input.decision}:${reason}`
    )
    return proof
  }

  try {
    const supabase = await createClient()
    const response = await supabase.rpc("review_service_evidence_command", {
      p_evidence_id: input.evidenceId,
      p_expected_version: input.expectedVersion,
      p_decision: input.decision,
      p_reason: reason,
      p_idempotency_key: key,
    })
    if (response.error) throw response.error
    return mapProofRow(normalizeRpcRow(response.data))
  } catch (error) {
    throw repositoryError(error)
  }
}

export async function resolveServiceProofFile({
  profile,
  evidenceId,
}: {
  profile: UserProfile
  evidenceId: string
}): Promise<ServiceProofFileReference | null> {
  if (isLocalQaProfile(profile) || !isLiveProofStorageConnected()) return null
  try {
    const supabase = await createClient()
    const authorization = await supabase.rpc(
      "authorize_service_evidence_file_access",
      {
        p_evidence_id: evidenceId,
      }
    )
    if (authorization.error) throw authorization.error
    const authorizationRow = normalizeRpcRow(authorization.data)
    const authorizedFilename = asString(authorizationRow.safeFilename)
    if (authorizationRow.available !== true || !authorizedFilename) {
      return null
    }
    const serviceClient = createServiceRoleClient()
    if (!serviceClient) return null
    const targetResponse = await serviceClient
      .from("media_reports")
      .select(
        "storage_bucket, storage_path, safe_filename, upload_status, virus_scan_status, verification_status, media_type"
      )
      .eq("id", evidenceId)
      .maybeSingle()
    if (targetResponse.error) return null
    const target = asRecord(targetResponse.data)
    const storagePath = asString(target.storage_path)
    const safeFilename = asString(target.safe_filename)
    if (
      asString(target.storage_bucket) !== SERVICE_PROOF_BUCKET ||
      asString(target.upload_status) !== "stored" ||
      asString(target.virus_scan_status) !== "clean" ||
      asString(target.media_type) === "note" ||
      !storagePath ||
      !safeFilename ||
      safeFilename !== authorizedFilename ||
      ((profile.role === "owner" || profile.role === "tenant") &&
        asString(target.verification_status) !== "accepted")
    ) {
      return null
    }
    const signed = await serviceClient.storage
      .from(SERVICE_PROOF_BUCKET)
      .createSignedUrl(storagePath, 60, {
        download: safeFilename,
      })
    if (signed.error || !signed.data?.signedUrl) return null
    return { url: signed.data.signedUrl, filename: safeFilename }
  } catch {
    return null
  }
}
