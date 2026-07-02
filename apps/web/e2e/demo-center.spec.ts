import { expect, test, type Page } from "@playwright/test"
import { collectConsoleIssues, screenshot } from "./helpers"

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const html = document.documentElement
    return Math.max(document.body.scrollWidth, html.scrollWidth) - html.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(2)
}

async function assertVisibleControlsStayInViewport(page: Page) {
  const offenders = await page.evaluate(() => {
    const viewportWidth = window.innerWidth
    const selector = ["a[href]", "button", "input", "select", "textarea", "[role='button']"].join(",")

    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .map((element) => {
        const style = window.getComputedStyle(element)
        const box = element.getBoundingClientRect()
        const label =
          element.getAttribute("aria-label") ||
          element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
          element.tagName.toLowerCase()

        return {
          label,
          left: Math.round(box.left),
          right: Math.round(box.right),
          width: Math.round(box.width),
          height: Math.round(box.height),
          display: style.display,
          visibility: style.visibility,
          opacity: Number.parseFloat(style.opacity),
        }
      })
      .filter(
        (box) =>
          box.display !== "none" &&
          box.visibility !== "hidden" &&
          box.opacity > 0.05 &&
          box.width > 1 &&
          box.height > 1
      )
      .filter((box) => box.left < -2 || box.right > viewportWidth + 2)
  })

  expect(offenders).toEqual([])
}

test.describe("Demo center", () => {
  let issues: string[]
  const expectedHeading = {
    tr: /Müşteriye 15 dakikada/,
    en: /Show a clear, credible/,
    de: /Zeigen Sie in 15 Minuten/,
    ru: /Покажите понятную/,
  } as const

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  for (const locale of ["tr", "en", "de", "ru"] as const) {
    test(`renders localized client demo center in ${locale}`, async ({ page }, testInfo) => {
      await page.goto(`/${locale}/pitch`)
      await page.waitForLoadState("networkidle")

      await expect(page.getByTestId("demo-center-page")).toBeVisible()
      await expect(page.getByRole("heading", { name: expectedHeading[locale] })).toBeVisible()
      await expect(page.getByTestId("demo-preview")).toBeVisible()
      await expect(page.getByTestId("demo-offer-price")).toContainText("€5")
      await expect(page.getByTestId("demo-role-link")).toHaveCount(6)
      await expect(page.getByTestId("demo-chapter-card")).toHaveCount(8)
      await expect(page.getByTestId("demo-chapters").getByRole("link")).toHaveCount(8)
      await assertNoHorizontalOverflow(page)

      if (locale === "en") {
        await screenshot(page, testInfo, "demo-center-desktop", { fullPage: true })
      }

      expect(issues).toEqual([])
    })
  }

  test("mobile demo center keeps actions and chapter cards inside the viewport", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en/pitch")
    await page.waitForLoadState("networkidle")

    await expect(page.getByTestId("demo-center-page")).toBeVisible()
    await assertNoHorizontalOverflow(page)
    await assertVisibleControlsStayInViewport(page)

    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    const viewportHeight = page.viewportSize()?.height ?? 844
    for (const y of [Math.floor(scrollHeight / 2), Math.max(0, scrollHeight - viewportHeight)]) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
      await page.waitForTimeout(150)
      await assertNoHorizontalOverflow(page)
      await assertVisibleControlsStayInViewport(page)
    }

    await screenshot(page, testInfo, "demo-center-mobile", { fullPage: true })
    expect(issues).toEqual([])
  })
})
