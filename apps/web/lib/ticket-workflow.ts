import type { Role } from "./rbac"

export const ticketPrimaryStates = [
  "submitted",
  "triage",
  "accepted",
  "assigned",
  "acknowledged",
  "in_progress",
  "waiting_resident",
  "manager_review",
  "rework",
  "resolved",
  "closed",
  "cancelled",
] as const

export type TicketPrimaryState = (typeof ticketPrimaryStates)[number]

export const ticketApprovalStates = [
  "not_required",
  "pending_owner",
  "approved",
  "rejected",
] as const
export type TicketApprovalState = (typeof ticketApprovalStates)[number]

export const ticketDispatchStates = [
  "not_required",
  "pending",
  "assigned",
  "acknowledged",
  "en_route",
  "on_site",
  "completed",
  "failed",
] as const
export type TicketDispatchState = (typeof ticketDispatchStates)[number]

export const ticketPaymentStates = [
  "not_required",
  "pending",
  "paid",
  "waived",
  "post_emergency_review",
  "failed",
  "refunded",
] as const
export type TicketPaymentState = (typeof ticketPaymentStates)[number]

export const ticketSeverities = ["P0", "P1", "P2", "P3"] as const
export type TicketSeverity = (typeof ticketSeverities)[number]

export const ticketCommands = [
  "triage",
  "accept",
  "assign",
  "acknowledge",
  "start_work",
  "wait_for_resident",
  "resume_work",
  "submit_for_review",
  "approve_resolution",
  "request_rework",
  "close",
  "reopen",
  "cancel",
  "request_owner_approval",
  "approve_owner_request",
  "reject_owner_request",
] as const
export type TicketCommand = (typeof ticketCommands)[number]

export const ticketPrimaryStateLabels: Record<TicketPrimaryState, string> = {
  submitted: "Submitted",
  triage: "In triage",
  accepted: "Accepted",
  assigned: "Assigned",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  waiting_resident: "Waiting for resident",
  manager_review: "Manager review",
  rework: "Rework required",
  resolved: "Resolved",
  closed: "Closed",
  cancelled: "Cancelled",
}

export const ticketCommandLabels: Record<TicketCommand, string> = {
  triage: "Start triage",
  accept: "Accept request",
  assign: "Assign responder",
  acknowledge: "Acknowledge assignment",
  start_work: "Start work",
  wait_for_resident: "Wait for resident",
  resume_work: "Resume work",
  submit_for_review: "Submit for manager review",
  approve_resolution: "Approve resolution",
  request_rework: "Request rework",
  close: "Close ticket",
  reopen: "Reopen ticket",
  cancel: "Cancel ticket",
  request_owner_approval: "Request owner approval",
  approve_owner_request: "Approve owner request",
  reject_owner_request: "Reject owner request",
}

export const ticketRoleTransitionMatrix: Record<Role, readonly TicketCommand[]> = {
  admin: ticketCommands,
  manager: ticketCommands.filter(
    (command) => command !== "approve_owner_request" && command !== "reject_owner_request"
  ),
  accountant: [],
  staff: [
    "acknowledge",
    "start_work",
    "wait_for_resident",
    "resume_work",
    "submit_for_review",
  ],
  owner: ["reopen", "cancel", "approve_owner_request", "reject_owner_request"],
  tenant: ["reopen", "cancel"],
  // Additive Phase-1 roles have no ticket state-machine transitions yet. The
  // service_provider dispatch surface is defined in a later phase; keeping these
  // empty preserves the existing roles' transition behavior exactly.
  guest: [],
  service_provider: [],
  child_owner: [],
  child_tenant: [],
  child_guest: [],
}

export type TicketWorkflowErrorCode =
  | "TICKET_INVALID_COMMAND"
  | "TICKET_INVALID_TRANSITION"
  | "TICKET_TRANSITION_FORBIDDEN"
  | "TICKET_ASSIGNMENT_REQUIRED"
  | "TICKET_REASON_REQUIRED"
  | "TICKET_OWNER_APPROVAL_PENDING"
  | "TICKET_APPROVAL_NOT_PENDING"
  | "TICKET_APPROVAL_ALREADY_DECIDED"
  | "TICKET_APPROVAL_CONTEXT_INVALID"
  | "TICKET_APPROVAL_THRESHOLD_NOT_MET"
  | "TICKET_PAYMENT_PENDING"
  | "TICKET_EMERGENCY_DOWNGRADE_FORBIDDEN"
  | "TICKET_VERSION_INVALID"
  | "TICKET_VERSION_CONFLICT"
  | "TICKET_IDEMPOTENCY_KEY_INVALID"

export class TicketWorkflowError extends Error {
  constructor(
    readonly code: TicketWorkflowErrorCode,
    message: string,
    readonly httpStatus: number,
    readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "TicketWorkflowError"
  }
}

export interface TicketWorkflowSnapshot {
  id: string
  primaryState: TicketPrimaryState
  approvalState: TicketApprovalState
  dispatchState: TicketDispatchState
  paymentState: TicketPaymentState
  severity: TicketSeverity
  emergency: boolean
  priority: "low" | "medium" | "high" | "urgent"
  assignee: string | null
  version: string
  requesterRole?: string | null
}

export interface TicketTransitionContext {
  isRequester?: boolean
  isAssignedStaff?: boolean
  canDecideOwnerApproval?: boolean
  assignee?: string | null
  reason?: string | null
  ownerApprovalContext?: OwnerApprovalContext | null
}

export const ownerApprovalResponsibilities = ["owner", "shared"] as const
export type OwnerApprovalResponsibility = (typeof ownerApprovalResponsibilities)[number]

export const ownerApprovalPolicyCodes = ["resident_cost_approval_v1"] as const
export type OwnerApprovalPolicyCode = (typeof ownerApprovalPolicyCodes)[number]

export interface OwnerApprovalContext {
  responsibility: OwnerApprovalResponsibility
  policyCode: OwnerApprovalPolicyCode
  estimatedCostCents: number
  approvalThresholdCents: number
}

export function validateOwnerApprovalContext(value: unknown): OwnerApprovalContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TicketWorkflowError(
      "TICKET_APPROVAL_CONTEXT_INVALID",
      "Owner approval requires structured responsibility, policy, and cost evidence.",
      422
    )
  }
  const record = value as Record<string, unknown>
  const allowedKeys = new Set([
    "responsibility",
    "policyCode",
    "estimatedCostCents",
    "approvalThresholdCents",
  ])
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    throw new TicketWorkflowError(
      "TICKET_APPROVAL_CONTEXT_INVALID",
      "Owner approval context contains unsupported fields.",
      422
    )
  }
  if (!ownerApprovalResponsibilities.includes(record.responsibility as OwnerApprovalResponsibility)) {
    throw new TicketWorkflowError(
      "TICKET_APPROVAL_CONTEXT_INVALID",
      "Owner approval responsibility must be owner or shared.",
      422
    )
  }
  if (!ownerApprovalPolicyCodes.includes(record.policyCode as OwnerApprovalPolicyCode)) {
    throw new TicketWorkflowError(
      "TICKET_APPROVAL_CONTEXT_INVALID",
      "Owner approval policy code is not allowlisted.",
      422
    )
  }
  if (!Number.isSafeInteger(record.estimatedCostCents) || Number(record.estimatedCostCents) < 0) {
    throw new TicketWorkflowError(
      "TICKET_APPROVAL_CONTEXT_INVALID",
      "estimatedCostCents must be a non-negative integer.",
      422
    )
  }
  if (
    !Number.isSafeInteger(record.approvalThresholdCents) ||
    Number(record.approvalThresholdCents) < 0
  ) {
    throw new TicketWorkflowError(
      "TICKET_APPROVAL_CONTEXT_INVALID",
      "approvalThresholdCents must be a non-negative integer.",
      422
    )
  }
  const estimatedCostCents = Number(record.estimatedCostCents)
  const approvalThresholdCents = Number(record.approvalThresholdCents)
  if (estimatedCostCents < approvalThresholdCents) {
    throw new TicketWorkflowError(
      "TICKET_APPROVAL_THRESHOLD_NOT_MET",
      "The configured owner-approval threshold has not been met.",
      409,
      { estimatedCostCents, approvalThresholdCents }
    )
  }
  return {
    responsibility: record.responsibility as OwnerApprovalResponsibility,
    policyCode: record.policyCode as OwnerApprovalPolicyCode,
    estimatedCostCents,
    approvalThresholdCents,
  }
}

export interface TicketTransitionResult {
  command: TicketCommand
  previousState: TicketPrimaryState
  nextState: TicketPrimaryState
  approvalState: TicketApprovalState
  dispatchState: TicketDispatchState
  paymentState: TicketPaymentState
}

interface TransitionRule {
  from: readonly TicketPrimaryState[]
  to: TicketPrimaryState | ((current: TicketPrimaryState) => TicketPrimaryState)
  reasonRequired?: boolean
}

const transitionRules: Record<TicketCommand, TransitionRule> = {
  triage: { from: ["submitted"], to: "triage" },
  accept: { from: ["triage"], to: "accepted" },
  assign: { from: ["submitted", "triage", "accepted"], to: "assigned" },
  acknowledge: { from: ["assigned"], to: "acknowledged" },
  start_work: { from: ["assigned", "acknowledged"], to: "in_progress" },
  wait_for_resident: { from: ["in_progress"], to: "waiting_resident", reasonRequired: true },
  resume_work: { from: ["waiting_resident", "rework"], to: "in_progress" },
  submit_for_review: { from: ["in_progress"], to: "manager_review" },
  approve_resolution: { from: ["manager_review"], to: "resolved" },
  request_rework: { from: ["manager_review", "resolved"], to: "rework", reasonRequired: true },
  close: { from: ["resolved"], to: "closed" },
  reopen: {
    from: ["resolved", "closed", "cancelled"],
    to: (current) => current === "closed"
      ? "triage"
      : current === "cancelled"
        ? "submitted"
        : "rework",
    reasonRequired: true,
  },
  cancel: {
    from: [
      "submitted",
      "triage",
      "accepted",
      "assigned",
      "acknowledged",
      "in_progress",
      "waiting_resident",
      "manager_review",
      "rework",
      "resolved",
    ],
    to: "cancelled",
    reasonRequired: true,
  },
  request_owner_approval: {
    from: ["triage", "accepted"],
    to: (current) => current,
    reasonRequired: true,
  },
  approve_owner_request: {
    from: ["triage", "accepted"],
    to: (current) => current,
  },
  reject_owner_request: {
    from: ["triage", "accepted"],
    to: "triage",
    reasonRequired: true,
  },
}

export function isTicketCommand(value: unknown): value is TicketCommand {
  return typeof value === "string" && ticketCommands.includes(value as TicketCommand)
}

export function isTicketPrimaryState(value: unknown): value is TicketPrimaryState {
  return typeof value === "string" && ticketPrimaryStates.includes(value as TicketPrimaryState)
}

export function ticketSeverityForPriority(
  priority: TicketWorkflowSnapshot["priority"],
  emergency: boolean
): TicketSeverity {
  if (emergency) return "P0"
  if (priority === "urgent" || priority === "high") return "P1"
  if (priority === "medium") return "P2"
  return "P3"
}

export function primaryStateFromPersistedStatus(
  status: string,
  recordedState?: unknown
): TicketPrimaryState {
  if (isTicketPrimaryState(recordedState)) return recordedState
  if (status === "triage") return "triage"
  if (status === "assigned") return "assigned"
  if (status === "in_progress") return "in_progress"
  if (status === "resolved") return "manager_review"
  if (status === "closed") return "closed"
  if (status === "cancelled") return "cancelled"
  return "submitted"
}

export function persistedStatusForPrimaryState(state: TicketPrimaryState):
  | "open"
  | "triage"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed"
  | "cancelled" {
  if (state === "submitted") return "open"
  if (state === "triage" || state === "accepted") return "triage"
  if (state === "assigned" || state === "acknowledged") return "assigned"
  if (state === "in_progress" || state === "waiting_resident" || state === "rework") return "in_progress"
  if (state === "manager_review" || state === "resolved") return "resolved"
  return state
}

export function deriveDispatchState(
  state: TicketPrimaryState,
  assignee?: string | null,
  recordedState?: unknown
): TicketDispatchState {
  if (
    typeof recordedState === "string" &&
    ticketDispatchStates.includes(recordedState as TicketDispatchState)
  ) {
    return recordedState as TicketDispatchState
  }
  if (state === "acknowledged") return "acknowledged"
  if (state === "in_progress" || state === "waiting_resident" || state === "rework") return "on_site"
  if (state === "manager_review" || state === "resolved" || state === "closed") return "completed"
  if (state === "cancelled") return "failed"
  if (state === "assigned" && assignee && assignee !== "Operations queue") return "assigned"
  return state === "submitted" || state === "triage" || state === "accepted"
    ? "pending"
    : "not_required"
}

export function derivePaymentState(
  requiresFinanceApproval: boolean,
  emergency: boolean,
  recordedState?: unknown
): TicketPaymentState {
  if (
    emergency &&
    (requiresFinanceApproval ||
      recordedState === "pending" ||
      recordedState === "post_emergency_review")
  ) {
    return "post_emergency_review"
  }
  if (
    typeof recordedState === "string" &&
    ticketPaymentStates.includes(recordedState as TicketPaymentState)
  ) {
    return recordedState as TicketPaymentState
  }
  if (emergency && requiresFinanceApproval) return "post_emergency_review"
  if (emergency) return "not_required"
  return requiresFinanceApproval ? "pending" : "not_required"
}

function roleMayUseCommand(
  role: Role,
  command: TicketCommand,
  snapshot: TicketWorkflowSnapshot,
  context: TicketTransitionContext
) {
  if (!ticketRoleTransitionMatrix[role].includes(command)) return false
  if (command === "approve_owner_request" || command === "reject_owner_request") {
    return Boolean(context.canDecideOwnerApproval)
  }
  if ((role === "owner" || role === "tenant") && (command === "cancel" || command === "reopen")) {
    if (!context.isRequester) return false
    if (command === "cancel") {
      return ["submitted", "triage", "accepted"].includes(snapshot.primaryState)
    }
    return true
  }
  if (role === "staff") {
    return Boolean(
      context.isAssignedStaff &&
      snapshot.assignee &&
      !/queue\s*$/i.test(snapshot.assignee)
    )
  }
  return true
}

function transitionGateAllows(command: TicketCommand, snapshot: TicketWorkflowSnapshot) {
  if (
    command === "assign" &&
    !snapshot.emergency &&
    snapshot.primaryState !== "accepted"
  ) {
    return false
  }
  if (command === "request_owner_approval") {
    return !snapshot.emergency && snapshot.approvalState !== "pending_owner"
  }
  if (command === "approve_owner_request" || command === "reject_owner_request") {
    return snapshot.approvalState === "pending_owner" && !snapshot.emergency
  }
  if (
    (snapshot.approvalState === "pending_owner" || snapshot.approvalState === "rejected") &&
    ["assign", "acknowledge", "start_work"].includes(command)
  ) {
    return false
  }
  if (
    snapshot.paymentState === "pending" &&
    !snapshot.emergency &&
    ["assign", "acknowledge", "start_work"].includes(command)
  ) {
    return false
  }
  return true
}

export function allowedTicketTransitions(
  role: Role,
  snapshot: TicketWorkflowSnapshot,
  context: TicketTransitionContext = {}
): TicketCommand[] {
  return ticketCommands.filter((command) => {
    const rule = transitionRules[command]
    return rule.from.includes(snapshot.primaryState) &&
      roleMayUseCommand(role, command, snapshot, context) &&
      transitionGateAllows(command, snapshot)
  })
}

export function decideTicketTransition(
  role: Role,
  snapshot: TicketWorkflowSnapshot,
  command: TicketCommand,
  context: TicketTransitionContext = {}
): TicketTransitionResult {
  const rule = transitionRules[command]
  if (!rule.from.includes(snapshot.primaryState)) {
    throw new TicketWorkflowError(
      "TICKET_INVALID_TRANSITION",
      `The ${command} command is not valid while the ticket is ${snapshot.primaryState}.`,
      409,
      { command, currentState: snapshot.primaryState }
    )
  }
  if (!roleMayUseCommand(role, command, snapshot, context)) {
    throw new TicketWorkflowError(
      "TICKET_TRANSITION_FORBIDDEN",
      `The ${role} role is not allowed to run the ${command} command for this ticket.`,
      403,
      { command, role, currentState: snapshot.primaryState }
    )
  }
  if (
    command === "assign" &&
    !snapshot.emergency &&
    snapshot.primaryState !== "accepted"
  ) {
    throw new TicketWorkflowError(
      "TICKET_INVALID_TRANSITION",
      "Ordinary tickets must be accepted before assignment.",
      409,
      { command, currentState: snapshot.primaryState }
    )
  }
  if (command === "approve_owner_request" || command === "reject_owner_request") {
    if (snapshot.approvalState === "approved" || snapshot.approvalState === "rejected") {
      throw new TicketWorkflowError(
        "TICKET_APPROVAL_ALREADY_DECIDED",
        "This owner approval has already been decided.",
        409,
        { approvalState: snapshot.approvalState }
      )
    }
    if (snapshot.approvalState !== "pending_owner" || snapshot.emergency) {
      throw new TicketWorkflowError(
        "TICKET_APPROVAL_NOT_PENDING",
        "This ticket is not waiting for an owner approval decision.",
        409,
        { approvalState: snapshot.approvalState, emergency: snapshot.emergency }
      )
    }
  } else if (
    (snapshot.approvalState === "pending_owner" || snapshot.approvalState === "rejected") &&
    ["assign", "acknowledge", "start_work"].includes(command)
  ) {
    throw new TicketWorkflowError(
      "TICKET_OWNER_APPROVAL_PENDING",
      "Owner approval must be approved before ordinary operational dispatch.",
      409
    )
  }
  if (
    snapshot.paymentState === "pending" &&
    !snapshot.emergency &&
    ["assign", "acknowledge", "start_work"].includes(command)
  ) {
    throw new TicketWorkflowError(
      "TICKET_PAYMENT_PENDING",
      "The configured payment decision must complete before ordinary dispatch.",
      409
    )
  }
  if (
    command === "assign" &&
    (!context.assignee || ["Operations queue", "Operations triage queue"].includes(context.assignee))
  ) {
    throw new TicketWorkflowError(
      "TICKET_ASSIGNMENT_REQUIRED",
      "A valid responder or team is required before assignment.",
      422
    )
  }
  if (rule.reasonRequired && !context.reason?.trim()) {
    throw new TicketWorkflowError(
      "TICKET_REASON_REQUIRED",
      `A reason is required for the ${command} command.`,
      422,
      { command }
    )
  }
  if (
    role === "admin" &&
    (command === "approve_owner_request" || command === "reject_owner_request") &&
    !context.reason?.trim()
  ) {
    throw new TicketWorkflowError(
      "TICKET_REASON_REQUIRED",
      "An administrator must record a reason when overriding an owner approval decision.",
      422,
      { command }
    )
  }
  if (command === "request_owner_approval") {
    validateOwnerApprovalContext(context.ownerApprovalContext)
  }

  const nextState = typeof rule.to === "function" ? rule.to(snapshot.primaryState) : rule.to
  const approvalState = command === "approve_owner_request"
    ? "approved"
    : command === "reject_owner_request"
      ? "rejected"
      : command === "request_owner_approval"
        ? "pending_owner"
        : snapshot.approvalState
  const dispatchState = command === "assign"
    ? "assigned"
    : command === "acknowledge"
      ? "acknowledged"
      : command === "start_work"
        ? "on_site"
        : ["submit_for_review", "approve_resolution", "close"].includes(command)
          ? "completed"
          : command === "cancel"
            ? "failed"
            : command === "reject_owner_request"
              ? "pending"
            : snapshot.dispatchState

  return {
    command,
    previousState: snapshot.primaryState,
    nextState,
    approvalState,
    dispatchState,
    paymentState: snapshot.emergency && snapshot.paymentState === "pending"
      ? "post_emergency_review"
      : snapshot.paymentState,
  }
}

export function validateTicketPriorityChange(
  snapshot: TicketWorkflowSnapshot,
  nextPriority: TicketWorkflowSnapshot["priority"]
) {
  if (snapshot.emergency && nextPriority !== "urgent") {
    throw new TicketWorkflowError(
      "TICKET_EMERGENCY_DOWNGRADE_FORBIDDEN",
      "An emergency ticket cannot be downgraded through the ordinary ticket workflow.",
      409,
      { currentPriority: snapshot.priority, requestedPriority: nextPriority }
    )
  }
}

export function normalizeTicketVersion(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().replace(/^W\//, "").replace(/^"|"$/g, "")
  return normalized || null
}

export function validateExpectedTicketVersion(expectedVersion: unknown, currentVersion: string) {
  const expected = normalizeTicketVersion(expectedVersion)
  if (expectedVersion !== undefined && expectedVersion !== null && !expected) {
    throw new TicketWorkflowError(
      "TICKET_VERSION_INVALID",
      "expectedVersion must be a non-empty workflow version token.",
      400
    )
  }
  if (expected && expected !== currentVersion) {
    throw new TicketWorkflowError(
      "TICKET_VERSION_CONFLICT",
      "The ticket changed after it was loaded. Refresh it before retrying.",
      409,
      { expectedVersion: expected, currentVersion }
    )
  }
  return expected ?? currentVersion
}

export function normalizeTicketIdempotencyKey(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(value.trim())) {
    throw new TicketWorkflowError(
      "TICKET_IDEMPOTENCY_KEY_INVALID",
      "Idempotency-Key must contain 8 to 128 safe characters.",
      400
    )
  }
  return value.trim()
}

export function ticketWorkflowView(
  role: Role,
  snapshot: TicketWorkflowSnapshot,
  context: TicketTransitionContext = {}
) {
  const allowedTransitions = allowedTicketTransitions(role, snapshot, context)
  return {
    ...snapshot,
    stateLabel: ticketPrimaryStateLabels[snapshot.primaryState],
    allowedTransitions,
    allowedTransitionLabels: Object.fromEntries(
      allowedTransitions.map((command) => [command, ticketCommandLabels[command]])
    ),
  }
}
