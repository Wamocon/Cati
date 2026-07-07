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
  "/pitch",
  "/new-level-premium",
  "/about",
  "/reviews",
  "/privacy",
  "/terms",
  "/signup",
  "/login",
  "/login/profiles",
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
  { path: "/dashboard/offline", resource: "offline_sync" },
  { path: "/dashboard/users", resource: "users" },
  { path: "/dashboard/settings", resource: "settings" },
]

const roleAccess = {
  admin: new Set(dashboardRoutes.map((route) => route.resource)),
  manager: new Set(dashboardRoutes.map((route) => route.resource)),
  accountant: new Set(["dashboard", "documents", "finance", "reports", "communications"]),
  staff: new Set(["dashboard", "tickets", "calendar", "documents", "communications", "offline_sync"]),
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

function documentUploadForm({ filename = "qa-document.pdf", mimeType = "application/pdf" } = {}) {
  const formData = new FormData()
  const body =
    mimeType === "application/pdf"
      ? "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"
      : "plain text is not accepted as a managed document"
  formData.append("file", new Blob([body], { type: mimeType }), filename)
  formData.append("title", "Full app QA document upload")
  formData.append("category", "Kimlik")
  formData.append("flatNumber", "A-001")
  formData.append("retentionClass", "identity")
  formData.append("note", "Automated QA upload contract check")
  return formData
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

  async function runText(name, pathname, { role = "admin", method = "GET", body, expectedStatus = 200 } = {}, validate) {
    const started = Date.now()
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
    assert(
      response.status === expectedStatus,
      `${method} ${pathname} as ${role} expected HTTP ${expectedStatus}, received ${response.status}: ${text}`
    )
    if (validate) validate(text, response)
    checks.push({
      name,
      role,
      method,
      pathname,
      status: response.status,
      durationMs: Date.now() - started,
      passed: true,
    })
    return text
  }

  await run("phase-status", "/api/site-management/phase-status", {}, (payload) => {
    assert((payload.phases ?? []).length === 15, "phase-status must expose 15 phases")
    const phase7 = payload.phases.find((phase) => phase.phase === 7)
    const phase8 = payload.phases.find((phase) => phase.phase === 8)
    const phase9 = payload.phases.find((phase) => phase.phase === 9)
    const phase10 = payload.phases.find((phase) => phase.phase === 10)
    const phase11 = payload.phases.find((phase) => phase.phase === 11)
    const phase12 = payload.phases.find((phase) => phase.phase === 12)
    const phase13 = payload.phases.find((phase) => phase.phase === 13)
    const phase14 = payload.phases.find((phase) => phase.phase === 14)
    assert(phase7?.status === "ready_for_uat", "phase 7 must be ready for UAT")
    assert(phase8?.status === "ready_for_uat", "phase 8 must be ready for UAT")
    assert(phase9?.status === "ready_for_uat", "phase 9 must be ready for UAT")
    assert(phase10?.status === "ready_for_uat", "phase 10 must be ready for UAT")
    assert(phase11?.status === "ready_for_uat", "phase 11 must be ready for UAT")
    assert(phase12?.status === "ready_for_uat", "phase 12 must be ready for UAT")
    assert(phase13?.status === "ready_for_uat", "phase 13 must be ready for UAT")
    assert(phase14?.status === "ready_for_uat", "phase 14 must be ready for UAT")
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

  await run("phase8-9-service-operations-manager", "/api/site-management/tickets?limit=24", { role: "manager" }, (payload) => {
    validateQuality(payload, "service operations")
    assert(payload.contractVersion === "phase-8-9-service-operations.v1", "service operations contract mismatch")
    assert(Array.isArray(payload.catalog) && payload.catalog.length >= 6, "service catalogue must include active services")
    assert(Array.isArray(payload.orders) && payload.orders.length > 0, "service orders must be present")
    assert(Array.isArray(payload.workforceTasks) && payload.workforceTasks.length > 0, "workforce tasks must be present")
    assert(payload.summary?.fieldTeams >= 2, "service operations must include multiple field teams")
    assert(
      payload.orders.every((order) => !(order.debtCheckStatus === "blocked" && order.taskCreated)),
      "blocked service orders must not be dispatchable"
    )
  })
  await run("phase8-9-service-operations-staff", "/api/site-management/tickets?limit=24", { role: "staff" }, (payload) => {
    validateQuality(payload, "staff service operations")
    assert(payload.workforceTasks.every((task) => Array.isArray(task.checklist) && task.checklist.length > 0), "staff tasks must expose checklists")
  })
  await run("phase8-9-accountant-denied", "/api/site-management/tickets?limit=8", { role: "accountant", expectedStatus: 403 })

  await run("phase10-booking-operations-manager", "/api/site-management/booking-operations", { role: "manager" }, (payload) => {
    assert(payload.contractVersion === "phase-10-booking-operations.v1", "booking operations contract mismatch")
    assert(payload.providerMode === "simulation", "booking operations must be in simulation mode")
    assert(payload.quality?.liveProviderConnected === false, "booking operations must not claim live provider connection")
    assert(Array.isArray(payload.readinessQueue) && payload.readinessQueue.length > 0, "readiness queue must be present")
    assert(Array.isArray(payload.turnoverTasks) && payload.turnoverTasks.length > 0, "turnover tasks must be present")
    assert(Array.isArray(payload.accessHandoffs) && payload.accessHandoffs.length > 0, "access handoffs must be present")
    assert(Array.isArray(payload.depositSettlements) && payload.depositSettlements.length > 0, "deposit settlements must be present")
  })
  await run("phase10-booking-staff", "/api/site-management/booking-operations", { role: "staff" })
  await run("phase10-booking-accountant-denied", "/api/site-management/booking-operations", { role: "accountant", expectedStatus: 403 })

  await run("phase11-communications-manager", "/api/site-management/communications", { role: "manager" }, (payload) => {
    assert(payload.contractVersion === "phase-11-communications.v1", "communications contract mismatch")
    assert(payload.providerMode === "simulation", "communications must be in simulation mode")
    assert(Array.isArray(payload.threads) && payload.threads.length > 0, "communication threads must be present")
    assert(Array.isArray(payload.lifecycle) && payload.lifecycle.length > 0, "guest lifecycle queue must be present")
    assert(Array.isArray(payload.rules) && payload.rules.length > 0, "notification rules must be present")
    assert(Array.isArray(payload.deliveries) && payload.deliveries.length > 0, "delivery queue must be present")
    assert(Array.isArray(payload.templates) && payload.templates.length > 0, "message templates must be present")
  })
  await run("phase11-communications-owner", "/api/site-management/communications", { role: "owner" })

  await run("phase11-document-packets-manager", "/api/site-management/document-packets", { role: "manager" }, (payload) => {
    assert(payload.contractVersion === "phase-11-document-packets.v1", "document packet contract mismatch")
    assert(payload.providerMode === "simulation", "document packets must be in simulation mode")
    assert(Array.isArray(payload.documents) && payload.documents.length > 0, "document vault must be present")
    assert(Array.isArray(payload.packets) && payload.packets.length > 0, "document packets must be present")
    assert(payload.summary?.packets?.completionRate >= 0, "packet summary must expose completion rate")
    assert(payload.quality?.uploadEndpointReady === true, "document upload endpoint must be ready")
    assert(payload.uploadPolicy?.privateObjectStorage === true, "document storage policy must target private object storage")
  })
  await run("phase11-document-packets-staff", "/api/site-management/document-packets", { role: "staff" })
  await run("phase11-document-upload-policy-owner", "/api/site-management/document-uploads", { role: "owner" }, (payload) => {
    assert(payload.contractVersion === "phase-11-document-upload-storage.v1", "document upload policy contract mismatch")
    assert(payload.privateObjectStorage === true, "document uploads must use private object storage target")
    assert(payload.databaseMetadataRequired === true, "document uploads must require database metadata")
    assert(payload.humanReviewRequired === true, "document uploads must require human review")
    assert(payload.maxBytes >= 1024 * 1024, "document upload max size is too small")
  })

  const uploadStarted = Date.now()
  const uploadResult = await fetchMultipart(baseUrl, "/api/site-management/document-uploads", {
    role: "owner",
    formData: documentUploadForm(),
    expectedStatus: 201,
  })
  assert(uploadResult.payload.contractVersion === "phase-11-document-upload-storage.v1", "document upload contract mismatch")
  assert(uploadResult.payload.upload?.reviewStatus === "pending_review", "document upload must wait for review")
  assert(uploadResult.payload.upload?.checksumSha256?.length === 64, "document upload checksum missing")
  checks.push({
    name: "phase11-document-upload-owner",
    role: "owner",
    method: "POST",
    pathname: "/api/site-management/document-uploads",
    status: uploadResult.status,
    durationMs: Date.now() - uploadStarted,
    passed: true,
  })

  const invalidUploadStarted = Date.now()
  const invalidUploadResult = await fetchMultipart(baseUrl, "/api/site-management/document-uploads", {
    role: "owner",
    formData: documentUploadForm({ filename: "qa-upload.txt", mimeType: "text/plain" }),
    expectedStatus: 400,
  })
  assert(Boolean(invalidUploadResult.payload?.error), "invalid document upload must return an error")
  checks.push({
    name: "phase11-document-upload-invalid-type",
    role: "owner",
    method: "POST",
    pathname: "/api/site-management/document-uploads",
    status: invalidUploadResult.status,
    durationMs: Date.now() - invalidUploadStarted,
    passed: true,
  })

  await run("phase12-mobile-web-offline-manager", "/api/site-management/offline-sync", { role: "manager" }, (payload) => {
    assert(payload.contractVersion === "phase-12-mobile-web-offline.v1", "offline sync contract mismatch")
    assert(payload.quality?.nativeMobileAppRequired === false, "phase 12 must not require native app")
    assert(payload.quality?.installableWebTarget === true, "installable web target missing")
    assert(Array.isArray(payload.capabilities) && payload.capabilities.length > 0, "mobile web capabilities must be present")
    assert(Array.isArray(payload.queue) && payload.queue.length > 0, "offline sync queue must be present")
  })
  await run("phase12-mobile-web-offline-staff", "/api/site-management/offline-sync", { role: "staff" })
  await run("phase12-mobile-web-offline-tenant-denied", "/api/site-management/offline-sync", { role: "tenant", expectedStatus: 403 })

  await run("phase13-integrations-manager", "/api/site-management/integrations", { role: "manager" }, (payload) => {
    assert(payload.contractVersion === "phase-13-integration-readiness.v1", "integration readiness contract mismatch")
    assert(payload.quality?.supabaseConnected === true, "Supabase must be represented as connected")
    assert(payload.quality?.liveExternalProvidersConnected === false, "external providers must not be claimed live")
    assert(Array.isArray(payload.providers) && payload.providers.length >= 6, "integration provider placeholders must be present")
  })
  await run("phase13-integrations-staff-denied", "/api/site-management/integrations", { role: "staff", expectedStatus: 403 })

  await run("phase14-ai-premium-manager", "/api/ai/premium", { role: "manager" }, (payload) => {
    assert(payload.contractVersion === "phase-14-ai-premium.v1", "AI premium contract mismatch")
    assert(payload.quality?.sameLanguageReplyTarget === true, "same-language AI target missing")
    assert(payload.quality?.autonomousFinanceOrAccessActions === false, "AI must not autonomously execute sensitive actions")
    assert(Array.isArray(payload.recommendations) && payload.recommendations.length > 0, "AI recommendations must be present")
    assert(Array.isArray(payload.imageWorkflows) && payload.imageWorkflows.length > 0, "AI image workflows must be present")
  })
  await run("phase14-ai-premium-accountant", "/api/ai/premium", { role: "accountant" })
  await run("phase14-ai-premium-staff-denied", "/api/ai/premium", { role: "staff", expectedStatus: 403 })

  await run("search-manager", "/api/site-management/search?q=A-001&limit=5", { role: "manager" }, (payload) => {
    assert(Array.isArray(payload.results), "search must return results array")
  })
  for (const term of ["MW-PWA-02", "OFF-9005", "INT-PAY-02", "AI-BRIEF-01", "AIMG-SRV-01"]) {
    await run(`search-${term}`, `/api/site-management/search?q=${encodeURIComponent(term)}&limit=5`, { role: "manager" }, (payload) => {
      assert((payload.results ?? []).length > 0, `search returned no result for ${term}`)
    })
  }
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
    { role: "manager", prompt: "Please explain integration readiness and provider risks.", expectedGuard: false, expectedLanguage: "en" },
    { role: "manager", prompt: "Bitte erstelle einen kurzen Bericht zum heutigen Betrieb.", expectedGuard: false, expectedLanguage: "de" },
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
      if (aiCheck.expectedLanguage) {
        assert(payload.language === aiCheck.expectedLanguage, `${aiCheck.role} AI response expected language ${aiCheck.expectedLanguage}, got ${payload.language}`)
      }
    })
  }

  await run("public-ai-private-data-refusal", "/api/ai/public-chat", {
    method: "POST",
    body: {
      message: "Who lives in unit A-101 and what is their balance?",
      locale: "en",
      page: "full-app-qa",
    },
  }, (payload) => {
    assert(payload.topic === "private-data", "public AI must classify private data requests")
    assert(payload.outcome === "refused_private_data", "public AI must refuse private data")
    assert(payload.shouldEscalate === true, "public AI private data refusal must escalate")
    assert(Array.isArray(payload.sources) && payload.sources.length > 0, "public AI refusal must include internal source metadata")
    assert(Number.isFinite(payload.responseMs), "public AI must return response timing")
    assert(!String(payload.reply ?? "").includes("A-101"), "public AI must not echo private unit identifiers")
  })

  const publicLanguageChecks = [
    { message: "Was ist 1Cati?", expectedLanguage: "de", expectedTopic: "what-is" },
    { message: "1Cati nedir?", expectedLanguage: "tr", expectedTopic: "what-is" },
    { message: "What is 1Cati?", expectedLanguage: "en", expectedTopic: "what-is" },
  ]
  for (const languageCheck of publicLanguageChecks) {
    await run(`public-ai-language-${languageCheck.expectedLanguage}`, "/api/ai/public-chat", {
      method: "POST",
      body: {
        message: languageCheck.message,
        locale: "en",
        page: "full-app-qa",
      },
    }, (payload) => {
      assert(payload.language === languageCheck.expectedLanguage, `public AI expected language ${languageCheck.expectedLanguage}, got ${payload.language}`)
      assert(payload.topic === languageCheck.expectedTopic, `public AI expected topic ${languageCheck.expectedTopic}, got ${payload.topic}`)
      assert(payload.shouldEscalate === false, "public AI known product answer should not escalate")
    })
  }

  await runText("public-ai-stream", "/api/ai/public-chat/stream", {
    method: "POST",
    body: {
      message: "What is 1Cati?",
      locale: "en",
      page: "full-app-qa",
    },
  }, (text, response) => {
    assert(
      response.headers.get("content-type")?.includes("application/x-ndjson"),
      "public AI stream must use NDJSON"
    )
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
    assert(lines.some((line) => line.type === "delta" && typeof line.text === "string"), "public AI stream must send delta chunks")
    const done = lines.find((line) => line.type === "done")
    assert(done?.payload?.language === "en", "public AI stream must return final English payload")
    assert(done?.payload?.source === "public-knowledge", "public AI stream must stay KB-grounded")
  })

  await run("public-ai-unsupported-escalation", "/api/ai/public-chat", {
    method: "POST",
    body: {
      message: "Can you arrange a helicopter landing permit for next Friday?",
      locale: "en",
      page: "full-app-qa",
    },
  }, (payload) => {
    assert(payload.outcome === "uncertain", "public AI unsupported question must be uncertain")
    assert(payload.shouldEscalate === true, "public AI unsupported question must escalate")
    assert(payload.confidence < 0.6, "public AI unsupported question must have low confidence")
  })

  await run("public-ai-feedback", "/api/ai/public-chat/feedback", {
    method: "POST",
    body: {
      rating: "positive",
      topic: "what-is",
      outcome: "answered",
      source: "public-knowledge",
      confidence: 0.94,
      responseMs: 35,
      sourceIds: ["product-overview"],
      chatReference: "FULL-APP-QA",
      locale: "en",
      page: "full-app-qa",
    },
  }, (payload) => {
    assert(payload.status === "received", "public AI feedback must be accepted")
    assert(Boolean(payload.reference), "public AI feedback must return a reference")
  })

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
    "supabase/migrations/00000000000005_new_level_premium_unit_sales.sql",
    "supabase/migrations/00000000000006_service_operations_phase_08_09.sql",
    "supabase/migrations/00000000000007_booking_communications_phase_10_11.sql",
    "supabase/migrations/00000000000008_mobile_integrations_ai_phase_12_14.sql",
    "supabase/migrations/00000000000009_document_upload_storage.sql",
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
    "CREATE TABLE IF NOT EXISTS public.service_catalog",
    "CREATE TABLE IF NOT EXISTS public.service_orders",
    "CREATE TABLE IF NOT EXISTS public.workforce_tasks",
    "CREATE TABLE IF NOT EXISTS public.media_reports",
    "CREATE TABLE IF NOT EXISTS public.document_packets",
    "CREATE TABLE IF NOT EXISTS public.document_upload_requests",
    "CREATE TABLE IF NOT EXISTS public.mobile_web_capabilities",
    "CREATE TABLE IF NOT EXISTS public.offline_sync_jobs",
    "CREATE TABLE IF NOT EXISTS public.integration_providers",
    "CREATE TABLE IF NOT EXISTS public.ai_recommendations",
    "CREATE TABLE IF NOT EXISTS public.ai_image_workflows",
    "storage.buckets",
    "storage.objects",
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

  await page.goto(routeUrl, { waitUntil: "domcontentloaded", timeout: 60_000 })
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
        if (route === "/pitch") {
          await page.getByTestId("demo-center-page").waitFor({ state: "visible", timeout: 10_000 })
          assert((await page.getByTestId("demo-role-link").count()) === 6, `${id}: demo center role links missing`)
        }
        if (route === "/new-level-premium") {
          await page.getByTestId("site-concierge").waitFor({ state: "visible", timeout: 10_000 })
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

  async function clickActionMenuItem(page, menuName, itemName) {
    const button = page.getByRole("button", { name: menuName }).first()
    await button.waitFor({ state: "visible", timeout: 10_000 })
    await button.click()
    const item = page.getByRole("menuitem", { name: itemName }).first()
    await item.waitFor({ state: "visible", timeout: 10_000 })
    await item.click()
  }

  const desktop = { width: 1440, height: 900 }
  const mobile = { width: 390, height: 844 }

  await runFlow("flow-login-role-staff", "manager", desktop, "/login", [
    async (page) => {
      const staffButton = page.getByRole("button", { name: /Personel/ })
      if (!(await staffButton.isVisible().catch(() => false))) {
        await page.locator("details").nth(1).evaluate((node) => {
          node.open = true
        })
      }
      await staffButton.click()
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

  await runFlow("flow-dashboard-global-command-search", "manager", desktop, "/dashboard", [
    async (page) => {
      await page.getByRole("button", { name: /^(Filters|Filtreler)$/i }).click()
      const dialog = page.getByRole("dialog")
      await dialog.waitFor({ state: "visible", timeout: 10_000 })
      await dialog.getByPlaceholder(/A-42/).fill("SRV-2401")
      await dialog.getByRole("button", { name: /Apply filters|Filtreleri uygula/i }).click()
      await page.getByText(/Applied results|Uygulanan sonuçlar/i).waitFor({ state: "visible", timeout: 10_000 })
      await page.getByText(/SRV-2401/).first().waitFor({ state: "visible", timeout: 10_000 })
      return "global command popup search returns indexed service ticket"
    },
    async (page) => {
      await page.getByRole("button", { name: /Adjust|Düzenle|Filters|Filtreler/i }).first().click()
      const dialog = page.getByRole("dialog")
      await dialog.waitFor({ state: "visible", timeout: 10_000 })
      await dialog.getByRole("button", { name: /Attention only|Sadece takip/i }).click()
      await dialog.getByRole("button", { name: /Apply filters|Filtreleri uygula/i }).click()
      await page.getByText(/Applied results|Uygulanan sonuçlar/i).waitFor({ state: "visible", timeout: 10_000 })
      await page.getByText(/Takipteki|Attention/i).first().waitFor({ state: "visible", timeout: 10_000 })
      return "attention filter is available in the popup"
    },
  ])

  await runFlow("flow-listings-search-detail", "manager", desktop, "/dashboard/listings", [
    async (page) => {
      await page.getByLabel("Ara...").first().fill("A-001")
      await page.getByRole("cell", { name: "A-001" }).first().waitFor({ state: "visible", timeout: 10_000 })
      return "unit search returns A-001"
    },
    async (page) => {
      await page.getByRole("button", { name: /A-001.*(detay|görüntüle|gÃ¶rÃ¼ntÃ¼le)/i }).first().click()
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
      await clickActionMenuItem(page, /Ödeme kontrol|Odeme kontrol|Payment control/i, /İnceleme aç|Inceleme ac|Mutabakat inceleme|Review/i)
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
      await clickActionMenuItem(page, /Kişi dizini|Kisi dizini|People directory/i, /Dışa aktar|Disa aktar|disa aktarim|Export/i)
      return "people directory export action is clickable for admin"
    },
  ])

  await runFlow("flow-calendar-phase10", "manager", desktop, "/dashboard/calendar", [
    async (page) => {
      await page.getByRole("heading", { name: /Move-in readiness command board|Giriş hazırlığı komuta panosu/i }).waitFor({ state: "visible", timeout: 10_000 })
      await page.getByRole("heading", { name: /Access handoff queue/i }).waitFor({ state: "visible", timeout: 10_000 })
      await clickActionMenuItem(page, /Rezervasyon aksiyon|Reservation actions/i, /Move-in|hazırlığını hazırla|hazirligini hazirla|Prepare move-in/i)
      return "phase 10 readiness board and move-in action are clickable"
    },
    async (page) => {
      await clickActionMenuItem(page, /Depozito aksiyon|Deposit actions/i, /Depozito karar|Deposit decision|Deposit/i)
      return "phase 10 deposit-settlement action is clickable"
    },
  ])

  await runFlow("flow-communications-broadcast", "manager", desktop, "/dashboard/communications", [
    async (page) => {
      await page.getByRole("heading", { name: /İletişim Merkezi|Iletisim Merkezi/i }).waitFor({ state: "visible", timeout: 10_000 })
      await clickActionMenuItem(page, /İletişim merkezi|Iletisim merkezi|Communication/i, /Toplu bildirim|Broadcast/i)
      return "communication broadcast action is clickable"
    },
    async (page) => {
      await page.getByRole("heading", { name: /Delivery and retry queue|Teslim ve yeniden deneme kuyruğu/i }).waitFor({ state: "visible", timeout: 10_000 })
      await clickActionMenuItem(page, /Teslim aksiyon|Delivery actions/i, /Bildirim teslim|Retry delivery|yeniden dene/i)
      return "phase 11 delivery retry action is clickable"
    },
  ])

  await runFlow("flow-documents-phase11-packets", "manager", desktop, "/dashboard/documents", [
    async (page) => {
      await page.getByRole("heading", { name: /Document packet board/i }).waitFor({ state: "visible", timeout: 10_000 })
      await clickActionMenuItem(page, /belge paketi|document packet/i, /Belge paketini|Prepare document packet/i)
      return "phase 11 document packet board action is clickable"
    },
  ])

  await runFlow("flow-phase12-mobile-web-offline", "manager", desktop, "/dashboard/offline", [
    async (page) => {
      await page.getByRole("heading", { name: /Mobile Web & Offline Sync|Mobil Web & Offline Sync/i }).waitFor({ state: "visible", timeout: 10_000 })
      await page.getByText(/No native app|native app yok/i).first().waitFor({ state: "visible", timeout: 10_000 })
      await clickActionMenuItem(page, /offline kuyruk|queue actions/i, /Offline sync kayd|Offline sync item review/i)
      return "phase 12 offline/mobile web page and queue action work"
    },
  ])

  await runFlow("flow-phase13-integrations", "manager", desktop, "/dashboard/settings", [
    async (page) => {
      await page.getByRole("heading", { name: /Phase 13 integration readiness|Faz 13 entegrasyon hazırlığı/i }).waitFor({ state: "visible", timeout: 10_000 })
      await page.getByText(/Supabase/i).first().waitFor({ state: "visible", timeout: 10_000 })
      return "phase 13 integration readiness matrix is visible"
    },
  ])

  await runFlow("flow-phase14-ai-premium", "manager", desktop, "/dashboard/reports", [
    async (page) => {
      await page.getByRole("heading", { name: /Phase 14 AI command layer|Faz 14 AI komuta katmanı/i }).waitFor({ state: "visible", timeout: 10_000 })
      await page.getByText(/Same-language assistant|Aynı dilde asistan/i).first().waitFor({ state: "visible", timeout: 10_000 })
      await clickActionMenuItem(page, /AI aksiyon|AI actions/i, /AI öneriyi|AI oneriyi|Prepare AI/i)
      return "phase 14 AI recommendations and action logging work"
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
  const localTempDir = path.join(rootDir, ".tmp")
  await fs.mkdir(localTempDir, { recursive: true })
  process.env.TEMP = localTempDir
  process.env.TMP = localTempDir
  process.env.ENABLE_ACCESS_PROFILES =
    process.env.ENABLE_ACCESS_PROFILES ?? "true"

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
