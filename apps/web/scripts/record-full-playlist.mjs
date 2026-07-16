import { chromium } from "@playwright/test"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"

const cliArgs = process.argv.slice(2)
const hasFlag = (name) => cliArgs.includes(name)
const argValue = (name) => {
  const prefix = `${name}=`
  const inline = cliArgs.find((item) => item.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = cliArgs.indexOf(name)
  return index >= 0 ? cliArgs[index + 1] : undefined
}

const baseUrl = argValue("--base-url") ?? process.env.VIDEO_RECORD_BASE_URL ?? "http://127.0.0.1:3020"
const locales = (argValue("--locales") ?? process.env.VIDEO_RECORD_LOCALES ?? "de")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
const outputDir =
  argValue("--output") ?? process.env.VIDEO_RECORD_OUTPUT_DIR ?? "../../qa_output/full-playlist-recordings"
const rawDir = path.join(outputDir, ".raw")
const reviewDir = path.join(outputDir, "review")
const clipsDir = path.join(outputDir, "clips")
const onlyVideos = (argValue("--only") ?? process.env.VIDEO_RECORD_ONLY ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => item.padStart(2, "0"))
const skipVideo = process.env.VIDEO_RECORD_SKIP_VIDEO === "1" || hasFlag("--skip-video")
const retryCount = Number.parseInt(process.env.VIDEO_RECORD_RETRIES ?? "1", 10)
const fullTiming = process.env.VIDEO_RECORD_FULL_TIMING === "1" || hasFlag("--full-timing")
const showLabels = process.env.VIDEO_RECORD_SHOW_LABELS === "1" || hasFlag("--show-labels")

const desktop = { width: 1920, height: 1080 }
const mobileViewport = { width: 390, height: 844 }
const mobileVideoSource = { width: 430, height: 764 }
const mobilePortrait = { width: 1080, height: 1920 }

const common = {
  dashboard: [
    ["settle", 1100],
    ["spotlight", "[data-testid='dashboard-topbar']", "Live role, language and sync state"],
    ["tour"],
    ["scroll", 0.34, 1800],
    ["spotlight", "[data-testid='module-status-disclosure']", "Phase and delivery status"],
    ["scroll", 0.62, 1800],
  ],
  unitMatrix: [
    ["settle", 1100],
    ["spotlight", "main", "Block, floor and unit view"],
    ["scroll", 0.2, 1500],
    ["hover", "button[aria-label*='Daire detay'], button[aria-label*='Unit detail'], button[aria-label*='A-001']"],
    ["click", "button[aria-label*='A-001'], button[aria-label*='A-006'], button[aria-label*='Daire detay'], button[aria-label*='Unit detail']"],
    ["wait", 1000],
    ["scroll", 0.48, 1500],
  ],
  table: [
    ["settle", 1000],
    ["spotlight", "main", "Searchable, auditable workspace"],
    ["scroll", 0.32, 1600],
    ["hover", "main table tbody tr, [data-testid='data-table']"],
    ["tour"],
    ["scroll", 0.64, 1600],
  ],
}

const ceo = {
  dashboard: [
    ["settle", 1500],
    ["spotlight", "[data-testid='dashboard-topbar']", "Role, language and sync state"],
    ["wait", 7000],
    ["tour"],
    ["scroll", 0.18, 6000],
    ["spotlight", "[data-testid='module-status-disclosure']", "Live, UAT and provider readiness"],
    ["wait", 9000],
    ["openDashboardAi"],
    ["wait", 9000],
    ["scroll", 0.48, 6000],
    ["tour"],
    ["wait", 9000],
    ["scroll", 0.72, 6000],
    ["wait", 9000],
  ],
  listings: [
    ["settle", 1500],
    ["spotlight", "main", "Blocks, floors and unit matrix"],
    ["wait", 8000],
    ["scroll", 0.18, 6000],
    ["hover", "button[aria-label*='Daire detay'], button[aria-label*='Unit detail'], button[aria-label*='A-001']"],
    ["click", "button[aria-label*='A-001'], button[aria-label*='A-006'], button[aria-label*='Daire detay'], button[aria-label*='Unit detail']"],
    ["wait", 10000],
    ["spotlight", "main", "Owner, resident, debt and service context"],
    ["scroll", 0.42, 6000],
    ["tour"],
    ["wait", 10000],
    ["scroll", 0.68, 6000],
    ["wait", 9000],
  ],
  finance: [
    ["settle", 1500],
    ["spotlight", "main", "Ledger, balances and open debt"],
    ["wait", 8000],
    ["scroll", 0.2, 6000],
    ["hover", "a[href='#finance-accounts'], button[aria-label*='Finans'], button[aria-label*='Finance'], button[aria-label*='Mutabakat'], button[aria-label*='Reconciliation']"],
    ["click", "a[href='#finance-accounts'], button[aria-label*='Finans defteri aksiyonlari'], button[aria-label*='Finance ledger actions'], button[aria-label*='Mutabakat'], button[aria-label*='Reconciliation']"],
    ["wait", 10000],
    ["spotlight", "main", "Payments, deposits, approvals and restrictions"],
    ["scroll", 0.48, 6000],
    ["tour"],
    ["wait", 10000],
    ["scroll", 0.72, 6000],
    ["wait", 9000],
  ],
  tickets: [
    ["settle", 1500],
    ["spotlight", "main", "Emergency routes and ticket queue"],
    ["wait", 8000],
    ["scroll", 0.22, 6000],
    ["hover", "main table tbody tr, main article, [data-testid='data-table']"],
    ["wait", 10000],
    ["spotlight", "main", "SLA, assignment, cost, evidence and approval"],
    ["scroll", 0.52, 6000],
    ["tour"],
    ["wait", 10000],
    ["scroll", 0.76, 6000],
    ["wait", 9000],
  ],
  reports: [
    ["settle", 1500],
    ["spotlight", "main", "Management analytics and risk signals"],
    ["wait", 8000],
    ["hover", "main table tbody tr, [data-testid='data-table'], main button"],
    ["scroll", 0.26, 6000],
    ["spotlight", "main", "Report register and exports"],
    ["wait", 10000],
    ["scroll", 0.52, 6000],
    ["tour"],
    ["wait", 10000],
    ["scroll", 0.78, 6000],
    ["wait", 9000],
  ],
  settings: [
    ["settle", 1500],
    ["spotlight", "main", "Provider readiness and integrations"],
    ["wait", 8000],
    ["scroll", 0.24, 6000],
    ["hover", "main button, main article, main table tbody tr"],
    ["spotlight", "main", "API keys, contracts and production boundary"],
    ["wait", 10000],
    ["scroll", 0.5, 6000],
    ["tour"],
    ["wait", 10000],
    ["scroll", 0.76, 6000],
    ["wait", 9000],
  ],
}

const chapters = [
  {
    id: "01",
    slug: "pitch-video-1cati-in-90-sekunden",
    title: "Pitch video - 1Cati in 90 seconds",
    targetMinutes: 1.5,
    viewport: desktop,
    role: "manager",
    segments: [
      {
        route: "/pitch",
        label: "1Cati in 90 seconds",
        caption: "Business value first: platform, roles, AI and operating model.",
        steps: [
          ["settle", 1300],
          ["spotlight", "[data-testid='demo-offer-price']", "Clear commercial model"],
          ["scroll", 0.32, 1500],
          ["spotlight", "[data-testid='demo-role-grid']", "Role-based demo paths"],
          ["scroll", 0.72, 1500],
        ],
      },
      {
        route: "/dashboard",
        label: "The operating center",
        caption: "One workspace for units, finance, service, documents and AI.",
        steps: common.dashboard,
      },
    ],
  },
  {
    id: "02",
    slug: "ceo-management-walkthrough",
    title: "CEO / management walkthrough",
    targetMinutes: 9,
    viewport: desktop,
    role: "manager",
    segments: [
      { route: "/dashboard", label: "Control center", caption: "Daily KPIs, live status, phase readiness and AI risk support.", steps: ceo.dashboard },
      { route: "/dashboard/listings", label: "Portfolio control", caption: "Blocks, floors, apartments, owners, residents, debt and service context.", steps: ceo.listings },
      { route: "/dashboard/finance", label: "Finance visibility", caption: "Ledger, balances, payments, deposits, approvals and guarded restrictions.", role: "accountant", steps: ceo.finance },
      { route: "/dashboard/tickets", label: "Service operations", caption: "Tickets, SLA, assignment, field proof and human approval boundaries.", steps: ceo.tickets },
      { route: "/dashboard/reports", label: "Management reports", caption: "Decision-ready analytics, exports, risks and role-scoped reporting.", steps: ceo.reports },
      { route: "/dashboard/settings", label: "UAT and provider boundary", caption: "External providers, API keys, contracts and production approvals stay separated.", role: "admin", steps: ceo.settings },
    ],
  },
  {
    id: "03",
    slug: "training-00-orientierung-fuer-zuschauer",
    title: "Training 00 - viewer orientation",
    targetMinutes: 3.5,
    viewport: desktop,
    role: "manager",
    segments: [
      { route: "/videos", label: "Playlist orientation", caption: "Target groups, language slots and expected structure.", steps: [["settle", 1100], ["spotlight", "main", "Video playlist by audience"], ["scroll", 0.35, 1600], ["hover", "article"], ["scroll", 0.78, 1600]] },
      { route: "/dashboard", label: "Where the training happens", caption: "Every chapter maps to a real app area.", steps: common.dashboard },
    ],
  },
  {
    id: "04",
    slug: "training-01-login-rollen-datenschutz",
    title: "Training 01 - login, roles and privacy",
    targetMinutes: 5,
    viewport: desktop,
    role: "manager",
    segments: [
      {
        route: "/login",
        fullTimingRoute: "/dashboard",
        label: "QA demo role switcher",
        caption: "The local role picker is only for demos and QA; production users receive their assigned role after real authentication.",
        steps: [
          ["settle", 1300],
          ["spotlight", "main", "Secure login and QA profile boundary"],
          ["click", "[data-testid='demo-full-access']"],
          ["waitForSelector", "[data-testid='demo-role-menu']"],
          ["spotlight", "[data-testid='demo-role-menu']", "Six demo roles for RBAC testing"],
          ["hover", "[data-testid='demo-role-option-admin']"],
          ["hover", "[data-testid='demo-role-option-manager']"],
          ["hover", "[data-testid='demo-role-option-accountant']"],
          ["hover", "[data-testid='demo-role-option-staff']"],
          ["hover", "[data-testid='demo-role-option-owner']"],
          ["hover", "[data-testid='demo-role-option-tenant']"],
          ["click", "[data-testid='demo-role-option-manager']"],
          ["waitForPath", "/dashboard"],
          ["spotlight", "[data-testid='dashboard-topbar']", "Manager role is active"],
          ["spotlight", "aside", "Manager sees operational modules"],
          ["tour"],
        ],
      },
      {
        route: "/login?next=/dashboard/finance",
        fullTimingRoute: "/dashboard/finance",
        label: "Accounting role",
        caption: "Accounting enters through the same QA switcher, but lands on finance-focused permissions.",
        role: "accountant",
        steps: [
          ["settle", 900],
          ["click", "[data-testid='demo-full-access']"],
          ["waitForSelector", "[data-testid='demo-role-menu']"],
          ["click", "[data-testid='demo-role-option-accountant']"],
          ["waitForPath", "/dashboard/finance"],
          ["spotlight", "[data-testid='dashboard-topbar']", "Accounting role is active"],
          ["spotlight", "main", "Finance modules are visible"],
          ["scroll", 0.34, 1800],
          ["hover", "main table tbody tr, [data-testid='data-table'], main button"],
        ],
      },
      {
        route: "/login?next=/dashboard/tickets",
        fullTimingRoute: "/dashboard/tickets",
        label: "Staff role",
        caption: "Field staff sees assigned service work and evidence flow, not finance ledgers or administration.",
        role: "staff",
        steps: [
          ["settle", 900],
          ["click", "[data-testid='demo-full-access']"],
          ["waitForSelector", "[data-testid='demo-role-menu']"],
          ["click", "[data-testid='demo-role-option-staff']"],
          ["waitForPath", "/dashboard/tickets"],
          ["spotlight", "[data-testid='dashboard-topbar']", "Staff role is active"],
          ["spotlight", "aside", "Staff sidebar is narrower"],
          ["spotlight", "main", "Service work is available"],
          ["scroll", 0.38, 1800],
        ],
      },
      {
        route: "/login?next=/dashboard",
        fullTimingRoute: "/dashboard",
        label: "Owner and tenant boundary",
        caption: "Owners and tenants are limited to their own unit context, documents, requests and communication.",
        role: "owner",
        steps: [
          ["settle", 900],
          ["click", "[data-testid='demo-full-access']"],
          ["waitForSelector", "[data-testid='demo-role-menu']"],
          ["click", "[data-testid='demo-role-option-owner']"],
          ["waitForPath", "/dashboard"],
          ["spotlight", "[data-testid='dashboard-topbar']", "Owner role is active"],
          ["spotlight", "aside", "Owner access is limited"],
          ["tour"],
        ],
      },
    ],
  },
  {
    id: "05",
    slug: "training-02-dashboard-tagessteuerung",
    title: "Training 02 - dashboard daily control",
    targetMinutes: 4,
    viewport: desktop,
    role: "manager",
    segments: [{ route: "/dashboard", label: "Daily control dashboard", caption: "KPIs, phase map, events, AI highlights and operational focus.", steps: common.dashboard }],
  },
  {
    id: "06",
    slug: "training-03-einheiten-bloecke-wohnungsmatrix",
    title: "Training 03 - units, blocks and apartment matrix",
    targetMinutes: 5,
    viewport: desktop,
    role: "manager",
    segments: [{ route: "/dashboard/listings", label: "Unit matrix", caption: "Blocks, floors, apartments, ownership, debt and service signals.", steps: common.unitMatrix }],
  },
  {
    id: "07",
    slug: "training-04-menschen-eigentuemer-mieter-personal",
    title: "Training 04 - people, owners, tenants and staff",
    targetMinutes: 4,
    viewport: desktop,
    role: "admin",
    segments: [
      { route: "/dashboard/users", label: "People and roles", caption: "Owners, tenants, staff, language and permission scope.", steps: common.table },
      { route: "/dashboard/leads", label: "Resident and buyer context", caption: "Communication preference, debt, service and activity context.", steps: common.table },
    ],
  },
  {
    id: "08",
    slug: "training-05-service-tickets-sla-aufgaben",
    title: "Training 05 - service tickets, SLA and tasks",
    targetMinutes: 6.5,
    viewport: desktop,
    role: "manager",
    segments: [
      {
        route: "/dashboard/tickets",
        label: "Service desk",
        caption: "Emergency routes, service catalogue, SLA, task ownership and evidence.",
        steps: [
          ["settle", 1200],
          ["spotlight", "main", "Emergency routes and service queue"],
          ["scroll", 0.22, 1800],
          ["spotlight", "main", "Catalogue, SLA and approval signals"],
          ["hover", "main table tbody tr, main article, [data-testid='data-table']"],
          ["scroll", 0.52, 1800],
          ["spotlight", "main", "Field tasks, media proof and SLA"],
          ["scroll", 0.78, 1800],
        ],
      },
      {
        route: "/new-level-premium",
        label: "Premium services",
        caption: "Spa, restaurant, theatre, tours and mini club are part of the service model.",
        steps: [
          ["settle", 1300],
          ["scrollText", "Premium servisler", 2000],
          ["spotlight", "main", "Premium services in one flow"],
          ["hover", "main article, main img"],
          ["tour"],
          ["scroll", 0.58, 1700],
        ],
      },
    ],
  },
  {
    id: "09",
    slug: "training-06-kalender-reservierung-checkin-checkout",
    title: "Training 06 - calendar, reservation, check-in and checkout",
    targetMinutes: 4,
    viewport: desktop,
    role: "manager",
    segments: [{ route: "/dashboard/calendar", label: "Calendar and booking flow", caption: "Reservation, move-in readiness, checkout and deposit settlement.", steps: common.table }],
  },
  {
    id: "10",
    slug: "training-07-finanzen-zahlungen-kautionen-sperren",
    title: "Training 07 - finance, payments, deposits and restrictions",
    targetMinutes: 6,
    viewport: desktop,
    role: "accountant",
    segments: [
      {
        route: "/dashboard/finance",
        label: "Finance controls",
        caption: "Ledger, dues, payments, deposits, refunds and guarded restrictions.",
        steps: [
          ["settle", 1200],
          ["spotlight", "main", "Finance ledger"],
          ["scroll", 0.24, 1800],
          ["spotlight", "main", "Open debt and collection status"],
          ["click", "a[href='#finance-accounts']"],
          ["wait", 800],
          ["hover", "main table tbody tr, [data-testid='data-table']"],
          ["spotlight", "main", "Payment, deposit and restriction records"],
          ["scroll", 0.72, 1800],
        ],
      },
    ],
  },
  {
    id: "11",
    slug: "training-08-dokumente-uploads-nachweise",
    title: "Training 08 - documents, uploads and evidence",
    targetMinutes: 4,
    viewport: desktop,
    role: "manager",
    segments: [{ route: "/dashboard/documents", label: "Document center", caption: "Contracts, statements, service proof and role-based access.", steps: common.table }],
  },
  {
    id: "12",
    slug: "training-09-kommunikation-benachrichtigungen",
    title: "Training 09 - communication and notifications",
    targetMinutes: 4,
    viewport: desktop,
    role: "manager",
    segments: [{ route: "/dashboard/communications", label: "Communication center", caption: "Inbox, team chat, templates, language and delivery state.", steps: common.table }],
  },
  {
    id: "13",
    slug: "training-10-zugang-compliance-audit",
    title: "Training 10 - access, compliance and audit",
    targetMinutes: 4,
    viewport: desktop,
    role: "manager",
    segments: [
      { route: "/dashboard/compliance", label: "Compliance and audit", caption: "Access, legal checks, identity state and audit-ready decisions.", steps: common.table },
      { route: "/dashboard/settings", label: "Provider boundary", caption: "Access hardware and external systems stay provider-dependent until approved.", steps: [["settle", 1000], ["scroll", 0.44, 1600], ["spotlight", "main", "Provider readiness"], ["tour"]] },
    ],
  },
  {
    id: "14",
    slug: "training-11-reports-management-auswertungen",
    title: "Training 11 - reports and management analytics",
    targetMinutes: 4,
    viewport: desktop,
    role: "manager",
    segments: [{ route: "/dashboard/reports", label: "Reports and analytics", caption: "Debt, service, staff, cash flow and management exports.", steps: common.table }],
  },
  {
    id: "15",
    slug: "training-12-ki-assistent-ki-grenzen",
    title: "Training 12 - AI assistant and AI limits",
    targetMinutes: 5.5,
    viewport: desktop,
    role: "manager",
    segments: [
      { route: "/dashboard", label: "Internal AI assistant", caption: "AI drafts and explains; finance/access decisions need human approval.", steps: [["settle", 1000], ["scroll", 0.56, 1600], ["spotlight", "main", "AI decision support"], ["openDashboardAi"], ["wait", 1200]] },
      { route: "/new-level-premium", label: "Public AI concierge", caption: "Public AI answers product questions but refuses private data.", steps: [["settle", 1300], ["openPublicAi"], ["wait", 1200], ["scroll", 0.55, 1500]] },
    ],
  },
  {
    id: "16",
    slug: "training-13-mobile-web-pwa-offline-queue",
    title: "Training 13 - mobile web, PWA and offline queue",
    targetMinutes: 4,
    viewport: mobileVideoSource,
    captureSize: mobilePortrait,
    upscaleMobileSource: true,
    role: "staff",
    mobile: true,
    segments: [{ route: "/dashboard/offline", label: "Mobile / PWA / offline-safe queue", caption: "Installable web app, safe cache and guarded offline workflow.", steps: [["settle", 1300], ["spotlight", "main", "Mobile-first operations"], ["scroll", 0.3, 1600], ["tap", 196, 620], ["scroll", 0.66, 1600]] }],
  },
  {
    id: "17",
    slug: "training-14-einstellungen-integrationen",
    title: "Training 14 - settings and integrations",
    targetMinutes: 4,
    viewport: desktop,
    role: "admin",
    segments: [{ route: "/dashboard/settings", label: "Settings and integrations", caption: "Payment, bank, SMS, email, access and identity provider readiness.", steps: common.table }],
  },
  {
    id: "18",
    slug: "training-15-new-level-premium-journey",
    title: "Training 15 - New Level Premium public journey",
    targetMinutes: 5.5,
    viewport: desktop,
    role: "manager",
    segments: [
      { route: "/new-level-premium", label: "New Level Premium journey", caption: "Public owner, tenant and staff entry into 1Cati.", steps: [["settle", 1300], ["spotlight", "main", "Public property page"], ["scroll", 0.24, 1700], ["scrollText", "Premium-Services", 1700], ["tour"], ["scrollText", "Zugang", 1700], ["scroll", 0.86, 1700]] },
      { route: "/new-level-premium", label: "Public AI and reporting", caption: "AI concierge, registration, public report and handoff.", steps: [["openPublicAi"], ["wait", 1300], ["scroll", 0.92, 1500]] },
    ],
  },
  {
    id: "19",
    slug: "training-16-abschluss-live-uat-freigabe",
    title: "Training 16 - closing, live/UAT and approval",
    targetMinutes: 3,
    viewport: desktop,
    role: "manager",
    segments: [
      { route: "/dashboard", label: "Live, UAT and provider boundary", caption: "What works today, what needs approval, and what comes before go-live.", steps: [["settle", 1000], ["scroll", 0.5, 1700], ["spotlight", "[data-testid='module-status-disclosure']", "Phase status and launch boundary"], ["scroll", 0.84, 1600]] },
      { route: "/videos", label: "Video library handoff", caption: "Playlist, language versions and production slots for customer training.", steps: [["settle", 900], ["spotlight", "main", "1Cati Presents"], ["scroll", 0.72, 1600]] },
    ],
  },
]

function ensureDirs() {
  fs.mkdirSync(outputDir, { recursive: true })
  fs.mkdirSync(reviewDir, { recursive: true })
  fs.mkdirSync(clipsDir, { recursive: true })
  fs.mkdirSync(rawDir, { recursive: true })
}

function chapterFilename(chapter, locale) {
  const suffix = chapter.mobile ? "1080x1920" : "1080p"
  return `${chapter.id}-${chapter.slug}-${locale}-${suffix}.webm`
}

function captureSizeFor(chapter) {
  return chapter.captureSize ?? chapter.viewport
}

function buildTargetUrl(locale, route) {
  return `${baseUrl}/${locale}${route}`
}

function routeKey(route) {
  return route.split("?")[0]
}

function safeRouteName(route) {
  return route.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "home"
}

function isIgnorableConsole(text) {
  return /favicon|manifest|Failed to load resource|\/realtime\/v1\/websocket|ERR_CONNECTION_REFUSED|net::ERR_ABORTED/i.test(
    text
  )
}

async function installOverlay(page, chapter, segment, locale) {
  await page.evaluate(
    ({ chapter, segment, locale, showLabels }) => {
      document.querySelector("#record-cursor")?.remove()
      document.querySelector("#record-card")?.remove()
      document.querySelector("#record-spotlight")?.remove()
      document.querySelector("#record-style")?.remove()

      const style = document.createElement("style")
      style.id = "record-style"
      style.textContent = `
        @keyframes recordPulse { to { opacity: 0; transform: translate(-50%, -50%) scale(2.7); } }
        @keyframes recordFocus {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(.82); }
          18% { opacity: .86; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.9); }
        }
      `

      const cursor = document.createElement("div")
      cursor.id = "record-cursor"
      cursor.style.cssText = `
        position: fixed;
        left: 52%;
        top: 48%;
        z-index: 2147483647;
        width: 26px;
        height: 26px;
        pointer-events: none;
        transform: translate(-4px, -4px);
        filter: drop-shadow(0 7px 16px rgba(0,0,0,.34));
      `
      cursor.innerHTML = `
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <path d="M6 3.5 25.5 17 16.8 18.2l5.3 8.7-4.2 2.5-5.1-8.6-5.3 6.8L6 3.5Z" fill="#ffffff" stroke="#0f3f3a" stroke-width="1.8"/>
        </svg>
      `

      document.body.append(style, cursor)

      if (showLabels) {
        const card = document.createElement("div")
        card.id = "record-card"
        card.style.cssText = `
          position: fixed;
          left: 24px;
          bottom: 22px;
          z-index: 2147483645;
          max-width: min(440px, calc(100vw - 48px));
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(2, 18, 17, .62);
          color: white;
          border: 1px solid rgba(153, 246, 228, .22);
          box-shadow: 0 14px 38px rgba(0,0,0,.22);
          backdrop-filter: blur(12px);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        `
        card.innerHTML = `
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:rgba(153,246,228,.82);font-weight:800;margin-bottom:4px">
            ${locale.toUpperCase()} / Video ${chapter.id}
          </div>
          <div style="font-weight:820;font-size:17px;line-height:1.15;letter-spacing:0;margin-bottom:3px">${segment.label}</div>
          <div style="font-weight:560;font-size:12px;line-height:1.3;color:rgba(255,255,255,.72);letter-spacing:0">${segment.caption}</div>
        `
        document.body.append(card)
      }
    },
    {
      chapter: { id: chapter.id, title: chapter.title },
      segment: { label: segment.label, caption: segment.caption },
      locale,
      showLabels,
    }
  )
}

async function updateCard(page, title, caption) {
  await page.evaluate(
    ({ title, caption }) => {
      const card = document.querySelector("#record-card")
      if (!card) return
      const titleEl = card.children[1]
      const captionEl = card.children[2]
      if (titleEl) titleEl.textContent = title
      if (captionEl) captionEl.textContent = caption
    },
    { title, caption }
  )
}

async function moveCursor(page, x, y, duration = 650) {
  await page.evaluate(
    ({ x, y, duration }) =>
      new Promise((resolve) => {
        const cursor = document.querySelector("#record-cursor")
        if (!cursor) return resolve()
        cursor.style.transition = `left ${duration}ms cubic-bezier(.2,.8,.2,1), top ${duration}ms cubic-bezier(.2,.8,.2,1)`
        cursor.style.left = `${x}px`
        cursor.style.top = `${y}px`
        window.setTimeout(resolve, duration + 80)
      }),
    { x, y, duration }
  )
}

async function pulse(page, x, y) {
  await page.evaluate(
    ({ x, y }) => {
      const pulseEl = document.createElement("div")
      pulseEl.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        z-index: 2147483646;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 1px solid rgba(20, 184, 166, .72);
        background: rgba(20, 184, 166, .1);
        transform: translate(-50%, -50%) scale(.8);
        pointer-events: none;
        animation: recordPulse 620ms ease-out forwards;
      `
      document.body.append(pulseEl)
      window.setTimeout(() => pulseEl.remove(), 700)
    },
    { x, y }
  )
}

async function locatorFor(page, selector) {
  const locator = page.locator(selector)
  const count = await locator.count().catch(() => 0)
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index)
    if (await candidate.isVisible().catch(() => false)) return candidate
  }
  return locator.first()
}

async function hoverSelector(page, selector) {
  const locator = await locatorFor(page, selector)
  await locator.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {})
  const box = await locator.boundingBox().catch(() => null)
  if (box) {
    await moveCursor(page, box.x + box.width / 2, box.y + box.height / 2, 650)
  }
  await locator.hover({ timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(650)
}

async function clickSelector(page, selector) {
  const locator = await locatorFor(page, selector)
  await locator.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {})
  const box = await locator.boundingBox().catch(() => null)
  if (box) {
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await moveCursor(page, x, y, 520)
    await pulse(page, x, y)
  }
  await locator.click({ timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(900)
}

async function spotlight(page, selector, label) {
  const locator = await locatorFor(page, selector)
  await locator.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {})
  const box = await locator.boundingBox().catch(() => null)
  if (!box) return
  const targetX = box.x + Math.min(box.width - 8, Math.max(12, box.width * 0.72))
  const targetY = box.y + Math.min(box.height - 8, Math.max(12, box.height * 0.5))
  await page.evaluate(
    ({ targetX, targetY }) => {
      document.querySelector("#record-spotlight")?.remove()
      const el = document.createElement("div")
      el.id = "record-spotlight"
      el.style.cssText = `
        position: fixed;
        left: ${targetX}px;
        top: ${targetY}px;
        width: 46px;
        height: 46px;
        z-index: 2147483644;
        pointer-events: none;
        border-radius: 999px;
        border: 1px solid rgba(20,184,166,.42);
        background: radial-gradient(circle, rgba(20,184,166,.16) 0%, rgba(20,184,166,.08) 38%, rgba(20,184,166,0) 72%);
        box-shadow: 0 0 22px rgba(20,184,166,.2);
        animation: recordFocus 1050ms ease-out forwards;
      `
      document.body.append(el)
      window.setTimeout(() => el.remove(), 1150)
    },
    { targetX, targetY }
  )
  await moveCursor(page, targetX, targetY, 620)
  await page.waitForTimeout(700)
}

async function smoothScroll(page, ratio, duration = 1500) {
  await page.evaluate(
    async ({ ratio, duration }) => {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const target = Math.round(maxScroll * ratio)
      const start = window.scrollY
      const distance = target - start
      const startTime = performance.now()
      const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
      await new Promise((resolve) => {
        function frame(now) {
          const progress = Math.min(1, (now - startTime) / duration)
          window.scrollTo(0, start + distance * ease(progress))
          if (progress < 1) requestAnimationFrame(frame)
          else resolve()
        }
        requestAnimationFrame(frame)
      })
    },
    { ratio, duration }
  )
  await page.waitForTimeout(520)
}

async function scrollToText(page, text, duration = 1500) {
  const locator = page.getByText(text, { exact: false }).first()
  await locator.scrollIntoViewIfNeeded({ timeout: duration }).catch(() => {})
  await page.waitForTimeout(700)
}

async function mouseTour(page, viewport) {
  const points = [
    [viewport.width * 0.24, viewport.height * 0.33],
    [viewport.width * 0.58, viewport.height * 0.38],
    [viewport.width * 0.78, viewport.height * 0.56],
    [viewport.width * 0.43, viewport.height * 0.66],
  ]
  for (const [x, y] of points) {
    await moveCursor(page, Math.round(x), Math.round(y), 560)
    await page.waitForTimeout(360)
  }
}

async function narrationHold(page, viewport, title, caption, durationMs) {
  if (durationMs <= 0) return
  await updateCard(page, title, caption)
  const deadline = Date.now() + durationMs
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) break
    if (remaining > 3500) {
      await mouseTour(page, viewport)
    }
    await page.waitForTimeout(Math.min(2500, Math.max(500, remaining)))
  }
}

function fullTimingStepsForSegment(segment) {
  const commonReview = [
    ["spotlight", "main", segment.label],
    ["tour"],
    ["scroll", 0.18, 1800],
    ["spotlight", "main", "Feature detail"],
    ["scroll", 0.52, 2100],
    ["hover", "main button, main a, main table tbody tr, article"],
    ["tour"],
    ["scroll", 0.82, 2100],
  ]

  const byRoute = {
    "/pitch": [
      ["spotlight", "[data-testid='demo-offer-price']", "Commercial model and customer value"],
      ["scroll", 0.26, 2200],
      ["spotlight", "[data-testid='demo-role-grid']", "Target groups and role paths"],
      ["scroll", 0.55, 2200],
      ["spotlight", "[data-testid='demo-chapters']", "Demo chapters and walkthrough structure"],
      ["scroll", 0.82, 2200],
      ["tour"],
    ],
    "/videos": [
      ["spotlight", "main", "Video hub and target groups"],
      ["hover", "article"],
      ["scroll", 0.28, 2200],
      ["spotlight", "main", "Language and chapter structure"],
      ["scroll", 0.68, 2200],
      ["tour"],
    ],
    "/login": [
      ["spotlight", "main", "Login and access profiles"],
      ["hover", "[data-testid='demo-full-access'], main button"],
      ["tour"],
      ["scroll", 0.2, 1800],
      ["spotlight", "main", "Production auth boundary"],
    ],
    "/dashboard": [
      ["spotlight", "[data-testid='dashboard-topbar']", "Role, language and sync state"],
      ["tour"],
      ["scroll", 0.22, 2200],
      ["spotlight", "[data-testid='module-status-disclosure']", "Phase and delivery status"],
      ["scroll", 0.48, 2200],
      ["hover", "main button, main article, main table tbody tr"],
      ["tour"],
      ["openDashboardAi"],
      ["wait", 1200],
      ["scroll", 0.72, 2200],
    ],
    "/dashboard/listings": [
      ["spotlight", "main", "Blocks, floors and unit matrix"],
      ["scroll", 0.18, 2200],
      ["hover", "button[aria-label*='Daire detay'], button[aria-label*='Unit detail'], button[aria-label*='A-001']"],
      ["click", "button[aria-label*='A-001'], button[aria-label*='A-006'], button[aria-label*='Daire detay'], button[aria-label*='Unit detail']"],
      ["wait", 1300],
      ["spotlight", "main", "Owner, debt, document and service signals"],
      ["scroll", 0.52, 2300],
      ["tour"],
    ],
    "/dashboard/users": [
      ["spotlight", "main", "Owners, tenants, staff and permissions"],
      ["hover", "main table tbody tr, [data-testid='data-table'], main button"],
      ["scroll", 0.28, 2200],
      ["spotlight", "main", "Role and language context"],
      ["scroll", 0.62, 2200],
      ["tour"],
    ],
    "/dashboard/leads": [
      ["spotlight", "main", "Resident and buyer context"],
      ["hover", "main table tbody tr, [data-testid='data-table'], main button"],
      ["scroll", 0.32, 2200],
      ["spotlight", "main", "Communication and activity signals"],
      ["scroll", 0.68, 2200],
      ["tour"],
    ],
    "/dashboard/tickets": [
      ["spotlight", "main", "Emergency routes and ticket queue"],
      ["scroll", 0.22, 2200],
      ["hover", "main table tbody tr, main article, [data-testid='data-table']"],
      ["spotlight", "main", "SLA, assignment and evidence flow"],
      ["scroll", 0.5, 2400],
      ["spotlight", "main", "Service catalogue and human approval rules"],
      ["scroll", 0.72, 2400],
      ["tour"],
    ],
    "/dashboard/finance": [
      ["spotlight", "main", "Ledger, balances and open debt"],
      ["scroll", 0.22, 2200],
      ["hover", "a[href='#finance-accounts'], main table tbody tr, [data-testid='data-table']"],
      ["click", "a[href='#finance-accounts']"],
      ["wait", 1300],
      ["spotlight", "main", "Deposits, payments and restrictions"],
      ["scroll", 0.72, 2400],
      ["tour"],
    ],
    "/dashboard/documents": [
      ["spotlight", "main", "Contracts, statements and evidence"],
      ["hover", "main table tbody tr, [data-testid='data-table'], main button"],
      ["scroll", 0.34, 2200],
      ["spotlight", "main", "Private storage and role-based access"],
      ["scroll", 0.72, 2200],
      ["tour"],
    ],
    "/dashboard/communications": [
      ["spotlight", "main", "Inbox, team chat and templates"],
      ["hover", "main table tbody tr, [data-testid='data-table'], main button"],
      ["scroll", 0.32, 2200],
      ["spotlight", "main", "Language and delivery state"],
      ["scroll", 0.72, 2200],
      ["tour"],
    ],
    "/dashboard/calendar": [
      ["spotlight", "main", "Reservation calendar"],
      ["hover", "main table tbody tr, [data-testid='data-table'], main button"],
      ["scroll", 0.3, 2200],
      ["spotlight", "main", "Check-in, checkout and deposit settlement"],
      ["scroll", 0.72, 2200],
      ["tour"],
    ],
    "/dashboard/compliance": [
      ["spotlight", "main", "Access, compliance and audit controls"],
      ["hover", "main table tbody tr, [data-testid='data-table'], main button"],
      ["scroll", 0.28, 2200],
      ["spotlight", "main", "Identity, legal checks and audit trail"],
      ["scroll", 0.68, 2200],
      ["tour"],
    ],
    "/dashboard/reports": [
      ["spotlight", "main", "Management analytics"],
      ["hover", "main table tbody tr, [data-testid='data-table'], main button"],
      ["scroll", 0.32, 2200],
      ["spotlight", "main", "Exports and decision-ready reports"],
      ["scroll", 0.7, 2200],
      ["tour"],
    ],
    "/dashboard/settings": [
      ["spotlight", "main", "Provider readiness and integrations"],
      ["scroll", 0.28, 2200],
      ["hover", "main button, main article, main table tbody tr"],
      ["spotlight", "main", "API keys, contracts and production boundary"],
      ["scroll", 0.72, 2200],
      ["tour"],
    ],
    "/new-level-premium": [
      ["spotlight", "main", "Premium public journey"],
      ["scrollText", "Premium servisler", 2200],
      ["spotlight", "main", "Spa, restaurant, theatre and tours"],
      ["tour"],
      ["scroll", 0.68, 2400],
    ],
  }

  return byRoute[segment.fullTimingRoute ?? routeKey(segment.route)] ?? commonReview
}

async function fullTimingCoverage(page, viewport, segment, durationMs) {
  if (durationMs <= 0) return
  const deadline = Date.now() + durationMs
  const steps = fullTimingStepsForSegment(segment)
  let pass = 1

  while (Date.now() < deadline) {
    await updateCard(
      page,
      `${segment.label} - detail pass ${pass}`,
      segment.caption
    )

    for (const step of steps) {
      if (Date.now() >= deadline) break
      try {
        await runStep(page, viewport, step)
      } catch {
        // Keep recording even if a non-critical feature selector changes.
      }
    }

    if (Date.now() < deadline) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })).catch(() => {})
      await page.waitForTimeout(900)
    }
    pass += 1
  }
}

async function openDashboardAi(page) {
  await clickSelector(page, "button[aria-label*='AI'], button:has-text('AI')")
  await page.locator("textarea").first().fill("Bugünkü servis, finans ve erişim risklerini özetle.").catch(() => {})
  await clickSelector(page, "button[aria-label*='Send'], button[aria-label*='Gönder'], button:has-text('Send'), button:has-text('Gönder')")
  await page.waitForTimeout(4500)
}

async function openPublicAi(page) {
  await clickSelector(page, "[data-testid='concierge-toggle']")
  await clickSelector(page, "[data-testid='concierge-ai-open']")
  await page.locator("[data-testid='concierge-panel']").waitFor({ state: "visible", timeout: 6000 }).catch(() => {})
  await page.locator("textarea").last().fill("What can 1Cati do for owners and tenants?").catch(() => {})
  await clickSelector(page, "button[aria-label*='Send'], button[aria-label*='Gönder'], button:has-text('Send'), button:has-text('Gönder')")
}

async function runStep(page, viewport, step) {
  const [type, a, b] = step
  switch (type) {
    case "settle":
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {})
      await page.waitForTimeout(a ?? 900)
      break
    case "wait":
      await page.waitForTimeout(a ?? 700)
      break
    case "scroll":
      await smoothScroll(page, a ?? 0.5, b ?? 1500)
      break
    case "scrollText":
      await scrollToText(page, a, b ?? 1500)
      break
    case "tour":
      await mouseTour(page, viewport)
      break
    case "hover":
      await hoverSelector(page, a)
      break
    case "click":
      await clickSelector(page, a)
      break
    case "waitForSelector":
      await page.locator(a).first().waitFor({ state: "visible", timeout: b ?? 10_000 })
      await page.waitForTimeout(450)
      break
    case "waitForUrl":
      await page.waitForURL(a, { timeout: b ?? 15_000 }).catch(() => {})
      await page.locator("main").first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {})
      await page.waitForTimeout(650)
      break
    case "waitForPath":
      await page.waitForFunction(
        (expectedPath) => window.location.pathname.endsWith(expectedPath),
        a,
        { timeout: b ?? 15_000 }
      ).catch(() => {})
      await page.locator("main").first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {})
      await page.waitForTimeout(650)
      break
    case "tap":
      await moveCursor(page, a, b, 500)
      await pulse(page, a, b)
      await page.mouse.click(a, b).catch(() => {})
      await page.waitForTimeout(700)
      break
    case "spotlight":
      await spotlight(page, a, b)
      break
    case "openDashboardAi":
      await openDashboardAi(page)
      break
    case "openPublicAi":
      await openPublicAi(page)
      break
    default:
      throw new Error(`Unknown recording step: ${JSON.stringify(step)}`)
  }
}

function serveVideoFile(filePath) {
  const server = http.createServer((request, response) => {
    if (request.url !== "/video.webm") {
      response.writeHead(404)
      response.end()
      return
    }

    const stat = fs.statSync(filePath)
    response.writeHead(200, {
      "Content-Type": "video/webm",
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    })
    fs.createReadStream(filePath).pipe(response)
  })

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        url: `http://127.0.0.1:${server.address().port}/video.webm`,
      })
    })
  })
}

async function upscaleMobileClip(browser, sourcePath, clipPath, captureSize) {
  const { server, url } = await serveVideoFile(sourcePath)
  const context = await browser.newContext({
    viewport: captureSize,
    recordVideo: { dir: rawDir, size: captureSize },
  })
  const page = await context.newPage()

  try {
    await page.setContent(`
      <html>
        <body style="margin:0;background:#f4f7f5;overflow:hidden">
          <video
            id="mobile-source"
            src="${url}"
            muted
            playsinline
            style="display:block;width:${captureSize.width}px;height:${captureSize.height}px;object-fit:fill;background:#f4f7f5"
          ></video>
        </body>
      </html>
    `)
    await page.waitForFunction(
      () => document.querySelector("#mobile-source")?.readyState >= 1,
      undefined,
      { timeout: 30_000 },
    )
    const duration = await page.evaluate(() => document.querySelector("#mobile-source")?.duration ?? 0)
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const video = document.querySelector("#mobile-source")
          if (!video) {
            reject(new Error("Mobile source video missing"))
            return
          }
          const timeout = window.setTimeout(
            () => reject(new Error("Mobile upscale playback timed out")),
            Math.max(30_000, Math.ceil((video.duration || 0) * 1000) + 30_000),
          )
          video.addEventListener(
            "ended",
            () => {
              window.clearTimeout(timeout)
              resolve()
            },
            { once: true },
          )
          video.currentTime = 0
          video.play().catch(reject)
        }),
    )
    if (duration > 0) await page.waitForTimeout(250)
  } finally {
    const video = page.video()
    await context.close()
    server.close()

    if (video) {
      const scaledPath = await video.path().catch(() => null)
      if (scaledPath && fs.existsSync(scaledPath)) {
        fs.copyFileSync(scaledPath, clipPath)
        return
      }
    }
  }

  throw new Error("Mobile upscale did not produce a video")
}

async function recordChapterAttempt(browser, chapter, locale, attempt) {
  const viewport = chapter.viewport
  const captureSize = captureSizeFor(chapter)
  const recordingSize = chapter.upscaleMobileSource ? viewport : captureSize
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: chapter.deviceScaleFactor ?? 1,
    locale,
    recordVideo: skipVideo ? undefined : { dir: rawDir, size: recordingSize },
  })
  const page = await context.newPage()
  const issues = []

  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      const text = message.text()
      if (!isIgnorableConsole(text)) issues.push(`${message.type()}: ${text}`)
    }
  })

  try {
    const chapterStartedAt = Date.now()
    const chapterTargetMs = Math.round(chapter.targetMinutes * 60_000)
    const segmentTargetMs = fullTiming
      ? Math.max(12_000, Math.round(chapterTargetMs / Math.max(1, chapter.segments.length)))
      : 0

    for (const [segmentIndex, segment] of chapter.segments.entries()) {
      const segmentStartedAt = Date.now()
      const role = segment.role ?? chapter.role
      await context.clearCookies()
      await context.addCookies([{ url: baseUrl, name: "access_profile_role", value: role }])

      await page.goto(buildTargetUrl(locale, segment.route), {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await page.locator("main").first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {})
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
      await installOverlay(page, chapter, segment, locale)
      await page.waitForTimeout(600)

      await page.screenshot({
        path: path.join(reviewDir, `${chapter.id}-${chapter.slug}-${locale}-attempt-${attempt}-${safeRouteName(segment.route)}.png`),
        fullPage: false,
      })

      for (const step of segment.steps) {
        try {
          await runStep(page, viewport, step)
        } catch (error) {
          issues.push(`step ${JSON.stringify(step)}: ${String(error?.message ?? error)}`)
        }
      }

      if (fullTiming) {
        const elapsed = Date.now() - segmentStartedAt
        const remaining = segmentTargetMs - elapsed
        await fullTimingCoverage(
          page,
          viewport,
          segment,
          remaining
        )
      }
    }

    if (fullTiming) {
      const elapsed = Date.now() - chapterStartedAt
      const remaining = chapterTargetMs - elapsed
      await narrationHold(
        page,
        viewport,
        "Clean hold for narration",
        "The screen stays readable for voiceover, captions and final cut.",
        remaining
      )
    } else {
      await page.waitForTimeout(1000)
    }
  } finally {
    const video = page.video()
    await context.close()
    if (!skipVideo && video) {
      const rawPath = await video.path().catch(() => null)
      if (rawPath && fs.existsSync(rawPath)) {
        const clipPath = path.join(clipsDir, chapterFilename(chapter, locale))
        if (chapter.upscaleMobileSource) {
          await upscaleMobileClip(browser, rawPath, clipPath, captureSize)
        } else {
          fs.copyFileSync(rawPath, clipPath)
        }
        return { clipPath, issues }
      }
    }
  }

  return { clipPath: null, issues }
}

async function inspectClip(browser, clipPath) {
  const server = http.createServer((request, response) => {
    if (request.url !== "/video.webm") {
      response.writeHead(404)
      response.end()
      return
    }

    const stat = fs.statSync(clipPath)
    response.writeHead(200, {
      "Content-Type": "video/webm",
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    })
    fs.createReadStream(clipPath).pipe(response)
  })

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const port = server.address().port
  const page = await browser.newPage()
  try {
    await page.setContent(`<video id="review-video" src="http://127.0.0.1:${port}/video.webm" muted playsinline></video>`)
    await page.waitForFunction(
      () => document.querySelector("#review-video")?.readyState >= 1,
      undefined,
      { timeout: 30_000 }
    )
    return await page.evaluate(() => {
      const video = document.querySelector("#review-video")
      return {
        duration: Number(video?.duration?.toFixed(2) ?? 0),
        width: video?.videoWidth ?? 0,
        height: video?.videoHeight ?? 0,
      }
    })
  } finally {
    await page.close()
    server.close()
  }
}

function qaVerdict(chapter, clipPath, inspection, issues) {
  const expected = captureSizeFor(chapter)
  const checks = []
  if (!clipPath || !fs.existsSync(clipPath)) checks.push("missing video file")
  const bytes = clipPath && fs.existsSync(clipPath) ? fs.statSync(clipPath).size : 0
  if (bytes < 250_000) checks.push("video file too small")
  if (inspection.width !== expected.width) checks.push(`width ${inspection.width} != ${expected.width}`)
  if (inspection.height !== expected.height) checks.push(`height ${inspection.height} != ${expected.height}`)
  if (inspection.duration < 8 && !skipVideo) checks.push(`duration ${inspection.duration}s is too short`)
  if (fullTiming && !skipVideo) {
    const minDuration = Math.round(chapter.targetMinutes * 60 * 0.9)
    if (inspection.duration < minDuration) {
      checks.push(`duration ${inspection.duration}s is below full walkthrough target ${minDuration}s`)
    }
  }
  if (issues.length) checks.push(...issues)
  return {
    passed: checks.length === 0,
    checks,
    bytes,
  }
}

function buildGuide(activeChapters) {
  const lines = [
    "# 1Cati Full Playlist Recording Manifest",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${baseUrl}`,
    `Locales: ${locales.join(", ")}`,
    "",
    "## Recording Rules",
    "",
    "- Capture desktop chapters at 1920 x 1080.",
    "- Render mobile/PWA with a real smartphone viewport and export it as 1080 x 1920 portrait.",
    "- Use the built-in recording cursor, hover states, click pulses and subtle focus effects; large highlight boxes and labels stay off unless --show-labels is passed for debugging.",
    "- Record screen masters first; HeyGen avatar/voice is added after content approval.",
    "- Keep provider-dependent and UAT-only items visually marked and narrated honestly.",
    "",
    "## Chapters",
    "",
  ]

  for (const chapter of activeChapters) {
    lines.push(`### ${chapter.id}. ${chapter.title}`)
    lines.push("")
    lines.push(`- Target length: ${chapter.targetMinutes} min`)
    const captureSize = captureSizeFor(chapter)
    lines.push(`- Browser viewport: ${chapter.viewport.width} x ${chapter.viewport.height}`)
    lines.push(`- Video capture: ${captureSize.width} x ${captureSize.height}`)
    lines.push(`- Default role: ${chapter.role}`)
    lines.push("- Segments:")
    for (const segment of chapter.segments) {
      lines.push(`  - \`${segment.route}\` (${segment.role ?? chapter.role}): ${segment.label}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

async function main() {
  ensureDirs()
  const activeChapters = onlyVideos.length
    ? chapters.filter((chapter) => onlyVideos.includes(chapter.id))
    : chapters

  const guide = buildGuide(activeChapters)
  fs.writeFileSync(path.join(outputDir, "recording-guide.md"), guide, "utf8")

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    locales,
    fullTiming,
    skipVideo,
    outputDir,
    chapters: activeChapters.map((chapter) => ({
      id: chapter.id,
      slug: chapter.slug,
      title: chapter.title,
      targetMinutes: chapter.targetMinutes,
      viewport: chapter.viewport,
      captureSize: captureSizeFor(chapter),
      role: chapter.role,
      segments: chapter.segments.map((segment) => ({
        route: segment.route,
        role: segment.role ?? chapter.role,
        label: segment.label,
        caption: segment.caption,
      })),
    })),
    recordings: [],
  }

  if (skipVideo) {
    fs.writeFileSync(path.join(outputDir, "recording-manifest.json"), JSON.stringify(manifest, null, 2), "utf8")
    console.log(`Guide-only mode wrote ${path.join(outputDir, "recording-guide.md")}`)
    return
  }

  const browser = await chromium.launch({ headless: true })
  try {
    for (const locale of locales) {
      for (const chapter of activeChapters) {
        let finalResult = null
        for (let attempt = 1; attempt <= Math.max(1, retryCount + 1); attempt += 1) {
          console.log(`Recording ${chapter.id} ${locale} attempt ${attempt}`)
          const result = await recordChapterAttempt(browser, chapter, locale, attempt)
          const inspection = result.clipPath
            ? await inspectClip(browser, result.clipPath)
            : { duration: 0, width: 0, height: 0 }
          const verdict = qaVerdict(chapter, result.clipPath, inspection, result.issues)
          finalResult = {
            chapter: chapter.id,
            locale,
            attempt,
            clip: result.clipPath ? path.relative(outputDir, result.clipPath) : null,
            inspection,
            ...verdict,
          }
          if (verdict.passed) break
        }
        manifest.recordings.push(finalResult)
        console.log(
          `${finalResult.passed ? "PASS" : "FAIL"} ${chapter.id} ${locale} ${finalResult.clip ?? ""}`
        )
      }
    }
  } finally {
    await browser.close()
  }

  fs.writeFileSync(path.join(outputDir, "recording-manifest.json"), JSON.stringify(manifest, null, 2), "utf8")
  const failures = manifest.recordings.filter((item) => !item.passed)
  console.log(
    JSON.stringify(
      {
        outputDir,
        total: manifest.recordings.length,
        passed: manifest.recordings.length - failures.length,
        failed: failures.length,
        failures,
      },
      null,
      2
    )
  )

  if (failures.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
