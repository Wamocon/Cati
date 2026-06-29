import { chromium } from "@playwright/test"
import fs from "node:fs"

const baseUrl = process.env.UI_QA_BASE_URL ?? "http://127.0.0.1:3104"
const outDir =
  process.env.UI_QA_OUTPUT_DIR ??
  "../../quality/results/landing-product-revamp-2026-06-29"

fs.mkdirSync(outDir, { recursive: true })

const forbiddenText = [
  "Live ERP connection",
  "RLS and RBAC checked",
  "Finance and access actions audited",
  "ERP workflow layer",
  "Live data ready",
  "Signal view",
  "Role-aware",
  "Audit & RBAC",
  "ERP modules",
  "ERP workflow",
  "Integration-ready",
]

const scenarios = [
  {
    name: "home-top",
    path: "/en",
    viewport: { width: 1440, height: 940 },
  },
  {
    name: "isometric-flow",
    path: "/en#isometric-flow",
    selector: "#isometric-flow",
    viewport: { width: 1440, height: 940 },
  },
  {
    name: "new-level",
    path: "/en#new-level",
    selector: "#new-level",
    viewport: { width: 1440, height: 940 },
  },
  {
    name: "problem-map",
    path: "/en#about",
    selector: "[data-testid='problem-bento']",
    viewport: { width: 1440, height: 940 },
  },
  {
    name: "modules-flipbook",
    path: "/en#modules",
    selector: "#modules",
    viewport: { width: 1440, height: 940 },
  },
  {
    name: "compliance-map",
    path: "/en",
    selector: "[data-testid='compliance-features']",
    viewport: { width: 1440, height: 940 },
  },
  {
    name: "multi-flow",
    path: "/en#how-it-works",
    selector: "#how-it-works",
    viewport: { width: 1440, height: 940 },
  },
  {
    name: "home-mobile",
    path: "/en",
    viewport: { width: 390, height: 844 },
  },
  {
    name: "login",
    path: "/en/login",
    viewport: { width: 1440, height: 940 },
  },
]

async function runScenario(browser, scenario) {
  const errors = []
  const context = await browser.newContext({
    viewport: scenario.viewport,
    deviceScaleFactor: 1,
  })
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

  await page.waitForTimeout(900)

  const bodyText = await page.locator("body").innerText().catch(() => "")
  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  )
  const sectionVisible = scenario.selector
    ? await page.locator(scenario.selector).first().isVisible().catch(() => false)
    : true
  const isometricHeight = await page
    .locator("#isometric-flow")
    .evaluate((node) => node.getBoundingClientRect().height)
    .catch(() => 0)
  const screenshot = `${outDir}/${scenario.name}.png`
  await page.screenshot({ path: screenshot, fullPage: false })
  await context.close()

  const issues = []
  if (!sectionVisible) issues.push("target section not visible")
  if (overflow > 0) issues.push(`horizontal overflow ${overflow}px`)
  if (scenario.name === "isometric-flow" && isometricHeight > 1350) {
    issues.push(`isometric section still too tall: ${Math.round(isometricHeight)}px`)
  }
  for (const text of forbiddenText) {
    if (bodyText.includes(text)) issues.push(`stale visible copy: ${text}`)
  }
  issues.push(...errors)

  return {
    name: scenario.name,
    path: scenario.path,
    viewport: scenario.viewport,
    overflow,
    sectionVisible,
    isometricHeight,
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
    `${outDir}/landing-product-qa.json`,
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
