# 1Çatı, System State, Features & Roles

> Last updated: 2026-07-16 · Status snapshot for demo readiness.
> Canonical status authority remains `docs/PROJECT-HANDBOOK.md`; this file is a
> consolidated, plain-language view of *what exists today* for demo/handover.

## 1. What 1Çatı is

A property-management & real-estate ERP for **Ataberk Estate** (Türkiye), built
by **WAMOCON GmbH**. One Next.js 16 app (`apps/web`) delivers the public product
site, authentication, and a role-based CRM/ERP portal. Data/auth/realtime/storage
run on **Supabase** (PostgreSQL). Primary language Turkish (`tr`); also `en`,
`de`, `ru`.

## 2. Current status (2026-07-16)

| Area | State |
|---|---|
| Code quality | ✅ Typecheck clean · ESLint 0 errors · production build clean |
| E2E tests | ✅ 376 passed / 4 skipped / 0 failed (Playwright chromium) |
| Branches | ✅ All 9 branches synced to `main` (one keeps extra safe cleanup) |
| Line endings | ✅ `.gitattributes` enforces LF cross-platform |
| Dead code | ✅ 11 dead files + 178 dead lines removed |
| Supabase Cloud | ✅ **38/38 migrations applied** · 127 tables · 442 functions |
| Realtime | ✅ 34 tables published to `supabase_realtime` (live dashboard) |
| Cloud data | ✅ Real "New Level Premium" dataset present (769 units) |
| Cloud login | ✅ **All 6 roles verified end-to-end against cloud**, real password login, RBAC-correct workspace, `source: "supabase"` live data |

## 3. Cloud / infrastructure

- **Supabase project**: `hczmbaqofxyusellxhyp` (`https://hczmbaqofxyusellxhyp.supabase.co`).
- **Schema**: fully migrated (`supabase/migrations/00000000000000` … `…036`). The
  Phase 10–14 wave (migrations 21–36) is now live on cloud.
- **Realtime**: dashboard tables (units, finance ledger, tickets, reservations,
  compliance cases, buyer prospects, portal communications, …) publish live
  updates; the client also has a 30-second polling fallback.
- **Storage**: the private `cati-service-evidence` bucket is created (public=false)
  via the Storage API, direct browser access is denied by default bucket privacy.
- **Deferred to dashboard** (`supabase/cloud-privileged-setup.sql`): two RLS objects
  owned by Supabase-internal roles (`storage.objects` restrictive guard,
  `realtime.messages` private-broadcast authorization) that the `postgres` role
  cannot attach. These are *defense-in-depth* on top of the already-private bucket
  and per-table RLS. Run that file once in Dashboard → SQL Editor to add them.
- **App wiring**: `apps/web/lib/site-management-repository.ts` is Supabase-first
  with a deterministic local-seed fallback. Every response carries
  `source: "supabase" | "local-seed"`, check that field first when debugging data.

### Verified against cloud (real login, not seed)

Each role signs in with a real password and receives live Supabase data:

| Role | Endpoint | Result |
|---|---|---|
| admin / manager | `/api/site-management/dashboard` | 200 · `source=supabase` · global operations centre (18 nav entries) |
| accountant / staff / owner / tenant | `/api/site-management/role-dashboard` | 200 · `source=supabase` · `role-dashboard.v1` scoped workspace (7–8 nav entries) |

The focused roles receive **403** on the *global* dashboard by design, that is the
RBAC boundary; they use the scoped `role-dashboard` contract instead. `owner`
resolves unit **A-097** and `tenant` resolves **G-014** in both API and page.

> ⚠️ **Testing gap worth knowing**: the Playwright suite runs against the
> local-seed fallback with access profiles, so it never executes SQL migrations
> nor exercises Postgres RLS. Two classes of real defect were only found by
> applying to cloud (plpgsql bugs in migrations 25/27, and an RLS recursion in
> migration 37). Validate DB changes against a real Postgres, not just the suite.

## 4. Feature areas (15-phase model)

| Phase | Capability | State |
|---|---|---|
| 1–4 | Discovery, design system, platform foundation (Auth/RBAC/RLS/Audit), Site/Block/Floor/Flat + import validation | ✅ Complete |
| 5 | User / Owner / Tenant / Staff management | ✅ Foundation |
| 6 | Finance ledger engine (immutable posted entries) | ✅ Foundation |
| 7 | Payments, deposits, reconciliation, debtor restrictions | ✅ Foundation |
| 8 | Service catalog & service-order flow | ✅ Foundation |
| 9 | Task / workforce / SLA / field reporting (photo/video/note evidence) | ✅ Foundation |
| 10 | Booking, letting, move-in/checkout, reservation lifecycle & handover | ✅ Built |
| 11 | Communications, notifications, documents, portal messaging | ✅ Built |
| 12 | Mobile PWA / offline-sync commands | ✅ Built |
| 13 | External integrations (outbox pattern), calendar ICS feeds | ✅ Built |
| 14 | AI premium layer (deterministic, RBAC-gated assistant), analytics | ✅ Built |
| 15 | QA, security, performance, UAT, launch | 🔶 In progress |

Additional built modules: registration/activation workflow, compliance cockpit,
owner finance visibility, manual payment posting, buyer pipeline, QR public
reporting, report artifacts, zero-cost emergency semantics, video library.

> Note: Phases 5–14 are implementation-complete (API + UI + tests) but not yet
> production-signed-off. Payment/access/storage/messaging/AI automation must not
> be represented as "live production" until the open decisions in
> `PROJECT-HANDBOOK.md` (payment provider, access-system vendor, legal/accounting
> review, UAT) are closed.

## 5. Roles & access (canonical: `apps/web/lib/rbac.ts`)

Six roles, hierarchical level, and data scope. Kept in sync with Supabase RLS.

| Role | Level | Scope | Can access |
|---|---|---|---|
| **admin** | 90 | company | Everything, full manage on all 14 resources |
| **manager** | 70 | site | Listings, leads, deals, tickets, calendar, documents (CRUD + assign/approve); finance & reports (view/export); users & settings (view); communications; offline sync |
| **accountant** | 60 | finance | Finance (full incl. approve), documents (create/update), reports (create/export), tickets (view), communications (view/create) |
| **staff** | 40 | field | Assigned tickets (view/update), calendar (view/update), documents (view/create), offline sync (view/create/update), communications |
| **owner** | 20 | owned_unit | Own units: tickets (create/approve), calendar/bookings, documents, **finance view (own)**, communications, offline sync |
| **tenant** | 10 | rented_unit | Rented unit: tickets & calendar (view/create), documents, communications, offline sync |

14 resources: `dashboard, listings, leads, deals, tickets, calendar, documents,
eids_compliance, finance, reports, users, settings, communications, offline_sync`.
8 actions: `view, create, update, delete, manage, export, approve, assign`.

RBAC is enforced in three layers: the client (sidebar/KPI filtering via
`rolePermissions`), the server (route guards / `getUserProfile`), and the database
(Supabase RLS policies + SECURITY DEFINER functions such as
`prevent_profile_privilege_escalation`, which blocks direct role escalation -
roles change only via authorized admin command or verified invitation).

## 6. Demo access, two ways

1. **Real Supabase logins**, six confirmed accounts exist on cloud, one per role
   (`<role>@cati-demo.com`). Passwords are shared privately (never committed). The
   `owner` account is linked as owner of unit **A-097** and the `tenant` account as
   tenant of **G-014** (both real New Level Premium Avsallar units), so their
   scoped dashboards resolve live unit relationships.
2. **Local access profiles**, the login page offers one-click role selection when
   `ENABLE_ACCESS_PROFILES=true` (no password). Frictionless for demos and used by
   the E2E harness. Must **not** be enabled in a real production deployment.

## 7. Known follow-ups

- Apply `supabase/cloud-privileged-setup.sql` in Dashboard → SQL Editor to add the
  storage/realtime private-broadcast defense-in-depth policies (owner-privileged
  objects). Optional, the bucket is already private and data-table RLS is enforced.
- Close the open product decisions in `PROJECT-HANDBOOK.md` §6 (payment provider,
  access-system vendor, data retention, production UAT sign-off) before any
  automation is represented as production-live.
