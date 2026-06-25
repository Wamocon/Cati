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
  const local = await fs.readFile(path.join(rootDir, ".env.local"), "utf8").then(parseEnv).catch(() => ({}))
  return { ...local, ...process.env }
}

const env = await loadEnv()
const required = ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY"]
for (const key of required) {
  if (!env[key]) throw new Error(`Missing required environment variable: ${key}`)
}

const jiraBaseUrl = env.JIRA_BASE_URL.replace(/\/$/, "")
const jiraAuth = `Basic ${Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64")}`
const projectKey = env.JIRA_PROJECT_KEY.toUpperCase()
const labelPrefix = projectKey.toLowerCase()
const attachmentVersion = "business-2026-06-25"

const phaseDocs = [
  {
    phase: 2,
    label: "phase-02",
    title: "UX/UI und rollenbasierte Navigation",
    file: "docs/phase-delivery/de/phase-02-ux-ui-rollennavigation.docx",
  },
  {
    phase: 3,
    label: "phase-03",
    title: "Plattform, Auth, RBAC und Audit",
    file: "docs/phase-delivery/de/phase-03-plattform-auth-rbac-audit.docx",
  },
  {
    phase: 4,
    label: "phase-04",
    title: "Site-, Block-, Etagen-, Wohnungs- und Importmodell",
    file: "docs/phase-delivery/de/phase-04-site-import-datenmodell.docx",
  },
  {
    phase: 5,
    label: "phase-05",
    title: "Benutzer, Eigentümer, Mieter, Gäste, Personal und Rollen",
    file: "docs/phase-delivery/de/phase-05-benutzer-rollen-personal.docx",
  },
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, options, label) {
  let lastError
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await fetch(url, options)
    } catch (error) {
      lastError = error
      if (attempt < 4) await sleep(750 * attempt)
    }
  }
  throw new Error(`${label} failed after retries: ${lastError?.message ?? lastError}`)
}

async function jira(pathname, options = {}) {
  const response = await fetchWithRetry(`${jiraBaseUrl}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      Authorization: jiraAuth,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }, `${options.method ?? "GET"} ${pathname}`)
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

function adfParagraph(text) {
  return { type: "paragraph", content: [{ type: "text", text }] }
}

function adfBulletList(items) {
  return {
    type: "bulletList",
    content: items.map((item) => ({ type: "listItem", content: [adfParagraph(item)] })),
  }
}

function adfDoc(title, lines, bullets = []) {
  return {
    type: "doc",
    version: 1,
    content: [
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: title }] },
      ...lines.map(adfParagraph),
      ...(bullets.length ? [adfBulletList(bullets)] : []),
    ],
  }
}

async function search(jql, fields = ["summary", "status", "attachment", "labels", "issuetype"]) {
  const result = await jira("/rest/api/3/search/jql", {
    method: "POST",
    body: { jql, fields, maxResults: 100 },
  })
  return result.issues ?? []
}

async function findPhaseEpic(phase) {
  const uid = `${labelPrefix}-${phase.label}-epic`
  const issues = await search(`project = ${projectKey} AND labels = "${uid}" ORDER BY created ASC`)
  return issues[0] ?? null
}

async function findPhaseIssues(phase) {
  return search(`project = ${projectKey} AND labels = "${phase.label}" ORDER BY created ASC`, [
    "summary",
    "status",
    "labels",
    "issuetype",
  ])
}

async function uploadAttachment(issueKey, filePath) {
  const absolute = path.resolve(rootDir, filePath)
  const buffer = await fs.readFile(absolute)
  const baseName = path.basename(absolute, ".docx")
  const fileName = `${baseName}-${attachmentVersion}.docx`
  const issue = await jira(`/rest/api/3/issue/${issueKey}?fields=attachment`)
  const existingNames = new Set((issue.fields?.attachment ?? []).map((attachment) => attachment.filename))
  if (existingNames.has(fileName)) return { fileName, skipped: true }
  const form = new FormData()
  form.append(
    "file",
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    fileName
  )
  const response = await fetchWithRetry(`${jiraBaseUrl}/rest/api/3/issue/${issueKey}/attachments`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: jiraAuth,
      "X-Atlassian-Token": "no-check",
    },
    body: form,
  }, `POST attachment ${issueKey}/${fileName}`)
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!response.ok) throw new Error(`Attachment upload failed for ${issueKey}/${fileName}: ${response.status} ${text}`)
  return { fileName, data }
}

function statusIsDone(issue) {
  const status = issue.fields?.status
  return status?.statusCategory?.key === "done" || /done|fertig|erledigt|geschlossen|abgeschlossen/i.test(status?.name ?? "")
}

async function transitionToDone(issueKey) {
  const issue = await jira(`/rest/api/3/issue/${issueKey}?fields=status`)
  if (statusIsDone(issue)) return { changed: false, reason: "already-done" }
  const transitions = await jira(`/rest/api/3/issue/${issueKey}/transitions`)
  const transition =
    transitions.transitions?.find((item) => item.to?.statusCategory?.key === "done") ??
    transitions.transitions?.find((item) => /done|fertig|erledigt|geschlossen|abgeschlossen/i.test(item.name))
  if (!transition) return { changed: false, reason: "no-done-transition" }
  await jira(`/rest/api/3/issue/${issueKey}/transitions`, {
    method: "POST",
    body: { transition: { id: transition.id } },
  })
  return { changed: true, transition: transition.name }
}

async function addPhaseComment(issueKey, phase, attachmentName, transitionedIssues) {
  await jira(`/rest/api/3/issue/${issueKey}/comment`, {
    method: "POST",
    body: {
      body: adfDoc(
        `Business-Dokumentation aktualisiert - ${phase.label}`,
        [
          `Die fachliche, deutschsprachige Business-Dokumentation für ${phase.title} wurde aktualisiert und als DOCX-Anlage am Phasen-Ticket hinterlegt.`,
          "Der Inhalt ist bewusst nicht technisch formuliert. Er erklärt Funktionen, Nutzen, Bedienlogik, Business-Regeln, Sonderfälle, Schulungspunkte und fachliche Entscheidungen für Management und Fachbereiche.",
          `Anlage: ${attachmentName}`,
          `Aktualisiert am: ${new Date().toISOString()}`,
        ],
        [
          "Status der Phase wurde auf Done/Fertig gesetzt, sofern der Workflow dies zulässt.",
          `Mitgeprüfte Phase-Issues im Jira-Projekt: ${transitionedIssues.join(", ") || "keine gefunden"}.`,
          "Nächster Schritt: Fachbereich soll die offenen Geschäftsentscheidungen im Dokument bestätigen.",
        ]
      ),
    },
  })
}

const result = {
  projectKey,
  updatedAt: new Date().toISOString(),
  phases: [],
}

for (const phase of phaseDocs) {
  const epic = await findPhaseEpic(phase)
  if (!epic) {
    result.phases.push({ phase: phase.label, status: "missing-epic" })
    continue
  }
  const attachment = await uploadAttachment(epic.key, phase.file)
  const phaseIssues = await findPhaseIssues(phase)
  const transitions = []
  for (const issue of phaseIssues) {
    const transition = await transitionToDone(issue.key)
    transitions.push({ key: issue.key, summary: issue.fields?.summary, ...transition })
  }
  await addPhaseComment(epic.key, phase, attachment.fileName, transitions.map((item) => item.key))
  result.phases.push({
    phase: phase.label,
    epic: epic.key,
    attachment: attachment.fileName,
    transitioned: transitions,
  })
}

const outDir = path.join(rootDir, "quality", "jira")
await fs.mkdir(outDir, { recursive: true })
const outPath = path.join(outDir, `business-docs-update-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
await fs.writeFile(outPath, JSON.stringify(result, null, 2))
console.log(JSON.stringify({ outPath, ...result }, null, 2))
