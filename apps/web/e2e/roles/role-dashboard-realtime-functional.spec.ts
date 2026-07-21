import { expect, test } from "@playwright/test"
import { openDashboardAs } from "../support/flows"

test.describe("role-focused live dashboard", () => {
  for (const role of ["accountant", "staff", "owner", "tenant"] as const) {
    test(`${role} sees a fresh, role-scoped workspace`, async ({ page }) => {
      await openDashboardAs(page, role)

      const dashboard = page.getByTestId("role-dashboard-live")
      await expect(dashboard).toBeVisible()
      const sourcePill = page.getByTestId("role-dashboard-source")
      await expect(sourcePill).toBeVisible({ timeout: 20_000 })
      // The backend/source name must never leak to end users (was "…QA data").
      await expect(sourcePill).not.toContainText("QA")
      await expect(sourcePill).not.toContainText("Supabase")
      await expect(
        page.getByTestId("role-dashboard-freshness")
      ).not.toContainText("-")
      await expect(dashboard.locator("a")).not.toHaveCount(0)

      if (role === "tenant") {
        await expect(dashboard).toContainText("A-018")
        await expect(dashboard).toContainText("A-023")
        await expect(dashboard).not.toContainText("D-023")
        await expect(dashboard).not.toContainText("769")
      }

      if (role === "owner") {
        await expect(dashboard).toContainText("A-001")
        await expect(dashboard).toContainText("D-023")
        await expect(dashboard).not.toContainText("A-018")
        await expect(dashboard).not.toContainText("A-023")
      }
    })
  }

  test("manager sees the exact 769-unit A-G matrix with drilldown and freshness", async ({
    page,
  }) => {
    await openDashboardAs(page, "manager")

    const expectedBlocks = ["A", "B", "C", "D", "E", "F", "G"]
    const blockCards = page.getByRole("link", { name: /^Blok [A-G]$/ })

    await expect(blockCards).toHaveCount(7)
    for (const block of expectedBlocks) {
      await expect(
        page.getByRole("link", { name: `Blok ${block}`, exact: true })
      ).toBeVisible()
    }

    await page.getByRole("link", { name: "Blok A", exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/listings$/)

    const matrix = page.getByTestId("unit-live-matrix")
    const source = page.getByTestId("unit-matrix-source")
    const freshness = page.getByTestId("unit-matrix-freshness")

    await expect(matrix).toBeVisible()
    await expect(source).toContainText("QA")
    await expect(freshness).toHaveText(/^Son güncelleme:\s*(?!-\s*$).+/)
    await expect(page.getByTestId("unit-matrix-realtime")).toBeVisible()
    await expect(matrix.getByText(/^769 kayıt$/)).toBeVisible()

    const blockSelect = page.getByRole("combobox", {
      name: "Blok",
      exact: true,
    })
    const namedBlockOptions = blockSelect.locator('option:not([value="all"])')

    await expect(namedBlockOptions).toHaveCount(7)
    await expect(namedBlockOptions).toHaveText(
      expectedBlocks.map((block) => `Blok ${block}`)
    )

    await page
      .getByPlaceholder("Daire, malik, sakin veya blok ara")
      .fill("A-001")
    await expect(
      matrix.getByRole("button", { name: /A-001/ }).first()
    ).toBeVisible()
    await page.getByPlaceholder("Daire, malik, sakin veya blok ara").clear()

    await blockSelect.selectOption("G")
    await expect(blockSelect).toHaveValue("G")
    await expect(matrix.getByText(/^Blok G$/).first()).toBeVisible()
    await expect(matrix.getByText(/^Blok [A-F]$/)).toHaveCount(0)

    const selectedUnitButton = matrix.getByRole("button", {
      name: /^G-002 Daire detay/,
    })
    await expect(selectedUnitButton).toBeVisible()
    await selectedUnitButton.click()
    await expect(selectedUnitButton).toHaveAttribute("aria-pressed", "true")
    await expect(
      matrix.getByText("Seçili daire", { exact: true }).locator("..")
    ).toContainText("G-002")

    await expect(
      page.locator('select option[value="maintenance"]')
    ).toHaveCount(1)
    await expect(
      page.getByRole("button", { name: "Veri kontrolü" })
    ).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Değişiklik iste" })
    ).toHaveCount(0)
  })
})
