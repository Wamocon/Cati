# New Level Premium — Premium Landing Page
## Concept & Scope of Work (Leistungsbeschreibung)

> Prepared by: WAMOCON GmbH · For: Ataberk Estate — New Level Premium Avsallar · Draft: 3 July 2026 (rev. 2)
> Status: CONCEPT for internal review. Not yet built — this document proposes scope, structure, design direction, the owner/tenant registration model, an identity-verification and time-limited access model, and a public/guest issue-reporting channel, before implementation starts.
> Companion: `docs/offers/ki-premium-layer-offer.md` (1Çatı AI Premium Layer). All documents share the same "Live today / Build in this phase / Roadmap" honesty convention.
> Research note: sections 6–8 are grounded in current industry practice for short-term-rental KYC, smart-building time-limited access delegation, and public maintenance-request intake. Sources are listed in §15.

---

## 1. Executive summary

This landing page has three jobs:

1. **Explain what 1Çatı is and why it matters** — not just renders of the building, but the plain-language case for the operating system that runs it: real-time financial transparency, tracked service requests, a verifiable document vault, multilingual access and a direct, audited line to management. The property is the reason someone looks; the system is the reason they stay.
2. **Be the front door into 1Çatı** — where an owner or tenant registers to get real access to their unit's dashboard. Registration is a first-class, clearly labeled path, structured around the six roles already defined in the platform, with a deliberate legitimacy check before any account is activated.
3. **Be the low-friction intake for the whole site** — a public "report an issue" channel so that owners, tenants, guests, visitors and contractors can raise something without an account, feeding the operational picture (and the AI) with far more ground-truth signal than an internal-only form ever could.

The property showcase (masterplan, amenities, investment case) still belongs on the page — it builds the trust that makes someone register — but it now supports the three jobs above instead of being the headline itself.

---

## 2. What already exists (the foundation this builds on)

Reused as-is from the current codebase — this is not a from-scratch build:

- **Project data, media and scrollytelling** — the full parsed New Level Premium dataset (769 units, 52,000 m² land, 900 m to the beach, 5★ hotel infrastructure, 3-year/10% rental guarantee, 22 named amenities, categorized document inventory), the four hero images already integrated, and the working `new-level-immersion.tsx` GSAP scrollytelling sequence.
- **The six-role permission model** — `apps/web/lib/rbac.ts` defines exactly the roles this flow routes into: `admin`, `manager`, `accountant`, `staff`, `owner`, `tenant`, each with a fixed scope (company / site / finance / field / owned_unit / rented_unit).
- **A database-level self-registration safety net already installed** — migration `00000000000007_security_hardening.sql` (written earlier in this engagement) already hardens `handle_new_user()` so any self-service signup can only ever become `tenant` or `owner`; every other role requires an existing admin to assign it. The registration UI just puts a front door on a lock already in place.
- **A queue for pending, human-approved actions** — the `client_action_requests` table (migration `…0003`) already exists as a generic sign-off queue. A pending registration, a tenant-access grant and a triaged public report are all natural fits; no new table concept is required, only new request types.
- **Internal registries to match against** — `residents`, `unit_residents`, `reservations` and `payment_transactions` already hold each unit's sales/occupancy truth, so a registration claim can be checked against real data instead of pure manual document reading.
- **A service-ticket spine** — the tickets API/module (`api/site-management/tickets`, `dashboard/tickets`) and the `integration_outbox` pattern already exist to receive, triage and route work; the public channel feeds into this, it does not replace it.

---

## 3. Page structure

1. **Hero** — project identity, one-line promise, three CTAs: "See what 1Çatı gives you" (→ §4), "Register for access" (→ §5), and a persistent, lightweight "Report an issue" entry (→ §8).
2. **Why 1Çatı — the platform, explained** (§4) — placed early, right after the hero; this is now the primary message.
3. **Register for your access** (§5) — prominent, clearly separated section, not a buried footer form.
4. **Masterplan, site DNA and construction progress** — the existing scrollytelling, extended into a full-page journey, as proof the property is real and progressing.
5. **Amenities & lifestyle grid** — the 22 amenities as icon cards.
6. **Investment case** — rental guarantee terms, ROI framing, multi-currency display.
7. **Trust strip** — the categorized document inventory (location proof, facility map, guaranteed-rental-income document) as verifiable evidence, using the honest "Aktif / Entegrasyon hazır" tagging already used on `compliance-features.tsx`.
8. **Report an issue (public channel)** (§8) — a always-reachable, account-free intake.
9. **Social proof** — placeholder until real testimonials exist; no fabricated quotes.
10. **Footer / legal** — KVKK-aware privacy note, reusing the existing `privacy`/`terms` pages.

---

## 4. "Why 1Çatı" — the platform, explained

Answered directly, in the visitor's own language (tr/en/de/ru), as concrete before/after statements grounded in features that already exist — not aspirational claims:

- **Your balance, any time, no phone call.** The finance module shows your unit's ledger, payment history and debt status — the same data accounting works from, not a summary read to you.
- **Service requests that don't disappear.** Submit a request; see its status, SLA and any photo evidence — instead of a WhatsApp message lost in a thread.
- **Your documents, verifiably.** TAPU, contracts and unit documents in one place with a clear status (verified / pending / expired).
- **Access decisions with a reason.** If a zone is restricted, you see why and what resolves it — not a locked door with no explanation.
- **One system, four languages.** tr / en / de / ru at the same depth — for exactly the mixed local and international ownership base New Level Premium has.
- **A direct, logged line to management.** Communication happens inside the system, with a record.
- **An assistant that answers, with sources.** The built-in AI answers questions about your own unit and cites its basis — hard-scoped so it can never show data outside your permissions.

This should read like a confident pitch a manager could say out loud in under a minute — because it is also the sales script.

---

## 5. Registration & the six roles

The six roles are not equally exposed. Some self-register with verification, one is sponsored by an owner, one requests internal approval, and three are never offered publicly at all. This split mirrors the privilege boundaries already enforced at the database level (§2); getting it wrong would recreate the exact self-escalation risk already closed in the security audit.

| Role | On the public page? | Legitimacy data collected | Activation path |
|---|---|---|---|
| **Malik (Owner)** | Yes — primary | Full legal name; TC Kimlik No **or** passport number + issuing country; email, phone, WhatsApp preference, language; claimed block + unit (picked from the real unit list, not free text); at least one proof — TAPU, sales contract, or reservation/payment reference; power-of-attorney upload if acting for someone else; KVKK consent | Match against `residents`/`reservations`/`payment_transactions` → **fast-track** single-click manager/admin confirmation on match; **full manual review** on no match. **Never instant auto-activation.** See identity model §6. |
| **Kiracı (Tenant)** | Yes — but **owner-sponsored**, secondary | Identity fields per §6, plus the lease window | **Owner-issued, time-boxed grant is the default** (§7): near-instant once a verified owner vouches. Fallback: rental-contract upload → manual review. |
| **Personel (Staff)** | Yes, visually secondary — labeled "team access request" | Full name, ID number, phone; position/team; existing-employee reference or the inviting manager/admin | Always manual admin approval — staff touch tickets, field tasks and resident-adjacent data. |
| **Sorumlu (Manager)** | **No — never public** | n/a | Provisioned only by an existing admin inside `Kullanıcılar & Roller`. |
| **Muhasebe (Accountant)** | **No — never public** | n/a | Internal admin action only. |
| **Yönetim (Admin)** | **No — never public** | n/a | Internal admin action only. Must never be reachable from any public form. |

**Why the three internal roles stay off the public page:** manager, accountant and admin carry site-wide or finance-wide privileges. A public form offering any of them — even behind "request access, subject to approval" — is a larger attack surface than needed and invites the self-elevation attempts the audit already found and closed. These are hires, not self-service sign-ups, so keeping their provisioning entirely internal costs nothing in usability and removes a class of risk outright.

---

## 6. Identity verification & data — grounded in industry practice

The goal is a **high-security, low-overhead** identity check: strong enough that the facility is never put at risk, light enough that it does not become an admin bottleneck, and lawful under KVKK. Industry practice for short-term-rental / hospitality onboarding converges on the model below (§15 sources).

### 6.1 What is collected, by purpose (data minimization)

Under KVKK/GDPR data-minimization, collect only what each purpose needs, and separate "verify once, then discard" data from "retain for the relationship" data:

| Purpose | Data | Handling |
|---|---|---|
| **Prove the person is who they claim** | Government ID (TC Kimlik or passport) — number + a photo/scan; a **live selfie** matched to the ID photo | Verified once. The **ID image is not retained** after a successful match unless a legal reporting duty requires it (see §6.3). Store only the verification **result** + minimal identifiers, not the raw document, by default. |
| **Reach and serve the person** | Name, email, phone, WhatsApp preference, language | Retained for the duration of the access relationship. |
| **Tie the person to a unit** | Claimed block + unit (from the real list), ownership/lease proof, or an owner invite code | Retained as the basis of the grant; the proof document follows the retention rule in §6.3. |
| **Consent & lawfulness** | Explicit KVKK consent, timestamped; purpose notice | Retained as the audit basis for processing. |

**Verification method:** ID-document capture + automated authenticity/tamper check + selfie-to-ID facial match is the current standard and can be automated end-to-end (a provider integration on the roadmap; a manual reviewer path at launch). This keeps admin overhead low without weakening security.

### 6.2 Legitimacy tiers (how hard the check is scales with privilege and risk)

- **Owner** — highest self-service scrutiny: identity + a **unit-ownership proof**, cross-checked against the internal sales registry. An owner holds a permanent, high-trust relationship, so the one-time effort is justified.
- **Tenant** — identity check, but the **unit link is delegated to the owner** (§7), not re-proven against sales records. This is where most of the overhead disappears: the owner already vouched.
- **Staff** — identity + an internal reference; always human-approved.
- **Guest / public reporter (§8)** — no identity account at all; at most a throwaway contact for follow-up. A guest reporting a broken lamp must never face a KYC wall.

### 6.3 Retention — the KVKK / Turkey-specific nuance

Two forces pull in opposite directions, and the design must hold both:

- **Data-minimization says delete.** Best practice is to **delete ID-document images once verification is complete**; retaining copies needlessly increases breach risk and can constitute unlawful over-collection.
- **Accommodation law may require retention.** Turkey's **KBS (Kimlik Bildirim Sistemi)** obliges accommodation providers to report guest identities to law enforcement, and comparable regimes elsewhere mandate multi-month to multi-year retention. Given New Level Premium's **hotel-infrastructure + rental-guarantee** model, short-term letting of these units may fall under such a duty.

**Design stance:** default to **verify-then-discard** (store the result, not the raw ID). Where a specific legal reporting/retention duty applies, store the required minimum **encrypted, with an explicit retention clock tied to that legal basis**, and auto-purge on expiry.

**Built (03.07.2026, "security first"):** owner/tenant registration collects the identity minimum (ID type, ID number, issuing country — no document image is stored). The `submit_public_intake` RPC (migration 0009) stamps a retention deadline (`identityRetentionUntil`, via `kbs_identity_retention_days()`, set to 180 days for the intake in migration 0010) and **queues** a KBS guest report into `integration_outbox`. It only enqueues — actual transmission to authorities is a gated production integration requiring official KBS credentials and legal sign-off; nothing is sent from the app. The full legal analysis is in `docs/offers/kbs-identity-legal-brief.md`; **Turkish counsel must still confirm** applicability and the confirmed-stay retention before real transmission is enabled. Connects to `docs/PROJECT-HANDBOOK.md` §6 data retention.

### 6.4 Automated verification flow (how it works for the applicant)

Designed to be **maximally simple for the applicant and maintenance-free** for the operator:

1. The applicant enters ID type + number, then taps **"Verify my identity"**.
2. A **provider-neutral IDV gateway** (`lib/identity-verification.ts`, mirroring the AI-gateway pattern) runs OCR + document-authenticity + selfie-to-ID face match + liveness in one call and returns a verdict in seconds: **verified** (fast-track) or **review** (a human checks).
3. The verdict + reference travel with the registration; a verified applicant whose unit also matches the sales registry can be auto-approved.

**Maintenance-free by design:** a SaaS IDV provider owns document templates, new ID types, liveness models and compliance updates — 1Çatı owns none of that; swapping providers is an env change (`IDV_API_URL` / `IDV_API_KEY` / `IDV_PROVIDER`), not a code change. In the demo (no provider configured) the result is deterministically **simulated** so the whole flow is visible and testable. On an IDV outage the applicant is never blocked — it falls back to manual review.

---

## 7. Owner-sponsored, time-boxed tenant access — the core model

This is the heart of the revision and matches your framing directly: **the tenant gets limited access for a period the owner chooses, and the owner carries responsibility for the whole rental period, exactly as they carry responsibility for the apartment itself.** Industry systems already do this for smart-building visitor/tenant credentials — owner/manager keeps central oversight, delegates a bounded grant, credentials auto-expire (§15 sources). We apply the same pattern to portal access.

### 7.1 How it works

1. **The owner is verified first** (§6.2) — a permanent, high-trust party.
2. **From their own dashboard, the owner issues a tenant access grant** for their specific unit, choosing:
   - **Start and end date** — the access window, bounded to the lease term.
   - **Scope** — which modules/zones the tenant may use (e.g. service requests + documents + communications), always a **subset of the owner's own scope**, never more.
   - **Permission depth** — e.g. may the tenant open *paid* service orders, or only report issues?
3. **The tenant receives an invite** (one-time code/link tied to that unit) and completes the **lightweight identity step** (§6.1) — enough for security and any KBS duty, no ownership re-proof.
4. **Access auto-expires** at the owner's end date — **no manual admin cleanup**. The owner can extend, shorten or revoke at any time from their dashboard.
5. **Accountability of record:** the audit trail ties every tenant action back to the **sponsoring owner**. The owner is the responsible party for the grant, mirroring real-world lease liability.
6. **Management override always wins:** admins can suspend any grant; security-critical rules (e.g. debt-based access holds, §-level compliance) still enforce regardless of what the owner granted. The owner delegates *within* the house rules, never around them.

### 7.2 Why this is the right model

- **Minimises admin overhead** — the owner self-serves the grant, identity is data-minimized, and auto-expiry means no one has to remember to switch off a departed tenant. This is the single biggest lever against administrative load as the portfolio grows to 769 units.
- **Never weakens facility security** — identity is still verified, scope can never exceed the owner's, every action is attributable, and central management + compliance rules override the grant at all times. A time-boxed credential that expires on its own is *more* secure than a permanent account nobody remembers to revoke.
- **Matches the real-world mental model exactly** — an owner is already responsible for their unit; here they are responsible for who they let into its digital twin, for exactly as long as the lease runs.

### 7.2a Dashboard visibility (built 03.07.2026)

The time-boxed grants are now **visible and manageable in the dashboard** (`components/tenant-access-panel.tsx`, on the Users module). It is built to **automate the manual work**:

- **Auto-status, no manual field** — each grant's state (active / expiring-soon / expired) and days-remaining are computed live from its window; nobody maintains a status column.
- **Auto-expiry** — a grant lapses on its own at the owner's end date; there is no "remember to switch this off" step. A time-boxed credential that expires itself is more secure than a permanent account no one revokes.
- **Proactive signal** — an "expiring soon" count surfaces what needs attention before access lapses.
- **One-click actions** — generate a time-boxed invite (tenant + unit + duration), extend, or revoke, each in a single action.

In the demo this runs on seed grants with live client-side state; in production it persists via the grants layer behind authenticated, RBAC-gated writes (owner scoped to their unit; manager/admin oversight).

### 7.3 The chain-of-trust invite (recommended default)

Rather than a human reading every lease, a verified owner's dashboard gets a **"Kiracımı davet et" (invite my tenant)** action that generates the time-boxed grant above. The tenant activates with the code + identity step, not a document queue. Because the code can only exist if an already-verified owner issued it for their own unit, it is self-service **without** loosening security, it scales without adding admin work, and it is fully auditable and admin-revocable. I recommend making this the **default** tenant path, with contract-upload + manual review kept only as a fallback for owners who won't or can't issue a code.

---

## 8. Public / guest issue reporting — my recommendation on your question

**Your question:** offer ticket creation not only inside the closed system, but on the landing page, so anyone outside — including guests — can open a ticket on any topic, giving the AI more data about all activity on the grounds.

**My recommendation: yes — but as a distinct, clearly-scoped "public issue report" channel, not as the same object as an authenticated service ticket.** The upside you see is real and supported by the research; the risks are also real and must be contained by *how* it is built, not by refusing it.

### 8.1 Why it's a genuinely good idea

- **Lower friction means more gets reported.** The clearest finding in the maintenance-intake research: **barriers reduce reporting rates, and unreported issues escalate into larger, costlier failures.** An account-free form (and QR codes in common areas, lobby, pool, parking) captures problems that would otherwise never reach management.
- **Everyone on the grounds becomes a sensor.** Guests, delivery drivers, contractors, prospective buyers and passers-by can flag a broken light, a spill, a security concern — not just registered residents.
- **Richer, broader data for the AI.** A wider intake gives the AI a fuller picture of site activity: hotspots, recurring issues, seasonal patterns, response-time trends. This is exactly the kind of grounded signal that makes the AI Premium Layer's briefings and trend detection stronger.
- **A premium trust signal in itself.** "Even a passer-by can report a problem here and it's tracked to resolution" is a stronger operational story than any brochure claim.

### 8.2 The risks — and how the design contains each

| Risk | Containment |
|---|---|
| **Spam / abuse** (unauthenticated write endpoint) | Rate-limiting per IP/device, a bot check (e.g. a privacy-friendly turnstile), optional email/phone OTP for the reporter, and a **triage queue** — public reports never land directly on staff worklists. |
| **KVKK / privacy** (guest PII) | Minimal fields (what, where, optional photo, optional contact-for-follow-up only), an explicit consent/purpose notice, and a short retention clock for reporter contact data. |
| **Security surface** (public endpoint) | Strictly **write-only into a triage lane**; the endpoint returns only a reference number and never exposes any internal unit/owner/resident/finance data back to the reporter. |
| **Signal vs. noise** (unverified reports polluting decisions) | Every public report is tagged `source: public` and `unverified`. The AI ingests them as **weak signals** for site-activity/trend purposes only, explicitly **never** as a basis for anything touching finance, access or permissions. |
| **Triage load** (drowning the SLA board) | A separate **"public inbox"** lane with auto-categorization and duplicate-merge; a human (or an auto-classifier) promotes a report to a real work order, merges it into an existing ticket, or dismisses it. |

### 8.3 The clean separation that makes it safe

- **Public report** = an observation about **common areas / general site**, from anyone, no account. Minimal fields + consent. Lands `unverified` in the public triage queue. This is the new §8 channel.
- **Authenticated service ticket** = a request tied to a **specific unit**, involving private data, SLA, billing and role permissions. Stays inside the portal exactly as today.

A public report can be **promoted** into a real ticket by staff after triage — the two connect, but the trust boundary between "anyone said this" and "a verified resident requested this" is never blurred. This fits the existing architecture: the triage/queue and `integration_outbox` patterns already exist, and tickets already have a status trail to promote into.

**Net:** you get the full upside — more reports, guests as sensors, richer AI data, a premium story — while the spam, privacy, security-surface and data-quality risks are each handled by construction rather than left open.

---

## 9. Live today vs. build in this phase vs. roadmap

| Live today (reuse as-is) | Build in this phase | Roadmap (decision-gated) |
|---|---|---|
| Full dataset, media, scrollytelling, component library | Full page incl. §4 "Why", §5 registration UI, §8 public report channel | Automated ID/KYC verification (OCR, liveness, selfie-match provider) |
| Six-role RBAC already defined & matched to registration paths | Owner / Tenant / Staff registration forms with §6 data fields | SMS/WhatsApp OTP phone verification at registration |
| DB trigger already blocking self-elevation beyond owner/tenant (migration 7) | Owner-sponsored, time-boxed tenant grant + auto-expiry (§7) | Automated KBS reporting integration (if legally required) |
| `client_action_requests` queue + tickets spine + `integration_outbox` | Admin review queue UI; public triage inbox with tagging | Physical access-control (door/QR) tied to the time-boxed grant |
| 4-language i18n scaffold | Fast-track matching vs. `residents`/`reservations` | AI auto-triage/dedup of public reports |

Nothing is presented as live before it is built and verified — same boundary as the AI Premium Layer offer.

---

## 10. Why this is premium (competitive positioning)

| Typical developer brochure site | New Level Premium landing page |
|---|---|
| Sells the building, hands off to a disconnected portal (if any) | Sells the building **and** the system you'll live with, in one visual language |
| Registration = "leave your email" | Registration = a verified path into your own unit's real dashboard, gated by a real legitimacy check |
| One-size contact form | Six-role-aware intake that treats owner, tenant, staff, and anonymous reporter differently, on purpose |
| Tenants get a permanent login nobody revokes | Owner-sponsored, time-boxed access that expires itself — more secure, less admin |
| No visible security thinking | Explicitly explains why privileged roles are never self-service, and how a public channel stays safe — trust signals, not limitations |
| Issues reach management only if a resident bothers to call | Anyone on the grounds can report in under a minute; every report is tracked and feeds the AI's site picture |

---

## 11. Placement decision — still open

Unchanged: **Option A** — a route inside the existing 1Çatı app (fastest, inherits every design-system update, one brand/domain) vs. **Option B** — a dedicated subdomain with its own brand presence, still visibly "born from" the same system. Affects where the flow's server calls physically live, not the models in §5–§8.

---

## 12. Delivery approach

1. **Discovery & content lock** — amenity/media set; legal wording for the rental guarantee; sign-off on the §6 identity fields (acceptable ID types, KVKK retention, KBS applicability); the §7 default tenant path; the §8 public-channel scope.
2. **"Why 1Çatı" build-out** — the four-language benefit copy (§4).
3. **Registration UI** — Owner, Tenant, Staff forms, each routed to the correct legitimacy path (§5–§6).
4. **Owner-sponsored tenant grant** — the "invite my tenant" action, time-box picker, auto-expiry, revoke/extend, sponsor audit link (§7).
5. **Admin review queue + public triage inbox** — lightweight UIs over `client_action_requests` and the tickets/triage spine (§5, §8).
6. **Public report channel** — account-free form + on-site QR, anti-spam, `unverified` tagging, promote-to-ticket (§8).
7. **Property showcase sections** — masterplan, amenities, trust strip, showroom.
8. **QA & launch** — desktop + mobile, all four languages, the usual gates (typecheck, lint, build, Playwright E2E), **plus a specific adversarial pass**: attempt to submit a Manager/Admin/Accountant request through the public form and confirm it is impossible (not just hidden); attempt to flood the public channel and confirm rate-limiting/triage hold; confirm an expired tenant grant actually revokes access.

---

## 13. Commercial framing *(placeholders — to be set with WAMOCON)*

- **Model:** fixed-scope for the full page incl. registration/approval and public channel, or phased (property showcase first; registration, tenant-grant and public channel second).
- **Investment:** €[__] setup · optional €[__]/month content/media refresh — *to be finalized.*
- **Guarantee stance:** we commit to the quality gates and to the §5–§8 models exactly as specified — no role reaches activation without its stated check, the three internal roles are never publicly reachable, tenant grants are time-boxed and owner-attributable, and the public channel is write-only and rate-limited.

---

## 14. Decisions taken (03.07.2026) and what remains

**Decided and now built (demo-safe, login-free):**
- **Placement** — Option A: the page lives at `/[locale]/new-level-premium` inside the 1Çatı app.
- **Tenant default path** — the owner-issued, time-boxed invite code is the **default** tenant path (marked "recommended" in the form); contract-upload remains the fallback. (§7.3)
- **Identity & KBS** — "security first": owner/tenant registration now requires an identity document (TC Kimlik **or** foreign passport + issuing country, for the international base). A KBS guest report is **queued** via `integration_outbox` and identity data is stamped with a retention deadline. (§6, §7, migration 0009)
- **Public report channel** — built as a distinct, account-free channel with server-side validation, `unverified/public` tagging and a triage queue; **on-site QR posters** are included (`/[locale]/new-level-premium/report-poster`). (§8)
- **Triage ownership** — the public triage queue and registration-approval queue are owned by **manager (Sorumlu) day-to-day, with admin (Yönetim) oversight** — matching the existing RBAC (managers already run tickets/SLA; admins run user management). Change the owning role/inbox here if a dedicated operations desk should hold it instead.

**Added 03.07.2026 — direct contact & public AI concierge (client request):**
- **WhatsApp line to site management** — a floating WhatsApp button on the home and New Level Premium pages opens a prefilled chat (per visitor language) to the management number set via `NEXT_PUBLIC_WHATSAPP_NUMBER`. The committed placeholder number is deliberately invalid; the real line is configured per environment, so the demo never messages anyone.
- **Public AI concierge** — a landing-page assistant (`components/site-concierge.tsx` + `/api/ai/public-chat`) that knows the full 1Çatı product story (what/why/advantages, registration, tenant invites, reporting, security) in all four languages. It is **data-blind by construction**: the endpoint never loads a user profile or repository data, so it cannot reveal internal records no matter what is asked; private-data questions get a polite refusal that points to registration or WhatsApp. Works fully offline via a curated knowledge base; an optional local AI gateway (same env config as the internal assistant) upgrades answers with a hard-guarded system prompt.
- **Interest analytics (learning loop)** — every concierge question is classified by topic and logged through the public-intake channel (`public.ai_question`, migration 0011) into `client_action_requests`, so the internal 1Çatı side sees what prospects actually ask about. Analytics only: topic + clamped question text, no identity fields.

**Still requires client / legal / vendor sign-off (not code-solvable):**
- **KBS legal confirmation** — a research brief is now written (`docs/offers/kbs-identity-legal-brief.md`): KBS applies to commercial short-term/holiday lettings (Law 1774, instant reporting), while long-term residential leases fall under address registration instead. Intake retention is set to 180 days (`kbs_identity_retention_days()`). **Turkish counsel must still confirm** the commercial-vs-residential split per unit, the confirmed-stay retention figure, the registered KBS operator, and the Law 7464 permit/HOA-consent status — then the real KBS transmission is enabled. Until then the report is only queued, never sent.
- **Automated ID/KYC verification** — a provider-neutral scaffold is now built (`lib/identity-verification.ts` + `/api/site-management/identity-verification`, simulated in demo); a real IDV provider (OCR + liveness + selfie-to-ID) plugs in via env config. See the flow design in this section's companion notes.
- **Staff registration at launch** — include the "team access request" path now, or defer as lower-traffic?
- **Reservation vs. report** — is a manual (call-back) reservation flow acceptable at launch, or must an online deposit/payment path exist from day one (depends on the still-open payment-provider decision)?

---

## 15. Sources / references (research grounding for §6–§8)

Short-term-rental KYC & guest verification:
- TrueKYC — Short-term rentals KYC procedures: https://truekyc.io/posts/short-term-rentals-kyc-procedures/
- Authenticate — Short-term rental guest screening: https://authenticate.com/resources/blog/short-term-rental-guest-screening/
- Autohost — Why ID verification is not enough: https://www.autohost.ai/blog/why-id-verification-is-not-enough-to-protect-your-hospitality-business/
- ChargeAutomation — Guest screening with ID verification: https://chargeautomation.com/guest-screening-id-verification/

Time-limited / delegated access in multi-tenant buildings:
- Semieta — Multi-tenant properties access (delegate by tenant, zone, time): https://www.semieta.com/multi-tenant-properties/
- Envoy — Multi-tenant visitor management: https://envoy.com/products/multi-tenant-visitor-management-system
- Acre Security — Visitor management for real estate portfolios (auto activation/expiration): https://www.acresecurity.com/blog/visitor-management-solutions-real-estate

Public / account-free maintenance-request intake:
- Oxmaint — Tenant maintenance request portal best practices: https://oxmaint.com/industries/property-management/tenant-maintenance-request-portal-best-practices
- Oxmaint — QR code maintenance request workflow: https://oxmaint.com/article/qr-code-maintenance-request-workflow
- QR Code Generator — QR codes for rental management: https://www.qr-code-generator.com/blog/qr-codes-for-rental-management/

Data minimization & ID-document retention (GDPR/KVKK-aligned):
- didit.me — Data retention in identity verification (GDPR): https://didit.me/blog/data-retention-identity-verification/
- didit.me — Data minimization in identity verification: https://didit.me/blog/data-minimization-identity-verification-gdpr-ca/
- IAPP — Verifying identity of data subjects under GDPR: https://iapp.org/news/a/how-to-verify-identity-of-data-subjects-for-dsars-under-the-gdpr

---

*This concept keeps the first draft's principle — reuse what already works — and extends it to security and law: the registration, identity, time-limited-access and public-report models don't invent new trust rules, they put well-designed doors on the role boundaries, the database safety net and the queue/triage patterns that already exist, grounded in how the short-term-rental and smart-building industries already solve the same problems.*
