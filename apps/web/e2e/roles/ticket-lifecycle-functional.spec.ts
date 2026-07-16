import { expect, test } from "@playwright/test"
import {
  allowedTicketTransitions,
  decideTicketTransition,
  derivePaymentState,
  normalizeTicketIdempotencyKey,
  ticketSeverityForPriority,
  TicketWorkflowError,
  validateExpectedTicketVersion,
  validateTicketPriorityChange,
  type TicketWorkflowSnapshot,
} from "../../lib/ticket-workflow"
import { resolveTicketRoute } from "../../lib/ticket-routing"
import { visibleTicketHistoryForRole } from "../../lib/ticket-history"
import type { ServiceTicketHistoryEvent } from "../../lib/site-management-data"

function ticketSnapshot(
  overrides: Partial<TicketWorkflowSnapshot> = {}
): TicketWorkflowSnapshot {
  return {
    id: "ticket-role-matrix",
    primaryState: "submitted",
    approvalState: "not_required",
    dispatchState: "pending",
    paymentState: "not_required",
    severity: "P2",
    emergency: false,
    priority: "medium",
    assignee: "Operations triage queue",
    version: "version-7",
    requesterRole: "tenant",
    ...overrides,
  }
}

function expectWorkflowError(
  operation: () => unknown,
  code: TicketWorkflowError["code"]
) {
  try {
    operation()
  } catch (error) {
    expect(error).toBeInstanceOf(TicketWorkflowError)
    expect((error as TicketWorkflowError).code).toBe(code)
    return
  }
  throw new Error(`Expected ${code}, but the workflow operation succeeded.`)
}

test.describe("Functional tests - role-scoped ticket lifecycle", () => {
  test("new portal tickets are authoritative and role actions are least-privilege", () => {
    const submitted = ticketSnapshot()

    expect(allowedTicketTransitions("manager", submitted)).toEqual([
      "triage",
      "cancel",
    ])
    expect(allowedTicketTransitions("accountant", submitted)).toEqual([])
    expect(allowedTicketTransitions("staff", submitted)).toEqual([])
    expect(
      allowedTicketTransitions("tenant", submitted, { isRequester: true })
    ).toEqual(["cancel"])
    expect(
      allowedTicketTransitions("tenant", submitted, { isRequester: false })
    ).toEqual([])
    expect(
      allowedTicketTransitions("owner", submitted, { isRequester: false })
    ).toEqual([])
  })

  test("manager requests owner approval only after triage and owner decides it", () => {
    const triaged = ticketSnapshot({
      primaryState: "triage",
      assignee: "Teknik - Burak",
    })

    expect(allowedTicketTransitions("manager", triaged)).toContain(
      "request_owner_approval"
    )
    expectWorkflowError(
      () => decideTicketTransition("manager", triaged, "request_owner_approval"),
      "TICKET_REASON_REQUIRED"
    )
    expectWorkflowError(
      () =>
        decideTicketTransition(
          "manager",
          triaged,
          "request_owner_approval",
          {
            reason: "The quote is below the configured approval threshold.",
            ownerApprovalContext: {
              responsibility: "owner",
              policyCode: "resident_cost_approval_v1",
              estimatedCostCents: 10_000,
              approvalThresholdCents: 25_000,
            },
          }
        ),
      "TICKET_APPROVAL_THRESHOLD_NOT_MET"
    )

    const requested = decideTicketTransition(
      "manager",
      triaged,
      "request_owner_approval",
      {
        reason: "Cost exceeds the configured owner-approval threshold.",
        ownerApprovalContext: {
          responsibility: "owner",
          policyCode: "resident_cost_approval_v1",
          estimatedCostCents: 45_000,
          approvalThresholdCents: 25_000,
        },
      }
    )
    expect(requested.nextState).toBe("triage")
    expect(requested.approvalState).toBe("pending_owner")

    const pendingOwner = ticketSnapshot({
      primaryState: "triage",
      approvalState: "pending_owner",
      assignee: "Teknik - Burak",
    })
    expect(allowedTicketTransitions("manager", pendingOwner)).not.toContain("assign")
    expect(
      allowedTicketTransitions("owner", pendingOwner, {
        canDecideOwnerApproval: true,
      })
    ).toEqual(["approve_owner_request", "reject_owner_request"])

    const approved = decideTicketTransition(
      "owner",
      pendingOwner,
      "approve_owner_request",
      { canDecideOwnerApproval: true }
    )
    expect(approved.nextState).toBe("triage")
    expect(approved.approvalState).toBe("approved")

    const rejected = decideTicketTransition(
      "owner",
      pendingOwner,
      "reject_owner_request",
      {
        canDecideOwnerApproval: true,
        reason: "The quoted cost is not approved.",
      }
    )
    expect(rejected.nextState).toBe("triage")
    expect(rejected.approvalState).toBe("rejected")
    expect(rejected.dispatchState).toBe("pending")

    const rejectedAfterAcceptance = decideTicketTransition(
      "owner",
      ticketSnapshot({
        primaryState: "accepted",
        approvalState: "pending_owner",
        dispatchState: "pending",
        assignee: "Operations triage queue",
      }),
      "reject_owner_request",
      {
        canDecideOwnerApproval: true,
        reason: "The accepted scope still exceeds the approved cost.",
      }
    )
    expect(rejectedAfterAcceptance.nextState).toBe("triage")
    expect(rejectedAfterAcceptance.approvalState).toBe("rejected")
    expect(rejectedAfterAcceptance.dispatchState).toBe("pending")

    const rejectedSnapshot = ticketSnapshot({
      primaryState: "triage",
      approvalState: "rejected",
      dispatchState: "pending",
      assignee: "Operations triage queue",
    })
    expect(allowedTicketTransitions("manager", rejectedSnapshot)).toContain(
      "request_owner_approval"
    )
    expect(
      decideTicketTransition(
        "manager",
        rejectedSnapshot,
        "request_owner_approval",
        {
          reason: "A revised scope and price now require a new decision.",
          ownerApprovalContext: {
            responsibility: "shared",
            policyCode: "resident_cost_approval_v1",
            estimatedCostCents: 32_000,
            approvalThresholdCents: 25_000,
          },
        }
      ).approvalState
    ).toBe("pending_owner")

    expectWorkflowError(
      () =>
        decideTicketTransition("admin", pendingOwner, "approve_owner_request", {
          canDecideOwnerApproval: true,
        }),
      "TICKET_REASON_REQUIRED"
    )
    expect(
      decideTicketTransition("admin", pendingOwner, "approve_owner_request", {
        canDecideOwnerApproval: true,
        reason: "Organization admin override after documented policy review.",
      }).approvalState
    ).toBe("approved")

    expectWorkflowError(
      () =>
        decideTicketTransition("owner", pendingOwner, "reject_owner_request", {
          canDecideOwnerApproval: true,
        }),
      "TICKET_REASON_REQUIRED"
    )
  })

  test("assigned field staff can acknowledge, work, and submit without management powers", () => {
    const assigned = ticketSnapshot({
      primaryState: "assigned",
      dispatchState: "assigned",
      assignee: "Teknik - Burak",
    })
    const unassigned = ticketSnapshot({
      primaryState: "assigned",
      dispatchState: "pending",
      assignee: "Operations triage queue",
    })

    expect(
      allowedTicketTransitions("staff", assigned, { isAssignedStaff: true })
    ).toEqual([
      "acknowledge",
      "start_work",
    ])
    expect(
      allowedTicketTransitions("staff", unassigned, { isAssignedStaff: false })
    ).toEqual([])

    const acknowledged = decideTicketTransition("staff", assigned, "acknowledge", {
      isAssignedStaff: true,
    })
    expect(acknowledged.nextState).toBe("acknowledged")
    expect(acknowledged.dispatchState).toBe("acknowledged")

    const started = decideTicketTransition(
      "staff",
      ticketSnapshot({
        primaryState: "acknowledged",
        dispatchState: "acknowledged",
        assignee: "Teknik - Burak",
      }),
      "start_work",
      { isAssignedStaff: true }
    )
    expect(started.nextState).toBe("in_progress")
    expect(started.dispatchState).toBe("on_site")

    const rework = ticketSnapshot({
      primaryState: "rework",
      dispatchState: "on_site",
      assignee: "Teknik - Burak",
    })
    expect(
      allowedTicketTransitions("staff", rework, { isAssignedStaff: true })
    ).toEqual(["resume_work"])
    expect(
      decideTicketTransition("staff", rework, "resume_work", {
        isAssignedStaff: true,
      }).nextState
    ).toBe("in_progress")

    const waitingResident = ticketSnapshot({
      primaryState: "waiting_resident",
      dispatchState: "on_site",
      assignee: "Teknik - Burak",
    })
    expect(
      allowedTicketTransitions("staff", waitingResident, {
        isAssignedStaff: true,
      })
    ).toEqual(["resume_work"])
  })

  test("resident reopens a resolved own ticket only with a reason", () => {
    const resolved = ticketSnapshot({
      primaryState: "resolved",
      dispatchState: "completed",
    })

    expect(
      allowedTicketTransitions("tenant", resolved, { isRequester: true })
    ).toEqual(["reopen"])
    expectWorkflowError(
      () =>
        decideTicketTransition("tenant", resolved, "reopen", {
          isRequester: true,
        }),
      "TICKET_REASON_REQUIRED"
    )
    expect(
      decideTicketTransition("tenant", resolved, "reopen", {
        isRequester: true,
        reason: "The leak returned after the visit.",
      }).nextState
    ).toBe("rework")
  })

  test("resident cancellation is limited to intake before operational assignment", () => {
    const submitted = ticketSnapshot({ primaryState: "submitted" })
    const assigned = ticketSnapshot({
      primaryState: "assigned",
      dispatchState: "assigned",
      assignee: "Teknik - Burak",
    })

    expect(
      allowedTicketTransitions("tenant", submitted, { isRequester: true })
    ).toContain("cancel")
    expect(
      allowedTicketTransitions("tenant", assigned, { isRequester: true })
    ).not.toContain("cancel")
    expectWorkflowError(
      () =>
        decideTicketTransition("tenant", assigned, "cancel", {
          isRequester: true,
          reason: "Please cancel this assigned job.",
        }),
      "TICKET_TRANSITION_FORBIDDEN"
    )
  })

  test("emergency tickets bypass ordinary approval/payment gates but cannot be downgraded", () => {
    const emergency = ticketSnapshot({
      emergency: true,
      priority: "urgent",
      severity: ticketSeverityForPriority("urgent", true),
      paymentState: "pending",
    })

    expect(emergency.severity).toBe("P0")
    expect(allowedTicketTransitions("manager", emergency)).toContain("assign")
    expect(allowedTicketTransitions("manager", emergency)).not.toContain(
      "request_owner_approval"
    )
    expect(
      decideTicketTransition("manager", emergency, "assign", {
        assignee: "Guvenlik - Selim",
      }).paymentState
    ).toBe("post_emergency_review")
    expect(derivePaymentState(true, true, "not_required")).toBe(
      "post_emergency_review"
    )
    expectWorkflowError(
      () => validateTicketPriorityChange(emergency, "high"),
      "TICKET_EMERGENCY_DOWNGRADE_FORBIDDEN"
    )
  })

  test("only deterministic emergency evidence becomes P0", () => {
    const reportedUrgent = resolveTicketRoute({
      title: "Please review this urgently",
      description: "No deterministic life-safety condition was reported.",
      category: "maintenance",
      priority: "urgent",
    })
    expect(reportedUrgent.emergency).toBe(false)
    expect(reportedUrgent.confidence).toBe("reported")
    expect(ticketSeverityForPriority("urgent", reportedUrgent.emergency)).toBe("P1")

    const medicalEmergency = resolveTicketRoute({
      title: "Person not breathing in the lobby",
      priority: "urgent",
    })
    expect(medicalEmergency.emergency).toBe(true)
    expect(medicalEmergency.emergencyPolicyCode).toBe("medical_emergency")
    expect(ticketSeverityForPriority("urgent", medicalEmergency.emergency)).toBe("P0")
    expect(medicalEmergency.autoDispatchAuthorized).toBe(false)

    const confirmedGasLeak = resolveTicketRoute({
      title: "This is not a drill: gas leak in the lobby",
      priority: "urgent",
    })
    expect(confirmedGasLeak.emergency).toBe(true)
    expect(confirmedGasLeak.emergencyPolicyCode).toBe("gas_leak")
    expect(confirmedGasLeak.autoDispatchAuthorized).toBe(false)

    const activeSmokeAlarm = resolveTicketRoute({
      title: "Smoke alarm is sounding with visible smoke in the corridor",
      priority: "urgent",
    })
    expect(activeSmokeAlarm.emergency).toBe(true)
    expect(activeSmokeAlarm.emergencyPolicyCode).toBe("fire_smoke")

    for (const benignText of [
      "Person is not unconscious and is breathing normally",
      "No fire now; the historical smoke alarm test is complete",
      "Smoke alarm battery is low",
      "Scheduled fire drill and smoke alarm test",
      "False alarm report: no active smoke",
      "Elevator maintenance is requested; nobody is trapped",
      "Please review ordinary door access for next week",
    ]) {
      const route = resolveTicketRoute({ title: benignText, priority: "medium" })
      expect(route.emergency, benignText).toBe(false)
      expect(route.emergencyPolicyCode, benignText).toBeNull()
    }
  })

  test("optimistic versions and idempotency keys reject stale or unsafe mutations", () => {
    expect(validateExpectedTicketVersion('W/"version-7"', "version-7")).toBe(
      "version-7"
    )
    expect(validateExpectedTicketVersion(undefined, "version-7")).toBe("version-7")
    expectWorkflowError(
      () => validateExpectedTicketVersion("version-6", "version-7"),
      "TICKET_VERSION_CONFLICT"
    )
    expectWorkflowError(
      () => normalizeTicketIdempotencyKey("short"),
      "TICKET_IDEMPOTENCY_KEY_INVALID"
    )
    expect(normalizeTicketIdempotencyKey("ticket:role-matrix:0001")).toBe(
      "ticket:role-matrix:0001"
    )
  })

  test("ticket history is independently redacted by role and fails closed", () => {
    const history: ServiceTicketHistoryEvent[] = [
      {
        id: "resident-event",
        type: "ticket_created",
        message: "Private triage wording must not cross the API boundary",
        occurredAt: "2026-07-13T10:00:00.000Z",
        audience: "resident",
      },
      {
        id: "internal-event",
        type: "internal_note",
        message: "Internal operating note",
        occurredAt: "2026-07-13T10:01:00.000Z",
        audience: "internal",
      },
      {
        id: "finance-event",
        type: "finance_note",
        message: "Finance-only decision",
        occurredAt: "2026-07-13T10:02:00.000Z",
        audience: "finance",
      },
      {
        id: "legacy-unclassified-event",
        type: "legacy_note",
        message: "Unknown legacy visibility",
        occurredAt: "2026-07-13T10:03:00.000Z",
      },
    ]
    const idsFor = (role: Parameters<typeof visibleTicketHistoryForRole>[0]) =>
      visibleTicketHistoryForRole(role, history).map((event) => event.id)

    expect(idsFor("tenant")).toEqual(["resident-event"])
    expect(idsFor("owner")).toEqual(["resident-event"])
    expect(visibleTicketHistoryForRole("tenant", history)[0]?.message).toBe(
      "Service request received."
    )
    expect(idsFor("staff")).toEqual(["resident-event", "internal-event"])
    expect(idsFor("accountant")).toEqual(["finance-event"])
    expect(idsFor("manager")).toEqual([
      "resident-event",
      "internal-event",
      "finance-event",
      "legacy-unclassified-event",
    ])
    expect(
      visibleTicketHistoryForRole("tenant", history).every(
        (event) => !("audience" in event)
      )
    ).toBe(true)
  })

})
