# Cati Real Estate CRM

Cati is a premium real-estate ERP and site-management platform for Ataberk Estate operations. It combines a public product experience, a protected CRM dashboard, operational workflows, local AI integration, Supabase data foundations, Jira/Xray project automation, and business documentation for stakeholder delivery.

> [!IMPORTANT]
> This repository must never contain real credentials. Keep `.env.local`, browser caches, QA screenshots, generated reports, and export archives local. Use GitHub repository secrets for CI/Jira automation.

## What Is Included

| Area | Location | Purpose |
| --- | --- | --- |
| Web CRM app | `apps/web` | Next.js 16 application with landing pages, login, role-based dashboard, operational modules, AI API route, and Playwright QA. |
| Supabase | `supabase` | Database migrations, RLS-oriented foundation, and seed data for CRM/site operations. |
| Documentation | `docs` | Project handbook, active BRD/PRD/TRD package, runbooks, source material and current DOCX reading copies. |
| Automation | `scripts` | Browser QA, phase harnesses, Jira/Xray sync, screenshot capture, and document-generation utilities. |
| Twenty CRM | `twenty` | Self-hosted CRM reference/configuration area. |

## Current Product Scope

The current implementation is focused on Ataberk Estate operations and is structured so it can support more portfolios, sites and projects without rebuilding the product model.

ERP phase status:

- Phase 1: discovery, requirement lock and market benchmark
- Phase 2: UX/UI design system and role-based navigation
- Phase 3: platform foundation, auth, RBAC, RLS and audit
- Phase 4: site, block, floor, flat and import validation
- Phase 5: user, owner, tenant and staff management
- Phase 6: financial ledger engine
- Phase 7: payments, deposits, reconciliation and debt restrictions
- Phase 8: service catalogue and service order flow
- Phase 9: task, workforce, SLA and field reporting
- Phase 10: booking, letting, move-in and checkout
- Phase 11: communication, notifications and documents
- Phase 12: mobile PWA and installable workflows
- Phase 13: external integrations
- Phase 14: AI premium layer and advanced analytics
- Phase 15: QA, security, performance, UAT, training and launch

Current implementation status: phases 1-4 are connected as a local/Supabase-backed ERP foundation, phase 5 is ready for acceptance review, phases 6-7 are in active build, and phases 8-15 remain planned production work.

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
- `http://localhost:3100/tr/platform`
- `http://localhost:3100/tr/login`
- `http://localhost:3100/tr/dashboard`

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
- Preview Jira/Xray changes locally before remote sync: `pnpm jira:sync -- --dry-run`.
- Live Jira/Xray sync creates or updates 15 phase epics, 53 phase stories, one documentation issue, 20 UAT/Xray test cases and the managed current DOCX documentation package.
- The GitHub workflow `.github/workflows/jira-main-sync.yml` updates Jira issues referenced in commits that land on `main`.
- CI must provide these GitHub secrets: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.

## What Must Stay Out Of Git

- `.env`, `.env.local`, `.env.*.local`
- `.env.local.example` (use `.env.example` as the only committed template name)
- `.tmp/`
- generated QA output folders
- `playwright-report/`
- `test-results/`
- `node_modules/`
- generated `.zip` archives
- local browser caches, logs and temporary Word files

Use the committed templates for local setup:

- root `.env.example` is for repository automation such as Jira/Xray, Supabase import and QA harnesses.
- `apps/web/.env.example` is for the Next.js application runtime and Vercel.

To clean local generated files without removing dependencies:

```bash
pnpm clean:workspace
```

To preview the cleanup first:

```bash
pnpm clean:workspace -- --dry-run
```

Dependency folders are intentionally kept by default. Remove them only when you
want a fresh install:

```bash
pnpm clean:workspace -- --include-deps
```

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

Start with:

```text
docs/README.md
docs/PROJECT-HANDBOOK.md
docs/requirements/option-3-ai-site-crm/README.md
```

The current combined documentation reading copy is:

```text
docs/1Cati-Current-Project-Documentation.docx
```

Markdown files in `docs/requirements/option-3-ai-site-crm` are the canonical BRD/PRD/TRD and delivery sources. Matching `.docx` files are exports.
