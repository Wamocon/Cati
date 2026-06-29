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

  if (!hasAnyPermission(profile.role, "listings", ["create", "approve", "manage"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to request import commit." },
      { status: 403 }
    )
  }

  const payload = asRecord(await request.json().catch(() => ({})))
  const batchId = asString(payload.batchId)

  try {
    const action = await logClientAction({
      actionType: "import.commit.requested",
      entityTable: "import_batches",
      entityExternalId: batchId,
      title: batchId ? `Import commit requested for ${batchId}` : "Import commit requested",
      metadata: {
        role: profile.role,
        requestedBy: profile.id,
        mode: "approval_queue",
      },
    })
    const phase4 = await getPhase4SiteData({ limit: 769 })

    return NextResponse.json(
      {
        status: "commit_requested",
        message: "Import commit request has been queued for audited approval.",
        action,
        phase4,
      },
      { status: 202 }
    )
  } catch {
    return NextResponse.json(
      { error: "Import commit request could not be recorded." },
      { status: 500 }
    )
  }
}
