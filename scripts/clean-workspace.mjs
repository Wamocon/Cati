import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const args = new Set(process.argv.slice(2))
const dryRun = args.has("--dry-run")
const includeDeps = args.has("--include-deps")

const generatedTargets = [
  ".graphify",
  ".tmp",
  ".turbo",
  ".vercel",
  "Microsoft",
  "qa",
  "qa_output",
  "quality",
  "apps/pitch/.vercel",
  "apps/web/.graphify",
  "apps/web/.next",
  "apps/web/.tmp",
  "apps/web/.turbo",
  "apps/web/.vercel",
  "apps/web/Microsoft",
  "apps/web/playwright-report",
  "apps/web/qa",
  "apps/web/test-results",
  "apps/web/tsconfig.tsbuildinfo",
  "apps/web/next-env.d.ts",
  "apps/web/.env.local.example",
  "supabase/.branches",
  "supabase/.temp",
]

const dependencyTargets = [
  ".pnpm-store",
  "node_modules",
  "apps/web/node_modules",
]

const targets = includeDeps
  ? [...generatedTargets, ...dependencyTargets]
  : generatedTargets

function assertInsideRoot(targetPath) {
  const relative = path.relative(rootDir, targetPath)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to remove outside repository: ${targetPath}`)
  }
}

async function exists(targetPath) {
  try {
    await fs.lstat(targetPath)
    return true
  } catch (error) {
    if (error?.code === "ENOENT") return false
    throw error
  }
}

const removed = []
const skipped = []

for (const target of targets) {
  const absoluteTarget = path.resolve(rootDir, target)
  assertInsideRoot(absoluteTarget)

  if (!(await exists(absoluteTarget))) {
    skipped.push(target)
    continue
  }

  removed.push(target)
  if (!dryRun) {
    await fs.rm(absoluteTarget, { recursive: true, force: true })
  }
}

console.log(
  JSON.stringify(
    {
      dryRun,
      includeDeps,
      removed,
      skipped,
    },
    null,
    2
  )
)
