import { createRequire } from "node:module"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webRequire = createRequire(path.join(rootDir, "apps", "web", "package.json"))
const { chromium } = webRequire("@playwright/test")

const baseUrl = process.env.UI_AUDIT_BASE_URL ?? "http://127.0.0.1:3104"
const outDir =
  process.env.UI_AUDIT_OUTPUT_DIR ??
  path.join(rootDir, "quality", "results", "manual-responsive-audit")

function parseRouteList(value, fallback) {
  if (value === undefined) return fallback
  if (/^(none|false|0|-)$/.test(value.trim().toLowerCase())) return []
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseViewportList(value, fallback) {
  if (!value) return fallback
  const selected = new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  )
  return fallback.filter((viewport) => selected.has(viewport.name))
}

const defaultRoutes = [
  "/tr",
  "/tr/login",
  "/tr/signup",
  "/tr/platform",
  "/tr/about",
  "/tr/reviews",
  "/tr/privacy",
  "/tr/terms",
]

const defaultDashboardRoutes = [
  "/tr/dashboard",
  "/tr/dashboard/listings",
  "/tr/dashboard/leads",
  "/tr/dashboard/tickets",
  "/tr/dashboard/calendar",
  "/tr/dashboard/compliance",
  "/tr/dashboard/finance",
  "/tr/dashboard/documents",
  "/tr/dashboard/reports",
  "/tr/dashboard/communications",
  "/tr/dashboard/offline",
  "/tr/dashboard/users",
  "/tr/dashboard/settings",
]

const defaultViewports = [
  { name: "mobile360", width: 360, height: 740 },
  { name: "mobile390", width: 390, height: 844 },
  { name: "tablet768", width: 768, height: 1024 },
  { name: "desktop1365", width: 1365, height: 900 },
]

const routes = parseRouteList(process.env.UI_AUDIT_PUBLIC_ROUTES, defaultRoutes)
const dashboardRoutes = parseRouteList(
  process.env.UI_AUDIT_DASHBOARD_ROUTES,
  defaultDashboardRoutes
)
const viewports = parseViewportList(process.env.UI_AUDIT_VIEWPORTS, defaultViewports)

function slug(route) {
  return route.replace(/^\/+/, "").replace(/\/+/g, "-") || "home"
}

function formatIssue(result) {
  const parts = []
  if (result.errors.length) parts.push(result.errors.join("; "))
  if (result.metrics.scrollOverflow > 2) {
    parts.push(`horizontal overflow ${result.metrics.scrollOverflow}px`)
  }
  if (result.metrics.offViewport.length) {
    parts.push(`${result.metrics.offViewport.length} visible elements outside viewport`)
  }
  if (result.metrics.heroCollision) parts.push(result.metrics.heroCollision)
  return parts.join(" | ")
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const html = document.documentElement
    const visible = (element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0.05 &&
        rect.width > 1 &&
        rect.height > 1
      )
    }

    const interesting = Array.from(
      document.querySelectorAll(
        "main h1, main h2, main h3, main p, main a, main button, main input, main select, main textarea, main [role=button]"
      )
    )
      .filter(visible)
      .slice(0, 220)
      .map((element, index) => {
        const rect = element.getBoundingClientRect()
        return {
          index,
          tag: element.tagName.toLowerCase(),
          text: (
            element.innerText ||
            element.getAttribute("aria-label") ||
            element.getAttribute("placeholder") ||
            ""
          )
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 90),
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }
      })

    const offViewport = interesting.filter(
      (item) => item.left < -2 || item.right > window.innerWidth + 2
    )

    const h1 = document.querySelector("main h1")
    const heroSection = h1?.closest("section")
    let heroCollision = null

    if (h1 && heroSection) {
      const h1Rect = h1.getBoundingClientRect()
      const below = Array.from(
        heroSection.querySelectorAll("p, a, button, [role=button]")
      )
        .filter(visible)
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            tag: element.tagName.toLowerCase(),
            text: (
              element.innerText ||
              element.getAttribute("aria-label") ||
              ""
            )
              .trim()
              .replace(/\s+/g, " ")
              .slice(0, 90),
            top: rect.top,
            bottom: rect.bottom,
          }
        })
        .filter((item) => item.top >= h1Rect.top - 2)
        .sort((a, b) => a.top - b.top)

      const next = below.find((item) => item.top > h1Rect.top + 4)
      if (next && next.top < h1Rect.bottom + 10) {
        heroCollision = `hero h1 bottom ${Math.round(
          h1Rect.bottom
        )} collides with ${next.tag} at ${Math.round(next.top)} (${next.text})`
      }
    }

    return {
      scrollOverflow: Math.max(0, html.scrollWidth - window.innerWidth),
      offViewport,
      heroCollision,
    }
  })
}

fs.mkdirSync(outDir, { recursive: true })
const tempDir = path.join(rootDir, ".tmp", "playwright")
fs.mkdirSync(tempDir, { recursive: true })
process.env.TEMP = tempDir
process.env.TMP = tempDir

const browser = await chromium.launch({ headless: true })
const results = []

for (const viewport of viewports) {
  for (const route of routes) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    })
    const errors = []
    const failedResponses = []
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`)
    })
    page.on("response", (response) => {
      if (response.status() >= 400) {
        failedResponses.push(`${response.status()} ${response.url()}`)
      }
    })

    await page.goto(new URL(route, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    })
    await page.waitForTimeout(1200)
    const screenshot = path.join(outDir, `${viewport.name}-${slug(route)}.png`)
    await page.screenshot({ path: screenshot, fullPage: false })
    results.push({
      route,
      viewport: viewport.name,
      errors: [...errors, ...failedResponses],
      metrics: await inspectPage(page),
      screenshot,
    })
    await page.close()
  }
}

const dashboardContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
})
await dashboardContext.addCookies([
  { name: "access_profile_role", value: "manager", url: baseUrl },
])

for (const route of dashboardRoutes) {
  const page = await dashboardContext.newPage()
  const errors = []
  const failedResponses = []
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`)
  })
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`)
    }
  })
  await page.goto(new URL(route, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  })
  await page.waitForTimeout(1200)
  const screenshot = path.join(outDir, `dashboard-mobile-${slug(route)}.png`)
  await page.screenshot({ path: screenshot, fullPage: false })
  results.push({
    route,
    viewport: "dashboard-mobile390",
    errors: [...errors, ...failedResponses],
    metrics: await inspectPage(page),
    screenshot,
  })
  await page.close()
}

await dashboardContext.close()
await browser.close()

const failures = results
  .map((result) => ({ ...result, issue: formatIssue(result) }))
  .filter((result) => result.issue)

const payload = {
  ok: failures.length === 0,
  baseUrl,
  screenshots: outDir,
  checked: results.length,
  failures: failures.map((result) => ({
    route: result.route,
    viewport: result.viewport,
    issue: result.issue,
    screenshot: result.screenshot,
    offViewport: result.metrics.offViewport.slice(0, 5),
  })),
}

fs.writeFileSync(
  path.join(outDir, "manual-responsive-audit.json"),
  JSON.stringify({ ...payload, results }, null, 2)
)
console.log(JSON.stringify(payload, null, 2))
if (failures.length) process.exit(1)
