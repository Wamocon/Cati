import { expect, test } from "@playwright/test"

const qrToken = "qr_0123456789abcdef0123456789abcdef"

test.describe("account-free public problem reporting", () => {
  test("binds a submission to the scanned site/zone and returns a private receipt", async ({ page }) => {
    await page.route("**/api/site-management/public-report**", async (route) => {
      const request = route.request()
      if (request.method() === "GET") {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, placement: { siteLabel: "Ataberk Residence", zoneCode: "main_entrance", zoneLabels: { en: "Main entrance", tr: "Ana giriş" }, active: true } }) })
      } else if (request.postDataJSON()?.action === "track") {
        expect(request.url()).not.toContain("tracking-secret-returned-once")
        expect(request.postDataJSON()).toEqual({
          action: "track",
          reference: "PR-7K4M-9Q2X",
          trackingToken: "tracking-secret-returned-once",
        })
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            report: {
              reference: "PR-7K4M-9Q2X",
              status: "under_review",
              version: 2,
              message: "A site manager is reviewing your report.",
              safetyCode: null,
              createdAt: "2026-07-14T09:00:00.000Z",
              updatedAt: "2026-07-14T09:10:00.000Z",
              nextStep: "await_human_review",
              history: [
                {
                  status: "under_review",
                  message: "A site manager is reviewing your report.",
                  at: "2026-07-14T09:10:00.000Z",
                },
              ],
            },
          }),
        })
      } else {
        expect(request.headers()["idempotency-key"]).toMatch(/^public-report-/)
        expect(request.postDataJSON()).toMatchObject({ qrToken, consent: true, consentLocale: "en", companyWebsite: "" })
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, receipt: { reference: "PR-7K4M-9Q2X", trackingToken: "tracking-secret-returned-once", status: "submitted", version: 1, safetyCode: null, replayed: false } }) })
      }
    })

    await page.goto(`/en/report/${qrToken}`)
    await expect(page.getByRole("heading", { name: "Report a problem" })).toBeVisible()
    await expect(page.getByText("Ataberk Residence")).toBeVisible()
    await expect(page.getByText("Main entrance")).toBeVisible()
    await page.getByLabel("Category").selectOption("technical")
    await page.getByLabel("Description").fill("The entrance light is broken and the corridor is dark.")
    await page.getByLabel("Privacy consent").check()
    await page.getByRole("button", { name: "Submit report" }).click()
    await expect(page.getByText("PR-7K4M-9Q2X")).toBeVisible()
    await expect(page.getByText("tracking-secret-returned-once")).toBeVisible()
    await expect(page.getByText(/Save both values/)).toBeVisible()
    await page.getByRole("button", { name: "Check status" }).click()
    await expect(
      page.getByText("Under review", { exact: true }).first()
    ).toBeVisible()
    expect(page.url()).not.toContain("tracking-secret-returned-once")
  })

  test("shows a user-initiated 112 action without claiming automatic execution", async ({ page }) => {
    await page.route("**/api/site-management/public-report?qrToken=**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, placement: { siteLabel: "Ataberk Residence", zoneCode: "garage", zoneLabels: { en: "Garage" }, active: true } }) }))
    await page.goto(`/en/report/${qrToken}`)
    await page.getByLabel("Description").fill("There is active fire and smoke in the garage")
    await expect(page.getByRole("link", { name: "Call 112" })).toHaveAttribute("href", "tel:112")
    await expect(page.getByText(/does not automatically call or dispatch/)).toBeVisible()
    await expect(page.getByLabel(/I understand that I must call 112 myself/)).toBeVisible()
    await expect(page.getByText(/dispatch was triggered/i)).toHaveCount(0)
  })

  test("tracks through a POST body so the private token never enters the URL", async ({ page }) => {
    await page.route("**/api/site-management/public-report", async (route) => {
      expect(route.request().method()).toBe("POST")
      expect(route.request().url()).not.toContain("tracking-secret")
      expect(route.request().postDataJSON()).toEqual({ action: "track", reference: "PR-7K4M-9Q2X", trackingToken: "tracking-secret" })
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, report: { reference: "PR-7K4M-9Q2X", status: "under_review", version: 2, message: "A site manager is reviewing your report.", safetyCode: null, createdAt: "2026-07-14T09:00:00.000Z", updatedAt: "2026-07-14T09:10:00.000Z", nextStep: "await_human_review", history: [{ status: "under_review", message: "A site manager is reviewing your report.", at: "2026-07-14T09:10:00.000Z" }] } }) })
    })
    await page.goto("/en/report/track")
    await page.getByLabel("Reference").fill("PR-7K4M-9Q2X")
    await page.getByLabel("Private tracking token").fill("tracking-secret")
    await page.getByRole("button", { name: "Check status" }).click()
    await expect(page.getByText("Under review", { exact: true }).first()).toBeVisible()
    expect(page.url()).toBe(`${new URL(page.url()).origin}/en/report/track`)
  })

  for (const localized of [
    { locale: "tr", reference: "Referans", token: "Özel takip anahtarı", check: "Durumu kontrol et", status: "İnceleniyor" },
    { locale: "de", reference: "Referenz", token: "Privater Tracking-Schlüssel", check: "Status prüfen", status: "In Prüfung" },
    { locale: "ru", reference: "Номер", token: "Секретный ключ отслеживания", check: "Проверить статус", status: "На проверке" },
  ]) {
    test(`localizes tracker status in ${localized.locale}`, async ({ page }) => {
      await page.route("**/api/site-management/public-report", (route) => route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true, report: {
          reference: "PR-7K4M-9Q2X", status: "under_review", version: 2,
          message: "Status message", safetyCode: null,
          createdAt: "2026-07-14T09:00:00.000Z",
          updatedAt: "2026-07-14T09:10:00.000Z",
          nextStep: "await_human_review",
          history: [{ status: "under_review", message: "Status message", at: "2026-07-14T09:10:00.000Z" }],
        } }),
      }))
      await page.goto(`/${localized.locale}/report/track`)
      await page.getByLabel(localized.reference).fill("PR-7K4M-9Q2X")
      await page.getByLabel(localized.token).fill("tracking-secret")
      await page.getByRole("button", { name: localized.check }).click()
      await expect(page.getByText(localized.status, { exact: true }).first()).toBeVisible()
    })
  }
})
