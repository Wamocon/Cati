import type { UserProfile } from "@/lib/auth"
import { isAccessProfileEnabled } from "@/lib/auth"
import {
  type ClientActionRequestRecord,
  type DataSource,
  getServiceTicketQueueData,
  listPendingActionRequests,
} from "@/lib/site-management-repository"
import type { ServiceTicket } from "@/lib/site-management-data"

// The zero-UUID identifies the local access-profile QA actor. When it is active
// every read stays on the deterministic local-seed path (never a service-role
// promotion), matching the site-management routes.
const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

const AI_TICKET_DRAFT_ACTION = "ticket.create.ai_draft"

export type PendingApprovalKind =
  | "ai_suggestion"
  | "action_request"
  | "service_ticket"

/**
 * Encodes which EXISTING endpoint + payload the inbox must call to Approve or
 * Decline an item. The inbox never contains decision logic of its own; it only
 * replays the same approve/reject the app already exposes, so the server-side
 * human-approval gate stays the single source of truth per decision.
 */
export interface PendingApprovalDecision {
  endpoint: string
  method: "PATCH"
  approveBody: Record<string, unknown>
  declineBody: Record<string, unknown>
  approveHeaders?: Record<string, string>
  declineHeaders?: Record<string, string>
  /**
   * AI ticket drafts materialize a real ticket on approval and therefore need a
   * responder chosen at approval time; the inbox merges the choice into
   * `approveBody.assignee` before calling. Decline never needs one.
   */
  approveRequiresResponder?: boolean
  /**
   * Owner-approval decisions on a real service ticket require a recorded reason
   * on BOTH sides: declining runs `reject_owner_request` (a `reasonRequired`
   * transition) and an administrator approving or declining is treated as an
   * owner-approval override, which the workflow gates behind a mandatory reason
   * too. When set, the inbox prompts the admin for a human-entered reason and
   * merges it into the PATCH body as `reason` before calling.
   */
  approveRequiresReason?: boolean
  declineRequiresReason?: boolean
}

/**
 * A single item awaiting an administrator decision, normalized across every
 * pending source into a business-friendly shape (no enums, table names or UUIDs
 * are meant to reach the UI as content). `title`/`summary` carry user-authored
 * free text; the component localizes all of its own chrome and any fallbacks.
 */
export interface PendingApproval {
  id: string
  kind: PendingApprovalKind
  title: string
  summary: string
  requestedBy: string | null
  requestedAt: string | null
  decideVia: PendingApprovalDecision
}

function isLocalAccessProfile(profile: Pick<UserProfile, "id">): boolean {
  return isAccessProfileEnabled() && profile.id === LOCAL_ACCESS_PROFILE_ID
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asText(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : ""
}

function actionRequestToPendingApproval(
  request: ClientActionRequestRecord
): PendingApproval {
  const workflow = asRecord(request.metadata.workflow)
  const proposed = asRecord(request.metadata.proposedPayload)
  const isAiDraft =
    request.actionType === AI_TICKET_DRAFT_ACTION || workflow.origin === "ai"
  const kind: PendingApprovalKind = isAiDraft ? "ai_suggestion" : "action_request"
  const title = asText(request.title) || asText(proposed.title)
  const summary = asText(proposed.description)

  // AI-drafted service tickets are approved through the SAME actions PATCH the
  // ticket workspace uses: the draft materializes a ticket, so approval also
  // requires a responder, a version and an idempotency key. Decline is a plain
  // reject. (Bodies mirror dashboard/tickets/page.tsx exactly.)
  if (request.actionType === AI_TICKET_DRAFT_ACTION) {
    const approveKey = `ticket-action:${request.id}:approve`
    return {
      id: request.id,
      kind,
      title,
      summary,
      requestedBy: null,
      requestedAt: request.createdAt,
      decideVia: {
        endpoint: "/api/site-management/actions",
        method: "PATCH",
        approveRequiresResponder: true,
        approveHeaders: { "Idempotency-Key": approveKey },
        approveBody: {
          id: request.id,
          status: "approved",
          actionType: request.actionType,
          entityTable: request.entityTable,
          expectedVersion: "1",
          idempotencyKey: approveKey,
        },
        declineBody: {
          id: request.id,
          status: "rejected",
          actionType: request.actionType,
          entityTable: request.entityTable,
        },
      },
    }
  }

  // Every other human-approval-gated request (finance, access, SLA review, …)
  // approves or declines with a single actions PATCH and no extra input.
  return {
    id: request.id,
    kind,
    title,
    summary,
    requestedBy: null,
    requestedAt: request.createdAt,
    decideVia: {
      endpoint: "/api/site-management/actions",
      method: "PATCH",
      approveBody: {
        id: request.id,
        status: "approved",
        actionType: request.actionType,
        entityTable: request.entityTable,
      },
      declineBody: {
        id: request.id,
        status: "rejected",
        actionType: request.actionType,
        entityTable: request.entityTable,
      },
    },
  }
}

// Mirrors ticketWorkflowSnapshot's approval derivation: an explicit pending_owner
// approval state, or the legacy waiting_approval status, means owner/admin sign-off
// is outstanding.
function ticketAwaitsApproval(ticket: ServiceTicket): boolean {
  const approvalState =
    ticket.approvalStatus ??
    (ticket.status === "waiting_approval" ? "pending_owner" : "not_required")
  return approvalState === "pending_owner"
}

function ticketToPendingApproval(ticket: ServiceTicket): PendingApproval {
  const version = asText(ticket.version) || "1"
  const approveKey = `ticket-approval:${ticket.id}:${version}:approve`
  const declineKey = `ticket-approval:${ticket.id}:${version}:decline`

  // Owner-approval decisions go to the ticket workflow endpoint. `approvalStatus`
  // approved/rejected maps to the approve_owner_request / reject_owner_request
  // command server-side (commandFromPayload). Keys are stable per version so a
  // double-tap idempotently replays instead of double-applying.
  return {
    id: `ticket:${ticket.id}`,
    kind: "service_ticket",
    title: asText(ticket.title),
    summary: asText(ticket.description),
    requestedBy: asText(ticket.requester) || null,
    requestedAt: ticket.openedAt ?? null,
    decideVia: {
      endpoint: "/api/site-management/tickets",
      method: "PATCH",
      // Both sides need a reason: reject_owner_request is a reasonRequired
      // transition, and an admin approve/decline is an owner-approval override
      // the workflow also gates on a mandatory reason. The inbox merges the
      // admin's text into the PATCH body as `reason`.
      approveRequiresReason: true,
      declineRequiresReason: true,
      approveHeaders: { "Idempotency-Key": approveKey },
      declineHeaders: { "Idempotency-Key": declineKey },
      approveBody: {
        ticketId: ticket.id,
        approvalStatus: "approved",
        expectedVersion: version,
        idempotencyKey: approveKey,
      },
      declineBody: {
        ticketId: ticket.id,
        approvalStatus: "rejected",
        expectedVersion: version,
        idempotencyKey: declineKey,
      },
    },
  }
}

/**
 * The unified "Needs your approval" queue: every client-action request awaiting
 * a human decision plus every service ticket awaiting owner/admin approval,
 * normalized to PendingApproval. Reuses the canonical Supabase-first +
 * local-seed repositories so company scoping/RLS and the `source` disclosure are
 * inherited unchanged. The result is `source: "supabase"` only when BOTH reads
 * were live; any local-seed fallback downgrades the whole payload honestly.
 */
export async function getPendingApprovals(
  profile: UserProfile
): Promise<{ items: PendingApproval[]; source: DataSource }> {
  const useLocalAccessProfile = isLocalAccessProfile(profile)

  const [actions, ticketQueue] = await Promise.all([
    listPendingActionRequests({ useLocalAccessProfile }),
    getServiceTicketQueueData({
      limit: 100,
      allowLocalSeedFallback: useLocalAccessProfile,
      useLocalAccessProfile,
    }),
  ])

  const actionItems = actions.requests.map(actionRequestToPendingApproval)
  const ticketItems = ticketQueue.tickets
    .filter(ticketAwaitsApproval)
    .map(ticketToPendingApproval)

  const items = [...actionItems, ...ticketItems].sort((a, b) => {
    const left = a.requestedAt ? Date.parse(a.requestedAt) : 0
    const right = b.requestedAt ? Date.parse(b.requestedAt) : 0
    return right - left
  })

  const source: DataSource =
    actions.source === "supabase" && ticketQueue.source === "supabase"
      ? "supabase"
      : "local-seed"

  return { items, source }
}
