import { chromium } from "@playwright/test"
import fs from "node:fs"

const baseUrl = process.env.UI_QA_BASE_URL ?? "http://127.0.0.1:3104"
const locale = process.env.UI_QA_LOCALE ?? "en"
const out =
  process.env.UI_QA_OUTPUT_DIR ??
  "../../quality/results/role-page-audit-2026-06-28"
const screenshotAll = process.env.UI_QA_SCREENSHOT_ALL === "1"
const viewport = {
  width: Number(process.env.UI_QA_VIEWPORT_WIDTH ?? 1440),
  height: Number(process.env.UI_QA_VIEWPORT_HEIGHT ?? 900),
}

const roles = ["admin", "manager", "accountant", "staff", "owner", "tenant"]

const routes = [
  { path: "/dashboard", resource: "dashboard" },
  { path: "/dashboard/listings", resource: "listings" },
  { path: "/dashboard/leads", resource: "leads" },
  { path: "/dashboard/tickets", resource: "tickets" },
  { path: "/dashboard/calendar", resource: "calendar" },
  { path: "/dashboard/compliance", resource: "eids_compliance" },
  { path: "/dashboard/finance", resource: "finance" },
  { path: "/dashboard/documents", resource: "documents" },
  { path: "/dashboard/reports", resource: "reports" },
  { path: "/dashboard/communications", resource: "communications" },
  { path: "/dashboard/users", resource: "users" },
  { path: "/dashboard/settings", resource: "settings" },
]

const roleAccess = {
  admin: routes.map((route) => route.resource),
  manager: routes.map((route) => route.resource),
  accountant: ["dashboard", "documents", "finance", "reports", "communications"],
  staff: ["dashboard", "tickets", "calendar", "documents", "communications"],
  owner: ["dashboard", "tickets", "calendar", "documents", "communications"],
  tenant: ["dashboard", "tickets", "calendar", "documents", "communications"],
}

fs.mkdirSync(out, { recursive: true })

function normalizePath(path) {
  return path.replace(/\/$/, "") || "/"
}

function expectedPath(routePath) {
  return normalizePath(`/${locale}${routePath}`)
}

function screenshotName(role, routePath) {
  return `${role}-${routePath.replaceAll("/", "-").replace(/^-/, "") || "root"}.png`
}

async function auditRoute(browser, role, route) {
  const pageErrors = []
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  })
  await context.addCookies([
    { url: baseUrl, name: "access_profile_role", value: role },
  ])
  const page = await context.newPage()
  page.on("pageerror", (error) => pageErrors.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(`console: ${message.text()}`)
  })

  const target = `${baseUrl}/${locale}${route.path}`
  const allowed = roleAccess[role].includes(route.resource)
  let loadError = null

  try {
    await page.goto(target, { waitUntil: "networkidle", timeout: 45000 })
    await page.waitForTimeout(1000)
  } catch (error) {
    loadError = String(error?.message ?? error)
  }

  const finalUrl = page.url()
  const finalPath = normalizePath(new URL(finalUrl).pathname)
  const mainVisible = await page
    .locator("main")
    .first()
    .isVisible()
    .catch(() => false)
  const h1 = await page.locator("h1").first().innerText().catch(() => "")
  const bodyText = await page.locator("body").innerText().catch(() => "")
  const overflow = await page
    .evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth))
    .catch(() => -1)
  const sidebarItems = await page
    .locator("aside nav a")
    .evaluateAll((items) => items.map((item) => item.textContent?.trim()).filter(Boolean))
    .catch(() => [])
  const visibleCards = await page
    .locator("main a, main button")
    .count()
    .catch(() => 0)
  const redirectedToDashboard = finalPath === expectedPath("/dashboard")
  const allowedPathOk = finalPath === expectedPath(route.path)
  const blockedPathOk = route.path === "/dashboard" || redirectedToDashboard
  const mojibake = /Ã|Ä|Å|â|Ð|Ñ/.test(bodyText)

  const issues = []
  if (loadError) issues.push(`load: ${loadError}`)
  if (pageErrors.length > 0) issues.push(...pageErrors)
  if (!mainVisible) issues.push("main not visible")
  if (overflow > 0) issues.push(`horizontal overflow ${overflow}px`)
  if (allowed && !allowedPathOk) issues.push(`allowed route redirected to ${finalPath}`)
  if (!allowed && !blockedPathOk) issues.push(`blocked route stayed on ${finalPath}`)
  if (allowed && !h1.trim()) issues.push("missing page h1")
  if (mojibake) issues.push("visible text encoding artifacts")

  const shouldScreenshot = screenshotAll || route.path === "/dashboard" || issues.length > 0
  let screenshot = null
  if (shouldScreenshot) {
    screenshot = `${out}/${screenshotName(role, route.path)}`
    await page.screenshot({ path: screenshot, fullPage: false }).catch(() => undefined)
  }

  await context.close()

  return {
    role,
    route: route.path,
    resource: route.resource,
    allowed,
    finalPath,
    h1,
    sidebarItems,
    visibleCards,
    overflow,
    issues,
    screenshot,
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const results = []
  for (const role of roles) {
    for (const route of routes) {
      results.push(await auditRoute(browser, role, route))
    }
  }
  await browser.close()

  const failures = results.filter((result) => result.issues.length > 0)
  const summary = {
    baseUrl,
    locale,
    viewport,
    checked: results.length,
    failures: failures.length,
    generatedAt: new Date().toISOString(),
    failuresByRole: roles.reduce((acc, role) => {
      acc[role] = failures.filter((item) => item.role === role).length
      return acc
    }, {}),
  }

  fs.writeFileSync(`${out}/role-page-audit.json`, JSON.stringify({ summary, results }, null, 2))
  console.log(JSON.stringify(summary, null, 2))
  if (failures.length > 0) {
    console.log(
      JSON.stringify(
        failures.map((failure) => ({
          role: failure.role,
          route: failure.route,
          finalPath: failure.finalPath,
          h1: failure.h1,
          issues: failure.issues,
          screenshot: failure.screenshot,
        })),
        null,
        2
      )
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
