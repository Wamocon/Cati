# AGENTS.md - Projektübersicht für KI-Coding-Agenten

> Stand: Juni 2026
> Sprache der Projektdokumentation: Deutsch
> Vertraulichkeit: STRICTLY CONFIDENTIAL

## Projektübersicht

Dieses Repository enthält nun **zwei klar getrennte Deliverables** für die digitale Transformationsinitiative **„1Çatı“** (1Cat) bei Ataberk Estate:

1. **`apps/pitch/`** — Eine statische HTML-Verkaufspräsentation / das Angebot an den Kunden. Sie erklärt das CRM-System, visualisiert die Probleme türkischer Property Manager mit Zahlen/Daten/Fakten und bietet dann die Lösung. Sie sagt ehrlich, was das System aktuell kann und was noch auf der Roadmap liegt.
2. **`apps/web/`** — Die eigentliche Next.js-15-Anwendung: eine modernisierte Ataberk-Landingpage mit integriertem Login/Auth sowie das CRM-Portal dahinter.

- **Auftraggeber:** Ataberk Estate, Türkei (Zielgruppe: russischsprachige Käufer, Verkäufer, Eigentümer)
- **Durchführung / Beratung:** WAMOCON GmbH
- **Projektname:** 1Çatı — Property-Management-Plattform
- **Mandanten-Website:** https://www.ataberkestate.com/
- **Immobilienbestand:** 212.298+ Objekte in der Datenbank
- **CRM-Kern:** Twenty CRM (Open Source, AGPL-3.0)
- **Auth & Datenbank:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui

## Repository-Struktur

```
Cati/
├── apps/
│   ├── pitch/              # Statisches HTML-Angebot / Pitch
│   │   ├── index.html
│   │   └── assets/
│   └── web/                # Next.js 15 App (Landingpage + CRM-Portal)
│       ├── app/            # App Router
│       ├── components/     # React-Komponenten
│       ├── lib/            # Hilfsfunktionen
│       ├── hooks/          # Custom Hooks
│       ├── public/         # Statische Assets
│       └── package.json
├── packages/
│   └── ui/                 # Optionale geteilte shadcn/ui-Komponenten
├── twenty/                 # Twenty CRM Self-Hosting (Docker Compose)
├── supabase/               # Supabase Migrations, Seed, RLS-Policies
├── docs/                   # Architektur- und Workflow-Dokumentation
├── wmc_report.md           # Strategiepapier (bestehend)
├── WMC_Anforderung_1Çatı.docx
├── 1cati_strategiepapier.docx
└── AGENTS.md               # Diese Datei
```

## Wichtige Unterscheidung: Pitch vs. Produkt

### `apps/pitch/index.html`
- **Zweck:** Verkaufsdokument an Entscheider bei Ataberk Estate.
- **Inhalt:** Problem → Lösung → Ehrlicher Scope. Kein Code, keine ausführbare App.
- **Sprache:** Deutsch (wie bisher), kann aber bei Bedarf angepasst werden.
- **Deployment:** Statisch auf Vercel, z. B. `https://cati-pitch.vercel.app`.

### `apps/web/`
- **Zweck:** Öffentliche Landingpage (transformierter Ataberk-Content) + geschütztes CRM-Portal.
- **Primäre Sprache:** Russisch (Zielgruppe), später Türkisch/Englisch/Deutsch.
- **Deployment:** Vercel, z. B. `https://cati-blond.vercel.app`.

## Technologie-Stack

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4**
- **shadcn/ui** (Base-Nova-Preset)
- **Framer Motion** + **GSAP ScrollTrigger** für Animationen
- **React Three Fiber** (optional, selektiv für Hero-3D-Effekte)
- **Lucide React** für Icons
- **next-intl** für i18n

### Backend & Auth
- **Supabase Auth** (Email/Passwort, Magic Link, Google OAuth, später TOTP-2FA)
- **Supabase PostgreSQL** mit RLS
- **Supabase Realtime** für Echtzeit-Updates
- **Supabase Storage** für Dateien

### CRM-Kern
- **Twenty CRM** (self-hosted via Docker Compose)
- Erweiterung um Property-Management-Objekte: `Property`, `Unit`, `Lead`, `Opportunity`, `Lease`, `Booking`, `MaintenanceTicket`, `Contractor`, `Document`, `Appointment`, `Message`

### Testing & QA
- **Vitest** für Unit-Tests
- **Playwright** für E2E-Tests und visuelle QA (Screenshots, Console-Logs)
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
```

## Entwicklungskonventionen

- **TypeScript-Codestyle:** Strict, explizite Typen, keine `any` ohne Begründung.
- **Komponenten:** Server Components by default; Client Components nur bei Bedarf (`"use client"`).
- **Styling:** Tailwind-Utility-Klassen; keine Inline-Styles außer für dynamische Werte.
- **Forms:** React Hook Form + Zod.
- **Server State:** TanStack Query / Server Actions.
- **Client State:** Zustand bei Bedarf.
- **Icons:** Lucide React.
- **i18n:** Keys in Englisch, Übersetzungen in `messages/ru.json`, `messages/tr.json`, etc.

## Sicherheit

- **RLS** in Supabase für alle Benutzerdaten aktivieren.
- **Secrets** niemals committen (`.env*` ist in `.gitignore`).
- **OAuth-Keys**, **Supabase service role key**, **Twilio**, **Cal.com**-Keys über Vercel Environment Variables injizieren.
- **Twenty-AGPL:** Modifikationen bleiben im internen Betrieb des Mandanten; keine Distribution.

## Nächste Schritte (laufend)

1. `apps/web` Landingpage mit Ataberk-Content aufbauen.
2. Supabase-Auth in Landingpage integrieren.
3. Dashboard-Shell und CRM-Module (Properties, Leads, Tickets, Calendar) implementieren.
4. `apps/pitch/index.html` nach Problem → Lösung → Ehrlicher Scope neu schreiben.
5. Playwright-QA für jedes Release durchführen.

## Hinweis für Agenten

- Nicht löschen oder veröffentlichen — Inhalte sind vertraulich.
- Änderungen an `AGENTS.md` müssen bei Architektur- oder Strukturänderungen nachgeführt werden.
- Vor größeren Architekturentscheidungen einen Plan erstellen und absegnen lassen.
