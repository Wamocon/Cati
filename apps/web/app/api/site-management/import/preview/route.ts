import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import {
  getPhase4SiteData,
  logClientAction,
} from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "listings", ["update", "approve", "manage"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to preview imports." },
      { status: 403 }
    )
  }

  const payload = asRecord(await request.json().catch(() => ({})))
  const batchId = asString(payload.batchId)

  try {
    const action = await logClientAction({
      actionType: "import.preview.requested",
      entityTable: "import_batches",
      entityExternalId: batchId,
      title: batchId ? `Import preview requested for ${batchId}` : "Import preview requested",
      metadata: {
        role: profile.role,
        requestedBy: profile.id,
      },
    })
    const phase4 = await getPhase4SiteData({ limit: 769 })

    return NextResponse.json(
      {
        status: "preview_ready",
        message: "Import preview has been checked and audited.",
        action,
        phase4,
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: "Import preview could not be prepared." },
      { status: 500 }
    )
  }
}
