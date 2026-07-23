// AI eval / leak-test harness for the two 1Cati AI surfaces.
//
//   * /api/ai/chat        (dashboard, authenticated -- role set via the
//                          access_profile_role cookie in access-profile mode)
//   * /api/ai/public-chat (public landing concierge, anonymous)
//
// It replays every case in apps/web/e2e/fixtures/ai-golden-set.json, checks each
// `expect`, prints a table + a PASS/FAIL summary, and exits NON-ZERO on ANY
// failure (a leak or a behavior regression). The golden set encodes the CURRENT
// code behavior, so a clean run means "no drift"; any red row is a real change.
//
// Server: by default the harness spawns its own Next dev server in access-profile
// mode (Supabase + AI gateway blanked, exactly like playwright.config.ts) so the
// deterministic fallback + local-seed path is exercised. Pass --reuse (or
// AI_EVAL_REUSE_SERVER=true) to run against an already-running server instead.
//
// Base URL: AI_EVAL_BASE_URL (default http://127.0.0.1:3100).
//
// Exit codes are read directly (no piping through tail/tee -- LESSONS-LEARNED #1):
// run this WITHOUT a pipe, or redirect to a file, so the real exit code survives.

import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webDir = path.join(rootDir, "apps", "web")
const goldenSetPath = path.join(
  webDir,
  "e2e",
  "fixtures",
  "ai-golden-set.json"
)

const argv = process.argv.slice(2)
const reuseServer =
  argv.includes("--reuse") || process.env.AI_EVAL_REUSE_SERVER === "true"
const onlyNegatives = argv.includes("--negatives-only")
const baseUrl = (
  process.env.AI_EVAL_BASE_URL ?? "http://127.0.0.1:3100"
).replace(/\/$/, "")
const port = new URL(baseUrl).port || "3100"
const readinessUrl = `${baseUrl}/tr`
const REQUEST_TIMEOUT_MS = 30_000
const SERVER_READY_TIMEOUT_MS = 150_000

// Env for the spawned dev server: mirror playwright.config.ts so access profiles
// are enabled and the deterministic AI + local-seed paths run (no live gateway,
// no Supabase). This also makes the service-role trace insert a no-op.
const serverEnv = {
  ...process.env,
  ENABLE_ACCESS_PROFILES: "true",
  CATI_ENV: "qa",
  CATI_DEMO_DATA_ISOLATED: "true",
  AI_API_URL: "",
  AI_API_KEY: "",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
}

function expandMessage(message) {
  const match = /^__REPEAT__(.+)__(\d+)$/.exec(message)
  if (!match) return message
  return match[1].repeat(Number(match[2]))
}

function startServer() {
  const command =
    process.platform === "win32"
      ? `cmd /c npm run dev -- -p ${port}`
      : `npm run dev -- -p ${port}`
  const child = spawn(command, {
    cwd: webDir,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    env: serverEnv,
  })
  child.stdout.on("data", (chunk) => process.stdout.write(`[web] ${chunk}`))
  child.stderr.on("data", (chunk) => process.stderr.write(`[web] ${chunk}`))
  return child
}

function stopServer(child) {
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

async function waitForServer(url, timeoutMs) {
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

async function isReachable(url) {
  try {
    const response = await fetch(url, { cache: "no-store" })
    return response.ok || response.status < 500
  } catch {
    return false
  }
}

async function postCase(testCase) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const message = expandMessage(testCase.message)
  const endpoint =
    testCase.surface === "public" ? "/api/ai/public-chat" : "/api/ai/chat"
  const headers = { "Content-Type": "application/json" }
  if (testCase.surface === "dashboard" && testCase.role) {
    // getUserProfile() reads this cookie directly in access-profile mode; the
    // /api/access-profile endpoint just sets this same value.
    headers.Cookie = `access_profile_role=${testCase.role}`
  }
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, locale: testCase.locale }),
      signal: controller.signal,
    })
    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    return { status: response.status, payload }
  } finally {
    clearTimeout(timer)
  }
}

// Surface-aware interpretation of the abstract golden-set expectations.
// Dashboard "refused" now covers all three ACTING guardrails: the RBAC guard, a
// blocked strong prompt-injection probe, and a graceful out-of-scope decline.
const DASHBOARD_REFUSING_SOURCES = new Set([
  "rbac-guard",
  "guardrail-injection",
  "guardrail-out-of-scope",
])

function actualRefused(surface, payload) {
  if (surface === "public") return payload?.outcome === "refused_private_data"
  return DASHBOARD_REFUSING_SOURCES.has(payload?.source)
}

function actualOutOfScope(surface, payload) {
  if (surface === "public") return payload?.outcome === "uncertain"
  return payload?.source === "guardrail-out-of-scope"
}

function actualInjectionFlag(payload) {
  const flags = payload?.evaluation?.flags
  return Array.isArray(flags) && flags.includes("prompt_injection_probe")
}

function evaluateCase(testCase, result) {
  const { surface } = testCase
  const expect = testCase.expect ?? {}
  const checks = []
  const add = (name, ok, detail) => checks.push({ name, ok, detail })

  if (typeof expect.status === "number") {
    add(
      `status=${expect.status}`,
      result.status === expect.status,
      `got ${result.status}`
    )
    // For explicit non-2xx expectations there is no JSON body to inspect.
    if (expect.status >= 400) {
      return { checks, passed: checks.every((c) => c.ok) }
    }
  } else {
    add("status=200", result.status === 200, `got ${result.status}`)
  }

  const payload = result.payload ?? {}

  if (Array.isArray(expect.sourceOneOf)) {
    add(
      `source in [${expect.sourceOneOf.join(", ")}]`,
      expect.sourceOneOf.includes(payload.source),
      `got "${payload.source}"`
    )
  }
  if (typeof expect.language === "string") {
    add(
      `language=${expect.language}`,
      payload.language === expect.language,
      `got "${payload.language}"`
    )
  }
  if (typeof expect.topic === "string") {
    add(
      `topic=${expect.topic}`,
      payload.topic === expect.topic,
      `got "${payload.topic}"`
    )
  }
  if (typeof expect.resource === "string") {
    add(
      `resource=${expect.resource}`,
      payload.resource === expect.resource,
      `got "${payload.resource}"`
    )
  }
  if (typeof expect.refused === "boolean") {
    add(
      `refused=${expect.refused}`,
      actualRefused(surface, payload) === expect.refused,
      `got ${actualRefused(surface, payload)}`
    )
  }
  if (typeof expect.outOfScope === "boolean") {
    add(
      `outOfScope=${expect.outOfScope}`,
      actualOutOfScope(surface, payload) === expect.outOfScope,
      `got ${actualOutOfScope(surface, payload)}`
    )
  }
  if (typeof expect.injectionFlag === "boolean") {
    add(
      `injectionFlag=${expect.injectionFlag}`,
      actualInjectionFlag(payload) === expect.injectionFlag,
      `got ${actualInjectionFlag(payload)}`
    )
  }
  const reply = typeof payload.reply === "string" ? payload.reply : ""
  if (Array.isArray(expect.mustContain)) {
    for (const needle of expect.mustContain) {
      add(`mustContain "${needle}"`, reply.includes(needle), "missing")
    }
  }
  if (Array.isArray(expect.mustNotContain)) {
    for (const needle of expect.mustNotContain) {
      add(
        `mustNotContain "${needle}"`,
        !reply.includes(needle),
        "LEAK: present in reply"
      )
    }
  }

  return { checks, passed: checks.every((c) => c.ok) }
}

function pad(value, width) {
  const str = String(value)
  return str.length >= width ? str : str + " ".repeat(width - str.length)
}

async function main() {
  const raw = await fs.readFile(goldenSetPath, "utf8")
  const goldenSet = JSON.parse(raw)
  let cases = goldenSet.cases ?? []
  if (onlyNegatives) {
    cases = cases.filter((testCase) => {
      const expect = testCase.expect ?? {}
      return (
        expect.refused === true ||
        expect.outOfScope === true ||
        expect.injectionFlag === true ||
        Array.isArray(expect.mustNotContain) ||
        (typeof expect.status === "number" && expect.status >= 400)
      )
    })
  }

  console.log(
    `AI eval harness -- golden set "${goldenSet.version}" (${cases.length} cases) against ${baseUrl}`
  )

  let server = null
  if (!reuseServer) {
    if (await isReachable(readinessUrl)) {
      console.log(
        `A server is already reachable at ${readinessUrl}; reusing it (pass --reuse to skip this check).`
      )
    } else {
      console.log(`Starting a dev server on port ${port} (access-profile mode)...`)
      server = startServer()
    }
  }

  const results = []
  try {
    await waitForServer(readinessUrl, SERVER_READY_TIMEOUT_MS)
    console.log("Server is reachable. Replaying golden set.\n")

    for (const testCase of cases) {
      let result
      try {
        result = await postCase(testCase)
      } catch (error) {
        result = { status: 0, payload: null, error: error.message }
      }
      const evaluation = result.error
        ? { checks: [{ name: "request", ok: false, detail: result.error }], passed: false }
        : evaluateCase(testCase, result)
      results.push({ testCase, result, ...evaluation })
    }
  } finally {
    if (server) {
      console.log("\nStopping the dev server started by the harness...")
      stopServer(server)
    }
  }

  // Table.
  console.log(
    `\n${pad("RESULT", 6)} ${pad("SURFACE", 9)} ${pad("ROLE", 13)} ${pad("ID", 34)} STATUS`
  )
  console.log("-".repeat(78))
  for (const row of results) {
    console.log(
      `${pad(row.passed ? "PASS" : "FAIL", 6)} ${pad(row.testCase.surface, 9)} ${pad(
        row.testCase.role ?? "-",
        13
      )} ${pad(row.testCase.id, 34)} ${row.result.status}`
    )
    if (!row.passed) {
      for (const check of row.checks.filter((c) => !c.ok)) {
        console.log(`         - ${check.name} -> ${check.detail}`)
      }
    }
  }

  const failed = results.filter((row) => !row.passed)
  console.log("-".repeat(78))
  console.log(
    `\nSUMMARY: ${results.length - failed.length}/${results.length} cases passed.`
  )
  if (failed.length > 0) {
    console.log(`FAIL: ${failed.length} case(s) failed:`)
    for (const row of failed) console.log(`  - ${row.testCase.id}`)
    process.exitCode = 1
    console.log("\nOVERALL: FAIL")
  } else {
    console.log("OVERALL: PASS")
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
