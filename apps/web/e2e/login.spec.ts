import { expect, test } from "@playwright/test"
import { collectConsoleIssues, screenshot } from "./helpers"

test.describe("Login page", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("login form exists and shows production auth guidance", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/login")

    await expect(page.getByRole("heading", { name: /Giriş yap|Ataberk Estate operasyon alanına giriş/i }).first()).toBeVisible()
    await expect(page.getByLabel("E-posta")).toBeVisible()
    await expect(page.getByLabel("Şifre")).toBeVisible()

    const signInButton = page.getByRole("button", { name: "Giriş yap" })
    await expect(signInButton).toBeVisible()
    await expect(
      page.getByText(/Kimlik doğrulama anahtarları bekleniyor|Supabase kimlik doğrulaması aktif/)
    ).toBeVisible()
    await expect(page.getByText("Yerel QA rol profilleri")).toBeVisible()

    await screenshot(page, testInfo, "01-login-page")
    expect(issues).toEqual([])
  })

  test("back link works", async ({ page }) => {
    await page.goto("/tr/login")
    await page.getByRole("link", { name: /Ana sayfa|1Çatı/ }).first().click()
    await expect(page).toHaveURL(/\/tr/)
  })

  test("access profile buttons sign in and filter dashboard", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/login")
    await page.getByText("QA rol profillerini aç").click()
    await page.getByRole("button", { name: /Personel/ }).click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)
    await expect(page.locator("main")).toContainText(/Servis Talepleri|ERP Operasyon Merkezi/)
    await screenshot(page, testInfo, "04-login-access-profile")
  })

  test("access profile API rejects invalid roles", async ({ page }) => {
    const response = await page.request.post("/api/access-profile", {
      data: { role: "not_a_real_role" },
    })

    expect(response.status()).toBe(400)
  })
})
