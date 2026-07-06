# 1Cati Project Handbook

Status: active source-of-truth guide
Last reviewed: 6 July 2026
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

The current implementation is a strong delivery foundation. It includes the public app, localized pages, New Level Premium public intake page, role-aware dashboard, controlled access-profile flow for local QA, operational modules, AI assistant surfaces, Supabase migrations, seed data, realtime/polling dashboard refresh, Playwright tests and browser QA harnesses.

It is not yet a fully production-launched customer system. Production still requires client-approved source data, Supabase cloud environment setup, final RLS/security verification, payment/access/vendor decisions, UAT sign-off, legal/accounting review and launch handover.

## 3. Current Implementation Status

As of 30 June 2026, the repository evidence shows:

| Area | Current status | Evidence |
|---|---|---|
| Public web app | Implemented as Next.js app with localized routes, including a New Level Premium public page for owner/tenant/staff requests, public reports and a source-grounded product concierge with internal quality telemetry, WhatsApp handoff and CSAT feedback. | `apps/web/app/[locale]`, `apps/web/app/[locale]/new-level-premium`, `apps/web/messages/*.json` |
| Dashboard shell | Implemented with role-aware navigation, RBAC-aware drilldowns, module pages and the full 15-phase ERP delivery map. | `apps/web/app/[locale]/dashboard`, `apps/web/lib/site-management-data.ts` |
| Local access profiles | Implemented for controlled local/staging review when production auth is not available. | `apps/web/lib/auth.ts`, `apps/web/proxy.ts` |
| Supabase schema | Local migrations and seed data exist for RBAC, site CRM, ledger, tickets, booking/checkout, communications, documents, operational APIs, fuzzy search, dashboard realtime publication and queued public intake via `submit_public_intake`. | `supabase/migrations`, `supabase/seed.sql` |
| Operational APIs | Dashboard snapshot, phase status, search, action logging, import preview/commit, Phase 4 data, Phase 5 people, Phase 6 ledger, Phase 7 payment-control, Phase 8-9 service operations, Phase 10-11 demo contracts, document upload/storage contract, Phase 12 offline/mobile-web contract, Phase 13 integration readiness, Phase 14 AI premium contracts, public registration/report intake and public product concierge exist with Supabase-first/local seed behavior where applicable. Public AI logs topic, outcome, confidence, latency, source IDs, escalation and CSAT feedback without storing raw anonymous questions. | `apps/web/app/api/site-management/*`, `apps/web/app/api/ai/*`, `apps/web/lib/site-management-repository.ts` |
| Operational modules | Data/API-backed screens exist for listings, leads, calendar, finance, documents, compliance, users, reports, tickets and communications. Some workflows remain foundation depth until production vendors/data are confirmed. | `apps/web/app/[locale]/dashboard/*` |
| Live dashboard refresh | Implemented with a shared live snapshot hook, Supabase Realtime subscriptions where configured and 30-second polling fallback. | `apps/web/hooks/use-live-dashboard-snapshot.ts`, `apps/web/components/sync-badge.tsx`, `supabase/migrations/00000000000004_realtime_operational_dashboard.sql` |
| QA and phase control | Current app status and QA harnesses use the 15-phase ERP model. Generated evidence is disposable unless promoted into the active Markdown package. | `scripts/phase-06-09-harness.mjs`, `scripts/phase-10-11-harness.mjs`, `apps/web/e2e/dashboard.spec.ts` |
| Jira/Xray automation | Dry-run capable Jira/Xray sync exists for 15 phase epics, 53 phase stories, one documentation issue, one Xray Test Plan, three Test Sets, eight Test Executions, 20 functional system tests, 10 exploratory role/functionality tests and 13 automated QA/API tests. Local QA JSON/JUnit summaries are classified as execution evidence. Remote sync requires explicit approval because it writes project metadata/evidence to Jira/Xray and may upload attachments if not skipped. | `scripts/jira-xray-sync.mjs`, `pnpm jira:sync -- --dry-run` |
| Requirements docs | BRD, PRD, TRD, security, migration, QA/UAT, traceability and source register exist. | `docs/requirements/option-3-ai-site-crm` |

Important boundary: the repository now has a real local Supabase foundation and live API contracts, but this is not the same as a completed production customer deployment. Do not present payment, bank, access-control, storage, external messaging, vendor integration, native app or production AI automation as live until the client data, cloud environment, provider decisions, RLS/security review and UAT sign-off are completed.

## 3.1 Current Phase Truth

Use this table when status appears inconsistent across documents or generated exports.

| Phase range | Current status on 29 June 2026 | Practical meaning |
|---|---|---|
| Phase 1-4 | Complete as local/product foundation | Scope, UX/RBAC, Supabase schema, site/block/floor/unit model, import validation and live dashboard foundation exist. |
| Phase 5-14 | Complete as implementation foundation / ready for functional QA and client data validation | People/roles, finance ledger, payment/deposit/restriction controls, service catalogue, service orders, workforce tasks, booking readiness, checkout settlement, access handoff, communication/document workflows, private document upload contract, mobile-friendly web/PWA shell, offline-safe queue, provider-ready integration placeholders, AI recommendations, same-language AI chat and image/proof AI workflows exist with UI/API/harness coverage. They still require client data validation, accounting/legal review, provider decisions and client UAT before production use. |
| Phase 15 | Accelerated delivery window | Launch hardening, final QA, security, performance, UAT, training and production readiness remain targeted for completion by Wednesday 8 July 2026, excluding full exploratory manual testing. This phase still needs harness/browser evidence before it is marked complete. |

The current expert plan is a 15-phase ERP model because integrations, AI and launch hardening need separate governance and test gates.

Delivery boundary: this accelerated target includes implementation, unit checks, automated E2E/regression scripts and browser smoke checks. A full exploratory manual QA/UAT round is not included in the current effort estimate and should be planned separately after the phase development is finished.

## 4. Canonical Documentation Set

The documentation is intentionally divided by document type. This prevents a single huge file from becoming unreadable while still giving one clear documentation system.

| Need | Canonical document | Notes |
|---|---|---|
| Start here | `docs/README.md` | Navigation and maintenance rules for the whole docs tree. |
| Full project overview | `docs/PROJECT-HANDBOOK.md` | This document. |
| Consolidated German requirements document | `docs/requirements/option-3-ai-site-crm/Anforderungsdokument-1Cati.md` | Single-document client-facing overview (WAMOCON standard format) covering current implementation state, dated market/competitor research and the forward roadmap. Complements, does not replace, the BRD/PRD/TRD package below. Also published as `apps/web/public/Anforderungsdokument_1Cati.docx`. |
| Business requirements | `docs/requirements/option-3-ai-site-crm/BRD.md` | Business goals, workflows and market context. |
| Product requirements | `docs/requirements/option-3-ai-site-crm/PRD.md` | Personas, scope, user stories and acceptance criteria. |
| Technical requirements | `docs/requirements/option-3-ai-site-crm/TRD.md` | Architecture, data model, integrations and technical controls. |
| Third-party integrations and costs | `docs/requirements/option-3-ai-site-crm/Third-Party-Integration-And-Vendor-Plan.md` | Payment, SMS, email, wallet, access/security, monitoring, Supabase Cloud Pro and external dependency cost register. |
| Delivery plan | `docs/requirements/option-3-ai-site-crm/Implementation-Delivery-Plan.md` | Client/delivery-level phase plan. |
| Engineering implementation plan | `docs/ways-of-work/plan/option-3-ai-site-crm/implementation-plan.md` | Detailed feature inventory and technical delivery planning. |
| Execution runbook | `docs/ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md` | Phase harnesses, QA cadence and stop conditions. |
| Local Supabase runbook | `docs/local-supabase.md` | Working local Docker/Supabase setup, seed login, ports and cloud migration notes. |
| Current DOCX package | `docs/1Cati-Current-Project-Documentation.docx` | Generated reading copy of the current handbook and requirements package. |
| User handbook and manual testing mail | `docs/user-handbook/` | German user handbook DOCX and bilingual email draft for internal manual exploratory QA. |
| Security/compliance | `docs/requirements/option-3-ai-site-crm/Security-Compliance-Plan.md` | KVKK-aware and OWASP ASVS-aligned delivery checklist. |
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

On 26 June 2026 this handbook was reconciled with the active Codex sessions. Relevant parallel-session changes included the 15-phase ERP dashboard model, RBAC-aware dashboard drilldowns, listings interactions, local Supabase fixes, fuzzy search, Jira/Xray dry-run workflow and realtime dashboard refresh.

## 6. Open Product And Delivery Decisions

These items are intentionally not resolved by documentation alone. They require client, legal, finance or vendor decisions before production launch.

| Topic | Required decision |
|---|---|
| Supabase Cloud Pro | Project, region, environment variables, RLS verification, backup policy, billing owner, budget cap and production credentials. |
| Local access profiles | Keep local access profiles disabled in production unless explicitly approved for a controlled environment. |
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

## 8. Practical Reading Order

For management:

1. `docs/1Cati-Current-Project-Documentation.docx`
2. `docs/requirements/option-3-ai-site-crm/Implementation-Delivery-Plan.md`
3. `docs/requirements/option-3-ai-site-crm/QA-UAT-Launch-Plan.md`

For product and design:

1. `docs/requirements/option-3-ai-site-crm/BRD.md`
2. `docs/requirements/option-3-ai-site-crm/PRD.md`
3. `docs/requirements/option-3-ai-site-crm/Requirements-Traceability-Matrix.md`

For engineering:

1. `docs/requirements/option-3-ai-site-crm/TRD.md`
2. `docs/requirements/option-3-ai-site-crm/Third-Party-Integration-And-Vendor-Plan.md`
3. `docs/ways-of-work/plan/option-3-ai-site-crm/implementation-plan.md`
4. `docs/ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md`
5. `docs/local-supabase.md`

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
- local ignored artifacts under `.tmp`, `.graphify`, `quality`, `playwright-report` or `test-results`.
