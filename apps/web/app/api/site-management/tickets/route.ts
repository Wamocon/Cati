import { NextRequest, NextResponse } from "next/server"
import { getUserProfile, isAccessProfileEnabled } from "@/lib/auth"
import { hasAnyPermission, type Role } from "@/lib/rbac"
import {
  createServiceTicket,
  getServiceTicketQueueData,
  getServiceTicketWorkflowRecord,
  getTicketAvailableUnits,
  logClientAction,
  replayServiceTicketMutation,
  serviceTicketApiViewForRole,
  TicketRepositoryError,
  updateServiceTicket,
  type LocalTicketQueueScope,
  type ServiceTicketQueueData,
  type ServiceTicketWorkflowRecord,
  type TicketMutationActor,
} from "@/lib/site-management-repository"
import type { ServiceTicket, WorkforceTaskRecord } from "@/lib/site-management-data"
import {
  buildWorkflowMetadata,
  resolveWorkflowAction,
} from "@/lib/action-catalog"
import {
  accessibleUnitsForRole,
  canAccessUnitForRole,
  isClientRole,
  LOCAL_QA_STAFF_ASSIGNMENT_LABEL,
  normalizeUnitNo,
  visibleServiceTicketsForRole,
} from "@/lib/role-scoped-views"
import { isTicketAssignee, resolveTicketRoute } from "@/lib/ticket-routing"
import {
  decideTicketTransition,
  deriveDispatchState,
  derivePaymentState,
  isTicketCommand,
  normalizeTicketIdempotencyKey,
  normalizeTicketVersion,
  primaryStateFromPersistedStatus,
  ticketSeverityForPriority,
  ticketWorkflowView,
  TicketWorkflowError,
  validateExpectedTicketVersion,
  validateTicketPriorityChange,
  type TicketTransitionContext,
  type TicketWorkflowSnapshot,
} from "@/lib/ticket-workflow"

export const dynamic = "force-dynamic"

const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

function isLocalAccessProfile(profile: { id: string }) {
  return isAccessProfileEnabled() && profile.id === LOCAL_ACCESS_PROFILE_ID
}

function jsonError(message: string, status: number, code: string, details?: unknown) {
  return NextResponse.json(
    { error: message, code, ...(details === undefined ? {} : { details }) },
    { status }
  )
}

function ticketError(error: unknown, fallbackMessage: string) {
  if (error instanceof TicketWorkflowError || error instanceof TicketRepositoryError) {
    return jsonError(error.message, error.httpStatus, error.code, error.details)
  }
  console.error(fallbackMessage, error)
  return jsonError(fallbackMessage, 500, "TICKET_INTERNAL_ERROR")
}

function readLimit(value: string | null) {
  const limit = Number(value ?? 24)
  if (!Number.isFinite(limit)) return 24
  return Math.min(Math.max(Math.trunc(limit), 1), 100)
}

function readSearch(value: string | null) {
  return typeof value === "string" ? value.trim().slice(0, 120) : ""
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function readPriority(value: unknown): ServiceTicket["priority"] | null {
  if (value === undefined || value === null || value === "normal" || value === "medium") {
    return "medium"
  }
  if (value === "low" || value === "high" || value === "urgent") return value
  return null
}

function readOptionalText(record: Record<string, unknown>, key: string) {
  if (!(key in record)) return undefined
  const value = record[key]
  if (value === null) return null
  return typeof value === "string" ? value.trim() : undefined
}

function actorFromProfile(profile: Awaited<ReturnType<typeof getUserProfile>>): TicketMutationActor {
  if (!profile) throw new Error("Authenticated profile is required.")
  return {
    id: profile.id,
    role: profile.role,
    companyId: profile.company_id,
    displayName: profile.full_name,
    email: profile.email,
  }
}

function recomputeScopedQueue(
  data: ServiceTicketQueueData,
  tickets: ServiceTicket[]
): ServiceTicketQueueData {
  if (tickets.length === data.tickets.length) return data
  const ticketIds = new Set(tickets.map((ticket) => ticket.id))
  const orders = data.orders.filter((order) => ticketIds.has(order.ticketId))
  const workforceTasks = data.workforceTasks.filter((task) => ticketIds.has(task.ticketId))
  const openTickets = tickets.filter(
    (ticket) => ticket.status !== "closed" && ticket.status !== "resolved"
  )

  return {
    ...data,
    tickets,
    orders,
    workforceTasks,
    summary: {
      ...data.summary,
      totalTickets: tickets.length,
      openTickets: openTickets.length,
      overdueTickets: tickets.filter((ticket) => ticket.slaHoursRemaining < 0).length,
      urgentTickets: tickets.filter((ticket) => ticket.priority === "urgent").length,
      financeBlockedTickets: tickets.filter(
        (ticket) => ticket.debtBlocked && !ticket.emergency
      ).length,
      approvalRequiredTickets: tickets.filter(
        (ticket) => ticket.approvalStatus === "pending_owner"
      ).length,
      mediaEvidenceCount: tickets.reduce((sum, ticket) => sum + ticket.mediaCount, 0),
      estimatedCostCents: tickets.reduce(
        (sum, ticket) => sum + ticket.estimatedCostTry * 100,
        0
      ),
      averageSlaHoursRemaining: tickets.length
        ? Math.round(
            tickets.reduce((sum, ticket) => sum + ticket.slaHoursRemaining, 0) /
              tickets.length
          )
        : 0,
      serviceOrders: orders.length,
      readyForDispatchOrders: orders.filter(
        (order) =>
          order.status === "assigned" ||
          order.status === "task_created" ||
          order.paymentDecision === "paid_or_debit_approved" ||
          order.paymentDecision === "no_charge"
      ).length,
      blockedOrders: orders.filter(
        (order) => order.status === "blocked" || order.debtCheckStatus === "blocked"
      ).length,
      openWorkforceTasks: workforceTasks.filter(
        (task) => task.status !== "closed" && task.status !== "resolved"
      ).length,
      slaBreachTasks: workforceTasks.filter((task) => task.slaHoursRemaining < 0).length,
      managerApprovalTasks: workforceTasks.filter(
        (task) => task.managerApprovalRequired
      ).length,
      fieldTeams: new Set(workforceTasks.map((task) => task.team)).size,
      averageCompletionReadiness: workforceTasks.length
        ? Math.round(
            workforceTasks.reduce((sum, task) => sum + task.completionReadiness, 0) /
              workforceTasks.length
          )
        : 0,
    },
  }
}

function scopeTicketQueueForRole(
  data: ServiceTicketQueueData,
  role: Role,
  useDemoScope: boolean
) {
  let tickets = useDemoScope
    ? visibleServiceTicketsForRole(role, data.tickets)
    : data.tickets
  if (role === "accountant") {
    tickets = tickets.filter(
      (ticket) =>
        ticket.debtBlocked ||
        ticket.paymentWorkflowStatus === "pending" ||
        ticket.paymentWorkflowStatus === "post_emergency_review" ||
        /finance|payment|billing|tahsilat|ödeme/i.test(ticket.category)
    )
  }
  return recomputeScopedQueue(data, tickets)
}

function workflowSnapshot(ticket: ServiceTicket): TicketWorkflowSnapshot {
  const emergency = ticket.emergency ?? false
  const primaryState = primaryStateFromPersistedStatus(ticket.status, ticket.workflowState)
  return {
    id: ticket.id,
    primaryState,
    approvalState: ticket.approvalStatus ??
      (ticket.status === "waiting_approval" ? "pending_owner" : "not_required"),
    dispatchState: ticket.dispatchStatus ?? deriveDispatchState(primaryState, ticket.assignee),
    paymentState: ticket.paymentWorkflowStatus ??
      derivePaymentState(ticket.debtBlocked, emergency),
    severity: ticket.severity ?? ticketSeverityForPriority(ticket.priority, emergency),
    emergency,
    priority: ticket.priority,
    assignee: ticket.assignee,
    version: ticket.version ?? "1",
    requesterRole: ticket.requesterRole,
  }
}

function transitionContext(
  role: Role,
  profileId: string,
  ticket: ServiceTicket,
  createdBy: string | null = ticket.requesterProfileId ?? null,
  assignedTo: string | null = ticket.assigneeProfileId ?? null
): TicketTransitionContext {
  const qaMode = isAccessProfileEnabled() && profileId === LOCAL_ACCESS_PROFILE_ID
  const isRequester = createdBy
    ? createdBy === profileId
    : qaMode && ticket.requesterRole === role
  const hasDirectAssignee = Boolean(ticket.assignee && !/queue\s*$/i.test(ticket.assignee))
  return {
    isRequester,
    isAssignedStaff:
      role === "staff" &&
      (qaMode
        ? assignedTo
          ? assignedTo === profileId
          : hasDirectAssignee
        // Authenticated staff see tickets only through the assignment/task RLS
        // relationship; visibility itself is therefore authoritative evidence.
        : true),
    canDecideOwnerApproval: role === "admin" || role === "owner",
  }
}

function workflowApiViewForRole(
  role: Role,
  workflow: ReturnType<typeof ticketWorkflowView>
) {
  if (!isClientRole(role)) return workflow
  const residentWorkflow: Partial<ReturnType<typeof ticketWorkflowView>> = {
    ...workflow,
  }
  delete residentWorkflow.paymentState
  return residentWorkflow
}

function residentProofTaskProjection(
  data: ServiceTicketQueueData
): WorkforceTaskRecord[] {
  const ticketsById = new Map(
    data.tickets.map((ticket) => [ticket.id, ticket] as const)
  )

  return data.workforceTasks.flatMap((task) => {
    const ticket = ticketsById.get(task.ticketId)
    if (!ticket) return []

    const completionReadiness =
      ticket.status === "closed" || ticket.status === "resolved"
        ? 100
        : ticket.status === "in_progress"
          ? 70
          : ticket.status === "assigned"
            ? 40
            : 20

    return [{
      // The opaque task id plus ticket id is the minimum relationship needed
      // by the resident-safe service-proof endpoint. Every operating detail is
      // rebuilt from the already-authorized ticket or replaced with a neutral
      // business label; raw task assignee, route, checklist and field note are
      // never copied across this boundary.
      id: task.id,
      ticketId: ticket.id,
      flatNumber: ticket.flatNumber,
      title: ticket.title,
      team: "Site management",
      assignee: "Service team",
      status: ticket.status,
      priority: ticket.priority,
      slaHoursRemaining: ticket.slaHoursRemaining,
      routeSlot: "",
      checklist: [],
      requiresMedia: true,
      mediaCount: ticket.mediaCount,
      managerApprovalRequired: false,
      lastUpdateAt: ticket.openedAt,
      fieldNote: "",
      completionReadiness,
    }]
  })
}

function ticketQueueApiViewForRole({
  data,
  role,
  tickets,
  availableUnits,
}: {
  data: ServiceTicketQueueData
  role: Role
  tickets: Array<Record<string, unknown>>
  availableUnits: string[]
}) {
  if (!isClientRole(role)) return { ...data, tickets, availableUnits }

  return {
    contractVersion: data.contractVersion,
    source: data.source,
    generatedAt: data.generatedAt,
    summary: {
      totalTickets: data.summary.totalTickets,
      openTickets: data.summary.openTickets,
      overdueTickets: data.summary.overdueTickets,
      urgentTickets: data.summary.urgentTickets,
      approvalRequiredTickets: data.summary.approvalRequiredTickets,
      mediaEvidenceCount: data.summary.mediaEvidenceCount,
      averageSlaHoursRemaining: data.summary.averageSlaHoursRemaining,
    },
    tickets,
    // Explicit empty arrays prevent the client from substituting demo
    // operations data into an authenticated resident view. Residents receive
    // only ticket-linked, sanitized proof task relationships.
    catalog: [],
    orders: [],
    workforceTasks: residentProofTaskProjection(data),
    recentActions: [],
    availableUnits,
    ...(data.warning ? { warning: data.warning } : {}),
  }
}

function unitFallbackScope(role: Role): readonly string[] | null {
  if (!hasAnyPermission(role, "tickets", ["create", "manage"])) return []
  const roleScope = accessibleUnitsForRole(role)
  return roleScope ? [...roleScope] : null
}

function localTicketQueueScopeForRole(role: Role): LocalTicketQueueScope | undefined {
  if (role === "staff") {
    return { assignee: LOCAL_QA_STAFF_ASSIGNMENT_LABEL }
  }
  const unitNos = accessibleUnitsForRole(role)
  return unitNos ? { unitNos: [...unitNos] } : undefined
}

async function parseJson(request: NextRequest) {
  try {
    return asRecord(await request.json())
  } catch {
    throw new TicketWorkflowError(
      "TICKET_INVALID_COMMAND",
      "Request body must be valid JSON.",
      400
    )
  }
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return jsonError("Unauthorized.", 401, "AUTH_REQUIRED")
  if (!hasAnyPermission(profile.role, "tickets", ["view"])) {
    return jsonError(
      "Your role is not allowed to view service tickets.",
      403,
      "TICKET_VIEW_FORBIDDEN"
    )
  }

  try {
    const qaMode = isLocalAccessProfile(profile)
    const data = await getServiceTicketQueueData({
      limit: readLimit(request.nextUrl.searchParams.get("limit")),
      search: readSearch(request.nextUrl.searchParams.get("q")),
      allowLocalSeedFallback: qaMode,
      useLocalAccessProfile: qaMode,
      localTicketScope: qaMode
        ? localTicketQueueScopeForRole(profile.role)
        : undefined,
    })
    const scoped = scopeTicketQueueForRole(data, profile.role, qaMode)
    const availableUnits = hasAnyPermission(profile.role, "tickets", ["create", "manage"])
      ? await getTicketAvailableUnits({
          fallbackUnitNos: unitFallbackScope(profile.role),
          useLocalAccessProfile: qaMode,
        })
      : []
    const tickets = scoped.tickets.map((ticket) => ({
      ...serviceTicketApiViewForRole(ticket, profile.role),
      workflow: workflowApiViewForRole(
        profile.role,
        ticketWorkflowView(
          profile.role,
          workflowSnapshot(ticket),
          transitionContext(profile.role, profile.id, ticket)
        )
      ),
    }))
    return NextResponse.json(
      ticketQueueApiViewForRole({
        data: scoped,
        role: profile.role,
        tickets,
        availableUnits: availableUnits.map((unit) => unit.unitNo),
      })
    )
  } catch (error) {
    return ticketError(error, "Service ticket data is unavailable.")
  }
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return jsonError("Unauthorized.", 401, "AUTH_REQUIRED")
  if (!hasAnyPermission(profile.role, "tickets", ["create", "manage"])) {
    return jsonError(
      "Your role is not allowed to create service tickets.",
      403,
      "TICKET_CREATE_FORBIDDEN"
    )
  }

  try {
    const payload = await parseJson(request)
    const title = asString(payload.title)
    const description = asString(payload.description)
    const category = asString(payload.category) ?? "general"
    const unitNo = normalizeUnitNo(asString(payload.unitNo))
    const priority = readPriority(payload.priority)
    const origin = payload.origin === "ai" ? "ai" : "api"

    if (!title || title.length < 3 || title.length > 160) {
      return jsonError(
        "Ticket title must be between 3 and 160 characters.",
        400,
        "TICKET_TITLE_INVALID"
      )
    }
    if (description && description.length > 1200) {
      return jsonError(
        "Ticket description must be 1200 characters or fewer.",
        400,
        "TICKET_DESCRIPTION_INVALID"
      )
    }
    if (category.length > 80) {
      return jsonError("Ticket category must be 80 characters or fewer.", 400, "TICKET_CATEGORY_INVALID")
    }
    if (!priority) {
      return jsonError("Ticket priority is invalid.", 400, "TICKET_PRIORITY_INVALID")
    }
    if (isClientRole(profile.role) && !unitNo) {
      return jsonError(
        "A unit number is required for owner and tenant service tickets.",
        400,
        "TICKET_UNIT_REQUIRED"
      )
    }
    const qaMode = isLocalAccessProfile(profile)
    if (qaMode && !canAccessUnitForRole(profile.role, unitNo)) {
      return jsonError(
        "Your role is not allowed to create service tickets for this unit.",
        403,
        "TICKET_UNIT_FORBIDDEN"
      )
    }
    if (!qaMode && unitNo) {
      const allowedUnits = await getTicketAvailableUnits()
      if (!allowedUnits.some((unit) => unit.unitNo === unitNo)) {
        return jsonError(
          "The selected unit is not available to this account.",
          403,
          "TICKET_UNIT_FORBIDDEN"
        )
      }
    }
    if (payload.assignee !== undefined || payload.assigneeProfileId !== undefined) {
      return jsonError(
        "Assignment is a separate, versioned workflow command after triage.",
        422,
        "TICKET_ASSIGNMENT_REQUIRES_COMMAND"
      )
    }

    const proposedPayload = { title, description, category, priority, unitNo }
    const route = resolveTicketRoute(proposedPayload)
    const rawIdempotencyKey =
      request.headers.get("Idempotency-Key") ?? payload.idempotencyKey
    const idempotencyKey = normalizeTicketIdempotencyKey(rawIdempotencyKey)
    if (!idempotencyKey) {
      return jsonError(
        "Idempotency-Key is required for ticket creation.",
        400,
        "TICKET_IDEMPOTENCY_KEY_INVALID"
      )
    }

    if (origin === "ai") {
      const actionType = "ticket.create.ai_draft"
      const workflowAction = resolveWorkflowAction(actionType, "service_tickets")
      const audit = await logClientAction({
        actionType,
        entityTable: "service_tickets",
        entityExternalId: unitNo,
        title,
        metadata: {
          proposedPayload,
          idempotencyKey,
          routingSuggestion: route,
          ...buildWorkflowMetadata({
            action: workflowAction,
            origin,
            requestedByRole: profile.role,
            requestedById: profile.id,
          }),
        },
        useLocalAccessProfile: qaMode,
      })
      const responseBody = isClientRole(profile.role)
        ? {
            status: "pending_human_confirmation",
            humanConfirmationRequired: true,
            emergencyHumanEscalationRequired: route.emergency,
          }
        : {
            ...audit,
            workflow: workflowAction,
            routing: { ...route, suggestedAssignee: route.assignee, assigned: false },
            humanConfirmationRequired: true,
            emergencyHumanEscalationRequired: route.emergency,
            idempotencyKey,
          }
      return NextResponse.json(responseBody, { status: 202 })
    }

    const ticketResult = await createServiceTicket({
      title,
      description,
      category,
      priority: route.emergency ? "urgent" : priority,
      unitNo,
      assignee: null,
      requiresOwnerApproval: false,
      suggestedAssignee: route.assignee,
      emergency: route.emergency,
      emergencyPolicyCode: route.emergencyPolicyCode,
      routingReason: route.reason,
      idempotencyKey,
      actor: actorFromProfile(profile),
    })
    const createdContext = transitionContext(
      profile.role,
      profile.id,
      { ...ticketResult.ticket, requesterProfileId: profile.id },
      profile.id
    )
    const workflow = ticketWorkflowView(
      profile.role,
      workflowSnapshot(ticketResult.ticket),
      createdContext
    )

    const responseBody = {
      id: ticketResult.ticket.id,
      source: ticketResult.source,
      status: "completed",
      version: ticketResult.version,
      replayed: Boolean(ticketResult.replayed),
      ticket: serviceTicketApiViewForRole(ticketResult.ticket, profile.role),
      workflow: workflowApiViewForRole(profile.role, workflow),
      ownerApprovalRequired: false,
      ...(isClientRole(profile.role)
        ? {}
        : {
            routing: { ...route, suggestedAssignee: route.assignee, assigned: false },
            idempotencyKey,
          }),
    }
    return NextResponse.json(
      responseBody,
      { status: 201, headers: { ETag: `"${ticketResult.version}"` } }
    )
  } catch (error) {
    return ticketError(error, "Ticket could not be created.")
  }
}

function commandFromPayload(payload: Record<string, unknown>) {
  if (payload.approvalStatus === "approved") return "approve_owner_request" as const
  if (payload.approvalStatus === "rejected") return "reject_owner_request" as const
  if (payload.command === undefined) return null
  if (!isTicketCommand(payload.command)) {
    throw new TicketWorkflowError(
      "TICKET_INVALID_COMMAND",
      "The requested ticket command is not supported.",
      400
    )
  }
  return payload.command
}

function mutationContext(
  role: Role,
  profileId: string,
  record: ServiceTicketWorkflowRecord,
  payload: Record<string, unknown>
): TicketTransitionContext {
  return {
    ...transitionContext(
      role,
      profileId,
      record.ticket,
      record.createdBy,
      record.assignedTo
    ),
    assignee:
      asString(payload.assignee) ??
      (asString(payload.assigneeProfileId) ? "Assigned responder" : null),
    reason: asString(payload.reason),
    // The dashboard UI sends the owner-approval payload as `approvalContext`; accept
    // that first and keep the legacy `ownerApprovalContext` key as a fallback so the
    // real manager flow and existing callers both resolve the context (otherwise the
    // request_owner_approval command receives null and fails validation with 422).
    ownerApprovalContext: (payload.approvalContext ??
      payload.ownerApprovalContext ??
      null) as TicketTransitionContext["ownerApprovalContext"],
  }
}

function ensureAccessProfileTicketVisibility(
  role: Role,
  ticket: ServiceTicket,
  useLocalAccessProfile: boolean
) {
  if (!useLocalAccessProfile) return true
  return scopeTicketQueueForRole(
    {
      contractVersion: "phase-8-9-service-operations.v1",
      source: "local-seed",
      generatedAt: new Date().toISOString(),
      quality: { status: "passed", checks: [] },
      summary: {
        totalTickets: 1,
        openTickets: 1,
        overdueTickets: 0,
        urgentTickets: 0,
        financeBlockedTickets: 0,
        approvalRequiredTickets: 0,
        mediaEvidenceCount: 0,
        estimatedCostCents: 0,
        averageSlaHoursRemaining: 0,
        catalogItems: 0,
        activeCatalogItems: 0,
        serviceOrders: 0,
        readyForDispatchOrders: 0,
        blockedOrders: 0,
        openWorkforceTasks: 0,
        slaBreachTasks: 0,
        managerApprovalTasks: 0,
        fieldTeams: 0,
        averageCompletionReadiness: 0,
      },
      tickets: [ticket],
      catalog: [],
      orders: [],
      workforceTasks: [],
      strategy: {
        systemOfRecord: "local QA",
        crmRole: "local QA",
        escalationPolicy: "local QA",
        externalHelpdeskDecision: "local QA",
      },
      recentActions: [],
    },
    role,
    true
  ).tickets.length === 1
}

export async function PATCH(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return jsonError("Unauthorized.", 401, "AUTH_REQUIRED")

  try {
    const payload = await parseJson(request)
    const ticketId = asString(payload.ticketId)
    if (!ticketId) {
      return jsonError("A ticket id is required.", 400, "TICKET_ID_REQUIRED")
    }
    if ("status" in payload) {
      return jsonError(
        "Free-form status changes are not supported; use a workflow command.",
        422,
        "TICKET_COMMAND_REQUIRED"
      )
    }

    const command = commandFromPayload(payload)
    if (
      payload.command !== undefined &&
      payload.approvalStatus !== undefined &&
      command !== payload.command
    ) {
      return jsonError(
        "Send either command or the legacy approval decision, not both.",
        422,
        "TICKET_MIXED_COMMAND"
      )
    }
    const title = readOptionalText(payload, "title")
    const description = readOptionalText(payload, "description")
    const category = readOptionalText(payload, "category")
    const clearDescription = payload.clearDescription === true
    const priority = "priority" in payload ? readPriority(payload.priority) : undefined
    if ("priority" in payload && !priority) {
      return jsonError("Ticket priority is invalid.", 400, "TICKET_PRIORITY_INVALID")
    }
    const hasDetails =
      title !== undefined ||
      description !== undefined ||
      category !== undefined ||
      priority !== undefined ||
      "clearDescription" in payload

    if (command && hasDetails) {
      return jsonError(
        "Workflow commands and detail edits must be sent as separate versioned requests.",
        422,
        "TICKET_MIXED_COMMAND"
      )
    }
    if (!command && !hasDetails) {
      return jsonError(
        "A workflow command or detail change is required.",
        422,
        "TICKET_COMMAND_REQUIRED"
      )
    }
    if (title !== undefined && (!title || title.length < 3 || title.length > 160)) {
      return jsonError(
        "Ticket title must be between 3 and 160 characters.",
        400,
        "TICKET_TITLE_INVALID"
      )
    }
    if (description && description.length > 1200) {
      return jsonError(
        "Ticket description must be 1200 characters or fewer.",
        400,
        "TICKET_DESCRIPTION_INVALID"
      )
    }
    if (category !== undefined && (!category || category.length > 80)) {
      return jsonError("Ticket category is invalid.", 400, "TICKET_CATEGORY_INVALID")
    }

    const qaMode = isLocalAccessProfile(profile)
    const record = await getServiceTicketWorkflowRecord(ticketId, {
      useLocalAccessProfile: qaMode,
    })
    if (!record) return jsonError("Ticket was not found.", 404, "TICKET_NOT_FOUND")
    if (!ensureAccessProfileTicketVisibility(profile.role, record.ticket, qaMode)) {
      return jsonError(
        "Your role is not allowed to access this ticket.",
        403,
        "TICKET_TRANSITION_FORBIDDEN"
      )
    }

    const rawExpectedVersion =
      payload.expectedVersion ?? request.headers.get("If-Match")
    if (rawExpectedVersion === undefined || rawExpectedVersion === null) {
      return jsonError(
        "expectedVersion or If-Match is required for ticket mutation.",
        400,
        "TICKET_VERSION_INVALID"
      )
    }
    const expectedVersionToken = normalizeTicketVersion(
      typeof rawExpectedVersion === "number"
        ? String(rawExpectedVersion)
        : rawExpectedVersion
    )
    if (!expectedVersionToken) {
      return jsonError(
        "expectedVersion must be a non-empty workflow version token.",
        400,
        "TICKET_VERSION_INVALID"
      )
    }
    const idempotencyKey = normalizeTicketIdempotencyKey(
      request.headers.get("Idempotency-Key") ?? payload.idempotencyKey
    )
    if (!idempotencyKey) {
      return jsonError(
        "Idempotency-Key is required for ticket mutation.",
        400,
        "TICKET_IDEMPOTENCY_KEY_INVALID"
      )
    }

    const context = mutationContext(profile.role, profile.id, record, payload)
    const mutationRequest = {
      ticketId,
      title,
      description,
      clearDescription,
      category,
      priority: priority ?? undefined,
      assignee: command === "assign" ? asString(payload.assignee) : undefined,
      assigneeProfileId:
        command === "assign" ? asString(payload.assigneeProfileId) : undefined,
      command: command ?? undefined,
      expectedVersion: expectedVersionToken,
      idempotencyKey,
      reason: asString(payload.reason),
      ownerApprovalContext:
        command === "request_owner_approval" && context.ownerApprovalContext
          ? context.ownerApprovalContext
          : undefined,
      actor: actorFromProfile(profile),
    }
    const replay = await replayServiceTicketMutation(mutationRequest)
    if (replay) {
      const replayWorkflow = ticketWorkflowView(
        profile.role,
        workflowSnapshot(replay.ticket),
        transitionContext(
          profile.role,
          profile.id,
          replay.ticket,
          record.createdBy,
          command === "assign"
            ? asString(payload.assigneeProfileId)
            : record.assignedTo
        )
      )
      return NextResponse.json(
        {
          source: replay.source,
          ticket: serviceTicketApiViewForRole(replay.ticket, profile.role),
          version: replay.version,
          replayed: true,
          workflow: workflowApiViewForRole(profile.role, replayWorkflow),
          ...(isClientRole(profile.role) ? {} : { idempotencyKey }),
        },
        { headers: { ETag: `"${replay.version}"` } }
      )
    }
    const expectedVersion = validateExpectedTicketVersion(
      expectedVersionToken,
      record.version
    )
    const snapshot: TicketWorkflowSnapshot = {
      ...workflowSnapshot(record.ticket),
      primaryState: record.workflowState,
      approvalState: record.approvalStatus,
      dispatchState: record.dispatchStatus,
      paymentState: record.paymentStatus,
      severity: record.severity,
      emergency: record.emergency,
      version: record.version,
    }

    let workflowState = record.workflowState
    let approvalStatus = record.approvalStatus
    let dispatchStatus = record.dispatchStatus
    let paymentStatus = record.paymentStatus

    if (command) {
      if (command === "assign") {
        const assignee = asString(payload.assignee)
        const assigneeProfileId = asString(payload.assigneeProfileId)
        if (assignee && assigneeProfileId) {
          return jsonError(
            "Assign either a capability queue or a responder profile, not both.",
            422,
            "TICKET_ASSIGNMENT_INVALID"
          )
        }
        if (assignee && !isTicketAssignee(assignee)) {
          return jsonError(
            "The requested assignment queue is not available.",
            400,
            "TICKET_ASSIGNMENT_INVALID"
          )
        }
        if (
          assigneeProfileId &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            assigneeProfileId
          )
        ) {
          return jsonError(
            "assigneeProfileId must be a valid profile id.",
            400,
            "TICKET_ASSIGNMENT_INVALID"
          )
        }
      }
      const transition = decideTicketTransition(profile.role, snapshot, command, context)
      workflowState = transition.nextState
      approvalStatus = transition.approvalState
      dispatchStatus = transition.dispatchState
      paymentStatus = transition.paymentState
    } else {
      const mayEditAsRequester =
        isClientRole(profile.role) &&
        context.isRequester === true &&
        record.workflowState === "submitted"
      const mayEditAsOperator =
        (profile.role === "admin" || profile.role === "manager") &&
        hasAnyPermission(profile.role, "tickets", ["update", "manage"])
      if (!mayEditAsRequester && !mayEditAsOperator) {
        return jsonError(
          "Your role is not allowed to edit this ticket in its current state.",
          403,
          "TICKET_TRANSITION_FORBIDDEN"
        )
      }
      if (priority) validateTicketPriorityChange(snapshot, priority)
    }

    const result = await updateServiceTicket({
      ...mutationRequest,
      workflowState,
      approvalStatus,
      dispatchStatus,
      paymentStatus,
      expectedVersion,
    })
    if (!result) return jsonError("Ticket was not found.", 404, "TICKET_NOT_FOUND")

    const responseContext = transitionContext(
      profile.role,
      profile.id,
      result.ticket,
      record.createdBy,
      command === "assign"
        ? asString(payload.assigneeProfileId)
        : record.assignedTo
    )
    const workflow = ticketWorkflowView(
      profile.role,
      workflowSnapshot(result.ticket),
      responseContext
    )
    return NextResponse.json(
      {
        source: result.source,
        ticket: serviceTicketApiViewForRole(result.ticket, profile.role),
        version: result.version,
        replayed: Boolean(result.replayed),
        workflow: workflowApiViewForRole(profile.role, workflow),
        ...(isClientRole(profile.role) ? {} : { idempotencyKey }),
      },
      { headers: { ETag: `"${result.version}"` } }
    )
  } catch (error) {
    return ticketError(error, "Ticket could not be updated.")
  }
}
