# Cati Web App

This is the Next.js application for the 1Çatı ERP and CRM workspace. It contains the public product pages, login flow, role-aware dashboard, AI API route, site-management modules, and Playwright tests.

## Main Areas

- `app/[locale]`: localized public pages and protected CRM routes
- `app/api`: access-profile, AI chat and site-management status APIs
- `components`: shared UI, charts, cards, operational widgets and assistant components
- `e2e`: Playwright coverage for landing, login, platform, dashboard and responsive checks
- `lib`: AI response helpers, local AI adapter, client context and site-management seed data

## Development

```bash
pnpm install
pnpm --dir apps/web dev -- -p 3100
```

Open `http://localhost:3100/tr/dashboard`.

## Environment

Copy `.env.example` to `.env.local` and fill local values. Never commit `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DOCUMENT_STORAGE_MODE=supabase
SUPABASE_DOCUMENT_BUCKET=cati-documents
AI_API_URL=
AI_API_KEY=
AI_CHAT_COMPLETIONS_PATH=/chat/completions
```

`SUPABASE_SERVICE_ROLE_KEY` is required only on the server for live document uploads and must be marked sensitive in Vercel. The default private Supabase Storage bucket is `cati-documents`.

## Quality

```bash
pnpm --dir apps/web typecheck
pnpm --dir apps/web lint
pnpm --dir apps/web build
pnpm --dir apps/web test:e2e -- --project=chromium
```

For phase 6-9 browser QA from the repository root:

```bash
pnpm phase:06-09
```
