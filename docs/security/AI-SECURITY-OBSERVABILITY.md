# 1Cati Security and AI Observability Notes

Stand: 8. Juli 2026

## Scope

This note documents the extra hardening applied for the video/UAT phase:

- No object-detail routes expose ticket, unit, resident, document, or booking IDs in the browser address bar. The only dynamic route segment in the app is the locale.
- API access still treats all client-provided IDs and unit numbers as untrusted input. Server-side RBAC and unit-scope checks remain mandatory.
- Browser responses now include defensive headers for referrer protection, clickjacking protection, MIME sniffing protection, permissions lockdown, and CSP.
- Dashboard and API responses are marked private, non-cacheable, and non-indexable.
- Public AI telemetry records redacted previews and safety/evaluation metadata, not raw sensitive visitor content.
- Public AI responses include deterministic evaluation metadata: grounding status, source count, drift score, private-data safety, and flags.
- Internal AI responses include role-scope evaluation metadata: active role, resource boundary, RBAC guard state, prompt-injection signal, sensitive-action signal, and human-approval requirement.

## AI Guardrails

The public landing-page assistant remains data-blind by design. It can explain 1Cati, New Level Premium, registration, security, languages, finance/service concepts, and premium services. It cannot access or disclose residents, balances, documents, passwords, phone numbers, or unit-specific internal data.

The internal operations assistant remains role-aware. It can draft recommendations and service-ticket drafts, but sensitive actions such as payment, refund, deposit, access, role, or permission changes require human approval.

## Premium-Service Coverage

Waleri's requested services are now covered in product copy, service catalog, public AI answers, and the New Level visual section:

- Spa and wellness
- Restaurant use and owner benefits
- Theater, amphitheatre, and events
- Excursions, tours, quad, jeep, bike, and mountain activities
- Mini club and play area

## QA Evidence

New automated coverage:

- `apps/web/e2e/api/security-observability-functional.spec.ts`
- Included in `pnpm --filter cati-web test:e2e:structured`

Key checks:

- Security headers on public pages
- `no-store` and `noindex` on private API responses
- Public AI private-data refusal with drift/evaluation metadata
- Internal AI RBAC guard with prompt-injection and sensitive-action evaluation metadata
