# Option 3 AI Site CRM - Phase Execution Runbook

Date: 24 June 2026  
Scope: Phase-wise implementation, automated harnesses, retry loops, quality loops, browser QA and manual testing.

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

## 2. Harness Commands

Run these from the repository root: `D:\Real Estate CRM\Cati`.

### 2.1 Smoke Phase Harness

```powershell
pnpm phase:harness -- --phase 1 --profile smoke --max-attempts 2
```

Use this during active development. It runs fast checks and a browser smoke audit.

### 2.2 Full Phase Harness

```powershell
pnpm phase:harness -- --phase 1 --profile full --max-attempts 2
```

Use this before phase sign-off. It runs lint, typecheck, build, Playwright E2E and browser audit.

### 2.3 Browser Audit Only

```powershell
pnpm build
pnpm browser:audit -- --start-server --server-mode start
```

Use this for screenshot and console-error evidence.

### 2.4 Manual Browser Session

```powershell
pnpm build
pnpm browser:audit -- --start-server --server-mode start --headed --hold-ms 300000
```

This opens a headed browser and keeps it open for five minutes for manual inspection.

---

## 3. Retry Loop

Each automated gate supports retry through the phase harness. The retry model is:

1. Run gate.
2. If it fails, capture output and mark attempt failed.
3. Retry until `--max-attempts` is reached.
4. If still failing, stop the phase and fix root cause.
5. After fixing, rerun the same gate.
6. After the same gate passes, rerun the full phase harness.

Do not continue to manual QA if build, typecheck or critical E2E checks fail.

---

## 4. Quality Gates By Phase

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

## 5. Manual Browser QA Checklist

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

Record manual results in `quality/results/phase-XX-manual-notes.md`.

---

## 6. Phase Implementation Cadence

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

## 7. Stop Conditions

Stop the phase and resolve before continuing when:

- TypeScript fails.
- Build fails.
- Finance or permission test fails.
- Playwright catches a blocking navigation or rendering issue.
- Browser audit finds uncaught page errors.
- Manual browser QA finds unreadable or overlapping critical UI.
- AI can perform or suggest unsafe finance/access action without approval.
- Any role can see data outside its permission boundary.
