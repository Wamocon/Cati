import { test, expect } from "@playwright/test"
import { screenshot, collectConsoleIssues, scrollToSection } from "./helpers"

test.describe("Landing page journey", () => {
  const issues: string[] = []

  test.beforeEach(({ page }) => {
    collectConsoleIssues(page, issues)
  })

  test("home page renders all sections", async ({ page }, testInfo) => {
    await page.goto("/tr")
    await expect(page).toHaveTitle(/1Çatı/)

    // Hero
    await expect(
      page.getByRole("heading", {
        name: /Türkiye emlağını tek çatı altında yönetin/,
      })
    ).toBeVisible()
    await screenshot(page, testInfo, "01-hero")

    // Stats
    await scrollToSection(page, "[data-testid='stats']")
    await expect(page.getByText("212 298")).toBeVisible()
    await screenshot(page, testInfo, "02-stats")

    // Problems bento
    const problemCards = page.locator(
      "[data-testid='problem-bento'] > div > div.grid > div"
    )
    await expect(problemCards).toHaveCount(9)
    await expect(
      page.getByText("EİDS yetkilendirmesi takibi zor")
    ).toBeVisible()
    await expect(page.getByText("Sahte TAPU")).toBeVisible()
    await expect(
      page.getByText("Oturum izni kuralları sıkılaştı")
    ).toBeVisible()
    await screenshot(page, testInfo, "03-problems")

    // Solution grid
    await scrollToSection(page, "[data-testid='solution-grid']")
    const solutionCards = page.locator(
      "[data-testid='solution-grid'] > div > div.grid > div"
    )
    await expect(solutionCards).toHaveCount(12)
    await expect(
      page.getByText(
        "EİDS yetkilendirme takibi ve son kullanma hatırlatıcıları"
      )
    ).toBeVisible()
    await screenshot(page, testInfo, "04-solution")

    // Compliance section
    await scrollToSection(page, "[data-testid='compliance-features']")
    const complianceCards = page.locator(
      "[data-testid='compliance-features'] > div > div.grid > div"
    )
    await expect(complianceCards).toHaveCount(6)
    await expect(page.getByText("MVP", { exact: true }).first()).toBeVisible()
    await expect(
      page.getByText("Roadmap", { exact: true }).first()
    ).toBeVisible()
    await screenshot(page, testInfo, "05-compliance")

    // Platform demo
    await scrollToSection(page, "section:has-text('Platformu canlı önizleme')")
    await expect(page.getByRole("button", { name: "CRM" })).toBeVisible()
    await screenshot(page, testInfo, "06-platform-demo")

    // Services
    await scrollToSection(page, "section#services")
    const serviceCards = page.locator("section#services > div > div.grid > div")
    await expect(serviceCards).toHaveCount(11)
    await screenshot(page, testInfo, "07-services")

    // How it works
    await scrollToSection(page, "section#how-it-works")
    await expect(page.getByText("Ataberk Estate'e başvurun")).toBeVisible()
    await screenshot(page, testInfo, "08-how-it-works")

    // CTA
    await scrollToSection(page, "section#contact")
    await expect(
      page.getByRole("link", { name: "Demo Talep Et" })
    ).toBeVisible()
    await screenshot(page, testInfo, "09-cta")

    // Footer
    await scrollToSection(page, "footer")
    await screenshot(page, testInfo, "10-footer", { fullPage: false })

    // Full page screenshot
    await screenshot(page, testInfo, "11-full-page", { fullPage: true })

    expect(issues).toEqual([])
  })

  test("navigate to login from CTA", async ({ page }, testInfo) => {
    await page.goto("/tr")
    await page.getByRole("link", { name: "Panele Giriş Yap" }).click()
    await expect(page).toHaveURL(/\/tr\/login/)
    await expect(
      page.getByRole("heading", { name: "1Çatı Giriş" })
    ).toBeVisible()
    await screenshot(page, testInfo, "12-login-from-cta")
  })

  test("language switcher changes locale", async ({ page }, testInfo) => {
    await page.goto("/tr")
    let select = page.getByTestId("locale-switcher").filter({ visible: true })
    if (!(await select.isVisible())) {
      await page.getByRole("button", { name: /toggle menu/i }).click()
      select = page.getByTestId("locale-switcher").filter({ visible: true })
      await expect(select).toBeVisible()
    }
    await select.selectOption("en")
    await expect(page).toHaveURL("/en")
    await screenshot(page, testInfo, "13-locale-en")

    // Switch again to ensure no double locale prefix (e.g. /en/en)
    select = page.getByTestId("locale-switcher").filter({ visible: true })
    if (!(await select.isVisible())) {
      await page.getByRole("button", { name: /toggle menu/i }).click()
      select = page.getByTestId("locale-switcher").filter({ visible: true })
      await expect(select).toBeVisible()
    }
    await select.selectOption("de")
    await expect(page).toHaveURL("/de")
    await screenshot(page, testInfo, "14-locale-de")
  })
})
