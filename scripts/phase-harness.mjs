import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const resultsDir = path.join(rootDir, "quality", "results")
const workspaceTempDir = path.join(rootDir, ".tmp")

const phases = new Map([
  [1, "Discovery, requirement lock and market benchmark"],
  [2, "UX/UI design system and product navigation"],
  [3, "Platform foundation, auth, RBAC and audit"],
  [4, "Site, block, floor, flat and data import"],
  [5, "User, owner, tenant and staff management"],
  [6, "Financial ledger engine"],
  [7, "Payments, deposits, reconciliation and debt restrictions"],
  [8, "Service catalogue and service order flow"],
  [9, "Task, workforce, SLA and field reporting"],
  [10, "Booking, letting, move-in and checkout"],
  [11, "Communication, notifications and documents"],
  [12, "Web app, PWA and mobile web experience"],
  [13, "External integrations"],
  [14, "AI premium layer and advanced analytics"],
  [15, "QA, security, performance, UAT, training and launch"],
])

function parseArgs(argv) {
  const args = {
    phase: 1,
    profile: "smoke",
    maxAttempts: 1,
    dryRun: false,
    skipBrowser: false,
    skipE2e: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--phase") args.phase = Number(argv[++i])
    else if (arg === "--profile") args.profile = argv[++i]
    else if (arg === "--max-attempts") args.maxAttempts = Number(argv[++i])
    else if (arg === "--dry-run") args.dryRun = true
    else if (arg === "--skip-browser") args.skipBrowser = true
    else if (arg === "--skip-e2e") args.skipE2e = true
  }

  if (!phases.has(args.phase)) {
    throw new Error(`Unknown phase ${args.phase}. Expected 1-15.`)
  }
  if (!["docs", "smoke", "full"].includes(args.profile)) {
    throw new Error(`Unknown profile ${args.profile}. Expected docs, smoke or full.`)
  }
  if (!Number.isFinite(args.maxAttempts) || args.maxAttempts < 1) {
    throw new Error("--max-attempts must be a positive number")
  }
  return args
}

function shellCommand(command, env = {}) {
  return { type: "command", command, env }
}

function npmScript(scriptName, ...args) {
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm"
  const extraArgs = args.length > 0 ? ` -- ${args.join(" ")}` : ""
  return `${npmExecutable} --prefix apps/web run ${scriptName}${extraArgs}`
}

const gatesByProfile = {
  docs: [
    { name: "requirements-docs", ...{ type: "builtin", fn: verifyRequirementsDocs } },
  ],
  smoke: [
    { name: "requirements-docs", type: "builtin", fn: verifyRequirementsDocs },
    { name: "lint", ...shellCommand(npmScript("lint")) },
    { name: "typecheck", ...shellCommand(npmScript("typecheck")) },
  ],
  full: [
    { name: "requirements-docs", type: "builtin", fn: verifyRequirementsDocs },
    { name: "lint", ...shellCommand(npmScript("lint")) },
    { name: "typecheck", ...shellCommand(npmScript("typecheck")) },
    { name: "build", ...shellCommand(npmScript("build")) },
    { name: "playwright-e2e", ...shellCommand(npmScript("test:e2e"), { PLAYWRIGHT_SERVER_MODE: "production" }) },
    { name: "browser-audit", ...shellCommand("node scripts/browser-audit.mjs --start-server --server-mode start") },
  ],
}

async function verifyRequirementsDocs() {
  const required = [
    "docs/requirements/option-3-ai-site-crm/BRD.md",
    "docs/requirements/option-3-ai-site-crm/PRD.md",
    "docs/requirements/option-3-ai-site-crm/TRD.md",
    "docs/requirements/option-3-ai-site-crm/Market-Research-Annex.md",
    "docs/requirements/option-3-ai-site-crm/BRD.docx",
    "docs/requirements/option-3-ai-site-crm/PRD.docx",
    "docs/requirements/option-3-ai-site-crm/TRD.docx",
    "docs/requirements/option-3-ai-site-crm/Market-Research-Annex.docx",
    "docs/requirements/option-3-ai-site-crm/1Cati-Requirements-Package.docx",
    "docs/ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md",
  ]

  const missing = []
  for (const relative of required) {
    try {
      await fs.access(path.join(rootDir, relative))
    } catch {
      missing.push(relative)
    }
  }
  if (missing.length > 0) throw new Error(`Missing required files:\n${missing.join("\n")}`)

  const brd = await fs.readFile(path.join(rootDir, required[0]), "utf8")
  const trd = await fs.readFile(path.join(rootDir, required[2]), "utf8")
  const annex = await fs.readFile(path.join(rootDir, required[3]), "utf8")
  const requiredPhrases = [
    ["BRD", brd, "Top Turkish Player Review"],
    ["BRD", brd, "Edge Cases And Exception Handling"],
    ["TRD", trd, "Turkish Competitor Technical Implications"],
    ["TRD", trd, "Technical Edge Cases And Failure Modes"],
    ["Annex", annex, "Top Five Turkey Player Deep-Dive"],
    ["Annex", annex, "Apsiyon"],
    ["Annex", annex, "Senyonet"],
    ["Annex", annex, "Yönetimcell"],
    ["Annex", annex, "Aidatım"],
    ["Annex", annex, "Siteplus"],
  ]

  const phraseFailures = requiredPhrases
    .filter(([, content, phrase]) => !content.includes(phrase))
    .map(([doc, , phrase]) => `${doc}: ${phrase}`)
  if (phraseFailures.length > 0) {
    throw new Error(`Missing required content:\n${phraseFailures.join("\n")}`)
  }

  return { message: "Requirements documentation is present and contains market/edge-case coverage." }
}

function shouldSkipGate(gate, args) {
  if (args.skipBrowser && gate.name === "browser-audit") return true
  if (args.skipE2e && gate.name === "playwright-e2e") return true
  return false
}

async function runCommand(command, logFile, env = {}) {
  return await new Promise((resolve) => {
    const started = Date.now()
    const commandEnv = {
      ...process.env,
      TEMP: workspaceTempDir,
      TMP: workspaceTempDir,
      ...env,
      FORCE_COLOR: "1",
    }
    const child = spawn(command, {
      cwd: rootDir,
      shell: true,
      env: commandEnv,
    })
    const chunks = []
    const append = (chunk, stream) => {
      const text = chunk.toString()
      chunks.push(text)
      stream.write(text)
    }

    child.stdout.on("data", (chunk) => append(chunk, process.stdout))
    child.stderr.on("data", (chunk) => append(chunk, process.stderr))
    child.on("close", async (code) => {
      await fs.writeFile(logFile, chunks.join(""), "utf8")
      resolve({
        code,
        durationMs: Date.now() - started,
        logFile,
      })
    })
  })
}

async function runGate(gate, args, outDir) {
  if (shouldSkipGate(gate, args)) {
    return { name: gate.name, skipped: true, attempts: [] }
  }
  if (args.dryRun) {
    return {
      name: gate.name,
      dryRun: true,
      command: gate.command ?? "builtin",
      attempts: [],
      passed: true,
    }
  }

  const attempts = []
  for (let attempt = 1; attempt <= args.maxAttempts; attempt++) {
    const attemptStarted = Date.now()
    const logFile = path.join(outDir, `${gate.name}-attempt-${attempt}.log`)
    console.log(`\n[${gate.name}] attempt ${attempt}/${args.maxAttempts}`)
    try {
      if (gate.type === "builtin") {
        const result = await gate.fn()
        attempts.push({
          attempt,
          passed: true,
          durationMs: Date.now() - attemptStarted,
          result,
        })
        return { name: gate.name, passed: true, attempts }
      }

      const result = await runCommand(gate.command, logFile, gate.env)
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
        durationMs: Date.now() - attemptStarted,
        error: error.message,
      })
    }
  }
  return { name: gate.name, passed: false, attempts }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const phaseName = phases.get(args.phase)
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(resultsDir, `phase-${String(args.phase).padStart(2, "0")}-${args.profile}-${timestamp}`)
  await fs.mkdir(outDir, { recursive: true })

  const selectedGates = gatesByProfile[args.profile]
  console.log(`Phase ${args.phase}: ${phaseName}`)
  console.log(`Profile: ${args.profile}`)
  console.log(`Attempts per gate: ${args.maxAttempts}`)
  console.log(`Results directory: ${outDir}`)
  console.log("\nGates:")
  selectedGates.forEach((gate, index) => {
    const command = gate.command ? ` - ${gate.command}` : " - builtin"
    console.log(`${index + 1}. ${gate.name}${command}`)
  })

  const gateResults = []
  for (const gate of selectedGates) {
    const result = await runGate(gate, args, outDir)
    gateResults.push(result)
    if (!result.passed && !result.skipped) {
      console.error(`\nGate failed: ${gate.name}. Stopping phase harness.`)
      break
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    phase: args.phase,
    phaseName,
    profile: args.profile,
    maxAttempts: args.maxAttempts,
    passed: gateResults.every((result) => result.passed || result.skipped),
    resultsDir: outDir,
    gateResults,
    manualNextStep: `Record manual QA notes in quality/results/phase-${String(args.phase).padStart(2, "0")}-manual-notes.md`,
  }
  const reportPath = path.join(outDir, "phase-report.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8")
  console.log(`\nPhase report: ${reportPath}`)
  console.log(report.passed ? "Phase harness passed." : "Phase harness failed.")
  if (!report.passed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
