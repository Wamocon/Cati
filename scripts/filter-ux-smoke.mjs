import { createRequire } from "node:module"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3104",
    outDir: path.join(rootDir, "quality", "results", "filter-ux-smoke"),
  }

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base-url") args.baseUrl = argv[++i]
    if (argv[i] === "--out-dir") args.outDir = path.resolve(argv[++i])
  }

  return args
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
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

function isIgnorableConsoleIssue(text) {
  return (
    text.includes("Download the React DevTools") ||
    (text.includes("/_next/webpack-hmr") && text.includes("WebSocket connection")) ||
    text.includes("[HMR] connected")
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  await fs.mkdir(args.outDir, { recursive: true })
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: true, timeout: 30_000 })
  const errors = []

  async function openManagerPage(viewport) {
    const context = await browser.newContext({ viewport })
    await context.addCookies([{ name: "access_profile_role", value: "manager", url: args.baseUrl }])
    const page = await context.newPage()
    page.on("console", (msg) => {
      const text = msg.text()
      if (msg.type() === "error" && !isIgnorableConsoleIssue(text)) errors.push(text)
    })
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`${args.baseUrl}/en/dashboard/listings`, { waitUntil: "domcontentloaded", timeout: 30_000 })
    await page.getByText("Search and filter records").waitFor({ state: "visible", timeout: 15_000 })
    return { context, page }
  }

  const { context, page } = await openManagerPage({ width: 1440, height: 900 })
  const initialApplied = await page.getByText("Applied results").count()
  assert(initialApplied === 0, "Applied result cards should not be visible before filters are applied.")

  await page.getByRole("button", { name: /^Filters$/i }).click()
  await page.getByRole("dialog").waitFor({ state: "visible", timeout: 10_000 })
  await page.getByPlaceholder("A-42, owner, ticket, debt, document...").fill("SRV")
  await page.getByRole("dialog").getByRole("button", { name: /^(Service|Servis)\s+\d+$/i }).click()
  const previewText = await page.getByText(/records will match|kayıt eşleşecek/i).first().innerText()

  const beforeApplyApplied = await page.getByText("Applied results").count()
  assert(beforeApplyApplied === 0, "Changing filters in the dialog should not update page results before Apply.")

  await page.getByRole("button", { name: /Apply filters/i }).click()
  await page.getByText("Applied results").waitFor({ state: "visible", timeout: 10_000 })
  await page.getByText(/Service|Servis/i).first().waitFor({ state: "visible", timeout: 10_000 })
  await page.screenshot({ path: path.join(args.outDir, "desktop-applied.png"), fullPage: false })

  await page.getByRole("button", { name: /Clear/i }).click()
  await page.getByText("Search and filter records").waitFor({ state: "visible", timeout: 10_000 })
  const afterClearApplied = await page.getByText("Applied results").count()
  assert(afterClearApplied === 0, "Applied result cards should disappear after Clear.")
  await context.close()

  const mobile = await openManagerPage({ width: 390, height: 844 })
  await mobile.page.getByRole("button", { name: /^Filters$/i }).click()
  await mobile.page.getByRole("dialog").waitFor({ state: "visible", timeout: 10_000 })
  await mobile.page.screenshot({ path: path.join(args.outDir, "mobile-dialog.png"), fullPage: false })
  await mobile.context.close()
  await browser.close()

  assert(errors.length === 0, `Browser console/page errors found: ${errors.join("; ")}`)

  const result = {
    passed: true,
    previewText,
    screenshots: args.outDir,
  }
  await fs.writeFile(path.join(args.outDir, "filter-ux-smoke-report.json"), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
