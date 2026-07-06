// 1Çatı Demo Center — visual master recorder
// ---------------------------------------------------------------------------
// PURPOSE
//   Records the "visual master" for the 1Çatı Demo Center described in
//   docs/ways-of-work/plan/option-3-ai-site-crm/demo-center-plan.md.
//
//   It drives the real app with Playwright and saves one short, deterministic
//   video clip per FEATURE SCENE, repeated for every language (TR/EN/DE/RU).
//   Because the same script runs identically in each language, the motion is
//   pixel-identical across all four versions, so voiceover and subtitles line
//   up with almost no re-timing.
//
//   It also writes:
//     - demo-manifest.json : machine-readable scene list (routes, roles, status)
//     - demo-script.md     : human-readable recording + narration guide that
//                            explains every BIG feature and clearly marks any
//                            "coming soon" item.
//
// WHY IT IS SAFE / ACCURATE
//   - Uses language-neutral selectors only (data-testid + CSS), so the exact
//     same steps work in Turkish, English, German and Russian.
//   - Uses the built-in "access profile" demo mode (no real login, no real
//     personal data) by setting the `access_profile_role` cookie per scene.
//   - Only narrates what is live today; everything still in build is labelled
//     "COMING SOON" in demo-script.md and `comingSoon` in the manifest.
//
// PREREQUISITES
//   1. Run the app with demo mode on:
//        (PowerShell, from apps/web)
//        $env:NEXT_PUBLIC_ENABLE_ACCESS_PROFILES="true"; npm run dev -- -p 3100
//   2. Then run this recorder (from apps/web):
//        node scripts/demo-record.mjs
//
// CONFIG (environment variables, all optional)
//   DEMO_BASE_URL     default http://127.0.0.1:3100
//   DEMO_LOCALES      default tr,en,de,ru
//   DEMO_OUTPUT_DIR   default ../../qa_output/demo-center-master
//   DEMO_ONLY_SCENES  e.g. S04,S06  (re-record just these scenes)
//   DEMO_SKIP_VIDEO   "1" to generate the guide/manifest only, no recording
// ---------------------------------------------------------------------------

import { chromium } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3100"
const locales = (process.env.DEMO_LOCALES ?? "tr,en,de,ru")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
const outputDir =
  process.env.DEMO_OUTPUT_DIR ?? "../../qa_output/demo-center-master"
const clipsDir = path.join(outputDir, "clips")
const onlyScenes = (process.env.DEMO_ONLY_SCENES ?? "")
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean)
const skipVideo = process.env.DEMO_SKIP_VIDEO === "1"

const desktop = { width: 1920, height: 1080 }
const mobile = { width: 390, height: 844 }

// ---------------------------------------------------------------------------
// FEATURE SCENES
//
// Each scene = one recorded clip = one big feature of the platform.
//   id          stable scene id (used in filenames + chapters)
//   feature     the headline feature, in plain language
//   role        which access profile records this scene
//   route       app path AFTER the /{locale} prefix
//   viewport    desktop or mobile
//   status      "live" | "ready_for_uat" | "coming_soon"
//   chapter     which playlist chapter this clip belongs to
//   explain     simple-language explanation of what the viewer is seeing
//   narration   master narration line (English); TR/DE/RU follow the same meaning
//   comingSoon  things NOT live yet that the narration must label honestly
//   steps       language-neutral in-page actions (see runStep())
//
// Status meaning (verified from the codebase phase map):
//   live          = Phase 1–4 foundation, working now
//   ready_for_uat = Phase 5–14, built as a foundation, pending UAT/providers
//   coming_soon   = Phase 15 / provider-dependent items not yet activated
// ---------------------------------------------------------------------------

const scenes = [
  {
    id: "S01",
    feature: "What 1Çatı is",
    role: "manager",
    route: "/dashboard",
    viewport: desktop,
    status: "live",
    chapter: "01-overview",
    explain:
      "The landing on the control center. One platform that manages units, people, money, services and staff for a 769-flat site.",
    narration:
      "Welcome to 1Çatı, an AI-powered operating system for residential complexes. In one platform you manage units, people, money, services and staff — for a site as large as 769 flats. Everything live today is shown as live; anything still in build is clearly marked.",
    comingSoon: [],
    steps: [
      ["settle"],
      ["scrollTo", 0.35, 2200],
      ["mouseTour"],
      ["scrollTo", 0, 1500],
    ],
  },
  {
    id: "S02",
    feature: "Login and role-based access (RBAC)",
    role: "manager",
    route: "/login",
    viewport: desktop,
    status: "live",
    chapter: "01-overview",
    explain:
      "Six roles — admin, manager, accountant, staff, owner, tenant. Each person only sees what their role allows.",
    narration:
      "Access is role-based. There are six roles: admin, manager, accountant, staff, owner and tenant. A manager sees operations and finance summaries, an accountant sees the full ledger, staff see only their tasks, and owners and tenants see only their own unit. This keeps data private and each screen simple.",
    comingSoon: [
      "Production single sign-on / customer identity provider is confirmed during launch (Phase 15).",
    ],
    steps: [["settle"], ["wait", 1200], ["mouseTour"], ["wait", 800]],
  },
  {
    id: "S03",
    feature: "Main dashboard and 15-phase status",
    role: "manager",
    route: "/dashboard",
    viewport: desktop,
    status: "live",
    chapter: "02-dashboard-and-units",
    explain:
      "Income, expenses, debt, open tasks, occupancy and AI risk highlights at a glance, plus the live phase-delivery map.",
    narration:
      "The dashboard is the control center. At a glance you see income, expenses, outstanding debt, open tasks, occupancy and AI risk highlights, and the cards update live. Below, the phase map shows exactly how far the platform has been built — from the foundation through the AI layer.",
    comingSoon: [],
    steps: [
      ["settle"],
      ["hover", "[data-testid='dashboard-topbar']"],
      ["scrollTo", 0.45, 2200],
      ["openDisclosure"],
      ["wait", 1200],
      ["scrollTo", 0.7, 1800],
    ],
  },
  {
    id: "S04",
    feature: "Site, blocks, floors and 769 units",
    role: "manager",
    route: "/dashboard/listings",
    viewport: desktop,
    status: "live",
    chapter: "02-dashboard-and-units",
    explain:
      "The whole site modelled as blocks, floors and flats. Filter by status and open a single unit to see owner, tenant, balance and history.",
    narration:
      "The whole site is modelled as blocks, floors and flats — all 769 units. You can filter by status: vacant, occupied, in maintenance or restricted. Open a single unit to see its owner, tenant, balance and history in one place.",
    comingSoon: [],
    steps: [
      ["settle"],
      ["scrollTo", 0.3, 1800],
      [
        "clickAndVerify",
        "button[aria-label^='A-006'], button[aria-label^='A-005'], button[aria-label^='A-004']",
        "button[aria-pressed='true'][aria-label^='A-006'], button[aria-pressed='true'][aria-label^='A-005'], button[aria-pressed='true'][aria-label^='A-004']",
      ],
      ["wait", 900],
      ["scrollTo", 0.5, 1500],
    ],
  },
  {
    id: "S05",
    feature: "People: owners, tenants and staff",
    role: "admin",
    route: "/dashboard/users",
    viewport: desktop,
    status: "ready_for_uat",
    chapter: "03-people-and-rbac",
    explain:
      "Owners, tenants and staff each have a profile linked to a unit or role, with balance, documents and activity.",
    narration:
      "Here are the people. Owners, tenants and staff each have a profile linked to their unit or role. From a profile you reach their balance, documents and activity, and every change respects role permissions.",
    comingSoon: [
      "Bulk self-service resident onboarding is finalised with the customer dataset before launch.",
    ],
    steps: [
      ["settle"],
      ["scrollTo", 0.3, 1800],
      ["mouseTour"],
      ["scrollTo", 0.82, 1600],
      ["hover", "main table tbody tr"],
      ["wait", 900],
    ],
  },
  {
    id: "S06",
    feature: "Finance ledger engine",
    role: "accountant",
    route: "/dashboard/finance",
    viewport: desktop,
    status: "ready_for_uat",
    chapter: "04-finance-and-restrictions",
    explain:
      "A real ledger, not a spreadsheet. Every charge, payment and refund is recorded against the right account.",
    narration:
      "Finance is a real ledger, not a spreadsheet. Every charge, payment and refund is recorded against the right account. You can see each unit's balance, the site's income and expenses, and export reports for accounting.",
    comingSoon: [],
    steps: [
      ["settle"],
      ["scrollTo", 0.4, 2200],
      ["mouseTour"],
      ["scrollTo", 0.65, 1500],
    ],
  },
  {
    id: "S07",
    feature: "Payments, deposits and debt restrictions",
    role: "accountant",
    route: "/dashboard/finance",
    viewport: desktop,
    status: "ready_for_uat",
    chapter: "04-finance-and-restrictions",
    explain:
      "Hold a deposit, settle it at checkout, and apply debt-based restrictions. Actions are guarded and logged for audit.",
    narration:
      "Payments and deposits are controlled. The system can hold a deposit, settle it at checkout, and apply debt-based restrictions — for example limiting a service or booking when an account is overdue. These actions are guarded and logged for audit.",
    comingSoon: [
      "Live card and bank-transfer collection through a payment provider is activated after the provider and accounting/legal review (Phase 7/13).",
    ],
    steps: [
      ["settle"],
      ["scrollTo", 0.8, 2400],
      ["mouseTour"],
      ["wait", 900],
    ],
  },
  {
    id: "S08",
    feature: "Service catalogue and service orders",
    role: "manager",
    route: "/dashboard/tickets",
    viewport: desktop,
    status: "ready_for_uat",
    chapter: "05-services-and-staff",
    explain:
      "Services have prices and SLAs. Pick a service, the system checks the account, takes the charge, and creates a ticket.",
    narration:
      "Services run on a catalogue with prices and SLAs. A resident or manager picks a service, the system checks the account, takes the charge, and creates a ticket. That ticket becomes a task assigned to the right team.",
    comingSoon: [],
    steps: [
      ["settle"],
      ["scrollTo", 0.3, 1800],
      ["openMenu", "button[aria-label*='servis aksiyonlari'], button[aria-label*='service actions']"],
      [
        "clickAndVerify",
        "button[aria-label*='siparisi hazirla'], button[aria-label*='order']",
        "button[data-state='success'][aria-label*='siparisi hazirla'], button[data-state='success'][aria-label*='order']",
      ],
      ["wait", 1400],
      ["scrollTo", 0.5, 1400],
    ],
  },
  {
    id: "S09",
    feature: "Staff tasks, SLA and media proof",
    role: "staff",
    route: "/dashboard/tickets",
    viewport: desktop,
    status: "ready_for_uat",
    chapter: "05-services-and-staff",
    explain:
      "Staff see only their assigned tasks with priority and an SLA clock, and upload photo/video proof when done.",
    narration:
      "Staff see only their assigned tasks, with priority and an SLA clock. When the work is done, they upload photo or video proof from their phone. The manager sees completion and the SLA status, so nothing is forgotten.",
    comingSoon: [],
    steps: [
      ["settle"],
      ["scrollTo", 0.35, 1900],
      ["mouseTour"],
      ["scrollTo", 0.6, 1400],
    ],
  },
  {
    id: "S10",
    feature: "Bookings, move-in and checkout",
    role: "manager",
    route: "/dashboard/calendar",
    viewport: desktop,
    status: "ready_for_uat",
    chapter: "05-services-and-staff",
    explain:
      "Availability, booking, deposit hold, move-in tasks and checkout settlement in one connected flow.",
    narration:
      "Bookings tie everything together: availability, reservation, deposit hold, move-in tasks and checkout settlement. The calendar shows what is happening across the site day by day.",
    comingSoon: [
      "The full move-in and checkout workflow with automatic access activation is completed in Phase 10 UAT before production use.",
    ],
    steps: [
      ["settle"],
      ["scrollTo", 0.3, 1800],
      ["mouseTour"],
      ["wait", 900],
    ],
  },
  {
    id: "S11",
    feature: "Communication, notifications and documents",
    role: "manager",
    route: "/dashboard/communications",
    viewport: desktop,
    status: "ready_for_uat",
    chapter: "05-services-and-staff",
    explain:
      "Resident-to-management chat, internal team chat, and multilingual notification templates.",
    narration:
      "Communication is built in: resident-to-management chat, internal team chat, and notifications by email, SMS or push. Multilingual templates keep messages consistent across Turkish, English, German and Russian.",
    comingSoon: [
      "Live email, SMS and push delivery runs in simulation mode until the messaging providers are connected (Phase 11/13).",
    ],
    steps: [
      ["settle"],
      ["scrollTo", 0.35, 1900],
      ["mouseTour"],
      ["scrollTo", 0.6, 1400],
    ],
  },
  {
    id: "S12",
    feature: "Documents and compliance",
    role: "manager",
    route: "/dashboard/documents",
    viewport: desktop,
    status: "ready_for_uat",
    chapter: "05-services-and-staff",
    explain:
      "Contracts, statements and reports stored with role-based access and document packets.",
    narration:
      "Documents are organised in one place — contracts, statements and reports — with role-based access so each person only opens what they are allowed to. Compliance items are tracked alongside the records they belong to.",
    comingSoon: [
      "Production storage bucket, retention rules and virus scanning are confirmed with the customer before launch.",
    ],
    steps: [
      ["settle"],
      ["scrollTo", 0.4, 2000],
      ["mouseTour"],
      ["wait", 900],
    ],
  },
  {
    id: "S13",
    feature: "Reports and analytics",
    role: "manager",
    route: "/dashboard/reports",
    viewport: desktop,
    status: "ready_for_uat",
    chapter: "05-services-and-staff",
    explain:
      "Debt lists, financial reports, service reports, staff performance and daily cash flow.",
    narration:
      "Reporting turns the data into decisions: debt lists, financial reports, service performance, staff activity and daily cash flow. Managers and owners see the numbers they are allowed to see, ready to export.",
    comingSoon: [],
    steps: [
      ["settle"],
      ["scrollTo", 0.45, 2200],
      ["mouseTour"],
      ["scrollTo", 0.7, 1500],
    ],
  },
  {
    id: "S14",
    feature: "AI assistant and AI risk highlights",
    role: "manager",
    route: "/dashboard",
    viewport: desktop,
    status: "ready_for_uat",
    chapter: "06-roadmap-phase-10-15",
    explain:
      "AI daily briefing, debt-risk summaries, service triage and report drafts — as guarded suggestions, never sensitive actions.",
    narration:
      "An AI layer helps managers work faster: a daily briefing, debt-risk summaries, service triage and report drafts. The AI suggests and explains in the user's own language, but it never performs sensitive financial or access actions on its own — a person always approves.",
    comingSoon: [
      "Advanced AI automation (anomaly detection at scale, predictive maintenance) is expanded in Phase 14 with governance review.",
    ],
    steps: [
      ["settle"],
      ["scrollTo", 0.55, 2200],
      ["mouseTour"],
      ["wait", 900],
    ],
  },
  {
    id: "S15",
    feature: "Mobile web / PWA and offline-safe",
    role: "staff",
    route: "/dashboard/offline",
    viewport: mobile,
    status: "ready_for_uat",
    chapter: "06-roadmap-phase-10-15",
    explain:
      "One installable web app that works fast on a phone and stays safe offline by queuing actions.",
    narration:
      "The platform is mobile-first as an installable web app. Staff and residents use it on a phone, and if the connection drops, actions queue safely and sync when they are back online.",
    comingSoon: [
      "Native iOS and Android apps follow later; the installable web app ships first (Phase 12).",
    ],
    steps: [
      ["settle"],
      ["scrollTo", 0.4, 2000],
      ["wait", 900],
      ["scrollTo", 0.7, 1400],
    ],
  },
  {
    id: "S16",
    feature: "Integrations and settings",
    role: "admin",
    route: "/dashboard/settings",
    viewport: desktop,
    status: "ready_for_uat",
    chapter: "06-roadmap-phase-10-15",
    explain:
      "Where the customer connects payment, bank, SMS, email, access hardware and identity, with a manual fallback for each.",
    narration:
      "Settings is where the platform connects to the outside world — payment, bank, messaging, access hardware and identity. Each connection is ready and shows its status, with a manual fallback so operations never stop while providers are being approved.",
    comingSoon: [
      "Payment/bank, SMS/email, access-card and camera integrations are live placeholders today and are switched on per provider after the customer's decisions and credentials (Phase 13).",
    ],
    steps: [
      ["settle"],
      ["scrollTo", 0.4, 2000],
      ["mouseTour"],
      ["wait", 900],
    ],
  },
  {
    id: "S17",
    feature: "Roadmap Phase 10–15 and closing",
    role: "manager",
    route: "/dashboard",
    viewport: desktop,
    status: "live",
    chapter: "06-roadmap-phase-10-15",
    explain:
      "The on-screen phase map: what is foundation-complete today and what is coming next, through launch.",
    narration:
      "On the roadmap: bookings and checkout depth, deeper external integrations, the full AI premium layer, and final launch hardening — Phases 10 through 15. Today you have a complete management foundation; next, it grows into a full premium platform. That is 1Çatı: units, people, finance, services and decisions in one place. Explore the interactive demo to try it yourself.",
    comingSoon: [
      "Phase 15 — final QA, security, performance, UAT, training and go-live — is the last step before production.",
    ],
    steps: [
      ["settle"],
      ["scrollTo", 0.5, 2200],
      ["openDisclosure"],
      ["wait", 1200],
      ["scrollTo", 0.85, 1600],
    ],
  },
]

// ---------------------------------------------------------------------------
// Action runner — every step here is language-neutral on purpose.
// ---------------------------------------------------------------------------

async function smoothScrollTo(page, fraction, durationMs) {
  await page.evaluate(
    async ({ fraction, durationMs }) => {
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      )
      const target = Math.round(maxScroll * fraction)
      const start = window.scrollY
      const distance = target - start
      const startTime = performance.now()
      const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
      await new Promise((resolve) => {
        function frame(now) {
          const elapsed = Math.min(1, (now - startTime) / durationMs)
          window.scrollTo(0, start + distance * ease(elapsed))
          if (elapsed < 1) requestAnimationFrame(frame)
          else resolve()
        }
        requestAnimationFrame(frame)
      })
    },
    { fraction, durationMs }
  )
}

async function mouseTour(page, viewport) {
  const points = [
    [viewport.width * 0.3, viewport.height * 0.35],
    [viewport.width * 0.62, viewport.height * 0.42],
    [viewport.width * 0.5, viewport.height * 0.6],
    [viewport.width * 0.4, viewport.height * 0.45],
  ]
  for (const [x, y] of points) {
    await page.mouse.move(Math.round(x), Math.round(y), { steps: 18 })
    await page.waitForTimeout(450)
  }
}

async function firstVisibleLocator(page, selector) {
  const locator = page.locator(selector)
  const count = await locator.count().catch(() => 0)

  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index)
    if (await item.isVisible().catch(() => false)) {
      return item
    }
  }

  return locator.first()
}

async function runStep(page, viewport, step) {
  const [type, a, b] = step
  try {
    switch (type) {
      case "settle":
        await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {})
        await page.waitForTimeout(900)
        break
      case "wait":
        await page.waitForTimeout(a ?? 800)
        break
      case "scrollTo":
        await smoothScrollTo(page, typeof a === "number" ? a : 0.5, b ?? 1800)
        await page.waitForTimeout(500)
        break
      case "mouseTour":
        await mouseTour(page, viewport)
        break
      case "hover":
        await (await firstVisibleLocator(page, a)).hover({ timeout: 4000 })
        await page.waitForTimeout(600)
        break
      case "click": {
        await (await firstVisibleLocator(page, a)).click({ timeout: 4000 })
        await page.waitForTimeout(900)
        break
      }
      case "clickAndVerify": {
        await (await firstVisibleLocator(page, a)).click({ timeout: 4000 })
        await page.locator(b).first().waitFor({ state: "visible", timeout: 4000 })
        await page.waitForTimeout(900)
        break
      }
      case "openMenu": {
        await (await firstVisibleLocator(page, a)).click({ timeout: 4000 })
        await page.locator('[role="menu"]').first().waitFor({ state: "visible", timeout: 4000 })
        await page.waitForTimeout(500)
        break
      }
      case "openDisclosure":
        await page
          .locator("[data-testid='module-status-disclosure'] > summary")
          .first()
          .click({ timeout: 4000 })
        await page.waitForTimeout(700)
        break
      default:
        return `unknown step: ${JSON.stringify(step)}`
    }
  } catch (error) {
    return `step ${JSON.stringify(step)} skipped: ${String(error?.message ?? error)}`
  }

  return null
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

async function recordScene(browser, locale, scene) {
  const viewport = scene.viewport
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    locale,
    recordVideo: skipVideo ? undefined : { dir: clipsDir, size: viewport },
  })

  await context.addCookies([
    { url: baseUrl, name: "access_profile_role", value: scene.role },
  ])

  const page = await context.newPage()
  const issues = []
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    const text = message.text()
    const realtimeFallback =
      text.includes("/realtime/v1/websocket") &&
      text.includes("ERR_CONNECTION_REFUSED")
    if (message.type() === "error" && !realtimeFallback) {
      issues.push(`console: ${text}`)
    }
  })

  const target = `${baseUrl}/${locale}${scene.route}`
  await page.goto(target, { waitUntil: "networkidle", timeout: 60000 }).catch((error) => {
    issues.push(`goto: ${String(error?.message ?? error)}`)
  })
  await page.waitForTimeout(800)

  for (const step of scene.steps) {
    const stepIssue = await runStep(page, viewport, step)
    if (stepIssue) {
      issues.push(stepIssue)
    }
  }
  await page.waitForTimeout(700)

  let savedClip = null
  if (!skipVideo) {
    const video = page.video()
    await context.close() // finalises the video file
    if (video) {
      const rawPath = await video.path().catch(() => null)
      if (rawPath) {
        savedClip = path.join(
          clipsDir,
          `1cati-master-${scene.id}-${locale}.webm`
        )
        fs.renameSync(rawPath, savedClip)
      }
    }
  } else {
    await context.close()
  }

  const status = issues.length ? "issues" : "ok"
  console.log(
    `  ${scene.id} ${locale} [${scene.role}] ${scene.route} -> ${status}` +
      (savedClip ? ` (${path.basename(savedClip)})` : "")
  )
  return { clip: savedClip ? path.basename(savedClip) : null, issues }
}

// ---------------------------------------------------------------------------
// Guide + manifest generation
// ---------------------------------------------------------------------------

const statusBadge = {
  live: "LIVE",
  ready_for_uat: "READY FOR UAT",
  coming_soon: "COMING SOON",
}

function buildScriptMarkdown(activeScenes) {
  const lines = []
  lines.push("# 1Çatı Demo Center — Recording & Narration Guide (auto-generated)")
  lines.push("")
  lines.push(
    "Master narration is in English. Turkish, German and Russian follow the same meaning, scene by scene, using the shared glossary in the demo-center plan."
  )
  lines.push("")
  lines.push(`Languages: ${locales.join(", ").toUpperCase()}`)
  lines.push(`Base URL: ${baseUrl}`)
  lines.push("")
  lines.push("Legend: **LIVE** = working today · **READY FOR UAT** = built, pending UAT/providers · **COMING SOON** = not yet activated.")
  lines.push("")

  for (const scene of activeScenes) {
    lines.push(`## ${scene.id} — ${scene.feature}  \`${statusBadge[scene.status]}\``)
    lines.push("")
    lines.push(`- Role: \`${scene.role}\`  ·  Route: \`/{locale}${scene.route}\`  ·  Chapter: \`${scene.chapter}\``)
    lines.push(`- What the viewer sees: ${scene.explain}`)
    lines.push("")
    lines.push(`> ${scene.narration}`)
    lines.push("")
    if (scene.comingSoon.length) {
      lines.push("**Coming soon (say this honestly on screen):**")
      for (const item of scene.comingSoon) lines.push(`- ${item}`)
      lines.push("")
    }
  }

  lines.push("---")
  lines.push("")
  lines.push("## Coming-soon summary (all features not yet activated)")
  lines.push("")
  for (const scene of activeScenes) {
    for (const item of scene.comingSoon) {
      lines.push(`- (${scene.id} ${scene.feature}) ${item}`)
    }
  }
  lines.push("")
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const activeScenes = onlyScenes.length
    ? scenes.filter((scene) => onlyScenes.includes(scene.id))
    : scenes

  fs.mkdirSync(outputDir, { recursive: true })
  if (!skipVideo) fs.mkdirSync(clipsDir, { recursive: true })

  // Always (re)write the human guide + manifest so they stay in sync with scenes.
  fs.writeFileSync(
    path.join(outputDir, "demo-script.md"),
    buildScriptMarkdown(activeScenes),
    "utf8"
  )

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    locales,
    chapters: [...new Set(scenes.map((scene) => scene.chapter))],
    scenes: activeScenes.map((scene) => ({
      id: scene.id,
      feature: scene.feature,
      role: scene.role,
      route: scene.route,
      viewport: scene.viewport === mobile ? "mobile" : "desktop",
      status: scene.status,
      chapter: scene.chapter,
      explain: scene.explain,
      narration: scene.narration,
      comingSoon: scene.comingSoon,
      clips: locales.map((locale) => `1cati-master-${scene.id}-${locale}.webm`),
    })),
    recordings: [],
  }

  if (skipVideo) {
    fs.writeFileSync(
      path.join(outputDir, "demo-manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf8"
    )
    console.log(
      `Guide-only mode: wrote demo-script.md and demo-manifest.json to ${outputDir} (no video).`
    )
    return
  }

  const browser = await chromium.launch()
  try {
    for (const locale of locales) {
      console.log(`\nRecording locale: ${locale.toUpperCase()}`)
      for (const scene of activeScenes) {
        const result = await recordScene(browser, locale, scene)
        manifest.recordings.push({
          scene: scene.id,
          locale,
          clip: result.clip,
          issues: result.issues,
        })
      }
    }
  } finally {
    await browser.close()
  }

  fs.writeFileSync(
    path.join(outputDir, "demo-manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  )

  const withIssues = manifest.recordings.filter((r) => r.issues.length)
  console.log(
    `\nDone. ${manifest.recordings.length} clips across ${locales.length} languages -> ${clipsDir}`
  )
  if (withIssues.length) {
    console.log(`Note: ${withIssues.length} clip(s) logged page issues; review demo-manifest.json.`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
