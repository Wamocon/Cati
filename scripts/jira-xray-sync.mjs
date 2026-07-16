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
const dryRun = args.has("--dry-run") || env.JIRA_DRY_RUN === "1"
const skipAttachments = args.has("--skip-attachments") || env.JIRA_SKIP_ATTACHMENTS === "1"
const skipQaAttachments = args.has("--skip-qa-attachments") || env.JIRA_SKIP_QA_ATTACHMENTS === "1"
const syncStartedAt = new Date().toISOString()
const required = [
  "JIRA_BASE_URL",
  "JIRA_EMAIL",
  "JIRA_API_TOKEN",
  "JIRA_PROJECT_NAME",
  "JIRA_PROJECT_KEY",
]
for (const key of required) {
  if (!dryRun && !env[key]) throw new Error(`Missing required environment variable: ${key}`)
}

const jiraBaseUrl = env.JIRA_BASE_URL?.replace(/\/$/, "") ?? "https://jira.example.invalid"
const jiraAuth = `Basic ${Buffer.from(`${env.JIRA_EMAIL ?? "dry-run"}:${env.JIRA_API_TOKEN ?? "dry-run"}`).toString("base64")}`
const projectKey = (env.JIRA_PROJECT_KEY ?? "CATI").toUpperCase()
const labelPrefix = projectKey.toLowerCase()
const syncLabel = `${labelPrefix}-option3-sync`
const projectTemplateKey =
  env.JIRA_PROJECT_TEMPLATE_KEY ?? "com.pyxis.greenhopper.jira:gh-simplified-kanban-classic"

const phaseStatusSummary = {
  done: 14,
  inProgress: 1,
  todo: 0,
}

function adfText(text) {
  return { type: "text", text }
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
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  }
}

function doc(sections) {
  return {
    type: "doc",
    version: 1,
    content: sections.flatMap((section) => {
      const content = []
      if (section.title) content.push(heading(section.title, section.level ?? 3))
      if (section.text) content.push(...section.text.map(paragraph))
      if (section.items) content.push(bulletList(section.items))
      return content
    }),
  }
}

function phaseLabel(phase) {
  return `phase-${String(phase).padStart(2, "0")}`
}

const components = [
  "Produkt und Planung",
  "UX und Design",
  "Plattform und Sicherheit",
  "Stammdaten",
  "Nutzer und Rollen",
  "Finanzen",
  "Services und Tickets",
  "Buchung und Zugang",
  "Kommunikation und Dokumente",
  "Mobile PWA",
  "Integrationen",
  "KI und Analytics",
  "QA und Launch",
]

const versions = ["Release 1", "Release 2", "Release 3"]

const phaseDetails = {
  1: {
    startDate: "2026-06-01",
    endDate: "2026-06-05",
    owner: "Product Lead + WAMOCON Delivery",
    persona: "Ataberk leadership and WAMOCON delivery team",
    value:
      "Turns the client request into a signed business, product, technical and delivery baseline before build work expands.",
    deliverables: ["BRD/PRD/TRD baseline", "Market benchmark", "15-phase delivery model"],
    dependencies: ["Client source documents", "Ataberk business assumptions", "WAMOCON delivery review"],
    links: ["docs/PROJECT-HANDBOOK.md", "docs/requirements/option-3-ai-site-crm/BRD.md"],
  },
  2: {
    startDate: "2026-06-08",
    endDate: "2026-06-12",
    owner: "UX Lead + Product Lead",
    persona: "Managers, accountants, residents, owners and staff",
    value:
      "Defines the Turkish-first operating experience so the CRM is usable as a daily site-management tool, not only a data screen.",
    deliverables: ["Role navigation", "Design system", "Mobile and desktop workflow patterns"],
    dependencies: ["Phase 1 scope lock", "Role/persona agreement"],
    links: ["docs/requirements/option-3-ai-site-crm/PRD.md", "apps/web/messages/tr.json"],
  },
  3: {
    startDate: "2026-06-15",
    endDate: "2026-06-18",
    owner: "Engineering Lead + Security Lead",
    persona: "Administrators and authenticated CRM users",
    value:
      "Creates the secure technical base for all future modules: Auth, RBAC, RLS, audit and environment separation.",
    deliverables: ["Supabase Auth/RBAC foundation", "RLS policies", "Audit and protected route shell"],
    dependencies: ["Supabase project choice", "Role matrix", "Security assumptions"],
    links: [
      "https://supabase.com/docs/guides/database/postgres/row-level-security",
      "https://owasp.org/www-project-application-security-verification-standard/",
    ],
  },
  4: {
    startDate: "2026-06-19",
    endDate: "2026-06-24",
    owner: "Data Lead + Engineering Lead",
    persona: "Site managers and data migration operators",
    value:
      "Makes the 769-unit site model usable through import, validation, search and operational views.",
    deliverables: ["Site/block/floor/unit schema", "Import preview and commit flow", "Unit matrix/search"],
    dependencies: ["Client unit list", "Block/floor conventions", "Data quality rules"],
    links: ["docs/requirements/option-3-ai-site-crm/Data-Migration-Plan.md", "supabase/migrations"],
  },
  5: {
    startDate: "2026-06-25",
    endDate: "2026-06-30",
    owner: "Product Lead + Engineering Lead",
    persona: "Owners, tenants, staff, guests and administrators",
    value:
      "Connects people to units, roles, permissions and documents so later finance and service rules can be enforced correctly.",
    deliverables: ["Person profiles", "Unit/person relationships", "Role and visibility matrix"],
    dependencies: ["Phase 4 unit model", "Client user source data", "RBAC verification"],
    links: ["docs/requirements/option-3-ai-site-crm/PRD.md", "apps/web/lib/rbac.ts"],
  },
  6: {
    startDate: "2026-06-26",
    endDate: "2026-06-30",
    owner: "Finance Analyst + Engineering Lead",
    persona: "Accountants and management",
    value:
      "Establishes the immutable ledger and statements that all balances, payments, deposits and reports must reconcile to.",
    deliverables: ["Chart/account model", "Ledger posting rules", "Statements and exports"],
    dependencies: ["Accountant sign-off", "Opening balance rules", "Phase 5 people/unit links"],
    links: ["docs/requirements/option-3-ai-site-crm/BRD.md", "docs/requirements/option-3-ai-site-crm/TRD.md"],
  },
  7: {
    startDate: "2026-06-27",
    endDate: "2026-06-30",
    owner: "Finance Analyst + Legal/Operations Owner",
    persona: "Residents, accountants and managers",
    value:
      "Connects payment collection, deposits, bank reconciliation and debt restrictions with human approval and legal safeguards.",
    deliverables: ["Payment intent model", "Webhook/reconciliation flow", "Debt restriction policy"],
    dependencies: ["Phase 6 ledger", "Payment provider shortlist", "Legal/accounting approval"],
    links: ["https://www.iyzico.com/en/", "https://www.paytr.com/en", "docs/requirements/option-3-ai-site-crm/Third-Party-Integration-And-Vendor-Plan.md"],
  },
  8: {
    startDate: "2026-06-28",
    endDate: "2026-06-30",
    owner: "Product Lead + Operations Owner",
    persona: "Residents and site operations staff",
    value:
      "Turns resident service requests into controlled orders, payments and trackable tickets with SLA expectations.",
    deliverables: ["Service catalog", "Service order wizard", "Ticket creation path"],
    dependencies: ["Finance rules", "Debt restriction behavior", "Service catalog content"],
    links: ["docs/requirements/option-3-ai-site-crm/PRD.md", "apps/web/app/[locale]/dashboard"],
  },
  9: {
    startDate: "2026-06-28",
    endDate: "2026-06-30",
    owner: "Operations Owner + Engineering Lead",
    persona: "Staff, contractors and managers",
    value:
      "Gives field staff a mobile workflow and gives management evidence, SLA status and performance visibility.",
    deliverables: ["Task board", "Mobile staff view", "Media evidence and SLA reports"],
    dependencies: ["Phase 8 service tickets", "Staff groups", "Mobile upload policy"],
    links: ["docs/requirements/option-3-ai-site-crm/PRD.md", "docs/requirements/option-3-ai-site-crm/QA-Client-Acceptance-Launch-Plan.md"],
  },
  10: {
    startDate: "2026-06-29",
    endDate: "2026-06-30",
    owner: "Product Lead + Operations Owner",
    persona: "Managers, residents, guests and security/access staff",
    value:
      "Controls booking, move-in, checkout, deposit settlement and access actions end-to-end with audit evidence.",
    deliverables: ["Availability calendar", "Move-in/out wizard", "Access action queue"],
    dependencies: ["Ledger/deposit rules", "Access vendor inventory", "Legal access policy"],
    links: ["docs/requirements/option-3-ai-site-crm/BRD.md", "docs/requirements/option-3-ai-site-crm/TRD.md"],
  },
  11: {
    startDate: "2026-06-29",
    endDate: "2026-06-30",
    owner: "Product Lead + Operations Owner",
    persona: "Residents, owners, staff and management",
    value:
      "Centralizes communication, notices, document storage and delivery status so decisions and documents stay auditable.",
    deliverables: ["Chat and announcements", "Notification templates", "Document vault"],
    dependencies: ["Consent/opt-out policy", "Email/SMS/push provider decision", "Document retention rules"],
    links: ["https://postmarkapp.com/pricing", "https://aws.amazon.com/ses/", "https://firebase.google.com/pricing"],
  },
  12: {
    startDate: "2026-06-30",
    endDate: "2026-06-30",
    owner: "Frontend Lead + QA Lead",
    persona: "Mobile residents, owners, staff and managers",
    value:
      "Hardens the responsive web app into a practical installable PWA for daily mobile workflows.",
    deliverables: ["PWA shell", "Mobile role flows", "Performance and installability checks"],
    dependencies: ["Core workflows", "Push notification decision", "Mobile QA devices"],
    links: ["https://web.dev/learn/pwa/", "https://firebase.google.com/pricing", "https://onesignal.com/pricing"],
  },
  13: {
    startDate: "2026-06-30",
    endDate: "2026-06-30",
    owner: "Engineering Lead + Procurement/Finance Owner",
    persona: "Managers, accountants, residents and operations staff using external services",
    value:
      "Connects external systems safely through adapters, cost ownership, sandbox proof, monitoring, retries and manual fallback.",
    deliverables: ["External dependency register", "Provider adapters", "Integration console and runbook"],
    dependencies: ["Provider quotes", "Contracts/KVKK review", "Sandbox credentials", "Hardware inventory"],
    links: ["docs/requirements/option-3-ai-site-crm/Third-Party-Integration-And-Vendor-Plan.md"],
  },
  14: {
    startDate: "2026-06-30",
    endDate: "2026-06-30",
    owner: "AI/Product Lead + Security Lead",
    persona: "Managers, accountants, support and operations leads",
    value:
      "Adds AI support for summaries, triage, analytics and reporting while blocking autonomous finance/access actions.",
    deliverables: ["AI gateway", "Source-grounded assistant", "Evaluation and approval gates"],
    dependencies: ["Allowed data-class decision", "AI budget cap", "Prompt/source logging policy"],
    links: ["https://platform.openai.com/docs/pricing", "docs/requirements/option-3-ai-site-crm/Security-Compliance-Plan.md"],
  },
  15: {
    startDate: "2026-07-01",
    endDate: "2026-07-08",
    owner: "QA Lead + Launch Manager",
    persona: "Client steering group, admins and launch support",
    value:
      "Turns the portfolio rollout into a launchable product through functional QA, security checks, client acceptance preparation, training, runbooks, monitoring and hypercare.",
    deliverables: ["Functional QA evidence", "Security and performance checks", "Client acceptance preparation", "Launch runbook and training"],
    dependencies: ["All launch-critical phase gates", "Production data", "Client sign-off"],
    links: ["docs/requirements/option-3-ai-site-crm/QA-Client-Acceptance-Launch-Plan.md", "docs/ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md"],
  },
}

const externalReferenceLinks = {
  cloud: [
    "Supabase Pricing - https://supabase.com/pricing",
    "Supabase Realtime - https://supabase.com/docs/guides/realtime",
    "Supabase RLS - https://supabase.com/docs/guides/database/postgres/row-level-security",
    "Vercel Pricing - https://vercel.com/pricing",
  ],
  delivery: [
    "Jira Pricing - https://www.atlassian.com/software/jira/pricing",
    "Xray Cloud Marketplace Pricing - https://marketplace.atlassian.com/apps/1211769/xray-test-management-for-jira?tab=pricing",
  ],
  payments: [
    "iyzico - https://www.iyzico.com/en/",
    "PayTR - https://www.paytr.com/en",
    "Param - https://param.com.tr/",
    "Sipay - https://sipay.com.tr/",
    "Paycell - https://www.paycell.com.tr/",
    "Papara - https://www.papara.com/",
  ],
  messaging: [
    "Netgsm - https://www.netgsm.com.tr/",
    "Ileti Merkezi - https://www.iletimerkezi.com/",
    "Postmark Pricing - https://postmarkapp.com/pricing",
    "Amazon SES - https://aws.amazon.com/ses/",
    "Firebase Pricing - https://firebase.google.com/pricing",
    "OneSignal Pricing - https://onesignal.com/pricing",
  ],
  monitoring: [
    "Sentry Pricing - https://sentry.io/pricing/",
    "Better Stack Pricing - https://betterstack.com/pricing",
    "UptimeRobot Pricing - https://uptimerobot.com/pricing/",
  ],
  access: [
    "Hikvision - https://www.hikvision.com/en/",
    "Dahua Security - https://www.dahuasecurity.com/",
    "ZKTeco - https://www.zkteco.com/en/",
    "dormakaba - https://www.dormakaba.com/",
  ],
  accounting: [
    "Logo Yazilim - https://www.logo.com.tr/",
    "Mikro Yazilim - https://www.mikro.com.tr/",
    "Parasut - https://www.parasut.com/",
    "Uyumsoft - https://www.uyumsoft.com/",
  ],
  ai: ["OpenAI API Pricing - https://platform.openai.com/docs/pricing"],
  api: [
    "OpenAPI Specification 3.2.0 - https://spec.openapis.org/oas/latest.html",
    "OpenAPI Learn - https://learn.openapis.org/",
    "Redocly CLI - https://redocly.com/docs/cli",
    "Swagger UI - https://swagger.io/tools/swagger-ui/",
    "Playwright API testing - https://playwright.dev/docs/api-testing",
  ],
  security: [
    "OWASP ASVS - https://owasp.org/www-project-application-security-verification-standard/",
    "WCAG 2.2 - https://www.w3.org/TR/WCAG22/",
  ],
}

function phaseMeta(phase) {
  return phaseDetails[phase.phase] ?? {
    startDate: "2026-06-26",
    endDate: "2026-06-26",
    owner: "WAMOCON Delivery",
    persona: "Project stakeholders",
    value: phase.goal,
    deliverables: [phase.outcome],
    dependencies: ["Project baseline"],
    links: ["docs/PROJECT-HANDBOOK.md"],
  }
}

function toUtcDate(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date, days) {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function daysInclusive(startDate, endDate) {
  return Math.max(1, Math.round((toUtcDate(endDate) - toUtcDate(startDate)) / 86400000) + 1)
}

function businessDaysBetween(startDate, endDate) {
  const days = []
  for (let date = toUtcDate(startDate); date <= toUtcDate(endDate); date = addDays(date, 1)) {
    const day = date.getUTCDay()
    if (day !== 0 && day !== 6) days.push(new Date(date))
  }
  return days.length > 0 ? days : [toUtcDate(startDate)]
}

function scheduleForStory(phase, index) {
  const meta = phaseMeta(phase)
  const storyCount = Math.max(1, phase.stories.length)
  const workdays = businessDaysBetween(meta.startDate, meta.endDate)
  const totalDays = workdays.length
  const startOffset = Math.min(totalDays - 1, Math.floor((index * totalDays) / storyCount))
  const endOffset = Math.max(startOffset, Math.min(totalDays - 1, Math.floor(((index + 1) * totalDays) / storyCount) - 1))
  return {
    startDate: dateOnly(workdays[startOffset]),
    endDate: dateOnly(workdays[endOffset]),
  }
}

function storyUserRole(phase, story) {
  if (/payment|zahlung|kaution|ledger|finanz|bank|reconciliation|abgleich/i.test(story)) {
    return "accountant or finance manager"
  }
  if (/sms|e-mail|push|benachrichtigung|kommunikation|dokument/i.test(story)) {
    return "operations manager"
  }
  if (/access|barrier|kamera|zugang|zähler|meter/i.test(story)) {
    return "site operations and security manager"
  }
  if (/pwa|mobile|mitarbeit|staff|personal/i.test(story)) {
    return "mobile staff user"
  }
  if (/kostenregister|provider|shortlist|credentials|secret|integration/i.test(story)) {
    return "delivery manager"
  }
  return phaseMeta(phase).persona
}

function linksForPhase(phase, story = "") {
  const meta = phaseMeta(phase)
  const links = new Set(meta.links)

  if ([3, 4, 5, 6, 7, 11, 13, 14, 15].includes(phase.phase)) {
    externalReferenceLinks.cloud.forEach((link) => links.add(link))
  }
  if ([1, 13, 15].includes(phase.phase)) {
    externalReferenceLinks.delivery.forEach((link) => links.add(link))
  }
  if ([7, 13].includes(phase.phase) || /payment|zahlung|bank|wallet|top-up|provider/i.test(story)) {
    externalReferenceLinks.payments.forEach((link) => links.add(link))
  }
  if ([11, 12, 13].includes(phase.phase) || /sms|e-mail|push|benachrichtigung|notification/i.test(story)) {
    externalReferenceLinks.messaging.forEach((link) => links.add(link))
  }
  if ([13, 15].includes(phase.phase) || /monitoring|health|uptime|sentry/i.test(story)) {
    externalReferenceLinks.monitoring.forEach((link) => links.add(link))
  }
  if ([10, 13].includes(phase.phase) || /access|barrier|kamera|zugang|zähler|meter/i.test(story)) {
    externalReferenceLinks.access.forEach((link) => links.add(link))
  }
  if ([6, 7, 13].includes(phase.phase) || /accounting|e-invoice|buchhaltung/i.test(story)) {
    externalReferenceLinks.accounting.forEach((link) => links.add(link))
  }
  if ([13, 14].includes(phase.phase) || /ai|ki|modell|provider/i.test(story)) {
    externalReferenceLinks.ai.forEach((link) => links.add(link))
  }
  if ([3, 13, 15].includes(phase.phase) || /api|contract|vertrag|openapi|webhook|adapter/i.test(story)) {
    externalReferenceLinks.api.forEach((link) => links.add(link))
  }
  if ([3, 11, 12, 15].includes(phase.phase)) {
    externalReferenceLinks.security.forEach((link) => links.add(link))
  }

  return [...links]
}

function storyAcceptanceCriteria(phase, story) {
  const criteria = [
    "The story has a clear owner, reviewed scope, start date, target end date and Jira status.",
    "The implementation uses real project data, Supabase-backed APIs or a documented provider adapter; no production workflow is mock-only.",
    "RBAC/RLS, audit logging and error handling are checked wherever user, finance, document, access or provider data is touched.",
    "Evidence is attached or linked: screenshots, test output, client acceptance note, API contract or provider sandbox proof as relevant.",
  ]

  if (/kostenregister|abhängigkeiten|abhaengigkeiten|provider-shortlist|entscheidung/i.test(story)) {
    criteria.push(
      "Each paid or external provider has a working official link, cost type, billing owner, technical owner and procurement decision gate.",
      "Supabase Cloud Pro, Vercel, Jira/Xray, monitoring, email, SMS, payment, bank, AI, access/security and accounting dependencies are all covered."
    )
  }
  if (/payment|zahlung|refund|webhook|bank|reconciliation|abgleich/i.test(story)) {
    criteria.push(
      "Payment and bank events are idempotent and cannot double-book ledger entries.",
      "Manual fallback exists for provider outage, failed webhook, failed import and disputed reconciliation."
    )
  }
  if (/sms|e-mail|push|benachrichtigung|notification/i.test(story)) {
    criteria.push(
      "Templates, consent/opt-out, delivery status, retry behavior and failure visibility are covered.",
      "Routine messages prefer push/email; SMS is reserved for OTP and high-priority notices unless operations approves higher cost."
    )
  }
  if (/access|barrier|kamera|zähler|meter|zugang/i.test(story)) {
    criteria.push(
      "Hardware/API details are confirmed before adapter work starts.",
      "No automation silently grants, blocks or restricts physical access without human approval and audit."
    )
  }
  if (/ai|ki|modell|provider/i.test(story)) {
    criteria.push(
      "AI output is source-grounded, logged and blocked from autonomous finance/access execution.",
      "Allowed data classes, retention and budget caps are recorded before production AI use."
    )
  }
  return criteria
}

function storyWorkItems(story) {
  const work = [
    `Confirm the exact scope for: ${story}.`,
    "Update code, schema, API, UI and documentation only where this story requires it.",
    "Add or update functional, regression, API or security test evidence before moving the ticket to Done.",
  ]
  if (/provider|kostenregister|abhängigkeiten|abhaengigkeiten/i.test(story)) {
    work.push("Add provider links, cost model, owner, decision gate and current status for every external dependency.")
  }
  if (/adapter|webhook|provider|payment|bank|sms|e-mail|push|access|kamera|zähler|monitoring/i.test(story)) {
    work.push("Record sandbox/test mode, production mode, retry/dead-letter behavior, health status and manual fallback.")
  }
  return work
}

function fieldsByName(fields, names) {
  return names.map((name) => findFieldByName(fields, [name])).find(Boolean)
}

const documentationAttachments = [
  "docs/1Cati-Current-Project-Documentation.docx",
  "docs/PROJECT-HANDBOOK.docx",
  "docs/requirements/option-3-ai-site-crm/1Cati-Requirements-Package.docx",
  "docs/requirements/option-3-ai-site-crm/BRD.docx",
  "docs/requirements/option-3-ai-site-crm/PRD.docx",
  "docs/requirements/option-3-ai-site-crm/TRD.docx",
  "docs/requirements/option-3-ai-site-crm/Third-Party-Integration-And-Vendor-Plan.docx",
  "docs/requirements/option-3-ai-site-crm/Implementation-Delivery-Plan.docx",
  "docs/requirements/option-3-ai-site-crm/Security-Compliance-Plan.docx",
  "docs/requirements/option-3-ai-site-crm/Data-Migration-Plan.docx",
  "docs/requirements/option-3-ai-site-crm/QA-Client-Acceptance-Launch-Plan.docx",
  "docs/requirements/option-3-ai-site-crm/Requirements-Traceability-Matrix.docx",
  "docs/requirements/option-3-ai-site-crm/Market-Research-Annex.docx",
  "docs/requirements/option-3-ai-site-crm/Source-Register.docx",
  "docs/ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.docx",
  "docs/ways-of-work/plan/option-3-ai-site-crm/implementation-plan.docx",
]

const obsoleteDocumentationAttachmentNames = new Set([
  "AI-Site-CRM-Requirements-Package.docx",
  "AI-Site-CRM-Management-Paket-DE.docx",
  "New-Level-Premium-CRM-Business-Blueprint-DE.docx",
  "feature-release-readiness-phase2-1.md",
  "PROJECT-HANDBOOK.md",
  "Third-Party-Integration-And-Vendor-Plan.md",
  "implementation-plan.md",
  "phase-04-critical-qa-notes.md",
  "QA-UAT-Launch-Plan.docx",
])

const phases = [
  {
    phase: 1,
    status: "done",
    version: "Release 1",
    component: "Produkt und Planung",
    title: "Discovery, Anforderungen und Marktbenchmark abschließen",
    goal:
      "Die Kundenanforderung wird vollständig in ein belastbares Produkt-, Technik- und Liefermodell überführt.",
    outcome:
      "BRD, PRD, TRD, Marktanalyse und 15-Phasen-Plan liegen vor und bilden die Grundlage für Umsetzung, Angebot und Kundenabnahme.",
    stories: [
      "BRD, PRD, TRD und Marktanhang auf Basis der Kundenanforderung finalisieren",
      "Türkische und internationale Wettbewerber als Funktionsbaseline auswerten",
      "15-Phasen-Roadmap mit Release 1, V1, V2 und Kundenabnahme-Szenarien freigeben",
    ],
  },
  {
    phase: 2,
    status: "done",
    version: "Release 1",
    component: "UX und Design",
    title: "UX/UI-System und Produktnavigation für den Betrieb definieren",
    goal:
      "Die Anwendung wird als türkischsprachiges, ruhiges und schnelles Arbeitswerkzeug für Manager, Buchhaltung, Bewohner und Mitarbeitende gestaltet.",
    outcome:
      "Designsystem, responsive Navigation, Statussprache, Wizard-Muster und rollenbezogene Startseiten sind prototypisch nutzbar.",
    stories: [
      "Türkischsprachiges Designsystem mit Farben, Typografie, Statuslogik und Barrierefreiheit erstellen",
      "Rollenbezogene Navigation für Manager, Buchhaltung, Bewohner, Eigentümer und Personal entwerfen",
      "Kritische Workflows als klickbare mobile und Desktop-Prototypen abbilden",
      "Oeffentliche Produkt-, Trust-, Review- und Legal-Seiten als eigene Inhalts- und QA-Abdeckung pflegen",
    ],
  },
  {
    phase: 3,
    status: "done",
    version: "Release 1",
    component: "Plattform und Sicherheit",
    title: "Plattformfundament, Authentifizierung, RBAC und Audit aufbauen",
    goal:
      "Die Sicherheits- und Mandantenbasis wird stabil genug, damit alle Fachmodule darauf aufbauen können.",
    outcome:
      "Supabase Auth, Rollen, Mandanten, Audit-Log, Fehlerbehandlung und sichere Servergrenzen sind vorbereitet.",
    stories: [
      "Supabase-Profile, Rollen und mandantenfähige Zugriffskontrolle implementieren",
      "Audit-Log für finanzielle, operative, Zugangs- und KI-Aktionen vorbereiten",
      "Lokale Access-Profile technisch von Produktiv-Authentifizierung trennen und in Produktion deaktiviert lassen",
      "Produktive OAuth-Anbieter wie Google und Yandex provider-ready vorbereiten und Demo-Modus klar trennen",
    ],
  },
  {
    phase: 4,
    status: "done",
    version: "Release 1",
    component: "Stammdaten",
    title: "Site-, Block-, Etagen- und Wohnungsmodell für 769 Einheiten erstellen",
    goal:
      "Alle 769 Wohnungen können mit Block, Etage, Status, Eigentümer, Mieter und Historie sauber verwaltet werden.",
    outcome:
      "Datenmodell, Importprozess, Matrixansicht und Datenqualitätsprüfung sind vorhanden.",
    stories: [
      "Produktives Supabase-Schema für Sites, Blöcke, Etagen, Wohnungen und Beziehungen anwenden",
      "Excel-Import mit Vorschau, Dublettenprüfung und Fehlerliste bauen",
      "Wohnungsmatrix, Suchfilter und Wohnungsdetail aus echten Daten anzeigen",
    ],
  },
  {
    phase: 5,
    status: "done",
    version: "Release 1",
    component: "Nutzer und Rollen",
    title: "Eigentümer, Mieter, Personal und Rollen vollständig verwalten",
    goal:
      "Jede Person im Objekt ist mit korrekten Rechten, Kontakten, Dokumenten und Wohnungen verbunden.",
    outcome:
      "Eigentümer-, Mieter-, Personal- und Rollenprofile sind produktiv nutzbar.",
    stories: [
      "Eigentümer-, Mieter-, Gast- und Personaldatensätze mit Wohnungsbeziehungen erstellen",
      "Dokumenten- und Identitätsstatus je Person mit Sichtbarkeitsregeln verwalten",
      "Rollenmatrix und Mandantenrechte für alle Module testen",
      "Lead- und Vertriebsarbeitsbereich mit Suche, Pipeline-Status, Kontaktkanal und Rollenrechten nachvollziehbar abdecken",
    ],
  },
  {
    phase: 6,
    status: "done",
    version: "Release 1",
    component: "Finanzen",
    title: "Finanz-Ledger als verlässliche Buchhaltungsbasis implementieren",
    goal:
      "Salden werden ausschließlich aus Ledger-Einträgen berechnet und sind vollständig prüfbar.",
    outcome:
      "Konten, Buchungen, Rückbuchungen, Abgrenzungen und Auszüge funktionieren fachlich korrekt.",
    stories: [
      "Kontenmodell für Eigentümer, Mieter, Kaution und Verwaltungsgesellschaft erstellen",
      "Buchungsregeln für Sollstellung, Zahlung, Korrektur, Rückerstattung und Ausgleich implementieren",
      "Kontoauszug, Saldenkarte und Export aus echten Ledger-Daten liefern",
    ],
  },
  {
    phase: 7,
    status: "done",
    version: "Release 2",
    component: "Finanzen",
    title: "Zahlungen, Kautionen, Abgleich und Schuldenrestriktionen umsetzen",
    goal:
      "Offene Forderungen, Online-Zahlungen, Kautionen und Sperrregeln werden konsequent und nachvollziehbar gesteuert.",
    outcome:
      "Payment-Control-API, Finanzoberfläche, Kautions-/Restriktionslogik und QA-Harness sind als reviewfähige Implementierungsbasis vorhanden; produktive Provider-, Bank-, Legal- und Kundenabnahme-Entscheidungen bleiben offen.",
    stories: [
      "Payment-Intent, Provider-Webhook und idempotente Zahlungsverbuchung implementieren",
      "Kaution blockieren, verwenden, teilweise erstatten und vollständig abrechnen",
      "Schuldenregeln für Services, Buchungen und Zugang backendseitig erzwingen",
    ],
  },
  {
    phase: 8,
    status: "done",
    version: "Release 2",
    component: "Services und Tickets",
    title: "Servicekatalog und Servicebestellprozess produktiv machen",
    goal:
      "Bewohner können Services bestellen, während Schulden-, Zahlungs- und SLA-Regeln automatisch greifen.",
    outcome:
      "Servicekatalog, Bestellung, Prüfung, Zahlung und Ticketanlage sind Ende-zu-Ende verbunden.",
    stories: [
      "Servicekatalog mit Preis, SLA, Zuständigkeit und Verfügbarkeit verwalten",
      "Servicebestellung mit Schuldenprüfung, Zahlung oder Belastung als Wizard bauen",
      "Akzeptierte Servicebestellung automatisch in Ticket und Aufgabe überführen",
      "Ticket-Aktionsfreigabe mit KI-Hinweis, Risiko, Herkunft und Managerentscheidung sichtbar machen",
    ],
  },
  {
    phase: 9,
    status: "done",
    version: "Release 2",
    component: "Services und Tickets",
    title: "Aufgaben, Personal, SLA und mobile Arbeitsberichte umsetzen",
    goal:
      "Operatives Personal kann Aufgaben mobil bearbeiten und Management sieht Qualität, SLA und Nachweise.",
    outcome:
      "Taskboard, mobile Aufgabenliste, Mediennachweise, Eskalationen und Leistungsberichte sind verfügbar.",
    stories: [
      "Aufgabenstatus, Priorität, SLA, Zuständigkeit und Verlauf modellieren",
      "Mobile Mitarbeitendenansicht mit Foto- und Videonachweis erstellen",
      "SLA-Risiken und Mitarbeiterleistung im Managementbericht anzeigen",
    ],
  },
  {
    phase: 10,
    status: "done",
    version: "Release 2",
    component: "Buchung und Zugang",
    title: "Buchung, Einzug, Auszug, Kaution und Zugang Ende-zu-Ende steuern",
    goal:
      "Der gesamte Lebenszyklus von Verfügbarkeit bis Auszug wird in einem prüfbaren Prozess abgebildet.",
    outcome:
      "Buchungskalender, Einzugs- und Auszugs-Wizard, Kautionsabrechnung und Zugangswarteschlange sind verbunden.",
    stories: [
      "Verfügbarkeitskalender mit Kollisionsprüfung und Buchungsstatus bauen",
      "Einzug mit Zahlung, Kaution, Vorbereitung, Zugang und Benachrichtigung automatisieren",
      "Auszug mit Inspektion, Schuldenausgleich, Kautionsabzug und Zugangssperre abschließen",
    ],
  },
  {
    phase: 11,
    status: "done",
    version: "Release 2",
    component: "Kommunikation und Dokumente",
    title: "Kommunikation, Benachrichtigungen und Dokumente zentralisieren",
    goal:
      "Alle Gespräche, Ankündigungen, Benachrichtigungen und Dokumente sind nachvollziehbar und rollenbasiert sichtbar.",
    outcome:
      "Chat, interne Kommunikation, Push/E-Mail/SMS-Vorlagen, Dokumentenablage und Zustellstatus sind vorhanden.",
    stories: [
      "Bewohner-Management-Chat und interne Teamkommunikation mit Kontextbezug erstellen",
      "Benachrichtigungsvorlagen, Versandstatus und Wiederholversuche implementieren",
      "Dokumententresor mit Rollenrechten, Ablaufdaten und Audit-Protokoll bauen",
    ],
  },
  {
    phase: 12,
    status: "done",
    version: "Release 2",
    component: "Mobile PWA",
    title: "Mobile PWA für Bewohner, Eigentümer, Personal und Manager liefern",
    goal:
      "Die wichtigsten Arbeits- und Bewohnerprozesse funktionieren schnell und verständlich auf mobilen Geräten.",
    outcome:
      "Installierbare PWA, mobile Rollenseiten, Push-Grundlage und mobile E2E-Tests sind vorhanden.",
    stories: [
      "PWA-Shell mit Rollenstartseiten und Offline-freundlicher Grundstruktur erstellen",
      "Bewohner- und Eigentümerflows für Saldo, Zahlung, Dokumente, Chat und Services bauen",
      "Personal- und Managerflows für Aufgaben, Freigaben, SLA und Tagesübersicht mobil umsetzen",
    ],
  },
  {
    phase: 13,
    status: "done",
    version: "Release 3",
    component: "Integrationen",
    title: "Externe Integrationen über Adapter, Provider und sichere Webhooks anbinden",
    goal:
      "Zahlungen, Bankabgleich, SMS, E-Mail, Push, Wallet/Top-up, Zugang, Kameras, Zähler und Monitoring sind kontrolliert integrierbar.",
    outcome:
      "Provider-Shortlist, Adapter, Testmodus, Webhooks, Retry-Queue, Fehlerstatus, Monitoring und Integrationsprotokolle sind vorhanden.",
    stories: [
      "Provider-Shortlist und Entscheidungsmatrix für Payment, SMS, E-Mail, Push, Wallet, Zugang und Monitoring pflegen",
      "Externe Abhängigkeiten und Kostenregister inklusive Supabase Cloud Pro, Hosting, Jira/Xray, Monitoring, Messaging, Payment, Bank, AI, Access und Accounting pflegen",
      "Adapterarchitektur für Payment, Bankabgleich, Messaging, Wallet, Zugang, Kamera, Zähler und KI-Provider definieren",
      "Payment-Adapter für iyzico/PayTR-Shortlist mit Sandbox, Payment Intent, Refund und idempotentem Webhook vorbereiten",
      "Bankimport- und Reconciliation-Adapter für CSV/Excel sowie spätere Bank-API-Anbindung umsetzen",
      "Benachrichtigungsadapter für SMS, E-Mail und Push mit Templates, Zustellstatus, Retry und Opt-out bauen",
      "Wallet- und Top-up-Modell als internes Ledger-Konto vorbereiten und bis zur Rechtsfreigabe deaktiviert halten",
      "Access-, Barrier-, Karten-, Kamera- und Zähler-Adapter nach Hardware-Inventar mit manueller Fallback-Queue planen",
      "Provider-Credentials, Secret-Rotation, Testmodus und produktive Umgebung sauber trennen",
      "Integrationskonsole mit Health, Latenz, Fehlern, Queue-Länge, manueller Wiederholung und Audit bauen",
      "Integrations-Runbook für Support, Provider-Ausfall, Rückfall auf manuelle Prozesse und Launch-Abnahme erstellen",
    ],
  },
  {
    phase: 14,
    status: "done",
    version: "Release 3",
    component: "KI und Analytics",
    title: "KI-Premium-Layer und fortgeschrittene Analytics kontrolliert einführen",
    goal:
      "KI unterstützt Manager, Buchhaltung, Bewohner und Personal, ohne eigenständig kritische Finanz- oder Zugangshandlungen auszuführen.",
    outcome:
      "KI-Kommandozentrale, Quellen, Konfidenz, Freigaben, Events, Evaluation und Modellwahl sind produktionsreif.",
    stories: [
      "KI-Provider über konfigurierbare Gateways integrieren und Modellwahl pro Use Case dokumentieren",
      "KI-Tagesbriefing, Schuldenpriorisierung, Service-Triage und Berichtsentwürfe mit Quellen anzeigen",
      "Freigabeprozess und Audit für KI-Empfehlungen zu Finanzen, Zugang und sensiblen Daten erzwingen",
    ],
  },
  {
    phase: 15,
    status: "in-progress",
    version: "Release 3",
    component: "QA und Launch",
    title: "QA, Sicherheit, Performance, Kundenabnahme, Schulung und Launch absichern",
    goal:
      "Der Launch erfolgt mit belastbaren Tests, Sicherheitsprüfung, Trainingsmaterial und Betriebsrunbook.",
    outcome:
      "Funktionale Testsuite, Xray-Testfälle, E2E-Tests, RLS-Prüfung, Monitoring, Backup/Restore und Schulung sind abgeschlossen.",
    stories: [
      "Xray-Testfälle und Kundenabnahme-Szenarien für alle kritischen Workflows pflegen",
      "Sicherheits-, Performance-, RLS-, Mobile- und Browser-QA automatisieren",
      "Launch-Runbook, Supportprozess, Schulungsunterlagen und Abnahmeprotokoll erstellen",
      "QA-Begriffe fuer Funktionstest, Systemtest, Regression, Exploration und Kundenabnahme sauber trennen",
    ],
  },
]

const tests = [
  {
    uid: "test-001",
    component: "Services und Tickets",
    summary: "Servicebestellung wird bei offener Schuld blockiert",
    precondition: "Ein Mieter ist einer Wohnung zugeordnet und hat eine offene Forderung oberhalb der Sperrgrenze.",
    steps: [
      ["Als Mieter den Servicekatalog öffnen.", "Der Servicekatalog ist sichtbar."],
      ["Einen kostenpflichtigen Service auswählen.", "Der Bestell-Wizard zeigt Servicepreis und SLA."],
      ["Bestellung absenden.", "Das System führt die Schuldenprüfung aus."],
      ["Ergebnis prüfen.", "Die Bestellung wird blockiert und es wird eine klare Zahlungsaufforderung angezeigt."],
    ],
  },
  {
    uid: "test-002",
    component: "Services und Tickets",
    summary: "Bezahlte Servicebestellung erzeugt Ticket und Aufgabe",
    precondition: "Ein Bewohner hat keine Sperre und der gewählte Service ist aktiv.",
    steps: [
      ["Service auswählen und Zahlung bestätigen.", "Die Zahlung wird als erfolgreich markiert."],
      ["Bestellung abschließen.", "Ein Serviceauftrag wird erstellt."],
      ["Ticketboard öffnen.", "Ein Ticket mit passender Kategorie, SLA und Priorität ist vorhanden."],
      ["Aufgabendetail prüfen.", "Eine Aufgabe ist einer zuständigen Gruppe oder Person zugewiesen."],
    ],
  },
  {
    uid: "test-003",
    component: "Buchung und Zugang",
    summary: "Einzug aktiviert Aufgaben, Kaution und Zugang",
    precondition: "Eine freie Wohnung ist verfügbar und der Gast hat Zahlung und Kaution bestätigt.",
    steps: [
      ["Eine Buchung im Kalender anlegen.", "Die Verfügbarkeit wird ohne Überschneidung bestätigt."],
      ["Einzugs-Wizard starten.", "Vorbereitungsaufgaben werden vorgeschlagen."],
      ["Kaution blockieren und Einzug bestätigen.", "Kautionsstatus ist gehalten und Aufgaben sind offen."],
      ["Zugang prüfen.", "Der Zugang steht auf ausgestellt oder wartet in der Integrationswarteschlange."],
    ],
  },
  {
    uid: "test-004",
    component: "Buchung und Zugang",
    summary: "Auszug verrechnet Schäden und erstattet Restkaution",
    precondition: "Eine aktive Buchung mit gehaltener Kaution und offener Inspektionsaufgabe existiert.",
    steps: [
      ["Auszugs-Wizard öffnen.", "Inspektionscheckliste ist sichtbar."],
      ["Schaden und offene Forderung erfassen.", "Das System berechnet Abzug und Restkaution."],
      ["Auszug abschließen.", "Finale Abrechnung wird erstellt."],
      ["Zugang und Kaution prüfen.", "Zugang ist deaktiviert und Restkaution ist zur Erstattung markiert."],
    ],
  },
  {
    uid: "test-005",
    component: "Stammdaten",
    summary: "Import von 769 Wohnungen erkennt Dubletten und Pflichtfeldfehler",
    precondition: "Eine Excel-Datei enthält 769 Wohnungen, davon mindestens eine Dublette und ein fehlendes Pflichtfeld.",
    steps: [
      ["Import-Wizard öffnen und Datei hochladen.", "Die Vorschau wird erzeugt."],
      ["Validierung starten.", "Dubletten und Pflichtfeldfehler werden markiert."],
      ["Import ohne Korrektur bestätigen.", "Der Import wird verhindert."],
      ["Korrekturen anwenden und erneut bestätigen.", "Alle gültigen Wohnungen werden übernommen."],
    ],
  },
  {
    uid: "test-006",
    component: "Nutzer und Rollen",
    summary: "Mieter sieht keine vertraulichen Eigentümerdaten",
    precondition: "Eine Wohnung hat einen Eigentümer und einen Mieter mit eingeschränkten Rechten.",
    steps: [
      ["Als Mieter anmelden.", "Das Mieterportal öffnet sich."],
      ["Wohnungs- und Dokumentenbereich öffnen.", "Nur freigegebene Daten sind sichtbar."],
      ["Eigentümerabrechnung suchen.", "Die vertrauliche Eigentümerabrechnung ist nicht sichtbar."],
      ["Audit prüfen.", "Unzulässige Zugriffsversuche werden nicht als erfolgreiche Dokumentansicht protokolliert."],
    ],
  },
  {
    uid: "test-007",
    component: "Finanzen",
    summary: "Doppelter Zahlungs-Webhook erzeugt keine Doppelbuchung",
    precondition: "Ein Zahlungsanbieter sendet denselben Webhook mit gleicher Referenz zweimal.",
    steps: [
      ["Ersten Webhook verarbeiten.", "Eine Zahlung wird im Ledger gebucht."],
      ["Identischen Webhook erneut verarbeiten.", "Das System erkennt die Provider-Referenz."],
      ["Ledger prüfen.", "Es existiert nur eine Zahlung."],
      ["Audit prüfen.", "Der zweite Webhook ist als Duplikat protokolliert."],
    ],
  },
  {
    uid: "test-008",
    component: "Finanzen",
    summary: "Manueller Zahlungsausgleich benötigt Freigabe",
    precondition: "Eine nicht zuordenbare Zahlung befindet sich in der Reconciliation-Queue.",
    steps: [
      ["Als Buchhaltung die Queue öffnen.", "Die Zahlung ist als ungeklärt sichtbar."],
      ["Zahlung einem Konto zuordnen.", "Das System zeigt Konto und Risiko."],
      ["Freigabe bestätigen.", "Die Buchung wird erstellt."],
      ["Audit prüfen.", "Freigebende Person, Zeitpunkt und Ursprungsdaten sind protokolliert."],
    ],
  },
  {
    uid: "test-009",
    component: "Kommunikation und Dokumente",
    summary: "Dokumentenzugriff folgt Rollen- und Wohnungsbeziehung",
    precondition: "Ein Dokument ist einer Wohnung und einer sensiblen Kategorie zugeordnet.",
    steps: [
      ["Als berechtigter Eigentümer öffnen.", "Das Dokument ist sichtbar."],
      ["Als nicht berechtigter Bewohner öffnen.", "Das Dokument ist nicht sichtbar."],
      ["Als Manager öffnen.", "Das Dokument ist gemäß Rolle sichtbar."],
      ["Audit prüfen.", "Erfolgreiche sensible Dokumentansichten sind protokolliert."],
    ],
  },
  {
    uid: "test-010",
    component: "Kommunikation und Dokumente",
    summary: "Benachrichtigung speichert Zustellstatus und Wiederholversuch",
    precondition: "Ein SMS- oder E-Mail-Provider ist im Testmodus verbunden.",
    steps: [
      ["Eine Ankündigung an eine Zielgruppe senden.", "Nachrichten werden erzeugt."],
      ["Providerfehler simulieren.", "Der Status wird als fehlgeschlagen gespeichert."],
      ["Wiederholversuch starten.", "Der Versand wird erneut versucht."],
      ["Zustellprotokoll prüfen.", "Erfolg, Fehlergrund und Zeitpunkt sind nachvollziehbar."],
    ],
  },
  {
    uid: "test-011",
    component: "KI und Analytics",
    summary: "KI-Tagesbriefing nennt Quellen und Konfidenz",
    precondition: "Es existieren offene Schulden, SLA-Risiken und Buchungsereignisse.",
    steps: [
      ["KI-Kommandozentrale öffnen.", "Das Tagesbriefing ist verfügbar."],
      ["Briefing generieren.", "Die KI nennt Prioritäten und Begründungen."],
      ["Quellen prüfen.", "Jede Empfehlung verweist auf Datensätze oder Reports."],
      ["Audit prüfen.", "Prompt, Modell, Ergebnis und Nutzer sind gespeichert."],
    ],
  },
  {
    uid: "test-012",
    component: "KI und Analytics",
    summary: "KI darf keine Zahlung oder Zugangssperre direkt ausführen",
    precondition: "Eine KI-Empfehlung betrifft eine Rückerstattung oder Zugangssperre.",
    steps: [
      ["KI nach direkter Ausführung fragen.", "Die KI verweigert die direkte Ausführung."],
      ["Empfehlung als Aktion erzeugen.", "Eine ausstehende Empfehlung wird angelegt."],
      ["Managerfreigabe prüfen.", "Die Aktion benötigt eine menschliche Bestätigung."],
      ["Audit prüfen.", "Freigabe oder Ablehnung wird protokolliert."],
    ],
  },
  {
    uid: "test-021",
    component: "Services und Tickets",
    summary: "Ticket-Aktionsfreigabe wird sichtbar entschieden",
    precondition: "Ein Manager ist angemeldet und es gibt mindestens eine Ticket-Aktion mit Freigabepflicht.",
    steps: [
      ["Ticketseite öffnen.", "Die Freigabespur zeigt offene Aktionsanfragen mit Herkunft, Risiko und zuständigen Rollen."],
      ["Eine neue Ticket-Aktion über das Aktionsmenü oder die KI-Vorlage anlegen.", "Die Aktion wird als Anfrage gespeichert und nicht direkt ausgeführt."],
      ["Als Manager die Aktion genehmigen.", "Der Status wechselt auf genehmigt und die Entscheidung ist in der Oberfläche sichtbar."],
      ["Dieselbe Aktion ablehnen oder mit einer nicht berechtigten Rolle öffnen.", "Ablehnung oder fehlende Berechtigung wird klar angezeigt und protokolliert."],
    ],
  },
  {
    uid: "test-013",
    component: "Mobile PWA",
    summary: "Mitarbeiter schließt Aufgabe mobil mit Mediennachweis ab",
    precondition: "Ein Mitarbeiter hat eine zugewiesene offene Aufgabe mit Pflichtfoto.",
    steps: [
      ["Mobile PWA als Mitarbeiter öffnen.", "Die Aufgabe ist in der Liste sichtbar."],
      ["Aufgabendetail öffnen.", "SLA, Ort und Hinweise sind sichtbar."],
      ["Foto hochladen und Abschlussnotiz erfassen.", "Die Pflichtnachweise sind erfüllt."],
      ["Aufgabe abschließen.", "Status ist erledigt und Management sieht den Bericht."],
    ],
  },
  {
    uid: "test-014",
    component: "Plattform und Sicherheit",
    summary: "Mandantendaten sind per RLS voneinander isoliert",
    precondition: "Zwei Unternehmen mit getrennten Sites, Wohnungen und Nutzern existieren.",
    steps: [
      ["Als Manager von Unternehmen A anmelden.", "Nur Daten von Unternehmen A sind sichtbar."],
      ["Direkten API-Zugriff auf Datensatz von Unternehmen B versuchen.", "Der Zugriff wird verweigert."],
      ["Such- und Reporting-Endpunkte prüfen.", "Keine Daten von Unternehmen B erscheinen."],
      ["Audit prüfen.", "Verweigerte Zugriffe können sicher analysiert werden."],
    ],
  },
  {
    uid: "test-015",
    component: "QA und Launch",
    summary: "Dashboard bleibt auf Desktop und Mobile ohne Laufzeitfehler nutzbar",
    precondition: "Produktionsbuild ist gestartet und Seed-/Testdaten sind vorhanden.",
    steps: [
      ["Dashboard im Desktop-Viewport öffnen.", "KPI, Diagramme und Navigation sind sichtbar."],
      ["Dashboard im mobilen Viewport öffnen.", "Karten und Tabellen bleiben bedienbar."],
      ["Konsole und Netzwerk prüfen.", "Keine Page Errors, keine 500er Antworten und kein Body-Overflow."],
      ["Browser-Audit ausführen.", "Alle Hauptseiten bestehen die Prüfung."],
    ],
  },
  {
    uid: "test-016",
    component: "Integrationen",
    summary: "Payment-Adapter verarbeitet Sandbox-Zahlung und doppelten Webhook sicher",
    precondition: "Ein Payment-Provider ist im Testmodus verbunden und ein Bewohner hat eine offene Forderung.",
    steps: [
      ["Payment Intent im Bewohnerportal erstellen.", "Der Provider-Status steht auf Testmodus und die Zahlung hat eine eindeutige Referenz."],
      ["Erfolgs-Webhook mit gültiger Signatur verarbeiten.", "Die Zahlung wird genau einmal im Ledger gebucht."],
      ["Denselben Webhook erneut senden.", "Das System erkennt den doppelten Provider-Event und erstellt keine zweite Buchung."],
      ["Integrations- und Auditprotokoll prüfen.", "Provider-Referenz, Signaturprüfung, Idempotenzstatus und Buchungsreferenz sind sichtbar."],
    ],
  },
  {
    uid: "test-017",
    component: "Kommunikation und Dokumente",
    summary: "SMS, E-Mail und Push speichern Zustellung, Fehler und Retry",
    precondition: "SMS-, E-Mail- und Push-Adapter sind im Testmodus mit einer Zielgruppe konfiguriert.",
    steps: [
      ["Eine Service- oder Zahlungsbenachrichtigung senden.", "Für jeden Kanal wird ein Zustellversuch mit Template-Version erzeugt."],
      ["Providerfehler für einen Kanal simulieren.", "Der fehlerhafte Kanal wird als fehlgeschlagen mit Fehlergrund gespeichert."],
      ["Manuellen Retry starten.", "Nur der fehlgeschlagene Kanal wird erneut versucht."],
      ["Opt-out und Audit prüfen.", "Nicht erlaubte Kanäle werden nicht versendet und der Operator sieht den Grund."],
    ],
  },
  {
    uid: "test-018",
    component: "Buchung und Zugang",
    summary: "Access-Integration-Ausfall erzeugt Queue statt stiller Freigabe oder Sperre",
    precondition: "Eine Zugangsaktion ist fällig und der konfigurierte Access-Provider ist nicht erreichbar.",
    steps: [
      ["Einzugs- oder Sperraktion auslösen.", "Die Aktion wird als Integrationsjob angelegt."],
      ["Provider-Ausfall simulieren.", "Der Job wechselt in Fehler oder Warteschlange und wird nicht als erfolgreich markiert."],
      ["Manuellen Fallback erfassen.", "Ein berechtigter Operator kann den manuellen Status mit Begründung dokumentieren."],
      ["Audit und Bewohneransicht prüfen.", "Audit zeigt Provider-Ausfall und manuelle Aktion; Bewohner sieht keinen falschen Erfolgsstatus."],
    ],
  },
  {
    uid: "test-019",
    component: "Finanzen",
    summary: "Wallet-Top-up bleibt bis zur Rechts- und Providerfreigabe deaktiviert",
    precondition: "Das Wallet-Modell existiert, aber kein genehmigter E-Geld- oder Payment-Top-up-Provider ist produktiv freigegeben.",
    steps: [
      ["Bewohnerportal öffnen und Wallet/Top-up prüfen.", "Top-up ist nicht als produktive Aktion verfügbar."],
      ["Admin-Integrationskonsole öffnen.", "Wallet zeigt Entscheidung ausstehend, Rechtsfreigabe ausstehend oder Provider nicht produktiv."],
      ["Top-up-API direkt aufrufen.", "Backend verweigert die Aktion mit klarer Policy-Meldung."],
      ["Audit prüfen.", "Der blockierte Versuch wird ohne Finanzbuchung protokolliert."],
    ],
  },
  {
    uid: "test-020",
    component: "Integrationen",
    summary: "Integrationskonsole zeigt Health, Latenz, Queue und manuelle Wiederholung",
    precondition: "Mindestens ein Payment-, Messaging- und Access-Adapter hat erfolgreiche und fehlgeschlagene Testereignisse.",
    steps: [
      ["Integrationskonsole öffnen.", "Alle konfigurierten Provider zeigen Status, Testmodus/Produktivmodus und letzte Ereignisse."],
      ["Fehlgeschlagenen Job öffnen.", "Fehlergrund, Retry-Anzahl, Provider-Referenz und empfohlene Aktion sind sichtbar."],
      ["Manuelle Wiederholung auslösen.", "Der Job wird erneut verarbeitet oder begründet in Dead Letter verschoben."],
      ["Monitoring prüfen.", "Health, Latenz, Queue-Länge und letzter Erfolg sind aktuell."],
    ],
  },
  {
    uid: "test-022",
    component: "Nutzer und Rollen",
    summary: "Lead- und Vertriebsarbeitsbereich zeigt Pipeline, Suche und sichere Kontaktdaten",
    precondition: "Ein Sales- oder Manager-Profil ist angemeldet. Es existieren Leads mit Status, Sprache, Kontaktkanal, Budget und Objektinteresse.",
    steps: [
      ["Lead-Arbeitsbereich oeffnen.", "Pipeline, Statusgruppen, naechste Aktion und verantwortliche Person sind sichtbar."],
      ["Nach Name, Telefon, E-Mail, Sprache oder Objektinteresse suchen.", "Die Ergebnisliste wird korrekt gefiltert und zeigt Treffer ohne unberechtigte Daten."],
      ["Einen Lead oeffnen und Kontaktkanal pruefen.", "Kontaktinformationen, Einwilligungsstatus, Quelle und Historie sind nachvollziehbar."],
      ["Dieselbe Seite mit einer nicht berechtigten Rolle oeffnen.", "Sensible Lead- und Kontaktdaten sind verborgen oder der Zugriff wird blockiert."],
    ],
  },
  {
    uid: "test-023",
    component: "UX und Design",
    summary: "Oeffentliche Produkt-, Review-, Datenschutz- und Rechtsseiten bleiben auffindbar",
    precondition: "Die Web-App ist im Browser gestartet und die oeffentlichen Seiten sind ohne Login erreichbar.",
    steps: [
      ["Landingpage, Plattform-/Produktseite und relevante Trust- oder Review-Bereiche oeffnen.", "Die Seiten laden ohne 404, leere Hauptbereiche oder blockierende Konsolenfehler."],
      ["Datenschutz, Impressum oder Terms ueber Navigation oder Footer oeffnen.", "Rechtsseiten sind erreichbar und klar vom geschuetzten Dashboard getrennt."],
      ["Sprache wechseln und dieselben Seiten erneut pruefen.", "Locale-Routing bleibt stabil und erzeugt keine doppelten Sprachsegmente."],
      ["Desktop- und Mobile-Viewport vergleichen.", "Navigation, CTA, Texte und rechtliche Links bleiben bedienbar und lesbar."],
    ],
  },
  {
    uid: "test-024",
    component: "Plattform und Sicherheit",
    summary: "OAuth-Provider bleiben provider-ready und vom Demo-Login getrennt",
    precondition: "Login- und Signup-Seite sind erreichbar. Produktive OAuth-Schluessel sind in der Testumgebung nicht zwingend gesetzt.",
    steps: [
      ["Login- oder Signup-Seite oeffnen.", "Lokale Access-Profile sind klar als Demo-/QA-Hilfe erkennbar."],
      ["Google- und Yandex-Provideroptionen pruefen.", "Provider-ready Optionen sind sichtbar oder dokumentiert, aber ohne Keys nicht als produktiver Erfolg simuliert."],
      ["OAuth ohne gueltige Konfiguration starten.", "Das System zeigt eine klare Fehlermeldung oder deaktivierten Zustand statt stiller Anmeldung."],
      ["Produktionsannahme pruefen.", "Demo-Login bleibt von echter Supabase Auth getrennt und kann fuer Produktion deaktiviert werden."],
    ],
  },
  {
    uid: "test-025",
    component: "QA und Launch",
    summary: "QA-Begriffe trennen funktionale Tests, Kundenabnahme und Launch klar",
    precondition: "Jira/Xray enthaelt Test Plan, Functional System Test Set, Exploratory Test Set, Automated Regression Test Set und das Dokumentationspaket.",
    steps: [
      ["Test Plan und Test Sets oeffnen.", "Funktionale Systemtests, explorative Tests und automatisierte Regression sind getrennt klassifiziert."],
      ["Testfaelle und Testausfuehrungen pruefen.", "Jeder Test hat Zweck, Vorbedingung, Schritte, erwartete Ergebnisse, Datum, Ausfuehrungsfenster und Nachweisbezug."],
      ["Dokumentationspaket und Launch-Plan pruefen.", "Der QA-Plan spricht von Kundenabnahme als separatem Gate und nicht als falscher Test-Set-Klassifizierung."],
      ["Status- und Kommentarhistorie pruefen.", "Offene Produktionsfreigaben, Nachweise und manuelle Explorationsrunde sind transparent nachvollziehbar."],
    ],
  },
]

const exploratoryTests = [
  {
    uid: "explore-001",
    exploratory: true,
    component: "QA und Launch",
    summary: "Explorative Manager-Session für Gesamtüberblick, Suche und kritische Aktionen",
    precondition:
      "Ein Responsible Manager ist angemeldet. Testdaten für Wohnungen, Personen, Finanzen, Tickets, Buchungen, Dokumente, Integrationen und KI sind vorhanden.",
    steps: [
      ["Dashboard öffnen und KPIs, Navigation und Warnhinweise prüfen.", "Der Manager sieht eine verständliche operative Lage ohne leere Hauptbereiche oder technische Fehler."],
      ["Globale Suche mit Wohnung, Person, Dokument, Ticket und Schuldbegriff ausführen.", "Die Suche liefert nachvollziehbare Ergebnisse und zeigt keine unberechtigten Daten."],
      ["Von einem Suchergebnis in Detail- oder Modulansicht wechseln.", "Der Kontext bleibt erhalten und die Zielseite zeigt passende Daten und Aktionen."],
      ["Eine kritische Aktion wie Änderungsanfrage, Datenvalidierung oder Benachrichtigungsprüfung starten.", "Die Aktion zeigt Bestätigung, Audit-Kontext und keine stille Datenänderung ohne Berechtigung."],
      ["Sprache wechseln und dieselbe Arbeitslogik erneut prüfen.", "Navigation, Haupttexte und Status bleiben verständlich und funktional konsistent."],
    ],
  },
  {
    uid: "explore-002",
    exploratory: true,
    component: "Finanzen",
    summary: "Explorative Buchhaltungs-Session für Ledger, Schulden, Zahlungen und Sperrregeln",
    precondition:
      "Ein Accountant ist angemeldet. Es existieren offene Forderungen, Zahlungen, Kautionen, manuelle Abgleiche und gesperrte Einheiten.",
    steps: [
      ["Finanzbereich öffnen und nach Schuld, Wohnung und Eigentümer filtern.", "Die Ergebnisliste reagiert korrekt und zeigt verständliche Salden, Status und Belege."],
      ["Ledger, Zahlungskontrollen und Kautionen für eine Einheit vergleichen.", "Salden, offene Forderungen und Kautionsstatus widersprechen sich nicht."],
      ["Eine simulierte Zahlung oder Abgleichaktion prüfen.", "Das System zeigt Freigabe, Referenz, Idempotenzhinweis und Audit-Kontext."],
      ["Als nicht berechtigte Rolle dieselbe Finanzroute direkt aufrufen.", "Der Zugriff wird blockiert oder auf eine erlaubte Ansicht zurückgeführt."],
      ["Sperrregel für Services, Buchung oder Zugang fachlich prüfen.", "Die Einschränkung ist sichtbar, begründet und ohne falsche Erfolgsanzeige."],
    ],
  },
  {
    uid: "explore-003",
    exploratory: true,
    component: "Nutzer und Rollen",
    summary: "Explorative Rollen-Session für Owner, Tenant, Staff, Accountant und Manager",
    precondition:
      "Lokale Access-Profile oder Testnutzer für Owner, Tenant, Staff, Accountant und Manager sind verfügbar.",
    steps: [
      ["Nacheinander mit jeder Rolle anmelden.", "Jede Rolle landet auf einer passenden Startseite mit erlaubten Modulen."],
      ["Sidebar, direkte URL-Aufrufe und globale Suche pro Rolle prüfen.", "Nicht erlaubte Module und sensible Daten bleiben verborgen."],
      ["Dokumente, Finanzen, Tickets und Kommunikation pro Rolle stichprobenartig öffnen.", "Die sichtbaren Daten passen zur Rolle und Beziehung zur Einheit."],
      ["Eine Aktion ausführen, die nur Manager oder Accountant darf.", "Unberechtigte Rollen erhalten eine klare Sperre ohne Datenänderung."],
      ["Audit- und Statushinweise prüfen.", "Das System erklärt, warum etwas erlaubt, blockiert oder nur im Demo-Modus verfügbar ist."],
    ],
  },
  {
    uid: "explore-004",
    exploratory: true,
    component: "Buchung und Zugang",
    summary: "Explorative Operations-Session für Buchung, Einzug, Checkout und Zugang",
    precondition:
      "Ein Operations Manager ist angemeldet. Es gibt freie, reservierte, belegte und gesperrte Einheiten sowie offene Check-in- und Checkout-Ereignisse.",
    steps: [
      ["Reservierungskalender öffnen und Verfügbarkeit für mehrere Einheiten prüfen.", "Kollisionen, Reservierungen und belegte Zeiträume werden eindeutig angezeigt."],
      ["Einzugsflow mit Zahlung, Kaution, Aufgaben und Zugang kontrollieren.", "Alle Voraussetzungen sind sichtbar und fehlende Schritte blockieren den Abschluss."],
      ["Checkout mit Inspektion, Schaden, Restkaution und Zugangssperre prüfen.", "Abzüge, Restbetrag, Zugang und Aufgabenstatus sind fachlich konsistent."],
      ["Provider-Ausfall oder Demo-Modus für Zugang betrachten.", "Das System nutzt Queue oder manuellen Fallback und zeigt keinen falschen Live-Erfolg."],
      ["Bewohnerkommunikation nach Check-in oder Checkout prüfen.", "Texte sind professionell, nicht aufdringlich und an Status sowie Sprache angepasst."],
    ],
  },
  {
    uid: "explore-005",
    exploratory: true,
    component: "Services und Tickets",
    summary: "Explorative Service- und Ticket-Session für Bewohner und Personal",
    precondition:
      "Ein Bewohner und ein Staff-Nutzer sind verfügbar. Es existieren Servicekatalog, offene Tickets, SLA-Risiken und Aufgaben mit Mediennachweis.",
    steps: [
      ["Als Bewohner einen kostenpflichtigen und einen kostenlosen Service prüfen.", "Preis, SLA, Verfügbarkeit und mögliche Schuldensperre sind verständlich."],
      ["Servicebestellung bis zur Ticketanlage verfolgen.", "Akzeptierte Bestellungen erzeugen Ticket und Aufgabe mit passender Priorität."],
      ["Als Staff-Nutzer Aufgabe mobil öffnen.", "Ort, SLA, Beschreibung, Medienpflicht und Status sind auf kleinem Bildschirm nutzbar."],
      ["Foto- oder Notiznachweis simulieren und Aufgabe abschließen.", "Der Abschluss ist nachvollziehbar und Management sieht Bericht und Zeitstempel."],
      ["SLA-Risiko und Eskalation prüfen.", "Überfällige oder riskante Vorgänge sind sichtbar und priorisiert."],
    ],
  },
  {
    uid: "explore-006",
    exploratory: true,
    component: "Kommunikation und Dokumente",
    summary: "Explorative Kommunikations- und Dokumenten-Session mit Mehrsprachigkeit",
    precondition:
      "Nachrichtenvorlagen, Zustellstatus, Dokumente, Dokumentenpakete und Rollenbeziehungen sind in Testdaten vorhanden.",
    steps: [
      ["Kommunikationszentrum öffnen und nach Empfänger, Kanal und Status suchen.", "Threads, Templates und Zustellversuche sind filterbar und verständlich."],
      ["Template in Türkisch, Deutsch, Englisch und Russisch prüfen.", "Variablen, Tonalität und fachliche Aussage bleiben korrekt."],
      ["Providerfehler und Wiederholversuch für E-Mail oder SMS prüfen.", "Fehlergrund, Retry-Status und Opt-out werden sauber angezeigt."],
      ["Dokument als berechtigte und nicht berechtigte Rolle öffnen.", "Rollen- und Wohnungsbeziehungen steuern den Zugriff korrekt."],
      ["Dokumenten-Upload oder Paketstatus prüfen.", "Demo- oder Storage-Modus ist klar erkennbar und sensible Dateien werden nicht öffentlich behandelt."],
    ],
  },
  {
    uid: "explore-007",
    exploratory: true,
    component: "Integrationen",
    summary: "Explorative Integrations-Session für Provider, Queue, Kosten und Fallback",
    precondition:
      "Integrationskonsole enthält Payment-, Messaging-, Access-, Monitoring- und Storage-Provider im Demo- oder Placeholder-Modus.",
    steps: [
      ["Integrationskonsole öffnen und Providerstatus vergleichen.", "Jeder Provider zeigt Modus, Health, letzte Aktivität, Kosten- oder Entscheidungsstatus."],
      ["Fehlgeschlagenen Job öffnen.", "Fehlergrund, Retry-Anzahl, Provider-Referenz und nächste Aktion sind sichtbar."],
      ["Manuelle Wiederholung oder Fallback prüfen.", "Nur berechtigte Rollen können eine Wiederholung starten und die Aktion wird protokolliert."],
      ["Produktiv- und Demo-Modus fachlich vergleichen.", "Nicht bestätigte Verträge, API-Keys oder Hardware bleiben klar als offen markiert."],
      ["Provider-Links und API-Spec-Hinweise prüfen.", "Das Team findet die benötigten Links für technische Prüfung und spätere Produktion."],
    ],
  },
  {
    uid: "explore-008",
    exploratory: true,
    component: "KI und Analytics",
    summary: "Explorative KI-Session für gleiche Sprache, Quellen, Grenzen und Mehrwert",
    precondition:
      "KI-Chat und AI-Premium-Daten sind aktiv. Es existieren offene Schulden, SLA-Risiken, Buchungen und Integrationshinweise.",
    steps: [
      ["KI auf Türkisch, Deutsch, Englisch und Russisch ansprechen.", "Die Antwort nutzt dieselbe Sprache wie die Anfrage."],
      ["Nach Tagesprioritäten und Begründung fragen.", "Die KI nennt verständliche Empfehlungen mit Quellen- oder Datenhinweis."],
      ["Direkte Zahlung, Erstattung, Zugangssperre oder Rollenänderung verlangen.", "Die KI verweigert autonome kritische Ausführung und schlägt einen Freigabeprozess vor."],
      ["Unklare oder fehlende Daten abfragen.", "Die KI kennzeichnet Unsicherheit statt falsche Sicherheit zu erzeugen."],
      ["KI-Antwort im operativen Kontext bewerten.", "Die Antwort ist kurz, hilfreich und nicht überladen."],
    ],
  },
  {
    uid: "explore-009",
    exploratory: true,
    component: "Mobile PWA",
    summary: "Explorative Mobile- und Offline-Session für reale Nutzung vor Ort",
    precondition:
      "Die Anwendung läuft im mobilen Viewport. Rollen für Staff, Manager, Tenant und Accountant sind verfügbar.",
    steps: [
      ["Mobile Navigation, Tabellen und Hauptaktionen in mehreren Rollen öffnen.", "Texte überlappen nicht und Hauptaktionen bleiben erreichbar."],
      ["Offline-Sync-Ansicht als erlaubte Rolle prüfen.", "Queue, letzter Sync, Konflikte und erlaubte Aktionen sind verständlich."],
      ["Offline-Sync als nicht erlaubte Rolle direkt aufrufen.", "Der Zugriff wird sauber blockiert oder zur erlaubten Ansicht geführt."],
      ["Such- und Filterdialog im mobilen Viewport nutzen.", "Filter werden erst nach Bestätigung angewendet und Ergebnisstatus ist sichtbar."],
      ["Browser zurück, Refresh und Sprachwechsel testen.", "Die Anwendung bleibt stabil und verliert keine kritische Navigation."],
    ],
  },
  {
    uid: "explore-010",
    exploratory: true,
    component: "QA und Launch",
    summary: "Explorative Barrierefreiheit-, Fehler- und Launch-Readiness-Session",
    precondition:
      "Die Anwendung läuft mit aktuellen Testdaten. Browser-Konsole, Netzwerkansicht und Tastaturbedienung können geprüft werden.",
    steps: [
      ["Wichtige Seiten nur mit Tastatur bedienen.", "Fokus, Dialoge, Menüs und Buttons sind erreichbar und verständlich."],
      ["Hauptseiten mit langsamer Verbindung oder Reload prüfen.", "Loading-, Fehler- und leere Zustände bleiben professionell."],
      ["Mehrere Module mit Suche, Filter, Tabellen und Aktionen durchklicken.", "Es treten keine blockierenden Konsolenfehler oder 500er-Antworten auf."],
      ["Datenschutz- und sensible Finanzbereiche stichprobenartig prüfen.", "Sensible Daten sind nur in erlaubtem Kontext sichtbar."],
      ["Offene Produktionsabhängigkeiten prüfen.", "Clientdaten, Provider, API-Keys, Storage, Legal und Security-Gates sind klar als offen oder erledigt markiert."],
    ],
  },
]

const manualTests = [...tests, ...exploratoryTests]

function slugLabel(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .slice(0, 60)
}

function testPhaseNumbers(test) {
  const phase = phaseForTest(test)
  return phase ? [phase.phase] : [15]
}

function phaseLabelsForNumbers(phaseNumbers) {
  return phaseNumbers.map((phase) => phaseLabel(phase))
}

function componentLabel(component) {
  return `component-${slugLabel(component)}`
}

function manualTestLabels(test) {
  return [
    "xray",
    "testcase",
    "manual",
    test.exploratory ? "exploratory" : "functional",
    test.exploratory ? "charter" : "system-test",
    "critical-flow",
    "option3",
    componentLabel(test.component),
    ...phaseLabelsForNumbers(testPhaseNumbers(test)),
  ]
}

const automatedTests = [
  {
    uid: "auto-001",
    component: "QA und Launch",
    phaseNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    summary: "Full-App-QA prueft Schema, APIs, Browser-Flows und phasenuebergreifende Regression",
    command: "pnpm qa:full-app -- --base-url http://127.0.0.1:3104",
    classification: "Automatisierte Regression",
    evidenceKey: "full-app-qa",
    features: [
      "Supabase-Schema und Storage-Bereitschaft",
      "RBAC-geschuetzte API-Vertraege",
      "Dashboard-Browser-Smoke-Flows",
      "Implementierungsbasis Phase 01-14",
    ],
  },
  {
    uid: "auto-002",
    component: "QA und Launch",
    phaseNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    summary: "Phasenkontinuitaet prueft Status, Routenabdeckung und KI-Rollenverhalten",
    command: "pnpm phase:continuity -- --base-url http://127.0.0.1:3104",
    classification: "Automatisierte Phasensteuerung",
    evidenceKey: "phase-continuity",
    features: ["Statusintegritaet fuer 15 Phasen", "Routenabdeckung", "Rollenspezifische KI-Hinweise"],
  },
  {
    uid: "auto-003",
    component: "Nutzer und Rollen",
    phaseNumbers: [5, 6],
    summary: "Phase-05-06-Harness prueft Nutzer, Rollen, Beziehungen und Finanzoberflaechen",
    command: "pnpm phase:05-06 -- --base-url http://127.0.0.1:3104 --max-attempts 2",
    classification: "Automatisierter Phasen-Harness",
    evidenceKey: "phase-05-06",
    features: ["Personen- und Wohnungsbeziehungen", "RBAC-Grenzen", "Ledger- und Finanz-UI-Smoke"],
  },
  {
    uid: "auto-004",
    component: "Finanzen",
    phaseNumbers: [6, 7, 8, 9],
    summary: "Phase-06-09-Harness prueft Ledger, Zahlungskontrollen, Services, Tickets und SLA-Flows",
    command: "pnpm phase:06-09 -- --base-url http://127.0.0.1:3104 --max-attempts 2",
    classification: "Automatisierter Phasen-Harness",
    evidenceKey: "phase-06-09",
    features: ["Ledger- und Zahlungskontrollen", "Schuldenrestriktionen", "Serviceauftraege", "Aufgaben- und SLA-Regression"],
  },
  {
    uid: "auto-005",
    component: "Buchung und Zugang",
    phaseNumbers: [10, 11],
    summary: "Phase-10-11-Harness prueft Buchung, Einzug, Checkout, Kommunikation und Dokumente",
    command: "pnpm phase:10-11 -- --base-url http://127.0.0.1:3104 --max-attempts 2",
    classification: "Automatisierter Phasen-Harness",
    evidenceKey: "phase-10-11",
    features: ["Reservierungslebenszyklus", "Einzugs- und Checkout-Aktionen", "Benachrichtigungs-Retry", "Dokumentenpakete"],
  },
  {
    uid: "auto-006",
    component: "Mobile PWA",
    phaseNumbers: [12, 13, 14],
    summary: "Phase-12-14-Harness prueft Mobile Web, Offline Sync, Integrationen und KI Premium",
    command: "pnpm phase:12-14 -- --base-url http://127.0.0.1:3104 --max-attempts 2",
    classification: "Automatisierter Phasen-Harness",
    evidenceKey: "phase-12-14",
    features: ["Mobile- und PWA-Bereitschaft", "Offline-Sync-RBAC", "Integrationsplatzhalter", "Mehrsprachige KI-Antworten"],
  },
  {
    uid: "auto-007",
    component: "QA und Launch",
    phaseNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    summary: "Browser-Flow-Automation prueft Phase 01-11 als End-to-End-Meilenstein",
    command: "node scripts/manual-phase-01-11-flow.mjs --base-url http://127.0.0.1:3104",
    classification: "Automatisierter Browser-Smoke-Test",
    evidenceKey: "manual-phase-01-11-flow",
    features: ["Flow von Foundation bis Buchung", "API-Pruefungen", "Browser-Schrittnachweis"],
  },
  {
    uid: "auto-008",
    component: "Stammdaten",
    phaseNumbers: [4, 8, 9, 10, 11, 13, 14],
    summary: "Such- und Filter-Audit prueft operative Suche in Dashboard-Modulen",
    command: "node scripts/search-filter-audit.mjs --base-url http://127.0.0.1:3104",
    classification: "Automatisierte UX-Regression",
    evidenceKey: "search-filter-audit",
    features: ["Globale Suche", "Tabellensuche", "Korrekte Filterergebnisse", "Operative Suchnutzbarkeit"],
  },
  {
    uid: "auto-009",
    component: "UX und Design",
    phaseNumbers: [2, 4],
    summary: "Filter-UX-Smoke prueft explizites Anwenden von Filteraenderungen",
    command: "node scripts/filter-ux-smoke.mjs --base-url http://127.0.0.1:3104",
    classification: "Automatisierter UX-Smoke-Test",
    evidenceKey: "filter-ux-smoke",
    features: ["Filterdialog-Verhalten", "Feedback nach Anwendung", "Zuruecksetzen von Filtern"],
  },
  {
    uid: "auto-010",
    component: "Mobile PWA",
    phaseNumbers: [12],
    summary: "Offline-Sync-Rollen-Audit prueft erlaubte und gesperrte Rollen",
    command: "node scripts/offline-sync-role-audit.mjs --base-url http://127.0.0.1:3104",
    classification: "Automatisierter RBAC-Smoke-Test",
    evidenceKey: "offline-sync-role-audit",
    features: ["Offline-Queue-Zugriff fuer Admin, Manager und Personal", "Sperre fuer Buchhaltung, Eigentuemer und Mieter", "Sichtbarkeit im Browsermenue"],
  },
  {
    uid: "auto-011",
    component: "UX und Design",
    phaseNumbers: [2, 12, 15],
    summary: "Responsive-Audit prueft Desktop, Tablet und Mobile auf Overflow und sichtbare Fehler",
    command: "node scripts/manual-responsive-audit.mjs --base-url http://127.0.0.1:3104",
    classification: "Automatisierter Responsive-Smoke-Test",
    evidenceKey: "manual-responsive-audit",
    features: ["Desktop-, Tablet- und Mobile-Layout", "Sichtbare Navigation", "Kein kritischer Overflow"],
  },
  {
    uid: "auto-012",
    component: "QA und Launch",
    phaseNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    summary: "Playwright-E2E-Suite prueft Landing, Login, Sprache, Plattform, Dashboard und Responsive-Flows",
    command: "pnpm --filter cati-web test:e2e",
    classification: "Automatisierter Playwright-E2E-Test",
    evidenceKey: "playwright-e2e",
    features: ["Landing- und Produktseiten", "Login und lokale Access-Profile", "Locale-Routing", "Dashboard-E2E", "Responsive-Pruefungen"],
  },
  {
    uid: "auto-013",
    component: "Plattform und Sicherheit",
    phaseNumbers: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    summary: "OpenAPI-Vertrag prueft dokumentierte API-Pfade gegen echte Next.js-Routen",
    command: "pnpm api:spec:validate",
    classification: "Automatisierter API-Contract-Test",
    evidenceKey: "openapi-contract",
    features: [
      "OpenAPI-3.2.0-Spezifikation",
      "Abgleich dokumentierter API-Pfade mit App-Routen",
      "API-Testbarkeit fuer interne QA und spaeteres Provider-Onboarding",
      "Jira/Xray-Nachweis ueber lokalen JSON-Report",
    ],
  },
]

function automatedRunCommandsForEvidenceKeys(evidenceKeys) {
  const evidenceSet = new Set(evidenceKeys)
  const commands = automatedTests
    .filter((test) => evidenceSet.has(test.evidenceKey))
    .map((test) => `${test.summary}: ${test.command}`)
  return commands.length > 0
    ? commands
    : ["Keine direkte Automatisierung ist fuer diese Ausfuehrung verlinkt. Explorative Schritte manuell pruefen und Ergebnis als Kommentar/Nachweis dokumentieren."]
}

function allAutomatedRunCommands() {
  return automatedTests.map((test) => `${test.summary}: ${test.command}`)
}

const qaReportSpecs = [
  {
    key: "full-app-qa",
    name: "Full App QA Harness",
    fileName: "full-app-qa-report.json",
    pathIncludes: ["full-app-qa-"],
  },
  {
    key: "phase-continuity",
    name: "Phase Continuity Harness",
    fileName: "phase-continuity-report.json",
    pathIncludes: ["phase-continuity-"],
  },
  {
    key: "phase-05-06",
    name: "Phase 05-06 Harness",
    fileName: "phase-05-06-report.json",
    pathIncludes: ["phase-05-06-harness-"],
  },
  {
    key: "phase-06-09",
    name: "Phase 06-09 Harness",
    fileName: "phase-06-09-report.json",
    pathIncludes: ["phase-06-09-harness-"],
  },
  {
    key: "phase-10-11",
    name: "Phase 10-11 Harness",
    fileName: "phase-10-11-report.json",
    pathIncludes: ["phase-10-11-"],
  },
  {
    key: "phase-12-14",
    name: "Phase 12-14 Harness",
    fileName: "phase-12-14-report.json",
    pathIncludes: ["phase-12-14-"],
  },
  {
    key: "manual-phase-01-11-flow",
    name: "Phase 01-11 Browser Flow",
    fileName: "manual-phase-01-11-flow-report.json",
    pathIncludes: ["manual-phase-01-11-flow-"],
  },
  {
    key: "search-filter-audit",
    name: "Search and Filter Audit",
    fileName: "search-filter-audit-report.json",
    pathIncludes: ["search-filter-audit"],
  },
  {
    key: "filter-ux-smoke",
    name: "Filter UX Smoke",
    fileName: "filter-ux-smoke-report.json",
    pathIncludes: ["filter-ux-smoke"],
  },
  {
    key: "offline-sync-role-audit",
    name: "Offline Sync Role Audit",
    fileName: "offline-sync-role-audit-report.json",
    pathIncludes: ["offline-sync-role-audit"],
  },
  {
    key: "manual-responsive-audit",
    name: "Responsive Audit",
    fileName: "manual-responsive-audit.json",
    pathIncludes: ["manual-responsive-audit-full", "manual-responsive-audit-dashboard", "manual-responsive-audit-current"],
  },
  {
    key: "playwright-e2e",
    name: "Playwright E2E JUnit",
    fileName: "results.xml",
    pathIncludes: ["playwright-junit"],
    xml: true,
  },
  {
    key: "openapi-contract",
    name: "OpenAPI Contract Validation",
    fileName: "openapi-contract-report.json",
    pathIncludes: ["openapi-contract"],
  },
]

const testExecutionGroups = [
  {
    uid: "execution-phase-01-04",
    summary: "Test Execution - Phase 01-04 Foundation, UX, Platform and Unit Matrix",
    phaseNumbers: [1, 2, 3, 4],
    component: "QA und Launch",
    evidenceKeys: ["full-app-qa", "phase-continuity", "search-filter-audit", "manual-responsive-audit", "playwright-e2e"],
  },
  {
    uid: "execution-phase-05-07",
    summary: "Test Execution - Phase 05-07 Users, Ledger, Payments and Debt Rules",
    phaseNumbers: [5, 6, 7],
    component: "QA und Launch",
    evidenceKeys: ["phase-05-06", "phase-06-09", "full-app-qa", "phase-continuity"],
  },
  {
    uid: "execution-phase-08-09",
    summary: "Test Execution - Phase 08-09 Service Catalogue, Tickets, Workforce and SLA",
    phaseNumbers: [8, 9],
    component: "QA und Launch",
    evidenceKeys: ["phase-06-09", "search-filter-audit", "full-app-qa", "phase-continuity"],
  },
  {
    uid: "execution-phase-10-11",
    summary: "Test Execution - Phase 10-11 Booking, Checkout, Communication and Documents",
    phaseNumbers: [10, 11],
    component: "QA und Launch",
    evidenceKeys: ["phase-10-11", "manual-phase-01-11-flow", "search-filter-audit", "full-app-qa"],
  },
  {
    uid: "execution-phase-12-14",
    summary: "Test Execution - Phase 12-14 Mobile Web, Offline Sync, Integrations and AI",
    phaseNumbers: [12, 13, 14],
    component: "QA und Launch",
    evidenceKeys: ["phase-12-14", "offline-sync-role-audit", "full-app-qa", "manual-responsive-audit"],
  },
  {
    uid: "execution-phase-15",
    summary: "Test Execution - Phase 15 Final Regression, Security and Launch Readiness",
    phaseNumbers: [15],
    component: "QA und Launch",
    evidenceKeys: [
      "full-app-qa",
      "phase-continuity",
      "phase-12-14",
      "search-filter-audit",
      "offline-sync-role-audit",
      "manual-responsive-audit",
      "playwright-e2e",
      "openapi-contract",
    ],
  },
  {
    uid: "execution-major-functionality-roles",
    summary: "Test Execution - Hauptfunktionen und rollenbasierte Regression",
    phaseNumbers: phases.map((phase) => phase.phase),
    component: "QA und Launch",
    scope:
      "Major functionality and role-based regression across Manager, Accountant, Owner, Tenant, Staff and Operations.",
    testUids: tests.map((test) => test.uid),
    automatedUids: ["auto-001", "auto-002", "auto-008", "auto-010", "auto-011", "auto-013"],
    evidenceKeys: [
      "full-app-qa",
      "phase-continuity",
      "search-filter-audit",
      "offline-sync-role-audit",
      "manual-responsive-audit",
      "openapi-contract",
    ],
  },
  {
    uid: "execution-exploratory-role-sessions",
    summary: "Test Execution - Explorative Rollen- und Hauptfunktions-Sessions",
    phaseNumbers: phases.map((phase) => phase.phase),
    component: "QA und Launch",
    scope:
      "Session-based exploratory testing for role behavior, usability, edge cases, data visibility and launch readiness.",
    testUids: exploratoryTests.map((test) => test.uid),
    automatedUids: [],
    evidenceKeys: ["search-filter-audit", "manual-responsive-audit", "playwright-e2e", "openapi-contract"],
  },
]

function automatedTestLabels(test) {
  return [
    "xray",
    "testcase",
    "automated",
    "regression",
    "qa-evidence",
    "option3",
    componentLabel(test.component),
    ...phaseLabelsForNumbers(test.phaseNumbers),
  ]
}

function automatedTestDescription(test, artifact) {
  return doc([
    {
      title: "Automatisierte Testklassifikation",
      text: [
        `Klassifikation: ${test.classification}.`,
        `Befehl: ${test.command}.`,
        `Verlinkte Phasen: ${test.phaseNumbers.map((phase) => String(phase).padStart(2, "0")).join(", ")}.`,
      ],
    },
    {
      title: "Funktionsabdeckung",
      items: test.features,
    },
    {
      title: "Aktueller Nachweis",
      text: artifact
        ? [
            `Aktuelles lokales Ergebnis: ${artifact.status.toUpperCase()} aus ${artifact.relativePath}.`,
            `Erstellt oder geaendert: ${artifact.generatedAt ?? artifact.lastWriteTime}. Kurzfassung: ${artifact.summaryText}.`,
          ]
        : ["Es wurde noch kein lokales JSON/JUnit-Ergebnis gefunden. Bitte den Befehl ausfuehren und Jira danach erneut synchronisieren."],
    },
    {
      title: "Erwartetes Ergebnis",
      text: [
        "Die automatisierte Pruefung muss ohne kritische Konsolenfehler, Rechteverletzungen, defekte Routen, fehlerhafte API-Vertraege oder blockierende UI-Regressionen bestehen.",
      ],
    },
  ])
}

function testPlanDescription(functionalCount, exploratoryCount, automatedCount, evidenceArtifacts) {
  return doc([
    {
      title: "Zweck",
      text: [
        "Dieser Xray Test Plan ist der zentrale QA-Steuerungspunkt fuer die 1Cati Phase 01-15 Lieferung.",
        "Funktionale Systemtests, automatisierte Regressionstests, API-Tests, Rollenpruefungen und Launch-Readiness-Nachweise sind getrennt klassifiziert und in einem Plan verlinkt.",
      ],
    },
    {
      title: "Abdeckung",
      items: [
        `${functionalCount} funktionale Systemtests fuer kritische Arbeitsablaeufe.`,
        `${exploratoryCount} explorative rollen- und funktionsbezogene Testfaelle fuer flexible Ad-hoc-Pruefung.`,
        `${automatedCount} automatisierte Playwright-, API-, RBAC-, Phasen-Harness- und UX-Smoke-Tests.`,
        `${testExecutionGroups.length} Test Executions steuern Phasen, Hauptfunktionen, Rollen und explorative Sessions.`,
        "Phase 01-14 ist als Implementierungsbasis abgeschlossen. Phase 15 fuer finales QA und Launch Readiness ist in Bearbeitung.",
        "Echte Kundendaten, Provider-Vertraege, API-Schluessel, rechtliche/fachliche Freigaben und explorative Kundenabnahme bleiben separate Produktions-Gates.",
      ],
    },
    {
      title: "Datum und Transparenz",
      items: [
        `Letzter Jira/Xray-Sync: ${syncStartedAt}.`,
        "Phase 01-14 ist als Implementierungsbasis abgeschlossen; Phase 15 laeuft bis zum Zieltermin 2026-07-08.",
        "Jede Test Execution hat ein eigenes Due Date gemaess Phasenfenster und enthaelt die aktuell verlinkten QA-Nachweise.",
        "Automatisierte Ergebnisdateien zeigen im Ticket ihr eigenes generatedAt oder lastWriteTime.",
      ],
    },
    {
      title: "Automatisierte Tests erneut ausfuehren",
      items: allAutomatedRunCommands(),
    },
    {
      title: "Aktuelle automatisierte Nachweise",
      items:
        evidenceArtifacts.length > 0
          ? evidenceArtifacts.map((artifact) => `${artifact.name}: ${artifact.status.toUpperCase()} - ${artifact.summaryText}`)
          : ["No local automated evidence file was found yet."],
    },
  ])
}

function testSetDescription({ title, purpose, testCount, labels, evidenceArtifacts = [] }) {
  const automatedSet = labels.includes("automated")
  return doc([
    {
      title: "Zweck",
      text: [purpose],
    },
    {
      title: "Klassifikation",
      items: [`Geplante Testfaelle in diesem Set: ${testCount}.`, `Labels: ${labels.join(", ")}.`],
    },
    {
      title: "Nachweisregel",
      items: [
        "Funktionale Tests brauchen klare Vorbedingung, Testschritte und erwartetes Ergebnis.",
        "Automatisierte Tests brauchen ein aktuelles Pass/Fail-Ergebnis ueber eine Test Execution und JSON/JUnit-Nachweis, wenn vorhanden.",
        "Fehlgeschlagene Tests brauchen einen verlinkten Defect, einen Blocker-Kommentar oder eine bewusste Launch-Risiko-Entscheidung.",
      ],
    },
    {
      title: "Datum und Nachweisstand",
      items: [
        `Letzter Jira/Xray-Sync: ${syncStartedAt}.`,
        "Der Zieltermin fuer das finale QA-/Launch-Readiness-Paket ist 2026-07-08.",
        "Die neuesten automatisierten Nachweise werden unten mit Status, Kurzfassung und Ergebnisdatum referenziert.",
      ],
    },
    ...(automatedSet
      ? [
          {
            title: "Automatisierte Tests erneut ausfuehren",
            items: allAutomatedRunCommands(),
          },
        ]
      : []),
    ...(evidenceArtifacts.length > 0
      ? [
          {
            title: "Aktuelle Nachweise",
            items: evidenceArtifacts.map((artifact) => `${artifact.name}: ${artifact.status.toUpperCase()} - ${artifact.summaryText}`),
          },
        ]
      : []),
  ])
}

function executionDescription(group, evidenceArtifacts, linkedTestCount) {
  const phasesInGroup = group.phaseNumbers.map((phase) => phases.find((item) => item.phase === phase)).filter(Boolean)
  const passed = evidenceArtifacts.length > 0 && evidenceArtifacts.every((artifact) => artifact.status === "passed")
  const phaseMetasInGroup = phasesInGroup.map((phase) => phaseMeta(phase))
  const groupStartDate = phaseMetasInGroup.reduce(
    (earliest, meta) => (!earliest || meta.startDate < earliest ? meta.startDate : earliest),
    ""
  )
  const groupEndDate = phaseMetasInGroup.reduce((latest, meta) => (!latest || meta.endDate > latest ? meta.endDate : latest), "")
  const runCommands = automatedRunCommandsForEvidenceKeys(group.evidenceKeys)
  return doc([
    {
      title: "Ausfuehrungsumfang",
      text: [
        `Diese Test Execution speichert den aktuellen QA-Nachweis fuer die Phasen ${group.phaseNumbers.map((phase) => String(phase).padStart(2, "0")).join(", ")}.`,
        ...(group.scope ? [`Scope: ${group.scope}`] : []),
        `Verlinkte Testfaelle: ${linkedTestCount}. Aktueller Nachweisstatus: ${passed ? "bestanden" : "Pruefung noetig oder Nachweis fehlt"}.`,
      ],
    },
    {
      title: "Datum und Ausfuehrungstransparenz",
      items: [
        `Letzter Jira/Xray-Sync: ${syncStartedAt}.`,
        `Geplantes Ausfuehrungsfenster: ${groupStartDate} bis ${groupEndDate}.`,
        `Due Date im Jira-Ticket: ${groupEndDate}.`,
        "Die unten verlinkten QA-Nachweise enthalten generatedAt oder lastWriteTime fuer das konkrete lokale Testergebnis.",
      ],
    },
    {
      title: "Funktionsumfang",
      items: phasesInGroup.map((phase) => `Phase ${String(phase.phase).padStart(2, "0")}: ${phase.title} - ${phase.outcome}`),
    },
    {
      title: "Automatisierte Tests erneut ausfuehren",
      items: runCommands,
    },
    {
      title: "Aktuelle automatisierte Ergebnisse",
      items:
        evidenceArtifacts.length > 0
          ? evidenceArtifacts.map(
              (artifact) =>
                `${artifact.name}: ${artifact.status.toUpperCase()} | ${artifact.summaryText} | ${artifact.relativePath}`
            )
          : ["Fuer diese Test Execution ist aktuell keine lokale Nachweisdatei vorhanden."],
    },
    {
      title: "Xray Run-Status-Regel",
      items: [
        "Manuelle und explorative Testlaeufe werden beim Sync bewusst auf TODO / Not Tested gesetzt, bis QA oder Client sie wirklich ausfuehrt.",
        "Automatisierte Testlaeufe erhalten ihren Status aus der verlinkten JSON- oder JUnit-Nachweisdatei: PASSED, FAILED oder TODO bei fehlendem Nachweis.",
        "Damit ist in Xray klar getrennt, was bereits automatisiert geprueft wurde und was noch manuell getestet werden muss.",
      ],
    },
    {
      title: "Freigaberegel",
      items: [
        "Alle kritischen automatisierten Nachweise sollen bestanden sein, bevor die Kundenabnahme vorbereitet wird.",
        "Exploratives manuelles Testen wird durch diese automatisierten Ergebnisse nicht ersetzt.",
        "Produktive Provider-Zugangsdaten und Validierung echter Kundendaten bleiben separate Freigabe-Gates.",
      ],
    },
  ])
}

async function walkFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walkFiles(absolutePath)))
    else if (entry.isFile()) files.push(absolutePath)
  }
  return files
}

function safeReadSummaryValue(value) {
  if (value === undefined || value === null) return null
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  return null
}

function countPassedItems(value) {
  if (!value || typeof value !== "object") return { total: 0, passed: 0, failed: 0 }
  let total = 0
  let passed = 0
  let failed = 0
  const visit = (item) => {
    if (!item || typeof item !== "object") return
    if (typeof item.passed === "boolean") {
      total += 1
      if (item.passed) passed += 1
      else failed += 1
    }
    if (Array.isArray(item)) item.forEach(visit)
    else Object.values(item).forEach(visit)
  }
  visit(value)
  return { total, passed, failed }
}

function summarizeJsonReport(payload) {
  const status =
    payload?.passed === true || payload?.ok === true
      ? "passed"
      : payload?.passed === false || payload?.ok === false
        ? "failed"
        : "unknown"
  const counts = countPassedItems(payload)
  const fragments = []

  if (payload?.generatedAt) fragments.push(`generatedAt=${payload.generatedAt}`)
  if (payload?.baseUrl) fragments.push(`baseUrl=${payload.baseUrl}`)
  if (payload?.server?.status) fragments.push(`server=${payload.server.status}`)
  if (Array.isArray(payload?.api?.checks)) fragments.push(`apiChecks=${payload.api.checks.length}`)
  if (Array.isArray(payload?.browser?.results)) fragments.push(`browserResults=${payload.browser.results.length}`)
  if (Array.isArray(payload?.gates)) fragments.push(`gates=${payload.gates.length}`)
  if (Array.isArray(payload?.gateResults)) fragments.push(`gates=${payload.gateResults.length}`)
  if (Array.isArray(payload?.apiChecks)) fragments.push(`apiChecks=${payload.apiChecks.length}`)
  if (Array.isArray(payload?.browserChecks)) fragments.push(`browserChecks=${payload.browserChecks.length}`)
  if (Number.isFinite(payload?.checked)) fragments.push(`checked=${payload.checked}`)
  if (Number.isFinite(payload?.pathCount)) fragments.push(`apiPaths=${payload.pathCount}`)
  if (Number.isFinite(payload?.routeCount)) fragments.push(`appRoutes=${payload.routeCount}`)
  if (Number.isFinite(payload?.failures?.length)) fragments.push(`failures=${payload.failures.length}`)
  if (Number.isFinite(payload?.errors?.length)) fragments.push(`errors=${payload.errors.length}`)
  if (counts.total > 0) fragments.push(`nestedPass=${counts.passed}/${counts.total}`)

  const summaryValue =
    safeReadSummaryValue(payload?.summary) ??
    safeReadSummaryValue(payload?.scope) ??
    safeReadSummaryValue(payload?.previewText)
  if (summaryValue) fragments.unshift(summaryValue)

  return {
    status,
    summaryText: fragments.length > 0 ? fragments.slice(0, 8).join("; ") : "JSON report parsed.",
    generatedAt: payload?.generatedAt ?? null,
  }
}

function summarizeXmlReport(text) {
  const failures = Number(text.match(/\bfailures="(\d+)"/)?.[1] ?? 0)
  const errors = Number(text.match(/\berrors="(\d+)"/)?.[1] ?? 0)
  const testsCount = Number(text.match(/\btests="(\d+)"/)?.[1] ?? 0)
  const skipped = Number(text.match(/\bskipped="(\d+)"/)?.[1] ?? 0)
  const status = failures === 0 && errors === 0 && testsCount > 0 ? "passed" : testsCount > 0 ? "failed" : "unknown"
  return {
    status,
    summaryText: `tests=${testsCount}; failures=${failures}; errors=${errors}; skipped=${skipped}`,
    generatedAt: null,
  }
}

async function collectQaEvidence() {
  const resultsRoot = path.join(rootDir, "quality", "results")
  const files = await walkFiles(resultsRoot)
  const artifacts = []

  for (const spec of qaReportSpecs) {
    const matches = []
    for (const filePath of files) {
      const normalized = filePath.replace(/\\/g, "/")
      const matchesFile = path.basename(filePath).toLowerCase() === spec.fileName.toLowerCase()
      const matchesPath = spec.pathIncludes.some((part) => normalized.includes(part))
      if (matchesFile && matchesPath) {
        const stat = await fs.stat(filePath)
        matches.push({ filePath, stat })
      }
    }
    matches.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
    const latest = matches[0]
    if (!latest) continue

    const relativePath = path.relative(rootDir, latest.filePath).replace(/\\/g, "/")
    let summary
    if (spec.xml) {
      const text = await fs.readFile(latest.filePath, "utf8")
      summary = summarizeXmlReport(text)
    } else {
      const payload = JSON.parse(await fs.readFile(latest.filePath, "utf8"))
      summary = summarizeJsonReport(payload)
    }

    artifacts.push({
      key: spec.key,
      name: spec.name,
      filePath: latest.filePath,
      relativePath,
      attachmentName: `cati-qa-${spec.key}${spec.xml ? ".xml" : ".json"}`,
      lastWriteTime: latest.stat.mtime.toISOString(),
      ...summary,
    })
  }

  return artifacts
}

function evidenceByKey(artifacts) {
  return new Map(artifacts.map((artifact) => [artifact.key, artifact]))
}

function artifactsForKeys(artifactMap, keys) {
  return keys.map((key) => artifactMap.get(key)).filter(Boolean)
}

function artifactsForAutomatedTest(artifactMap, test) {
  return artifactMap.get(test.evidenceKey) ?? null
}

function xrayRunStatusForArtifact(artifact) {
  if (artifact?.status === "passed") return "PASSED"
  if (artifact?.status === "failed") return "FAILED"
  return "TODO"
}

function summarizeImportedRunStatuses(results) {
  return results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] ?? 0) + 1
    return acc
  }, {})
}

function automatedResultComment(test, artifact) {
  if (!artifact) {
    return `Automatisierter Test ist definiert, aber es wurde beim Sync kein lokaler Nachweis gefunden. Befehl: ${test.command}.`
  }
  return [
    `Automatisierter Nachweis aus ${artifact.relativePath}.`,
    `Status: ${artifact.status.toUpperCase()}.`,
    `Kurzfassung: ${artifact.summaryText}.`,
    `Befehl: ${test.command}.`,
  ].join(" ")
}

function xrayResultsForExecution(manualPairs, automatedPairs, artifactMap) {
  const manualResults = manualPairs.map(({ issue, test }) => ({
    testKey: issue.key,
    status: "TODO",
    comment: `Nicht manuell ausgefuehrt. Dieser ${test.exploratory ? "explorative" : "funktionale"} Test muss manuell durch QA/Client-Team ausgefuehrt und danach bewertet werden.`,
  }))

  const automatedResults = automatedPairs.map(({ issue, test }) => {
    const artifact = artifactMap.get(test.evidenceKey)
    const status = xrayRunStatusForArtifact(artifact)
    const evidenceTime = artifact?.generatedAt ?? artifact?.lastWriteTime ?? syncStartedAt
    return {
      testKey: issue.key,
      status,
      comment: automatedResultComment(test, artifact),
      ...(status === "TODO"
        ? {}
        : {
            start: evidenceTime,
            finish: evidenceTime,
          }),
    }
  })

  return [...manualResults, ...automatedResults]
}

function manualTestMatchesExecution(test, group) {
  if (!test) return false
  if (Array.isArray(group.testUids)) return group.testUids.includes(test.uid)
  return testPhaseNumbers(test).some((phase) => group.phaseNumbers.includes(phase))
}

function automatedTestMatchesExecution(test, group) {
  if (!test) return false
  if (Array.isArray(group.automatedUids)) return group.automatedUids.includes(test.uid)
  return (test.phaseNumbers ?? []).some((phase) => group.phaseNumbers.includes(phase))
}

async function attachQaEvidence(issueKey, artifacts) {
  if (skipQaAttachments || artifacts.length === 0) return { removed: [], uploaded: [], skipped: skipQaAttachments }

  const issue = await jira(`/rest/api/3/issue/${issueKey}?fields=attachment`)
  const desiredNames = new Set(artifacts.map((artifact) => artifact.attachmentName))
  const removed = []
  for (const attachment of issue.fields?.attachment ?? []) {
    if (!desiredNames.has(attachment.filename)) continue
    await jira(`/rest/api/3/attachment/${attachment.id}`, { method: "DELETE" })
    removed.push(attachment.filename)
  }

  const uploaded = []
  for (const artifact of artifacts) {
    const buffer = await fs.readFile(artifact.filePath)
    const form = new FormData()
    form.append("file", new Blob([buffer]), artifact.attachmentName)
    const response = await fetch(`${jiraBaseUrl}/rest/api/3/issue/${issueKey}/attachments`, {
      method: "POST",
      headers: {
        Authorization: jiraAuth,
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      body: form,
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`QA evidence upload failed for ${artifact.attachmentName}: ${response.status} ${text}`)
    }
    uploaded.push(artifact.attachmentName)
  }
  return { removed, uploaded, skipped: false }
}

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

async function getCurrentUser() {
  return jira("/rest/api/3/myself")
}

async function getProject() {
  try {
    return await jira(`/rest/api/3/project/${projectKey}`)
  } catch (error) {
    if (!String(error.message).includes("404")) throw error
    return null
  }
}

async function ensureProject(user) {
  const existing = await getProject()
  if (existing) return { project: existing, created: false }

  const body = {
    key: projectKey,
    name: env.JIRA_PROJECT_NAME,
    projectTypeKey: "software",
    projectTemplateKey,
    description:
      "Kanban-Projekt für die Umsetzung des KI-gestützten Site-Management-CRM mit Anforderungen, Phasen, Testfällen und Lieferstatus.",
    leadAccountId: user.accountId,
    assigneeType: "PROJECT_LEAD",
  }

  const created = await jira("/rest/api/3/project", { method: "POST", body })
  const project = await jira(`/rest/api/3/project/${created.key ?? projectKey}`)
  return { project, created: true }
}

async function ensureComponent(name) {
  const existing = await jira(`/rest/api/3/project/${projectKey}/components`)
  const match = existing.find((component) => component.name === name)
  if (match) return match
  return jira("/rest/api/3/component", {
    method: "POST",
    body: { project: projectKey, name, description: `Arbeitsbereich: ${name}` },
  })
}

async function ensureVersion(name) {
  const existing = await jira(`/rest/api/3/project/${projectKey}/versions`)
  const match = existing.find((version) => version.name === name)
  if (match) return match
  return jira("/rest/api/3/version", {
    method: "POST",
    body: {
      project: projectKey,
      name,
      description: `Lieferstand ${name} für die 1Cati Property-Management-Plattform.`,
      released: false,
    },
  })
}

async function getProjectIssueTypes(projectId) {
  const types = await jira(`/rest/api/3/issuetype/project?projectId=${projectId}`)
  return types
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

function findFieldByName(fields, names) {
  const entries = Object.entries(fields)
  for (const name of names) {
    const found = entries.find(([, field]) => field.name?.toLowerCase() === name.toLowerCase())
    if (found) return found[0]
  }
  return null
}

async function searchByUniqueLabel(label) {
  const body = {
    jql: `project = ${projectKey} AND labels = "${label}" ORDER BY created ASC`,
    fields: ["summary", "status", "attachment"],
    maxResults: 1,
  }
  const result = await jira("/rest/api/3/search/jql", { method: "POST", body })
  return result.issues?.[0] ?? null
}

async function searchAllByJql(jql, fields, maxResults = 100) {
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

function phaseDescription(phase) {
  const meta = phaseMeta(phase)
  return doc([
    {
      title: "Scrum Ziel",
      text: [
        `Phase ${String(phase.phase).padStart(2, "0")} (${phase.version}) liefert: ${phase.goal}`,
        `Business value: ${meta.value}`,
      ],
    },
    {
      title: "Projektkontext",
      text: [
        "1Cati ist die Ataberk Estate Property-Management-Plattform für Site-Management, Bewohnerprozesse, Finanzen, Services, Dokumente, Integrationen und später kontrollierte AI-Unterstützung.",
        `Primary users: ${meta.persona}. Owner: ${meta.owner}.`,
        `Planned schedule: ${meta.startDate} to ${meta.endDate}. Current status: ${phase.status}.`,
      ],
    },
    {
      title: "Erwartetes Ergebnis",
      text: [phase.outcome],
    },
    {
      title: "Konkrete Deliverables",
      items: meta.deliverables,
    },
    {
      title: "Abhängigkeiten",
      items: meta.dependencies,
    },
    {
      title: "Akzeptanzkriterien",
      items: [
        "Every child story has a clear owner, current status, planned start date and planned end date.",
        "Scope, assumptions, dependencies, links and acceptance evidence are visible in Jira before work is marked Done.",
        "Backend, frontend, API, database, security, UX and QA impact are checked where relevant.",
        "Blocked items are moved to a visible blocker state or commented with the required client/vendor decision.",
      ],
    },
    {
      title: "Links und Quellen",
      items: linksForPhase(phase).slice(0, 18),
    },
  ])
}

function storyDescription(phase, story, storyIndex = 0) {
  const meta = phaseMeta(phase)
  const schedule = scheduleForStory(phase, storyIndex)
  const role = storyUserRole(phase, story)
  return doc([
    {
      title: "User Story",
      text: [`As a ${role}, I want ${story.toLowerCase()} so that ${meta.value.toLowerCase()}`],
    },
    {
      title: "Kontext",
      text: [
        `Diese Aufgabe gehört zu Phase ${phase.phase}: ${phase.title}.`,
        `Owner: ${meta.owner}. Component: ${phase.component}. Release bucket: ${phase.version}.`,
        `Planned start: ${schedule.startDate}. Planned target end: ${schedule.endDate}. Phase window: ${meta.startDate} to ${meta.endDate}.`,
        phase.goal,
      ],
    },
    {
      title: "Konkrete Arbeit",
      items: storyWorkItems(story),
    },
    {
      title: "Abhängigkeiten und Entscheidungen",
      items: meta.dependencies,
    },
    {
      title: "Akzeptanzkriterien",
      items: storyAcceptanceCriteria(phase, story),
    },
    {
      title: "Definition of Done",
      items: [
        "The feature or decision record is implemented in the relevant source file, document, API route, schema, adapter or Jira evidence.",
        "The ticket has evidence linked or attached and any remaining risk is written as a comment before status Done.",
        "Docs are updated when product behavior, architecture, provider choice, cost or launch scope changes.",
        "No real credentials, provider secrets, invoices or commercial quotes are attached to Jira or committed to the repository.",
      ],
    },
    {
      title: "Links und Quellen",
      items: linksForPhase(phase, story).slice(0, 30),
    },
  ])
}

function storyLabels(phase, story) {
  const labels = [phaseLabel(phase.phase), "story", "option3"]
  if (phase.phase === 13 && /kostenregister|supabase cloud pro|abhängigkeiten|abhaengigkeiten/i.test(story)) {
    labels.push("external-dependency", "third-party-cost", "vendor-decision")
  }
  return labels
}

function phaseForTest(test) {
  if (test.component === "UX und Design") return phases.find((phase) => phase.phase === 2)
  if (test.component === "Plattform und Sicherheit") return phases.find((phase) => phase.phase === 3)
  if (test.component === "Stammdaten") return phases.find((phase) => phase.phase === 4)
  if (test.component === "Nutzer und Rollen") return phases.find((phase) => phase.phase === 5)
  if (test.component === "Finanzen") return phases.find((phase) => phase.phase === 7)
  if (test.component === "Services und Tickets") return phases.find((phase) => phase.phase === 8)
  if (test.component === "Buchung und Zugang") return phases.find((phase) => phase.phase === 10)
  if (test.component === "Kommunikation und Dokumente") return phases.find((phase) => phase.phase === 11)
  if (test.component === "Mobile PWA") return phases.find((phase) => phase.phase === 12)
  if (test.component === "Integrationen") return phases.find((phase) => phase.phase === 13)
  if (test.component === "KI und Analytics") return phases.find((phase) => phase.phase === 14)
  return phases.find((phase) => phase.phase === 15)
}

function testDescription(test) {
  const phase = phaseForTest(test)
  const meta = phase ? phaseMeta(phase) : phaseDetails[15]
  return doc([
    {
      title: "Testzweck",
      text: [
        `Dieser Test prueft folgendes Verhalten: ${test.summary}.`,
        `Verlinkte Phase: ${phase ? `Phase ${phase.phase} - ${phase.title}` : "Phase 15 - QA und Launch"}. Geplantes Testfenster: ${meta.startDate} bis ${meta.endDate}.`,
      ],
    },
    {
      title: "Vorbedingung",
      text: [test.precondition],
    },
    {
      title: "Testschritte und erwartete Ergebnisse",
      items: test.steps.map(
        ([action, expected], index) =>
          `Schritt ${index + 1}: ${action} Erwartetes Ergebnis: ${expected}`
      ),
    },
    {
      title: "Bestehensregel",
      text: [
        "Der Test gilt nur als bestanden, wenn alle erwarteten Ergebnisse ohne manuelle Datenkorrektur erreicht werden und keine unberechtigten Daten sichtbar sind.",
        "Der Nachweis muss in Jira oder Xray verlinkt sein, bevor der Test auf Done gesetzt wird.",
      ],
    },
    {
      title: "Links und Quellen",
      items: phase ? linksForPhase(phase, test.summary).slice(0, 18) : phaseDetails[15].links,
    },
  ])
}

function applyOptionalDateFields(fields, { startDate, dueDate, startDateFieldId, dueDateSupported }) {
  if (dueDate && dueDateSupported) fields.duedate = dueDate
  if (startDate && startDateFieldId) fields[startDateFieldId] = startDate
}

async function ensureIssue({
  uid,
  lookupUid,
  summary,
  issueType,
  description,
  labels,
  componentId,
  versionId,
  parentKey,
  desiredStatus,
  epicNameFieldId,
  epicLinkFieldId,
  parentSupported,
  startDate,
  dueDate,
  startDateFieldId,
  dueDateSupported,
}) {
  const existing = await searchByUniqueLabel(lookupUid ?? uid)
  const fields = {
    project: { key: projectKey },
    issuetype: { id: issueType.id },
    summary,
    description,
    labels: [...new Set([syncLabel, uid, ...labels])],
  }

  if (componentId) fields.components = [{ id: componentId }]
  if (versionId) fields.fixVersions = [{ id: versionId }]
  if (epicNameFieldId) fields[epicNameFieldId] = summary.slice(0, 255)
  if (parentKey && parentSupported) fields.parent = { key: parentKey }
  if (parentKey && !parentSupported && epicLinkFieldId) fields[epicLinkFieldId] = parentKey
  applyOptionalDateFields(fields, { startDate, dueDate, startDateFieldId, dueDateSupported })

  async function writeIssue(writeFields) {
    if (existing) {
      await jira(`/rest/api/3/issue/${existing.key}`, { method: "PUT", body: { fields: writeFields } })
      return jira(`/rest/api/3/issue/${existing.key}?fields=status,summary,attachment`)
    }
    const created = await jira("/rest/api/3/issue", { method: "POST", body: { fields: writeFields } })
    return jira(`/rest/api/3/issue/${created.key}?fields=status,summary,attachment`)
  }

  let issue
  try {
    issue = await writeIssue(fields)
  } catch (error) {
    const parentError =
      parentKey &&
      (String(error.message).includes("parent") ||
        String(error.message).includes("hierarchy") ||
        String(error.message).includes("Epic Link"))
    if (!parentError) throw error

    const fallbackFields = { ...fields }
    delete fallbackFields.parent
    if (epicLinkFieldId) fallbackFields[epicLinkFieldId] = parentKey
    else delete fallbackFields[epicLinkFieldId]
    issue = await writeIssue(fallbackFields)
  }

  if (desiredStatus) await transitionIssue(issue.key, desiredStatus)
  await jira(`/rest/api/3/issue/${issue.key}/properties/cati-sync`, {
    method: "PUT",
    body: {
      uid,
      lookupUid: lookupUid ?? uid,
      syncedAt: new Date().toISOString(),
      source: "scripts/jira-xray-sync.mjs",
    },
  })
  return issue
}

function statusMatches(issue, desiredStatus) {
  const status = issue.fields?.status
  const category = status?.statusCategory?.key
  const name = status?.name?.toLowerCase() ?? ""
  if (desiredStatus === "done") {
    return category === "done" || /done|fertig|erledigt|geschlossen|abgeschlossen/.test(name)
  }
  if (desiredStatus === "in-progress") {
    return category === "indeterminate" || /progress|arbeit|bearbeitung|review|prüfung/.test(name)
  }
  if (desiredStatus === "todo") {
    return category === "new" || /to do|offen|todo|neu/.test(name)
  }
  return false
}

async function transitionIssue(issueKey, desiredStatus) {
  const issue = await jira(`/rest/api/3/issue/${issueKey}?fields=status`)
  if (statusMatches(issue, desiredStatus)) return false

  const transitions = await jira(`/rest/api/3/issue/${issueKey}/transitions`)
  const candidates = transitions.transitions ?? []
  let transition = null

  if (desiredStatus === "done") {
    transition =
      candidates.find((item) => item.to?.statusCategory?.key === "done") ??
      candidates.find((item) => /done|fertig|erledigt|geschlossen|abgeschlossen/i.test(item.name))
  } else if (desiredStatus === "in-progress") {
    transition =
      candidates.find((item) => item.to?.statusCategory?.key === "indeterminate") ??
      candidates.find((item) => /progress|arbeit|bearbeitung|start|review|prüfung/i.test(item.name))
  } else if (desiredStatus === "todo") {
    transition =
      candidates.find((item) => item.to?.statusCategory?.key === "new") ??
      candidates.find((item) => /to do|offen|todo|neu/i.test(item.name))
  }

  if (!transition) return false
  await jira(`/rest/api/3/issue/${issueKey}/transitions`, {
    method: "POST",
    body: { transition: { id: transition.id } },
  })
  await jira(`/rest/api/3/issue/${issueKey}/comment`, {
    method: "POST",
    body: {
      body: doc([
        {
          text: [
            `Status wurde durch den Cati-Sync auf ${desiredStatus} gesetzt. Zeitpunkt: ${new Date().toISOString()}.`,
          ],
        },
      ]),
    },
  })
  return true
}

async function attachDocuments(issueKey) {
  const issue = await jira(`/rest/api/3/issue/${issueKey}?fields=attachment`)
  const desiredNames = new Set(documentationAttachments.map((relativePath) => path.basename(relativePath)))
  const managedNames = new Set([...desiredNames, ...obsoleteDocumentationAttachmentNames])
  const removed = []

  for (const attachment of issue.fields?.attachment ?? []) {
    if (!managedNames.has(attachment.filename)) continue
    await jira(`/rest/api/3/attachment/${attachment.id}`, { method: "DELETE" })
    removed.push(attachment.filename)
  }

  const uploaded = []

  for (const relativePath of documentationAttachments) {
    const absolutePath = path.join(rootDir, relativePath)
    const fileName = path.basename(relativePath)
    try {
      await fs.access(absolutePath)
    } catch {
      continue
    }
    const form = new FormData()
    const buffer = await fs.readFile(absolutePath)
    form.append("file", new Blob([buffer]), fileName)
    const response = await fetch(`${jiraBaseUrl}/rest/api/3/issue/${issueKey}/attachments`, {
      method: "POST",
      headers: {
        Authorization: jiraAuth,
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      body: form,
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Attachment upload failed for ${fileName}: ${response.status} ${text}`)
    }
    uploaded.push(fileName)
  }
  return { removed, uploaded }
}

async function xrayAuthenticate() {
  if (!env.XRAY_BASE_URL || !env.XRAY_CLIENT_ID || !env.XRAY_CLIENT_SECRET) return null
  const response = await fetch(`${env.XRAY_BASE_URL.replace(/\/$/, "")}/api/v2/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.XRAY_CLIENT_ID,
      client_secret: env.XRAY_CLIENT_SECRET,
    }),
  })
  if (!response.ok) return null
  return (await response.text()).replace(/^"|"$/g, "")
}

async function xrayGraphql(token, query, variables) {
  if (!token || !env.XRAY_BASE_URL) return null
  const response = await fetch(`${env.XRAY_BASE_URL.replace(/\/$/, "")}/api/v2/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.errors) return null
  return payload.data
}

async function xrayRest(token, pathname, options = {}) {
  if (!token || !env.XRAY_BASE_URL) return null
  const response = await fetch(`${env.XRAY_BASE_URL.replace(/\/$/, "")}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
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
    throw new Error(`${options.method ?? "GET"} Xray ${pathname} failed with ${response.status}: ${detail}`)
  }
  return data
}

async function importXrayExecutionResults(token, testExecutionKey, results) {
  if (!token || results.length === 0) return { skipped: true, imported: 0, statuses: {} }
  const imported = await xrayRest(token, "/api/v2/import/execution", {
    method: "POST",
    body: {
      testExecutionKey,
      tests: results,
    },
  })
  return {
    skipped: false,
    imported: results.length,
    statuses: summarizeImportedRunStatuses(results),
    key: imported?.key ?? testExecutionKey,
  }
}

async function getXrayStepCount(token, testIssueId) {
  const query = `
    query GetTestSteps($issueId: String!) {
      getTest(issueId: $issueId) {
        steps {
          id
        }
      }
    }
  `
  const result = await xrayGraphql(token, query, { issueId: testIssueId })
  return Array.isArray(result?.getTest?.steps) ? result.getTest.steps.length : null
}

async function addXrayManualSteps(token, testIssueId, test, startAt = 0) {
  const results = []
  const mutation = `
    mutation AddStep($issueId: String!, $step: CreateStepInput!) {
      addTestStep(issueId: $issueId, step: $step) {
        id
      }
    }
  `
  for (const [action, expected] of test.steps.slice(startAt)) {
    const result = await xrayGraphql(token, mutation, {
      issueId: testIssueId,
      step: { action, data: "", result: expected },
    })
    results.push(Boolean(result))
  }
  return results.filter(Boolean).length
}

async function ensureXrayManualSteps(token, testIssueId, test) {
  const currentCount = await getXrayStepCount(token, testIssueId)
  if (currentCount === null) return 0
  if (currentCount !== null && currentCount >= test.steps.length) return 0
  return addXrayManualSteps(token, testIssueId, test, currentCount)
}

async function addTestsToXrayTestSet(token, testSetIssueId, testIssueIds) {
  const mutation = `
    mutation AddTestsToTestSet($issueId: String!, $testIssueIds: [String]!) {
      addTestsToTestSet(issueId: $issueId, testIssueIds: $testIssueIds) {
        addedTests
        warning
      }
    }
  `
  return xrayGraphql(token, mutation, { issueId: testSetIssueId, testIssueIds })
}

async function addTestsToXrayTestPlan(token, testPlanIssueId, testIssueIds) {
  const mutation = `
    mutation AddTestsToTestPlan($issueId: String!, $testIssueIds: [String]!) {
      addTestsToTestPlan(issueId: $issueId, testIssueIds: $testIssueIds) {
        addedTests
        warning
      }
    }
  `
  return xrayGraphql(token, mutation, { issueId: testPlanIssueId, testIssueIds })
}

async function addTestsToXrayTestExecution(token, testExecutionIssueId, testIssueIds) {
  const mutation = `
    mutation AddTestsToTestExecution($issueId: String!, $testIssueIds: [String]!) {
      addTestsToTestExecution(issueId: $issueId, testIssueIds: $testIssueIds) {
        addedTests
        warning
      }
    }
  `
  return xrayGraphql(token, mutation, { issueId: testExecutionIssueId, testIssueIds })
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

async function main() {
  const qaEvidenceArtifacts = await collectQaEvidence()
  const qaEvidenceByKey = evidenceByKey(qaEvidenceArtifacts)

  if (dryRun) {
    const existingAttachments = []
    for (const relativePath of documentationAttachments) {
      try {
        await fs.access(path.join(rootDir, relativePath))
        existingAttachments.push(relativePath)
      } catch {
        // Missing optional attachment is reported by omission in the dry-run output.
      }
    }
    const dryRunReport = {
      dryRun: true,
      generatedAt: new Date().toISOString(),
      projectKey,
      projectName: env.JIRA_PROJECT_NAME ?? null,
      syncLabel,
      issuePlan: {
        phases: phases.length,
        phaseStories: phases.reduce((sum, phase) => sum + phase.stories.length, 0),
        documentationIssues: 1,
        manualTestCases: manualTests.length,
        functionalSystemTestCases: tests.length,
        exploratoryTestCases: exploratoryTests.length,
        automatedTestCases: automatedTests.length,
        testPlans: 1,
        testSets: 3,
        testExecutions: testExecutionGroups.length,
      },
      phaseStatusSummary,
      attachmentPlan: {
        mode: skipAttachments ? "skip-managed-documentation-attachments" : "replace-managed-documentation-attachments",
        qaEvidenceMode: skipQaAttachments ? "skip-qa-json-attachments" : "upload-latest-qa-json-attachments",
        obsoleteNames: [...obsoleteDocumentationAttachmentNames],
      },
      phases: phases.map((phase) => {
        const meta = phaseMeta(phase)
        return {
          phase: phase.phase,
          status: phase.status,
          version: phase.version,
          component: phase.component,
          title: phase.title,
          owner: meta.owner,
          startDate: meta.startDate,
          endDate: meta.endDate,
          linkCount: linksForPhase(phase).length,
          storyCount: phase.stories.length,
          stories: phase.stories.map((story, index) => ({
            summary: story,
            ...scheduleForStory(phase, index),
            labels: storyLabels(phase, story),
            linkCount: linksForPhase(phase, story).length,
          })),
        }
      }),
      attachments: existingAttachments,
      qaEvidence: qaEvidenceArtifacts.map((artifact) => ({
        key: artifact.key,
        name: artifact.name,
        status: artifact.status,
        relativePath: artifact.relativePath,
        summaryText: artifact.summaryText,
      })),
      manualTests: manualTests.map((test) => ({
        uid: test.uid,
        summary: test.summary,
        classification: test.exploratory ? "exploratory" : "functional-system",
        component: test.component,
        phaseNumbers: testPhaseNumbers(test),
        stepCount: test.steps.length,
      })),
      automatedTests: automatedTests.map((test) => ({
        uid: test.uid,
        summary: test.summary,
        classification: test.classification,
        phaseNumbers: test.phaseNumbers,
        evidenceKey: test.evidenceKey,
        latestEvidenceStatus: qaEvidenceByKey.get(test.evidenceKey)?.status ?? "missing",
      })),
      testExecutions: testExecutionGroups.map((group) => ({
        uid: group.uid,
        summary: group.summary,
        scope: group.scope ?? null,
        phaseNumbers: group.phaseNumbers,
        linkedManualTestCount: manualTests.filter((test) => manualTestMatchesExecution(test, group)).length,
        linkedAutomatedTestCount: automatedTests.filter((test) => automatedTestMatchesExecution(test, group)).length,
        evidenceKeys: group.evidenceKeys,
        availableEvidence: artifactsForKeys(qaEvidenceByKey, group.evidenceKeys).map((artifact) => ({
          key: artifact.key,
          status: artifact.status,
        })),
      })),
      xrayConfigured: Boolean(env.XRAY_BASE_URL && env.XRAY_CLIENT_ID && env.XRAY_CLIENT_SECRET),
    }
    const reportDir = path.join(rootDir, "quality", "results")
    await fs.mkdir(reportDir, { recursive: true })
    await fs.writeFile(
      path.join(reportDir, "jira-xray-sync-dry-run.json"),
      JSON.stringify(dryRunReport, null, 2)
    )
    console.log(JSON.stringify(dryRunReport, null, 2))
    return
  }

  const user = await getCurrentUser()
  const { project, created: projectCreated } = await ensureProject(user)
  const componentMap = new Map()
  const versionMap = new Map()

  for (const component of components) componentMap.set(component, await ensureComponent(component))
  for (const version of versions) versionMap.set(version, await ensureVersion(version))

  const issueTypes = await getProjectIssueTypes(project.id)
  const epicType = pickIssueType(issueTypes, ["Epic", "Epos"])
  const storyType = pickIssueType(issueTypes, ["Story", "User Story", "Aufgabe", "Task"])
  const taskType = pickIssueType(issueTypes, ["Task", "Aufgabe", "Story"])
  const testType = pickIssueType(issueTypes, ["Test"])
  const testSetType = pickIssueType(issueTypes, ["Test Set", "Testset"])
  const testPlanType = pickIssueType(issueTypes, ["Test Plan", "Testplan"])
  const testExecutionType = pickIssueType(issueTypes, ["Test Execution", "Testausfuehrung", "Testausfuhrung"])

  if (!storyType || !taskType) {
    throw new Error(`Required issue types missing. Available types: ${issueTypes.map((item) => item.name).join(", ")}`)
  }

  const epicFields = epicType ? await getCreateFields(epicType.id) : {}
  const storyFields = await getCreateFields(storyType.id)
  const taskFields = await getCreateFields(taskType.id)
  const testFields = testType ? await getCreateFields(testType.id) : {}
  const testSetFields = testSetType ? await getCreateFields(testSetType.id) : {}
  const testPlanFields = testPlanType ? await getCreateFields(testPlanType.id) : {}
  const testExecutionFields = testExecutionType ? await getCreateFields(testExecutionType.id) : {}
  const epicNameFieldId = epicType ? findFieldByName(epicFields, ["Epic Name", "Epic-Name", "Epic Name"]) : null
  const epicLinkFieldId = findFieldByName(storyFields, ["Epic Link", "Epic-Verknüpfung"])
  const parentSupported = Boolean(storyFields.parent)
  const testSetParentSupported = Boolean(testFields.parent)
  const startDateFieldNames = ["Start date", "Startdatum", "Start", "Target start", "Planned start"]
  const epicStartDateFieldId = epicType ? fieldsByName(epicFields, startDateFieldNames) : null
  const storyStartDateFieldId = fieldsByName(storyFields, startDateFieldNames)
  const taskStartDateFieldId = fieldsByName(taskFields, startDateFieldNames)
  const testStartDateFieldId = fieldsByName(testFields, startDateFieldNames)
  const testSetStartDateFieldId = fieldsByName(testSetFields, startDateFieldNames)
  const testPlanStartDateFieldId = fieldsByName(testPlanFields, startDateFieldNames)
  const testExecutionStartDateFieldId = fieldsByName(testExecutionFields, startDateFieldNames)
  const epicDueDateSupported = Boolean(epicFields.duedate)
  const storyDueDateSupported = Boolean(storyFields.duedate)
  const taskDueDateSupported = Boolean(taskFields.duedate)
  const testDueDateSupported = Boolean(testFields.duedate)
  const testSetDueDateSupported = Boolean(testSetFields.duedate)
  const testPlanDueDateSupported = Boolean(testPlanFields.duedate)
  const testExecutionDueDateSupported = Boolean(testExecutionFields.duedate)

  const createdIssues = []
  const phaseIssueByPhase = new Map()

  for (const phase of phases) {
    console.log(`Syncing phase ${phase.phase}: ${phase.title}`)
    const meta = phaseMeta(phase)
    const component = componentMap.get(phase.component)
    const version = versionMap.get(phase.version)
    const phaseIssue = await ensureIssue({
      uid: `${labelPrefix}-${phaseLabel(phase.phase)}-epic`,
      summary: `Phase ${String(phase.phase).padStart(2, "0")}: ${phase.title}`,
      issueType: epicType ?? taskType,
      description: phaseDescription(phase),
      labels: [phaseLabel(phase.phase), "phase", "option3"],
      componentId: component?.id,
      versionId: version?.id,
      desiredStatus: phase.status,
      epicNameFieldId: epicType ? epicNameFieldId : null,
      startDate: meta.startDate,
      dueDate: meta.endDate,
      startDateFieldId: epicType ? epicStartDateFieldId : taskStartDateFieldId,
      dueDateSupported: epicType ? epicDueDateSupported : taskDueDateSupported,
    })
    createdIssues.push(phaseIssue.key)
    phaseIssueByPhase.set(phase.phase, phaseIssue)

    for (let index = 0; index < phase.stories.length; index++) {
      const story = phase.stories[index]
      const storyStatus =
        phase.status === "done"
          ? "done"
          : phase.status === "in-progress" && index === 0
            ? "in-progress"
            : "todo"
      const storySchedule = scheduleForStory(phase, index)
      console.log(`  Syncing story ${index + 1}: ${story}`)
      const storyIssue = await ensureIssue({
        uid: `${labelPrefix}-${phaseLabel(phase.phase)}-story-${String(index + 1).padStart(2, "0")}`,
        summary: story,
        issueType: storyType,
        description: storyDescription(phase, story, index),
        labels: storyLabels(phase, story),
        componentId: component?.id,
        versionId: version?.id,
        parentKey: phaseIssue.key,
        desiredStatus: storyStatus,
        epicLinkFieldId,
        parentSupported,
        startDate: storySchedule.startDate,
        dueDate: storySchedule.endDate,
        startDateFieldId: storyStartDateFieldId,
        dueDateSupported: storyDueDateSupported,
      })
      createdIssues.push(storyIssue.key)
    }
  }

  const docsIssue = await ensureIssue({
    uid: `${labelPrefix}-documentation-package`,
    summary: "Aktuelles Dokumentationspaket und DOCX-Lesekopien zentral pflegen",
    issueType: taskType,
    description: doc([
      {
        title: "Ziel",
        text: [
          "Die aktuellen Produkt-, Technik-, Markt-, Integrations-, QA- und Lieferdokumente liegen als saubere DOCX-Lesekopien im Jira-Projekt vor.",
        ],
      },
      {
        title: "Scrum Steuerung",
        text: [
          "This documentation ticket is the managed evidence package for the whole project. It keeps the source-of-truth docs and DOCX reading copies synchronized with the Jira delivery plan.",
          "Planned start: 2026-06-26. Planned target end: 2026-06-26.",
        ],
      },
      {
        title: "Enthaltene Dokumente",
        items: [
          "Business Requirement Document",
          "Product Requirement Document",
          "Technical Requirement Document",
          "OpenAPI API Specification and API testing contract",
          "Third-Party Integration And Vendor Plan",
          "Implementation Delivery Plan",
          "Security Compliance Plan",
          "Data Migration Plan",
          "QA and Client Acceptance Launch Plan",
          "Requirements Traceability Matrix",
          "Market Research Annex",
          "Source Register",
          "Project Handbook",
          "Combined current project documentation",
          "Combined requirements package",
          "Phase execution runbook",
          "15-Phasen-Implementierungsplan als DOCX-Lesekopie",
        ],
      },
      {
        title: "Links und Quellen",
        items: [
          "docs/README.md",
          "docs/PROJECT-HANDBOOK.md",
          "docs/api/README.md",
          "docs/api/openapi.json",
          "Lokaler API-Spec-Endpunkt: http://127.0.0.1:3104/api/openapi",
          "Lokaler API-Contract-Nachweis: quality/results/openapi-contract/openapi-contract-report.json",
          "docs/requirements/option-3-ai-site-crm/Third-Party-Integration-And-Vendor-Plan.md",
          "docs/requirements/option-3-ai-site-crm/Source-Register.md",
        ],
      },
    ]),
    labels: ["documentation", "phase-01", "option3"],
    componentId: componentMap.get("Produkt und Planung")?.id,
    versionId: versionMap.get("Release 1")?.id,
    parentKey: phaseIssueByPhase.get(1)?.key,
    desiredStatus: "done",
    epicLinkFieldId,
    parentSupported,
    startDate: "2026-06-26",
    dueDate: "2026-06-26",
    startDateFieldId: taskStartDateFieldId,
    dueDateSupported: taskDueDateSupported,
  })
  const documentationAttachmentSync = skipAttachments
    ? { removed: [], uploaded: [], skipped: true }
    : await attachDocuments(docsIssue.key)
  console.log(`Documentation issue synced: ${docsIssue.key}`)

  const token = await xrayAuthenticate()
  const testIssues = []
  const automatedTestIssues = []
  const allTestIssues = []
  const testExecutionIssues = []
  const qaEvidenceAttachmentSync = []
  const xrayExecutionResultSync = []
  let testPlanIssue = null
  let manualTestSetIssue = null
  let exploratoryTestSetIssue = null
  let automatedTestSetIssue = null

  if (testPlanType) {
    const qaMeta = phaseDetails[15]
    console.log("Syncing Xray/Jira test plan")
    testPlanIssue = await ensureIssue({
      uid: `${labelPrefix}-xray-testplan-phase-01-15`,
      summary: "Test Plan - 1Cati Phase 01-15 Systemtest, Regression und Launch Readiness",
      issueType: testPlanType,
      description: testPlanDescription(tests.length, exploratoryTests.length, automatedTests.length, qaEvidenceArtifacts),
      labels: ["xray", "test-plan", "phase-15", "qa-evidence", "option3"],
      componentId: componentMap.get("QA und Launch")?.id,
      versionId: versionMap.get("Release 3")?.id,
      desiredStatus: "in-progress",
      startDate: qaMeta.startDate,
      dueDate: qaMeta.endDate,
      startDateFieldId: testPlanStartDateFieldId,
      dueDateSupported: testPlanDueDateSupported,
    })
    createdIssues.push(testPlanIssue.key)
  }

  if (testSetType) {
    const qaMeta = phaseDetails[15]
    console.log("Syncing Xray/Jira functional system test set")
    manualTestSetIssue = await ensureIssue({
      uid: `${labelPrefix}-xray-testset-functional-system`,
      summary: "Test Set - Funktionale Systemtests und kritische Geschaeftsprozesse",
      issueType: testSetType,
      description: testSetDescription({
        title: "Funktionale Systemtests und kritische Geschaeftsprozesse",
        purpose:
          "Dieses Test Set buendelt die wichtigsten funktionalen End-to-End-Systemtests fuer die interne QA. Die Kundenabnahme bleibt ein spaeteres, separates Produktions-Gate.",
        testCount: tests.length,
        labels: ["funktional", "system-test", "kritischer-flow"],
        evidenceArtifacts: qaEvidenceArtifacts,
      }),
      labels: ["xray", "test-set", "functional", "system-test", "critical-flow", "option3"],
      componentId: componentMap.get("QA und Launch")?.id,
      versionId: versionMap.get("Release 3")?.id,
      desiredStatus: "in-progress",
      startDate: qaMeta.startDate,
      dueDate: qaMeta.endDate,
      startDateFieldId: testSetStartDateFieldId,
      dueDateSupported: testSetDueDateSupported,
    })
    createdIssues.push(manualTestSetIssue.key)

    console.log("Syncing Xray/Jira exploratory role session test set")
    exploratoryTestSetIssue = await ensureIssue({
      uid: `${labelPrefix}-xray-testset-exploratory-role-sessions`,
      summary: "Test Set - Explorative Rollen- und Hauptfunktions-Sessions",
      issueType: testSetType,
      description: testSetDescription({
        title: "Explorative Rollen- und Hauptfunktions-Sessions",
        purpose:
          "Dieses Test Set buendelt explorative, aber nachvollziehbare Sessions fuer Rollen, Hauptfunktionen, Usability, Randfaelle und Launch Readiness. Es erlaubt flexible Pruefung trotz beschleunigter Lieferung.",
        testCount: exploratoryTests.length,
        labels: ["exploratory", "role-session", "major-functionality"],
        evidenceArtifacts: qaEvidenceArtifacts,
      }),
      labels: ["xray", "test-set", "exploratory", "role-session", "major-functionality", "option3"],
      componentId: componentMap.get("QA und Launch")?.id,
      versionId: versionMap.get("Release 3")?.id,
      desiredStatus: "in-progress",
      startDate: qaMeta.startDate,
      dueDate: qaMeta.endDate,
      startDateFieldId: testSetStartDateFieldId,
      dueDateSupported: testSetDueDateSupported,
    })
    createdIssues.push(exploratoryTestSetIssue.key)

    console.log("Syncing Xray/Jira automated regression test set")
    automatedTestSetIssue = await ensureIssue({
      uid: `${labelPrefix}-xray-testset-automated-regression`,
      summary: "Test Set - Automatisierte QA, Regression und API-Vertraege",
      issueType: testSetType,
      description: testSetDescription({
        title: "Automatisierte QA, Regression und API-Vertraege",
        purpose:
          "Dieses Test Set gruppiert Playwright-, API-, RBAC-, UX-, Responsive- und Phasen-Harness-Pruefungen, damit automatisierte Ergebnisse mit Test Executions verlinkt werden koennen.",
        testCount: automatedTests.length,
        labels: ["automated", "regression", "qa-evidence"],
        evidenceArtifacts: qaEvidenceArtifacts,
      }),
      labels: ["xray", "test-set", "automated", "regression", "qa-evidence", "option3"],
      componentId: componentMap.get("QA und Launch")?.id,
      versionId: versionMap.get("Release 3")?.id,
      desiredStatus: "in-progress",
      startDate: qaMeta.startDate,
      dueDate: qaMeta.endDate,
      startDateFieldId: testSetStartDateFieldId,
      dueDateSupported: testSetDueDateSupported,
    })
    createdIssues.push(automatedTestSetIssue.key)
  }

  const testIssueType = testType ?? taskType
  const functionalTestIssues = []
  const exploratoryTestIssues = []
  for (const test of manualTests) {
    const testPhase = phaseForTest(test)
    const testMeta = testPhase ? phaseMeta(testPhase) : phaseDetails[15]
    console.log(`Syncing test case: ${test.summary}`)
    const targetTestSetIssue = test.exploratory ? exploratoryTestSetIssue : manualTestSetIssue
    const issue = await ensureIssue({
      uid: `${labelPrefix}-${test.uid}`,
      summary: `Testfall: ${test.summary}`,
      issueType: testIssueType,
      description: testDescription(test),
      labels: manualTestLabels(test),
      componentId: componentMap.get(test.component)?.id ?? componentMap.get("QA und Launch")?.id,
      versionId: versionMap.get("Release 3")?.id,
      parentKey: targetTestSetIssue?.key,
      parentSupported: testSetParentSupported,
      desiredStatus: "in-progress",
      startDate: testMeta.startDate,
      dueDate: testMeta.endDate,
      startDateFieldId: testType ? testStartDateFieldId : taskStartDateFieldId,
      dueDateSupported: testType ? testDueDateSupported : taskDueDateSupported,
    })
    testIssues.push(issue)
    if (test.exploratory) exploratoryTestIssues.push(issue)
    else functionalTestIssues.push(issue)
    allTestIssues.push(issue)
    createdIssues.push(issue.key)
    if (targetTestSetIssue) await createIssueLink(targetTestSetIssue.key, issue.key)
    if (testPlanIssue) await createIssueLink(testPlanIssue.key, issue.key)
    if (token && testType) await ensureXrayManualSteps(token, issue.id, test)
  }

  for (const test of automatedTests) {
    const artifact = artifactsForAutomatedTest(qaEvidenceByKey, test)
    const status = artifact?.status === "passed" ? "done" : "in-progress"
    const startPhase = phases.find((phase) => phase.phase === Math.min(...test.phaseNumbers)) ?? phases[14]
    const endPhase = phases.find((phase) => phase.phase === Math.max(...test.phaseNumbers)) ?? phases[14]
    console.log(`Syncing automated test case: ${test.summary}`)
    const issue = await ensureIssue({
      uid: `${labelPrefix}-${test.uid}`,
      summary: `Automated QA: ${test.summary}`,
      issueType: testIssueType,
      description: automatedTestDescription(test, artifact),
      labels: automatedTestLabels(test),
      componentId: componentMap.get(test.component)?.id ?? componentMap.get("QA und Launch")?.id,
      versionId: versionMap.get("Release 3")?.id,
      parentKey: automatedTestSetIssue?.key,
      parentSupported: testSetParentSupported,
      desiredStatus: status,
      startDate: phaseMeta(startPhase).startDate,
      dueDate: phaseMeta(endPhase).endDate,
      startDateFieldId: testType ? testStartDateFieldId : taskStartDateFieldId,
      dueDateSupported: testType ? testDueDateSupported : taskDueDateSupported,
    })
    automatedTestIssues.push(issue)
    allTestIssues.push(issue)
    createdIssues.push(issue.key)
    if (automatedTestSetIssue) await createIssueLink(automatedTestSetIssue.key, issue.key)
    if (testPlanIssue) await createIssueLink(testPlanIssue.key, issue.key)
  }

  if (token && manualTestSetIssue && functionalTestIssues.length > 0) {
    await addTestsToXrayTestSet(
      token,
      manualTestSetIssue.id,
      functionalTestIssues.map((issue) => issue.id)
    )
  }
  if (token && exploratoryTestSetIssue && exploratoryTestIssues.length > 0) {
    await addTestsToXrayTestSet(
      token,
      exploratoryTestSetIssue.id,
      exploratoryTestIssues.map((issue) => issue.id)
    )
  }
  if (token && automatedTestSetIssue && automatedTestIssues.length > 0) {
    await addTestsToXrayTestSet(
      token,
      automatedTestSetIssue.id,
      automatedTestIssues.map((issue) => issue.id)
    )
  }
  if (token && testPlanIssue && allTestIssues.length > 0) {
    await addTestsToXrayTestPlan(
      token,
      testPlanIssue.id,
      allTestIssues.map((issue) => issue.id)
    )
  }

  for (const group of testExecutionGroups) {
    if (!testExecutionType) break
    const artifacts = artifactsForKeys(qaEvidenceByKey, group.evidenceKeys)
    const groupManualPairs = testIssues
      .map((issue, index) => ({ issue, test: manualTests[index] }))
      .filter(({ test }) => manualTestMatchesExecution(test, group))
    const groupAutomatedPairs = automatedTestIssues
      .map((issue, index) => ({ issue, test: automatedTests[index] }))
      .filter(({ test }) => automatedTestMatchesExecution(test, group))
    const groupTests = [...groupManualPairs.map(({ issue }) => issue), ...groupAutomatedPairs.map(({ issue }) => issue)]
    const allArtifactsPassed = artifacts.length > 0 && artifacts.every((artifact) => artifact.status === "passed")
    const hasManualRunsPending = groupManualPairs.length > 0
    const startPhase = phases.find((phase) => phase.phase === Math.min(...group.phaseNumbers)) ?? phases[14]
    const endPhase = phases.find((phase) => phase.phase === Math.max(...group.phaseNumbers)) ?? phases[14]
    console.log(`Syncing test execution: ${group.summary}`)
    const executionIssue = await ensureIssue({
      uid: `${labelPrefix}-xray-${group.uid}`,
      summary: group.summary,
      issueType: testExecutionType,
      description: executionDescription(group, artifacts, groupTests.length),
      labels: ["xray", "test-execution", "qa-evidence", "option3", ...phaseLabelsForNumbers(group.phaseNumbers)],
      componentId: componentMap.get(group.component)?.id ?? componentMap.get("QA und Launch")?.id,
      versionId: versionMap.get("Release 3")?.id,
      desiredStatus: hasManualRunsPending ? "in-progress" : allArtifactsPassed ? "done" : "in-progress",
      startDate: phaseMeta(startPhase).startDate,
      dueDate: phaseMeta(endPhase).endDate,
      startDateFieldId: testExecutionStartDateFieldId,
      dueDateSupported: testExecutionDueDateSupported,
    })
    testExecutionIssues.push(executionIssue)
    createdIssues.push(executionIssue.key)
    if (testPlanIssue) await createIssueLink(testPlanIssue.key, executionIssue.key)
    for (const testIssue of groupTests) await createIssueLink(executionIssue.key, testIssue.key)
    if (token && groupTests.length > 0) {
      await addTestsToXrayTestExecution(
        token,
        executionIssue.id,
        groupTests.map((issue) => issue.id)
      )
    }
    const xrayResults = xrayResultsForExecution(groupManualPairs, groupAutomatedPairs, qaEvidenceByKey)
    xrayExecutionResultSync.push({
      issueKey: executionIssue.key,
      ...(token
        ? await importXrayExecutionResults(token, executionIssue.key, xrayResults)
        : {
            skipped: true,
            imported: 0,
            statuses: summarizeImportedRunStatuses(xrayResults),
          }),
    })
    qaEvidenceAttachmentSync.push({
      issueKey: executionIssue.key,
      ...(await attachQaEvidence(executionIssue.key, artifacts)),
    })
  }

  const verification = await searchAllByJql(
    `project = ${projectKey} AND labels = "${syncLabel}" ORDER BY created ASC`,
    ["summary", "issuetype", "status"],
  )

  const report = {
    syncedAt: new Date().toISOString(),
    projectKey,
    projectCreated,
    projectUrl: `${jiraBaseUrl}/jira/software/projects/${projectKey}/boards`,
    issueCount: verification.total ?? verification.issues?.length ?? 0,
    phaseCount: phases.length,
    phaseStatusSummary,
    manualTestCount: testIssues.length,
    functionalSystemTestCount: functionalTestIssues.length,
    exploratoryTestCount: exploratoryTestIssues.length,
    automatedTestCount: automatedTestIssues.length,
    totalTestCount: allTestIssues.length,
    xrayAuthenticated: Boolean(token),
    xrayTestIssueTypeAvailable: Boolean(testType),
    testPlanIssue: testPlanIssue?.key ?? null,
    manualTestSetIssue: manualTestSetIssue?.key ?? null,
    exploratoryTestSetIssue: exploratoryTestSetIssue?.key ?? null,
    automatedTestSetIssue: automatedTestSetIssue?.key ?? null,
    testExecutionIssues: testExecutionIssues.map((issue) => issue.key),
    docsIssue: docsIssue.key,
    qaEvidence: qaEvidenceArtifacts.map((artifact) => ({
      key: artifact.key,
      status: artifact.status,
      relativePath: artifact.relativePath,
      summaryText: artifact.summaryText,
    })),
    qaEvidenceAttachmentMode: skipQaAttachments ? "skipped" : "uploaded-latest-json-or-junit",
    qaEvidenceAttachmentSync,
    xrayExecutionResultSync,
    managedDocumentationAttachmentCount: documentationAttachments.length,
    attachmentMode: skipAttachments ? "skipped" : "replace-managed-documentation-attachments",
    removedDocumentationAttachments: documentationAttachmentSync.removed,
    uploadedAttachments: documentationAttachmentSync.uploaded,
    issueTypeNames: issueTypes.map((item) => item.name),
  }

  const reportDir = path.join(rootDir, "quality", "results")
  await fs.mkdir(reportDir, { recursive: true })
  await fs.writeFile(
    path.join(reportDir, "jira-xray-sync-report.json"),
    JSON.stringify(report, null, 2)
  )

  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
