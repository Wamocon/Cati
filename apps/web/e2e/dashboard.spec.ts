import { test, expect } from "@playwright/test"
import { screenshot, collectConsoleIssues } from "./helpers"

test.describe("Dashboard portal", () => {
  const issues: string[] = []

  test.beforeEach(({ page }) => {
    collectConsoleIssues(page, issues)
  })

  test("dashboard shows MVP and roadmap placeholders", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/dashboard")
    await expect(
      page.getByRole("heading", { name: "Kontrol Paneli" })
    ).toBeVisible()
    await expect(page.getByText("Aktif İlanlar")).toBeVisible()
    await expect(page.getByText("Açık Adaylar")).toBeVisible()
    await expect(page.getByText("Bakım Talepleri")).toBeVisible()
    await expect(page.getByText("Devam Eden İşlemler")).toBeVisible()
    await screenshot(page, testInfo, "01-dashboard-mvp")

    await expect(page.getByText("EİDS & Uyumluluk")).toBeVisible()
    await expect(page.getByText("Finans & Döviz")).toBeVisible()

    await expect(page.getByText("Yol Haritası Modülleri")).toBeVisible()
    await expect(
      page.getByText("WhatsApp / Telegram Entegrasyonu")
    ).toBeVisible()
    await expect(page.getByText("AI Lead Asistanı")).toBeVisible()
    await expect(page.getByText("Offline Saha Modu")).toBeVisible()
    await screenshot(page, testInfo, "02-dashboard-roadmap", { fullPage: true })

    expect(issues).toEqual([])
  })

  test("dashboard shows role badge and filters menu by role", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/dashboard")
    await expect(page.getByText("Müdür", { exact: true })).toBeVisible()
    await expect(page.getByText("Kullanıcılar & Roller")).toBeVisible()
    await expect(page.getByText("Ayarlar")).toBeVisible()
    await screenshot(page, testInfo, "03-dashboard-rbac-manager")
  })
})
