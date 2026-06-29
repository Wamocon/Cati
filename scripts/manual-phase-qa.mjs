import { createRequire } from "node:module"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3100",
    outDir: path.join(rootDir, "quality", "manual-qa"),
  }

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base-url") args.baseUrl = argv[++i]
    else if (argv[i] === "--out-dir") args.outDir = path.resolve(argv[++i])
  }

  return args
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

async function assertVisible(page, selector, label) {
  const locator = typeof selector === "string" ? page.locator(selector) : selector
  await locator.first().waitFor({ state: "visible", timeout: 10_000 })
  return label
}

function isIgnorableConsoleIssue(text) {
  return text.includes("/_next/webpack-hmr") && text.includes("WebSocket connection")
}

function phaseStatus(phases, phaseNumber) {
  return phases.find((phase) => phase.phase === phaseNumber)?.status ?? "missing"
}

async function runStep(browser, baseUrl, outDir, step) {
  const context = await browser.newContext({ viewport: step.viewport })
  await context.addCookies([{ name: "access_profile_role", value: "admin", url: baseUrl }])
  const page = await context.newPage()
  const issues = []

  page.on("console", (msg) => {
    const text = msg.text()
    if (msg.type() === "error" && !isIgnorableConsoleIssue(text)) issues.push(`[console:error] ${text}`)
  })
  page.on("pageerror", (error) => issues.push(`[pageerror] ${error.message}`))

  await page.goto(new URL(step.route, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  })
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {})
  await page.waitForTimeout(700)

  const checks = []
  for (const action of step.actions) {
    checks.push(await action(page))
  }

  const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
  const viewportWidth = await page.evaluate(() => window.innerWidth)
  if (bodyWidth > viewportWidth + 1) {
    issues.push(`[layout] horizontal overflow body=${bodyWidth} viewport=${viewportWidth}`)
  }

  const screenshotPath = path.join(outDir, `${step.id}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await context.close()

  return {
    id: step.id,
    title: step.title,
    route: step.route,
    viewport: step.viewport,
    checks,
    issues,
    screenshotPath,
    passed: issues.length === 0,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(args.outDir, `${timestamp}-phase-02-04`)
  await fs.mkdir(outDir, { recursive: true })

  const apiResponse = await fetch(new URL("/api/site-management/phase-status", args.baseUrl))
  if (!apiResponse.ok) throw new Error(`Phase API failed with HTTP ${apiResponse.status}`)
  const apiPayload = await apiResponse.json()
  const phases = apiPayload.phases ?? []
  const completedPhases = apiPayload.summaries?.delivery?.complete ?? 0
  const requiredCompletePhases = [2, 3, 4]
  const incompleteRequiredPhases = requiredCompletePhases.filter(
    (phaseNumber) => phaseStatus(phases, phaseNumber) !== "complete"
  )

  if (phases.length < 15 || completedPhases < 4 || incompleteRequiredPhases.length > 0) {
    throw new Error(
      `Phase API is not aligned. Received ${completedPhases}/${phases.length}; incomplete phases: ${incompleteRequiredPhases.join(", ") || "none"}.`
    )
  }

  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: true })

  const desktop = { width: 1440, height: 900 }
  const mobile = { width: 390, height: 844 }
  const steps = [
    {
      id: "01-phase-2-navigation-desktop",
      title: "Phase 2 role navigation and ERP command center",
      route: "/tr/dashboard",
      viewport: desktop,
      actions: [
        (page) =>
          assertVisible(
            page,
            page.getByRole("heading", { name: /ERP Operasyon Merkezi/ }),
            "Dashboard command center is visible"
          ),
        (page) => assertVisible(page, page.getByText("ERP modül durumu"), "ERP module map is visible"),
        (page) => assertVisible(page, page.getByText(/aktif/i).first(), "Active modules are visible"),
        (page) => assertVisible(page, page.getByText(/yap.mda/i).first(), "In-progress modules are visible"),
        (page) =>
          assertVisible(page, page.locator('a[href$="/dashboard/listings"]').first(), "Listings module route is visible"),
        (page) => assertVisible(page, page.getByText(/AI operasyon/i), "AI assistant module is visible"),
      ],
    },
    {
      id: "02-phase-2-navigation-mobile",
      title: "Phase 2 mobile dashboard usability",
      route: "/tr/dashboard",
      viewport: mobile,
      actions: [
        (page) =>
          assertVisible(
            page,
            page.getByRole("heading", { name: /ERP Operasyon Merkezi/ }),
            "Dashboard command center is visible on mobile"
          ),
        (page) => assertVisible(page, page.getByText("ERP modül durumu"), "ERP module map is visible on mobile"),
        async (page) => {
          await page.getByRole("button", { name: /Men.y. a./i }).click()
          await page.waitForTimeout(300)
          return assertVisible(
            page,
            page.locator("aside").getByRole("link", { name: /Daire Matrisi/i }),
            "Mobile route link is reachable"
          )
        },
      ],
    },
    {
      id: "03-phase-3-rbac-audit-controls",
      title: "Phase 3 platform controls, RBAC and audit trail",
      route: "/tr/dashboard/settings",
      viewport: desktop,
      actions: [
        (page) =>
          assertVisible(
            page,
            page.getByRole("heading", { name: "Platform Yönetim Merkezi" }),
            "Platform audit page is visible"
          ),
        (page) => assertVisible(page, page.getByText("AUD-2401"), "Audit trail contains AUD-2401"),
        (page) => assertVisible(page, page.getByText("RBAC").first(), "RBAC platform control is visible"),
      ],
    },
    {
      id: "04-phase-4-import-validation-search",
      title: "Phase 4 import validation and unit search",
      route: "/tr/dashboard/listings",
      viewport: desktop,
      actions: [
        (page) =>
          assertVisible(page, page.getByRole("heading", { name: "Proje & Daire Matrisi" }), "Flat matrix page is visible"),
        (page) => assertVisible(page, page.getByText(/Daire matrisi kay.tlar./i), "Live unit data panel is visible"),
        (page) => assertVisible(page, page.getByText(/Veri do.rulama merkezi/i), "Data validation center is visible"),
        async (page) => {
          await page.getByLabel("Ara...").first().fill("A-001")
          return assertVisible(page, page.getByRole("cell", { name: "A-001" }), "Unit search returns A-001")
        },
      ],
    },
    {
      id: "05-phase-4-audited-unit-actions",
      title: "Phase 4 flat filters and audited unit actions",
      route: "/tr/dashboard/listings",
      viewport: desktop,
      actions: [
        async (page) => {
          const restrictedFilter = page.getByRole("button", { name: /Eri.im k.s.t./i }).first()
          await restrictedFilter.click()
          return assertVisible(page, restrictedFilter, "Restricted-access filter is usable")
        },
        async (page) => {
          await page.getByRole("button", { name: /Filtreyi s.f.rla/i }).click()
          await page.getByRole("button", { name: /A-001 detay/i }).first().click()
          return assertVisible(page, page.getByRole("heading", { name: "A-001" }), "Unit detail opens from matrix")
        },
        async (page) => {
          const debtAction = page.getByRole("button", { name: /A-001 bor/i })
          await debtAction.click()
          return assertVisible(page, debtAction, "Audited unit action is clickable")
        },
      ],
    },
  ]

  const results = []
  for (const step of steps) {
    results.push(await runStep(browser, args.baseUrl, outDir, step))
  }
  await browser.close()

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    api: {
      status: apiResponse.status,
      phases: phases.length,
      completedPhases,
      phase2Status: phaseStatus(phases, 2),
      phase3Status: phaseStatus(phases, 3),
      phase4Status: phaseStatus(phases, 4),
      rejectedDataRows: apiPayload.summaries?.import?.rejectedRows ?? null,
      controls: apiPayload.controls?.length ?? 0,
      auditEvents: apiPayload.auditEvents?.length ?? 0,
    },
    results,
    passed: results.every((result) => result.passed),
  }

  await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2))
  await fs.writeFile(
    path.join(outDir, "summary.txt"),
    [
      `Manual QA completed at ${report.generatedAt}`,
      `Base URL: ${report.baseUrl}`,
      `Phase API: ${report.api.completedPhases}/${report.api.phases} completed phases`,
      `Phase 2 status: ${report.api.phase2Status}`,
      `Phase 3 status: ${report.api.phase3Status}`,
      `Phase 4 status: ${report.api.phase4Status}`,
      `Rejected data rows: ${report.api.rejectedDataRows}`,
      `Controls: ${report.api.controls}`,
      `Audit events: ${report.api.auditEvents}`,
      `Browser steps passed: ${results.filter((result) => result.passed).length}/${results.length}`,
      "",
      ...results.flatMap((result) => [
        `${result.id}: ${result.title}`,
        `Route: ${result.route}`,
        `Checks: ${result.checks.join("; ")}`,
        `Issues: ${result.issues.join("; ") || "none"}`,
        `Screenshot: ${result.screenshotPath}`,
        "",
      ]),
    ].join("\n")
  )

  console.log(`Manual QA complete: ${results.filter((result) => result.passed).length}/${results.length} browser steps passed.`)
  console.log(`Report: ${path.join(outDir, "report.json")}`)
  if (!report.passed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
