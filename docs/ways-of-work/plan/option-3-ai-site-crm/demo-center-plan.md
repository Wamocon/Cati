# 1Çatı Demo Center — Detailed Production & Build Plan

Status: proposed plan, ready for approval
Owner: product + marketing + engineering
Last reviewed: 30 June 2026
Audience: Ataberk Estate leadership, WAMOCON delivery, product, engineering, QA
Languages in scope: Turkish (TR), English (EN), German (DE), Russian (RU)

---

## 0. How to read this document

This is the full plan for turning the 1Çatı platform into a professional **Demo Center**:
a short trailer, an interactive "choose your role" demo, one complete walkthrough,
and a chaptered playlist — all in 4 languages.

It is written in simple language on purpose. Anyone on the team (technical or not)
should be able to read it and know exactly what to record, what to say, what to build,
and how to check the quality.

Sections:

1. Verdict on the proposed plan (does it make sense?)
2. What the app really is today (verified from the code)
3. The Demo Center model (the 4 pieces)
4. Production specifications (length, format, style, languages)
5. The recording playbook (how we capture the app, step by step)
6. Full trailer script in all 4 languages
7. Complete walkthrough script (scene by scene)
8. Chapter cut sheet (how to slice the playlist)
9. Localization workflow (TR / EN / DE / RU)
10. The website Demo Center (what we build in the app)
11. Quality assurance checklist (per language, per video)
12. Practical build order with owners and checkpoints
13. Risks, cost discipline, and "do not do"
14. Assumptions to confirm

---

## 1. Verdict on the proposed plan

**Short answer: yes, the plan is strong and I recommend we proceed, with five refinements.**

The proposal correctly follows what the best companies do in 2026: a short trailer for
attention, an interactive demo for self-exploration, and a chaptered library for depth.
That matches the cited research (Wyzowl on short-video effectiveness and trust, Navattic
on demos across the buyer journey, Supademo on guided demo hubs, HeyGen on multi-language
dubbing). The "record one visual master, then localize into 4 languages" strategy is the
correct cost/quality choice.

**What is already true in our favor (verified in the code):**

- The app **already ships in TR, EN, DE, RU**. We do not need to build language support — it
  exists. This makes localized UI recording realistic, not a fantasy.
- The app has a **no-login demo mode** ("access profiles") that lets us switch between
  admin, manager, accountant, staff, owner, and tenant safely. This is perfect for the
  "choose your path" interactive demo and for recording each role.
- **Playwright is already used** to drive and screenshot the app. It can also record video
  deterministically, so every take looks identical across all 4 languages.

**My five refinements to the proposal:**

1. **Make the trailer 60 seconds, not 60–75.** Shorter holds attention and is easier to keep
   perfectly in sync across 4 languages. Keep 75s only if the German voiceover overruns
   (German sentences are longer).
2. **Build the interactive demo natively first, inside our own app**, using the role-switch
   mode we already have. It is free, fully in our 4 languages, and always matches the live
   product. Treat Supademo as an optional later upgrade, not the starting point.
3. **Lock a "visual master" with no on-screen text baked into the recording.** All titles,
   labels, and captions are added as overlays in editing. This is what lets one recording
   serve all 4 languages without re-recording the UI four times.
4. **Use seeded demo data, never real owner/tenant data**, and turn on a "demo mode" banner
   off-screen. This protects KVKK/privacy and keeps numbers stable across takes.
5. **Record the walkthrough as short scene clips, not one continuous 15-minute take.** This is
   how we get both the full video and the chapters from the same footage without pain, and
   it makes re-recording one section cheap when the UI changes.

With these refinements the plan is realistic for the current app, affordable on the HeyGen
Creator plan, and maintainable as Phases 10–15 land.

---

## 2. What the app really is today (verified from the code)

This grounds every script line so we never promise something the app cannot show.

| Fact | Detail | Why it matters for the demo |
|---|---|---|
| Framework | Next.js 16 app, localized routes | We record real screens, not mockups |
| Languages | `tr` (default), `en`, `de`, `ru` | The 4 demo languages already exist in-product |
| Route shape | `/{locale}/...` e.g. `/en/dashboard` | We script exact URLs per language |
| Roles | admin, manager, accountant, staff, owner, tenant | These are the interactive demo "paths" |
| Demo login | Access-profile mode, role chosen on the login page (cookie) | Record any role with no real credentials |
| Dashboard modules | listings, leads, finance, tickets, calendar, documents, compliance, users, reports, communications, settings, offline | These are our chapter topics |
| Scale | 769-flat site model (block / floor / flat) | The "769 units" hero number is real |
| Phase model | 15-phase ERP map shown in dashboard | The roadmap chapter is real, on-screen |
| AI surface | AI assistant + recommendations + image/proof workflows | The "AI roadmap" claims are grounded |
| Capture tool | Playwright already drives + screenshots the app | Reuse it to record deterministic video |
| Demo home | `apps/web/app/[locale]/pitch/page.tsx` is implemented | Native Demo Center page for the client offer, role paths and chapter playlist |

**Honesty rule for every script:** Phases 1–4 are foundation-complete, Phases 5–14 are
"implementation foundation / ready-for-UAT", Phase 15 is launch hardening. The walkthrough
must say what is *live today* vs what is *on the roadmap*. We will mark roadmap items clearly
("coming in Phase 10–15") so no client feels misled. This protects trust, which the Wyzowl
data says directly affects brand perception.

---

## 3. The Demo Center model (the 4 pieces)

```
                         1Çatı DEMO CENTER  (/{locale}/pitch)
                         ──────────────────────────────────
   ┌───────────────┐   ┌────────────────────┐   ┌──────────────────────┐
   │ 1. TRAILER    │   │ 2. INTERACTIVE     │   │ 3. FULL WALKTHROUGH  │
   │ 60s "wow"     │ → │    DEMO            │ → │   12–15 min          │
   │ hero / modal  │   │ choose your role   │   │   complete tour      │
   └───────────────┘   └────────────────────┘   └──────────┬───────────┘
                                                            │ cut from same footage
                                                 ┌──────────▼───────────┐
                                                 │ 4. CHAPTER PLAYLIST  │
                                                 │ 6 topic clips        │
                                                 └──────────────────────┘
        Every piece exists in TR / EN / DE / RU.
```

- **Trailer** = first impression. Lives on the homepage hero and a "Watch demo" modal.
- **Interactive demo** = self-guided. Visitor picks Executive / Manager / Accountant / Staff
  (Resident/Owner added after Phase 10–12). Built inside our app using role-switch mode.
- **Full walkthrough** = the complete story, for serious buyers and onboarding.
- **Chapter playlist** = the same content sliced by topic, for people who want one answer fast.

---

## 4. Production specifications

### 4.1 Trailer

| Item | Specification |
|---|---|
| Length | 60 seconds (hard cap 75s only if DE voiceover overruns) |
| Aspect / resolution | 16:9, 1920×1080 (1080p), 30fps |
| Use | Homepage hero background + "Watch demo" modal + client first contact |
| Languages | TR, EN, DE, RU (4 voiceover + 4 subtitle versions) |
| Style | Cinematic screen capture, fast cuts, motion titles, premium voiceover, subtitles always on |
| Content shown | Dashboard, 769-unit platform, finance, services, SLA, AI roadmap |
| Music | One licensed track, same across all 4 languages, ducked under voice |
| Captions | Burned-in subtitles per language + separate `.vtt` file for the web player |

### 4.2 Interactive demo

| Item | Specification |
|---|---|
| Format | In-app guided flow: trailer at top, then clickable role paths |
| Paths (now) | Executive overview, Manager/Admin, Accountant, Staff/Operations |
| Paths (later) | Resident/Owner preview after Phase 10–12 |
| Build | Native (our app + role-switch + screenshot/clip steps). Supademo optional later. |
| Languages | All UI strings via existing `messages/{locale}.json` |
| Analytics | Track path chosen, step reached, CTA clicks |

### 4.3 Full walkthrough

| Item | Specification |
|---|---|
| Length | 12–15 minutes (not 30–40) |
| Resolution | 1080p, 30fps, 16:9 |
| Languages | TR, EN, DE, RU |
| Structure | 11 scenes (see section 7) |
| Recording method | Short scene clips, stitched in edit (not one long take) |

### 4.4 Chapter playlist (cut from the walkthrough master)

| Chapter file | Title | Target length |
|---|---|---|
| `00-offer-and-value` | Offer, value model and Demo Center | ~2 min |
| `01-overview` | What 1Çatı is | ~2 min |
| `02-dashboard-and-units` | Dashboard & 769 units | ~3 min |
| `03-people-and-rbac` | People, owners, tenants, staff & roles | ~2 min |
| `04-finance-and-restrictions` | Finance, payments, deposits, restrictions | ~4 min |
| `05-services-and-staff` | Services, tickets, staff, SLA, media proof | ~4 min |
| `06-roadmap-phase-10-15` | Roadmap Phase 10–15 | ~2 min |

Naming convention for delivered files:
`1cati-{piece}-{chapter}-{locale}.mp4` → e.g. `1cati-walkthrough-04-finance-tr.mp4`,
`1cati-trailer-en.mp4`. Subtitles: same name with `.vtt`.

---

## 5. The recording playbook (how we capture the app)

This is the most important operational section. The goal: **record the visual once, perfectly,
so all 4 languages share identical motion.**

### 5.1 Pre-flight (do this before any recording)

1. **Use seeded demo data only.** Load the demo seed so numbers (769 units, balances, tickets)
   are stable and contain no real personal data. Confirm no real owner/tenant names appear.
2. **Enable demo mode**: run the app with access profiles on
   (`ENABLE_ACCESS_PROFILES=true`) so we can switch roles with no login in controlled QA.
3. **Fix the viewport** to 1920×1080, device scale factor 2 for crisp text.
4. **Hide local-only noise**: no dev banners, no console overlays, no realtime "connection
   refused" toast (the QA scripts already filter this — keep it off-screen).
5. **Set a clean clock and currency**: stable date, TRY currency, so finance numbers look real.
6. **Pick a calm theme**: one theme (light or dark) used consistently across all chapters.

### 5.2 Capture engine: Playwright video

We already use Playwright to drive the app. We add a recording context. The same script runs
four times — once per locale — producing four pixel-identical videos that differ only in the
on-screen language.

Conceptual recipe (one reusable script, parameterized by locale and role):

```text
for locale in [tr, en, de, ru]:
  for scene in walkthrough_scenes:
     - open a recorded browser context (video: on, viewport 1920x1080)
     - set role cookie = scene.role            (e.g. manager, accountant, staff)
     - go to  /{locale}{scene.path}            (e.g. /en/dashboard/finance)
     - perform scene.actions slowly with pauses (hover, click, scroll, open a panel)
     - close context -> save  scene-{n}-{locale}.webm
```

Why this is the right approach:

- **Deterministic**: the cursor moves the same way in every language, so subtitles and
  voiceover line up across TR/EN/DE/RU with almost no re-timing.
- **Cheap to re-shoot**: if one screen changes, we re-run only that scene, in 4 languages,
  in minutes.
- **No human wobble**: no shaky mouse, no missed clicks, consistent pacing.

This recorder is **already built** at `apps/web/scripts/demo-record.mjs`, modeled on the
existing `apps/web/scripts/*-qa.mjs` patterns (same Playwright setup, but with `recordVideo`
enabled and a scene list). Run it from `apps/web`:

```text
# 1) start the app in demo mode
$env:ENABLE_ACCESS_PROFILES="true"; npm run dev -- -p 3100
# 2) record the visual master (all scenes, all 4 languages)
node scripts/demo-record.mjs
# optional: re-record only some scenes
$env:DEMO_ONLY_SCENES="S04,S06"; node scripts/demo-record.mjs
# optional: regenerate the guide/manifest only, no video
$env:DEMO_SKIP_VIDEO="1"; node scripts/demo-record.mjs
```

It outputs to `qa_output/demo-center-master/`:

- `clips/1cati-master-{scene}-{locale}.webm` — one clip per feature per language
- `demo-script.md` — auto-generated recording + narration guide that explains every big
  feature and lists every "coming soon" item
- `demo-manifest.json` — machine-readable scene/clip index for the editor and the website

The scene list inside the script is the single source of truth: every big feature has a
scene with its role, route, plain-language explanation, master narration, live/coming-soon
status, and chapter mapping. Edit that list to change the demo; the guide and manifest
regenerate automatically.

### 5.3 Scene list as data

Keep all scenes in one table so the script, the narration, and the chapters stay in sync.
Each row = one clip.

| Scene | Role | Route (append after `/{locale}`) | On-screen actions | Goes to chapter |
|---|---|---|---|---|
| S1 Intro | manager | `/dashboard` | Land on dashboard, slow pan of KPI cards | 01 |
| S2 Login/roles | (login) | `/login` | Show role selector, pick a role | 01 |
| S3 Dashboard | manager | `/dashboard` | Hover KPIs, open phase-status map | 02 |
| S4 Units | manager | `/dashboard/listings` | Filter units, open one unit | 02 |
| S5 People | admin | `/dashboard/users` | Show owners/tenants/staff list, open a profile | 03 |
| S6 Finance ledger | accountant | `/dashboard/finance` | Scroll ledger, open an account balance | 04 |
| S7 Payments/restrictions | accountant | `/dashboard/finance` | Show payment control + debt restriction panel | 04 |
| S8 Services | manager | `/dashboard/tickets` | Open service catalogue, create a service order | 05 |
| S9 Staff/SLA | staff | `/dashboard/tickets` | Show assigned task, SLA timer, media proof upload | 05 |
| S10 Communications | manager | `/dashboard/communications` | Show chat + notifications | 05 |
| S11 Roadmap | manager | `/dashboard` | Open the 15-phase map, highlight Phase 10–15 | 06 |

(Trailer uses the best 6–8 seconds from S3, S4, S6, S8, S9, S11.)

### 5.4 Pacing rules (so editing and voiceover are easy)

- Hold each screen **2–3 seconds before any action**, so the editor has room and the eye can settle.
- One idea per click. No rapid multi-clicking.
- Move the mouse in smooth, slightly slow motions.
- End each scene on a clean, full screen (good freeze-frame for the chapter thumbnail).

---

## 6. Full trailer script — all 4 languages

**Visual spine (same for every language), ~60 seconds:**

| Time | Visual (from recorded master) | On-screen motion title |
|---|---|---|
| 0–5s | Black → logo reveal → dashboard fades in | "1Çatı" |
| 5–14s | Dashboard KPI cards, slow push-in | "One platform for your whole site" |
| 14–24s | Listings: 769 units filtering | "769 units. Total control." |
| 24–34s | Finance ledger + payment panel | "Finance, deposits, debts — handled" |
| 34–44s | Service order → staff task → SLA timer | "Services and teams, on time" |
| 44–52s | AI assistant panel + roadmap map | "AI-powered. Built to grow." |
| 52–60s | Logo + tagline + CTA | "1Çatı — Explore the demo" |

### 6.1 Turkish (TR) — master language

> Bir sitenin tüm yönetimi… tek platformda.
> Gösterge paneli, finans, hizmetler ve ekipler — hepsi bir arada.
> 769 daire. Tek ekrandan tam kontrol.
> Borçlar, depozitolar ve tahsilatlar otomatik takip edilir.
> Hizmet talebinden ekip görevine, SLA süresine kadar her şey bağlı.
> Yapay zekâ destekli, büyümeye hazır bir site işletim sistemi.
> 1Çatı. Demoyu keşfedin.

### 6.2 English (EN)

> Managing an entire residential complex… on one platform.
> Dashboard, finance, services, and teams — all in one place.
> 769 units. Full control from a single screen.
> Debts, deposits, and payments, tracked automatically.
> From a service request to a staff task to the SLA clock — everything is connected.
> An AI-powered operating system for your site, built to grow.
> 1Çatı. Explore the demo.

### 6.3 German (DE)

> Die gesamte Verwaltung einer Wohnanlage … auf einer Plattform.
> Dashboard, Finanzen, Services und Teams — alles an einem Ort.
> 769 Einheiten. Volle Kontrolle über einen einzigen Bildschirm.
> Schulden, Kautionen und Zahlungen werden automatisch erfasst.
> Von der Serviceanfrage über die Mitarbeiteraufgabe bis zur SLA-Zeit — alles ist verbunden.
> Ein KI-gestütztes Betriebssystem für Ihre Anlage, gemacht zum Wachsen.
> 1Çatı. Entdecken Sie die Demo.

*(Note: German runs longest. If the voiceover exceeds 60s, extend the trailer to 70–75s by
holding the finance and services shots ~3s longer.)*

### 6.4 Russian (RU)

> Управление всем жилым комплексом… на одной платформе.
> Панель управления, финансы, услуги и команды — всё в одном месте.
> 769 квартир. Полный контроль с одного экрана.
> Долги, депозиты и платежи отслеживаются автоматически.
> От заявки на услугу до задачи сотрудника и таймера SLA — всё связано.
> Операционная система для вашего комплекса на базе ИИ, готовая к росту.
> 1Çatı. Откройте демо.

---

## 7. Complete walkthrough script (scene by scene)

The **master narration is written in English below**. TR, DE, and RU use the *same* meaning,
scene by scene, produced through the localization workflow in section 9. A shared glossary
(section 9.3) keeps key terms identical across all languages.

Total target: 12–15 minutes. Each scene below maps to a recorded clip from section 5.3.

### Scene 1 — What 1Çatı is (~1:30)
*Visual: S1/S2 — dashboard landing, then login role selector.*

> Welcome to 1Çatı, an AI-powered operating system for residential complexes.
> In one platform you manage units, people, money, services, and staff — for a site as large
> as 769 flats. This walkthrough shows what the platform does today, and what is coming on the
> roadmap. Anything still in development is clearly marked, so you always know what is live.

### Scene 2 — Login and role access (~1:00)
*Visual: S2 — role selector, pick a role.*

> Every person sees only what their role allows. There are six roles: admin, manager,
> accountant, staff, owner, and tenant. A manager sees operations and finance summaries; an
> accountant sees the full ledger; staff see only their tasks; owners and tenants see their
> own unit. This keeps data private and the screen simple for each user.

### Scene 3 — Main dashboard and phase status (~1:30)
*Visual: S3 — KPI cards, phase-status map.*

> The dashboard is the control center. At a glance you see income, expenses, outstanding debt,
> open tasks, occupancy, and AI risk highlights. The cards update live. Below, the phase map
> shows exactly how far the platform has been built, from foundation through the AI layer.

### Scene 4 — Site, listing, and unit operations (~1:30)
*Visual: S4 — listings, filter, open a unit.*

> The whole site is modeled as blocks, floors, and flats — all 769 units. You can filter by
> status: vacant, occupied, in maintenance, or restricted. Open a single unit to see its
> owner, tenant, balance, and history in one place.

### Scene 5 — People: owners, tenants, staff (~1:15)
*Visual: S5 — users list, open a profile.*

> Here are the people. Owners, tenants, and staff each have a profile linked to their unit or
> role. From a profile you reach their balance, documents, and activity. Adding or updating a
> person takes seconds and respects role permissions.

### Scene 6 — Finance ledger (~1:30)
*Visual: S6 — ledger, account balance.*

> Finance is a real ledger, not a spreadsheet. Every charge, payment, and refund is recorded
> against the right account. You can see each unit's balance, the site's income and expenses,
> and export reports for accounting.

### Scene 7 — Payments, deposits, restrictions (~1:45)
*Visual: S7 — payment control + restriction panel.*

> Payments and deposits are controlled. The system can hold a deposit, settle it at checkout,
> and apply debt-based restrictions — for example, limiting a service or booking when an
> account is overdue. These actions are guarded and logged for audit, and the live payment
> provider is confirmed during launch.

### Scene 8 — Service catalogue and tickets (~1:45)
*Visual: S8 — service catalogue, create a service order.*

> Services run on a catalogue with prices and SLAs. A resident or manager picks a service, the
> system checks the account, takes the charge, and creates a ticket. That ticket becomes a task
> assigned to the right team.

### Scene 9 — Staff tasks, SLA, media proof (~1:30)
*Visual: S9 — assigned task, SLA timer, media upload.*

> Staff see only their assigned tasks, with priority and an SLA clock. When the work is done,
> they upload photo or video proof from their phone. The manager sees completion and the SLA
> status, so nothing is forgotten.

### Scene 10 — Communication and notifications (~1:00)
*Visual: S10 — chat + notifications.*

> Communication is built in: resident-to-management chat, internal team chat, and notifications
> by email, SMS, or push. Templates keep messages consistent and multilingual.

### Scene 11 — Roadmap Phase 10–15 and closing (~1:30)
*Visual: S11 — 15-phase map, highlight Phase 10–15.*

> On the roadmap: bookings and move-in/checkout, deeper external integrations, the full AI
> premium layer, and final launch hardening — Phases 10 through 15. Today you have a complete
> management foundation; next, it grows into a full premium platform.
> That is 1Çatı: units, people, finance, services, and decisions — in one place. Thank you for
> watching. Explore the interactive demo to try it yourself.

**Localization note:** TR is the primary client language, so we may record TR first as the
"feel" reference, but the *script of record* is kept aligned across all four. DE narration will
be ~10–15% longer; allow the scene clips to hold slightly longer where needed.

---

## 8. Chapter cut sheet

From the stitched walkthrough master (per language), export 6 chapters using these cut points.
Because we recorded scene clips separately (section 5.3), each chapter is simply a group of
scenes plus a 3-second branded intro card and a 3-second CTA outro card.

| Chapter | Scenes included | Intro card text | Outro CTA |
|---|---|---|---|
| `01-overview` | S1, S2 | "1Çatı — Overview" | "See the dashboard →" |
| `02-dashboard-and-units` | S3, S4 | "Dashboard & 769 Units" | "Meet the people →" |
| `03-people-and-rbac` | S5 | "People & Roles" | "Open finance →" |
| `04-finance-and-restrictions` | S6, S7 | "Finance & Controls" | "See services →" |
| `05-services-and-staff` | S8, S9, S10 | "Services & Staff" | "See the roadmap →" |
| `06-roadmap-phase-10-15` | S11 | "Roadmap 10–15" | "Try the live demo →" |

Each intro/outro card text is itself localized (4 versions). The card is an overlay, so the
underlying footage is reused.

---

## 9. Localization workflow (TR / EN / DE / RU)

This is the "record once, ship four" engine.

### 9.1 The pipeline

```
1. Lock visual master (recorded clips, no baked-in text)         [engineering]
2. Lock English+Turkish master narration scripts                 [product/marketing]
3. Translate scripts to DE + RU (human-reviewed)                 [localization]
4. Generate voiceover per language (HeyGen)                      [marketing]
5. Generate subtitles/transcripts; QA with Whisper (DGX)         [QA]
6. Overlay localized titles/cards on the shared footage          [editing]
7. Export 4 trailers + 4 walkthroughs + 24 chapters (6×4)        [editing]
8. QA every version (section 11)                                 [QA]
9. Publish to the in-app Demo Center                             [engineering]
```

### 9.2 Tool roles

- **HeyGen (Creator plan)** — voiceover and dubbing for TR/EN/DE/RU; supports 175+ languages,
  1080p, up to ~30-minute videos, 600 credits/month (per the cited HeyGen pages — confirm at
  build time). Use it for **voice and optional short avatar intro/outro only**, not for full
  avatar in every scene. This protects credits and keeps focus on the product.
- **DGX Whisper (local)** — generate and verify transcripts/subtitles. Use it to QA that the
  spoken voiceover matches the script in each language, and to produce clean `.vtt` subtitle
  files. Running locally keeps confidential content off third-party servers.
- **Playwright** — the visual capture engine (section 5).
- **Editor (any NLE)** — overlay titles, cards, music, subtitles; export final files.

### 9.3 Shared glossary (keep these identical in every video)

| Concept | TR | EN | DE | RU |
|---|---|---|---|---|
| Dashboard | Gösterge paneli | Dashboard | Dashboard | Панель управления |
| Unit / flat | Daire | Unit | Einheit | Квартира |
| Owner | Malik | Owner | Eigentümer | Собственник |
| Tenant | Kiracı | Tenant | Mieter | Арендатор |
| Staff | Personel | Staff | Mitarbeiter | Сотрудник |
| Finance / ledger | Finans / muhasebe | Finance / ledger | Finanzen / Hauptbuch | Финансы / реестр |
| Deposit | Depozito | Deposit | Kaution | Депозит |
| Debt restriction | Borç kısıtlaması | Debt restriction | Schuldenbeschränkung | Ограничение по задолженности |
| Service order | Hizmet talebi | Service order | Serviceauftrag | Заявка на услугу |
| Task / SLA | Görev / SLA | Task / SLA | Aufgabe / SLA | Задача / SLA |
| Roadmap | Yol haritası | Roadmap | Roadmap | Дорожная карта |

Using a fixed glossary means a German client and a Turkish client hear the *same product*
described with the *same words*, which builds trust and avoids confusion.

### 9.4 Subtitle standard

- Max 2 lines, ~42 characters per line.
- Subtitle stays on screen at least 1 second, at most 6 seconds.
- One `.vtt` per language per video, plus burned-in option for social/preview.

---

## 10. The website Demo Center (what we build in the app)

The Demo Center lives at the implemented route `/{locale}/pitch`. We build it natively
so it is free, always in our 4 languages, and always matches the product.

### 10.1 Page structure

```
/{locale}/pitch  →  "1Çatı Demo Center"
 ├─ Hero: autoplay-muted trailer (loop) + "Watch with sound" + language switch
 ├─ Interactive demo: "Explore 1Çatı" — role path cards
 │    [Executive] [Manager/Admin] [Accountant] [Staff/Operations]   (Resident later)
 ├─ Full walkthrough: 12–15 min player with chapter markers
 ├─ Chapter playlist: 6 thumbnails (overview … roadmap)
 └─ CTA: "Request access" / "Talk to us"
```

### 10.2 How the interactive demo works (native build)

- Each role card opens a **guided overlay** on top of the real app screens (or short clips),
  using the role-switch mode we already have.
- The guide shows 4–6 steps per role with a short caption each (from `messages/{locale}.json`).
- "Next / Back / Exit" controls; a progress dots row; a final CTA.
- Because it uses our real UI and our real translations, it is correct in all 4 languages by
  construction.

### 10.3 Engineering tasks (small, contained)

1. Keep the `pitch` page and components current (offer hero, role cards, AI guardrails, chapter playlist).
2. Add a localized strings block to each `messages/{locale}.json` (titles, captions, CTAs).
3. Host video files (start in `apps/web/public/` for simplicity; move to a CDN/storage bucket
   before production if file sizes grow).
4. Add lightweight analytics events: trailer play, role-path chosen, chapter played, CTA click.
5. Add a `.vtt` track per language to each player for accessibility.

### 10.4 Language behavior

- The page reads the current locale from the URL (`/de/pitch` → German trailer, German
  captions, German role guide). No separate work — it reuses the app's existing i18n.

---

## 11. Quality assurance checklist (per language, per video)

Run this for **every** deliverable: 4 trailers + 4 walkthroughs + 24 chapters + 4 interactive
demos. Nothing publishes until it passes.

**Language & audio**
- [ ] Voiceover matches the approved script (Whisper transcript diff).
- [ ] Correct language throughout — no mixed-language leftovers.
- [ ] Glossary terms match section 9.3 exactly.
- [ ] Audio is clear, evenly leveled, music ducked under voice.
- [ ] No clipping, no long silences, no abrupt cuts.

**Subtitles**
- [ ] Subtitles present, correct language, in sync (±0.3s).
- [ ] 2 lines max, readable length, correct timing.
- [ ] `.vtt` file attached to the web player.

**Visual & app accuracy**
- [ ] Screens match the live app for that locale (e.g. `/de/...` shows German UI).
- [ ] Only seeded demo data — no real names, no real personal data.
- [ ] No dev banners, console errors, or broken layouts on screen.
- [ ] Numbers consistent across chapters (769 units, balances).
- [ ] Roadmap items clearly marked as "coming", not presented as live.

**Brand & delivery**
- [ ] Same intro/outro, logo, colors, music across the set.
- [ ] File named per convention (`1cati-{piece}-{chapter}-{locale}.mp4`).
- [ ] 1080p, 16:9, plays correctly in the in-app player on desktop and mobile.

**Interactive demo (extra)**
- [ ] Each role path works and exits cleanly in all 4 languages.
- [ ] Captions come from `messages/{locale}.json` and read naturally.
- [ ] CTA links work; analytics events fire.

---

## 12. Practical build order with owners and checkpoints

This is the order to execute, matching the proposal's build order, with owners and a clear
"done when" for each step.

| # | Step | Owner | Done when |
|---|---|---|---|
| 1 | Approve this plan + lock the 4 languages and scope | Leadership | Sign-off recorded |
| 2 | Write trailer + walkthrough scripts (EN + TR master) | Product/Marketing | Scripts reviewed |
| 3 | Translate scripts to DE + RU (human-reviewed) | Localization | All 4 scripts locked |
| 4 | Prepare seeded demo data + demo mode | Engineering | No real data on screen |
| 5 | Build `scripts/demo-record.mjs` (Playwright capture) | Engineering | 4-locale clips export cleanly |
| 6 | Record the visual master (all scenes, all 4 locales) | Engineering | Clip set complete in S1–S11 |
| 7 | Produce the trailer first (4 languages) | Marketing/Editing | 4 trailers pass QA |
| 8 | Produce the 12–15 min walkthrough (4 languages) | Marketing/Editing | 4 walkthroughs pass QA |
| 9 | Cut the 6 chapters from the master (×4 languages) | Editing | 24 chapters pass QA |
| 10 | Generate voiceover (HeyGen) + subtitles (Whisper) | Marketing/QA | Audio + `.vtt` per language |
| 11 | Build the in-app Demo Center page (`/{locale}/pitch`) | Engineering | Page live in 4 languages |
| 12 | Build interactive role paths (native) | Engineering | 4 paths work in 4 languages |
| 13 | Full QA pass (section 11) on every deliverable | QA | Checklist 100% green |
| 14 | Publish + add analytics | Engineering | Live, events firing |

**Why trailer first:** it is short, public-facing, and forces us to lock style, music, glossary,
and the localization pipeline before we invest in the longer walkthrough. Once the trailer
pipeline works in 4 languages, the walkthrough and chapters reuse the exact same process.

---

## 13. Risks, cost discipline, and "do not do"

**Cost discipline (HeyGen credits)**
- Use HeyGen for **voiceover/dubbing + a short avatar intro/outro only**. Full avatar in every
  scene would burn credits fast and add little value over real product footage.
- Generate each language's voiceover **once** from a locked script — avoid re-running on small
  edits. Lock the script before generating audio.
- Keep the walkthrough at 12–15 min so it stays inside the Creator plan's ~30-min limit with
  room to spare.

**Risks & mitigations**
- *UI changes after recording* → we recorded per-scene with Playwright, so re-shoot only the
  changed scene in 4 languages.
- *German overrun* → allow trailer to extend to 70–75s; allow walkthrough scenes to hold longer.
- *Privacy (KVKK)* → seeded demo data only; QA explicitly checks for real names.
- *Over-promising* → roadmap items labeled "coming in Phase 10–15" in narration and on screen.
- *File size on web* → start in `public/`, move to storage/CDN before production if needed.

**Do not do (from the proposal, kept)**
- Do **not** make one 40-minute main video.
- Do **not** use full avatar for every language.
- Do **not** make the resident/tenant full video before Phases 10–12 are done.
- Do **not** burn HeyGen credits on experimental long templates.

---

## 14. Assumptions to confirm before build

These come from the proposal's cited sources and our plan. Confirm at kickoff:

1. **HeyGen Creator plan** really offers 600 credits, 1080p, up to ~30-min videos, 175+
   languages dubbing (per heygen.com/pricing and /translate). Verify current limits before
   committing the production schedule.
2. **DGX Whisper** is available to QA for transcripts/subtitles in TR/EN/DE/RU.
3. **One licensed music track** is cleared for commercial/web use in all target markets.
4. **Seeded demo dataset** is approved as the on-screen data (769 units, sample balances/tickets).
5. **Hosting**: `public/` is acceptable for first release; storage/CDN decision is made before
   production scale.
6. **Roadmap labeling** wording is approved by leadership so the "coming soon" framing is
   consistent and client-safe.

---

## 15. Final recommendation

Proceed. The proposal is sound and matches 2026 best practice. With the five refinements —
60-second trailer, native interactive demo first, a text-free visual master, seeded demo data,
and scene-clip recording — it becomes fully realistic for the current app, affordable on the
HeyGen Creator plan, honest about what is live versus roadmap, and easy to maintain as Phases
10–15 ship. The result is a single, professional 1Çatı Demo Center: simple for viewers,
credible for clients, and consistent across Turkish, English, German, and Russian.
