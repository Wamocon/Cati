# Cloud repair & Vercel environment runbook

> Audience: the person deploying 1Çatı to Vercel + the Supabase cloud project
> (`hczmbaqofxyusellxhyp`). Run these steps once to make the deployed app show
> real, synced data instead of the static demo fallback.
> Created 2026-07-21 as part of the dashboard-fix initiative.

## Why the deployed app showed "unreal / unsynced" data

The app is Supabase-first with a local-seed fallback. `isSupabaseConfigured()`
checks only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If
either is missing in the Vercel deployment, **every** read falls back to the
static 769-unit seed **and** realtime sync is disabled (the sync layer only
subscribes when the payload source is `supabase`). So the fix is mostly
deployment configuration, plus applying three new migrations.

## Step 1 — Set Vercel environment variables (Production **and** Preview)

Project Settings → Environment Variables. Add (values from Supabase project
settings → API):

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | `https://hczmbaqofxyusellxhyp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | the anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | **server-only**, never exposed to the browser; required for admin user creation |
| `NEXT_PUBLIC_EUR_TRY_RATE` | Production, Preview | dual-currency rate, e.g. `45`. Confirm the real rate; the € figure is labelled approximate. |
| `AI_API_URL`, `AI_API_KEY`, `AI_CHAT_COMPLETIONS_PATH`, `AI_MODEL_*` | Production | optional; only if a local/on-prem AI gateway is wired |

Do **not** set `NEXT_PUBLIC_ENABLE_ACCESS_PROFILES` (must be unset/false in any
deployed environment — it bypasses real auth).

Redeploy after saving so the new env is baked into the build.

## Step 2 — Apply the new migrations to the cloud database

The cloud project is already migrated through `00000000000037`. Apply the three
new migrations (idempotent; safe to re-run):

- `00000000000038_profile_email_backfill.sql` — adds `profiles.email`, backfills
  from `auth.users`, and keeps it in sync. **Fixes the red "column profiles.email
  does not exist" error on the Users and Leads pages.**
- `00000000000039_accountant_finance.sql` — accountant subsystem tables + RLS +
  the `apply_invoice_credit_offset` RPC.
- `00000000000040_user_role_management.sql` — `profiles.is_active`, the
  `profile_role_assignments` table + RLS, admin RPCs, and a one-time backfill of
  one primary assignment per existing profile.

Apply with the Supabase CLI (linked to the cloud project):

```bash
# from repo root, with the project linked (supabase link --project-ref hczmbaqofxyusellxhyp)
npx supabase db push
```

Or paste each file into the Supabase Dashboard → SQL Editor in order (38, 39, 40).
The project's `node scripts/supabase-cloud-import.mjs --verify-only` can confirm
connectivity first.

> Migrations 38–40 were validated locally against Postgres 15 (`supabase db
> reset` green). Migration files are never edited after the fact — only rolled
> forward.

## Step 3 — Verify

Run in the Supabase SQL Editor (or `psql`):

```sql
select
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='profiles' and column_name='email') as has_email,
  (select count(*) from information_schema.tables
     where table_schema='public'
       and table_name in ('service_provider_invoices','credit_balances','bank_statements',
                          'bank_statement_lines','invoice_credit_offsets')) as accountant_tables, -- expect 5
  (select count(*) from public.profile_role_assignments) as role_assignments,     -- expect >= number of profiles
  (select count(*) from public.profiles where email is null) as profiles_missing_email; -- expect 0
```

Then open the deployed app and confirm: the Users and Leads pages load without a
red error; the sync indicator reads live (not the 30s poll fallback); and figures
match between sections. If any section still looks like static demo data, its API
payload `source` is `local-seed` — re-check Step 1.

## Step 4 (optional) — demo data for the accountant subsystem on cloud

The accountant panel renders from `local-seed` fixtures when the new tables are
empty, so it looks complete even before real data exists. To show **real** cloud
data, insert `service_provider_invoices` / `credit_balances` / `bank_statements`
rows for the company (RLS: admin/accountant of the same company). The offset
action then persists through the `apply_invoice_credit_offset` RPC.

## Note on the seed file (fresh databases only)

`supabase/seed.sql` had drift that broke a fresh `supabase db reset` (a reservation
without the booking columns that migrations 32–37 made `NOT NULL`, and booking
resource types that migration 32 seeded from not-yet-existing companies). This is
now fixed. It only matters if you reseed a fresh database; the existing cloud data
is unaffected.
