# Project status & current state — 2026-07-23

> Snapshot after the admin-console + new-roles + landing + AI-re-architecture delivery.
> Supersedes `docs/PROJECT-STATUS-2026-07-22.md`. Companion to `docs/PROJECT-HANDBOOK.md`
> (ongoing SSoT) and `LESSONS-LEARNED.md`. Branch `feature/upgrade-and-bug-fixing`,
> fully merged to `main` (`982933fa`). Cloud Supabase at migration **0→53** and in sync.

## What is shipped and live on `main`

### People, roles & access
- **11 roles**: admin, manager, accountant, staff, owner, tenant, guest, service_provider,
  and the three managed-minor roles child_owner / child_tenant / child_guest. Parent↔child
  is a `guardianships` ReBAC relationship, not extra roles.
- **Admin "Control Center"** (`/dashboard/admin`): add / edit / change-email / suspend /
  **remove** (KVKK anonymize: scrub PII, keep financial+audit records, ban login), grant
  Guest/Service-Provider roles, a **unified "Needs your approval" inbox**, and oversight
  tiles (people, money, property, services, recent activity) in plain business language.
- Security: adversarial-reviewed; 9 findings fixed + independently re-verified; suspend &
  remove now enforced in depth (auth ban + app check + DB rule mig 50).

### New-role capabilities
- **Wallet** (double-entry ledger, demo credit — provider-swappable), **activities /
  extra-services** (age-gated bookings), **guardianship** (add child + demo consent,
  allowance, approve/see bookings, kid-mode dashboard), **vendor invoicing** (internal,
  e-Fatura-ready). Accountant view consumes all of it (cross-role money movement).

### Whole-app UX
- **Landing page**: smooth mobile scroll animations (RLS-safe reduced-motion), plain
  end-user language (no SLA/KYC/jargon), proper Turkish diacritics, subtle modern ribbons.
- **"i" info button on every module** (plain "what this does" in 4 locales) + honest
  **"coming soon" banners** on the not-live features (each says what it needs).
- **Zero em dashes** anywhere in the app.

### AI assistant (re-architected, leak-proof)
- Two assistants: the **public landing concierge** (data-blind by construction) and the
  **dashboard assistant** (role-scoped).
- **No-leak enforced at retrieval time**: the model is grounded only on rows returned
  under the caller's own JWT (Postgres RLS), never a wider prompt. **Cloud-verified
  leak-proof** with the real model live (~30 adversarial cross-scope probes, all safe).
- **Guardrails that act**: block prompt injection, redact ungrounded output, decline
  out-of-scope gracefully; recommend-never-act preserved; deterministic 5xx-proof fallback.
- **Per-user/role memory** (role-stamped, admin/manager read-only company audit = the
  hierarchy, 90-day retention, erased on removal). **Observability** trace table +
  **eval/leak-test harness** (`scripts/ai-eval-harness.mjs`, golden set, exits non-zero on
  any leak).

## Technical state
- `main` = `982933fa`; local = origin (0 unpushed). Cloud DB **up to date at 0→53**.
- **Full Playwright suite: 752 passed / 8 skipped / 0 failed.** typecheck / lint / build green.
- Six demo logins `<role>@cati-demo.com` (original 6) + five new-role test accounts
  (`guest`, `provider`, `child.owner/tenant/guest @cati-demo.com`, shared test password).

## Deliberately deferred (documented, decision/infra-gated — NOT missed work)
- Real card/bank **payments** (needs a provider contract + keys)
- Official **e-Fatura** submission (needs an accredited integrator + fiscal certificate)
- Automatic **door/access** control (needs door hardware + API)
- **Messaging** (WhatsApp/SMS/email) (needs a provider + sender numbers)
- Automatic **bank-statement import** (needs a bank data feed)
- **Document semantic search** (pgvector) (needs the on-prem AI gateway to expose an
  embeddings endpoint) — shown as "coming soon"
- Editable **platform settings**; **owner/tenant wallet top-up**
- **Semantic caching**: deliberately NOT built (cross-user leak/poisoning risk)

## Genuinely needs the client
- **Rotate the six shared role passwords** (were shared in chat).
- Provide the gateway **embeddings** endpoint to unlock document search.
- A live deployed spot-check per role (Vercel env is set).

## Next steps
A per-role functionality + friction review is producing a prioritized roadmap
(quick wins to reduce daily friction + a few bigger bets). See the roadmap doc /
`PROJECT-HANDBOOK` once finalized.
