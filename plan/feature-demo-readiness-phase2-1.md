---
goal: Demo-Readiness Overhaul — Phase 2 (CRM Dashboard, AI Assistant, Visual Polish, Pitch Deck)
version: 2.1
date_created: 2026-06-18
last_updated: 2026-06-18
owner: WAMOCON Engineering
status: 'In progress'
tags: [feature, demo, ui, ai, crm, phase2]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Transform the current 1Çatı landing page + placeholder dashboard into a convincing, client-demo-ready application. The goal is a smooth, beautiful, fast CRM experience that simulates a live Twenty CRM integration, an AI assistant, and real property-management workflows. The static pitch deck will be upgraded to match the premium look and include interactive simulations.

## 1. Requirements & Constraints

- **REQ-001**: No backend/Supabase credentials available for this phase. All CRM, AI, and sync features must work with realistic mock data and deterministic simulations.
- **REQ-002**: Dashboard must show live-looking modules for Listings, Leads, Deals, Tickets, Calendar, EİDS Compliance, Finance, Documents, Reports, Users, and Settings based on RBAC.
- **REQ-003**: AI assistant must be visible in the dashboard, provide contextual suggestions per role, and generate plausible responses with a typing effect.
- **REQ-004**: UI must feel premium: glassmorphism, 3D CSS transforms, animated SVG charts, smooth page transitions, cohesive light/dark theme.
- **REQ-005**: All new UI text must be fully translatable (`tr`, `en`, `de`, `ru`).
- **REQ-006**: E2E suite must remain green (22/22).
- **REQ-007**: Pitch deck (`apps/pitch/index.html`) must be visually upgraded with product mockups, ROI calculator, animated sections, and consistent theme.
- **REQ-008**: Performance must be prioritized: lazy load heavy components, minimize bundle impact, use CSS/SVG over heavy JS libraries.
- **CON-001**: Do not add large dependencies (e.g. Three.js, Recharts) unless absolutely necessary. Prefer SVG/CSS and lightweight custom components.
- **CON-002**: Do not mutate git history; do not commit unless explicitly asked.
- **SEC-001**: Demo mode must remain clearly labeled as demo; no fake claims of production backend connectivity.

## 2. Implementation Steps

### Implementation Phase 1 — Mock Data & Services Foundation

- GOAL-001: Build a deterministic mock data layer that all dashboard modules consume.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `apps/web/lib/demo-data.ts` with typed entities: properties, leads, deals, tickets, activities, EİDS records, financial snapshots, user directory, and AI suggestion templates. | | |
| TASK-002 | Create `apps/web/hooks/use-demo-data.ts` to serve data with simulated async latency and refresh capability. | | |
| TASK-003 | Create `apps/web/lib/ai-responses.ts` with role-aware response generators and suggestion prompts. | | |
| TASK-004 | Create `apps/web/components/sync-badge.tsx` showing simulated Twenty CRM sync status and last sync time. | | |

### Implementation Phase 2 — Premium Reusable Visual Components

- GOAL-002: Add reusable 3D/animated/chart components without new dependencies.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Create `apps/web/components/animated-counter.tsx` for smooth number transitions. | | |
| TASK-006 | Create `apps/web/components/charts/pie-chart.tsx` (SVG, animated) for lead sources/deal status. | | |
| TASK-007 | Create `apps/web/components/charts/bar-chart.tsx` (SVG, animated) for monthly revenue/listings. | | |
| TASK-008 | Create `apps/web/components/charts/line-chart.tsx` (SVG, animated) for pipeline trend. | | |
| TASK-009 | Create `apps/web/components/3d-card.tsx` with CSS perspective tilt and glow. | | |
| TASK-010 | Create `apps/web/components/ai-assistant.tsx` floating panel with typing animation and suggestion chips. | | |
| TASK-011 | Create `apps/web/components/data-table.tsx` simple reusable table with sorting/search. | | |
| TASK-012 | Create `apps/web/components/status-badge.tsx` for EİDS/deal/ticket status. | | |

### Implementation Phase 3 — Dashboard Overhaul

- GOAL-003: Replace placeholder dashboard with a rich, role-aware command center.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Rewrite `apps/web/app/[locale]/dashboard/page.tsx` with KPI header, chart grid, recent activity, EİDS alerts, and AI assistant. | | |
| TASK-014 | Wire sidebar menu links to actual module routes instead of `#`. | | |
| TASK-015 | Create module pages: `/dashboard/listings`, `/dashboard/leads`, `/dashboard/tickets`, `/dashboard/calendar`, `/dashboard/compliance`, `/dashboard/finance`, `/dashboard/documents`, `/dashboard/reports`, `/dashboard/users`, `/dashboard/settings`. | | |
| TASK-016 | Each module page must show real-looking data, status badges, search/filter UI, and action buttons (simulated). | | |

### Implementation Phase 4 — AI Assistant Integration

- GOAL-004: Make the AI assistant feel connected and useful in the demo.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Add AI assistant to dashboard layout (`apps/web/app/[locale]/dashboard/layout.tsx`). | | |
| TASK-018 | Implement prompt handling: lead scoring, property recommendations, EİDS risk check, daily summary. | | |
| TASK-019 | Add contextual suggestion chips based on current role and page. | | |

### Implementation Phase 5 — Pitch Deck Upgrade

- GOAL-005: Make the pitch deck visually stunning and demo-worthy.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | Upgrade `apps/pitch/index.html` with premium dark gradient theme, glass cards, 3D CSS product mockups, animated charts, and interactive ROI calculator. | | |
| TASK-021 | Add embedded screenshots/mockups of the new dashboard. | | |
| TASK-022 | Add `prefers-reduced-motion` and print CSS. | | |

### Implementation Phase 6 — Translations & QA

- GOAL-006: Ensure all copy is localized and tests pass.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Audit all new keys in `apps/web/messages/*.json` and add missing translations. | | |
| TASK-024 | Update E2E selectors if needed for new dashboard copy. | | |
| TASK-025 | Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:e2e`. | | |

## 3. Alternatives

- **ALT-001**: Use Recharts for charts. Rejected to avoid extra dependency and keep bundle small; custom SVG charts are sufficient for a demo and look more bespoke.
- **ALT-002**: Use Three.js for 3D. Rejected due to bundle size and overkill for dashboard cards; CSS 3D transforms deliver the premium effect at near-zero cost.
- **ALT-003**: Build a real backend API. Rejected because no Supabase credentials are configured and the goal is a client demo, not production deployment.

## 4. Dependencies

- **DEP-001**: Existing stack: Next.js 16, React 19, Tailwind v4, Framer Motion, GSAP, Lucide icons, shadcn/ui Base-Nova.
- **DEP-002**: `framer-motion` for animations; `lucide-react` for icons.
- **DEP-003**: No new runtime dependencies planned.

## 5. Files

- **FILE-001**: `apps/web/lib/demo-data.ts` — mock entities
- **FILE-002**: `apps/web/lib/ai-responses.ts` — AI response generator
- **FILE-003**: `apps/web/hooks/use-demo-data.ts` — data hook
- **FILE-004**: `apps/web/components/charts/*.tsx` — chart components
- **FILE-005**: `apps/web/components/3d-card.tsx`, `ai-assistant.tsx`, `data-table.tsx`, `status-badge.tsx`, `sync-badge.tsx`, `animated-counter.tsx`
- **FILE-006**: `apps/web/app/[locale]/dashboard/page.tsx` — main dashboard
- **FILE-007**: `apps/web/app/[locale]/dashboard/layout.tsx` — dashboard shell with AI assistant
- **FILE-008**: `apps/web/app/[locale]/dashboard/*/page.tsx` — module pages
- **FILE-009**: `apps/web/messages/*.json` — translations
- **FILE-010**: `apps/pitch/index.html` — upgraded pitch deck

## 6. Testing

- **TEST-001**: `pnpm test:e2e` must pass 22/22.
- **TEST-002**: Manual smoke test of dashboard modules and AI assistant.
- **TEST-003**: Visual check of pitch deck in desktop, mobile, and print modes.

## 7. Risks & Assumptions

- **RISK-001**: Scope is large for one session; may need to prioritize dashboard + AI over every module page.
- **RISK-002**: E2E selectors may break with new dashboard copy; mitigated by using test IDs and role-aware locators.
- **ASSUMPTION-001**: Client demo does not require real backend writes; simulated actions are acceptable.

## 8. Related Specifications / Further Reading

- `AGENTS.md`
- `plan/feature-demo-readiness-phase2-1.md`
