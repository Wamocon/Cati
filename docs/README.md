# Documentation Hub

Status: active documentation map
Last reviewed: 13 July 2026
Confidentiality: STRICTLY CONFIDENTIAL

Start with `PROJECT-HANDBOOK.md`. It explains the full project, the code-verified 13 July 2026 implementation state, the canonical documents, the 15-phase ERP delivery model, open decisions and cleanup rules.

Current implementation checkpoint: a code and focused-production-E2E audit after the 13 July pull classifies phases 5-14 as a mixed implementation foundation, not UAT-ready. Selected Supabase reads and writes are real, but many visible workflows remain seed-, process-memory-, simulation- or action-log-backed. Security, persistence and vertical-slice gates in the functional hardening plan must pass before any UAT-ready claim is restored.

## Active Source-Of-Truth Documents

| Area | Document | Use |
|---|---|---|
| Project handbook | `PROJECT-HANDBOOK.md` | Single entry point for the whole project. |
| Requirements package | `requirements/option-3-ai-site-crm/README.md` | Index for BRD, PRD, TRD, QA, security, migration and traceability. |
| Business requirements | `requirements/option-3-ai-site-crm/BRD.md` | Business goals, workflows and market context. |
| Product requirements | `requirements/option-3-ai-site-crm/PRD.md` | Product scope, personas, user stories and acceptance criteria. |
| Technical requirements | `requirements/option-3-ai-site-crm/TRD.md` | Architecture, data model, APIs, integrations and controls. |
| Third-party integrations and costs | `requirements/option-3-ai-site-crm/Third-Party-Integration-And-Vendor-Plan.md` | Provider shortlist, external dependency cost register, Supabase Cloud Pro, payments, SMS, email, wallet/top-up, access/security and monitoring. |
| Management cost and scale blueprint | `requirements/option-3-ai-site-crm/1Cati-External-Integration-Cost-Scale-Management-Blueprint-2026-07-15.docx` | Dated multilingual executive reading copy covering providers, Turkish rules, scale economics, AI, procurement gates, risks and work packages. |
| Interactive cost and scale estimator | `requirements/option-3-ai-site-crm/1Cati-Interactive-Cost-Scale-Estimator-2026-07-15.html` | Standalone EN/DE/TR/RU planning controller with 1,000-user steps and transparent assumptions/formulas. |
| Delivery plan | `requirements/option-3-ai-site-crm/Implementation-Delivery-Plan.md` | Delivery phases, governance, risks and handover. |
| Engineering plan | `ways-of-work/plan/option-3-ai-site-crm/implementation-plan.md` | Detailed implementation planning and feature inventory. |
| Functional hardening plan | `ways-of-work/plan/option-3-ai-site-crm/functional-hardening-plan-2026-07.md` | Code-verified gap audit, target ticket/emergency/booking architecture, delivery waves, SLOs and approval gate. |
| Execution runbook | `ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md` | Harness commands, QA loop and stop conditions. |
| Supabase Cloud | `supabase-cloud.md` | Hosted Supabase project, migrations, storage, realtime and Vercel env rules. |
| Current DOCX package | `1Cati-Current-Project-Documentation.docx` | Generated reading copy of the current handbook and requirements package. |
| User handbook and manual testing mail | `user-handbook/` | German user handbook DOCX and bilingual manual exploratory testing email draft for internal QA. |
| Demo and video scripts | `demo/full-functionality-playlist-de/README.md` | Split German production folder with pitch, CEO walkthrough, property-manager training scripts, HeyGen plan, QA checklist and `/videos` page publishing structure. |
| Security and AI observability | `security/AI-SECURITY-OBSERVABILITY.md` | Browser privacy headers, private no-cache/noindex rules, redacted AI telemetry, grounding/drift checks and Waleri service-feedback coverage. |
| Competitive system quick test | `demo/competitive-system-quick-test-de/Waleri-Fremdsystem-Schnelltest-1Cati-Vergleich-DE.md` | German 5-10 minute comparison checklist for testing a similar system against core 1Cati requirements; DOCX export is stored beside the Markdown source. |

## Current Status Rule

For current delivery status, trust this order:

1. `PROJECT-HANDBOOK.md`
2. `ways-of-work/plan/option-3-ai-site-crm/functional-hardening-plan-2026-07.md`
3. `requirements/option-3-ai-site-crm/README.md`
4. `ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md`
5. Current code and scripts under `apps/web`, `supabase` and `scripts`

## Change-Control Rule

Before changing a workflow, identify its relevant BRD/PRD/TRD requirement, implementation-plan phase and QA/UAT scenario. Cross-check the proposed code, API/migration and RBAC/RLS behavior against those sources, then run the matching automated checks before release. Do not present provider-ready payment, bank, messaging, access, storage or AI adapters as production-live without the documented vendor, legal, security and UAT approvals.

Files outside this map are not current project documentation.

## Stakeholder Reading Copies

| Document | Status |
|---|---|
| `1Cati-Current-Project-Documentation.docx` | Current combined DOCX generated from the active Markdown set. |
| `requirements/option-3-ai-site-crm/1Cati-External-Integration-Cost-Scale-Management-Blueprint-2026-07-15.docx` | Dated management decision and cost-planning brief; prices and rules must be refreshed before commitment. |
| `requirements/option-3-ai-site-crm/1Cati-Interactive-Cost-Scale-Estimator-2026-07-15.html` | Dated interactive planning copy; entered assumptions and supplier quotes remain the decision owner's responsibility. |

Stakeholder `.docx` files are reading copies. For requirements and technical changes, update Markdown first and regenerate exports only when needed.

## Source Material

`source/client-inputs/` contains original client inputs and extracted text. These files are evidence, not editable active requirements. Do not rewrite them into a new active source of truth.

## QA And Evidence

| Location | Rule |
|---|---|
| `requirements/option-3-ai-site-crm/qa/*.md` | Documentation QA notes retained as Markdown only. |
| Generated screenshots, previews and JSON reports | Do not keep in the repository. Regenerate them from scripts when needed. |

The user handbook DOCX may contain embedded application screenshots for explanation. Standalone raw screenshot files should not be retained after the DOCX is generated.

Current repeatable QA commands:

```powershell
pnpm phase:harness -- --profile smoke --max-attempts 2
pnpm phase:10-11 -- --base-url http://127.0.0.1:3104 --max-attempts 2
pnpm qa:full-app -- --base-url http://127.0.0.1:3104 --skip-browser
pnpm phase:06-09
pnpm jira:sync -- --dry-run
```

`pnpm jira:sync` without `--dry-run` performs remote Jira/Xray writes. The current model syncs phase epics/stories, a documentation issue, one Xray Test Plan, three Test Sets, eight Test Executions, 20 functional system tests, 10 exploratory role/functionality tests, 13 automated QA/API tests and latest local QA JSON/JUnit evidence. Use `--skip-attachments` to avoid uploading confidential documentation files. Use live sync only after explicit approval because project metadata and QA evidence are sent to the Jira/Xray tenant.

Updated Jira/Xray naming rule: the internal QA suite uses "functional system tests", "exploratory role/functionality tests" and "automated regression/API tests". UAT remains a later client acceptance activity, not the name of the internal functional test set.

## Cleanup Rules

- No business DOCX, PNG, TXT, ZIP or QA exports in the repository root.
- Markdown is canonical for requirements, technical, QA and delivery docs.
- DOCX files are generated exports or stakeholder reading copies.
- Generated diagrams, screenshots, HTML previews, JSON reports and extracted TXT duplicates are not kept.
- Exact duplicate exports may be deleted after a canonical copy remains.
- Temporary Word files such as `~$*.docx`, `.tmp`, `.bak` and generated ZIPs may be removed.
- Do not keep archive folders or old phase-delivery evidence in the active docs tree.
- Update this file and `PROJECT-HANDBOOK.md` whenever documentation ownership or structure changes.
