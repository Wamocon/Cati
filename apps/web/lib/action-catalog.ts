import type { Action, Resource, Role } from "@/lib/rbac"

export type WorkflowRiskLevel = "low" | "medium" | "high" | "restricted"
export type WorkflowExecutionMode = "log_only" | "request_only" | "approval_required"
export type WorkflowOrigin = "ui" | "api" | "ai" | "import"

export interface WorkflowActionDefinition {
  actionType: string
  resource: Resource
  requiredActions: Action[]
  riskLevel: WorkflowRiskLevel
  approvalRoles: Role[]
  requiresHumanApproval: boolean
  sensitive: boolean
  executionMode: WorkflowExecutionMode
  description: string
}

export interface ResolvedWorkflowAction extends WorkflowActionDefinition {
  catalogVersion: "workflow-action-catalog.v1"
}

const definitions: WorkflowActionDefinition[] = [
  {
    actionType: "ticket.create.request",
    resource: "tickets",
    requiredActions: ["create", "manage"],
    riskLevel: "medium",
    approvalRoles: ["manager"],
    requiresHumanApproval: true,
    sensitive: false,
    executionMode: "request_only",
    description: "Create a service ticket request for human triage.",
  },
  {
    actionType: "ticket.create.ai_draft",
    resource: "tickets",
    requiredActions: ["create", "manage"],
    riskLevel: "medium",
    approvalRoles: ["manager"],
    requiresHumanApproval: true,
    sensitive: false,
    executionMode: "request_only",
    description: "AI-drafted service ticket request. Never auto-executes.",
  },
  {
    actionType: "ticket.update.request",
    resource: "tickets",
    requiredActions: ["update", "manage"],
    riskLevel: "medium",
    approvalRoles: ["manager"],
    requiresHumanApproval: true,
    sensitive: false,
    executionMode: "request_only",
    description: "Request a ticket state or assignment change.",
  },
  {
    actionType: "tickets.sla.review",
    resource: "tickets",
    requiredActions: ["update", "manage"],
    riskLevel: "medium",
    approvalRoles: ["manager"],
    requiresHumanApproval: true,
    sensitive: false,
    executionMode: "request_only",
    description: "Request a management review for overdue SLA, evidence and debt blockers.",
  },
  {
    actionType: "finance.approval.request",
    resource: "finance",
    requiredActions: ["create", "approve", "manage"],
    riskLevel: "high",
    approvalRoles: ["accountant", "admin"],
    requiresHumanApproval: true,
    sensitive: true,
    executionMode: "approval_required",
    description: "Finance-related approval request.",
  },
  {
    actionType: "access.approval.request",
    resource: "eids_compliance",
    requiredActions: ["create", "approve", "manage"],
    riskLevel: "restricted",
    approvalRoles: ["manager", "admin"],
    requiresHumanApproval: true,
    sensitive: true,
    executionMode: "approval_required",
    description: "Access, credential or restriction approval request.",
  },
]

function fallbackResource(entityTable: string | null): Resource {
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
  if (entityTable === "documents" || entityTable === "purchase_documents" || entityTable === "document_packets") return "documents"
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
  if (
    entityTable === "communications" ||
    entityTable === "notifications" ||
    entityTable === "notification_deliveries" ||
    entityTable === "message_templates" ||
    entityTable === "guest_lifecycle_events"
  ) return "communications"
  if (entityTable === "mobile_web_capabilities" || entityTable === "offline_sync_jobs") return "offline_sync"
  if (entityTable === "integration_providers") return "settings"
  if (entityTable === "ai_recommendations" || entityTable === "ai_image_workflows") return "reports"
  if (entityTable === "access" || entityTable === "compliance") return "eids_compliance"
  if (entityTable === "reports") return "reports"
  return "listings"
}

function fallbackRequiredActions(actionType: string): Action[] {
  if (actionType.includes(".view")) return ["view"]
  if (actionType.includes(".export")) return ["export"]
  if (actionType.includes(".download")) return ["export", "view"]
  if (actionType.includes(".update")) return ["update", "manage"]
  if (actionType.includes(".retry")) return ["update", "manage"]
  if (actionType.includes(".upload") || actionType.includes(".create") || actionType.includes(".prepare")) return ["create", "manage"]
  if (actionType.includes(".approve")) return ["approve", "manage"]
  if (actionType.includes(".assign")) return ["assign", "manage"]
  return ["create", "update", "manage", "approve", "assign"]
}

function fallbackRisk(actionType: string, resource: Resource): Pick<
  WorkflowActionDefinition,
  "riskLevel" | "approvalRoles" | "requiresHumanApproval" | "sensitive" | "executionMode"
> {
  const lower = actionType.toLowerCase()
  const sensitive =
    resource === "finance" ||
    resource === "eids_compliance" ||
    resource === "users" ||
    lower.includes("refund") ||
    lower.includes("deposit") ||
    lower.includes("access") ||
    lower.includes("restriction")

  if (sensitive && resource === "finance") {
    return {
      riskLevel: "high",
      approvalRoles: ["accountant", "admin"],
      requiresHumanApproval: true,
      sensitive: true,
      executionMode: "approval_required",
    }
  }

  if (sensitive) {
    return {
      riskLevel: "restricted",
      approvalRoles: ["manager", "admin"],
      requiresHumanApproval: true,
      sensitive: true,
      executionMode: "approval_required",
    }
  }

  if (lower.includes(".approve") || lower.includes(".assign")) {
    return {
      riskLevel: "medium",
      approvalRoles: ["manager", "admin"],
      requiresHumanApproval: true,
      sensitive: false,
      executionMode: "request_only",
    }
  }

  return {
    riskLevel: "low",
    approvalRoles: ["manager"],
    requiresHumanApproval: false,
    sensitive: false,
    executionMode: "log_only",
  }
}

export function resolveWorkflowAction(
  actionType: string,
  entityTable: string | null
): ResolvedWorkflowAction {
  const exact = definitions.find((definition) => definition.actionType === actionType)
  if (exact) {
    return { ...exact, catalogVersion: "workflow-action-catalog.v1" }
  }

  const resource = fallbackResource(entityTable)
  const risk = fallbackRisk(actionType, resource)

  return {
    actionType,
    resource,
    requiredActions: fallbackRequiredActions(actionType),
    description: "Legacy UI action request logged through the workflow catalog.",
    ...risk,
    catalogVersion: "workflow-action-catalog.v1",
  }
}

export function buildWorkflowMetadata({
  action,
  origin,
  requestedByRole,
  requestedById,
}: {
  action: ResolvedWorkflowAction
  origin: WorkflowOrigin
  requestedByRole: Role
  requestedById: string
}) {
  return {
    workflow: {
      catalogVersion: action.catalogVersion,
      actionType: action.actionType,
      resource: action.resource,
      riskLevel: action.riskLevel,
      approvalRoles: action.approvalRoles,
      requiresHumanApproval: action.requiresHumanApproval,
      sensitive: action.sensitive,
      executionMode: action.executionMode,
      status: action.requiresHumanApproval ? "submitted" : "logged",
      origin,
      requestedByRole,
      requestedById,
      notificationPlan: {
        requester: true,
        approvers: action.requiresHumanApproval ? action.approvalRoles : [],
      },
    },
  }
}
