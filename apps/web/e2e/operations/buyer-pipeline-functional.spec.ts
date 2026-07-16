import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { setAccessRole } from "../support/flows"

const prospectId = "11111111-1111-4111-8111-111111111111"
const siteId = "22222222-2222-4222-8222-222222222222"
const managerId = "33333333-3333-4333-8333-333333333333"
const unitId = "44444444-4444-4444-8444-444444444444"
const alternateUnitId = "77777777-7777-4777-8777-777777777777"

function liveWorkspace() {
  return {
    source: "supabase-live",
    generatedAt: "2026-07-14T14:00:00.000Z",
    mutationAvailable: true,
    unavailableReason: null,
    authority: "local_authoritative",
    twentySync: "provider_ready",
    sites: [{ id: siteId, name: "New Level Premium", code: "NLP" }],
    units: [
      { id: unitId, siteId, label: "A-12" },
      { id: alternateUnitId, siteId, label: "A-14" },
    ],
    managers: [{ id: managerId, name: "Derya Manager" }],
    prospects: [
      {
        id: prospectId,
        siteId,
        siteName: "New Level Premium",
        siteCode: "NLP",
        unitId,
        unitLabel: "A-12",
        fullName: "Ada Buyer",
        email: "ada@example.test",
        phone: "+90 555 000 0012",
        preferredLocale: "en",
        source: "website",
        sourceDetail: "Public project page",
        consentStatus: "pending",
        consentVersion: null as string | null,
        consentEvidenceRecorded: false,
        assignedManagerId: managerId,
        assignedManagerName: "Derya Manager",
        stage: "offer",
        followUpAt: "2026-07-18T10:30:00.000Z",
        lossReason: null,
        authority: "local_authoritative",
        twentySyncStatus: "provider_ready",
        version: 4,
        createdAt: "2026-07-10T09:00:00.000Z",
        updatedAt: "2026-07-14T13:55:00.000Z",
      },
    ],
    interests: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        prospectId,
        unitId,
        unitLabel: "A-12",
        priority: 1,
        note: null,
      },
    ],
    stageEvents: [
      {
        id: "66666666-6666-4666-8666-666666666666",
        prospectId,
        fromStage: "viewing",
        toStage: "offer",
        reason: null,
        version: 4,
        createdAt: "2026-07-14T13:55:00.000Z",
      },
    ],
    notes: [],
    conversions: [],
  }
}

function unavailableWorkspace() {
  return {
    source: "unavailable",
    generatedAt: "2026-07-14T14:00:00.000Z",
    mutationAvailable: false,
    unavailableReason: "real_auth_required",
    authority: "local_authoritative",
    twentySync: "provider_ready",
    sites: [],
    units: [],
    managers: [],
    prospects: [],
    interests: [],
    stageEvents: [],
    notes: [],
    conversions: [],
  }
}

async function mockBuyerApi(
  page: Page,
  data:
    | ReturnType<typeof liveWorkspace>
    | ReturnType<typeof unavailableWorkspace> = liveWorkspace(),
  mutationResult: Record<string, unknown> = { replayed: false, version: 5 }
) {
  const commands: Array<{
    method: string
    headers: Record<string, string>
    body: Record<string, unknown>
  }> = []
  await page.route("**/api/site-management/buyer-pipeline**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      })
      return
    }
    commands.push({
      method: route.request().method(),
      headers: route.request().headers(),
      body: (route.request().postDataJSON() ?? {}) as Record<string, unknown>,
    })
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mutationResult),
    })
  })
  return commands
}

test.describe("UC24 persistent buyer sales room", () => {
  test.describe.configure({ timeout: 90_000 })

  test("page, API, and repository contain no legacy demo data dependency", () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), "app/[locale]/dashboard/leads/page.tsx"),
      "utf8"
    )
    const apiSource = readFileSync(
      resolve(process.cwd(), "app/api/site-management/buyer-pipeline/route.ts"),
      "utf8"
    )
    const repositorySource = readFileSync(
      resolve(process.cwd(), "lib/buyer-pipeline-repository.ts"),
      "utf8"
    )
    const combined = `${pageSource}\n${apiSource}\n${repositorySource}`

    expect(combined).not.toContain("site-management-data")
    expect(combined).not.toContain("local-demo-contract")
    expect(pageSource).toContain("BuyerPipelineWorkspace")
    expect(apiSource).toContain("getBuyerPipelineData")
    expect(apiSource).toContain("createBuyerProspect")
    expect(apiSource).toContain("transitionBuyerProspect")
    expect(apiSource).toContain("addBuyerProspectNote")
    expect(apiSource).toContain("convertBuyerProspect")
    expect(repositorySource).toContain('source: "supabase-live"')
    expect(repositorySource).toContain('source: "unavailable"')
    expect(repositorySource).not.toContain("localStorage")
  })

  test("local access profile shows an honest unavailable state and no sample buyers", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")
    await mockBuyerApi(page, unavailableWorkspace())
    await page.goto("/en/dashboard/leads")

    await expect(
      page.getByRole("heading", { level: 1, name: "Buyer pipeline" })
    ).toBeVisible()
    await expect(
      page.getByText("Persistent buyer pipeline unavailable")
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByText(
        /local access profile cannot display or create persistent buyer records/i
      )
    ).toBeVisible()
    await expect(page.getByText("Ada Buyer")).toHaveCount(0)
  })

  test("manager sees authoritative truth, stage rail, and link-only hand-off boundary", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")
    await mockBuyerApi(page)
    await page.goto("/en/dashboard/leads")

    await expect(
      page.getByText("Local database authoritative", { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText("Twenty provider-ready", { exact: true })
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Offer: 1" })).toBeVisible()
    await expect(
      page.getByText("Ada Buyer", { exact: true }).first()
    ).toBeVisible()
    await expect(
      page.getByText(/never creates a registration or reservation/i)
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Link existing record" })
    ).toBeDisabled()
  })

  test("creation stays scoped and sends pending consent with an idempotency key", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")
    const commands = await mockBuyerApi(page)
    await page.goto("/en/dashboard/leads")

    await page.getByRole("button", { name: "Add buyer" }).click()
    const createForm = page.getByRole("form", { name: "Scoped buyer record" })
    await createForm.getByLabel("Full name").fill("Mina Prospect")
    await createForm.getByLabel("Email").fill("mina@example.test")
    await createForm
      .getByRole("combobox", { name: /^Source/ })
      .selectOption("referral")
    await createForm.getByLabel("KVKK consent").selectOption("pending")
    await createForm.getByLabel("Primary unit").selectOption(unitId)
    await createForm
      .getByRole("button", { name: "Create persistent record" })
      .click()

    await expect.poll(() => commands.length).toBe(1)
    expect(commands[0].method).toBe("POST")
    expect(commands[0].headers["idempotency-key"]).toMatch(/^buyer-ui:create:/)
    expect(commands[0].body).toMatchObject({
      fullName: "Mina Prospect",
      email: "mina@example.test",
      siteId,
      assignedManagerId: managerId,
      source: "referral",
      consentStatus: "pending",
      unitId,
    })
  })

  test("duplicate contact feedback does not claim that a new buyer was created", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")
    await mockBuyerApi(page, liveWorkspace(), {
      replayed: false,
      duplicate: true,
      prospectId,
      version: 4,
    })
    await page.goto("/en/dashboard/leads")

    await page.getByRole("button", { name: "Add buyer" }).click()
    const createForm = page.getByRole("form", { name: "Scoped buyer record" })
    await createForm.getByLabel("Full name").fill("Ada Buyer")
    await createForm.getByLabel("Email").fill("ada@example.test")
    await createForm.getByLabel("KVKK consent").selectOption("pending")
    await createForm.getByLabel("Primary unit").selectOption(unitId)
    await createForm
      .getByRole("button", { name: "Create persistent record" })
      .click()

    await expect(
      page.getByText(/existing buyer with matching contact details/i)
    ).toBeVisible()
    await expect(
      page.getByText("The buyer record was persisted.")
    ).toHaveCount(0)
  })

  test("profile edits submit the selected site-scoped unit interests", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")
    const commands = await mockBuyerApi(page)
    await page.goto("/en/dashboard/leads")

    const profileForm = page.getByRole("form", { name: "Contact" })
    await profileForm
      .getByLabel("Units of interest")
      .selectOption([unitId, alternateUnitId])
    await profileForm
      .getByRole("button", { name: "Save profile and follow-up" })
      .click()

    await expect.poll(() => commands.length).toBe(1)
    expect(commands[0].body).toMatchObject({
      action: "update",
      prospectId,
      interestUnitIds: [unitId, alternateUnitId],
      consentStatus: "pending",
      consentVersion: null,
      consentTextDigest: null,
    })
  })

  test("an already granted prospect edits without re-entering immutable consent evidence", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")
    const data = liveWorkspace()
    data.prospects[0].consentStatus = "granted"
    data.prospects[0].consentVersion = "kvkk-buyer-2026-07-v1"
    data.prospects[0].consentEvidenceRecorded = true
    const commands = await mockBuyerApi(page, data)
    await page.goto("/en/dashboard/leads")

    const profileForm = page.getByRole("form", { name: "Contact" })
    await expect(
      profileForm.getByLabel("Consent evidence SHA-256")
    ).toHaveCount(0)
    await expect(
      profileForm.getByText(/evidence remains immutable on the server/i)
    ).toBeVisible()
    await profileForm
      .getByRole("button", { name: "Save profile and follow-up" })
      .click()

    await expect.poll(() => commands.length).toBe(1)
    expect(commands[0].body).toMatchObject({
      action: "update",
      prospectId,
      consentStatus: "granted",
      consentVersion: null,
      consentTextDigest: null,
    })
  })

  test("stage transition uses CAS and an idempotent PATCH command", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")
    const commands = await mockBuyerApi(page)
    await page.goto("/en/dashboard/leads")

    await page.getByRole("button", { name: "Move to stage" }).click()
    await expect.poll(() => commands.length).toBe(1)
    expect(commands[0].method).toBe("PATCH")
    expect(commands[0].headers["if-match"]).toBe('"4"')
    expect(commands[0].headers["idempotency-key"]).toMatch(
      /^buyer-ui:transition:/
    )
    expect(commands[0].body).toMatchObject({
      action: "transition",
      prospectId,
      expectedVersion: 4,
      toStage: "reservation",
    })
  })

  test("all four feature locales render and the workbench remains mobile-safe", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await setAccessRole(page, "manager")
    await mockBuyerApi(page)
    const headings = {
      tr: "Alıcı hattı",
      en: "Buyer pipeline",
      de: "Käufer-Pipeline",
      ru: "Воронка покупателей",
    } as const

    for (const [locale, heading] of Object.entries(headings)) {
      await page.goto(`/${locale}/dashboard/leads`)
      await expect(
        page.getByRole("heading", { level: 1, name: heading })
      ).toBeVisible()
      await expect(
        page.getByText("Ada Buyer", { exact: true }).first()
      ).toBeVisible()
    }
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }))
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1)
  })
})
