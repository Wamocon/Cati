# Supabase Cloud Runbook

This project is operated against the hosted Supabase project only.

Project:

```text
Name: 1CATI
Project ref: hczmbaqofxyusellxhyp
API URL: https://hczmbaqofxyusellxhyp.supabase.co
Region: eu-central-1
```

## Environment

The web app runtime values live in `apps/web/.env.local` for local development and in Vercel Environment Variables for deployed environments.

Required app variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hczmbaqofxyusellxhyp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<cloud-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<cloud-service-role-key>
DOCUMENT_STORAGE_MODE=supabase
SUPABASE_DOCUMENT_BUCKET=cati-documents
ENABLE_ACCESS_PROFILES=false
CATI_ALLOW_REMOTE_ACCESS_PROFILES=false
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser, commit it to `.env`, or prefix it with `NEXT_PUBLIC_`.

## Schema And Storage

Migrations under `supabase/migrations/` are the database source of truth.

Cloud state verified on 6 July 2026:

- Migrations `00000000000000` through `00000000000013` are applied to the linked cloud project.
- All 46 expected public REST tables are visible.
- Realtime publication supports the operational dashboard/action tables used by the app.
- Private Storage bucket `cati-documents` exists with a 25 MB file limit.
- Allowed document MIME types: PDF, JPEG, PNG, WebP, Word and Excel.
- New Supabase Auth users receive a `tenant` profile attached to the default `ataberk-estate` company. Role elevation to manager/admin remains an explicit service-role/admin operation.

Private document uploads use `DOCUMENT_STORAGE_MODE=supabase` and `SUPABASE_SERVICE_ROLE_KEY` on the server. Public browser code only receives `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Cloud Commands

Use these from the repository root:

```powershell
pnpm supabase:status
pnpm supabase:push
pnpm supabase:types
pnpm supabase:cloud:verify
```

`pnpm supabase:push` writes schema migrations to the hosted project. Run `pnpm supabase:status` and review pending migrations before pushing.

`pnpm supabase:cloud:verify` verifies the cloud import layer through the existing project script. It does not replace application QA.

For a production admin account, create or invite the user through Supabase Auth, then promote the matching `public.profiles` row with the service role after identity approval. Do not enable access profiles in Vercel for this.

## Vercel

Vercel must use the same cloud project values as `apps/web/.env.local`. Do not import root tooling variables from `.env.tooling.local`.

Mark these Vercel variables as sensitive:

```env
AI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
IDV_API_KEY
```

Do not set these in production:

```env
NEXT_PUBLIC_ENABLE_DEMO_AUTH
NEXT_PUBLIC_ENABLE_ACCESS_PROFILES
NEXT_PUBLIC_ACCESS_PROFILE_ROLE
```

Production access profiles must stay disabled:

```env
ENABLE_ACCESS_PROFILES=false
CATI_ALLOW_REMOTE_ACCESS_PROFILES=false
```
