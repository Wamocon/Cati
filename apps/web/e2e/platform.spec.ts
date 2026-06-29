import { expect, test } from "@playwright/test"
import { collectConsoleIssues, screenshot, scrollToSection } from "./helpers"

test.describe("Platform product page", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("platform page renders production ERP sections", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/platform")

    await expect(
      page.getByRole("heading", {
        name: /Emlak satışını, site yönetimini ve servis operasyonunu/,
      })
    ).toBeVisible()
    await expect(page.getByText("Temel ERP modülleri")).toBeVisible()
    await screenshot(page, testInfo, "01-platform-hero")

    await scrollToSection(page, "section#modules")
    await expect(page.getByText("CRM, lead ve iletişim merkezi")).toBeVisible()
    await expect(page.getByText("Finans defteri, aidat ve tahsilat")).toBeVisible()
    await screenshot(page, testInfo, "02-platform-modules")

    await scrollToSection(page, "section#quality")
    await expect(page.getByRole("heading", { name: "Güvenilir" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "İzlenebilir" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Çalışma alanına gir" })).toBeVisible()
    await screenshot(page, testInfo, "03-platform-quality", {
      fullPage: true,
    })

    expect(issues).toEqual([])
  })
})
