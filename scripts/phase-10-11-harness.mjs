import { createRequire } from "node:module"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")
const localTempDir = path.join(rootDir, ".tmp")

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3104",
    outDir: path.join(rootDir, "quality", "results"),
    maxAttempts: 2,
    headed: false,
    skipBrowser: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--base-url") args.baseUrl = argv[++i]
    else if (arg === "--out-dir") args.outDir = path.resolve(argv[++i])
    else if (arg === "--max-attempts") args.maxAttempts = Number(argv[++i])
    else if (arg === "--headed") args.headed = true
    else if (arg === "--skip-browser") args.skipBrowser = true
  }

  if (!Number.isFinite(args.maxAttempts) || args.maxAttempts < 1) {
    throw new Error("--max-attempts must be a positive number")
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

function validatePhase10(payload, label) {
  assert(payload.contractVersion === "phase-10-booking-operations.v1", `${label}: contract mismatch`)
  assert(payload.providerMode === "simulation", `${label}: provider mode must be simulation`)
  assert(payload.quality?.liveProviderConnected === false, `${label}: must not claim live provider connection`)
  assert(Array.isArray(payload.bookings) && payload.bookings.length > 0, `${label}: bookings missing`)
  assert(Array.isArray(payload.readinessQueue) && payload.readinessQueue.length > 0, `${label}: readiness queue missing`)
  assert(Array.isArray(payload.turnoverTasks) && payload.turnoverTasks.length > 0, `${label}: turnover tasks missing`)
  assert(Array.isArray(payload.accessHandoffs) && payload.accessHandoffs.length > 0, `${label}: access handoffs missing`)
  assert(Array.isArray(payload.depositSettlements) && payload.depositSettlements.length > 0, `${label}: deposit settlements missing`)
  assert(payload.summary.averageReadiness >= 0 && payload.summary.averageReadiness <= 100, `${label}: readiness range invalid`)
  assert(
    payload.readinessQueue.every((item) => Array.isArray(item.steps) && item.steps.length >= 4 && item.nextAction),
    `${label}: readiness rows require steps and next action`
  )
}

function validateCommunications(payload, label) {
  assert(payload.contractVersion === "phase-11-communications.v1", `${label}: contract mismatch`)
  assert(payload.providerMode === "simulation", `${label}: provider mode must be simulation`)
  assert(payload.quality?.liveProviderConnected === false, `${label}: must not claim live provider connection`)
  assert(Array.isArray(payload.threads) && payload.threads.length > 0, `${label}: threads missing`)
  assert(Array.isArray(payload.lifecycle) && payload.lifecycle.length > 0, `${label}: guest lifecycle missing`)
  assert(Array.isArray(payload.rules) && payload.rules.length > 0, `${label}: rules missing`)
  assert(Array.isArray(payload.deliveries) && payload.deliveries.length > 0, `${label}: deliveries missing`)
  assert(Array.isArray(payload.templates) && payload.templates.length > 0, `${label}: templates missing`)
  assert(
    payload.templates.some((template) => Array.isArray(template.languages) && template.languages.includes("tr") && template.languages.includes("ru")),
    `${label}: multilingual template coverage missing`
  )
}

function validateDocumentPackets(payload, label) {
  assert(payload.contractVersion === "phase-11-document-packets.v1", `${label}: contract mismatch`)
  assert(payload.providerMode === "simulation", `${label}: provider mode must be simulation`)
  assert(payload.quality?.liveStorageConnected === false, `${label}: must not claim live storage connection`)
  assert(Array.isArray(payload.documents) && payload.documents.length > 0, `${label}: document vault missing`)
  assert(Array.isArray(payload.packets) && payload.packets.length > 0, `${label}: packets missing`)
  assert(payload.summary?.packets?.completionRate >= 0, `${label}: packet summary missing completion rate`)
}

async function runApiChecks(baseUrl) {
  const checks = []

  async function run(name, pathname, options, validate) {
    const started = Date.now()
    const result = await fetchJson(baseUrl, pathname, options)
    if (validate) validate(result.payload, name)
    checks.push({
      name,
      pathname,
      role: options?.role ?? "admin",
      status: result.status,
      durationMs: Date.now() - started,
      passed: true,
    })
    return result.payload
  }

  await run("phase-status-10-11", "/api/site-management/phase-status", { role: "admin" }, (payload) => {
    const phase10 = payload.phases?.find((phase) => phase.phase === 10)
    const phase11 = payload.phases?.find((phase) => phase.phase === 11)
    assert(phase10?.status === "ready_for_uat", "Phase 10 must be ready_for_uat")
    assert(phase11?.status === "ready_for_uat", "Phase 11 must be ready_for_uat")
  })

  await run("phase10-booking-manager", "/api/site-management/booking-operations", { role: "manager" }, validatePhase10)
  await run("phase10-booking-staff", "/api/site-management/booking-operations", { role: "staff" })
  await run("phase10-booking-owner", "/api/site-management/booking-operations", { role: "owner" })
  await run("phase10-booking-accountant-denied", "/api/site-management/booking-operations", {
    role: "accountant",
    expectedStatus: 403,
  })

  await run("phase11-communications-manager", "/api/site-management/communications", { role: "manager" }, validateCommunications)
  await run("phase11-communications-accountant", "/api/site-management/communications", { role: "accountant" })
  await run("phase11-communications-owner", "/api/site-management/communications", { role: "owner" })

  await run("phase11-documents-manager", "/api/site-management/document-packets", { role: "manager" }, validateDocumentPackets)
  await run("phase11-documents-accountant", "/api/site-management/document-packets", { role: "accountant" })
  await run("phase11-documents-staff", "/api/site-management/document-packets", { role: "staff" })

  await run("phase10-action-move-in", "/api/site-management/actions", {
    role: "manager",
    method: "POST",
    expectedStatus: 201,
    body: {
      actionType: "reservations.move_in.prepare",
      entityTable: "reservations",
      entityExternalId: "BKG-501",
      title: "Harness move-in readiness action",
      metadata: { harness: "phase-10-11" },
    },
  })
  await run("phase11-action-delivery-retry", "/api/site-management/actions", {
    role: "manager",
    method: "POST",
    expectedStatus: 201,
    body: {
      actionType: "notification.delivery.retry",
      entityTable: "notification_deliveries",
      entityExternalId: "DLV-7005",
      title: "Harness delivery retry action",
      metadata: { harness: "phase-10-11" },
    },
  })
  await run("phase11-action-document-packet", "/api/site-management/actions", {
    role: "manager",
    method: "POST",
    expectedStatus: 201,
    body: {
      actionType: "document.packet.prepare",
      entityTable: "document_packets",
      entityExternalId: "PACK-CHECKOUT-01",
      title: "Harness document packet action",
      metadata: { harness: "phase-10-11" },
    },
  })

  return checks
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

async function openRolePage(browser, baseUrl, role, pathname, viewport) {
  const context = await browser.newContext({ viewport })
  await context.addCookies([{ name: "access_profile_role", value: role, url: baseUrl }])
  const page = await context.newPage()
  const issues = []
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("/_next/webpack-hmr")) {
      issues.push(`console: ${message.text()}`)
    }
  })
  await page.goto(apiUrl(baseUrl, `/tr${pathname}`), { waitUntil: "networkidle", timeout: 30_000 })
  return { context, page, issues }
}

async function runBrowserChecks(baseUrl, outDir, headed) {
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: !headed, timeout: 30_000 })
  const screenshotsDir = path.join(outDir, "screenshots")
  await fs.mkdir(screenshotsDir, { recursive: true })
  const results = []
  const desktop = { width: 1440, height: 900 }
  const mobile = { width: 390, height: 844 }

  async function run(name, role, pathname, viewport, checks) {
    const { context, page, issues } = await openRolePage(browser, baseUrl, role, pathname, viewport)
    const notes = []
    try {
      for (const check of checks) notes.push(await check(page))
      const screenshotPath = path.join(screenshotsDir, `${name}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true })
      assert(issues.length === 0, `${name}: ${issues.join("; ")}`)
      results.push({ name, role, pathname, viewport, notes, screenshotPath, passed: true })
    } finally {
      await context.close()
    }
  }

  try {
    await run("phase10-calendar-desktop", "manager", "/dashboard/calendar", desktop, [
      async (page) => {
        await page.getByRole("heading", { name: /Move-in readiness command board|Giriş hazırlığı komuta panosu/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByRole("heading", { name: /Access handoff queue/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByLabel(/Move-in hazirligini hazirla/i).first().click()
        return "calendar readiness and access handoff are visible and action is clickable"
      },
      async (page) => {
        await page.getByLabel(/Depozito kararini incele/i).first().click()
        return "deposit settlement action is clickable"
      },
    ])

    await run("phase11-communications-desktop", "manager", "/dashboard/communications", desktop, [
      async (page) => {
        await page.getByRole("heading", { name: /İletişim Merkezi|Iletisim Merkezi/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByRole("heading", { name: /Delivery and retry queue/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByLabel(/Bildirim teslimini yeniden dene/i).first().click()
        return "communication inbox, retry queue and retry action are visible"
      },
      async (page) => {
        await page.getByLabel(/Mesaj sablonunu onaya hazirla/i).first().click()
        return "template approval action is clickable"
      },
    ])

    await run("phase11-documents-desktop", "manager", "/dashboard/documents", desktop, [
      async (page) => {
        await page.getByRole("heading", { name: /Document packet board/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByLabel(/Belge paketini hazirla/i).first().click()
        return "document packet board and packet action are visible"
      },
    ])

    await run("phase10-11-mobile-client", "tenant", "/dashboard/communications", mobile, [
      async (page) => {
        await page.getByRole("heading", { name: /İletişim Merkezi|Iletisim Merkezi/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByText(/Open threads/i).first().waitFor({ state: "visible", timeout: 10_000 })
        return "tenant communication page renders on mobile"
      },
    ])

    return results
  } finally {
    await browser.close()
  }
}

async function runGate(name, fn, args, outDir) {
  const attempts = []
  for (let attempt = 1; attempt <= args.maxAttempts; attempt++) {
    const started = Date.now()
    console.log(`\n[${name}] attempt ${attempt}/${args.maxAttempts}`)
    try {
      const result = await fn(args, outDir)
      attempts.push({ attempt, passed: true, durationMs: Date.now() - started, result })
      return { name, passed: true, attempts }
    } catch (error) {
      attempts.push({ attempt, passed: false, durationMs: Date.now() - started, error: error.message })
      console.error(`[${name}] failed: ${error.message}`)
      if (attempt < args.maxAttempts) await wait(1500)
    }
  }
  return { name, passed: false, attempts }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(args.outDir, `phase-10-11-${timestamp}`)
  await fs.mkdir(outDir, { recursive: true })
  await fs.mkdir(localTempDir, { recursive: true })
  process.env.TEMP = localTempDir
  process.env.TMP = localTempDir
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(localTempDir, "ms-playwright")
  process.env.ENABLE_ACCESS_PROFILES =
    process.env.ENABLE_ACCESS_PROFILES ?? "true"

  const gates = []
  gates.push(await runGate("wait-for-server", async () => waitForServer(args.baseUrl), args, outDir))
  gates.push(await runGate("api-contracts-rbac", async () => runApiChecks(args.baseUrl), args, outDir))
  if (!args.skipBrowser) {
    gates.push(await runGate("browser-smoke", async () => runBrowserChecks(args.baseUrl, outDir, args.headed), args, outDir))
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    gates,
    passed: gates.every((gate) => gate.passed),
  }

  const reportPath = path.join(outDir, "phase-10-11-report.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8")
  await fs.writeFile(
    path.join(outDir, "summary.txt"),
    [
      `Phase 10/11 harness generated at ${report.generatedAt}`,
      `Base URL: ${report.baseUrl}`,
      `Gates: ${gates.length}`,
      `Passed: ${report.passed}`,
      `Report: ${reportPath}`,
    ].join("\n"),
    "utf8"
  )

  console.log(`Phase 10/11 report: ${reportPath}`)
  if (!report.passed) process.exit(1)
  console.log("Phase 10/11 harness passed.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
