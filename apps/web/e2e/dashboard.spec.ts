import { test, expect, type Page } from "@playwright/test"
import { screenshot, collectConsoleIssues } from "./helpers"

async function clickDashboardMenu(page: Page, label: string) {
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole("button", { name: "Menüyü aç" }).click()
  }
  await page.locator("aside").getByText(label, { exact: true }).click()
}

test.describe("Dashboard portal", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("dashboard shows live operational summary", async ({ page }, testInfo) => {
    await page.goto("/tr/dashboard")
    await expect(
      page.getByRole("heading", { name: "Kontrol Paneli" })
    ).toBeVisible()
    await expect(page.getByText("Aktif İlanlar").first()).toBeVisible()
    await expect(page.getByText("Açık Adaylar")).toBeVisible()
    await expect(page.getByText("Bakım Talepleri")).toBeVisible()
    await expect(page.getByText("Devam Eden İşlemler")).toBeVisible()
    await expect(page.getByText("Aylık gelir trendi")).toBeVisible()
    await expect(page.getByText("Son Aktivite")).toBeVisible()
    await screenshot(page, testInfo, "01-dashboard-summary", { fullPage: true })

    expect(issues).toEqual([])
  })

  test("dashboard module routes render tables and navigation", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/dashboard")

    const modules = [
      { menu: "Müşteri Adayları", heading: "Müşteri Adayları", url: /\/dashboard\/leads/ },
      { menu: "Talepler", heading: "Bakım Talepleri", url: /\/dashboard\/tickets/ },
      { menu: "EİDS & Uyumluluk", heading: "EİDS & Uyumluluk", url: /\/dashboard\/compliance/ },
      { menu: "Finans & Döviz", heading: "Finans & Döviz", url: /\/dashboard\/finance/ },
      { menu: "Belgeler", heading: "Belgeler", url: /\/dashboard\/documents/ },
      { menu: "Raporlar", heading: "Raporlar", url: /\/dashboard\/reports/ },
    ]

    for (const item of modules) {
      await clickDashboardMenu(page, item.menu)
      await expect(page).toHaveURL(item.url)
      await expect(
        page.getByRole("heading", { name: item.heading, exact: true })
      ).toBeVisible()
    }

    await clickDashboardMenu(page, "Müşteri Adayları")
    await page.getByLabel("Ara...").fill("Anna")
    await expect(page.getByRole("cell", { name: "Anna K." }).first()).toBeVisible()
    await screenshot(page, testInfo, "02-dashboard-modules", { fullPage: true })

    expect(issues).toEqual([])
  })

  test("dashboard filters menu by demo role", async ({ page }, testInfo) => {
    await page.goto("/tr/login")
    await page.getByRole("button", { name: /Teknisyen/ }).click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)
    await expect(page.getByText("Teknisyen", { exact: true })).toBeVisible()
    await expect(page.locator("aside").getByText("Talepler")).toBeVisible()
    await expect(page.locator("aside").getByText("Finans & Döviz")).toHaveCount(0)
    await expect(page.locator("aside").getByText("Kullanıcılar & Roller")).toHaveCount(0)
    await screenshot(page, testInfo, "03-dashboard-rbac-maintenance")

    expect(issues).toEqual([])
  })
})
