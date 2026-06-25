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
    outDir: path.join(rootDir, "docs", "phase-delivery", "assets"),
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
    throw new Error("Playwright is not available from the root or web app dependencies.")
  }
}

async function capture(page, baseUrl, item, outDir) {
  await page.goto(new URL(item.route, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  })
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {})
  if (item.search) {
    const input = page.getByLabel("Ara...").first()
    await input.fill(item.search)
    await page.waitForTimeout(500)
  }
  if (item.selector) {
    await page.locator(item.selector).first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: path.join(outDir, item.file), fullPage: false })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  await fs.mkdir(args.outDir, { recursive: true })
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: true })

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })

  const desktopItems = [
    { file: "phase-hub-desktop.png", route: "/tr/dashboard" },
    { file: "phase-4-import-validation.png", route: "/tr/dashboard/listings", selector: "text=Import doğrulama merkezi", search: "A-0101" },
    { file: "phase-5-users-roles.png", route: "/tr/dashboard/users", selector: "text=Personel operasyon kapsamı", search: "Merve" },
    { file: "phase-3-platform-audit.png", route: "/tr/dashboard/settings", selector: "text=Güvenlik ve platform kontrolleri" },
  ]

  for (const item of desktopItems) {
    await capture(desktop, args.baseUrl, item, args.outDir)
  }
  await capture(mobile, args.baseUrl, { file: "phase-hub-mobile.png", route: "/tr/dashboard" }, args.outDir)

  await desktop.close()
  await mobile.close()
  await browser.close()
  console.log(`Document screenshots written to ${args.outDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
