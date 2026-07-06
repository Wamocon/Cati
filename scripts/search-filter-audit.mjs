import { createRequire } from "node:module"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")
const localTempDir = path.join(rootDir, ".tmp")

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3104",
    outDir: path.join(rootDir, "quality", "results", "search-filter-audit"),
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

function apiUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl).toString()
}

function roleCookie(role) {
  return `access_profile_role=${role}`
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
        // Try the next package name.
      }
    }
    throw new Error("Playwright is not available from the root or web app dependencies.")
  }
}

function isIgnorableConsoleIssue(text) {
  return (
    text.includes("Download the React DevTools") ||
    (text.includes("/_next/webpack-hmr") && text.includes("WebSocket connection")) ||
    (text.includes("A tree hydrated but some attributes") && text.includes("caret-color")) ||
    text.includes("[HMR] connected")
  )
}

function chooseCandidates(text) {
  return Array.from(
    new Set(
      text
        .replace(/[^\p{L}\p{N}#._-]+/gu, " ")
        .split(/\s+/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 3)
        .filter((item) => !/^(open|view|edit|status|records|record|ready|next|previous)$/i.test(item))
    )
  ).slice(0, 12)
}

function hasEmptyTableText(text) {
  return /No results found/i.test(text)
}

async function waitForServer(baseUrl, timeoutMs = 60_000) {
  const started = Date.now()
  let lastError = ""

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(apiUrl(baseUrl, "/en"), { cache: "no-store" })
      if (response.ok) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error.message
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Server did not become reachable at ${baseUrl}. Last status: ${lastError}`)
}

async function fetchJson(baseUrl, pathname, role = "admin", expectedStatus = 200) {
  const response = await fetch(apiUrl(baseUrl, pathname), {
    cache: "no-store",
    headers: { Cookie: roleCookie(role) },
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  assert(
    response.status === expectedStatus,
    `${pathname} as ${role} expected HTTP ${expectedStatus}, received ${response.status}: ${text}`
  )
  return payload
}

async function openDashboardPage(browser, baseUrl, pathname, role, errors) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 920 } })
  await context.addCookies([{ name: "access_profile_role", value: role, url: baseUrl }])
  const page = await context.newPage()
  page.on("console", (msg) => {
    const text = msg.text()
    if (msg.type() === "error" && !isIgnorableConsoleIssue(text)) errors.push(`${pathname}: ${text}`)
  })
  page.on("pageerror", (error) => errors.push(`${pathname}: ${error.message}`))
  await page.goto(`${baseUrl}/en${pathname}`, { waitUntil: "domcontentloaded", timeout: 40_000 })
  await page.locator("main").waitFor({ state: "visible", timeout: 20_000 })
  return { context, page }
}

async function auditCommandRibbon(page) {
  await page.getByRole("button", { name: /^Filters$/i }).click()
  const dialog = page.getByRole("dialog")
  await dialog.waitFor({ state: "visible", timeout: 10_000 })
  await dialog.getByPlaceholder("A-42, owner, ticket, debt, document...").fill("A-42")
  await dialog.getByRole("button", { name: /Apply filters/i }).click()
  await page.getByText("Applied results").waitFor({ state: "visible", timeout: 10_000 })
  await page.getByText(/records matched/i).first().waitFor({ state: "visible", timeout: 10_000 })
  await page.getByRole("button", { name: /^Clear$/i }).click()
  await page.getByText("Search and filter records").waitFor({ state: "visible", timeout: 10_000 })
}

async function auditLiveUnitFilters(page) {
  const liveInput = page
    .locator('input[placeholder*="unit" i]:visible, input[placeholder*="owner" i]:visible, input[placeholder*="block" i]:visible')
    .first()
  await liveInput.waitFor({ state: "visible", timeout: 20_000 })
  await liveInput.fill("A-42")
  await page.getByText(/records matched/i).first().waitFor({ state: "visible", timeout: 10_000 })
  const matchedText = await page.getByText(/records matched/i).first().innerText()
  assert(!/^0\s/.test(matchedText), `Live unit search did not match A-42: ${matchedText}`)

  await liveInput.fill("search-no-match-000")
  await page.waitForFunction(
    () => /0 records(?: matched)?|No results found/i.test(document.body.innerText),
    null,
    { timeout: 10_000 },
  )
  await liveInput.fill("")

  const blockSelect = page.locator("select").first()
  await blockSelect.waitFor({ state: "visible", timeout: 10_000 })
  const optionCount = await blockSelect.locator("option").count()
  assert(optionCount > 1, "Live unit block filter has no block options.")
  const secondOption = await blockSelect.locator("option").nth(1).getAttribute("value")
  await blockSelect.selectOption(secondOption ?? "A")
  await page.getByText(/records matched/i).first().waitFor({ state: "visible", timeout: 10_000 })
}

async function auditDataTables(page, pageName) {
  const results = []
  const tables = page.locator('[data-testid="data-table"]')
  const count = await tables.count()

  for (let index = 0; index < count; index++) {
    const table = tables.nth(index)
    const input = table.locator("input").first()
    if ((await input.count()) === 0) {
      results.push({ page: pageName, table: index + 1, status: "skipped", reason: "no search input" })
      continue
    }

    await input.scrollIntoViewIfNeeded()
    const rows = table.locator("tbody tr")
    const rowCount = await rows.count()
    let sampleText = ""

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const rowText = await rows.nth(rowIndex).innerText()
      if (!hasEmptyTableText(rowText) && rowText.trim().length > 0) {
        sampleText = rowText
        break
      }
    }

    const candidates = chooseCandidates(sampleText)
    assert(candidates.length > 0, `${pageName} table ${index + 1} has no searchable sample row.`)

    let matchedCandidate = null
    for (const candidate of candidates) {
      await input.fill(candidate)
      await page.waitForTimeout(250)
      const textAfterSearch = await table.innerText()
      if (!hasEmptyTableText(textAfterSearch)) {
        matchedCandidate = candidate
        break
      }
    }

    assert(
      matchedCandidate,
      `${pageName} table ${index + 1} did not return a result for any sample token: ${candidates.join(", ")}`
    )

    const impossible = `no-match-${pageName.replace(/\W+/g, "-")}-${index + 1}-999999`
    await input.fill(impossible)
    await page.waitForTimeout(250)
    const noMatchText = await table.innerText()
    assert(hasEmptyTableText(noMatchText), `${pageName} table ${index + 1} did not show empty state for impossible search.`)
    await input.fill("")

    results.push({ page: pageName, table: index + 1, status: "passed", matchedCandidate })
  }

  return results
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  process.env.TEMP = localTempDir
  process.env.TMP = localTempDir
  await fs.mkdir(args.outDir, { recursive: true })
  await fs.mkdir(localTempDir, { recursive: true })
  await waitForServer(args.baseUrl)

  const apiChecks = []
  for (const term of ["A-42", "SRV", "booking", "Iyzico", "document"]) {
    const payload = await fetchJson(args.baseUrl, `/api/site-management/search?q=${encodeURIComponent(term)}&limit=5`)
    assert(Array.isArray(payload.results), `API search for ${term} did not return results array.`)
    assert(payload.results.length > 0, `API search for ${term} returned no results.`)
    apiChecks.push({ term, count: payload.results.length, source: payload.source })
  }
  await fetchJson(args.baseUrl, "/api/site-management/search", "admin", 400)
  await fetchJson(args.baseUrl, "/api/site-management/search?q=A-42", "tenant", 403)

  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: true, timeout: 30_000 })
  const errors = []
  const tableChecks = []

  const pages = [
    { name: "listings", path: "/dashboard/listings", role: "admin" },
    { name: "leads", path: "/dashboard/leads", role: "admin" },
    { name: "tickets", path: "/dashboard/tickets", role: "admin" },
    { name: "calendar", path: "/dashboard/calendar", role: "admin" },
    { name: "compliance", path: "/dashboard/compliance", role: "admin" },
    { name: "finance", path: "/dashboard/finance", role: "admin" },
    { name: "documents", path: "/dashboard/documents", role: "admin" },
    { name: "communications", path: "/dashboard/communications", role: "admin" },
    { name: "offline", path: "/dashboard/offline", role: "admin" },
    { name: "reports", path: "/dashboard/reports", role: "admin" },
    { name: "users", path: "/dashboard/users", role: "admin" },
    { name: "settings", path: "/dashboard/settings", role: "admin" },
  ]

  for (const target of pages) {
    const { context, page } = await openDashboardPage(browser, args.baseUrl, target.path, target.role, errors)
    if (target.name === "listings") {
      await auditCommandRibbon(page)
      await auditLiveUnitFilters(page)
      await page.screenshot({ path: path.join(args.outDir, "listings-filters.png"), fullPage: false })
    }
    tableChecks.push(...(await auditDataTables(page, target.name)))
    await context.close()
  }

  await browser.close()
  assert(errors.length === 0, `Browser console/page errors found: ${errors.join("; ")}`)

  const result = {
    passed: true,
    apiChecks,
    tableChecks,
    screenshots: args.outDir,
  }

  await fs.writeFile(path.join(args.outDir, "search-filter-audit-report.json"), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
