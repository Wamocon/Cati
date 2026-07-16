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
      page.getByRole("heading", {
        name: /Günlük operasyon için kapsamı ve sınırları açık platform/,
      })
    ).toBeVisible()

    await scrollToSection(page, "section#register")
    await expect(
      page.getByRole("heading", { name: /1Çatı hesabınızı buradan başlatın/ })
    ).toBeVisible()

    await scrollToSection(page, "section#report")
    await expect(
      page.getByRole("heading", { name: /Bir sorunu bildirin/ })
    ).toBeVisible()

    expect(issues).toEqual([])
  })

  test("full AISDALSLove funnel sections render in order", async ({ page }) => {
    await page.goto("/tr/new-level-premium")
    for (const id of [
      "why",
      "desire",
      "register",
      "after",
      "share",
      "report",
      "love",
    ]) {
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
    await expect(
      register.getByRole("button", { name: /^Kiracı/ })
    ).toBeVisible()
    await expect(
      register.getByRole("button", { name: /^Personel/ })
    ).toBeVisible()

    // Privileged roles are never rendered as selectable options.
    await expect(
      register.getByRole("button", { name: "Sorumlu", exact: true })
    ).toHaveCount(0)
    await expect(
      register.getByRole("button", { name: "Muhasebe", exact: true })
    ).toHaveCount(0)
    await expect(
      register.getByRole("button", { name: "Yönetim", exact: true })
    ).toHaveCount(0)

    // And the reason is stated to the visitor.
    await expect(
      register.getByText(/Sorumlu, Muhasebe ve Yönetim rolleri/)
    ).toBeVisible()
  })

  test("owner registration submits and returns a reference", async ({
    page,
  }, testInfo) => {
    await page.route("**/api/site-management/registration", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          reference: "REG-20260714-TESTOWNER1",
          lookupToken: "a".repeat(64),
          status: "submitted",
          workflowVersion: 1,
          replayed: false,
        }),
      })
    })
    await page.goto("/tr/new-level-premium")
    const register = page.locator("section#register")
    await register.scrollIntoViewIfNeeded()

    await register.getByLabel("Ad soyad").fill("Test Malik")
    await register.getByLabel("E-posta").fill("test.malik@example.com")
    await register.getByLabel(/Blok ve daire/).fill("B3 / 12")
    await register.getByLabel(/Kanıt referansı/).fill("TAPU-TEST-12")
    // Identity is mandatory for owner/tenant (KVKK verification + KBS reporting).
    await register.getByLabel("Kimlik / pasaport numarası").fill("12345678901")
    await register.getByRole("checkbox").check()
    await register
      .getByRole("button", { name: /Erişim talebini gönder/ })
      .click()

    await expect(page.getByText("Talep alındı")).toBeVisible()
    await expect(page.getByText(/REG-20260714-TESTOWNER1/)).toBeVisible()
    await expect(page.getByText("a".repeat(64))).toBeVisible()
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
    const noConsent = await page.request.post(
      "/api/site-management/registration",
      {
        data: {
          role: "owner",
          fullName: "No Consent",
          email: "a@b.co",
          consent: false,
        },
      }
    )
    expect(noConsent.status()).toBe(400)

    // Identity (id type + number) is mandatory for owner/tenant.
    const noIdentity = await page.request.post(
      "/api/site-management/registration",
      {
        data: {
          role: "owner",
          fullName: "No ID",
          email: "a@b.co",
          consent: true,
        },
      }
    )
    expect(noIdentity.status()).toBe(400)

    // A valid owner request (with identity) is accepted with a reference.
    const ok = await page.request.post("/api/site-management/registration", {
      data: {
        role: "owner",
        fullName: "Valid Owner",
        email: "a@b.co",
        idType: "tc_kimlik",
        idNumber: "12345678901",
        unitClaim: "B3 / 12",
        proofType: "tapu",
        proofReference: "TAPU-TEST-12",
        consent: true,
      },
      headers: { "Idempotency-Key": "owner-functional-test" },
    })
    expect([201, 503]).toContain(ok.status())
    const body = (await ok.json()) as { reference?: string; code?: string }
    if (ok.status() === 201) expect(body.reference).toMatch(/^REG-/)
    else expect(body.code).toBe("REGISTRATION_DATABASE_NOT_CONFIGURED")

    // Staff are exempt from the identity requirement (internal reference instead).
    const staff = await page.request.post("/api/site-management/registration", {
      data: {
        role: "staff",
        fullName: "Team Member",
        email: "a@b.co",
        position: "Field team",
        consent: true,
      },
      headers: { "Idempotency-Key": "staff-functional-test" },
    })
    expect([201, 503]).toContain(staff.status())
  })

  test("report QR poster requires a valid placement token before generating a code", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/new-level-premium/report-poster")
    // Security: without a valid ?qr= placement token the poster must NOT generate a
    // scannable code — it shows the manager setup guidance instead. A code is only
    // produced when a manager opens it with the exact placement token.
    await expect(
      page.getByRole("heading", { name: "QR posteri henüz yapılandırılmadı" })
    ).toBeVisible()
    await expect(page.getByLabel("QR code")).toHaveCount(0)
    await screenshot(page, testInfo, "04-nlp-report-poster")
  })

  test("identity evidence is truthfully marked for manual review without a provider", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/new-level-premium")
    const register = page.locator("section#register")
    await register.scrollIntoViewIfNeeded()

    await expect(
      register.getByText(
        /kanıt referansı ve daire iddiası yönetici tarafından manuel incelenir/
      )
    ).toBeVisible()
    await expect(
      register.getByRole("button", { name: /Kimliğimi doğrula/ })
    ).toHaveCount(0)
    await screenshot(page, testInfo, "05-nlp-identity-manual-review")
  })

  test("identity verification API exposes no public raw-data shortcut", async ({
    page,
  }) => {
    await page.goto("/tr/login")
    const cookieUrl = new URL(page.url()).origin
    await page.context().addCookies([
      {
        name: "access_profile_role",
        value: "tenant",
        url: cookieUrl,
      },
    ])
    const residentAttempt = await page.request.post(
      "/api/site-management/identity-verification",
      {
        data: { idType: "tc_kimlik", idNumber: "12345678901" },
      }
    )
    expect(residentAttempt.status()).toBe(403)

    await page.context().addCookies([
      {
        name: "access_profile_role",
        value: "manager",
        url: cookieUrl,
      },
    ])

    const rawIdentity = await page.request.post(
      "/api/site-management/identity-verification",
      {
        data: { idType: "tc_kimlik", idNumber: "12345678901" },
      }
    )
    expect(rawIdentity.status()).toBe(400)
    expect(await rawIdentity.json()).toMatchObject({
      code: "IDV_RAW_IDENTITY_FORBIDDEN",
    })

    const providerBoundary = await page.request.post(
      "/api/site-management/identity-verification",
      {
        data: { registrationRequestId: "11111111-1111-4111-8111-111111111111" },
      }
    )
    expect(providerBoundary.status()).toBe(503)
    expect(await providerBoundary.json()).toMatchObject({
      status: "manual_review_required",
      simulated: false,
      code: "IDV_PROVIDER_SESSION_REQUIRED",
    })
  })

  test("public demo copy never promises passwordless customer access", async ({
    page,
  }) => {
    for (const locale of ["tr", "en", "de", "ru"]) {
      await page.goto(`/${locale}/new-level-premium`)
      await expect(page.locator("section#desire")).toBeVisible()
      await expect(page.locator("section#love")).toBeVisible()
      await expect(page.locator("body")).not.toContainText(
        /şifresiz|no password|ohne Passwort|без пароля/i
      )
      await expect(page.getByTestId("new-level-demo-cta")).toHaveAttribute(
        "href",
        /(?:\/login|#register)$/
      )
    }
  })

  test("synthetic tenant access is honestly unavailable without real auth", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/login")
    await page.getByTestId("demo-full-access").click()
    await page.getByTestId("demo-role-option-admin").click()
    await expect(page).toHaveURL(/\/tr\/dashboard/)

    await page.goto("/tr/dashboard/users")
    await expect(
      page.getByRole("heading", { name: "Kiracı erişim yönetimi" })
    ).toBeVisible()
    await expect(
      page.getByText(
        "Canlı davet işlemleri için gerçek kimlik doğrulaması ve organizasyon ilişkisi gerekir. Yerel rol demosu veritabanı yetkisini taklit etmez."
      )
    ).toBeVisible()
    await expect(page.getByText("Ivan Petrov")).toHaveCount(0)
    await expect(page.getByLabel("Kiracı adı")).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: /Davet oluştur/ })
    ).toHaveCount(0)
    await screenshot(page, testInfo, "06-tenant-access-panel")
  })

  test("public report API requires location, description and consent", async ({
    page,
  }) => {
    const missing = await page.request.post(
      "/api/site-management/public-report",
      {
        data: {
          category: "technical",
          zone: "",
          description: "",
          consent: true,
        },
      }
    )
    expect(missing.status()).toBe(400)

    const noConsent = await page.request.post(
      "/api/site-management/public-report",
      {
        data: {
          category: "technical",
          zone: "Pool",
          description: "Broken tile",
          consent: false,
        },
      }
    )
    expect(noConsent.status()).toBe(400)

    const ok = await page.request.post("/api/site-management/public-report", {
      data: {
        category: "security",
        zone: "Gate",
        description: "Barrier stuck open",
        consent: true,
      },
    })
    expect(ok.status()).toBe(201)
    const body = (await ok.json()) as { reference?: string }
    expect(body.reference).toMatch(/NLP-RPT-/)
  })
})
