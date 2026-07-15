# 1Çatı (Cati) — Demo Readiness, Implementation and Management Audit

**Local implementation, QA evidence, costs, external integrations, risks and management decisions**

**Status date:** 15 July 2026  
**Classification:** STRICTLY CONFIDENTIAL  
**Prepared for:** Ataberk Estate and WAMOCON senior management  
**Scope:** The complete shared local worktree, the coordinated July hardening programme, the manager's 24 use cases, and the detailed Booking / Resident Journey / Move Handover / Calendar / Offline ownership slice  
**Evidence cut-off:** The last verified local source and runtime evidence available at document generation. A long, stateful integrated matrix was still under investigation at the cut-off and is not presented as green.

---

## Document purpose

This report gives senior management one defensible account of what changed in 1Çatı, why it changed, what has actually been verified, what remains simulated or provider-ready, and which decisions and external costs are still required. It is deliberately more conservative than a sales presentation. Its purpose is to support a controlled client demonstration and a funded production plan without confusing source completeness, synthetic demo evidence, clean-database security proof, provider activation, deployment, and operational readiness.

This document consolidates the complete coordination history and the current local codebase. It supersedes informal window status messages as a management explanation, but it does not replace the canonical product requirements, security specifications, migration scripts, or test artefacts.

## Executive decision brief

### Overall conclusion

1Çatı is materially more coherent, safer, and easier to demonstrate than at the beginning of the July hardening cycle. The booking and resident journey now has a credible end-to-end story from resident selection and amenity hold through manager approval, calendar handover, access preparation, move-in/out checklist, iCalendar export, and offline field work. Ticketing, emergency handling, service proof, public QR reporting, registration safeguards, role-aware dashboards, and provider-truth messaging were also substantially hardened across the shared worktree.

The correct management conclusion is nevertheless **conditional local demo readiness, not production readiness**.

| Release surface | Decision | Why |
|---|---|---|
| Controlled local/QA demonstration | **CONDITIONAL GO** | Focused business journeys are green in an isolated QA environment, including 70/70 Window-3 desktop/mobile checks, 24/24 service-proof checks, and 10/10 emergency/SLA checks. The operator must use the approved isolated demo procedure and avoid presenting external providers as live. |
| Current public Vercel URL | **NO-GO at evidence cut-off** | The public deployment was independently observed still exposing the QA access-profile endpoint and role-selection panel even after the local fail-closed fix existed. A safe redeployment and production-mode verification were not evidenced in this report. |
| Production launch | **NO-GO** | Clean-database migration application, live RLS/privilege assertions, real Supabase authentication and persistence, live provider integrations, operational monitoring, backup/restore, performance, full accessibility, security review, and customer UAT remain incomplete. |

### What management can confidently demonstrate locally

- A Turkish-first, four-locale product shell with role-specific navigation and dashboard experiences.
- Resident amenity booking, conflict-aware holding, approval, commitment, reload/refetch behaviour in the synthetic authority layer, and transition into the move handover workspace.
- Manager, staff, owner, tenant and accountant separation for the Window-3 journey, including an explicit accountant denial with zero handover/offline API traffic.
- Move-in/out scheduling, deterministic checklists, access preparation, access revocation, deposit settlement state, terminal history and audit-oriented workflow controls.
- Private calendar behaviour, iCalendar export/import-ready contracts, and honest provider labels for Google Calendar, Outlook and Cal.com.
- Role-bounded offline queue behaviour and local device persistence, with destructive/privileged operations excluded.
- Ticket intake, urgent triage, service order evidence, idempotent service proof, redaction and user-visible operational states.
- Public QR issue reporting and tracking without requiring a resident account.
- Fail-closed behaviour for unavailable identity, document, email, SMS, payment, access-control and AI providers.

### What management must not claim

- That the current public Vercel deployment is safe for a client demo until the production access-profile checks pass after redeployment.
- That 1Çatı is connected to live payments, banks, SMS, email, identity verification, physical access hardware, cameras, calendar OAuth, document storage or a production AI provider.
- That a mocked reload proves PostgreSQL persistence. The focused browser evidence proves UI refetch and state restoration against the isolated authority used by the test; it does not prove a clean Supabase database survives a real restart.
- That migrations 20–36 have been applied and verified in production order merely because their SQL and static contracts exist.
- That the 24 use cases are all production-complete. Several are demo-complete, several are source-complete but environment-gated, and several remain provider- or operations-dependent.
- That a long monolithic browser run is deterministic. The integrated run revealed state leakage and stale legacy assertions; focused fresh-process evidence is stronger for the affected flows until the release harness is partitioned and reset correctly.

### Immediate management actions

1. Approve a short deployment-security gate: deploy the local fail-closed access-profile changes, then verify the public endpoint and login page in production mode before any client uses the Vercel URL.
2. Fund and schedule a clean Supabase verification environment for migrations 20–36, live RLS/privilege tests, real authentication, persistence-after-restart, backup/restore and audit-log checks.
3. Choose the first-wave providers and budget owners for email, SMS, document storage, monitoring and—only if legally approved—payments and physical access.
4. Nominate an Ataberk business owner for acceptance criteria and a WAMOCON technical owner for each external dependency.
5. Run the demo from the controlled local/QA playbook until the public deployment gate is green.

## How to read the evidence

The project previously mixed words such as “implemented,” “working,” “connected,” and “ready.” This report uses a stricter evidence taxonomy.

| Evidence class | What it proves | What it does not prove |
|---|---|---|
| Source/contract evidence | Required routes, repositories, policies, types, translations and assertions exist and are internally consistent. | A server started, a browser completed the flow, a database accepted the migration, or an external provider responded. |
| Static security evidence | SQL text and application contracts do not contain known forbidden grants, policies or unsafe fallbacks. | PostgreSQL privilege state after ordered migration application. |
| Focused synthetic browser evidence | The isolated QA product and mocked/ephemeral authority behave correctly across defined roles and viewports. | Real Supabase persistence, real provider traffic, production deployment or resilience under long-lived shared state. |
| Clean-database runtime evidence | Ordered migrations, grants, RLS, direct-DML denial and command functions work on a fresh database. | Production scale, provider operations or customer acceptance. |
| Production deployment evidence | The exact deployed build and environment pass production-mode probes. | Business UAT, operational support or every external integration. |
| Provider-live evidence | A contracted sandbox/production provider accepts real end-to-end requests with observability and reconciliation. | Legal approval, commercial suitability or disaster recovery unless separately tested. |

Throughout this report, “verified” always names the evidence class. “Unproved” does not necessarily mean broken; it means the required evidence has not yet been produced.

## Starting position before the coordinated hardening

### Product and architecture baseline

1Çatı already had a strong Next.js 16 / React 19 / TypeScript foundation, a Turkish-first multilingual interface, Supabase-oriented repositories and migrations, role-aware navigation, and a broad property-management concept. The application covered public marketing, login, dashboards, units, tickets, reservations, compliance, finance, documents, communications, reporting, PWA/offline concepts, and a growing set of AI/provider placeholders.

The central weakness was not lack of screens. It was that the meaning and authority behind those screens varied:

- Some paths used real Supabase-oriented repositories and RLS assumptions.
- Some used seeded or process-memory data suitable only for a demonstration.
- Some showed a UI while the provider contract remained a placeholder.
- Some had optimistic transitions that were not reread from an authoritative store.
- Some tests asserted old product copy or a previous role model.
- Some security controls were present in application code but not yet proven on a clean database.

### Initial quality state

At the initial audit, TypeScript, ESLint and a production build could pass while a focused eight-case business flow still produced only four passes and four failures. The failures exposed real business-state defects:

- a manager approval request disappeared across a route boundary and returned 404;
- a premature tenant assignment returned 404 instead of the intended conflict response;
- an owner decision did not consistently appear in the manager view;
- a reservation approval action remained stale after the state transition.

This was a decisive finding: technical compilation did not equal business readiness.

### Initial security and release risks

- A migration numbering conflict existed around migration 15, while cloud-schema documentation lagged the locally planned migrations.
- The public production URL later proved capable of exposing the local/QA role catalogue and access-profile endpoint.
- Reservations were at risk of table-wide authenticated SELECT even though row-level security limited rows; RLS does not hide sensitive columns.
- Legacy write policies could be recreated even when table grants made them temporarily inert.
- No complete clean-database proof existed for ordered migrations, RLS, direct DML denial, stale-version rejection and cross-company isolation.
- Provider availability and demo behaviour were not always described consistently in the interface.

### Initial product and UX risks

- Multiple features were broad but did not yet form one predictable resident or staff journey.
- Some role expectations were too permissive, especially around finance, calendar/offline and privileged actions.
- Several reload claims depended on in-memory or mocked state.
- Four-locale copy contained older “live,” “full access,” “traceable,” identity-provider and retention statements that could overpromise.
- Keyboard focus management, route normalization, strict alert selectors, anchor navigation and long-run test isolation were incomplete.

## Coordinated remediation programme

The work was divided into parallel ownership lanes but shared one codebase. The coordination model intentionally serialized build/server/browser ownership to reduce collisions.

| Ownership lane | Primary responsibility | Important outcome |
|---|---|---|
| Window 1 | Auth/security, owner finance, tickets, emergency handling, service proof and shared release controls | Production access profiles made fail-closed locally; emergency and service-proof journeys hardened; shared type/lint/build gates recovered. |
| Window 2 | Public journeys, engagement, unit matrix, registration/public reporting, copy and accessibility | 769-unit matrix and public/registration journeys broadened; copy truth and localization were tightened; integrated accessibility issues were surfaced. |
| Window 3 | Booking, resident journey, move-in/out handover, ICS/calendar, offline/PWA and its migrations 32–35 | UC18 became a coherent role/state/reload journey with 70/70 focused desktop/mobile evidence and significantly stronger reservation/handover security contracts. |
| Root/coordinator | Use-case mapping, serialized runtime, integrated QA, cross-window conflict management and production-truth classification | Prevented partial or stale evidence from being promoted; discovered production exposure, harness false-green risks, locale route-guard defect and long-run state leakage. |

### Working principles that improved the outcome

- Business behaviour was tested in addition to type, lint and build.
- Role authority was derived from canonical RBAC rather than widening permissions to satisfy stale tests.
- Generated server/cache corruption and runner failures were discarded as evidence instead of counted as product failures or passes.
- External integrations remained fail-closed or provider-ready rather than pretending to be live.
- Static migration checks were kept separate from the mandatory clean-database release gate.
- Focused fresh-process tests were preserved when the monolithic test process leaked mutable state.

## Current platform status by the manager's 24 use cases

The following matrix is the management-level truth map. “Demo-ready” means usable in the controlled isolated demo only. “Environment-gated” means the code path exists but production proof requires real infrastructure or providers.

| Use case | Business capability | Current status | Verified evidence | Remaining gate |
|---|---|---|---|---|
| UC01 | Roles, login and access profiles | **Local conditional / public NO-GO** | Six synthetic profiles and post-auth role checks; local fail-closed production policy. | Redeploy and prove the public endpoint/login contain no QA role catalogue; real six-role Supabase authentication and revocation. |
| UC02 | Exact 769-unit / 7-block matrix | **Controlled-demo ready** | Focused Window-2 matrix evidence, including its 134/134 bundle as reported by that lane. | Validate against the real customer inventory, uniqueness rules, imports and performance. |
| UC03 | Real-time role dashboards | **Source/synthetic ready** | Role-focused views, mocked Realtime and fallback paths. | Real Supabase Realtime private-channel authorization, reconnect and load proof. |
| UC04 | Buyer and access compliance | **Source/synthetic ready** | Buyer pipeline and compliance contracts, duplicate/CAS/scope tests. | Real identity/document providers, customer evidence model and clean DB. |
| UC05 | Owner finance | **Conditional** | Local source and focused role/finance work; currency and visibility boundaries hardened. | Independent clean DB, statement reconciliation, real accounting/bank feeds and final integrated rerun. |
| UC06 | Service order | **Focused-demo ready** | 24/24 service-proof desktop/mobile plus security, redaction and fallback cases. | Live object storage, contractor workflow, real notification and retention operations. |
| UC07 | Emergency message and SLA | **Focused-demo ready** | 6/6 persistence-emergency journeys plus 4/4 triage/order/task/SLA cases. | Live alert delivery, escalation operations, monitoring and on-call acceptance. |
| UC08 | Registration and KVKK | **Environment-gated** | Source/browser contracts for protected intake, invitation activation, localization and fail-closed identity protection. | Real Supabase Auth, identity pepper/IDV, email/SMS invitation delivery, retention approval and UAT. |
| UC09 | Video library and training | **Local asset set present** | Nineteen local training/demo videos and a renumbered migration concept. | Decide repository/LFS/CDN treatment, approve content, deploy streaming/storage and remove migration-number ambiguity. |
| UC10 | Public QR poster/report | **Focused-demo ready** | Account-free report submission/tracking, placement-token privacy, manager triage and multilingual flows. | Print/placement rollout, abuse controls, production storage, alert delivery and operations ownership. |
| UC11 | Public AI/KVKK concierge | **Guardrailed demo only** | Privacy/KVKK focused repair and broader passing cases; safe fallback. | Replace fragile keyword behaviour with an approved provider/evaluation set or explicitly market it as scripted help; production moderation and cost controls. |
| UC12 | Internal dashboard AI | **Guardrailed demo only** | Role-aware UI and accessibility/security work. | Real provider, retrieval boundaries, logging/redaction, evals, token budgets and human approval. |
| UC13 | Personnel and role governance | **Source/synthetic ready** | Governance panels and role contracts; no permission widening for stale tests. | Real Auth user lifecycle, separation of duties, grant/revoke audit and clean DB. |
| UC14 | Four-language experience | **Broad but not fully accepted** | Turkish, English, German and Russian routes/copy tests; many truth corrections. | Finish integrated accessibility/copy reruns, professional language review and legacy-suite cleanup. |
| UC15 | Documents and evidence | **Provider-ready** | API/storage abstraction and fail-closed states. | Select/configure private bucket or S3, malware scanning, retention, signed download, backup and audit. |
| UC16 | Reports and artefacts | **Source/synthetic ready** | Reporting workspace, artefact/download contracts and role projections. | Production generation/storage, immutable retention, data reconciliation and customer report sign-off. |
| UC17 | Settings and integrations | **Truthful status panel** | Provider status represented as configured, provider-ready, unavailable or blocked. | Contracts, keys, environments, monitoring, cost caps and provider-by-provider acceptance. |
| UC18 | Booking and move-in/out | **Focused-demo ready; production unproved** | 70/70 desktop/mobile Window-3 bundle; 10/10 static security; 8/8 business contracts. | Apply migrations 32–35 on a clean DB; live RLS/privileges/direct-DML; real restart persistence; concurrency and provider integration. |
| UC19 | Manual payment | **Synthetic/source ready** | Role and contract work for controlled manual posting. | Accounting policy, maker/checker approval, real ledger, bank reconciliation and payment-provider decision. |
| UC20 | Service proof and personal evidence | **Service proof ready; identity media external** | 24/24 focused proof journey with idempotency, privacy and mobile. | Live private storage and retention. Personal-ID/selfie upload remains intentionally unavailable pending IDV/legal approval. |
| UC21 | Account activation | **Environment-gated** | Secure fragment/session/idempotency source and focused registration tests. | Real invitation delivery, Supabase Auth redemption, expiry/revoke/replay on a clean environment. |
| UC22 | Unit assignment / tenant access | **Source/security ready** | Tenant-access contracts, scope rules and fail-closed synthetic behaviour. | Real clean-DB grant/revoke, cross-company tests, invite redemption and reload/restart persistence. |
| UC23 | Communications | **Provider-ready** | Communications centre, repository/API contracts and honest provider states. | Email/SMS/push provider selection, sender/domain approval, delivery receipts, consent and opt-out operations. |
| UC24 | Buyer pipeline | **Source/synthetic ready** | Duplicate, scope, localization, transition and authorization contracts. | Real CRM/Supabase data, documents/IDV, broker workflow and customer-defined conversion reporting. |

## Deep-dive: UC18 booking, resident journey and move handover

### Business objective

UC18 must let an eligible resident request a shared amenity or move slot, let authorized operations staff manage that request, carry the committed reservation into a move-in/out handover, prepare only supported access credentials, complete a deterministic checklist, revoke access when the lifecycle requires it, and preserve an audit-oriented terminal history. The experience must remain understandable on mobile and must work honestly when calendar or network providers are not connected.

### Initial UC18 condition

The starting implementation contained useful booking and calendar pieces, but the end-to-end authority was incomplete:

- eligibility and resident identity were not consistently derived from the same relationship rules;
- optimistic hold and approval transitions did not always reread authoritative state;
- move-handover candidates did not always include the resident identity required by migration 33;
- checklist sequencing and reopening rules allowed risky ready-state paths;
- access prepared for a previously ready handover could remain stale after revocation, completion or schedule changes;
- accountant expectations in the browser contract conflicted with canonical RBAC;
- the Turkish calendar page could display an English repository fallback warning;
- direct reservation reads risked exposing internal metadata at column level;
- legacy write policies were technically inert only because grants were absent, which was not accepted as a release-safe design;
- migration 33 and 35 runtime behaviour and real reload persistence had no live database proof.

### Resident booking flow now implemented

1. The booking workspace presents resident-eligible resources and candidate relationships.
2. The request carries a resident identifier compatible with the migration-33 handover candidate model.
3. A hold is created through a command-oriented contract with idempotency/fingerprint semantics.
4. The user-facing state is reread after the mutation; a committed hold can be restored after a browser reload in the isolated test authority.
5. Manager/current-owner rules govern future move-in scheduling, while tenant entitlement is constrained to the active relationship rules introduced around migration 22.
6. Only authorized managers/operators can approve, reject or commit a reservation. Staff cannot self-approve their own privileged access path.
7. Conflict, stale-version, cross-unit and cross-company behaviour is represented as a denial/conflict rather than silently overwriting state.
8. A committed reservation becomes a candidate for the move-handover lifecycle.

### Move-in/out handover flow now implemented

1. An authorized operator selects a committed reservation and creates a move-in or move-out appointment.
2. Supported access types are constrained to mobile code, card, plate or QR; arbitrary strings are rejected by the TypeScript and route contract.
3. Deterministic checklist keys, defaults and sequence prevent ambiguous free-form lifecycle completion.
4. Reopening a checklist item from a ready appointment regresses the appointment from ready instead of preserving a false ready state.
5. Access-preparation state is invalidated when an appointment is revoked, completed or materially rescheduled.
6. Latest credential truth is used; stale “ready” credentials cannot survive lifecycle reversal.
7. Move-out completion requires the relevant current access revocations.
8. Terminal access and turnover history are preserved for audit and operational review.
9. Deposit-settlement state is separated from resident-safe reservation reads and from staff self-approval.
10. Manager, staff and owner controls are capability-driven; accountant and unauthorized roles are redirected without making handover/offline API calls.

### Calendar and ICS behaviour

- The Turkish calendar page uses localized product language and no longer shows the raw English repository fallback warning.
- Private/resident data is not placed in public calendar descriptions.
- ICS generation follows a separate calendar contract rather than exposing repository internals.
- Google Calendar, Microsoft Outlook and Cal.com are described as compatible/export/provider-ready, not connected OAuth integrations.
- Calendar feed/import routes exist for the planned provider boundary, but live OAuth, token refresh, revocation and webhook reconciliation are still unproved.

### Offline/PWA behaviour

- The offline experience uses a role matrix rather than one generic queue.
- Admin/manager may queue the approved ticket and field-note operations.
- Staff may queue the bounded field-note operation.
- Owner/tenant may queue the bounded ticket operation.
- Accountant has no calendar or offline-sync capability and is redirected to the Turkish dashboard; the focused test proves zero move-handover GET/POST and zero offline request/POST.
- Privileged finance, access-approval, refund, role, and destructive operations are not accepted as offline work.
- Device queue state, conflicts and purge controls are visible in the synthetic/local layer.
- The React hook lint violation caused by setting state directly in an effect was removed.
- Production service-worker lifecycle, multi-device reconciliation, background sync reliability and real server persistence remain release gates.

### UC18 security hardening in migrations 32 and 33

The most important database-design correction was recognizing that row-level security limits rows, not columns.

#### Migration 32 reservation reads

- Removed the authenticated table-wide SELECT grant from reservations.
- Retained one authenticated reservation policy that is SELECT-only and uses current_user_can_view_reservation.
- Added an explicit resident-safe column allowlist.
- Excluded request_fingerprint, idempotency_key, notes, created_by and other workflow/internal metadata from direct browser reads.
- Kept reservation INSERT, UPDATE and DELETE command-only and revoked from the authenticated role.
- Added an explicit accountant hard-deny unless a future requirement introduces a separate redacted aggregate.

#### Migration 33 handover tables

- Removed legacy INSERT/UPDATE policies for turnover_work_items, access_handoff_requests and deposit_settlements.
- Repeated REVOKE INSERT, UPDATE, DELETE for those tables as defence in depth.
- Retained only the intended SELECT policies.
- Kept writes behind supported SECURITY DEFINER commands with explicit EXECUTE grants and helper revocations.

### UC18 test evidence

| Gate | Result | Interpretation |
|---|---|---|
| Full web TypeScript at source freeze | PASS, 0 errors | The capability-driven refactor and supported access types compile across the shared web app. |
| Focused Window-3 lint | PASS, 0 errors / 0 warnings | The owned booking/handover/offline files satisfy the focused lint gate. |
| Full web lint at shared gate | PASS, 0 errors / 4 unrelated warnings | No blocking Window-3 lint error remained. |
| Static migration security | PASS 10/10 | Five migration-22 exploit checks plus five booking/handover security regressions. |
| Static business contracts | PASS 8/8 | Candidate, command, checklist, role and provider-truth assertions. |
| Migration 32 structural functions | PASS 38/38 | Required source functions/contracts were present. |
| Migration 33 structural functions | PASS 27/27 | Required source functions/contracts were present. |
| Focused accountant rerun | PASS 2/2, Chromium and mobile, 39.3 seconds | Direct calendar/offline URLs normalize to /tr/dashboard with no data, controls or API calls. |
| Full frozen Window-3 bundle | PASS 70/70, 1.4 minutes | Booking/handover security, six access profiles, UC18 journeys, ICS/calendar/offline across Chromium and mobile Chrome. |
| pgTAP source plan | 68 assertions authored, not executed | Contract exists but is not runtime evidence. |
| Clean Supabase DB / live RLS | NOT EXECUTED | Mandatory production release gate remains open. |
| Real persistence after DB/server restart | NOT EXECUTED | The browser reload evidence does not close this gate. |

### Locale route-guard defect discovered by the final accountant test

The first corrected accountant denial test exposed a product defect rather than an RBAC gap. Locale-prefixed dashboard routes such as /tr/dashboard/calendar were falling through to the generic dashboard resource. The content was safely withheld by downstream role rendering, but the URL remained unauthorized and misleading. The central dashboard route mapper was corrected to normalize tr, en, de and ru prefixes before capability evaluation. Accountant desktop and mobile then redirected to /tr/dashboard with zero restricted API traffic. No accountant permission was widened.

### UC18 production gates still open

- Apply migrations 22, 32, 33, 34 and 35 in order on a clean database and then apply every later migration.
- Prove authenticated table SELECT on reservations is false.
- Prove column privileges for request_fingerprint, idempotency_key and notes are false.
- Prove safe allowlisted columns return only rows allowed by current_user_can_view_reservation.
- Prove accountant, cross-unit and cross-company reads return zero protected rows.
- Prove no INSERT/UPDATE/DELETE policies exist on the three handover tables.
- Prove direct authenticated DML raises PostgreSQL 42501.
- Prove supported commands accept the authorized role, reject stale version/cross-scope actors and write an audit event.
- Repeat all assertions after migrations 34, 35 and later migrations to catch reintroduction.
- Prove a committed hold and handover lifecycle survive a real service restart and separate browser session.
- Add concurrent booking/race tests and performance tests against representative inventory.

## Business meaning by login role

The following table explains the intended experience rather than merely listing permissions.

| Login | What the user should understand | Demonstrable actions | Explicit boundaries and remaining proof |
|---|---|---|---|
| Admin | “I govern the platform, users, configuration and exceptional operations.” | Role/governance views, broad dashboards, reports, controlled booking/handover and offline operations. | Production access-profile panel must be absent; real Auth grants, separation of duties, audit and break-glass procedure remain unproved. |
| Manager | “I run the site and approve operational state transitions.” | Unit/ticket/booking/handover management, public-report triage, service proof, reports and bounded offline work. | Must not bypass version, company, relationship or maker/checker controls; clean DB and concurrency required. |
| Staff | “I execute assigned field work but do not approve myself or see unrelated resident/finance secrets.” | Assigned work, field notes, service evidence and bounded handover execution. | No self-approval, no unrestricted finance, no cross-staff proof access; real assignment and revocation require clean DB. |
| Owner | “I see and act on the property scope I own.” | Owner-scoped statements, reservations/tickets, selected move/handover decisions and service information. | Owner finance must be reconciled against real ledger/currency data; no other owner's rows or internal fingerprints. |
| Tenant / resident | “I request services for my active unit relationship and track my own journey.” | Ticket, booking, QR/public tracking where relevant, own handover/calendar and bounded offline ticket creation. | Active relationship and date scope are mandatory; resident finance breadth is still a product gap; real invitation/auth and persistence unproved. |
| Accountant | “I work only with finance-approved projections; I do not enter operational calendar/offline workspaces.” | Finance-safe dashboard/projection where approved. | No calendar or offline capability, no handover API, no resident notes/fingerprints. The redirect and zero-request behaviour pass 2/2 and within 70/70. |

### Friction still visible to an end user

- External features correctly display unavailable/provider-ready states, but this can feel incomplete unless the demo narrative explains why.
- Some legacy tests and copy still refer to old headings, old provider errors or broad access promises; the truth-hardened dedicated suites are more current than those assertions.
- The integrated matrix found keyboard focus-wrap defects in the public mobile menu and dashboard drawer; these require a fresh post-fix acceptance run.
- The public landing journey found a missing platform section anchor; if navigation targets that anchor, users experience a timeout/no-scroll interaction.
- The public AI's KVKK detection is safer after repair but remains keyword-sensitive, so natural phrasing may fall back to a generic response.
- A monolithic long-running QA process can leak mutable demo state, making later creates/holds/proofs disappear or conflict. The demo must use fresh isolated state until the harness resets data per suite.

## Detailed issue-and-fix ledger

| Area | Initial issue or risk | Action taken | Evidence / current state | Residual risk |
|---|---|---|---|---|
| Production access profiles | Public deployment exposed a QA role catalogue and enabled endpoint. | Local auth/proxy/access-profile policy hardened to fail closed in production. | Local production-mode gates reported green; public Vercel still returned enabled at cut-off. | Redeploy and independently probe exact deployment. |
| Locale dashboard routing | Locale-prefixed unauthorized routes mapped to generic dashboard permission. | Central resource mapper normalizes locale prefixes before authorization. | Accountant direct URL denial passes desktop/mobile with normalized URL and zero APIs. | Recheck every locale/resource in final integrated suite. |
| Reservation data exposure | Table-wide SELECT could expose notes/fingerprints/internal columns even with RLS. | Replaced with explicit resident-safe column allowlist and one SELECT-only policy. | Static booking security 5/5; combined 10/10. | Live has_table_privilege and has_column_privilege not run. |
| Handover write policies | Legacy INSERT/UPDATE policies were inert only because DML grants were absent. | Removed write policies and repeated DML revokes in migration 33. | Static source contract passes. | Clean DB pg_policies and 42501 direct-DML proof open. |
| Booking persistence UX | Optimistic state could diverge after mutation/reload. | Reread authority after mutation; reload contract restores committed hold. | Focused browser journey passes. | Real DB restart/session persistence unproved. |
| Handover readiness | Reopening checklist could leave appointment incorrectly ready. | Reopen now regresses readiness and requires revalidation. | Business/static contracts pass. | Live concurrent mutation proof open. |
| Access lifecycle | Ready credentials could remain after revoke/completion/reschedule. | Latest credential truth and invalidation rules added; move-out requires current revokes. | Window-3 contracts/journeys pass. | Physical provider revocation unconnected. |
| Staff authority | Staff path risked self-approval or overbroad management. | Capability-driven controls and supported commands separate execution from approval. | Role/state tests pass in synthetic layer. | Real staff identities/assignments and DB audit unproved. |
| Accountant contract | Old test expected finance-only handover/offline access contrary to RBAC. | Replaced with denial contract; no RBAC widening. | 2/2 focused and 70/70 bundle. | Finance projection still needs clean DB/reconciliation. |
| Access type compile drift | Route passed generic string where MoveHandoverAccessType was required. | Added/retained supported-access-type contract and typed route. | Full typecheck 0 errors. | Provider-specific mapping not connected. |
| Capability refactor compile drift | Booking/handover components referenced missing canManage and finance values. | Capability variables repaired within owned components. | Full typecheck 0 errors. | Shared refactors require regression gate. |
| Offline React hook | State was set directly in an effect, blocking full lint. | Reworked initialization/update pattern. | Focused and full lint have no blocking Window-3 error. | Browser/background-sync runtime remains environment-sensitive. |
| Calendar fallback language | Turkish calendar could show raw English repository warning. | Localized/suppressed raw fallback. | Focused calendar suite passes. | Professional language review still recommended. |
| Calendar privacy | ICS/calendar could accidentally carry resident/private metadata. | Added privacy projection and explicit ICS contracts. | Static/browser privacy cases pass. | Real shared calendar/OAuth provider audit open. |
| Zero-cost emergency | Emergency work risked being represented as finance/debt activity. | Added migration-36 semantics: zero-cost P0 is operational; priced work remains later human review. | 6/6 plus 4/4 focused cases. | Live notifications and operations SLA open. |
| Service proof | Proof access, replay, provider fallback and resident redaction needed stronger invariants. | Exact own-task access, coworker denial, idempotent immutable notes/reviews and fallback added. | 24/24 desktop/mobile. | Live storage, malware scanning and retention open. |
| Public AI/KVKK | Public concierge could miss natural KVKK phrasing and return generic greeting. | Privacy path and test vocabulary hardened; safe fallback retained. | Focused and broader local cases passed. | Keyword system remains fragile; no production AI evaluation/provider. |
| Registration secrets | Activation tokens in query strings and retries risked leakage/replay ambiguity. | Use private fragment/session handling, stable redemption idempotency key and query rejection. | Source and focused registration contracts. | Real Auth/email/expiry/revoke proof open. |
| Identity intake | Missing identity protection could reveal backend configuration text. | Localized safe unavailable response, no backend detail. | Focused contract covers error and idempotent retry. | Real IDV and pepper/key operations external. |
| Copy truth | Public text overstated “live,” “full access,” retention and traceability. | Four-locale provider and retention wording narrowed to approved truth. | Dedicated copy-truth contracts pass. | Legacy New Level Premium assertions and professional copy review remain. |
| Keyboard overlays | Mobile public menu and dashboard drawer failed forward focus wrap. | Recorded as real accessibility defects during integrated run. | Not accepted as closed at report cut-off. | Must repair and rerun keyboard/mobile/a11y suite. |
| Route announcer alerts | Strict role=alert selectors matched both product alert and Next route announcer. | Classified as stale/over-strict test design. | Product behaviour not shown to be wrong. | Scope selectors to semantic product container and rerun. |
| Public platform anchor | Landing test could not find #platform section. | Classified as potential real navigation friction. | Not closed at cut-off. | Restore target/id or update navigation and regression test. |
| Long-run test state | Shared synthetic process leaked mutations between suites. | Focused fresh-process results kept authoritative; monolithic green withheld. | Isolated UC18 70/70 and service proof 24/24 remain valid. | Partition/reset test state and rerun full matrix. |
| Test runner/setup refresh | Several lanes could not create processes; one attempt executed zero tests. | Coordinator used an owned attested process when runner recovered; zero-execution runs not counted. | Final focused evidence includes process/nonce discipline. | Repair helper and automate attestation. |
| Turbopack/cache corruption | Generated cache caused HTTP 500 during a rerun. | Discarded affected result; restarted with unique Webpack build directory. | Corrected focused/full Window-3 reruns green. | Ignore/clean isolated QA build caches safely. |
| Blank environment ambiguity | Release wrapper could inherit .env.local when expected blanks were passed. | Manual attested server used explicit nonempty loopback-only dummy endpoints. | Focused evidence did not use live credentials. | Fix wrapper to require explicit environment and fail on ambiguity. |
| Migration history | Migration 15 was deleted while 20–36 appeared untracked and a replacement video migration existed. | New numbered domain migrations were authored, including 32–35. | Local source inventory exists. | Reconcile migration ledger before any shared/production apply. |
| Training media | Nineteen large videos are present as untracked files. | Content set exists for review. | Local only. | Decide LFS/CDN, licensing, privacy, compression and deployment. |

## Quality assurance: exact evidence and limitations

### Shared technical gates at the stable source checkpoint

- Full TypeScript: PASS, zero errors.
- Full ESLint: PASS, zero errors and four pre-existing/unrelated warnings.
- Production build: PASS.
- Window-3 focused lint: PASS across 18 owned files, zero errors and zero warnings.
- Window-3 static migration security: PASS 10/10.
- Window-3 business source contracts: PASS 8/8.
- Migration-32 structural audit: PASS 38/38 function bodies; no undeclared p_/v_ identifiers detected.
- Migration-33 structural audit: PASS 27/27 function bodies; no undeclared p_/v_ identifiers detected.
- Window-2 reported full typecheck/build PASS and a 134/134 focused matrix before source freeze.

These results demonstrate a buildable and statically consistent shared application at the cited checkpoints. Because the worktree remained active during portions of integrated QA, any later source change must rerun the same gates before release.

### Focused browser evidence accepted

| Capability | Exact focused result | What is accepted |
|---|---|---|
| UC18 booking/handover/calendar/offline/security/access profiles | 70 passed / 0 failed across desktop Chromium and mobile Chrome; approximately 1.4 minutes | The isolated synthetic journey and role boundaries behave as designed. |
| Accountant denial after route fix | 2 passed / 0 failed; 39.3 seconds | Both direct URLs redirect; zero protected API calls; no secrets/controls. |
| Service proof | 24 passed / 0 failed across desktop/mobile | Exact own-task access, coworker denial, immutable/idempotent notes and reviews, resident redaction, provider fallback and localization. |
| Emergency and SLA | 6/6 focused persistence-emergency plus 4/4 triage/order/task/SLA | Zero-cost emergency stays operational; priced work keeps a truthful human finance-review path. |
| Booking/handover static exploit gate | 10/10 | Broad reservation columns, legacy policies and later grant reintroduction are absent in the source chain. |

### Evidence explicitly rejected or superseded

- A Window-3 runtime attempt that failed during setup refresh executed zero tests and proves nothing about the product.
- The first coordinator UC18 run produced 68 passes and two failures. It was diagnostic; the failures were a stale accountant test, followed by discovery of a real route-guard defect. It was superseded by the corrected 2/2 and full 70/70 results.
- A Turbopack/PostCSS generated-cache HTTP 500 was discarded. Source CSS remained intact and the accepted rerun used a fresh unique Webpack build directory.
- Earlier references to 66 pgTAP assertions are stale; the source plan contains 68 and none were executed on a clean database.
- Older 6/6 or 11/12 calendar/offline snapshots are not the final Window-3 gate.

### Integrated 762-execution matrix at report cut-off

The coordinator inventoried 762 browser executions across 52 files and two viewports. Eight production-only probes were intentionally outside QA mode because their security meaning depends on production-mode configuration. The long matrix was still being investigated and is **not accepted as a green release result**.

Important findings from the run include:

- real focus-wrap failures in the public mobile navigation and dashboard drawer;
- one old OpenAPI assertion expecting unauthenticated 401 even though the synthetic access-profile environment supplies a role;
- strict alert selectors colliding with Next.js route-announcer alerts;
- a stale CRM heading expectation;
- a stale role-matrix expectation about Service Requests versus the current canonical sidebar/RBAC;
- a missing platform section anchor that may cause public navigation friction;
- a legacy New Level Premium suite expecting old headings, locally fabricated references, old provider errors and old identity-review wording;
- a UC18 hold, service-proof item, ticket/reservation and owner-approval failures only after many earlier suites had mutated process state, despite their fresh focused gates passing;
- one AI timeout after the shared development server accumulated heavy load;
- a Turkish offline queue false negative caused by an English-only legacy regex.

The management meaning is twofold:

1. Focused fresh-process evidence is credible for the named journeys.
2. The full release harness itself needs deterministic environment setup, per-suite state reset or database isolation, exact server attestation and stale-contract cleanup before it can be a single release certificate.

### Release harness improvements still required

- Refuse to run if the expected port is owned by an unattested process.
- Bind the test process to a server nonce and exact environment mode.
- Treat skipped required tests as a failed gate, while keeping explicitly separate production-only probes documented.
- Prevent redirected unauthorized pages from satisfying assertions intended for protected resources.
- Require explicit nonempty dummy endpoints in synthetic QA and reject accidental inheritance of local/live credentials.
- Use a unique build directory and verify listener/lock cleanup after the run.
- Reset or partition mutable synthetic data between suites.
- Run focused failing slices on a fresh process before classifying product severity.

## Persistence, concurrency and database truth

### What reload evidence actually proves

The accepted UC18 tenant journey creates a hold, performs a hard browser reload, refetches from a stateful isolated mocked authority, commits the hold, and sees the booking become a move-handover candidate. This is useful evidence of UI state restoration and route/repository contract consistency.

It does **not** prove:

- PostgreSQL committed the row;
- a new application process can reread the row;
- another authenticated device sees the same row;
- database restart or failover preserves it;
- the ordered migration chain produces the same permissions;
- audit data is durably retained.

The approved wording is: **“Reload behaviour passed against a stateful isolated mocked authority.”** The wording “real database persistence is proven” is not approved.

### Clean-database release plan

1. Create a fresh non-production Supabase/PostgreSQL environment.
2. Reconcile the migration ledger, especially the deleted migration 15 and new migrations 20–36.
3. Apply every migration in canonical order with captured logs and checksums.
4. Load representative companies, sites, units, owners, tenants, staff, accountants, bookings, handovers and tickets.
5. Execute the 68-assertion booking/handover pgTAP contract.
6. Execute service-proof and tenant-access SQL security contracts.
7. Run live has_table_privilege, has_column_privilege, pg_policies and direct-DML 42501 checks.
8. Run cross-company, cross-unit, stale-version, idempotent replay and audit-event assertions.
9. Restart the application/database test environment and repeat reload/multi-session journeys.
10. Repeat privilege assertions after all later migrations to detect reintroduction.

### Concurrency and scale still missing

- Two actors attempting the same resource slot at the same time.
- Waitlist promotion while a relationship changes or expires.
- Concurrent manager approval and cancellation.
- Reschedule while access/checklist operations are in flight.
- Offline replay duplicated across tabs/devices.
- Service proof and ticket idempotency under real network retries.
- Performance against 212,298+ property records and the exact 769-unit demo subset.
- Realtime fan-out, reconnect and fallback at representative user counts.

The source uses consistent lock ordering—unit, resource, reservation, appointment—and version/idempotency contracts, but load and race tests are still required.

## External integrations and provider truth

### Management principle

The repository provides integration boundaries; it does not provide vendor contracts, production credentials, legal approval or a commercial quote. No numeric vendor price is invented in this report. Cost categories are stated so management can request comparable quotations.

| Domain | Current local state | What can be demonstrated | What is needed to make it live | Cost character |
|---|---|---|---|---|
| Supabase database/Auth/Realtime | Architecture and repository target; much synthetic evidence | Role/data concepts and fail-closed environment states | Paid project, regions, backups, Auth setup, clean migrations, RLS, Realtime and restore tests | Paid subscription plus metered database/storage/egress |
| Vercel hosting | Existing deployment, but production access-profile gate failed at cut-off | Local production build and controlled QA | Safe redeploy, environment review, domain, logs, preview/prod separation and production probe | Paid subscription plus usage/egress/function charges |
| Monitoring/alerting | Not accepted as production complete | Local error states | Sentry and Better Stack/UptimeRobot or equivalents, alert routes, retention and on-call ownership | Subscription/usage based |
| Email | Provider-ready/fail-closed | Unavailable/provider status and invitation templates | Postmark, Amazon SES or approved SMTP; domain verification, SPF/DKIM/DMARC, consent, delivery/bounce logs | Usage based; possible base plan |
| SMS | Provider-ready/fail-closed | Honest unavailable state | Netgsm or İleti Merkezi; Twilio only if approved; sender registration, templates, consent and receipts | Per-message/volume quotation |
| Push | PWA concept only | Local notification-ready UX where applicable | FCM and optionally OneSignal; permission strategy, tokens, opt-out and monitoring | FCM often low/no direct subscription; optional platform tier |
| Payments | No live gateway | Manual/synthetic payment controls only | iyzico, PayTR, Param, Sipay or Paycell decision; contracts, fees, 3DS, refund/reconciliation, PCI/legal review | Transaction commission, settlement and possible fixed/virtual-POS fees |
| Bank data | CSV/export concept preferred first | Manual reconciliation story | Bank CSV/Excel first; API/Open Banking only after bank/vendor quote and consent/security design | Low platform cost for files; API quote/integration cost later |
| Internal wallet | Ledger concept only | No e-money claim | Legal decision; use Papara/Paycell only if approved; do not operate as an unlicensed e-money institution | Legal/compliance plus provider fees |
| Document/evidence storage | Abstraction exists; live bucket not proven | Fail-closed upload/download states and source contracts | Supabase private Storage first or S3; bucket, encryption, signed URLs, malware scan, retention, deletion and backup | Storage/egress/request usage plus scanning/backup |
| Identity verification | Fail-closed safe response | Registration without pretending verification is live | Approved IDV vendor, identity pepper/key operations, DPA/KVKK, retention/deletion and human review | Per-check/volume quotation plus compliance effort |
| AI | Rule-based/synthetic or configurable provider boundary | Guardrailed public/internal experiences | Approved OpenAI-compatible provider/model, evals, moderation, token budgets, redaction, observability and human approval | Token/inference usage plus engineering/monitoring |
| Calendar | ICS export implemented; OAuth not connected | Download/add calendar event and localized labels | Google/Microsoft/Cal.com OAuth, token storage, scopes, revocation, webhooks and conflict reconciliation | Mainly engineering/operations; provider plan where applicable |
| Physical access | Internal workflow supports mobile code/card/plate/QR; execution is not_executed | Request, approval, validity and revoke intent | Site inventory; Hikvision, Dahua, ZKTeco, dormakaba, Salto/local integrator decision; controllers, installation, APIs and callbacks | Hardware, installation, licences, integration and support quotation |
| Cameras | Not live | Honest unavailable/blocked state | Camera/VMS provider, privacy impact, retention, network/security, site installation and legal signage | Hardware/storage/licence/support quotation |
| Twenty CRM | Configurable URL/key; not proven in production | Provider status | Hosting, API key, object mapping, sync/retry, AGPL operational model and monitoring | Infrastructure/operations plus implementation |
| Accounting | Export-first direction | Manual/export story | Logo, Mikro, Paraşüt, Uyumsoft or approved product; chart of accounts, tax, invoice and reconciliation mapping | Subscription/connector/implementation quotation |
| Jira/Xray QA governance | Recommended process tool | Traceability concept | Licences, workflow, owners, test case migration and reporting | Per-user/subscription |

### Provider activation sequence recommended

#### Wave 1 — Minimum safe operations

- Supabase paid non-production and production projects.
- Vercel production hardening.
- Monitoring/uptime/error tracking.
- Private document storage.
- Transactional email.
- SMS only if operational alerts/invitations require it.

#### Wave 2 — Resident and field operations

- Identity verification after KVKK/DPA approval.
- Physical access provider after site hardware inventory.
- Calendar OAuth only if bidirectional sync is a contractual requirement.
- Push notifications after consent and token lifecycle design.

#### Wave 3 — Financial automation

- Accounting export/connector.
- Bank/API reconciliation.
- Payment gateway and refunds only after maker/checker, legal, commission, settlement and incident controls are approved.
- Wallet-like functionality only after an explicit legal finding.

#### Wave 4 — AI optimisation

- Select a provider/model after a multilingual evaluation set exists.
- Start with suggestion/reporting, not autonomous finance, refunds, access or roles.
- Enforce same-language responses, redaction, budgets, audit and human approval.

### Cost governance required before signing vendors

- Name an Ataberk billing owner and WAMOCON technical owner for every provider.
- Record the vendor decision, dependency, quote and renewal date in Jira or the chosen governance system.
- Keep sandbox and production accounts separate.
- Configure spend caps, alerts and rate limits before enabling production traffic.
- Capture transaction/message/storage/egress assumptions, not only subscription prices.
- Include implementation, migration, training, monitoring, support and exit/export cost.
- Do not commit quotes, credentials or personal data to the repository.
- Complete KVKK/DPA/security review before a provider receives identity, resident, finance, document, communication or camera data.

## What is working, grey, not working, and pending

### Working in the controlled local demo

- Turkish-first public/login/dashboard shell with four locale routes.
- Synthetic access-profile switching for six roles when the explicit QA environment is enabled.
- Exact 769-unit matrix journey as reported by Window 2.
- Public QR issue report and tracking journey.
- Ticket intake, urgent classification, SLA/assignment and zero-cost emergency semantics.
- Service proof creation, idempotent replay, exact assignee scope, redaction and mobile presentation.
- UC18 resident booking hold, reload/refetch, commit and handover candidate.
- UC18 manager/staff/owner authority and staff self-approval denial.
- UC18 accountant denial, normalized route and zero restricted APIs.
- Handover checklist/readiness/access state transitions in the synthetic authority.
- ICS export and calendar label/privacy behaviour.
- Role-bounded offline queue experience.
- Source-level fail-closed provider states.

### Grey zones requiring a product or policy decision

- Whether a future tenant may self-book before the formal tenant-access/calendar entitlement becomes active.
- Whether accountant needs a separate redacted deposit aggregate outside the handover workspace.
- Whether ICS export is sufficient for launch or bidirectional Google/Microsoft/Cal.com sync is mandatory.
- Which physical access modes are required at each site; source support for four types does not mean the installed hardware supports them.
- Whether resident finance is part of the first release; the role audit identified it as incomplete/unclear.
- Whether the public AI remains a scripted helper for the demo or becomes a provider-backed assistant before launch.
- Which personal identity images/evidence are legally required and whether they belong in 1Çatı or an external IDV provider.
- Retention periods for registration evidence, service proof, documents, communications, offline queue data and camera/access logs.
- Whether the nineteen training videos are distributable client assets, internal drafts or require editing/approval.
- Whether the current broad “Service Requests” navigation for a disputed role is the approved RBAC requirement or a stale test expectation.

### Known not-working or unacceptable at cut-off

- The current public Vercel access-profile exposure was unacceptable for a client demo until redeployed and reverified.
- Real clean-database RLS/privilege/runtime security for migrations 20–36 was not proven.
- Real Supabase persistence-after-restart and real six-role Auth were not proven.
- Live payment, banking, SMS, email, IDV, document bucket, physical access, camera, OAuth calendar and production AI integrations were not connected/proven.
- The long integrated harness was not deterministic because mutable synthetic state leaked between suites.
- Public mobile menu and dashboard drawer forward focus wrap failed in the integrated run.
- The public platform anchor was missing or mismatched at the integrated cut-off.
- Some legacy New Level Premium and older API/role assertions no longer matched the truth-hardened product.
- Source pgTAP plans existed but were not executed.

### Pending operational work

- Customer UAT with named acceptance owners.
- Production data migration/import and reconciliation.
- Monitoring, on-call, incident and support runbooks.
- Backup/restore and disaster-recovery exercise.
- Performance, concurrency, browser/device and network-resilience testing.
- Accessibility audit beyond the focused automation, including keyboard, screen reader, zoom and contrast.
- Security review, threat model, dependency/secret scanning and penetration test.
- Provider contracts, DPAs, keys, cost caps and operational acceptance.
- Release branching, clean migration history, artefact hygiene and repository cleanup.
- Training/video review and deployment channel.

## Controlled demo playbook

### Preconditions

1. Use an isolated local/QA environment only.
2. Enable CATI_ENV=qa and CATI_DEMO_DATA_ISOLATED=true.
3. Use a unique build/output directory; do not reuse a corrupted Next cache.
4. Set nonempty loopback-only dummy external endpoints; never allow fallback to live credentials.
5. Bind to an owned loopback port and verify no existing listener.
6. Attest the process with a unique nonce and confirm the access-profile endpoint returns the expected QA mode and nonce.
7. Start from fresh synthetic state or reset between major flows.
8. Keep the browser and server owned by one coordinator; stop and verify listener/lock release afterward.

### Recommended 20–30 minute management demo sequence

1. **Set context:** Explain Turkish-first, role-aware property operations and the difference between local demo and live integrations.
2. **Manager overview:** Show units, operational queues, tickets and the exact 769-unit/site view where appropriate.
3. **Resident booking:** Switch to tenant/resident; select an eligible amenity/slot; create a hold; reload; show the restored hold; commit.
4. **Move handover:** Switch to manager; show the committed booking as a candidate; create or inspect a move appointment; explain checklist sequence and supported access types.
5. **Separation of duties:** Switch to staff; show field execution and prove self-approval is unavailable. Switch to owner for linked-property schedule-only behaviour.
6. **Accountant boundary:** Directly attempt the calendar/offline URLs; show redirect to /tr/dashboard and explain that finance access does not imply resident operational access.
7. **Calendar:** Export/display an ICS item and show business-friendly labels; state clearly that OAuth synchronization is not connected.
8. **Offline:** Show the manager/staff/tenant role matrix and queue restrictions; explain local device/synthetic persistence and the production resilience gate.
9. **Ticket/emergency/service proof:** Create or inspect an emergency ticket, zero-cost operational handling, staff evidence and manager/resident redaction.
10. **Public QR:** Show account-free issue reporting/tracking and manager triage.
11. **Integrations:** Open the integration-status view and distinguish configured, provider-ready and blocked items.
12. **Close honestly:** Present the production roadmap, provider choices and clean-database gate.

### Demo statements approved

- “The controlled QA build demonstrates the complete resident booking-to-handover journey across desktop and mobile.”
- “The accountant is intentionally excluded from calendar and offline operations.”
- “Calendar export works through ICS; live Google/Microsoft/Cal.com OAuth is a later integration.”
- “Physical access state and approval are modelled, but no door or credential provider is being executed.”
- “External providers fail closed and are not presented as connected.”
- “Production readiness requires a clean database, live RLS, real authentication, provider activation and UAT.”

### Demo statements prohibited

- “The live Vercel site is safe” before the access-profile redeploy probe passes.
- “All 24 use cases are finished in production.”
- “The booking is persisted in Supabase” based only on the mocked reload.
- “The app opened/revoked a real door credential.”
- “SMS/email/payment/bank/calendar/AI is live” without provider evidence.
- “All security tests passed” while the 68 pgTAP/live privilege assertions remain unexecuted.

## Risk register

| ID | Risk | Likelihood | Impact | Management treatment |
|---|---|---|---|---|
| R1 | Public QA-role exposure remains deployed | High until verified | Critical | Block client use of public URL; redeploy and probe. |
| R2 | Migration order/history inconsistency | Medium | Critical | Reconcile ledger; clean apply; checksum and rollback plan. |
| R3 | Static RLS differs from live privilege state | Medium | Critical | Execute pgTAP/live privilege/direct-DML tests. |
| R4 | Synthetic persistence mistaken for production persistence | High | High | Use evidence taxonomy; run restart/multi-session DB tests. |
| R5 | External providers unavailable during demo/launch | High | High | Fail closed; choose providers; sandbox acceptance; demo script. |
| R6 | Payment/access automation creates financial/physical harm | Medium | Critical | Human approval, maker/checker, no autonomous AI/offline action, provider audit. |
| R7 | Mutable test state causes false failures or false greens | High | High | Per-suite reset/partitioning and server attestation. |
| R8 | Accessibility keyboard defects block users | Medium | High | Fix focus traps/anchors; screen-reader and zoom audit. |
| R9 | Multilingual copy overpromises or mistranslates | Medium | Medium/High | Professional review and approved provider-truth glossary. |
| R10 | Large untracked/generated files obscure release scope | High | Medium | Clean worktree, ignore build caches, choose media storage. |
| R11 | Real inventory scale harms performance | Medium | High | Load/performance tests at 212k+ property scale. |
| R12 | KVKK/data-processing decisions lag implementation | Medium | Critical | DPIA/DPA, retention and legal owner before provider activation. |
| R13 | Access hardware incompatibility | Medium | High | Site inventory and integrator proof-of-concept before commitment. |
| R14 | AI keyword/provider behaviour gives unsafe or inconsistent advice | Medium | High | Narrow scope, multilingual evals, moderation, logging and human approval. |
| R15 | Knowledge is lost across parallel windows/stale handoffs | High | Medium | Update canonical handbook/runbook and supersede stale handoffs. |

## Recommended roadmap and acceptance gates

### Phase A — Demo stabilization (immediate)

- Close focus-wrap and platform-anchor issues.
- Update stale legacy tests to the approved current product contract without widening RBAC.
- Partition/reset synthetic state and rerun the integrated matrix on a fresh attested process.
- Remove/ignore generated QA build directories from release scope.
- Reconcile the Window-3 handoff: 68 pgTAP assertions, final 70/70, and live DB unproved.
- Create a tagged/committed demo candidate after all owners freeze source.

**Exit criterion:** one deterministic full local matrix plus the focused green bundles, zero blocking type/lint/build errors, and a documented demo script.

### Phase B — Public deployment safety

- Deploy the fail-closed access-profile/auth route changes.
- Verify /api/access-profile is disabled/denied in production and role catalogue is absent from login HTML.
- Confirm production environment contains no QA/demo flags or dummy credentials.
- Run production-only security probes and basic public navigation/accessibility smoke.

**Exit criterion:** public Vercel changes from NO-GO to controlled-demo eligible.

### Phase C — Clean database and real authentication

- Reconcile/apply migrations 20–36.
- Run all SQL/pgTAP/privilege/RLS/direct-DML/audit tests.
- Configure six real test identities with company/site/unit relationships.
- Run real login, invite, grant/revoke, reload/restart, cross-company and concurrency journeys.
- Prove Realtime private-channel/fallback behaviour.

**Exit criterion:** source/synthetic claims can be upgraded to clean-database evidence.

### Phase D — First-wave integrations and operations

- Monitoring, email, storage and optional SMS.
- Production logs, alerting, backups, restore and incident playbook.
- Retention/deletion and subject-request procedures.
- Provider sandbox tests, receipts/reconciliation and spend controls.

**Exit criterion:** operational beta readiness without payment/access automation.

### Phase E — Physical access, finance and advanced providers

- Site hardware survey and access proof-of-concept.
- Accounting/bank export then connector/API.
- Payment/refund only after legal/finance controls.
- Calendar OAuth only if required.
- AI provider only after multilingual evaluation and governance.

**Exit criterion:** provider-live evidence and customer acceptance for each activated domain.

### Phase F — Production acceptance

- Full performance, resilience, accessibility and security review.
- Customer UAT across all approved roles/use cases.
- Training, support, SLA, release/rollback and ownership sign-off.

**Exit criterion:** management and customer sign the production release checklist; no status is inferred from local demo success.

## Decisions required from senior management

1. Is the next milestone a controlled client demo, a pilot with real test users, or a production launch? Each requires different evidence and budget.
2. May the public Vercel URL be withheld until the access-profile deployment gate is green?
3. Which external providers must be live for the first contractual release?
4. Is ICS export sufficient for calendar launch?
5. Which physical access hardware exists at each site and which credential types are genuinely required?
6. Is resident finance included in release one, and what may accountants see?
7. May future tenants self-book before accepted tenant/calendar entitlement?
8. What are the approved retention periods and legal bases for identity, documents, tickets, service proof, communications, access logs and camera data?
9. Will public/internal AI remain scripted/provider-ready for the demo or be funded for production evaluation and integration?
10. Who owns provider budgets, renewals, security incidents, operational support and customer acceptance?

## Worktree and change-scope observations

At the report snapshot, the shared worktree was intentionally very active and not release-clean:

- 909 total status entries were previously counted.
- 219 entries were classified as meaningful source/document/test changes.
- 690 entries were generated caches or large media excluded from the meaningful count.
- The meaningful set comprised approximately 90 modified, 2 deleted and 127 untracked paths.
- Meaningful paths were concentrated in apps/web, docs, scripts and supabase.
- New migrations 20–36 and SQL tests were untracked.
- Migration 15 was deleted while migration 21 represented the video library direction.
- A large isolated Next build directory and nineteen videos appeared as untracked artefacts.

This is acceptable during coordinated development but not for release. Management should require a clean, reviewed commit set and migration manifest before deployment. The report does not delete or stage other owners' changes.

## Principal source and evidence families

### Shared platform and security

- apps/web/lib/auth.ts
- apps/web/lib/access-profile-policy.ts
- apps/web/proxy.ts
- apps/web/app/api/access-profile/route.ts
- apps/web/lib/rbac.ts
- apps/web/lib/dashboard-routing.ts
- apps/web/e2e/auth/access-profile-functional.spec.ts
- apps/web/e2e/auth/access-profile-production-functional.spec.ts
- scripts/release-demo-harness.mjs
- scripts/full-app-qa-harness.mjs

### UC18 booking/handover/calendar/offline

- supabase/migrations/00000000000032_booking_resource_lifecycle.sql
- supabase/migrations/00000000000033_move_handover_workflow.sql
- supabase/migrations/00000000000034_calendar_ics_feeds.sql
- supabase/migrations/00000000000035_offline_sync_commands.sql
- supabase/tests/booking_handover_security.sql
- apps/web/lib/booking-lifecycle-repository.ts
- apps/web/lib/move-handover-repository.ts
- apps/web/lib/ics-calendar.ts
- apps/web/lib/offline-sync-repository.ts
- apps/web/app/api/site-management/booking-lifecycle/route.ts
- apps/web/app/api/site-management/move-handover/route.ts
- apps/web/app/api/calendar/ics/route.ts
- apps/web/app/api/site-management/offline-sync/route.ts
- apps/web/components/booking-lifecycle/booking-lifecycle-experience.tsx
- apps/web/components/booking-lifecycle/move-handover-experience.tsx
- apps/web/components/booking-lifecycle/calendar-interoperability.tsx
- apps/web/components/offline-sync/offline-experience.tsx
- apps/web/e2e/api/booking-handover-security-functional.spec.ts
- apps/web/e2e/operations/booking-handover-business-functional.spec.ts
- apps/web/e2e/operations/window3-calendar-offline-functional.spec.ts

### Tickets, emergency and service proof

- supabase/migrations/00000000000020_role_relationship_ticket_workflow_hardening.sql
- supabase/migrations/00000000000027_service_order_evidence.sql
- supabase/migrations/00000000000036_zero_cost_emergency_semantics.sql
- supabase/tests/service_proof_security.sql
- apps/web/lib/ticket-workflow.ts
- apps/web/lib/ticket-history.ts
- apps/web/lib/service-proof-repository.ts
- apps/web/app/api/site-management/tickets/route.ts
- apps/web/app/api/site-management/service-proofs/route.ts
- apps/web/e2e/operations/service-proof-functional.spec.ts
- apps/web/e2e/roles/ticket-lifecycle-functional.spec.ts

### Registration, public reporting and compliance

- supabase/migrations/00000000000023_compliance_cockpit.sql
- supabase/migrations/00000000000025_registration_activation_workflow.sql
- supabase/migrations/00000000000028_public_qr_reporting.sql
- apps/web/lib/registration.ts
- apps/web/lib/registration-repository.ts
- apps/web/lib/public-report.ts
- apps/web/lib/public-report-repository.ts
- apps/web/e2e/api/registration-workflow-functional.spec.ts
- apps/web/e2e/api/public-report-functional.spec.ts
- apps/web/e2e/public/public-report-functional.spec.ts

### Finance, communications, reporting and buyer pipeline

- supabase/migrations/00000000000024_owner_finance_visibility.sql
- supabase/migrations/00000000000026_manual_payment_posting.sql
- supabase/migrations/00000000000029_portal_communications.sql
- supabase/migrations/00000000000030_report_artifacts.sql
- supabase/migrations/00000000000031_buyer_pipeline.sql
- apps/web/lib/owner-finance-repository.ts
- apps/web/lib/manual-payment-repository.ts
- apps/web/lib/communications-repository.ts
- apps/web/lib/reporting-repository.ts
- apps/web/lib/buyer-pipeline-repository.ts

## Final management verdict

The July hardening work achieved real value: critical authorization assumptions were corrected, the resident booking-to-handover journey became coherent, role boundaries became more defensible, external-provider claims became more honest, and focused desktop/mobile evidence is strong for several high-value workflows.

The most important success is not the number of screens or tests. It is the change in truthfulness: the application now more often distinguishes a real command from a simulated one, a role-safe view from a broad dashboard, a local refetch from database persistence, and an integration boundary from a live provider.

The most important remaining risk is also clear: the project can look complete in an isolated demo while core production evidence—clean migrations, live RLS, real Auth, persistent data, providers, operations and public deployment safety—remains open. Management should authorize a controlled demo only under the stated playbook, keep the current public URL blocked until production access profiles are proven disabled, and fund the clean-database/provider/operational programme before approving production.

---

## Appendix A — Status vocabulary

- **Focused-demo ready:** Passed a defined isolated source/browser gate; no production claim.
- **Source/synthetic ready:** Implementation and synthetic contracts exist; real database/provider remains open.
- **Provider-ready:** A boundary/status/fail-closed path exists; provider is not connected.
- **Environment-gated:** Requires credentials, clean infrastructure or external approval.
- **NO-GO:** Known evidence prevents use on that release surface.
- **Unproved:** The required test was not executed; not automatically a defect.

## Appendix B — Release evidence checklist

- [ ] Clean worktree/approved commit and migration manifest.
- [ ] TypeScript zero errors.
- [ ] ESLint zero errors; warnings reviewed.
- [ ] Production build passes.
- [ ] Deterministic full browser matrix passes with expected count and no unexplained skips.
- [ ] Focused UC18 70/70 or superseding gate passes after final source changes.
- [ ] Service proof 24/24 or superseding gate passes.
- [ ] Emergency/SLA 10/10 or superseding gate passes.
- [ ] Production access-profile endpoint and login role catalogue fail closed.
- [ ] 68/68 booking/handover pgTAP passes on clean DB.
- [ ] Live reservation/table/column privilege and cross-scope assertions pass.
- [ ] Direct DML denial returns 42501.
- [ ] Real six-role Auth and grant/revoke passes.
- [ ] Persistence survives restart and separate session.
- [ ] Realtime reconnect/fallback passes.
- [ ] Provider-live acceptance exists for each claimed integration.
- [ ] Backup/restore, monitoring and incident response pass.
- [ ] Accessibility, performance, security and UAT sign-offs complete.

## Appendix C — Document control and truth hierarchy

For product and release decisions, use the repository's maintained hierarchy: PROJECT-HANDBOOK, current functional hardening plan, requirements index, phase execution runbook, then code/scripts and this management audit. Markdown remains the canonical maintainable source; the DOCX is the management reading copy. Any future change that alters architecture, status, costs or provider truth should update the canonical documentation and regenerate the DOCX.

## Appendix D — Cost model inputs management must supply

The repository does not contain a monetary budget, price range or annual run-rate. A comparable request for quotation needs at least:

- Named users by role and Jira/Xray seat count.
- Monthly active residents, staff and peak concurrent users.
- Database size, backup retention, compute profile and monthly egress.
- Documents per month, average file size, signed downloads, malware scans and retention.
- Email, SMS and WhatsApp volumes by transactional, urgent and marketing class.
- Payment count, gross value, average transaction, refunds, chargebacks and settlement SLA.
- Banks/accounts, statement frequency and monthly transaction count.
- Push subscriptions, supported browsers/devices and delivery volume.
- Public/internal AI requests, token/model mix, latency, retained telemetry and budget ceiling.
- Identity checks per month, supported documents/countries and manual-review percentage.
- Gates, barriers, cards, cameras, sites, zones and installer/support SLA.
- Meter count, reading frequency, import/device expectation and dispute volume.
- Accounting/e-invoice users, entities and monthly documents/transactions.
- Calendar users and whether one-way ICS or two-way OAuth sync is mandatory.
- Monitoring event volume, retention, alert coverage and on-call expectation.
- Support hours, hypercare duration, training and customer SLA.

Every quotation should separate one-time setup/engineering, recurring subscription, metered usage, transaction commission, hardware/licence/installer support, legal/privacy/procurement effort, and internal operations/support.

## Appendix E — Provider-plan drift and procurement clarifications

- The written plan recommends Postmark or Amazon SES for email; current code labels Resend/SMTP. Select one shortlist before implementing an adapter.
- The written plan recommends Netgsm or İleti Merkezi for SMS; current code also references Twilio. Turkish sender and commercial requirements must decide the provider.
- Access-provider references span Hikvision, Dahua, ZKTeco, dormakaba, Salto KS and local installers. A site hardware inventory must precede procurement.
- WhatsApp appears in communication contracts but has no funded cost-register row or live Business API adapter.
- Identity verification has a generic client/fail-closed boundary but no approved procurement row; the management endpoint remains deliberately disabled/manual review.
- Calendar OAuth is visible as provider-ready but is absent from the earlier cost register; clarify whether ICS is sufficient.
- Twenty CRM readiness currently proves only configuration presence, not synchronization; self-hosting still incurs infrastructure, backup and support cost.
- AI and identity verification should appear in the integration-health and cost governance model before production activation.
- Bank import is described as a preferred first step, but a dedicated executable import journey must be demonstrated before calling it available.
- Meter capture is handover evidence, not automated meter billing.
- The integration settings page is a read-only readiness/health view, not a credential-management console.

## Appendix F — UC18 technical invariant ledger

| Invariant | Implemented contract | Production evidence still needed |
|---|---|---|
| Resident continuity | Hold and committed reservation carry residentId into the move-handover candidate. | Live row persistence and referential integrity after restart. |
| Date-scoped eligibility | Owner/tenant relationship is evaluated at the requested start date and resource timezone, not simply CURRENT_DATE. | Clean-DB edge cases around relationship start/end and DST/timezone. |
| Resident visibility | Linked resident/company/site/unit relationship, not internal site-management permission, controls self-service visibility. | Cross-company/cross-unit live RLS fixtures. |
| Staff assignment | Assignee must be a same-company profile with canonical staff role. | Real identities and assignment audit. |
| Future move-in | Manager/current owner can prepare appropriate future move-in; invited tenant remains gated until active entitlement. | Management decision on pre-entitlement self-service. |
| One current credential truth | Current uniqueness is appointment plus credential type; activate and revoke are successive states, not parallel active rows. | Clean-DB constraint and concurrent command proof. |
| Latest truth wins | Readiness selects latest credential by updated_at, created_at and id. | Live data with competing historical records. |
| Ready activation | Move-in requires approved/succeeded, human-approved activation valid across appointment interval. | Real provider callback/reconciliation. |
| Move-out revocation | Completion requires current human-approved revocation of each credential. | Actual device/provider disablement. |
| Checklist aggregate | Reopening a required item regresses ready to preparing. | Concurrent checklist mutation. |
| Direction-aware checklist | Move-in access and move-out revocation have different completion criteria. | Clean-DB runtime. |
| Direct check-in | Pre-start checklist is verified; appointment status alone cannot bypass it. | Live trigger/command proof. |
| Reschedule safety | Terminal history is preserved, but approvals, validity and active turnover are requeued/revalidated for the new time. | Race test while access/checklist work is active. |
| Cancellation reason | Submitted reason propagates through trigger-driven appointment/checklist/audit changes. | Live audit row inspection. |
| Operational mutation | Evidence, meter and condition capture require manage capability, not view capability. | Real role identities and DML/function privileges. |
| Separation of duties | Staff may prepare supported work but cannot provide their own human approval. | Real staff/admin maker-checker identities. |
| Command-only writes | Browser DML is revoked; supported SECURITY DEFINER commands own mutation. | 42501 and EXECUTE privilege tests on clean DB. |
| Consistent locks | Commands acquire unit, resource, reservation, then appointment locks. | High-concurrency deadlock/race suite. |
| Honest provider execution | Physical access remains not_executed until a provider callback/evidence exists. | Hardware sandbox and reconciliation. |
| Accountant boundary | No calendar/offline route, data, control or API call; finance permission does not imply resident operations. | Real Auth/RLS and any future redacted aggregate design. |

## Appendix G — UC18 source/runtime chronology

1. Initial source review found reservation-column exposure, inert legacy write policies, incomplete candidate/reload contracts and role/state inconsistencies.
2. Migration 32 was narrowed to column-safe reservation reads and command-only writes.
3. Migration 33 retired legacy write policies, repeated DML revokes and hardened handover state/access invalidation.
4. Booking/handover components were refactored to capabilities; four resulting compile errors were repaired.
5. The move-handover route was narrowed from string to the supported access-type union.
6. The offline React effect lint blocker was repaired.
7. Turkish calendar fallback text and provider-truth copy were corrected.
8. Static business and security contracts passed; independent combined security rerun passed 10/10.
9. A planned Window-3 runtime could not start because setup refresh failed; zero tests were counted.
10. Coordinator runtime produced 68/70; both failures were the stale accountant expectation.
11. The accountant test was corrected to canonical denial without RBAC widening.
12. That correct test uncovered the locale route-guard defect.
13. The central route mapper was fixed; focused accountant desktop/mobile passed 2/2.
14. The complete frozen Window-3 bundle passed 70/70.
15. Clean-database, live privilege/RLS, 68 pgTAP and real persistence gates remained explicitly open.
