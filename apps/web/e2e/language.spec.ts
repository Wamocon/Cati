import { expect, test } from "@playwright/test"
import { collectConsoleIssues, screenshot } from "./helpers"

test.describe("Language access", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("login page exposes locale switching before sign-in", async ({ page }, testInfo) => {
    await page.goto("/tr/login")
    const switcher = page.getByTestId("locale-switcher").first()
    await expect(switcher).toBeVisible()

    await switcher.selectOption("en")
    await expect(page).toHaveURL(/\/en\/login/)
    await expect(page.locator("html")).toHaveAttribute("lang", "en")

    await screenshot(page, testInfo, "language-login-en")
    expect(issues).toEqual([])
  })

  test("dashboard exposes locale switching after sign-in", async ({ page }, testInfo) => {
    await page.goto("/tr/login")
    await page.getByRole("button", { name: /Yönetim|YÃ¶netim/ }).first().click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)

    const switcher = page.getByTestId("locale-switcher").first()
    await expect(switcher).toBeVisible()
    await switcher.selectOption("de")

    await expect(page).toHaveURL(/\/de\/dashboard/)
    await expect(page.locator("html")).toHaveAttribute("lang", "de")

    await screenshot(page, testInfo, "language-dashboard-de")
    expect(issues).toEqual([])
  })
})
