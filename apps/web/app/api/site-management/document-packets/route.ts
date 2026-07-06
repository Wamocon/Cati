import { NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import {
  documentPackets,
  documentVault,
  getDocumentPacketSummary,
  getDocumentSummary,
  purchaseChecklist,
} from "@/lib/site-management-data"
import {
  visibleDocumentPacketsForRole,
  visibleDocumentsForRole,
} from "@/lib/role-scoped-views"
import { getDocumentUploadPolicy } from "@/lib/document-storage"

export const dynamic = "force-dynamic"

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "documents", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view document data." },
      { status: 403 }
    )
  }

  const uploadPolicy = getDocumentUploadPolicy()

  return NextResponse.json({
    contractVersion: "phase-11-document-packets.v1",
    source: "local-demo-contract",
    providerMode: "simulation",
    generatedAt: new Date().toISOString(),
    role: profile.role,
    summary: {
      vault: getDocumentSummary(),
      packets: getDocumentPacketSummary(),
    },
    documents: visibleDocumentsForRole(profile.role, documentVault),
    packets: visibleDocumentPacketsForRole(profile.role, documentPackets),
    purchaseChecklist: profile.role === "owner" || profile.role === "tenant" || profile.role === "staff" ? [] : purchaseChecklist,
    uploadPolicy,
    quality: {
      privateStorageTarget: true,
      signedUrlTarget: true,
      accessAuditTarget: true,
      retentionClassRequired: true,
      uploadEndpointReady: true,
      liveStorageConnected: uploadPolicy.liveStorageConnected,
    },
  })
}
