import { createRequire } from "node:module"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")
const localTempDir = path.join(rootDir, ".tmp")

const roles = ["admin", "manager", "accountant", "staff", "owner", "tenant"]
const offlineAllowedRoles = new Set(["admin", "manager", "staff"])

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3104",
    outDir: path.join(rootDir, "quality", "results", "offline-sync-role-audit"),
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

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
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
    await wait(1000)
  }

  throw new Error(`Server did not become reachable at ${baseUrl}. Last status: ${lastError}`)
}

async function fetchJson(baseUrl, pathname, { role, method = "GET", body, expectedStatus = 200 }) {
  const response = await fetch(apiUrl(baseUrl, pathname), {
    method,
    cache: "no-store",
    headers: {
      Cookie: roleCookie(role),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  assert(
    response.status === expectedStatus,
    `${method} ${pathname} as ${role} expected HTTP ${expectedStatus}, received ${response.status}: ${text}`
  )
  return payload
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
    text.includes("[HMR] connected")
  )
}

async function openPage(browser, baseUrl, role, pathname, errors, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport })
  await context.addCookies([{ name: "access_profile_role", value: role, url: baseUrl }])
  const page = await context.newPage()
  page.on("console", (msg) => {
    const text = msg.text()
    if (msg.type() === "error" && !isIgnorableConsoleIssue(text)) errors.push(`${role} ${pathname}: ${text}`)
  })
  page.on("pageerror", (error) => errors.push(`${role} ${pathname}: ${error.message}`))
  await page.goto(`${baseUrl}/en${pathname}`, { waitUntil: "domcontentloaded", timeout: 40_000 })
  await page.locator("main").waitFor({ state: "visible", timeout: 20_000 })
  return { context, page }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  process.env.TEMP = localTempDir
  process.env.TMP = localTempDir
  await fs.mkdir(args.outDir, { recursive: true })
  await fs.mkdir(localTempDir, { recursive: true })
  await waitForServer(args.baseUrl)

  const apiChecks = []
  for (const role of roles) {
    const expectedStatus = offlineAllowedRoles.has(role) ? 200 : 403
    const payload = await fetchJson(args.baseUrl, "/api/site-management/offline-sync", { role, expectedStatus })
    const queue = payload?.queue ?? []
    if (expectedStatus === 200) {
      assert(payload.providerMode === "simulation", `${role} offline API must be marked simulation.`)
      assert(payload.quality.liveOfflineWriteQueueConnected === false, `${role} API must not claim live offline writes.`)
      if (role === "staff") {
        assert(queue.length === 1, "staff should only see the staff offline queue item.")
        assert(queue.every((item) => item.role === "staff"), "staff API returned non-staff queue records.")
      }
      if (role === "admin" || role === "manager") {
        assert(queue.length >= 5, `${role} should see the full demo queue.`)
      }
    }
    apiChecks.push({ role, status: expectedStatus, queueCount: queue.length })
  }

  await fetchJson(args.baseUrl, "/api/site-management/actions", {
    role: "staff",
    method: "POST",
    expectedStatus: 403,
    body: {
      actionType: "offline_sync.item.review",
      entityTable: "offline_sync_jobs",
      entityExternalId: "OFF-9005",
      title: "Staff should not review manager conflict",
      metadata: { audit: true },
    },
  })
  await fetchJson(args.baseUrl, "/api/site-management/actions", {
    role: "staff",
    method: "POST",
    expectedStatus: 201,
    body: {
      actionType: "offline_sync.item.review",
      entityTable: "offline_sync_jobs",
      entityExternalId: "OFF-9001",
      title: "Staff own queue review",
      metadata: { audit: true },
    },
  })

  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: true, timeout: 30_000 })
  const errors = []
  const browserChecks = []

  for (const role of roles) {
    const dashboard = await openPage(browser, args.baseUrl, role, "/dashboard", errors)
    const dashboardText = await dashboard.page.locator("body").innerText()
    const menuVisible = dashboardText.includes("Offline Sync")
    assert(menuVisible === offlineAllowedRoles.has(role), `${role} sidebar Offline Sync visibility mismatch.`)
    await dashboard.context.close()

    const offline = await openPage(browser, args.baseUrl, role, "/dashboard/offline", errors)
    await offline.page.waitForTimeout(1000)
    const bodyText = await offline.page.locator("body").innerText()

    if (offlineAllowedRoles.has(role)) {
      assert(/Mobile Web & Offline Sync|Mobil Web & Offline Sync/.test(bodyText), `${role} did not render Offline Sync page.`)
      assert(bodyText.includes("Demo sync only"), `${role} page must show demo sync status.`)
      if (role === "staff") {
        assert(bodyText.includes("OFF-9001"), "staff page should show staff queue item OFF-9001.")
        assert(!bodyText.includes("OFF-9005"), "staff page should not show manager conflict OFF-9005.")
      }
      await offline.page.screenshot({ path: path.join(args.outDir, `${role}-offline.png`), fullPage: false })
    } else {
      assert(!/Mobile Web & Offline Sync|Mobil Web & Offline Sync/.test(bodyText), `${role} should not render Offline Sync page.`)
    }

    browserChecks.push({ role, menuVisible, allowed: offlineAllowedRoles.has(role) })
    await offline.context.close()
  }

  await browser.close()
  assert(errors.length === 0, `Browser console/page errors found: ${errors.join("; ")}`)

  const result = {
    passed: true,
    apiChecks,
    browserChecks,
    screenshots: args.outDir,
  }
  await fs.writeFile(path.join(args.outDir, "offline-sync-role-audit-report.json"), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
