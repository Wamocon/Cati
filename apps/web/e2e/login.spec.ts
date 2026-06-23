import { test, expect } from "@playwright/test"
import { screenshot, collectConsoleIssues } from "./helpers"

test.describe("Login page", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("login form exists and shows auth disabled note", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/login")
    await expect(
      page.getByRole("heading", { name: "1Çatı Giriş" })
    ).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Şifre")).toBeVisible()
    await expect(page.getByRole("button", { name: "Giriş Yap" })).toBeDisabled()
    await expect(page.getByText("Supabase ile kimlik doğrulama")).toBeVisible()
    await screenshot(page, testInfo, "01-login-page")

    await page.getByLabel("Email").fill("test@ataberkestate.com")
    await page.getByLabel("Şifre").fill("TestPassword123!")
    await screenshot(page, testInfo, "02-login-filled")
    await expect(page).toHaveURL(/\/tr\/login/)
    await screenshot(page, testInfo, "03-login-after-submit")

    expect(issues).toEqual([])
  })

  test("back link works", async ({ page }) => {
    await page.goto("/tr/login")
    await page.getByRole("link", { name: "← Ana sayfaya dön" }).click()
    await expect(page).toHaveURL(/\/tr/)
  })

  test("demo role buttons sign in and filter dashboard", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/login")
    await page.getByRole("button", { name: /Teknisyen/ }).click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)
    await expect(page.getByText("Teknisyen", { exact: true })).toBeVisible()
    await expect(page.locator("aside").getByText("Talepler")).toBeVisible()
    await screenshot(page, testInfo, "04-login-demo-role")
  })

  test("demo API rejects invalid roles", async ({ page }) => {
    const response = await page.request.post("/api/demo-role", {
      data: { role: "not_a_real_role" },
    })

    expect(response.status()).toBe(400)
  })
})
