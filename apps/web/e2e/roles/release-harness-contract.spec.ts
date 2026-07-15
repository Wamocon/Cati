import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
)
const webRoot = path.join(repoRoot, "apps", "web")

function readRepo(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
}

function readWeb(relativePath: string) {
  return fs.readFileSync(path.join(webRoot, relativePath), "utf8")
}

function phaseBlock(source: string, phaseNumber: number) {
  const start = source.indexOf(`phase: ${phaseNumber},`)
  expect(start, `phase ${phaseNumber} must exist`).toBeGreaterThanOrEqual(0)
  const next = source.indexOf(`phase: ${phaseNumber + 1},`, start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

test("release separates fail-closed production auth from synthetic role QA", () => {
  const phaseHarness = readRepo("scripts/phase-harness.mjs")
  const releaseHarness = readRepo("scripts/release-demo-harness.mjs")
  const productionSpec = readWeb(
    "e2e/auth/access-profile-production-functional.spec.ts"
  )
  const accessProfileRoute = readWeb("app/api/access-profile/route.ts")
  const playwrightConfig = readWeb("playwright.config.ts")

  expect(phaseHarness).toContain("production-access-profile-security")
  expect(phaseHarness).toContain('npmScript("test:e2e:production-access")')
  expect(phaseHarness).toContain('PLAYWRIGHT_SERVER_MODE: "production"')
  expect(phaseHarness).toContain("synthetic-release-demo")
  expect(phaseHarness).toContain("node scripts/release-demo-harness.mjs")
  expect(phaseHarness).not.toContain(
    'npmScript("test:e2e"), { PLAYWRIGHT_SERVER_MODE: "production" }'
  )

  expect(releaseHarness).toContain('ENABLE_ACCESS_PROFILES: "true"')
  expect(releaseHarness).toContain('NEXT_PUBLIC_SUPABASE_URL: ""')
  expect(releaseHarness).toContain('SUPABASE_SERVICE_ROLE_KEY: ""')
  expect(releaseHarness).toContain('name: "synthetic-playwright"')
  expect(releaseHarness).toContain("validatedLoopbackUrl")
  expect(releaseHarness).toContain("assertPortInitiallyFree")
  expect(releaseHarness).toContain("CATI_RELEASE_HARNESS_NONCE")
  expect(releaseHarness).toContain("x-cati-qa-attestation")
  expect(releaseHarness).toContain(
    "Owned synthetic QA server exited before readiness"
  )
  expect(releaseHarness).toContain("productionReady: false")
  expect(releaseHarness).toContain("releaseEligible: false")
  expect(accessProfileRoute).toContain("CATI_RELEASE_HARNESS_NONCE")
  expect(accessProfileRoute).toContain("X-Cati-QA-Attestation")
  expect(playwrightConfig).toContain(
    "Production access-profile probes must use an owned loopback server"
  )
  expect(playwrightConfig).toContain(
    "Production access-profile probes may not reuse an existing server"
  )
  expect(productionSpec).toContain("businessRoles")
  expect(productionSpec).toContain("every role")
  expect(productionSpec).toContain("forged access-profile cookie")
  expect(productionSpec).toContain("/login/profiles")
  expect(productionSpec).toContain("toHaveCount(0)")
})

test("synthetic role audit preserves distinct 78 plus 78 evidence", () => {
  const releaseHarness = readRepo("scripts/release-demo-harness.mjs")

  expect(releaseHarness).toContain("const ROLE_COUNT = 6")
  expect(releaseHarness).toContain("const ROUTE_COUNT = 13")
  expect(releaseHarness).toContain("const VIEWPORT_COUNT = 2")
  expect(releaseHarness).toContain(
    "const EXPECTED_PER_VIEWPORT = ROLE_COUNT * ROUTE_COUNT"
  )
  expect(releaseHarness).toContain(
    "const EXPECTED_TOTAL = EXPECTED_PER_VIEWPORT * VIEWPORT_COUNT"
  )
  expect(releaseHarness).toContain("const EXPECTED_PLAYWRIGHT_TOTAL = 762")
  expect(releaseHarness).toContain(
    "const EXPECTED_PLAYWRIGHT_PER_PROJECT = EXPECTED_PLAYWRIGHT_TOTAL / 2"
  )
  expect(releaseHarness).toContain('runRoleAudit("desktop"')
  expect(releaseHarness).toContain('runRoleAudit("mobile"')
  expect(releaseHarness).toContain("`role-page-${profile}`")
  expect(releaseHarness).toContain("checked === EXPECTED_TOTAL")
  expect(releaseHarness).toContain("failures === 0")
  expect(releaseHarness).toContain("parsePlaywrightReport")
  expect(releaseHarness).toContain(
    "manifest.tests.length === EXPECTED_PLAYWRIGHT_TOTAL"
  )
  expect(releaseHarness).toContain(
    "Only the production-only access-profile probe may be skipped"
  )
  expect(releaseHarness).toContain("Full-app machine report is not passing")
  expect(releaseHarness).toContain("navigation and view isolation")
  expect(releaseHarness).toContain("exhaustiveAuthorization: false")
})

test("strict role audit cannot false-pass redirects, loading, or hidden navigation", () => {
  const roleAudit = readWeb("scripts/role-page-audit.mjs")

  expect(roleAudit).toContain('getByTestId("role-dashboard-source")')
  expect(roleAudit).toContain("terminalContent")
  expect(roleAudit).toContain('locator("main")')
  expect(roleAudit).toContain('main[aria-busy="true"], main [aria-busy="true"]')
  expect(roleAudit).toContain(
    "route did not resolve to its loaded, empty, or unavailable business state"
  )
  expect(roleAudit).toContain(
    "route remained visibly busy after its terminal-state deadline"
  )
  expect(roleAudit).toContain("allowed && !allowedPathOk")
  expect(roleAudit).toContain("!allowed && !blockedPathOk")
  expect(roleAudit).toContain(
    "unauthorized route is visible in role navigation"
  )
  expect(roleAudit).toContain(
    "authorized records loading did not resolve to a sourced dashboard"
  )
  expect(roleAudit).toContain("raw technical/server error is visible")
  expect(roleAudit).toContain("process.exitCode = 1")
})

test("release diagnostics and route checks cannot write a false green", () => {
  const phaseHarness = readRepo("scripts/phase-harness.mjs")
  const releaseHarness = readRepo("scripts/release-demo-harness.mjs")
  const fullAppHarness = readRepo("scripts/full-app-qa-harness.mjs")

  expect(phaseHarness).toContain("A skipped or dry-run gate is diagnostic only")
  expect(phaseHarness).toContain(
    "result.skipped || result.dryRun || result.incomplete"
  )
  expect(phaseHarness).toContain("!incomplete")
  expect(releaseHarness).toContain("diagnosticSkips")
  expect(releaseHarness).toContain(
    "const incomplete = diagnosticSkips.length > 0"
  )
  expect(releaseHarness).toContain("if (!scopedQaPassed) process.exitCode = 2")
  expect(fullAppHarness).toContain("normalizedPathname")
  expect(fullAppHarness).toContain("finalPath === approvedLandingPath")
  expect(fullAppHarness).toContain("finalPath === requestedPath && locked")
  expect(fullAppHarness).not.toContain('page.url().includes("/dashboard")')
})

test("phase delivery and provider readiness remain evidence-scoped", () => {
  const phaseData = readWeb("lib/site-management-data.ts")
  const dashboard = readWeb("app/[locale]/dashboard/page.tsx")
  const phaseStatusRoute = readWeb(
    "app/api/site-management/phase-status/route.ts"
  )
  const fullAppHarness = readRepo("scripts/full-app-qa-harness.mjs")

  for (const phaseNumber of [5, 6, 7, 8, 9, 10, 11, 12, 14]) {
    expect(phaseBlock(phaseData, phaseNumber)).toContain(
      'status: "in_progress"'
    )
  }
  expect(phaseBlock(phaseData, 13)).toContain('status: "blocked"')
  for (let phaseNumber = 5; phaseNumber <= 14; phaseNumber += 1) {
    expect(phaseBlock(phaseData, phaseNumber)).not.toContain(
      'status: "ready_for_uat"'
    )
  }

  expect(phaseStatusRoute).toContain("getUserProfile")
  expect(phaseStatusRoute).toContain("hasAnyPermission")
  expect(phaseStatusRoute).toContain('{ error: "Unauthorized." }')
  expect(dashboard).toContain('dashboardLocale === "tr"')
  expect(dashboard).toContain("phase-delivery-detail-${phase.phase}")
  expect(fullAppHarness).toContain(
    'contractVersion === "integration-health.v2"'
  )
  expect(fullAppHarness).not.toContain("phase-13-integration-readiness.v1")
  expect(fullAppHarness).not.toContain("supabaseConnected")
  expect(fullAppHarness).toContain('payload.source === "local-demo-contract"')
  expect(fullAppHarness).toContain(
    "payload.quality?.humanApprovalForSensitiveActions === true"
  )
  expect(fullAppHarness).toContain(
    "payload.quality?.autonomousFinanceOrAccessActions === false"
  )
})

test("zero-cost P0 work has no debt or finance workflow in source and SQL", () => {
  const repository = readWeb("lib/site-management-repository.ts")
  const ticketPage = readWeb("app/[locale]/dashboard/tickets/page.tsx")
  const ticketSpec = readWeb(
    "e2e/operations/ticket-reservation-workflows.codex.spec.ts"
  )
  const migration = readRepo(
    "supabase/migrations/00000000000036_zero_cost_emergency_semantics.sql"
  )

  expect(repository).toContain("emergencyPaymentStateForTicket")
  expect(repository).toContain(
    'return decision === "no_charge" ? "not_required" : "post_emergency_review"'
  )
  expect(repository).toContain(
    'return "Continue emergency containment and complete the field safety checklist."'
  )
  expect(ticketPage).toContain("service-order-emergency-operational")
  expect(ticketPage).toContain("ticket-register-emergency-operational")
  expect(ticketSpec).toContain(
    "zero-cost P0 is immediately visible without finance or debt semantics"
  )
  expect(ticketSpec).toContain('paymentWorkflowStatus: "not_required"')
  expect(ticketSpec).toContain('paymentDecision: "no_charge"')
  expect(migration).toContain("enforce_p0_service_order_semantics")
  expect(migration).toContain(
    "IF NEW.status IN ('debt_check', 'payment_pending', 'blocked')"
  )
  expect(migration).toContain(
    "WHEN NEW.quoted_price_cents = 0 THEN 'no_charge'"
  )
  expect(migration).toContain(
    "'postEmergencyFinanceReviewRequired', NEW.quoted_price_cents > 0"
  )
  expect(migration).toContain("enforce_p0_workforce_finance_metadata")
})
