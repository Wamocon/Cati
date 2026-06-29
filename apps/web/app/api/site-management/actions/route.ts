import { NextRequest, NextResponse } from "next/server"
import {
  type ClientActionInput,
  logClientAction,
} from "@/lib/site-management-repository"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission, type Action, type Resource } from "@/lib/rbac"

export const dynamic = "force-dynamic"

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function resourceForEntityTable(entityTable: string | null): Resource {
  if (
    entityTable === "units" ||
    entityTable === "site_blocks" ||
    entityTable === "site_floors" ||
    entityTable === "import_batches" ||
    entityTable === "import_findings"
  ) return "listings"
  if (
    entityTable === "service_tickets" ||
    entityTable === "service_catalog" ||
    entityTable === "service_orders" ||
    entityTable === "workforce_tasks" ||
    entityTable === "media_reports"
  ) return "tickets"
  if (entityTable === "bookings" || entityTable === "reservations") return "calendar"
  if (entityTable === "documents" || entityTable === "purchase_documents") return "documents"
  if (
    entityTable === "finance" ||
    entityTable === "accounts" ||
    entityTable === "transactions" ||
    entityTable === "finance_ledger_entries" ||
    entityTable === "payment_transactions"
  ) return "finance"
  if (
    entityTable === "profiles" ||
    entityTable === "staff_members" ||
    entityTable === "role_coverage" ||
    entityTable === "residents" ||
    entityTable === "unit_residents"
  ) return "users"
  if (entityTable === "communications" || entityTable === "notifications") return "communications"
  if (entityTable === "access" || entityTable === "compliance") return "eids_compliance"
  if (entityTable === "reports") return "reports"
  return "listings"
}

function requiredActionsForActionType(actionType: string): Action[] {
  if (actionType.includes(".view")) return ["view"]
  if (actionType.includes(".export")) return ["export"]
  if (actionType.includes(".download")) return ["export", "view"]
  if (actionType.includes(".upload") || actionType.includes(".create") || actionType.includes(".prepare")) return ["create", "manage"]
  if (actionType.includes(".approve")) return ["approve", "manage"]
  if (actionType.includes(".assign")) return ["assign", "manage"]
  return ["create", "update", "manage", "approve", "assign"]
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

  const input: ClientActionInput = {
    actionType,
    entityTable: asString(payload.entityTable),
    entityId: asString(payload.entityId),
    entityExternalId: asString(payload.entityExternalId),
    title: asString(payload.title),
    metadata: asRecord(payload.metadata),
  }

  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const resource = resourceForEntityTable(input.entityTable ?? null)
  if (!hasAnyPermission(profile.role, resource, requiredActionsForActionType(actionType))) {
    return NextResponse.json(
      { error: "Your role is not allowed to perform this action." },
      { status: 403 }
    )
  }

  try {
    const result = await logClientAction(input)
    return NextResponse.json(result, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Action could not be logged." },
      { status: 500 }
    )
  }
}
