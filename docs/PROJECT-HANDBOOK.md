# 1Cati Project Handbook

Status: active source-of-truth guide
Last reviewed: 14 July 2026
Confidentiality: STRICTLY CONFIDENTIAL
Primary audience: Ataberk Estate leadership, WAMOCON delivery, product, engineering, QA and future AI coding agents

## 1. Purpose

This handbook is the single entry point for understanding the project. It does not replace the detailed BRD, PRD, TRD or launch documents. It explains which document to trust, how the repository is organized, what is already implemented, what is still planned, and how documentation must be maintained.

If another document conflicts with this handbook, update the conflicting document or record the exception before using it for delivery, scope, pricing, QA or client communication.

## 2. Project Summary

1Cati is a property-management and real-estate ERP initiative for Ataberk Estate. The repository now centers on one product deliverable:

| Deliverable | Location | Purpose |
|---|---|---|
| Web ERP app | `apps/web` | Next.js public product site, login, role-aware CRM dashboard and operational ERP modules. |

The current implementation is a substantial delivery foundation. It includes the public app, localized pages, New Level Premium public intake page, role-aware dashboard, operational module surfaces, AI assistant surfaces, Supabase migrations, optional cloud Storage, realtime/polling components, Playwright tests and browser QA harnesses.

It is not yet a fully production-launched customer system. Production still requires final RLS/security verification, payment/access/vendor decisions, UAT sign-off, legal/accounting review and launch handover.

Code-verified status correction, 13 July 2026: the latest ticket/reservation audit and focused production-mode E2E show that phases 5-14 are a mixed implementation foundation, not UAT-ready. Several screens remain seed-, process-memory-, simulation- or action-log-backed; relationship RLS, migration history, transactional lifecycle persistence and production-like test evidence are release blockers. The proposed remediation source is `docs/ways-of-work/plan/option-3-ai-site-crm/functional-hardening-plan-2026-07.md`.

Execution update, 14 July 2026: coordinated Window-1/2/3 implementation now exists in the shared worktree, including migrations 20–35 and focused role, dashboard, ticket, finance, compliance, registration, service-proof, QR/reporting, communication, booking/calendar and offline tests. This does **not** mean the cloud database has those migrations or that the system is demo-ready. The authoritative completed/in-progress/external task table and current release blockers are maintained in section 0 of the functional hardening plan.

## 3. Current Implementation Status

As of 13 July 2026, the repository evidence shows:

| Area | Current status | Evidence |
|---|---|---|
| Public web app | Implemented as Next.js app with localized routes, including a New Level Premium public page for owner/tenant/staff requests, public reports, a source-grounded product concierge with redacted safety telemetry, WhatsApp handoff and CSAT feedback, security/privacy headers, and a `/videos` subpage for target-group/language-specific video versions. | `apps/web/app/[locale]`, `apps/web/app/[locale]/new-level-premium`, `apps/web/app/[locale]/videos`, `apps/web/messages/*.json`, `apps/web/next.config.ts` |
| Dashboard shell | Implemented with role-aware navigation, RBAC-aware drilldowns, module pages and the full 15-phase ERP delivery map. | `apps/web/app/[locale]/dashboard`, `apps/web/lib/site-management-data.ts` |
| Access profiles | Disabled for cloud/production runtime; retained only as guarded code for explicit non-production QA if ever needed. | `apps/web/lib/auth.ts`, `apps/web/proxy.ts` |
| Supabase schema | The last documented cloud proof remains migrations `00000000000000` through `00000000000013`. Migrations 20–35 are current local release-hardening work and must not be described as cloud-applied until clean apply/upgrade and authenticated role probes succeed. | `supabase/migrations`, `docs/supabase-cloud.md`, functional hardening plan |
| Operational APIs | Dashboard snapshot, phase status, search, action logging, import preview/commit, Phase 4 data, Phase 5 people, Phase 6 ledger, Phase 7 payment-control, Phase 8-9 service operations, Phase 10-11 contracts, document upload/storage contract, Phase 12 offline/mobile-web contract, Phase 13 integration readiness, Phase 14 AI premium contracts, public registration/report intake and public product concierge exist with Supabase cloud-first behavior. Public AI logs topic, outcome, confidence, latency, source IDs, escalation, CSAT feedback, redacted question preview and grounding/drift/private-data evaluation without storing raw anonymous questions. | `apps/web/app/api/site-management/*`, `apps/web/app/api/ai/*`, `apps/web/lib/site-management-repository.ts`, `apps/web/lib/public-ai-chat.ts` |
| Security and AI observability | Hardened browser/API behavior now covers global security headers, no-referrer, dashboard/API no-store/noindex rules, private-data-safe public AI telemetry, operations AI RBAC evaluation metadata, prompt-injection signals and human-approval flags for sensitive finance/access actions. | `apps/web/next.config.ts`, `apps/web/lib/public-ai-chat.ts`, `apps/web/app/api/ai/chat/route.ts`, `docs/security/AI-SECURITY-OBSERVABILITY.md` |
| Operational modules | Local focused slices now cover relationship-scoped tickets, emergency indicators, exact owner finance projection, manual payments/reversal, compliance, registration review/activation, service proof, role dashboards and the parallel Window-2/3 workflows. Each surface must still expose its source truthfully; DB-backed claims require the unapplied migrations and real-auth/RLS gates. | `apps/web/app/[locale]/dashboard/*`, `apps/web/lib/*-repository.ts`, `supabase/migrations/00000000000020*` through `00000000000035*` |
| Live dashboard refresh | Implemented with a shared live snapshot hook, Supabase Realtime subscriptions where configured and 30-second polling fallback. | `apps/web/hooks/use-live-dashboard-snapshot.ts`, `apps/web/components/sync-badge.tsx`, `supabase/migrations/00000000000004_realtime_operational_dashboard.sql` |
| QA and phase control | The structured harness now includes the new role, dashboard, ticket-security, finance, registration, proof and parallel-window functional specs. Local access-profile evidence still does not prove real Auth/RLS, migration application, production p95, backup/restore or full WCAG 2.2; those remain launch gates. | `apps/web/package.json`, `scripts/phase-06-09-harness.mjs`, `scripts/phase-10-11-harness.mjs`, `apps/web/e2e` |
| Jira/Xray automation | Dry-run capable Jira/Xray sync exists for 15 phase epics, 53 phase stories, one documentation issue, one Xray Test Plan, three Test Sets, eight Test Executions, 20 functional system tests, 10 exploratory role/functionality tests and 13 automated QA/API tests. Local QA JSON/JUnit summaries are classified as execution evidence. Remote sync requires explicit approval because it writes project metadata/evidence to Jira/Xray and may upload attachments if not skipped. | `scripts/jira-xray-sync.mjs`, `pnpm jira:sync -- --dry-run` |
| Requirements docs | BRD, PRD, TRD, security, migration, QA/UAT, traceability and source register exist. | `docs/requirements/option-3-ai-site-crm` |

Important boundary: the repository now has a cloud Supabase foundation and live API contracts, but this is not the same as a completed production customer deployment. Do not present payment, bank, access-control, external messaging, vendor integration, native app or production AI automation as live until provider decisions, RLS/security review and UAT sign-off are completed.

Identity boundary: the registration flow stores only a protected identity digest and supports human review. Personal ID-image/selfie upload, OCR, face match and liveness are not implemented as an in-house live feature; they remain disabled until an approved provider-hosted consent session, retention policy, credentials and UAT exist. Service-order photo/video proof is a separate workflow and must never be presented as identity verification.

## 3.1 Current Phase Truth

Use this table when status appears inconsistent across documents or generated exports.

| Phase range | Current status on 13 July 2026 | Practical meaning |
|---|---|---|
| Phase 1-4 | Foundation present; revalidation required | Scope, public UX, RBAC types, property data and selected cloud reads exist, but actual cloud migration history and relationship security must be reconciled. |
| Phase 5-14 | Mixed implementation foundation; not UAT-ready | Selected slices persist, while many lifecycle boards/actions remain static, log-only, simulated or incomplete. Follow Waves 0-9 of the functional hardening plan. |
| Phase 15 | Blocked by hardening gates | Launch/UAT cannot start until migration, RLS, transactional vertical slices, production-like E2E, accessibility, performance, backup/restore and provider boundaries pass. |

The current expert plan is a 15-phase ERP model because integrations, AI and launch hardening need separate governance and test gates.

Delivery boundary: this accelerated target includes implementation, unit checks, automated E2E/regression scripts and browser smoke checks. A full exploratory manual QA/UAT round is not included in the current effort estimate and should be planned separately after the phase development is finished.

## 4. Canonical Documentation Set

The documentation is intentionally divided by document type. This prevents a single huge file from becoming unreadable while still giving one clear documentation system.

| Need | Canonical document | Notes |
|---|---|---|
| Start here | `docs/README.md` | Navigation and maintenance rules for the whole docs tree. |
| Full project overview | `docs/PROJECT-HANDBOOK.md` | This document. |
| Consolidated German requirements document (v1, market analysis) | `docs/requirements/option-3-ai-site-crm/Anforderungsdokument-1Cati.md` | Single-document client-facing overview (WAMOCON standard format) covering current implementation state, dated market/competitor research and the forward roadmap. Complements, does not replace, the BRD/PRD/TRD package below. Also published as `apps/web/public/Anforderungsdokument_1Cati.docx`. |
| Consolidated German requirements document (v2, code-verified) | `docs/requirements/option-3-ai-site-crm/Anforderungsdokument-1Cati-v2.md` | Adds a full code-verified functional inventory, a corrected Phase 10–14 status (Foundation-with-disconnected-layers, not "planned"), a Demo chapter, a status comparison against the original client requirements doc, and prioritized next steps. Also published as `apps/web/public/Anforderungsdokument-1Cati-v2.docx`. |
| User handbook (v1) | `docs/user-handbook/1Cati-Benutzerhandbuch.docx` | Role-based usage guide for demo/training, dated 01.07.2026. |
| User handbook (v2, gap-closed) | `docs/user-handbook/1Cati-Benutzerhandbuch-v2.md` | Adds the New Level Premium public area (was entirely missing), explains the two connected AI assistants, the one-click demo login, the tenant time-access panel, and corrects the "Müşteri Adayları" description to match the actual code. Exported as `1Cati-Benutzerhandbuch-v2.docx` (not published publicly — internal document). |
| Business requirements | `docs/requirements/option-3-ai-site-crm/BRD.md` | Business goals, workflows and market context. |
| Product requirements | `docs/requirements/option-3-ai-site-crm/PRD.md` | Personas, scope, user stories and acceptance criteria. |
| Technical requirements | `docs/requirements/option-3-ai-site-crm/TRD.md` | Architecture, data model, integrations and technical controls. |
| Third-party integrations and costs | `docs/requirements/option-3-ai-site-crm/Third-Party-Integration-And-Vendor-Plan.md` | Payment, SMS, email, wallet, access/security, monitoring, Supabase Cloud Pro and external dependency cost register. |
| Management cost and scale blueprint | `docs/requirements/option-3-ai-site-crm/1Cati-External-Integration-Cost-Scale-Management-Blueprint-2026-07-15.docx` | Dated multilingual executive brief covering provider costs, Turkish rules, 1k/5k/10k scale, AI, risk, procurement and 14 work packages. It is a planning aid, not a quotation or legal/accounting opinion. |
| Interactive management estimator | `docs/requirements/option-3-ai-site-crm/1Cati-Interactive-Cost-Scale-Estimator-2026-07-15.html` | Standalone EN/DE/TR/RU 1,000-user-step simulator with editable assumptions, transparent formulas and visible quote gaps. |
| Delivery plan | `docs/requirements/option-3-ai-site-crm/Implementation-Delivery-Plan.md` | Client/delivery-level phase plan. |
| Engineering implementation plan | `docs/ways-of-work/plan/option-3-ai-site-crm/implementation-plan.md` | Detailed feature inventory and technical delivery planning. |
| Functional hardening plan | `docs/ways-of-work/plan/option-3-ai-site-crm/functional-hardening-plan-2026-07.md` | Code-verified gap register, target architecture, ticket/emergency/booking flows, delivery waves, harness and SLOs. |
| Execution runbook | `docs/ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md` | Phase harnesses, QA cadence and stop conditions. |
| Supabase Cloud runbook | `docs/supabase-cloud.md` | Hosted Supabase project, migrations, storage, realtime and Vercel env rules. |
| Current DOCX package | `docs/1Cati-Current-Project-Documentation.docx` | Generated reading copy of the current handbook and requirements package. |
| User handbook and manual testing mail | `docs/user-handbook/` | German user handbook DOCX and bilingual email draft for internal manual exploratory QA. |
| Demo/video production | `docs/demo/full-functionality-playlist-de/README.md` | Split German production folder for the full 1Cati video set: pitch, CEO walkthrough, property-manager training chapters, HeyGen plan and QA checklist. |
| Competitive system quick test | `docs/demo/competitive-system-quick-test-de/Waleri-Fremdsystem-Schnelltest-1Cati-Vergleich-DE.md` | German 5-10 minute manager checklist for testing a similar system against 1Cati requirements; DOCX export is stored in the same folder. |
| Security/compliance | `docs/requirements/option-3-ai-site-crm/Security-Compliance-Plan.md` | KVKK-aware and OWASP ASVS-aligned delivery checklist. |
| Security and AI observability hardening | `docs/security/AI-SECURITY-OBSERVABILITY.md` | Code-verified notes for browser privacy, API cache boundaries, ID exposure, AI grounding/drift checks, redacted telemetry and Waleri service-feedback coverage. |
| Data migration | `docs/requirements/option-3-ai-site-crm/Data-Migration-Plan.md` | Import, reconciliation and cutover rules. |
| QA/UAT/launch | `docs/requirements/option-3-ai-site-crm/QA-UAT-Launch-Plan.md` | Mandatory UAT scenarios and launch gates. |
| Traceability | `docs/requirements/option-3-ai-site-crm/Requirements-Traceability-Matrix.md` | Requirement-to-test coverage. |
| Sources | `docs/requirements/option-3-ai-site-crm/Source-Register.md` | Public source register used by the package. |
| Original client inputs | `docs/source/client-inputs` | Raw inputs and extracted text. Do not rewrite as active truth. |

## 5. Documentation Quality Assessment

The repository already has the core documents expected for a serious product and delivery package:

- BRD: present.
- PRD: present.
- TRD: present.
- Main project handbook: now present here.
- Implementation and delivery plan: present.
- Third-party integration, vendor decision plan and external dependency cost register: present.
- Engineering implementation plan: present.
- Phase execution runbook: present.
- Security and compliance plan: present.
- Data migration plan: present.
- QA/UAT/launch plan: present.
- Requirements traceability matrix: present.
- Source register and market annex: present.
- Current combined DOCX reading package: present.

The main issue was not missing documentation. The main issue was organization: duplicated Word exports, an outdated active docs index, a stale root-level implementation plan, and unclear distinction between source-of-truth Markdown and generated DOCX exports.

On 6 July 2026 this handbook was reconciled with the active cloud Supabase setup. Relevant changes included cloud-only app environment values, migration-history repair, migrations `00000000000000` through `00000000000013` applied to project `hczmbaqofxyusellxhyp`, private `cati-documents` Storage, public intake RPC verification, authenticated profile/RPC smoke verification and realtime dashboard smoke verification.

## 6. Open Product And Delivery Decisions

These items are intentionally not resolved by documentation alone. They require client, legal, finance or vendor decisions before production launch.

| Topic | Required decision |
|---|---|
| Supabase Cloud Pro | Backup policy, billing owner, budget cap and production credential rotation/ownership. Project `hczmbaqofxyusellxhyp` is configured as the active hosted backend. |
| Access profiles | Keep access profiles disabled in production unless explicitly approved for a controlled non-production environment. |
| Payment provider | Choose provider or approve manual/bank-first workflow. |
| External dependency cost register | Approve paid-provider budget, Jira grouping, billing owner and procurement owner for Supabase Cloud Pro, Vercel, Jira/Xray, monitoring, email, SMS, payments, AI, storage, access/security and accounting tools. |
| Document storage | Confirm production bucket/provider mode, retention periods, virus scanning, signed URL rules and who approves uploaded owner/tenant/staff documents. |
| Third-party vendor shortlist | Approve the payment, SMS, email, push, wallet/top-up, monitoring and access/security provider shortlist before production credentials are issued. |
| Bank reconciliation | Confirm source files, provider data and matching rules. |
| Access system | Confirm vendor/API/manual fallback and legal boundary for restriction actions. |
| Debt-based restrictions | Legal/accounting review and client-approved policy. |
| Data retention | Retention periods for finance, identity, documents, media, chat and AI events. |
| Public intake, AI concierge and IDV | Confirm production identity-verification provider, KBS/legal retention period, abuse/rate-limit controls, human triage ownership, support metrics review cadence and knowledge-base update owner before public launch. |
| Native app | Confirm whether PWA-first remains accepted or native wrappers are needed later. |
| Historical migration | Decide which history is useful, legal and clean enough to import. |
| Production UAT | Run mandatory UAT with realistic data and record sign-off. |
| Jira live sync | Approve when confidential docs may be attached and remote Jira/Xray writes are allowed. Until then use dry-run only. |

## 7. Documentation Governance

Use these rules whenever adding or changing documentation:

1. Markdown is the editable source of truth for requirements, technical, QA and delivery documents.
2. DOCX files are exports or stakeholder reading copies unless a document explicitly says otherwise.
3. Raw client inputs stay in `docs/source/client-inputs` and must not be edited into a new version of truth.
4. Generated QA artifacts, screenshots, preview HTML and JSON reports are not kept in the repository.
5. Exact duplicate exports should be deleted after a canonical copy is kept.
6. Do not keep root-level business docs, screenshots, zip files, archive folders, phase-delivery folders or QA outputs.
7. When code or architecture changes, update this handbook, `docs/README.md`, the affected BRD/PRD/TRD section and `AGENTS.md` if agent instructions changed.
8. Before implementing or releasing a workflow change, cross-check its applicable BRD/PRD/TRD requirement, delivery phase, API/migration contract, RBAC/RLS boundary and QA/UAT scenario. Record gaps or external approval dependencies rather than presenting provider-ready functions as live production integrations.

## 8. Practical Reading Order

For management:

1. `docs/requirements/option-3-ai-site-crm/1Cati-External-Integration-Cost-Scale-Management-Blueprint-2026-07-15.docx`
2. `docs/requirements/option-3-ai-site-crm/1Cati-Interactive-Cost-Scale-Estimator-2026-07-15.html`
3. `docs/1Cati-Current-Project-Documentation.docx`
4. `docs/demo/full-functionality-playlist-de/README.md`
5. `docs/requirements/option-3-ai-site-crm/Implementation-Delivery-Plan.md`
6. `docs/requirements/option-3-ai-site-crm/QA-UAT-Launch-Plan.md`

For product and design:

1. `docs/requirements/option-3-ai-site-crm/BRD.md`
2. `docs/requirements/option-3-ai-site-crm/PRD.md`
3. `docs/requirements/option-3-ai-site-crm/Requirements-Traceability-Matrix.md`

For engineering:

1. `docs/requirements/option-3-ai-site-crm/TRD.md`
2. `docs/requirements/option-3-ai-site-crm/Third-Party-Integration-And-Vendor-Plan.md`
3. `docs/ways-of-work/plan/option-3-ai-site-crm/implementation-plan.md`
4. `docs/ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md`
5. `docs/supabase-cloud.md`

For QA and launch:

1. `docs/requirements/option-3-ai-site-crm/QA-UAT-Launch-Plan.md`
2. `docs/requirements/option-3-ai-site-crm/Requirements-Traceability-Matrix.md`
3. regenerated QA output from the phase harness, when fresh evidence is needed

## 9. What Not To Trust As Active Scope

The following are useful for history but should not drive current scope without checking the canonical docs above:

- stale root-level plans,
- generated QA screenshots without matching report context,
- duplicate DOCX exports,
- old extracted client text without a linked requirement,
- local ignored artifacts under `.tmp`, `.graphify`, `quality`, `playwright-report` or `test-results`,
- local dependency/build folders such as `node_modules`, `.next`, `.turbo`, `.vercel`, Supabase `.temp/.branches` and editor/browser caches.

Use `pnpm clean:workspace -- --dry-run` from the repository root to preview
generated artifact cleanup. Run `pnpm clean:workspace` to remove ignored
generated artifacts while keeping dependency installs, or add `--include-deps`
only when a fresh dependency install is intended.
