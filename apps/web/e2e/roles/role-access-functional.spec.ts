import { expect, test } from "@playwright/test"
import { openDashboardAs } from "../support/flows"
import { accessRoles, dashboardModules } from "../support/test-catalog"

test.describe("Functional tests - role-based access", () => {
  for (const roleConfig of accessRoles) {
    test(`${roleConfig.role} sees only allowed navigation entries`, async ({ page }) => {
      await openDashboardAs(page, roleConfig.role)
      const links = await page.locator("aside a").evaluateAll((items) =>
        items.map((item) => new URL((item as HTMLAnchorElement).href).pathname.replace(/^\/tr/, ""))
      )

      for (const expectedPath of roleConfig.expectedLinks) {
        expect(links).toContain(expectedPath)
      }

      const forbiddenPaths = dashboardModules
        .map((module) => module.path)
        .filter((path) => !roleConfig.expectedLinks.some((expectedPath) => expectedPath === path))

      for (const forbiddenPath of forbiddenPaths) {
        expect(links).not.toContain(forbiddenPath)
      }
    })
  }

  test("tenant cannot open global finance module by direct URL", async ({ page }) => {
    await openDashboardAs(page, "tenant", "/tr/dashboard/finance")
    await expect(page).toHaveURL(/\/tr\/dashboard$/)
  })

  test("accountant can open finance module by direct URL", async ({ page }) => {
    await openDashboardAs(page, "accountant", "/tr/dashboard/finance")
    await expect(page).toHaveURL(/\/tr\/dashboard\/finance/)
    await expect(page.locator("main")).toContainText(/Finans|Ledger|Aidat/i)
  })
})
