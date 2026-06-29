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

    await expect(page.getByRole("heading", { name: "1Çatı Giriş" })).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Şifre")).toBeVisible()

    const signInButton = page.getByRole("button", { name: "Giriş Yap" })
    await expect(signInButton).toBeVisible()
    await expect(
      page.getByText(/E-posta ve şifrenizle giriş yapın|Kimlik doğrulaması aktif/)
    ).toBeVisible()
    await expect(page.getByText("Yetki profiliyle giriş")).toBeVisible()

    await screenshot(page, testInfo, "01-login-page")
    expect(issues).toEqual([])
  })

  test("back link works", async ({ page }) => {
    await page.goto("/tr/login")
    await page.getByRole("link", { name: "← Ana sayfaya dön" }).click()
    await expect(page).toHaveURL(/\/tr/)
  })

  test("access profile buttons sign in and filter dashboard", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/login")
    await page.getByRole("button", { name: /Personel/ }).click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)
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
})
