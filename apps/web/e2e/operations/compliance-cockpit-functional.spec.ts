import { expect, test, type Page, type Route } from "@playwright/test"
import { openDashboardAs, resetQaState, setAccessRole } from "../support/flows"

test.beforeEach(async ({ page }) => {
  await resetQaState(page)
})

const accessCaseId = "11111111-1111-4111-8111-111111111111"
const buyerCaseId = "22222222-2222-4222-8222-222222222222"

function livePayload(version = 3, status = "pending_review") {
  const generatedAt = new Date().toISOString()
  return {
    source: "supabase-live",
    generatedAt,
    mutationAvailable: true,
    unavailableReason: null,
    providerBoundary: {
      accessExecution: "provider_ready_blocked",
      moneyExecution: "separate_finance_approval",
      legalGuarantee: "not_provided",
    },
    summary: {
      total: 2,
      pending: status === "pending_review" || status === "in_review" ? 1 : 0,
      blocked: 1,
      critical: 1,
      access: 1,
      deposits: 0,
      buyerSuitability: 1,
      demoRecords: 0,
    },
    cases: [
      {
        id: accessCaseId,
        caseNumber: "ACC-LIVE-001",
        caseType: "access",
        companyId: "33333333-3333-4333-8333-333333333333",
        siteId: "44444444-4444-4444-8444-444444444444",
        siteName: "New Level Premium",
        siteCode: "NLP",
        unitId: "55555555-5555-4555-8555-555555555555",
        unitLabel: "B-204",
        subjectName: "Aylin Demir",
        subjectReference: "Move-in 204",
        status,
        riskLevel: "high",
        blocker: "Identity evidence requires human review.",
        nextAction: "Review identity; keep physical access provider-blocked.",
        financialExposureCents: null,
        currency: null,
        executionMode: "provider_ready",
        providerStatus: "blocked_pending_contract",
        dataOrigin: "operational_projection",
        sourceTable: "access_handoff_requests",
        sourceId: "66666666-6666-4666-8666-666666666666",
        facts: {
          credentialType: "mobile_code",
          requestedAction: "activate",
          sourceStatus: "pending_approval",
        },
        humanDecisionRequired: true,
        externalExecutionAllowed: false,
        version,
        lastDecisionAt: version > 3 ? generatedAt : null,
        createdAt: "2026-07-13T08:00:00.000Z",
        updatedAt: generatedAt,
      },
      {
        id: buyerCaseId,
        caseNumber: "BUY-LIVE-002",
        caseType: "buyer_suitability",
        companyId: "33333333-3333-4333-8333-333333333333",
        siteId: "44444444-4444-4444-8444-444444444444",
        siteName: "New Level Premium",
        siteCode: "NLP",
        unitId: null,
        unitLabel: null,
        subjectName: "Buyer review file",
        subjectReference: "1+1 residence",
        status: "blocked",
        riskLevel: "critical",
        blocker: "Current district status requires qualified legal review.",
        nextAction: "Do not promise suitability; obtain current qualified advice.",
        financialExposureCents: 12000000,
        currency: "EUR",
        executionMode: "manual_only",
        providerStatus: "not_required",
        dataOrigin: "client_import",
        sourceTable: null,
        sourceId: null,
        facts: {
          nationality: "GB",
          buyerGoal: "residence",
          districtCheck: "restricted",
          appraisalRequired: false,
        },
        humanDecisionRequired: true,
        externalExecutionAllowed: false,
        version: 2,
        lastDecisionAt: null,
        createdAt: "2026-07-13T08:00:00.000Z",
        updatedAt: "2026-07-14T07:00:00.000Z",
      },
    ],
    recentDecisions:
      version > 3
        ? [
            {
              id: "77777777-7777-4777-8777-777777777777",
              caseId: accessCaseId,
              fromStatus: "pending_review",
              toStatus: "in_review",
              decision: "request_information",
              rationale: "Identity evidence is incomplete; request the signed document.",
              actorRole: "manager",
              caseVersion: 4,
              policyVersion: "compliance-review-v1",
              externalExecution: false,
              createdAt: generatedAt,
            },
          ]
        : [],
  }
}

async function mockLiveCompliance(page: Page) {
  let payload = livePayload()
  let patchRequest: { headers: Record<string, string>; body: Record<string, unknown> } | null = null

  await page.route("**/api/site-management/compliance-cases**", async (route: Route) => {
    if (route.request().method() === "PATCH") {
      patchRequest = {
        headers: route.request().headers(),
        body: route.request().postDataJSON() as Record<string, unknown>,
      }
      payload = livePayload(4, "in_review")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { ETag: '"4"' },
        body: JSON.stringify({
          data: payload,
          updatedCase: payload.cases[0],
          idempotencyKey: patchRequest.headers["idempotency-key"],
        }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    })
  })

  return { getPatchRequest: () => patchRequest }
}

test.describe("Functional tests - live compliance cockpit", () => {
  test("manager filters, reviews, and records a versioned human decision", async ({ page }) => {
    await setAccessRole(page, "manager")
    const mocked = await mockLiveCompliance(page)
    await page.goto("/en/dashboard/compliance")

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Manage every review-ready case in one place"
    )
    await expect(page.getByText("Organization data", { exact: true })).toBeVisible()
    await expect(page.getByText(/never opens physical access/i)).toBeVisible()

    const search = page.getByLabel("Search by case, person, unit, or next step")
    await search.fill("B-204")
    await expect(page.getByRole("button", { name: /ACC-LIVE-001/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /BUY-LIVE-002/ })).toHaveCount(0)
    await page.getByRole("button", { name: "Clear filters" }).click()

    await page.getByLabel("Case type").selectOption("buyer_suitability")
    await expect(page.getByRole("button", { name: /BUY-LIVE-002/ })).toBeVisible()
    await page.getByRole("button", { name: "Clear filters" }).click()
    await page.getByRole("button", { name: /ACC-LIVE-001/ }).click()

    await expect(page.getByTestId("compliance-case-detail")).toContainText(
      "Identity evidence requires human review."
    )
    await page
      .getByRole("combobox", { name: "Decision", exact: true })
      .selectOption("request_information")
    const reason = "Identity evidence is incomplete; request the signed document."
    await page.getByLabel("Decision reason").fill(reason)
    await page.getByRole("button", { name: "Record reasoned decision" }).click()

    await expect(page.getByText("The decision was recorded and added to the history.")).toBeVisible()
    await expect(page.getByTestId("compliance-case-detail")).toContainText(reason)
    await expect(page.getByTestId("compliance-case-detail")).toContainText("Version 4")

    const request = mocked.getPatchRequest()
    expect(request).not.toBeNull()
    expect(request?.headers["if-match"]).toBe('"3"')
    expect(request?.headers["idempotency-key"]).toMatch(/^compliance-ui:/)
    expect(request?.body).toMatchObject({
      caseId: accessCaseId,
      expectedVersion: 3,
      decision: "request_information",
      rationale: reason,
    })
  })

  test("local manager demo is explicitly non-mutable", async ({ page }) => {
    await openDashboardAs(page, "manager", "/en/dashboard/compliance")
    await expect(page.getByText("Clearly labelled demo data", { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "This view contains demo records" })).toBeVisible()
    await expect(page.getByText(/Decision recording is closed in this environment/)).toBeVisible()
    await expect(page.getByRole("button", { name: "Record reasoned decision" })).toHaveCount(0)
  })

  test("non-authorized tenant is redirected away from organization compliance", async ({ page }) => {
    await openDashboardAs(page, "tenant", "/en/dashboard/compliance")
    await expect(page).toHaveURL(/\/en\/dashboard$/)
  })

  test("the cockpit retains business-facing copy in all four locales", async ({ page }) => {
    await setAccessRole(page, "manager")
    const expectations = [
      ["tr", "Karar bekleyen dosyaları tek yerde yönetin"],
      ["en", "Manage every review-ready case in one place"],
      ["de", "Alle prüfbereiten Fälle an einem Ort steuern"],
      ["ru", "Управляйте всеми делами на проверке в одном месте"],
    ] as const

    for (const [locale, heading] of expectations) {
      await page.goto(`/${locale}/dashboard/compliance`)
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading)
    }
  })

  test("keyboard labels, focus, and mobile layout remain accessible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await setAccessRole(page, "manager")
    await mockLiveCompliance(page)
    await page.goto("/en/dashboard/compliance")

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
    await expect(page.getByLabel("Case type")).toBeVisible()
    await expect(page.getByLabel("Status")).toBeVisible()
    await expect(page.getByLabel("Risk")).toBeVisible()
    await expect(page.getByLabel("Decision reason")).toHaveAttribute(
      "aria-describedby",
      /compliance-rationale-hint/
    )

    const firstCase = page.getByRole("button", { name: /BUY-LIVE-002/ })
    await firstCase.focus()
    await expect(firstCase).toBeFocused()
    await firstCase.press("Enter")
    await expect(page.getByTestId("compliance-case-detail")).toContainText(
      "Current district status requires qualified legal review."
    )

    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }))
    expect(overflow.content).toBeLessThanOrEqual(overflow.viewport + 1)
  })
})
