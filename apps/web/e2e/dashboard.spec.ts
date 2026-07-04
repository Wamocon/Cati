import { expect, test, type Page } from "@playwright/test"
import { collectConsoleIssues, screenshot } from "./helpers"

function exactAccessibleName(label: string) {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
}

async function clickDashboardMenu(page: Page, label: string) {
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole("button", { name: "Menüyü aç" }).click()
  }

  const link = page
    .locator("aside")
    .getByRole("link", { name: exactAccessibleName(label) })
  await expect(link).toBeVisible()

  const href = await link.getAttribute("href")
  await link.click()

  if (href) {
    const expectedPath = new URL(href, "http://localhost").pathname
    await page.waitForURL((url) => url.pathname === expectedPath, {
      timeout: 20_000,
    })
  }
}

async function clickDashboardCommand(
  page: Page,
  label: string | RegExp,
  expectedUrl: RegExp
) {
  await page.goto("/tr/dashboard")
  const link = page.getByRole("link", { name: label }).first()
  await expect(link).toBeVisible()

  const href = await link.getAttribute("href")
  const expectedPath = href ? new URL(href, "http://localhost").pathname : null
  await link.click()

  if (expectedPath) {
    await page.waitForURL((url) => url.pathname === expectedPath, {
      timeout: 20_000,
    })
  }
  await expect(page).toHaveURL(expectedUrl)
}

async function signInAsAccessProfile(page: Page, label: string) {
  await page.goto("/tr/login")
  await page.getByRole("button", { name: new RegExp(label) }).click()
  await expect(page).toHaveURL(/\/tr\/dashboard/)
}

test.describe("Dashboard portal", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("dashboard opens as a production ERP command center", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/dashboard")

    await expect(
      page.getByRole("heading", { name: /ERP Operasyon Merkezi/ })
    ).toBeVisible()
    await expect(page.getByText("ERP modül durumu")).toBeVisible()
    await expect(page.getByText("Operasyon Risk Haritası")).toBeVisible()
    await expect(page.getByText("AI operasyon asistanı")).toBeVisible()
    await expect(page.getByText("Toplam Daire").first()).toBeVisible()
    await expect(page.getByText("Toplam Borç").first()).toBeVisible()
    await expect(page.getByText("Açık Servis").first()).toBeVisible()

    await page.getByRole("button", { name: "Veriyi yenile" }).click()
    await expect(page.getByRole("button", { name: /hazır|Veri/i })).toBeVisible()

    await screenshot(page, testInfo, "01-dashboard-erp-command-center", {
      fullPage: true,
    })
    expect(issues).toEqual([])
  })

  test("dashboard command cards route to working modules", async ({ page }) => {
    test.setTimeout(90_000)

    await clickDashboardCommand(page, "Toplam Daire modülünü aç", /\/dashboard\/listings/)
    await clickDashboardCommand(page, "Toplam Borç modülünü aç", /\/dashboard\/finance/)
    await clickDashboardCommand(page, "Açık Servis modülünü aç", /\/dashboard\/tickets/)
    await clickDashboardCommand(page, "Bugünkü İşler modülünü aç", /\/dashboard\/calendar/)
    await clickDashboardCommand(page, /Blok A daire matrisi detayını aç/, /\/dashboard\/listings/)
    await clickDashboardCommand(page, /Tahsilat rotası detayını aç/, /\/dashboard\/finance/)
    await clickDashboardCommand(page, /AI operasyon asistanı raporlarını aç/, /\/dashboard\/reports/)

    expect(issues).toEqual([])
  })

  test("expanded ERP modules render core production controls", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000)

    await page.goto("/tr/dashboard")

    const modules = [
      { menu: "Daire Matrisi", heading: "Proje & Daire Matrisi", url: /\/dashboard\/listings/ },
      { menu: "Müşteri Adayları", heading: "Müşteri & Malik CRM", url: /\/dashboard\/leads/ },
      { menu: "Servis Talepleri", heading: "Servis Talepleri", url: /\/dashboard\/tickets/ },
      { menu: "Rezervasyon", heading: "Rezervasyon & Giriş-Çıkış", url: /\/dashboard\/calendar/ },
      { menu: "Erişim & Uyum", heading: "Erişim & Uyum", url: /\/dashboard\/compliance/ },
      { menu: "Finans & Aidat", heading: "Finans, Satış & Aidat", url: /\/dashboard\/finance/ },
      { menu: "Belgeler", heading: "TAPU & Belge Kasası", url: /\/dashboard\/documents/ },
      { menu: "Raporlar", heading: "AI Rapor Merkezi", url: /\/dashboard\/reports/ },
      { menu: "İletişim", heading: "İletişim Merkezi", url: /\/dashboard\/communications/ },
      { menu: "Kullanıcılar & Roller", heading: "Kullanıcılar & Roller", url: /\/dashboard\/users/ },
      { menu: "Ayarlar", heading: "Platform Yönetim Merkezi", url: /\/dashboard\/settings/ },
    ]

    for (const item of modules) {
      await clickDashboardMenu(page, item.menu)
      await expect(page).toHaveURL(item.url)
      await expect(
        page.getByRole("heading", { name: item.heading, exact: true })
      ).toBeVisible()
    }

    await clickDashboardMenu(page, "Daire Matrisi")
    await expect(page.getByText("Daire matrisi kayıtları")).toBeVisible()
    await expect(page.getByText("Veri kalite bulguları")).toBeVisible()
    await page.getByPlaceholder("Daire, malik, sakin veya blok ara").fill("A-001")
    await expect(page.getByText("A-001").first()).toBeVisible()
    await page.getByRole("button", { name: "Veri kontrolü" }).click()
    await expect(page.getByRole("button", { name: "Veri kontrolü" })).toHaveAttribute("data-state", "success")
    await page.getByRole("button", { name: "Değişiklik iste" }).click()
    await expect(page.getByRole("button", { name: "Değişiklik iste" })).toHaveAttribute("data-state", "success")
    await expect(page.getByText("Veri doğrulama merkezi")).toBeVisible()

    await clickDashboardMenu(page, "Rezervasyon")
    await expect(page.getByText("Gezinti ve online tur akışı")).toBeVisible()

    await clickDashboardMenu(page, "Finans & Aidat")
    await expect(page.getByRole("heading", { name: "Finans defteri" })).toBeVisible()
    await expect(page.getByText("Son finans kayıtları")).toBeVisible()
    await page.getByRole("button", { name: "Defteri yenile" }).click()
    const financeExportButton = page.getByRole("button", { name: /Finans defteri.*aktar/i })
    await financeExportButton.click()
    await expect(financeExportButton).toHaveAttribute("data-state", "success")
    await expect(page.getByRole("heading", { name: "Satış ödeme planı" })).toBeVisible()

    await clickDashboardMenu(page, "Belgeler")
    await expect(page.getByText("Satış dosyası, TAPU, KYC ve EIDS kontrolü")).toBeVisible()

    await clickDashboardMenu(page, "Erişim & Uyum")
    await expect(page.getByText("Oturum, vatandaşlık ve alıcı uygunluk ön kontrolü")).toBeVisible()

    await clickDashboardMenu(page, "Kullanıcılar & Roller")
    await expect(page.getByText("Kişi ve rol dizini")).toBeVisible()
    await expect(page.getByText(/Sakin bağlantıları/i)).toBeVisible()

    await clickDashboardMenu(page, "Ayarlar")
    await expect(page.getByText("Güvenlik ve platform kontrolleri")).toBeVisible()

    await screenshot(page, testInfo, "02-dashboard-expanded-erp-modules", {
      fullPage: true,
    })
    expect(issues).toEqual([])
  })

  test("site-management API endpoints expose database-ready contracts", async ({
    request,
  }) => {
    const allowedSources = ["supabase", "local-seed"]

    const dashboardResponse = await request.get("/api/site-management/dashboard")
    expect(dashboardResponse.ok()).toBeTruthy()
    const dashboard = await dashboardResponse.json()
    expect(allowedSources).toContain(dashboard.source)
    expect(dashboard.summary.totalUnits).toBeGreaterThan(0)

    const searchResponse = await request.get("/api/site-management/search?q=A-001&limit=5")
    expect(searchResponse.ok()).toBeTruthy()
    const search = await searchResponse.json()
    expect(allowedSources).toContain(search.source)
    expect(search.results.length).toBeGreaterThan(0)

    const phase4Response = await request.get("/api/site-management/phase4?limit=769")
    expect(phase4Response.ok()).toBeTruthy()
    const phase4 = await phase4Response.json()
    expect(allowedSources).toContain(phase4.source)
    expect(phase4.summary.totalUnits).toBe(769)

    const financeResponse = await request.get("/api/site-management/finance?limit=12")
    expect(financeResponse.ok()).toBeTruthy()
    const finance = await financeResponse.json()
    expect(allowedSources).toContain(finance.source)
    expect(finance.summary.openLedgerCents).toBeGreaterThan(0)

    const usersResponse = await request.get("/api/site-management/users?limit=20")
    expect(usersResponse.ok()).toBeTruthy()
    const users = await usersResponse.json()
    expect(allowedSources).toContain(users.source)
    expect(users.summary.staffTotal).toBeGreaterThan(0)

    const actionResponse = await request.post("/api/site-management/actions", {
      data: {
        actionType: "e2e.client-action",
        entityTable: "units",
        entityExternalId: "A-001",
        title: "Playwright action smoke test",
        metadata: { test: "dashboard.spec.ts" },
      },
    })
    expect(actionResponse.status()).toBe(201)
    const action = await actionResponse.json()
    expect(allowedSources).toContain(action.source)
    expect(action.id).toBeTruthy()
  })

  test("dashboard filters every access-profile role", async ({ page }, testInfo) => {
    test.setTimeout(120_000)

    const roleMatrix = [
      {
        label: "Yönetim",
        heading: /ERP Operasyon Merkezi/,
        visible: [
          "Genel Bakış",
          "Daire Matrisi",
          "Müşteri Adayları",
          "Servis Talepleri",
          "Rezervasyon",
          "Erişim & Uyum",
          "Finans & Aidat",
          "Belgeler",
          "Raporlar",
          "İletişim",
          "Kullanıcılar & Roller",
          "Ayarlar",
        ],
        hidden: [],
        global: true,
      },
      {
        label: "Sorumlu",
        heading: /ERP Operasyon Merkezi/,
        visible: [
          "Genel Bakış",
          "Daire Matrisi",
          "Müşteri Adayları",
          "Servis Talepleri",
          "Rezervasyon",
          "Erişim & Uyum",
          "Finans & Aidat",
          "Belgeler",
          "Raporlar",
          "İletişim",
          "Kullanıcılar & Roller",
          "Ayarlar",
        ],
        hidden: [],
        global: true,
      },
      {
        label: "Muhasebe",
        heading: /Finans Çalışma Alanı/,
        visible: ["Genel Bakış", "Finans & Aidat", "Belgeler", "Raporlar", "İletişim"],
        hidden: [
          "Daire Matrisi",
          "Müşteri Adayları",
          "Servis Talepleri",
          "Rezervasyon",
          "Erişim & Uyum",
          "Kullanıcılar & Roller",
          "Ayarlar",
        ],
        global: false,
      },
      {
        label: "Personel",
        heading: /Saha Ekibi Çalışma Alanı/,
        visible: ["Genel Bakış", "Servis Talepleri", "Rezervasyon", "Belgeler", "İletişim"],
        hidden: [
          "Daire Matrisi",
          "Müşteri Adayları",
          "Erişim & Uyum",
          "Finans & Aidat",
          "Raporlar",
          "Kullanıcılar & Roller",
          "Ayarlar",
        ],
        global: false,
      },
      {
        label: "Malik",
        heading: /Malik Çalışma Alanı/,
        visible: ["Genel Bakış", "Servis Talepleri", "Rezervasyon", "Belgeler", "İletişim"],
        hidden: [
          "Daire Matrisi",
          "Müşteri Adayları",
          "Erişim & Uyum",
          "Finans & Aidat",
          "Raporlar",
          "Kullanıcılar & Roller",
          "Ayarlar",
        ],
        global: false,
      },
      {
        label: "Kiracı",
        heading: /Kiracı Çalışma Alanı/,
        visible: ["Genel Bakış", "Servis Talepleri", "Rezervasyon", "Belgeler", "İletişim"],
        hidden: [
          "Daire Matrisi",
          "Müşteri Adayları",
          "Erişim & Uyum",
          "Finans & Aidat",
          "Raporlar",
          "Kullanıcılar & Roller",
          "Ayarlar",
        ],
        global: false,
      },
    ]

    const isMobile = (page.viewportSize()?.width ?? 1280) < 768

    for (const role of roleMatrix) {
      await signInAsAccessProfile(page, role.label)
      await expect(page.getByRole("heading", { name: role.heading })).toBeVisible()

      if (role.global) {
        await expect(page.getByText("ERP modül durumu")).toBeVisible()
      } else {
        await expect(page.getByText("ERP modül durumu")).toHaveCount(0)
        await expect(page.getByText("Toplam Daire").first()).toHaveCount(0)
      }

      if (isMobile) {
        await page.getByRole("button", { name: "Menüyü aç" }).click()
      }

      const aside = page.locator("aside")
      await expect(aside.getByText(role.label, { exact: true })).toBeVisible()

      for (const label of role.visible) {
        await expect(
          aside.getByRole("link", { name: exactAccessibleName(label) })
        ).toBeVisible()
      }

      for (const label of role.hidden) {
        await expect(
          aside.getByRole("link", { name: exactAccessibleName(label) })
        ).toHaveCount(0)
      }

      if (isMobile) {
        await page.getByRole("button", { name: "Menüyü kapat" }).click()
      }
    }

    await screenshot(page, testInfo, "03-dashboard-rbac-all-roles")
    expect(issues).toEqual([])
  })

  test("restricted roles cannot open global modules by URL or API", async ({
    page,
  }, testInfo) => {
    await signInAsAccessProfile(page, "Kiracı")

    await page.goto("/tr/dashboard/finance")
    await expect(page).toHaveURL(/\/tr\/dashboard$/)
    await expect(page.getByRole("heading", { name: /Kiracı Çalışma Alanı/ })).toBeVisible()

    await page.goto("/tr/dashboard/listings")
    await expect(page).toHaveURL(/\/tr\/dashboard$/)
    await expect(page.getByRole("heading", { name: /Kiracı Çalışma Alanı/ })).toBeVisible()

    const dashboardApiResponse = await page.request.get("/api/site-management/dashboard")
    expect(dashboardApiResponse.status()).toBe(403)

    const phase4ApiResponse = await page.request.get("/api/site-management/phase4?limit=4")
    expect(phase4ApiResponse.status()).toBe(403)

    const searchApiResponse = await page.request.get("/api/site-management/search?q=A-001&limit=4")
    expect(searchApiResponse.status()).toBe(403)

    const financeApiResponse = await page.request.get("/api/site-management/finance?limit=4")
    expect(financeApiResponse.status()).toBe(403)

    const usersApiResponse = await page.request.get("/api/site-management/users?limit=4")
    expect(usersApiResponse.status()).toBe(403)

    await screenshot(page, testInfo, "04-dashboard-rbac-tenant-blocked")
    expect(issues).toEqual([])
  })

  test("AI chat follows the same RBAC scope", async ({ page }) => {
    await signInAsAccessProfile(page, "Kiracı")

    const tenantDenied = await page.request.post("/api/ai/chat", {
      data: { message: "Show me the finance ledger and all unit debts." },
    })
    expect(tenantDenied.ok()).toBeTruthy()
    const tenantDeniedPayload = await tenantDenied.json()
    expect(tenantDeniedPayload.source).toBe("rbac-guard")
    expect(String(tenantDeniedPayload.reply)).toContain("kapalı")
    expect(String(tenantDeniedPayload.reply)).not.toContain("Toplam açık borç")

    const tenantAllowed = await page.request.post("/api/ai/chat", {
      data: { message: "Show my open service requests." },
    })
    expect(tenantAllowed.ok()).toBeTruthy()
    const tenantAllowedPayload = await tenantAllowed.json()
    expect(tenantAllowedPayload.source).not.toBe("rbac-guard")
    expect(String(tenantAllowedPayload.reply)).toContain("servis")

    await signInAsAccessProfile(page, "Personel")
    const staffDenied = await page.request.post("/api/ai/chat", {
      data: { message: "Which flats need debt action today?" },
    })
    expect(staffDenied.ok()).toBeTruthy()
    const staffDeniedPayload = await staffDenied.json()
    expect(staffDeniedPayload.source).toBe("rbac-guard")

    await signInAsAccessProfile(page, "Muhasebe")
    const accountantAllowed = await page.request.post("/api/ai/chat", {
      data: { message: "Which accounts need finance follow-up today?" },
    })
    expect(accountantAllowed.ok()).toBeTruthy()
    const accountantAllowedPayload = await accountantAllowed.json()
    expect(accountantAllowedPayload.source).not.toBe("rbac-guard")
  })

  test("backend action API denies unauthorized tenant writes", async ({ page }) => {
    await page.goto("/tr/login")
    await page.getByRole("button", { name: /Kiracı/ }).click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)

    const response = await page.request.post("/api/site-management/actions", {
      data: {
        actionType: "document.upload.requested",
        entityTable: "documents",
        entityExternalId: "DOC-PRIVATE",
        title: "Unauthorized document upload test",
      },
    })

    expect(response.status()).toBe(403)
  })
})
