# Local Supabase Runbook

This project is designed to run first on a local Supabase Docker stack, then migrate to a paid Supabase cloud project by replaying migrations and seed/import data.

## Start Locally

Prerequisites:

- Docker Desktop running.
- Node.js 20+ and pnpm.
- Supabase CLI available through `npx supabase`.

Recommended first run:

```powershell
docker network create -o "com.docker.network.bridge.host_binding_ipv4=127.0.0.1" cati-local-network
npx supabase start --network-id cati-local-network
npx supabase db reset
npx supabase status
```

Copy the `API URL` and `anon key` from `npx supabase status` into `apps/web/.env.local` or the root `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copy-from-status>
NEXT_PUBLIC_ENABLE_DEMO_AUTH=true
```

Then run the web app:

```powershell
pnpm --filter cati-web dev
```

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

## Migration To Cloud Later

When the paid cloud project exists:

```powershell
npx supabase login
npx supabase link --project-ref <cloud-project-ref>
npx supabase db push
npx supabase gen types typescript --project-id <cloud-project-ref> --schema public > apps/web/lib/database.types.ts
```

Then set Vercel environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=<cloud-api-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<cloud-anon-key>
NEXT_PUBLIC_ENABLE_DEMO_AUTH=false
```

Keep `NEXT_PUBLIC_ENABLE_DEMO_AUTH=true` only in local/staging environments where role preview is intentionally allowed.

## Design Notes

- PostgreSQL/Supabase is the system of record.
- RLS is enabled on exposed tenant tables.
- Columns used in RLS filters and dashboard/search filters are indexed.
- Finance ledger entries become immutable after `posted_at`; corrections must be reversals.
- AI recommendations are logged and approval based. AI does not directly execute finance, refund, ledger or access-control actions.
