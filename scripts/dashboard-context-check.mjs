import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")

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

const out = path.join("quality", "browser-audit", "2026-06-25-new-level-dashboard-check")
fs.mkdirSync(out, { recursive: true })

const { chromium } = await loadPlaywright()
const browser = await chromium.launch({ headless: true })
const specs = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
]
const results = []

for (const [name, viewport] of specs) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const issues = []
  page.on("console", (msg) => {
    if (msg.type() === "error") issues.push(msg.text())
  })
  page.on("pageerror", (error) => issues.push(error.message))
  await page.goto("http://localhost:3100/tr/dashboard", {
    waitUntil: "networkidle",
    timeout: 30_000,
  })
  await page.waitForTimeout(1200)
  const h1 = await page.locator("h1").first().innerText().catch(() => null)
  const body = await page.locator("body").innerText()
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
  const viewportWidth = await page.evaluate(() => window.innerWidth)
  await page.screenshot({
    path: path.join(out, `dashboard-${name}.png`),
    fullPage: false,
  })
  results.push({
    name,
    h1,
    hasProjectArea: body.includes("52k"),
    hasBeach: body.includes("900 m"),
    hasHotel: body.includes("7+Hotel"),
    overflow: bodyWidth > viewportWidth + 1,
    issues,
  })
  await context.close()
}

await browser.close()
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
