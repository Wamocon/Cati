# 1Çatı — AI Premium Layer
## Commercial Offer & Capability Proposal

> Prepared by: WAMOCON GmbH · For: Ataberk Estate · Draft: 2 July 2026
> Status: DRAFT for client review. Markdown is the editable source of truth; a DOCX reading copy is generated from this file.
> Scope boundary: This document distinguishes **Live today**, **Build in this phase**, and **Roadmap (provider/decision-gated)**. Nothing gated is presented as already operational.

---

## 1. Executive summary

1Çatı already unifies CRM, unit matrix, finance, service operations and compliance for the New Level Premium portfolio (769 units, 7 blocks) in one role-based ERP. The **AI Premium Layer** turns that single source of truth into **decision support**: every role — management, accounting, field, owner, tenant — receives grounded, source-cited answers and proactive risk signals in Turkish, Russian, German and English, without any user ever seeing data outside their permission scope.

The differentiator is not "a chatbot". It is **governed, auditable, multilingual operational intelligence** that is safe by construction: the AI can *recommend and explain*, but every financial, access, or permission action stays behind human approval and an audit trail.

---

## 2. What already exists (the foundation this layer builds on)

These are **live in the current build** and de-risk the premium layer:

- **RBAC-scoped AI access** — `getAiAccessDecision` enforces the exact same 6-role / 14-resource / 8-action permission matrix as the UI and database. A tenant asking for the finance ledger receives a scope-refusal, never the data.
- **Deterministic, grounded context** — answers are assembled from the actual operational dataset (units, finance ledger, tickets, reservations, compliance checks), not hallucinated. When no AI gateway is configured, the system falls back to a deterministic response — it never fails and never invents.
- **Safety gate in the system prompt** — the model is explicitly forbidden from executing financial/access/permission actions; it may only advise and must defer to human approval. This is a hard, non-negotiable design constraint.
- **Provider-neutral gateway** — the layer targets a generic OpenAI-compatible on-prem/local AI gateway with per-purpose model selection (fast / reasoning / German-copy / pro). No lock-in to a single vendor.
- **Full audit trail** — sensitive actions are logged with actor, time, module and reason; the AI layer inherits this.

---

## 3. AI Premium Layer — capability tiers

### Tier 1 — Grounded Operational Assistant  *(Build in this phase; extends the live assistant)*
- Role-aware Q&A over live operational data with **source citations** (which unit, which ledger entry, which ticket).
- Multilingual by design: Turkish (primary), Russian, German, English — same answer, correct locale.
- "Explain this KPI" on every dashboard card (occupancy, open debt, open service, access holds).
- Hard scope enforcement + refusal messaging (already live) extended to every module.

### Tier 2 — Predictive Risk & Briefings  *(Build in this phase)*
- **Payment-default risk scoring** per unit from ledger aging, payment history and reservation/deposit state — surfaced as a ranked worklist, not an automatic restriction.
- **Occupancy & collection forecasting** for the portfolio (monthly cash-in projection from dues + reservations).
- **Daily role briefings**: management gets the risk map; accounting gets the collection route; field gets the SLA-critical tasks — each generated on demand, human-triggered.
- **Compliance early-warning**: EİDS authorization expiry, TAPU/KYC gaps, residence-quota thresholds flagged before a listing/handover proceeds.

### Tier 3 — Advanced Analytics & Reporting  *(Build in this phase)*
- On-demand board / accounting / operations / security / guest report views with natural-language summaries (no scheduled automation implied).
- Multi-currency (TRY/EUR/USD) exposure and simple capital-gains estimation surfaced with the report.
- Trend detection across occupancy, debt aging, service SLA and access events.

### Roadmap — Action Automation  *(Provider/decision-gated — NOT part of go-live)*
Payment, bank reconciliation, access-control hardware, and messaging/notification automation remain **roadmap** items pending provider decisions, accounting/legal review and UAT sign-off. The AI Premium Layer will *prepare and recommend* these actions; execution stays manual until those decisions are made. This boundary is stated openly to the client to avoid over-scope.

---

## 4. Why this is premium (competitive positioning)

| Standard property software | 1Çatı AI Premium Layer |
|---|---|
| Static dashboards | Explains every number, cites its source |
| One language | tr / ru / de / en, same governed answer |
| Reports you build manually | On-demand briefings per role |
| "AI" that can leak data | Permission-scoped by construction, refusal-first |
| Chatbot that can act | Advises only; every action human-approved + audited |
| Vendor lock-in | Provider-neutral, on-prem-capable gateway |

---

## 5. Delivery approach

1. **Discovery & guardrail lock** — confirm the AI gateway/provider, model tiers, and the exact refusal/approval policy with the client (1–2 weeks).
2. **Tier 1 hardening** — extend the live grounded assistant to every module with citations and per-locale output.
3. **Tier 2 risk engine** — deterministic scoring first (explainable), model-assisted narrative second.
4. **Tier 3 reporting** — on-demand report views + NL summaries.
5. **QA & UAT** — role-matrix red-team of the scope guard, multilingual review, performance and Lighthouse gates, client UAT sign-off before any "live" claim.

Every stage ships behind the existing quality gates (TypeScript, lint, production build, role-based E2E on desktop **and** mobile) — the same gates that this codebase already passes at 40/40.

---

## 6. Commercial framing *(placeholders — to be set with WAMOCON)*

- **Model:** fixed-scope delivery per tier, or monthly retained capacity.
- **Recurring:** AI gateway hosting/inference + support & multilingual content upkeep.
- **Investment:** €[__] setup per tier · €[__]/month run — *to be finalized.*
- **Guarantee stance:** we commit to the **quality gates and the safety guardrails**, not to unqualified "100%" outcome claims (deliberately, for legal defensibility).

---

## 7. Open decisions for the client (honest list)
AI gateway/provider & model tiers · data-retention policy · which Tier-2 scores are shown to owners/tenants vs. staff-only · production Supabase setup · UAT sign-off scope. These block a "live" designation and are surfaced now, not hidden.

---

*This offer is intentionally conservative about what is presented as operational. It sells the governed, multilingual, decision-support intelligence that 1Çatı can deliver credibly — which is a stronger and more defensible pitch than promising automation that is not yet built.*
