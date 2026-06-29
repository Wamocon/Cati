# Third-Party Integration And Vendor Plan

Status: active decision plan
Last reviewed: 26 June 2026
Confidentiality: STRICTLY CONFIDENTIAL

This document turns the broad "external integrations" scope into concrete implementation decisions for the 1Cati ERP. It is not a final procurement decision. Final provider choice still needs Ataberk approval, commercial quote, contract review, KVKK/legal review, production credentials and UAT proof.

## 1. Executive Decision

1Cati should not hard-code one vendor into the core ERP. The correct architecture is an adapter layer with one stable internal contract per capability:

| Capability | Internal contract | Provider can change without rewriting ERP |
|---|---|---|
| Card/payment collection | `payment_intents`, `payment_events`, `ledger_entries` | Yes |
| Bank reconciliation | `bank_import_batches`, `bank_transactions`, `reconciliation_matches` | Yes |
| SMS/email/push | `notification_messages`, `notification_attempts`, `templates` | Yes |
| Digital wallet/top-up | `resident_wallet_accounts`, `wallet_movements`, ledger postings | Yes |
| Access/barrier/security | `access_requests`, `access_events`, `integration_jobs` | Yes |
| Documents/storage | `documents`, `storage_objects`, signed URL policy | Yes |
| AI provider | `ai_events`, `ai_sources`, `ai_approvals` | Yes |
| Monitoring | `integration_health`, `audit_logs`, incident events | Yes |

Recommended MVP stack for Turkey/Alanya:

- Payment: bank transfer/import first, then shortlist iyzico and PayTR for card/online collection; keep Param, Sipay and Paycell as commercial alternates after quotes.
- SMS: shortlist Netgsm and Ileti Merkezi; use SMS only for OTP and high-priority notices, because push/email are cheaper for routine messages.
- Email: Postmark for transactional reliability or Amazon SES for lowest-cost scale; Brevo/Mailgun/SendGrid are fallback choices if deliverability or regional procurement requires them.
- Push: Firebase Cloud Messaging for PWA push; OneSignal only if non-technical staff need a richer campaign console.
- Wallet/top-up: do not become an electronic money custodian. Implement an internal ledger balance and connect Papara/Paycell or a bank/payment provider only if Ataberk explicitly wants resident stored-value/top-up behavior and legal review approves it.
- Access/security: do not choose a hardware vendor blind. Inventory the installed gate, barrier, card, camera and visitor systems first; then build the adapter against the confirmed API. Candidate families can include Hikvision, Dahua, ZKTeco, dormakaba or local installer APIs, but only after site inspection.
- Accounting/e-invoice: keep export-first in MVP; integrate Logo, Mikro, Parasut or Uyumsoft only after the accountant confirms the target workflow.
- Monitoring: Sentry plus Vercel/Supabase logs for application errors, with Better Stack or UptimeRobot for external uptime checks.

## 2. External Dependency And Cost Register

This section is the active management view for external dependencies, paid tools and 3rd-party services. It is intentionally grouped so Ataberk, WAMOCON, finance and engineering can see what must be bought, what can wait, what is quote-based and what needs a Jira ticket before production credentials are used.

Completeness assessment on 26 June 2026: the dependency categories below are complete enough for delivery planning and Jira tracking, but not complete enough for final purchase. Exact prices, commercial terms, data-processing terms, Turkish tax treatment and production credentials must be confirmed with the selected vendor before contract signature.

| Group | Dependency | Required for | Cost status | Owner and decision gate |
|---|---|---|---|---|
| Core cloud | Supabase Cloud Pro | Production Postgres, Auth, Realtime, Storage, backups and operational database hosting | Paid cloud plan plus metered usage/compute/storage/egress; use the public pricing page as the procurement source | Engineering proposes region/env model; Ataberk approves billing owner, budget cap, backup policy and production project |
| Core hosting | Vercel Pro | Production hosting, preview deployments, team workflow and managed Next.js deployment | Paid team plan plus usage; confirm current public pricing before purchase | Engineering and finance approve account owner, domains, spend alerts and environment separation |
| Delivery tooling | Jira Cloud and Xray Cloud | Phase epics, requirements traceability, UAT/Xray tests and delivery reporting | Paid per-user SaaS/subscription; Xray is a separate app/subscription | WAMOCON delivery owner confirms user count, project admin, attachment policy and live-sync approval |
| Monitoring | Sentry plus Better Stack or UptimeRobot | Error tracking, uptime checks, incident triage and integration health alerts | Sentry has paid usage tiers; uptime tools can start low-cost but need production alert rules | Engineering defines alert recipients, severity levels, retention and incident ownership |
| Transactional email | Postmark or Amazon SES | Login, notices, document links, ticket updates and accounting notifications | Usage/monthly email cost; domain setup required | Engineering and operations approve sender domains, DKIM/SPF/DMARC, bounce handling and templates |
| SMS | Netgsm or Ileti Merkezi | OTP, urgent resident notices and service alerts | Quote or volume-based SMS cost; sender name approval may add process time | Operations approves sender ID, consent language, monthly volume cap and fallback rules |
| Push notifications | Firebase Cloud Messaging; OneSignal optional | PWA push and later native/mobile push | FCM is normally no direct messaging subscription, but surrounding cloud usage and optional OneSignal plans must be checked | Product confirms PWA push UX; operations confirms whether a non-technical campaign console is needed |
| Payments | iyzico, PayTR; Param, Sipay, Paycell as alternates | Card/online collection, deposits, refunds and payment webhooks | Provider fees, commissions, settlement timing and virtual POS terms are quote/contract dependent | Finance and legal approve provider, fee model, refund rules, settlement, chargeback process and production credentials |
| Bank reconciliation | Bank CSV/Excel first; later bank API/open-banking partner | Bank import, matching and accounting reconciliation | CSV/Excel has low platform cost; API/open-banking is bank/provider dependent | Accountant confirms bank list, export format, matching tolerance and later API value |
| Wallet/top-up | Internal ledger first; Papara/Paycell only if approved | Resident prepaid balances or top-up behavior | Internal ledger has no provider fee; stored-value provider creates legal/commercial cost | Legal and finance must approve before enabling any stored-value or resident-wallet provider |
| Documents/storage | Supabase Storage first; S3-compatible storage if volumes grow | Contracts, invoices, resident documents and signed URLs | Supabase usage-based storage first; external storage only if volume/security requires it | Engineering approves retention, access policy, backup/export and file-size limits |
| AI provider | Configurable OpenAI-compatible gateway and optional local/on-prem model | Assistant, summaries, triage, reports and analytics | Usage/token or infrastructure cost; exact model pricing can change frequently | Product, security and finance approve data classes, budget cap, logging, retention and human approval gates |
| Access/security hardware | Confirmed gate, barrier, card, camera, VMS/NVR and visitor vendors | Access cards, barrier events, security evidence and visitor workflows | Vendor/API/licensing and installer support are quote-based | Site inspection is mandatory before any adapter build; legal approves restriction and surveillance boundaries |
| Accounting/e-invoice | Export-first; Logo, Mikro, Parasut, Uyumsoft after accountant choice | Turkish accounting/e-invoice workflows and chart mapping | Export-first has low integration cost; live integration requires subscription/API quote | Accountant approves target system, chart-of-accounts mapping and reconciliation process |
| Domain/email operations | DNS, production domain, mailbox or sender tooling | Production launch, sender verification and support communications | Low direct cost but required for production reliability | Ataberk confirms domain owner, DNS access, support inboxes and renewal responsibility |

Cost-management rules:

1. No paid production account is created without a named Ataberk billing owner and a WAMOCON technical owner.
2. Every paid provider gets a Jira story or subtask with labels `external-dependency`, `third-party-cost` and `vendor-decision`.
3. Sandbox/test credentials must be separate from production credentials.
4. Monthly caps, alert recipients and cancellation/renewal owner must be recorded before live use.
5. Provider credentials, service-role keys, invoices and commercial quotes must not be attached to public tickets or committed to the repository.
6. Data-processing, KVKK, retention and support terms must be reviewed before any provider handles resident, finance, identity, document or access-control data.

Jira grouping:

- The Jira sync groups external dependencies under Phase 13, "External Integrations", with a dedicated cost-register story.
- The Third-Party Integration And Vendor Plan DOCX is included in the managed documentation attachment package.
- Jira should show the cost-register story before individual provider-implementation tasks move to production mode.
- If a provider becomes launch-critical, create a child task for quote, contract/legal review, sandbox proof, production credential request, UAT proof and rollback/manual fallback.

Provider link register for Jira tickets:

| Category | Official links to include in relevant Jira tickets |
|---|---|
| Core cloud and hosting | Supabase Pricing: https://supabase.com/pricing; Supabase Realtime: https://supabase.com/docs/guides/realtime; Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security; Vercel Pricing: https://vercel.com/pricing |
| Delivery tooling | Jira Pricing: https://www.atlassian.com/software/jira/pricing; Xray Cloud Marketplace Pricing: https://marketplace.atlassian.com/apps/1211769/xray-test-management-for-jira?tab=pricing |
| Payments and wallet candidates | iyzico: https://www.iyzico.com/en/; PayTR: https://www.paytr.com/en; Param: https://param.com.tr/; Sipay: https://sipay.com.tr/; Paycell: https://www.paycell.com.tr/; Papara: https://www.papara.com/ |
| Messaging and push | Netgsm: https://www.netgsm.com.tr/; Ileti Merkezi: https://www.iletimerkezi.com/; Postmark Pricing: https://postmarkapp.com/pricing; Amazon SES: https://aws.amazon.com/ses/; Firebase Pricing: https://firebase.google.com/pricing; OneSignal Pricing: https://onesignal.com/pricing |
| Monitoring and uptime | Sentry Pricing: https://sentry.io/pricing/; Better Stack Pricing: https://betterstack.com/pricing; UptimeRobot Pricing: https://uptimerobot.com/pricing/ |
| Access, camera and physical security candidates | Hikvision: https://www.hikvision.com/en/; Dahua Security: https://www.dahuasecurity.com/; ZKTeco: https://www.zkteco.com/en/; dormakaba: https://www.dormakaba.com/ |
| Accounting and e-invoice candidates | Logo Yazilim: https://www.logo.com.tr/; Mikro Yazilim: https://www.mikro.com.tr/; Parasut: https://www.parasut.com/; Uyumsoft: https://www.uyumsoft.com/ |
| AI and security references | OpenAI API Pricing: https://platform.openai.com/docs/pricing; OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/; WCAG 2.2: https://www.w3.org/TR/WCAG22/ |

## 3. Competitive Baseline

Turkish competitors show that a serious site-management product is expected to cover resident portals, dues/aidat, online collection, bank matching, reservation, mobile management, email/SMS and sometimes access/meter/AI features. Apsiyon publicly lists resident and manager products, bank integrations, card collection, reservations, manager mobile, access control, meters, email/SMS and AI assistants. Senyonet lists dues collection, online bank integration, finance, accounting, security and communication modules. Yonetimcell lists dues, online bank integration, credit card/Masterpass collection, resident/security/staff apps and mobile access. Aidatim lists online card collection, bank account matching, reports, meter billing and email/SMS.

Global property-management players set the same bar at larger scale: Buildium presents accounting/payments, maintenance, resident center, leasing, marketplace integrations, open API and AI/automation; DoorLoop presents accounting, bank sync, leasing, maintenance, owner/resident portals, file storage, communication tools, AI and workflows.

Implication for 1Cati: Phase 13 must be treated as a real product phase, not as a technical afterthought. Integrations need provider selection, adapter contracts, test mode, webhooks, failure queues, audit, monitoring and manual fallback.

## 4. Architecture Rules

| Rule | Requirement |
|---|---|
| Adapter isolation | No UI or finance module calls a vendor SDK directly. It calls an internal service/route. |
| Idempotency | Every provider event has a unique `provider_event_id`; duplicates cannot create duplicate ledger entries or access changes. |
| Signed webhooks | Webhook signatures, timestamps and replay windows are verified before processing. |
| Test mode first | Every adapter has sandbox credentials and a visible test connection state before production mode. |
| Manual fallback | Payment, bank, SMS, access and meter failures always have a manual queue and operator path. |
| Auditability | Sensitive actions write user, role, source, before/after status, provider reference and timestamp. |
| Least privilege | Provider keys are stored only as server-side secrets; service-role keys never reach the browser. |
| RLS and RBAC | Integration data is tenant/site scoped and follows the same RBAC model as the rest of the ERP. |
| Retry safety | Retries use backoff, max attempts, dead-letter state and operator-visible error reasons. |
| Observability | Each adapter reports health, last success, last failure, latency, error rate and queue length. |
| Legal boundary | AI or automation may recommend finance/access actions, but human approval is required for refunds, restrictions and physical access changes. |

## 5. Vendor Shortlist

| Area | Primary shortlist | Why it fits | Decision gate |
|---|---|---|---|
| Card/online payments | iyzico, PayTR | Turkey-focused payment providers with business payment solutions, virtual POS/API/developer resources and fraud/3DS-style capabilities. | Compare fees, settlement, refund flow, subscriptions/recurring payments, marketplace need, contract, support response and sandbox quality. |
| Payment alternates | Param, Sipay, Paycell | Useful commercial fallback if pricing, settlement or acquiring terms are better for Ataberk. | Get formal quote and technical docs before implementation. |
| Bank reconciliation | Bank CSV/Excel import first; later bank API/open banking partner if approved | Lowest launch risk and keeps accounting in control while data quality is validated. | Confirm bank list, export format, reconciliation tolerance and accountant sign-off. |
| SMS | Netgsm, Ileti Merkezi | Turkey-local SMS economics and sender-name handling are usually better than global SMS for local notices. | Confirm sender ID, pricing, API reliability, delivery reports and KVKK consent flow. |
| Email | Postmark or Amazon SES | Postmark is simple and reliable for transactional mail; SES is low-cost at scale. | Confirm domain ownership, DKIM/SPF/DMARC, bounce handling and support expectations. |
| Push notifications | Firebase Cloud Messaging; OneSignal optional | FCM is the normal technical base for web/mobile push; OneSignal adds a non-technical dashboard if needed. | Confirm PWA push support across target devices and consent UX. |
| Wallet/top-up | Ledger wallet first; Papara/Paycell only if needed | Avoids regulated e-money custody in the MVP while still supporting prepaid balance/accounting semantics. | Legal approval, resident terms, refund rules and provider settlement model. |
| Access/barrier/security | Site hardware adapter after inventory | Physical systems are installer- and device-specific; wrong early selection creates waste. | Collect hardware model, API docs, network topology and legal approval for restrictions. |
| Camera/visitor evidence | Existing VMS/NVR adapter only after approval | Camera data is sensitive and high-risk under KVKK. | Confirm purpose, retention, access rights, consent/signage and technical API. |
| Meter reading | Manual/Excel import first; device adapter later | Meter vendors vary; MVP can still bill with controlled imports. | Confirm meter type, reading format, anomaly rules and dispute workflow. |
| Accounting/e-invoice | Export-first; Logo, Mikro, Parasut, Uyumsoft later | Prevents accounting lock-in before the client accountant validates workflow. | Accountant approval and chart-of-accounts mapping. |
| AI | Configurable OpenAI-compatible gateway plus local/on-prem option | Keeps model choice flexible and allows privacy-sensitive prompts to be routed differently. | Approve data classes allowed for AI, retention, prompt logging and human approval gates. |
| Monitoring/security | Sentry, Vercel logs, Supabase logs, Better Stack/UptimeRobot | Fast operational visibility without building a custom monitoring suite first. | Confirm alert recipients, SLA, escalation and incident log ownership. |

## 6. Phase And Jira Ticket Map

| Phase | Tickets to track |
|---|---|
| Phase 3 Platform/auth/security | Secret management, environment separation, RLS verification, webhook signature verification, audit-log standard, demo-mode shutdown. |
| Phase 6 Finance ledger | Immutable ledger postings, correction/reversal rules, account statements, export format, reconciliation data model. |
| Phase 7 Payments/deposits/restrictions | Payment provider shortlist, payment-intent API, webhook idempotency, refunds, deposits, manual bank matching, legal restriction policy. |
| Phase 11 Communication/docs | Email/SMS/push templates, delivery status, retry queue, consent/opt-out, document storage permissions, signed URLs. |
| Phase 12 Mobile PWA | PWA push, installability, offline-friendly views, mobile accessibility, resident payment/service/document flows. |
| Phase 13 Integrations | External dependency and cost register, provider registry, adapter interfaces, sandbox test mode, payment adapter, bank adapter, notification adapter, access/security adapter, wallet/top-up decision, monitoring console, integration runbook. |
| Phase 14 AI/analytics | AI provider gateway, source-grounded answers, confidence, evals, no direct money/access execution, approval workflow. |
| Phase 15 QA/launch | Integration UAT, provider failover tests, RLS tests, accessibility, performance, backup/restore, incident response and training. |

## 7. Acceptance Criteria

- Provider can be disabled without breaking the ERP shell.
- Payment webhook duplicates cannot double-book money.
- Failed SMS/email/push attempts are visible and retryable.
- Access-control outage never silently grants or blocks access.
- Wallet/top-up is disabled until legal/commercial approval is recorded.
- Provider credentials are never exposed to client-side code or Jira attachments.
- Integration logs show request ID, provider reference, status, latency, retry count and operator action.
- Every production adapter has sandbox evidence, UAT evidence and a rollback/manual fallback path.

## 8. Non-Goals For MVP

- 1Cati will not operate as an electronic money institution.
- 1Cati will not directly control biometric access or camera surveillance before legal review.
- 1Cati will not automate refunds, debt restrictions or physical access changes without human approval.
- 1Cati will not claim a provider is selected until quotes, contracts and credentials are approved.

## 9. Current Source Baseline

Reviewed sources on 26 June 2026:

- Apsiyon: https://www.apsiyon.com/
- Senyonet: https://www.senyonet.com.tr/
- Yonetimcell: https://www.yonetimcell.com/
- Aidatim: https://www.aidatim.com/
- Buildium features: https://www.buildium.com/features/
- DoorLoop features: https://www.doorloop.com/features
- iyzico: https://www.iyzico.com/en/
- PayTR: https://www.paytr.com/en
- Param: https://param.com.tr/
- Sipay: https://sipay.com.tr/
- Paycell: https://www.paycell.com.tr/
- Papara: https://www.papara.com/
- Netgsm: https://www.netgsm.com.tr/
- Ileti Merkezi: https://www.iletimerkezi.com/
- Supabase Pricing: https://supabase.com/pricing
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel Pricing: https://vercel.com/pricing
- Jira Pricing: https://www.atlassian.com/software/jira/pricing
- Xray Cloud Marketplace Pricing: https://marketplace.atlassian.com/apps/1211769/xray-test-management-for-jira?tab=pricing
- Postmark Pricing: https://postmarkapp.com/pricing
- Amazon SES: https://aws.amazon.com/ses/
- Sentry Pricing: https://sentry.io/pricing/
- Better Stack Pricing: https://betterstack.com/pricing
- UptimeRobot Pricing: https://uptimerobot.com/pricing/
- Firebase Pricing: https://firebase.google.com/pricing
- OneSignal Pricing: https://onesignal.com/pricing
- OpenAI API Pricing: https://platform.openai.com/docs/pricing
- Hikvision: https://www.hikvision.com/en/
- Dahua Security: https://www.dahuasecurity.com/
- ZKTeco: https://www.zkteco.com/en/
- dormakaba: https://www.dormakaba.com/
- Logo Yazilim: https://www.logo.com.tr/
- Mikro Yazilim: https://www.mikro.com.tr/
- Parasut: https://www.parasut.com/
- Uyumsoft: https://www.uyumsoft.com/
- Next.js data updates and Server Functions: https://nextjs.org/docs/app/getting-started/updating-data
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
