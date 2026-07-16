import { expect, test } from "@playwright/test"
import { openDashboardAs } from "../support/flows"

test.describe("manager public-report triage boundary", () => {
  test("requires review before conversion and uses the exact placement poster", async ({ page }) => {
    let status = "submitted"
    let version = 1
    await page.route("**/api/site-management/public-report", async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as { action: string; expectedVersion: number }
        expect(body.expectedVersion).toBe(version)
        status = body.action === "start_review" ? "under_review" : "converted"
        version += 1
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, result: { status, version } }) })
        return
      }
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, queue: {
        sites: [{ id: "s1", label: "Ataberk Residence" }],
        placements: [{ id: "p1", siteId: "s1", siteLabel: "Ataberk Residence", publicCode: "qr_0123456789abcdef0123456789abcdef", zoneCode: "main", zoneLabels: { en: "Main entrance" }, active: true, validUntil: null }],
        reports: [{ id: "11111111-1111-4111-8111-111111111111", reference: "PR-7K4M-9Q2X", siteId: "s1", siteLabel: "Ataberk Residence", zoneCode: "main", zoneLabels: { en: "Main entrance" }, category: "technical", locationDetail: null, description: "The entrance light is broken.", contactKind: null, contactValue: null, language: "en", safetyCode: null, status, version, publicMessage: "Received.", internalReason: null, possibleDuplicateReference: null, convertedTicketId: null, consentVersion: "public-report-kvkk-2026-07-v1", retentionDueAt: "2028-07-14T09:00:00Z", createdAt: "2026-07-14T09:00:00Z", updatedAt: "2026-07-14T09:00:00Z", events: [] }],
      } }) })
    })
    await openDashboardAs(page, "manager", "/en/dashboard/public-reports")
    await expect(page.getByRole("heading", { name: "Public reports" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Open exact QR poster" })).toHaveAttribute("href", /report-poster\?qr=qr_012345/)
    await expect(page.getByRole("button", { name: "Convert to ticket" })).toBeDisabled()
    await page.getByRole("button", { name: "Start review" }).click()
    await expect(page.getByText("Under review", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Convert to ticket" })).toBeEnabled()
    await page.getByRole("button", { name: "Convert to ticket" }).click()
    await expect(page.getByText("Converted to ticket", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Convert to ticket" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /dispatch|assign workforce|call emergency/i })).toHaveCount(0)
  })

  test("creates the first real placement and links only the returned opaque token", async ({ page }) => {
    const exactToken = "qr_fedcba9876543210fedcba9876543210"
    let placements: unknown[] = []
    await page.route("**/api/site-management/public-report", async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as Record<string, unknown>
        expect(body).toMatchObject({
          command: "manage_placement",
          placementAction: "create",
          siteId: "11111111-1111-4111-8111-111111111111",
          zoneCode: "west_lobby",
          zoneLabels: {
            tr: "Batı lobi", en: "West lobby", de: "Westlobby", ru: "Западное лобби",
          },
        })
        expect(body).not.toHaveProperty("publicCode")
        placements = [{
          id: "22222222-2222-4222-8222-222222222222",
          siteId: "11111111-1111-4111-8111-111111111111",
          siteLabel: "Ataberk Residence", publicCode: exactToken,
          zoneCode: "west_lobby", zoneLabels: { tr: "Batı lobi", en: "West lobby", de: "Westlobby", ru: "Западное лобби" },
          active: true, validUntil: null,
        }]
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, result: { placement: placements[0], replayed: false } }) })
        return
      }
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, queue: {
        sites: [{ id: "11111111-1111-4111-8111-111111111111", label: "Ataberk Residence" }],
        placements,
        reports: [],
      } }) })
    })

    await openDashboardAs(page, "manager", "/en/dashboard/public-reports")
    await page.getByLabel("Zone code").fill("west_lobby")
    await page.getByLabel("Zone label (Turkish)").fill("Batı lobi")
    await page.getByLabel("Zone label (English)").fill("West lobby")
    await page.getByLabel("Zone label (German)").fill("Westlobby")
    await page.getByLabel("Zone label (Russian)").fill("Западное лобби")
    await page.getByRole("button", { name: "Create placement" }).click()
    await expect(page.getByRole("link", { name: "Open exact QR poster" })).toHaveAttribute(
      "href",
      `/en/new-level-premium/report-poster?qr=${exactToken}`
    )
  })

  for (const localized of [
    { locale: "tr", heading: "Kamusal bildirimler", create: "Konum oluştur" },
    { locale: "de", heading: "Öffentliche Meldungen", create: "QR-Bereich erstellen" },
    { locale: "ru", heading: "Публичные сообщения", create: "Создать QR-зону" },
  ]) {
    test(`localizes manager triage in ${localized.locale}`, async ({ page }) => {
      await page.route("**/api/site-management/public-report", (route) => route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true, queue: {
          sites: [{ id: "11111111-1111-4111-8111-111111111111", label: "Ataberk Residence" }],
          placements: [], reports: [],
        } }),
      }))
      await openDashboardAs(page, "manager", `/${localized.locale}/dashboard/public-reports`)
      await expect(page.getByRole("heading", { name: localized.heading })).toBeVisible()
      await expect(page.getByRole("button", { name: localized.create })).toBeVisible()
    })
  }

  for (const role of ["owner", "tenant", "staff", "accountant"]) {
    test(`${role} cannot render the public-report manager queue`, async ({ page }) => {
      await openDashboardAs(page, role, "/en/dashboard/public-reports")
      await expect(page.getByRole("heading", { name: "Public reports" })).toHaveCount(0)
      await expect(page.getByRole("heading", { name: /not found|404/i })).toBeVisible()
    })
  }
})
