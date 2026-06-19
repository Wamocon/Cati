# AGENTS.md - Projektübersicht für KI-Coding-Agenten

> Stand: Juni 2026
> Sprache der Projektdokumentation: Deutsch
> Vertraulichkeit: STRICTLY CONFIDENTIAL

## Projektübersicht

Dieses Repository enthält **zwei klar getrennte Deliverables** für die digitale Transformationsinitiative **„1Çatı“** (1Cat) bei Ataberk Estate:

1. **`apps/pitch/`** — Eine statische HTML-Verkaufspräsentation / das Angebot an den Kunden. Sie erklärt das CRM-System, visualisiert die Probleme türkischer Property Manager mit Zahlen/Daten/Fakten und bietet dann die Lösung. Sie sagt ehrlich, was das System aktuell kann und was noch auf der Roadmap liegt.
2. **`apps/web/`** — Die eigentliche Next.js-Anwendung: eine modernisierte Ataberk-Landingpage (primär Türkisch) mit integriertem Login/Auth sowie dem CRM-Portal dahinter.

- **Auftraggeber:** Ataberk Estate, Türkei (Zielgruppe: russischsprachige Käufer, Verkäufer, Eigentümer; lokale Betriebssprache Türkisch)
- **Durchführung / Beratung:** WAMOCON GmbH
- **Projektname:** 1Çatı — Property-Management-Plattform
- **Mandanten-Website:** https://www.ataberkestate.com/
- **Immobilienbestand:** 212.298+ Objekte in der Datenbank
- **Live-Web-App:** https://cati-blond.vercel.app
- **Live-Pitch:** https://cati-pitch.vercel.app
- **CRM-Kern:** Twenty CRM (Open Source, AGPL-3.0)
- **Auth & Datenbank:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Frontend:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui

## Repository-Struktur

```
Cati/
├── apps/
│   ├── pitch/              # Statisches HTML-Angebot / Pitch (englisch)
│   │   ├── index.html
│   │   └── assets/
│   └── web/                # Next.js App (Landingpage + CRM-Portal)
│       ├── app/            # App Router
│       │   ├── sections/   # Landingpage-Sektionen
│       │   ├── dashboard/  # CRM-Portal-Platzhalter
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
├── docs/                   # Architektur-, Produkt- und QA-Dokumentation
│   ├── product-roadmap.md  # Mapping realer Marktprobleme → Features
│   └── qa-report-*.md      # Playwright QA-Berichte inkl. Screenshots
├── wmc_report.md           # Strategiepapier (bestehend)
├── WMC_Anforderung_1Çatı.docx
├── 1cati_strategiepapier.docx
└── AGENTS.md               # Diese Datei
```

## Wichtige Unterscheidung: Pitch vs. Produkt

### `apps/pitch/index.html`
- **Zweck:** Verkaufsdokument an Entscheider bei Ataberk Estate.
- **Inhalt:** Problem → Marktrealität → Lösung → Ehrlicher Scope → Roadmap/Investment.
- **Sprache:** Englisch (leicht verständlich für internationale Stakeholder).
- **Deployment:** Statisch auf Vercel, `https://cati-pitch.vercel.app`.

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
- **3D HyperFrame** interaktives CSS-3D-Gebäude-Modell im Hero (`components/hyper-frame.tsx`), reagiert auf Mausbewegung.
- **Kinetic Typography** animierte Wort-für-Wort-Überschriften (`components/kinetic-headline.tsx`).
- **Scroll-Reveal** Eintrittsanimationen via `components/scroll-reveal.tsx`.
- **Sticky Glass-Navbar** blendet sich beim Scrollen nach unten aus, beim Scrollen nach oben wieder ein.

### Backend & Auth
- **Supabase Auth** (Email/Passwort, Magic Link, Google OAuth, später TOTP-2FA)
- **Supabase PostgreSQL** mit RLS
- **Supabase Realtime** für Echtzeit-Updates
- **Supabase Storage** für Dateien
- **Supabase SSR** Helpers (`@supabase/ssr`)
- **RBAC** Rollen- und Rechtesystem (`apps/web/lib/rbac.ts`, `apps/web/lib/auth.ts`)

### CRM-Kern
- **Twenty CRM** (self-hosted via Docker Compose)
- Erweiterung um Property-Management-Objekte: `Property`, `Unit`, `Lead`, `Opportunity`, `Lease`, `Booking`, `MaintenanceTicket`, `Contractor`, `Document`, `Appointment`, `Message`

### Testing & QA
- **Vitest** für Unit-Tests
- **Playwright** für E2E-Tests und visuelle QA (siehe `apps/web/e2e/`)
- **Lighthouse** für Performance, A11y, SEO

### Deployment
- **Vercel** für beide Apps
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

# apps/pitch
npx serve apps/pitch            # Lokale Vorschau des Pitches
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
- **Demo-Anmeldung** in der Entwicklung: Login-Seite zeigt Buttons für alle 10 Rollen. Klick setzt ein `demo_role`-Cookie und leitet zum Dashboard weiter, um jede Rolle zu testen.
- **Secrets** niemals committen (`.env*` ist in `.gitignore`).
- **OAuth-Keys**, **Supabase service role key**, **Twilio**, **Cal.com**-Keys über Vercel Environment Variables injizieren.
- **Twenty-AGPL:** Modifikationen bleiben im internen Betrieb des Mandanten; keine Distribution.

## Nächste Schritte (laufend)

1. Supabase-Auth mit Vercel-Umgebungsvariablen aktivieren (für Demo: `NEXT_PUBLIC_DEMO_ROLE` in `.env.local`).
2. CRM-Datenmodell in Supabase/Twenty aufbauen (Properties, Leads, Tickets, Documents).
3. Dashboard-Module mit echten Daten verbinden.
4. MVP-Module für EİDS-Tracking, Compliance-Checklisten und Mehrwährung implementieren.
5. Server Actions / API-Routen mit rollenbasierten Prüfungen (`hasPermission`) absichern.
6. Playwright-E2E-Tests (`apps/web/e2e/`) für jedes Release ausführen und QA-Bericht in `docs/` pflegen.

## Hinweis für Agenten

- Nicht löschen oder veröffentlichen — Inhalte sind vertraulich.
- Änderungen an `AGENTS.md` müssen bei Architektur- oder Strukturänderungen nachgeführt werden.
- Vor größeren Architekturentscheidungen einen Plan erstellen und absegnen lassen.
