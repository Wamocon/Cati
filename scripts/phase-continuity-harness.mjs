import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

const expectedPhaseStatuses = new Map([
  [1, "complete"],
  [2, "complete"],
  [3, "complete"],
  [4, "complete"],
  [5, "ready_for_uat"],
  [6, "ready_for_uat"],
  [7, "ready_for_uat"],
  [8, "ready_for_uat"],
  [9, "ready_for_uat"],
  [10, "planned"],
  [11, "planned"],
  [12, "planned"],
  [13, "planned"],
  [14, "planned"],
  [15, "planned"],
])

const phaseModuleMap = [
  { phase: 1, routes: ["/tr/dashboard"], resources: ["dashboard"], purpose: "Scope, benchmark and decision control" },
  { phase: 2, routes: ["/tr/dashboard"], resources: ["dashboard"], purpose: "UX, navigation and role-based dashboard" },
  { phase: 3, routes: ["/tr/dashboard/settings"], resources: ["settings"], purpose: "Auth, RBAC, audit and platform controls" },
  { phase: 4, routes: ["/tr/dashboard/listings"], resources: ["listings"], purpose: "Site, block, floor, unit and import quality" },
  { phase: 5, routes: ["/tr/dashboard/users"], resources: ["users"], purpose: "People, owners, tenants, staff and role coverage" },
  { phase: 6, routes: ["/tr/dashboard/finance"], resources: ["finance"], purpose: "Core immutable finance ledger" },
  { phase: 7, routes: ["/tr/dashboard/finance", "/tr/dashboard/compliance"], resources: ["finance", "eids_compliance"], purpose: "Payments, deposits, reconciliation and debt restrictions" },
  { phase: 8, routes: ["/tr/dashboard/tickets"], resources: ["tickets"], purpose: "Service catalogue and service-order flow" },
  { phase: 9, routes: ["/tr/dashboard/tickets"], resources: ["tickets"], purpose: "Tasks, field team, SLA and media proof" },
  { phase: 10, routes: ["/tr/dashboard/calendar"], resources: ["calendar"], purpose: "Reservation, move-in and checkout" },
  { phase: 11, routes: ["/tr/dashboard/communications", "/tr/dashboard/documents"], resources: ["communications", "documents"], purpose: "Communication, notification and document center" },
  { phase: 12, routes: ["/tr/dashboard"], resources: ["dashboard", "offline_sync"], purpose: "Mobile PWA and installable user experience" },
  { phase: 13, routes: ["/tr/dashboard/settings"], resources: ["settings"], purpose: "External integrations and retry health" },
  { phase: 14, routes: ["/tr/dashboard/reports"], resources: ["reports"], purpose: "AI premium layer and analytics" },
  { phase: 15, routes: ["/tr/dashboard/reports", "/tr/dashboard/settings"], resources: ["reports", "settings"], purpose: "QA, security, performance, UAT and launch" },
]

const roleAiChecks = [
  {
    role: "admin",
    prompt: "What are the next phases and integration risks?",
    expectedSourceNot: "rbac-guard",
  },
  {
    role: "manager",
    prompt: "Create today's operations plan by SLA and service risk.",
    expectedSourceNot: "rbac-guard",
  },
  {
    role: "accountant",
    prompt: "Summarize collections and open finance work.",
    expectedSourceNot: "rbac-guard",
  },
  {
    role: "staff",
    prompt: "Which service tickets are blocked by debt and what should I do on site?",
    expectedSourceNot: "rbac-guard",
    mustNotContain: ["Toplam açık borç", "Toplam aÃ§Ä±k borÃ§"],
  },
  {
    role: "owner",
    prompt: "Show my reservation, documents and open service status.",
    expectedSourceNot: "rbac-guard",
    mustNotContain: ["769"],
  },
  {
    role: "tenant",
    prompt: "Show my open service requests.",
    expectedSourceNot: "rbac-guard",
    mustNotContain: ["Toplam açık borç", "769"],
  },
  {
    role: "tenant",
    prompt: "Show all finance ledger and all user roles.",
    expectedSource: "rbac-guard",
    mustContain: ["kapalı"],
  },
]

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3104",
    outDir: path.join(rootDir, "quality", "results"),
  }

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base-url") args.baseUrl = argv[++i]
    else if (argv[i] === "--out-dir") args.outDir = path.resolve(argv[++i])
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

async function fetchText(baseUrl, pathname, role = "admin") {
  const response = await fetch(apiUrl(baseUrl, pathname), {
    cache: "no-store",
    headers: { Cookie: roleCookie(role) },
  })
  assert(response.status === 200, `${pathname} as ${role} expected HTTP 200, received ${response.status}`)
  return response.text()
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
  assert(
    response.status === expectedStatus,
    `${method} ${pathname} as ${role} expected HTTP ${expectedStatus}, received ${response.status}`
  )
  return response.json()
}

async function checkPhaseStatus(baseUrl) {
  const payload = await fetchJson(baseUrl, "/api/site-management/phase-status")
  const phases = payload.phases ?? []
  assert(phases.length === 15, `Expected 15 phases, received ${phases.length}`)

  const failures = []
  for (const phase of phases) {
    const expected = expectedPhaseStatuses.get(phase.phase)
    if (phase.status !== expected) failures.push(`Phase ${phase.phase}: expected ${expected}, received ${phase.status}`)
    if (!phase.title || !phase.businessOutcome || !phase.userGuide) {
      failures.push(`Phase ${phase.phase}: missing title, outcome or guide`)
    }
    if (!Array.isArray(phase.evidence) || phase.evidence.length < 3) {
      failures.push(`Phase ${phase.phase}: expected at least 3 evidence items`)
    }
  }
  assert(failures.length === 0, failures.join("\n"))

  return {
    total: phases.length,
    statuses: Object.fromEntries(
      [...expectedPhaseStatuses.values()].map((status) => [
        status,
        phases.filter((phase) => phase.status === status).length,
      ])
    ),
  }
}

async function checkRoutes(baseUrl) {
  const checkedRoutes = new Set()
  for (const phase of phaseModuleMap) {
    for (const route of phase.routes) {
      if (checkedRoutes.has(route)) continue
      await fetchText(baseUrl, route, "admin")
      checkedRoutes.add(route)
    }
  }

  return {
    routes: [...checkedRoutes],
    phaseModuleMap,
  }
}

async function checkAiRoles(baseUrl) {
  const results = []
  for (const check of roleAiChecks) {
    const payload = await fetchJson(baseUrl, "/api/ai/chat", {
      role: check.role,
      method: "POST",
      body: { message: check.prompt },
    })
    if (check.expectedSource) {
      assert(payload.source === check.expectedSource, `${check.role} expected source ${check.expectedSource}, received ${payload.source}`)
    }
    if (check.expectedSourceNot) {
      assert(payload.source !== check.expectedSourceNot, `${check.role} should not receive source ${check.expectedSourceNot}`)
    }
    assert(payload.role === check.role, `${check.role} response did not echo active role`)
    assert(payload.roleProfile?.role === check.role, `${check.role} response missing matching role profile`)
    const reply = String(payload.reply ?? "")
    for (const expected of check.mustContain ?? []) {
      assert(reply.toLocaleLowerCase("tr-TR").includes(expected.toLocaleLowerCase("tr-TR")), `${check.role} reply missing ${expected}`)
    }
    for (const forbidden of check.mustNotContain ?? []) {
      assert(!reply.includes(forbidden), `${check.role} reply leaked forbidden text ${forbidden}`)
    }
    results.push({
      role: check.role,
      source: payload.source,
      resource: payload.resource ?? null,
      profile: payload.roleProfile?.label ?? null,
    })
  }
  return results
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(args.outDir, `phase-continuity-${timestamp}`)
  await fs.mkdir(outDir, { recursive: true })

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    phaseStatus: await checkPhaseStatus(args.baseUrl),
    routes: await checkRoutes(args.baseUrl),
    aiRoles: await checkAiRoles(args.baseUrl),
    passed: true,
  }

  const reportPath = path.join(outDir, "phase-continuity-report.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8")
  await fs.writeFile(
    path.join(outDir, "summary.txt"),
    [
      `Phase continuity harness generated at ${report.generatedAt}`,
      `Base URL: ${report.baseUrl}`,
      `Phases: ${report.phaseStatus.total}`,
      `Routes checked: ${report.routes.routes.length}`,
      `AI role checks: ${report.aiRoles.length}`,
      `Passed: ${report.passed}`,
      `Report: ${reportPath}`,
    ].join("\n"),
    "utf8"
  )

  console.log(`Phase continuity report: ${reportPath}`)
  console.log("Phase continuity harness passed.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
