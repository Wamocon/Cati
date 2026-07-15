import { expect, test } from "@playwright/test"
import { openDashboardAs, setAccessRole } from "../support/flows"

test.describe("Workflow actions and compact action menus", () => {
  test("manager creates one authoritative ticket for human triage", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")
    const missingKey = await page.request.post("/api/site-management/tickets", {
      data: {
        title: "Missing idempotency contract",
        description: "A valid create must still supply a stable retry key.",
        priority: "normal",
        category: "maintenance",
        unitNo: "A-011",
      },
    })
    expect(missingKey.status()).toBe(400)
    expect((await missingKey.json()).code).toBe(
      "TICKET_IDEMPOTENCY_KEY_INVALID"
    )

    const response = await page.request.post("/api/site-management/tickets", {
      headers: {
        "Idempotency-Key": `ticket:e2e:workflow-create:${Date.now()}`,
      },
      data: {
        title: "Balcony door handle is loose",
        description:
          "Resident reports a loose handle. Please triage as normal service.",
        priority: "normal",
        category: "maintenance",
        unitNo: "A-011",
      },
    })

    expect(response.status()).toBe(201)
    const payload = await response.json()
    expect(payload.id).toBeTruthy()
    expect(payload.status).toBe("completed")
    expect(payload.ticket.id).toBe(payload.id)
    expect(payload.workflow.primaryState).toBe("submitted")
    expect(payload.routing.assigned).toBe(false)
    expect(payload.routing.autoDispatchAuthorized).toBe(false)
  })

  test("manager can approve an audited ticket action request", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")

    const createResponse = await page.request.post(
      "/api/site-management/actions",
      {
        data: {
          actionType: "ticket.update.request",
          entityTable: "service_tickets",
          entityExternalId: "QA-TICKET-APPROVAL",
          title: "Approve maintenance dispatch",
          metadata: { origin: "ui", source: "playwright" },
        },
      }
    )

    expect(createResponse.status()).toBe(201)
    const created = await createResponse.json()
    expect(created.id).toBeTruthy()
    expect(created.workflow.executionMode).toMatch(/request|approval/)

    const decisionResponse = await page.request.patch(
      "/api/site-management/actions",
      {
        data: {
          id: created.id,
          status: "approved",
          actionType: "ticket.update.request",
          entityTable: "service_tickets",
        },
      }
    )

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
      headers: {
        "Idempotency-Key": `ticket:e2e:staff-forbidden:${Date.now()}`,
      },
      data: {
        title: "Unauthorized staff-created ticket",
        description:
          "This should be denied because staff only updates assigned work.",
      },
    })

    expect(response.status()).toBe(403)
  })

  test("owner and tenant ticket creation is restricted to authorized units", async ({
    page,
  }) => {
    await setAccessRole(page, "owner")
    const ownerDenied = await page.request.post(
      "/api/site-management/tickets",
      {
        headers: {
          "Idempotency-Key": `ticket:e2e:owner-unit-forbidden:${Date.now()}`,
        },
        data: {
          title: "Wrong owner unit request",
          description: "Owner must not create a ticket for another unit.",
          unitNo: "A-011",
        },
      }
    )
    expect(ownerDenied.status()).toBe(403)

    const ownerAllowed = await page.request.post(
      "/api/site-management/tickets",
      {
        headers: { "Idempotency-Key": `ticket:e2e:owner-create:${Date.now()}` },
        data: {
          title: "Owner authorized unit request",
          description: "Owner can create a ticket for their own unit.",
          unitNo: "A-001",
        },
      }
    )
    expect(ownerAllowed.status()).toBe(201)

    await setAccessRole(page, "tenant")
    const tenantDenied = await page.request.post(
      "/api/site-management/tickets",
      {
        headers: {
          "Idempotency-Key": `ticket:e2e:tenant-unit-forbidden:${Date.now()}`,
        },
        data: {
          title: "Wrong tenant unit request",
          description: "Tenant must not create a ticket for another unit.",
          unitNo: "A-001",
        },
      }
    )
    expect(tenantDenied.status()).toBe(403)

    const tenantAllowed = await page.request.post(
      "/api/site-management/tickets",
      {
        headers: {
          "Idempotency-Key": `ticket:e2e:tenant-create:${Date.now()}`,
        },
        data: {
          title: "Tenant authorized unit request",
          description: "Tenant can create a ticket for their authorized unit.",
          unitNo: "A-018",
        },
      }
    )
    expect(tenantAllowed.status()).toBe(201)
  })

  test("owner and tenant ticket queues only return authorized units", async ({
    page,
  }) => {
    await setAccessRole(page, "owner")
    const ownerQueue = await page.request.get(
      "/api/site-management/tickets?limit=80"
    )
    expect(ownerQueue.status()).toBe(200)
    const ownerPayload = await ownerQueue.json()
    expect(
      ownerPayload.tickets.every((ticket: { flatNumber: string }) =>
        ["A-001", "A-054", "D-023"].includes(ticket.flatNumber)
      )
    ).toBe(true)

    await setAccessRole(page, "tenant")
    const tenantQueue = await page.request.get(
      "/api/site-management/tickets?limit=80"
    )
    expect(tenantQueue.status()).toBe(200)
    const tenantPayload = await tenantQueue.json()
    expect(
      tenantPayload.tickets.every((ticket: { flatNumber: string }) =>
        ["A-018", "A-023"].includes(ticket.flatNumber)
      )
    ).toBe(true)
  })

  test("accepted urgent plumbing request creates one order and assigned workforce task", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")
    const title = `A-104 water leak / no water / plumbing emergency ${Date.now()}`
    const createResponse = await page.request.post(
      "/api/site-management/tickets",
      {
        headers: {
          "Idempotency-Key": `ticket:e2e:plumbing-create:${Date.now()}`,
        },
        data: {
          title,
          description:
            "Resident reports no water and a visible plumbing leak. Route to emergency plumber.",
          priority: "urgent",
          category: "plumbing",
          unitNo: "A-104",
        },
      }
    )

    expect(createResponse.status()).toBe(201)
    const created = await createResponse.json()
    expect(created.id).toBeTruthy()
    expect(created.workflow.primaryState).toBe("submitted")
    expect(created.routing).toMatchObject({
      suggestedAssignee: "Plumbing response queue",
      assigned: false,
      emergency: false,
      autoDispatchAuthorized: false,
    })

    const triageKey = `ticket:e2e:plumbing-triage:${Date.now()}`
    const triageResponse = await page.request.patch(
      "/api/site-management/tickets",
      {
        headers: { "Idempotency-Key": triageKey },
        data: {
          ticketId: created.ticket.id,
          command: "triage",
          expectedVersion: created.ticket.version,
          idempotencyKey: triageKey,
        },
      }
    )
    expect(triageResponse.status()).toBe(200)
    const triaged = await triageResponse.json()

    const acceptKey = `ticket:e2e:plumbing-accept:${Date.now()}`
    const acceptResponse = await page.request.patch(
      "/api/site-management/tickets",
      {
        headers: { "Idempotency-Key": acceptKey },
        data: {
          ticketId: created.ticket.id,
          command: "accept",
          expectedVersion: triaged.ticket.version,
          idempotencyKey: acceptKey,
        },
      }
    )
    expect(acceptResponse.status()).toBe(200)
    const accepted = await acceptResponse.json()

    const assignKey = `ticket:e2e:plumbing-assign:${Date.now()}`
    const assignResponse = await page.request.patch(
      "/api/site-management/tickets",
      {
        headers: { "Idempotency-Key": assignKey },
        data: {
          ticketId: created.ticket.id,
          command: "assign",
          assignee: created.routing.suggestedAssignee,
          expectedVersion: accepted.ticket.version,
          idempotencyKey: assignKey,
        },
      }
    )
    expect(assignResponse.status()).toBe(200)
    expect((await assignResponse.json()).ticket).toMatchObject({
      workflowState: "assigned",
      assignee: "Plumbing response queue",
    })

    const queueResponse = await page.request.get(
      "/api/site-management/tickets?limit=80"
    )
    expect(queueResponse.status()).toBe(200)
    const queue = await queueResponse.json()
    const ticket = queue.tickets.find(
      (item: { title?: string }) => item.title === title
    )
    expect(ticket).toBeTruthy()
    expect(ticket.priority).toBe("urgent")
    expect(ticket.flatNumber).toBe("A-104")
    const orders = queue.orders.filter(
      (order: { ticketId?: string }) => order.ticketId === ticket.id
    )
    expect(orders).toHaveLength(1)
    expect(orders[0]).toMatchObject({ assignedTeam: "Teknik", slaHours: 4 })

    const tasks = queue.workforceTasks.filter(
      (task: { ticketId?: string }) => task.ticketId === ticket.id
    )
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      team: "Teknik",
      assignee: "Plumbing response queue",
    })
    expect(tasks[0].slaHoursRemaining).toBeGreaterThan(0)
    expect(tasks[0].slaHoursRemaining).toBeLessThanOrEqual(4)
  })

  test("reported urgent scenarios require human triage and reach the right SLA team", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")

    const cases = [
      {
        title: "A-104 gas smell and smoke alarm emergency",
        description:
          "Resident reports gas smell and smoke alarm in the corridor. Escalate to duty security and manager.",
        category: "life-safety",
        catalogCode: "EMERG-LIFE-SAFETY",
        team: "Guvenlik",
        assignee: "Gas response queue",
        emergency: true,
        policyCode: "gas_leak",
        slaHours: 1,
        zeroCost: true,
      },
      {
        title: "A-104 elevator stuck with resident trapped emergency",
        description:
          "Lift is stopped between floors and a resident may be trapped inside.",
        category: "elevator",
        catalogCode: "MAINT-ELEVATOR",
        team: "Teknik",
        assignee: "Elevator response queue",
        emergency: true,
        policyCode: "elevator_entrapment",
        slaHours: 1,
        zeroCost: true,
      },
      {
        title: "A-104 power outage and electrical spark emergency",
        description:
          "Apartment panel has a spark smell and the unit lost power.",
        category: "electrical",
        catalogCode: "MAINT-ELEC",
        team: "Teknik",
        assignee: "Electrical response queue",
        emergency: true,
        policyCode: "electrical_hazard",
        slaHours: 2,
        zeroCost: false,
      },
      {
        title: "A-104 sewage drain overflow emergency",
        description: "Blocked toilet and sewage overflow creates hygiene risk.",
        category: "sewer",
        catalogCode: "MAINT-SEWER",
        team: "Teknik",
        assignee: "Plumbing response queue",
        emergency: false,
        policyCode: null,
        slaHours: 3,
        zeroCost: false,
      },
      {
        title: "A-104 locked out gate barrier access emergency",
        description:
          "Resident is locked out and the vehicle barrier card is not working.",
        category: "access-maintenance",
        catalogCode: "SEC-LOCKOUT",
        team: "Guvenlik",
        assignee: "Security response queue",
        emergency: false,
        policyCode: null,
        slaHours: 2,
        zeroCost: false,
      },
      {
        title: "A-104 pool hygiene spa incident emergency",
        description:
          "Pool hygiene and spa equipment incident needs area owner and manager notification.",
        category: "amenity-spa-pool",
        catalogCode: "AMENITY-SPA-INCIDENT",
        team: "Sakin destek",
        assignee: "Resident amenity response queue",
        emergency: false,
        policyCode: null,
        slaHours: 2,
        zeroCost: false,
      },
      {
        title: "A-104 restaurant event crowd incident emergency",
        description:
          "Restaurant event crowd and reservation conflict created a guest operations incident.",
        category: "amenity-food-event",
        catalogCode: "AMENITY-FOOD-EVENT-INCIDENT",
        team: "Restoran",
        assignee: "Restaurant and event response queue",
        emergency: false,
        policyCode: null,
        slaHours: 2,
        zeroCost: false,
      },
    ] as const

    for (const scenario of cases) {
      const title = `${scenario.title} ${Date.now()}`
      const createResponse = await page.request.post(
        "/api/site-management/tickets",
        {
          headers: {
            "Idempotency-Key": `ticket:e2e:routing:${scenario.catalogCode}:${Date.now()}`,
          },
          data: {
            title,
            description: scenario.description,
            priority: "urgent",
            category: scenario.category,
            unitNo: "A-104",
          },
        }
      )

      expect(createResponse.status(), scenario.catalogCode).toBe(201)
      const created = await createResponse.json()
      expect(created.workflow.primaryState, scenario.catalogCode).toBe(
        "submitted"
      )
      expect(created.routing, scenario.catalogCode).toMatchObject({
        suggestedAssignee: scenario.assignee,
        emergency: scenario.emergency,
        emergencyPolicyCode: scenario.policyCode,
        assigned: false,
        autoDispatchAuthorized: false,
      })
      if (scenario.zeroCost) {
        expect(created.ticket.paymentWorkflowStatus, scenario.catalogCode).toBe(
          "not_required"
        )
      }

      const triageKey = `ticket:e2e:scenario-triage:${created.id}`
      const triageResponse = await page.request.patch(
        "/api/site-management/tickets",
        {
          headers: { "Idempotency-Key": triageKey },
          data: {
            ticketId: created.ticket.id,
            command: "triage",
            expectedVersion: created.ticket.version,
            idempotencyKey: triageKey,
          },
        }
      )
      expect(triageResponse.status(), scenario.catalogCode).toBe(200)
      const triaged = await triageResponse.json()

      const acceptKey = `ticket:e2e:scenario-accept:${created.id}`
      const acceptResponse = await page.request.patch(
        "/api/site-management/tickets",
        {
          headers: { "Idempotency-Key": acceptKey },
          data: {
            ticketId: created.ticket.id,
            command: "accept",
            expectedVersion: triaged.ticket.version,
            idempotencyKey: acceptKey,
          },
        }
      )
      expect(acceptResponse.status(), scenario.catalogCode).toBe(200)
      const accepted = await acceptResponse.json()

      const assignKey = `ticket:e2e:scenario-assign:${created.id}`
      const assignResponse = await page.request.patch(
        "/api/site-management/tickets",
        {
          headers: { "Idempotency-Key": assignKey },
          data: {
            ticketId: created.ticket.id,
            command: "assign",
            assignee: scenario.assignee,
            expectedVersion: accepted.ticket.version,
            idempotencyKey: assignKey,
          },
        }
      )
      expect(assignResponse.status(), scenario.catalogCode).toBe(200)

      const queueResponse = await page.request.get(
        `/api/site-management/tickets?limit=100&q=${encodeURIComponent(title)}`
      )
      expect(queueResponse.status(), scenario.catalogCode).toBe(200)
      const queue = await queueResponse.json()
      const orders = queue.orders.filter(
        (order: { ticketId?: string }) => order.ticketId === created.ticket.id
      )
      expect(orders, scenario.catalogCode).toHaveLength(1)
      expect(orders[0], scenario.catalogCode).toMatchObject({
        assignedTeam: scenario.team,
        slaHours: scenario.slaHours,
      })
      if (scenario.zeroCost) {
        expect(orders[0], scenario.catalogCode).toMatchObject({
          status: "assigned",
          debtCheckStatus: "clear",
          paymentDecision: "no_charge",
        })
        expect(orders[0].nextAction, scenario.catalogCode).not.toMatch(
          /debt|payment|finance|blocked/i
        )
      }
      const tasks = queue.workforceTasks.filter(
        (task: { ticketId?: string }) => task.ticketId === created.ticket.id
      )
      expect(tasks, scenario.catalogCode).toHaveLength(1)
      expect(tasks[0], scenario.catalogCode).toMatchObject({
        team: scenario.team,
        assignee: scenario.assignee,
      })
      expect(tasks[0].slaHoursRemaining, scenario.catalogCode).toBeGreaterThan(
        0
      )
      expect(
        tasks[0].slaHoursRemaining,
        scenario.catalogCode
      ).toBeLessThanOrEqual(scenario.slaHours)
    }
  })

  test("AI chat can create a draft ticket but keeps human approval required", async ({
    page,
  }) => {
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
        message:
          "Please create an urgent service ticket for unit A-011 because the balcony door is stuck.",
      },
    })

    expect(denied.status()).toBe(200)
    const deniedPayload = await denied.json()
    expect(deniedPayload.ticketDraft).toBeNull()

    const allowed = await page.request.post("/api/ai/chat", {
      data: {
        message:
          "Please create an urgent service ticket for unit A-001 because the balcony door is stuck.",
      },
    })

    expect(allowed.status()).toBe(200)
    const allowedPayload = await allowed.json()
    expect(allowedPayload.ticketDraft?.id).toBeTruthy()
    expect(allowedPayload.ticketDraft?.unitNo).toBe("A-001")
  })

  test("AI ticket drafting works in Turkish, English, German and Russian", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")

    const prompts = [
      {
        language: "tr",
        message:
          "A-011 daire için acil servis talebi oluştur, balkon kapı kolu sıkıştı.",
        reply: /servis|talep|SLA|borç/i,
      },
      {
        language: "en",
        message:
          "Please create an urgent service ticket for unit A-011 because the balcony door handle is stuck.",
        reply: /service|ticket|SLA|approval/i,
      },
      {
        language: "de",
        message:
          "Bitte ein dringendes Serviceticket für Wohnung A-011 anlegen, der Balkontürgriff klemmt.",
        reply: /Service|Ticket|SLA|Freigabe/i,
      },
      {
        language: "ru",
        message:
          "Создай срочную сервисную заявку для квартиры A-011: ручка балконной двери застряла.",
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

  test("AI does not create ticket drafts for roles without ticket create permission", async ({
    page,
  }) => {
    await setAccessRole(page, "staff")
    const response = await page.request.post("/api/ai/chat", {
      data: {
        message:
          "Please create an urgent service ticket for unit A-011 because the balcony door is stuck.",
      },
    })

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.role).toBe("staff")
    expect(payload.ticketDraft).toBeNull()
  })

  for (const localeCase of [
    {
      locale: "en",
      subject: "Subject",
      priority: "Priority",
      status: "Status",
    },
    {
      locale: "de",
      subject: "Betreff",
      priority: "Priorität",
      status: "Status",
    },
    { locale: "ru", subject: "Тема", priority: "Приоритет", status: "Статус" },
  ]) {
    test(`ticket table labels are localized in ${localeCase.locale}`, async ({
      page,
    }) => {
      await openDashboardAs(
        page,
        "manager",
        `/${localeCase.locale}/dashboard/tickets`
      )
      const table = page.locator("#ticket-table")
      await table.scrollIntoViewIfNeeded()

      const visibleLabels = await table.evaluate(
        (root, labels) => {
          const elements = Array.from(root.querySelectorAll("th, dt"))
          return labels.map((label) =>
            elements.some((element) => {
              const node = element as HTMLElement
              const visible = Boolean(
                node.offsetWidth ||
                node.offsetHeight ||
                node.getClientRects().length
              )
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
          const visible = Boolean(
            node.offsetWidth ||
            node.offsetHeight ||
            node.getClientRects().length
          )
          return visible && node.textContent?.trim() === "Konu"
        })
      )
      expect(visibleTurkishSubject).toBe(false)
    })
  }

  test("dashboard action menu opens, supports Escape, and avoids horizontal overflow", async ({
    page,
  }) => {
    await openDashboardAs(page, "manager", "/tr/dashboard/tickets")
    await page.setViewportSize({ width: 390, height: 844 })

    const actionMenu = page
      .getByRole("button", { name: /Servis talebi aksiyonlari|Aksiyonlar/i })
      .first()
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

  test("manager can submit and approve a ticket workflow from the mobile action menu", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openDashboardAs(page, "manager", "/tr/dashboard/tickets")

    const actionMenu = page
      .getByRole("button", { name: /Servis talebi aksiyonlar|Aksiyonlar/i })
      .first()
    await expect(actionMenu).toBeVisible()
    await actionMenu.click()

    const menu = page.getByRole("menu").first()
    await expect(menu).toBeVisible()
    await page.getByRole("menuitem").first().click()

    const requestTitle = page
      .getByText("Servis SLA ve kanıt kuyruğu incelemesi")
      .first()
    await expect(requestTitle).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("Onaya gönderildi").first()).toBeVisible()

    await page
      .getByRole("button", { name: /Onayla/i })
      .first()
      .click()
    await expect(page.getByText("Onaylandı").first()).toBeVisible({
      timeout: 10_000,
    })

    const overflow = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    )
    expect(overflow).toBeLessThanOrEqual(2)
  })
})
