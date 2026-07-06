import { createRequire } from "node:module"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webRequire = createRequire(path.join(rootDir, "apps", "web", "package.json"))
const { chromium } = webRequire("@playwright/test")

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3104",
    outDir: path.join(rootDir, "quality", "results", "dense-ux-smoke"),
  }

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base-url") args.baseUrl = argv[++i]
    else if (argv[i] === "--out-dir") args.outDir = path.resolve(argv[++i])
  }

  return args
}

const args = parseArgs(process.argv.slice(2))
fs.mkdirSync(args.outDir, { recursive: true })
const tempDir = path.join(rootDir, ".tmp", "playwright")
fs.mkdirSync(tempDir, { recursive: true })
process.env.TEMP = tempDir
process.env.TMP = tempDir

const browser = await chromium.launch({ headless: true })
const errors = []

async function checkPage(page, name, url, viewport = { width: 1440, height: 1000 }) {
  await page.setViewportSize(viewport)
  const targetUrl = new URL(url, args.baseUrl).toString()
  try {
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    })
    await page.locator("h1:visible, h2:visible").first().waitFor({ timeout: 20000 })
    await page.waitForTimeout(900)
  } catch (error) {
    errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
  }
  await page.screenshot({ path: path.join(args.outDir, `${name}.png`), fullPage: false }).catch(() => undefined)
  return page.evaluate(() => ({
    url: location.pathname + location.search + location.hash,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    h1: document.querySelector("h1")?.textContent?.trim() ?? "",
  }))
}

const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
await context.addCookies([
  {
    name: "access_profile_role",
    value: "admin",
    url: args.baseUrl,
  },
])

const page = await context.newPage()
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`)
})
page.on("response", (response) => {
  if (response.status() >= 500) errors.push(`response ${response.status()}: ${response.url()}`)
})

const results = []
results.push(await checkPage(page, "dashboard-live-simulation", "/tr/dashboard"))
const liveSimulation = page.locator('section[aria-label*="ERP"]').first()
if ((await liveSimulation.count()) < 1) {
  errors.push("dashboard missing live operations simulation")
}
if ((await liveSimulation.locator('a[href$="/dashboard/listings"], a[href$="/dashboard/tickets"], a[href$="/dashboard/finance"], a[href$="/dashboard/reports"]').count()) < 4) {
  errors.push("dashboard missing live simulation route links")
}
results.push(await checkPage(page, "dashboard-mobile", "/tr/dashboard", { width: 390, height: 844 }))

results.push(await checkPage(page, "reports-desktop", "/tr/dashboard/reports"))
const reportRegisterCount = await page.locator("#report-register").count()
if (reportRegisterCount !== 1) errors.push("reports missing report-register")
if ((await page.locator("#ai-automation-register").count()) !== 1) errors.push("reports missing ai-automation-register")
if (reportRegisterCount === 1) {
  await page.locator("#report-register").scrollIntoViewIfNeeded()
  const reportOptions = page.locator("#report-register summary").first()
  if ((await reportOptions.count()) < 1) {
    errors.push("reports missing table options summary")
  } else {
    await reportOptions.click()
    await page.waitForTimeout(250)
    if ((await page.locator("#report-register details[open]").count()) < 1) {
      errors.push("reports table options dropdown did not open")
    }
  }
}
await page.screenshot({ path: path.join(args.outDir, "reports-options-open.png"), fullPage: false })
await page.keyboard.press("Escape").catch(() => undefined)
results.push(await checkPage(page, "reports-mobile", "/tr/dashboard/reports", { width: 390, height: 844 }))

results.push(await checkPage(page, "calendar-desktop", "/tr/dashboard/calendar"))
if ((await page.locator("#reservations-table").count()) !== 1) errors.push("calendar missing reservations-table")
if ((await page.locator("#turnover-table").count()) !== 1) errors.push("calendar missing turnover-table")
if ((await page.locator('a[href$="/dashboard/calendar#reservations-table"]').count()) < 1) errors.push("calendar missing all bookings link")

results.push(await checkPage(page, "tickets-desktop", "/tr/dashboard/tickets"))
if ((await page.locator("#ticket-table").count()) !== 1) errors.push("tickets missing ticket-table")
if ((await page.locator("#workforce-table").count()) !== 1) errors.push("tickets missing workforce-table")
if ((await page.locator('a[href$="/dashboard/tickets#ticket-table"]').count()) < 1) errors.push("tickets missing all tickets link")

const routeSweep = [
  "/tr/dashboard/listings",
  "/tr/dashboard/finance",
  "/tr/dashboard/documents",
  "/tr/dashboard/communications",
  "/tr/dashboard/users",
  "/tr/dashboard/compliance",
  "/tr/dashboard/leads",
  "/tr/dashboard/settings",
  "/tr/dashboard/offline",
]

for (const route of routeSweep) {
  const name = route.replace(/^\/tr\/dashboard\/?/, "route-").replace(/[^\w-]+/g, "-") || "route-dashboard"
  results.push(await checkPage(page, name, route))
}

results.push(await checkPage(page, "login-mobile", "/tr/login?next=/dashboard/calendar", { width: 390, height: 844 }))
const visibleProviderButtons = await page.getByRole("button", { name: /Google|Yandex|magic/i }).evaluateAll((buttons) =>
  buttons.filter((button) => {
    const box = button.getBoundingClientRect()
    return box.width > 0 && box.height > 0
  }).length
)
if (visibleProviderButtons !== 0) errors.push("provider buttons should be collapsed on login")
await page.locator("details summary").first().click()
await page.waitForTimeout(250)
const googleVisibleAfterOpen = await page.getByRole("button", { name: /Google/i }).first().isVisible()
if (!googleVisibleAfterOpen) errors.push("provider disclosure did not reveal Google button")

results.push(await checkPage(page, "profiles-desktop", "/tr/login/profiles"))
if ((await page.locator("article").count()) < 6) errors.push("role profiles page should show all roles")

results.push(await checkPage(page, "signup-mobile", "/tr/signup", { width: 390, height: 844 }))
if ((await page.locator('a[href$="/login/profiles"]').count()) < 1) {
  errors.push("signup missing role profiles route")
}

await context.close()
await browser.close()

for (const result of results) {
  if (result.overflow > 2) errors.push(`${result.url}: horizontal overflow ${result.overflow}px`)
}

console.log(
  JSON.stringify(
    {
      ok: errors.length === 0,
      errors,
      results,
      screenshots: args.outDir,
    },
    null,
    2
  )
)

if (errors.length > 0) process.exit(1)
