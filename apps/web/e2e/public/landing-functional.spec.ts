import { expect, test } from "@playwright/test"
import { locales } from "../support/test-catalog"

test.describe("Functional tests - public pages", () => {
  for (const locale of locales) {
    test(`public landing page loads for locale ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}`)
      await expect(page).toHaveURL(new RegExp(`/${locale}$`))
      await expect(page.locator("main")).toBeVisible()
      await expect(page.locator("h1").first()).toBeVisible()
      await expect(page.locator(`a[href="/${locale}/login"]:visible, a[href^="/${locale}/login?"]:visible`).first()).toBeVisible()
    })
  }

  test("public navigation opens login without broken route", async ({ page }) => {
    await page.goto("/tr")

    const menuToggle = page.getByTestId("menu-toggle")
    let loginLink = page
      .getByTestId("public-navbar")
      .locator('a[href="/tr/login"]:visible, a[href^="/tr/login?"]:visible')
      .first()

    if (await menuToggle.isVisible().catch(() => false)) {
      await page.getByTestId("menu-toggle").click()
      loginLink = page
        .locator("#public-mobile-menu")
        .locator('a[href="/tr/login"]:visible, a[href^="/tr/login?"]:visible')
        .first()
    }

    await expect(loginLink).toBeVisible()
    await loginLink.click()
    await expect(page).toHaveURL(/\/tr\/login/)
    await expect(page.locator("main")).toBeVisible()
  })
})
