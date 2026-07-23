import { expect, test } from "@playwright/test"
import { collectConsoleIssues, screenshot, scrollToSection } from "./helpers"

test.describe("Landing page journey", () => {
  test.setTimeout(60_000)

  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("home page renders the production ERP story", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr")
    await expect(page).toHaveTitle(/1Çatı|1Cati/)

    await expect(
      page.getByRole("heading", {
        name: /Emlak operasyonunuzu tek ERP merkezinde yönetin/,
      })
    ).toBeVisible()
    await expect(page.getByText("ERP çalışma alanı", { exact: true })).toBeVisible()
    await screenshot(page, testInfo, "01-hero")

    await scrollToSection(page, "[data-testid='stats']")
    await expect(page.getByText("212 298")).toBeVisible()
    await screenshot(page, testInfo, "02-stats")

    await scrollToSection(page, "[data-testid='problem-bento']")
    await expect(page.locator("[data-testid='problem-bento'] h3")).toHaveCount(9)
    await expect(page.getByText("EİDS yetkilendirmesi takibi zor")).toBeVisible()
    await screenshot(page, testInfo, "03-problems")

    await scrollToSection(page, "[data-testid='solution-grid']")
    const solution = page.locator("[data-testid='solution-grid']")
    await expect(
      solution.getByRole("heading", {
        name: /Satış, site yönetimi, finans ve servis aynı ERP kaydında buluşur/i,
      })
    ).toBeVisible()
    await expect(solution.getByText(/02\s*\/?\s*Daire matrisi/i).filter({ visible: true }).first()).toBeVisible()
    await expect(solution.getByText(/03\s*\/?\s*Servis/i).filter({ visible: true }).first()).toBeVisible()
    await screenshot(page, testInfo, "04-solution")

    await scrollToSection(page, "[data-testid='compliance-features']")
    const compliance = page.locator("[data-testid='compliance-features']")
    await expect(compliance.locator("> div > div.grid > div")).toHaveCount(6)
    await expect(compliance.getByText("Türkiye kontrol akışı")).toBeVisible()
    await expect(compliance.getByText("KBS/e-GUEST", { exact: true })).toBeVisible()
    await screenshot(page, testInfo, "05-compliance")

    await scrollToSection(page, "section#modules")
    const platform = page.locator("section#modules")
    await expect(platform.getByText(/ERP iş akışı/i).filter({ visible: true }).first()).toBeVisible()
    await expect(platform.getByRole("button", { name: "CRM", exact: true })).toBeVisible()
    await screenshot(page, testInfo, "06-platform-workflow")

    await scrollToSection(page, "section#how-it-works")
    await expect(page.getByRole("heading", { name: "Tek ERP kaydı, birden fazla iş akışı" })).toBeVisible()
    await expect(page.getByText("Site ve daire modeli")).toBeVisible()
    await screenshot(page, testInfo, "07-connected-workflows")

    await scrollToSection(page, "section#contact")
    await expect(page.getByRole("link", { name: "Ürün görüşmesi planla" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Panele Giriş Yap" })).toBeVisible()
    await screenshot(page, testInfo, "08-cta")

    await scrollToSection(page, "footer")
    await screenshot(page, testInfo, "09-footer", { fullPage: false })

    expect(issues).toEqual([])
  })

  test("navigate to login from CTA", async ({ page }, testInfo) => {
    await page.goto("/tr")
    await page.getByRole("link", { name: "Panele Giriş Yap" }).click()
    await expect(page).toHaveURL(/\/tr\/login/)
    await expect(page.getByRole("heading", { name: "Giriş yap" })).toBeVisible()
    await screenshot(page, testInfo, "11-login-from-cta")
  })

  test("language switcher changes locale", async ({ page }, testInfo) => {
    await page.goto("/tr")
    let select = page.getByTestId("locale-switcher").filter({ visible: true })
    if (!(await select.isVisible())) {
      await page.getByTestId("menu-toggle").click()
      select = page.getByTestId("locale-switcher").filter({ visible: true })
      await expect(select).toBeVisible()
    }
    await select.selectOption("en")
    await expect(page).toHaveURL("/en")
    await screenshot(page, testInfo, "12-locale-en")

    select = page.getByTestId("locale-switcher").filter({ visible: true })
    if (!(await select.isVisible())) {
      await page.getByTestId("menu-toggle").click()
      select = page.getByTestId("locale-switcher").filter({ visible: true })
      await expect(select).toBeVisible()
    }
    await expect(select).toHaveValue("en")
    await select.selectOption("de")
    await expect(page).toHaveURL("/de")
    await screenshot(page, testInfo, "13-locale-de")
  })
})
