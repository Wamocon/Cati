import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")
const localTempDir = path.join(rootDir, ".tmp")

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3100",
    maxAttempts: 2,
    skipE2e: false,
    skipManualQa: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--base-url") args.baseUrl = argv[++i]
    else if (arg === "--max-attempts") args.maxAttempts = Number(argv[++i])
    else if (arg === "--skip-e2e") args.skipE2e = true
    else if (arg === "--skip-manual-qa") args.skipManualQa = true
  }

  if (!Number.isFinite(args.maxAttempts) || args.maxAttempts < 1) {
    throw new Error("--max-attempts must be a positive number")
  }

  return args
}

async function waitForUrl(url, timeoutMs = 60_000) {
  const started = Date.now()
  let lastError = ""

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" })
      if (response.ok || response.status < 500) return { status: response.status }
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error.message
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Timed out waiting for ${url}. Last error: ${lastError}`)
}

function commandGate(name, command, cwd, env = {}) {
  return { type: "command", name, command, cwd, env }
}

function builtinGate(name, fn) {
  return { type: "builtin", name, fn }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function roleCookie(role) {
  return `access_profile_role=${role}`
}

function apiUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl).toString()
}

async function fetchJson(baseUrl, pathname, { role = "admin", expectedStatus = 200 } = {}) {
  const response = await fetch(apiUrl(baseUrl, pathname), {
    cache: "no-store",
    headers: {
      Cookie: roleCookie(role),
    },
  })

  assert(
    response.status === expectedStatus,
    `GET ${pathname} as ${role} expected HTTP ${expectedStatus}, received ${response.status}`
  )

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

function validatePhase7Payload(payload, label) {
  assert(payload.contractVersion === "phase-7-payment-restriction.v1", `${label}: unexpected contract version`)
  assert(["supabase", "local-seed"].includes(payload.source), `${label}: invalid source`)
  assert(Date.parse(payload.generatedAt), `${label}: invalid generatedAt`)
  assert(payload.quality?.status !== "failed", `${label}: quality report failed`)
  assert(payload.summary.openPaymentPlans >= 0, `${label}: open payment-plan count must be non-negative`)
  assert(payload.summary.paymentPlansAtRisk >= 0, `${label}: at-risk payment-plan count must be non-negative`)
  assert(payload.summary.depositExposureCents >= 0, `${label}: deposit exposure must be non-negative`)
  assert(payload.summary.approvalQueue >= 0, `${label}: approval queue must be non-negative`)
  assert(Array.isArray(payload.paymentPlans), `${label}: paymentPlans must be an array`)
  assert(Array.isArray(payload.depositDecisions), `${label}: depositDecisions must be an array`)
  assert(Array.isArray(payload.restrictionDecisions), `${label}: restrictionDecisions must be an array`)
  assert(Array.isArray(payload.reconciliation), `${label}: reconciliation must be an array`)
  assert(
    payload.restrictionDecisions.every((item) => item.requiresHumanApproval === true),
    `${label}: every restriction decision must require human approval`
  )
}

function validatePhase89Payload(payload, label) {
  assert(payload.contractVersion === "phase-8-9-service-operations.v1", `${label}: unexpected service operations contract version`)
  assert(["supabase", "local-seed"].includes(payload.source), `${label}: invalid source`)
  assert(Date.parse(payload.generatedAt), `${label}: invalid generatedAt`)
  assert(payload.quality?.status !== "failed", `${label}: quality report failed`)
  assert(Array.isArray(payload.catalog), `${label}: catalog must be an array`)
  assert(Array.isArray(payload.orders), `${label}: orders must be an array`)
  assert(Array.isArray(payload.workforceTasks), `${label}: workforceTasks must be an array`)
  assert(Array.isArray(payload.tickets), `${label}: tickets must be an array`)
  assert(payload.summary.activeCatalogItems >= 6, `${label}: expected at least 6 active catalog items`)
  assert(payload.summary.serviceOrders > 0, `${label}: service order queue must not be empty`)
  assert(payload.summary.openWorkforceTasks > 0, `${label}: workforce task board must not be empty`)
  assert(payload.summary.fieldTeams >= 2, `${label}: expected multiple field teams`)
  assert(
    payload.catalog.every((item) => item.slaHours > 0 && item.basePriceTry >= 0),
    `${label}: every catalog item must expose SLA and non-negative price`
  )
  assert(
    payload.orders.every((order) => order.ticketId && order.nextAction),
    `${label}: every service order must link to a ticket and next action`
  )
  assert(
    payload.orders.every((order) => !(order.debtCheckStatus === "blocked" && order.taskCreated)),
    `${label}: blocked orders must not create dispatchable tasks`
  )
  assert(
    payload.workforceTasks.every((task) => Array.isArray(task.checklist) && task.checklist.length > 0),
    `${label}: every workforce task must have a checklist`
  )
}

async function verifyPhase7Api({ baseUrl }) {
  const adminPayload = await fetchJson(baseUrl, "/api/site-management/payment-controls?limit=8", {
    role: "admin",
  })
  validatePhase7Payload(adminPayload, "admin payment-controls API")

  const accountantPayload = await fetchJson(baseUrl, "/api/site-management/payment-controls?limit=8", {
    role: "accountant",
  })
  validatePhase7Payload(accountantPayload, "accountant payment-controls API")

  await fetchJson(baseUrl, "/api/site-management/payment-controls?limit=8", {
    role: "staff",
    expectedStatus: 403,
  })
  await fetchJson(baseUrl, "/api/site-management/payment-controls?limit=8", {
    role: "tenant",
    expectedStatus: 403,
  })

  return {
    source: adminPayload.source,
    quality: adminPayload.quality.status,
    paymentPlans: adminPayload.paymentPlans.length,
    deposits: adminPayload.depositDecisions.length,
    restrictions: adminPayload.restrictionDecisions.length,
    reconciliation: adminPayload.reconciliation.length,
    approvalQueue: adminPayload.summary.approvalQueue,
  }
}

async function verifyPhase89Api({ baseUrl }) {
  const managerPayload = await fetchJson(baseUrl, "/api/site-management/tickets?limit=24", {
    role: "manager",
  })
  validatePhase89Payload(managerPayload, "manager service operations API")

  const staffPayload = await fetchJson(baseUrl, "/api/site-management/tickets?limit=24", {
    role: "staff",
  })
  validatePhase89Payload(staffPayload, "staff service operations API")

  const tenantPayload = await fetchJson(baseUrl, "/api/site-management/tickets?limit=24", {
    role: "tenant",
  })
  validatePhase89Payload(tenantPayload, "tenant service operations API")

  await fetchJson(baseUrl, "/api/site-management/tickets?limit=24", {
    role: "accountant",
    expectedStatus: 403,
  })

  return {
    source: managerPayload.source,
    quality: managerPayload.quality.status,
    catalog: managerPayload.catalog.length,
    orders: managerPayload.orders.length,
    tasks: managerPayload.workforceTasks.length,
    blockedOrders: managerPayload.summary.blockedOrders,
    fieldTeams: managerPayload.summary.fieldTeams,
  }
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

async function runGate(gate, args, outDir) {
  if ((args.skipE2e && gate.name === "dashboard-e2e") || (args.skipManualQa && gate.name === "browser-audit")) {
    return { name: gate.name, skipped: true, attempts: [] }
  }

  const attempts = []
  for (let attempt = 1; attempt <= args.maxAttempts; attempt++) {
    const started = Date.now()
    const logFile = path.join(outDir, `${gate.name}-attempt-${attempt}.log`)
    console.log(`\n[${gate.name}] attempt ${attempt}/${args.maxAttempts}`)

    try {
      if (gate.type === "builtin") {
        const result = await gate.fn(args)
        attempts.push({
          attempt,
          passed: true,
          durationMs: Date.now() - started,
          result,
        })
        return { name: gate.name, passed: true, attempts }
      }

      const result = await runCommand(gate, logFile)
      attempts.push({
        attempt,
        passed: result.code === 0,
        code: result.code,
        durationMs: result.durationMs,
        logFile,
      })
      if (result.code === 0) return { name: gate.name, passed: true, attempts }
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
  process.env.NEXT_PUBLIC_ENABLE_ACCESS_PROFILES =
    process.env.NEXT_PUBLIC_ENABLE_ACCESS_PROFILES ?? "true"
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(rootDir, "quality", "results", `phase-06-09-harness-${timestamp}`)
  await fs.mkdir(outDir, { recursive: true })
  await fs.mkdir(localTempDir, { recursive: true })

  const gates = [
    builtinGate("dev-server-reachable", async ({ baseUrl }) => waitForUrl(baseUrl)),
    builtinGate("phase7-api-contract-rbac", verifyPhase7Api),
    builtinGate("phase8-9-service-operations-contract-rbac", verifyPhase89Api),
    commandGate("typecheck", "npm run typecheck", webDir),
    commandGate("lint", "npm run lint", webDir),
    commandGate("dashboard-e2e", "npm run test:e2e -- e2e/dashboard.spec.ts --project=chromium", webDir, {
      PLAYWRIGHT_REUSE_SERVER: "true",
    }),
    commandGate(
      "browser-audit",
      `node scripts/browser-audit.mjs --base-url ${args.baseUrl} --out-dir quality/browser-audit/phase-06-09`,
      rootDir
    ),
  ]

  console.log("Phase 6-9 harness")
  console.log(`Base URL: ${args.baseUrl}`)
  console.log(`Attempts per gate: ${args.maxAttempts}`)
  console.log(`Results directory: ${outDir}`)

  const gateResults = []
  for (const gate of gates) {
    const result = await runGate(gate, args, outDir)
    gateResults.push(result)
    if (!result.passed && !result.skipped) {
      console.error(`\nGate failed: ${gate.name}. Stopping harness.`)
      break
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scope: "Operational regression for active finance/payment and adjacent dashboard workflows",
    baseUrl: args.baseUrl,
    maxAttempts: args.maxAttempts,
    passed: gateResults.every((result) => result.passed || result.skipped),
    resultsDir: outDir,
    gateResults,
  }
  const reportPath = path.join(outDir, "phase-06-09-report.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8")

  console.log(`\nPhase 6-9 report: ${reportPath}`)
  console.log(report.passed ? "Phase 6-9 harness passed." : "Phase 6-9 harness failed.")
  if (!report.passed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
