import { test, expect, type Page } from "@playwright/test"
import { screenshot, collectConsoleIssues } from "./helpers"

function exactAccessibleName(label: string) {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
}

async function clickDashboardMenu(page: Page, label: string) {
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole("button", { name: "Menüyü aç" }).click()
  }
  const link = page.locator("aside").getByRole("link", { name: exactAccessibleName(label) })
  await expect(link).toBeVisible()
  await link.click()
}

test.describe("Dashboard portal", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("dashboard shows premium site-management command center", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/dashboard")
    await expect(
      page.getByRole("heading", { name: "Ataberk Estate Premium CRM Merkezi" })
    ).toBeVisible()
    await expect(page.getByText("Toplam Daire").first()).toBeVisible()
    await expect(page.getByText("Toplam Borç").first()).toBeVisible()
    await expect(page.getByText("Açık Servis").first()).toBeVisible()
    await expect(page.getByText("Phase 2-9 teslim merkezi")).toBeVisible()
    await expect(page.getByText("8/8 tamamlandı")).toBeVisible()
    await expect(page.getByText("Canlı Site Simülasyonu")).toBeVisible()
    await expect(page.getByText("AI operasyon asistanı")).toBeVisible()

    const refreshButton = page.getByRole("button", { name: "Veriyi yenile" })
    await refreshButton.click()
    await expect(page.getByRole("button", { name: /hazır|hazir/i })).toBeVisible()

    await screenshot(page, testInfo, "01-dashboard-command-center", { fullPage: true })

    expect(issues).toEqual([])
  })

  test("expanded site-management routes render and support search", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/dashboard")

    const modules = [
      { menu: "Daire Matrisi", heading: "Proje & Daire Matrisi", url: /\/dashboard\/listings/ },
      { menu: "Sakinler", heading: "Müşteri & Malik CRM", url: /\/dashboard\/leads/ },
      { menu: "Servis Talepleri", heading: "Servis Talepleri", url: /\/dashboard\/tickets/ },
      { menu: "Rezervasyon", heading: "Rezervasyon & Giriş-Çıkış", url: /\/dashboard\/calendar/ },
      { menu: "Erişim & Uyum", heading: "Erişim & Uyum", url: /\/dashboard\/compliance/ },
      { menu: "Finans & Aidat", heading: "Finans, Satış & Aidat", url: /\/dashboard\/finance/ },
      { menu: "Belgeler", heading: "TAPU & Belge Kasası", url: /\/dashboard\/documents/ },
      { menu: "Raporlar", heading: "AI Rapor Merkezi", url: /\/dashboard\/reports/ },
      { menu: "Kullanıcılar & Roller", heading: "Kullanıcılar & Roller", url: /\/dashboard\/users/ },
      { menu: "Ayarlar", heading: "Platform & Audit Merkezi", url: /\/dashboard\/settings/ },
    ]

    for (const item of modules) {
      await clickDashboardMenu(page, item.menu)
      await expect(page).toHaveURL(item.url)
      await expect(
        page.getByRole("heading", { name: item.heading, exact: true })
      ).toBeVisible()
    }

    await clickDashboardMenu(page, "Daire Matrisi")
    await expect(page.getByText("Import doğrulama merkezi")).toBeVisible()
    await page.getByLabel("Ara...").first().fill("A-0101")
    await expect(page.getByRole("cell", { name: "A-0101" }).first()).toBeVisible()

    await clickDashboardMenu(page, "Sakinler")
    await expect(page.getByRole("heading", { name: "Müşteri & Malik CRM", exact: true })).toBeVisible()
    await page.getByLabel("Ara...").first().fill("A-0101")
    await expect(page.getByRole("cell", { name: "A-0101" }).first()).toBeVisible()

    await clickDashboardMenu(page, "Servis Talepleri")
    await expect(page.getByRole("heading", { name: "Servis Talepleri", exact: true })).toBeVisible()
    await page.getByLabel("Ara...").first().fill("SRV-2401")
    await expect(page.getByRole("cell", { name: "SRV-2401" }).first()).toBeVisible()

    await clickDashboardMenu(page, "Rezervasyon")
    await expect(page.getByRole("heading", { name: "Rezervasyon & Giriş-Çıkış", exact: true })).toBeVisible()
    await expect(page.getByText("Phase 6 - Besichtigung & online tur pipeline")).toBeVisible()
    await page.getByLabel("Ara...").first().fill("VIEW-601")
    await expect(page.getByRole("cell", { name: "VIEW-601" }).first()).toBeVisible()

    await clickDashboardMenu(page, "Finans & Aidat")
    await expect(page.getByRole("heading", { name: "Finans, Satış & Aidat", exact: true })).toBeVisible()
    await expect(page.getByText("Phase 7 - New Level Premium satış ödeme planı")).toBeVisible()
    await page.getByLabel("Ara...").first().fill("PAY-701")
    await expect(page.getByRole("cell", { name: "PAY-701" }).first()).toBeVisible()

    await clickDashboardMenu(page, "Belgeler")
    await expect(page.getByRole("heading", { name: "TAPU & Belge Kasası", exact: true })).toBeVisible()
    await expect(page.getByText("Phase 8 - Kaufakte, TAPU, KYC ve EIDS kontrolü")).toBeVisible()
    await page.getByRole("button", { name: "Belge yükle" }).click()
    await expect(page.getByRole("button", { name: "Belge yükle" })).toHaveAttribute("data-state", "success")
    await page.getByLabel("Ara...").first().fill("DOCBUY-803")
    await expect(page.getByRole("cell", { name: "DOCBUY-803" }).first()).toBeVisible()
    await page.getByLabel("Ara...").first().clear()
    await page.getByLabel("Ara...").nth(1).fill("DOC-9001")
    await expect(page.getByRole("cell", { name: "DOC-9001" }).first()).toBeVisible()
    await page.getByRole("button", { name: "Belgeyi görüntüle" }).first().click()
    await expect(page.getByRole("button", { name: "Belgeyi görüntüle" }).first()).toHaveAttribute("data-state", "success")

    await clickDashboardMenu(page, "Raporlar")
    await page.getByRole("button", { name: "Raporu dışa aktar" }).first().click()
    await expect(page.getByRole("button", { name: "Raporu dışa aktar" }).first()).toHaveAttribute("data-state", "success")

    await clickDashboardMenu(page, "Erişim & Uyum")
    await expect(page.getByRole("heading", { name: "Erişim & Uyum", exact: true })).toBeVisible()
    await expect(page.getByText("Phase 9 - Oturum, vatandaşlık ve alıcı uygunluk ön kontrolü")).toBeVisible()
    await page.getByLabel("Ara...").first().fill("ELG-903")
    await expect(page.getByRole("cell", { name: "ELG-903" }).first()).toBeVisible()

    await clickDashboardMenu(page, "Kullanıcılar & Roller")
    await page.getByLabel("Ara...").first().fill("Merve")
    await expect(page.getByRole("cell", { name: "Merve Muhasebe" })).toBeVisible()

    await clickDashboardMenu(page, "Ayarlar")
    await expect(page.getByText("Güvenlik ve platform kontrolleri")).toBeVisible()
    await expect(page.getByText("AUD-2401")).toBeVisible()
    await screenshot(page, testInfo, "02-dashboard-expanded-modules", { fullPage: true })

    expect(issues).toEqual([])
  })

  test("phase 2-9 backend status API exposes completed delivery model", async ({ request }) => {
    const response = await request.get("/api/site-management/phase-status")
    expect(response.ok()).toBeTruthy()
    const payload = await response.json()

    expect(payload.phases).toHaveLength(8)
    expect(payload.summaries.delivery.complete).toBe(8)
    expect(payload.summaries.import.rejectedRows).toBe(0)
    expect(payload.summaries.viewing.total).toBeGreaterThanOrEqual(5)
    expect(payload.summaries.paymentPlans.openExposureEur).toBeGreaterThan(0)
    expect(payload.summaries.purchaseChecklist.highRisk).toBeGreaterThan(0)
    expect(payload.summaries.eligibility.review).toBeGreaterThan(0)
    expect(payload.controls.length).toBeGreaterThanOrEqual(5)
    expect(payload.auditEvents.length).toBeGreaterThanOrEqual(5)
    expect(payload.roleCoverage.length).toBeGreaterThanOrEqual(5)
  })

  test("site-management API endpoints expose database-ready contracts", async ({ request }) => {
    const dashboardResponse = await request.get("/api/site-management/dashboard")
    expect(dashboardResponse.ok()).toBeTruthy()
    const dashboard = await dashboardResponse.json()
    expect(["supabase", "demo-fallback"]).toContain(dashboard.source)
    expect(dashboard.summary.totalUnits).toBeGreaterThan(0)
    expect(dashboard.tickets.length).toBeGreaterThan(0)

    const searchResponse = await request.get("/api/site-management/search?q=A-0101&limit=5")
    expect(searchResponse.ok()).toBeTruthy()
    const search = await searchResponse.json()
    expect(["supabase", "demo-fallback"]).toContain(search.source)
    expect(search.results.length).toBeGreaterThan(0)
    expect(search.results[0].title).toContain("A-0101")

    const emptySearchResponse = await request.get("/api/site-management/search")
    expect(emptySearchResponse.status()).toBe(400)

    const actionResponse = await request.post("/api/site-management/actions", {
      data: {
        actionType: "e2e.client-action",
        entityTable: "units",
        entityExternalId: "A-0101",
        title: "Playwright action smoke test",
        metadata: { test: "dashboard.spec.ts" },
      },
    })
    expect(actionResponse.status()).toBe(201)
    const action = await actionResponse.json()
    expect(["supabase", "demo-fallback"]).toContain(action.source)
    expect(action.id).toBeTruthy()
  })

  test("dashboard filters menu by demo role", async ({ page }, testInfo) => {
    await page.goto("/tr/login")
    await page.getByRole("button", { name: /Teknisyen/ }).click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)
    await expect(page.getByText("Teknisyen", { exact: true })).toBeVisible()
    await expect(page.locator("aside").getByText("Servis Talepleri")).toBeVisible()
    await expect(page.locator("aside").getByText("Finans & Aidat")).toHaveCount(0)
    await expect(page.locator("aside").getByText("Kullanıcılar & Roller")).toHaveCount(0)
    await screenshot(page, testInfo, "03-dashboard-rbac-maintenance")

    expect(issues).toEqual([])
  })
})
