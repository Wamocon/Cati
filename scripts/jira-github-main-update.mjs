import fs from "node:fs/promises"

function parseEnv(text) {
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match) env[match[1]] = match[2]
  }
  return env
}

async function loadEnv() {
  const local = await fs.readFile(".env.local", "utf8").then(parseEnv).catch(() => ({}))
  return { ...local, ...process.env }
}

const env = await loadEnv()
const baseUrl = env.JIRA_BASE_URL?.replace(/\/$/, "")
if (!baseUrl || !env.JIRA_EMAIL || !env.JIRA_API_TOKEN) {
  console.log(
    JSON.stringify(
      {
        skipped: true,
        reason: "Missing Jira credentials for GitHub-to-Jira update.",
        updated: [],
        count: 0,
      },
      null,
      2
    )
  )
  process.exit(0)
}

const jiraAuth = `Basic ${Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64")}`
const eventPath = process.env.GITHUB_EVENT_PATH
const event = eventPath ? JSON.parse(await fs.readFile(eventPath, "utf8")) : {}
const commits = event.commits ?? []
const projectKey = env.JIRA_PROJECT_KEY ?? "CATI"
const issueKeyPattern = new RegExp(`\\b${projectKey}-\\d+\\b`, "g")
const issueKeys = new Set()

for (const commit of commits) {
  for (const field of [commit.message, commit.id, commit.url]) {
    for (const match of String(field ?? "").matchAll(issueKeyPattern)) issueKeys.add(match[0])
  }
}

async function jira(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      Authorization: jiraAuth,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${pathname} failed with ${response.status}`)
  return data
}

function doc(text) {
  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  }
}

async function transitionToDone(issueKey) {
  const transitions = await jira(`/rest/api/3/issue/${issueKey}/transitions`)
  const transition =
    transitions.transitions?.find((item) => item.to?.statusCategory?.key === "done") ??
    transitions.transitions?.find((item) => /done|fertig|erledigt|geschlossen|abgeschlossen/i.test(item.name))
  if (!transition) return false
  await jira(`/rest/api/3/issue/${issueKey}/transitions`, {
    method: "POST",
    body: { transition: { id: transition.id } },
  })
  return true
}

const updated = []
for (const issueKey of issueKeys) {
  const commitList = commits
    .filter((commit) => String(commit.message ?? "").includes(issueKey))
    .map((commit) => `${commit.id?.slice(0, 12) ?? "commit"} ${commit.timestamp ?? ""}`.trim())
  await jira(`/rest/api/3/issue/${issueKey}/comment`, {
    method: "POST",
    body: {
      body: doc(
        `Automatische GitHub-Aktualisierung: Referenz wurde auf main erkannt. Zeitpunkt: ${new Date().toISOString()}. Commits: ${commitList.join(", ")}.`
      ),
    },
  })
  await transitionToDone(issueKey)
  updated.push(issueKey)
}

console.log(JSON.stringify({ updated, count: updated.length }, null, 2))
