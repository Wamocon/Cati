import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import {
  type ClientActionInput,
  getClientActionRequest,
  getServiceTicketQueueData,
  getServiceTicketWorkflowRecord,
  logClientAction,
  materializeApprovedTicketRequest,
  type ServiceTicketMutationResult,
  TicketRepositoryError,
  type TicketMutationActor,
  updateClientActionRequestStatus,
  updateServiceTicket,
} from "@/lib/site-management-repository"
import type { ServiceTicket } from "@/lib/site-management-data"
import { getUserProfile, isAccessProfileEnabled } from "@/lib/auth"
import { hasAnyPermission, hasPermission, type Role } from "@/lib/rbac"
import {
  buildWorkflowMetadata,
  resolveWorkflowAction,
  type WorkflowOrigin,
} from "@/lib/action-catalog"
import { isTicketAssignee } from "@/lib/ticket-routing"
import {
  decideTicketTransition,
  deriveDispatchState,
  derivePaymentState,
  normalizeTicketIdempotencyKey,
  normalizeTicketVersion,
  primaryStateFromPersistedStatus,
  ticketSeverityForPriority,
  TicketWorkflowError,
  validateExpectedTicketVersion,
  type TicketCommand,
  type TicketWorkflowSnapshot,
} from "@/lib/ticket-workflow"

export const dynamic = "force-dynamic"

const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

function isLocalAccessProfile(profile: { id: string }) {
  return isAccessProfileEnabled() && profile.id === LOCAL_ACCESS_PROFILE_ID
}

const AI_TICKET_DRAFT_ACTION = "ticket.create.ai_draft"
const LEGACY_TICKET_REQUEST_ACTION = "ticket.create.request"
const ACTION_PENDING_STATUSES = new Set([
  "submitted",
  "queued",
  "logged",
  "locally-logged",
  "pending",
])

class ActionRouteError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number,
    readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "ActionRouteError"
  }
}

function jsonError(message: string, status: number, code: string, details?: unknown) {
  return NextResponse.json(
    { error: message, code, ...(details === undefined ? {} : { details }) },
    { status }
  )
}

function actionError(error: unknown, fallbackMessage: string) {
  if (
    error instanceof ActionRouteError ||
    error instanceof TicketWorkflowError ||
    error instanceof TicketRepositoryError
  ) {
    return jsonError(error.message, error.httpStatus, error.code, error.details)
  }
  console.error(fallbackMessage, error)
  return jsonError(fallbackMessage, 503, "ACTION_WORKFLOW_UNAVAILABLE")
}

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

type DecisionStatus = NonNullable<ReturnType<typeof asDecisionStatus>>

type AuthorizedTicketActor = TicketMutationActor & { role: Role }

function actorFromProfile(
  profile: NonNullable<Awaited<ReturnType<typeof getUserProfile>>>
): AuthorizedTicketActor {
  return {
    id: profile.id,
    role: profile.role,
    companyId: profile.company_id,
    displayName: profile.full_name,
    email: profile.email,
  }
}

function isAiTicketDraft(actionType: string, entityTable: string | null) {
  return actionType === AI_TICKET_DRAFT_ACTION && entityTable === "service_tickets"
}

function isLegacyTicketRequest(actionType: string, entityTable: string | null) {
  return actionType === LEGACY_TICKET_REQUEST_ACTION && entityTable === "service_tickets"
}

function isFinalTicketAssignee(value: string) {
  return isTicketAssignee(value) &&
    value !== "Operations triage queue"
}

function workflowSnapshot(ticket: ServiceTicket): TicketWorkflowSnapshot {
  const emergency = ticket.emergency ?? false
  const primaryState = primaryStateFromPersistedStatus(ticket.status, ticket.workflowState)
  return {
    id: ticket.id,
    primaryState,
    approvalState:
      ticket.approvalStatus ??
      (ticket.status === "waiting_approval" ? "pending_owner" : "not_required"),
    dispatchState:
      ticket.dispatchStatus ?? deriveDispatchState(primaryState, ticket.assignee),
    paymentState:
      ticket.paymentWorkflowStatus ?? derivePaymentState(ticket.debtBlocked, emergency),
    severity:
      ticket.severity ?? ticketSeverityForPriority(ticket.priority, emergency),
    emergency,
    priority: ticket.priority,
    assignee: ticket.assignee,
    version: ticket.version ?? "1",
    requesterRole: ticket.requesterRole,
  }
}

function commandIdempotencyKey(
  actionId: string,
  approvalIdempotencyKey: string,
  command: TicketCommand
) {
  const digest = createHash("sha256")
    .update(`${actionId}:${approvalIdempotencyKey}:${command}`)
    .digest("hex")
    .slice(0, 48)
  return `ticket-action:${digest}:${command}`
}

function readApprovalIdempotencyKey(
  request: NextRequest,
  payload: Record<string, unknown>
) {
  const headerValue = request.headers.get("Idempotency-Key")
  const bodyValue = payload.idempotencyKey
  const headerKey = normalizeTicketIdempotencyKey(headerValue)
  const bodyKey = normalizeTicketIdempotencyKey(bodyValue)

  if (headerKey && bodyKey && headerKey !== bodyKey) {
    throw new ActionRouteError(
      "ACTION_IDEMPOTENCY_CONFLICT",
      "The header and body idempotency keys do not match.",
      409
    )
  }
  const idempotencyKey = headerKey ?? bodyKey
  if (!idempotencyKey) {
    throw new ActionRouteError(
      "ACTION_IDEMPOTENCY_KEY_REQUIRED",
      "An Idempotency-Key is required to approve an AI ticket draft.",
      400
    )
  }
  return idempotencyKey
}

function readApprovalExpectedVersion(
  request: NextRequest,
  payload: Record<string, unknown>
) {
  const headerValue = request.headers.get("If-Match")
  const bodyValue = payload.expectedVersion
  const headerVersion = normalizeTicketVersion(headerValue)
  const bodyVersion = normalizeTicketVersion(bodyValue)

  if (headerValue !== null && !headerVersion) {
    throw new ActionRouteError(
      "ACTION_VERSION_INVALID",
      "If-Match must contain a valid workflow version token.",
      400
    )
  }
  if (bodyValue !== undefined && bodyValue !== null && !bodyVersion) {
    throw new ActionRouteError(
      "ACTION_VERSION_INVALID",
      "expectedVersion must contain a valid workflow version token.",
      400
    )
  }
  if (headerVersion && bodyVersion && headerVersion !== bodyVersion) {
    throw new ActionRouteError(
      "ACTION_VERSION_CONFLICT",
      "If-Match and expectedVersion do not match.",
      409,
      { headerVersion, bodyVersion }
    )
  }
  const expectedVersion = headerVersion ?? bodyVersion
  if (!expectedVersion) {
    throw new ActionRouteError(
      "ACTION_VERSION_REQUIRED",
      "An expected workflow version is required to approve an AI ticket draft.",
      400
    )
  }
  return expectedVersion
}

async function runTicketCommand({
  current,
  command,
  actionId,
  approvalIdempotencyKey,
  actor,
  assignee,
}: {
  current: ServiceTicketMutationResult
  command: TicketCommand
  actionId: string
  approvalIdempotencyKey: string
  actor: AuthorizedTicketActor
  assignee?: string
}) {
  const snapshot = workflowSnapshot(current.ticket)
  const transition = decideTicketTransition(actor.role, snapshot, command, {
    assignee: assignee ?? null,
  })
  const result = await updateServiceTicket({
    ticketId: current.ticket.id,
    command,
    expectedVersion: current.version,
    idempotencyKey: commandIdempotencyKey(actionId, approvalIdempotencyKey, command),
    workflowState: transition.nextState,
    approvalStatus: transition.approvalState,
    dispatchStatus: transition.dispatchState,
    paymentStatus: transition.paymentState,
    ...(command === "assign" ? { assignee } : {}),
    reason: `AI ticket draft ${actionId} approved by ${actor.role}`,
    actor,
  })

  if (!result) {
    throw new ActionRouteError(
      "ACTION_MATERIALIZED_TICKET_NOT_FOUND",
      "The materialized ticket could not be found while applying its workflow command.",
      404,
      { ticketId: current.ticket.id, command }
    )
  }
  return result
}

async function approveAndAssignAiTicket({
  materialized,
  actionId,
  approvalIdempotencyKey,
  actor,
  assignee,
}: {
  materialized: ServiceTicketMutationResult
  actionId: string
  approvalIdempotencyKey: string
  actor: AuthorizedTicketActor
  assignee: string
}) {
  let current = materialized
  let triage: ServiceTicketMutationResult | null = null
  let acceptance: ServiceTicketMutationResult | null = null
  let state = workflowSnapshot(current.ticket).primaryState

  if (state === "assigned") {
    if (current.ticket.assignee !== assignee) {
      throw new ActionRouteError(
        "AI_TICKET_ASSIGNMENT_CONFLICT",
        "This materialized ticket was already assigned to a different responder or team.",
        409,
        { currentAssignee: current.ticket.assignee, requestedAssignee: assignee }
      )
    }
    return {
      triage,
      acceptance,
      assignment: { ...current, replayed: true },
    }
  }

  if (!["submitted", "triage", "accepted"].includes(state)) {
    throw new ActionRouteError(
      "AI_TICKET_STATE_CONFLICT",
      "The materialized ticket advanced beyond the AI approval handoff and cannot be reassigned automatically.",
      409,
      { currentState: state }
    )
  }

  if (!workflowSnapshot(current.ticket).emergency) {
    if (state === "submitted") {
      triage = await runTicketCommand({
        current,
        command: "triage",
        actionId,
        approvalIdempotencyKey,
        actor,
      })
      current = triage
      state = "triage"
    }
    if (state === "triage") {
      acceptance = await runTicketCommand({
        current,
        command: "accept",
        actionId,
        approvalIdempotencyKey,
        actor,
      })
      current = acceptance
    }
  }

  const assignment = await runTicketCommand({
    current,
    command: "assign",
    actionId,
    approvalIdempotencyKey,
    actor,
    assignee,
  })
  return { triage, acceptance, assignment }
}

function mutationSummary(result: ServiceTicketMutationResult | null) {
  if (!result) return null
  return {
    id: result.ticket.id,
    ticketNo: result.ticket.id,
    source: result.source,
    version: result.version,
    replayed: Boolean(result.replayed),
  }
}

function withDecisionMetadata({
  metadata,
  status,
  decidedById,
  decidedByRole,
  approvalIdempotencyKey,
  expectedVersion,
  materializedTicket,
  triage,
  acceptance,
  assignment,
}: {
  metadata: Record<string, unknown>
  status: DecisionStatus
  decidedById: string
  decidedByRole: string
  approvalIdempotencyKey?: string | null
  expectedVersion?: string | null
  materializedTicket?: ServiceTicketMutationResult | null
  triage?: ServiceTicketMutationResult | null
  acceptance?: ServiceTicketMutationResult | null
  assignment?: ServiceTicketMutationResult | null
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
      ...(approvalIdempotencyKey ? { approvalIdempotencyKey } : {}),
      ...(expectedVersion ? { approvalExpectedVersion: expectedVersion } : {}),
      ...(materializedTicket
        ? {
            materializedTicketId: materializedTicket.ticket.id,
            materializedTicketNo: materializedTicket.ticket.id,
            materializedTicketSource: materializedTicket.source,
            materializedTicketVersion: materializedTicket.version,
          }
        : {}),
      ...(triage ? { triageVersion: triage.version } : {}),
      ...(acceptance ? { acceptanceVersion: acceptance.version } : {}),
      ...(assignment
        ? {
            assignedTo: assignment.ticket.assignee,
            assignmentVersion: assignment.version,
          }
        : {}),
    },
  }
}

function replayApprovedAiDecision(
  storedRequest: NonNullable<Awaited<ReturnType<typeof getClientActionRequest>>>,
  workflowAction: ReturnType<typeof resolveWorkflowAction>,
  workflowMetadata: Record<string, unknown>
) {
  return NextResponse.json(
    {
      id: storedRequest.id,
      status: "approved",
      source: "action-log",
      replayed: true,
      workflow: {
        ...workflowAction,
        decisionStatus: "approved",
        decidedByRole: asString(workflowMetadata.decidedByRole),
        materializedTicket: {
          id: asString(workflowMetadata.materializedTicketId),
          ticketNo: asString(workflowMetadata.materializedTicketNo),
          source: asString(workflowMetadata.materializedTicketSource),
          version: asString(workflowMetadata.materializedTicketVersion),
          replayed: true,
        },
        assignment: {
          assignee: asString(workflowMetadata.assignedTo),
          version: asString(workflowMetadata.assignmentVersion),
        },
      },
    },
    { status: 200 }
  )
}

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return jsonError("Unauthorized.", 401, "AUTH_REQUIRED")
  if (
    (profile.role !== "admin" && profile.role !== "manager") ||
    !hasPermission(profile.role, "tickets", "approve")
  ) {
    return jsonError(
      "Only ticket managers and administrators may view the approval queue.",
      403,
      "ACTION_QUEUE_FORBIDDEN"
    )
  }

  try {
    const queue = await getServiceTicketQueueData({
      limit: 5,
      allowLocalSeedFallback: isLocalAccessProfile(profile),
      useLocalAccessProfile: isLocalAccessProfile(profile),
    })
    return NextResponse.json({ actions: queue.recentActions }, { status: 200 })
  } catch (error) {
    return actionError(error, "The action approval queue is unavailable.")
  }
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError("Request body must be valid JSON.", 400, "ACTION_JSON_INVALID")
  }

  const payload = asRecord(body)
  const actionType = asString(payload.actionType)

  if (!actionType || actionType.length > 120) {
    return jsonError("A valid actionType is required.", 400, "ACTION_TYPE_INVALID")
  }
  if (actionType === LEGACY_TICKET_REQUEST_ACTION) {
    return jsonError(
      "Legacy ticket action requests are no longer materializable; create a human ticket through the ticket API or an AI draft for human review.",
      422,
      "LEGACY_TICKET_ACTION_UNSUPPORTED"
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
  if (!profile) return jsonError("Unauthorized.", 401, "AUTH_REQUIRED")

  const workflowAction = resolveWorkflowAction(actionType, input.entityTable ?? null)
  if (!hasAnyPermission(profile.role, workflowAction.resource, workflowAction.requiredActions)) {
    return jsonError(
      "Your role is not allowed to perform this action.",
      403,
      "ACTION_CREATE_FORBIDDEN"
    )
  }

  try {
    const result = await logClientAction({
      ...input,
      useLocalAccessProfile: isLocalAccessProfile(profile),
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
  } catch (error) {
    return actionError(error, "Action could not be logged.")
  }
}

export async function PATCH(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError("Request body must be valid JSON.", 400, "ACTION_JSON_INVALID")
  }

  const payload = asRecord(body)
  const actionId = asString(payload.id)
  const status = asDecisionStatus(payload.status)

  if (!actionId || !status) {
    return jsonError(
      "A valid action id and status are required.",
      400,
      "ACTION_DECISION_INVALID"
    )
  }

  const profile = await getUserProfile()
  if (!profile) return jsonError("Unauthorized.", 401, "AUTH_REQUIRED")

  try {
    const storedRequest = await getClientActionRequest(actionId, {
      useLocalAccessProfile: isLocalAccessProfile(profile),
    })
    if (!storedRequest) {
      return jsonError("Action request was not found.", 404, "ACTION_NOT_FOUND")
    }

    const workflowAction = resolveWorkflowAction(
      storedRequest.actionType,
      storedRequest.entityTable
    )
    const aiTicketDraft = isAiTicketDraft(
      storedRequest.actionType,
      storedRequest.entityTable
    )
    const legacyTicketRequest = isLegacyTicketRequest(
      storedRequest.actionType,
      storedRequest.entityTable
    )

    if (legacyTicketRequest && status !== "rejected") {
      return jsonError(
        "Legacy ticket action requests cannot be approved or materialized.",
        422,
        "LEGACY_TICKET_ACTION_UNSUPPORTED"
      )
    }
    if (aiTicketDraft && status !== "approved" && status !== "rejected") {
      return jsonError(
        "AI ticket drafts may only be approved or rejected by a human reviewer.",
        422,
        "AI_TICKET_DECISION_UNSUPPORTED"
      )
    }

    const operationsReviewer = profile.role === "admin" || profile.role === "manager"
    if (aiTicketDraft || legacyTicketRequest) {
      if (!operationsReviewer || !hasPermission(profile.role, "tickets", "approve")) {
        return jsonError(
          "Only a ticket manager or administrator with approval permission may review this ticket action.",
          403,
          "AI_TICKET_APPROVAL_FORBIDDEN"
        )
      }
      if (
        status === "approved" &&
        !hasPermission(profile.role, "tickets", "assign")
      ) {
        return jsonError(
          "AI ticket approval also requires ticket assignment permission.",
          403,
          "AI_TICKET_ASSIGNMENT_FORBIDDEN"
        )
      }
    } else {
      const canApproveByPermission = hasAnyPermission(
        profile.role,
        workflowAction.resource,
        ["approve", "manage"]
      )
      const canApproveByRole = workflowAction.approvalRoles.includes(profile.role)
      if (!canApproveByPermission && !canApproveByRole) {
        return jsonError(
          "Your role is not allowed to approve this action.",
          403,
          "ACTION_DECISION_FORBIDDEN"
        )
      }
    }

    const workflowMetadata = asRecord(storedRequest.metadata.workflow)
    const existingDecision =
      asDecisionStatus(workflowMetadata.decisionStatus) ??
      (["approved", "rejected", "completed", "failed"].includes(storedRequest.status)
        ? storedRequest.status
        : null)

    if (aiTicketDraft && existingDecision) {
      if (existingDecision !== status) {
        return jsonError(
          `This AI ticket draft was already ${existingDecision}.`,
          409,
          "ACTION_ALREADY_DECIDED",
          { existingDecision, requestedDecision: status }
        )
      }
      if (status === "approved") {
        const approvalIdempotencyKey = readApprovalIdempotencyKey(request, payload)
        readApprovalExpectedVersion(request, payload)
        const storedApprovalKey = asString(workflowMetadata.approvalIdempotencyKey)
        if (!storedApprovalKey) {
          return jsonError(
            "This approval predates the idempotent approval contract and cannot be replayed automatically.",
            409,
            "ACTION_REPLAY_KEY_UNAVAILABLE"
          )
        }
        if (storedApprovalKey !== approvalIdempotencyKey) {
          return jsonError(
            "This AI ticket draft was already approved with a different idempotency key.",
            409,
            "ACTION_IDEMPOTENCY_CONFLICT"
          )
        }
        return replayApprovedAiDecision(storedRequest, workflowAction, workflowMetadata)
      }
      return NextResponse.json(
        {
          id: storedRequest.id,
          status: "rejected",
          source: "action-log",
          replayed: true,
          workflow: { ...workflowAction, decisionStatus: "rejected" },
        },
        { status: 200 }
      )
    }

    if (
      aiTicketDraft &&
      !ACTION_PENDING_STATUSES.has(storedRequest.status) &&
      !existingDecision
    ) {
      return jsonError(
        "This AI ticket draft is not in a reviewable state.",
        409,
        "ACTION_STATE_CONFLICT",
        { currentStatus: storedRequest.status }
      )
    }

    if (status === "approved" && aiTicketDraft) {
      const assignee = asString(payload.assignee)
      if (!assignee || !isFinalTicketAssignee(assignee)) {
        return jsonError(
          "Choose a valid responder or delivery team before approving this AI ticket draft.",
          422,
          "AI_TICKET_ASSIGNEE_REQUIRED"
        )
      }
      const approvalIdempotencyKey = readApprovalIdempotencyKey(request, payload)
      const expectedVersion = readApprovalExpectedVersion(request, payload)
      const actor = actorFromProfile(profile)
      const materializedTicket = await materializeApprovedTicketRequest({
        request: storedRequest,
        actor,
      })
      if (!materializedTicket) {
        throw new ActionRouteError(
          "AI_TICKET_DRAFT_INVALID",
          "The AI ticket draft does not contain a materializable ticket payload.",
          422
        )
      }

      if (!materializedTicket.replayed) {
        validateExpectedTicketVersion(expectedVersion, materializedTicket.version)
      }
      const persistedTicket = await getServiceTicketWorkflowRecord(
        materializedTicket.ticket.id,
        { useLocalAccessProfile: isLocalAccessProfile(profile) }
      )
      const resumableTicket = persistedTicket
        ? {
            ...materializedTicket,
            ticket: persistedTicket.ticket,
            version: persistedTicket.version,
          }
        : materializedTicket
      const { triage, acceptance, assignment } = await approveAndAssignAiTicket({
        materialized: resumableTicket,
        actionId,
        approvalIdempotencyKey,
        actor,
        assignee,
      })
      const result = await updateClientActionRequestStatus({
        id: actionId,
        status,
        metadata: withDecisionMetadata({
          metadata: storedRequest.metadata,
          status,
          decidedById: profile.id,
          decidedByRole: profile.role,
          approvalIdempotencyKey,
          expectedVersion,
          materializedTicket,
          triage,
          acceptance,
          assignment,
        }),
        useLocalAccessProfile: isLocalAccessProfile(profile),
      })
      return NextResponse.json(
        {
          ...result,
          replayed: Boolean(materializedTicket.replayed || assignment.replayed),
          workflow: {
            ...workflowAction,
            decisionStatus: status,
            decidedByRole: profile.role,
            materializedTicket: mutationSummary(materializedTicket),
            triage: mutationSummary(triage),
            acceptance: mutationSummary(acceptance),
            assignment: assignment.ticket,
            version: assignment.version,
          },
        },
        { status: 200, headers: { ETag: `"${assignment.version}"` } }
      )
    }

    const result = await updateClientActionRequestStatus({
      id: actionId,
      status,
      metadata: withDecisionMetadata({
        metadata: storedRequest.metadata,
        status,
        decidedById: profile.id,
        decidedByRole: profile.role,
      }),
      useLocalAccessProfile: isLocalAccessProfile(profile),
    })
    return NextResponse.json(
      {
        ...result,
        workflow: {
          ...workflowAction,
          decisionStatus: status,
          decidedByRole: profile.role,
          materializedTicket: null,
          assignment: null,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    return actionError(error, "Action request status could not be updated.")
  }
}
