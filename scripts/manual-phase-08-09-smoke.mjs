import { createRequire } from "node:module"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3104",
    outDir: path.join(rootDir, "quality", "results"),
    headed: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--base-url") args.baseUrl = argv[++i]
    else if (arg === "--out-dir") args.outDir = path.resolve(argv[++i])
    else if (arg === "--headed") args.headed = true
  }

  return args
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function apiUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl).toString()
}

function roleCookie(role) {
  return `access_profile_role=${role}`
}

function localizedPath(locale, pathname) {
  return `/${locale}${pathname}`
}

function isIgnorableConsoleIssue(text) {
  return (
    (text.includes("/_next/webpack-hmr") && text.includes("WebSocket connection")) ||
    text.includes("Download the React DevTools")
  )
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadPlaywright() {
  try {
    const mod = await import("playwright")
    return mod.chromium ? mod : mod.default
  } catch {
    const require = createRequire(import.meta.url)
    for (const packageName of ["playwright", "@playwright/test"]) {
      try {
        const resolved = require.resolve(packageName, {
          paths: [
            path.join(webDir, "node_modules"),
            path.join(rootDir, "node_modules"),
            path.join(rootDir, "node_modules", ".pnpm", "node_modules"),
          ],
        })
        const mod = await import(pathToFileURL(resolved).href)
        return mod.chromium ? mod : mod.default
      } catch {
        // Try the next package name.
      }
    }
  }
  throw new Error("Playwright is not available from the root or web app dependencies.")
}

async function waitForServer(baseUrl, timeoutMs = 60_000) {
  const started = Date.now()
  let lastError = ""

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(apiUrl(baseUrl, "/tr"), {
        cache: "no-store",
      })
      if (response.ok) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error.message
    }
    await wait(1000)
  }

  throw new Error(`Server did not become reachable at ${baseUrl}. Last error: ${lastError}`)
}

async function fetchJson(baseUrl, pathname, { role = "admin", method = "GET", body, expectedStatus = 200 } = {}) {
  const response = await fetch(apiUrl(baseUrl, pathname), {
    method,
    cache: "no-store",
    headers: {
      Cookie: roleCookie(role),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  assert(
    response.status === expectedStatus,
    `${method} ${pathname} as ${role} expected HTTP ${expectedStatus}, received ${response.status}: ${text}`
  )

  return { status: response.status, payload }
}

async function runApiChecks(baseUrl) {
  const checks = []

  async function run(name, pathname, options, validate) {
    const started = Date.now()
    const result = await fetchJson(baseUrl, pathname, options)
    if (validate) validate(result.payload)
    checks.push({
      name,
      pathname,
      role: options?.role ?? "admin",
      method: options?.method ?? "GET",
      status: result.status,
      durationMs: Date.now() - started,
      passed: true,
    })
    return result.payload
  }

  await run("phase-status-1-9", "/api/site-management/phase-status", { role: "admin" }, (payload) => {
    assert(Array.isArray(payload.phases) && payload.phases.length === 15, "phase-status must expose 15 phases")
    for (const phaseNo of [7, 8, 9]) {
      const phase = payload.phases.find((item) => item.phase === phaseNo)
      assert(phase?.status === "in_progress", `phase ${phaseNo} must expose remaining live/UAT gates`)
    }
  })

  await run("tickets-manager", "/api/site-management/tickets?limit=24", { role: "manager" }, (payload) => {
    assert(payload.contractVersion === "phase-8-9-service-operations.v1", "ticket contract mismatch")
    assert(["supabase", "local-seed"].includes(payload.source), `invalid ticket source ${payload.source}`)
    assert(payload.quality?.status !== "failed", "ticket quality failed")
    assert((payload.catalog ?? []).length >= 6, "service catalog must include at least 6 active services")
    assert((payload.orders ?? []).length > 0, "service orders must not be empty")
    assert((payload.workforceTasks ?? []).length > 0, "workforce tasks must not be empty")
    assert(payload.summary?.fieldTeams >= 2, "workforce must include multiple field teams")
    assert(
      payload.orders.every((order) => !(order.debtCheckStatus === "blocked" && order.taskCreated)),
      "blocked orders must not create dispatchable tasks"
    )
  })

  await run("tickets-staff", "/api/site-management/tickets?limit=24", { role: "staff" }, (payload) => {
    assert((payload.workforceTasks ?? []).every((task) => Array.isArray(task.checklist) && task.checklist.length > 0), "staff tasks must expose checklists")
  })
  await run("tickets-tenant", "/api/site-management/tickets?limit=24", { role: "tenant" })
  await run("tickets-accountant-denied", "/api/site-management/tickets?limit=8", {
    role: "accountant",
    expectedStatus: 403,
  })

  await run("service-order-action-manager", "/api/site-management/actions", {
    role: "manager",
    method: "POST",
    expectedStatus: 201,
    body: {
      actionType: "service_orders.create.prepare",
      entityTable: "service_orders",
      entityExternalId: "manual-smoke-catalog",
      title: "Manual smoke service order",
      metadata: {
        source: "manual-phase-08-09-smoke",
      },
    },
  })
  await run("workforce-action-staff", "/api/site-management/actions", {
    role: "staff",
    method: "POST",
    expectedStatus: 201,
    body: {
      actionType: "workforce_tasks.update.prepare",
      entityTable: "workforce_tasks",
      entityExternalId: "manual-smoke-task",
      title: "Manual smoke workforce task",
      metadata: {
        source: "manual-phase-08-09-smoke",
      },
    },
  })
  await run("service-action-accountant-denied", "/api/site-management/actions", {
    role: "accountant",
    method: "POST",
    expectedStatus: 403,
    body: {
      actionType: "service_orders.create.prepare",
      entityTable: "service_orders",
      entityExternalId: "manual-smoke-denied",
      title: "Manual smoke denied service order",
    },
  })

  return checks
}

async function openPage(page, baseUrl, pathname) {
  const response = await page.goto(apiUrl(baseUrl, pathname), {
    waitUntil: "networkidle",
    timeout: 45_000,
  })
  assert(response && response.status() < 500, `${pathname} returned HTTP ${response?.status()}`)
  await page.waitForLoadState("domcontentloaded")
  await page.locator("body").waitFor({ timeout: 15_000 })
}

async function assertVisibleText(page, text, label) {
  const locator = page.getByText(text, { exact: false }).first()
  await locator.waitFor({ state: "visible", timeout: 15_000 })
  return label
}

async function collectBrowserIssues(page) {
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyTextLength: document.body.innerText.length,
  }))

  assert(overflow.bodyTextLength > 80, "page body is unexpectedly sparse")
  assert(
    overflow.scrollWidth <= overflow.innerWidth + 2,
    `horizontal overflow detected: scrollWidth=${overflow.scrollWidth}, innerWidth=${overflow.innerWidth}`
  )

  return overflow
}

async function runBrowserChecks(baseUrl, reportDir, headed) {
  const playwright = await loadPlaywright()
  const browser = await playwright.chromium.launch({ headless: !headed })
  const checks = []

  async function createPage(role, viewport) {
    const context = await browser.newContext({ viewport })
    await context.addCookies([
      {
        name: "access_profile_role",
        value: role,
        url: baseUrl,
      },
    ])
    const page = await context.newPage()
    const issues = []
    page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`))
    page.on("console", (message) => {
      if (message.type() === "error" && !isIgnorableConsoleIssue(message.text())) {
        issues.push(`console: ${message.text()}`)
      }
    })
    page.on("response", (response) => {
      if (response.status() >= 500) {
        issues.push(`http ${response.status()}: ${response.url()}`)
      }
    })
    return { context, page, issues }
  }

  try {
    const desktopRoutes = [
      ["/dashboard", "dashboard overview"],
      ["/dashboard/listings", "listings"],
      ["/dashboard/users", "users"],
      ["/dashboard/finance", "finance"],
      ["/dashboard/tickets", "tickets"],
      ["/dashboard/communications", "communications"],
      ["/dashboard/documents", "documents"],
    ]

    for (const [route, label] of desktopRoutes) {
      const { context, page, issues } = await createPage("manager", { width: 1440, height: 900 })
      const started = Date.now()
      await openPage(page, baseUrl, localizedPath("tr", route))
      const overflow = await collectBrowserIssues(page)
      assert(issues.length === 0, `${label} has browser issues: ${issues.join("; ")}`)
      checks.push({
        name: `manager-${label}`,
        route,
        viewport: "1440x900",
        durationMs: Date.now() - started,
        overflow,
        passed: true,
      })
      await context.close()
    }

    const { context: ticketContext, page: ticketPage, issues: ticketIssues } = await createPage("manager", {
      width: 1440,
      height: 900,
    })
    const ticketStarted = Date.now()
    await openPage(ticketPage, baseUrl, localizedPath("tr", "/dashboard/tickets"))
    await assertVisibleText(ticketPage, "Servis katalogu ve siparis kapisi", "catalog")
    await assertVisibleText(ticketPage, "Siparis kontrolu", "orders")
    await assertVisibleText(ticketPage, "Saha gorevleri", "tasks")
    await ticketPage.screenshot({
      path: path.join(reportDir, "tickets-desktop-1440x900.png"),
      fullPage: true,
    })

    const prepareButton = ticketPage.locator("button", { hasText: "Hazirla" }).first()
    assert(await prepareButton.count(), "no service order prepare button found")
    await prepareButton.click()
    await ticketPage.waitForFunction(
      () =>
        [...document.querySelectorAll("button")].some(
          (button) =>
            button.getAttribute("data-state") === "success" &&
            (button.getAttribute("title") ?? "").includes("Siparis hazirligi")
        ),
      null,
      { timeout: 10_000 }
    )

    const actionButton = ticketPage.locator("button", { hasText: "Aksiyon" }).first()
    assert(await actionButton.count(), "no workforce action button found")
    await actionButton.click()
    await ticketPage.waitForFunction(
      () =>
        [...document.querySelectorAll("button")].some(
          (button) =>
            button.getAttribute("data-state") === "success" &&
            (button.getAttribute("title") ?? "").includes("Gorev aksiyonu")
        ),
      null,
      { timeout: 10_000 }
    )

    const ticketOverflow = await collectBrowserIssues(ticketPage)
    assert(ticketIssues.length === 0, `tickets action flow has browser issues: ${ticketIssues.join("; ")}`)
    checks.push({
      name: "tickets-phase-8-9-actions-desktop",
      route: "/dashboard/tickets",
      viewport: "1440x900",
      durationMs: Date.now() - ticketStarted,
      overflow: ticketOverflow,
      passed: true,
    })
    await ticketContext.close()

    const { context: mobileContext, page: mobilePage, issues: mobileIssues } = await createPage("manager", {
      width: 390,
      height: 844,
    })
    const mobileStarted = Date.now()
    await openPage(mobilePage, baseUrl, localizedPath("tr", "/dashboard/tickets"))
    await assertVisibleText(mobilePage, "Servis katalogu ve siparis kapisi", "mobile catalog")
    await assertVisibleText(mobilePage, "Saha gorevleri", "mobile tasks")
    await mobilePage.screenshot({
      path: path.join(reportDir, "tickets-mobile-390x844.png"),
      fullPage: true,
    })
    const mobileOverflow = await collectBrowserIssues(mobilePage)
    assert(mobileIssues.length === 0, `mobile tickets has browser issues: ${mobileIssues.join("; ")}`)
    checks.push({
      name: "tickets-phase-8-9-mobile",
      route: "/dashboard/tickets",
      viewport: "390x844",
      durationMs: Date.now() - mobileStarted,
      overflow: mobileOverflow,
      passed: true,
    })
    await mobileContext.close()
  } finally {
    await browser.close()
  }

  return checks
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const reportDir = path.join(args.outDir, `manual-phase-08-09-smoke-${timestamp}`)

  await fs.mkdir(reportDir, { recursive: true })
  await waitForServer(args.baseUrl)

  const apiChecks = await runApiChecks(args.baseUrl)
  const browserChecks = await runBrowserChecks(args.baseUrl, reportDir, args.headed)
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    status: "passed",
    apiChecks,
    browserChecks,
    screenshots: [
      path.join(reportDir, "tickets-desktop-1440x900.png"),
      path.join(reportDir, "tickets-mobile-390x844.png"),
    ],
  }

  const reportPath = path.join(reportDir, "manual-phase-08-09-smoke-report.json")
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")

  console.log(`Manual Phase 8/9 smoke passed at ${report.generatedAt}`)
  console.log(`API checks: ${apiChecks.length}`)
  console.log(`Browser checks: ${browserChecks.length}`)
  console.log(`Report: ${reportPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
