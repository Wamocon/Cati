# Project status & behavior — 2026-07-22

> Snapshot after a large delivery session on branch `feature/upgrade-and-bug-fixing`.
> Companion to `docs/PROJECT-HANDBOOK.md` (the ongoing SSoT) and `LESSONS-LEARNED.md`.
> ~30+ commits; cloud Supabase migrated **0→48** (applied + validated against real
> Postgres); typecheck + lint + build green; full e2e **743 passed / 8 skipped / 1
> failed** — the single failure is a mobile-chrome service-proof *idempotency-replay*
> timing test (route-interception race, unrelated to the new roles), under re-verify
> as flake vs real; per-phase e2e for the new-role work all ran green.

## What was delivered

### A) Review-docx dashboard fixes + modern polish (all committed)
Every issue from the client review doc (37 screenshots) across all 6 original roles:
- **Technical leaks removed** (Supabase / Twenty CRM / raw table+enum names / internal
  IDs / UC codes / RBAC-matrix / "local seed" badges / Watching-Index counters).
- **Dual ₺+€ currency** everywhere via a shared `lib/currency.ts` (env `EUR_TRY_RATE`).
- **i18n** fixed (English mode no longer shows Turkish; info-tooltips localized; the
  development name "New Level Premium" pinned, never translated).
- **Offline-sync feature removed**; clickable/drill-through KPIs; missing headings
  added; negative-SLA shown as "overdue by X"; manager given a distinct site scope.
- **DB**: `profiles.email` crash fixed (mig 38); a pre-existing `seed.sql` drift fixed;
  ticket cost persisted (mig 42); dynamic finance graph.
- **New capabilities**: admin **user & role management** + additive **multi-role**
  (mig 40); the **accountant subsystem** (invoices, credit balances all-roles/by-block
  A–G/totals, costs, bank statements, manual offset — mig 39).
- **Modern polish** (post-screenshot review): search ribbon → real search field;
  finance page → accessible tabs; documents/table overflow fixed; communications
  status pills (icon+tone, not color-only); accessibility (aria, status shapes);
  users page decluttered; 403 unhandledRejection hardened; mobile responsive fixes.
- Security review of that work found + fixed real holes (mig 41 grant hardening).

### B) New roles feature — Guest / Service Provider / Child (8 phases, committed)
Adds 5 roles to the original 6 (→ 11) with a hybrid RBAC + ReBAC model.
- **Phase 1 (mig 43):** roles `guest`, `service_provider`, `child_owner/tenant/guest`
  + `wallet`/`activities`/`guardianship`/`vendor_invoices` resources; `profiles`
  minor fields; `guardianships` + `delegated_grants` (parent↔child) tables + RLS.
- **Phase 2 (mig 44):** double-entry **credit wallet** — wallets + immutable ledger +
  idempotent `top-up`/`spend`/`transfer`/`refund` RPCs (FOR UPDATE, no-negative),
  low-balance events via the outbox. **Demo credit, provider-swappable.**
- **Phase 3 (mig 45):** **activities/extra-services catalog** + bookings (age-gated;
  booking spends the wallet; guardian sees child bookings via RLS).
- **Phase 4:** **Guest** role end-to-end UI (wallet page, activities catalog with
  imagery, guest dashboard, low-credit reminder).
- **Phase 5 (mig 46):** **Service Provider** — issue invoices (state machine via a
  separate `submission_status`, keeping the accountant's financial `status` intact).
- **Phase 6:** **Child roles** + guardian "My children" (add child w/ demo consent,
  allowance, approve, see bookings) + **kid-mode** dashboard (goal ring, badges tied
  to real bookings, imagery, WCAG-AA, no dark patterns aimed at minors).
- **Phase 7 (mig 47):** accountant view surfaces the new wallet/booking/vendor money
  (cross-role money movement).
- **Phase 8 (mig 48):** adversarial security review (no crit/high) + 4 hardening
  fixes (refund TOCTOU lock, child self-fund block, internal-wallet payload trim,
  minor-flag write protection).

## How the system behaves NOW
- Local dev + the e2e access-profile mode use deterministic local-seed data; the
  6 original roles + 5 new roles all render coherent, on-brand, leak-free dashboards.
- The deployed app reads the cloud DB (migrated 0→48); the Users/Leads crash is gone.
- Money is **demo credit**: top-up is a simulated funding step; wallet spend/transfer/
  refund + activity bookings + vendor invoices are real ledger movements and flow to
  the accountant views. RLS/RPCs are the enforced security boundary.
- Vendor invoices are **internal** (e-Fatura-ready `external_ref` field, not yet
  submitted to GİB). Minor accounts use **demo-grade consent** (recorded, self-
  declared DOB), not full verified parental consent.

## How it SHOULD behave ideally (known gaps / next steps)
1. **Payment provider**: wire a real provider (Iyzico/PayTR/Stripe) behind the
   existing `wallet_topup` API (currently simulated).
2. **Owner/Tenant top-up gap**: guests can top up, but owner/tenant parents fund a
   child's allowance from their OWN wallet, which needs a funding path — add
   owner/tenant top-up (Phase-6 note).
3. **e-Fatura/e-Arşiv**: integrate a certified GİB integrator (UBL-TR XML, fiscal
   seal, QR, 10-yr archive); store the ETTN on `external_ref`.
4. **Minor compliance**: upgrade demo consent to verifiable parental consent (VPC)
   for production (COPPA 2.0 / GDPR-K / KVKK); retention + data-minimization review.
5. **Vercel env**: confirm the Supabase env vars are set for Production+Preview (see
   `docs/deployment/cloud-repair-and-vercel-env.md`) and rotate the shared creds.
6. **Validation still to do**: a live end-to-end pass on the deployed app with real
   logins per role; a formal Lighthouse/performance pass; a fresh 6-role screenshot
   walkthrough after the polish; and the remaining low-priority items in the handbook.
7. **Currency**: the dual-currency `EUR_TRY_RATE` is a configurable constant — set a
   real/looked-up rate; wallets are single-currency, cross-currency needs an explicit
   FX transaction.
