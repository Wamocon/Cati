import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")
const localTempDir = path.join(rootDir, ".tmp")

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3100",
    maxAttempts: 2,
    skipE2e: false,
    skipManualQa: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--base-url") args.baseUrl = argv[++i]
    else if (arg === "--max-attempts") args.maxAttempts = Number(argv[++i])
    else if (arg === "--skip-e2e") args.skipE2e = true
    else if (arg === "--skip-manual-qa") args.skipManualQa = true
  }

  if (!Number.isFinite(args.maxAttempts) || args.maxAttempts < 1) {
    throw new Error("--max-attempts must be a positive number")
  }

  return args
}

async function waitForUrl(url, timeoutMs = 60_000) {
  const started = Date.now()
  let lastError = ""

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" })
      if (response.ok || response.status < 500) return { status: response.status }
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error.message
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Timed out waiting for ${url}. Last error: ${lastError}`)
}

function commandGate(name, command, cwd, env = {}) {
  return { type: "command", name, command, cwd, env }
}

function builtinGate(name, fn) {
  return { type: "builtin", name, fn }
}

async function runCommand(gate, logFile) {
  return await new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(gate.command, {
      cwd: gate.cwd,
      shell: true,
      env: {
        ...process.env,
        TEMP: localTempDir,
        TMP: localTempDir,
        PLAYWRIGHT_BROWSERS_PATH: path.join(localTempDir, "ms-playwright"),
        ...gate.env,
      },
    })
    const chunks = []

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString()
      chunks.push(text)
      process.stdout.write(text)
    })
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString()
      chunks.push(text)
      process.stderr.write(text)
    })
    child.on("close", async (code) => {
      await fs.writeFile(logFile, chunks.join(""), "utf8")
      resolve({ code, durationMs: Date.now() - started, logFile })
    })
  })
}

async function runGate(gate, args, outDir) {
  if ((args.skipE2e && gate.name === "dashboard-e2e") || (args.skipManualQa && gate.name === "manual-browser-qa")) {
    return { name: gate.name, skipped: true, attempts: [] }
  }

  const attempts = []
  for (let attempt = 1; attempt <= args.maxAttempts; attempt++) {
    const started = Date.now()
    const logFile = path.join(outDir, `${gate.name}-attempt-${attempt}.log`)
    console.log(`\n[${gate.name}] attempt ${attempt}/${args.maxAttempts}`)

    try {
      if (gate.type === "builtin") {
        const result = await gate.fn(args)
        attempts.push({
          attempt,
          passed: true,
          durationMs: Date.now() - started,
          result,
        })
        return { name: gate.name, passed: true, attempts }
      }

      const result = await runCommand(gate, logFile)
      attempts.push({
        attempt,
        passed: result.code === 0,
        code: result.code,
        durationMs: result.durationMs,
        logFile,
      })
      if (result.code === 0) return { name: gate.name, passed: true, attempts }
    } catch (error) {
      attempts.push({
        attempt,
        passed: false,
        durationMs: Date.now() - started,
        error: error.message,
      })
    }
  }

  return { name: gate.name, passed: false, attempts }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(rootDir, "quality", "results", `phase-06-09-harness-${timestamp}`)
  await fs.mkdir(outDir, { recursive: true })
  await fs.mkdir(localTempDir, { recursive: true })

  const gates = [
    builtinGate("dev-server-reachable", async ({ baseUrl }) => waitForUrl(baseUrl)),
    commandGate("typecheck", "npm run typecheck", webDir),
    commandGate("lint", "npm run lint", webDir),
    commandGate("dashboard-e2e", "npm run test:e2e -- e2e/dashboard.spec.ts --project=chromium", webDir, {
      PLAYWRIGHT_REUSE_SERVER: "true",
    }),
    commandGate("manual-browser-qa", `node scripts/manual-phase-qa.mjs --base-url ${args.baseUrl}`, rootDir),
  ]

  console.log("Phase 6-9 harness")
  console.log(`Base URL: ${args.baseUrl}`)
  console.log(`Attempts per gate: ${args.maxAttempts}`)
  console.log(`Results directory: ${outDir}`)

  const gateResults = []
  for (const gate of gates) {
    const result = await runGate(gate, args, outDir)
    gateResults.push(result)
    if (!result.passed && !result.skipped) {
      console.error(`\nGate failed: ${gate.name}. Stopping harness.`)
      break
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scope: "Phases 6-9: viewing pipeline, sales payment plan, purchase file, buyer eligibility",
    baseUrl: args.baseUrl,
    maxAttempts: args.maxAttempts,
    passed: gateResults.every((result) => result.passed || result.skipped),
    resultsDir: outDir,
    gateResults,
  }
  const reportPath = path.join(outDir, "phase-06-09-report.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8")

  console.log(`\nPhase 6-9 report: ${reportPath}`)
  console.log(report.passed ? "Phase 6-9 harness passed." : "Phase 6-9 harness failed.")
  if (!report.passed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
