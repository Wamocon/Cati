import { chromium } from "@playwright/test"
import fs from "node:fs"

const baseUrl = process.env.UI_QA_BASE_URL ?? "http://127.0.0.1:3104"
const outDir =
  process.env.UI_QA_OUTPUT_DIR ?? "../../quality/results/app-wide-ux-2026-06-29"

fs.mkdirSync(outDir, { recursive: true })

const dashboardRoutes = [
  "/dashboard",
  "/dashboard/listings",
  "/dashboard/leads",
  "/dashboard/tickets",
  "/dashboard/calendar",
  "/dashboard/compliance",
  "/dashboard/finance",
  "/dashboard/documents",
  "/dashboard/reports",
  "/dashboard/communications",
  "/dashboard/users",
  "/dashboard/settings",
]

const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/platform",
  "/about",
  "/reviews",
  "/privacy",
  "/terms",
]

const viewports = [
  { name: "desktop", width: 1440, height: 940 },
  { name: "mobile", width: 390, height: 844 },
]
const scope = process.env.UI_QA_SCOPE ?? "all"
const filter = process.env.UI_QA_FILTER ?? ""

const forbiddenVisibleText = [
  "Demo User",
  "DEMO FALLBACK",
  "Live ERP connection",
  "RLS and RBAC checked",
  "ERP workflow layer",
  "Integration-ready",
]

const englishDashboardForbiddenText = [
  "Proje &",
  "Daire Matrisi",
  "Blok özeti",
  "Veriyi yenile",
  "Veri kontrolü",
  "Değişiklik iste",
  "Satışta",
  "Satıldı",
  "Borçlu",
  "Malik",
  "Sakin",
  "Operasyon Kullanıcısı",
  "Kullanıcılar",
  "Genel Bakış",
  "Mehrsprachiger",
  "Eigentümer",
]

const publicScenarios = publicRoutes.flatMap((path) =>
  viewports.map((viewport) => ({
    name: `public-${slug(path)}-${viewport.name}`,
    path: `/en${path === "/" ? "" : path}`,
    area: "public",
    viewport,
  }))
)
const dashboardScenarios = dashboardRoutes.flatMap((path) =>
  viewports.map((viewport) => ({
    name: `dashboard-${slug(path)}-${viewport.name}`,
    path: `/en${path}`,
    area: "dashboard",
    viewport,
  }))
)

const scenarios = [
  ...publicScenarios,
  ...dashboardScenarios,
].filter(
  (scenario) =>
    (scope === "all" || scenario.area === scope) &&
    (!filter || scenario.name.includes(filter) || scenario.path.includes(filter))
)

function slug(path) {
  const cleaned = path.replace(/^\/+/, "").replace(/\/+/g, "-")
  return cleaned || "home"
}

function isIgnoredConsoleError(text) {
  return (
    text.includes("/realtime/v1/websocket") &&
    text.includes("ERR_CONNECTION_REFUSED")
  )
}

async function runScenario(browser, scenario) {
  const issues = []
  const context = await browser.newContext({
    viewport: {
      width: scenario.viewport.width,
      height: scenario.viewport.height,
    },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()

  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    const text = message.text()
    if (message.type() === "error" && !isIgnoredConsoleError(text)) {
      issues.push(`console: ${text}`)
    }
  })

  const response = await page.goto(`${baseUrl}${scenario.path}`, {
    waitUntil: "domcontentloaded",
    timeout: 25000,
  })
  await page.locator("body").waitFor({ state: "visible", timeout: 15000 })
  await page.waitForTimeout(650)

  const finalUrl = page.url()
  const status = response?.status() ?? 0
  const bodyText = await page.locator("body").innerText().catch(() => "")
  const title = await page.title().catch(() => "")
  const h1 = await page.locator("h1").first().innerText().catch(() => "")
  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  )
  const mainVisible = await page.locator("main, [id='main']").first().isVisible().catch(() => false)

  let topbarVisible = true
  let logoutVisible = true
  let moduleDisclosureClosed = true
  let roleMapHeight = 0

  if (scenario.area === "dashboard") {
    topbarVisible = await page
      .locator("[data-testid='dashboard-topbar']")
      .first()
      .isVisible()
      .catch(() => false)
    logoutVisible = await page
      .getByRole("button", { name: /sign out|abmelden|çıkış|выйти/i })
      .first()
      .isVisible()
      .catch(() => false)
    moduleDisclosureClosed = await page
      .locator("[data-testid='module-status-disclosure']")
      .evaluate((node) => !node.open)
      .catch(() => true)
    roleMapHeight = await page
      .locator("#role-map")
      .evaluate((node) => Math.round(node.getBoundingClientRect().height))
      .catch(() => 0)
  }

  const screenshot = `${outDir}/${scenario.name}.png`
  await page.screenshot({ path: screenshot, fullPage: false })
  await context.close()

  if (status >= 400) issues.push(`http status ${status}`)
  if (!mainVisible) issues.push("main content not visible")
  if (!h1.trim() && scenario.area === "dashboard") issues.push("missing primary heading")
  if (finalUrl.includes("/login") && scenario.area === "dashboard") {
    issues.push("dashboard route redirected to login")
  }
  if (overflow > 0) issues.push(`horizontal overflow ${overflow}px`)
  if (!topbarVisible) issues.push("dashboard topbar missing")
  if (!logoutVisible) issues.push("top sign-out missing")
  if (!moduleDisclosureClosed) issues.push("module disclosure open by default")
  if (
    scenario.path.endsWith("/dashboard") &&
    scenario.viewport.name === "desktop" &&
    roleMapHeight > 780
  ) {
    issues.push(`role map too tall: ${roleMapHeight}px`)
  }

  for (const text of forbiddenVisibleText) {
    if (bodyText.includes(text)) issues.push(`stale visible copy: ${text}`)
  }

  if (scenario.path.startsWith("/en/dashboard")) {
    for (const text of englishDashboardForbiddenText) {
      if (bodyText.includes(text)) {
        issues.push(`non-English dashboard copy: ${text}`)
      }
    }
  }

  return {
    name: scenario.name,
    path: scenario.path,
    area: scenario.area,
    viewport: scenario.viewport,
    status,
    title,
    h1,
    finalUrl,
    overflow,
    topbarVisible,
    logoutVisible,
    moduleDisclosureClosed,
    roleMapHeight,
    screenshot,
    issues,
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const results = []
  for (const [index, scenario] of scenarios.entries()) {
    console.log(`[${index + 1}/${scenarios.length}] ${scenario.name} ${scenario.path}`)
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
    `${outDir}/app-wide-ux-qa.json`,
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
