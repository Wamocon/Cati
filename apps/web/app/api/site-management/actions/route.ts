import { NextRequest, NextResponse } from "next/server"
import {
  type ClientActionInput,
  logClientAction,
  updateClientActionRequestStatus,
} from "@/lib/site-management-repository"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import {
  buildWorkflowMetadata,
  resolveWorkflowAction,
  type WorkflowOrigin,
} from "@/lib/action-catalog"
import { visibleOfflineSyncQueueForRole } from "@/lib/role-scoped-views"
import { offlineSyncQueue } from "@/lib/site-management-data"

export const dynamic = "force-dynamic"

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asOrigin(value: unknown): WorkflowOrigin {
  return value === "api" || value === "ai" || value === "import" ? value : "ui"
}

function asDecisionStatus(value: unknown) {
  return value === "approved" ||
    value === "rejected" ||
    value === "completed" ||
    value === "failed"
    ? value
    : null
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    )
  }

  const payload = asRecord(body)
  const actionType = asString(payload.actionType)

  if (!actionType || actionType.length > 120) {
    return NextResponse.json(
      { error: "A valid actionType is required." },
      { status: 400 }
    )
  }

  const clientMetadata = asRecord(payload.metadata)
  const input: ClientActionInput = {
    actionType,
    entityTable: asString(payload.entityTable),
    entityId: asString(payload.entityId),
    entityExternalId: asString(payload.entityExternalId),
    title: asString(payload.title),
    metadata: clientMetadata,
  }

  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const workflowAction = resolveWorkflowAction(actionType, input.entityTable ?? null)
  if (!hasAnyPermission(profile.role, workflowAction.resource, workflowAction.requiredActions)) {
    return NextResponse.json(
      { error: "Your role is not allowed to perform this action." },
      { status: 403 }
    )
  }

  if (input.entityTable === "offline_sync_jobs") {
    const allowedQueue = visibleOfflineSyncQueueForRole(profile.role, offlineSyncQueue)
    const requestedId = input.entityExternalId ?? input.entityId
    const canAccessQueueItem = Boolean(
      requestedId && allowedQueue.some((item) => item.id === requestedId)
    )

    if (!canAccessQueueItem) {
      return NextResponse.json(
        { error: "Your role is not allowed to access this offline sync item." },
        { status: 403 }
      )
    }
  }

  try {
    const result = await logClientAction({
      ...input,
      metadata: {
        ...clientMetadata,
        ...buildWorkflowMetadata({
          action: workflowAction,
          origin: asOrigin(clientMetadata.origin),
          requestedByRole: profile.role,
          requestedById: profile.id,
        }),
      },
    })
    return NextResponse.json({ ...result, workflow: workflowAction }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Action could not be logged." },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    )
  }

  const payload = asRecord(body)
  const actionId = asString(payload.id)
  const status = asDecisionStatus(payload.status)
  const actionType = asString(payload.actionType) ?? "ticket.update.request"
  const entityTable = asString(payload.entityTable) ?? "service_tickets"

  if (!actionId || !status) {
    return NextResponse.json(
      { error: "A valid action id and status are required." },
      { status: 400 }
    )
  }

  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const workflowAction = resolveWorkflowAction(actionType, entityTable)
  const canApproveByPermission = hasAnyPermission(profile.role, workflowAction.resource, [
    "approve",
    "manage",
  ])
  const canApproveByRole = workflowAction.approvalRoles.includes(profile.role)

  if (!canApproveByPermission && !canApproveByRole) {
    return NextResponse.json(
      { error: "Your role is not allowed to approve this action." },
      { status: 403 }
    )
  }

  try {
    const result = await updateClientActionRequestStatus({ id: actionId, status })
    return NextResponse.json(
      {
        ...result,
        workflow: {
          ...workflowAction,
          decisionStatus: status,
          decidedByRole: profile.role,
        },
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { error: "Action request status could not be updated." },
      { status: 500 }
    )
  }
}
