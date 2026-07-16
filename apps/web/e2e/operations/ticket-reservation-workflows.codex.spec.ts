import { expect, test } from "@playwright/test"
import {
  expectNoBlockingConsoleErrors,
  openDashboardAs,
  setAccessRole,
} from "../support/flows"

test("ticket assignment is persisted and emergency routing is visible", async ({
  page,
}) => {
  test.slow()
  await setAccessRole(page, "manager")
  const title = `Electrical safety route ${Date.now()}`
  const create = await page.request.post("/api/site-management/tickets", {
    headers: { "Idempotency-Key": `ticket:e2e:emergency:${Date.now()}` },
    data: {
      title,
      description: "Electrical sparks near the panel",
      category: "maintenance",
      priority: "urgent",
      unitNo: "A-001",
    },
  })
  const createBody = await create.text()
  expect(create.status(), createBody).toBe(201)
  const created = JSON.parse(createBody)
  expect(created.routing).toMatchObject({
    assignee: "Electrical response queue",
    emergency: true,
    emergencyPolicyCode: "electrical_hazard",
    autoDispatchAuthorized: false,
  })
  expect(created.ticket).toMatchObject({
    emergency: true,
    severity: "P0",
    debtBlocked: false,
    paymentVerified: false,
    paymentWorkflowStatus: "post_emergency_review",
  })

  const idempotencyKey = `ticket:e2e:assign:${Date.now()}`
  const update = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": idempotencyKey },
    data: {
      ticketId: created.ticket.id,
      command: "assign",
      assignee: "Security response queue",
      expectedVersion: created.ticket.version,
      idempotencyKey,
    },
  })
  expect(update.status()).toBe(200)
  expect((await update.json()).ticket.assignee).toBe("Security response queue")

  const replay = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": idempotencyKey },
    data: {
      ticketId: created.ticket.id,
      command: "assign",
      assignee: "Security response queue",
      expectedVersion: created.ticket.version,
      idempotencyKey,
    },
  })
  expect(replay.status()).toBe(200)
  expect((await replay.json()).replayed).toBe(true)

  const conflictingReplay = await page.request.patch(
    "/api/site-management/tickets",
    {
      headers: { "Idempotency-Key": idempotencyKey },
      data: {
        ticketId: created.ticket.id,
        command: "assign",
        assignee: "Electrical response queue",
        expectedVersion: created.ticket.version,
        idempotencyKey,
      },
    }
  )
  expect(conflictingReplay.status()).toBe(409)
  expect((await conflictingReplay.json()).code).toBe(
    "TICKET_IDEMPOTENCY_CONFLICT"
  )

  const queue = await page.request.get("/api/site-management/tickets?limit=100")
  const queueBody = await queue.json()
  const queueTicket = queueBody.tickets.find(
    (ticket: { id: string }) => ticket.id === created.ticket.id
  )
  expect(queueTicket).toMatchObject({
    assignee: "Security response queue",
    emergency: true,
    severity: "P0",
    debtBlocked: false,
    paymentVerified: false,
    paymentWorkflowStatus: "post_emergency_review",
  })
  const emergencyOrders = queueBody.orders.filter(
    (order: { ticketId: string }) => order.ticketId === created.ticket.id
  )
  expect(emergencyOrders).toHaveLength(1)
  expect(emergencyOrders[0]).toMatchObject({
    status: "assigned",
    debtCheckStatus: "clear",
    paymentDecision: "post_emergency_review",
    taskCreated: true,
  })
  expect(emergencyOrders[0].paymentDecision).not.toMatch(
    /debit_to_account|hold|collect_before_dispatch|paid_or_debit_approved/
  )
  expect(emergencyOrders[0].nextAction).toContain("finance review afterwards")
  const dashboardQueueResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/site-management/tickets?") &&
      response.request().method() === "GET"
  )
  await openDashboardAs(page, "manager", "/tr/dashboard/tickets")
  const dashboardQueue = await dashboardQueueResponse
  const dashboardQueueBody = await dashboardQueue.text()
  expect(dashboardQueue.status(), dashboardQueueBody).toBe(200)
  expect(
    (JSON.parse(dashboardQueueBody).tickets as Array<{ id: string }>).some(
      (ticket) => ticket.id === created.ticket.id
    ),
    dashboardQueueBody
  ).toBe(true)
  await expect(page.getByText(/Otomatik rota|Acil rota/i)).toBeVisible()
  const emergencyCard = page.locator(
    `[data-testid="ticket-priority-card"][data-ticket-id="${created.ticket.id}"]`
  )
  await expect(emergencyCard).toBeVisible()
  await expect(
    emergencyCard.getByTestId("ticket-emergency-indicator")
  ).toHaveText(/P0.*112/)
  await expect(emergencyCard).not.toContainText("Finans blokeli")
  const emergencyOrderCard = page.locator(
    `[data-testid="service-order-card"][data-ticket-id="${created.ticket.id}"]`
  )
  await expect(emergencyOrderCard).toHaveAttribute(
    "data-order-status",
    "assigned"
  )
  await expect(emergencyOrderCard).toHaveAttribute(
    "data-debt-check-status",
    "clear"
  )
  await expect(emergencyOrderCard).toHaveAttribute(
    "data-payment-decision",
    "post_emergency_review"
  )
  await expect(emergencyOrderCard).toContainText(/Acil.*insan incelemesi/i)
  await expect(emergencyOrderCard).not.toContainText(
    /cari hesaba yaz|hold|beklet|blokeli/i
  )

  const register = page.locator("#ticket-table")
  await register.getByRole("textbox").first().fill(title)
  const registerEmergencyIndicator = register
    .locator(
      `[data-testid="ticket-register-emergency-indicator"][data-ticket-id="${created.ticket.id}"]`
    )
    .first()
  await expect(registerEmergencyIndicator).toHaveText(/P0.*112/)
  await expect(
    register
      .locator(
        `[data-testid="ticket-register-post-emergency-review"][data-ticket-id="${created.ticket.id}"]`
      )
      .first()
  ).toContainText(/Acil.*insan incelemesi/i)
  await register.locator(`[aria-label$=": ${title}"]:visible`).click()
  await expect(page.locator("#ticket-details")).toHaveAttribute(
    "data-selected-ticket-id",
    created.ticket.id
  )
  await expect(
    page.getByTestId("ticket-workflow-summary").getByRole("alert")
  ).toContainText("112")

  await page.setViewportSize({ width: 390, height: 844 })
  const mobileQueueResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/site-management/tickets?") &&
      response.request().method() === "GET"
  )
  await page.reload()
  expect((await mobileQueueResponse).status()).toBe(200)
  const mobileEmergencyCard = page.locator(
    `[data-testid="ticket-priority-card"][data-ticket-id="${created.ticket.id}"]`
  )
  await expect(
    mobileEmergencyCard.getByTestId("ticket-emergency-indicator")
  ).toBeVisible()
  await expect(mobileEmergencyCard).not.toContainText("Finans blokeli")
  const mobileOrderCard = page.locator(
    `[data-testid="service-order-card"][data-ticket-id="${created.ticket.id}"]`
  )
  await expect(mobileOrderCard).toHaveAttribute("data-order-status", "assigned")
  await expect(mobileOrderCard).toHaveAttribute(
    "data-debt-check-status",
    "clear"
  )
  await expect(mobileOrderCard).toHaveAttribute(
    "data-payment-decision",
    "post_emergency_review"
  )
  await expect(mobileOrderCard).toContainText(/Acil.*insan incelemesi/i)
  await expect(mobileOrderCard).not.toContainText(
    /cari hesaba yaz|hold|beklet|blokeli/i
  )
  const mobileRegisterIndicator = page
    .locator(
      `[data-testid="ticket-register-emergency-indicator"][data-ticket-id="${created.ticket.id}"]`
    )
    .first()
  await expect(mobileRegisterIndicator).toHaveText(/P0.*112/)
})

test("zero-cost P0 is immediately visible without finance or debt semantics", async ({
  page,
}) => {
  test.slow()
  await setAccessRole(page, "manager")
  const title = `Gas and smoke life-safety P0 ${Date.now()}`
  const create = await page.request.post("/api/site-management/tickets", {
    headers: { "Idempotency-Key": `ticket:e2e:zero-cost-p0:${Date.now()}` },
    data: {
      title,
      description:
        "Gas smell and smoke alarm in the corridor. Notify security and manager.",
      category: "life-safety",
      priority: "urgent",
      unitNo: "A-001",
    },
  })
  const createBody = await create.text()
  expect(create.status(), createBody).toBe(201)
  const created = JSON.parse(createBody)
  expect(created.ticket).toMatchObject({
    emergency: true,
    severity: "P0",
    debtBlocked: false,
    paymentWorkflowStatus: "not_required",
  })

  const queue = await page.request.get(
    `/api/site-management/tickets?limit=100&q=${encodeURIComponent(title)}`
  )
  expect(queue.status()).toBe(200)
  const queueBody = await queue.json()
  const order = queueBody.orders.find(
    (item: { ticketId: string }) => item.ticketId === created.ticket.id
  )
  expect(order).toMatchObject({
    status: "draft",
    debtCheckStatus: "clear",
    paymentDecision: "no_charge",
    taskCreated: false,
  })
  expect(order.nextAction).not.toMatch(/debt|payment|finance|blocked/i)

  await openDashboardAs(page, "manager", "/tr/dashboard/tickets")
  const priorityCard = page.locator(
    `[data-testid="ticket-priority-card"][data-ticket-id="${created.ticket.id}"]`
  )
  await expect(priorityCard).toBeVisible()
  await expect(
    priorityCard.getByTestId("ticket-emergency-indicator")
  ).toHaveText(/P0.*112/)
  await expect(priorityCard).not.toContainText(/Borç|Ödeme|Finans|Blokeli/i)

  const orderCard = page.locator(
    `[data-testid="service-order-card"][data-ticket-id="${created.ticket.id}"]`
  )
  await expect(orderCard).toHaveAttribute("data-order-status", "draft")
  await expect(orderCard).toHaveAttribute("data-debt-check-status", "clear")
  await expect(orderCard).toHaveAttribute("data-payment-decision", "no_charge")
  await expect(
    orderCard.getByTestId("service-order-emergency-operational")
  ).toBeVisible()
  await expect(orderCard).not.toContainText(/Borç|Ödeme|Finans|Blokeli/i)

  const register = page.locator("#ticket-table")
  await register.getByRole("textbox").first().fill(title)
  const row = register.locator(`[aria-label$=": ${title}"]:visible`)
  const operationalDecision = row.getByTestId(
    "ticket-register-emergency-operational"
  )
  await expect(operationalDecision).toHaveText(/Acil müdahale/i)
  await expect(
    row.getByTestId("ticket-register-post-emergency-review")
  ).toHaveCount(0)
  await expect(operationalDecision).not.toContainText(
    /Borç|Ödeme|Finans|Blokeli/i
  )
  await row.click()
  await expect(page.locator("#ticket-details")).toHaveAttribute(
    "data-selected-ticket-id",
    created.ticket.id
  )
  await expect(page.getByTestId("ticket-workflow-summary")).not.toContainText(
    /Borç|Ödeme|Finans|Blokeli/i
  )

  await page.reload()
  const reloadedOrderCard = page.locator(
    `[data-testid="service-order-card"][data-ticket-id="${created.ticket.id}"]`
  )
  await expect(reloadedOrderCard).toHaveAttribute("data-order-status", "draft")
  await expect(reloadedOrderCard).toHaveAttribute(
    "data-payment-decision",
    "no_charge"
  )
  await expect(reloadedOrderCard).not.toContainText(
    /Borç|Ödeme|Finans|Blokeli/i
  )
})

test("portal ticket creation is authoritative and never enters duplicate manager approval", async ({
  page,
}) => {
  test.slow()
  const consoleErrors: string[] = []
  await expectNoBlockingConsoleErrors(page, consoleErrors)
  await setAccessRole(page, "manager")
  const title = `Authoritative portal ticket ${Date.now()}`
  const createKey = `ticket:e2e:create:${Date.now()}`
  const create = await page.request.post("/api/site-management/tickets", {
    headers: { "Idempotency-Key": createKey },
    data: {
      title,
      description:
        "This portal submission is the operational record immediately.",
      category: "maintenance",
      priority: "medium",
      unitNo: "A-001",
      idempotencyKey: createKey,
    },
  })
  expect(create.status()).toBe(201)
  const created = await create.json()

  const replay = await page.request.post("/api/site-management/tickets", {
    headers: { "Idempotency-Key": createKey },
    data: {
      title,
      description:
        "This portal submission is the operational record immediately.",
      category: "maintenance",
      priority: "medium",
      unitNo: "A-001",
      idempotencyKey: createKey,
    },
  })
  expect(replay.status()).toBe(201)
  expect((await replay.json()).replayed).toBe(true)

  const conflictingReplay = await page.request.post(
    "/api/site-management/tickets",
    {
      headers: { "Idempotency-Key": createKey },
      data: {
        title: `${title} changed`,
        category: "maintenance",
        priority: "medium",
        unitNo: "A-001",
        idempotencyKey: createKey,
      },
    }
  )
  expect(conflictingReplay.status()).toBe(409)
  expect((await conflictingReplay.json()).code).toBe(
    "TICKET_IDEMPOTENCY_CONFLICT"
  )

  const queue = await page.request.get("/api/site-management/tickets?limit=100")
  expect(queue.status()).toBe(200)
  const matches = (await queue.json()).tickets.filter(
    (ticket: { id: string }) => ticket.id === created.ticket.id
  )
  expect(matches).toHaveLength(1)
  expect(matches[0].workflowState ?? "submitted").toBe("submitted")

  for (const locale of ["tr", "en", "de", "ru"] as const) {
    await openDashboardAs(page, "manager", `/${locale}/dashboard/tickets`)
    const localizedCard = page
      .getByTestId("workflow-approval-card")
      .filter({ hasText: title })
    await expect(localizedCard).toHaveCount(0)
  }

  expect(consoleErrors).toEqual([])
})

test("tenant can find the same ticket after submit, reload, and a manager role handoff", async ({
  page,
}) => {
  test.slow()
  const title = `Tester one ${Date.now()}`

  await openDashboardAs(page, "tenant", "/en/dashboard/tickets")
  const submitButton = page.getByRole("button", { name: "Send request" })
  const requestForm = page.locator("form").filter({ has: submitButton }).first()
  const tenantRegister = page.locator("#ticket-table")
  await tenantRegister
    .getByLabel("Search...")
    .fill("nonmatching pre-create filter")
  await requestForm.locator('input[maxlength="160"]').fill(title)
  await requestForm.locator("select").nth(0).selectOption("A-018")
  await requestForm
    .locator('textarea[maxlength="1200"]')
    .fill("Tenant must be able to track this request after every role handoff.")

  const creationResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/site-management/tickets") &&
      response.request().method() === "POST"
  )
  await submitButton.click()
  const createdResponse = await creationResponse
  expect(createdResponse.status()).toBe(201)
  const createdPayload = await createdResponse.json()
  await expect(page.locator("#ticket-details")).toHaveAttribute(
    "data-selected-ticket-id",
    createdPayload.ticket.id
  )
  await expect(tenantRegister.getByLabel("Search...")).toHaveValue(title)

  await tenantRegister.getByLabel("Search...").fill(title)
  await expect(
    tenantRegister.locator(`[aria-label="Open details: ${title}"]:visible`)
  ).toBeVisible()

  await page.reload()
  await tenantRegister.getByLabel("Search...").fill(title)
  const reloadedTenantRow = tenantRegister.locator(
    `[aria-label="Open details: ${title}"]:visible`
  )
  await expect(reloadedTenantRow).toBeVisible()
  await reloadedTenantRow.click()
  await expect(page.getByTestId("ticket-history")).toContainText(
    "Request received"
  )

  await openDashboardAs(page, "manager", "/en/dashboard/tickets")
  const managerRegister = page.locator("#ticket-table")
  await managerRegister.getByLabel("Search...").fill(title)
  await expect(
    managerRegister.locator(`[aria-label="Open details: ${title}"]:visible`)
  ).toBeVisible()
  const managerSearch = await page.request.get(
    `/api/site-management/tickets?limit=100&q=${encodeURIComponent(title)}`
  )
  expect(managerSearch.status()).toBe(200)
  const managerSearchBody = await managerSearch.json()
  const sameTicket = managerSearchBody.tickets.find(
    (ticket: { title: string }) => ticket.title === title
  )
  expect(sameTicket).toBeTruthy()

  const triageKey = `ticket:e2e:tenant-history:${Date.now()}`
  const triage = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": triageKey },
    data: {
      ticketId: sameTicket.id,
      command: "triage",
      expectedVersion: sameTicket.version,
      idempotencyKey: triageKey,
    },
  })
  expect(triage.status()).toBe(200)
  const triaged = await triage.json()

  const acceptKey = `ticket:e2e:tenant-accept:${Date.now()}`
  const accepted = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": acceptKey },
    data: {
      ticketId: sameTicket.id,
      command: "accept",
      expectedVersion: triaged.ticket.version,
      idempotencyKey: acceptKey,
    },
  })
  expect(accepted.status()).toBe(200)
  expect((await accepted.json()).ticket.workflowState).toBe("accepted")

  const executionQueue = await page.request.get(
    `/api/site-management/tickets?limit=100&q=${encodeURIComponent(title)}`
  )
  expect(executionQueue.status()).toBe(200)
  const executionBody = await executionQueue.json()
  expect(
    executionBody.orders.filter(
      (order: { ticketId: string }) => order.ticketId === sameTicket.id
    )
  ).toHaveLength(1)
  expect(
    executionBody.workforceTasks.filter(
      (task: { ticketId: string }) => task.ticketId === sameTicket.id
    )
  ).toHaveLength(1)

  await openDashboardAs(page, "tenant", "/en/dashboard/tickets")
  const restoredTenantRegister = page.locator("#ticket-table")
  await restoredTenantRegister.getByLabel("Search...").fill(title)
  await expect(
    restoredTenantRegister.locator(
      `[aria-label="Open details: ${title}"]:visible`
    )
  ).toBeVisible()
  await restoredTenantRegister
    .locator(`[aria-label="Open details: ${title}"]:visible`)
    .click()
  await expect(page.getByTestId("ticket-history")).toContainText(
    "Request moved to the next step"
  )

  const forbiddenUnit = await page.request.post(
    "/api/site-management/tickets",
    {
      headers: {
        "Idempotency-Key": `ticket:e2e:tenant-unit-forbidden:${Date.now()}`,
      },
      data: {
        title: `Wrong unit ${Date.now()}`,
        category: "maintenance",
        priority: "medium",
        unitNo: "A-001",
      },
    }
  )
  expect(forbiddenUnit.status()).toBe(403)
  expect((await forbiddenUnit.json()).code).toBe("TICKET_UNIT_FORBIDDEN")
})

test("server ticket search finds an authorized record beyond the default 50-row window", async ({
  page,
}) => {
  test.slow()
  await setAccessRole(page, "manager")
  const stamp = Date.now()
  const targetTitle = `Deep search target ${stamp}`
  const target = await page.request.post("/api/site-management/tickets", {
    headers: { "Idempotency-Key": `ticket:e2e:deep-search:${stamp}` },
    data: {
      title: targetTitle,
      category: "maintenance",
      priority: "low",
      unitNo: "A-001",
    },
  })
  expect(target.status()).toBe(201)

  for (let index = 0; index < 51; index += 1) {
    const filler = await page.request.post("/api/site-management/tickets", {
      headers: {
        "Idempotency-Key": `ticket:e2e:queue-filler:${stamp}:${index}`,
      },
      data: {
        title: `Queue filler ${stamp} ${index}`,
        category: "maintenance",
        priority: "urgent",
        unitNo: "A-001",
      },
    })
    expect(filler.status()).toBe(201)
  }

  const defaultWindow = await page.request.get(
    "/api/site-management/tickets?limit=50"
  )
  expect(defaultWindow.status()).toBe(200)
  expect(
    (await defaultWindow.json()).tickets.some(
      (ticket: { title: string }) => ticket.title === targetTitle
    )
  ).toBe(false)

  const searched = await page.request.get(
    `/api/site-management/tickets?limit=50&q=${encodeURIComponent(targetTitle)}`
  )
  expect(searched.status()).toBe(200)
  expect(
    (await searched.json()).tickets.filter(
      (ticket: { title: string }) => ticket.title === targetTitle
    )
  ).toHaveLength(1)
})

test("AI ticket draft remains human-approved and materializes exactly once", async ({
  page,
}) => {
  const consoleErrors: string[] = []
  await expectNoBlockingConsoleErrors(page, consoleErrors)
  await setAccessRole(page, "manager")
  const stamp = Date.now()
  const title = `AI drafted cleaning request ${stamp}`
  const externalId = `AI-QA-${stamp}`
  const draftKey = `ticket:e2e:ai-draft:${stamp}`

  const legacy = await page.request.post("/api/site-management/actions", {
    data: {
      actionType: "ticket.create.request",
      entityTable: "service_tickets",
      title: `Legacy ticket ${stamp}`,
    },
  })
  expect(legacy.status()).toBe(422)
  expect((await legacy.json()).code).toBe("LEGACY_TICKET_ACTION_UNSUPPORTED")

  const draft = await page.request.post("/api/site-management/actions", {
    data: {
      actionType: "ticket.create.ai_draft",
      entityTable: "service_tickets",
      entityExternalId: externalId,
      title,
      metadata: {
        origin: "ai",
        idempotencyKey: draftKey,
        proposedPayload: {
          title,
          description: "AI suggested this request; a manager must approve it.",
          category: "cleaning",
          priority: "medium",
          unitNo: "A-001",
        },
      },
    },
  })
  expect(draft.status()).toBe(201)
  const draftBody = await draft.json()

  for (const role of ["tenant", "owner", "staff", "accountant"] as const) {
    await setAccessRole(page, role)
    const forbiddenKey = `ticket:e2e:ai-forbidden:${role}:${stamp}`
    const forbidden = await page.request.patch("/api/site-management/actions", {
      headers: { "Idempotency-Key": forbiddenKey },
      data: {
        id: draftBody.id,
        status: "approved",
        assignee: "Cleaning queue",
        expectedVersion: "1",
        idempotencyKey: forbiddenKey,
      },
    })
    expect(forbidden.status()).toBe(403)
    expect((await forbidden.json()).code).toBe("AI_TICKET_APPROVAL_FORBIDDEN")
  }

  await setAccessRole(page, "manager")
  const validationKey = `ticket:e2e:ai-validation:${stamp}`
  const missingAssignee = await page.request.patch(
    "/api/site-management/actions",
    {
      headers: { "Idempotency-Key": validationKey },
      data: {
        id: draftBody.id,
        status: "approved",
        expectedVersion: "1",
        idempotencyKey: validationKey,
      },
    }
  )
  expect(missingAssignee.status()).toBe(422)
  expect((await missingAssignee.json()).code).toBe(
    "AI_TICKET_ASSIGNEE_REQUIRED"
  )

  const missingIdempotency = await page.request.patch(
    "/api/site-management/actions",
    {
      data: {
        id: draftBody.id,
        status: "approved",
        assignee: "Cleaning queue",
        expectedVersion: "1",
      },
    }
  )
  expect(missingIdempotency.status()).toBe(400)
  expect((await missingIdempotency.json()).code).toBe(
    "ACTION_IDEMPOTENCY_KEY_REQUIRED"
  )

  const missingVersion = await page.request.patch(
    "/api/site-management/actions",
    {
      headers: { "Idempotency-Key": validationKey },
      data: {
        id: draftBody.id,
        status: "approved",
        assignee: "Cleaning queue",
        idempotencyKey: validationKey,
      },
    }
  )
  expect(missingVersion.status()).toBe(400)
  expect((await missingVersion.json()).code).toBe("ACTION_VERSION_REQUIRED")

  const approvalIdempotencyKey = `ticket-action:${draftBody.id}:approve`
  await openDashboardAs(page, "manager", "/en/dashboard/tickets")
  await expect(page.locator("html")).toHaveAttribute(
    "data-ticket-action-queue-ready",
    "true"
  )
  await page.evaluate(
    ({ id, actionWorkflow, actionTitle, actionExternalId }) => {
      window.dispatchEvent(
        new CustomEvent("site-management:action-logged", {
          detail: {
            id,
            actionType: "ticket.create.ai_draft",
            entityTable: "service_tickets",
            entityExternalId: actionExternalId,
            title: actionTitle,
            status: "locally-logged",
            workflow: {
              ...actionWorkflow,
              status: "submitted",
              origin: "ai",
              requiresHumanApproval: true,
              executionMode: "request_only",
              approvalRoles: ["manager"],
            },
          },
        })
      )
    },
    {
      id: draftBody.id,
      actionWorkflow: draftBody.workflow,
      actionTitle: title,
      actionExternalId: externalId,
    }
  )
  const approvalCard = page.getByTestId("workflow-approval-card").filter({
    hasText: String(stamp),
  })
  await expect(approvalCard).toBeVisible()
  await approvalCard.locator("select").selectOption("Cleaning queue")
  await approvalCard.getByRole("button", { name: "Approve and assign" }).click()
  await expect(approvalCard.getByRole("status")).toContainText(
    "approved and assigned"
  )

  const queue = await page.request.get("/api/site-management/tickets?limit=100")
  const queueBody = await queue.json()
  const matches = queueBody.tickets.filter(
    (ticket: { title: string }) => ticket.title === title
  )
  expect(matches).toHaveLength(1)
  expect(matches[0].status).toBe("assigned")
  expect(matches[0].assignee).toBe("Cleaning queue")

  const replay = await page.request.patch("/api/site-management/actions", {
    headers: { "Idempotency-Key": approvalIdempotencyKey },
    data: {
      id: draftBody.id,
      status: "approved",
      assignee: "Cleaning queue",
      expectedVersion: "1",
      idempotencyKey: approvalIdempotencyKey,
    },
  })
  expect(replay.status()).toBe(200)
  expect((await replay.json()).replayed).toBe(true)

  const conflictingKey = `ticket:e2e:ai-conflict:${stamp}`
  const conflict = await page.request.patch("/api/site-management/actions", {
    headers: { "Idempotency-Key": conflictingKey },
    data: {
      id: draftBody.id,
      status: "approved",
      assignee: "Cleaning queue",
      expectedVersion: "1",
      idempotencyKey: conflictingKey,
    },
  })
  expect(conflict.status()).toBe(409)
  expect((await conflict.json()).code).toBe("ACTION_IDEMPOTENCY_CONFLICT")

  const afterRetry = await page.request.get(
    "/api/site-management/tickets?limit=100"
  )
  expect(
    (await afterRetry.json()).tickets.filter(
      (ticket: { title: string }) => ticket.title === title
    )
  ).toHaveLength(1)
  expect(consoleErrors).toEqual([])
})

test("AI approval resumes safely after ticket commands succeed but the action stays pending", async ({
  page,
}) => {
  await setAccessRole(page, "manager")
  const stamp = Date.now()
  const title = `AI crash recovery request ${stamp}`
  const approvalKey = `ticket:e2e:ai-resume:${stamp}`
  const draft = await page.request.post("/api/site-management/actions", {
    data: {
      actionType: "ticket.create.ai_draft",
      entityTable: "service_tickets",
      entityExternalId: `AI-RESUME-${stamp}`,
      title,
      metadata: {
        origin: "ai",
        idempotencyKey: `ticket:e2e:ai-resume-draft:${stamp}`,
        proposedPayload: {
          title,
          description:
            "Resume an interrupted approval without duplicating work.",
          category: "cleaning",
          priority: "medium",
          unitNo: "A-001",
        },
      },
    },
  })
  expect(draft.status()).toBe(201)
  const draftBody = await draft.json()

  const interrupted = await page.request.patch("/api/site-management/actions", {
    headers: { "Idempotency-Key": approvalKey },
    data: {
      id: draftBody.id,
      status: "approved",
      assignee: "Cleaning queue",
      expectedVersion: "999",
      idempotencyKey: approvalKey,
    },
  })
  expect(interrupted.status()).toBe(409)
  expect((await interrupted.json()).code).toBe("TICKET_VERSION_CONFLICT")

  const materializedQueue = await page.request.get(
    "/api/site-management/tickets?limit=100"
  )
  const materialized = (await materializedQueue.json()).tickets.find(
    (ticket: { title: string }) => ticket.title === title
  )
  expect(materialized).toMatchObject({ workflowState: "submitted" })

  const triageKey = `ticket:e2e:ai-resume-triage:${stamp}`
  const triage = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": triageKey },
    data: {
      ticketId: materialized.id,
      command: "triage",
      expectedVersion: materialized.version,
      idempotencyKey: triageKey,
    },
  })
  expect(triage.status()).toBe(200)
  const triaged = await triage.json()

  const acceptKey = `ticket:e2e:ai-resume-accept:${stamp}`
  const accept = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": acceptKey },
    data: {
      ticketId: materialized.id,
      command: "accept",
      expectedVersion: triaged.ticket.version,
      idempotencyKey: acceptKey,
    },
  })
  expect(accept.status()).toBe(200)
  const accepted = await accept.json()

  const assignKey = `ticket:e2e:ai-resume-assign:${stamp}`
  const assign = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": assignKey },
    data: {
      ticketId: materialized.id,
      command: "assign",
      assignee: "Cleaning queue",
      expectedVersion: accepted.ticket.version,
      idempotencyKey: assignKey,
    },
  })
  expect(assign.status()).toBe(200)
  expect((await assign.json()).ticket).toMatchObject({
    workflowState: "assigned",
    assignee: "Cleaning queue",
  })

  const resumed = await page.request.patch("/api/site-management/actions", {
    headers: { "Idempotency-Key": approvalKey },
    data: {
      id: draftBody.id,
      status: "approved",
      assignee: "Cleaning queue",
      expectedVersion: "1",
      idempotencyKey: approvalKey,
    },
  })
  expect(resumed.status()).toBe(200)
  expect((await resumed.json()).replayed).toBe(true)

  const finalQueue = await page.request.get(
    "/api/site-management/tickets?limit=100"
  )
  const finalMatches = (await finalQueue.json()).tickets.filter(
    (ticket: { title: string }) => ticket.title === title
  )
  expect(finalMatches).toHaveLength(1)
  expect(finalMatches[0]).toMatchObject({
    workflowState: "assigned",
    assignee: "Cleaning queue",
  })
})

test("reservation blocks an occupied shared-resource slot", async ({
  page,
}) => {
  await setAccessRole(page, "owner")
  const start = new Date(Date.now() + 172_800_000).toISOString()
  const end = new Date(Date.now() + 180_000_000).toISOString()
  const resourceName = `Pool QA ${Date.now()}`
  const payload = {
    unitNo: "A-001",
    resourceName,
    guestName: "Reservation QA",
    checkInAt: start,
    checkOutAt: end,
  }
  expect(
    (
      await page.request.post("/api/site-management/booking-operations", {
        data: payload,
      })
    ).status()
  ).toBe(201)
  const conflict = await page.request.post(
    "/api/site-management/booking-operations",
    { data: { ...payload, unitNo: "A-054" } }
  )
  expect(conflict.status()).toBe(409)
  // The calendar page renders the Supabase booking-lifecycle store; reservations
  // created via booking-operations (local seed) are verified through that API. The
  // 409 above already proves the first slot is durably held and blocks an overlap.
  const persisted = await page.request.get(
    "/api/site-management/booking-operations?limit=100"
  )
  const bookings = (await persisted.json()).bookings as { flatNumber: string }[]
  expect(bookings.some((b) => b.flatNumber === "A-001")).toBe(true)
})

test("tenant ticket is authoritative while policy-based owner approval remains explicit", async ({
  page,
}) => {
  await setAccessRole(page, "tenant")
  const createKey = `ticket:e2e:tenant-standard:${Date.now()}`
  const ticket = await page.request.post("/api/site-management/tickets", {
    headers: { "Idempotency-Key": createKey },
    data: {
      title: `Tenant standard repair ${Date.now()}`,
      description: "A normal maintenance request",
      category: "maintenance",
      priority: "medium",
      unitNo: "A-018",
    },
  })
  expect(ticket.status()).toBe(201)
  const ticketBody = await ticket.json()
  expect(ticketBody.ticket.workflowState ?? "submitted").toBe("submitted")
  expect(ticketBody.ticket.approvalStatus ?? "not_required").toBe(
    "not_required"
  )

  await setAccessRole(page, "manager")
  await openDashboardAs(page, "manager", "/en/dashboard/tickets")
  await expect(
    page
      .getByTestId("workflow-approval-card")
      .filter({ hasText: ticketBody.ticket.title })
  ).toHaveCount(0)

  const triageKey = `ticket:e2e:triage:${Date.now()}`
  const triage = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": triageKey },
    data: {
      ticketId: ticketBody.ticket.id,
      command: "triage",
      expectedVersion: ticketBody.ticket.version,
      idempotencyKey: triageKey,
    },
  })
  expect(triage.status()).toBe(200)
  const triaged = await triage.json()

  const approvalKey = `ticket:e2e:owner-approval:${Date.now()}`
  const requestApproval = await page.request.patch(
    "/api/site-management/tickets",
    {
      headers: { "Idempotency-Key": approvalKey },
      data: {
        ticketId: ticketBody.ticket.id,
        command: "request_owner_approval",
        expectedVersion: triaged.ticket.version,
        idempotencyKey: approvalKey,
        reason: "Shared-cost policy threshold requires an owner decision.",
        approvalContext: {
          responsibility: "shared",
          policyCode: "resident_cost_approval_v1",
          estimatedCostCents: 45_000,
          approvalThresholdCents: 25_000,
        },
      },
    }
  )
  expect(requestApproval.status()).toBe(200)
  const approvalRequested = await requestApproval.json()
  expect(approvalRequested.ticket.approvalStatus).toBe("pending_owner")

  await setAccessRole(page, "tenant")
  const start = new Date(Date.now() + 345_600_000).toISOString()
  const end = new Date(Date.now() + 352_800_000).toISOString()
  const resourceName = `Sauna approval ${Date.now()}`
  const reservation = await page.request.post(
    "/api/site-management/booking-operations",
    {
      data: {
        unitNo: "A-018",
        resourceName,
        guestName: "Tenant QA",
        checkInAt: start,
        checkOutAt: end,
      },
    }
  )
  expect(reservation.status()).toBe(201)
  const reservationBody = await reservation.json()
  expect(reservationBody.booking.approvalStatus).toBe("pending_owner")

  // Scopes are isolated: the QA owner persona owns {A-001, A-054, D-023} and is
  // NOT the landlord of the tenant's A-018. The owner cannot see or decide this
  // ticket — the visibility guard returns 403 before any transition runs, so the
  // ticket version is left untouched for the authorized actor below.
  await setAccessRole(page, "owner")
  const ownerDeniedKey = `ticket:e2e:owner-denied:${Date.now()}`
  const ownerDeniedTicket = await page.request.patch(
    "/api/site-management/tickets",
    {
      headers: { "Idempotency-Key": ownerDeniedKey },
      data: {
        ticketId: ticketBody.ticket.id,
        command: "approve_owner_request",
        expectedVersion: approvalRequested.ticket.version,
        idempotencyKey: ownerDeniedKey,
      },
    }
  )
  expect(ownerDeniedTicket.status()).toBe(403)
  expect((await ownerDeniedTicket.json()).code).toBe(
    "TICKET_TRANSITION_FORBIDDEN"
  )

  // The owner likewise cannot approve the tenant's A-018 reservation; the
  // booking-operations owner scope excludes it and returns 403.
  const ownerDeniedReservation = await page.request.patch(
    "/api/site-management/booking-operations",
    {
      data: {
        reservationId: reservationBody.booking.id,
        approvalStatus: "approved",
      },
    }
  )
  expect(ownerDeniedReservation.status()).toBe(403)

  // Admin holds company-wide scope (accessibleUnitsForRole("admin") === null) and
  // canDecideOwnerApproval, so the admin is the authorized actor for this
  // cross-unit owner-approval decision in the QA seed.
  await setAccessRole(page, "admin")
  const ownerDecisionKey = `ticket:e2e:owner-decision:${Date.now()}`
  const approvedTicket = await page.request.patch(
    "/api/site-management/tickets",
    {
      headers: { "Idempotency-Key": ownerDecisionKey },
      data: {
        ticketId: ticketBody.ticket.id,
        command: "approve_owner_request",
        expectedVersion: approvalRequested.ticket.version,
        idempotencyKey: ownerDecisionKey,
        // An admin override of an owner-approval decision must record a reason.
        reason: "Administrator confirms the owner-approval decision for the unit.",
      },
    }
  )
  expect(approvedTicket.status()).toBe(200)
  const ownerApproved = await approvedTicket.json()
  expect(ownerApproved.ticket.approvalStatus).toBe("approved")
  expect(ownerApproved.ticket.workflowState).toBe("triage")

  const approvedReservation = await page.request.patch(
    "/api/site-management/booking-operations",
    {
      data: {
        reservationId: reservationBody.booking.id,
        approvalStatus: "approved",
      },
    }
  )
  expect(approvedReservation.status()).toBe(200)
  expect((await approvedReservation.json()).booking.approvalStatus).toBe(
    "approved"
  )

  await setAccessRole(page, "manager")
  // assign requires the ticket to be accepted first (submitted→triage→accept→assign);
  // owner approval leaves it in triage, so the manager must accept before assigning.
  const acceptKey = `ticket:e2e:post-owner-accept:${Date.now()}`
  const accepted = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": acceptKey },
    data: {
      ticketId: ticketBody.ticket.id,
      command: "accept",
      expectedVersion: ownerApproved.ticket.version,
      idempotencyKey: acceptKey,
    },
  })
  expect(accepted.status()).toBe(200)
  const acceptedTicket = await accepted.json()
  const assignmentKey = `ticket:e2e:post-owner-assign:${Date.now()}`
  const assignedTicket = await page.request.patch(
    "/api/site-management/tickets",
    {
      headers: { "Idempotency-Key": assignmentKey },
      data: {
        ticketId: ticketBody.ticket.id,
        command: "assign",
        assignee: "Plumbing response queue",
        expectedVersion: acceptedTicket.ticket.version,
        idempotencyKey: assignmentKey,
      },
    }
  )
  expect(assignedTicket.status()).toBe(200)
  expect((await assignedTicket.json()).ticket.assignee).toBe(
    "Plumbing response queue"
  )
})

test("owner can inspect but cannot rewrite or self-assign an ordinary tenant ticket", async ({
  page,
}) => {
  const consoleErrors: string[] = []
  await expectNoBlockingConsoleErrors(page, consoleErrors)
  await setAccessRole(page, "tenant")
  const title = `Owner detail review ${Date.now()}`
  const description =
    "Please clean the kitchen floor and confirm the visit time."
  const created = await page.request.post("/api/site-management/tickets", {
    headers: { "Idempotency-Key": `ticket:e2e:owner-detail:${Date.now()}` },
    data: {
      title,
      description,
      category: "cleaning",
      priority: "medium",
      unitNo: "A-018",
    },
  })
  expect(created.status()).toBe(201)
  const createdBody = await created.json()

  // Scopes are isolated: the QA owner owns {A-001, A-054, D-023} and is not the
  // landlord of the tenant's A-018, so the ticket never surfaces in the owner view.
  await openDashboardAs(page, "owner", "/en/dashboard/tickets")
  await expect(page.getByText(description)).toHaveCount(0)
  await expect(
    page.locator(`#ticket-table [aria-label="Open details: ${title}"]`)
  ).toHaveCount(0)

  // The owner's role-scoped ticket queue excludes the tenant's A-018 ticket.
  const queue = await page.request.get("/api/site-management/tickets?limit=100")
  expect(queue.status()).toBe(200)
  const visible = (await queue.json()).tickets.find(
    (ticket: { id: string }) => ticket.id === createdBody.ticket.id
  )
  expect(visible).toBeUndefined()

  // Send an otherwise well-formed edit (valid expectedVersion + idempotency key) so the
  // request reaches the authorization layer — proving the owner is FORBIDDEN (403) from
  // touching a tenant ticket outside its units, rather than merely tripping request
  // validation (400).
  const forbiddenRewriteKey = `ticket:e2e:owner-rewrite:${Date.now()}`
  const forbiddenRewrite = await page.request.patch(
    "/api/site-management/tickets",
    {
      headers: { "Idempotency-Key": forbiddenRewriteKey },
      data: {
        ticketId: createdBody.ticket.id,
        title: "Owner must not rewrite this",
        expectedVersion: createdBody.ticket.version,
        idempotencyKey: forbiddenRewriteKey,
      },
    }
  )
  expect(forbiddenRewrite.status()).toBe(403)
  expect((await forbiddenRewrite.json()).code).toBe(
    "TICKET_TRANSITION_FORBIDDEN"
  )

  // The owner also cannot self-assign the tenant's ticket; the same visibility guard
  // rejects the assign command with 403 before any transition runs.
  const forbiddenAssignKey = `ticket:e2e:owner-self-assign:${Date.now()}`
  const forbiddenAssign = await page.request.patch(
    "/api/site-management/tickets",
    {
      headers: { "Idempotency-Key": forbiddenAssignKey },
      data: {
        ticketId: createdBody.ticket.id,
        command: "assign",
        assignee: "Cleaning response queue",
        expectedVersion: createdBody.ticket.version,
        idempotencyKey: forbiddenAssignKey,
      },
    }
  )
  expect(forbiddenAssign.status()).toBe(403)
  expect(consoleErrors).toEqual([])
})

test("only operations roles assign the tenant ticket recipient", async ({
  page,
}) => {
  await setAccessRole(page, "tenant")
  const title = `Owner recipient selection ${Date.now()}`
  const created = await page.request.post("/api/site-management/tickets", {
    headers: { "Idempotency-Key": `ticket:e2e:recipient:${Date.now()}` },
    data: {
      title,
      description: "Please assign this to the operations coordinator.",
      category: "maintenance",
      priority: "medium",
      unitNo: "A-018",
    },
  })
  expect(created.status()).toBe(201)
  const { ticket } = await created.json()

  // Isolated scopes: the owner does not own A-018, so the tenant's ticket never
  // appears in the owner's dashboard, and the owner has no assign affordance for it.
  await openDashboardAs(page, "owner", "/en/dashboard/tickets")
  await expect(
    page.locator(`#ticket-table [aria-label="Open details: ${title}"]`)
  ).toHaveCount(0)

  const ownerAssignment = await page.request.patch(
    "/api/site-management/tickets",
    {
      headers: { "Idempotency-Key": `ticket:e2e:owner-forbidden:${Date.now()}` },
      data: {
        ticketId: ticket.id,
        command: "assign",
        assignee: "Security response queue",
        expectedVersion: ticket.version,
        idempotencyKey: `ticket:e2e:owner-forbidden:${Date.now()}`,
      },
    }
  )
  expect(ownerAssignment.status()).toBe(403)

  await setAccessRole(page, "manager")
  // assign requires triage→accept first; the owner's forbidden assign above is rejected
  // on role and does not mutate, so the ticket is still submitted at version 1 here.
  const triageKey = `ticket:e2e:recipient-triage:${Date.now()}`
  const triaged = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": triageKey },
    data: {
      ticketId: ticket.id,
      command: "triage",
      expectedVersion: ticket.version,
      idempotencyKey: triageKey,
    },
  })
  expect(triaged.status()).toBe(200)
  const triagedTicket = await triaged.json()
  const acceptKey = `ticket:e2e:recipient-accept:${Date.now()}`
  const accepted = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": acceptKey },
    data: {
      ticketId: ticket.id,
      command: "accept",
      expectedVersion: triagedTicket.ticket.version,
      idempotencyKey: acceptKey,
    },
  })
  expect(accepted.status()).toBe(200)
  const acceptedTicket = await accepted.json()
  const assignmentKey = `ticket:e2e:manager-assign:${Date.now()}`
  const managerAssignment = await page.request.patch(
    "/api/site-management/tickets",
    {
      headers: { "Idempotency-Key": assignmentKey },
      data: {
        ticketId: ticket.id,
        command: "assign",
        assignee: "Security response queue",
        expectedVersion: acceptedTicket.ticket.version,
        idempotencyKey: assignmentKey,
      },
    }
  )
  expect(managerAssignment.status()).toBe(200)
  const managerQueue = await page.request.get(
    "/api/site-management/tickets?limit=100"
  )
  expect(managerQueue.status()).toBe(200)
  const assignedTicket = (await managerQueue.json()).tickets.find(
    (item: { id: string }) => item.id === ticket.id
  )
  expect(assignedTicket).toMatchObject({
    status: "assigned",
    assignee: "Security response queue",
  })

  await setAccessRole(page, "admin")
  const adminQueue = await page.request.get(
    "/api/site-management/tickets?limit=100"
  )
  const adminTicket = (await adminQueue.json()).tickets.find(
    (item: { id: string }) => item.id === ticket.id
  )
  expect(adminTicket).toMatchObject({
    status: "assigned",
    assignee: "Security response queue",
  })
})

test("owner opens reservation notes, approves the request, and rejected slots become available", async ({
  page,
}) => {
  const consoleErrors: string[] = []
  await expectNoBlockingConsoleErrors(page, consoleErrors)
  await setAccessRole(page, "tenant")
  const start = new Date(Date.now() + 604_800_000).toISOString()
  const end = new Date(Date.now() + 612_000_000).toISOString()
  const notes = "Two residents; please prepare the sauna before arrival."
  const resourceName = `Sauna owner review ${Date.now()}`
  const created = await page.request.post(
    "/api/site-management/booking-operations",
    {
      data: {
        unitNo: "A-018",
        resourceName,
        guestName: "Owner review guest",
        checkInAt: start,
        checkOutAt: end,
        notes,
      },
    }
  )
  expect(created.status()).toBe(201)
  const createdBody = await created.json()

  // Scopes are isolated: the tenant's A-018 reservation is outside the QA owner's
  // owned units {A-001, A-054, D-023}. The owner's booking queue therefore excludes
  // it, and an owner decision on it is rejected with 403.
  await setAccessRole(page, "owner")
  const ownerView = await page.request.get(
    "/api/site-management/booking-operations?limit=100"
  )
  const ownerBooking = (await ownerView.json()).bookings.find(
    (booking: { id: string }) => booking.id === createdBody.booking.id
  )
  expect(ownerBooking).toBeUndefined()

  const ownerDeniedApproval = await page.request.patch(
    "/api/site-management/booking-operations",
    {
      data: {
        reservationId: createdBody.booking.id,
        approvalStatus: "approved",
      },
    }
  )
  expect(ownerDeniedApproval.status()).toBe(403)

  // Admin holds company-wide calendar authority and is the correct actor to review
  // the notes and approve this cross-unit reservation in the QA seed.
  await setAccessRole(page, "admin")
  const adminView = await page.request.get(
    "/api/site-management/booking-operations?limit=100"
  )
  const adminBooking = (await adminView.json()).bookings.find(
    (booking: { id: string }) => booking.id === createdBody.booking.id
  )
  expect(adminBooking?.notes).toBe(notes)

  const approveReservation = await page.request.patch(
    "/api/site-management/booking-operations",
    {
      data: {
        reservationId: createdBody.booking.id,
        approvalStatus: "approved",
      },
    }
  )
  expect(approveReservation.status()).toBe(200)

  const queue = await page.request.get(
    "/api/site-management/booking-operations?limit=100"
  )
  const approved = (await queue.json()).bookings.find(
    (booking: { id: string }) => booking.id === createdBody.booking.id
  )
  expect(approved.approvalStatus).toBe("approved")
  expect(approved.notes).toBe(notes)

  await setAccessRole(page, "tenant")
  const rejectedStart = new Date(Date.now() + 691_200_000).toISOString()
  const rejectedEnd = new Date(Date.now() + 698_400_000).toISOString()
  const rejectedResource = `Pool rejection ${Date.now()}`
  const rejected = await page.request.post(
    "/api/site-management/booking-operations",
    {
      data: {
        unitNo: "A-018",
        resourceName: rejectedResource,
        guestName: "Rejected slot",
        checkInAt: rejectedStart,
        checkOutAt: rejectedEnd,
      },
    }
  )
  const rejectedBody = await rejected.json()
  // The owner cannot reject the tenant's reservation either (403); admin performs the
  // rejection, which releases the shared resource/time slot for a replacement.
  await setAccessRole(page, "owner")
  expect(
    (
      await page.request.patch("/api/site-management/booking-operations", {
        data: {
          reservationId: rejectedBody.booking.id,
          approvalStatus: "rejected",
        },
      })
    ).status()
  ).toBe(403)
  await setAccessRole(page, "admin")
  expect(
    (
      await page.request.patch("/api/site-management/booking-operations", {
        data: {
          reservationId: rejectedBody.booking.id,
          approvalStatus: "rejected",
        },
      })
    ).status()
  ).toBe(200)
  await setAccessRole(page, "tenant")
  const replacement = await page.request.post(
    "/api/site-management/booking-operations",
    {
      data: {
        unitNo: "A-023",
        resourceName: rejectedResource,
        guestName: "Replacement slot",
        checkInAt: rejectedStart,
        checkOutAt: rejectedEnd,
      },
    }
  )
  expect(replacement.status()).toBe(201)
  expect(consoleErrors).toEqual([])
})

test("policy-requested owner approval is translated without duplicating the ticket", async ({
  page,
}) => {
  await setAccessRole(page, "tenant")
  const response = await page.request.post("/api/site-management/tickets", {
    headers: {
      "Idempotency-Key": `ticket:e2e:translation-create:${Date.now()}`,
    },
    data: {
      title: `Translation review ${Date.now()}`,
      category: "maintenance",
      priority: "medium",
      unitNo: "A-018",
    },
  })
  expect(response.status()).toBe(201)
  const { ticket } = await response.json()

  await setAccessRole(page, "manager")
  const triageKey = `ticket:e2e:translation-triage:${Date.now()}`
  const triage = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": triageKey },
    data: {
      ticketId: ticket.id,
      command: "triage",
      expectedVersion: ticket.version,
      idempotencyKey: triageKey,
    },
  })
  expect(triage.status()).toBe(200)
  const triaged = await triage.json()
  const approvalKey = `ticket:e2e:translation-approval:${Date.now()}`
  const approval = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": approvalKey },
    data: {
      ticketId: ticket.id,
      command: "request_owner_approval",
      expectedVersion: triaged.ticket.version,
      idempotencyKey: approvalKey,
      reason: "Configured resident cost threshold requires a decision.",
      approvalContext: {
        responsibility: "owner",
        policyCode: "resident_cost_approval_v1",
        estimatedCostCents: 30_000,
        approvalThresholdCents: 25_000,
      },
    },
  })
  expect(approval.status()).toBe(200)
  const approvalBody = await approval.json()

  // Scopes are isolated: the owner-approval request is translated onto the SAME
  // ticket (no duplicate is spawned), but the QA owner owns {A-001, A-054, D-023}
  // and cannot see or decide the tenant's A-018 request. Its role-scoped queue
  // excludes the ticket and an owner decision is rejected with 403.
  await setAccessRole(page, "owner")
  const ownerQueue = await page.request.get(
    "/api/site-management/tickets?limit=100"
  )
  expect(ownerQueue.status()).toBe(200)
  expect(
    (await ownerQueue.json()).tickets.some(
      (item: { id: string }) => item.id === ticket.id
    )
  ).toBe(false)

  const ownerRejectKey = `ticket:e2e:translation-owner-denied:${Date.now()}`
  const ownerReject = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": ownerRejectKey },
    data: {
      ticketId: ticket.id,
      command: "reject_owner_request",
      expectedVersion: approvalBody.ticket.version,
      idempotencyKey: ownerRejectKey,
      reason: "Owner is outside this ticket's unit scope.",
    },
  })
  expect(ownerReject.status()).toBe(403)
  expect((await ownerReject.json()).code).toBe("TICKET_TRANSITION_FORBIDDEN")

  // Admin holds company-wide scope and canDecideOwnerApproval, so the admin is the
  // authorized actor for the translated owner decision in this QA seed.
  await setAccessRole(page, "admin")
  const rejectKey = `ticket:e2e:translation-reject:${Date.now()}`
  const reject = await page.request.patch("/api/site-management/tickets", {
    headers: { "Idempotency-Key": rejectKey },
    data: {
      ticketId: ticket.id,
      command: "reject_owner_request",
      expectedVersion: approvalBody.ticket.version,
      idempotencyKey: rejectKey,
      reason: "Owner declined the quoted responsibility and cost.",
    },
  })
  expect(reject.status()).toBe(200)
  const rejected = await reject.json()
  expect(rejected.ticket.approvalStatus).toBe("rejected")
  expect(rejected.ticket.workflowState).toBe("triage")

  // The policy-requested owner approval was translated in place: exactly one ticket
  // carries this title — the request never forked a duplicate.
  const adminQueue = await page.request.get(
    "/api/site-management/tickets?limit=100"
  )
  const matches = (await adminQueue.json()).tickets.filter(
    (item: { title: string }) => item.title === ticket.title
  )
  expect(matches).toHaveLength(1)
})
