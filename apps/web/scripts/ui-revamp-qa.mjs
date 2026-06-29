import { chromium } from "@playwright/test"
import fs from "node:fs"

const out = "../../quality/results/ui-revamp-2026-06-28"
const baseUrl = process.env.UI_QA_BASE_URL ?? "http://127.0.0.1:3104"

fs.mkdirSync(out, { recursive: true })

const errors = []

async function newPage(browser, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  })
  await context.addCookies([
    { url: baseUrl, name: "access_profile_role", value: "admin" },
  ])
  const page = await context.newPage()
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`)
  })
  return { context, page }
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  let session = await newPage(browser, 1440, 900)
  await session.page.goto(`${baseUrl}/en/dashboard`, {
    waitUntil: "networkidle",
    timeout: 45000,
  })
  await session.page.getByText("Doluluk ve tahsilat").first().scrollIntoViewIfNeeded({
    timeout: 30000,
  })
  await session.page.waitForTimeout(1500)
  await session.page.screenshot({
    path: `${out}/dashboard-chart-desktop.png`,
    fullPage: false,
  })
  const dashboardUrl = session.page.url()
  const chartOk = await session.page
    .getByText("Doluluk ve tahsilat")
    .first()
    .isVisible()
    .catch(() => false)
  const percentLabels = await session.page
    .locator("text=%82")
    .count()
    .catch(() => 0)
  await session.context.close()

  session = await newPage(browser, 1440, 1000)
  await session.page.goto(`${baseUrl}/en`, {
    waitUntil: "networkidle",
    timeout: 45000,
  })
  await session.page.locator("[data-testid=solution-grid]").scrollIntoViewIfNeeded({
    timeout: 30000,
  })
  await session.page.waitForTimeout(1800)
  await session.page.screenshot({
    path: `${out}/landing-flipbook-desktop.png`,
    fullPage: false,
  })
  const sectionVisible = await session.page
    .locator("[data-testid=solution-grid]")
    .isVisible()
  const oldOpenWorkflow = await session.page.getByText("Open workflow").count()
  const flipbookHeadline = await session.page
    .getByText("Scroll to open the product flow")
    .isVisible()
    .catch(() => false)
  const desktopOverflow = await session.page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  )
  await session.context.close()

  session = await newPage(browser, 390, 844)
  await session.page.goto(`${baseUrl}/en`, {
    waitUntil: "networkidle",
    timeout: 45000,
  })
  await session.page.locator("[data-testid=solution-grid]").scrollIntoViewIfNeeded({
    timeout: 30000,
  })
  await session.page.waitForTimeout(1200)
  await session.page.screenshot({
    path: `${out}/landing-flipbook-mobile.png`,
    fullPage: false,
  })
  const mobileVisible = await session.page
    .locator("[data-testid=solution-grid]")
    .isVisible()
  const mobileOverflow = await session.page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  )
  await session.context.close()

  await browser.close()

  console.log(
    JSON.stringify(
      {
        dashboardUrl,
        chartOk,
        percentLabels,
        sectionVisible,
        flipbookHeadline,
        oldOpenWorkflow,
        desktopOverflow,
        mobileVisible,
        mobileOverflow,
        errors,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
