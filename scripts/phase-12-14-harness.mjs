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
    else if (arg === "--max-attempts") args.maxAttempts = Math.max(1, Number(argv[++i]) || 1)
    else if (arg === "--headed") args.headed = true
    else if (arg === "--skip-browser") args.skipBrowser = true
  }

  return args
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function apiUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl).toString()
}

function localizedPath(pathname) {
  return `/tr${pathname === "/" ? "" : pathname}`
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
      const response = await fetch(apiUrl(baseUrl, "/tr"), { cache: "no-store" })
      if (response.ok) return { status: response.status }
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error.message
    }
    await wait(1000)
  }
  throw new Error(`Timed out waiting for ${baseUrl}. Last status: ${lastError}`)
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
  assert(response.status === expectedStatus, `${method} ${pathname} as ${role} expected ${expectedStatus}, got ${response.status}: ${text}`)
  return payload
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

async function runApiChecks(baseUrl) {
  const checks = []

  async function run(name, pathname, options, validate) {
    const started = Date.now()
    const payload = await fetchJson(baseUrl, pathname, options)
    if (validate) validate(payload)
    checks.push({ name, pathname, role: options?.role ?? "admin", durationMs: Date.now() - started, passed: true })
    return payload
  }

  await run("phase-status-12-14", "/api/site-management/phase-status", { role: "admin" }, (payload) => {
    const expectedStatuses = new Map([[12, "in_progress"], [13, "blocked"], [14, "in_progress"]])
    for (const phaseNo of [12, 13, 14]) {
      const phase = payload.phases?.find((item) => item.phase === phaseNo)
      assert(phase?.status === expectedStatuses.get(phaseNo), `phase ${phaseNo} status must remain evidence-scoped`)
      assert((phase.evidence ?? []).length >= 3, `phase ${phaseNo} must expose evidence`)
    }
  })

  await run("phase12-offline-manager", "/api/site-management/offline-sync", { role: "manager" }, (payload) => {
    assert(payload.contractVersion === "phase-12-mobile-web-offline.v1", "phase 12 contract mismatch")
    assert(payload.quality?.nativeMobileAppRequired === false, "native app must not be required")
    assert(payload.summary?.capabilities >= 4, "mobile web capabilities missing")
    assert((payload.queue ?? []).some((item) => item.status === "conflict"), "offline conflict example missing")
  })
  await run("phase12-offline-staff", "/api/site-management/offline-sync", { role: "staff" })
  await run("phase12-offline-tenant-denied", "/api/site-management/offline-sync", { role: "tenant", expectedStatus: 403 })

  await run("phase13-integrations-manager", "/api/site-management/integrations", { role: "manager" }, (payload) => {
    assert(payload.contractVersion === "phase-13-integration-readiness.v1", "phase 13 contract mismatch")
    assert(payload.quality?.supabaseConnected === true, "Supabase connected flag missing")
    assert(payload.quality?.liveExternalProvidersConnected === false, "external providers must stay non-live")
    assert((payload.providers ?? []).some((item) => item.category === "Payments" && item.status === "blocked_pending_client"), "payment placeholder missing")
  })
  await run("phase13-integrations-staff-denied", "/api/site-management/integrations", { role: "staff", expectedStatus: 403 })

  await run("phase14-ai-premium-manager", "/api/ai/premium", { role: "manager" }, (payload) => {
    assert(payload.contractVersion === "phase-14-ai-premium.v1", "phase 14 contract mismatch")
    assert(payload.quality?.sameLanguageReplyTarget === true, "same-language AI target missing")
    assert(payload.quality?.autonomousFinanceOrAccessActions === false, "AI sensitive action guard missing")
    assert((payload.recommendations ?? []).length >= 5, "AI recommendations missing")
    assert((payload.imageWorkflows ?? []).length >= 3, "AI image workflows missing")
  })
  await run("phase14-ai-premium-staff-denied", "/api/ai/premium", { role: "staff", expectedStatus: 403 })

  const languageChecks = [
    ["ai-english-integration", "manager", "Please explain integration readiness and provider risks.", "en"],
    ["ai-german-report", "manager", "Bitte erstelle einen kurzen Bericht zum heutigen Betrieb.", "de"],
    ["ai-russian-booking", "manager", "Покажи риск по бронированию и депозиту.", "ru"],
  ]
  for (const [name, role, message, expectedLanguage] of languageChecks) {
    await run(name, "/api/ai/chat", {
      role,
      method: "POST",
      body: { message },
    }, (payload) => {
      assert(payload.language === expectedLanguage, `${name} expected language ${expectedLanguage}, got ${payload.language}`)
      assert(payload.source !== "rbac-guard", `${name} should not be RBAC guarded`)
      assert(String(payload.reply ?? "").trim().length > 20, `${name} reply is too short`)
    })
  }

  for (const term of ["MW-PWA-02", "OFF-9005", "INT-PAY-02", "AI-BRIEF-01", "AIMG-SRV-01"]) {
    await run(`search-${term}`, `/api/site-management/search?q=${encodeURIComponent(term)}&limit=5`, { role: "manager" }, (payload) => {
      assert((payload.results ?? []).length > 0, `search returned no result for ${term}`)
    })
  }

  await run("action-offline-review", "/api/site-management/actions", {
    role: "manager",
    method: "POST",
    expectedStatus: 201,
    body: {
      actionType: "offline_sync.item.review",
      entityTable: "offline_sync_jobs",
      entityExternalId: "OFF-9005",
      title: "Phase 12 offline conflict review",
      metadata: { harness: "phase-12-14" },
    },
  })

  await run("action-ai-prepare", "/api/site-management/actions", {
    role: "manager",
    method: "POST",
    expectedStatus: 201,
    body: {
      actionType: "ai.recommendation.prepare",
      entityTable: "ai_recommendations",
      entityExternalId: "AI-BRIEF-01",
      title: "Phase 14 AI briefing prepare",
      metadata: { harness: "phase-12-14" },
    },
  })

  return checks
}

function isIgnorableConsoleIssue(text) {
  return (
    (text.includes("/_next/webpack-hmr") && text.includes("WebSocket connection")) ||
    text.includes("Download the React DevTools")
  )
}

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  assert(Math.max(metrics.body, metrics.document) <= metrics.viewport + 2, `${label}: horizontal overflow`)
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
    const context = await browser.newContext({ viewport })
    await context.addCookies([{ name: "access_profile_role", value: role, url: baseUrl }])
    const page = await context.newPage()
    const issues = []
    const serverErrors = []
    const notes = []
    page.on("console", (msg) => {
      const text = msg.text()
      if (msg.type() === "error" && !isIgnorableConsoleIssue(text)) issues.push(`[console:error] ${text}`)
    })
    page.on("pageerror", (error) => issues.push(`[pageerror] ${error.message}`))
    page.on("response", (response) => {
      if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`)
    })
    try {
      await page.goto(apiUrl(baseUrl, localizedPath(pathname)), { waitUntil: "domcontentloaded", timeout: 30_000 })
      await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {})
      await page.waitForTimeout(500)
      for (const check of checks) notes.push(await check(page))
      await assertNoOverflow(page, name)
      const screenshotPath = path.join(screenshotsDir, `${name}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true })
      assert(issues.length === 0 && serverErrors.length === 0, `${name}: ${[...issues, ...serverErrors].join("; ")}`)
      results.push({ name, role, pathname, viewport, notes, screenshotPath, passed: true })
    } finally {
      await context.close()
    }
  }

  try {
    await run("phase12-offline-desktop", "manager", "/dashboard/offline", desktop, [
      async (page) => {
        await page.getByRole("heading", { name: /Mobile Web & Offline Sync|Mobil Web & Offline Sync/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByText(/No native app|native app yok/i).first().waitFor({ state: "visible", timeout: 10_000 })
        await page.locator('button[aria-label*="offline kuyruk aksiyonlari"]:visible').first().click()
        await page.locator('button[aria-label*="Offline sync item review"]:visible').first().click()
        return "offline page and review action are visible"
      },
    ])
    await run("phase12-offline-staff-mobile", "staff", "/dashboard/offline", mobile, [
      async (page) => {
        await page.getByRole("heading", { name: /Mobile Web & Offline Sync|Mobil Web & Offline Sync/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByText(/Offline guardrail|Offline güvenlik sınırı/i).first().waitFor({ state: "visible", timeout: 10_000 })
        return "staff mobile offline page renders"
      },
    ])
    await run("phase13-settings-integrations", "manager", "/dashboard/settings", desktop, [
      async (page) => {
        await page.getByRole("heading", { name: /Phase 13 integration readiness|Faz 13 entegrasyon hazırlığı/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByText(/Supabase/i).first().waitFor({ state: "visible", timeout: 10_000 })
        return "integration readiness matrix renders"
      },
    ])
    await run("phase14-reports-ai", "manager", "/dashboard/reports", desktop, [
      async (page) => {
        await page.getByRole("heading", { name: /Phase 14 AI command layer|Faz 14 AI komuta katmanı/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByText(/Same-language assistant|Aynı dilde asistan/i).first().waitFor({ state: "visible", timeout: 10_000 })
        await page.locator('button[aria-label*="AI aksiyonlari"]:visible').first().click()
        await page.locator('button[aria-label*="AI oneriyi hazirla"]:visible').first().click()
        return "AI recommendation board and prepare action work"
      },
    ])
  } finally {
    await browser.close()
  }

  return results
}

async function runGate(name, fn, args, outDir) {
  for (let attempt = 1; attempt <= args.maxAttempts; attempt++) {
    try {
      const result = await fn(args, outDir)
      return { name, passed: true, attempts: [{ attempt, passed: true }], result }
    } catch (error) {
      if (attempt === args.maxAttempts) {
        return { name, passed: false, attempts: [{ attempt, passed: false, error: error.message }] }
      }
      await wait(1500)
    }
  }
  return { name, passed: false, attempts: [] }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  await fs.mkdir(localTempDir, { recursive: true })
  process.env.TEMP = localTempDir
  process.env.TMP = localTempDir
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(localTempDir, "ms-playwright")
  process.env.ENABLE_ACCESS_PROFILES = process.env.ENABLE_ACCESS_PROFILES ?? "true"

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(args.outDir, `phase-12-14-${timestamp}`)
  await fs.mkdir(outDir, { recursive: true })

  const gates = []
  gates.push(await runGate("wait-for-server", async () => waitForServer(args.baseUrl), args, outDir))
  gates.push(await runGate("api-contracts-rbac-ai-language", async () => runApiChecks(args.baseUrl), args, outDir))
  if (!args.skipBrowser) {
    gates.push(await runGate("browser-smoke", async () => runBrowserChecks(args.baseUrl, outDir, args.headed), args, outDir))
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    scope: "Phase 12 mobile-friendly web/offline, Phase 13 integration placeholders, Phase 14 AI premium",
    gates,
    passed: gates.every((gate) => gate.passed),
  }
  const reportPath = path.join(outDir, "phase-12-14-report.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8")
  await fs.writeFile(
    path.join(outDir, "summary.txt"),
    [
      `Phase 12-14 harness generated at ${report.generatedAt}`,
      `Base URL: ${report.baseUrl}`,
      `Gates: ${gates.map((gate) => `${gate.name}:${gate.passed ? "passed" : "failed"}`).join(", ")}`,
      `Passed: ${report.passed}`,
      `Report: ${reportPath}`,
    ].join("\n"),
    "utf8"
  )
  console.log(`Phase 12-14 report: ${reportPath}`)
  console.log(report.passed ? "Phase 12-14 harness passed." : "Phase 12-14 harness failed.")
  if (!report.passed) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
