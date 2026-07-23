import { expect, test, type Page } from "@playwright/test"
import { openDashboardAs, resetQaState } from "../support/flows"

// Phase 6 coverage for the Admin Control Center hub. Assertions stay on stable
// markup, section ids, a test id, hrefs and localized headings, never volatile
// copy, so intentional wording changes don't cause assertion drift (LESSONS #6).

test.beforeEach(async ({ page }) => {
  await resetQaState(page)
})

// Sidebar hrefs, locale-prefix stripped, read straight from the DOM (matches the
// role-access spec) so it works on both desktop and the mobile dialog sidebar.
async function sidebarPaths(page: Page): Promise<string[]> {
  return page.locator("aside a").evaluateAll((items) =>
    items.map((item) =>
      new URL((item as HTMLAnchorElement).href).pathname.replace(/^\/tr/, "")
    )
  )
}

test.describe("Admin Control Center", () => {
  test("admin sees the Control Center nav link; non-admins do not", async ({
    page,
  }) => {
    await openDashboardAs(page, "admin")
    expect(await sidebarPaths(page)).toContain("/dashboard/admin")

    await openDashboardAs(page, "tenant")
    expect(await sidebarPaths(page)).not.toContain("/dashboard/admin")

    await openDashboardAs(page, "staff")
    expect(await sidebarPaths(page)).not.toContain("/dashboard/admin")
  })

  test("admin can open the Control Center hub", async ({ page }) => {
    await openDashboardAs(page, "admin", "/tr/dashboard/admin")

    await expect(page).toHaveURL(/\/tr\/dashboard\/admin$/)
    await expect(
      page.getByRole("heading", { level: 1, name: "Kontrol Merkezi" })
    ).toBeVisible()
    // The fully working People & access section and the approvals inbox prove the
    // hub actually rendered (not just the header shell).
    await expect(page.locator("#admin-people")).toBeVisible()
    await expect(page.getByTestId("admin-approvals-inbox")).toBeVisible()
  })

  test("a non-admin hitting /dashboard/admin is redirected to /dashboard", async ({
    page,
  }) => {
    await openDashboardAs(page, "tenant", "/tr/dashboard/admin")

    await expect(page).toHaveURL(/\/tr\/dashboard$/)
    await expect(page).not.toHaveURL(/\/dashboard\/admin/)
  })

  test("the hub renders its key sections in business language", async ({
    page,
  }) => {
    await openDashboardAs(page, "admin", "/tr/dashboard/admin")

    // 1. People & access (open by default), with the working admin panel inside.
    await expect(page.locator("#admin-people")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /Kişiler ve erişim/ })
    ).toBeVisible()

    // 2. Needs your approval, the unified inbox root carries the test id.
    await expect(
      page.getByRole("heading", { name: /Onayınız gerekiyor/ })
    ).toBeVisible()
    await expect(page.getByTestId("admin-approvals-inbox")).toBeVisible()

    // 3. Money, section header present, then expand to prove its content renders.
    const money = page.locator("#admin-money")
    await expect(money).toBeVisible()
    await expect(page.getByRole("heading", { name: /Para/ })).toBeVisible()
    await money.getByRole("button").first().click()
    await expect(money.getByText("Açık bakiye")).toBeVisible()

    // 4. Property & services, section header present, then expand to prove content.
    const property = page.locator("#admin-property")
    await expect(property).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /Mülk ve servisler/ })
    ).toBeVisible()
    await property.getByRole("button").first().click()
    // Exact match: "Daireler" also appears in the section description and the
    // "Daireleri aç" link, so only the units label is targeted here.
    await expect(property.getByText("Daireler", { exact: true })).toBeVisible()

    // Business language only, the hub must never leak schema/table names.
    const main = page.locator("main")
    await expect(main).not.toContainText("finance_ledger_entries")
    await expect(main).not.toContainText("service_tickets")
  })
})
