import { expect, test } from "@playwright/test"
import { openDashboardAs, setAccessRole } from "../support/flows"

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

test("reservation blocks an occupied shared-resource slot", async ({ page }) => {
  await setAccessRole(page, "owner")
  const start = new Date(Date.now() + 172_800_000).toISOString()
  const end = new Date(Date.now() + 180_000_000).toISOString()
  const payload = { unitNo: "A-001", resourceName: "Pool", guestName: "Reservation QA", checkInAt: start, checkOutAt: end }
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

  const start = new Date(Date.now() + 345_600_000).toISOString()
  const end = new Date(Date.now() + 352_800_000).toISOString()
  const reservation = await page.request.post("/api/site-management/booking-operations", {
    data: { unitNo: "A-018", resourceName: "Sauna", guestName: "Tenant QA", checkInAt: start, checkOutAt: end },
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
})
