import { createHash, randomUUID } from "node:crypto"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { isSupabaseConfigured, type UserProfile } from "@/lib/auth"

export const DOCUMENT_UPLOAD_CONTRACT_VERSION = "phase-11-document-upload-storage.v1"
export const DOCUMENT_UPLOAD_BUCKET = process.env.SUPABASE_DOCUMENT_BUCKET || "cati-documents"
export const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024
export type DocumentStorageMode = "supabase-storage" | "demo-object-store"
export type DocumentReviewStatus = "pending_review" | "approved" | "rejected"
export type DocumentRetentionClass = "identity" | "legal" | "finance" | "service" | "guest" | "general"
export type DocumentFileDisposition = "inline" | "attachment"

export interface DocumentUploadFields {
  title?: string
  category?: string
  flatNumber?: string
  packetId?: string
  note?: string
  retentionClass?: string
}

export interface DocumentUploadResult {
  contractVersion: typeof DOCUMENT_UPLOAD_CONTRACT_VERSION
  source: "supabase" | "local-seed"
  providerMode: "live-storage" | "simulation"
  storageMode: DocumentStorageMode
  generatedAt: string
  upload: {
    id: string
    title: string
    originalFilename: string
    safeFilename: string
    category: string
    mimeType: string
    sizeBytes: number
    checksumSha256: string
    storageBucket: string
    storagePath: string
    reviewStatus: DocumentReviewStatus
    virusScanStatus: "pending" | "not_connected"
    databaseRecordId: string | null
    metadataPersisted: boolean
  }
  quality: ReturnType<typeof getDocumentUploadPolicy>
}

export interface DocumentFileReference {
  id: string
  title: string
  safeFilename: string
  storageBucket: string
  storagePath: string
  mimeType: string | null
  status: "available" | "missing" | "not_approved"
  source: "document" | "upload_request" | "seed"
}

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"])

export function getDocumentStorageMode(): DocumentStorageMode {
  const explicitMode = process.env.DOCUMENT_STORAGE_MODE?.toLowerCase()
  const isProduction = process.env.VERCEL_ENV === "production" || process.env.CATI_ENV === "production"

  if (explicitMode === "supabase") {
    const liveStorageReady = isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY && DOCUMENT_UPLOAD_BUCKET
    if (liveStorageReady) {
      return "supabase-storage"
    }

    if (isProduction) {
      throw new Error("Live document storage is configured but credentials are incomplete.")
    }

    return "demo-object-store"
  }

  if (isProduction) {
    throw new Error("Document storage must be explicitly configured in production.")
  }

  return "demo-object-store"
}

export function getDocumentUploadPolicy() {
  const storageMode = getDocumentStorageMode()
  return {
    contractVersion: DOCUMENT_UPLOAD_CONTRACT_VERSION,
    storageMode,
    storageBucket: DOCUMENT_UPLOAD_BUCKET,
    liveStorageConnected: storageMode === "supabase-storage",
    privateObjectStorage: true,
    databaseMetadataRequired: true,
    signedUrlTarget: true,
    virusScanTarget: true,
    humanReviewRequired: true,
    maxBytes: MAX_DOCUMENT_UPLOAD_BYTES,
    allowedMimeTypes: Array.from(allowedMimeTypes),
    allowedExtensions: Array.from(allowedExtensions),
  }
}

export function validateDocumentFile(file: File) {
  if (file.size <= 0) {
    return "File is empty."
  }

  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return `File is too large. Maximum size is ${Math.round(MAX_DOCUMENT_UPLOAD_BYTES / 1024 / 1024)} MB.`
  }

  const extension = extensionFromName(file.name)
  const hasAllowedType = allowedMimeTypes.has(file.type)
  const hasAllowedExtension = extension ? allowedExtensions.has(extension) : false
  const hasUnreliableBrowserType = !file.type || file.type === "application/octet-stream"

  if (!hasAllowedExtension || (!hasAllowedType && !hasUnreliableBrowserType)) {
    return "Unsupported file type. Upload PDF, image, Word or Excel documents only."
  }

  return null
}

export async function storeDocumentUpload({
  file,
  profile,
  fields,
}: {
  file: File
  profile: UserProfile
  fields: DocumentUploadFields
}): Promise<DocumentUploadResult> {
  const validationError = validateDocumentFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex")
  const id = `doc-upload-${randomUUID()}`
  const safeFilename = safeFileName(file.name)
  const mimeType = file.type || mimeTypeFromExtension(extensionFromName(file.name))
  const category = normalizeCategory(fields.category)
  const title = normalizeTitle(fields.title, safeFilename)
  const retentionClass = normalizeRetentionClass(fields.retentionClass)
  const storageMode = getDocumentStorageMode()
  const serviceClient = createServiceRoleClient()
  const context = await resolveStorageContext(
    serviceClient,
    profile,
    storageMode,
    fields.flatNumber
  )
  const storagePath = [
    context.companySegment,
    context.siteId ?? "no-site",
    context.unitId ?? "internal",
    id,
    safeFilename,
  ].join("/")

  let liveObjectUploaded = false
  let databaseRecord: { id: string | null; persisted: boolean }

  try {
    if (storageMode === "supabase-storage") {
      if (!serviceClient) throw new Error("Supabase service role client is not configured.")
      const { error } = await serviceClient.storage.from(DOCUMENT_UPLOAD_BUCKET).upload(storagePath, bytes, {
        contentType: mimeType,
        upsert: false,
      })
      if (error) throw error
      liveObjectUploaded = true
    }

    databaseRecord = await persistUploadMetadata({
      serviceClient,
      context,
      profile,
      id,
      title,
      category,
      safeFilename,
      originalFilename: file.name,
      mimeType,
      sizeBytes: file.size,
      checksumSha256,
      storageMode,
      storagePath,
      retentionClass,
      fields,
    })

    if (storageMode === "supabase-storage" && !databaseRecord.persisted) {
      throw new Error("Document metadata could not be persisted; upload was rejected.")
    }
  } catch (error) {
    if (storageMode === "supabase-storage" && liveObjectUploaded && serviceClient) {
      await serviceClient.storage.from(DOCUMENT_UPLOAD_BUCKET).remove([storagePath]).catch(() => undefined)
    }
    throw error
  }

  return {
    contractVersion: DOCUMENT_UPLOAD_CONTRACT_VERSION,
    source: databaseRecord.persisted ? "supabase" : "local-seed",
    providerMode: storageMode === "supabase-storage" ? "live-storage" : "simulation",
    storageMode,
    generatedAt: new Date().toISOString(),
    upload: {
      id,
      title,
      originalFilename: file.name,
      safeFilename,
      category,
      mimeType,
      sizeBytes: file.size,
      checksumSha256,
      storageBucket: DOCUMENT_UPLOAD_BUCKET,
      storagePath,
      reviewStatus: "pending_review",
      virusScanStatus: storageMode === "supabase-storage" ? "pending" : "not_connected",
      databaseRecordId: databaseRecord.id,
      metadataPersisted: databaseRecord.persisted,
    },
    quality: getDocumentUploadPolicy(),
  }
}

function extensionFromName(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? ""
}

function mimeTypeFromExtension(extension: string) {
  if (extension === "pdf") return "application/pdf"
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg"
  if (extension === "png") return "image/png"
  if (extension === "webp") return "image/webp"
  if (extension === "doc") return "application/msword"
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if (extension === "xls") return "application/vnd.ms-excel"
  if (extension === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  return "application/octet-stream"
}

function safeFileName(name: string) {
  const extension = extensionFromName(name)
  const baseName = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 80)

  return `${baseName || "document"}${extension ? `.${extension}` : ""}`
}

function normalizeTitle(title: string | undefined, fallback: string) {
  const value = title?.trim()
  return value ? value.slice(0, 140) : fallback.replace(/\.[^.]+$/, "")
}

function normalizeCategory(category: string | undefined) {
  const value = category?.trim()
  if (!value) return "General"
  return value.slice(0, 80)
}

function normalizeRetentionClass(value: string | undefined): DocumentRetentionClass {
  if (
    value === "identity" ||
    value === "legal" ||
    value === "finance" ||
    value === "service" ||
    value === "guest" ||
    value === "general"
  ) {
    return value
  }
  return "general"
}

function isUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function companySegment(companyId: string | null) {
  return companyId ? companyId.replace(/[^a-zA-Z0-9-]/g, "") : "demo-company"
}

async function resolveDefaultSiteId(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  companyId: string | null
) {
  if (!serviceClient || !companyId) return null

  const siteResponse = await serviceClient
    .from("sites")
    .select("id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  const siteRow = siteResponse.data as { id?: string | null } | null
  if (siteRow?.id) {
    return siteRow.id
  }

  return null
}

async function resolveStorageContext(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  profile: UserProfile,
  storageMode: DocumentStorageMode,
  unitNo?: string
) {
  if (!serviceClient) {
    if (storageMode === "supabase-storage") {
      throw new Error("Supabase service role client is required for live document storage.")
    }

    return {
      companyId: null,
      siteId: null,
      unitId: null,
      residentId: null,
      companySegment: "demo-company",
    }
  }

  let companyId: string | null = isUuid(profile.company_id) ? profile.company_id! : null

  if (!companyId && isUuid(profile.id)) {
    const profileResponse = await serviceClient
      .from("profiles")
      .select("company_id")
      .eq("id", profile.id)
      .maybeSingle()
    const profileRow = profileResponse.data as { company_id?: string | null } | null
    companyId = profileRow?.company_id ?? null
  }

  if (!companyId && storageMode === "supabase-storage") {
    throw new Error(
      "Live document storage requires an authorized company membership. Complete onboarding or accept a valid invitation first."
    )
  }

  if (storageMode === "supabase-storage") {
    try {
      const authenticatedClient = await createClient()
      const { data, error } = await authenticatedClient.rpc(
        "authorize_document_upload_context",
        { p_unit_no: unitNo?.trim() || null }
      )
      if (error || !data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Document upload scope is not authorized.")
      }

      const row = data as Record<string, unknown>
      const authorizedCompanyId =
        typeof row.companyId === "string" ? row.companyId : null
      const siteId = typeof row.siteId === "string" ? row.siteId : null
      const unitId = typeof row.unitId === "string" ? row.unitId : null
      const residentId =
        typeof row.residentId === "string" ? row.residentId : null

      if (
        !authorizedCompanyId ||
        authorizedCompanyId !== companyId ||
        !isUuid(authorizedCompanyId) ||
        !isUuid(siteId) ||
        (unitId !== null && !isUuid(unitId)) ||
        (residentId !== null && !isUuid(residentId))
      ) {
        throw new Error("Document upload scope is not authorized.")
      }

      return {
        companyId: authorizedCompanyId,
        siteId,
        unitId,
        residentId,
        companySegment: companySegment(authorizedCompanyId),
      }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Document upload scope is not authorized."
      )
    }
  }

  const siteId = await resolveDefaultSiteId(serviceClient, companyId)

  return {
    companyId,
    siteId,
    unitId: null,
    residentId: null,
    companySegment: companySegment(companyId),
  }
}

function normalizeStoragePath(path: string | null | undefined) {
  return path?.replaceAll("\\", "/").replace(/^\/+/, "").trim() ?? ""
}

export async function resolveDocumentFileReference({
  profile,
  documentId,
}: {
  profile: UserProfile
  documentId: string
}): Promise<DocumentFileReference | null> {
  const storageMode = getDocumentStorageMode()
  const serviceClient = createServiceRoleClient()

  if (
    !serviceClient ||
    storageMode !== "supabase-storage" ||
    !isUuid(profile.id) ||
    !isUuid(profile.company_id)
  ) {
    return null
  }

  // Never let a service-role query choose the object path. The authenticated
  // RPC applies company/site/unit/invitation scope and returns the canonical
  // approved path; the service role is used only afterwards to sign it.
  try {
    const authenticatedClient = await createClient()
    const { data, error } = await authenticatedClient.rpc(
      "authorize_document_file_access",
      { p_document_identifier: documentId }
    )
    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      return null
    }

    const row = data as Record<string, unknown>
    const id = typeof row.id === "string" ? row.id : null
    const title = typeof row.title === "string" ? row.title : null
    const safeFilename =
      typeof row.safeFilename === "string" ? row.safeFilename : null
    const storageBucket =
      typeof row.storageBucket === "string" ? row.storageBucket : null
    const storagePath =
      typeof row.storagePath === "string"
        ? normalizeStoragePath(row.storagePath)
        : null
    const mimeType = typeof row.mimeType === "string" ? row.mimeType : null
    const source =
      row.source === "document" || row.source === "upload_request"
        ? row.source
        : null

    if (
      !id ||
      !title ||
      !safeFilename ||
      storageBucket !== DOCUMENT_UPLOAD_BUCKET ||
      !storagePath ||
      row.status !== "available" ||
      !source
    ) {
      return null
    }

    return {
      id,
      title,
      safeFilename,
      storageBucket,
      storagePath,
      mimeType,
      status: "available",
      source,
    }
  } catch {
    return null
  }
}

export async function documentFileExists(reference: DocumentFileReference) {
  const serviceClient = createServiceRoleClient()
  if (!serviceClient || reference.status !== "available") {
    return false
  }

  const normalizedPath = normalizeStoragePath(reference.storagePath)
  const pathParts = normalizedPath.split("/").filter(Boolean)
  const filename = pathParts.pop()

  if (!filename) {
    return false
  }

  const directory = pathParts.join("/")
  const { data, error } = await serviceClient.storage
    .from(reference.storageBucket)
    .list(directory, { limit: 100, search: filename })

  if (error || !data) {
    return false
  }

  return data.some((item) => item.name === filename)
}

export async function createDocumentSignedUrl({
  reference,
  disposition,
}: {
  reference: DocumentFileReference
  disposition: DocumentFileDisposition
}) {
  const serviceClient = createServiceRoleClient()
  if (!serviceClient || reference.status !== "available") {
    return null
  }

  const exists = await documentFileExists(reference)
  if (!exists) {
    return null
  }

  const { data, error } = await serviceClient.storage
    .from(reference.storageBucket)
    .createSignedUrl(
      reference.storagePath,
      60,
      disposition === "attachment" ? { download: reference.safeFilename } : undefined
    )

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}

async function persistUploadMetadata({
  serviceClient,
  context,
  profile,
  id,
  title,
  category,
  safeFilename,
  originalFilename,
  mimeType,
  sizeBytes,
  checksumSha256,
  storageMode,
  storagePath,
  retentionClass,
  fields,
}: {
  serviceClient: ReturnType<typeof createServiceRoleClient>
  context: Awaited<ReturnType<typeof resolveStorageContext>>
  profile: UserProfile
  id: string
  title: string
  category: string
  safeFilename: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  checksumSha256: string
  storageMode: DocumentStorageMode
  storagePath: string
  retentionClass: DocumentRetentionClass
  fields: DocumentUploadFields
}) {
  if (!serviceClient || !context.companyId) {
    return { id: null, persisted: false }
  }

  try {
    const { data, error } = await serviceClient
      .from("document_upload_requests")
      .insert({
        company_id: context.companyId,
        site_id: context.siteId,
        unit_id: context.unitId,
        resident_id: context.residentId,
        title,
        category,
        original_filename: originalFilename,
        safe_filename: safeFilename,
        file_path: storagePath,
        storage_bucket: DOCUMENT_UPLOAD_BUCKET,
        storage_provider: storageMode,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        checksum_sha256: checksumSha256,
        upload_status: storageMode === "supabase-storage" ? "stored" : "demo_stored",
        review_status: "pending_review",
        virus_scan_status: storageMode === "supabase-storage" ? "pending" : "not_connected",
        retention_class: retentionClass,
        requested_by: isUuid(profile.id) ? profile.id : null,
        requester_role: profile.role,
        metadata: {
          externalUploadId: id,
          flatNumber: fields.flatNumber ?? null,
          packetId: fields.packetId ?? null,
          note: fields.note ?? null,
        },
      })
      .select("id")
      .single()

    if (error) throw error
    const row = data as { id?: string | null } | null
    return { id: row?.id ?? null, persisted: true }
  } catch {
    return { id: null, persisted: false }
  }
}
