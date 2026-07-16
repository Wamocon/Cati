import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/00000000000020_role_relationship_ticket_workflow_hardening.sql"
  ),
  "utf8"
)

function functionBody(name: string) {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`)
  expect(start, `${name} exists`).toBeGreaterThanOrEqual(0)
  const end = migration.indexOf("\n$$;", start)
  expect(end, `${name} closes`).toBeGreaterThan(start)
  return migration.slice(start, end + 4)
}

function policyBody(name: string) {
  const start = migration.indexOf(`CREATE POLICY "${name}"`)
  expect(start, `${name} exists`).toBeGreaterThanOrEqual(0)
  const end = migration.indexOf(";", start)
  expect(end, `${name} closes`).toBeGreaterThan(start)
  return migration.slice(start, end + 1)
}

test.describe("Functional tests - ticket database security contract", () => {
  test("ticket reads use a role-safe projection and raw sensitive columns stay closed", () => {
    const safeRead = functionBody("read_service_ticket_queue_safe")

    expect(safeRead).toContain("current_user_can_view_service_ticket(t.id)")
    expect(safeRead).toContain("t.company_id = v_company_id")
    expect(safeRead).toContain("e.visibility = 'resident'")
    expect(safeRead).toContain("e.visibility = 'finance'")
    expect(safeRead).toContain("public.current_user_is_linked_resident(r.id)")
    expect(safeRead).toContain("LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 250)")

    expect(migration).toContain(
      "REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_tickets"
    )
    expect(migration).toContain(
      "REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE\n  public.service_ticket_events"
    )
    expect(migration).not.toContain(
      "GRANT SELECT ON TABLE public.service_tickets TO authenticated"
    )
    expect(migration).not.toContain(
      "GRANT SELECT ON TABLE public.service_ticket_events TO authenticated"
    )
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.read_service_ticket_queue_safe("
    )
  })

  test("resident and staff access requires live relationships and exact assignment", () => {
    const relationship = functionBody("profile_has_unit_relationship")
    const staffRead = functionBody("current_user_has_staff_ticket_access")
    const staffAction = functionBody("current_user_is_assigned_to_ticket")
    const serviceOrderPolicy = policyBody("Role scoped service order visibility")
    const taskPolicy = policyBody("Operational workforce task visibility")

    expect(relationship).toContain("r.status = 'active'")
    expect(relationship).toContain("l.valid_until IS NULL OR l.valid_until > NOW()")
    expect(relationship).toContain("ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE")
    expect(staffRead).toContain("t.assigned_to = (SELECT auth.uid())")
    expect(staffRead).toContain("w.assigned_staff_member_id = sm.id")
    expect(staffRead).not.toContain("w.assigned_staff_member_id IS NULL")
    expect(staffAction).toContain("sm.status = 'active'")
    expect(staffAction).not.toContain("'training'")
    expect(serviceOrderPolicy).not.toContain("= 'staff'")
    expect(taskPolicy).toContain("workforce_tasks.assigned_staff_member_id = sm.id")
    expect(taskPolicy).not.toContain("workforce_tasks.assigned_staff_member_id IS NULL")
  })

  test("ticket mutations are command-only, replay-safe and response-redacted", () => {
    expect(migration).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON TABLE\n  public.service_orders,\n  public.workforce_tasks"
    )
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Operational managers manage service orders"'
    )
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Operational manager workforce task management"'
    )

    for (const command of [
      "create_service_ticket_command",
      "transition_service_ticket_command",
      "assign_service_ticket_command",
      "decide_ticket_owner_approval_command",
      "execute_service_ticket_workflow_command",
      "update_service_ticket_details_command",
    ]) {
      const body = functionBody(command)
      expect(body, `${command} never returns its raw row`).not.toContain(
        "RETURN v_ticket;"
      )
      expect(body, `${command} uses the common response redactor`).toContain(
        "redact_service_ticket_for_current_user(v_ticket)"
      )
    }

    for (const command of [
      "assign_service_ticket_command",
      "decide_ticket_owner_approval_command",
      "execute_service_ticket_workflow_command",
      "update_service_ticket_details_command",
    ]) {
      const body = functionBody(command)
      expect(body.indexOf("v_existing_actor_id IS DISTINCT FROM v_actor_id")).toBeGreaterThan(
        body.indexOf("SELECT tr.ticket_id")
      )
      expect(body.indexOf("RETURN public.redact_service_ticket_for_current_user")).toBeGreaterThan(
        body.indexOf("v_existing_actor_id IS DISTINCT FROM v_actor_id")
      )
    }
  })

  test("emergency containment is never finance-blocked and event retries bind payload", () => {
    const create = functionBody("create_service_ticket_command")
    const financeColumn = create.indexOf("requires_finance_approval,")
    expect(financeColumn).toBeGreaterThanOrEqual(0)
    expect(create.slice(financeColumn, financeColumn + 1_200)).toContain("FALSE,")

    const financeCleared = functionBody("service_ticket_finance_cleared")
    expect(financeCleared).toContain(
      "t.emergency_classification = 'rule_matched_p0'"
    )

    const materialize = functionBody("materialize_ticket_execution_internal")
    expect(materialize).toContain(
      "v_finance_cleared := v_emergency_containment OR COALESCE("
    )
    expect(materialize).toContain(
      "WHEN v_emergency_containment THEN 'post_emergency_review'"
    )
    expect(materialize).not.toContain(
      "WHEN v_emergency_containment THEN 'debit_to_account'"
    )
    expect(materialize).not.toContain(
      "WHEN v_emergency_containment THEN 'hold'"
    )
    expect(materialize).toContain(
      "WHEN v_emergency_containment THEN 'clear'"
    )
    expect(materialize).toContain("'postEmergencyFinanceReviewRequired'")
    expect(materialize).toContain("'financeBlocksDispatch'")
    expect(materialize).not.toContain(
      "WHEN v_emergency_containment AND NOT v_finance_cleared THEN 'hold'"
    )
    expect(migration).toContain(
      "AND t.emergency_classification = 'rule_matched_p0';"
    )
    expect(migration).toContain("'post_emergency_review'\n  ));")
    expect(migration).toContain("ELSE 'post_emergency_review'\n  END,")

    const emergencyFinanceGuard = functionBody(
      "enforce_emergency_service_order_finance_guard"
    )
    expect(emergencyFinanceGuard).toContain(
      "NEW.payment_decision <> 'post_emergency_review'"
    )
    expect(emergencyFinanceGuard).toContain(
      "NEW.status IN ('payment_pending', 'blocked')"
    )
    expect(emergencyFinanceGuard).toContain("NEW.debt_check_status <> 'clear'")
    expect(emergencyFinanceGuard).toContain("'financeBlocksDispatch', FALSE")

    const append = functionBody("append_service_ticket_event_command")
    expect(append).toContain("extensions.digest(")
    expect(append).toContain("'actorProfileId', v_actor_id")
    expect(append).toContain("'body', BTRIM(p_body)")
    expect(append).toContain("'visibility', v_visibility")
    expect(append).toContain("v_existing_fingerprint IS DISTINCT FROM v_request_fingerprint")
    expect(append).toContain("v_existing_actor_id IS DISTINCT FROM v_actor_id")
  })
})
