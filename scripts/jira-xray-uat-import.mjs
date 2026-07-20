// Importiert die 41 manuellen Business-Abnahmetest-Testfälle (scripts/data/1cati-uat-test-cases.json)
// als EIN neues Xray Test Set mit EINEM eigenen Test Plan nach Jira Cloud/Xray Cloud.
//
// Folgt bewusst demselben Muster wie scripts/jira-xray-sync.mjs (gleiche Env-Ladefunktion,
// gleiche Jira-/Xray-Auth, gleiche GraphQL-Mutationen), rührt aber NICHT die dortigen
// 15-Phasen-Epics/Stories/Testfälle an - komplett eigenständiger, idempotenter Lauf.
//
// Nutzung:
//   node scripts/jira-xray-uat-import.mjs --dry-run   (Standard, KEINE Netzwerkaufrufe)
//   node scripts/jira-xray-uat-import.mjs --live      (echter Schreibvorgang, braucht alle Env-Vars)

import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

function parseEnv(text) {
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match) env[match[1]] = match[2]
  }
  return env
}

async function loadEnv() {
  const local = await fs
    .readFile(path.join(rootDir, ".env.tooling.local"), "utf8")
    .then(parseEnv)
    .catch(() => fs.readFile(path.join(rootDir, ".env.local"), "utf8").then(parseEnv).catch(() => ({})))
  return { ...local, ...process.env }
}

const env = await loadEnv()
const args = new Set(process.argv.slice(2))
const isLive = args.has("--live")
const isCheck = args.has("--check")
const dryRun = !isLive || args.has("--dry-run")

const REQUIRED_JIRA = ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY"]
const REQUIRED_XRAY = ["XRAY_BASE_URL", "XRAY_CLIENT_ID", "XRAY_CLIENT_SECRET"]

for (const key of [...REQUIRED_JIRA, ...REQUIRED_XRAY]) {
  if ((isLive || isCheck) && !env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}. Fehlende Werte in .env.tooling.local (Root, gitignored) ergänzen, dann erneut mit --live starten.`
    )
  }
}

const jiraBaseUrl = (env.JIRA_BASE_URL ?? "https://jira.example.invalid").replace(/\/$/, "")
const jiraAuth = `Basic ${Buffer.from(`${env.JIRA_EMAIL ?? "dry-run"}:${env.JIRA_API_TOKEN ?? "dry-run"}`).toString("base64")}`
const projectKey = (env.JIRA_PROJECT_KEY ?? "CATI").toUpperCase()
const labelPrefix = projectKey.toLowerCase()
const runLabel = `${labelPrefix}-uat-ceo-demo`

const PRIORITY_MAP = { 1: "High", 2: "Medium", 3: "Low" }

// ---------------------------------------------------------------------------
// ADF Helfer (Atlassian Document Format), identisch zum Muster in jira-xray-sync.mjs
// ---------------------------------------------------------------------------
function adfText(text) {
  return { type: "text", text: String(text ?? "") }
}
function paragraph(text) {
  return { type: "paragraph", content: [adfText(text)] }
}
function heading(text, level = 3) {
  return { type: "heading", attrs: { level }, content: [adfText(text)] }
}
function bulletList(items) {
  return {
    type: "bulletList",
    content: items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
  }
}
function doc(sections) {
  const content = []
  for (const section of sections) {
    if (section.title) content.push(heading(section.title))
    if (section.text) for (const line of section.text) content.push(paragraph(line))
    if (section.items?.length) content.push(bulletList(section.items))
  }
  return { type: "doc", version: 1, content }
}

// ---------------------------------------------------------------------------
// Jira / Xray REST + GraphQL Helfer (1:1 Muster aus jira-xray-sync.mjs)
// ---------------------------------------------------------------------------
async function jira(pathname, options = {}) {
  const response = await fetch(`${jiraBaseUrl}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      Authorization: jiraAuth,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data)
    throw new Error(`${options.method ?? "GET"} ${pathname} failed with ${response.status}: ${detail}`)
  }
  return data
}

async function getProject() {
  return jira(`/rest/api/3/project/${projectKey}`)
}

async function getProjectIssueTypes(projectId) {
  return jira(`/rest/api/3/issuetype/project?projectId=${projectId}`)
}

function pickIssueType(types, candidates) {
  for (const candidate of candidates) {
    const found = types.find((type) => type.name.toLowerCase() === candidate.toLowerCase())
    if (found) return found
  }
  for (const candidate of candidates) {
    const found = types.find((type) => type.name.toLowerCase().includes(candidate.toLowerCase()))
    if (found) return found
  }
  return null
}

async function getCreateFields(issueTypeId) {
  const data = await jira(
    `/rest/api/3/issue/createmeta?projectKeys=${projectKey}&issuetypeIds=${issueTypeId}&expand=projects.issuetypes.fields`
  )
  return data.projects?.[0]?.issuetypes?.[0]?.fields ?? {}
}

async function searchByUniqueLabel(label) {
  const body = {
    jql: `project = ${projectKey} AND labels = "${label}" ORDER BY created ASC`,
    fields: ["summary", "status"],
    maxResults: 1,
  }
  const result = await jira("/rest/api/3/search/jql", { method: "POST", body })
  return result.issues?.[0] ?? null
}

async function ensureIssue({ uid, summary, issueType, description, labels, priorityName }) {
  const existing = await searchByUniqueLabel(uid)
  const fields = {
    project: { key: projectKey },
    issuetype: { id: issueType.id },
    summary,
    description,
    labels: [...new Set([runLabel, uid, ...labels])],
  }
  if (priorityName) fields.priority = { name: priorityName }

  if (existing) {
    await jira(`/rest/api/3/issue/${existing.key}`, { method: "PUT", body: { fields } })
    return jira(`/rest/api/3/issue/${existing.key}?fields=status,summary`)
  }
  const created = await jira("/rest/api/3/issue", { method: "POST", body: { fields } })
  return jira(`/rest/api/3/issue/${created.key}?fields=status,summary`)
}

async function createIssueLink(outwardIssueKey, inwardIssueKey) {
  try {
    await jira("/rest/api/3/issueLink", {
      method: "POST",
      body: {
        type: { name: "Relates" },
        outwardIssue: { key: outwardIssueKey },
        inwardIssue: { key: inwardIssueKey },
      },
    })
    return true
  } catch {
    return false
  }
}

async function xrayAuthenticate() {
  if (!env.XRAY_BASE_URL || !env.XRAY_CLIENT_ID || !env.XRAY_CLIENT_SECRET) return null
  const response = await fetch(`${env.XRAY_BASE_URL.replace(/\/$/, "")}/api/v2/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: env.XRAY_CLIENT_ID, client_secret: env.XRAY_CLIENT_SECRET }),
  })
  if (!response.ok) return null
  return (await response.text()).replace(/^"|"$/g, "")
}

async function xrayGraphql(token, query, variables) {
  if (!token || !env.XRAY_BASE_URL) return null
  const response = await fetch(`${env.XRAY_BASE_URL.replace(/\/$/, "")}/api/v2/graphql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.errors) {
    if (payload?.errors) console.error("Xray GraphQL error:", JSON.stringify(payload.errors))
    return null
  }
  return payload.data
}

async function getXrayStepCount(token, testIssueId) {
  const query = `
    query GetTestSteps($issueId: String!) {
      getTest(issueId: $issueId) { steps { id } }
    }
  `
  const result = await xrayGraphql(token, query, { issueId: testIssueId })
  return Array.isArray(result?.getTest?.steps) ? result.getTest.steps.length : null
}

async function addXrayManualSteps(token, testIssueId, steps, startAt = 0) {
  const mutation = `
    mutation AddStep($issueId: String!, $step: CreateStepInput!) {
      addTestStep(issueId: $issueId, step: $step) { id }
    }
  `
  let added = 0
  for (const step of steps.slice(startAt)) {
    const result = await xrayGraphql(token, mutation, {
      issueId: testIssueId,
      step: { action: step.action, data: step.testData ?? "", result: step.expectedResult },
    })
    if (result) added += 1
  }
  return added
}

async function ensureXrayManualSteps(token, testIssueId, steps) {
  const currentCount = await getXrayStepCount(token, testIssueId)
  if (currentCount === null) return 0
  if (currentCount >= steps.length) return 0
  return addXrayManualSteps(token, testIssueId, steps, currentCount)
}

async function addTestsToXrayTestSet(token, testSetIssueId, testIssueIds) {
  const mutation = `
    mutation AddTestsToTestSet($issueId: String!, $testIssueIds: [String]!) {
      addTestsToTestSet(issueId: $issueId, testIssueIds: $testIssueIds) { addedTests warning }
    }
  `
  return xrayGraphql(token, mutation, { issueId: testSetIssueId, testIssueIds })
}

async function addTestsToXrayTestPlan(token, testPlanIssueId, testIssueIds) {
  const mutation = `
    mutation AddTestsToTestPlan($issueId: String!, $testIssueIds: [String]!) {
      addTestsToTestPlan(issueId: $issueId, testIssueIds: $testIssueIds) { addedTests warning }
    }
  `
  return xrayGraphql(token, mutation, { issueId: testPlanIssueId, testIssueIds })
}

// ---------------------------------------------------------------------------
// Beschreibungstexte
// ---------------------------------------------------------------------------
function testCaseDescription(tc) {
  return doc([
    {
      title: "Anwendungsfall",
      text: [`AF-${String(tc.useCaseNumber).padStart(2, "0")}: ${tc.useCaseName}`],
    },
    {
      title: "Testfall-Typ und Priorität",
      text: [
        `Typ: ${tc.testCaseType}. Priorität: Prio ${tc.priorityTier} (Jira: ${PRIORITY_MAP[tc.priorityTier]}).`,
        `Rolle/Login: ${tc.role}. Umgebung: ${tc.environmentUrl}.`,
      ],
    },
    { title: "Vorbedingung", text: [tc.precondition] },
    {
      title: "Testschritte und erwartete Ergebnisse",
      items: tc.steps.map(
        (s) =>
          `Schritt ${s.stepNo}: ${s.action}${s.testData ? ` (Testdaten: ${s.testData})` : ""} → Erwartetes Ergebnis: ${s.expectedResult}`
      ),
    },
    { title: "Bekannter Hinweis / Fallstrick (Testarchitekt)", text: [tc.architectNote] },
    {
      title: "Automatisierungs-Hinweise je Schritt",
      items: tc.steps
        .filter((s) => s.automationNote)
        .map((s) => `Schritt ${s.stepNo}: ${s.automationNote}`),
    },
  ])
}

function testSetDescription(testCases) {
  return doc([
    {
      title: "Zweck",
      text: [
        "Manueller Business-Abnahmetest für die 24 priorisierten 1Çatı-Anwendungsfälle, vorbereitet für die CEO-Demo (Ataberk Estate / New Level Premium).",
        `Enthält ${testCases.length} Testfälle mit insgesamt ${testCases.reduce((n, t) => n + t.steps.length, 0)} Einzelschritten.`,
      ],
    },
    {
      title: "Methodik",
      text: [
        "Prio 1/2: Golden Path + Negativ-/Grenzfall wo sinnvoll.",
        "Prio 3 (bekannte Produktlücken): je Anwendungsfall ein SOLL-Testfall (prüft die vom Kunden geforderte Zielfunktion, erwartungsgemäß 'failed'/'open' - dokumentiert die Lücke formal) und ein IST-Testfall (prüft, was im aktuellen Demo-Stand tatsächlich funktioniert).",
      ],
    },
    {
      title: "Quelle",
      items: ["scripts/data/1cati-uat-test-cases.json", "scripts/jira-xray-uat-import.mjs"],
    },
  ])
}

function testPlanDescription(testCases) {
  return doc([
    {
      title: "Ziel",
      text: [
        "Zentraler Steuerungspunkt für den manuellen Business-Abnahmetest vor der CEO-Live-Demo von 1Çatı.",
        "Getrennt vom bestehenden Phase-01-15-Testplan des laufenden Delivery-Trackings - dieser Plan ist demo-/abnahmespezifisch.",
      ],
    },
    {
      title: "Umfang",
      text: [`${testCases.length} Testfälle über 24 Anwendungsfälle, gruppiert im Test Set 'Business-Abnahmetest CEO-Demo'.`],
    },
  ])
}

// ---------------------------------------------------------------------------
// Reiner Verbindungstest (nur GET/Auth, KEINE Issues werden angelegt/geaendert)
// ---------------------------------------------------------------------------
async function checkConnection() {
  const result = {
    checkedAt: new Date().toISOString(),
    projectKey,
    jira: { reachable: false },
    xray: { reachable: false },
  }

  console.log(`Teste Jira-Verbindung (${jiraBaseUrl}, Projekt ${projectKey})...`)
  try {
    const me = await jira("/rest/api/3/myself")
    result.jira.authenticatedAs = me.emailAddress ?? me.accountId ?? "unknown"
    result.jira.reachable = true
    console.log(`  OK - authentifiziert als ${result.jira.authenticatedAs}`)
  } catch (error) {
    result.jira.error = String(error.message)
    console.log(`  FEHLER: ${result.jira.error}`)
  }

  if (result.jira.reachable) {
    try {
      const project = await jira(`/rest/api/3/project/${projectKey}`)
      result.jira.projectFound = true
      result.jira.projectName = project.name
      console.log(`  OK - Projekt gefunden: ${project.key} (${project.name})`)

      const issueTypes = await getProjectIssueTypes(project.id)
      const testType = pickIssueType(issueTypes, ["Test"])
      const testSetType = pickIssueType(issueTypes, ["Test Set", "Testset"])
      const testPlanType = pickIssueType(issueTypes, ["Test Plan", "Testplan"])
      result.jira.issueTypes = {
        Test: Boolean(testType),
        "Test Set": Boolean(testSetType),
        "Test Plan": Boolean(testPlanType),
      }
      console.log(`  Issue-Typen im Projekt verfuegbar: Test=${Boolean(testType)}, Test Set=${Boolean(testSetType)}, Test Plan=${Boolean(testPlanType)}`)
      if (!testType || !testSetType || !testPlanType) {
        console.log(
          "  HINWEIS: Xray-Issue-Typen fehlen teilweise - pruefen, ob die Xray-App im Projekt aktiviert/dem Projekt zugewiesen ist."
        )
      }
    } catch (error) {
      result.jira.projectFound = false
      result.jira.error = String(error.message)
      console.log(`  FEHLER beim Projekt-Zugriff: ${error.message}`)
    }
  }

  console.log(`Teste Xray-Verbindung (${env.XRAY_BASE_URL})...`)
  try {
    const token = await xrayAuthenticate()
    if (token) {
      result.xray.reachable = true
      console.log("  OK - Xray-Authentifizierung erfolgreich (Token erhalten)")
      const query = `query { getTests(limit: 1) { total } }`
      const data = await xrayGraphql(token, query, {})
      if (data) {
        result.xray.graphqlReachable = true
        result.xray.totalExistingTests = data.getTests?.total ?? null
        console.log(`  OK - Xray GraphQL erreichbar (vorhandene Tests im Projektraum: ${result.xray.totalExistingTests ?? "unbekannt"})`)
      } else {
        result.xray.graphqlReachable = false
        console.log("  WARNUNG - Xray-Auth ok, aber GraphQL-Testabfrage fehlgeschlagen.")
      }
    } else {
      console.log("  FEHLER - Xray-Authentifizierung fehlgeschlagen (Client-ID/Secret oder Base-URL pruefen).")
    }
  } catch (error) {
    result.xray.error = String(error.message)
    console.log(`  FEHLER: ${error.message}`)
  }

  const reportDir = path.join(rootDir, "quality", "results")
  await fs.mkdir(reportDir, { recursive: true })
  await fs.writeFile(path.join(reportDir, "jira-xray-connection-check.json"), JSON.stringify(result, null, 2))

  const allOk = result.jira.reachable && result.jira.projectFound && result.xray.reachable
  console.log("")
  console.log(allOk ? "VERBINDUNG OK - bereit fuer --live." : "VERBINDUNG UNVOLLSTAENDIG - siehe Fehler oben.")
  console.log("Bericht: quality/results/jira-xray-connection-check.json")
  return allOk
}

// ---------------------------------------------------------------------------
// Hauptlogik
// ---------------------------------------------------------------------------
async function main() {
  if (isCheck) {
    const ok = await checkConnection()
    if (!ok) process.exitCode = 1
    return
  }

  const raw = await fs.readFile(path.join(rootDir, "scripts", "data", "1cati-uat-test-cases.json"), "utf8")
  const testCases = JSON.parse(raw)

  const byPrio = { 1: 0, 2: 0, 3: 0 }
  for (const tc of testCases) byPrio[tc.priorityTier] += 1

  if (dryRun) {
    const report = {
      dryRun: true,
      live: false,
      generatedAt: new Date().toISOString(),
      projectKey,
      runLabel,
      plan: {
        testSet: "Test Set - 1Çatı Business-Abnahmetest (CEO-Demo UAT)",
        testPlan: "Test Plan - 1Çatı Business-Abnahmetest (CEO-Demo UAT)",
        testCaseCount: testCases.length,
        stepCount: testCases.reduce((n, t) => n + t.steps.length, 0),
        byPriorityTier: byPrio,
      },
      credentialsPresent: {
        JIRA_BASE_URL: Boolean(env.JIRA_BASE_URL),
        JIRA_EMAIL: Boolean(env.JIRA_EMAIL),
        JIRA_API_TOKEN: Boolean(env.JIRA_API_TOKEN),
        JIRA_PROJECT_KEY: Boolean(env.JIRA_PROJECT_KEY),
        XRAY_BASE_URL: Boolean(env.XRAY_BASE_URL),
        XRAY_CLIENT_ID: Boolean(env.XRAY_CLIENT_ID),
        XRAY_CLIENT_SECRET: Boolean(env.XRAY_CLIENT_SECRET),
      },
      testCasesPreview: testCases.map((tc) => ({
        testCaseId: tc.testCaseId,
        useCaseNumber: tc.useCaseNumber,
        useCaseName: tc.useCaseName,
        testCaseTitle: tc.testCaseTitle,
        testCaseType: tc.testCaseType,
        priorityTier: tc.priorityTier,
        jiraPriority: PRIORITY_MAP[tc.priorityTier],
        stepCount: tc.steps.length,
        labels: tc.labels,
      })),
    }
    const reportDir = path.join(rootDir, "quality", "results")
    await fs.mkdir(reportDir, { recursive: true })
    await fs.writeFile(
      path.join(reportDir, "jira-xray-uat-import-dry-run.json"),
      JSON.stringify(report, null, 2)
    )
    console.log(`[DRY RUN] Keine Netzwerkaufrufe. ${testCases.length} Testfaelle, ${report.plan.stepCount} Schritte.`)
    console.log(`[DRY RUN] Bericht: quality/results/jira-xray-uat-import-dry-run.json`)
    console.log(`[DRY RUN] Credentials vorhanden:`, JSON.stringify(report.credentialsPresent))
    if (!Object.values(report.credentialsPresent).every(Boolean)) {
      console.log(
        "[DRY RUN] Es fehlen Zugangsdaten fuer einen echten Lauf. .env.tooling.local (Root, gitignored) ergaenzen und mit --live erneut starten."
      )
    }
    return
  }

  console.log("Verbinde mit Jira...")
  const project = await getProject()
  const issueTypes = await getProjectIssueTypes(project.id)
  const testType = pickIssueType(issueTypes, ["Test"])
  const testSetType = pickIssueType(issueTypes, ["Test Set", "Testset"])
  const testPlanType = pickIssueType(issueTypes, ["Test Plan", "Testplan"])
  if (!testType || !testSetType || !testPlanType) {
    throw new Error(
      `Xray-Issue-Typen nicht gefunden (Test=${Boolean(testType)}, Test Set=${Boolean(testSetType)}, Test Plan=${Boolean(testPlanType)}). Ist die Xray-App im Projekt ${projectKey} aktiviert?`
    )
  }

  const token = await xrayAuthenticate()
  if (!token) throw new Error("Xray-Authentifizierung fehlgeschlagen (XRAY_BASE_URL/CLIENT_ID/CLIENT_SECRET pruefen).")

  console.log("Lege Test Set an...")
  const testSetIssue = await ensureIssue({
    uid: `${runLabel}-testset`,
    summary: "Test Set - 1Çatı Business-Abnahmetest (CEO-Demo UAT)",
    issueType: testSetType,
    description: testSetDescription(testCases),
    labels: ["xray", "test-set", "uat", "ceo-demo", "option3"],
  })
  console.log(`  Test Set: ${testSetIssue.key}`)

  console.log("Lege Test Plan an...")
  const testPlanIssue = await ensureIssue({
    uid: `${runLabel}-testplan`,
    summary: "Test Plan - 1Çatı Business-Abnahmetest (CEO-Demo UAT)",
    issueType: testPlanType,
    description: testPlanDescription(testCases),
    labels: ["xray", "test-plan", "uat", "ceo-demo", "option3"],
  })
  console.log(`  Test Plan: ${testPlanIssue.key}`)

  const createdTests = []
  for (const tc of testCases) {
    console.log(`Lege Testfall an: ${tc.testCaseId} - ${tc.testCaseTitle}`)
    const issue = await ensureIssue({
      uid: `${runLabel}-${tc.testCaseId.toLowerCase()}`,
      summary: `Testfall ${tc.testCaseId}: ${tc.testCaseTitle}`,
      issueType: testType,
      description: testCaseDescription(tc),
      labels: [...(tc.labels ?? []), `af${String(tc.useCaseNumber).padStart(2, "0")}`, `prio${tc.priorityTier}`],
      priorityName: PRIORITY_MAP[tc.priorityTier],
    })
    await createIssueLink(testSetIssue.key, issue.key)
    await createIssueLink(testPlanIssue.key, issue.key)
    const addedSteps = await ensureXrayManualSteps(token, issue.id, tc.steps)
    console.log(`  ${issue.key} (${addedSteps} Schritte hinzugefuegt)`)
    createdTests.push(issue)
  }

  console.log("Verknuepfe Testfaelle mit Test Set und Test Plan (Xray)...")
  await addTestsToXrayTestSet(
    token,
    testSetIssue.id,
    createdTests.map((issue) => issue.id)
  )
  await addTestsToXrayTestPlan(
    token,
    testPlanIssue.id,
    createdTests.map((issue) => issue.id)
  )

  const report = {
    dryRun: false,
    live: true,
    generatedAt: new Date().toISOString(),
    projectKey,
    testSet: { key: testSetIssue.key, id: testSetIssue.id },
    testPlan: { key: testPlanIssue.key, id: testPlanIssue.id },
    testCases: createdTests.map((issue, index) => ({
      key: issue.key,
      id: issue.id,
      testCaseId: testCases[index].testCaseId,
      testCaseTitle: testCases[index].testCaseTitle,
    })),
  }
  const reportDir = path.join(rootDir, "quality", "results")
  await fs.mkdir(reportDir, { recursive: true })
  await fs.writeFile(path.join(reportDir, "jira-xray-uat-import-report.json"), JSON.stringify(report, null, 2))
  console.log(`Fertig. ${createdTests.length} Testfaelle, Test Set ${testSetIssue.key}, Test Plan ${testPlanIssue.key}.`)
  console.log(`Bericht: quality/results/jira-xray-uat-import-report.json`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
