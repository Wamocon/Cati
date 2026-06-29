# Documentation Hub

Status: active documentation map
Last reviewed: 29 June 2026
Confidentiality: STRICTLY CONFIDENTIAL

Start with `PROJECT-HANDBOOK.md`. It explains the full project, the current 29 June 2026 implementation state, the canonical documents, the 15-phase ERP delivery model, open decisions and cleanup rules.

Current implementation checkpoint: phases 1-9 are complete as a demo/internal-QA foundation; phases 10-15 remain in the accelerated delivery window. Full exploratory manual QA/UAT is tracked separately from this development target.

## Active Source-Of-Truth Documents

| Area | Document | Use |
|---|---|---|
| Project handbook | `PROJECT-HANDBOOK.md` | Single entry point for the whole project. |
| Requirements package | `requirements/option-3-ai-site-crm/README.md` | Index for BRD, PRD, TRD, QA, security, migration and traceability. |
| Business requirements | `requirements/option-3-ai-site-crm/BRD.md` | Business goals, workflows and market context. |
| Product requirements | `requirements/option-3-ai-site-crm/PRD.md` | Product scope, personas, user stories and acceptance criteria. |
| Technical requirements | `requirements/option-3-ai-site-crm/TRD.md` | Architecture, data model, APIs, integrations and controls. |
| Third-party integrations and costs | `requirements/option-3-ai-site-crm/Third-Party-Integration-And-Vendor-Plan.md` | Provider shortlist, external dependency cost register, Supabase Cloud Pro, payments, SMS, email, wallet/top-up, access/security and monitoring. |
| Delivery plan | `requirements/option-3-ai-site-crm/Implementation-Delivery-Plan.md` | Delivery phases, governance, risks and handover. |
| Engineering plan | `ways-of-work/plan/option-3-ai-site-crm/implementation-plan.md` | Detailed implementation planning and feature inventory. |
| Execution runbook | `ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md` | Harness commands, QA loop and stop conditions. |
| Local Supabase | `local-supabase.md` | Local database setup, seed login and cloud migration notes. |
| Current DOCX package | `1Cati-Current-Project-Documentation.docx` | Generated reading copy of the current handbook and requirements package. |

## Current Status Rule

For current delivery status, trust this order:

1. `PROJECT-HANDBOOK.md`
2. `requirements/option-3-ai-site-crm/README.md`
3. `ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md`
4. Current code and scripts under `apps/web`, `supabase` and `scripts`

Files outside this map are not current project documentation.

## Stakeholder Reading Copies

| Document | Status |
|---|---|
| `1Cati-Current-Project-Documentation.docx` | Current combined DOCX generated from the active Markdown set. |

Stakeholder `.docx` files are reading copies. For requirements and technical changes, update Markdown first and regenerate exports only when needed.

## Source Material

`source/client-inputs/` contains original client inputs and extracted text. These files are evidence, not editable active requirements. Do not rewrite them into a new active source of truth.

## QA And Evidence

| Location | Rule |
|---|---|
| `requirements/option-3-ai-site-crm/qa/*.md` | Documentation QA notes retained as Markdown only. |
| Generated screenshots, previews and JSON reports | Do not keep in the repository. Regenerate them from scripts when needed. |

Current repeatable QA commands:

```powershell
pnpm phase:harness -- --profile smoke --max-attempts 2
pnpm phase:06-09
pnpm jira:sync -- --dry-run
```

`pnpm jira:sync` without `--dry-run` performs remote Jira/Xray writes and may attach confidential documents. Use it only after explicit approval.

## Cleanup Rules

- No business DOCX, PNG, TXT, ZIP or QA exports in the repository root.
- Markdown is canonical for requirements, technical, QA and delivery docs.
- DOCX files are generated exports or stakeholder reading copies.
- Generated diagrams, screenshots, HTML previews, JSON reports and extracted TXT duplicates are not kept.
- Exact duplicate exports may be deleted after a canonical copy remains.
- Temporary Word files such as `~$*.docx`, `.tmp`, `.bak` and generated ZIPs may be removed.
- Do not keep archive folders or old phase-delivery evidence in the active docs tree.
- Update this file and `PROJECT-HANDBOOK.md` whenever documentation ownership or structure changes.
