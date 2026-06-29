import { chromium } from "@playwright/test"
import fs from "node:fs"

const baseUrl = process.env.UI_QA_BASE_URL ?? "http://127.0.0.1:3104"
const outDir =
  process.env.UI_QA_OUTPUT_DIR ??
  "../../quality/results/isometric-revamp-2026-06-29"

fs.mkdirSync(outDir, { recursive: true })

const scenarios = [
  {
    name: "landing-desktop-hero",
    path: "/en",
    viewport: { width: 1440, height: 940 },
  },
  {
    name: "landing-desktop-isometric-entry",
    path: "/en#isometric-flow",
    viewport: { width: 1440, height: 940 },
    selector: "#isometric-flow",
    forbiddenText: ["Isometric operating map", "As you scroll"],
  },
  {
    name: "landing-desktop-isometric",
    path: "/en#isometric-flow",
    viewport: { width: 1440, height: 940 },
    selector: "#isometric-flow",
    scrollY: 820,
    forbiddenText: ["Isometric operating map", "As you scroll"],
  },
  {
    name: "landing-mobile-isometric",
    path: "/en#isometric-flow",
    viewport: { width: 390, height: 844 },
    selector: "#isometric-flow",
    forbiddenText: ["Isometric operating map", "As you scroll"],
  },
  {
    name: "dashboard-admin-isometric",
    path: "/en/dashboard",
    viewport: { width: 1440, height: 940 },
    role: "admin",
    selector: "#role-map",
  },
  {
    name: "dashboard-tenant-isometric-mobile",
    path: "/en/dashboard",
    viewport: { width: 390, height: 844 },
    role: "tenant",
    selector: "#role-map",
  },
]

async function runScenario(browser, scenario) {
  const errors = []
  const context = await browser.newContext({
    viewport: scenario.viewport,
    deviceScaleFactor: 1,
  })

  if (scenario.role) {
    const response = await context.request.post(`${baseUrl}/api/access-profile`, {
      data: { role: scenario.role },
    })
    if (!response.ok()) {
      await context.addCookies([
        { url: baseUrl, name: "access_profile_role", value: scenario.role },
      ])
    }
  }

  const page = await context.newPage()
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`)
  })

  await page.goto(`${baseUrl}${scenario.path}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  })

  if (scenario.selector) {
    await page.locator(scenario.selector).scrollIntoViewIfNeeded({ timeout: 15000 })
  }

  if (scenario.scrollY) {
    await page.mouse.wheel(0, scenario.scrollY)
  }

  await page.waitForTimeout(900)

  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  )
  const sectionVisible = scenario.selector
    ? await page.locator(scenario.selector).first().isVisible().catch(() => false)
    : true
  const h1 = await page.locator("h1").first().innerText().catch(() => "")
  const routePathCount = await page
    .locator("path[stroke='#ff6b57']")
    .count()
    .catch(() => 0)
  const pageText = await page.locator("body").innerText().catch(() => "")
  const screenshot = `${outDir}/${scenario.name}.png`
  await page.screenshot({ path: screenshot, fullPage: false })
  await context.close()

  const issues = []
  if (!sectionVisible) issues.push("target section not visible")
  if (overflow > 0) issues.push(`horizontal overflow ${overflow}px`)
  if (routePathCount < 1) issues.push("coral route path not rendered")
  for (const forbidden of scenario.forbiddenText ?? []) {
    if (pageText.includes(forbidden)) issues.push(`stale visible copy: ${forbidden}`)
  }
  issues.push(...errors)

  return {
    name: scenario.name,
    path: scenario.path,
    role: scenario.role ?? null,
    viewport: scenario.viewport,
    h1,
    overflow,
    sectionVisible,
    routePathCount,
    screenshot,
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
    `${outDir}/isometric-qa.json`,
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
