import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const webDir = path.join(rootDir, "apps", "web");

const ROLE_COUNT = 6;
const ROUTE_COUNT = 13;
const VIEWPORT_COUNT = 2;
const EXPECTED_PER_VIEWPORT = ROLE_COUNT * ROUTE_COUNT;
const EXPECTED_TOTAL = EXPECTED_PER_VIEWPORT * VIEWPORT_COUNT;
const EXPECTED_PLAYWRIGHT_TOTAL = 762;
const EXPECTED_PLAYWRIGHT_PER_PROJECT = EXPECTED_PLAYWRIGHT_TOTAL / 2;

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3104",
    outDir: path.join(rootDir, "quality", "results"),
    skipPlaywright: false,
    skipFullApp: false,
    skipRoleAudit: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") args.baseUrl = argv[++index];
    else if (arg === "--out-dir") args.outDir = path.resolve(argv[++index]);
    else if (arg === "--skip-playwright") args.skipPlaywright = true;
    else if (arg === "--skip-full-app") args.skipFullApp = true;
    else if (arg === "--skip-role-audit") args.skipRoleAudit = true;
  }

  return args;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validatedLoopbackUrl(value) {
  const url = new URL(value);
  const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  assert(url.protocol === "http:", "Release QA server must use loopback HTTP");
  assert(
    loopbackHosts.has(url.hostname),
    "Release QA server must use a loopback host",
  );
  assert(
    Boolean(url.port),
    "Release QA server must use an explicit isolated port",
  );
  assert(
    url.pathname === "/" && !url.search && !url.hash,
    "Release QA base URL must not include a path, query, or fragment",
  );
  return url;
}

async function assertPortInitiallyFree(url) {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.once("error", (error) =>
      reject(new Error(`Release QA port is not free: ${error.message}`)),
    );
    probe.listen(Number(url.port), url.hostname, () => {
      probe.close((error) => (error ? reject(error) : resolve()));
    });
  });
}

function quoted(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function npmCommand(scriptName, ...args) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const suffix = args.length > 0 ? ` -- ${args.join(" ")}` : "";
  return `${npm} --prefix apps/web run ${scriptName}${suffix}`;
}

function qaEnvironment(baseUrl, attestationNonce) {
  const port = new URL(baseUrl).port || "3104";
  return {
    ENABLE_ACCESS_PROFILES: "true",
    CATI_DEMO_DATA_ISOLATED: "true",
    CATI_ENV: "qa",
    CATI_ALLOW_REMOTE_ACCESS_PROFILES: "",
    CATI_RELEASE_HARNESS_NONCE: attestationNonce,
    VERCEL_ENV: "",
    VERCEL_URL: "",
    AI_API_URL: "",
    AI_API_KEY: "",
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    DOCUMENT_STORAGE_MODE: "demo",
    SUPABASE_DOCUMENT_BUCKET: "",
    PLAYWRIGHT_REUSE_SERVER: "true",
    PLAYWRIGHT_BASE_URL: baseUrl,
    PLAYWRIGHT_SERVER_URL: new URL("/tr", baseUrl).toString(),
    PLAYWRIGHT_PORT: port,
  };
}

function startServer(baseUrl, env, chunks) {
  const port = new URL(baseUrl).port || "3104";
  const command = npmCommand("dev", "-p", port);
  const child = spawn(command, {
    cwd: rootDir,
    env: { ...process.env, ...env },
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const append = (chunk, stream) => {
    const value = chunk.toString();
    chunks.push(value);
    stream.write(`[release-web] ${value}`);
  };
  child.stdout.on("data", (chunk) => append(chunk, process.stdout));
  child.stderr.on("data", (chunk) => append(chunk, process.stderr));
  const ownership = { child, exit: null };
  child.once("exit", (code, signal) => {
    ownership.exit = { code, signal };
  });
  return ownership;
}

async function stopServer(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn(
        "taskkill",
        ["/pid", String(child.pid), "/T", "/F"],
        {
          stdio: "ignore",
          shell: false,
        },
      );
      killer.once("close", resolve);
      killer.once("error", resolve);
    });
    return;
  }

  child.kill("SIGTERM");
  await new Promise((resolve) => {
    child.once("close", resolve);
    setTimeout(resolve, 5_000);
  });
}

async function waitForServer(
  baseUrl,
  ownership,
  attestationNonce,
  timeoutMs = 120_000,
) {
  const startedAt = Date.now();
  let lastError = "not reached";
  while (Date.now() - startedAt < timeoutMs) {
    if (ownership.exit) {
      throw new Error(
        `Owned synthetic QA server exited before readiness (code=${ownership.exit.code}, signal=${ownership.exit.signal ?? "none"})`,
      );
    }
    try {
      const response = await fetch(new URL("/api/access-profile", baseUrl), {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      const attestation = response.headers.get("x-cati-qa-attestation");
      if (
        response.status === 200 &&
        payload?.enabled === true &&
        attestation === attestationNonce
      ) {
        return response.status;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Synthetic QA server did not become ready: ${lastError}`);
}

async function verifySyntheticProfile(baseUrl, attestationNonce) {
  const response = await fetch(new URL("/api/access-profile", baseUrl), {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  assert(
    response.status === 200,
    `Access-profile preflight returned HTTP ${response.status}`,
  );
  assert(
    payload?.enabled === true,
    "Synthetic QA access profiles are not enabled",
  );
  assert(
    response.headers.get("x-cati-qa-attestation") === attestationNonce,
    "Synthetic QA endpoint was not served by the owned child process",
  );
  return { status: response.status, enabled: true, ownedChildAttested: true };
}

async function runCommand({ name, command, cwd = rootDir, env, logFile }) {
  const startedAt = Date.now();
  const chunks = [];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const append = (chunk, stream) => {
      const value = chunk.toString();
      chunks.push(value);
      stream.write(value);
    };
    child.stdout.on("data", (chunk) => append(chunk, process.stdout));
    child.stderr.on("data", (chunk) => append(chunk, process.stderr));
    child.once("error", reject);
    child.once("close", resolve);
  });
  await fs.writeFile(logFile, chunks.join(""), "utf8");
  assert(code === 0, `${name} failed with exit code ${code}; see ${logFile}`);
  return {
    name,
    command,
    durationMs: Date.now() - startedAt,
    logFile,
    passed: true,
  };
}

function collectPlaywrightTests(suites, output = []) {
  for (const suite of suites ?? []) {
    collectPlaywrightTests(suite.suites, output);
    for (const spec of suite.specs ?? []) {
      for (const item of spec.tests ?? []) {
        output.push({
          file: spec.file ?? suite.file ?? "",
          title: spec.title,
          projectName: item.projectName,
          status: item.status,
          resultStatus: item.results?.at(-1)?.status,
        });
      }
    }
  }
  return output;
}

async function parsePlaywrightReport(reportPath) {
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  return { report, tests: collectPlaywrightTests(report.suites) };
}

async function runSyntheticPlaywright(baseEnv, outDir) {
  const manifestPath = path.join(outDir, "playwright-manifest.json");
  const resultPath = path.join(outDir, "playwright-results.json");
  const manifestCommand = await runCommand({
    name: "synthetic-playwright-manifest",
    command: npmCommand("test:e2e", "--list", "--reporter=json"),
    env: { ...baseEnv, PLAYWRIGHT_JSON_OUTPUT_NAME: manifestPath },
    logFile: path.join(outDir, "synthetic-playwright-manifest.log"),
  });
  const manifest = await parsePlaywrightReport(manifestPath);
  assert(
    manifest.tests.length === EXPECTED_PLAYWRIGHT_TOTAL,
    `Playwright manifest contains ${manifest.tests.length}/${EXPECTED_PLAYWRIGHT_TOTAL} expected executions`,
  );
  assert(
    new Set(manifest.tests.map((item) => item.projectName)).size === 2 &&
      manifest.tests.some((item) => item.projectName === "chromium") &&
      manifest.tests.some((item) => item.projectName === "mobile-chrome"),
    "Playwright manifest must contain exactly Chromium and mobile Chrome projects",
  );
  for (const projectName of ["chromium", "mobile-chrome"]) {
    assert(
      manifest.tests.filter((item) => item.projectName === projectName)
        .length === EXPECTED_PLAYWRIGHT_PER_PROJECT,
      `${projectName} manifest count must be ${EXPECTED_PLAYWRIGHT_PER_PROJECT}`,
    );
  }

  const execution = await runCommand({
    name: "synthetic-playwright",
    command: npmCommand("test:e2e", "--reporter=json"),
    env: { ...baseEnv, PLAYWRIGHT_JSON_OUTPUT_NAME: resultPath },
    logFile: path.join(outDir, "synthetic-playwright.log"),
  });
  const result = await parsePlaywrightReport(resultPath);
  assert(
    result.tests.length === manifest.tests.length,
    `Playwright executed ${result.tests.length}/${manifest.tests.length} manifest tests`,
  );
  const unexpected = result.tests.filter(
    (item) =>
      !["expected", "skipped"].includes(item.status) ||
      ![undefined, "passed", "skipped"].includes(item.resultStatus),
  );
  assert(
    unexpected.length === 0,
    "Playwright JSON report contains failed, interrupted, or flaky tests",
  );
  const skipped = result.tests.filter(
    (item) => item.status === "skipped" || item.resultStatus === "skipped",
  );
  assert(
    skipped.every((item) =>
      item.file
        .replaceAll("\\", "/")
        .endsWith("/auth/access-profile-production-functional.spec.ts"),
    ),
    "Only the production-only access-profile probe may be skipped in synthetic QA",
  );

  return {
    ...execution,
    manifestCommand,
    manifestPath,
    resultPath,
    discovered: manifest.tests.length,
    executed: result.tests.length,
    skipped: skipped.length,
    projects: ["chromium", "mobile-chrome"],
  };
}

async function runFullAppHarness(baseUrl, outDir, env) {
  const fullAppOutDir = path.join(outDir, "full-app");
  await fs.mkdir(fullAppOutDir, { recursive: true });
  const commandResult = await runCommand({
    name: "full-app-business-harness",
    command: `node scripts/full-app-qa-harness.mjs --base-url ${quoted(baseUrl)} --out-dir ${quoted(fullAppOutDir)}`,
    env,
    logFile: path.join(outDir, "full-app-business-harness.log"),
  });
  const entries = await fs.readdir(fullAppOutDir, { withFileTypes: true });
  const reportDirectories = entries.filter(
    (entry) => entry.isDirectory() && entry.name.startsWith("full-app-qa-"),
  );
  assert(
    reportDirectories.length === 1,
    "Full-app harness must emit exactly one report directory",
  );
  const reportPath = path.join(
    fullAppOutDir,
    reportDirectories[0].name,
    "full-app-qa-report.json",
  );
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  assert(report.passed === true, "Full-app machine report is not passing");
  assert(
    report.schema?.skipped !== true,
    "Full-app schema gate may not be skipped",
  );
  assert(report.api?.skipped !== true, "Full-app API gate may not be skipped");
  assert(
    report.browser?.skipped !== true,
    "Full-app browser gate may not be skipped",
  );
  assert(
    (report.api?.checks ?? []).length > 0,
    "Full-app API report contains no checks",
  );
  assert(
    (report.browser?.publicResults ?? []).length > 0,
    "Full-app public browser report is empty",
  );
  assert(
    (report.browser?.flowResults ?? []).length > 0,
    "Full-app critical-flow report is empty",
  );
  return {
    ...commandResult,
    reportPath,
    apiChecks: report.api.checks.length,
    publicChecks: report.browser.publicResults.length,
    flowChecks: report.browser.flowResults.length,
  };
}

async function runRoleAudit(profile, baseUrl, outDir, env) {
  const profileOutDir = path.join(outDir, `role-page-${profile}`);
  await fs.mkdir(profileOutDir, { recursive: true });
  const commandResult = await runCommand({
    name: `role-page-${profile}`,
    command: "node apps/web/scripts/role-page-audit.mjs",
    env: {
      ...env,
      UI_QA_BASE_URL: baseUrl,
      UI_QA_LOCALE: "en",
      UI_QA_VIEWPORT_PROFILE: profile,
      UI_QA_OUTPUT_DIR: profileOutDir,
    },
    logFile: path.join(outDir, `role-page-${profile}.log`),
  });
  const reportPath = path.join(profileOutDir, "role-page-audit.json");
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  assert(
    report.summary?.viewportProfile === profile,
    `${profile} report has the wrong viewport profile`,
  );
  assert(
    report.summary?.checked === EXPECTED_PER_VIEWPORT,
    `${profile} must check exactly ${EXPECTED_PER_VIEWPORT} role-route combinations`,
  );
  assert(
    report.summary?.failures === 0,
    `${profile} role audit contains failures`,
  );
  return {
    ...commandResult,
    reportPath,
    checked: report.summary.checked,
    failures: report.summary.failures,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = validatedLoopbackUrl(args.baseUrl);
  await assertPortInitiallyFree(baseUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(args.outDir, `release-demo-${timestamp}`);
  await fs.mkdir(outDir, { recursive: true });
  const attestationNonce = randomUUID();
  const env = qaEnvironment(baseUrl.toString(), attestationNonce);
  const serverChunks = [];
  const ownership = startServer(baseUrl.toString(), env, serverChunks);
  const gates = [];
  const diagnosticSkips = [
    args.skipPlaywright && "playwright",
    args.skipFullApp && "full-app",
    args.skipRoleAudit && "role-audit",
  ].filter(Boolean);

  try {
    const serverStatus = await waitForServer(
      baseUrl.toString(),
      ownership,
      attestationNonce,
    );
    const accessProfiles = await verifySyntheticProfile(
      baseUrl.toString(),
      attestationNonce,
    );

    if (!args.skipPlaywright) {
      gates.push(await runSyntheticPlaywright(env, outDir));
    }

    if (!args.skipFullApp) {
      gates.push(await runFullAppHarness(baseUrl.toString(), outDir, env));
    }

    const roleAudits = args.skipRoleAudit
      ? []
      : await Promise.all([
          runRoleAudit("desktop", baseUrl.toString(), outDir, env),
          runRoleAudit("mobile", baseUrl.toString(), outDir, env),
        ]);
    const checked = roleAudits.reduce((sum, result) => sum + result.checked, 0);
    const failures = roleAudits.reduce(
      (sum, result) => sum + result.failures,
      0,
    );
    if (!args.skipRoleAudit) {
      assert(
        checked === EXPECTED_TOTAL,
        `role audit must aggregate exactly ${EXPECTED_TOTAL} checks`,
      );
      assert(failures === 0, "role audit aggregate contains failures");
    }

    const incomplete = diagnosticSkips.length > 0;
    const scopedQaPassed =
      !incomplete &&
      gates.length === 2 &&
      gates.every((gate) => gate.passed === true) &&
      roleAudits.length === VIEWPORT_COUNT &&
      checked === EXPECTED_TOTAL &&
      failures === 0;
    const report = {
      generatedAt: new Date().toISOString(),
      mode: "isolated-synthetic-qa",
      verificationScope:
        "source/build plus isolated synthetic navigation, view isolation, and controlled business-flow QA",
      baseUrl: baseUrl.toString(),
      serverStatus,
      accessProfiles,
      serverOwnership: {
        loopbackOnly: true,
        portInitiallyFree: true,
        childPid: ownership.child.pid,
        childAttested: accessProfiles.ownedChildAttested,
      },
      externalCredentialsBlanked: true,
      diagnosticSkips,
      incomplete,
      gates,
      roleAudits,
      roleAuditSummary: {
        scope:
          "6 roles x 13 page routes x 2 viewports: navigation and view isolation",
        exhaustiveAuthorization: false,
        roles: ROLE_COUNT,
        routes: ROUTE_COUNT,
        viewports: VIEWPORT_COUNT,
        expected: EXPECTED_TOTAL,
        checked,
        failures,
      },
      coverageBoundaries: {
        realSupabaseAuthSessionsVerified: false,
        cleanDatabaseRlsAndActionAuthorizationVerified: false,
        allRbacActionsEnumerated: false,
        tenantFinanceComplete: false,
        adminGovernanceMutationVerified: false,
        bookingHandoverMigrations32And33RuntimeVerified: false,
      },
      productionReady: false,
      releaseEligible: false,
      scopedQaPassed,
      passed: scopedQaPassed,
      limitations: [
        "Synthetic role profiles prove projections, navigation, and focused negative paths; they do not prove six real Supabase Auth sessions.",
        "The 156 checks cover page-route navigation and view isolation, not all 14 RBAC resources by eight actions.",
        "Clean-database RLS, migrations, persistence, real-login action authorization, providers, backup/restore, and client UAT remain mandatory.",
        "Tenant finance lacks authoritative liability/payability allocation, so this is not a full six-role finance demo.",
        "Admin governance mutations and UC18 unmocked persistence remain real-Auth/clean-database gates.",
      ],
    };
    const reportPath = path.join(outDir, "release-demo-harness.json");
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(
      scopedQaPassed
        ? `Isolated synthetic QA passed for its scoped evidence. Report: ${reportPath}`
        : `Release demo harness is diagnostic/incomplete and not passing. Report: ${reportPath}`,
    );
    if (!scopedQaPassed) process.exitCode = 2;
  } finally {
    await stopServer(ownership.child);
    await fs.writeFile(
      path.join(outDir, "server.log"),
      serverChunks.join(""),
      "utf8",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
