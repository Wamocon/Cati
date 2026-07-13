import { NextRequest, NextResponse } from "next/server"
import {
  type ClientActionInput,
  getClientActionRequest,
  getServiceTicketQueueData,
  logClientAction,
  materializeApprovedTicketRequest,
  updateClientActionRequestStatus,
  updateServiceTicket,
  type MaterializedTicketResult,
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
import { isTicketAssignee } from "@/lib/ticket-routing"

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

function withDecisionMetadata({
  metadata,
  status,
  decidedById,
  decidedByRole,
  materializedTicket,
  assignedTo,
}: {
  metadata: Record<string, unknown>
  status: NonNullable<ReturnType<typeof asDecisionStatus>>
  decidedById: string
  decidedByRole: string
  materializedTicket: MaterializedTicketResult | null
  assignedTo?: string | null
}) {
  const workflow = asRecord(metadata.workflow)
  return {
    ...metadata,
    workflow: {
      ...workflow,
      status,
      decisionStatus: status,
      decidedById,
      decidedByRole,
      decidedAt: new Date().toISOString(),
      ...(assignedTo ? { assignedTo } : {}),
      ...(materializedTicket
        ? {
            materializedTicketId: materializedTicket.id,
            materializedTicketNo: materializedTicket.ticketNo,
            materializedTicketSource: materializedTicket.source,
            serviceOrder: materializedTicket.serviceOrder,
            workforceTask: materializedTicket.workforceTask,
            notification: materializedTicket.notification,
            humanApprovalBoundary: materializedTicket.humanApprovalBoundary,
          }
        : {}),
    },
  }
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

  const storedRequest = await getClientActionRequest(actionId)
  if (!storedRequest) {
    return NextResponse.json(
      { error: "Action request was not found." },
      { status: 404 }
    )
  }

  const workflowAction = resolveWorkflowAction(
    storedRequest.actionType,
    storedRequest.entityTable
  )
  const isTicketCreationApproval =
    storedRequest.entityTable === "service_tickets" &&
    (storedRequest.actionType === "ticket.create.request" ||
      storedRequest.actionType === "ticket.create.ai_draft")
  const assignee = asString(payload.assignee)
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

  if (status === "approved" && isTicketCreationApproval) {
    if (!assignee || !isTicketAssignee(assignee)) {
      return NextResponse.json(
        { error: "Choose an available assignee before approving this ticket." },
        { status: 400 }
      )
    }
    if (!hasAnyPermission(profile.role, "tickets", ["assign", "manage"])) {
      return NextResponse.json(
        { error: "Your role is not allowed to assign service tickets." },
        { status: 403 }
      )
    }

    const workflowMetadata = asRecord(storedRequest.metadata.workflow)
    const requestedByRole = asString(workflowMetadata.requestedByRole)
    const existingTicketId =
      asString(workflowMetadata.materializedTicketId) ??
      asString(storedRequest.metadata.materializedTicketId)

    if (requestedByRole === "tenant" && existingTicketId) {
      const ticketQueue = await getServiceTicketQueueData({ limit: 100 })
      const existingTicket = ticketQueue.tickets.find((ticket) => ticket.id === existingTicketId)
      if (existingTicket?.status === "waiting_approval") {
        return NextResponse.json(
          { error: "The owner must approve this tenant ticket before it can be assigned." },
          { status: 409 }
        )
      }
    }
  }

  try {
    const materializedTicket =
      status === "approved"
        ? await materializeApprovedTicketRequest({
            request: storedRequest,
            decidedById: profile.id,
            decidedByRole: profile.role,
            assignee,
          })
        : null
    const assignmentResult =
      status === "approved" && isTicketCreationApproval && materializedTicket && assignee
        ? await updateServiceTicket({
            ticketId: materializedTicket.id,
            status: "assigned",
            assignee,
            actor: {
              id: profile.id,
              role: profile.role,
              companyId: profile.company_id,
              displayName: profile.full_name,
              email: profile.email,
            },
          })
        : null

    if (status === "approved" && isTicketCreationApproval && !assignmentResult) {
      throw new Error("Approved ticket could not be assigned.")
    }

    const result = await updateClientActionRequestStatus({
      id: actionId,
      status,
      metadata: withDecisionMetadata({
        metadata: storedRequest.metadata,
        status,
        decidedById: profile.id,
        decidedByRole: profile.role,
        materializedTicket,
        assignedTo: assignmentResult?.ticket.assignee ?? assignee,
      }),
    })
    return NextResponse.json(
      {
        ...result,
        workflow: {
          ...workflowAction,
          decisionStatus: status,
          decidedByRole: profile.role,
          materializedTicket,
          assignment: assignmentResult?.ticket ?? null,
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
