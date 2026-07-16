import type { Role } from "@/lib/rbac"
import type { ServiceTicketHistoryEvent } from "@/lib/site-management-data"

function mayReadTicketHistoryAudience(
  role: Role,
  audience: ServiceTicketHistoryEvent["audience"]
) {
  if (role === "admin" || role === "manager") return true
  if (!audience) return false
  if (audience === "resident") {
    return role === "owner" || role === "tenant" || role === "staff"
  }
  if (audience === "internal") return role === "staff"
  return role === "accountant"
}

function residentSafeHistoryMessage(type: string) {
  if (type === "ticket_created" || type === "portal_ticket_created") {
    return "Service request received."
  }
  if (type === "ticket_assigned") return "Responsible service team assigned."
  if (type === "owner_approval_decided") return "Owner decision recorded."
  if (type === "ticket_details_updated") return "Service request details updated."
  if (type === "status_changed") return "Service request status updated."
  return "Service request progress updated."
}

/**
 * Defense-in-depth response filter. PostgreSQL RLS remains authoritative, but
 * the browser contract independently removes events outside the current role
 * and never serializes the visibility marker itself.
 */
export function visibleTicketHistoryForRole(
  role: Role,
  history: readonly ServiceTicketHistoryEvent[] | undefined
): ServiceTicketHistoryEvent[] {
  return (history ?? [])
    .filter((event) => mayReadTicketHistoryAudience(role, event.audience))
    .map((event) => ({
      id: event.id,
      type: event.type,
      message:
        role === "owner" || role === "tenant"
          ? residentSafeHistoryMessage(event.type)
          : event.message,
      occurredAt: event.occurredAt,
      version: event.version,
      fromState: event.fromState,
      toState: event.toState,
    }))
}
