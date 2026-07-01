import { expect, test } from "@playwright/test"
import { openDashboardAs } from "../support/flows"
import { dashboardModules } from "../support/test-catalog"

test.describe("Functional tests - dashboard navigation", () => {
  for (const dashboardModule of dashboardModules) {
    test(`manager can open ${dashboardModule.name}`, async ({ page }) => {
      await openDashboardAs(page, "manager", `/tr${dashboardModule.path}`)
      await expect(page).toHaveURL(new RegExp(`/tr${dashboardModule.path.replace(/\//g, "\\/")}$`))
      await expect(page.locator("main")).toContainText(dashboardModule.expectedText)
    })
  }
})
