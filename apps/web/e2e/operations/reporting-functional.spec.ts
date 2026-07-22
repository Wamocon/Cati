import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { setAccessRole } from "../support/flows"

const siteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const requestId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const artifactId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

function liveWorkspace() {
  return {
    source: "supabase-live",
    generatedAt: "2026-07-14T12:00:00.000Z",
    mutationAvailable: true,
    unavailableReason: null,
    allowedReportTypes: ["finance_ledger", "unit_inventory", "ticket_operations", "compliance_cases"],
    maxInternalRows: 50000,
    providerBoundary: {
      internalArtifacts: "persistent_database",
      bulkExports: "provider_ready",
      externalStorage: "provider_ready",
    },
    sites: [{ id: siteId, name: "New Level Premium", code: "NLP" }],
    requests: [{
      id: requestId,
      reportType: "unit_inventory",
      siteIds: [siteId],
      filters: { status: "occupied" },
      status: "ready",
      version: 3,
      failureCode: null,
      failureMessage: null,
      startedAt: "2026-07-14T11:59:58.000Z",
      completedAt: "2026-07-14T12:00:00.000Z",
      createdAt: "2026-07-14T11:59:58.000Z",
    }],
    artifacts: [{
      id: artifactId,
      requestId,
      reportType: "unit_inventory",
      fileName: "unit_inventory-20260714-120000.csv",
      contentType: "text/csv; charset=utf-8",
      byteSize: 8421,
      rowCount: 769,
      sha256Hex: "6e11f20961c727a56b432d1b16cc194cca86f9b2115bfa6d70f1cc1996bb2787",
      sourceTables: ["public.units", "public.sites"],
      snapshotAt: "2026-07-14T12:00:00.000Z",
      metrics: { rows: 769, occupied: 640, vacant: 91, reserved: 38 },
      limitations: ["Inventory reflects the committed database snapshot, not an external listing portal."],
      storageMode: "database",
      commentary: "The source snapshot contains 769 units; 640 are currently marked occupied.",
      commentaryGrounding: { rows: 769, occupied: 640 },
      commentaryStatus: "pending_human_review",
      commentaryVersion: 3,
      reviewReason: null,
      reviewedAt: null,
      createdAt: "2026-07-14T12:00:00.000Z",
    }],
  }
}

interface CapturedRequest {
  method: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

async function mockReporting(page: Page) {
  const requests: CapturedRequest[] = []
  await page.route("**/api/site-management/reports**", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(liveWorkspace()),
      })
      return
    }
    requests.push({
      method,
      headers: route.request().headers(),
      body: (route.request().postDataJSON() ?? {}) as Record<string, unknown>,
    })
    await route.fulfill({
      status: method === "POST" ? 201 : 200,
      contentType: "application/json",
      body: JSON.stringify(method === "POST"
        ? { replayed: false, requestId, artifactId }
        : { artifactId, reviewStatus: "approved", version: 4 }),
    })
  })
  return requests
}

test.describe("UC16 persistent report workspace", () => {
  test("local access profiles show an unavailable state and never seed report history", async ({ page }) => {
    await setAccessRole(page, "manager")
    await page.goto("/en/dashboard/reports")

    await expect(page.getByRole("heading", { level: 1, name: "Persistent report archive" })).toBeVisible()
    await expect(page.getByTestId("reporting-unavailable")).toBeVisible()
    await expect(page.getByText("Reports aren't available in this preview yet.", { exact: true })).toBeVisible()
    await expect(page.getByTestId("report-request-row")).toHaveCount(0)
    await expect(page.getByTestId("report-artifact-row")).toHaveCount(0)
  })

  test("manager creates a scoped idempotent report and reviews grounded commentary with CAS", async ({ page }) => {
    await setAccessRole(page, "manager")
    const requests = await mockReporting(page)
    await page.goto("/en/dashboard/reports")

    await expect(page.getByText("Internal archive live", { exact: true })).toBeVisible()
    await expect(page.getByText(/Bulk export · Coming soon/)).toBeVisible()
    await page.getByLabel("Report type").selectOption("unit_inventory")
    await page.getByRole("checkbox", { name: /New Level Premium/ }).check()
    await page.getByLabel("From").fill("2026-07-01")
    await page.getByLabel("To (exclusive)").fill("2026-07-15")
    await page.getByLabel("Source status").selectOption("occupied")
    await page.getByRole("button", { name: "Generate persistent report" }).click()

    await expect.poll(() => requests.filter((request) => request.method === "POST").length).toBe(1)
    const create = requests.find((request) => request.method === "POST")
    expect(create?.headers["idempotency-key"]).toMatch(/^report-ui:create:/)
    expect(create?.body).toMatchObject({
      reportType: "unit_inventory",
      siteIds: [siteId],
      filters: {
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-15T00:00:00.000Z",
        status: "occupied",
      },
    })

    const download = page.getByRole("link", { name: /Download verified CSV/ })
    await expect(download).toHaveAttribute("href", `/api/site-management/reports/${artifactId}/download`)
    await expect(page.getByText(/SHA-256 and byte length are checked again/)).toBeVisible()

    await page.getByLabel("Review reason").fill("Source totals and occupancy values were independently reviewed.")
    await page.getByRole("button", { name: "Approve commentary" }).click()
    await expect.poll(() => requests.filter((request) => request.method === "PATCH").length).toBe(1)
    const review = requests.find((request) => request.method === "PATCH")
    expect(review?.headers["idempotency-key"]).toMatch(/^report-ui:review-approved:/)
    expect(review?.headers["if-match"]).toBe('"3"')
    expect(review?.body).toMatchObject({
      artifactId,
      decision: "approved",
      reason: "Source totals and occupancy values were independently reviewed.",
    })
  })

  test("live workspace stays within a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await setAccessRole(page, "manager")
    await mockReporting(page)
    await page.goto("/de/dashboard/reports")

    await expect(page.getByRole("heading", { level: 1, name: "Dauerhaftes Berichtsarchiv" })).toBeVisible()
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }))
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1)
  })

  test("page, component, and API contract have no seed/demo dependency", () => {
    const files = [
      "app/[locale]/dashboard/reports/page.tsx",
      "components/reports/reporting-workspace.tsx",
      "lib/reporting-copy.ts",
      "app/api/site-management/reports/route.ts",
      "lib/reporting-repository.ts",
    ].map((file) => readFileSync(resolve(process.cwd(), file), "utf8"))
    const source = files.join("\n")

    expect(source).not.toMatch(/site-management-data/)
    expect(source).not.toMatch(/local-demo-contract/)
    expect(files[0]).toContain("ReportingWorkspace")
    expect(files[1]).toContain('const reportingApi = "/api/site-management/reports"')
    expect(files[1]).toContain('"Idempotency-Key"')
    expect(files[1]).toContain('"If-Match"')
    expect(files[1]).toContain("30_000")
    expect(files[1]).toContain("/download")
    expect(files[2]).toContain("tr:")
    expect(files[2]).toContain("en:")
    expect(files[2]).toContain("de:")
    expect(files[2]).toContain("ru:")
  })
})
