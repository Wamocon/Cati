# AGENTS.md - Projektübersicht für KI-Coding-Agenten

> Stand: Juni 2026
> Sprache der Projektdokumentation: Deutsch
> Vertraulichkeit: STRICTLY CONFIDENTIAL

## Projektübersicht

Dieses Repository enthält **ein zentrales Produkt-Deliverable** für die digitale Transformationsinitiative **„1Çatı“** (1Cat) bei Ataberk Estate:

1. **`apps/web/`** — Die eigentliche Next.js-Anwendung: öffentliche ERP-Produktseiten, integrierter Login/Auth sowie das rollenbasierte CRM-/ERP-Portal dahinter.

- **Auftraggeber:** Ataberk Estate, Türkei (Zielgruppe: russischsprachige Käufer, Verkäufer, Eigentümer; lokale Betriebssprache Türkisch)
- **Durchführung / Beratung:** WAMOCON GmbH
- **Projektname:** 1Çatı — Property-Management-Plattform
- **Mandanten-Website:** https://www.ataberkestate.com/
- **Immobilienbestand:** 212.298+ Objekte in der Datenbank
- **Live-Web-App:** https://cati-blond.vercel.app
- **CRM-Kern:** Twenty CRM (Open Source, AGPL-3.0)
- **Auth & Datenbank:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Frontend:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui

## Repository-Struktur

```
Cati/
├── apps/
│   └── web/                # Next.js App (Produktseite + CRM-/ERP-Portal)
│       ├── app/            # App Router
│       │   ├── sections/   # Landingpage-Sektionen
│       │   ├── dashboard/  # CRM-Portal und 15-Phasen-ERP-Dashboard
│       │   └── login/      # Auth-Login-Seite
│       ├── components/     # React-Komponenten
│       ├── lib/            # Hilfsfunktionen (Supabase, i18n, RBAC)
│       ├── messages/       # next-intl Übersetzungen (tr, en, de, ru)
│       ├── public/         # Statische Assets
│       └── package.json
├── packages/
│   └── ui/                 # Optionale geteilte shadcn/ui-Komponenten
├── twenty/                 # Twenty CRM Self-Hosting (Docker Compose)
├── supabase/               # Supabase Migrations, Seed, RLS-Policies
├── docs/                   # Projekt-, Produkt-, Technik-, QA- und Übergabedokumentation
│   ├── README.md           # Dokumentationskarte und Pflege-Regeln
│   ├── PROJECT-HANDBOOK.md # Zentrale Projektübersicht / Main Handbook
│   ├── requirements/option-3-ai-site-crm/
│   │   ├── README.md       # Index für BRD, PRD, TRD, Security, QA, Migration
│   │   ├── BRD.md
│   │   ├── PRD.md
│   │   └── TRD.md
│   ├── source/client-inputs/ # Originale Kundenvorgaben und extrahierte Texte
│   ├── ways-of-work/       # Implementierungsplan und Phase-Execution-Runbook
└── AGENTS.md               # Diese Datei
```

## Produktstruktur

### `apps/web/`
- **Zweck:** Öffentliche Landingpage (transformierter Ataberk-Content) + geschütztes CRM-Portal.
- **Primäre Sprache:** Türkisch (`tr`), mit Fallback-Kopien für `en`, `de`, `ru`.
- **Deployment:** Vercel, `https://cati-blond.vercel.app`.

## Technologie-Stack

### Frontend
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4**
- **shadcn/ui** (Base-Nova-Preset)
- **Framer Motion** für Animationen
- **Lucide React** für Icons
- **next-intl** für i18n (Locale-Switcher baut die Ziel-URL manuell aus der aktuellen URL, um Doppel-Locale-Probleme wie `/en/en` zu vermeiden)

### Design-System (Premium UI)
- **Glassmorphism** über `.glass` Utility + `GlassCard`-Komponente.
- **Aurora-Hintergründe** animierte, verschwommene Gradient-Kugeln (CSS-only, `prefers-reduced-motion` beachtet).
- **Bento-Grid** Layouts für Problem-, Lösungs-, Service- und Compliance-Sektionen.
- **BuildingIllustration** realistische SVG-Gebäude-Illustration im Hero (`components/building-illustration.tsx`), themenfähig und animiert.
- **DashboardPreview** SVG-Produktvorschau im Platform-Workflow (`components/dashboard-preview.tsx`).
- **3D HyperFrame** (veraltet) wurde durch `BuildingIllustration` ersetzt.
- **Kinetic Typography** animierte Wort-für-Wort-Überschriften (`components/kinetic-headline.tsx`).
- **Scroll-Reveal** Eintrittsanimationen via `components/scroll-reveal.tsx`.
- **Sticky Glass-Navbar** blendet sich beim Scrollen nach unten aus, beim Scrollen nach oben wieder ein.

### Backend & Auth
- **Supabase Auth** (Email/Passwort, Magic Link, Google OAuth, später TOTP-2FA)
- **Supabase PostgreSQL** mit RLS
- **Supabase Realtime** für Echtzeit-Updates
- **Supabase Storage / privates Objekt-Storage** für Dateien; aktueller Upload-Pfad ist API- und DB-ready, Live-Bucket/S3-Modus wird erst mit Produktionsfreigabe aktiviert.
- **Supabase SSR** Helpers (`@supabase/ssr`)
- **RBAC** Rollen- und Rechtesystem (`apps/web/lib/rbac.ts`, `apps/web/lib/auth.ts`)

### CRM-Kern
- **Twenty CRM** (self-hosted via Docker Compose)
- Erweiterung um Property-Management-Objekte: `Property`, `Unit`, `Lead`, `Opportunity`, `Lease`, `Booking`, `MaintenanceTicket`, `Contractor`, `Document`, `Appointment`, `Message`

### Testing & QA
- **Playwright** für E2E-Tests und visuelle QA (siehe `apps/web/e2e/`)
- **TypeScript / ESLint / Next build** als aktuelle technische Quality Gates
- **Phase-Harnesses** (`scripts/phase-harness.mjs`, `scripts/phase-06-09-harness.mjs`, `scripts/phase-10-11-harness.mjs`, `scripts/phase-12-14-harness.mjs`) für wiederholbare Build-, Browser- und QA-Schleifen
- **Lighthouse** ist als Performance-/A11y-/SEO-Gate sinnvoll, aber derzeit kein fest verdrahtetes Package-Script

### Deployment
- **Vercel** für `apps/web`
- **Turborepo** / `pnpm workspaces` für das Monorepo

## Build-Befehle

```bash
# Root
pnpm install          # Alle Workspaces installieren
pnpm dev              # Alle Apps im Dev-Modus starten
pnpm build            # Alle Apps bauen
pnpm test             # Alle Tests ausführen

# apps/web
pnpm --filter cati-web dev      # Next.js Dev-Server
pnpm --filter cati-web build    # Produktionsbuild
pnpm --filter cati-web lint     # Linting
pnpm --filter cati-web typecheck

```

## Entwicklungskonventionen

- **TypeScript-Codestyle:** Strict, explizite Typen, keine `any` ohne Begründung.
- **Komponenten:** Server Components by default; Client Components nur bei Bedarf (`"use client"`).
- **Styling:** Tailwind-Utility-Klassen; keine Inline-Styles außer für dynamische Werte.
- **Forms:** React Hook Form + Zod.
- **Server State:** TanStack Query / Server Actions.
- **Client State:** Zustand bei Bedarf.
- **Icons:** Lucide React.
- **i18n:** Keys in Englisch, Übersetzungen in `messages/*.json`. Primäre Sprache ist Türkisch (`tr.json`).

## Sicherheit

- **RLS** in Supabase für alle Benutzerdaten aktivieren.
- **RBAC** Rollenbasierte Zugriffssteuerung für alle Module definiert (`apps/web/lib/rbac.ts`) und in der Datenbank gespiegelt (`supabase/migrations/00000000000001_rbac.sql`).
- **Route-Guards** über `apps/web/proxy.ts` (Next.js 16 Proxy): Session-Refresh, Locale-Routing und Weiterleitung nicht authentifizierter Benutzer von `/dashboard` zu `/login`.
- **Dashboard** filtert Sidebar und KPI-Karten basierend auf der aktuellen Rolle (`useUser` / `UserProvider`).
- **Lokale Access-Profile** funktionieren nur in kontrollierten lokalen/QA-Umgebungen: Login-Seite zeigt Rollen mit Beschreibung. Klick setzt ein `access_profile_role`-Cookie und leitet zum Dashboard weiter, um RBAC zu prüfen. In Produktion bleibt echte Auth maßgeblich.
- **Secrets** niemals committen (`.env*` ist in `.gitignore`).
- **OAuth-Keys**, **Supabase service role key**, **Twilio**, **Cal.com**-Keys über Vercel Environment Variables injizieren.
- **Twenty-AGPL:** Modifikationen bleiben im internen Betrieb des Mandanten; keine Distribution.

## Nächste Schritte (laufend)

1. Supabase-Auth mit Vercel-Umgebungsvariablen aktivieren (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) und lokale Access-Profile in Produktion deaktiviert lassen.
2. Phase 5-14 Foundation mit echten Kundendaten verifizieren und fehlende Produktionsfelder ergänzen.
3. Phase 12 als mobile-friendly Web/PWA weiterführen; keine native App bauen, solange der Kunde keine Store-App bestätigt.
4. Phase 13 externe Anbieter zunächst als Provider-ready/Demo-Placeholder lassen; echte Zahlung, Bank, SMS/E-Mail, Dokument-Storage/S3, Zugang/Kamera und OAuth-Anbindung erst nach Verträgen, API-Keys, Bucket-/Retention-Entscheid und Freigabe aktivieren.
5. Phase 14 AI nur guardrailed betreiben: same-language Antworten, Empfehlungen, Berichte und Bild-/Kanit-Workflows; keine autonomen Finanz-, Refund-, Zugangs- oder Rollenaktionen.
6. Phase 15 mit Security-/RLS-Prüfung, Performance, UAT, Training, Backup/Restore und Launch-Runbook abschließen.
7. Playwright-E2E-Tests (`apps/web/e2e/`) und Phase-Harnesses für jedes Release ausführen; lokale Rohartefakte nicht behalten, aktuelle Nachweise gehören nur als gepflegte Markdown- oder DOCX-Lesefassung in die aktive `docs/`-Struktur.

## Hinweis für Agenten

- Nicht löschen oder veröffentlichen — Inhalte sind vertraulich.
- Änderungen an `AGENTS.md`, `docs/README.md` und `docs/PROJECT-HANDBOOK.md` müssen bei Architektur-, Struktur- oder Dokumentationsänderungen nachgeführt werden.
- Vor größeren Architekturentscheidungen einen Plan erstellen und absegnen lassen.
