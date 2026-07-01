import { expect, test } from "@playwright/test"
import { openDashboardAs, setAccessRole } from "../support/flows"

test.describe("Workflow actions and compact action menus", () => {
  test("manager can submit a ticket request without direct execution", async ({ page }) => {
    await setAccessRole(page, "manager")
    const response = await page.request.post("/api/site-management/tickets", {
      data: {
        title: "Balcony door handle is loose",
        description: "Resident reports a loose handle. Please triage as normal service.",
        priority: "normal",
        category: "maintenance",
        unitNo: "A-011",
      },
    })

    expect(response.status()).toBe(202)
    const payload = await response.json()
    expect(payload.id).toBeTruthy()
    expect(payload.workflow.actionType).toBe("ticket.create.request")
    expect(payload.workflow.executionMode).toBe("request_only")
    expect(payload.ticketRequest.requiresHumanApproval).toBe(true)
  })

  test("manager can approve an audited ticket action request", async ({ page }) => {
    await setAccessRole(page, "manager")

    const createResponse = await page.request.post("/api/site-management/actions", {
      data: {
        actionType: "ticket.update.request",
        entityTable: "service_tickets",
        entityExternalId: "QA-TICKET-APPROVAL",
        title: "Approve maintenance dispatch",
        metadata: { origin: "ui", source: "playwright" },
      },
    })

    expect(createResponse.status()).toBe(201)
    const created = await createResponse.json()
    expect(created.id).toBeTruthy()
    expect(created.workflow.executionMode).toMatch(/request|approval/)

    const decisionResponse = await page.request.patch("/api/site-management/actions", {
      data: {
        id: created.id,
        status: "approved",
        actionType: "ticket.update.request",
        entityTable: "service_tickets",
      },
    })

    expect(decisionResponse.status()).toBe(200)
    const decision = await decisionResponse.json()
    expect(decision.id).toBe(created.id)
    expect(decision.status).toBe("approved")
    expect(decision.workflow.decisionStatus).toBe("approved")
    expect(decision.workflow.decidedByRole).toBe("manager")
  })

  test("staff cannot submit a new ticket request", async ({ page }) => {
    await setAccessRole(page, "staff")
    const response = await page.request.post("/api/site-management/tickets", {
      data: {
        title: "Unauthorized staff-created ticket",
        description: "This should be denied because staff only updates assigned work.",
      },
    })

    expect(response.status()).toBe(403)
  })

  test("AI chat can create a draft ticket but keeps human approval required", async ({ page }) => {
    await setAccessRole(page, "manager")
    const response = await page.request.post("/api/ai/chat", {
      data: {
        message: "Please create an urgent service ticket for unit A-011 because the balcony door is stuck.",
      },
    })

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.ticketDraft?.id).toBeTruthy()
    expect(payload.ticketDraft?.status).toBe("submitted")
    expect(payload.ticketDraft?.requiresHumanApproval).toBe(true)
  })

  test("dashboard action menu opens, supports Escape, and avoids horizontal overflow", async ({ page }) => {
    await openDashboardAs(page, "manager", "/tr/dashboard/tickets")
    await page.setViewportSize({ width: 390, height: 844 })

    const actionMenu = page.getByRole("button", { name: /Servis talebi aksiyonlari|Aksiyonlar/i }).first()
    await expect(actionMenu).toBeVisible()
    await actionMenu.click()

    const menu = page.getByRole("menu").first()
    await expect(menu).toBeVisible()
    await expect(page.getByRole("menuitem").first()).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(menu).toBeHidden()

    const overflow = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    )
    expect(overflow).toBeLessThanOrEqual(2)
  })

  test("manager can submit and approve a ticket workflow from the mobile action menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openDashboardAs(page, "manager", "/tr/dashboard/tickets")

    const actionMenu = page.getByRole("button", { name: /Servis talebi aksiyonlar|Aksiyonlar/i }).first()
    await expect(actionMenu).toBeVisible()
    await actionMenu.click()

    const menu = page.getByRole("menu").first()
    await expect(menu).toBeVisible()
    await page.getByRole("menuitem").first().click()

    const requestTitle = page.getByText("Servis SLA ve kanıt kuyruğu incelemesi").first()
    await expect(requestTitle).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("Onaya gönderildi").first()).toBeVisible()

    await page.getByRole("button", { name: /Onayla/i }).first().click()
    await expect(page.getByText("Onaylandı").first()).toBeVisible({ timeout: 10_000 })

    const overflow = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    )
    expect(overflow).toBeLessThanOrEqual(2)
  })
})
