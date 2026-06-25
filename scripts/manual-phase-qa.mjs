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

async function runStep(browser, baseUrl, outDir, step) {
  const context = await browser.newContext({ viewport: step.viewport })
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
  const outDir = path.join(args.outDir, `${timestamp}-phase-02-09`)
  await fs.mkdir(outDir, { recursive: true })

  const apiResponse = await fetch(new URL("/api/site-management/phase-status", args.baseUrl))
  if (!apiResponse.ok) throw new Error(`Phase API failed with HTTP ${apiResponse.status}`)
  const apiPayload = await apiResponse.json()
  const completedPhases = apiPayload.summaries?.delivery?.complete ?? 0
  if ((apiPayload.phases?.length ?? 0) < 8 || completedPhases < 8) {
    throw new Error(`Phase API is not complete. Received ${completedPhases}/${apiPayload.phases?.length ?? 0}.`)
  }

  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: true })

  const desktop = { width: 1440, height: 900 }
  const mobile = { width: 390, height: 844 }
  const steps = [
    {
      id: "01-phase-hub-desktop",
      title: "Phase 2-9 delivery hub",
      route: "/tr/dashboard",
      viewport: desktop,
      actions: [
        (page) => assertVisible(page, page.getByText("Phase 2-9 teslim merkezi"), "Phase hub is visible"),
        (page) => assertVisible(page, page.getByText("8/8 tamamlandı"), "All eight phases show complete"),
        (page) => assertVisible(page, page.getByText("AI operasyon asistanı"), "AI assistant module is visible"),
      ],
    },
    {
      id: "02-import-validation-search",
      title: "Phase 4 import validation and unit search",
      route: "/tr/dashboard/listings",
      viewport: desktop,
      actions: [
        (page) => assertVisible(page, page.getByText("Import doğrulama merkezi"), "Import validation center is visible"),
        async (page) => {
          await page.getByLabel("Ara...").fill("A-0101")
          return assertVisible(page, page.getByRole("cell", { name: "A-0101" }), "Unit search returns A-0101")
        },
      ],
    },
    {
      id: "03-users-roles-search",
      title: "Phase 5 users, staff and role coverage",
      route: "/tr/dashboard/users",
      viewport: desktop,
      actions: [
        (page) => assertVisible(page, page.getByText("Kullanıcılar & Roller"), "Users and roles page is visible"),
        async (page) => {
          await page.getByLabel("Ara...").first().fill("Merve")
          return assertVisible(page, page.getByRole("cell", { name: "Merve Muhasebe" }), "Staff search returns Merve Muhasebe")
        },
        (page) => assertVisible(page, page.getByText("Yetki prensibi"), "Role coverage principle is visible"),
      ],
    },
    {
      id: "04-viewing-online-tour-pipeline",
      title: "Phase 6 viewing, online tour and follow-up pipeline",
      route: "/tr/dashboard/calendar",
      viewport: desktop,
      actions: [
        (page) =>
          assertVisible(
            page,
            page.getByText("Phase 6 - Besichtigung & online tur pipeline"),
            "Viewing pipeline is visible"
          ),
        async (page) => {
          await page.getByLabel("Ara...").first().fill("VIEW-601")
          return assertVisible(page, page.getByRole("cell", { name: "VIEW-601" }), "Viewing search returns VIEW-601")
        },
      ],
    },
    {
      id: "05-sales-payment-plan",
      title: "Phase 7 sales payment plan and exposure control",
      route: "/tr/dashboard/finance",
      viewport: desktop,
      actions: [
        (page) =>
          assertVisible(
            page,
            page.getByText("Phase 7 - New Level Premium satış ödeme planı"),
            "Sales payment plan is visible"
          ),
        async (page) => {
          await page.getByLabel("Ara...").first().fill("PAY-701")
          return assertVisible(page, page.getByRole("cell", { name: "PAY-701" }), "Payment plan search returns PAY-701")
        },
      ],
    },
    {
      id: "06-purchase-document-checklist",
      title: "Phase 8 purchase file, TAPU, KYC and EIDS checklist",
      route: "/tr/dashboard/documents",
      viewport: desktop,
      actions: [
        (page) =>
          assertVisible(
            page,
            page.getByText("Phase 8 - Kaufakte, TAPU, KYC ve EIDS kontrolü"),
            "Purchase checklist is visible"
          ),
        async (page) => {
          await page.getByLabel("Ara...").first().fill("DOCBUY-803")
          return assertVisible(page, page.getByRole("cell", { name: "DOCBUY-803" }), "Purchase checklist search returns DOCBUY-803")
        },
      ],
    },
    {
      id: "07-buyer-eligibility-precheck",
      title: "Phase 9 residence, citizenship and buyer eligibility pre-check",
      route: "/tr/dashboard/compliance",
      viewport: desktop,
      actions: [
        (page) =>
          assertVisible(
            page,
            page.getByText("Phase 9 - Oturum, vatandaşlık ve alıcı uygunluk ön kontrolü"),
            "Buyer eligibility pre-check is visible"
          ),
        async (page) => {
          await page.getByLabel("Ara...").first().fill("ELG-903")
          return assertVisible(page, page.getByRole("cell", { name: "ELG-903" }), "Eligibility search returns ELG-903")
        },
      ],
    },
    {
      id: "08-platform-audit-controls",
      title: "Phase 3 platform controls and audit trail",
      route: "/tr/dashboard/settings",
      viewport: desktop,
      actions: [
        (page) => assertVisible(page, page.getByText("Platform & Audit Merkezi"), "Platform audit page is visible"),
        (page) => assertVisible(page, page.getByText("AUD-2401"), "Audit trail contains AUD-2401"),
        (page) => assertVisible(page, page.getByText("RBAC").first(), "RBAC platform control is visible"),
      ],
    },
    {
      id: "09-phase-hub-mobile",
      title: "Mobile dashboard usability",
      route: "/tr/dashboard",
      viewport: mobile,
      actions: [
        (page) => assertVisible(page, page.getByText("Phase 2-9 teslim merkezi"), "Phase hub is visible on mobile"),
        (page) => assertVisible(page, page.getByText("8/8 tamamlandı"), "Completion status is visible on mobile"),
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
      phases: apiPayload.phases?.length ?? 0,
      completedPhases,
      rejectedImportRows: apiPayload.summaries?.import?.rejectedRows ?? null,
      viewingRecords: apiPayload.summaries?.viewing?.total ?? null,
      paymentOpenExposureEur: apiPayload.summaries?.paymentPlans?.openExposureEur ?? null,
      purchaseHighRiskItems: apiPayload.summaries?.purchaseChecklist?.highRisk ?? null,
      eligibilityReviewItems: apiPayload.summaries?.eligibility?.review ?? null,
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
      `Import rejected rows: ${report.api.rejectedImportRows}`,
      `Viewing records: ${report.api.viewingRecords}`,
      `Payment open exposure EUR: ${report.api.paymentOpenExposureEur}`,
      `Purchase high-risk items: ${report.api.purchaseHighRiskItems}`,
      `Eligibility review items: ${report.api.eligibilityReviewItems}`,
      `Browser steps passed: ${results.filter((result) => result.passed).length}/${results.length}`,
      "",
      ...results.flatMap((result) => [
        `${result.id}: ${result.title}`,
        `Route: ${result.route}`,
        `Checks: ${result.checks.join("; ")}`,
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
