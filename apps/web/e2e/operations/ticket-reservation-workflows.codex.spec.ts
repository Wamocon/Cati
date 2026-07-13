import { expect, test } from "@playwright/test"
import { expectNoBlockingConsoleErrors, openDashboardAs, setAccessRole } from "../support/flows"

test("ticket assignment is persisted and emergency routing is visible", async ({ page }) => {
  await setAccessRole(page, "manager")
  const title = `Electrical safety route ${Date.now()}`
  const create = await page.request.post("/api/site-management/tickets", {
    data: { title, description: "Electrical sparks near the panel", category: "maintenance", priority: "urgent", unitNo: "A-001" },
  })
  expect(create.status()).toBe(201)
  const created = await create.json()
  expect(created.ticket.assignee).toBe("Teknik - Burak")

  const update = await page.request.patch("/api/site-management/tickets", {
    data: { ticketId: created.ticket.id, assignee: "Guvenlik - Selim", status: "assigned" },
  })
  expect(update.status()).toBe(200)
  expect((await update.json()).ticket.assignee).toBe("Guvenlik - Selim")

  const queue = await page.request.get("/api/site-management/tickets?limit=100")
  expect((await queue.json()).tickets.find((ticket: { id: string }) => ticket.id === created.ticket.id).assignee).toBe("Guvenlik - Selim")
  await openDashboardAs(page, "manager", "/tr/dashboard/tickets")
  await expect(page.getByText(/Otomatik rota|Acil rota/i)).toBeVisible()
})

test("manager approval hides technical metadata and assigns the existing ticket", async ({ page }) => {
  const consoleErrors: string[] = []
  await expectNoBlockingConsoleErrors(page, consoleErrors)
  await setAccessRole(page, "manager")
  const title = `Approval assignment ${Date.now()}`
  const create = await page.request.post("/api/site-management/tickets", {
    data: {
      title,
      description: "Assign this request during manager approval.",
      category: "maintenance",
      priority: "medium",
      unitNo: "A-001",
    },
  })
  expect(create.status()).toBe(201)
  const created = await create.json()

  const missingAssignee = await page.request.patch("/api/site-management/actions", {
    data: { id: created.id, status: "approved" },
  })
  expect(missingAssignee.status()).toBe(400)

  for (const localeCase of [
    { locale: "tr", assignTo: "Sorumlu kişi veya ekip", approve: "Onayla ve ata" },
    { locale: "en", assignTo: "Person or team responsible", approve: "Approve and assign" },
    { locale: "de", assignTo: "Zuständige Person oder Team", approve: "Freigeben und zuweisen" },
    { locale: "ru", assignTo: "Ответственный сотрудник или команда", approve: "Одобрить и назначить" },
  ]) {
    await openDashboardAs(page, "manager", `/${localeCase.locale}/dashboard/tickets`)
    const localizedCard = page.getByTestId("workflow-approval-card").filter({ hasText: title })
    await expect(localizedCard).toBeVisible()
    await expect(localizedCard.getByLabel(`${localeCase.assignTo}: ${title}`)).toBeVisible()
    await expect(localizedCard.getByRole("button", { name: localeCase.approve })).toBeVisible()
    await expect(localizedCard).not.toContainText(/Origin:|Mode:|Approval roles:|\bapi\b|Request only/i)
  }

  await openDashboardAs(page, "manager", "/en/dashboard/tickets")
  const approvalCard = page.getByTestId("workflow-approval-card").filter({ hasText: title })
  await approvalCard.getByLabel(`Person or team responsible: ${title}`).selectOption("Guvenlik - Selim")
  await approvalCard.getByRole("button", { name: "Approve and assign" }).click()
  await expect(approvalCard.getByRole("status")).toContainText("approved and assigned")

  const queue = await page.request.get("/api/site-management/tickets?limit=100")
  const matches = (await queue.json()).tickets.filter((ticket: { id: string }) => ticket.id === created.ticket.id)
  expect(matches).toHaveLength(1)
  expect(matches[0].status).toBe("assigned")
  expect(matches[0].assignee).toBe("Guvenlik - Selim")
  expect(consoleErrors).toEqual([])
})

test("reservation blocks an occupied shared-resource slot", async ({ page }) => {
  await setAccessRole(page, "owner")
  const start = new Date(Date.now() + 172_800_000).toISOString()
  const end = new Date(Date.now() + 180_000_000).toISOString()
  const resourceName = `Pool QA ${Date.now()}`
  const payload = { unitNo: "A-001", resourceName, guestName: "Reservation QA", checkInAt: start, checkOutAt: end }
  expect((await page.request.post("/api/site-management/booking-operations", { data: payload })).status()).toBe(201)
  const conflict = await page.request.post("/api/site-management/booking-operations", { data: { ...payload, unitNo: "A-054" } })
  expect(conflict.status()).toBe(409)
  await openDashboardAs(page, "owner", "/tr/dashboard/calendar")
  await expect(page.getByText(/müsait|available/i).first()).toBeVisible()
})

test("tenant ticket and reservation wait for owner approval before normal dispatch", async ({ page }) => {
  await setAccessRole(page, "tenant")
  const ticket = await page.request.post("/api/site-management/tickets", {
    data: { title: `Tenant standard repair ${Date.now()}`, description: "A normal maintenance request", category: "maintenance", priority: "medium", unitNo: "A-018" },
  })
  expect(ticket.status()).toBe(201)
  const ticketBody = await ticket.json()
  expect(ticketBody.ticket.status).toBe("waiting_approval")
  expect(ticketBody.ticket.assignee).toBe("Owner approval queue")

  await setAccessRole(page, "manager")
  const prematureAssignment = await page.request.patch("/api/site-management/actions", {
    data: { id: ticketBody.id, status: "approved", assignee: "Operasyon - Can" },
  })
  expect(prematureAssignment.status()).toBe(409)
  await openDashboardAs(page, "manager", "/en/dashboard/tickets")
  await expect(page.getByTestId("workflow-approval-card").filter({ hasText: ticketBody.ticket.title })).toHaveCount(0)

  await setAccessRole(page, "tenant")
  const start = new Date(Date.now() + 345_600_000).toISOString()
  const end = new Date(Date.now() + 352_800_000).toISOString()
  const resourceName = `Sauna approval ${Date.now()}`
  const reservation = await page.request.post("/api/site-management/booking-operations", {
    data: { unitNo: "A-018", resourceName, guestName: "Tenant QA", checkInAt: start, checkOutAt: end },
  })
  expect(reservation.status()).toBe(201)
  const reservationBody = await reservation.json()
  expect(reservationBody.booking.approvalStatus).toBe("pending_owner")

  await setAccessRole(page, "owner")
  const approvedTicket = await page.request.patch("/api/site-management/tickets", {
    data: { ticketId: ticketBody.ticket.id, approvalStatus: "approved" },
  })
  expect(approvedTicket.status()).toBe(200)
  expect((await approvedTicket.json()).ticket.status).toBe("assigned")

  const approvedReservation = await page.request.patch("/api/site-management/booking-operations", {
    data: { reservationId: reservationBody.booking.id, approvalStatus: "approved" },
  })
  expect(approvedReservation.status()).toBe(200)
  expect((await approvedReservation.json()).booking.approvalStatus).toBe("approved")

  await openDashboardAs(page, "manager", "/en/dashboard/tickets")
  await expect(page.getByTestId("workflow-approval-card").filter({ hasText: ticketBody.ticket.title })).toBeVisible()
  const assignedTicket = await page.request.patch("/api/site-management/actions", {
    data: { id: ticketBody.id, status: "approved", assignee: "Operasyon - Can" },
  })
  expect(assignedTicket.status()).toBe(200)
  expect((await assignedTicket.json()).workflow.assignment.assignee).toBe("Operasyon - Can")
})

test("owner opens a tenant ticket, sees its description, approves it, and cannot rewrite it", async ({ page }) => {
  const consoleErrors: string[] = []
  await expectNoBlockingConsoleErrors(page, consoleErrors)
  await setAccessRole(page, "tenant")
  const title = `Owner detail review ${Date.now()}`
  const description = "Please clean the kitchen floor and confirm the visit time."
  const created = await page.request.post("/api/site-management/tickets", {
    data: { title, description, category: "cleaning", priority: "medium", unitNo: "A-018" },
  })
  expect(created.status()).toBe(201)
  const createdBody = await created.json()

  await openDashboardAs(page, "owner", "/en/dashboard/tickets")
  await expect(page.getByText(description).first()).toBeVisible()
  await page.getByRole("button").filter({ hasText: title }).first().click()
  const details = page.locator("#ticket-details").locator("..").locator("..").first()
  const descriptionField = details.locator('textarea[name="description"]')
  await expect(descriptionField).toHaveValue(description)
  await expect(descriptionField).toHaveAttribute("readonly", "")

  const registerRow = page.locator(`#ticket-table [aria-label="Open details: ${title}"]:visible`)
  await expect(registerRow).toHaveAttribute("aria-label", `Open details: ${title}`)
  await registerRow.click()
  await expect(descriptionField).toHaveValue(description)

  await details.getByRole("button", { name: "Approve and send to Operations" }).click()
  await expect(details.getByText("The tenant request is displayed as read-only.")).toBeVisible({ timeout: 10_000 })

  const queue = await page.request.get("/api/site-management/tickets?limit=100")
  const approved = (await queue.json()).tickets.find((ticket: { id: string }) => ticket.id === createdBody.ticket.id)
  expect(approved.status).toBe("assigned")
  expect(approved.assignee).toBe("Temizlik - Esra")

  const forbiddenRewrite = await page.request.patch("/api/site-management/tickets", {
    data: { ticketId: createdBody.ticket.id, title: "Owner must not rewrite this" },
  })
  expect(forbiddenRewrite.status()).toBe(403)
  expect(consoleErrors).toEqual([])
})

test("owner chooses the operations recipient and managers receive the assigned tenant ticket", async ({ page }) => {
  await setAccessRole(page, "tenant")
  const title = `Owner recipient selection ${Date.now()}`
  const created = await page.request.post("/api/site-management/tickets", {
    data: { title, description: "Please assign this to the operations coordinator.", category: "maintenance", priority: "medium", unitNo: "A-018" },
  })
  expect(created.status()).toBe(201)
  const { ticket } = await created.json()

  await openDashboardAs(page, "owner", "/en/dashboard/tickets")
  await page.getByRole("button").filter({ hasText: title }).first().click()
  await page.getByLabel(`Assignee for ${title}`).last().selectOption("Operasyon - Can")
  await page.getByRole("button", { name: "Approve and send to Operations" }).last().click()

  await setAccessRole(page, "manager")
  const managerQueue = await page.request.get("/api/site-management/tickets?limit=100")
  expect(managerQueue.status()).toBe(200)
  const assignedTicket = (await managerQueue.json()).tickets.find((item: { id: string }) => item.id === ticket.id)
  expect(assignedTicket).toMatchObject({ status: "assigned", assignee: "Operasyon - Can" })

  await setAccessRole(page, "admin")
  const adminQueue = await page.request.get("/api/site-management/tickets?limit=100")
  const adminTicket = (await adminQueue.json()).tickets.find((item: { id: string }) => item.id === ticket.id)
  expect(adminTicket).toMatchObject({ status: "assigned", assignee: "Operasyon - Can" })
})

test("owner opens reservation notes, approves the request, and rejected slots become available", async ({ page }) => {
  const consoleErrors: string[] = []
  await expectNoBlockingConsoleErrors(page, consoleErrors)
  await setAccessRole(page, "tenant")
  const start = new Date(Date.now() + 604_800_000).toISOString()
  const end = new Date(Date.now() + 612_000_000).toISOString()
  const notes = "Two residents; please prepare the sauna before arrival."
  const resourceName = `Sauna owner review ${Date.now()}`
  const created = await page.request.post("/api/site-management/booking-operations", {
    data: { unitNo: "A-018", resourceName, guestName: "Owner review guest", checkInAt: start, checkOutAt: end, notes },
  })
  expect(created.status()).toBe(201)
  const createdBody = await created.json()

  await openDashboardAs(page, "owner", "/en/dashboard/calendar")
  await expect(page.getByText(notes).first()).toBeVisible()
  await page.getByRole("button").filter({ hasText: "Owner review guest" }).first().click()
  const details = page.locator("#reservation-details")
  await expect(details).toContainText(notes)
  const approveReservation = details.getByRole("button", { name: "Approve" })
  await approveReservation.click()
  await expect(approveReservation).toBeHidden({ timeout: 10_000 })

  const queue = await page.request.get("/api/site-management/booking-operations?limit=100")
  const approved = (await queue.json()).bookings.find((booking: { id: string }) => booking.id === createdBody.booking.id)
  expect(approved.approvalStatus).toBe("approved")
  expect(approved.notes).toBe(notes)
  const reservationRegisterItem = page.locator(`#reservations-table [aria-label="Open details: ${resourceName}"]:visible`)
  await reservationRegisterItem.click()
  await expect(details).toContainText(notes)

  await setAccessRole(page, "tenant")
  const rejectedStart = new Date(Date.now() + 691_200_000).toISOString()
  const rejectedEnd = new Date(Date.now() + 698_400_000).toISOString()
  const rejectedResource = `Pool rejection ${Date.now()}`
  const rejected = await page.request.post("/api/site-management/booking-operations", {
    data: { unitNo: "A-018", resourceName: rejectedResource, guestName: "Rejected slot", checkInAt: rejectedStart, checkOutAt: rejectedEnd },
  })
  const rejectedBody = await rejected.json()
  await setAccessRole(page, "owner")
  expect((await page.request.patch("/api/site-management/booking-operations", { data: { reservationId: rejectedBody.booking.id, approvalStatus: "rejected" } })).status()).toBe(200)
  await setAccessRole(page, "tenant")
  const replacement = await page.request.post("/api/site-management/booking-operations", {
    data: { unitNo: "A-023", resourceName: rejectedResource, guestName: "Replacement slot", checkInAt: rejectedStart, checkOutAt: rejectedEnd },
  })
  expect(replacement.status()).toBe(201)
  expect(consoleErrors).toEqual([])
})

test("owner ticket approval queue is translated without creating duplicate tickets", async ({ page }) => {
  // Clean up only records created by the legacy locale test, which used one
  // pending tenant ticket per language and left them in the owner queue.
  await setAccessRole(page, "owner")
  const existingQueue = await page.request.get("/api/site-management/tickets?limit=100")
  expect(existingQueue.status()).toBe(200)
  const { tickets: existingTickets } = await existingQueue.json()
  for (const existingTicket of existingTickets.filter((candidate: { title: string; status: string }) =>
    /^Translation review(?: (?:tr|en|de|ru))? \d+$/.test(candidate.title) && candidate.status === "waiting_approval"
  )) {
    const cleanup = await page.request.patch("/api/site-management/tickets", {
      data: { ticketId: existingTicket.id, approvalStatus: "rejected" },
    })
    expect(cleanup.status()).toBe(200)
  }

  await setAccessRole(page, "tenant")
  const response = await page.request.post("/api/site-management/tickets", {
    data: { title: `Translation review ${Date.now()}`, category: "maintenance", priority: "medium", unitNo: "A-018" },
  })
  expect(response.status()).toBe(201)
  const { ticket } = await response.json()

  for (const localeCase of [
    { locale: "tr", heading: "Kiracı talep onay kuyruğu", approve: "Onayla", reject: "Reddet" },
    { locale: "en", heading: "Tenant request approval queue", approve: "Approve", reject: "Reject" },
    { locale: "de", heading: "Freigabewarteschlange für Mieteranfragen", approve: "Freigeben", reject: "Ablehnen" },
    { locale: "ru", heading: "Очередь согласования заявок арендаторов", approve: "Одобрить", reject: "Отклонить" },
  ]) {
    await openDashboardAs(page, "owner", `/${localeCase.locale}/dashboard/tickets`)
    await expect(page.getByText(localeCase.heading)).toBeVisible()
    await expect(page.getByRole("button", { name: localeCase.approve }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: localeCase.reject }).first()).toBeVisible()
  }

  const reject = await page.request.patch("/api/site-management/tickets", {
    data: { ticketId: ticket.id, approvalStatus: "rejected" },
  })
  expect(reject.status()).toBe(200)
})
