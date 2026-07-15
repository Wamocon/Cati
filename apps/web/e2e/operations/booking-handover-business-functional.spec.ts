import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  expect,
  test,
  type Locator,
  type Page,
  type Route,
} from "@playwright/test"
import { openDashboardAs } from "../support/flows"

const sourcePaths = {
  m32: resolve(
    process.cwd(),
    "../../supabase/migrations/00000000000032_booking_resource_lifecycle.sql"
  ),
  m33: resolve(
    process.cwd(),
    "../../supabase/migrations/00000000000033_move_handover_workflow.sql"
  ),
  m35: resolve(
    process.cwd(),
    "../../supabase/migrations/00000000000035_offline_sync_commands.sql"
  ),
  rbac: resolve(process.cwd(), "lib/rbac.ts"),
  offlineRepository: resolve(process.cwd(), "lib/offline-sync-repository.ts"),
  offlineExperience: resolve(
    process.cwd(),
    "components/offline-sync/offline-experience.tsx"
  ),
  residentTabs: resolve(
    process.cwd(),
    "components/booking-lifecycle/resident-journey-tabs.tsx"
  ),
  bookingExperience: resolve(
    process.cwd(),
    "components/booking-lifecycle/booking-lifecycle-experience.tsx"
  ),
  handoverExperience: resolve(
    process.cwd(),
    "components/booking-lifecycle/move-handover-experience.tsx"
  ),
  calendarSharing: resolve(
    process.cwd(),
    "components/booking-lifecycle/calendar-interoperability.tsx"
  ),
} as const

type SourceName = keyof typeof sourcePaths
type JsonRecord = Record<string, unknown>
type HandoverCapabilities = {
  canCreate: boolean
  canReschedule: boolean
  canCancel: boolean
  canOperate: boolean
  canPrepareAccess: boolean
  canApproveAccess: boolean
  canLinkDeposit: boolean
}
type CapturedMutation = {
  body: JsonRecord
  idempotencyKey: string | undefined
}

const IDS = {
  site: "18000000-0000-4000-8000-000000000001",
  unit: "18000000-0000-4000-8000-000000000002",
  resident: "18000000-0000-4000-8000-000000000003",
  resource: "18000000-0000-4000-8000-000000000004",
  hold: "18000000-0000-4000-8000-000000000005",
  reservation: "18000000-0000-4000-8000-000000000006",
  relationship: "18000000-0000-4000-8000-000000000007",
  appointment: "18000000-0000-4000-8000-000000000008",
  checklist: "18000000-0000-4000-8000-000000000009",
  access: "18000000-0000-4000-8000-000000000010",
  deposit: "18000000-0000-4000-8000-000000000011",
} as const

const STARTS_AT = "2026-08-18T07:00:00.000Z"
const ENDS_AT = "2026-08-18T08:00:00.000Z"

const managerCapabilities: HandoverCapabilities = {
  canCreate: true,
  canReschedule: true,
  canCancel: true,
  canOperate: true,
  canPrepareAccess: true,
  canApproveAccess: true,
  canLinkDeposit: false,
}

const staffCapabilities: HandoverCapabilities = {
  ...managerCapabilities,
  canApproveAccess: false,
}

const ownerCapabilities: HandoverCapabilities = {
  canCreate: true,
  canReschedule: true,
  canCancel: true,
  canOperate: false,
  canPrepareAccess: false,
  canApproveAccess: false,
  canLinkDeposit: false,
}

const tenantCapabilities: HandoverCapabilities = {
  ...ownerCapabilities,
}

function readSource(name: SourceName): string {
  return readFileSync(sourcePaths[name], "utf8")
}

function sqlFunction(sql: string, name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}(`
  const start = sql.indexOf(marker)
  if (start < 0) throw new Error(`SQL function ${name} was not found.`)
  const end = sql.indexOf("$$;", start)
  if (end < 0) throw new Error(`SQL function ${name} is not terminated.`)
  return sql.slice(start, end + 3)
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function expectInOrder(source: string, markers: string[]): void {
  let cursor = -1
  for (const marker of markers) {
    const index = source.indexOf(marker, cursor + 1)
    expect(
      index,
      `Expected marker after index ${cursor}: ${marker}`
    ).toBeGreaterThan(cursor)
    cursor = index
  }
}

function bookingWorkspace(
  role: string,
  holds: JsonRecord[] = [],
  bookings: JsonRecord[] = []
) {
  return {
    contractVersion: "booking-lifecycle.v1",
    generatedAt: new Date().toISOString(),
    scope: {
      siteId: IDS.site,
      siteName: "UC18 Residence",
      siteCode: "UC18",
      role,
    },
    resources: [
      {
        id: IDS.resource,
        siteId: IDS.site,
        name: "Taşınma yükleme alanı",
        typeName: "Taşınma alanı",
        category: "move_loading_slot",
        description: "UC18 managed move slot",
        timezone: "Europe/Istanbul",
        commissioningState: "active",
        capacity: 1,
        defaultDurationMinutes: 60,
        approvalRequirement: "manager",
        priceTruth: "free",
        depositTruth: "not_required",
        currency: "TRY",
      },
    ],
    eligibleUnits: [{ id: IDS.unit, siteId: IDS.site, label: "A-018" }],
    eligibleResidents: [
      { id: IDS.resident, unitId: IDS.unit, label: "UC18 Sakin" },
    ],
    holds,
    bookings,
    waitlist: [],
    tasks: [],
    blackouts: [],
  }
}

function handoverAppointment(version = 1): JsonRecord {
  return {
    id: IDS.appointment,
    siteId: IDS.site,
    unitId: IDS.unit,
    residentId: IDS.resident,
    relationshipId: IDS.relationship,
    reservationId: IDS.reservation,
    appointmentKind: "move_in",
    relationshipSnapshot: "tenant",
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    status: "scheduled",
    version,
  }
}

function handoverChecklist(): JsonRecord[] {
  return [
    "identity_confirmed",
    "documents_reviewed",
    "access_prepared",
    "meter_readings",
    "keys_handed_over",
  ].map((itemCode, index) => ({
    id: `${IDS.checklist.slice(0, -1)}${index}`,
    appointmentId: IDS.appointment,
    itemCode,
    required: true,
    status: "pending",
    version: 1,
  }))
}

function handoverWorkspace(input: {
  role: string
  capabilities: HandoverCapabilities
  financeOnly?: boolean
  candidates?: {
    relationships: JsonRecord[]
    reservations: JsonRecord[]
    documents: JsonRecord[]
  }
  appointments?: JsonRecord[]
  checklistItems?: JsonRecord[]
  accessRequests?: JsonRecord[]
  depositSettlements?: JsonRecord[]
}) {
  return {
    contractVersion: "move-handover.v1",
    generatedAt: new Date().toISOString(),
    scope: {
      siteId: IDS.site,
      role: input.role,
      financeOnly: input.financeOnly ?? false,
      capabilities: input.capabilities,
    },
    candidates: input.candidates ?? {
      relationships: [],
      reservations: [],
      documents: [],
    },
    appointments: input.appointments ?? [handoverAppointment()],
    checklistItems: input.checklistItems ?? handoverChecklist(),
    evidence: [],
    meterReadings: [],
    conditionItems: [],
    turnoverWorkItems: [],
    accessRequests: input.accessRequests ?? [],
    depositSettlements: input.depositSettlements ?? [],
    events: [],
  }
}

async function fulfillJson(
  route: Route,
  payload: unknown,
  status = 200
): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  })
}

async function installEmptyBookingRoute(
  page: Page,
  role: string
): Promise<void> {
  await page.route(
    "**/api/site-management/booking-lifecycle**",
    async (route) => fulfillJson(route, bookingWorkspace(role))
  )
}

async function installRoleHandoverRoute(
  page: Page,
  role: string,
  capabilities: HandoverCapabilities
): Promise<CapturedMutation[]> {
  const mutations: CapturedMutation[] = []
  let version = 1
  let accessRequests: JsonRecord[] = []

  await page.route("**/api/site-management/move-handover**", async (route) => {
    const request = route.request()
    if (request.method() === "GET") {
      await fulfillJson(
        route,
        handoverWorkspace({
          role,
          capabilities,
          appointments: [handoverAppointment(version)],
          accessRequests,
        })
      )
      return
    }

    const body = request.postDataJSON() as JsonRecord
    mutations.push({
      body,
      idempotencyKey: request.headers()["idempotency-key"],
    })
    if (body.action === "access.prepare") {
      version += 1
      accessRequests = [
        {
          id: IDS.access,
          appointmentId: IDS.appointment,
          credentialType: body.accessType,
          preparationTruth: body.truthState,
        },
      ]
    }
    await fulfillJson(route, {
      entityId: IDS.appointment,
      appointmentId: IDS.appointment,
      version,
      state: "scheduled",
      replayed: false,
    })
  })
  return mutations
}

async function openAppointmentActions(page: Page): Promise<Locator> {
  const row = page.locator(
    `[data-testid="handover-appointment-row"][data-appointment-id="${IDS.appointment}"]`
  )
  await expect(row).toBeVisible()
  await row.locator("summary").click()
  return row
}

test.describe("UC18 booking, handover and offline static business contracts", () => {
  test("M32 carries a resident hold into a confirmed reservation that M33 can offer as a candidate", () => {
    const m32 = readSource("m32")
    const m33 = readSource("m33")
    const createHold = sqlFunction(m32, "create_booking_hold_command")
    const commitHold = sqlFunction(m32, "commit_resource_booking_command")
    const decideBooking = sqlFunction(m32, "decide_resource_booking_command")
    const actorEligibility = compact(
      sqlFunction(m32, "booking_actor_can_request")
    )
    const resourceVisibility = compact(
      sqlFunction(m32, "current_user_can_view_bookable_resource")
    )
    const waitlistEligibility = compact(
      sqlFunction(m32, "booking_offer_waitlist_internal")
    )
    const bookingWorkspace = compact(
      sqlFunction(m32, "booking_lifecycle_workspace")
    )
    const partyScope = compact(sqlFunction(m32, "booking_assert_party_scope"))
    const workspace = sqlFunction(m33, "move_handover_workspace")

    expect(compact(createHold)).toContain(
      "IF p_unit_id IS NULL OR p_resident_id IS NULL THEN"
    )
    expect(createHold).toMatch(
      /INSERT INTO public\.booking_holds[\s\S]*p_unit_id\s*,\s*p_resident_id/i
    )
    expect(compact(commitHold)).toContain(
      "IF v_hold.unit_id IS NULL OR v_hold.resident_id IS NULL THEN"
    )
    expect(commitHold).toMatch(
      /INSERT INTO public\.reservations[\s\S]*v_hold\.unit_id\s*,\s*v_hold\.resident_id/i
    )
    expect(commitHold).toMatch(
      /v_lifecycle\s*:=\s*CASE[\s\S]*THEN\s+'confirmed'[\s\S]*ELSE\s+'requested'/i
    )
    expect(decideBooking).toMatch(
      /ELSE[\s\S]*SET approval_state = 'approved'[\s\S]*lifecycle_status = CASE[\s\S]*THEN 'confirmed'/i
    )
    expect(resourceVisibility).not.toContain("current_user_can_view_site")
    expect(resourceVisibility).toContain(
      "public.current_user_profile_role() IN ('owner', 'tenant')"
    )
    expect(resourceVisibility).toContain(
      "actor_relation.resident_id = public.current_user_linked_resident_id()"
    )
    expect(resourceVisibility).toContain(
      "actor_relation.relationship = public.current_user_profile_role()"
    )
    expect(resourceVisibility).toContain(
      "actor_relation.end_date >= CURRENT_DATE"
    )
    expect(resourceVisibility).toContain(
      "public.current_user_has_tenant_module_access( actor_relation.unit_id, 'calendar' )"
    )
    expect(actorEligibility).toContain(
      "actor_relation.resident_id = public.current_user_linked_resident_id()"
    )
    expect(actorEligibility).toContain(
      "actor_relation.relationship = v_entitlement.relationship"
    )
    expect(actorEligibility).toContain(
      "public.current_user_has_tenant_module_access(p_unit_id, 'calendar')"
    )
    expect(createHold).toMatch(
      /booking_actor_can_request\s*\(\s*p_resource_id\s*,\s*p_unit_id\s*,\s*p_resident_id\s*\)/i
    )
    expect(createHold).toMatch(
      /FROM public\.unit_residents ur[\s\S]*ur\.resident_id\s*=\s*p_resident_id[\s\S]*ur\.start_date[\s\S]*p_starts_at AT TIME ZONE v_resource\.timezone[\s\S]*ur\.end_date[\s\S]*p_starts_at AT TIME ZONE v_resource\.timezone[\s\S]*booking resident relationship is not valid for the requested date/i
    )
    expect(createHold).toMatch(
      /FROM public\.unit_residents actor_relation[\s\S]*current_user_linked_resident_id\(\)[\s\S]*actor_relation\.relationship\s*=\s*v_role[\s\S]*actor_relation\.start_date[\s\S]*p_starts_at AT TIME ZONE v_resource\.timezone[\s\S]*actor_relation\.end_date[\s\S]*p_starts_at AT TIME ZONE v_resource\.timezone[\s\S]*booking actor relationship is not valid for the requested date/i
    )
    expect(waitlistEligibility).not.toMatch(/CURRENT_DATE/i)
    expect(waitlistEligibility).toMatch(
      /ur\.start_date[\s\S]*v_entry\.starts_at AT TIME ZONE v_resource\.timezone[\s\S]*ur\.end_date[\s\S]*v_entry\.starts_at AT TIME ZONE v_resource\.timezone/i
    )
    expect(partyScope).toMatch(
      /ur\.start_date[\s\S]*NEW\.starts_at AT TIME ZONE 'Europe\/Istanbul'[\s\S]*ur\.end_date[\s\S]*NEW\.starts_at AT TIME ZONE 'Europe\/Istanbul'/i
    )
    expect(bookingWorkspace).toContain(
      "actor_relation.resident_id = public.current_user_linked_resident_id()"
    )
    expect(bookingWorkspace).toContain(
      "actor_relation.end_date >= CURRENT_DATE"
    )
    expect(bookingWorkspace).toContain("ur.end_date >= CURRENT_DATE")
    expect(bookingWorkspace).not.toMatch(
      /ur\.start_date[\s\S]{0,120}CURRENT_DATE/i
    )
    expect(workspace).toMatch(/r\.lifecycle_status\s*=\s*'confirmed'/i)
    expect(workspace).toMatch(/r\.resident_id\s+IS\s+NOT\s+NULL/i)
    expect(workspace).toMatch(
      /rt\.category\s+IN\s*\(\s*'move_loading_slot'\s*,\s*'handover_appointment'\s*\)/i
    )
    expect(workspace).toMatch(
      /JOIN public\.reservations r[\s\S]*r\.unit_id\s*=\s*ur\.unit_id[\s\S]*r\.resident_id\s*=\s*ur\.resident_id/i
    )
    expect(workspace).toMatch(
      /ur\.start_date[\s\S]*r\.check_in_at[\s\S]*ur\.end_date[\s\S]*r\.check_in_at/i
    )
    expect(workspace).toMatch(
      /NOT EXISTS\s*\([\s\S]*public\.move_handover_appointments[\s\S]*a\.reservation_id\s*=\s*r\.id/i
    )
  })

  test("M33 fixes access values and enforces the checklist and key-handover sequence", () => {
    const m33 = readSource("m33")
    const activeAccessIndexStart = m33.indexOf(
      "CREATE UNIQUE INDEX access_handoff_appointment_active"
    )
    const activeAccessIndexEnd = m33.indexOf(";", activeAccessIndexStart)
    const create = compact(sqlFunction(m33, "create_move_handover_command"))
    const transition = compact(
      sqlFunction(m33, "transition_move_handover_command")
    )
    const checklist = compact(
      sqlFunction(m33, "update_move_handover_checklist_command")
    )
    const access = compact(
      sqlFunction(m33, "prepare_move_handover_access_command")
    )
    const invalidateAccess = compact(
      sqlFunction(m33, "move_handover_invalidate_access")
    )

    expect(activeAccessIndexStart).toBeGreaterThan(-1)
    expect(activeAccessIndexEnd).toBeGreaterThan(activeAccessIndexStart)
    const activeAccessIndex = m33.slice(
      activeAccessIndexStart,
      activeAccessIndexEnd
    )
    expect(activeAccessIndex).toMatch(
      /ON public\.access_handoff_requests\s*\(\s*move_handover_appointment_id\s*,\s*credential_type\s*\)/i
    )
    expect(activeAccessIndex).not.toMatch(/\baction\b/i)

    expectInOrder(create, [
      "'identity_confirmed'",
      "'documents_reviewed'",
      "'access_prepared'",
      "'meter_readings'",
      "'condition_recorded'",
      "'keys_handed_over'",
      "'turnover_scheduled'",
    ])
    expect(create).toContain(
      "'meter_readings', 'moveHandover.checklist.meterReadings', p_appointment_kind <> 'handover'"
    )
    expect(create).toContain(
      "'condition_recorded', 'moveHandover.checklist.conditionRecorded', p_appointment_kind = 'move_out'"
    )
    expect(create).toContain(
      "'turnover_scheduled', 'moveHandover.checklist.turnoverScheduled', p_appointment_kind = 'move_out'"
    )
    expectInOrder(transition, [
      "('prepare', 'scheduled', 'preparing')",
      "('mark_ready', 'preparing', 'ready')",
      "('start', 'ready', 'in_progress')",
      "('complete', 'in_progress', 'completed')",
    ])
    expect(transition).toContain(
      "c.item_code NOT IN ( 'meter_readings', 'condition_recorded', 'keys_handed_over' )"
    )
    expect(transition).toMatch(
      /p_transition = 'complete'[\s\S]*c\.required[\s\S]*c\.status <> 'completed'/i
    )
    expect(checklist).toMatch(
      /p_item_code = 'keys_handed_over'[\s\S]*p_status = 'completed'[\s\S]*v_appointment\.status <> 'in_progress'/i
    )
    expectInOrder(checklist, [
      "SET status = p_status",
      "WHEN status = 'ready'",
      "AND c.required",
      "AND c.status <> 'completed'",
      "c.item_code NOT IN ( 'meter_readings', 'condition_recorded', 'keys_handed_over' )",
      "THEN 'preparing'",
    ])
    expect(access).toContain(
      "p_access_type NOT IN ('mobile_code', 'card', 'plate', 'qr')"
    )
    expect(access).toContain(
      "p_truth_state NOT IN ('blocked', 'manual_ready', 'provider_ready', 'revoked')"
    )
    expectInOrder(access, [
      "UPDATE public.access_handoff_requests SET action = v_action",
      "WHERE move_handover_appointment_id = p_appointment_id AND credential_type = p_access_type AND status NOT IN ('succeeded', 'failed')",
      "IF NOT FOUND THEN",
    ])
    expect(access).toContain(
      "WHEN status = 'ready' AND p_truth_state IN ('blocked', 'revoked') THEN 'preparing'"
    )
    expect(access).toContain("'executionTruth', 'not_executed'")
    expectInOrder(transition, [
      "SELECT DISTINCT ON (request.credential_type) request.*",
      "ORDER BY request.credential_type, request.updated_at DESC, request.created_at DESC, request.id DESC",
      "WHERE ar.action = 'activate'",
      "ar.preparation_truth IN ('manual_ready', 'provider_ready')",
      "ar.status IN ('approved', 'succeeded')",
      "ar.human_approved_by IS NOT NULL",
      "ar.human_approved_at IS NOT NULL",
      "ar.valid_from <= v_appointment.starts_at",
      "ar.valid_until >= v_appointment.ends_at",
    ])
    expect(transition).toMatch(
      /p_transition = 'complete'[\s\S]*PERFORM public\.move_handover_invalidate_access\s*\(\s*v_appointment\.id\s*,\s*'booking_completed'\s*\)/i
    )
    expect(invalidateAccess).toContain("SET action = 'revoke'")
    expect(invalidateAccess).toContain("preparation_truth = 'revoked'")
    expect(m33).toContain(
      "REVOKE ALL ON FUNCTION public.move_handover_invalidate_access(UUID, TEXT) FROM PUBLIC, anon, authenticated;"
    )
  })

  test("M32 denies accountant reservation reads while M33 keeps operations managed and finance-only", () => {
    const m32 = readSource("m32")
    const m33 = readSource("m33")
    const access = sqlFunction(m33, "prepare_move_handover_access_command")
    const view = sqlFunction(m33, "current_user_can_view_move_handover")
    const workspace = sqlFunction(m33, "move_handover_workspace")
    const reservationView = compact(
      sqlFunction(m32, "current_user_can_view_reservation")
    )
    const bookingWorkspace = compact(
      sqlFunction(m32, "booking_lifecycle_workspace")
    )
    const manage = compact(
      sqlFunction(m33, "current_user_can_manage_move_handover")
    )
    const financeStart = workspace.indexOf("IF v_finance_only THEN")
    const financeEnd = workspace.indexOf("\n  ELSE", financeStart)

    expect(reservationView).toContain(
      "public.current_user_profile_role() <> 'accountant'"
    )
    expect(bookingWorkspace).toContain(
      "IF v_role = 'accountant' THEN RAISE EXCEPTION 'accountants cannot read resident booking workspace rows'"
    )
    expect(access).toContain(
      "assigned staff cannot approve their own access preparation"
    )
    expect(access).toMatch(
      /p_truth_state <> 'blocked'[\s\S]*p_human_approved[\s\S]*v_can_approve/i
    )
    expect(view).toMatch(/current_user_profile_role\(\)\s*<>\s*'accountant'/i)
    expect(manage).toContain(
      "public.current_user_profile_role() IN ('admin', 'manager', 'staff')"
    )
    for (const commandName of [
      "add_move_handover_evidence_command",
      "record_move_handover_meter_command",
      "record_move_handover_condition_command",
    ]) {
      const command = sqlFunction(m33, commandName)
      expect(command).toContain(
        "IF NOT public.current_user_can_manage_move_handover(v_appointment.id) THEN"
      )
      expect(command).not.toContain(
        "IF NOT public.current_user_can_view_move_handover(v_appointment.id) THEN"
      )
    }
    expect(financeStart).toBeGreaterThan(-1)
    expect(financeEnd).toBeGreaterThan(financeStart)
    const financeBranch = workspace.slice(financeStart, financeEnd)
    for (const forbiddenProjection of [
      "'unitId'",
      "'residentId'",
      "'relationshipId'",
      "'relationshipSnapshot'",
    ]) {
      expect(financeBranch).not.toContain(forbiddenProjection)
    }
    expect(financeBranch).toContain("'depositAmountCents'")
    expect(compact(workspace)).toContain(
      "'canApproveAccess', v_role IN ('admin', 'manager')"
    )
    expect(compact(workspace)).toContain(
      "'canLinkDeposit', v_role IN ('admin', 'accountant')"
    )
  })

  test("M32 and M33 use one lock order before linked reschedule and cancellation", () => {
    const m32 = readSource("m32")
    const m33 = readSource("m33")
    const directCommands = [
      sqlFunction(m32, "reschedule_resource_booking_command"),
      sqlFunction(m32, "cancel_resource_booking_command"),
    ]
    for (const command of directCommands) {
      expectInOrder(compact(command), [
        "hashtextextended(v_reservation.bookable_resource_id::TEXT, 0)",
        "FROM public.reservations WHERE id = p_reservation_id FOR UPDATE",
      ])
    }

    const reverseCommands = [
      {
        body: compact(sqlFunction(m33, "reschedule_move_handover_command")),
        nested: "PERFORM public.reschedule_resource_booking_command(",
      },
      {
        body: compact(sqlFunction(m33, "cancel_move_handover_command")),
        nested: "PERFORM public.cancel_resource_booking_command(",
      },
    ]
    for (const command of reverseCommands) {
      expectInOrder(command.body, [
        "hashtextextended(v_appointment.unit_id::TEXT, 0)",
        "hashtextextended(v_reservation.bookable_resource_id::TEXT, 0)",
        "FROM public.reservations WHERE id = v_reservation.id FOR UPDATE",
        "FROM public.move_handover_appointments WHERE id = p_appointment_id FOR UPDATE",
        command.nested,
      ])
    }

    const trigger = compact(
      sqlFunction(m33, "sync_move_handover_from_reservation")
    )
    expect(trigger).toContain(
      "FROM public.move_handover_appointments WHERE reservation_id = NEW.id FOR UPDATE"
    )
  })

  test("resource-assigned staff retain authority through nested M32 commands", () => {
    const m32 = readSource("m32")
    const assignment = compact(
      sqlFunction(m32, "current_user_has_booking_resource_assignment")
    )
    const assignmentGuard = compact(
      sqlFunction(m32, "booking_assert_staff_assignment_scope")
    )

    expect(assignment).toContain("AND p.role = 'staff'")
    expect(assignmentGuard).toContain("AND p.role = 'staff'")
    for (const commandName of [
      "reschedule_resource_booking_command",
      "cancel_resource_booking_command",
    ]) {
      expect(sqlFunction(m32, commandName)).toMatch(
        /current_user_has_booking_resource_assignment\s*\(\s*v_reservation\.bookable_resource_id\s*\)/i
      )
    }
  })

  test("a ready appointment is demoted for any booking access invalidation", () => {
    const m33 = readSource("m33")
    const sync = sqlFunction(m33, "sync_move_handover_from_reservation")
    const syncCompact = compact(sync)
    const reschedule = sqlFunction(m33, "reschedule_move_handover_command")
    const scheduleBranchStart = sync.indexOf("ELSIF v_schedule_changed THEN")
    const scheduleBranchEnd = sync.indexOf(
      "v_event_type := CASE",
      scheduleBranchStart
    )

    expect(syncCompact).toContain(
      "v_access_invalidated := v_schedule_changed OR v_access_revoked"
    )
    expect(syncCompact).toContain(
      "WHEN v_access_invalidated AND v_appointment.status = 'ready' THEN 'preparing'"
    )
    expect(syncCompact).not.toContain(
      "WHEN v_schedule_changed AND v_appointment.status = 'ready' THEN 'preparing'"
    )
    expect(syncCompact).toContain(
      "ELSIF v_access_revoked THEN PERFORM public.move_handover_invalidate_access( v_appointment.id, 'booking_access_revoked' )"
    )
    expect(syncCompact).toContain(
      "SET status = 'blocked', notes = 'Booking access was revoked', completed_by = NULL, completed_at = NULL, version = version + 1 WHERE appointment_id = v_appointment.id AND item_code = 'access_prepared'"
    )
    expect(scheduleBranchStart).toBeGreaterThan(-1)
    expect(scheduleBranchEnd).toBeGreaterThan(scheduleBranchStart)
    const scheduleBranch = compact(
      sync.slice(scheduleBranchStart, scheduleBranchEnd)
    )
    expect(scheduleBranch).toContain(
      "UPDATE public.access_handoff_requests SET preparation_truth = 'blocked'"
    )
    expect(scheduleBranch).toContain(
      "approved_by = NULL, approved_at = NULL, human_approved_by = NULL, human_approved_at = NULL"
    )
    expect(scheduleBranch).toContain(
      "'invalidationReason', 'booking_rescheduled'"
    )
    expect(scheduleBranch).toContain(
      "UPDATE public.move_handover_checklist_items SET status = 'pending'"
    )
    expect(scheduleBranch).toContain(
      "UPDATE public.turnover_work_items tw SET status = 'queued'"
    )
    expect(reschedule).not.toContain("app.move_handover_sync_source")
    expect(reschedule).toContain("public.reschedule_resource_booking_command")
  })

  test("offline-safe commands use the same role matrix in SQL, repository, UI and RBAC", () => {
    const m35 = readSource("m35")
    const repository = readSource("offlineRepository")
    const experience = readSource("offlineExperience")
    const rbac = readSource("rbac")
    const accountantStart = rbac.indexOf("accountant: [")
    const accountantEnd = rbac.indexOf("staff: [", accountantStart)

    expect(m35).toMatch(
      /p_command_type = 'ticket\.create'[\s\S]*v_role NOT IN \('admin', 'manager', 'owner', 'tenant'\)/i
    )
    expect(m35).toMatch(
      /v_role NOT IN \('admin', 'manager', 'staff'\)[\s\S]*Field notes require assigned staff\/manager/i
    )
    expect(repository).toMatch(
      /ticket\.create[\s\S]*!\["admin", "manager", "owner", "tenant"\]\.includes\(ownerScope\.role\)/i
    )
    expect(repository).toMatch(
      /ticket\.field_note\.append[\s\S]*!\["admin", "staff", "manager"\]\.includes\(ownerScope\.role\)/i
    )
    expect(experience).toMatch(
      /\["admin", "manager", "owner", "tenant"\]\.includes\([\s\S]*user\.role/i
    )
    expect(experience).toMatch(
      /\["admin", "manager", "staff"\]\.includes\(user\.role\)/i
    )
    expect(accountantStart).toBeGreaterThan(-1)
    expect(accountantEnd).toBeGreaterThan(accountantStart)
    expect(rbac.slice(accountantStart, accountantEnd)).not.toContain(
      '"offline_sync"'
    )
    expect(repository).toContain('ownerScope.role === "accountant"')
  })

  test("Turkish resident-calendar labels are friendly and suppress raw repository fallback copy", () => {
    const tabs = readSource("residentTabs")
    const bookingSource = readSource("bookingExperience")
    const handover = readSource("handoverExperience")
    const sharing = readSource("calendarSharing")
    const bookingTurkishStart = bookingSource.indexOf("  tr: {")
    const bookingTurkishEnd = bookingSource.indexOf(
      "\n  en: {",
      bookingTurkishStart
    )

    expect(bookingTurkishStart).toBeGreaterThan(-1)
    expect(bookingTurkishEnd).toBeGreaterThan(bookingTurkishStart)
    const booking = bookingSource.slice(bookingTurkishStart, bookingTurkishEnd)

    for (const label of [
      "Rezervasyon",
      "Taşınma ve teslim",
      "Takvim paylaşımı",
      "Sakin yolculuğu bölümleri",
    ]) {
      expect(tabs).toContain(label)
    }
    expect(booking).toContain("Rezervasyon ve tesis kullanımı")
    expect(booking).toContain("Kalıcı rezervasyon hizmeti şu anda hazır değil.")
    expect(booking).not.toMatch(
      /Persistent booking|repository fallback|Repository fallback/i
    )
    expect(handover).toContain("Kalıcı teslim hizmeti hazır değil")
    expect(sharing).toContain("Kalıcı takvim hizmeti hazır değil")
    expect(sharing).toContain(
      "Google, Outlook ve Cal.com bağlantıları API kimlikleri ve onay gelene kadar sağlayıcıya hazırdır; bağlı değildir."
    )
  })
})

test.describe("UC18 mocked browser journeys", () => {
  test("tenant re-reads a persisted hold after hard reload, commits it, then creates its M33 appointment", async ({
    page,
  }) => {
    let holds: JsonRecord[] = []
    let bookings: JsonRecord[] = []
    let bookingReads = 0
    let reservationCreated = false
    let appointmentCreated = false
    let startsAt = STARTS_AT
    let endsAt = ENDS_AT
    const bookingMutations: CapturedMutation[] = []
    const handoverMutations: CapturedMutation[] = []
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString()

    await page.route(
      "**/api/site-management/booking-lifecycle**",
      async (route) => {
        const request = route.request()
        if (request.method() === "GET") {
          bookingReads += 1
          await fulfillJson(route, bookingWorkspace("tenant", holds, bookings))
          return
        }

        const body = request.postDataJSON() as JsonRecord
        bookingMutations.push({
          body,
          idempotencyKey: request.headers()["idempotency-key"],
        })
        if (body.action === "hold") {
          startsAt = String(body.startsAt)
          endsAt = String(body.endsAt)
          holds = [
            {
              id: IDS.hold,
              resourceId: IDS.resource,
              unitId: IDS.unit,
              residentId: IDS.resident,
              startsAt,
              endsAt,
              status: "active",
              expiresAt,
              version: 1,
            },
          ]
          await fulfillJson(
            route,
            {
              entityType: "hold",
              entityId: IDS.hold,
              holdId: IDS.hold,
              version: 1,
              state: "active",
              replayed: false,
              expiresAt,
            },
            201
          )
          return
        }
        if (body.action === "commit") {
          holds = []
          reservationCreated = true
          bookings = [
            {
              id: IDS.reservation,
              resourceId: IDS.resource,
              resourceName: "Taşınma yükleme alanı",
              unitId: IDS.unit,
              residentId: IDS.resident,
              startsAt,
              endsAt,
              lifecycleStatus: "confirmed",
              approvalState: "approved",
              paymentState: "not_required",
              depositTruthState: "not_required",
              version: 1,
            },
          ]
          await fulfillJson(route, {
            entityType: "reservation",
            entityId: IDS.reservation,
            reservationId: IDS.reservation,
            version: 1,
            state: "confirmed",
            replayed: false,
          })
          return
        }
        await fulfillJson(route, { error: { code: "UNEXPECTED_ACTION" } }, 400)
      }
    )

    await page.route(
      "**/api/site-management/move-handover**",
      async (route) => {
        const request = route.request()
        if (request.method() === "GET") {
          await fulfillJson(
            route,
            handoverWorkspace({
              role: "tenant",
              capabilities: tenantCapabilities,
              candidates: {
                reservations:
                  reservationCreated && !appointmentCreated
                    ? [
                        {
                          id: IDS.reservation,
                          siteId: IDS.site,
                          unitId: IDS.unit,
                          residentId: IDS.resident,
                          resourceId: IDS.resource,
                          resourceName: "Taşınma yükleme alanı",
                          startsAt,
                          endsAt,
                          lifecycleStatus: "confirmed",
                          version: 1,
                        },
                      ]
                    : [],
                relationships:
                  reservationCreated && !appointmentCreated
                    ? [
                        {
                          id: IDS.relationship,
                          unitId: IDS.unit,
                          residentId: IDS.resident,
                          relationship: "tenant",
                          label: "UC18 Sakin · A-018 · tenant",
                          startDate: null,
                          endDate: null,
                        },
                      ]
                    : [],
                documents: [],
              },
              appointments: appointmentCreated
                ? [
                    {
                      ...handoverAppointment(),
                      startsAt,
                      endsAt,
                    },
                  ]
                : [],
              checklistItems: appointmentCreated ? handoverChecklist() : [],
            })
          )
          return
        }

        const body = request.postDataJSON() as JsonRecord
        handoverMutations.push({
          body,
          idempotencyKey: request.headers()["idempotency-key"],
        })
        appointmentCreated = true
        await fulfillJson(
          route,
          {
            entityId: IDS.appointment,
            appointmentId: IDS.appointment,
            version: 1,
            state: "scheduled",
            replayed: false,
          },
          201
        )
      }
    )

    await openDashboardAs(page, "tenant", "/tr/dashboard/calendar")
    await expect(page.getByTestId("booking-resident-selector")).toHaveValue(
      IDS.resident
    )
    await page.getByTestId("booking-create-hold").click()
    const holdRow = page.getByTestId(`booking-hold-${IDS.hold}`)
    await expect(holdRow).toHaveAttribute("data-hold-active", "true")
    expect(bookingMutations).toHaveLength(1)
    expect(bookingMutations[0]).toMatchObject({
      body: {
        action: "hold",
        resourceId: IDS.resource,
        unitId: IDS.unit,
        residentId: IDS.resident,
        partySize: 1,
        waitlistIfFull: true,
      },
      idempotencyKey: expect.any(String),
    })

    const readsBeforeReload = bookingReads
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(holdRow).toHaveAttribute("data-hold-active", "true")
    expect(bookingReads).toBeGreaterThan(readsBeforeReload)
    expect(bookingMutations).toHaveLength(1)

    await page.getByTestId(`booking-hold-commit-${IDS.hold}`).click()
    await expect(
      page.getByTestId(`booking-row-${IDS.reservation}`)
    ).toHaveAttribute("data-booking-state", "confirmed")
    expect(bookingMutations[1]).toMatchObject({
      body: {
        action: "commit",
        holdId: IDS.hold,
        expectedVersion: 1,
        guestName: "",
        notes: "",
      },
      idempotencyKey: expect.any(String),
    })

    await page.getByRole("tab", { name: "Taşınma ve teslim" }).click()
    const candidate = page.getByLabel("Uygun rezervasyon ve sakin ilişkisi")
    await expect(candidate).toHaveValue(
      `${IDS.reservation}|${IDS.relationship}`
    )
    await page.getByRole("button", { name: "Oluştur", exact: true }).click()
    await expect(
      page.locator(
        `[data-testid="handover-appointment-row"][data-appointment-id="${IDS.appointment}"]`
      )
    ).toBeVisible()
    await expect(page.getByTestId("handover-appointment-state")).toBeVisible()
    expect(handoverMutations).toHaveLength(1)
    expect(handoverMutations[0]).toMatchObject({
      body: {
        action: "create",
        reservationId: IDS.reservation,
        relationshipId: IDS.relationship,
        appointmentKind: "move_in",
      },
      idempotencyKey: expect.any(String),
    })
  })

  test("manager receives create, scheduling, operation and access-approval authority", async ({
    page,
  }) => {
    await installEmptyBookingRoute(page, "manager")
    await installRoleHandoverRoute(page, "manager", managerCapabilities)
    await openDashboardAs(page, "manager", "/tr/dashboard/calendar#handover")

    await expect(
      page.getByRole("heading", { name: "Teslim randevusu oluştur" })
    ).toBeVisible()
    const row = await openAppointmentActions(page)
    await expect(row.getByTestId("handover-reschedule")).toBeVisible()
    await expect(row.getByTestId("handover-cancel")).toBeVisible()
    await expect(row.getByTestId("handover-next-transition")).toBeVisible()
    await expect(row.getByTestId("handover-checklist-selector")).toBeVisible()
    await expect(row.getByTestId("handover-access-prepare")).toBeVisible()
    const truth = row.getByLabel("Gerçek durum")
    await expect(truth).toBeEnabled()
    await expect(truth.locator("option")).toHaveCount(4)
    await expect(
      row.getByRole("checkbox", { name: "İnsan onayı verildi" })
    ).toBeVisible()
  })

  test("staff can operate but can submit access preparation only as blocked and unapproved", async ({
    page,
  }) => {
    await installEmptyBookingRoute(page, "staff")
    const mutations = await installRoleHandoverRoute(
      page,
      "staff",
      staffCapabilities
    )
    await openDashboardAs(page, "staff", "/tr/dashboard/calendar#handover")

    const row = await openAppointmentActions(page)
    await expect(row.getByTestId("handover-reschedule")).toBeVisible()
    await expect(row.getByTestId("handover-cancel")).toBeVisible()
    await expect(row.getByTestId("handover-next-transition")).toBeVisible()
    await expect(row.getByTestId("handover-checklist-selector")).toBeVisible()
    const accessType = row.getByTestId("handover-access-type")
    await expect(accessType.locator("option")).toHaveCount(4)
    await expect(accessType.locator("option")).toHaveText([
      "Mobil kod",
      "Kart",
      "Plaka",
      "QR kod",
    ])
    const truth = row.getByLabel("Gerçek durum")
    await expect(truth).toBeDisabled()
    await expect(truth).toHaveValue("blocked")
    await expect(truth.locator("option")).toHaveCount(1)
    await expect(
      row.getByRole("checkbox", { name: "İnsan onayı verildi" })
    ).toHaveCount(0)

    await row
      .getByLabel("Neden / not")
      .fill("Yeni saat için yönetici onayı bekleniyor")
    await row.getByTestId("handover-access-prepare").click()
    await expect.poll(() => mutations.length).toBe(1)
    expect(mutations[0]).toMatchObject({
      body: {
        action: "access.prepare",
        appointmentId: IDS.appointment,
        expectedVersion: 1,
        accessType: "mobile_code",
        truthState: "blocked",
        humanApproved: false,
        reason: "Yeni saat için yönetici onayı bekleniyor",
      },
      idempotencyKey: expect.any(String),
    })
  })

  test("owner can create and schedule within scope but receives no operational or access controls", async ({
    page,
  }) => {
    await installEmptyBookingRoute(page, "owner")
    await installRoleHandoverRoute(page, "owner", ownerCapabilities)
    await openDashboardAs(page, "owner", "/tr/dashboard/calendar#handover")

    await expect(
      page.getByRole("heading", { name: "Teslim randevusu oluştur" })
    ).toBeVisible()
    const row = await openAppointmentActions(page)
    await expect(row.getByTestId("handover-reschedule")).toBeVisible()
    await expect(row.getByTestId("handover-cancel")).toBeVisible()
    await expect(row.getByTestId("handover-next-transition")).toHaveCount(0)
    await expect(row.getByTestId("handover-checklist-selector")).toHaveCount(0)
    await expect(row.getByTestId("handover-access-type")).toHaveCount(0)
    await expect(row.getByTestId("handover-access-prepare")).toHaveCount(0)
  })

  test("accountant is denied handover and offline access without API calls", async ({
    context,
    page,
  }) => {
    const residentSecret = "Gizli Sakin Adı"
    const unitSecret = "Gizli Daire Z-999"
    let moveHandoverGetCount = 0
    let moveHandoverPostCount = 0
    let offlineRequestCount = 0
    let offlinePostCount = 0

    await installEmptyBookingRoute(page, "accountant")
    await context.route(
      "**/api/site-management/move-handover**",
      async (route) => {
        if (route.request().method() === "GET") moveHandoverGetCount += 1
        if (route.request().method() === "POST") moveHandoverPostCount += 1
        await fulfillJson(route, { error: { code: "HANDOVER_FORBIDDEN" } }, 403)
      }
    )

    await openDashboardAs(page, "accountant", "/tr/dashboard/calendar#handover")
    await expect(page).toHaveURL(/\/tr\/dashboard$/)
    const main = page.locator("main")
    await expect(main).not.toContainText(residentSecret)
    await expect(main).not.toContainText(unitSecret)
    await expect(
      main.getByRole("heading", { name: "Taşınma ve teslim" })
    ).toHaveCount(0)
    await expect(
      main.getByRole("heading", { name: "Teslim randevusu oluştur" })
    ).toHaveCount(0)
    for (const testId of [
      "handover-reschedule",
      "handover-cancel",
      "handover-next-transition",
      "handover-checklist-selector",
      "handover-access-type",
      "handover-access-prepare",
    ]) {
      await expect(main.getByTestId(testId)).toHaveCount(0)
    }
    expect(moveHandoverGetCount).toBe(0)
    expect(moveHandoverPostCount).toBe(0)

    await context.route(
      "**/api/site-management/offline-sync**",
      async (route) => {
        offlineRequestCount += 1
        if (route.request().method() === "POST") offlinePostCount += 1
        await fulfillJson(route, { error: { code: "OFFLINE_FORBIDDEN" } }, 403)
      }
    )
    await openDashboardAs(page, "accountant", "/tr/dashboard/offline")
    await expect(page).toHaveURL(/\/tr\/dashboard$/)
    await expect(main).not.toContainText(residentSecret)
    await expect(main).not.toContainText(unitSecret)
    await expect(
      main.getByRole("heading", { name: "Sahada güvenli çalışma" })
    ).toHaveCount(0)
    await expect(
      main.getByRole("heading", { name: "Güvenli çevrimdışı işlem ekle" })
    ).toHaveCount(0)
    await expect(main.getByLabel("İşlem")).toHaveCount(0)
    await expect(
      main.getByRole("option", { name: "Normal bilet oluştur" })
    ).toHaveCount(0)
    await expect(
      main.getByRole("option", { name: "Saha notu ekle" })
    ).toHaveCount(0)
    await expect(
      main.getByRole("button", { name: "Kuyruğa ekle" })
    ).toHaveCount(0)
    expect(offlineRequestCount).toBe(0)
    expect(offlinePostCount).toBe(0)
  })
})
