import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import {
  getServiceTicketQueueData,
  logClientAction,
} from "@/lib/site-management-repository"
import {
  buildWorkflowMetadata,
  resolveWorkflowAction,
} from "@/lib/action-catalog"

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
    return NextResponse.json(data)
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
  const unitNo = asString(payload.unitNo)
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
