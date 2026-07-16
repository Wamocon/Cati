import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import {
  createDocumentSignedUrl,
  documentFileExists,
  resolveDocumentFileReference,
  type DocumentFileDisposition,
} from "@/lib/document-storage"
import { hasAnyPermission } from "@/lib/rbac"
import { logClientAction } from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

function fileError(message: string, status: number) {
  return NextResponse.json({ available: false, error: message }, { status })
}

function dispositionFromRequest(request: NextRequest): DocumentFileDisposition {
  return request.nextUrl.searchParams.get("disposition") === "attachment"
    ? "attachment"
    : "inline"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const profile = await getUserProfile()
  if (!profile) {
    return fileError("Unauthorized.", 401)
  }

  if (!hasAnyPermission(profile.role, "documents", ["view"])) {
    return fileError("Your role is not allowed to view documents.", 403)
  }

  const { documentId } = await params
  const reference = await resolveDocumentFileReference({ profile, documentId })

  if (!reference) {
    return fileError("Document file is not attached yet.", 404)
  }

  if (request.nextUrl.searchParams.get("mode") === "availability") {
    const available = await documentFileExists(reference)
    return NextResponse.json({
      available,
      status: reference.status,
      source: reference.source,
      filename: reference.safeFilename,
    })
  }

  if (reference.status !== "available") {
    return fileError("Document is not approved for portal access.", 409)
  }

  const disposition = dispositionFromRequest(request)
  const signedUrl = await createDocumentSignedUrl({
    reference,
    disposition,
  })

  if (!signedUrl) {
    return fileError("Document file is not attached yet.", 404)
  }

  try {
    await logClientAction({
      actionType: "document.signed_url.issued",
      entityTable: "documents",
      entityExternalId: reference.id,
      title: reference.title,
      metadata: {
        disposition,
        source: reference.source,
        expiresInSeconds: 60,
      },
    })
  } catch {
    return fileError("Document access could not be audited.", 503)
  }

  return NextResponse.redirect(signedUrl)
}
