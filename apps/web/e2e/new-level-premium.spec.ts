import { expect, test } from "@playwright/test"
import { collectConsoleIssues, screenshot, scrollToSection } from "./helpers"

test.describe("New Level Premium landing page", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("renders hero, why, amenities and both intake sections", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/new-level-premium")

    await expect(
      page.getByRole("heading", { name: /Daireyi de, onu yöneten sistemi de/ })
    ).toBeVisible()
    await screenshot(page, testInfo, "01-nlp-hero")

    await scrollToSection(page, "section#why")
    await expect(
      page.getByRole("heading", { name: /Binayı her gün çalıştıran sistem/ })
    ).toBeVisible()

    await scrollToSection(page, "section#register")
    await expect(page.getByRole("heading", { name: /1Çatı hesabınızı buradan başlatın/ })).toBeVisible()

    await scrollToSection(page, "section#report")
    await expect(page.getByRole("heading", { name: /Bir sorunu bildirin/ })).toBeVisible()

    expect(issues).toEqual([])
  })

  test("full AISDALSLove funnel sections render in order", async ({ page }) => {
    await page.goto("/tr/new-level-premium")
    for (const id of ["why", "desire", "register", "after", "share", "report", "love"]) {
      const section = page.locator(`section#${id}`)
      await section.scrollIntoViewIfNeeded()
      await expect(section).toBeVisible()
    }
  })

  test("registration only offers owner/tenant/staff, never privileged roles", async ({
    page,
  }) => {
    await page.goto("/tr/new-level-premium")
    const register = page.locator("section#register")
    await register.scrollIntoViewIfNeeded()

    // The three self-service roles are offered (anchored: the tenant button's
    // description contains "Malikinizin", so an unanchored /Malik/ would double-match).
    await expect(register.getByRole("button", { name: /^Malik/ })).toBeVisible()
    await expect(register.getByRole("button", { name: /^Kiracı/ })).toBeVisible()
    await expect(register.getByRole("button", { name: /^Personel/ })).toBeVisible()

    // Privileged roles are never rendered as selectable options.
    await expect(register.getByRole("button", { name: "Sorumlu" })).toHaveCount(0)
    await expect(register.getByRole("button", { name: "Muhasebe" })).toHaveCount(0)
    await expect(register.getByRole("button", { name: "Yönetim" })).toHaveCount(0)

    // And the reason is stated to the visitor.
    await expect(
      register.getByText(/Sorumlu, Muhasebe ve Yönetim rolleri/)
    ).toBeVisible()
  })

  test("owner registration submits and returns a reference", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/new-level-premium")
    const register = page.locator("section#register")
    await register.scrollIntoViewIfNeeded()

    await register.getByLabel("Ad soyad").fill("Test Malik")
    await register.getByLabel("E-posta").fill("test.malik@example.com")
    // Identity is mandatory for owner/tenant (KVKK verification + KBS reporting).
    await register.getByLabel("Kimlik / pasaport numarası").fill("12345678901")
    await register.getByRole("checkbox").check()
    await register.getByRole("button", { name: /Erişim talebini gönder/ }).click()

    await expect(page.getByText("Talep alındı")).toBeVisible()
    await expect(page.getByText(/NLP-REG-/)).toBeVisible()
    await screenshot(page, testInfo, "02-nlp-registration-success")
  })

  test("public report submits and returns a reference", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/new-level-premium")
    const report = page.locator("section#report")
    await report.scrollIntoViewIfNeeded()

    await report.getByLabel(/Konum/).fill("B blok lobi")
    await report.getByLabel(/Kısa açıklama/).fill("Lobi aydınlatması arızalı.")
    await report.getByRole("checkbox").check()
    await report.getByRole("button", { name: /Bildirimi gönder/ }).click()

    await expect(page.getByText("Bildirim alındı")).toBeVisible()
    await expect(page.getByText(/NLP-RPT-/)).toBeVisible()
    await screenshot(page, testInfo, "03-nlp-report-success")
  })

  test("registration API rejects privileged roles and enforces consent", async ({
    page,
  }) => {
    // Privileged roles can never be requested through the public endpoint.
    for (const role of ["admin", "manager", "accountant"]) {
      const res = await page.request.post("/api/site-management/registration", {
        data: { role, fullName: "Attacker", email: "a@b.co", consent: true },
      })
      expect(res.status()).toBe(403)
    }

    // Consent is mandatory.
    const noConsent = await page.request.post("/api/site-management/registration", {
      data: { role: "owner", fullName: "No Consent", email: "a@b.co", consent: false },
    })
    expect(noConsent.status()).toBe(400)

    // Identity (id type + number) is mandatory for owner/tenant.
    const noIdentity = await page.request.post("/api/site-management/registration", {
      data: { role: "owner", fullName: "No ID", email: "a@b.co", consent: true },
    })
    expect(noIdentity.status()).toBe(400)

    // A valid owner request (with identity) is accepted with a reference.
    const ok = await page.request.post("/api/site-management/registration", {
      data: {
        role: "owner",
        fullName: "Valid Owner",
        email: "a@b.co",
        idType: "tc_kimlik",
        idNumber: "12345678901",
        consent: true,
      },
    })
    expect(ok.status()).toBe(201)
    const body = (await ok.json()) as { reference?: string }
    expect(body.reference).toMatch(/NLP-REG-/)

    // Staff are exempt from the identity requirement (internal reference instead).
    const staff = await page.request.post("/api/site-management/registration", {
      data: { role: "staff", fullName: "Team Member", email: "a@b.co", consent: true },
    })
    expect(staff.status()).toBe(201)
  })

  test("report QR poster renders a scannable code and target URL", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/new-level-premium/report-poster")
    await expect(page.getByRole("heading", { name: /Karekodu okutun/ })).toBeVisible()
    await expect(page.getByLabel("QR code")).toBeVisible()
    await expect(page.getByText(/new-level-premium#report/)).toBeVisible()
    await screenshot(page, testInfo, "04-nlp-report-poster")
  })

  test("identity verification button confirms identity (simulated in demo)", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/new-level-premium")
    const register = page.locator("section#register")
    await register.scrollIntoViewIfNeeded()

    await register.getByLabel("Kimlik / pasaport numarası").fill("12345678901")
    await register.getByRole("button", { name: /Kimliğimi doğrula/ }).click()
    await expect(register.getByText("Kimlik doğrulandı")).toBeVisible()
    await screenshot(page, testInfo, "05-nlp-identity-verified")
  })

  test("identity verification API returns a verdict", async ({ page }) => {
    const ok = await page.request.post("/api/site-management/identity-verification", {
      data: { idType: "tc_kimlik", idNumber: "12345678901" },
    })
    expect(ok.status()).toBe(200)
    const body = (await ok.json()) as { status?: string; reference?: string }
    expect(body.status).toBe("verified")
    expect(body.reference).toBeTruthy()

    const bad = await page.request.post("/api/site-management/identity-verification", {
      data: { idType: "tc_kimlik", idNumber: "" },
    })
    expect(bad.status()).toBe(400)
  })

  test("tenant time-boxed access panel shows grants and creates an invite", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/login")
    await page.getByTestId("demo-full-access").click()
    await page.getByTestId("demo-role-option-admin").click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)

    await page.goto("/tr/dashboard/users")
    await expect(
      page.getByRole("heading", { name: "Kiracı zaman erişimi" })
    ).toBeVisible()
    // Seed grants render (one sponsored tenant is Ivan Petrov).
    await expect(page.getByText("Ivan Petrov")).toBeVisible()

    // Create a new time-boxed invite; the tenant appears in the list.
    await page.getByRole("button", { name: /^Davet oluştur/ }).first().click()
    await page.getByLabel("Kiracı adı").fill("Test Kiracı")
    await page.getByLabel(/Daire/).fill("D4 / 9")
    await page.getByRole("button", { name: /Zaman sınırlı davet oluştur/ }).click()
    await expect(page.getByText("Test Kiracı")).toBeVisible()
    await screenshot(page, testInfo, "06-tenant-access-panel")
  })

  test("public report API requires location, description and consent", async ({
    page,
  }) => {
    const missing = await page.request.post("/api/site-management/public-report", {
      data: { category: "technical", zone: "", description: "", consent: true },
    })
    expect(missing.status()).toBe(400)

    const noConsent = await page.request.post("/api/site-management/public-report", {
      data: { category: "technical", zone: "Pool", description: "Broken tile", consent: false },
    })
    expect(noConsent.status()).toBe(400)

    const ok = await page.request.post("/api/site-management/public-report", {
      data: { category: "security", zone: "Gate", description: "Barrier stuck open", consent: true },
    })
    expect(ok.status()).toBe(201)
    const body = (await ok.json()) as { reference?: string }
    expect(body.reference).toMatch(/NLP-RPT-/)
  })
})
