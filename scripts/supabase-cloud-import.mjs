import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

const defaults = {
  projectRef: "hczmbaqofxyusellxhyp",
  importFile: path.join(rootDir, "supabase", "imports", "new-level-premium-real-data.sql"),
  expectedUnits: 769,
}

function parseArgs(argv) {
  const args = {
    projectRef: process.env.SUPABASE_PROJECT_REF || defaults.projectRef,
    importFile: defaults.importFile,
    dbUrl: process.env.SUPABASE_DB_URL || "",
    pushMigrations: false,
    skipLink: false,
    skipImport: false,
    skipVerify: false,
    verifyOnly: false,
    maxStatements: 0,
    fromStatement: 1,
    groupSize: Number.parseInt(process.env.SUPABASE_IMPORT_GROUP_SIZE || "50", 10),
    outDir: path.join(rootDir, "quality", "results"),
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--project-ref") args.projectRef = argv[++i]
    else if (arg === "--import-file") args.importFile = path.resolve(argv[++i])
    else if (arg === "--db-url") args.dbUrl = argv[++i]
    else if (arg === "--push-migrations") args.pushMigrations = true
    else if (arg === "--skip-link") args.skipLink = true
    else if (arg === "--skip-import") args.skipImport = true
    else if (arg === "--skip-verify") args.skipVerify = true
    else if (arg === "--verify-only") {
      args.verifyOnly = true
      args.skipImport = true
    } else if (arg === "--max-statements") args.maxStatements = Number.parseInt(argv[++i], 10)
    else if (arg === "--from-statement") args.fromStatement = Number.parseInt(argv[++i], 10)
    else if (arg === "--group-size") args.groupSize = Number.parseInt(argv[++i], 10)
    else if (arg === "--out-dir") args.outDir = path.resolve(argv[++i])
    else if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log(`Supabase cloud import harness

Usage:
  node scripts/supabase-cloud-import.mjs [options]

Options:
  --project-ref <ref>      Supabase project ref. Defaults to ${defaults.projectRef}
  --db-url <url>           Percent-encoded direct Postgres URL. Can also use SUPABASE_DB_URL.
  --push-migrations        Run "supabase db push" before import. Seed data is not included.
  --skip-link              Do not run "supabase link" before linked commands.
  --skip-import            Only run verification checks.
  --skip-verify            Run import without final verification.
  --verify-only            Alias for --skip-import.
  --max-statements <n>     Execute only the first n import statements. For harness testing only.
  --from-statement <n>     Start import execution at one-based statement n. For controlled resume only.
  --group-size <n>         Number of import statements per PostgreSQL DO block. Defaults to 50.
  --import-file <path>     SQL import file. Defaults to supabase/imports/new-level-premium-real-data.sql
  --out-dir <path>         Output root for QA evidence. Defaults to quality/results.

Auth:
  Linked mode requires "npx supabase login" or SUPABASE_ACCESS_TOKEN.
  Direct mode requires SUPABASE_DB_URL or --db-url.
  Optional SUPABASE_DB_PASSWORD is passed to link/db-push without printing it.
`)
}

function redact(value) {
  if (!value) return value
  return value
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://<redacted>@")
    .replace(/--password\s+\S+/gi, "--password <redacted>")
}

function run(command, args, options = {}) {
  const printable = [command, ...args].map((part) => (part === options.secret ? "<redacted>" : part)).join(" ")
  if (!options.silent) console.log(`\n$ ${redact(printable)}`)
  const spawnCommand = process.platform === "win32" ? "cmd.exe" : command
  const spawnArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", [command, ...args].map(quoteWindowsArg).join(" ")]
      : args
  const result = spawnSync(spawnCommand, spawnArgs, {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
    env: process.env,
    maxBuffer: 1024 * 1024 * 20,
  })

  const stdout = redact(result.stdout || "")
  const stderr = redact(result.stderr || "")
  if (!options.silent && stdout.trim()) console.log(stdout.trim())
  if (!options.silent && stderr.trim()) console.error(stderr.trim())

  if (result.error) throw result.error
  if (result.status !== 0) {
    const error = new Error(`Command failed with exit ${result.status}: ${redact(printable)}`)
    error.stdout = stdout
    error.stderr = stderr
    throw error
  }

  return { stdout, stderr }
}

function quoteWindowsArg(value) {
  const text = String(value)
  if (!/[ \t&()^|<>"%]/.test(text)) return text
  return `"${text.replace(/"/g, '\\"')}"`
}

function splitSqlStatements(sql) {
  const statements = []
  let current = ""
  let quote = null
  let dollarTag = ""
  let lineComment = false
  let blockComment = false

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i]
    const next = sql[i + 1] || ""

    if (lineComment) {
      current += char
      if (char === "\n") lineComment = false
      continue
    }

    if (blockComment) {
      current += char
      if (char === "*" && next === "/") {
        current += next
        i += 1
        blockComment = false
      }
      continue
    }

    if (dollarTag) {
      current += char
      if (sql.startsWith(dollarTag, i)) {
        current += sql.slice(i + 1, i + dollarTag.length)
        i += dollarTag.length - 1
        dollarTag = ""
      }
      continue
    }

    if (quote) {
      current += char
      if (char === quote) {
        if (quote === "'" && next === "'") {
          current += next
          i += 1
        } else {
          quote = null
        }
      }
      continue
    }

    if (char === "-" && next === "-") {
      current += char + next
      i += 1
      lineComment = true
      continue
    }

    if (char === "/" && next === "*") {
      current += char + next
      i += 1
      blockComment = true
      continue
    }

    if (char === "'" || char === '"') {
      current += char
      quote = char
      continue
    }

    if (char === "$") {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/)
      if (match) {
        dollarTag = match[0]
        current += dollarTag
        i += dollarTag.length - 1
        continue
      }
    }

    if (char === ";") {
      const statement = current.trim()
      if (statement) statements.push(statement)
      current = ""
      continue
    }

    current += char
  }

  const tail = current.trim()
  if (tail) statements.push(tail)
  return statements
}

function importStatements(importFile) {
  return splitSqlStatements(fs.readFileSync(importFile, "utf8")).filter(
    (statement) => !/^(BEGIN|COMMIT)$/i.test(statementWithoutComments(statement))
  )
}

function statementWithoutComments(statement) {
  return statement
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*--.*$/gm, "")
    .trim()
}

function runImportStatements(npx, args, outDir) {
  const allStatements = importStatements(args.importFile)
  const fromIndex = Math.max(args.fromStatement || 1, 1) - 1
  const selected = allStatements.slice(fromIndex, args.maxStatements ? fromIndex + args.maxStatements : undefined)
  const statementPath = path.join(outDir, "current-import-statement.sql")
  const groupSize = Math.max(args.groupSize || 1, 1)
  console.log(
    `Executing ${selected.length} SQL statements from ${path.relative(rootDir, args.importFile)} ` +
      `(starting at ${fromIndex + 1} of ${allStatements.length}, group size ${groupSize}).`
  )

  for (let offset = 0; offset < selected.length; offset += groupSize) {
    const group = selected.slice(offset, offset + groupSize)
    const firstStatementNumber = fromIndex + offset + 1
    const lastStatementNumber = firstStatementNumber + group.length - 1
    fs.writeFileSync(statementPath, makeDoBlock(group, firstStatementNumber), "utf8")
    console.log(`  statements ${firstStatementNumber}-${lastStatementNumber}/${allStatements.length}`)
    try {
      run(npx, supabaseArgs(args, ["supabase", "db", "query", "--file", cliFilePath(statementPath)]), {
        silent: true,
      })
    } catch (error) {
      error.message = `Import statements ${firstStatementNumber}-${lastStatementNumber} failed. ${error.message}`
      throw error
    }
  }
}

function makeDoBlock(statements, firstStatementNumber) {
  const lines = ["DO $cati_import_block$", "BEGIN"]
  statements.forEach((statement, index) => {
    const tag = `$cati_stmt_${firstStatementNumber + index}$`
    lines.push(`  EXECUTE ${tag}`)
    lines.push(statement)
    lines.push(`${tag};`)
  })
  lines.push("END")
  lines.push("$cati_import_block$;")
  return `${lines.join("\n")}\n`
}

function npxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx"
}

function supabaseArgs(args, commandArgs) {
  if (args.dbUrl) return [...commandArgs, "--db-url", args.dbUrl]
  return [...commandArgs, "--linked"]
}

function cliFilePath(filePath) {
  const relative = path.relative(rootDir, filePath)
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) return relative
  return filePath
}

function linkedProjectRef() {
  const refPath = path.join(rootDir, "supabase", ".temp", "project-ref")
  if (!fs.existsSync(refPath)) return ""
  return fs.readFileSync(refPath, "utf8").trim()
}

function writeVerificationSql(outDir) {
  const verifyPath = path.join(outDir, "verify-new-level-premium.sql")
  const sql = `
WITH target_site AS (
  SELECT s.id, s.company_id
  FROM public.sites s
  JOIN public.companies c ON c.id = s.company_id
  WHERE c.slug = 'ataberk-estate'
    AND s.code = 'NLP-AVS'
  LIMIT 1
),
phase4 AS (
  SELECT public.get_phase4_site_data('', 3) AS payload
),
checks AS (
  SELECT
    'unit_total' AS check_name,
    (SELECT count(*)::text FROM public.units u JOIN target_site s ON s.id = u.site_id) AS actual,
    '769' AS expected,
    (SELECT count(*) = 769 FROM public.units u JOIN target_site s ON s.id = u.site_id) AS passed
  UNION ALL
  SELECT 'sale_status_available', count(*) FILTER (WHERE u.sale_status = 'available')::text, '187', count(*) FILTER (WHERE u.sale_status = 'available') = 187
  FROM public.units u JOIN target_site s ON s.id = u.site_id
  UNION ALL
  SELECT 'sale_status_sold', count(*) FILTER (WHERE u.sale_status = 'sold')::text, '565', count(*) FILTER (WHERE u.sale_status = 'sold') = 565
  FROM public.units u JOIN target_site s ON s.id = u.site_id
  UNION ALL
  SELECT 'sale_status_source_missing', count(*) FILTER (WHERE u.sale_status = 'source_missing')::text, '0', count(*) FILTER (WHERE u.sale_status = 'source_missing') = 0
  FROM public.units u JOIN target_site s ON s.id = u.site_id
  UNION ALL
  SELECT 'sale_status_unknown', count(*) FILTER (WHERE u.sale_status = 'unknown')::text, '17', count(*) FILTER (WHERE u.sale_status = 'unknown') = 17
  FROM public.units u JOIN target_site s ON s.id = u.site_id
  UNION ALL
  SELECT 'block_total', (SELECT count(*)::text FROM public.site_blocks b JOIN target_site s ON s.id = b.site_id), '7',
    (SELECT count(*) = 7 FROM public.site_blocks b JOIN target_site s ON s.id = b.site_id)
  UNION ALL
  SELECT 'office_total', (SELECT count(*)::text FROM public.offices o JOIN target_site s ON s.company_id = o.company_id WHERE o.name = 'Ataberk Avsallar Office' AND o.city = 'Alanya'), '1',
    (SELECT count(*) = 1 FROM public.offices o JOIN target_site s ON s.company_id = o.company_id WHERE o.name = 'Ataberk Avsallar Office' AND o.city = 'Alanya')
  UNION ALL
  SELECT 'unit_a_001_price', COALESCE((u.list_price_eur_cents)::text, ''), '26410000', u.sale_status = 'available' AND u.list_price_eur_cents = 26410000
  FROM public.units u JOIN target_site s ON s.id = u.site_id
  WHERE u.unit_no = 'A-001'
  UNION ALL
  SELECT 'search_doc_a_001', (SELECT count(*)::text FROM public.operational_search_documents d JOIN target_site s ON s.id = d.site_id WHERE d.entity_table = 'units' AND d.entity_external_id = 'A-001'), '1',
    (SELECT count(*) = 1 FROM public.operational_search_documents d JOIN target_site s ON s.id = d.site_id WHERE d.entity_table = 'units' AND d.entity_external_id = 'A-001')
  UNION ALL
  SELECT 'import_total_rows', COALESCE(sum(total_rows), 0)::text, '847', COALESCE(sum(total_rows), 0) = 847
  FROM public.import_batches b JOIN target_site s ON s.company_id = b.company_id
  WHERE b.source_name IN ('New Level Premium price-list package', 'Project documents, facility map and floor plans', 'Construction and showroom media')
  UNION ALL
  SELECT 'import_valid_rows', COALESCE(sum(valid_rows), 0)::text, '615', COALESCE(sum(valid_rows), 0) = 615
  FROM public.import_batches b JOIN target_site s ON s.company_id = b.company_id
  WHERE b.source_name IN ('New Level Premium price-list package', 'Project documents, facility map and floor plans', 'Construction and showroom media')
  UNION ALL
  SELECT 'import_warning_rows', COALESCE(sum(warning_rows), 0)::text, '232', COALESCE(sum(warning_rows), 0) = 232
  FROM public.import_batches b JOIN target_site s ON s.company_id = b.company_id
  WHERE b.source_name IN ('New Level Premium price-list package', 'Project documents, facility map and floor plans', 'Construction and showroom media')
  UNION ALL
  SELECT 'import_rejected_rows', COALESCE(sum(rejected_rows), 0)::text, '0', COALESCE(sum(rejected_rows), 0) = 0
  FROM public.import_batches b JOIN target_site s ON s.company_id = b.company_id
  WHERE b.source_name IN ('New Level Premium price-list package', 'Project documents, facility map and floor plans', 'Construction and showroom media')
  UNION ALL
  SELECT 'import_finding_count', count(*)::text, '3', count(*) = 3
  FROM public.import_findings f
  JOIN public.import_batches b ON b.id = f.import_batch_id
  JOIN target_site s ON s.company_id = b.company_id
  WHERE b.source_name IN ('New Level Premium price-list package', 'Project documents, facility map and floor plans', 'Construction and showroom media')
  UNION ALL
  SELECT 'phase4_source', phase4.payload->>'source', 'supabase', phase4.payload->>'source' = 'supabase'
  FROM phase4
  UNION ALL
  SELECT 'phase4_total_units', phase4.payload->'summary'->>'totalUnits', '769', phase4.payload->'summary'->>'totalUnits' = '769'
  FROM phase4
  UNION ALL
  SELECT 'phase4_first_unit', phase4.payload->'units'->0->>'unit_no', 'A-001', phase4.payload->'units'->0->>'unit_no' = 'A-001'
  FROM phase4
)
SELECT check_name, actual, expected, passed
FROM checks
ORDER BY check_name;
`.trimStart()
  fs.writeFileSync(verifyPath, sql, "utf8")
  return verifyPath
}

function parseQueryJson(output) {
  const start = output.indexOf("{")
  const end = output.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Supabase query output did not include a JSON result payload.")
  }
  return JSON.parse(output.slice(start, end + 1))
}

function runVerification(npx, args, outDir) {
  const verifyPath = writeVerificationSql(outDir)
  const result = run(npx, supabaseArgs(args, ["supabase", "db", "query", "--file", cliFilePath(verifyPath)]))
  const payload = parseQueryJson(result.stdout)
  const rows = Array.isArray(payload.rows) ? payload.rows : []
  const failed = rows.filter((row) => row?.passed !== true)
  if (failed.length > 0) {
    throw new Error(`Verification failed: ${failed.map((row) => `${row.check_name} actual=${row.actual} expected=${row.expected}`).join("; ")}`)
  }
  if (rows.length === 0) throw new Error("Verification returned no check rows.")
}

function writeSummary(outDir, args, status, error = null) {
  const summary = {
    generatedAt: new Date().toISOString(),
    projectRef: args.projectRef,
    importFile: path.relative(rootDir, args.importFile),
    mode: args.dbUrl ? "db-url" : "linked",
    pushMigrations: args.pushMigrations,
    skipImport: args.skipImport,
    skipVerify: args.skipVerify,
    maxStatements: args.maxStatements,
    fromStatement: args.fromStatement,
    groupSize: args.groupSize,
    status,
    error: error
      ? {
          message: error.message,
          stderr: redact(error.stderr || ""),
        }
      : null,
  }
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8")
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(args.outDir, `supabase-cloud-import-${timestamp}`)
  fs.mkdirSync(outDir, { recursive: true })

  if (!fs.existsSync(args.importFile)) {
    throw new Error(`Import file not found: ${args.importFile}`)
  }

  const npx = npxCommand()
  const password = process.env.SUPABASE_DB_PASSWORD || ""

  try {
    run(npx, ["supabase", "--version"])

    if (!args.dbUrl && !args.skipLink && linkedProjectRef() !== args.projectRef) {
      const linkArgs = ["supabase", "link", "--project-ref", args.projectRef]
      if (password) linkArgs.push("--password", password)
      run(npx, linkArgs, { secret: password })
    }

    if (args.pushMigrations) {
      const pushArgs = supabaseArgs(args, ["supabase", "db", "push"])
      if (!args.dbUrl && password) pushArgs.push("--password", password)
      run(npx, pushArgs, { secret: password })
    }

    if (!args.skipImport) {
      runImportStatements(npx, args, outDir)
    }

    if (!args.skipVerify) {
      runVerification(npx, args, outDir)
    }

    writeSummary(outDir, args, "passed")
    console.log(`\nSupabase cloud import harness passed.`)
    console.log(`Evidence: ${outDir}`)
  } catch (error) {
    writeSummary(outDir, args, "failed", error)
    console.error(`\nSupabase cloud import harness failed.`)
    console.error(`Evidence: ${outDir}`)
    if (String(error.message).includes("Access token not provided")) {
      console.error(
        "Run `npx supabase login` or set `SUPABASE_ACCESS_TOKEN`, then rerun this harness. Alternatively set `SUPABASE_DB_URL` for direct database mode."
      )
    }
    process.exit(1)
  }
}

main()
