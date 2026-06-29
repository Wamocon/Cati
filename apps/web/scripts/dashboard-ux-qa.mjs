import { chromium } from "@playwright/test"
import fs from "node:fs"

const baseUrl = process.env.UI_QA_BASE_URL ?? "http://127.0.0.1:3104"
const outDir =
  process.env.UI_QA_OUTPUT_DIR ??
  "../../quality/results/dashboard-ux-2026-06-29"

fs.mkdirSync(outDir, { recursive: true })

const scenarios = [
  {
    name: "dashboard-de-desktop",
    path: "/de/dashboard",
    viewport: { width: 1920, height: 1080 },
  },
  {
    name: "dashboard-en-mobile",
    path: "/en/dashboard",
    viewport: { width: 390, height: 844 },
  },
  {
    name: "listings-en-mobile",
    path: "/en/dashboard/listings",
    viewport: { width: 390, height: 844 },
  },
]

async function runScenario(browser, scenario) {
  const issues = []
  const context = await browser.newContext({
    viewport: scenario.viewport,
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    const text = message.text()
    const localRealtimeFallback =
      text.includes("/realtime/v1/websocket") &&
      text.includes("ERR_CONNECTION_REFUSED")
    if (message.type() === "error" && !localRealtimeFallback) {
      issues.push(`console: ${text}`)
    }
  })

  await page.goto(`${baseUrl}${scenario.path}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  })
  await page.waitForTimeout(900)

  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  )
  const topbarVisible = await page
    .locator("[data-testid='dashboard-topbar']")
    .first()
    .isVisible()
    .catch(() => false)
  const logoutVisible = await page
    .getByRole("button", { name: /sign out|abmelden|çıkış|выйти/i })
    .first()
    .isVisible()
    .catch(() => false)
  const moduleDisclosureClosed = await page
    .locator("[data-testid='module-status-disclosure']")
    .evaluate((node) => !node.open)
    .catch(() => true)
  const roleMapVisible = scenario.path.endsWith("/dashboard")
    ? await page.locator("#role-map").first().isVisible().catch(() => false)
    : true
  const roleMapHeight = scenario.path.endsWith("/dashboard")
    ? await page
        .locator("#role-map")
        .evaluate((node) => Math.round(node.getBoundingClientRect().height))
        .catch(() => 0)
    : 0

  await page.screenshot({
    path: `${outDir}/${scenario.name}.png`,
    fullPage: false,
  })
  await context.close()

  if (overflow > 0) issues.push(`horizontal overflow ${overflow}px`)
  if (!topbarVisible) issues.push("dashboard topbar not visible")
  if (!logoutVisible) issues.push("top sign-out button not visible")
  if (!moduleDisclosureClosed) issues.push("module status disclosure is open by default")
  if (!roleMapVisible) issues.push("role map not visible")
  if (scenario.name.includes("desktop") && roleMapHeight > 760) {
    issues.push(`role map still too tall: ${roleMapHeight}px`)
  }

  return {
    name: scenario.name,
    path: scenario.path,
    viewport: scenario.viewport,
    overflow,
    topbarVisible,
    logoutVisible,
    moduleDisclosureClosed,
    roleMapVisible,
    roleMapHeight,
    issues,
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const results = []
  for (const scenario of scenarios) {
    results.push(await runScenario(browser, scenario))
  }
  await browser.close()

  const failures = results.filter((result) => result.issues.length > 0)
  const summary = {
    baseUrl,
    checked: results.length,
    failures: failures.length,
    generatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(
    `${outDir}/dashboard-ux-qa.json`,
    JSON.stringify({ summary, results }, null, 2)
  )
  console.log(JSON.stringify(summary, null, 2))
  if (failures.length > 0) {
    console.log(JSON.stringify(failures, null, 2))
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
