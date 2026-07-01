import { expect, test } from "@playwright/test"
import { openDashboardAs } from "../support/flows"

test.describe("Functional tests - operational workflows", () => {
  test("unit matrix search returns visible operational results", async ({ page }) => {
    await openDashboardAs(page, "manager", "/tr/dashboard/listings")
    const searchInput = page.getByPlaceholder(/Daire|ara|search/i).first()
    await expect(searchInput).toBeVisible()
    await searchInput.fill("A-42")
    await expect(page.locator("main")).toContainText(/A-42|records|kayit/i)
  })

  test("finance page exposes ledger controls for accountant", async ({ page }) => {
    await openDashboardAs(page, "accountant", "/tr/dashboard/finance")
    await expect(page.locator("main")).toContainText(/Finans|Ledger|Aidat/i)
    await expect(page.locator("main").getByRole("button").first()).toBeVisible()
  })

  test("offline sync queue is visible for staff role", async ({ page }) => {
    await openDashboardAs(page, "staff", "/tr/dashboard/offline")
    await expect(page.locator("main")).toContainText(/Offline|Sync|Queue|Senkron/i)
  })

  test("document upload policy is visible on documents page", async ({ page }) => {
    await openDashboardAs(page, "manager", "/tr/dashboard/documents")
    await expect(page.locator("main")).toContainText(/Belge|Document|Upload|Vault/i)
  })
})
