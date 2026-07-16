import { expect, test, type Page } from "@playwright/test"
import { collectConsoleIssues, screenshot } from "./helpers"
import { resetQaState } from "./support/flows"

test.beforeEach(async ({ page }) => {
  await resetQaState(page)
})

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
    const viewportHeight = window.innerHeight
    const selector = [
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      "[role='button']",
      "[role='menu']",
      "[role='dialog']",
    ].join(",")

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
          top: Math.round(box.top),
          bottom: Math.round(box.bottom),
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
          box.height > 1 &&
          box.bottom > 0 &&
          box.top < viewportHeight &&
          box.right > 0 &&
          box.left < viewportWidth
      )
      .filter((box) => box.left < -2 || box.right > viewportWidth + 2)
  })

  expect(offenders).toEqual([])
}

async function assertMobileRoute(page: Page, path: string) {
  // `goto` already waits for `load`, i.e. the images/CSS that affect layout.
  //
  // We deliberately do NOT use waitForLoadState("networkidle") here: these specs
  // run against the Next dev server, which holds an HMR websocket open and
  // compiles routes on demand, so "network idle" is non-deterministic under
  // suite load and made this test flaky (it timed out rather than failing an
  // assertion). Waiting for webfonts plus one paint frame is deterministic and
  // is all the layout measurement below actually needs.
  await page.goto(path)
  await page.evaluate(async () => {
    await document.fonts?.ready
  })
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  )
  await assertNoHorizontalOverflow(page)
  await assertVisibleControlsStayInViewport(page)

  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  const viewportHeight = page.viewportSize()?.height ?? 740
  for (const y of [Math.floor(scrollHeight / 2), Math.max(0, scrollHeight - viewportHeight)]) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
    await page.waitForTimeout(120)
    await assertNoHorizontalOverflow(page)
    await assertVisibleControlsStayInViewport(page)
  }
}

test.describe("Responsive mobile checks", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("landing page is usable on small viewport", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr")
    await expect(
      page.getByRole("heading", {
        name: /Emlak operasyonunuzu tek ERP merkezinde yönetin/,
      })
    ).toBeVisible()

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)

    await screenshot(page, testInfo, "mobile-landing", { fullPage: true })
    expect(issues).toEqual([])
  })

  test("dashboard is usable on small viewport", async ({ page }, testInfo) => {
    await page.goto("/tr/dashboard")
    await expect(page.getByRole("heading", { name: /ERP Operasyon Merkezi/ })).toBeVisible()
    await expect(page.getByText("Toplam Daire").first()).toBeVisible()
    await screenshot(page, testInfo, "mobile-dashboard", { fullPage: true })
    expect(issues).toEqual([])
  })

  // Split from one 10-route test into two: each group gets its own timeout
  // budget, so a cold dev-server compile in one group cannot starve the other.
  test("public demo routes avoid mobile horizontal overflow and clipped controls", async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 390, height: 844 })

    for (const route of ["/tr", "/tr/pitch", "/tr/login", "/tr/signup"]) {
      await assertMobileRoute(page, route)
    }

    expect(issues).toEqual([])
  })

  test("dashboard demo routes avoid mobile horizontal overflow and clipped controls", async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 390, height: 844 })

    const accessResponse = await page.request.post("/api/access-profile", {
      data: { role: "admin" },
    })
    expect(accessResponse.status()).toBe(200)

    for (const route of [
      "/tr/dashboard",
      "/tr/dashboard/listings",
      "/tr/dashboard/tickets",
      "/tr/dashboard/finance",
      "/tr/dashboard/settings",
      "/tr/dashboard/users",
    ]) {
      await assertMobileRoute(page, route)
    }

    expect(issues).toEqual([])
  })
})
