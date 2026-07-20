import { expect, test, type Page } from "@playwright/test"
import {
  canonicalImportEventKey,
  escapeIcsText,
  foldIcsLine,
  previewIcsImport,
  serializePrivacyReducedCalendar,
  toCalendarImportRpcItems,
  unfoldIcsLines,
  type PrivacyReducedCalendarEvent,
} from "../../lib/ics-calendar"
import {
  OfflineRepositoryError,
  applyOfflineReceipt,
  createOfflineCommand,
  offlineQueueRequiresPurge,
  orderedOfflineReplayBatch,
  parseOfflineCommandReceipt,
  toOfflineCommandRpcArgs,
  toOfflineConflictResolutionRpcArgs,
  validateOfflinePayload,
  type OfflineQueueOwnerScope,
} from "../../lib/offline-sync-repository"
import {
  OFFLINE_QUEUE_DATABASE,
  validateOfflineSafePayload,
} from "../../components/offline-sync/offline-queue"
import { openDashboardAs } from "../support/flows"

const UUIDS = {
  client: "10000000-0000-4000-8000-000000000001",
  company: "10000000-0000-4000-8000-000000000002",
  user: "10000000-0000-4000-8000-000000000003",
  site: "10000000-0000-4000-8000-000000000004",
  unit: "10000000-0000-4000-8000-000000000005",
  ticket: "10000000-0000-4000-8000-000000000006",
  serverCommand: "10000000-0000-4000-8000-000000000007",
} as const

const staffScope: OfflineQueueOwnerScope = {
  userId: UUIDS.user,
  companyId: UUIDS.company,
  role: "staff",
}

function eventBlock(input: {
  uid: string
  sequence: number
  startsAt?: string
  endsAt?: string
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED"
  summary?: string
  attendee?: string
}): string {
  return [
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `SEQUENCE:${input.sequence}`,
    `DTSTART:${input.startsAt ?? "20260714T090000Z"}`,
    `DTEND:${input.endsAt ?? "20260714T100000Z"}`,
    "LAST-MODIFIED:20260713T120000Z",
    `STATUS:${input.status ?? "CONFIRMED"}`,
    `SUMMARY:${input.summary ?? "Shared facility"}`,
    ...(input.attendee ? [`ATTENDEE:${input.attendee}`] : []),
    "END:VEVENT",
  ].join("\r\n")
}

test.describe("Window 3 pure calendar and offline contracts", () => {
  test("serializes stable privacy-reduced UIDs with escaping, folding, updates, and cancellation", () => {
    const sensitiveRuntimeFields = {
      residentName: "Must Not Leak Resident",
      unitNo: "A-018",
      guestEmail: "resident@example.invalid",
    }
    const events: PrivacyReducedCalendarEvent[] = [
      {
        uid: "booking-z@1cati",
        sequence: 4,
        startsAt: "2026-07-14T09:00:00.000Z",
        endsAt: "2026-07-14T10:30:00.000Z",
        updatedAt: "2026-07-13T12:00:00.000Z",
        status: "cancelled",
        resourceLabel:
          "Havuz, Spa; çok uzun ortak alan adı, güvenli UTF-8 katlama doğrulaması için uzatılmış etiket",
        ...sensitiveRuntimeFields,
      } as PrivacyReducedCalendarEvent,
      {
        uid: "booking-a@1cati",
        sequence: 2,
        startsAt: "2026-07-14T07:00:00.000Z",
        endsAt: "2026-07-14T08:00:00.000Z",
        updatedAt: "2026-07-13T11:00:00.000Z",
        status: "confirmed",
        resourceLabel: "Toplantı odası",
      },
    ]

    const calendar = serializePrivacyReducedCalendar({
      calendarName: "1Çatı, operasyon; takvimi",
      generatedAt: "2026-07-14T06:00:00.000Z",
      events,
    })
    const unfolded = unfoldIcsLines(calendar)
    const physicalLines = calendar.trimEnd().split("\r\n")

    expect(calendar).toMatch(/\r\n$/)
    expect(calendar.replace(/\r\n/g, "")).not.toContain("\n")
    expect(
      physicalLines.every(
        (line) => new TextEncoder().encode(line).byteLength <= 75
      )
    ).toBe(true)
    expect(unfolded.indexOf("UID:booking-a@1cati")).toBeLessThan(
      unfolded.indexOf("UID:booking-z@1cati")
    )
    expect(unfolded).toContain("SEQUENCE:4")
    expect(unfolded).toContain("STATUS:CANCELLED")
    expect(unfolded).toContain("TRANSP:TRANSPARENT")
    expect(unfolded).toContain("DTSTART;TZID=Europe/Istanbul:20260714T120000")
    expect(unfolded).toContain(
      `X-WR-CALNAME:${escapeIcsText("1Çatı, operasyon; takvimi", 160)}`
    )
    expect(unfolded.some((line) => line.includes("Havuz\\, Spa\\;"))).toBe(true)
    expect(calendar).not.toContain(sensitiveRuntimeFields.residentName)
    expect(calendar).not.toContain(sensitiveRuntimeFields.unitNo)
    expect(calendar).not.toContain(sensitiveRuntimeFields.guestEmail)

    const folded = foldIcsLine(`DESCRIPTION:${"ç".repeat(80)}`)
    expect(folded).toContain("\r\n ")
    expect(unfoldIcsLines(folded)).toEqual([`DESCRIPTION:${"ç".repeat(80)}`])
  })

  test("classifies duplicate, update, stale, conflict, and cancelled ICS previews without persisting summary text", async () => {
    const duplicateCanonicalKey = canonicalImportEventKey({
      startsAt: "2026-07-14T09:00:00.000Z",
      endsAt: "2026-07-14T10:00:00.000Z",
      status: "CONFIRMED",
      summary: "Shared facility",
    })
    const conflictCanonicalKey = canonicalImportEventKey({
      startsAt: "2026-07-14T09:00:00.000Z",
      endsAt: "2026-07-14T10:00:00.000Z",
      status: "CONFIRMED",
      summary: "Original label",
    })
    const calendar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "X-WR-CALNAME:UC18 QA",
      eventBlock({
        uid: "duplicate@1cati",
        sequence: 1,
        attendee: "mailto:private@example.invalid",
      }),
      eventBlock({
        uid: "duplicate@1cati",
        sequence: 2,
        summary: "Second copy",
      }),
      eventBlock({ uid: "update@1cati", sequence: 3 }),
      eventBlock({ uid: "stale@1cati", sequence: 1 }),
      eventBlock({
        uid: "conflict@1cati",
        sequence: 2,
        summary: "Changed label",
      }),
      eventBlock({ uid: "cancelled@1cati", sequence: 5, status: "CANCELLED" }),
      "END:VCALENDAR",
      "",
    ].join("\r\n")

    const preview = previewIcsImport(calendar, [
      {
        uid: "duplicate@1cati",
        sequence: 1,
        canonicalKey: duplicateCanonicalKey,
      },
      { uid: "update@1cati", sequence: 2 },
      { uid: "stale@1cati", sequence: 2 },
      {
        uid: "conflict@1cati",
        sequence: 2,
        canonicalKey: conflictCanonicalKey,
      },
      { uid: "cancelled@1cati", sequence: 4 },
    ])

    expect(preview.calendarName).toBe("UC18 QA")
    expect(preview.events.map((event) => event.classification)).toEqual([
      "duplicate",
      "duplicate",
      "update",
      "stale",
      "conflict",
      "cancelled",
    ])
    expect(preview.events[1].duplicateOfIndex).toBe(0)
    expect(preview.totals).toMatchObject({
      duplicate: 2,
      update: 1,
      stale: 1,
      conflict: 1,
      cancelled: 1,
    })
    expect(preview.warnings).toContain(
      "ATTENDEE was omitted from the privacy-reduced preview."
    )

    const rpcItems = await toCalendarImportRpcItems(preview)
    expect(rpcItems).toHaveLength(6)
    expect(Object.keys(rpcItems[0]).sort()).toEqual([
      "contentDigest",
      "endsAt",
      "externalUid",
      "occurrenceKey",
      "sequence",
      "startsAt",
      "status",
    ])
    expect(rpcItems[0].contentDigest).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(rpcItems)).not.toContain("Shared facility")
    expect(JSON.stringify(rpcItems)).not.toContain("private@example.invalid")
  })

  test("accepts only bounded offline-safe payloads and applies matching authoritative receipts", async () => {
    validateOfflineSafePayload("ticket.field_note.append", {
      ticketId: UUIDS.ticket,
      expectedVersion: 3,
      body: "Saha kontrolü tamamlandı.",
      visibility: "internal",
    })
    expect(() =>
      validateOfflineSafePayload("ticket.create", {
        siteId: UUIDS.site,
        unitId: UUIDS.unit,
        title: "Unsafe urgency",
        category: "emergency",
        priority: "urgent",
      } as never)
    ).toThrow(/authoritative check/i)
    expect(() =>
      validateOfflinePayload(
        "ticket.create",
        {
          siteId: UUIDS.site,
          unitId: UUIDS.unit,
          title: "Sensitive payload",
          category: "general",
          priority: "normal",
          payment: { amount: 500 },
        },
        null
      )
    ).toThrow(OfflineRepositoryError)

    const command = await createOfflineCommand({
      clientInstanceId: UUIDS.client,
      sequence: 1,
      commandType: "ticket.field_note.append",
      expectedVersion: 3,
      payload: {
        ticketId: UUIDS.ticket,
        body: "Saha kontrolü tamamlandı.",
        visibility: "internal",
      },
      ownerScope: staffScope,
      idempotencyKey: "offline:uc18:field-note:1",
      now: new Date("2026-07-14T10:00:00.000Z"),
    })
    expect(command).toMatchObject({
      sequence: 1,
      commandType: "ticket.field_note.append",
      status: "queued",
      attemptCount: 0,
      expiresAt: "2026-07-17T10:00:00.000Z",
    })
    expect(command.payloadDigest).toMatch(/^[0-9a-f]{64}$/)
    expect(toOfflineCommandRpcArgs(command)).toMatchObject({
      p_client_instance_id: UUIDS.client,
      p_client_sequence: 1,
      p_idempotency_key: "offline:uc18:field-note:1",
      p_command_type: "ticket.field_note.append",
      p_expected_version: 3,
    })

    const receipt = parseOfflineCommandReceipt({
      command_id: UUIDS.serverCommand,
      status: "conflict",
      command_type: "ticket.field_note.append",
      client_sequence: 1,
      result_entity_id: UUIDS.ticket,
      result_version: 3,
      server_version: 8,
      error_code: "OFFLINE_VERSION_CONFLICT",
      next_retry_at: null,
      replayed: false,
    })
    const conflicted = applyOfflineReceipt(
      command,
      receipt,
      new Date("2026-07-14T10:01:00.000Z")
    )
    expect(conflicted).toMatchObject({
      status: "conflict",
      serverVersion: 8,
      lastErrorCode: "OFFLINE_VERSION_CONFLICT",
      resultEntityId: UUIDS.ticket,
    })
    expect(orderedOfflineReplayBatch([conflicted])).toEqual([])

    const resolution = await toOfflineConflictResolutionRpcArgs(
      conflicted,
      "retry_with_current",
      "offline:uc18:resolve:1",
      8
    )
    expect(resolution).toMatchObject({
      p_resolution: "retry_with_current",
      p_new_expected_version: 8,
      p_idempotency_key: "offline:uc18:resolve:1",
    })
    expect(
      offlineQueueRequiresPurge(staffScope, { ...staffScope, role: "manager" })
    ).toBe(true)
    expect(offlineQueueRequiresPurge(staffScope, staffScope)).toBe(false)
    expect(() => parseOfflineCommandReceipt({ status: "applied" })).toThrow(
      /receipt is malformed/i
    )
  })
})

type DeviceQueueState = {
  items: Array<{
    id: string
    status: string
    commandType: string
    payload: Record<string, unknown>
    conflict: { commandId?: string; serverVersion?: number } | null
  }>
  lastPurgeReason: string | null
}

async function readDeviceQueue(page: Page): Promise<DeviceQueueState> {
  return page.evaluate(async (databaseName) => {
    const databases = await indexedDB.databases()
    if (!databases.some((database) => database.name === databaseName)) {
      return { items: [], lastPurgeReason: null }
    }

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName)
      request.addEventListener("success", () => resolve(request.result), {
        once: true,
      })
      request.addEventListener(
        "error",
        () => reject(request.error ?? new Error("IndexedDB open failed")),
        { once: true }
      )
    })
    if (
      !database.objectStoreNames.contains("commands") ||
      !database.objectStoreNames.contains("meta")
    ) {
      database.close()
      return { items: [], lastPurgeReason: null }
    }

    const transaction = database.transaction(["commands", "meta"], "readonly")
    const itemsRequest = transaction.objectStore("commands").getAll()
    const purgeRequest = transaction.objectStore("meta").get("lastPurgeReason")
    const [items, purgeRecord] = await Promise.all([
      new Promise<unknown[]>((resolve, reject) => {
        itemsRequest.addEventListener(
          "success",
          () => resolve(itemsRequest.result),
          {
            once: true,
          }
        )
        itemsRequest.addEventListener(
          "error",
          () =>
            reject(itemsRequest.error ?? new Error("IndexedDB read failed")),
          { once: true }
        )
      }),
      new Promise<{ value?: string } | undefined>((resolve, reject) => {
        purgeRequest.addEventListener(
          "success",
          () => resolve(purgeRequest.result),
          {
            once: true,
          }
        )
        purgeRequest.addEventListener(
          "error",
          () =>
            reject(
              purgeRequest.error ?? new Error("IndexedDB meta read failed")
            ),
          { once: true }
        )
      }),
    ])
    database.close()
    return {
      items: items as DeviceQueueState["items"],
      lastPurgeReason:
        typeof purgeRecord?.value === "string" ? purgeRecord.value : null,
    }
  }, OFFLINE_QUEUE_DATABASE)
}

async function seedFieldNote(page: Page, body: string): Promise<string> {
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("cati-offline-actor")))
    .not.toBeNull()

  const id = await page.evaluate(
    async ({ databaseName, ticketId, noteBody }) => {
      const actorKey = localStorage.getItem("cati-offline-actor")
      if (!actorKey) throw new Error("Offline actor scope was not initialized.")

      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1)
        request.addEventListener("upgradeneeded", () => {
          const upgradeDatabase = request.result
          if (!upgradeDatabase.objectStoreNames.contains("commands")) {
            const commands = upgradeDatabase.createObjectStore("commands", {
              keyPath: "id",
            })
            commands.createIndex("actor_sequence", ["actorKey", "sequence"], {
              unique: true,
            })
            commands.createIndex("actor_status", ["actorKey", "status"])
            commands.createIndex("expires_at", "expiresAt")
          }
          if (!upgradeDatabase.objectStoreNames.contains("meta")) {
            upgradeDatabase.createObjectStore("meta", { keyPath: "key" })
          }
        })
        request.addEventListener("success", () => resolve(request.result), {
          once: true,
        })
        request.addEventListener(
          "error",
          () => reject(request.error ?? new Error("IndexedDB seed open failed")),
          { once: true }
        )
      })
      const now = new Date()
      const commandId = crypto.randomUUID()
      const clientId =
        localStorage.getItem("cati-offline-client-id") ?? crypto.randomUUID()
      localStorage.setItem("cati-offline-client-id", clientId)
      const transaction = database.transaction("commands", "readwrite")
      transaction.objectStore("commands").put({
        id: commandId,
        idempotencyKey: `offline:${clientId}:${commandId}`,
        actorKey,
        role: actorKey.split(":").at(-1) ?? "staff",
        clientId,
        sequence: 1,
        commandType: "ticket.field_note.append",
        payload: {
          ticketId,
          expectedVersion: 3,
          body: noteBody,
          visibility: "internal",
        },
        payloadFingerprint: "a".repeat(64),
        status: "queued",
        attempts: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 72 * 60 * 60 * 1_000).toISOString(),
        nextAttemptAt: null,
        lastError: null,
        conflict: null,
      })
      await new Promise<void>((resolve, reject) => {
        transaction.addEventListener("complete", () => resolve(), { once: true })
        transaction.addEventListener(
          "error",
          () => reject(transaction.error ?? new Error("IndexedDB seed failed")),
          { once: true }
        )
        transaction.addEventListener(
          "abort",
          () => reject(transaction.error ?? new Error("IndexedDB seed aborted")),
          { once: true }
        )
      })
      database.close()
      const channel = new BroadcastChannel("cati-offline-sync-v1")
      channel.postMessage({ type: "queue-changed" })
      channel.close()
      return commandId
    },
    { databaseName: OFFLINE_QUEUE_DATABASE, ticketId: UUIDS.ticket, noteBody: body }
  )
  await expect
    .poll(async () => (await readDeviceQueue(page)).items.length)
    .toBe(1)
  return id
}

async function ensureServiceWorkerControl(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  if (
    !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
  ) {
    await page.reload({ waitUntil: "domcontentloaded" })
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
  }
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller))
    )
    .toBe(true)
}

function readinessPayload() {
  return {
    source: "unavailable",
    generatedAt: "2026-07-14T10:00:00.000Z",
    contexts: [],
    quality: {
      authoritativeReplay: false,
      sensitiveActionsBlockedOffline: true,
      queueRetentionHours: 72,
      queueLimit: 50,
    },
  }
}

test.describe("Window 3 browser-local offline evidence", () => {
  test("IndexedDB survives a hard reload, while role change and logout purge the device queue", async ({
    context,
    page,
  }) => {
    await context.route(
      "**/api/site-management/offline-sync",
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(readinessPayload()),
          })
          return
        }
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            status: "retry",
            error: "Mocked authoritative service unavailable",
          }),
        })
      }
    )

    await openDashboardAs(page, "staff", "/tr/dashboard/offline")
    await expect(
      page.getByRole("heading", { name: "Sahada güvenli çalışma" })
    ).toBeVisible()
    await context.setOffline(true)
    await seedFieldNote(page, "Hard reload persistence proof")
    const beforeReload = await readDeviceQueue(page)
    expect(beforeReload.items).toHaveLength(1)
    expect(beforeReload.items[0]).toMatchObject({
      commandType: "ticket.field_note.append",
      payload: {
        body: "Hard reload persistence proof",
        visibility: "internal",
      },
    })

    await context.setOffline(false)
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(
      page.getByRole("heading", { name: "Sahada güvenli çalışma" })
    ).toBeVisible()
    const afterReload = await readDeviceQueue(page)
    expect(afterReload.items).toHaveLength(1)
    expect(afterReload.items[0].id).toBe(beforeReload.items[0].id)
    expect(afterReload.items[0].payload.body).toBe(
      "Hard reload persistence proof"
    )

    await ensureServiceWorkerControl(page)
    const roleChangeStatus = await page.evaluate(async () => {
      const response = await fetch("/api/access-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "manager" }),
      })
      return response.status
    })
    expect(roleChangeStatus).toBe(200)
    await expect
      .poll(async () => (await readDeviceQueue(page)).items.length)
      .toBe(0)

    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(
      page.getByRole("heading", { name: "Sahada güvenli çalışma" })
    ).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage.getItem("cati-offline-actor")?.endsWith(":manager")
        )
      )
      .toBe(true)
    await seedFieldNote(page, "Logout purge proof")
    const logoutStatus = await page.evaluate(async () => {
      const response = await fetch("/api/access-profile", { method: "DELETE" })
      return response.status
    })
    expect(logoutStatus).toBe(200)
    await expect
      .poll(async () => (await readDeviceQueue(page)).items.length)
      .toBe(0)
  })

  test("two tabs perform one mocked replay and retain an explicit conflict until resolution", async ({
    context,
    page,
  }) => {
    let mutationCount = 0
    await context.route(
      "**/api/site-management/offline-sync",
      async (route) => {
        const request = route.request()
        if (request.method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(readinessPayload()),
          })
          return
        }

        mutationCount += 1
        const body = request.postDataJSON() as { action?: string }
        if (body.action === "resolve") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ status: "succeeded" }),
          })
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 750))
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            status: "conflict",
            code: "OFFLINE_VERSION_CONFLICT",
            error: "Mocked server version changed",
            commandId: UUIDS.serverCommand,
            serverVersion: 8,
            serverState: { version: 8 },
          }),
        })
      }
    )

    await openDashboardAs(page, "staff", "/tr/dashboard/offline")
    const secondPage = await context.newPage()
    await secondPage.goto("/tr/dashboard/offline")
    await expect(
      secondPage.getByRole("heading", { name: "Sahada güvenli çalışma" })
    ).toBeVisible()

    await context.setOffline(true)
    await seedFieldNote(page, "Two-tab conflict proof")
    await context.setOffline(false)

    await expect
      .poll(async () => (await readDeviceQueue(page)).items[0]?.status, {
        timeout: 10_000,
      })
      .toBe("conflict")
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    expect(mutationCount).toBe(1)
    const conflicted = (await readDeviceQueue(page)).items[0]
    expect(conflicted.conflict).toMatchObject({
      commandId: UUIDS.serverCommand,
      serverVersion: 8,
    })

    await page
      .getByRole("button", { name: "Sunucu sürümüyle yeniden dene" })
      .click()
    await expect
      .poll(async () => (await readDeviceQueue(page)).items.length)
      .toBe(0)
    expect(mutationCount).toBe(2)
    await secondPage.close()
  })
})

test("Turkish UC18 calendar and offline failures remain localized at 360px", async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await context.route(
    "**/api/site-management/booking-lifecycle",
    async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "BOOKING_CONFIGURATION_UNAVAILABLE" },
        }),
      })
    }
  )
  await context.route("**/api/site-management/offline-sync", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "OFFLINE_CONFIGURATION_UNAVAILABLE" },
      }),
    })
  })

  await openDashboardAs(page, "manager", "/tr/dashboard/calendar")
  await expect(
    page.getByRole("tablist", { name: "Sakin yolculuğu bölümleri" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Rezervasyon ve tesis kullanımı" })
  ).toBeVisible()
  const calendarAlert = page.getByRole("alert").filter({
    hasText: "Kalıcı rezervasyon hizmeti",
  })
  await expect(calendarAlert).toContainText(
    "Kalıcı rezervasyon hizmeti şu anda hazır değil."
  )
  await expect(calendarAlert).not.toContainText(
    /Persistent booking|repository fallback|Repository fallback/i
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true)

  await page.goto("/tr/dashboard/offline")
  await expect(
    page.getByRole("heading", { name: "Sahada güvenli çalışma" })
  ).toBeVisible()
  const offlineAlert = page.getByRole("alert").filter({
    hasText: "Çevrimdışı hazırlık bilgisi",
  })
  await expect(offlineAlert).toContainText(
    "Çevrimdışı hazırlık bilgisi alınamadı."
  )
  await expect(offlineAlert).not.toContainText(/Offline readiness|repository/i)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true)
})
