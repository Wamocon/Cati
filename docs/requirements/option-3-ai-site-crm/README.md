# Option 3 AI Site CRM Requirements Package

Status: active requirements package
Last reviewed: 29 June 2026
Confidentiality: STRICTLY CONFIDENTIAL

This folder contains the canonical requirements package for the 1Cati AI-powered residential site management CRM. Markdown files are the editable source of truth. Matching `.docx` files are generated stakeholder exports unless explicitly stated otherwise.

## Current Implementation Checkpoint

For current delivery control, use the 15-phase ERP model in `../../PROJECT-HANDBOOK.md`. On 29 June 2026 the active state is:

| Phase range | Status | Notes |
|---|---|---|
| Phase 1-4 | Complete as local/product foundation | Requirements, UX/RBAC, Supabase schema, site/block/floor/unit model, import validation and live dashboard foundation exist. |
| Phase 5-9 | Ready for UAT review | User, owner, tenant and staff relationships, core ledger, payment/deposit/restriction controls, service catalogue, service orders, workforce tasks, SLA board and media-proof workflow exist with API/UI/harness evidence. Production-grade provider/accounting/legal decisions and real client-data validation remain open. |
| Phase 10-15 | Planned production work | Booking/checkout, communications, mobile/PWA, integrations, AI premium layer and launch hardening remain planned work under the accelerated delivery target. |

## Reading Order

| Order | Document | Purpose |
|---:|---|---|
| 0 | `Anforderungsdokument-1Cati.md` | Consolidated German client-facing requirements document (WAMOCON standard format) covering current implementation state, fresh dated market/competitor research and the forward roadmap in one document. Does not replace the detailed BRD/PRD/TRD/QA package below — use it for a single-document overview, use the documents below for implementation detail. Exported as `Anforderungsdokument-1Cati.docx` and additionally published at `apps/web/public/Anforderungsdokument_1Cati.docx`. |
| 1 | `BRD.md` | Business requirements, market context, workflows and business acceptance logic. |
| 2 | `PRD.md` | Product scope, personas, user stories, module requirements and product roadmap. |
| 3 | `TRD.md` | Technical architecture, data model, security controls, APIs and integration approach. |
| 4 | `Third-Party-Integration-And-Vendor-Plan.md` | Payment, SMS, email, wallet, access/security, monitoring, external dependency cost register, Supabase Cloud Pro and provider decision plan. |
| 5 | `Implementation-Delivery-Plan.md` | Delivery phases, governance, decision log, risks and handover package. |
| 6 | `Security-Compliance-Plan.md` | Security, privacy, KVKK-aware processing and ASVS-aligned controls. |
| 7 | `Data-Migration-Plan.md` | Source inventory, validation, reconciliation, cutover and migration acceptance. |
| 8 | `QA-UAT-Launch-Plan.md` | Test strategy, mandatory UAT scenarios, launch gates and runbook. |
| 9 | `Requirements-Traceability-Matrix.md` | Requirement-to-implementation-to-test traceability. |
| 10 | `Market-Research-Annex.md` | Market and competitor benchmark detail supporting the BRD/PRD. |
| 11 | `Source-Register.md` | External source register and evidence handling rules. |

## Generated Assets

| Folder | Contents |
|---|---|
| `qa` | Markdown QA notes for generated documentation exports. |

Generated PNG/SVG diagrams, Mermaid sidecar files, HTML previews, JSON manifests and screenshots are not retained in the repository. The Markdown files contain the relevant workflow sources. DOCX files are generated reading copies of the Markdown set.

## Maintenance Rules

- Update Markdown first.
- Regenerate `.docx` exports only after Markdown changes are approved.
- Keep diagram source inside the Markdown document that uses it.
- Do not add temporary build folders, generated screenshots, preview HTML, JSON manifests or one-off document generators to this folder.
- Remove exact duplicate exports after a canonical copy is kept.
- Keep source claims tied to `Source-Register.md` or mark them as assumptions.

## Current Package Assessment

The package has the required BRD, PRD, TRD, third-party integration/vendor and external dependency cost register, delivery, security, migration, QA/UAT, traceability, market and source documents. The remaining work is not creating more document types; it is keeping these documents synchronized with implementation, production decisions, Supabase Cloud Pro setup, vendor procurement, UAT evidence and Jira/Xray delivery tracking.
