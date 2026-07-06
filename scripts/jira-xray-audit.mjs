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
    .readFile(path.join(rootDir, ".env.local"), "utf8")
    .then(parseEnv)
    .catch(() => ({}))
  return { ...local, ...process.env }
}

const env = await loadEnv()
const projectKey = (env.JIRA_PROJECT_KEY ?? "CATI").toUpperCase()
const jiraBaseUrl = env.JIRA_BASE_URL?.replace(/\/$/, "")
const required = ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"]

for (const key of required) {
  if (!env[key]) throw new Error(`Missing required environment variable: ${key}`)
}

const jiraAuth = `Basic ${Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64")}`

async function jira(pathname, options = {}) {
  const response = await fetch(`${jiraBaseUrl}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      Authorization: jiraAuth,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!response.ok) {
    throw new Error(`Jira request failed: ${response.status} ${await response.text()}`)
  }
  return response.json()
}

async function search(jql, fields, maxResults = 100) {
  const issues = []
  let nextPageToken

  do {
    const body = { jql, fields, maxResults }
    if (nextPageToken) body.nextPageToken = nextPageToken
    const result = await jira("/rest/api/3/search/jql", { method: "POST", body })
    issues.push(...(result.issues ?? []))
    nextPageToken = result.nextPageToken
  } while (nextPageToken)

  return { issues }
}

async function getIssue(issueKey, fields) {
  return jira(`/rest/api/3/issue/${issueKey}?fields=${fields.join(",")}`)
}

function adfText(node) {
  if (!node) return ""
  if (Array.isArray(node)) return node.map(adfText).join(" ")
  if (typeof node === "object") {
    return [node.text, ...(node.content ?? []).map(adfText)].filter(Boolean).join(" ")
  }
  return ""
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

const expectedCoverageSummaries = [
  "Oeffentliche Produkt-, Trust-, Review- und Legal-Seiten als eigene Inhalts- und QA-Abdeckung pflegen",
  "Produktive OAuth-Anbieter wie Google und Yandex provider-ready vorbereiten und Demo-Modus klar trennen",
  "Lead- und Vertriebsarbeitsbereich mit Suche, Pipeline-Status, Kontaktkanal und Rollenrechten nachvollziehbar abdecken",
  "QA-Begriffe fuer Funktionstest, Systemtest, Regression, Exploration und Kundenabnahme sauber trennen",
  "Testfall: Lead- und Vertriebsarbeitsbereich zeigt Pipeline, Suche und sichere Kontaktdaten",
  "Testfall: Oeffentliche Produkt-, Review-, Datenschutz- und Rechtsseiten bleiben auffindbar",
  "Testfall: OAuth-Provider bleiben provider-ready und vom Demo-Login getrennt",
  "Testfall: QA-Begriffe trennen funktionale Tests, Kundenabnahme und Launch klar",
]

const active = await search(
  `project = ${projectKey} AND labels = "cati-option3-sync" ORDER BY key ASC`,
  ["summary", "issuetype", "status", "duedate", "description", "attachment"],
)
const archived = await search(
  `project = ${projectKey} AND labels = "cati-archiv-fehlimport" ORDER BY key ASC`,
  ["summary", "status", "labels"],
)
const docsIssue = await getIssue("CATI-137", ["summary", "attachment"])
const activeIssues = active.issues ?? []
const docsAttachments = (docsIssue.fields?.attachment ?? []).map((item) => item.filename).sort()
const suspiciousPattern = /\bUAT\b|QA\/UAT|QA-UAT|undefined|Fehlimport|OBSOLETE/i
const suspiciousMatches = activeIssues
  .filter((issue) =>
    suspiciousPattern.test(
      [
        issue.key,
        issue.fields.summary,
        adfText(issue.fields.description),
        ...(issue.fields.attachment ?? []).map((attachment) => attachment.filename),
      ].join(" "),
    ),
  )
  .map((issue) => ({
    key: issue.key,
    type: issue.fields.issuetype.name,
    summary: issue.fields.summary,
    attachmentMatches: (issue.fields.attachment ?? [])
      .map((attachment) => attachment.filename)
      .filter((filename) => suspiciousPattern.test(filename)),
  }))

const coverageItems = expectedCoverageSummaries.map((summary) => {
  const issue = activeIssues.find((item) => item.fields.summary === summary)
  return issue
    ? {
        summary,
        key: issue.key,
        type: issue.fields.issuetype.name,
        status: issue.fields.status.name,
        dueDate: issue.fields.duedate,
      }
    : { summary, missing: true }
})

const report = {
  auditedAt: new Date().toISOString(),
  projectKey,
  activeSyncedCount: activeIssues.length,
  activeByType: countBy(activeIssues, (issue) => issue.fields.issuetype.name),
  activeMissingDescription: activeIssues
    .filter((issue) => !adfText(issue.fields.description).trim())
    .map((issue) => issue.key),
  activeMissingDueDate: activeIssues.filter((issue) => !issue.fields.duedate).map((issue) => issue.key),
  suspiciousActiveTextOrAttachments: suspiciousMatches,
  expectedCoverageItems: coverageItems,
  documentationIssue: {
    key: "CATI-137",
    summary: docsIssue.fields?.summary,
    attachmentCount: docsAttachments.length,
    hasCleanQaPlan: docsAttachments.includes("QA-Client-Acceptance-Launch-Plan.docx"),
    hasOldUatPlan: docsAttachments.includes("QA-UAT-Launch-Plan.docx"),
    attachments: docsAttachments,
  },
  testExecutionIssues: activeIssues
    .filter((issue) => issue.fields.issuetype.name === "Test Execution")
    .map((issue) => ({
      key: issue.key,
      status: issue.fields.status.name,
      summary: issue.fields.summary,
      dueDate: issue.fields.duedate,
    })),
  archivedReviewedCount: archived.issues?.length ?? 0,
}

console.log(JSON.stringify(report, null, 2))
