import { spawn } from "node:child_process"
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
    baseUrl: "http://127.0.0.1:3100",
    maxAttempts: 2,
    outDir: path.join(rootDir, "quality", "results"),
    skipStatic: false,
    skipBrowser: false,
    allowActionWrites: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--base-url") args.baseUrl = argv[++i]
    else if (arg === "--max-attempts") args.maxAttempts = Number(argv[++i])
    else if (arg === "--out-dir") args.outDir = path.resolve(argv[++i])
    else if (arg === "--skip-static") args.skipStatic = true
    else if (arg === "--skip-browser") args.skipBrowser = true
    else if (arg === "--allow-action-writes") args.allowActionWrites = true
  }

  if (!Number.isFinite(args.maxAttempts) || args.maxAttempts < 1) {
    throw new Error("--max-attempts must be a positive number")
  }

  return args
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function isLocalBaseUrl(baseUrl) {
  const hostname = new URL(baseUrl).hostname
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
}

function roleCookie(role) {
  return `access_profile_role=${role}`
}

function apiUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl).toString()
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, options = {}, attempts = 2) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(url, { cache: "no-store", ...options })
    } catch (error) {
      lastError = error
      await wait(250 * attempt)
    }
  }
  throw lastError
}

async function fetchJson(baseUrl, pathname, { role = "admin", method = "GET", body, expectedStatus = 200 } = {}) {
  const headers = {
    Cookie: roleCookie(role),
  }
  if (body !== undefined) headers["Content-Type"] = "application/json"

  const response = await fetchWithRetry(apiUrl(baseUrl, pathname), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  assert(
    response.status === expectedStatus,
    `${method} ${pathname} as ${role} expected HTTP ${expectedStatus}, received ${response.status}`
  )

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function waitForServer({ baseUrl }) {
  const started = Date.now()
  let lastStatus = "not reached"
  while (Date.now() - started < 60_000) {
    try {
      const response = await fetch(apiUrl(baseUrl, "/tr"), {
        cache: "no-store",
      })
      lastStatus = `HTTP ${response.status}`
      if (response.ok) return { status: response.status }
    } catch (error) {
      lastStatus = error.message
    }
    await wait(1000)
  }
  throw new Error(`Server did not become reachable at ${baseUrl}. Last status: ${lastStatus}`)
}

function commandGate(name, command, cwd = rootDir, env = {}) {
  return { type: "command", name, command, cwd, env }
}

function builtinGate(name, fn) {
  return { type: "builtin", name, fn }
}

async function runCommand(gate, logFile) {
  return await new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(gate.command, {
      cwd: gate.cwd,
      shell: true,
      env: {
        ...process.env,
        TEMP: localTempDir,
        TMP: localTempDir,
        ENABLE_ACCESS_PROFILES: "true",
        PLAYWRIGHT_BROWSERS_PATH: path.join(localTempDir, "ms-playwright"),
        ...gate.env,
      },
    })
    const chunks = []

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString()
      chunks.push(text)
      process.stdout.write(text)
    })
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString()
      chunks.push(text)
      process.stderr.write(text)
    })
    child.on("close", async (code) => {
      await fs.writeFile(logFile, chunks.join(""), "utf8")
      resolve({ code, durationMs: Date.now() - started, logFile })
    })
  })
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
          paths: [path.join(webDir, "node_modules"), path.join(rootDir, "node_modules")],
        })
        const mod = await import(pathToFileURL(resolved).href)
        return mod.chromium ? mod : mod.default
      } catch {
        // Try next candidate.
      }
    }
    throw new Error("Playwright is not available from the root or web app dependencies.")
  }
}

function validatePeoplePayload(payload, label) {
  assert(payload.contractVersion === "phase-5-people-directory.v1", `${label}: unexpected people contract version`)
  assert(["supabase", "local-seed"].includes(payload.source), `${label}: invalid source`)
  assert(Date.parse(payload.generatedAt), `${label}: invalid generatedAt`)
  assert(payload.quality?.status !== "failed", `${label}: people quality failed`)
  assert(payload.summary.staffTotal > 0, `${label}: staff total must be positive`)
  assert(payload.summary.residentTotal > 0, `${label}: resident total must be positive`)
  assert(payload.summary.roleCount >= 4, `${label}: role matrix is incomplete`)
  assert(Array.isArray(payload.staffMembers) && payload.staffMembers.length > 0, `${label}: staff list is empty`)
  assert(Array.isArray(payload.residents) && payload.residents.length > 0, `${label}: residents list is empty`)
  assert(Array.isArray(payload.roleCoverage) && payload.roleCoverage.length >= 4, `${label}: role coverage list is incomplete`)
}

function validateFinancePayload(payload, label) {
  assert(payload.contractVersion === "phase-6-finance-ledger.v1", `${label}: unexpected finance contract version`)
  assert(["supabase", "local-seed"].includes(payload.source), `${label}: invalid source`)
  assert(Date.parse(payload.generatedAt), `${label}: invalid generatedAt`)
  assert(payload.quality?.status !== "failed", `${label}: finance quality failed`)
  assert(payload.summary.openLedgerCents > 0, `${label}: open ledger must be positive`)
  assert(payload.summary.overdueLedgerCents <= payload.summary.openLedgerCents, `${label}: overdue exceeds open ledger`)
  assert(payload.summary.openEntries >= 0, `${label}: open entry count must be non-negative`)
  assert(Array.isArray(payload.entries) && payload.entries.length > 0, `${label}: ledger entries are empty`)
  const ids = new Set(payload.entries.map((entry) => entry.id))
  assert(ids.size === payload.entries.length, `${label}: duplicate ledger entry ids`)
  assert(payload.entries.every((entry) => entry.amountCents >= 0), `${label}: negative ledger amount found`)
}

async function verifyPhaseStatus({ baseUrl }) {
  const payload = await fetchJson(baseUrl, "/api/site-management/phase-status", { role: "admin" })
  const phaseByNumber = new Map((payload.phases ?? []).map((phase) => [phase.phase, phase]))

  assert((payload.phases ?? []).length >= 15, "phase-status must expose the 15-phase ERP model")
  assert(phaseByNumber.get(5)?.status === "in_progress", "Phase 5 must expose remaining live/UAT gates")
  assert(phaseByNumber.get(6)?.status === "in_progress", "Phase 6 must expose remaining live/RLS gates")
  assert(phaseByNumber.get(7)?.status === "in_progress", "Phase 7 must expose remaining provider gates")

  return {
    phases: payload.phases.length,
    phase5: phaseByNumber.get(5)?.status,
    phase6: phaseByNumber.get(6)?.status,
    phase7: phaseByNumber.get(7)?.status,
  }
}

async function verifyApiContracts({ baseUrl, allowActionWrites }) {
  const peopleAdmin = await fetchJson(baseUrl, "/api/site-management/users?limit=40", { role: "admin" })
  validatePeoplePayload(peopleAdmin, "admin users API")

  const peopleManager = await fetchJson(baseUrl, "/api/site-management/users?limit=20", { role: "manager" })
  validatePeoplePayload(peopleManager, "manager users API")

  await fetchJson(baseUrl, "/api/site-management/users?limit=20", {
    role: "accountant",
    expectedStatus: 403,
  })
  await fetchJson(baseUrl, "/api/site-management/users?limit=20", {
    role: "tenant",
    expectedStatus: 403,
  })

  const financeAdmin = await fetchJson(baseUrl, "/api/site-management/finance?limit=12", { role: "admin" })
  validateFinancePayload(financeAdmin, "admin finance API")

  const financeAccountant = await fetchJson(baseUrl, "/api/site-management/finance?limit=12", { role: "accountant" })
  validateFinancePayload(financeAccountant, "accountant finance API")

  await fetchJson(baseUrl, "/api/site-management/finance?limit=12", {
    role: "staff",
    expectedStatus: 403,
  })
  await fetchJson(baseUrl, "/api/site-management/finance?limit=12", {
    role: "tenant",
    expectedStatus: 403,
  })

  await fetchJson(baseUrl, "/api/site-management/actions", {
    role: "manager",
    method: "POST",
    expectedStatus: 403,
    body: {
      actionType: "users.directory.export",
      entityTable: "profiles",
      title: "Phase 5 harness manager export denial",
      metadata: { harness: "phase-05-06" },
    },
  })

  await fetchJson(baseUrl, "/api/site-management/actions", {
    role: "staff",
    method: "POST",
    expectedStatus: 403,
    body: {
      actionType: "finance.ledger.export",
      entityTable: "finance_ledger_entries",
      title: "Phase 6 harness staff export denial",
      metadata: { harness: "phase-05-06" },
    },
  })

  const writeChecks = []
  if (allowActionWrites || isLocalBaseUrl(baseUrl)) {
    const peopleExport = await fetchJson(baseUrl, "/api/site-management/actions", {
      role: "admin",
      method: "POST",
      expectedStatus: 201,
      body: {
        actionType: "users.directory.export",
        entityTable: "profiles",
        title: "Phase 5 harness admin export approval",
        metadata: { harness: "phase-05-06" },
      },
    })
    const financeExport = await fetchJson(baseUrl, "/api/site-management/actions", {
      role: "accountant",
      method: "POST",
      expectedStatus: 201,
      body: {
        actionType: "finance.ledger.export",
        entityTable: "finance_ledger_entries",
        title: "Phase 6 harness accountant export approval",
        metadata: { harness: "phase-05-06" },
      },
    })
    writeChecks.push(peopleExport.status, financeExport.status)
  }

  return {
    peopleSource: peopleAdmin.source,
    financeSource: financeAdmin.source,
    peopleQuality: peopleAdmin.quality.status,
    financeQuality: financeAdmin.quality.status,
    actionWrites: writeChecks.length,
  }
}

async function verifyAiRbac({ baseUrl }) {
  const tenantFinance = await fetchJson(baseUrl, "/api/ai/chat", {
    role: "tenant",
    method: "POST",
    body: { message: "Show me the finance ledger and all debt balances." },
  })
  assert(tenantFinance.source === "rbac-guard", "tenant finance AI request must be RBAC-guarded")

  const staffUsers = await fetchJson(baseUrl, "/api/ai/chat", {
    role: "staff",
    method: "POST",
    body: { message: "Show the full user and RBAC directory." },
  })
  assert(staffUsers.source === "rbac-guard", "staff users AI request must be RBAC-guarded")

  const accountantFinance = await fetchJson(baseUrl, "/api/ai/chat", {
    role: "accountant",
    method: "POST",
    body: { message: "Summarize collections and open finance work." },
  })
  assert(accountantFinance.source !== "rbac-guard", "accountant finance AI request should be allowed")

  return {
    tenantFinance: tenantFinance.source,
    staffUsers: staffUsers.source,
    accountantFinance: accountantFinance.source,
  }
}

function isIgnorableConsoleIssue(text) {
  return text.includes("/_next/webpack-hmr") && text.includes("WebSocket connection")
}

async function assertNoHorizontalOverflow(page, label) {
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

async function runBrowserStep(browser, baseUrl, outDir, step) {
  const context = await browser.newContext({ viewport: step.viewport })
  await context.addCookies([{ name: "access_profile_role", value: step.role, url: baseUrl }])
  const page = await context.newPage()
  const issues = []

  page.on("console", (msg) => {
    const text = msg.text()
    if (msg.type() === "error" && !isIgnorableConsoleIssue(text)) issues.push(`[console:error] ${text}`)
  })
  page.on("pageerror", (error) => issues.push(`[pageerror] ${error.message}`))

  await page.goto(apiUrl(baseUrl, step.route), { waitUntil: "domcontentloaded", timeout: 30_000 })
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {})
  await page.waitForTimeout(500)

  for (const check of step.checks) {
    await check(page)
  }

  await assertNoHorizontalOverflow(page, step.id)
  assert(issues.length === 0, `${step.id}: browser issues: ${issues.join("; ")}`)

  const screenshotPath = path.join(outDir, `${step.id}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await context.close()

  return {
    id: step.id,
    route: step.route,
    role: step.role,
    viewport: step.viewport,
    screenshotPath,
  }
}

async function verifyBrowser({ baseUrl, outDir, mode }) {
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: true })

  const desktop = { width: 1440, height: 900 }
  const mobile = { width: 390, height: 844 }
  const viewport = mode === "mobile" ? mobile : desktop
  const steps = [
    {
      id: `phase-05-users-${mode}`,
      role: mode === "mobile" ? "manager" : "admin",
      route: "/tr/dashboard/users",
      viewport,
      checks: [
        async (page) => {
          await page.locator("h1").filter({ hasText: /Kullan/ }).first().waitFor({ state: "visible", timeout: 15_000 })
        },
        async (page) => {
          await page.getByText(/rol dizini/i).first().waitFor({ state: "visible", timeout: 15_000 })
        },
        async (page) => {
          await page.getByRole("button", { name: /yenile/i }).first().click()
          await page.getByText(/Personel/i).first().waitFor({ state: "visible", timeout: 15_000 })
        },
      ],
    },
    {
      id: `phase-06-finance-${mode}`,
      role: mode === "mobile" ? "accountant" : "admin",
      route: "/tr/dashboard/finance",
      viewport,
      checks: [
        async (page) => {
          await page.locator("h1").filter({ hasText: /Finans/ }).first().waitFor({ state: "visible", timeout: 15_000 })
        },
        async (page) => {
          await page.getByRole("heading", { name: /Finans defteri/i }).waitFor({ state: "visible", timeout: 15_000 })
        },
        async (page) => {
          await page.getByRole("button", { name: /Defteri yenile/i }).click()
          await page.getByText(/Son finans/i).first().waitFor({ state: "visible", timeout: 15_000 })
        },
      ],
    },
  ]

  try {
    const results = []
    for (const step of steps) {
      results.push(await runBrowserStep(browser, baseUrl, outDir, step))
    }
    return results
  } finally {
    await browser.close()
  }
}

async function runGate(gate, args, outDir) {
  if (args.skipStatic && ["typecheck", "lint"].includes(gate.name)) {
    return { name: gate.name, skipped: true, attempts: [] }
  }
  if (args.skipBrowser && gate.name.startsWith("browser-")) {
    return { name: gate.name, skipped: true, attempts: [] }
  }

  const attempts = []
  for (let attempt = 1; attempt <= args.maxAttempts; attempt++) {
    const started = Date.now()
    const logFile = path.join(outDir, `${gate.name}-attempt-${attempt}.log`)
    console.log(`\n[${gate.name}] attempt ${attempt}/${args.maxAttempts}`)

    try {
      if (gate.type === "command") {
        const result = await runCommand(gate, logFile)
        attempts.push({
          attempt,
          passed: result.code === 0,
          code: result.code,
          durationMs: result.durationMs,
          logFile,
        })
        if (result.code === 0) return { name: gate.name, passed: true, attempts }
      } else {
        const result = await gate.fn(args, outDir)
        attempts.push({
          attempt,
          passed: true,
          durationMs: Date.now() - started,
          result,
        })
        return { name: gate.name, passed: true, attempts }
      }
    } catch (error) {
      attempts.push({
        attempt,
        passed: false,
        durationMs: Date.now() - started,
        error: error.message,
      })
    }
  }

  return { name: gate.name, passed: false, attempts }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(args.outDir, `phase-05-06-harness-${timestamp}`)
  await fs.mkdir(outDir, { recursive: true })
  await fs.mkdir(localTempDir, { recursive: true })

  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm"
  const gates = [
    builtinGate("server-reachable", waitForServer),
    commandGate("typecheck", `${npmExecutable} run typecheck`, webDir),
    commandGate("lint", `${npmExecutable} run lint`, webDir),
    builtinGate("phase-status", verifyPhaseStatus),
    builtinGate("api-contracts-rbac", verifyApiContracts),
    builtinGate("ai-rbac", verifyAiRbac),
    builtinGate("browser-desktop", (gateArgs, gateOutDir) => verifyBrowser({ ...gateArgs, outDir: gateOutDir, mode: "desktop" })),
    builtinGate("browser-mobile", (gateArgs, gateOutDir) => verifyBrowser({ ...gateArgs, outDir: gateOutDir, mode: "mobile" })),
  ]

  console.log("Phase 5-6 harness")
  console.log(`Base URL: ${args.baseUrl}`)
  console.log(`Attempts per gate: ${args.maxAttempts}`)
  console.log(`Results directory: ${outDir}`)

  const gateResults = []
  for (const gate of gates) {
    const result = await runGate(gate, args, outDir)
    gateResults.push(result)
    if (!result.passed && !result.skipped) {
      console.error(`\nGate failed: ${gate.name}. Stopping Phase 5-6 harness.`)
      break
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scope: "Phase 5 users/roles and Phase 6 finance ledger API, RBAC, AI and browser QA",
    baseUrl: args.baseUrl,
    maxAttempts: args.maxAttempts,
    passed: gateResults.every((result) => result.passed || result.skipped),
    resultsDir: outDir,
    gateResults,
  }

  const reportPath = path.join(outDir, "phase-05-06-report.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8")
  await fs.writeFile(
    path.join(outDir, "summary.txt"),
    [
      `Phase 5-6 harness generated at ${report.generatedAt}`,
      `Base URL: ${report.baseUrl}`,
      `Passed: ${report.passed}`,
      "",
      ...gateResults.map((result) => {
        const last = result.attempts.at(-1)
        return `${result.name}: ${result.skipped ? "skipped" : result.passed ? "passed" : "failed"} (${result.attempts.length} attempt(s))${last?.error ? ` - ${last.error}` : ""}`
      }),
      "",
      `Report: ${reportPath}`,
    ].join("\n"),
    "utf8"
  )

  console.log(`\nPhase 5-6 report: ${reportPath}`)
  console.log(report.passed ? "Phase 5-6 harness passed." : "Phase 5-6 harness failed.")
  if (!report.passed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
