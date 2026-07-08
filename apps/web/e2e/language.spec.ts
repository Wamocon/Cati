import { expect, test } from "@playwright/test"
import { collectConsoleIssues, screenshot } from "./helpers"

async function signInAs(page: import("@playwright/test").Page, role: string) {
  const response = await page.request.post("/api/access-profile", { data: { role } })
  expect(response.status()).toBe(200)
}

async function expectNoTurkishLeakage(page: import("@playwright/test").Page) {
  const body = page.locator("body")
  const blockedPhrases = [
    "Emlak satışını",
    "Tek kayıt, net yetki",
    "Çalışma Alanı",
    "Yetki sınırları",
    "Kullanıcılar & Roller",
    "Platform Yönetim Merkezi",
    "Güvenlik ve platform kontrolleri",
    "Yerel QA rol profilleri",
    "Şifresiz e-posta daveti",
    "Müşteri & Malik CRM",
    "Erişim & Uyum",
    "Mobil Web & Offline Sync",
    "AI iletişim önceliği",
    "Kapı karar motoru",
    "Faz 12 kabiliyet panosu",
    "Offline güvenlik sınırı",
    "Giriş hazırlığı komuta panosu",
    "Çıkış, erişim ve mutabakat kontrolü",
    "Gezinti ve online tur akışı",
    "Tam rezervasyon kaydı",
    "Tam devir görev kaydı",
    "Faz 14 AI komuta katmanı",
    "Tahsilat trendi",
    "Daire dağılımı",
    "Satış dosyası, TAPU, KYC ve EIDS kontrolü",
    "Bildirim kuralları",
    "Teslim ve yeniden deneme kuyruğu",
    "Sağlayıcıya hazır simülasyon",
    "Onay ve yedek kanal",
    "Sakin kaydı bekliyor",
    "Malik kaydı bekliyor",
    "Kaynak bekliyor",
    "Borç blokeli",
    "BORÇ BLOKELI",
    "Hazirlik",
    "Servis katalogu ve siparis kapisi",
    "Siparis kontrolu",
    "blokeli",
  ]

  for (const phrase of blockedPhrases) {
    await expect(body).not.toContainText(phrase)
  }
}

test.describe("Language access", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("login page exposes locale switching before sign-in", async ({ page }, testInfo) => {
    await page.goto("/tr/login")
    const switcher = page.getByTestId("locale-switcher").first()
    await expect(switcher).toBeVisible()

    await switcher.selectOption("en")
    await expect(page).toHaveURL(/\/en\/login/)
    await expect(page.locator("html")).toHaveAttribute("lang", "en")

    await screenshot(page, testInfo, "language-login-en")
    expect(issues).toEqual([])
  })

  test("dashboard exposes locale switching after sign-in", async ({ page }, testInfo) => {
    await page.goto("/tr/login")
    await page.getByTestId("demo-full-access").click()
    await page.getByTestId("demo-role-option-manager").click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)

    const switcher = page.getByTestId("locale-switcher").first()
    await expect(switcher).toBeVisible()
    await switcher.selectOption("de")

    await expect(page).toHaveURL(/\/de\/dashboard/)
    await expect(page.locator("html")).toHaveAttribute("lang", "de")

    await screenshot(page, testInfo, "language-dashboard-de")
    expect(issues).toEqual([])
  })

  test("public platform page renders localized product copy", async ({ page }) => {
    await page.goto("/en/platform")
    await expect(page.getByRole("heading", { name: /Manage real-estate sales/i })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await page.goto("/de/platform")
    await expect(page.getByRole("heading", { name: /Immobilienvertrieb/i })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await page.goto("/ru/platform")
    await expect(page.getByRole("heading", { name: /Управляйте продажами недвижимости/i })).toBeVisible()
    await expectNoTurkishLeakage(page)
  })

  test("focused dashboard workspaces, users and settings do not leak Turkish shell copy", async ({ page }) => {
    test.setTimeout(90_000)

    await signInAs(page, "tenant")
    await page.goto("/en/dashboard")
    await expect(page.getByRole("heading", { name: "Tenant Workspace" })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await signInAs(page, "admin")
    await page.goto("/de/dashboard/users")
    await expect(page.getByRole("heading", { name: "Benutzer & Rollen" })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await page.goto("/ru/dashboard/settings")
    await expect(page.getByRole("heading", { name: "Центр администрирования платформы" })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await page.goto("/en/dashboard/leads")
    await expect(page.getByRole("heading", { name: "Customer & Owner CRM" })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await page.goto("/de/dashboard/compliance")
    await expect(page.getByRole("heading", { name: "Zugang & Compliance" })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await page.goto("/ru/dashboard/offline")
    await expect(page.getByRole("heading", { name: "Мобильный веб и офлайн-синхронизация" })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await page.goto("/en/dashboard/calendar")
    await expect(page.getByRole("heading", { name: "Reservations & Check-in/out" })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await page.goto("/de/dashboard/reports")
    await expect(page.getByRole("heading", { name: "KI-Berichtszentrum" })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await page.goto("/ru/dashboard/documents")
    await expect(page.getByRole("heading", { name: "TAPU и хранилище документов" })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await page.goto("/en/dashboard/communications")
    await expect(page.getByRole("heading", { name: "Communication Center" })).toBeVisible()
    await expectNoTurkishLeakage(page)

    await page.goto("/de/dashboard/tickets")
    await expect(page.getByRole("heading", { name: "Serviceanfragen" })).toBeVisible()
    await expect(page.locator("body")).toContainText("Finanzsperre")
    await expect(page.locator("body")).toContainText("Bereitschaft")
    await expect(page.locator("body")).toContainText("Servicekatalog und Auftragsportal")
    await expect(page.locator("body")).toContainText("Auftragskontrolle")
    await expect(page.locator("body")).toContainText(/\d+\s+gesperrt/)
    await expectNoTurkishLeakage(page)
  })
})
