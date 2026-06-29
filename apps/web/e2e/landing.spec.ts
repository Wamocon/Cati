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
    await expect(page.locator("[data-testid='problem-bento'] > div > div.grid > div")).toHaveCount(9)
    await expect(page.getByText("EİDS yetkilendirmesi takibi zor")).toBeVisible()
    await screenshot(page, testInfo, "03-problems")

    await scrollToSection(page, "[data-testid='solution-grid']")
    await expect(page.locator("[data-testid='solution-grid'] > div > div.grid > div")).toHaveCount(12)
    await expect(page.getByText("CRM, ilanlar, işlemler, kiralama")).toBeVisible()
    await screenshot(page, testInfo, "04-solution")

    await scrollToSection(page, "[data-testid='compliance-features']")
    await expect(page.locator("[data-testid='compliance-features'] > div > div.grid > div")).toHaveCount(6)
    await expect(page.getByText("Aktif", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Entegrasyon hazır", { exact: true }).first()).toBeVisible()
    await screenshot(page, testInfo, "05-compliance")

    await scrollToSection(page, "section#services")
    await expect(page.getByRole("heading", { name: "ERP modülleri" })).toBeVisible()
    await expect(page.getByText("CRM ve lead yönetimi")).toBeVisible()
    await screenshot(page, testInfo, "06-services")

    await scrollToSection(page, "section#platform")
    await expect(page.getByRole("heading", { name: "ERP iş akışı" })).toBeVisible()
    await expect(page.getByRole("button", { name: "CRM" })).toBeVisible()
    await screenshot(page, testInfo, "07-platform-workflow")

    await scrollToSection(page, "section#how-it-works")
    await expect(page.getByText("Lead veya malik kaydı açılır")).toBeVisible()
    await screenshot(page, testInfo, "08-how-it-works")

    await scrollToSection(page, "section#contact")
    await expect(page.getByRole("link", { name: "Ürün görüşmesi planla" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Panele Giriş Yap" })).toBeVisible()
    await screenshot(page, testInfo, "09-cta")

    await scrollToSection(page, "footer")
    await screenshot(page, testInfo, "10-footer", { fullPage: false })

    expect(issues).toEqual([])
  })

  test("navigate to login from CTA", async ({ page }, testInfo) => {
    await page.goto("/tr")
    await page.getByRole("link", { name: "Panele Giriş Yap" }).click()
    await expect(page).toHaveURL(/\/tr\/login/)
    await expect(page.getByRole("heading", { name: "1Çatı Giriş" })).toBeVisible()
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
