import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { createRequire } from "node:module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3100",
    startServer: false,
    headed: false,
    holdMs: 0,
    outDir: path.join(rootDir, "quality", "browser-audit"),
    timeoutMs: 120_000,
    serverMode: "start",
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--base-url") args.baseUrl = argv[++i]
    else if (arg === "--start-server") args.startServer = true
    else if (arg === "--headed") args.headed = true
    else if (arg === "--hold-ms") args.holdMs = Number(argv[++i] ?? 0)
    else if (arg === "--out-dir") args.outDir = path.resolve(argv[++i])
    else if (arg === "--timeout-ms") args.timeoutMs = Number(argv[++i] ?? args.timeoutMs)
    else if (arg === "--server-mode") args.serverMode = argv[++i]
  }

  return args
}

async function loadPlaywright() {
  try {
    const mod = await import("playwright")
    return mod.chromium ? mod : mod.default
  } catch {
    const require = createRequire(import.meta.url)
    const resolved = require.resolve("playwright", {
      paths: [
        path.join(webDir, "node_modules"),
        path.join(rootDir, "node_modules"),
        path.join(rootDir, "node_modules", ".pnpm", "node_modules"),
      ],
    })
    const mod = await import(pathToFileURL(resolved).href)
    return mod.chromium ? mod : mod.default
  }
}

function startServer(mode) {
  const nextMode = mode === "dev" ? "dev" : "start"
  const command =
    process.platform === "win32"
      ? `cmd /c npm run ${nextMode} -- -p 3100`
      : `npm run ${nextMode} -- -p 3100`
  const child = spawn(command, {
    cwd: webDir,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  })

  child.stdout.on("data", (chunk) => process.stdout.write(`[web] ${chunk}`))
  child.stderr.on("data", (chunk) => process.stderr.write(`[web] ${chunk}`))
  return child
}

function stopDevServer(child) {
  if (!child || child.killed) return
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: true,
    })
    return
  }
  child.kill("SIGTERM")
}

async function revealAnimatedContent(page) {
  const viewportHeight = await page.evaluate(() => window.innerHeight)
  const step = Math.max(180, Math.floor(viewportHeight * 0.35))
  let lastScrollHeight = 0

  for (let y = 0; y <= lastScrollHeight + step; y += step) {
    lastScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
    await page.waitForTimeout(160)
    if (y > lastScrollHeight) break
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(350)
}

async function waitForUrl(url, timeoutMs) {
  const started = Date.now()
  let lastError = ""
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" })
      if (response.ok || response.status < 500) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error.message
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Timed out waiting for ${url}. Last error: ${lastError}`)
}

async function auditRoute(browser, baseUrl, route, viewport, outDir) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const issues = []
  const responses = []

  page.on("console", (msg) => {
    if (msg.type() === "error") issues.push(`[console:error] ${msg.text()}`)
  })
  page.on("pageerror", (error) => issues.push(`[pageerror] ${error.message}`))
  page.on("response", (response) => {
    if (response.status() >= 500) {
      responses.push(`${response.status()} ${response.url()}`)
    }
  })

  const url = new URL(route, baseUrl).toString()
  const safeName = `${route.replace(/^\//, "").replace(/[^\w-]+/g, "_") || "home"}_${viewport.width}x${viewport.height}`
  const screenshotPath = path.join(outDir, `${safeName}.png`)

  console.log(`Auditing ${route} at ${viewport.width}x${viewport.height}`)
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 })
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {})
  await page.waitForTimeout(1800)
  await revealAnimatedContent(page)
  await page.screenshot({ path: screenshotPath, fullPage: true })

  const title = await page.title().catch(() => "")
  const h1 = await page.locator("h1").first().innerText().catch(() => "")
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
  const viewportWidth = await page.evaluate(() => window.innerWidth)
  if (bodyWidth > viewportWidth + 1) {
    issues.push(`[layout] horizontal overflow body=${bodyWidth} viewport=${viewportWidth}`)
  }

  await context.close()

  return {
    route,
    viewport,
    title,
    h1,
    screenshotPath,
    issues,
    serverErrors: responses,
    passed: issues.length === 0 && responses.length === 0,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(args.outDir, timestamp)
  await fs.mkdir(outDir, { recursive: true })

  let server
  if (args.startServer) server = startServer(args.serverMode)

  try {
    console.log(`Waiting for ${args.baseUrl}`)
    await waitForUrl(args.baseUrl, args.timeoutMs)
    console.log("Server is reachable. Launching browser.")
    const { chromium } = await loadPlaywright()
    const browser = await chromium.launch({ headless: !args.headed, timeout: 30_000 })

    const routes = [
      "/tr",
      "/tr/login",
      "/tr/signup",
      "/tr/platform",
      "/tr/dashboard",
      "/tr/dashboard/listings",
      "/tr/dashboard/leads",
      "/tr/dashboard/tickets",
      "/tr/dashboard/calendar",
      "/tr/dashboard/compliance",
      "/tr/dashboard/finance",
      "/tr/dashboard/documents",
      "/tr/dashboard/reports",
      "/tr/dashboard/communications",
      "/tr/dashboard/offline",
      "/tr/dashboard/users",
      "/tr/dashboard/settings",
    ]
    const viewports = [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]

    const results = []
    for (const viewport of viewports) {
      for (const route of routes) {
        results.push(await auditRoute(browser, args.baseUrl, route, viewport, outDir))
      }
    }

    if (args.headed && args.holdMs > 0) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      await page.goto(new URL("/tr/dashboard", args.baseUrl).toString(), { waitUntil: "networkidle" })
      console.log(`Manual browser hold active for ${args.holdMs}ms. Inspect the headed browser now.`)
      await page.waitForTimeout(args.holdMs)
      await context.close()
    }

    await browser.close()

    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl: args.baseUrl,
      outDir,
      results,
      passed: results.every((result) => result.passed),
    }
    await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2))

    const failed = results.filter((result) => !result.passed)
    console.log(`Browser audit complete: ${results.length - failed.length}/${results.length} routes passed.`)
    console.log(`Report: ${path.join(outDir, "report.json")}`)
    if (failed.length > 0) {
      for (const failure of failed) {
        console.error(`FAIL ${failure.route} ${failure.viewport.width}x${failure.viewport.height}`)
        for (const issue of [...failure.issues, ...failure.serverErrors]) console.error(`  ${issue}`)
      }
      process.exitCode = 1
    }
  } finally {
    if (server) stopDevServer(server)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
