import { createRequire } from "node:module"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")

const locales = ["tr", "en", "de", "ru"]
const roles = ["admin", "manager", "accountant", "staff", "owner", "tenant"]

const publicRoutes = [
  "/",
  "/platform",
  "/about",
  "/reviews",
  "/privacy",
  "/terms",
  "/login",
]

const dashboardRoutes = [
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
  admin: new Set(dashboardRoutes.map((route) => route.resource)),
  manager: new Set(dashboardRoutes.map((route) => route.resource)),
  accountant: new Set(["dashboard", "documents", "finance", "reports", "communications"]),
  staff: new Set(["dashboard", "tickets", "calendar", "documents", "communications"]),
  owner: new Set(["dashboard", "tickets", "calendar", "documents", "communications"]),
  tenant: new Set(["dashboard", "tickets", "calendar", "documents", "communications"]),
}

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3104",
    outDir: path.join(rootDir, "quality", "results"),
    headed: false,
    skipBrowser: false,
    skipApi: false,
    skipSchema: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--base-url") args.baseUrl = argv[++i]
    else if (arg === "--out-dir") args.outDir = path.resolve(argv[++i])
    else if (arg === "--headed") args.headed = true
    else if (arg === "--skip-browser") args.skipBrowser = true
    else if (arg === "--skip-api") args.skipApi = true
    else if (arg === "--skip-schema") args.skipSchema = true
  }

  return args
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function apiUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl).toString()
}

function localizedPath(locale, route) {
  const normalized = route === "/" ? "" : route
  return `/${locale}${normalized}`
}

function roleCookie(role) {
  return `access_profile_role=${role}`
}

function isIgnorableConsoleIssue(text) {
  return (
    (text.includes("/_next/webpack-hmr") && text.includes("WebSocket connection")) ||
    text.includes("Download the React DevTools")
  )
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
        // Try next package name.
      }
    }
    throw new Error("Playwright is not available from the root or web app dependencies.")
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer(baseUrl, timeoutMs = 90_000) {
  const started = Date.now()
  let lastError = ""
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(apiUrl(baseUrl, "/api/site-management/phase-status"), {
        cache: "no-store",
      })
      if (response.ok) return { status: response.status }
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error.message
    }
    await wait(1000)
  }
  throw new Error(`Server did not become reachable at ${baseUrl}. Last status: ${lastError}`)
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

function validateQuality(payload, label) {
  assert(payload.quality?.status !== "failed", `${label}: quality failed`)
  assert(["supabase", "local-seed"].includes(payload.source), `${label}: invalid data source ${payload.source}`)
}

async function checkApiContracts(baseUrl) {
  const checks = []
  const sources = new Map()

  async function run(name, pathname, options, validate) {
    const started = Date.now()
    const result = await fetchJson(baseUrl, pathname, options)
    if (validate) validate(result.payload)
    if (result.payload?.source) sources.set(name, result.payload.source)
    checks.push({
      name,
      role: options?.role ?? "admin",
      method: options?.method ?? "GET",
      pathname,
      status: result.status,
      durationMs: Date.now() - started,
      passed: true,
    })
    return result.payload
  }

  await run("phase-status", "/api/site-management/phase-status", {}, (payload) => {
    assert((payload.phases ?? []).length === 15, "phase-status must expose 15 phases")
    const phase7 = payload.phases.find((phase) => phase.phase === 7)
    assert(phase7?.status === "in_progress", "phase 7 must remain in active build")
  })

  await run("dashboard-admin", "/api/site-management/dashboard", { role: "admin" }, (payload) => {
    assert(payload.summary?.totalUnits > 0, "dashboard summary must include total units")
  })
  await run("dashboard-manager", "/api/site-management/dashboard", { role: "manager" })
  await run("dashboard-accountant-denied", "/api/site-management/dashboard", { role: "accountant", expectedStatus: 403 })
  await run("dashboard-tenant-denied", "/api/site-management/dashboard", { role: "tenant", expectedStatus: 403 })

  await run("phase4-site-data", "/api/site-management/phase4?limit=80", { role: "admin" }, (payload) => {
    assert(payload.summary?.totalUnits > 0, "phase4 must include unit summary")
    assert(Array.isArray(payload.units) && payload.units.length > 0, "phase4 must include units")
  })
  await run("phase4-staff-denied", "/api/site-management/phase4?limit=20", { role: "staff", expectedStatus: 403 })

  await run("users-admin", "/api/site-management/users?limit=30", { role: "admin" }, (payload) => {
    validateQuality(payload, "users")
    assert(payload.contractVersion === "phase-5-people-directory.v1", "users contract mismatch")
    assert(payload.summary?.roleCount >= 4, "users role coverage missing")
  })
  await run("users-manager", "/api/site-management/users?limit=20", { role: "manager" })
  await run("users-accountant-denied", "/api/site-management/users?limit=20", { role: "accountant", expectedStatus: 403 })

  await run("finance-accountant", "/api/site-management/finance?limit=12", { role: "accountant" }, (payload) => {
    validateQuality(payload, "finance")
    assert(payload.contractVersion === "phase-6-finance-ledger.v1", "finance contract mismatch")
    assert(payload.summary?.openLedgerCents >= 0, "finance open ledger invalid")
  })
  await run("finance-manager", "/api/site-management/finance?limit=12", { role: "manager" })
  await run("finance-staff-denied", "/api/site-management/finance?limit=12", { role: "staff", expectedStatus: 403 })

  await run("phase7-payment-controls", "/api/site-management/payment-controls?limit=8", { role: "accountant" }, (payload) => {
    validateQuality(payload, "payment controls")
    assert(payload.contractVersion === "phase-7-payment-restriction.v1", "payment controls contract mismatch")
    assert(
      payload.restrictionDecisions.every((item) => item.requiresHumanApproval === true),
      "restriction decisions must require human approval"
    )
  })
  await run("phase7-tenant-denied", "/api/site-management/payment-controls?limit=8", { role: "tenant", expectedStatus: 403 })

  await run("search-manager", "/api/site-management/search?q=A-001&limit=5", { role: "manager" }, (payload) => {
    assert(Array.isArray(payload.results), "search must return results array")
  })
  await run("search-empty-query", "/api/site-management/search", { role: "manager", expectedStatus: 400 })
  await run("search-tenant-denied", "/api/site-management/search?q=A-001", { role: "tenant", expectedStatus: 403 })

  await run("import-preview-manager", "/api/site-management/import/preview", {
    role: "manager",
    method: "POST",
    expectedStatus: 201,
    body: { batchId: "IMP-2401" },
  })
  await run("import-preview-staff-denied", "/api/site-management/import/preview", {
    role: "staff",
    method: "POST",
    expectedStatus: 403,
    body: { batchId: "IMP-2401" },
  })
  await run("import-commit-manager", "/api/site-management/import/commit", {
    role: "manager",
    method: "POST",
    expectedStatus: 202,
    body: { batchId: "IMP-2401" },
  })
  await run("import-commit-accountant-denied", "/api/site-management/import/commit", {
    role: "accountant",
    method: "POST",
    expectedStatus: 403,
    body: { batchId: "IMP-2401" },
  })

  await run("action-admin-users-export", "/api/site-management/actions", {
    role: "admin",
    method: "POST",
    expectedStatus: 201,
    body: {
      actionType: "users.directory.export",
      entityTable: "profiles",
      title: "Full app QA users export check",
      metadata: { harness: "full-app-qa" },
    },
  })
  await run("action-tenant-finance-denied", "/api/site-management/actions", {
    role: "tenant",
    method: "POST",
    expectedStatus: 403,
    body: {
      actionType: "finance.ledger.export",
      entityTable: "finance_ledger_entries",
      title: "Full app QA tenant denial check",
      metadata: { harness: "full-app-qa" },
    },
  })

  await run("access-profile-invalid", "/api/access-profile", {
    role: "admin",
    method: "POST",
    expectedStatus: 400,
    body: { role: "not-a-role" },
  })
  await run("access-profile-valid", "/api/access-profile", {
    role: "admin",
    method: "POST",
    expectedStatus: 200,
    body: { role: "manager" },
  })

  const aiChecks = [
    { role: "admin", prompt: "Give me phase status and risks.", expectedGuard: false },
    { role: "accountant", prompt: "Summarize finance ledger and payment restrictions.", expectedGuard: false },
    { role: "staff", prompt: "What field tickets should I handle today?", expectedGuard: false },
    { role: "tenant", prompt: "Show all finance ledger and user roles.", expectedGuard: true },
  ]
  for (const aiCheck of aiChecks) {
    await run(`ai-${aiCheck.role}`, "/api/ai/chat", {
      role: aiCheck.role,
      method: "POST",
      body: { message: aiCheck.prompt },
    }, (payload) => {
      assert(payload.role === aiCheck.role, `${aiCheck.role} AI response must echo role`)
      assert(Boolean(payload.roleProfile), `${aiCheck.role} AI response must include role profile`)
      if (aiCheck.expectedGuard) {
        assert(payload.source === "rbac-guard", `${aiCheck.role} AI request should be RBAC guarded`)
      } else {
        assert(payload.source !== "rbac-guard", `${aiCheck.role} AI request should be allowed`)
      }
    })
  }

  return {
    checks,
    sources: Object.fromEntries(sources.entries()),
    passed: true,
  }
}

async function checkSchemaFiles() {
  const files = [
    "supabase/migrations/00000000000000_initial_schema.sql",
    "supabase/migrations/00000000000001_rbac.sql",
    "supabase/migrations/00000000000002_site_crm_core.sql",
    "supabase/migrations/00000000000003_operational_api_foundation.sql",
    "supabase/migrations/00000000000004_realtime_operational_dashboard.sql",
    "supabase/seed.sql",
  ]
  const requiredSnippets = [
    "CREATE TABLE IF NOT EXISTS public.profiles",
    "CREATE TABLE IF NOT EXISTS public.units",
    "CREATE TABLE IF NOT EXISTS public.finance_ledger_entries",
    "CREATE TABLE IF NOT EXISTS public.payment_transactions",
    "CREATE TABLE IF NOT EXISTS public.reservations",
    "CREATE TABLE IF NOT EXISTS public.access_events",
    "CREATE TABLE IF NOT EXISTS public.staff_members",
    "CREATE TABLE IF NOT EXISTS public.role_coverage",
    "get_site_dashboard_snapshot",
    "get_phase4_site_data",
    "supabase_realtime",
  ]
  const corpusParts = []
  const fileChecks = []
  for (const relativePath of files) {
    const absolutePath = path.join(rootDir, relativePath)
    const content = await fs.readFile(absolutePath, "utf8")
    corpusParts.push(content)
    fileChecks.push({ relativePath, bytes: content.length, passed: content.length > 0 })
  }
  const corpus = corpusParts.join("\n")
  const snippetChecks = requiredSnippets.map((snippet) => ({
    snippet,
    passed: corpus.includes(snippet),
  }))
  const missing = snippetChecks.filter((check) => !check.passed)
  assert(missing.length === 0, `Database schema is missing snippets: ${missing.map((item) => item.snippet).join(", ")}`)

  return { fileChecks, snippetChecks, passed: true }
}

async function setupPage(context, routeUrl) {
  const page = await context.newPage()
  const issues = []
  const serverErrors = []

  page.on("console", (msg) => {
    const text = msg.text()
    if (msg.type() === "error" && !isIgnorableConsoleIssue(text)) {
      issues.push(`[console:error] ${text}`)
    }
  })
  page.on("pageerror", (error) => issues.push(`[pageerror] ${error.message}`))
  page.on("response", (response) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`)
  })

  await page.goto(routeUrl, { waitUntil: "domcontentloaded", timeout: 30_000 })
  await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {})
  await page.waitForTimeout(500)

  return { page, issues, serverErrors }
}

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  assert(
    Math.max(metrics.body, metrics.document) <= metrics.viewport + 2,
    `${label}: horizontal overflow body=${metrics.body} document=${metrics.document} viewport=${metrics.viewport}`
  )
}

async function routeSummary(page) {
  return {
    title: await page.title().catch(() => ""),
    h1: await page.locator("h1").first().innerText().catch(() => ""),
    url: page.url(),
  }
}

async function auditPublicRoutes(browser, baseUrl, outDir) {
  const results = []
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]

  for (const locale of locales) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport })
      for (const route of publicRoutes) {
        const id = `public-${locale}-${route === "/" ? "home" : route.slice(1)}-${viewport.name}`
        const { page, issues, serverErrors } = await setupPage(
          context,
          apiUrl(baseUrl, localizedPath(locale, route))
        )
        const summary = await routeSummary(page)
        const h1Count = await page.locator("h1").count()
        assert(h1Count > 0, `${id}: missing h1`)
        await assertNoOverflow(page, id)
        if (locale === "tr" && route === "/") {
          await page.getByRole("link", { name: /Panele Giriş Yap/i }).waitFor({ state: "visible", timeout: 10_000 })
        }
        if (locale === "tr" && route === "/platform") {
          await page.getByRole("link", { name: /Çalışma alanına gir/i }).waitFor({ state: "visible", timeout: 10_000 })
        }
        const screenshotPath = path.join(outDir, `${id}.png`)
        await page.screenshot({ path: screenshotPath, fullPage: true })
        assert(issues.length === 0 && serverErrors.length === 0, `${id}: ${[...issues, ...serverErrors].join("; ")}`)
        results.push({ id, locale, route, viewport, ...summary, screenshotPath, passed: true })
        await page.close()
      }
      await context.close()
    }
  }

  return results
}

async function auditDashboardRoutes(browser, baseUrl, outDir) {
  const results = []
  const desktop = { name: "desktop", width: 1440, height: 900 }

  for (const role of roles) {
    const context = await browser.newContext({ viewport: desktop })
    await context.addCookies([{ name: "access_profile_role", value: role, url: baseUrl }])
    for (const route of dashboardRoutes) {
      const allowed = roleAccess[role].has(route.resource)
      const id = `rbac-${role}-${route.resource}`
      const { page, issues, serverErrors } = await setupPage(
        context,
        apiUrl(baseUrl, localizedPath("tr", route.path))
      )
      await assertNoOverflow(page, id)
      const locked = await page.getByText(/rolünüz için kapalı|rolÃ¼nÃ¼z iÃ§in kapalÄ±/i).first().isVisible().catch(() => false)
      if (allowed) {
        assert(!locked, `${id}: allowed role saw locked page`)
        assert((await page.locator("h1").count()) > 0, `${id}: allowed page missing heading`)
      } else {
        assert(locked || page.url().includes("/dashboard"), `${id}: denied route did not lock or redirect`)
      }
      const shouldCapture = role === "admin" || ["finance", "users", "communications"].includes(route.resource)
      let screenshotPath = null
      if (shouldCapture) {
        screenshotPath = path.join(outDir, `${id}.png`)
        await page.screenshot({ path: screenshotPath, fullPage: true })
      }
      assert(issues.length === 0 && serverErrors.length === 0, `${id}: ${[...issues, ...serverErrors].join("; ")}`)
      results.push({
        id,
        role,
        route: route.path,
        resource: route.resource,
        allowed,
        locked,
        ...(await routeSummary(page)),
        screenshotPath,
        passed: true,
      })
      await page.close()
    }
    await context.close()
  }

  return results
}

async function auditCriticalFlows(browser, baseUrl, outDir) {
  const results = []

  async function runFlow(id, role, viewport, route, actions) {
    const context = await browser.newContext({ viewport })
    await context.addCookies([{ name: "access_profile_role", value: role, url: baseUrl }])
    const { page, issues, serverErrors } = await setupPage(
      context,
      apiUrl(baseUrl, localizedPath("tr", route))
    )
    const checks = []
    for (const action of actions) checks.push(await action(page))
    await assertNoOverflow(page, id)
    const screenshotPath = path.join(outDir, `${id}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await context.close()
    assert(issues.length === 0 && serverErrors.length === 0, `${id}: ${[...issues, ...serverErrors].join("; ")}`)
    results.push({ id, role, route, viewport, checks, screenshotPath, passed: true })
  }

  const desktop = { width: 1440, height: 900 }
  const mobile = { width: 390, height: 844 }

  await runFlow("flow-login-role-staff", "manager", desktop, "/login", [
    async (page) => {
      await page.getByRole("button", { name: /Personel/ }).click()
      await page.getByRole("heading", { name: /Saha Ekibi Çalışma Alanı|Saha Ekibi Ã‡alÄ±ÅŸma AlanÄ±/ }).waitFor({ state: "visible", timeout: 12_000 })
      return "local access profile signs in as staff"
    },
  ])

  await runFlow("flow-dashboard-mobile-menu", "manager", mobile, "/dashboard", [
    async (page) => {
      await page.getByRole("button", { name: /Menüyü aç|MenÃ¼yÃ¼ aÃ§/ }).click()
      await page.getByRole("link", { name: /Daire Matrisi/ }).waitFor({ state: "visible", timeout: 10_000 })
      await page.getByRole("button", { name: /Menüyü kapat|MenÃ¼yÃ¼ kapat/ }).click()
      return "mobile sidebar opens and closes"
    },
  ])

  await runFlow("flow-listings-search-detail", "manager", desktop, "/dashboard/listings", [
    async (page) => {
      await page.getByLabel("Ara...").first().fill("A-001")
      await page.getByRole("cell", { name: "A-001" }).first().waitFor({ state: "visible", timeout: 10_000 })
      return "unit search returns A-001"
    },
    async (page) => {
      await page.getByRole("button", { name: /A-001 detay/i }).first().click()
      await page.getByRole("heading", { name: "A-001" }).waitFor({ state: "visible", timeout: 10_000 })
      return "unit detail drawer opens"
    },
  ])

  await runFlow("flow-finance-ledger-phase7", "accountant", desktop, "/dashboard/finance", [
    async (page) => {
      await page.getByRole("heading", { name: /Finans defteri/i }).waitFor({ state: "visible", timeout: 10_000 })
      await page.getByRole("button", { name: /Defteri yenile/i }).click()
      return "finance ledger refresh works"
    },
    async (page) => {
      await page.getByRole("heading", { name: /Ödeme, depozito ve kısıt kontrol merkezi/i }).waitFor({ state: "visible", timeout: 10_000 })
      await page.getByRole("button", { name: /Kontrolleri yenile/i }).click()
      await page.getByRole("button", { name: /Mutabakat inceleme/i }).waitFor({ state: "visible", timeout: 10_000 })
      return "phase 7 payment-control panel refresh and action are visible"
    },
  ])

  await runFlow("flow-users-refresh-export", "admin", desktop, "/dashboard/users", [
    async (page) => {
      await page.getByRole("heading", { name: /Kullanıcılar|KullanÄ±cÄ±lar/ }).waitFor({ state: "visible", timeout: 10_000 })
      await page.getByRole("button", { name: /Kişi verisini yenile|KiÅŸi verisini yenile/i }).click()
      return "people directory refresh works"
    },
    async (page) => {
      await page.getByRole("button", { name: /Export iste|Dışa aktar|DÄ±ÅŸa aktar/i }).first().click()
      return "people directory export action is clickable for admin"
    },
  ])

  await runFlow("flow-communications-broadcast", "manager", desktop, "/dashboard/communications", [
    async (page) => {
      await page.getByRole("heading", { name: /İletişim Merkezi|Ä°letiÅŸim Merkezi/i }).waitFor({ state: "visible", timeout: 10_000 })
      await page.getByRole("button", { name: /Toplu bildirim/i }).click()
      return "communication broadcast action is clickable"
    },
  ])

  return results
}

async function runBrowserChecks(baseUrl, outDir, headed) {
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: !headed, timeout: 30_000 })
  try {
    const browserOutDir = path.join(outDir, "screenshots")
    await fs.mkdir(browserOutDir, { recursive: true })
    const publicResults = await auditPublicRoutes(browser, baseUrl, browserOutDir)
    const dashboardResults = await auditDashboardRoutes(browser, baseUrl, browserOutDir)
    const flowResults = await auditCriticalFlows(browser, baseUrl, browserOutDir)
    return {
      publicResults,
      dashboardResults,
      flowResults,
      passed: true,
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  process.env.NEXT_PUBLIC_ENABLE_ACCESS_PROFILES =
    process.env.NEXT_PUBLIC_ENABLE_ACCESS_PROFILES ?? "true"

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(args.outDir, `full-app-qa-${timestamp}`)
  await fs.mkdir(outDir, { recursive: true })

  console.log("Full app QA harness")
  console.log(`Base URL: ${args.baseUrl}`)
  console.log(`Results directory: ${outDir}`)

  const server = await waitForServer(args.baseUrl)
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    server,
    schema: args.skipSchema ? { skipped: true } : await checkSchemaFiles(),
    api: args.skipApi ? { skipped: true } : await checkApiContracts(args.baseUrl),
    browser: args.skipBrowser ? { skipped: true } : await runBrowserChecks(args.baseUrl, outDir, args.headed),
    passed: true,
  }

  const reportPath = path.join(outDir, "full-app-qa-report.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8")

  const summaryLines = [
    `Full app QA generated at ${report.generatedAt}`,
    `Base URL: ${report.baseUrl}`,
    `Schema checks: ${report.schema.skipped ? "skipped" : "passed"}`,
    `API checks: ${report.api.skipped ? "skipped" : `${report.api.checks.length} passed`}`,
    `Public browser checks: ${report.browser.skipped ? "skipped" : report.browser.publicResults.length}`,
    `Dashboard RBAC browser checks: ${report.browser.skipped ? "skipped" : report.browser.dashboardResults.length}`,
    `Critical flow checks: ${report.browser.skipped ? "skipped" : report.browser.flowResults.length}`,
    `Report: ${reportPath}`,
  ]
  await fs.writeFile(path.join(outDir, "summary.txt"), summaryLines.join("\n"), "utf8")

  console.log(summaryLines.join("\n"))
}

main().catch(async (error) => {
  console.error(error)
  process.exit(1)
})
