import { expect, test } from "@playwright/test"
import { openDashboardAs, resetQaState } from "../support/flows"
import { accessRoles, dashboardModules } from "../support/test-catalog"

test.beforeEach(async ({ page }) => {
  await resetQaState(page)
})

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

  test("accountant sees the finance-scoped ticket queue", async ({ page }) => {
    await openDashboardAs(page, "accountant", "/tr/dashboard/tickets")
    await expect(page).toHaveURL(/\/tr\/dashboard\/tickets/)
    await expect(page.locator("main")).toContainText(/Ticket|Servis|Finans|Finance/i)
  })

  test("organization admin sees governance controls without platform scope", async ({ page }) => {
    await openDashboardAs(page, "admin", "/tr/dashboard/users")
    await expect(page.locator("main")).toContainText(/Organizasyon yönetişimi|Organization governance/i)
    await expect(page.locator("main")).toContainText(/Kiracı erişim|Tenant access/i)
    await expect(page.locator("main")).toContainText(/Organizasyonlar arası erişim kapalıdır|Cross-organization access is disabled/i)
  })

  test("manager receives site governance but no organization authority editor", async ({ page }) => {
    await openDashboardAs(page, "manager", "/tr/dashboard/users")
    await expect(page.locator("main")).toContainText(/Site operasyon yönetişimi|Site operations governance/i)
    await expect(page.locator("main")).not.toContainText(/Organizasyon yetki yönetimi|Organization authority management/i)
  })

  for (const residentRole of ["owner", "tenant"] as const) {
    test(`${residentRole} reaches tenant access from the resident dashboard`, async ({ page }) => {
      await openDashboardAs(page, residentRole)
      await expect(page.locator("main")).toContainText(/Kiracı erişim yönetimi|Tenant access management/i)
      await expect(page.locator("main")).toContainText(/doğrulanmış hesap|verified account/i)
    })
  }
})
