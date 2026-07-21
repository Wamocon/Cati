import { expect, test, type Page } from "@playwright/test"
import { openDashboardAs, setAccessRole } from "../support/flows"

const threadId = "11111111-1111-4111-8111-111111111111"
const messageId = "22222222-2222-4222-8222-222222222222"

function workspace(locale = "en", roleScope = "managed_sites") {
  return {
    contractVersion: "portal-communications.v2",
    source: "supabase",
    generatedAt: "2026-07-14T10:00:00.000Z",
    mutationAvailable: true,
    unavailableReason: null,
    roleScope,
    providerBoundary: {
      portal: "live",
      email: "provider-ready",
      sms: "provider-ready",
      whatsapp: "provider-ready",
      push: "provider-ready",
    },
    realtimeTables: [
      "portal_communication_threads",
      "portal_communication_messages",
      "portal_communication_message_receipts",
      "portal_communication_deliveries",
      "portal_communication_outbox",
    ],
    summary: {
      openThreads: 1,
      unreadMessages: 1,
      failedDeliveries: 1,
      deadLetters: 1,
      scheduledMessages: 0,
    },
    targets: {
      sites: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", label: "New Level" }],
      units: [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", siteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", label: "A-12" }],
      participants: [
        {
          profileId: "77777777-7777-4777-8777-777777777777",
          displayLabel: "Ayşe Kaya",
          role: "owner",
          siteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          unitId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
        {
          profileId: "88888888-8888-4888-8888-888888888888",
          displayLabel: "Field technician",
          role: "staff",
          siteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          unitId: null,
        },
      ],
    },
    threads: [
      {
        id: threadId,
        subject: "Heating follow-up",
        scopeKind: "operational",
        status: "open",
        priority: "high",
        locale,
        siteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        unitId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        unitLabel: "A-12",
        assignedProfileId: null,
        unreadCount: 1,
        participantCount: 2,
        lastMessagePreview: "The radiator is still cold.",
        lastMessageAt: "2026-07-14T09:55:00.000Z",
        version: 2,
        canReply: true,
        canManage: true,
      },
    ],
    selectedThread: {
      thread: {
        id: threadId,
        subject: "Heating follow-up",
        scopeKind: "operational",
        status: "open",
        priority: "high",
        locale,
        siteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        unitId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        unitLabel: "A-12",
        assignedProfileId: null,
        unreadCount: 1,
        participantCount: 2,
        lastMessagePreview: "The radiator is still cold.",
        lastMessageAt: "2026-07-14T09:55:00.000Z",
        version: 2,
        canReply: true,
        canManage: true,
      },
      participants: [
        { profileId: "33333333-3333-4333-8333-333333333333", displayLabel: "Resident", role: "tenant", active: true },
      ],
      messages: [
        {
          id: messageId,
          senderProfileId: "33333333-3333-4333-8333-333333333333",
          senderLabel: "Resident",
          senderRole: "tenant",
          body: "The radiator is still cold.",
          locale,
          channel: "portal",
          lifecycleState: "portal_delivered",
          scheduledFor: null,
          createdAt: "2026-07-14T09:55:00.000Z",
          attachments: [],
          readByCurrentUser: false,
        },
      ],
    },
    templates: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Operational follow-up",
        purpose: "operational",
        channel: "portal",
        status: "active",
        siteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        version: 1,
        variants: ["tr", "en", "de", "ru"].map((variantLocale) => ({
          locale: variantLocale,
          subject: "Follow-up",
          body: "We are following up on your request.",
        })),
      },
    ],
    deliveries: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        threadId,
        messageId,
        channel: "email",
        state: "failed",
        recipientLabel: "r***@example.com",
        retryCount: 5,
        maxRetries: 5,
        nextRetryAt: null,
        lastError: "Provider not connected",
        providerAcknowledgedAt: null,
        version: 3,
      },
    ],
    outbox: [
      {
        id: "66666666-6666-4666-8666-666666666666",
        deliveryId: "55555555-5555-4555-8555-555555555555",
        channel: "email",
        status: "dead_letter",
        retryCount: 5,
        maxRetries: 5,
        nextRetryAt: null,
        lastError: "Provider not connected",
      },
    ],
    preferences: [],
  }
}

async function mockCommunications(
  page: Page,
  responseWorkspace: Record<string, unknown> = workspace()
) {
  const requests: Array<{ method: string; headers: Record<string, string>; body: Record<string, unknown> }> = []
  await page.route("**/api/site-management/communications**", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseWorkspace),
      })
      return
    }

    requests.push({
      method,
      headers: route.request().headers(),
      body: (route.request().postDataJSON() ?? {}) as Record<string, unknown>,
    })
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: responseWorkspace, replayed: false }),
    })
  })
  return requests
}

test.describe("persistent communication center", () => {
  test("manager opens a thread and posts an idempotent portal reply", async ({ page }) => {
    await setAccessRole(page, "manager")
    const requests = await mockCommunications(page)
    await page.goto("/en/dashboard/communications")

    await expect(page.getByRole("heading", { level: 1, name: "Communication center" })).toBeVisible()
    await expect(page.getByText("Portal live", { exact: true })).toBeVisible()
    await expect(page.getByText("External providers not connected", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: /Heating follow-up/ }).click()
    await expect(page.getByRole("article").getByText("The radiator is still cold.")).toBeVisible()

    await page.getByLabel("Message").fill("A technician will inspect it this afternoon.")
    await page.getByRole("button", { name: "Send portal reply" }).click()

    const markReadRequests = requests.filter((request) => request.body.action === "mark_read")
    expect(markReadRequests).toHaveLength(1)
    expect(markReadRequests[0].headers["idempotency-key"]).toMatch(/^communication-ui:/)
    expect(markReadRequests[0].body).toMatchObject({
      action: "mark_read",
      threadId,
      messageId,
    })

    const replyRequests = requests.filter((request) => request.body.action === "reply")
    expect(replyRequests).toHaveLength(1)
    expect(replyRequests[0].method).toBe("POST")
    expect(replyRequests[0].headers["idempotency-key"]).toMatch(/^communication-ui:/)
    expect(replyRequests[0].body).toMatchObject({
      action: "reply",
      threadId,
      body: "A technician will inspect it this afternoon.",
      channel: "portal",
    })
  })

  test("delivery failure and dead-letter truth remain visible", async ({ page }) => {
    await setAccessRole(page, "manager")
    await mockCommunications(page)
    await page.goto("/en/dashboard/communications")

    await page.getByRole("tab", { name: "Delivery" }).click()
    await expect(page.getByText("Provider not connected")).toBeVisible()
    await expect(page.getByRole("article").getByText("Undeliverable", { exact: true })).toBeVisible()
    await expect(page.getByText(/sent/i)).toHaveCount(0)
  })

  test("all four feature-local locales retain equivalent primary UI", async ({ page }) => {
    await setAccessRole(page, "manager")
    await mockCommunications(page)
    const headings = {
      tr: "İletişim merkezi",
      en: "Communication center",
      de: "Kommunikationszentrale",
      ru: "Центр коммуникаций",
    } as const

    for (const [locale, heading] of Object.entries(headings)) {
      await page.goto(`/${locale}/dashboard/communications`)
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible()
      await expect(page.getByRole("button", { name: /Heating follow-up/ })).toBeVisible()
    }
  })

  test("owner view is keyboard reachable and mobile-safe", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await setAccessRole(page, "owner")
    await mockCommunications(page, workspace("en", "verified_owner_units"))
    await openDashboardAs(page, "owner", "/en/dashboard/communications")

    const thread = page.getByRole("button", { name: /Heating follow-up/ })
    await thread.focus()
    await expect(thread).toBeFocused()
    await thread.press("Enter")
    await expect(page.getByLabel("Message")).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }))
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1)
  })

  test("load failure shows a top-level error instead of zero-like live data", async ({ page }) => {
    await setAccessRole(page, "manager")
    await page.route("**/api/site-management/communications**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "COMM_MIGRATION_REQUIRED" }),
      })
    })
    await page.goto("/en/dashboard/communications")

    await expect(page.getByRole("alert").filter({ hasText: "Real sign-in required" })).toContainText(
      "The communication workspace could not be loaded. No live data is shown."
    )
    await expect(page.getByText("Open threads", { exact: true })).toHaveCount(0)
  })

  test("manager can create the first persistent portal thread with a scoped recipient", async ({ page }) => {
    await setAccessRole(page, "manager")
    const emptyWorkspace = {
      ...workspace(),
      summary: {
        openThreads: 0,
        unreadMessages: 0,
        failedDeliveries: 0,
        deadLetters: 0,
        scheduledMessages: 0,
      },
      threads: [],
      selectedThread: null,
      deliveries: [],
      outbox: [],
    }
    const requests: Array<{ headers: Record<string, string>; body: Record<string, unknown> }> = []
    await page.route("**/api/site-management/communications**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyWorkspace) })
        return
      }
      requests.push({
        headers: route.request().headers(),
        body: (route.request().postDataJSON() ?? {}) as Record<string, unknown>,
      })
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: workspace(), result: { threadId }, replayed: false }),
      })
    })

    await page.goto("/en/dashboard/communications")
    await page.getByRole("button", { name: "Start first thread" }).click()
    await page.getByLabel("Unit (optional)").selectOption("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
    await page.getByLabel("Subject").fill("Move-in day coordination")
    await page.getByRole("checkbox", { name: /Ayşe Kaya/ }).check()
    await page.getByLabel("Priority").selectOption("high")
    await page.getByRole("button", { name: "Create portal thread" }).click()

    await expect(page.getByRole("status")).toHaveText("Portal thread created.")
    expect(requests).toHaveLength(1)
    expect(requests[0].headers["idempotency-key"]).toMatch(/^communication-ui:/)
    expect(requests[0].body).toEqual({
      action: "create_thread",
      siteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      unitId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      subject: "Move-in day coordination",
      scopeKind: "operational",
      priority: "high",
      locale: "en",
      assignedProfileId: null,
      participantProfileIds: ["77777777-7777-4777-8777-777777777777"],
    })
  })

  test("first-thread creation fails closed when no scoped recipient exists", async ({ page }) => {
    await setAccessRole(page, "manager")
    const emptyWorkspace = {
      ...workspace(),
      summary: {
        openThreads: 0,
        unreadMessages: 0,
        failedDeliveries: 0,
        deadLetters: 0,
        scheduledMessages: 0,
      },
      targets: { ...workspace().targets, participants: [] },
      threads: [],
      selectedThread: null,
    }
    const requests = await mockCommunications(page, emptyWorkspace)
    await page.goto("/en/dashboard/communications")
    await page.getByRole("button", { name: "Start first thread" }).click()
    await page.getByLabel("Subject").fill("Site-wide coordination")

    await expect(page.getByText("No eligible participant is available for this scope.", { exact: false })).toBeVisible()
    await expect(page.getByRole("button", { name: "Create portal thread" })).toBeDisabled()
    expect(requests).toHaveLength(0)
  })
})
