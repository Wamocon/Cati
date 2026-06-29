# 1Cati Full-App QA Plan

Last reviewed: 28 June 2026
Scope: public pages, login, RBAC dashboard, API contracts, database schema, AI role scope, mobile/desktop UI, and critical business flows.

## Purpose

This plan defines the repeatable QA loop for the whole current application. It does not claim that external payment, bank, SMS, access-control or accounting providers are live. Those integrations require sandbox credentials, provider decisions and legal/accounting sign-off before true end-to-end provider tests can pass.

## Automation Command

Run from `D:\Real Estate CRM\Cati` while the app is available at the selected URL:

```powershell
pnpm qa:full-app -- --base-url http://127.0.0.1:3104
```

Recommended release gate:

```powershell
npm.cmd --prefix apps/web run typecheck
npm.cmd --prefix apps/web run lint
npm.cmd --prefix apps/web run build
npm.cmd --prefix apps/web run test:e2e -- --project=chromium
pnpm phase:continuity -- --base-url http://127.0.0.1:3104
pnpm phase:05-06 -- --base-url http://127.0.0.1:3104 --max-attempts 2 --skip-static
pnpm phase:07 -- --base-url http://127.0.0.1:3104 --max-attempts 2 --skip-e2e
pnpm qa:full-app -- --base-url http://127.0.0.1:3104
```

## Coverage Matrix

| Area | Current automated coverage |
|---|---|
| Public product pages | TR/EN/DE/RU routes, desktop and mobile rendering, H1 presence, CTA presence, overflow and console/server-error checks. |
| Login and local access profiles | Login page, role access-profile sign-in, invalid/valid access-profile API checks. |
| Dashboard RBAC | All dashboard routes checked for admin, manager, accountant, staff, owner and tenant according to the canonical RBAC matrix. |
| Core APIs | Phase status, dashboard snapshot, Phase 4 site data, Phase 5 users, Phase 6 finance, Phase 7 payment controls, search, import preview/commit, action logging and AI chat. |
| Database readiness | Supabase migration/seed files checked for RBAC, units, ledger, payments, reservations, access events, staff, role coverage, Phase 4 RPC and realtime publication. |
| Finance and Phase 7 | Finance ledger refresh, payment/deposit/restriction panel refresh, reconciliation action visibility, staff/tenant API denial. |
| Listings | Unit search and unit detail flow. |
| Users | People directory refresh and admin export action. |
| Communications | Broadcast action flow. |
| Mobile UX | Public routes and mobile dashboard menu open/close with overflow checks. |
| AI guardrails | Role-specific API responses and tenant finance/user request blocked by RBAC guard. |

## Known Boundaries

- Provider payment webhooks are not fully testable until a provider such as iyzico or PayTR is selected and sandbox credentials exist.
- Bank reconciliation import cannot be fully validated until the real bank export format and matching rules are approved.
- Physical access-control changes must remain human-approved; automated tests verify the guardrail, not a real barrier/card vendor.
- Production RLS must be retested against Supabase Cloud with real auth users, not only local access-profile cookies.
- Native mobile app tests are out of scope until a native wrapper exists; current coverage is mobile web/PWA responsive coverage.

## Exit Criteria

- Static gates pass: typecheck, lint and production build.
- Playwright E2E passes on Chromium.
- Phase continuity, Phase 5-6, Phase 7 and full-app QA harnesses pass.
- No high/critical browser console, page error, API 5xx or horizontal overflow findings.
- RBAC denial is confirmed for restricted routes and sensitive APIs.
- Manual browser review confirms the workflow makes business sense for manager, accountant, staff and resident roles.
