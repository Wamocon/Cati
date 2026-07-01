import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { getDocumentUploadPolicy, storeDocumentUpload } from "@/lib/document-storage"
import { hasAnyPermission } from "@/lib/rbac"
import { logClientAction } from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

function formString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "documents", ["view", "create", "manage"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view document upload policy." },
      { status: 403 }
    )
  }

  return NextResponse.json({
    ...getDocumentUploadPolicy(),
    role: profile.role,
    providerMode: getDocumentUploadPolicy().liveStorageConnected ? "live-storage" : "simulation",
  })
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "documents", ["create", "manage"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to upload documents." },
      { status: 403 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: "Request body must be multipart/form-data." },
      { status: 400 }
    )
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A document file is required." }, { status: 400 })
  }

  try {
    const result = await storeDocumentUpload({
      file,
      profile,
      fields: {
        title: formString(formData, "title"),
        category: formString(formData, "category"),
        flatNumber: formString(formData, "flatNumber"),
        packetId: formString(formData, "packetId"),
        note: formString(formData, "note"),
        retentionClass: formString(formData, "retentionClass"),
      },
    })

    await logClientAction({
      actionType: "document.upload.completed",
      entityTable: "documents",
      entityExternalId: result.upload.id,
      title: result.upload.title,
      metadata: {
        storageMode: result.storageMode,
        storageBucket: result.upload.storageBucket,
        storagePath: result.upload.storagePath,
        mimeType: result.upload.mimeType,
        sizeBytes: result.upload.sizeBytes,
        checksumSha256: result.upload.checksumSha256,
        reviewStatus: result.upload.reviewStatus,
        metadataPersisted: result.upload.metadataPersisted,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Document upload failed." },
      { status: 400 }
    )
  }
}
