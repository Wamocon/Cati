# Option 3 AI Site CRM Requirements Package

Status: active requirements package
Last reviewed: 30 June 2026
Confidentiality: STRICTLY CONFIDENTIAL

This folder contains the canonical requirements package for the 1Cati AI-powered residential site management CRM. Markdown files are the editable source of truth. Matching `.docx` files are generated stakeholder exports unless explicitly stated otherwise.

## Current Implementation Checkpoint

For current delivery control, use the 15-phase ERP model in `../../PROJECT-HANDBOOK.md`. On 30 June 2026 the active state is:

| Phase range | Status | Notes |
|---|---|---|
| Phase 1-4 | Complete as local/product foundation | Requirements, UX/RBAC, Supabase schema, site/block/floor/unit model, import validation and live dashboard foundation exist. |
| Phase 5-11 | Ready for UAT review | User, owner, tenant and staff relationships, core ledger, payment/deposit/restriction controls, service catalogue, service orders, workforce tasks, SLA board, media-proof workflow, booking readiness, checkout settlement, access handoff, communication center, notification retry, multilingual templates, document packets and private document upload/storage contract exist with API/UI/harness evidence. Production-grade provider/accounting/legal/storage decisions and real client-data validation remain open. |
| Phase 12-14 | Ready-for-UAT implementation foundation | Mobile-friendly web/PWA shell, offline-safe queue, provider-ready integration placeholders and guardrailed AI premium features are implemented for demo/internal QA. |
| Phase 15 | Remaining planned production work | Final QA, security, UAT, training, launch hardening and production sign-off remain planned work under the accelerated delivery target. |

## Reading Order

| Order | Document | Purpose |
|---:|---|---|
| 0 | `Anforderungsdokument-1Cati.md` | v1 (04.07.2026): consolidated German client-facing requirements document (WAMOCON standard format) covering current implementation state, fresh dated market/competitor research and the forward roadmap in one document. Does not replace the detailed BRD/PRD/TRD/QA package below — use it for a single-document overview, use the documents below for implementation detail. Exported as `Anforderungsdokument-1Cati.docx` and additionally published at `apps/web/public/Anforderungsdokument_1Cati.docx`. Superseded for implementation-status detail by v2 below; kept as the historical market-analysis record. |
| 0b | `Anforderungsdokument-1Cati-v2.md` | v2 (07.07.2026): adds a full code-verified functional inventory (14 parallel audits against migrations 0000–0013, all API routes, all dashboard pages), a corrected Phase 10–14 status (Foundation-with-disconnected-layers, not "planned"), a Demo chapter explaining the maturity-tier legend, a line-by-line status comparison against the original client requirements document, and a prioritized next-steps chapter. Market analysis (Ch. 2–5) is carried over unchanged from v1. Exported as `Anforderungsdokument-1Cati-v2.docx`, also published at `apps/web/public/Anforderungsdokument-1Cati-v2.docx`. |
| 0c | `1Cati-External-Integration-Cost-Scale-Management-Blueprint-2026-07-15.docx` | Dated executive management brief: multilingual overview, external-provider catalogue, Turkish compliance gates, 1k/5k/10k cost model, AI economics, risks, procurement gates and 14 work packages. This is a planning aid, not a supplier offer or legal/accounting opinion. |
| 0d | `1Cati-Interactive-Cost-Scale-Estimator-2026-07-15.html` | Standalone EN/DE/TR/RU cost controller with 1,000-user steps, scenario presets, editable assumptions, formula ledger, quote-gap visibility and export/print controls. |
| 0e | `Betriebskosten-und-Skalierung-2026-07-17.md` → `1Cati-Betriebskosten-und-Skalierung-2026-07-17.docx` | v1.0 (17.07.2026): German management report on running cost, integration gaps and scaling. Code-verified: distinguishes "provider-ready with real adapter code" (IDV, AI) from "vendor name is only a label, no code" (payments, SMS, email, WhatsApp); documents the un-drained `portal_communication_outbox` (worker + adapters not built); the realtime fan-out blocker (~758 msg/s at 10k users, single-threaded, unfixable by compute); the payment-rail lever (~960k TRY/yr at 1k flats); the KVKK zero-adequacy finding (EU is not legally easier than US; a Frankfurt region does not help because the importer is US-established); and Board decision 2025/2120 on ID-scan retention. Markdown is the editable source; the DOCX is generated via `scripts/build-docx-from-md.py`. Planning aid, not a supplier offer or legal/accounting opinion. |
| 0f | `1Cati-Operating-Cost-Scaling-Calculator-2026-07-17.html` | Standalone DE/EN/TR/RU interactive calculator (self-contained, no external assets). Payment-rail-first cost model at 500–10,000 residents with a hand-rolled isometric 3D scaling chart (Canvas 2D), light/dark themes, component breakdown, optional one-off build-cost toggle, and the seven-item decision list. Figures verified 17.07.2026; TRY/USD 47.04. Companion to 0e. |
| 0g | `1Cati-Angebots-Simulator-2026-07-19.html` (DE lead) / `1Cati-Pricing-Simulator-2026-07-19.html` (EN twin) | v3 (19.07.2026): client-facing offer/quote cockpit, opposite audience to 0e/0f. Four in-page languages (de/en/ru/tr), 1Çatı design + WAMOCON CI. Levers: user count (residents + staff), growth discount tiers, referral-bonus dropdown (0–5 reference key-accounts, −10 % each, cap 50 %), 3-year price guarantee vs. benchmarked SaaS inflation, post-guarantee market adjustment + 50 % loyalty bonus, and the EUR-to-Germany vs. local-TRY currency-advantage chart. Outputs effective price/user, guaranteed monthly, 3-year TCO and documented saving, with PDF/Word export linking into 0h. Planning values, not a binding offer. Companion to 0h. |
| 0h | `docs/Marktanalyse/1Cati-Marktanalyse-2026-de.{html,pdf,docx}` (+ en/ru/tr) | Market/competitive analysis 2026, generated from one source into HTML+PDF+DOCX in four languages. Segments the DE + TR property-management software market into three tiers (transparent SaaS / enterprise ERP / custom build) with named vendors (Casavi, Objego, Aareon, iX-Haus, DOMUS, Apsiyon, Logo Netsis…) and public sources only ("no invented figures"); documents the A/B/C transparency model for external interfaces. Evidence base for 0g's market-comparison chart. |
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
| Package root | The dated management DOCX and standalone interactive estimator listed above are retained stakeholder deliverables. |

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
