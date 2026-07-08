import { createHash, randomUUID } from "node:crypto"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { isSupabaseConfigured, type UserProfile } from "@/lib/auth"
import { isClientRole, visibleDocumentsForRole } from "@/lib/role-scoped-views"
import { documentVault, type DocumentVaultRecord } from "@/lib/site-management-data"

export const DOCUMENT_UPLOAD_CONTRACT_VERSION = "phase-11-document-upload-storage.v1"
export const DOCUMENT_UPLOAD_BUCKET = process.env.SUPABASE_DOCUMENT_BUCKET || "cati-documents"
export const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024
const DEFAULT_DOCUMENT_COMPANY_ID = "11111111-1111-4111-8111-111111111111"
const DEFAULT_DOCUMENT_SITE_ID = "33333333-3333-4333-8333-333333333333"
const DEFAULT_DOCUMENT_COMPANY = {
  id: DEFAULT_DOCUMENT_COMPANY_ID,
  name: "Ataberk Estate",
  slug: "ataberk-estate",
  status: "active",
  primary_locale: "tr",
  timezone: "Europe/Istanbul",
  currency: "TRY",
}

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
    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY || !DOCUMENT_UPLOAD_BUCKET) {
      throw new Error("Live document storage is configured but credentials are incomplete.")
    }

    return "supabase-storage"
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

async function resolveDefaultCompanyId(
  serviceClient: ReturnType<typeof createServiceRoleClient>
) {
  if (!serviceClient) return null

  const defaultCompanyResponse = await serviceClient.rpc("default_company_id")
  if (typeof defaultCompanyResponse.data === "string") {
    return defaultCompanyResponse.data
  }

  const companyResponse = await serviceClient
    .from("companies")
    .select("id")
    .eq("slug", DEFAULT_DOCUMENT_COMPANY.slug)
    .maybeSingle()
  const companyRow = companyResponse.data as { id?: string | null } | null
  if (companyRow?.id) {
    return companyRow.id
  }

  const insertResponse = await serviceClient
    .from("companies")
    .insert(DEFAULT_DOCUMENT_COMPANY)
    .select("id")
    .single()
  const insertedRow = insertResponse.data as { id?: string | null } | null
  if (insertedRow?.id) {
    return insertedRow.id
  }

  const retryResponse = await serviceClient
    .from("companies")
    .select("id")
    .eq("slug", DEFAULT_DOCUMENT_COMPANY.slug)
    .maybeSingle()
  const retryRow = retryResponse.data as { id?: string | null } | null
  return retryRow?.id ?? null
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

  const upsertResponse = await serviceClient
    .from("sites")
    .upsert(
      {
        id: DEFAULT_DOCUMENT_SITE_ID,
        company_id: companyId,
        name: "New Level Premium Avsallar",
        code: "NLP-AVS",
        city: "Alanya",
        district: "Avsallar",
        address: "Avsallar, Alanya, Antalya",
        status: "active",
        total_units: 769,
      },
      { onConflict: "company_id,code" }
    )
    .select("id")
    .single()

  const upsertRow = upsertResponse.data as { id?: string | null } | null
  return upsertRow?.id ?? null
}

async function backfillProfileCompanyId(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  profileId: string,
  companyId: string
) {
  if (!serviceClient) return

  await serviceClient
    .from("profiles")
    .update({ company_id: companyId })
    .eq("id", profileId)
    .is("company_id", null)
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

  if (!companyId) {
    companyId = await resolveDefaultCompanyId(serviceClient)
    if (companyId && isUuid(profile.id)) {
      await backfillProfileCompanyId(serviceClient, profile.id, companyId)
    }
  }

  if (!companyId && storageMode === "supabase-storage") {
    throw new Error("Live document storage requires a company context. Add a default company or link the profile to a company.")
  }

  const siteId = await resolveDefaultSiteId(serviceClient, companyId)

  return { companyId, siteId, companySegment: companySegment(companyId) }
}

function normalizeStoragePath(path: string | null | undefined) {
  return path?.replaceAll("\\", "/").replace(/^\/+/, "").trim() ?? ""
}

function filenameFromPath(path: string, fallback: string) {
  const normalized = normalizeStoragePath(path)
  const filename = normalized.split("/").filter(Boolean).at(-1)
  return filename || fallback
}

function referenceFromSeedDocument(document: DocumentVaultRecord): DocumentFileReference | null {
  const storagePath = normalizeStoragePath(document.storagePath ?? document.sourcePath)

  if (!storagePath) {
    return null
  }

  return {
    id: document.id,
    title: document.name,
    safeFilename: filenameFromPath(storagePath, `${document.id}.pdf`),
    storageBucket: document.storageBucket ?? DOCUMENT_UPLOAD_BUCKET,
    storagePath,
    mimeType: null,
    status: document.status === "verified" ? "available" : "not_approved",
    source: "seed",
  }
}

async function findSeedDocumentReference(profile: UserProfile, documentId: string) {
  const document = visibleDocumentsForRole(profile.role, documentVault).find(
    (item) => item.id === documentId
  )

  return document ? referenceFromSeedDocument(document) : null
}

async function findUploadRequestReference({
  serviceClient,
  context,
  profile,
  documentId,
}: {
  serviceClient: ReturnType<typeof createServiceRoleClient>
  context: Awaited<ReturnType<typeof resolveStorageContext>>
  profile: UserProfile
  documentId: string
}): Promise<DocumentFileReference | null> {
  if (!serviceClient || !context.companyId) {
    return null
  }

  const selectColumns =
    "id,title,safe_filename,file_path,storage_bucket,mime_type,review_status,upload_status,requested_by"
  const scopedQuery = () => {
    let query = serviceClient
      .from("document_upload_requests")
      .select(selectColumns)
      .eq("company_id", context.companyId)
      .limit(1)

    if (isClientRole(profile.role) && isUuid(profile.id)) {
      query = query.eq("requested_by", profile.id)
    }

    return query
  }

  const response = isUuid(documentId)
    ? await scopedQuery().eq("id", documentId).maybeSingle()
    : await scopedQuery()
        .contains("metadata", { externalUploadId: documentId })
        .maybeSingle()

  const row = response.data as
    | {
        id?: string | null
        title?: string | null
        safe_filename?: string | null
        file_path?: string | null
        storage_bucket?: string | null
        mime_type?: string | null
        review_status?: string | null
        upload_status?: string | null
      }
    | null

  if (!row?.id || !row.file_path) {
    return null
  }

  const uploadStored =
    row.upload_status === "stored" || row.upload_status === "demo_stored"
  const reviewAllowsAccess = row.review_status !== "rejected"

  return {
    id: row.id,
    title: row.title ?? row.safe_filename ?? row.id,
    safeFilename: row.safe_filename ?? filenameFromPath(row.file_path, `${row.id}.pdf`),
    storageBucket: row.storage_bucket ?? DOCUMENT_UPLOAD_BUCKET,
    storagePath: normalizeStoragePath(row.file_path),
    mimeType: row.mime_type ?? null,
    status: uploadStored && reviewAllowsAccess ? "available" : "not_approved",
    source: "upload_request",
  }
}

export async function resolveDocumentFileReference({
  profile,
  documentId,
}: {
  profile: UserProfile
  documentId: string
}) {
  const storageMode = getDocumentStorageMode()
  const serviceClient = createServiceRoleClient()

  if (!serviceClient || storageMode !== "supabase-storage") {
    return null
  }

  const context = await resolveStorageContext(serviceClient, profile, storageMode)
  return (
    (await findUploadRequestReference({
      serviceClient,
      context,
      profile,
      documentId,
    })) ?? (await findSeedDocumentReference(profile, documentId))
  )
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
