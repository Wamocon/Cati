import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"

test.describe("controlled registration workflow", () => {
  test("public signup offers only safe roles and returns a private receipt", async ({
    page,
  }) => {
    let requestBody: Record<string, unknown> | null = null
    let idempotencyKey = ""
    await page.route("**/api/site-management/registration", async (route) => {
      if (route.request().method() !== "POST") return route.continue()
      requestBody = route.request().postDataJSON() as Record<string, unknown>
      idempotencyKey = route.request().headers()["idempotency-key"] ?? ""
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          reference: "REG-20260714-PLAYWRIGHT",
          lookupToken: "b".repeat(64),
          status: "submitted",
          workflowVersion: 1,
          replayed: false,
        }),
      })
    })

    await page.goto("/en/signup")
    await expect(page.getByRole("button", { name: /^Owner/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /^Tenant/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /^Staff/ })).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Administrator|Accounting|Manager/ })
    ).toHaveCount(0)

    await page.getByLabel("Full name").fill("Playwright Owner")
    await page.getByLabel("Email").fill("owner@example.com")
    await page.getByLabel("Claimed block / unit").fill("B3 / 12")
    await page.getByLabel("Evidence or contract reference").fill("TAPU-PW-12")
    await page.getByLabel("Document number").fill("12345678901")
    await page.getByRole("checkbox").check()
    await page.getByRole("button", { name: "Send access request" }).click()

    await expect(page.getByText("REG-20260714-PLAYWRIGHT")).toBeVisible()
    await expect(page.getByText("b".repeat(64))).toBeVisible()
    expect(idempotencyKey.length).toBeGreaterThanOrEqual(8)
    expect(requestBody).toMatchObject({
      role: "owner",
      source: "signup",
      consent: true,
      unitClaim: "B3 / 12",
      proofReference: "TAPU-PW-12",
    })
  })

  test("one-time activation is consumed from a URL fragment and removed from browser history", async ({
    page,
  }) => {
    const reference = "REG-20260714-ACTIVATE"
    const activationToken = "c".repeat(64)
    let statusRequest: Record<string, unknown> | null = null
    await page.route("**/api/site-management/registration", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      if (
        route.request().method() !== "POST" ||
        body.action !== "activation_status"
      ) {
        return route.continue()
      }
      statusRequest = body
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          activation: {
            reference,
            requestedRole: "owner",
            emailMasked: "o***@example.com",
            status: "pending",
            expiresAt: "2026-07-15T12:00:00.000Z",
            providerMode: "supabase-auth-provider-ready",
          },
        }),
      })
    })

    await page.goto(
      `/en/signup#reference=${reference}&activation=${activationToken}`
    )
    await expect
      .poll(() => statusRequest)
      .toMatchObject({
        action: "activation_status",
        reference,
        activationToken,
      })
    await expect(page).toHaveURL(/\/en\/signup$/)
    expect(page.url()).not.toContain(reference)
    expect(page.url()).not.toContain(activationToken)
    const stored = await page.evaluate(() =>
      window.sessionStorage.getItem("cati.registration-activation")
    )
    const storedActivation = JSON.parse(stored ?? "{}") as Record<
      string,
      unknown
    >
    expect(storedActivation).toMatchObject({
      reference,
      token: activationToken,
    })
    expect(storedActivation.redemptionKey).toEqual(expect.any(String))
    expect(String(storedActivation.redemptionKey)).not.toHaveLength(0)
  })

  test("activation secrets in query parameters are rejected and never posted", async ({
    page,
  }) => {
    const reference = "REG-20260714-QUERY-REJECTED"
    const activationToken = "q".repeat(64)
    let registrationRequests = 0
    await page.route("**/api/site-management/registration", async (route) => {
      registrationRequests += 1
      await route.abort()
    })

    await page.goto(
      `/en/signup?reference=${reference}&activation=${activationToken}`
    )

    await expect(page).toHaveURL(/\/en\/signup$/)
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "only from the private invitation link" })
    ).toContainText("only from the private invitation link")
    await page.waitForTimeout(100)
    expect(registrationRequests).toBe(0)
    expect(
      await page.evaluate(() =>
        window.sessionStorage.getItem("cati.registration-activation")
      )
    ).toBeNull()
  })

  test("missing identity protection shows a safe localized action without backend text", async ({
    page,
  }) => {
    const retryKeys: string[] = []
    await page.route("**/api/site-management/registration", async (route) => {
      retryKeys.push(route.request().headers()["idempotency-key"] ?? "")
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Identity pepper missing: internal configuration detail",
          code: "REGISTRATION_IDENTITY_PROTECTION_UNAVAILABLE",
        }),
      })
    })

    await page.goto("/en/signup")
    await page.getByLabel("Full name").fill("Protected Intake Probe")
    await page.getByLabel("Email").fill("protected@example.com")
    await page.getByLabel("Claimed block / unit").fill("B3 / 12")
    await page
      .getByLabel("Evidence or contract reference")
      .fill("TAPU-PROTECTED-12")
    await page.getByLabel("Document number").fill("12345678901")
    await page.getByRole("checkbox").check()

    const submit = page.getByRole("button", { name: "Send access request" })
    await submit.click()
    const errorAlert = page
      .getByRole("alert")
      .filter({ hasText: "Protected identity intake is not configured" })
    await expect(errorAlert).toBeVisible()
    await expect(errorAlert).not.toContainText("Identity pepper missing")

    await submit.click()
    expect(retryKeys).toHaveLength(2)
    expect(retryKeys[0]).not.toHaveLength(0)
    expect(retryKeys[1]).toBe(retryKeys[0])
  })

  test("public API blocks privileged roles and incomplete evidence before persistence", async ({
    request,
  }, testInfo) => {
    const runId = `${Date.now()}-${testInfo.retry}`
    const headers = { "User-Agent": `cati-registration-negative-${runId}` }
    const querySecret = await request.get(
      `/api/site-management/registration?reference=REG-SECRET&lookupToken=${"b".repeat(64)}`,
      { headers }
    )
    expect(querySecret.status()).toBe(405)
    expect(await querySecret.json()).toMatchObject({
      code: "REGISTRATION_SECRET_QUERY_REJECTED",
    })

    for (const role of ["admin", "manager", "accountant"]) {
      const response = await request.post("/api/site-management/registration", {
        headers,
        data: {
          role,
          fullName: "Privilege Probe",
          email: `${role}+${runId}@example.com`,
          consent: true,
        },
      })
      expect(response.status()).toBe(403)
    }

    const noConsent = await request.post("/api/site-management/registration", {
      headers,
      data: {
        role: "staff",
        fullName: "No Consent",
        email: `no-consent+${runId}@example.com`,
        position: "Field",
        consent: false,
      },
    })
    expect(noConsent.status()).toBe(400)

    const noUnit = await request.post("/api/site-management/registration", {
      headers,
      data: {
        role: "owner",
        fullName: "No Unit",
        email: `no-unit+${runId}@example.com`,
        idType: "passport",
        idNumber: "P12345",
        consent: true,
      },
    })
    expect(noUnit.status()).toBe(400)
    expect((await noUnit.json()).code).toBe("REGISTRATION_UNIT_REQUIRED")

    const noPosition = await request.post("/api/site-management/registration", {
      headers,
      data: {
        role: "staff",
        fullName: "No Team",
        email: `no-position+${runId}@example.com`,
        consent: true,
      },
    })
    expect(noPosition.status()).toBe(400)
    expect((await noPosition.json()).code).toBe(
      "REGISTRATION_STAFF_POSITION_REQUIRED"
    )
  })

  test("identity review is management-only, rejects raw identity data and never simulates a provider", async ({
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
    const forbiddenResident = await page.request.post(
      "/api/site-management/identity-verification",
      {
        data: { idType: "tc_kimlik", idNumber: "12345678901" },
      }
    )
    expect(forbiddenResident.status()).toBe(403)

    await page.context().addCookies([
      {
        name: "access_profile_role",
        value: "admin",
        url: cookieUrl,
      },
    ])

    const rawIdentity = await page.request.post(
      "/api/site-management/identity-verification",
      {
        data: {
          idType: "tc_kimlik",
          idNumber: "12345678901",
          selfie: "data:image/jpeg;base64,raw",
        },
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

  test("migration keeps role grant human, scoped, versioned and one-time", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "../../supabase/migrations/00000000000025_registration_activation_workflow.sql"
      ),
      "utf8"
    )
    expect(migration).toContain(
      "requested_role IN ('owner', 'tenant', 'staff')"
    )
    expect(migration).toContain("p_expected_version")
    expect(migration).toContain("FOR UPDATE")
    expect(migration).toContain("current_user_profile_role()) = 'admin'")
    expect(migration).toContain("activation_token_digest")
    expect(migration).toContain("status = 'redeemed'")
    expect(migration).toContain(
      "Inactive resident record requires administrator resolution before activation"
    )
    expect(migration).toContain("AND r.status = 'active'")
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.handle_new_user()"
    )
    expect(migration).toMatch(/'tenant',[\s\S]{0,180}NULL[\s\S]{0,80}\);/)
    expect(migration).toContain(
      "CREATE POLICY registration_requests_company_review_select"
    )
    expect(migration).toContain("integration_outbox")
    expect(migration).toContain(
      "Registration intake must use the controlled registration workflow"
    )
    expect(migration).toContain(
      "Identity document data is forbidden in generic public intake"
    )
    expect(migration).toContain("Retired legacy registration request")
    expect(migration).toContain("legacyIdentityPayloadRedacted")
    expect(migration).toContain("p_payload->>'identityDigest'")
    expect(migration).toContain("p_payload ? 'idNumber'")
    expect(migration).toContain("kvkk-registration-2026-07-v1")
    expect(migration).toContain(
      "e369300890134c057cf98582a766ded861e8a0a2a16fb8ebe1f8b7fcf6df6555"
    )
    expect(migration).toContain(") >= 5 OR (")
    expect(migration).toContain(") >= 100")
    expect(migration).toContain("Registration history is append-only")
    expect(migration).toContain("registration_review_workspace")
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.registration_requests"
    )

    const route = readFileSync(
      resolve(process.cwd(), "app/api/site-management/registration/route.ts"),
      "utf8"
    )
    const signup = readFileSync(
      resolve(process.cwd(), "app/[locale]/signup/page.tsx"),
      "utf8"
    )
    const reviewPanel = readFileSync(
      resolve(process.cwd(), "components/registration-review-panel.tsx"),
      "utf8"
    )
    expect(route).toContain('createHmac("sha256"')
    expect(route).toContain("REGISTRATION_IDENTITY_PEPPER")
    expect(route).not.toContain("process.env.SUPABASE_SERVICE_ROLE_KEY")
    expect(route).toContain("REGISTRATION_SECRET_QUERY_REJECTED")
    expect(route).toContain(
      'publicAction === "status" || publicAction === "activation_status"'
    )
    expect(signup).toContain("window.sessionStorage.setItem")
    expect(signup).not.toContain('redirect.searchParams.set("activation"')
    expect(reviewPanel).toContain("url.hash = new URLSearchParams")
    expect(reviewPanel).not.toContain('url.searchParams.set("activation"')
    const registrationRepository = readFileSync(
      resolve(process.cwd(), "lib/registration-repository.ts"),
      "utf8"
    )
    expect(registrationRepository).toContain('createHmac("sha256"')
    expect(registrationRepository).toContain("REGISTRATION_RECEIPT_PEPPER")
    expect(registrationRepository).not.toContain('createHash("sha256")')
    const legacyRepository = readFileSync(
      resolve(process.cwd(), "lib/site-management-repository.ts"),
      "utf8"
    )
    expect(legacyRepository).not.toContain("submitRegistrationRequest")
    expect(legacyRepository).not.toContain("idNumber: input.idNumber")
  })

  test("signup localizes trust copy and never exposes raw provider or API errors", () => {
    const signup = readFileSync(
      resolve(process.cwd(), "app/[locale]/signup/page.tsx"),
      "utf8"
    )

    for (const localizedApprovalTitle of [
      "Human approval, exact scope",
      "İnsan onayı, kesin kapsam",
      "Menschliche Freigabe, exakter Umfang",
      "Ручное одобрение, точная область доступа",
    ]) {
      expect(signup).toContain(localizedApprovalTitle)
    }

    expect(signup).toContain("registrationStatusLabels[publicStatus.status]")
    expect(signup).toContain(
      "registrationNextStepLabels[publicStatus.nextStep]"
    )
    expect(signup).toContain("activationStatusLabels[activationStatus.status]")
    expect(signup).not.toContain("payload.error")
    expect(signup).not.toMatch(/instanceof Error\s*\?[^:\n]*\.message/)
    expect(signup).not.toContain("Human approval, exact scope</h2>")
    expect(signup).not.toContain('params.get("activation")')
    expect(signup).toContain('"Idempotency-Key": activation.redemptionKey')
    expect(signup).toContain(
      'payload.code === "REGISTRATION_IDENTITY_PROTECTION_UNAVAILABLE"'
    )
    expect(signup).toContain("t.identityProtectionUnavailable")

    for (const approvedRetentionCopy of [
      "Exact retention and deletion periods will apply only after",
      "Kesin saklama ve silme süreleri ancak",
      "Genaue Aufbewahrungs- und Löschfristen gelten erst nach",
      "Точные сроки хранения и удаления применяются только после",
    ]) {
      expect(signup).toContain(approvedRetentionCopy)
    }
    for (const overstatedRetentionCopy of [
      "apply the retention policy",
      "saklama politikasını uygulamak",
      "Anwendung der Aufbewahrung",
      "аудита и политики хранения",
    ]) {
      expect(signup).not.toContain(overstatedRetentionCopy)
    }
  })
})
