# CLAUDE.md, Experten-Projektdokumentation für KI-Coding-Agenten

> Erstellt: 1. Juli 2026 (Branch `waleri-dev`)
> Sprache: Deutsch (Agenten-Dokumentation), Business-/Produktdokumente in `docs/` sind Englisch
> Vertraulichkeit: STRICTLY CONFIDENTIAL, nicht veröffentlichen, nicht löschen
> Status: Diese Datei ist eine tiefgehende technische Ergänzung zu `AGENTS.md`, `docs/README.md` und `docs/PROJECT-HANDBOOK.md`. Bei Widersprüchen gilt die Reihenfolge in Abschnitt 0.

Diese Datei MUSS bei jeder zukünftigen Bearbeitung dieses Repositories zuerst gelesen werden, bevor Code geändert wird. Sie beschreibt Architektur, Datenmodell, Konventionen und Automatisierung so detailliert, dass ein Agent ohne weitere Exploration produktiv arbeiten kann.

> **Lies zuerst auch [`LESSONS-LEARNED.md`](LESSONS-LEARNED.md) (Repo-Wurzel)** und [`docs/PROJECT-STATUS-2026-07-23.md`](docs/PROJECT-STATUS-2026-07-23.md) (aktuellster Stand; ersetzt die 2026-07-22-Fassung). LESSONS-LEARNED enthält konkrete, wiederkehrende Fehler und ihre korrekten Lösungen aus früheren Sessions (Test-Exit-Codes hinter `tail` verstecken, e2e im dev-Modus OOM, Supabase-Grant-Hardening, RBAC-Rollen-Kaskaden, Seed-Drift, Migrationen gegen echtes Postgres validieren). Sie sind absichtlich eingecheckt, damit jede Maschine/Session sie erbt; ergänze sie bei jedem neuen nicht-offensichtlichen Fehler.

---

## 0. Dokumenten-Hierarchie (was gilt bei Widersprüchen)

1. `docs/PROJECT-HANDBOOK.md`, aktueller Implementierungsstatus, Phasenwahrheit, offene Entscheidungen (Single Source of Truth für Business/Produkt-Scope).
2. `docs/README.md`, Navigation und Pflegeregeln für den gesamten `docs/`-Baum.
3. `docs/requirements/option-3-ai-site-crm/README.md`, Index für BRD/PRD/TRD/Security/QA/Migration.
4. `AGENTS.md`, kompakte Agenten-Instruktionen (Repo-Struktur, Stack, Konventionen, Sicherheit).
5. **Diese Datei (`CLAUDE.md`)**, tiefe technische Referenz: exakte Dateien, Schema, Skripte, Datenflüsse.
6. Aktueller Code unter `apps/web`, `supabase`, `scripts`, im Zweifel ist der Code die Wahrheit, nicht ein Dokument.

Wenn Architektur, Struktur oder Konventionen sich ändern: `AGENTS.md`, `docs/README.md`, `docs/PROJECT-HANDBOOK.md` **und** diese Datei nachführen.

---

## 1. Projektüberblick

**1Çatı** ("Ein Dach") ist eine Property-Management- und Real-Estate-ERP-Plattform für **Ataberk Estate** (Türkei), umgesetzt durch **WAMOCON GmbH**. Zielgruppen: russisch- und türkischsprachige Käufer/Verkäufer/Eigentümer/Mieter sowie internes Betriebspersonal.

| Fakt | Wert |
|---|---|
| Projektname | 1Çatı (Cati) |
| Auftraggeber | Ataberk Estate, Türkei |
| Umsetzung/Beratung | WAMOCON GmbH |
| Mandanten-Website | https://www.ataberkestate.com/ |
| Live-Deployment (Vercel) | https://cati-blond.vercel.app |
| Primäre Betriebssprache | Türkisch (`tr`), Zielgruppen zusätzlich `ru`, Doku-Fallback `en`/`de` |
| CRM-Kern (geplant/vorbereitet) | Twenty CRM (Open Source, AGPL-3.0), self-hosted |
| Auth/DB/Realtime/Storage | Supabase (PostgreSQL) |
| Repository | https://github.com/Wamocon/Cati |
| Arbeitsbranch | Feature-/Fix-Branches nach Konvention; `waleri-dev`-Exklusivvorgabe aufgehoben |

Das Repository enthält **ein zentrales Produkt-Deliverable**: `apps/web`, eine Next.js-Anwendung, die öffentliche Produktseiten, Login/Auth und ein rollenbasiertes CRM-/ERP-Portal in einer App vereint (kein separates Backend-Repo).

### 15-Phasen-ERP-Modell (Delivery-Rahmen)

| Phase | Inhalt | Stand (siehe `docs/PROJECT-HANDBOOK.md`, 29.06.2026) |
|---|---|---|
| 1 | Discovery, Requirement Lock, Marktbenchmark | Abgeschlossen |
| 2 | UX/UI-Designsystem, rollenbasierte Navigation | Abgeschlossen |
| 3 | Plattform-Fundament, Auth, RBAC, RLS, Audit | Abgeschlossen |
| 4 | Site/Block/Floor/Flat, Import-Validierung | Abgeschlossen |
| 5 | User-, Owner-, Tenant-, Staff-Management | Abgeschlossen (Foundation/UAT-reif) |
| 6 | Finanz-Ledger-Engine | Abgeschlossen (Foundation/UAT-reif) |
| 7 | Payments, Deposits, Reconciliation, Schuldner-Restriktionen | Abgeschlossen (Foundation/UAT-reif) |
| 8 | Service-Katalog, Service-Order-Flow | Abgeschlossen (Foundation/UAT-reif) |
| 9 | Task-/Workforce-/SLA-/Feldreporting | Abgeschlossen (Foundation/UAT-reif) |
| 10 | Booking, Letting, Move-in/Checkout | Nächster aktiver Build |
| 11 | Kommunikation, Benachrichtigungen, Dokumente | Beschleunigtes Lieferfenster |
| 12 | Mobile PWA / installierbare Workflows | Beschleunigtes Lieferfenster |
| 13 | Externe Integrationen | Beschleunigtes Lieferfenster |
| 14 | AI-Premium-Layer, Advanced Analytics | Beschleunigtes Lieferfenster |
| 15 | QA, Security, Performance, UAT, Training, Launch | Beschleunigtes Lieferfenster |

Wichtige Grenze laut Handbook: Phase 5-9 sind als **Implementierungs-Fundament** fertig (API + UI + Harness-Nachweis), aber **nicht produktionsscharf**, es fehlen Kundendaten-Validierung, Accounting-/Legal-Review, Provider-Entscheidungen und UAT-Sign-off. Zahlungs-, Bank-, Zugangs-, Storage-, Messaging- und AI-Automatisierung dürfen niemals als "live" dargestellt werden, solange diese Punkte offen sind (siehe Abschnitt 11 "Offene Entscheidungen").

---

## 2. Repository-Struktur (vollständig, verifiziert)

```
Cati/
├── AGENTS.md                     # Kompakte Agenten-Instruktionen (Deutsch)
├── CLAUDE.md                     # Diese Datei
├── CONTRIBUTING.md               # Branch-/Commit-/PR-Workflow
├── README.md                     # Öffentliche Projekt-Kurzübersicht (Englisch)
├── package.json                  # Root-Workspace: Turbo-Scripts, Jira/QA/Supabase-Befehle
├── pnpm-workspace.yaml            # Workspaces: apps/*, packages/*  (packages/ existiert aktuell NICHT im Baum)
├── turbo.json                     # Turborepo-Pipeline (build/dev/lint/test/typecheck)
├── qa.py, qa-web.py, qa-web-direct.py   # Standalone Playwright-Python-QA-Skripte (Root-Ebene, ad-hoc Screenshots)
├── .github/workflows/jira-main-sync.yml # CI: Jira-Update bei Push auf main
├── apps/
│   └── web/                      # Next.js 16 App, Produktseite + CRM/ERP-Portal (Details: Abschnitt 3)
├── supabase/                     # Migrationen, Seed, lokale Config (Details: Abschnitt 4)
├── scripts/                      # Automatisierung: QA-Harness, Jira/Xray-Sync, Datenimport (Details: Abschnitt 5)
├── docs/                         # Projekt-, Produkt-, Technik-, QA-Dokumentation (Details: Abschnitt 6)
└── twenty/                       # Docker-Compose-Referenz für Twenty CRM (nur Config, kein Vendor-Fork; Details: Abschnitt 7)
```

`packages/ui` wird in `AGENTS.md` und `pnpm-workspace.yaml` als vorgesehener Ort für geteilte shadcn/ui-Komponenten erwähnt, existiert aber **noch nicht** im Dateibaum, bei Bedarf neu anlegen, nicht als vorhanden voraussetzen.

---

## 3. `apps/web`, Next.js-Anwendung (Kernprodukt)

### 3.1 Tech-Stack (exakt aus `apps/web/package.json`)

- **Next.js 16.2.6** (App Router), **React 19.2.4**, **TypeScript 5** (strict)
- **Tailwind CSS v4** (`@tailwindcss/postcss`), `tw-animate-css`, `tailwind-merge`, `class-variance-authority`
- **@base-ui/react** (Base UI Primitives) + `shadcn` CLI, eigene UI-Bausteine unter `components/ui/`
- **Framer Motion 12**, **GSAP 3 + @gsap/react** für Animationen
- **Lucide React** (Icons, Paketname `lucide-react`, aktuell Version `^1.21.0` gepinnt)
- **next-intl 4** für i18n
- **next-themes** für Dark/Light-Theme
- **@supabase/ssr** + **@supabase/supabase-js** für Auth/DB
- **Playwright** (`@playwright/test`) für E2E
- Paketmanager: **pnpm 10** (Corepack), Node **>= 20**
- Scripts: `dev`, `build`, `start`, `lint` (ESLint 9 Flat Config), `format` (Prettier + Tailwind-Plugin), `typecheck` (`tsc --noEmit`), `test:e2e` (Playwright)

### 3.2 App-Router-Struktur

Alles Produkt-Routing läuft über `app/[locale]/...` (next-intl Locale-Segment). Es gibt zusätzlich einen locale-losen Wurzelbereich (`app/layout.tsx`, `app/global-error.tsx`, `app/not-found.tsx`) als Next.js-Root-Shell.

**Öffentliche Seiten** (`app/[locale]/`):
- `page.tsx`, Landingpage (setzt sich aus `app/sections/*` zusammen: `top-bar`, `navbar`, `hero`, `problem-bento`, `solution-grid`, `stats`, `how-it-works`, `services`, `platform-workflow`, `new-level-immersion`, `compliance-features`, `cta`, `footer`)
- `about/page.tsx`, `platform/page.tsx`, `reviews/page.tsx`, `privacy/page.tsx`, `terms/page.tsx`
- `login/page.tsx`, Login inkl. lokaler Access-Profile-Rollenwahl (siehe 3.4)
- `signup/page.tsx`
- `error.tsx`, `not-found.tsx`, locale-spezifische Error-Boundaries

**Geschütztes Dashboard** (`app/[locale]/dashboard/`):
- `layout.tsx`, Dashboard-Shell (bindet `dashboard-sidebar.tsx`, `dashboard-topbar.tsx`, `dashboard-route-guard.tsx` ein)
- `dashboard-route-guard.tsx`, Client-seitiger Zusatzschutz zur Proxy-Middleware (Abschnitt 3.3)
- `page.tsx`, Übersicht/KPI-Dashboard
- Modul-Seiten: `listings/`, `leads/`, `calendar/`, `finance/`, `documents/`, `compliance/`, `users/`, `reports/`, `tickets/`, `communications/`, `settings/`

**API-Routen** (`app/api/`):
| Route | Zweck |
|---|---|
| `api/access-profile/route.ts` | Setzt/löscht das `access_profile_role`-Cookie für lokale QA-Rollenwahl |
| `api/ai/chat/route.ts` | KI-Assistent-Endpunkt (Details Abschnitt 3.6) |
| `api/site-management/dashboard/route.ts` | Dashboard-Snapshot (Supabase-first, Fallback lokal) |
| `api/site-management/phase-status/route.ts` | Status je ERP-Phase für die Phasenkarte im Dashboard |
| `api/site-management/phase4/route.ts` | Site/Block/Floor/Flat-Daten (Phase 4) |
| `api/site-management/search/route.ts` | Volltext-/Fuzzy-Suche über `operational_search_documents` |
| `api/site-management/actions/route.ts` | Schreibt Aktions-/Audit-Log-Einträge (`ai_action_logs`/`audit_events`) |
| `api/site-management/finance/route.ts` | Finanz-Ledger (Phase 6) |
| `api/site-management/payment-controls/route.ts` | Zahlungs-/Depot-/Schuldner-Restriktionen (Phase 7) |
| `api/site-management/tickets/route.ts` | Service-Tickets/-Orders (Phase 8-9) |
| `api/site-management/users/route.ts` | Nutzer-/Rollen-Verwaltung (Phase 5) |
| `api/site-management/import/preview/route.ts` | Vorschau eines Dateneingang-Imports (Validation) |
| `api/site-management/import/commit/route.ts` | Commit eines validierten Imports |

**Wiederkehrendes Architekturmuster:** Jede `site-management`-API-Route und die zugehörigen Dashboard-Komponenten laufen über `apps/web/lib/site-management-repository.ts`, welches je Funktion prüft, ob Supabase konfiguriert ist (`isSupabaseConfigured()`), und sonst transparent auf deterministische Seed-Daten aus `apps/web/lib/site-management-data.ts` zurückfällt. Jede zurückgegebene Struktur hat ein `source: "supabase" | "local-seed"`-Feld, **beim Debuggen von Datenproblemen immer zuerst dieses Feld prüfen**, bevor man einen DB-Fehler vermutet.

### 3.3 Auth, RBAC und Middleware

- **`apps/web/proxy.ts`**, Next.js 16 Proxy (Nachfolger der klassischen `middleware.ts`). Kombiniert in einem Request-Zyklus:
  1. `next-intl`-Locale-Routing (`createIntlMiddleware`, `localePrefix: "always"`, Locales `tr|en|de|ru`, Default `tr`).
  2. Supabase-Session-Refresh via `createServerClient` aus `@supabase/ssr` (liest/schreibt Cookies auf Request **und** Response).
  3. Route-Guard: `/dashboard`-Pfade sind geschützt. Ohne Supabase-Konfiguration oder ohne gültige Session wird auf `/{locale}/login` umgeleitet, **außer** `NEXT_PUBLIC_ENABLE_ACCESS_PROFILES=true` ist gesetzt (dann bleibt der Zugriff für lokale QA offen).
  4. Ist ein Nutzer eingeloggt und ruft `/login` auf, erfolgt Redirect zu `/dashboard`.
  5. Matcher: `["/", "/(tr|en|de|ru)/:path*"]`.

- **`apps/web/lib/auth.ts`**, `getUserProfile()` ist die zentrale Funktion für Server Components/Routen:
  - Ist Supabase **nicht** konfiguriert (keine `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`), wird **immer** ein lokales Access-Profile zurückgegeben (Priorität: `access_profile_role`-Cookie → `NEXT_PUBLIC_ACCESS_PROFILE_ROLE`-Env → Default `"manager"`).
  - Ist Supabase konfiguriert, wird `supabase.auth.getUser()` + ein Read auf `profiles` ausgeführt; fehlt das Profil, wird ein minimales `tenant`-Profil zurückgegeben.
  - `isAccessProfileEnabled()` = `!isSupabaseConfigured() || NEXT_PUBLIC_ENABLE_ACCESS_PROFILES === "true"`. **Diese lokalen Access-Profile sind ausschließlich für kontrollierte lokale/QA-Umgebungen gedacht und dürfen in Produktion nicht aktiv sein.**

- **`apps/web/lib/rbac.ts`**, Canonical-Permission-Matrix, clientseitig und serverseitig gleich genutzt (**muss synchron zu den Supabase-RLS-Policies gehalten werden**, siehe Kommentar im Code: "Keep in sync with Supabase RLS and tests"):
  - 6 Rollen: `admin` (Level 90, Scope company), `manager` (70, site), `accountant` (60, finance), `staff` (40, field), `owner` (20, owned_unit), `tenant` (10, rented_unit).
  - 14 Resources: `dashboard, listings, leads, deals, tickets, calendar, documents, eids_compliance, finance, reports, users, settings, communications, offline_sync`.
  - 8 Actions: `view, create, update, delete, manage, export, approve, assign`.
  - Permission-String-Format: `"{resource}:{action}"`. Helper: `hasPermission`, `hasAnyPermission`, `getAccessibleResources`, `isAdmin`, `isManagerOrAbove`, `roleScope`.
  - Dashboard-Sidebar und KPI-Karten filtern nach `useUser()`/`UserProvider` (`apps/web/components/user-provider.tsx`) gegen diese Matrix.

- **`apps/web/lib/supabase/`**: `client.ts` (Browser-Client), `server.ts` (Server-Client + `createServiceRoleClient` für privilegierte Server-Operationen), `middleware.ts` (Session-Refresh-Helper, von `proxy.ts` genutzt).

### 3.4 Lokale Access-Profile (wichtig für lokale Entwicklung/QA)

Die Login-Seite zeigt in kontrollierten Umgebungen eine Rollenauswahl (6 Rollen mit Beschreibung). Klick auf eine Rolle ruft `api/access-profile/route.ts` auf, setzt das Cookie `access_profile_role` und leitet zum Dashboard weiter, so lässt sich RBAC ohne echte Supabase-Auth durchklicken. Playwright-Tests aktivieren dies über `NEXT_PUBLIC_ENABLE_ACCESS_PROFILES=true` (siehe `playwright.config.ts`). **Niemals in Produktion aktivieren**, außer nach expliziter, dokumentierter Freigabe für eine kontrollierte Umgebung.

### 3.5 i18n

- `apps/web/i18n.ts`: `locales = ["tr","en","de","ru"]`, `defaultLocale = "tr"`. Übersetzungsdateien unter `apps/web/messages/{tr,en,de,ru}.json`.
- `next.config.ts` bindet `next-intl/plugin` ein.
- Locale-Switcher (`components/locale-switcher.tsx`) baut die Ziel-URL **manuell** aus der aktuellen URL, um Doppel-Locale-Bugs wie `/en/en` zu vermeiden.
- Keys werden in Englisch benannt, Primärsprache der Inhalte ist Türkisch.

### 3.6 KI-Integration (AI-Assistent)

- **`app/api/ai/chat/route.ts`**: nimmt `{ message: string }` entgegen (max. 2000 Zeichen), lädt das aktuelle Nutzerprofil (`getUserProfile`), bestimmt über `apps/web/lib/ai-responses.ts` eine **RBAC-Zugriffsentscheidung** (`getAiAccessDecision`) und einen **deterministischen Kontext** (`generateAiResponse`) rein aus den Seed-/Live-Daten.
- Ist der Zugriff laut RBAC verweigert, wird ausschließlich der deterministische Kontext mit `source: "rbac-guard"` zurückgegeben, **kein LLM-Call**.
- Ist kein lokaler KI-Gateway konfiguriert (`AI_API_URL`/`AI_API_KEY` fehlen, geprüft via `apps/web/lib/local-ai.ts` → `isLocalAiConfigured()`), Antwort mit `source: "deterministic-fallback"`.
- Ist ein Gateway konfiguriert, wird `completeWithLocalAi()` aufgerufen: POST an `${AI_API_URL}${AI_CHAT_COMPLETIONS_PATH}` (Default-Pfad `/chat/completions`) im OpenAI-kompatiblen Chat-Completions-Format, mit Bearer-Token `AI_API_KEY`. Modellwahl je "Purpose" (`fast`/`reasoning`/`german-copy`/`pro`) über eigene Env-Vars (`AI_MODEL_FAST`, `AI_MODEL_REASONING`, `AI_MODEL_GERMAN_COPY`, `AI_MODEL_PRO`); `choosePurpose()` wählt anhand türkischer Schlüsselwörter (`rapor`, `analiz`, `risk`, `plan`, `finans`) zwischen `fast` und `pro`.
- System-Prompt (Türkisch) verbietet dem Modell explizit, Finanz-/Zugangs-/Berechtigungsaktionen direkt auszuführen, es darf nur empfehlen und muss auf menschliche Freigabe verweisen. Das ist ein bewusstes Sicherheits-Gate, **beim Ändern des Prompts nicht abschwächen**.
- Schlägt der Gateway-Call fehl, greift ein Catch-Block auf `deterministic-fallback` zurück, der Endpunkt liefert also nie einen 5xx wegen eines KI-Ausfalls.
- Dies ist bewusst **kein** Anthropic-/Claude-Aufruf, sondern ein generischer, austauschbarer "Local/On-Prem AI Gateway" (im Code als `sokrates-fast`/`sokrates-pro`/`qwen3.6-35b`/`gemma4-31b` referenziert, Platzhalter-Modellnamen des Kunden-Setups, keine Anthropic-Modelle).

### 3.7 Design-System

- **Glassmorphism**: `.glass`-Utility + `components/glass-card.tsx`.
- **Aurora-Hintergründe**: `components/aurora-background.tsx`, CSS-only, respektiert `prefers-reduced-motion`.
- **BuildingIllustration**: `components/building-illustration.tsx`, SVG-Gebäudeillustration im Hero, hat `hyper-frame.tsx` (3D-Variante) als veraltete Vorgänger-Komponente abgelöst (letztere ist noch im Baum, aber nicht mehr primär genutzt, vor Löschung erst auf Referenzen prüfen).
- **DashboardPreview**: `components/dashboard-preview.tsx`, SVG-Produktvorschau.
- **KineticHeadline**: `components/kinetic-headline.tsx`, Wort-für-Wort-Animation.
- **ScrollReveal**: `components/scroll-reveal.tsx`.
- Weitere Live-/Simulations-Komponenten: `erp-product-cloud.tsx`, `isometric-erp-world.tsx`, `site-command-simulation.tsx`, `phase4-live-operations.tsx`, `finance-live-ledger.tsx`, `people-directory-live.tsx`, `payment-restriction-control.tsx`, `sync-badge.tsx` (zeigt Live/Poll-Sync-Status), `dashboard-command-ribbon.tsx`, `dashboard-action-button.tsx`, `dashboard-refresh-button.tsx`, `status-badge.tsx`, Charts unter `components/charts/{bar,line,pie}-chart.tsx`.
- UI-Primitives (shadcn-Stil) unter `components/ui/{button,input,label}.tsx`.
- Theming: `theme-provider.tsx` + `theme-toggle.tsx` (next-themes).

### 3.8 Live-Dashboard-Refresh

`apps/web/hooks/use-live-dashboard-snapshot.ts` kapselt Supabase-Realtime-Subscriptions (wo konfiguriert) mit einem **30-Sekunden-Polling-Fallback**. `components/sync-badge.tsx` visualisiert den Sync-Status. Die zugrundeliegenden Realtime-Publikationen sind in der Migration `00000000000004_realtime_operational_dashboard.sql` definiert (Abschnitt 4).

### 3.9 Testing

- **Playwright** (`apps/web/playwright.config.ts`): Testverzeichnis `e2e/`, Projekte `chromium` + `mobile-chrome` (Pixel 5), Basis-URL `http://localhost:3100`, startet den Next-Server automatisch (`dev` oder `start`, steuerbar über `PLAYWRIGHT_SERVER_MODE`/`PLAYWRIGHT_REUSE_SERVER`) mit `NEXT_PUBLIC_ENABLE_ACCESS_PROFILES=true`.
- Test-Dateien: `e2e/dashboard.spec.ts`, `e2e/landing.spec.ts`, `e2e/language.spec.ts`, `e2e/login.spec.ts`, `e2e/platform.spec.ts`, `e2e/responsive.spec.ts`, `e2e/helpers.ts`.
- Auf Windows ggf. `PLAYWRIGHT_BROWSERS_PATH`/`TEMP`/`TMP` auf `.tmp` setzen (siehe README).

### 3.10 Environment-Variablen (`apps/web/.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TWENTY_API_URL=
TWENTO_API_KEY=            # Hinweis: Tippfehler im Beispiel-File ("TWENTO" statt "TWENTY"), im echten .env.local korrekt als TWENTY_API_KEY verwenden, Code erwartet TWENTY_API_KEY
AI_API_URL=
AI_API_KEY=
AI_CHAT_COMPLETIONS_PATH=/chat/completions
AI_MODEL_FAST=sokrates-fast
AI_MODEL_REASONING=qwen3.6-35b
AI_MODEL_GERMAN_COPY=gemma4-31b
AI_MODEL_PRO=sokrates-pro
```
Zusätzlich global relevant (Root-Ebene / Server-Kontext, nicht in `apps/web/.env.example`, aber in `README.md`/Code referenziert): `NEXT_PUBLIC_ACCESS_PROFILE_ROLE`, `NEXT_PUBLIC_ENABLE_ACCESS_PROFILES`, `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`, `JIRA_PROJECT_NAME`, `XRAY_CLIENT_ID`, `XRAY_CLIENT_SECRET`.

`apps/web/lib/database.types.ts` (Supabase-generierte TS-Typen) ist **nicht** eingecheckt, wird lokal via `pnpm supabase:types` erzeugt. Vor Arbeiten, die auf diese Typen angewiesen sind, prüfen ob die Datei existiert; falls nicht, Hinweis geben statt Import zu erzwingen.

---

## 4. `supabase/`, Datenbankschicht

Struktur: `supabase/config.toml` (lokale Studio/API/DB/Auth-Ports), `supabase/seed.sql`, `supabase/migrations/*.sql` (7 Dateien, chronologisch über Zeitstempel-Präfix `00000000000000`–`00000000000006`).

Lokale Ports (`config.toml`): API `55321`, DB `55322`, Studio `55323`, Inbucket (Mail) `55324`, Analytics `55327`. `major_version = 15` (Postgres 15 Engine-Kompatibilität im lokalen CLI trotz `db: postgres:16` im Twenty-Compose, zwei getrennte Postgres-Instanzen, nicht verwechseln).

### 4.1 Migrationen im Detail

| Datei | Inhalt |
|---|---|
| `00000000000000_initial_schema.sql` | `public.profiles` (erweitert `auth.users`), RLS "read/update own profile", Trigger `on_auth_user_created` (Profil-Auto-Erstellung bei Signup). |
| `00000000000001_rbac.sql` | Erweitert `profiles.role` auf die 6 kanonischen Rollen (synchron zu `lib/rbac.ts`), SQL-Helper-Funktionen: Rollen-Hierarchie-Level, Rollen-Scope, `is_admin()`, "hat Rolle Level >= X" (für "manager or above"-Policies), `current_user_role()` (liest Rolle aus `profiles`, **bewusst nicht aus dem JWT**, da `user_metadata` clientseitig manipulierbar ist). Aktualisierte Policies: eigenes Profil lesen, Admin/Manager lesen alle Profile, eigenes Profil updaten. Indizes für Policy-Performance. |
| `00000000000002_site_crm_core.sql` | Produktions-Domänenmodell: `companies`, `offices`, `sites`, `site_blocks`, `site_floors`, `units`, `residents`, `unit_residents`, `vendors`, `service_tickets`, `service_ticket_events`, `finance_ledger_entries`, `payment_transactions`, `reservations`, `documents`, `access_events`, `ai_action_logs`, `audit_events`. RLS auf `companies` (Mitglieder lesen eigene Company, Super-Admins erstellen, Company-Admins updaten eigene Company) und erweiterte Policies auf `profiles`/`service_tickets`. |
| `00000000000003_operational_api_foundation.sql` | Fügt Backend-for-Frontend-Unterstützung hinzu: Erweiterungen an `sites`, `units`, `residents`, `service_tickets`, `documents`, `finance_ledger_entries` (inkl. Trigger `prevent_posted_ledger_mutation`, **gebuchte Ledger-Einträge sind unveränderlich**, wichtige Buchhaltungs-Invariante). Neue Tabellen: `import_batches`, `import_findings` (Datenimport-Validierung/QA), `staff_members`, `role_coverage`, `client_action_requests`, `integration_outbox` (Outbox-Pattern für externe Integrationen), `operational_search_documents` (Volltextsuche). Erneuert Signup-Trigger. |
| `00000000000004_realtime_operational_dashboard.sql` | Registriert dashboard-relevante Tabellen (Units, Finance, Tickets, Reservations, AI-Actions, Imports, Client-Action-Requests) bei der Supabase-Realtime-Publikation für Live-Updates im Dashboard. |
| `00000000000005_new_level_premium_unit_sales.sql` | Additive Erweiterung von `units` um typisierte Sales-/Nummerierungs-/Quell-Evidenz-Felder für den "New Level Premium"-Datensatz (Import-QA), ohne bestehende Feldsemantik zu brechen. |
| `00000000000006_service_operations_phase_08_09.sql` | Phase 8-9: `service_catalog`, `service_orders`, `workforce_tasks`, `media_reports` (Foto/Video-Nachweise für Feldarbeit). Policies: Staff darf zugewiesene Workforce-Tasks updaten und Media-Reports einfügen. |

### 4.2 Kernentitäten & Beziehungen (vereinfacht)

```
companies ─┬─ offices ─┬─ sites ─┬─ site_blocks ─ site_floors ─ units ─┬─ unit_residents ─ residents
           │            │        │                                    ├─ reservations
           └─ profiles ─┘        └─ service_tickets ─ service_ticket_events
                                            │
units ─ finance_ledger_entries ─ payment_transactions
units ─ service_orders (Katalog: service_catalog) ─ workforce_tasks ─ media_reports
sites ─ import_batches ─ import_findings
profiles ─ staff_members / role_coverage
(alle Domänen) ─ audit_events / ai_action_logs / access_events / integration_outbox / operational_search_documents
```

### 4.3 RBAC in der Datenbank vs. Frontend

Die Rollenliste in `supabase/migrations/00000000000001_rbac.sql` **muss** exakt mit `apps/web/lib/rbac.ts` (`roles`-Array) übereinstimmen. Wird eine Rolle im Frontend ergänzt/entfernt, ist zwingend eine neue Migration erforderlich, niemals nur clientseitig ändern.

### 4.4 Supabase-Skripte (Root `package.json`)

| Script | Befehl | Zweck |
|---|---|---|
| `supabase:start` / `:stop` / `:status` | `npx supabase start/stop/status` | Lokaler Docker-Stack |
| `supabase:reset` | `npx supabase db reset` | Migrationen + Seed neu anwenden |
| `supabase:types` | `npx supabase gen types typescript --local --schema public > apps/web/lib/database.types.ts` | Generiert die (nicht eingecheckten) TS-Typen |
| `supabase:cloud:import` / `:verify-only` | `node scripts/supabase-cloud-import.mjs [--verify-only]` | Import/Verifikation gegen eine Supabase-Cloud-Instanz |

---

## 5. `scripts/`, Automatisierung

| Datei | Zweck |
|---|---|
| `phase-harness.mjs` | Generischer Phasen-Harness: `--phase <1-15> --profile <smoke\|full> --max-attempts <n>`. Kennt alle 15 Phasennamen, orchestriert Build/Lint/Browser-Checks je Phase, Ergebnisse unter `quality/results`, Temp-Arbeitsverzeichnis `.tmp`. |
| `phase-continuity-harness.mjs` | Übergreifender Kontinuitäts-Check über mehrere Phasen. |
| `phase-05-06-harness.mjs`, `phase-06-09-harness.mjs` | Phasen-Bündel-spezifische Harness-Varianten (People/Finance bzw. Finance-Service-Ops), genutzt von `pnpm phase:05-06` / `pnpm phase:06-09`. |
| `browser-audit.mjs` | Startet (optional) den Next-Server und führt Playwright-Browser-Audits gegen `http://127.0.0.1:3100` aus; Flags `--base-url`, `--start-server`, `--headed`, `--hold-ms`, `--out-dir`, `--timeout-ms`, `--server-mode`. Ausgabe nach `quality/browser-audit`. |
| `full-app-qa-harness.mjs` | Vollständiger App-QA-Lauf (`pnpm qa:full-app`). |
| `manual-phase-qa.mjs` | Manuelle/gezielte Phasen-QA-Unterstützung. |
| `dashboard-context-check.mjs` | Konsistenzprüfung des Dashboard-Kontexts/-Daten. |
| `inspect-ataberk-pages.mjs`, `inspect-new-level-listings.mjs` | Inspektions-/Scraping-Hilfsskripte für Quelldaten (Ataberk-Seiten, "New Level"-Listings). |
| `jira-xray-sync.mjs` | Synchronisiert 15 Phasen-Epics, 53 Phasen-Stories, ein Doku-Issue und 20 UAT/Xray-Testfälle nach Jira Cloud/Xray Cloud sowie das gemanagte DOCX-Doku-Paket. Lädt `.env.local`, erfordert `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_NAME`, `JIRA_PROJECT_KEY` (außer im `--dry-run`), Flags `--dry-run`, `--skip-attachments`. **Schreibt bei echtem Lauf remote in Jira und kann vertrauliche Dokumente anhängen, nur nach expliziter Freigabe ausführen, sonst immer `--dry-run`.** |
| `jira-github-main-update.mjs` | Aktualisiert Jira-Issues, die in Commit-Messages auf `main` referenziert werden (`CATI-123 ...`); wird von `.github/workflows/jira-main-sync.yml` bei Push auf `main` aufgerufen. |
| `supabase-cloud-import.mjs` | Importiert/verifiziert Daten gegen eine Supabase-Cloud-Instanz (`--verify-only` für reinen Check). |
| `build-docx-from-md.py`, `markdown-to-basic-docx.ps1` | Erzeugen die DOCX-Lesekopien aus den kanonischen Markdown-Requirements-Dokumenten. |
| `extract-new-level-premium-data.py`, `build-new-level-premium-dataset.py` | Extraktion/Aufbau des "New Level Premium"-Beispiel-/Import-Datensatzes (unterstützt Migration `...0005`). |
| `add-demo-translations.js`, `patch-dashboard-messages.js`, `patch-legal-messages.js` | Einmalige/wiederholbare Patch-Skripte für `messages/*.json` (i18n-Nachpflege). |

Root-Python-QA-Skripte (`qa.py`, `qa-web.py`, `qa-web-direct.py`) sind **eigenständig von den Node/Playwright-Harnessen**, schlanke `playwright.sync_api`-Skripte, die gezielt Screenshots/Konsolenlogs einzelner Seiten (z. B. `/tr/platform`) unter `qa_output/` erzeugen. Sinnvoll für schnelle visuelle Ad-hoc-Checks, nicht für CI-Gates.

### 5.1 GitHub Actions

`.github/workflows/jira-main-sync.yml`, Trigger: `push` auf `main`. Checkt aus, installiert Node 20, führt `node scripts/jira-github-main-update.mjs` mit Secrets `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` aus (Projekt-Key fest `CATI`). Das ist der **einzige** GitHub-Workflow im Repository, es existiert aktuell **keine** automatisierte CI für Lint/Typecheck/Build/Test bei Pull Requests; diese Quality Gates sind laut `CONTRIBUTING.md`/`README.md` manuell vor jedem PR auszuführen.

---

## 6. `docs/`, Dokumentationssystem

Kanonische Struktur (siehe `docs/README.md`, "Documentation Hub"):

```
docs/
├── README.md                     # Navigation + Pflegeregeln (Start hier)
├── PROJECT-HANDBOOK.md            # Single Entry Point, aktueller Status, Phasenwahrheit
├── local-supabase.md              # Lokales Supabase-Setup, Seed-Login, Ports, Cloud-Migration
├── 1Cati-Current-Project-Documentation.docx   # Generierte kombinierte Lesekopie
├── requirements/option-3-ai-site-crm/
│   ├── README.md                  # Index für das gesamte Requirements-Paket
│   ├── BRD.md / PRD.md / TRD.md   # Business-/Produkt-/Technik-Anforderungen
│   ├── Security-Compliance-Plan.md   # KVKK-orientiert, OWASP-ASVS-angelehnt
│   ├── Data-Migration-Plan.md
│   ├── QA-UAT-Launch-Plan.md
│   ├── Requirements-Traceability-Matrix.md
│   ├── Third-Party-Integration-And-Vendor-Plan.md
│   ├── Implementation-Delivery-Plan.md
│   ├── Market-Research-Annex.md, Source-Register.md
│   └── qa/requirements-docs-qa.md
├── ways-of-work/
│   ├── plan/option-3-ai-site-crm/implementation-plan.md          # Engineering-Feature-Inventar
│   └── implementation/option-3-ai-site-crm/phase-execution-runbook.md  # Harness-Befehle, QA-Kadenz, Stop-Bedingungen
└── source/client-inputs/          # Rohmaterial des Kunden (nicht editierbar als aktive Quelle)
```

**Governance-Regeln (verbindlich):**
- Markdown ist die editierbare Quelle der Wahrheit für Requirements/Technik/QA/Delivery; `.docx` sind generierte Exporte/Stakeholder-Lesekopien.
- Rohe Kundeneingaben in `docs/source/client-inputs/` bleiben unverändert Beweismaterial, nicht neu schreiben.
- Keine generierten QA-Artefakte (Screenshots, JSON-Reports, HTML-Previews) im Repo behalten.
- Bei Architektur-/Struktur-/Doku-Änderungen: `docs/README.md`, `docs/PROJECT-HANDBOOK.md`, betroffener BRD/PRD/TRD-Abschnitt **und** `AGENTS.md`/`CLAUDE.md` aktualisieren.

**Offene Produkt-/Delivery-Entscheidungen** (aus `PROJECT-HANDBOOK.md` §6, erfordern Kunden-/Legal-/Vendor-Freigabe, nicht durch Code allein lösbar): Supabase Cloud Pro Setup, Zahlungsanbieter, Zugangssystem (Vendor/API/manueller Fallback), Schuldner-basierte Restriktionen (Legal/Accounting-Review), Datenretention, Native-App vs. PWA-only, historische Datenmigration, Produktions-UAT, Jira-Live-Sync-Freigabe.

---

## 7. `twenty/`, Twenty CRM

**Wichtig, oft missverstanden:** `twenty/` enthält **ausschließlich** `docker-compose.yml` und `.env.example`, **kein** Vendor-Checkout/Fork des Twenty-CRM-Quellcodes. Der Compose-Stack zieht das offizielle Image `twentycrm/twenty:${TAG:-latest}` und startet 4 Services: `server` (Port 3000, App-Container), `worker` (Background-Jobs, `yarn worker:prod`), `db` (Postgres 16, getrennt von der Supabase-Postgres-Instanz), `redis`. Konfigurierbar u. a. über `SERVER_URL`, `STORAGE_TYPE`/`STORAGE_S3_*`, `ENCRYPTION_KEY`, `APP_SECRET`; Google-/Microsoft-OAuth- und E-Mail-SMTP-Variablen sind vorbereitet, aber standardmäßig auskommentiert.

Laut `apps/web/.env.example` ist eine Anbindung über `TWENTY_API_URL`/`TWENTY_API_KEY` vorgesehen, **im aktuell analysierten Code von `apps/web` gibt es jedoch keinen aktiven Verbrauch dieser Variablen** (kein gefundener Fetch-Call gegen Twenty), die CRM-Property-Objekte (`Property`, `Unit`, `Lead`, `Opportunity`, `Lease`, `Booking`, `MaintenanceTicket`, `Contractor`, `Document`, `Appointment`, `Message`, siehe `AGENTS.md`) sind stattdessen bereits direkt als Supabase-Tabellen umgesetzt (Abschnitt 4). Twenty ist also aktuell **Referenz-/Zielarchitektur für ein mögliches späteres CRM-Backend**, nicht produktiv verdrahtet. Vor Aussagen wie "Twenty ist integriert" den aktuellen Code prüfen, nicht nur `AGENTS.md`.

---

## 8. Build-, Dev- und Quality-Gate-Befehle

```bash
# Setup
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install
copy apps\web\.env.example apps\web\.env.local     # Windows; echte Werte nur lokal/CI-Secrets

# Dev
pnpm --dir apps/web dev -- -p 3100
# Routen: /tr  /tr/platform  /tr/login  /tr/dashboard

# Quality Gates (vor jedem PR, Pflicht laut CONTRIBUTING.md)
pnpm --dir apps/web typecheck
pnpm --dir apps/web lint
pnpm --dir apps/web build
pnpm --dir apps/web test:e2e -- --project=chromium

# Windows-Fallback ohne funktionierendes pnpm im Shell
npm.cmd run typecheck   # aus apps/web
npm.cmd run lint
npm.cmd run build

# Phasen-Harness
pnpm phase:06-09
pnpm phase:harness -- --profile smoke --max-attempts 2

# Jira/Xray (immer erst Dry-Run!)
pnpm jira:sync -- --dry-run
```

Es existiert **keine automatisierte PR-CI** für diese Gates, sie müssen von jedem Agenten/Entwickler manuell vor dem Erstellen eines PRs ausgeführt und deren Ergebnis im PR dokumentiert werden (siehe `CONTRIBUTING.md`).

---

## 9. Git-/Jira-Workflow

- Branch-Konvention: `feature/CATI-123-kurzbeschreibung`, `fix/CATI-123-...`, `chore/...`. (Die frühere Vorgabe, ausschließlich auf `waleri-dev` zu arbeiten, ist aufgehoben.)
- Commit-Format: Jira-Key voranstellen, wenn ein Ticket existiert (`CATI-123 add buyer eligibility precheck`), sonst konventioneller `type: description`-Stil (siehe Historie: `feat:`, `fix:`, `docs:`, `chore:`).
- PRs benötigen: Business-Summary, Technical-Summary, Jira-Key oder Begründung, Validierungsbefehle+Ergebnisse, Screenshots bei UI-Änderungen, Risiken/Follow-ups.
- `.github/workflows/jira-main-sync.yml` aktualisiert bei Push auf `main` automatisch referenzierte Jira-Issues.

---

## 10. Sicherheitsregeln (verbindlich für jede Änderung)

1. **Niemals** echte Zugangsdaten committen. `.env`, `.env.local`, `.env.*.local` sind in `.gitignore`; nur `.env.example` mit Platzhaltern pflegen.
2. RLS in Supabase gilt für **alle** Benutzerdaten-Tabellen; jede neue Tabelle mit personenbezogenen/finanziellen Daten braucht von Anfang an eine RLS-Policy, nicht nachträglich.
3. `lib/rbac.ts` (Frontend) und die SQL-RBAC-Helper (`00000000000001_rbac.sql`) müssen bei Rollenänderungen **gemeinsam** aktualisiert werden.
4. Der KI-System-Prompt in `app/api/ai/chat/route.ts` darf nie so geändert werden, dass das Modell Finanz-/Zugangs-/Berechtigungsaktionen direkt ausführt statt sie nur zu empfehlen.
5. Lokale Access-Profile (`NEXT_PUBLIC_ENABLE_ACCESS_PROFILES`) dürfen nicht in produktionsnahen Deployments aktiv sein.
6. Secrets (OAuth-Keys, Supabase Service-Role-Key, Twilio, Cal.com etc.) ausschließlich über Vercel-Environment-Variablen bzw. GitHub-Secrets injizieren, nie hardcoden.
7. Twenty CRM ist AGPL-3.0, Modifikationen bleiben im internen Betrieb des Mandanten, keine Weiterverteilung.
8. Vor `pnpm jira:sync` ohne `--dry-run` explizite Nutzerfreigabe einholen (schreibt remote, kann vertrauliche Dokumente anhängen).

---

## 11. Entwicklungskonventionen

- TypeScript strict, keine `any` ohne Begründung im Code-Kommentar.
- Server Components sind Default; `"use client"` nur wenn nötig (State/Effects/Browser-APIs).
- Tailwind-Utility-Klassen; Inline-Styles nur für tatsächlich dynamische Werte (z. B. berechnete Positionen).
- Forms: React Hook Form + Zod (Standard, sofern im jeweiligen Formular schon etabliert, vor Abweichung prüfen, was die Nachbar-Komponenten nutzen).
- Server State bevorzugt über Server Actions/TanStack Query; Client State mit Zustand nur bei echtem Bedarf.
- Icons ausschließlich Lucide React.
- i18n-Keys Englisch benennen, Übersetzungen in `messages/*.json` pflegen; Türkisch ist die inhaltliche Leitsprache.
- Datumsrechnungen/Seed-Skripte müssen plattformportabel sein (siehe Commit `fix: make supabase seed date math portable`, keine shell-spezifische Datumsarithmetik in Seeds).

---

## 12. Stand Juli 2026, Best-Practice-Leitplanken für neue Arbeit

Bei jeder neuen Implementierung in diesem Projekt zusätzlich beachten (aktueller Stand der hier verwendeten Frameworks):

- **Next.js 16 / React 19**: React Server Components + Server Actions als Standardpfad für Datenmutationen; `proxy.ts` ist der offizielle Nachfolger von `middleware.ts` in Next 16, keine neue `middleware.ts` parallel anlegen.
- **TypeScript 5**, strikte Typprüfung; öffentliche Funktionsschnittstellen explizit typisieren statt `any`/`unknown` ohne Guard.
- **Tailwind v4**: CSS-first-Konfiguration (keine `tailwind.config.js`-Altlasten einführen, falls das Projekt bereits auf die v4-CSS-Konfiguration migriert ist, vor Änderungen prüfen, welche Konfigurationsdatei tatsächlich vorhanden ist).
- **Supabase**: RLS-first-Design, Service-Role-Key nie im Browser-Bundle; neue Tabellen immer mit Migration + RLS in derselben PR.
- **Barrierefreiheit/Performance**: `prefers-reduced-motion` respektieren (bereits Konvention in diesem Projekt), Lighthouse als sinnvolles zusätzliches Gate einplanen, auch wenn es aktuell kein festes Package-Script ist.
- **Sicherheit**: OWASP-Top-10-Bewusstsein bei jeder neuen API-Route (Input-Validierung wie in `api/ai/chat/route.ts` als Vorbild: Typprüfung, Längenlimit, Fehlerstatus statt Exception-Leak).
- Vor jeder Umsetzung neuer Patterns: bestehenden Code als Referenz nehmen (z. B. `site-management-repository.ts` als Vorbild für "Supabase-first mit lokalem Fallback"), keine Parallel-Patterns ohne Grund einführen.

---

## 13. Verifikations-Hinweis für Agenten

Diese Datei wurde durch Analyse des tatsächlichen Codes (nicht nur bestehender Doku) erstellt und mit `AGENTS.md`, `README.md`, `docs/README.md` und `docs/PROJECT-HANDBOOK.md` abgeglichen. Einzelne Abweichungen zwischen Doku und Code wurden bewusst markiert (z. B. `TWENTO_API_KEY`-Tippfehler in `.env.example`, fehlende `packages/`-Ordner, keine aktive Twenty-Anbindung im Code, fehlende PR-CI). Bei zukünftigen größeren Refactorings: diese Datei zuerst aktualisieren, dann Code ändern, dann verifizieren (Typecheck/Lint/Build/E2E), damit sie nicht veraltet.
