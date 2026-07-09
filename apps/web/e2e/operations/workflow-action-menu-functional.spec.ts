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

  test("owner and tenant ticket creation is restricted to authorized units", async ({ page }) => {
    await setAccessRole(page, "owner")
    const ownerDenied = await page.request.post("/api/site-management/tickets", {
      data: {
        title: "Wrong owner unit request",
        description: "Owner must not create a ticket for another unit.",
        unitNo: "A-011",
      },
    })
    expect(ownerDenied.status()).toBe(403)

    const ownerAllowed = await page.request.post("/api/site-management/tickets", {
      data: {
        title: "Owner authorized unit request",
        description: "Owner can create a ticket for their own unit.",
        unitNo: "A-001",
      },
    })
    expect(ownerAllowed.status()).toBe(202)

    await setAccessRole(page, "tenant")
    const tenantDenied = await page.request.post("/api/site-management/tickets", {
      data: {
        title: "Wrong tenant unit request",
        description: "Tenant must not create a ticket for another unit.",
        unitNo: "A-001",
      },
    })
    expect(tenantDenied.status()).toBe(403)

    const tenantAllowed = await page.request.post("/api/site-management/tickets", {
      data: {
        title: "Tenant authorized unit request",
        description: "Tenant can create a ticket for their authorized unit.",
        unitNo: "A-018",
      },
    })
    expect(tenantAllowed.status()).toBe(202)
  })

  test("owner and tenant ticket queues only return authorized units", async ({ page }) => {
    await setAccessRole(page, "owner")
    const ownerQueue = await page.request.get("/api/site-management/tickets?limit=80")
    expect(ownerQueue.status()).toBe(200)
    const ownerPayload = await ownerQueue.json()
    expect(
      ownerPayload.tickets.every((ticket: { flatNumber: string }) =>
        ["A-001", "A-054", "D-023"].includes(ticket.flatNumber)
      )
    ).toBe(true)

    await setAccessRole(page, "tenant")
    const tenantQueue = await page.request.get("/api/site-management/tickets?limit=80")
    expect(tenantQueue.status()).toBe(200)
    const tenantPayload = await tenantQueue.json()
    expect(
      tenantPayload.tickets.every((ticket: { flatNumber: string }) =>
        ["A-018", "A-023"].includes(ticket.flatNumber)
      )
    ).toBe(true)
  })

  test("approved emergency plumbing request creates ticket, order and workforce task", async ({ page }) => {
    await setAccessRole(page, "manager")
    const title = `A-104 water leak / no water / plumbing emergency ${Date.now()}`
    const createResponse = await page.request.post("/api/site-management/tickets", {
      data: {
        title,
        description: "Resident reports no water and a visible plumbing leak. Route to emergency plumber.",
        priority: "urgent",
        category: "plumbing",
        unitNo: "A-104",
      },
    })

    expect(createResponse.status()).toBe(202)
    const created = await createResponse.json()
    expect(created.id).toBeTruthy()

    const decisionResponse = await page.request.patch("/api/site-management/actions", {
      data: {
        id: created.id,
        status: "approved",
      },
    })

    expect(decisionResponse.status()).toBe(200)
    const decision = await decisionResponse.json()
    expect(decision.workflow.decisionStatus).toBe("approved")
    expect(decision.workflow.materializedTicket?.id).toBeTruthy()
    expect(decision.workflow.materializedTicket?.serviceOrder?.catalogCode).toBe("MAINT-PLUMB")
    expect(decision.workflow.materializedTicket?.serviceOrder?.team).toBe("Teknik")
    expect(decision.workflow.materializedTicket?.serviceOrder?.providerQueue).toBe("Teknik / plumber vendor queue")
    expect(decision.workflow.materializedTicket?.serviceOrder?.slaHours).toBe(4)
    expect(decision.workflow.materializedTicket?.workforceTask?.team).toBe("Teknik")
    expect(decision.workflow.materializedTicket?.workforceTask?.assignee).toBe("Teknik / plumber vendor queue")
    expect(decision.workflow.materializedTicket?.notification?.status).toBe("queued")
    expect(decision.workflow.materializedTicket?.humanApprovalBoundary?.required).toBe(true)

    const queueResponse = await page.request.get("/api/site-management/tickets?limit=80")
    expect(queueResponse.status()).toBe(200)
    const queue = await queueResponse.json()
    const ticket = queue.tickets.find((item: { title?: string }) => item.title === title)
    expect(ticket).toBeTruthy()
    expect(ticket.priority).toBe("urgent")
    expect(ticket.flatNumber).toBe("A-104")
    expect(
      queue.orders.some(
        (order: { ticketId?: string; catalogItemName?: string; assignedTeam?: string; slaHours?: number }) =>
          order.ticketId === ticket.id &&
          /tesisat|plumb/i.test(order.catalogItemName ?? "") &&
          order.assignedTeam === "Teknik" &&
          order.slaHours === 4
      )
    ).toBe(true)
    expect(
      queue.workforceTasks.some(
        (task: { ticketId?: string; team?: string; assignee?: string; routeSlot?: string; slaHoursRemaining?: number }) =>
          task.ticketId === ticket.id &&
          task.team === "Teknik" &&
          task.assignee === "Teknik / plumber vendor queue" &&
          /4h SLA/.test(task.routeSlot ?? "") &&
          typeof task.slaHoursRemaining === "number"
      )
    ).toBe(true)
  })

  test("approved emergency scenarios route to the right SLA queue", async ({ page }) => {
    await setAccessRole(page, "manager")

    const cases = [
      {
        title: "A-104 gas smell and smoke alarm emergency",
        description: "Resident reports gas smell and smoke alarm in the corridor. Escalate to duty security and manager.",
        category: "life-safety",
        catalogCode: "EMERG-LIFE-SAFETY",
        team: "Guvenlik",
        queue: "Guvenlik / duty manager queue",
        slaHours: 1,
        channel: "Push",
      },
      {
        title: "A-104 elevator stuck with resident trapped emergency",
        description: "Lift is stopped between floors and a resident may be trapped inside.",
        category: "elevator",
        catalogCode: "MAINT-ELEVATOR",
        team: "Teknik",
        queue: "Teknik / elevator vendor queue",
        slaHours: 1,
        channel: "Push",
      },
      {
        title: "A-104 power outage and electrical spark emergency",
        description: "Apartment panel has a spark smell and the unit lost power.",
        category: "electrical",
        catalogCode: "MAINT-ELEC",
        team: "Teknik",
        queue: "Teknik / electrician queue",
        slaHours: 2,
        channel: "Portal",
      },
      {
        title: "A-104 sewage drain overflow emergency",
        description: "Blocked toilet and sewage overflow creates hygiene risk.",
        category: "sewer",
        catalogCode: "MAINT-SEWER",
        team: "Teknik",
        queue: "Teknik / plumbing vendor queue",
        slaHours: 3,
        channel: "Portal",
      },
      {
        title: "A-104 locked out gate barrier access emergency",
        description: "Resident is locked out and the vehicle barrier card is not working.",
        category: "access-maintenance",
        catalogCode: "SEC-LOCKOUT",
        team: "Guvenlik",
        queue: "Guvenlik / access desk queue",
        slaHours: 2,
        channel: "Portal",
      },
      {
        title: "A-104 pool hygiene spa incident emergency",
        description: "Pool hygiene and spa equipment incident needs area owner and manager notification.",
        category: "amenity-spa-pool",
        catalogCode: "AMENITY-SPA-INCIDENT",
        team: "Sakin destek",
        queue: "Sakin destek / amenity duty queue",
        slaHours: 2,
        channel: "Portal",
      },
      {
        title: "A-104 restaurant event crowd incident emergency",
        description: "Restaurant event crowd and reservation conflict created a guest operations incident.",
        category: "amenity-food-event",
        catalogCode: "AMENITY-FOOD-EVENT-INCIDENT",
        team: "Restoran",
        queue: "Restoran / event duty queue",
        slaHours: 2,
        channel: "Portal",
      },
    ] as const

    for (const scenario of cases) {
      const title = `${scenario.title} ${Date.now()}`
      const createResponse = await page.request.post("/api/site-management/tickets", {
        data: {
          title,
          description: scenario.description,
          priority: "urgent",
          category: scenario.category,
          unitNo: "A-104",
        },
      })

      expect(createResponse.status(), scenario.catalogCode).toBe(202)
      const created = await createResponse.json()

      const decisionResponse = await page.request.patch("/api/site-management/actions", {
        data: {
          id: created.id,
          status: "approved",
        },
      })

      expect(decisionResponse.status(), scenario.catalogCode).toBe(200)
      const decision = await decisionResponse.json()
      const materializedTicket = decision.workflow.materializedTicket

      expect(materializedTicket?.serviceOrder?.catalogCode, scenario.catalogCode).toBe(scenario.catalogCode)
      expect(materializedTicket?.serviceOrder?.team, scenario.catalogCode).toBe(scenario.team)
      expect(materializedTicket?.serviceOrder?.providerQueue, scenario.catalogCode).toBe(scenario.queue)
      expect(materializedTicket?.serviceOrder?.slaHours, scenario.catalogCode).toBe(scenario.slaHours)
      expect(materializedTicket?.workforceTask?.team, scenario.catalogCode).toBe(scenario.team)
      expect(materializedTicket?.workforceTask?.assignee, scenario.catalogCode).toBe(scenario.queue)
      expect(materializedTicket?.workforceTask?.slaHours, scenario.catalogCode).toBe(scenario.slaHours)
      expect(materializedTicket?.notification?.channel, scenario.catalogCode).toBe(scenario.channel)
      expect(materializedTicket?.notification?.recipient, scenario.catalogCode).toBe(scenario.queue)
      expect(materializedTicket?.humanApprovalBoundary?.required, scenario.catalogCode).toBe(true)
    }
  })

  test("AI chat can create a draft ticket but keeps human approval required", async ({ page }) => {
    await setAccessRole(page, "manager")
    const response = await page.request.post("/api/ai/chat", {
      data: {
        message: "A-104 water leak / no water / plumbing emergency",
      },
    })

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.ticketDraft?.id).toBeTruthy()
    expect(payload.ticketDraft?.status).toBe("submitted")
    expect(payload.ticketDraft?.requiresHumanApproval).toBe(true)
    expect(payload.ticketDraft?.unitNo).toBe("A-104")
    expect(payload.ticketDraft?.priority).toBe("urgent")
    expect(payload.ticketDraft?.category).toBe("plumbing")
  })

  test("AI chat classifies life-safety emergency drafts", async ({ page }) => {
    await setAccessRole(page, "manager")
    const response = await page.request.post("/api/ai/chat", {
      data: {
        message: "A-104 gas smell and smoke alarm emergency",
      },
    })

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.ticketDraft?.id).toBeTruthy()
    expect(payload.ticketDraft?.unitNo).toBe("A-104")
    expect(payload.ticketDraft?.priority).toBe("urgent")
    expect(payload.ticketDraft?.category).toBe("life-safety")
    expect(payload.ticketDraft?.requiresHumanApproval).toBe(true)
  })

  test("AI ticket drafting respects owner unit scope", async ({ page }) => {
    await setAccessRole(page, "owner")
    const denied = await page.request.post("/api/ai/chat", {
      data: {
        message: "Please create an urgent service ticket for unit A-011 because the balcony door is stuck.",
      },
    })

    expect(denied.status()).toBe(200)
    const deniedPayload = await denied.json()
    expect(deniedPayload.ticketDraft).toBeNull()

    const allowed = await page.request.post("/api/ai/chat", {
      data: {
        message: "Please create an urgent service ticket for unit A-001 because the balcony door is stuck.",
      },
    })

    expect(allowed.status()).toBe(200)
    const allowedPayload = await allowed.json()
    expect(allowedPayload.ticketDraft?.id).toBeTruthy()
    expect(allowedPayload.ticketDraft?.unitNo).toBe("A-001")
  })

  test("AI ticket drafting works in Turkish, English, German and Russian", async ({ page }) => {
    await setAccessRole(page, "manager")

    const prompts = [
      {
        language: "tr",
        message: "A-011 daire için acil servis talebi oluştur, balkon kapı kolu sıkıştı.",
        reply: /servis|talep|SLA|borç/i,
      },
      {
        language: "en",
        message: "Please create an urgent service ticket for unit A-011 because the balcony door handle is stuck.",
        reply: /service|ticket|SLA|approval/i,
      },
      {
        language: "de",
        message: "Bitte ein dringendes Serviceticket für Wohnung A-011 anlegen, der Balkontürgriff klemmt.",
        reply: /Service|Ticket|SLA|Freigabe/i,
      },
      {
        language: "ru",
        message: "Создай срочную сервисную заявку для квартиры A-011: ручка балконной двери застряла.",
        reply: /[А-Яа-яЁё]/,
      },
    ]

    for (const prompt of prompts) {
      const response = await page.request.post("/api/ai/chat", {
        data: { message: prompt.message },
      })
      expect(response.status(), prompt.language).toBe(200)
      const payload = await response.json()
      expect(payload.language).toBe(prompt.language)
      expect(payload.reply).toMatch(prompt.reply)
      expect(payload.ticketDraft?.id).toBeTruthy()
      expect(payload.ticketDraft?.status).toBe("submitted")
      expect(payload.ticketDraft?.requiresHumanApproval).toBe(true)
      expect(payload.ticketDraft?.unitNo).toBe("A-011")
      expect(payload.ticketDraft?.priority).toBe("urgent")
      expect(payload.ticketDraft?.category).toBe("access-maintenance")
    }
  })

  test("AI does not create ticket drafts for roles without ticket create permission", async ({ page }) => {
    await setAccessRole(page, "staff")
    const response = await page.request.post("/api/ai/chat", {
      data: {
        message: "Please create an urgent service ticket for unit A-011 because the balcony door is stuck.",
      },
    })

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.role).toBe("staff")
    expect(payload.ticketDraft).toBeNull()
  })

  for (const localeCase of [
    { locale: "en", subject: "Subject", priority: "Priority", status: "Status" },
    { locale: "de", subject: "Betreff", priority: "Priorität", status: "Status" },
    { locale: "ru", subject: "Тема", priority: "Приоритет", status: "Статус" },
  ]) {
    test(`ticket table labels are localized in ${localeCase.locale}`, async ({ page }) => {
      await openDashboardAs(page, "manager", `/${localeCase.locale}/dashboard/tickets`)
      const table = page.locator("#ticket-table")
      await table.scrollIntoViewIfNeeded()

      const visibleLabels = await table.evaluate(
        (root, labels) => {
          const elements = Array.from(root.querySelectorAll("th, dt"))
          return labels.map((label) =>
            elements.some((element) => {
              const node = element as HTMLElement
              const visible = Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length)
              return visible && node.textContent?.trim() === label
            })
          )
        },
        [localeCase.subject, localeCase.priority, localeCase.status]
      )
      expect(visibleLabels).toEqual([true, true, true])

      const visibleTurkishSubject = await table.evaluate((root) =>
        Array.from(root.querySelectorAll("th, dt")).some((element) => {
          const node = element as HTMLElement
          const visible = Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length)
          return visible && node.textContent?.trim() === "Konu"
        })
      )
      expect(visibleTurkishSubject).toBe(false)
    })
  }

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
