import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import {
  createServiceTicket,
  getServiceTicketQueueData,
  logClientAction,
  updateServiceTicket,
  type ServiceTicketQueueData,
} from "@/lib/site-management-repository"
import {
  buildWorkflowMetadata,
  resolveWorkflowAction,
} from "@/lib/action-catalog"
import {
  canAccessUnitForRole,
  isClientRole,
  normalizeUnitNo,
  visibleServiceTicketsForRole,
} from "@/lib/role-scoped-views"
import type { Role } from "@/lib/rbac"
import { isTicketAssignee, resolveTicketRoute } from "@/lib/ticket-routing"

export const dynamic = "force-dynamic"

function readLimit(value: string | null) {
  const limit = Number(value ?? 24)
  if (!Number.isFinite(limit)) return 24
  return Math.min(Math.max(Math.trunc(limit), 1), 100)
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function readPriority(value: unknown) {
  return value === "low" ||
    value === "medium" ||
    value === "normal" ||
    value === "high" ||
    value === "urgent"
    ? value
    : "medium"
}

function readStatus(value: unknown) {
  return value === "open" ||
    value === "assigned" ||
    value === "waiting_payment" ||
    value === "in_progress" ||
    value === "resolved" ||
    value === "closed" ||
    value === "cancelled"
    ? value
    : null
}

function readOptionalText(record: Record<string, unknown>, key: string) {
  if (!(key in record)) return undefined
  const value = record[key]
  if (value === null) return null
  return typeof value === "string" ? value.trim() : undefined
}

function scopeTicketQueueForRole(
  data: ServiceTicketQueueData,
  role: Role
): ServiceTicketQueueData {
  const tickets = visibleServiceTicketsForRole(role, data.tickets)
  if (tickets.length === data.tickets.length) return data

  const ticketIds = new Set(tickets.map((ticket) => ticket.id))
  const orders = data.orders.filter((order) => ticketIds.has(order.ticketId))
  const workforceTasks = data.workforceTasks.filter((task) => ticketIds.has(task.ticketId))
  const openTickets = tickets.filter(
    (ticket) => ticket.status !== "closed" && ticket.status !== "resolved"
  )
  const estimatedCostCents = tickets.reduce(
    (sum, ticket) => sum + ticket.estimatedCostTry * 100,
    0
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
      financeBlockedTickets: tickets.filter((ticket) => ticket.debtBlocked).length,
      approvalRequiredTickets: tickets.filter((ticket) => ticket.debtBlocked).length,
      mediaEvidenceCount: tickets.reduce((sum, ticket) => sum + ticket.mediaCount, 0),
      estimatedCostCents,
      averageSlaHoursRemaining:
        tickets.length > 0
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
      managerApprovalTasks: workforceTasks.filter((task) => task.managerApprovalRequired).length,
      fieldTeams: new Set(workforceTasks.map((task) => task.team)).size,
      averageCompletionReadiness:
        workforceTasks.length > 0
          ? Math.round(
              workforceTasks.reduce((sum, task) => sum + task.completionReadiness, 0) /
                workforceTasks.length
            )
          : 0,
    },
  }
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "tickets", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view service tickets." },
      { status: 403 }
    )
  }

  try {
    const limit = readLimit(request.nextUrl.searchParams.get("limit"))
    const data = await getServiceTicketQueueData({ limit })
    return NextResponse.json(scopeTicketQueueForRole(data, profile.role))
  } catch {
    return NextResponse.json(
      { error: "Service ticket data is unavailable." },
      { status: 500 }
    )
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

  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "tickets", ["create", "manage"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to create service tickets." },
      { status: 403 }
    )
  }

  const payload = asRecord(body)
  const title = asString(payload.title)
  const description = asString(payload.description)
  const category = asString(payload.category) ?? "general"
  const unitNo = normalizeUnitNo(asString(payload.unitNo))
  const priority = readPriority(payload.priority)
  const origin = payload.origin === "ai" ? "ai" : "api"

  if (!title || title.length < 3 || title.length > 160) {
    return NextResponse.json(
      { error: "Ticket title must be between 3 and 160 characters." },
      { status: 400 }
    )
  }

  if (description && description.length > 1200) {
    return NextResponse.json(
      { error: "Ticket description must be 1200 characters or fewer." },
      { status: 400 }
    )
  }

  if (isClientRole(profile.role) && !unitNo) {
    return NextResponse.json(
      { error: "A unit number is required for owner and tenant service tickets." },
      { status: 400 }
    )
  }

  if (!canAccessUnitForRole(profile.role, unitNo)) {
    return NextResponse.json(
      { error: "Your role is not allowed to create service tickets for this unit." },
      { status: 403 }
    )
  }

  const proposedPayload = {
    title,
    description,
    category,
    priority,
    unitNo,
  }
  const requestedAssignee = asString(payload.assignee)
  if (requestedAssignee && !isTicketAssignee(requestedAssignee)) {
    return NextResponse.json({ error: "The requested assignee is not available." }, { status: 400 })
  }
  const route = requestedAssignee
    ? { assignee: requestedAssignee, reason: "Manual assignment", emergency: false }
    : resolveTicketRoute(proposedPayload)
  const requiresOwnerApproval = profile.role === "tenant" && !route.emergency

  try {
    const ticketResult = await createServiceTicket({
      title,
      description,
      category,
      priority,
      unitNo,
      assignee: route.assignee,
      requiresOwnerApproval,
      suggestedAssignee: route.assignee,
      actor: {
        id: profile.id,
        role: profile.role,
        companyId: profile.company_id,
        displayName: profile.full_name,
        email: profile.email,
      },
    })

    const actionType = origin === "ai" ? "ticket.create.ai_draft" : "ticket.create.request"
    const workflowAction = resolveWorkflowAction(actionType, "service_tickets")
    const audit = await logClientAction({
      actionType,
      entityTable: "service_tickets",
      entityExternalId: ticketResult.ticket.id,
      title,
      metadata: {
        proposedPayload,
        materializedTicketId: ticketResult.ticket.id,
        ...buildWorkflowMetadata({
          action: workflowAction,
          origin,
          requestedByRole: profile.role,
          requestedById: profile.id,
        }),
      },
    })

    return NextResponse.json(
      {
        ...audit,
        workflow: workflowAction,
        ticket: ticketResult.ticket,
        routing: route,
        ownerApprovalRequired: requiresOwnerApproval,
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: "Ticket could not be created." },
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

  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const payload = asRecord(body)
  const ticketId = asString(payload.ticketId)
  if (!ticketId) {
    return NextResponse.json(
      { error: "A ticket id is required." },
      { status: 400 }
    )
  }

  const title = readOptionalText(payload, "title")
  const description = readOptionalText(payload, "description")
  const category = readOptionalText(payload, "category")
  const assignee = readOptionalText(payload, "assignee")
  const clearDescription = payload.clearDescription === true
  const priority = "priority" in payload ? readPriority(payload.priority) : undefined
  const status = readStatus(payload.status)
  const approvalDecision = payload.approvalStatus === "approved" || payload.approvalStatus === "rejected"
    ? payload.approvalStatus
    : null
  const wantsOperationalChange = Boolean(status || assignee || priority)

  if (approvalDecision && !hasAnyPermission(profile.role, "tickets", ["approve", "manage"])) {
    return NextResponse.json({ error: "Your role is not allowed to approve tenant tickets." }, { status: 403 })
  }

  if (assignee !== undefined && assignee !== null && !isTicketAssignee(assignee)) {
    return NextResponse.json({ error: "The requested assignee is not available." }, { status: 400 })
  }

  if (
    wantsOperationalChange &&
    !hasAnyPermission(profile.role, "tickets", ["update", "assign", "manage"])
  ) {
    return NextResponse.json(
      { error: "Your role is not allowed to assign or change ticket status." },
      { status: 403 }
    )
  }

  if (
    !wantsOperationalChange &&
    !hasAnyPermission(profile.role, "tickets", ["update", "create", "manage"])
  ) {
    return NextResponse.json(
      { error: "Your role is not allowed to edit service tickets." },
      { status: 403 }
    )
  }

  if (title !== undefined && (!title || title.length < 3 || title.length > 160)) {
    return NextResponse.json(
      { error: "Ticket title must be between 3 and 160 characters." },
      { status: 400 }
    )
  }

  if (description && description.length > 1200) {
    return NextResponse.json(
      { error: "Ticket description must be 1200 characters or fewer." },
      { status: 400 }
    )
  }

  try {
    if (isClientRole(profile.role)) {
      const currentData = await getServiceTicketQueueData({ limit: 100 })
      const visibleTicketIds = new Set(
        visibleServiceTicketsForRole(profile.role, currentData.tickets).map((ticket) => ticket.id)
      )
      if (!visibleTicketIds.has(ticketId)) {
        return NextResponse.json(
          { error: "Your role is not allowed to edit this service ticket." },
          { status: 403 }
        )
      }
    }

    if (approvalDecision) {
      const currentData = await getServiceTicketQueueData({ limit: 100 })
      const currentTicket = currentData.tickets.find((ticket) => ticket.id === ticketId)
      if (!currentTicket || currentTicket.status !== "waiting_approval") {
        return NextResponse.json({ error: "This ticket is not waiting for owner approval." }, { status: 409 })
      }
      const approvedRoute = resolveTicketRoute({
        title: currentTicket.title,
        description: currentTicket.description,
        category: currentTicket.category,
        priority: currentTicket.priority,
      })
      const decisionResult = await updateServiceTicket({
        ticketId,
        status: approvalDecision === "approved" ? "assigned" : "cancelled",
        assignee: approvalDecision === "approved" ? approvedRoute.assignee : "Owner approval queue",
        actor: { id: profile.id, role: profile.role, companyId: profile.company_id, displayName: profile.full_name, email: profile.email },
      })
      if (!decisionResult) return NextResponse.json({ error: "Ticket was not found." }, { status: 404 })
      await logClientAction({
        actionType: `ticket.owner_${approvalDecision}`,
        entityTable: "service_tickets",
        entityExternalId: decisionResult.ticket.id,
        title: decisionResult.ticket.title,
        metadata: { decidedByRole: profile.role, approvalDecision, routedTo: approvalDecision === "approved" ? approvedRoute.assignee : null },
      })
      return NextResponse.json({ ...decisionResult, approvalStatus: approvalDecision, routing: approvedRoute })
    }

    const result = await updateServiceTicket({
      ticketId,
      title,
      description,
      clearDescription,
      category,
      priority,
      status: status ?? undefined,
      assignee,
      actor: {
        id: profile.id,
        role: profile.role,
        companyId: profile.company_id,
        displayName: profile.full_name,
        email: profile.email,
      },
    })

    if (!result) {
      return NextResponse.json({ error: "Ticket was not found." }, { status: 404 })
    }

    await logClientAction({
      actionType: assignee ? "ticket.assign" : "ticket.update",
      entityTable: "service_tickets",
      entityExternalId: result.ticket.id,
      title: result.ticket.title,
      metadata: {
        requestedByRole: profile.role,
        changes: {
          title,
          description: clearDescription ? null : description,
          category,
          priority,
          status,
          assignee,
          clearDescription,
        },
      },
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: "Ticket could not be updated." },
      { status: 500 }
    )
  }
}
