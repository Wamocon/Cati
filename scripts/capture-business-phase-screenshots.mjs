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
    outDir: path.join(rootDir, "docs", "phase-delivery", "business-assets"),
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
          paths: [path.join(webDir, "node_modules"), path.join(rootDir, "node_modules")],
        })
        const mod = await import(pathToFileURL(resolved).href)
        return mod.chromium ? mod : mod.default
      } catch {
        // Try the next package name.
      }
    }
    throw new Error("Playwright is not available.")
  }
}

async function capture(page, baseUrl, shot, outDir) {
  await page.goto(new URL(shot.route, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  })
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {})
  await page.waitForTimeout(1200)
  if (shot.search) {
    await page.getByLabel("Ara...").first().fill(shot.search)
    await page.waitForTimeout(700)
  }
  if (shot.selector) {
    await page.locator(shot.selector).first().scrollIntoViewIfNeeded({ timeout: 8_000 })
    await page.waitForTimeout(700)
  }
  if (typeof shot.scrollY === "number") {
    await page.evaluate((y) => window.scrollTo(0, y), shot.scrollY)
    await page.waitForTimeout(700)
  }
  await page.screenshot({ path: path.join(outDir, shot.file), fullPage: false })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  await fs.mkdir(args.outDir, { recursive: true })
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: true })
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })

  const shots = [
    { file: "phase-02-dashboard-command-center.png", route: "/tr/dashboard" },
    { file: "phase-02-simulation-ai.png", route: "/tr/dashboard", scrollY: 520 },
    { file: "phase-03-controls-overview.png", route: "/tr/dashboard/settings" },
    { file: "phase-03-rbac-audit.png", route: "/tr/dashboard/settings", selector: "text=AUD-2401" },
    { file: "phase-04-unit-matrix.png", route: "/tr/dashboard/listings" },
    { file: "phase-04-import-quality-gate.png", route: "/tr/dashboard/listings", selector: "text=Import doğrulama merkezi" },
    { file: "phase-04-unit-search.png", route: "/tr/dashboard/listings", selector: "text=A-0101", search: "A-0101" },
    { file: "phase-05-staff-overview.png", route: "/tr/dashboard/users" },
    { file: "phase-05-staff-search.png", route: "/tr/dashboard/users", selector: "text=Merve Muhasebe", search: "Merve" },
    { file: "phase-05-role-matrix.png", route: "/tr/dashboard/users", selector: "text=Yönetici" },
  ]

  for (const shot of shots) await capture(desktop, args.baseUrl, shot, args.outDir)
  await capture(mobile, args.baseUrl, { file: "phase-02-mobile-dashboard.png", route: "/tr/dashboard" }, args.outDir)

  await desktop.close()
  await mobile.close()
  await browser.close()
  console.log(`Business screenshots written to ${args.outDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
