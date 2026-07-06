# Local Supabase Runbook

This project is designed to run first on a local Supabase Docker stack, then migrate to a paid Supabase cloud project by replaying migrations and seed/import data.

## Start Locally

Prerequisites:

- Docker Desktop running.
- Node.js 20+ and pnpm.
- Supabase CLI available through `npx supabase`.

Recommended first run:

```powershell
npx supabase start
npx supabase db reset
npx supabase status
```

Copy the `API URL` and `anon key` from `npx supabase status` into `apps/web/.env.local` or the root `.env.local`:

```env
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_PUBLISHABLE_KEY=<copy-anon-or-publishable-key-from-status>
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<copy-anon-or-publishable-key-from-status>
ENABLE_ACCESS_PROFILES=true
NEXT_PUBLIC_ENABLE_ACCESS_PROFILES=true
```

The repository uses a non-default local port range to avoid collisions with other Supabase projects:

- API: `55321`
- Database: `55322`
- Studio: `55323`
- Mailpit/Inbucket: `55324`
- Analytics: `55327`

Supabase CLI may print a local security notice because services bind to `0.0.0.0`. Keep Docker Desktop behind your local firewall and never expose this stack on a public network.

Then run the web app:

```powershell
pnpm --filter cati-web dev
```

Local seeded login:

```text
Email: manager@cati.local
Password: CatiLocal!2026
Role: manager
```

This login is for local Docker only. Do not migrate this password into cloud auth.

Important local rule: use the Supabase CLI-generated Docker network and service names. Do not force a custom Docker network ID into the local stack; that caused broken service discovery in the parallel setup work.

Useful scripts:

```powershell
pnpm supabase:start
pnpm supabase:status
pnpm supabase:reset
pnpm supabase:types
pnpm supabase:stop
```

## What The Local Database Contains

The local seed creates:

- Ataberk Estate company tenant and Avsallar office.
- New Level Premium Avsallar site with 769 generated units.
- Blocks, floors, residents, unit-resident links, vendors.
- Service tickets with SLA and finance-approval context.
- Ledger opening entries with posted-entry immutability rules.
- Reservations, documents, import batches/findings, staff, role coverage.
- Full-text search documents and pgvector-ready AI retrieval rows.

Current realtime/dashboard notes:

- `supabase/migrations/00000000000004_realtime_operational_dashboard.sql` publishes dashboard-changing tables for Supabase Realtime.
- The web dashboard uses Supabase-first API calls and local seed data when Supabase env vars are missing.
- The shared live dashboard hook uses Supabase Realtime where configured and a 30-second polling fallback.
- Search includes fuzzy/full-text style operational search documents seeded for local development.

## Migration To Cloud

When the paid cloud project exists, link the CLI and push schema migrations first. Do not use the local `supabase/seed.sql` against cloud because it contains local QA/demo records and a local-only login.

```powershell
npx supabase login
npx supabase link --project-ref hczmbaqofxyusellxhyp
npx supabase db push
npx supabase gen types typescript --project-id <cloud-project-ref> --schema public > apps/web/lib/database.types.ts
```

For the New Level Premium real-data package, use the guarded import harness:

```powershell
npm run supabase:cloud:import
```

If the project is not linked yet and you are running non-interactively, either run `npx supabase login` first, set `SUPABASE_ACCESS_TOKEN`, or use direct database mode:

```powershell
$env:SUPABASE_DB_URL="<percent-encoded-postgres-url>"
npm run supabase:cloud:import
```

The harness executes `supabase/imports/new-level-premium-real-data.sql` and then verifies the production-critical checks:

- 769 New Level Premium units under `NLP-AVS`.
- Sale status split: 187 available, 565 sold, 0 source-missing and 17 unknown.
- Demo fallback policy: Block B prices/numbering are copied from Block A, and Block D prices are copied from Block E until original client files are supplied for production sign-off.
- Clean unit master CSV is generated at `supabase/imports/new-level-premium-units-master.csv`.
- 7 blocks, A-001 priced at EUR 264,100, and a searchable A-001 operational document.
- Import summary totals: 847 rows, 615 valid, 232 warnings and 0 rejected.
- Phase 4 RPC returns `source = supabase`, 769 total units and A-001 in the first result window.

The Supabase CLI `db query` command executes one prepared statement at a time, so the harness splits the generated SQL into idempotent statements and shows progress. If a network/auth interruption happens, rerun the import; the SQL uses natural-key upserts and also removes unreferenced duplicate office bootstrap rows. For controlled resume after a known statement number:

```powershell
npm run supabase:cloud:import -- --from-statement <number>
```

To verify without re-running the import:

```powershell
npm run supabase:cloud:verify
```

After the unit/facility import has passed, apply the cloud operational baseline for the currently implemented ERP modules:

```powershell
npm run supabase:cloud:import -- --import-file supabase/imports/cloud-operational-baseline.sql --group-size 10
```

This second import is intentionally separate from the client file import. It seeds the Phase 5/6 operating layer for cloud QA:

- Staff directory and explicit role coverage matrix.
- Owner, tenant and guest links against real `NLP-AVS` units.
- Finance ledger entries with open, overdue and paid states.
- Payment reconciliation, service tickets, reservations and action requests for dashboard/AI context.

For local or staging QA with access-profile role switching, the server process also needs a server-only service role key so API routes can read cloud data after their own RBAC checks without changing table RLS policies:

```env
SUPABASE_URL=<cloud-api-url>
SUPABASE_PUBLISHABLE_KEY=<cloud-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<cloud-service-role-key>
NEXT_PUBLIC_SUPABASE_URL=<cloud-api-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<cloud-publishable-key>
ENABLE_ACCESS_PROFILES=true
NEXT_PUBLIC_ENABLE_ACCESS_PROFILES=true
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser, commit it to `.env`, or prefix it with `NEXT_PUBLIC_`.

Then set Vercel environment variables:

```env
SUPABASE_URL=<cloud-api-url>
SUPABASE_PUBLISHABLE_KEY=<cloud-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<cloud-service-role-key>
NEXT_PUBLIC_SUPABASE_URL=<cloud-api-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<cloud-publishable-key>
ENABLE_ACCESS_PROFILES=false
CATI_ALLOW_REMOTE_ACCESS_PROFILES=false
```

Keep access profiles enabled only in controlled local/staging environments where role preview is intentionally allowed. Production user access must use Supabase Auth plus database-backed profiles and RLS.

## Design Notes

- PostgreSQL/Supabase is the system of record.
- RLS is enabled on exposed tenant tables.
- Columns used in RLS filters and dashboard/search filters are indexed.
- Finance ledger entries become immutable after `posted_at`; corrections must be reversals.
- AI recommendations are logged and approval based. AI does not directly execute finance, refund, ledger or access-control actions.
