import { expect, test } from "@playwright/test"
import { accessRoles } from "../support/test-catalog"
import { dashboardSidebar } from "../support/flows"

test.describe("Functional tests - authentication and access profiles", () => {
  test("access-profile status endpoint is available", async ({ request }) => {
    const response = await request.get("/api/access-profile")
    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(typeof payload.enabled).toBe("boolean")
  })

  test("invalid access-profile role is rejected", async ({ request }) => {
    const response = await request.post("/api/access-profile", { data: { role: "invalid_role" } })
    expect(response.status()).toBe(400)
  })

  for (const { role } of accessRoles) {
    test(`valid access-profile role can open dashboard: ${role}`, async ({ page }) => {
      const response = await page.request.post("/api/access-profile", { data: { role } })
      expect(response.status()).toBe(200)
      await page.goto("/tr/dashboard")
      await expect(page.locator("main")).toBeVisible()
      if ((page.viewportSize()?.width ?? 1280) < 768) {
        await expect(page.getByTestId("dashboard-menu-toggle")).toBeVisible()
      } else {
        await expect(dashboardSidebar(page)).toBeVisible()
      }
    })
  }
})
