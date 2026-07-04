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

    await expect(page.getByRole("heading", { name: "Giriş yap" })).toBeVisible()
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
    const isDesktop = (page.viewportSize()?.width ?? 1280) >= 1024
    const homeLink = isDesktop
      ? page.getByRole("link", { name: "Ana sayfa", exact: true })
      : page.getByRole("link", { name: /1Cati/ }).first()
    await homeLink.click()
    await expect(page).toHaveURL(/\/tr$/)
  })

  test("access profile buttons sign in and filter dashboard", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/login")
    await page.getByRole("button", { name: /Personel/ }).click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)
    if ((page.viewportSize()?.width ?? 1280) < 768) {
      await page.getByRole("button", { name: "Menüyü aç" }).click()
    }
    await expect(page.locator("aside").getByText("Personel", { exact: true })).toBeVisible()
    await expect(page.locator("aside").getByText("Servis Talepleri")).toBeVisible()
    await screenshot(page, testInfo, "04-login-access-profile")
  })

  test("access profile API rejects invalid roles", async ({ page }) => {
    const response = await page.request.post("/api/access-profile", {
      data: { role: "not_a_real_role" },
    })

    expect(response.status()).toBe(400)
  })

  test("demo full-access button opens the dashboard as admin", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/login")
    await page.getByTestId("demo-full-access").click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)
    await expect(
      page.getByRole("heading", { name: /ERP Operasyon Merkezi/ })
    ).toBeVisible()

    if ((page.viewportSize()?.width ?? 1280) < 768) {
      await page.getByRole("button", { name: "Menüyü aç" }).click()
    }
    const aside = page.locator("aside")
    // admin (level 90) exposes the management-only modules
    await expect(
      aside.getByRole("link", { name: /^Kullanıcılar & Roller$/ })
    ).toBeVisible()
    await expect(aside.getByRole("link", { name: /^Ayarlar$/ })).toBeVisible()
    await expect(aside.getByRole("link", { name: /^Finans & Aidat$/ })).toBeVisible()
    await screenshot(page, testInfo, "05-demo-full-access")
  })
})
