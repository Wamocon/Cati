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

function localizedPath(pathname) {
  return `/tr${pathname === "/" ? "" : pathname}`
}

function roleCookie(role) {
  return `access_profile_role=${role}`
}

function isIgnorableConsoleIssue(text) {
  return (
    (text.includes("/_next/webpack-hmr") && text.includes("WebSocket connection")) ||
    text.includes("Download the React DevTools") ||
    (text.includes("A tree hydrated but some attributes") && text.includes("caret-color"))
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
        // Try the next package name.
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

async function fetchMultipart(baseUrl, pathname, { role = "admin", formData, expectedStatus = 201 } = {}) {
  const response = await fetch(apiUrl(baseUrl, pathname), {
    method: "POST",
    cache: "no-store",
    headers: {
      Cookie: roleCookie(role),
    },
    body: formData,
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  assert(
    response.status === expectedStatus,
    `POST ${pathname} as ${role} expected HTTP ${expectedStatus}, received ${response.status}: ${text}`
  )
  return { status: response.status, payload }
}

function documentUploadForm() {
  const formData = new FormData()
  formData.append(
    "file",
    new Blob(["%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"], { type: "application/pdf" }),
    "manual-flow-document.pdf"
  )
  formData.append("title", "Manual flow document upload")
  formData.append("category", "Kimlik")
  formData.append("flatNumber", "A-001")
  formData.append("retentionClass", "identity")
  return formData
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
      status: result.status,
      durationMs: Date.now() - started,
      passed: true,
    })
    return result.payload
  }

  await run("phase-status-1-11", "/api/site-management/phase-status", { role: "admin" }, (payload) => {
    const phases = payload.phases ?? []
    assert(phases.length === 15, "phase status must expose 15 phases")
    for (let phaseNumber = 1; phaseNumber <= 11; phaseNumber++) {
      const phase = phases.find((item) => item.phase === phaseNumber)
      assert(phase, `phase ${phaseNumber} is missing`)
      assert(
        ["complete", "ready_for_uat"].includes(phase.status),
        `phase ${phaseNumber} is not complete/ready: ${phase.status}`
      )
    }
  })

  await run("dashboard-manager", "/api/site-management/dashboard", { role: "manager" }, (payload) => {
    assert(payload.summary?.totalUnits > 0, "dashboard summary is empty")
  })
  await run("phase4-units", "/api/site-management/phase4?limit=25", { role: "manager" }, (payload) => {
    assert((payload.units ?? []).length > 0, "unit data is empty")
  })
  await run("users-admin", "/api/site-management/users?limit=20", { role: "admin" }, (payload) => {
    assert(payload.summary?.roleCount >= 4, "role coverage is missing")
  })
  await run("finance-accountant", "/api/site-management/finance?limit=12", { role: "accountant" }, (payload) => {
    assert(payload.summary?.openEntries > 0, "finance ledger is empty")
  })
  await run("phase7-payment-controls", "/api/site-management/payment-controls?limit=8", { role: "accountant" }, (payload) => {
    assert((payload.restrictionDecisions ?? []).length > 0, "payment restriction queue is empty")
  })
  await run("phase8-9-service-operations", "/api/site-management/tickets?limit=24", { role: "manager" }, (payload) => {
    assert((payload.catalog ?? []).length > 0, "service catalog is empty")
    assert((payload.orders ?? []).length > 0, "service order queue is empty")
    assert((payload.workforceTasks ?? []).length > 0, "workforce queue is empty")
  })
  await run("phase10-bookings", "/api/site-management/booking-operations", { role: "manager" }, (payload) => {
    assert(payload.providerMode === "simulation", "booking provider mode must stay simulation")
    assert((payload.readinessQueue ?? []).length > 0, "booking readiness queue is empty")
    assert((payload.accessHandoffs ?? []).length > 0, "access handoff queue is empty")
    assert((payload.depositSettlements ?? []).length > 0, "deposit settlement queue is empty")
  })
  await run("phase11-communications", "/api/site-management/communications", { role: "manager" }, (payload) => {
    assert(payload.providerMode === "simulation", "communications provider mode must stay simulation")
    assert((payload.threads ?? []).length > 0, "communication inbox is empty")
    assert((payload.lifecycle ?? []).length > 0, "guest lifecycle queue is empty")
    assert((payload.deliveries ?? []).length > 0, "delivery queue is empty")
  })
  await run("phase11-document-packets", "/api/site-management/document-packets", { role: "manager" }, (payload) => {
    assert(payload.providerMode === "simulation", "document packet provider mode must stay simulation")
    assert((payload.packets ?? []).length > 0, "document packet queue is empty")
    assert(payload.quality?.uploadEndpointReady === true, "document upload endpoint is not ready")
  })
  await run("phase11-document-upload-policy", "/api/site-management/document-uploads", { role: "owner" }, (payload) => {
    assert(payload.contractVersion === "phase-11-document-upload-storage.v1", "document upload policy contract mismatch")
    assert(payload.privateObjectStorage === true, "document upload storage must be private")
    assert(payload.humanReviewRequired === true, "document upload review gate is missing")
  })
  const uploadStarted = Date.now()
  const uploadResult = await fetchMultipart(baseUrl, "/api/site-management/document-uploads", {
    role: "owner",
    formData: documentUploadForm(),
  })
  assert(uploadResult.payload.upload?.reviewStatus === "pending_review", "document upload must be pending review")
  checks.push({
    name: "phase11-document-upload",
    pathname: "/api/site-management/document-uploads",
    role: "owner",
    status: uploadResult.status,
    durationMs: Date.now() - uploadStarted,
    passed: true,
  })

  for (const term of ["A-001", "SRV-2401", "BKG-501", "PACK-MOVEIN-01", "DLV-7005", "GX-FB-508", "ONBOARD-TENANT"]) {
    await run(`search-${term}`, `/api/site-management/search?q=${encodeURIComponent(term)}&limit=5`, { role: "manager" }, (payload) => {
      assert((payload.results ?? []).length > 0, `search returned no result for ${term}`)
    })
  }

  const actionChecks = [
    ["service-order-action", "service_orders.create.prepare", "service_orders", "SVC-HK-STD"],
    ["move-in-action", "reservations.move_in.prepare", "reservations", "BKG-501"],
    ["guest-lifecycle-action", "guest_lifecycle.message.prepare", "guest_lifecycle_events", "GX-FB-508"],
    ["delivery-retry-action", "notification.delivery.retry", "notification_deliveries", "DLV-7005"],
    ["document-packet-action", "document.packet.prepare", "document_packets", "PACK-MOVEIN-01"],
  ]

  for (const [name, actionType, entityTable, entityExternalId] of actionChecks) {
    await run(name, "/api/site-management/actions", {
      role: "manager",
      method: "POST",
      expectedStatus: 201,
      body: {
        actionType,
        entityTable,
        entityExternalId,
        title: `Manual milestone check: ${name}`,
        metadata: { harness: "manual-phase-01-11-flow" },
      },
    })
  }

  await run("tenant-finance-denied", "/api/site-management/finance?limit=4", {
    role: "tenant",
    expectedStatus: 403,
  })

  return checks
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

async function clickAndEnsureNoError(page, locator, label) {
  const button = locator.first()
  assert((await button.count()) > 0, `${label}: button not found`)
  await button.scrollIntoViewIfNeeded()
  await button.click()
  await page.waitForTimeout(900)
  const state = await button.getAttribute("data-state").catch(() => null)
  assert(state !== "error", `${label}: action button entered error state`)
}

async function runBrowserChecks(baseUrl, outDir, headed) {
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: !headed, timeout: 30_000 })
  const screenshotsDir = path.join(outDir, "screenshots")
  await fs.mkdir(screenshotsDir, { recursive: true })
  const results = []
  const desktop = { width: 1440, height: 900 }
  const mobile = { width: 390, height: 844 }

  async function runStep(name, { role, pathname, viewport = desktop, localized = true }, checks) {
    const context = await browser.newContext({ viewport })
    if (role) await context.addCookies([{ name: "access_profile_role", value: role, url: baseUrl }])
    const page = await context.newPage()
    const issues = []
    const serverErrors = []
    const notes = []
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

    try {
      const targetPath = localized ? localizedPath(pathname) : pathname
      await page.goto(apiUrl(baseUrl, targetPath), { waitUntil: "domcontentloaded", timeout: 30_000 })
      await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {})
      await page.waitForTimeout(400)
      for (const check of checks) notes.push(await check(page))
      await assertNoOverflow(page, name)
      const screenshotPath = path.join(screenshotsDir, `${name}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true })
      assert(issues.length === 0 && serverErrors.length === 0, `${name}: ${[...issues, ...serverErrors].join("; ")}`)
      results.push({
        name,
        role: role ?? "public",
        pathname,
        viewport,
        url: page.url(),
        h1: await page.locator("h1").first().innerText().catch(() => ""),
        notes,
        screenshotPath,
        passed: true,
      })
    } finally {
      await context.close()
    }
  }

  try {
    await runStep("01-public-home", { pathname: "/" }, [
      async (page) => {
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 })
        await page.locator('a[href*="/login"]').first().waitFor({ state: "visible", timeout: 10_000 })
        return "public home renders and exposes login path"
      },
    ])

    await runStep("02-login-local-profile", { pathname: "/login" }, [
      async (page) => {
        await page.getByRole("button", { name: /Personel/i }).last().click()
        await page.waitForURL(/\/dashboard/, { timeout: 12_000 })
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 })
        return "local staff profile login reaches dashboard"
      },
    ])

    await runStep("03-dashboard-command-search", { role: "manager", pathname: "/dashboard" }, [
      async (page) => {
        const input = page.getByLabel(/Daire, kisi, servis, borc, belge veya faz ara/i)
        const commandSearchTerms = [
          ["A-001", "A-001"],
          ["SRV-2401", "SRV-2401"],
          ["BKG-501", "Murat A."],
          ["PACK-MOVEIN-01", "PACK-MOVEIN-01"],
          ["GX-FB-508", "Thank you and private feedback"],
        ]
        for (const [term, visibleText] of commandSearchTerms) {
          await input.fill(term)
          await page.getByText(visibleText, { exact: false }).first().waitFor({ state: "visible", timeout: 10_000 })
        }
        return "global command search finds units, service tickets, bookings, and document packets"
      },
      async (page) => {
        await page.getByRole("button", { name: /Takipteki/i }).click()
        await page.getByText(/Index/i).first().waitFor({ state: "visible", timeout: 10_000 })
        return "attention filter remains usable"
      },
    ])

    await runStep("04-listings-search-detail", { role: "manager", pathname: "/dashboard/listings" }, [
      async (page) => {
        await page.locator('input[aria-label="Ara..."]').first().fill("A-001")
        await page.getByText("A-001").first().waitFor({ state: "visible", timeout: 10_000 })
        await page.locator('button[aria-label*="A-001"]').first().click()
        await page.getByRole("heading", { name: "A-001" }).waitFor({ state: "visible", timeout: 10_000 })
        return "unit search and unit detail panel work"
      },
    ])

    await runStep("05-users-directory-actions", { role: "admin", pathname: "/dashboard/users" }, [
      async (page) => {
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 })
        await page.locator("button").filter({ hasText: /yenile/i }).first().click()
        await page.waitForTimeout(500)
        await clickAndEnsureNoError(page, page.locator("button").filter({ hasText: /aktar/i }), "users export")
        return "people directory refresh and export action work"
      },
    ])

    await runStep("06-finance-phase7-actions", { role: "accountant", pathname: "/dashboard/finance" }, [
      async (page) => {
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 })
        await clickAndEnsureNoError(page, page.locator('button[aria-label*="Finans defteri"]'), "finance export")
        await clickAndEnsureNoError(page, page.locator('button[aria-label*="Mutabakat"]'), "payment reconciliation")
        return "finance ledger and phase 7 payment-control actions work"
      },
    ])

    await runStep("07-service-ticketing-actions", { role: "manager", pathname: "/dashboard/tickets" }, [
      async (page) => {
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 })
        await page.locator('[data-testid="data-table"] input').first().fill("SRV-2401")
        await page.getByText("SRV-2401").first().waitFor({ state: "visible", timeout: 10_000 })
        await clickAndEnsureNoError(page, page.getByLabel(/siparisi hazirla/i), "service order prepare")
        await clickAndEnsureNoError(page, page.getByLabel(/saha gorevini hazirla/i), "workforce task prepare")
        return "service catalog, ticket search, service order, and workforce actions work"
      },
    ])

    await runStep("08-booking-move-in-checkout-actions", { role: "manager", pathname: "/dashboard/calendar" }, [
      async (page) => {
        await page.getByRole("heading", { name: /Move-in readiness command board|Giriş hazırlığı komuta panosu/i }).waitFor({ state: "visible", timeout: 10_000 })
        await clickAndEnsureNoError(page, page.getByLabel(/Move-in hazirligini hazirla/i), "move-in readiness")
        await clickAndEnsureNoError(page, page.getByLabel(/Access handoff hazirla/i), "access handoff")
        await clickAndEnsureNoError(page, page.getByLabel(/Depozito kararini incele/i), "deposit settlement")
        return "move-in, access handoff, checkout/deposit actions work"
      },
    ])

    await runStep("09-communications-actions", { role: "manager", pathname: "/dashboard/communications" }, [
      async (page) => {
        await page.getByRole("heading", { name: /Iletisim Merkezi/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByRole("heading", { name: /Guest lifecycle experience/i }).waitFor({ state: "visible", timeout: 10_000 })
        await clickAndEnsureNoError(page, page.getByLabel(/Guest lifecycle mesajini hazirla/i), "guest lifecycle message")
        await clickAndEnsureNoError(page, page.getByLabel(/Toplu bildirim hazirla/i), "broadcast prepare")
        await clickAndEnsureNoError(page, page.getByLabel(/Cevap taslagi hazirla/i), "reply draft")
        await clickAndEnsureNoError(page, page.getByLabel(/Bildirim teslimini yeniden dene/i), "delivery retry")
        await clickAndEnsureNoError(page, page.getByLabel(/Mesaj sablonunu onaya hazirla/i), "template approval")
        return "communications, retry queue, and templates work"
      },
    ])

    await runStep("10-documents-packet-actions", { role: "manager", pathname: "/dashboard/documents" }, [
      async (page) => {
        await page.getByRole("heading", { name: /Document packet board/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.getByRole("heading", { name: /Secure document upload/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.waitForTimeout(2500)
        const uploadFile = path.join(localTempDir, "manual-browser-upload.pdf")
        await fs.mkdir(localTempDir, { recursive: true })
        await fs.writeFile(uploadFile, "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n")
        await page.locator('input[name="file"]').setInputFiles(uploadFile)
        await page.locator('input[name="title"]').fill("Browser flow document upload")
        await page.locator('input[name="flatNumber"]').fill("A-001")
        await clickAndEnsureNoError(page, page.getByRole("button", { name: /Upload for review/i }), "document upload")
        await page.getByText(/saved for review/i).waitFor({ state: "visible", timeout: 10_000 })
        await clickAndEnsureNoError(page, page.getByLabel(/Belge paketini hazirla/i), "document packet prepare")
        await clickAndEnsureNoError(page, page.locator('button[aria-label*="Belgeyi"]').first(), "document view/download")
        return "document upload, document packet, and document action buttons work"
      },
    ])

    await runStep("11-leads-compliance-reports-settings", { role: "manager", pathname: "/dashboard/leads" }, [
      async (page) => {
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 })
        await page.goto(apiUrl(baseUrl, localizedPath("/dashboard/compliance")), { waitUntil: "domcontentloaded", timeout: 60_000 })
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 })
        await page.goto(apiUrl(baseUrl, localizedPath("/dashboard/reports")), { waitUntil: "domcontentloaded", timeout: 60_000 })
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 })
        const exportButton = page.locator("button").filter({ hasText: /aktar/i }).first()
        if ((await exportButton.count()) > 0) await clickAndEnsureNoError(page, exportButton, "reports export")
        await page.goto(apiUrl(baseUrl, localizedPath("/dashboard/settings")), { waitUntil: "domcontentloaded", timeout: 60_000 })
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 })
        return "leads, compliance, reports, and settings pages render; report export works when available"
      },
    ])

    await runStep("12-role-scoped-mobile-tenant", { role: "tenant", pathname: "/dashboard/communications", viewport: mobile }, [
      async (page) => {
        await page.getByRole("heading", { name: /Iletisim Merkezi/i }).waitFor({ state: "visible", timeout: 10_000 })
        await page.goto(apiUrl(baseUrl, localizedPath("/dashboard/finance")), { waitUntil: "domcontentloaded", timeout: 30_000 })
        await page.getByText(/kapal/i).first().waitFor({ state: "visible", timeout: 10_000 })
        return "tenant mobile communications renders and tenant finance is blocked"
      },
    ])

    await runStep("13-role-scoped-staff-owner", { role: "staff", pathname: "/dashboard/tickets", viewport: mobile }, [
      async (page) => {
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 })
        await page.goto(apiUrl(baseUrl, localizedPath("/dashboard/calendar")), { waitUntil: "domcontentloaded", timeout: 30_000 })
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 })
        return "staff mobile can use assigned service and calendar views"
      },
    ])

    return results
  } finally {
    await browser.close()
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  await fs.mkdir(localTempDir, { recursive: true })
  process.env.TEMP = localTempDir
  process.env.TMP = localTempDir
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(localTempDir, "ms-playwright")
  process.env.NEXT_PUBLIC_ENABLE_ACCESS_PROFILES =
    process.env.NEXT_PUBLIC_ENABLE_ACCESS_PROFILES ?? "true"

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(args.outDir, `manual-phase-01-11-flow-${timestamp}`)
  await fs.mkdir(outDir, { recursive: true })

  console.log("Manual Phase 1-11 browser flow")
  console.log(`Base URL: ${args.baseUrl}`)
  console.log(`Results directory: ${outDir}`)

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    server: await waitForServer(args.baseUrl),
    apiChecks: await runApiChecks(args.baseUrl),
    browserSteps: await runBrowserChecks(args.baseUrl, outDir, args.headed),
    passed: true,
  }

  const reportPath = path.join(outDir, "manual-phase-01-11-flow-report.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8")

  const summaryLines = [
    `Manual Phase 1-11 flow generated at ${report.generatedAt}`,
    `Base URL: ${report.baseUrl}`,
    `API checks: ${report.apiChecks.length} passed`,
    `Browser steps: ${report.browserSteps.length} passed`,
    `Report: ${reportPath}`,
  ]
  await fs.writeFile(path.join(outDir, "summary.txt"), summaryLines.join("\n"), "utf8")
  console.log(summaryLines.join("\n"))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
