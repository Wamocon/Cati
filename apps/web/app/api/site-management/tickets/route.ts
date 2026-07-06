import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import {
  getServiceTicketQueueData,
  logClientAction,
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
    value === "normal" ||
    value === "high" ||
    value === "urgent"
    ? value
    : "normal"
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

  const actionType = origin === "ai" ? "ticket.create.ai_draft" : "ticket.create.request"
  const workflowAction = resolveWorkflowAction(actionType, "service_tickets")
  const proposedPayload = {
    title,
    description,
    category,
    priority,
    unitNo,
  }

  try {
    const result = await logClientAction({
      actionType,
      entityTable: "service_tickets",
      entityExternalId: unitNo ?? "ticket-request",
      title,
      metadata: {
        proposedPayload,
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
        ...result,
        workflow: workflowAction,
        ticketRequest: {
          status: "submitted",
          proposedPayload,
          requiresHumanApproval: workflowAction.requiresHumanApproval,
        },
      },
      { status: 202 }
    )
  } catch {
    return NextResponse.json(
      { error: "Ticket request could not be submitted." },
      { status: 500 }
    )
  }
}
