# 1Çatı ERP - Roadmap & Parallel-Work Plan

> Living plan for what is done, what is next, and how multiple developers / AI agents
> (Codex included) work in parallel WITHOUT colliding. Read this + `CLAUDE.md` +
> `LESSONS-LEARNED.md` + `docs/PROJECT-STATUS-2026-07-23.md` before starting.
> Last updated: 2026-07-24. Working branch: `main` (the repo ships to `main`; the Jira
> CI sync triggers on push to `main`). For a larger change, cut a `feature/CATI-xxx` branch.

## How to use this file
- Work is split into **workstreams (WS-n)** with **disjoint file scopes** so two people
  can build at once. **Claim a workstream** (put your name/handle next to it), stay
  inside its file scope, and if you must touch a shared file (e.g. `lib/feature-guide.ts`,
  `components/data-table.tsx`, `messages/*.json`) coordinate first - those are collision
  points.
- Every change: `pnpm -C apps/web typecheck && lint && build` green, keep the Playwright
  suite green (update only intentional-change assertions), then commit. See **Conventions**.
- Checkboxes: `[x]` done, `[ ]` open. Keep them current.

---

## 1. Done (shipped to `main`, cloud DB at migration 0→53)
- [x] Platform foundation: Next.js 16 + Supabase, 11 roles, RBAC + RLS, audit.
- [x] Site/Block/Floor/Unit + import validation; People/Owner/Tenant/Staff mgmt.
- [x] Finance ledger, payments/deposits/restrictions, service catalog + orders, tasks/SLA.
- [x] **Admin Control Center**: full user CRUD incl. KVKK anonymize-remove, unified
      approvals inbox, oversight, jargon-free UI. Adversarial-reviewed (9 findings fixed).
- [x] **New roles**: guest, service_provider, child_owner/tenant/guest + wallet (demo
      credit), activities/extra-services, guardianship/kid-mode, vendor invoicing.
- [x] **Landing page** polish: smooth mobile animations, plain language, subtle ribbons,
      reduced-motion a11y.
- [x] **In-app help**: "i" info button on every module + honest "coming soon" banners;
      **all em dashes removed** app-wide.
- [x] **AI assistant re-architecture**: RLS retrieval-time grounding (leak-proof, cloud-
      verified with the live model), guardrails-that-act (block injection, redact
      ungrounded, decline out-of-scope), per-user/role memory (role-scoped, admin/manager
      audit, 90-day retention, erasure on removal), observability trace table, eval/leak
      harness (`scripts/ai-eval-harness.mjs`).
- [~] **Quick-wins bundle** (friction pass) - built + gate-green, shipping now: hide
      developer inputs (Leads consent checkbox, UUID→picker, Report hashes tucked away),
      fix inert buttons (Listings/Documents) + first-run empty states, Settings honesty +
      plain-language jargon (delivery/reconciliation), Calendar/Public-Reports help,
      new-role fixes (wallet/allowance presets, kid "ask a parent", e-Fatura "coming soon"),
      one-click CSV export.

## 2. Current state (verified)
- `main` tip: see `git log`. Local == origin, 0 unpushed. Cloud DB **up to date at 0→53**.
- Full Playwright suite: **752 passed / 8 skipped / 0 failed** (known flakes:
  `ticket-reservation-workflows.codex`, `role-access-functional:31`, a finance-export
  1s-timeout on mobile-chrome - all pass on isolated re-run).
- Writes **persist** on configured Supabase; the "resets" symptom was the QA/access-profile
  ephemeral mode only.
- Test logins: `<role>@cati-demo.com` (6 originals) + `guest/provider/child.owner/
  child.tenant/child.guest @cati-demo.com` (password shared privately - ROTATE before real use).

## 3. Lessons learned (full list in `LESSONS-LEARNED.md` - read it)
Top recurring ones for new contributors:
- **No-leak for AI = enforce at RETRIEVAL time (RLS under the caller JWT), never the
  prompt.** Company-only `SECURITY DEFINER` RPCs are NOT safe to ground on.
- **Cloud-only features must no-op when Supabase is blanked** (keeps the local-seed e2e
  suite byte-identical).
- **Supabase grants DML/EXECUTE to `authenticated` by default** → every new table needs
  the mig-41 REVOKE/GRANT hardening.
- **Never trust a piped command's exit code** (`| tail`/`| tee` mask it); **`pnpm
  test:e2e -- <name>` does not reliably filter** (runs the whole suite).
- **Run e2e in dev mode** (the config blanks Supabase at runtime); production mode needs a
  Supabase-blanked build or ~62 tests fail.
- **Adding a role/resource cascades** through every `Record<Role|Resource>` map + SQL.
- **No em dashes anywhere; plain end-user language, no tech jargon in UI.**

---

## 4. Next steps - PARALLEL WORKSTREAMS
Each WS is independent by file scope. `Owner:` blank = unclaimed.

### WS-1 - Quick wins (friction pass) · Owner: (in progress) · Effort: S · Status: [~] shipping
Files: `buyer-pipeline-workspace.tsx`, `reporting-workspace.tsx`, `listings/page.tsx`,
`documents/page.tsx`, `settings/page.tsx`, `communications-center.tsx`,
`manual-payment-console.tsx`, `privileged-finance-dashboard.tsx`, `resident-journey-tabs.tsx`,
`public-report(s)*`, `feature-guide.ts`, `wallet-overview.tsx`, `children-workspace.tsx`,
`activities-catalog.tsx`, `vendor-invoicing-workspace.tsx`, `data-table.tsx`.
Remaining after this lands: a broader **plain-language sweep** of any residual enum labels
in `messages/*.json` (e.g. `communications-copy.ts` deadLetter/failed, `manualPayments`
namespace) - coordinate on `messages/*.json`.

### WS-2 - "What needs you today" inbox (highest-impact) · Owner: ___ · Effort: M · [ ]
Goal: a shell-level, per-role affordance showing each user's pending approvals / overdue /
blocked items (today only the admin page has this; other roles have nothing).
Scope/files: `dashboard-topbar.tsx` (add a bell/inbox), a new `lib/attention-repository.ts`
+ `app/api/site-management/attention/route.ts` (Supabase-first + local-seed, `source`
field, RLS-scoped per role reusing `approvals-repository` + role feeds), a new
`components/attention-inbox.tsx`. Gate: role-scoped e2e (each role sees only its items),
no cross-role leak. Depends on nothing; can start now.

### WS-3 - Proactive AI opener · Owner: ___ · Effort: S-M · [ ]  (do after or with WS-2)
Goal: the AI assistant opens with "here's what needs you today" from live RLS-scoped data
instead of a static greeting. Scope: `components/ai-assistant.tsx`, `app/api/ai/chat/route.ts`
(+ reuse `lib/ai-retrieval.ts` and, if built, WS-2's attention feed). Keep the security
invariants (retrieval-time RLS, recommend-never-act, 5xx-proof, no-leak harness green).
Extend `scripts/ai-eval-harness.mjs` golden set with a proactive-opener case.

### WS-4 - Real global search + Cmd/Ctrl-K · Owner: ___ · Effort: M · [ ]
Goal: the command ribbon currently searches STATIC seed data client-side; wire it to the
real (currently ORPHANED) Postgres FTS endpoint and deep-link to individual records.
Scope: `components/dashboard-command-ribbon.tsx` (fetch `/api/site-management/search`
= `searchOperationalRecords`, RLS-scoped), add deep-links to record detail, add a
Cmd/Ctrl-K palette. Gate: search is RBAC/RLS-scoped (no cross-role results), keyboard a11y.

### WS-5 - Activities date/time picker (functional gap) · Owner: ___ · Effort: M · [ ]
Goal: the activities booking dialog only asks party size, not WHEN. Add date/time
selection. Scope: `components/activities/activities-catalog.tsx` + the `book_activity`
RPC + `activities`/`activity_bookings` schema (new migration 54+; capacity-per-slot).
Gate: age-gate + wallet-spend still enforced; RLS unchanged; harness green.

### WS-6 - Deferred integrations (client/infra-gated - surfaced as "coming soon")
Each needs an external dependency before code can be meaningful. Track, don't build blind.
- [ ] **Payments** (wallet top-up is demo) - needs a provider (Iyzico/PayTR/Stripe)
      contract + keys. Wire behind the existing `wallet_topup` API.
- [ ] **e-Fatura** (vendor invoices internal) - needs an accredited GİB integrator + fiscal
      certificate; store ETTN on `external_ref`.
- [ ] **Door/access control** - needs a hardware vendor + API.
- [ ] **Messaging** (WhatsApp/SMS/email) - needs a provider + approved senders.
- [ ] **Bank-statement auto-import/reconciliation** - needs a bank data feed.
- [ ] **AI document semantic search (pgvector)** - needs the on-prem gateway to expose an
      `/embeddings` endpoint; then build `kb_chunks`/`document_sections` (RLS join to
      documents) + hybrid RRF. Already shown as `ai_semantic_search` coming-soon.
- [ ] **Editable platform settings** - decide which settings/values, then a
      `platform_settings` table + admin RPC (mig-41 hardened) + wire `settings/page.tsx`.
- [ ] **Owner/tenant wallet top-up** so parents can fund a child's allowance from their own wallet.

### WS-7 - Remaining gaps / improvements (small, pick-up-anytime) · [ ]
- [ ] Plain-language sweep of residual enum labels in `messages/*.json` +
      `lib/communications-copy.ts` (deadLetter/failed) - coordinate on shared copy files.
- [ ] Booking-lifecycle + move-handover are ops consoles mislabeled as resident "move-in":
      consider a simpler resident-facing view vs the staff console.
- [ ] Real activity imagery instead of gradient placeholders.
- [ ] A light first-run tour / welcome (none exists today).
- [ ] Formal Lighthouse/performance pass; expand the AI golden set; a small trace dashboard
      over `ai_request_traces`.

---

## 5. Conventions (mandatory)
- **No em dashes (-) anywhere.** Plain, professional, complete-sentence copy in all four
  locales (tr lead, then en/de/ru). No tech jargon in the UI (no table/enum/UUID/SLA/API/
  RLS/RBAC strings).
- **Security first**: new user/finance tables need RLS + the mig-41 grant hardening in the
  SAME migration; the AI must ground only on RLS-safe readers under the caller JWT.
- **Gates before commit**: typecheck + lint + build green; keep the Playwright suite green
  (dev mode); for anything touching migrations, apply + validate against real Postgres
  (`supabase db push --db-url`). Read REAL exit codes (never a piped one).
- **Parallel-safety**: stay inside your WS file scope. Shared collision files:
  `lib/feature-guide.ts`, `components/data-table.tsx`, `messages/*.json`,
  `lib/rbac.ts`, `app/[locale]/dashboard/layout.tsx`, `dashboard-sidebar.tsx`,
  `dashboard-topbar.tsx` - coordinate before editing.
- **Commits**: conventional style, Jira key if one exists; PR with business + technical
  summary + validation results. Push to `Wamocon/Cati`.
- Migrations are sequential; next number after 53 is **54**.

## 6. Suggested order for a small team
1. WS-1 finishes + the WS-7 messages sweep (fast, high visible value).
2. WS-2 (attention inbox) - biggest daily-friction win - in parallel with WS-4 (search).
3. WS-3 (proactive AI) once WS-2's feed exists.
4. WS-5 (activities date/time).
5. WS-6 items as each external dependency is confirmed by the client.
