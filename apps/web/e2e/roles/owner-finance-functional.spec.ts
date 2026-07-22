import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import {
  buildOwnerFinanceData,
  type AuthorizedUnit,
  type OwnerFinanceData,
  type OwnerFinanceStatementEntry,
  type OwnerFinanceUnitAggregate,
} from "../../lib/owner-finance-projection"
import { dashboardHomeCopy } from "../../lib/dashboard-home-copy"
import { openDashboardAs, resetQaState, setAccessRole } from "../support/flows"

test.beforeEach(async ({ page }) => {
  await resetQaState(page)
})

function readOwnerFinanceSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

interface OwnerFinanceResponse {
  contractVersion: string
  source: string
  scope: string
  generatedAt: string
  units: Array<{
    unitId: string
    unitNo: string
    entries: Array<{ unitId: string; unitNo: string }>
  }>
}

function encodeOwnerFinanceCursor(cursor: { createdAt: string; id: string }) {
  return Buffer.from(
    JSON.stringify({ v: 1, createdAt: cursor.createdAt, id: cursor.id }),
    "utf8"
  ).toString("base64url")
}

const emptyOwnerStatement = {
  contractVersion: "owner-finance.v3",
  source: "supabase",
  generatedAt: "2026-07-14T08:30:00.000Z",
  scope: "verified-owner-units",
  summary: {
    currency: "TRY",
    unitCount: 0,
    openBalanceCents: 0,
    overdueBalanceCents: 0,
    recordedPaymentsCents: 0,
    entryCount: 0,
  },
  units: [],
  pagination: {
    limit: 100,
    returnedEntryCount: 0,
    totalEntryCount: 0,
    hasMore: false,
    nextCursor: null,
    snapshotAt: "2026-07-14T08:30:00.000Z",
  },
}

const pagedUnits: AuthorizedUnit[] = [
  { id: "unit-a-001", unitNo: "A-001" },
  { id: "unit-d-023", unitNo: "D-023" },
]
const PAGED_SNAPSHOT = "2026-07-14T12:30:00.000Z"

function pagedEntry(index: number): OwnerFinanceStatementEntry {
  const unit = index % 2 === 0 ? pagedUnits[0] : pagedUnits[1]
  const timestamp = new Date(
    Date.UTC(2026, 6, 14, 12, 0, 0) - index * 60_000
  ).toISOString()
  return {
    id: `paged-entry-${index}`,
    unitId: unit.id,
    unitNo: unit.unitNo,
    entryType: "payment",
    period: "2026-07",
    dueDate: null,
    paidAt: timestamp,
    postedAt: timestamp,
    createdAt: timestamp,
    status: "paid",
    amountCents: 1_000,
    currency: "TRY",
    description: `Recorded payment ${index}`,
    activityKind: "standard",
    reconciliationStatus: null,
    manualPaymentId: null,
    reversesManualPaymentId: null,
  }
}

const pagedAggregates: OwnerFinanceUnitAggregate[] = [
  {
    unitId: pagedUnits[0].id,
    currency: "TRY",
    openBalanceCents: 35_000,
    overdueBalanceCents: 5_000,
    recordedPaymentsCents: 63_000,
    lastPaymentAt: "2026-07-14T12:00:00.000Z",
    entryCount: 63,
  },
  {
    unitId: pagedUnits[1].id,
    currency: "TRY",
    openBalanceCents: 20_000,
    overdueBalanceCents: 0,
    recordedPaymentsCents: 62_000,
    lastPaymentAt: "2026-07-14T11:59:00.000Z",
    entryCount: 62,
  },
]

function pagedStatement(page: 1 | 2): OwnerFinanceData {
  const allEntries = Array.from({ length: 125 }, (_, index) =>
    pagedEntry(index)
  )
  const entries = page === 1 ? allEntries.slice(0, 100) : allEntries.slice(100)
  const lastEntry = entries.at(-1)
  return buildOwnerFinanceData("supabase", pagedUnits, entries, {
    aggregates: pagedAggregates,
    pagination: {
      limit: 100,
      returnedEntryCount: entries.length,
      totalEntryCount: 125,
      hasMore: page === 1,
      nextCursor:
        page === 1 && lastEntry
          ? encodeOwnerFinanceCursor({
              createdAt: lastEntry.createdAt,
              id: lastEntry.id,
            })
          : null,
      snapshotAt: PAGED_SNAPSHOT,
    },
  })
}

function refreshedFirstPageStatement(): OwnerFinanceData {
  const allEntries = Array.from({ length: 125 }, (_, index) =>
    pagedEntry(index)
  )
  const refreshedEntry: OwnerFinanceStatementEntry = {
    ...pagedEntry(0),
    id: "paged-entry-new",
    createdAt: "2026-07-14T12:15:00.000Z",
    paidAt: "2026-07-14T12:15:00.000Z",
    postedAt: "2026-07-14T12:15:00.000Z",
    description: "New payment received during refresh",
  }
  const entries = [refreshedEntry, ...allEntries.slice(0, 99)]
  const aggregates = pagedAggregates.map((aggregate, index) =>
    index === 0
      ? {
          ...aggregate,
          entryCount: aggregate.entryCount + 1,
          recordedPaymentsCents: (aggregate.recordedPaymentsCents ?? 0) + 1_000,
          lastPaymentAt: refreshedEntry.createdAt,
        }
      : aggregate
  )
  const lastEntry = entries.at(-1)
  return buildOwnerFinanceData("supabase", pagedUnits, entries, {
    aggregates,
    pagination: {
      limit: 100,
      returnedEntryCount: 100,
      totalEntryCount: 126,
      hasMore: true,
      nextCursor: lastEntry
        ? encodeOwnerFinanceCursor({
            createdAt: lastEntry.createdAt,
            id: lastEntry.id,
          })
        : null,
      snapshotAt: "2026-07-14T12:45:00.000Z",
    },
  })
}

function mixedCurrencyStatement(): OwnerFinanceData {
  const units: AuthorizedUnit[] = [
    { id: "unit-try", unitNo: "A-001" },
    { id: "unit-eur", unitNo: "D-023" },
  ]
  const entries: OwnerFinanceStatementEntry[] = [
    {
      ...pagedEntry(0),
      id: "mixed-try-charge",
      unitId: "unit-try",
      unitNo: "A-001",
      entryType: "dues",
      status: "open",
      amountCents: 10_000,
      currency: "TRY",
    },
    {
      ...pagedEntry(1),
      id: "mixed-eur-charge",
      unitId: "unit-eur",
      unitNo: "D-023",
      entryType: "dues",
      status: "overdue",
      amountCents: 20_000,
      currency: "EUR",
    },
  ]

  return buildOwnerFinanceData("supabase", units, entries)
}

test.describe("Owner finance statement - role and unit boundaries", () => {
  test("owner route keeps internal finance data behind a server-side role boundary", async () => {
    const routeSource = readOwnerFinanceSource(
      "../../app/[locale]/dashboard/finance/page.tsx"
    )
    const privilegedSource = readOwnerFinanceSource(
      "../../app/[locale]/dashboard/finance/privileged-finance-dashboard.tsx"
    )
    const ownerSource = readOwnerFinanceSource(
      "../../components/owner-finance-statement.tsx"
    )
    const dashboardProjectionSource = readOwnerFinanceSource(
      "../../lib/role-dashboard-repository.ts"
    )

    expect(routeSource).not.toContain('"use client"')
    expect(routeSource).toContain("getUserProfile")
    expect(routeSource).toContain(
      'hasPermission(profile.role, "finance", "view")'
    )
    expect(routeSource).toContain('profile.role === "owner"')
    expect(routeSource).toContain("await import(")
    expect(routeSource).toContain('"./privileged-finance-dashboard"')
    expect(routeSource).not.toContain("site-management-data")
    expect(privilegedSource).toContain('from "@/lib/site-management-data"')
    expect(ownerSource).not.toMatch(
      /finance_ledger_entries|postgres_changes|supabase\/client/
    )
    expect(ownerSource).toContain("window.setInterval")
    expect(ownerSource).toMatch(
      /window\.addEventListener\(\s*["']site-management:changed["']/
    )
    expect(dashboardProjectionSource).not.toMatch(
      /role === "owner"[\s\S]{0,180}finance_ledger_entries/
    )
  })

  test("mixed currencies suppress incompatible aggregate minor units", async () => {
    const statement = mixedCurrencyStatement()

    expect(statement.summary).toMatchObject({
      currency: "MIXED",
      unitCount: 2,
      openBalanceCents: null,
      overdueBalanceCents: null,
      recordedPaymentsCents: null,
    })
    expect(statement.units).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitNo: "A-001",
          currency: "TRY",
          openBalanceCents: 10_000,
        }),
        expect.objectContaining({
          unitNo: "D-023",
          currency: "EUR",
          openBalanceCents: 20_000,
        }),
      ])
    )

    const mixedUnitStatement = buildOwnerFinanceData(
      "supabase",
      [{ id: "unit-mixed", unitNo: "A-054" }],
      statement.units
        .flatMap((unit) => unit.entries)
        .map((entry) => ({
          ...entry,
          unitId: "unit-mixed",
          unitNo: "A-054",
        }))
    )
    expect(mixedUnitStatement.units[0]).toMatchObject({
      currency: "MIXED",
      openBalanceCents: null,
      overdueBalanceCents: null,
      recordedPaymentsCents: null,
    })
    expect(mixedUnitStatement.summary.openBalanceCents).toBeNull()
  })

  test("full aggregates stay correct beyond 100 entries across multiple units", async () => {
    const firstPage = pagedStatement(1)

    expect(firstPage.pagination).toEqual({
      limit: 100,
      returnedEntryCount: 100,
      totalEntryCount: 125,
      hasMore: true,
      nextCursor: expect.any(String),
      snapshotAt: PAGED_SNAPSHOT,
    })
    expect(firstPage.summary).toMatchObject({
      unitCount: 2,
      openBalanceCents: 55_000,
      overdueBalanceCents: 5_000,
      recordedPaymentsCents: 125_000,
      entryCount: 125,
    })
    expect(
      firstPage.units.reduce((sum, unit) => sum + unit.entries.length, 0)
    ).toBe(100)
    expect(firstPage.units.map((unit) => unit.openBalanceCents)).toEqual([
      35_000, 20_000,
    ])
  })

  test("owner receives only a verified-unit statement and cross-unit query fails closed", async ({
    page,
  }) => {
    await setAccessRole(page, "owner")

    const response = await page.request.get(
      "/api/site-management/owner-finance?limit=100"
    )
    expect(response.status()).toBe(200)
    const statement = (await response.json()) as OwnerFinanceResponse

    expect(statement.contractVersion).toBe("owner-finance.v3")
    expect(statement.scope).toBe("verified-owner-units")
    expect(statement.source).toBe("local-seed")
    expect(statement.generatedAt).toBeTruthy()
    expect(statement.units.map((unit) => unit.unitNo).sort()).toEqual([
      "A-001",
      "A-054",
      "D-023",
    ])
    expect(new Set(statement.units.map((unit) => unit.unitNo)).size).toBe(
      statement.units.length
    )

    for (const unit of statement.units) {
      expect(unit.entries.every((entry) => entry.unitId === unit.unitId)).toBe(
        true
      )
      expect(unit.entries.every((entry) => entry.unitNo === unit.unitNo)).toBe(
        true
      )
    }

    const forbiddenUnit = await page.request.get(
      "/api/site-management/owner-finance?unitNo=Z-999"
    )
    expect(forbiddenUnit.status()).toBe(403)
    await expect(forbiddenUnit.json()).resolves.toMatchObject({
      code: "OWNER_FINANCE_UNIT_FORBIDDEN",
    })

    const mutation = await page.request.post(
      "/api/site-management/owner-finance",
      { data: { amount: 1 } }
    )
    expect(mutation.status()).toBe(405)
  })

  test("owner can request distinct keyset windows without changing snapshot totals", async ({
    page,
  }) => {
    await setAccessRole(page, "owner")
    const firstResponse = await page.request.get(
      "/api/site-management/owner-finance?limit=1"
    )
    expect(firstResponse.status()).toBe(200)
    const first = (await firstResponse.json()) as OwnerFinanceData
    expect(first.pagination.nextCursor).toBeTruthy()
    const secondResponse = await page.request.get(
      `/api/site-management/owner-finance?limit=1&cursor=${encodeURIComponent(first.pagination.nextCursor ?? "")}&snapshotAt=${encodeURIComponent(first.pagination.snapshotAt)}`
    )
    expect(secondResponse.status()).toBe(200)
    const second = (await secondResponse.json()) as OwnerFinanceData

    expect(first.pagination).toMatchObject({
      limit: 1,
      returnedEntryCount: 1,
      hasMore: true,
      nextCursor: expect.any(String),
      snapshotAt: expect.any(String),
    })
    expect(second.pagination.snapshotAt).toBe(first.pagination.snapshotAt)
    expect(second.summary).toEqual(first.summary)
    expect(second.pagination.totalEntryCount).toBe(first.summary.entryCount)
    expect(second.units.flatMap((unit) => unit.entries)[0]?.id).not.toBe(
      first.units.flatMap((unit) => unit.entries)[0]?.id
    )
  })

  test("cursor and snapshot validation fails closed for incomplete, altered, future, and legacy queries", async ({
    page,
  }) => {
    await setAccessRole(page, "owner")
    const firstResponse = await page.request.get(
      "/api/site-management/owner-finance?limit=1"
    )
    expect(firstResponse.status()).toBe(200)
    const first = (await firstResponse.json()) as OwnerFinanceData
    const cursor = first.pagination.nextCursor
    expect(cursor).toBeTruthy()

    const cases = [
      "/api/site-management/owner-finance?page=2",
      "/api/site-management/owner-finance?limit=0",
      `/api/site-management/owner-finance?cursor=${encodeURIComponent(cursor ?? "")}`,
      `/api/site-management/owner-finance?snapshotAt=${encodeURIComponent(first.pagination.snapshotAt)}`,
      `/api/site-management/owner-finance?cursor=${encodeURIComponent(`${cursor}x`)}&snapshotAt=${encodeURIComponent(first.pagination.snapshotAt)}`,
      `/api/site-management/owner-finance?cursor=${encodeURIComponent(cursor ?? "")}&cursor=${encodeURIComponent(cursor ?? "")}&snapshotAt=${encodeURIComponent(first.pagination.snapshotAt)}`,
    ]
    for (const url of cases) {
      const response = await page.request.get(url)
      expect(response.status(), url).toBe(400)
    }

    const snapshotAt = new Date().toISOString()
    const cursorCreatedAt = new Date(Date.now() + 60_000).toISOString()
    const newerCursor = encodeOwnerFinanceCursor({
      createdAt: cursorCreatedAt,
      id: "cursor-newer-than-snapshot",
    })
    const newerResponse = await page.request.get(
      `/api/site-management/owner-finance?cursor=${encodeURIComponent(newerCursor)}&snapshotAt=${encodeURIComponent(snapshotAt)}`
    )
    expect(newerResponse.status()).toBe(400)
    await expect(newerResponse.json()).resolves.toMatchObject({
      code: "OWNER_FINANCE_PAGINATION_INVALID",
    })
  })

  test("a payment inserted between windows is excluded from the old snapshot and appears on refresh", async ({
    page,
  }) => {
    await setAccessRole(page, "owner")
    const firstResponse = await page.request.get(
      "/api/site-management/owner-finance?limit=1"
    )
    expect(firstResponse.status()).toBe(200)
    const first = (await firstResponse.json()) as OwnerFinanceData
    expect(first.pagination.nextCursor).toBeTruthy()
    const ownerUnit = first.units[0]
    expect(ownerUnit).toBeTruthy()

    await page.waitForTimeout(10)
    await setAccessRole(page, "accountant")
    const workspaceResponse = await page.request.get(
      "/api/site-management/manual-payments?limit=100"
    )
    expect(workspaceResponse.status()).toBe(200)
    const workspace = await workspaceResponse.json()
    const account = workspace.accounts.find(
      (candidate: { unitId: string }) => candidate.unitId === ownerUnit.unitId
    )
    expect(account).toBeTruthy()
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const createdResponse = await page.request.post(
      "/api/site-management/manual-payments",
      {
        headers: { "idempotency-key": `cursor-insert-${unique}` },
        data: {
          unitId: account.unitId,
          ownerResidentId: account.ownerResidentId,
          amount: "987.65",
          currency: account.currency,
          receivedAt: new Date(Date.now() - 60_000).toISOString(),
          reference: `CURSOR-${unique}`,
          method: "bank_transfer",
          businessNote:
            "Cursor snapshot regression receipt reviewed by accounting.",
        },
      }
    )
    expect(createdResponse.status()).toBe(201)
    const created = await createdResponse.json()

    await setAccessRole(page, "owner")
    const secondResponse = await page.request.get(
      `/api/site-management/owner-finance?limit=1&cursor=${encodeURIComponent(first.pagination.nextCursor ?? "")}&snapshotAt=${encodeURIComponent(first.pagination.snapshotAt)}`
    )
    expect(secondResponse.status()).toBe(200)
    const second = (await secondResponse.json()) as OwnerFinanceData
    expect(second.pagination.snapshotAt).toBe(first.pagination.snapshotAt)
    expect(second.summary).toEqual(first.summary)
    expect(
      second.units
        .flatMap((unit) => unit.entries)
        .some((entry) => entry.manualPaymentId === created.id)
    ).toBe(false)

    const refreshedResponse = await page.request.get(
      "/api/site-management/owner-finance?limit=100"
    )
    expect(refreshedResponse.status()).toBe(200)
    const refreshed = (await refreshedResponse.json()) as OwnerFinanceData
    expect(refreshed.pagination.snapshotAt).not.toBe(
      first.pagination.snapshotAt
    )
    expect(
      refreshed.units
        .flatMap((unit) => unit.entries)
        .some((entry) => entry.manualPaymentId === created.id)
    ).toBe(true)
  })

  for (const deniedRole of [
    "tenant",
    "staff",
    "manager",
    "accountant",
  ] as const) {
    test(`${deniedRole} cannot use the owner statement endpoint`, async ({
      page,
    }) => {
      await setAccessRole(page, deniedRole)
      const response = await page.request.get(
        "/api/site-management/owner-finance"
      )
      expect(response.status()).toBe(403)
      await expect(response.json()).resolves.toMatchObject({
        code: "OWNER_FINANCE_FORBIDDEN",
      })
    })
  }

  test("owner cannot open internal ledger or payment-control APIs", async ({
    page,
  }) => {
    await setAccessRole(page, "owner")
    expect(
      (await page.request.get("/api/site-management/finance")).status()
    ).toBe(403)
    expect(
      (await page.request.get("/api/site-management/payment-controls")).status()
    ).toBe(403)
  })

  test("accountant keeps the internal finance API and not the owner projection", async ({
    page,
  }) => {
    await setAccessRole(page, "accountant")
    expect(
      (await page.request.get("/api/site-management/finance")).status()
    ).toBe(200)
    expect(
      (await page.request.get("/api/site-management/payment-controls")).status()
    ).toBe(200)
    expect(
      (await page.request.get("/api/site-management/owner-finance")).status()
    ).toBe(403)
  })
})

test.describe("Owner finance statement - user experience", () => {
  test("owner finance is described as a verified read-only statement in every locale", () => {
    for (const copy of Object.values(dashboardHomeCopy)) {
      const ownerFinance = copy.roleWorkspaces.owner.cards.finance
      expect(ownerFinance.title).toBeTruthy()
      expect(ownerFinance.description).toMatch(
        /salt okunur|read-only|schreibgesch|режиме чтения/i
      )
      expect(copy.roleWorkspaces.owner.description).toMatch(
        /doğrulanmış|verified|verifiziert|подтверждён/i
      )
      expect("finance" in copy.roleWorkspaces.tenant.cards).toBe(false)
    }
  })

  test("owner discovers the statement from home while tenant remains excluded", async ({
    page,
  }) => {
    await openDashboardAs(page, "owner", "/en/dashboard")

    const ownerFinanceLink = page.locator("main").getByRole("link", {
      name: "Finance & Dues",
    })
    await expect(ownerFinanceLink).toBeVisible()
    await expect(ownerFinanceLink).toHaveAttribute(
      "href",
      /\/en\/dashboard\/finance$/
    )
    await ownerFinanceLink.click()

    await expect(page).toHaveURL(/\/en\/dashboard\/finance$/)
    await expect(page.getByTestId("owner-finance-page")).toBeVisible()
    // Wait for the success state's unit options to render before reading them
    // (evaluateAll does not auto-retry; the mount fetch may still be pending).
    const unitFilter = page.getByTestId("owner-finance-unit-filter")
    await expect(
      unitFilter.locator('option:not([value="all"])')
    ).toHaveCount(3)
    const ownerUnits = await unitFilter
      .locator('option:not([value="all"])')
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value).sort()
      )
    expect(ownerUnits).toEqual(["A-001", "A-054", "D-023"])

    await openDashboardAs(page, "tenant", "/en/dashboard")
    await expect(
      page.locator("main").getByRole("link", { name: "Finance & Dues" })
    ).toHaveCount(0)
    await expect(
      page.locator('main a[href$="/dashboard/finance"]')
    ).toHaveCount(0)
    await expect(page.getByTestId("owner-finance-page")).toHaveCount(0)
    expect(
      (await page.request.get("/api/site-management/owner-finance")).status()
    ).toBe(403)
  })

  test("owner can load history beyond 100 rows while full totals remain stable", async ({
    page,
  }) => {
    test.setTimeout(45_000)
    await page.route(
      "**/api/site-management/owner-finance?*",
      async (route) => {
        const params = new URL(route.request().url()).searchParams
        const isNextWindow = params.has("cursor")
        if (isNextWindow) {
          expect(params.get("snapshotAt")).toBe(PAGED_SNAPSHOT)
          expect(params.get("cursor")).toBe(
            pagedStatement(1).pagination.nextCursor
          )
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(pagedStatement(isNextWindow ? 2 : 1)),
        })
      }
    )
    await openDashboardAs(page, "owner", "/en/dashboard/finance")

    await expect(page.locator("[data-unit]")).toHaveCount(100)
    await expect(
      page.getByTestId("owner-finance-history-page-status")
    ).toHaveText("100 of 125 records loaded")
    const fullOpenBalance = await page
      .getByTestId("owner-finance-summary-open")
      .textContent()
    await page.getByTestId("owner-finance-load-more").click()
    await expect(page.locator("[data-unit]")).toHaveCount(125)
    await expect(page.getByTestId("owner-finance-load-more")).toHaveCount(0)
    await expect(page.getByTestId("owner-finance-summary-open")).toHaveText(
      fullOpenBalance ?? ""
    )
    await expect(page.locator('[data-unit="A-001"]')).toHaveCount(63)
    await expect(page.locator('[data-unit="D-023"]')).toHaveCount(62)
  })

  test("mixed-currency owner scope never renders a synthetic combined amount", async ({
    page,
  }) => {
    await page.route(
      "**/api/site-management/owner-finance?*",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mixedCurrencyStatement()),
        })
      }
    )
    await openDashboardAs(page, "owner", "/en/dashboard/finance")

    for (const key of ["open", "overdue", "payments"]) {
      await expect(
        page.getByTestId(`owner-finance-summary-${key}`)
      ).toContainText("multiple currencies")
    }

    await page.getByTestId("owner-finance-unit-filter").selectOption("A-001")
    await expect(
      page.getByTestId("owner-finance-summary-open")
    ).not.toContainText("multiple currencies")
    await expect(page.getByTestId("owner-finance-summary-open")).toContainText(
      "100"
    )
  })

  test("background refresh merges a newer first window without dropping loaded history", async ({
    page,
  }) => {
    let firstWindowRequests = 0
    await page.route(
      "**/api/site-management/owner-finance?*",
      async (route) => {
        const params = new URL(route.request().url()).searchParams
        let statement: OwnerFinanceData
        if (params.has("cursor")) {
          statement = pagedStatement(2)
        } else {
          firstWindowRequests += 1
          statement =
            firstWindowRequests === 1
              ? pagedStatement(1)
              : refreshedFirstPageStatement()
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(statement),
        })
      }
    )
    await openDashboardAs(page, "owner", "/en/dashboard/finance")
    await page.getByTestId("owner-finance-load-more").click()
    await expect(page.locator("[data-entry-id]")).toHaveCount(125)
    await expect(
      page.locator('[data-entry-id="paged-entry-124"]')
    ).toBeVisible()
    await expect(page.getByTestId("owner-finance-source")).toHaveText(
      "Database snapshot"
    )
    await expect(
      page.getByTestId("owner-finance-refresh-policy")
    ).toContainText("read-only snapshot")
    expect(firstWindowRequests).toBe(1)

    const refresh = page.waitForResponse(
      (response) =>
        response.url().includes("/api/site-management/owner-finance") &&
        !new URL(response.url()).searchParams.has("cursor") &&
        response.status() === 200
    )
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("site-management:changed"))
    })
    await refresh

    await expect(page.locator("[data-entry-id]")).toHaveCount(126)
    await expect(
      page.locator('[data-entry-id="paged-entry-new"]')
    ).toBeVisible()
    await expect(
      page.locator('[data-entry-id="paged-entry-124"]')
    ).toBeVisible()
    await expect(page.getByTestId("owner-finance-load-more")).toHaveCount(0)
    expect(firstWindowRequests).toBe(2)
  })

  test("visible-page polling performs a second authorized API refresh", async ({
    page,
  }) => {
    let firstWindowRequests = 0
    await page.route(
      "**/api/site-management/owner-finance?*",
      async (route) => {
        firstWindowRequests += 1
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            firstWindowRequests === 1
              ? pagedStatement(1)
              : refreshedFirstPageStatement()
          ),
        })
      }
    )
    await setAccessRole(page, "owner")
    await page.clock.install()
    await page.goto("/en/dashboard/finance")

    await expect(page.getByTestId("owner-finance-source")).toHaveText(
      "Database snapshot"
    )
    await expect(page.locator('[data-entry-id="paged-entry-new"]')).toHaveCount(
      0
    )
    expect(firstWindowRequests).toBe(1)

    await page.clock.runFor(30_000)

    await expect(
      page.locator('[data-entry-id="paged-entry-new"]')
    ).toBeVisible()
    expect(firstWindowRequests).toBe(2)
  })

  test("mobile owner can reach and operate the accessible load-more control", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.route(
      "**/api/site-management/owner-finance?*",
      async (route) => {
        const params = new URL(route.request().url()).searchParams
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(pagedStatement(params.has("cursor") ? 2 : 1)),
        })
      }
    )
    await openDashboardAs(page, "owner", "/en/dashboard/finance")

    const loadMore = page.getByTestId("owner-finance-load-more")
    await expect(loadMore).toBeVisible()
    await expect(loadMore).toBeEnabled()
    await expect(loadMore).toHaveAccessibleName("Load more activity")
    await expect(loadMore).toHaveAttribute(
      "aria-controls",
      "owner-finance-history-rows"
    )
    await expect(
      page.getByTestId("owner-finance-history-page-status")
    ).toHaveAttribute("aria-live", "polite")
    await loadMore.click()
    await expect(page.locator("[data-entry-id]")).toHaveCount(125)
    await expect(loadMore).toHaveCount(0)
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1)
  })

  test("owner reaches the statement naturally and can filter exact unit history", async ({
    page,
  }) => {
    await openDashboardAs(page, "owner", "/tr/dashboard/finance")

    await expect(page).toHaveURL(/\/tr\/dashboard\/finance$/)
    await expect(page.getByTestId("owner-finance-page")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Mali durumum", level: 1 })
    ).toBeVisible()
    await expect(page.getByTestId("owner-finance-source")).toContainText(
      "Örnek veriler"
    )
    const financeNavigation = page.locator(
      'aside a[href$="/dashboard/finance"]'
    )
    if (!(await financeNavigation.isVisible())) {
      await page.getByTestId("dashboard-menu-toggle").click()
    }
    await expect(financeNavigation).toBeVisible()

    const unitFilter = page.getByTestId("owner-finance-unit-filter")
    const unitOptions = await unitFilter.locator("option").allTextContents()
    expect(unitOptions.length).toBeGreaterThan(1)
    const selectedUnit = await unitFilter
      .locator("option")
      .nth(1)
      .getAttribute("value")
    expect(selectedUnit).toBeTruthy()
    await unitFilter.selectOption(selectedUnit!)
    await expect(page.locator("[data-unit]")).toHaveCount(
      await page.locator(`[data-unit="${selectedUnit}"]`).count()
    )
    expect(await page.locator("[data-unit]").count()).toBeGreaterThan(0)

    const historyFilter = page.getByTestId("owner-finance-history-filter")
    await unitFilter.selectOption("all")
    await historyFilter.selectOption("due")
    await expect(page.getByTestId("owner-finance-no-entries")).toBeVisible()
    await historyFilter.selectOption("paid")
    await expect(page.locator("[data-unit]").first()).toBeVisible()

    await expect(page.locator("main")).not.toContainText(
      /Borç yaşlandırma|Finans defteri|Ödeme doğrulama|Kısıtlı erişim/i
    )
  })

  test("operational invalidation refreshes the visible owner statement", async ({
    page,
  }) => {
    await openDashboardAs(page, "owner", "/en/dashboard/finance")
    await expect(page.getByTestId("owner-finance-source")).toBeVisible()

    const refresh = page.waitForResponse(
      (response) =>
        response.url().includes("/api/site-management/owner-finance") &&
        response.status() === 200
    )
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("site-management:changed"))
    })
    await refresh
  })

  test("empty verified scope explains the next step without exposing another unit", async ({
    page,
  }) => {
    await page.route(
      "**/api/site-management/owner-finance?*",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptyOwnerStatement),
        })
      }
    )
    await openDashboardAs(page, "owner", "/en/dashboard/finance")

    await expect(page.getByTestId("owner-finance-empty")).toContainText(
      "No verified unit is linked to your profile"
    )
    await expect(page.getByTestId("owner-finance-rows")).toHaveCount(0)
  })

  test("temporary API failure gives a clear retry path", async ({ page }) => {
    let attempts = 0
    await page.route(
      "**/api/site-management/owner-finance?*",
      async (route) => {
        attempts += 1
        if (attempts === 1) {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Unavailable" }),
          })
          return
        }
        await route.continue()
      }
    )
    await openDashboardAs(page, "owner", "/en/dashboard/finance")

    await expect(page.getByTestId("owner-finance-error")).toContainText(
      "Your statement is temporarily unavailable"
    )
    await page.getByRole("button", { name: "Try again" }).click()
    await expect(page.getByTestId("owner-finance-source")).toBeVisible()
  })

  for (const locale of [
    { key: "tr", heading: "Mali durumum" },
    { key: "en", heading: "My financial statement" },
    { key: "de", heading: "Meine Abrechnung" },
    { key: "ru", heading: "Мой финансовый отчёт" },
  ]) {
    test(`owner statement has business copy in ${locale.key}`, async ({
      page,
    }) => {
      await openDashboardAs(page, "owner", `/${locale.key}/dashboard/finance`)
      await expect(page.getByTestId("owner-finance-source")).toBeVisible({
        timeout: 15_000,
      })
      await expect(
        page.getByRole("heading", { name: locale.heading, level: 1 })
      ).toBeVisible()
    })
  }

  for (const deniedRole of ["tenant", "staff"] as const) {
    test(`${deniedRole} is denied the owner finance screen`, async ({
      page,
    }) => {
      await openDashboardAs(page, deniedRole, "/tr/dashboard/finance")
      await expect(page.getByTestId("owner-finance-page")).toHaveCount(0)
      await expect(
        page.getByRole("heading", { name: "Mali durumum" })
      ).toHaveCount(0)
      await expect(
        page.locator('aside a[href$="/dashboard/finance"]')
      ).toHaveCount(0)
    })
  }
})
