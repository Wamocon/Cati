import { test, expect } from "@playwright/test"
import { screenshot, collectConsoleIssues } from "./helpers"

test.describe("Responsive mobile checks", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("landing page is usable on small viewport", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr")
    await expect(
      page.getByRole("heading", {
        name: /Türkiye emlağını tek çatı altında yönetin/,
      })
    ).toBeVisible()

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)

    await screenshot(page, testInfo, "mobile-landing", { fullPage: true })
    expect(issues).toEqual([])
  })

  test("dashboard is usable on small viewport", async ({ page }, testInfo) => {
    await page.goto("/tr/dashboard")
    await expect(
      page.getByRole("heading", { name: "Kontrol Paneli" })
    ).toBeVisible()
    await expect(page.getByText("Aktif İlanlar")).toBeVisible()
    await screenshot(page, testInfo, "mobile-dashboard", { fullPage: true })
    expect(issues).toEqual([])
  })
})
