# Option 3 AI Site CRM - Phase Execution Runbook

> Status correction – 13 July 2026: the existing commands remain useful as regression helpers, but they do not currently prove production RLS, migration application, durable lifecycle persistence, concurrency, p95, WCAG 2.2 or AI safety. The replacement harness design and stop rules are proposed in `../../plan/option-3-ai-site-crm/functional-hardening-plan-2026-07.md`.

Last reviewed: 30 June 2026
Scope: Phase-wise implementation, automated harnesses, retry loops, quality loops, browser QA, Jira/Xray dry-run review and manual testing.

---

## 1. Operating Principle

Every phase must move through the same loop:

1. **Scope lock**: confirm requirements, non-goals, edge cases and acceptance criteria for the phase.
2. **Design lock**: confirm UI, data model, API contracts, permissions, AI rules and test strategy.
3. **Implementation loop**: build in small vertical slices.
4. **Automated quality loop**: run lint, typecheck, build, E2E and browser audit harnesses.
5. **Retry loop**: fix failures, rerun the failed gate, then rerun the full phase harness.
6. **Manual browser QA**: test in real browser using the role-based checklist.
7. **Sign-off**: record evidence, known risks, screenshots and open follow-ups.

No phase is complete just because code was written. A phase is complete when the documented acceptance criteria pass and the quality evidence is stored.

---

## 2. Current Phase Control

The current delivery model is the 15-phase ERP model in `docs/PROJECT-HANDBOOK.md` and `docs/ways-of-work/plan/option-3-ai-site-crm/implementation-plan.md`.

| Phase range | Current state on 29 June 2026 | Delivery control |
|---|---|---|
| Phase 1-4 | Complete as local/product foundation | Maintain regression coverage and do not reopen unless production data exposes a gap. |
| Phase 5-14 | Complete as implementation foundation / ready for functional QA and client data validation | Validate people/role relationships, ledger surfaces, payment/deposit/restriction controls, service catalogue, workforce, booking/checkout, communication/document, mobile web/PWA, offline-safe queue, integration placeholders and AI premium workflows with real client data, accounting/legal review and client UAT before production activation. |
| Phase 15 | Accelerated delivery window | Target launch hardening, final QA/security, UAT pack, training and automated QA evidence by Wednesday 8 July 2026, excluding a full exploratory manual testing round. Do not mark complete without harness/browser evidence. |

Delivery boundary: the 8 July 2026 target covers implementation, developer-side unit checks, automated E2E/regression scripts and browser smoke/manual spot checks. A full exploratory manual QA/UAT round is a separate activity after implementation and should be planned with additional days if required.

---

## 3. Harness Commands

Run these from the repository root: `D:\Real Estate CRM\Cati`.

### 3.1 Smoke Phase Harness

```powershell
pnpm phase:harness -- --phase 1 --profile smoke --max-attempts 2
```

Use this during active development. It runs fast checks and a browser smoke audit.

### 3.2 Full Phase Harness

```powershell
pnpm phase:harness -- --phase 1 --profile full --max-attempts 2
```

Use this before phase sign-off. It runs lint, typecheck, build, Playwright E2E and browser audit.

### 3.3 Phase 5-6 API, RBAC And Browser Harness

```powershell
pnpm phase:05-06 -- --base-url http://127.0.0.1:3104 --max-attempts 2
```

Use this when touching users, roles, people directory, finance ledger, export actions or AI prompts that mention user/finance data. It validates API contracts, RBAC boundaries, AI RBAC responses, desktop/mobile rendering and screenshot evidence for Phase 5 and Phase 6.

### 3.4 Full Phase Continuity Harness

```powershell
pnpm phase:continuity -- --base-url http://127.0.0.1:3104
```

Use this before moving to a new phase. It validates that all 15 phases have coherent status, evidence, user guidance, route surfaces and role-specific AI behavior.

### 3.5 Phase 6-9 Regression Harness

```powershell
pnpm phase:06-09
```

Use this when touching ledger, payments, documents, compliance, viewing/tour or residence/citizenship surfaces. It includes the Phase 7 payment-control API contract/RBAC gate and remains a focused regression harness for those workflows.

Focused Phase 7 alias:

```powershell
pnpm phase:07 -- --base-url http://127.0.0.1:3104 --max-attempts 2
```

Use the focused alias when changing `payment-controls`, payment/deposit/restriction UI, reconciliation actions or finance-access guardrails.

### 3.6 Phase 10-11 Booking, Communication And Documents Harness

```powershell
pnpm phase:10-11 -- --base-url http://127.0.0.1:3104 --max-attempts 2
```

Use this when touching reservations, move-in readiness, checkout settlement, access handoff, communication threads, notification rules/delivery retry, multilingual templates or document packet workflows. It validates API contracts, RBAC boundaries, audited actions and browser smoke flows for Phase 10 and Phase 11.

### 3.7 Phase 12-14 Mobile/Integration/AI Harness

```powershell
pnpm phase:12-14 -- --base-url http://127.0.0.1:3104 --max-attempts 2
```

Use this when touching mobile-friendly web/PWA behavior, offline sync, external integration placeholders, provider readiness, same-language AI chat, AI recommendations or image/proof AI workflows.

### 3.8 Jira/Xray Dry Run

```powershell
pnpm jira:sync -- --dry-run
```

Use this before any Jira/Xray update. The current dry-run model creates or updates 15 phase epics, phase stories, one documentation issue and Xray tests. Running `pnpm jira:sync` without `--dry-run` writes to remote Jira/Xray and may attach confidential documents, so it requires explicit approval.

Current Jira/Xray structure:

- One master Xray Test Plan for Phase 01-15 functional system testing, regression and launch readiness.
- Three Test Sets: functional system tests for critical workflows, exploratory role/functionality tests and automated QA/regression/API harnesses.
- Eight Test Executions: Phase 01-04, Phase 05-07, Phase 08-09, Phase 10-11, Phase 12-14, Phase 15, major functionality/roles and exploratory role sessions.
- 20 functional system test cases, 10 exploratory role/functionality test cases and 13 automated QA/API test cases.
- Latest local QA JSON/JUnit summaries are linked to the relevant Test Execution issues when live sync is explicitly approved. Use `--skip-attachments` to skip confidential documentation files; QA evidence is separate from documentation attachments.

### 3.9 Current Functional Release Suites

```powershell
pnpm --filter cati-web typecheck
pnpm --filter cati-web lint
pnpm --filter cati-web build
pnpm --filter cati-web test:e2e:window1
pnpm --filter cati-web test:e2e:structured
```

`test:e2e:window1` is the focused core-operations gate for role dashboards, exact unit scope, ticket/emergency security, compliance, owner finance, manual payment, registration and service proof. `test:e2e:structured` is the cross-window release regression suite. Both run in the deterministic access-profile environment and therefore do not replace clean Supabase migration execution, real-auth RLS probes, production Realtime/Storage tests, backup/restore or provider UAT.

### 3.10 Browser Audit Only

```powershell
pnpm build
pnpm browser:audit -- --start-server --server-mode start
```

Use this for screenshot and console-error evidence.

### 3.11 Manual Browser Session

```powershell
pnpm build
pnpm browser:audit -- --start-server --server-mode start --headed --hold-ms 300000
```

This opens a headed browser and keeps it open for five minutes for manual inspection.

---

## 4. Retry Loop

Each automated gate supports retry through the phase harness. The retry model is:

1. Run gate.
2. If it fails, capture output and mark attempt failed.
3. Retry until `--max-attempts` is reached.
4. If still failing, stop the phase and fix root cause.
5. After fixing, rerun the same gate.
6. After the same gate passes, rerun the full phase harness.

Do not continue to manual QA if build, typecheck or critical E2E checks fail.

---

## 5. Quality Gates By Phase

| Phase | Core Build Evidence | Browser Evidence | Manual QA Evidence |
|---|---|---|---|
| 1. Discovery/Benchmark | BRD/PRD/TRD/market docs updated | Requirements package opens | Source and competitor review checklist |
| 2. UX/UI | Prototype routes/components compile | Desktop/mobile screenshots | Navigation and usability review |
| 3. Auth/RBAC/Audit | Permission tests and API validation | Role route checks | Owner/tenant/staff/admin access review |
| 4. Site/Flat Import | Data model tests and import validation | Flat matrix screenshots | 769-flat import dry run |
| 5. Users/Profiles | Relationship tests | Profile pages screenshots | Owner/tenant/staff profile review |
| 6. Ledger | Ledger unit tests | Account ledger screenshots | Accountant ledger walkthrough |
| 7. Payments/Deposits/Restrictions | Payment idempotency and deposit tests | Payment/restriction screenshots | Debt and refund approval walkthrough |
| 8. Services | Service-order tests | Service wizard screenshots | Debt-blocked and allowed service checks |
| 9. Tasks/SLA/Media | Ticket state and SLA tests | Staff PWA screenshots | Staff completion with media |
| 10. Booking/Checkout | Availability and settlement tests | Booking/checkout screenshots | Move-in and checkout walkthrough |
| 11. Communication/Documents | Message/document permission tests | Chat/document screenshots | Announcement and document access review |
| 12. PWA | Mobile viewport E2E | PWA mobile screenshots | Install/use on phone-class viewport |
| 13. Integrations | Adapter tests and retry tests | Integration health screenshots | Provider failure/manual fallback review |
| 14. AI | AI eval and guardrail tests | AI command center screenshots | AI approval/refusal review |
| 15. Launch Hardening | Full regression and security checklist | Final visual sweep | UAT sign-off |

---

## 6. Manual Browser QA Checklist

Use the browser audit script for screenshots, then manually verify:

- Page loads without console errors.
- No visible layout overlap.
- Text is readable on desktop and mobile.
- Navigation works for target role.
- Forms show useful validation errors.
- Tables and cards do not overflow mobile width.
- Critical status colors are understandable.
- Debt/restriction messages explain what action is needed.
- Staff/resident mobile actions are thumb-friendly.
- AI recommendations show source/confidence and do not execute sensitive actions directly.
- Turkish wording is formal, clear and not overly technical.

Record manual results as a short Markdown note and promote only the relevant summary into the documentation tree. Generated screenshots, JSON reports and logs should stay disposable.

---

## 7. Phase Implementation Cadence

For each phase:

1. Open BRD, PRD and TRD sections for the phase.
2. Create or update a phase issue/task list.
3. Implement the smallest vertical slice first.
4. Add/adjust tests for that slice.
5. Run `pnpm phase:harness -- --phase X --profile smoke --max-attempts 2`.
6. Fix failures.
7. Repeat until the slice is stable.
8. Run `pnpm phase:harness -- --phase X --profile full --max-attempts 2`.
9. Run headed browser manual QA.
10. Record evidence and sign-off notes.

---

## 8. Stop Conditions

Stop the phase and resolve before continuing when:

- TypeScript fails.
- Build fails.
- Finance or permission test fails.
- Playwright catches a blocking navigation or rendering issue.
- Browser audit finds uncaught page errors.
- Manual browser QA finds unreadable or overlapping critical UI.
- AI can perform or suggest unsafe finance/access action without approval.
- Any role can see data outside its permission boundary.
