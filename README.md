# Cati Real Estate CRM

Cati is a premium real-estate CRM and site-management platform for the Ataberk Estate / New Level Premium Avsallar pilot. It combines a public product experience, a protected CRM dashboard, operational workflows, local AI integration, Supabase data foundations, Jira/Xray project automation, and business documentation for stakeholder delivery.

> [!IMPORTANT]
> This repository must never contain real credentials. Keep `.env.local`, browser caches, QA screenshots, generated reports, and export archives local. Use GitHub repository secrets for CI/Jira automation.

## What Is Included

| Area | Location | Purpose |
| --- | --- | --- |
| Web CRM app | `apps/web` | Next.js 16 application with landing pages, login, role-based dashboard, operational modules, AI API route, and Playwright QA. |
| Pitch app | `apps/pitch` | Static customer-facing pitch/proposal experience. |
| Supabase | `supabase` | Database migrations, RLS-oriented foundation, and seed data for CRM/site operations. |
| Documentation | `docs` | German business blueprint, source material, phase documentation, and requirements archive. |
| Automation | `scripts` | Browser QA, phase harnesses, Jira/Xray sync, screenshot capture, and document-generation utilities. |
| Twenty CRM | `twenty` | Self-hosted CRM reference/configuration area. |

## Current Product Scope

The current implementation is focused on the Ataberk Estate / New Level Premium pilot and is structured so it can later be generalized for more projects.

Completed demo/package coverage:

- Phase 2: UX/UI and role-based navigation
- Phase 3: platform, auth, RBAC, audit and security controls
- Phase 4: site, block, flat and import validation model
- Phase 5: users, roles, residents and staff views
- Phase 6: viewing, online tour and follow-up pipeline
- Phase 7: sales payment plan, installment status and finance blockers
- Phase 8: purchase file, TAPU, KYC, EIDS and document checklist
- Phase 9: residence, citizenship and buyer eligibility pre-check

Planned next packages:

- Phase 10-12: communication, notifications, integrations, mobile/PWA workflows
- Phase 13-15: external systems, AI analytics, hardening, UAT, training and launch

## Tech Stack

- Next.js 16, React 19, TypeScript 5
- Tailwind CSS v4, Base UI, shadcn-compatible components
- Framer Motion, GSAP, Lucide icons
- Supabase SSR, Supabase JS, PostgreSQL migrations
- Playwright for browser and E2E testing
- Turbo + pnpm workspace
- Jira Cloud and Xray Cloud automation scripts
- Local/on-prem AI gateway support through environment variables

## Prerequisites

- Node.js 20 or newer
- pnpm 10 through Corepack
- Git
- Optional: Supabase CLI and Docker for local database work
- Optional: Playwright Chromium installed in a local browser cache

## Environment Setup

Create local environment files from the examples and fill them with real values only on your machine or in CI secrets.

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install
copy apps\web\.env.example apps\web\.env.local
```

For root-level automation scripts such as Jira/Xray sync, use a root `.env.local` with the same rule: local only, never committed.

Common variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TWENTY_API_URL=
TWENTY_API_KEY=
AI_API_URL=
AI_API_KEY=
AI_CHAT_COMPLETIONS_PATH=/chat/completions
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_PROJECT_KEY=CATI
XRAY_CLIENT_ID=
XRAY_CLIENT_SECRET=
```

## Run Locally

```bash
pnpm --dir apps/web dev -- -p 3100
```

Useful routes:

- `http://localhost:3100/tr`
- `http://localhost:3100/tr/login`
- `http://localhost:3100/tr/dashboard`
- `http://localhost:3100/tr/pitch`

## Quality Gates

Run these before creating a pull request:

```bash
pnpm --dir apps/web typecheck
pnpm --dir apps/web lint
pnpm --dir apps/web build
pnpm --dir apps/web test:e2e -- --project=chromium
```

If `pnpm` is not available in a local Windows shell, the app-level npm scripts can be used as a fallback from `apps/web`:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Phase-specific harness:

```bash
pnpm phase:06-09
```

If Playwright needs a workspace-local browser cache on Windows:

```bash
set PLAYWRIGHT_BROWSERS_PATH=.tmp\ms-playwright
set TEMP=.tmp
set TMP=.tmp
```

## Jira And GitHub Workflow

- Work on a feature branch, not directly on `main`.
- Recommended branch format: `feature/CATI-123-short-description` or `chore/release-readiness-github-jira`.
- Reference Jira issue keys in commits when work is tied to Jira, for example `CATI-123 add buyer eligibility precheck`.
- The GitHub workflow `.github/workflows/jira-main-sync.yml` updates Jira issues referenced in commits that land on `main`.
- CI must provide these GitHub secrets: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.

## What Must Stay Out Of Git

- `.env`, `.env.local`, `.env.*.local`
- `.tmp/`
- `quality/`
- `playwright-report/`
- `test-results/`
- generated `.zip` archives
- local browser caches, logs and temporary Word files

## Key Commands

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm browser:audit
pnpm jira:sync
pnpm jira:github-main-sync
pnpm phase:06-09
```

## Documentation

Start with `docs/README.md` to understand which documents are active, archived, or source-only. The main business-facing document is:

```text
docs/client-new-level-premium/New-Level-Premium-CRM-Business-Blueprint-DE.docx
```
