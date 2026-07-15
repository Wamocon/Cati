import { chromium } from "@playwright/test"
import fs from "node:fs"

const baseUrl = process.env.UI_QA_BASE_URL ?? "http://127.0.0.1:3104"
const locale = process.env.UI_QA_LOCALE ?? "en"
const out =
  process.env.UI_QA_OUTPUT_DIR ??
  "../../quality/results/role-page-audit-2026-06-28"
const screenshotAll = process.env.UI_QA_SCREENSHOT_ALL === "1"

const viewportProfiles = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 393, height: 852 },
}
const viewportProfile = (
  process.env.UI_QA_VIEWPORT_PROFILE ??
  process.env.UI_QA_DEVICE ??
  "desktop"
).toLowerCase()
if (!(viewportProfile in viewportProfiles)) {
  throw new Error(
    `UI_QA_VIEWPORT_PROFILE must be desktop or mobile; received ${viewportProfile}`
  )
}
const defaultViewport = viewportProfiles[viewportProfile]
const viewport = {
  width: Number(process.env.UI_QA_VIEWPORT_WIDTH ?? defaultViewport.width),
  height: Number(process.env.UI_QA_VIEWPORT_HEIGHT ?? defaultViewport.height),
}

const roles = ["admin", "manager", "accountant", "staff", "owner", "tenant"]

const routes = [
  {
    path: "/dashboard",
    resource: "dashboard",
    terminalContent:
      /Last updated|Authorized records|Data source|Live update|Open requests|Active tasks|No authorized records/i,
    expectedContent:
      /Dashboard|ERP|Operasyon|Komuta|Workspace|Arbeitsbereich|[ÇC]al[ıi][sş]ma alan[ıi]|Y[oö]netim|рабоч|операц|управлен|панел/i,
  },
  {
    path: "/dashboard/listings",
    resource: "listings",
    terminalContent:
      /769|Authorized unit matrix|Data source|Selected unit|Block [A-G]|No authorized units/i,
    expectedContent: /Daire|Unit|Matrix|Records|Wohnung|Einheit|квартир/i,
  },
  {
    path: "/dashboard/leads",
    resource: "leads",
    terminalContent:
      /NO DEMO DATA|Real authentication|Pipeline board|No buyer records|Live buyer data/i,
    expectedContent:
      /Buyer pipeline|CRM|Lead|Sakin|Malik|Customer|K[aä]ufer|покупател|воронк/i,
  },
  {
    path: "/dashboard/tickets",
    resource: "tickets",
    terminalContent:
      /Request history|Service order|Field task|Emergency|No service requests|Last updated/i,
    expectedContent: /Ticket|Servis|Service|Task|SLA|Talep|Anfrage|заяв/i,
  },
  {
    path: "/dashboard/calendar",
    resource: "calendar",
    terminalContent:
      /Persistent booking service|Calendar information|No bookings|Handover|Calendar link|Unavailable/i,
    expectedContent:
      /Rezervasyon|Booking|Checkout|Calendar|Takvim|Reservierung|бронир/i,
  },
  {
    path: "/dashboard/compliance",
    resource: "eids_compliance",
    terminalContent:
      /Compliance cases|Buyer suitability|Deposit|No compliance cases|Last updated|Access decision/i,
    expectedContent: /Eri[sş]im|Compliance|Access|Uyum|Zugang|доступ/i,
  },
  {
    path: "/dashboard/finance",
    resource: "finance",
    terminalContent:
      /Open balance|Account statement|Payment history|No authorized statement|Ledger source|Manual payment/i,
    expectedContent: /Finans|Ledger|Payment|Aidat|Finance|Finanz|финанс/i,
  },
  {
    path: "/dashboard/documents",
    resource: "documents",
    terminalContent:
      /Secure upload|Document packet|File access|No documents|Review queue|Time-limited/i,
    expectedContent: /Belge|Document|Upload|Vault|Dokument|документ/i,
  },
  {
    path: "/dashboard/reports",
    resource: "reports",
    terminalContent:
      /NO DEMO DATA|Reporting unavailable|Report request|Real authentication|No reports|Cash flow/i,
    expectedContent: /Rapor|Report|Analytics|AI|Bericht|отч[её]т/i,
  },
  {
    path: "/dashboard/communications",
    resource: "communications",
    terminalContent:
      /Communication service unavailable|Conversation history|Delivery history|No conversations|Real authentication|Portal message/i,
    expectedContent:
      /[İI]leti[sş]im|Communication|Message|Notification|Kommunikation|сообщ/i,
  },
  {
    path: "/dashboard/offline",
    resource: "offline_sync",
    terminalContent:
      /Offline queue|Sync policy|No queued|Connection state|Replay|Unavailable/i,
    expectedContent:
      /[ÇC]evrimd[ıi][sş][ıi]|E[sş]itle|Offline|Sync|Queue|Senkron|Synchron|офлайн/i,
  },
  {
    path: "/dashboard/users",
    resource: "users",
    terminalContent:
      /Permission matrix|Role governance|Staff scope|Real administrator session|Authority changes|Organization boundary/i,
    expectedContent: /Kullan|User|Role|Personel|Benutzer|пользоват/i,
  },
  {
    path: "/dashboard/settings",
    resource: "settings",
    terminalContent:
      /Integration status|Provider|Security policy|Role coverage|Source verified|Client decision/i,
    expectedContent: /Ayar|Setting|Platform|Provider|Einstellung|настрой/i,
  },
]

const roleAccess = {
  admin: routes.map((route) => route.resource),
  manager: routes.map((route) => route.resource),
  accountant: [
    "dashboard",
    "tickets",
    "documents",
    "finance",
    "reports",
    "communications",
  ],
  staff: [
    "dashboard",
    "tickets",
    "calendar",
    "documents",
    "communications",
    "offline_sync",
  ],
  owner: [
    "dashboard",
    "tickets",
    "calendar",
    "finance",
    "documents",
    "communications",
    "offline_sync",
  ],
  tenant: [
    "dashboard",
    "tickets",
    "calendar",
    "documents",
    "communications",
    "offline_sync",
  ],
}

const focusedDashboardRoles = new Set([
  "accountant",
  "staff",
  "owner",
  "tenant",
])
const visibleTechnicalError =
  /Internal Server Error|Application error|Unexpected application error|ChunkLoadError|TypeError:\s*Failed to fetch|ReferenceError:|SyntaxError:|Traceback \(most recent call last\)|\bat .+\(.+\.(?:js|ts|tsx):\d+/i

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
  const serverErrors = []
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  })
  await context.addCookies([
    { url: baseUrl, name: "access_profile_role", value: role },
  ])
  const page = await context.newPage()
  page.on("pageerror", (error) =>
    pageErrors.push(`pageerror: ${error.message}`)
  )
  page.on("console", (message) => {
    if (message.type() === "error")
      pageErrors.push(`console: ${message.text()}`)
  })
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`HTTP ${response.status()} ${response.url()}`)
    }
  })

  const target = `${baseUrl}/${locale}${route.path}`
  const allowed = roleAccess[role].includes(route.resource)
  let loadError = null

  try {
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45000 })
    await page
      .waitForLoadState("networkidle", { timeout: 6000 })
      .catch(() => undefined)
    await page.waitForTimeout(750)
  } catch (error) {
    loadError = String(error?.message ?? error)
  }

  let roleDashboardReady = true
  if (
    allowed &&
    route.path === "/dashboard" &&
    focusedDashboardRoles.has(role)
  ) {
    roleDashboardReady = await page
      .getByTestId("role-dashboard-source")
      .waitFor({ state: "visible", timeout: 12000 })
      .then(() => true)
      .catch(() => false)
  }

  let terminalReady = true
  let busySettled = true
  if (allowed) {
    ;[terminalReady, busySettled] = await Promise.all([
      page
        .locator("main")
        .filter({ hasText: route.terminalContent })
        .first()
        .waitFor({ state: "visible", timeout: 12000 })
        .then(() => true)
        .catch(() => false),
      page
        .waitForFunction(
          () =>
            [
              ...document.querySelectorAll(
                'main[aria-busy="true"], main [aria-busy="true"]'
              ),
            ].every((element) => {
              const style = window.getComputedStyle(element)
              return (
                style.display === "none" ||
                style.visibility === "hidden" ||
                element.getClientRects().length === 0
              )
            }),
          undefined,
          { timeout: 12000 }
        )
        .then(() => true)
        .catch(() => false),
    ])
  }

  const finalUrl = page.url()
  const finalPath = normalizePath(new URL(finalUrl).pathname)
  const mainVisible = await page
    .locator("main")
    .first()
    .isVisible()
    .catch(() => false)
  const h1 = await page
    .locator("h1")
    .first()
    .innerText()
    .catch(() => "")
  const bodyText = await page
    .locator("body")
    .innerText()
    .catch(() => "")
  const overflow = await page
    .evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    )
    .catch(() => -1)
  const sidebarItems = await page
    .locator("aside nav a")
    .evaluateAll((items) =>
      items.map((item) => item.textContent?.trim()).filter(Boolean)
    )
    .catch(() => [])
  const sidebarPaths = await page
    .locator("aside nav a")
    .evaluateAll((items) =>
      items.flatMap((item) => {
        const href = item.getAttribute("href")
        if (!href) return []
        try {
          return [
            new URL(href, window.location.origin).pathname.replace(/\/$/, ""),
          ]
        } catch {
          return []
        }
      })
    )
    .catch(() => [])
  const visibleCards = await page
    .locator("main a, main button")
    .count()
    .catch(() => 0)
  const redirectedToDashboard = finalPath === expectedPath("/dashboard")
  const allowedPathOk = finalPath === expectedPath(route.path)
  const blockedPathOk = route.path === "/dashboard" || redirectedToDashboard
  const expectedRoutePath = expectedPath(route.path)
  const mojibake = /Ã.|Â.|â(?:€|™|œ|ž|¦)|Ð.|Ñ./.test(bodyText)

  const issues = []
  if (loadError) issues.push(`load: ${loadError}`)
  if (pageErrors.length > 0) issues.push(...pageErrors)
  if (serverErrors.length > 0) issues.push(...serverErrors)
  if (!mainVisible) issues.push("main not visible")
  if (overflow > 0) issues.push(`horizontal overflow ${overflow}px`)
  if (allowed && !allowedPathOk)
    issues.push(`allowed route redirected to ${finalPath}`)
  if (!allowed && !blockedPathOk)
    issues.push(`blocked route stayed on ${finalPath}`)
  if (allowed && !h1.trim()) issues.push("missing page h1")
  if (allowed && !route.expectedContent.test(bodyText)) {
    issues.push("missing expected business content")
  }
  if (allowed && !terminalReady) {
    issues.push(
      "route did not resolve to its loaded, empty, or unavailable business state"
    )
  }
  if (allowed && !busySettled) {
    issues.push("route remained visibly busy after its terminal-state deadline")
  }
  if (!roleDashboardReady) {
    issues.push(
      "authorized records loading did not resolve to a sourced dashboard"
    )
  }
  if (!allowed && sidebarPaths.includes(expectedRoutePath)) {
    issues.push("unauthorized route is visible in role navigation")
  }
  if (visibleTechnicalError.test(bodyText)) {
    issues.push("raw technical/server error is visible")
  }
  if (mojibake) issues.push("visible text encoding artifacts")

  const shouldScreenshot =
    screenshotAll || route.path === "/dashboard" || issues.length > 0
  let screenshot = null
  if (shouldScreenshot) {
    screenshot = `${out}/${screenshotName(role, route.path)}`
    await page
      .screenshot({ path: screenshot, fullPage: false })
      .catch(() => undefined)
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
    sidebarPaths,
    visibleCards,
    terminalReady,
    busySettled,
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
    viewportProfile,
    viewport,
    checked: results.length,
    failures: failures.length,
    generatedAt: new Date().toISOString(),
    failuresByRole: roles.reduce((acc, role) => {
      acc[role] = failures.filter((item) => item.role === role).length
      return acc
    }, {}),
  }

  fs.writeFileSync(
    `${out}/role-page-audit.json`,
    JSON.stringify({ summary, results }, null, 2)
  )
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
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
