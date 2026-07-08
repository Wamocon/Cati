import { createHash, randomUUID } from "node:crypto"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { isSupabaseConfigured, type UserProfile } from "@/lib/auth"

export const DOCUMENT_UPLOAD_CONTRACT_VERSION = "phase-11-document-upload-storage.v1"
export const DOCUMENT_UPLOAD_BUCKET = process.env.SUPABASE_DOCUMENT_BUCKET || "cati-documents"
export const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024

export type DocumentStorageMode = "supabase-storage" | "demo-object-store"
export type DocumentReviewStatus = "pending_review" | "approved" | "rejected"
export type DocumentRetentionClass = "identity" | "legal" | "finance" | "service" | "guest" | "general"

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
  const context = await resolveStorageContext(serviceClient, profile, storageMode)
  const date = new Date()
  const storagePath = [
    context.companySegment,
    String(date.getUTCFullYear()),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    profile.role,
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

async function resolveStorageContext(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  profile: UserProfile,
  storageMode: DocumentStorageMode
) {
  if (!serviceClient) {
    if (storageMode === "supabase-storage") {
      throw new Error("Supabase service role client is required for live document storage.")
    }

    return { companyId: null, siteId: null, companySegment: "demo-company" }
  }

  let companyId: string | null = null

  if (isUuid(profile.id)) {
    const profileResponse = await serviceClient
      .from("profiles")
      .select("company_id")
      .eq("id", profile.id)
      .maybeSingle()
    const profileRow = profileResponse.data as { company_id?: string | null } | null
    companyId = profileRow?.company_id ?? null
  }

  if (!companyId && storageMode === "demo-object-store") {
    const defaultCompanyResponse = await serviceClient.rpc("default_company_id")
    companyId = typeof defaultCompanyResponse.data === "string" ? defaultCompanyResponse.data : null
  }

  if (!companyId && storageMode === "supabase-storage") {
    throw new Error("Live document storage requires a profile with company context.")
  }

  let siteId: string | null = null
  if (companyId) {
    const siteResponse = await serviceClient
      .from("sites")
      .select("id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    const siteRow = siteResponse.data as { id?: string | null } | null
    siteId = siteRow?.id ?? null
  }

  return { companyId, siteId, companySegment: companySegment(companyId) }
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
