// Phase 3 of the AI re-architecture: RLS-SCOPED AI grounding retrieval.
//
// The one rule that matters: every fact used to ground the dashboard assistant is
// fetched with the REQUEST-SCOPED Supabase client that carries the CALLER'S OWN
// JWT/cookies (lib/supabase/server.ts -> createClient()). Postgres Row Level
// Security therefore filters rows BEFORE the deterministic answer or the LLM ever
// sees them. A leak is architecturally impossible: admin/manager "see more" only
// because they pass more RLS policies, never because of a wider query or prompt.
//
// Client choice (verified against the code, see PR notes):
//   * getFinanceLedgerData()      -> supabase.from("finance_ledger_entries") under
//     the caller JWT. RLS policy `finance_ledger_read_by_role_and_relationship`
//     (migration 24) returns base ledger rows ONLY to admin/accountant/manager
//     (own site). owner/tenant/staff/guest/child roles get ZERO rows.
//   * getServiceTicketQueueData() -> read_service_ticket_queue_safe (a hardened
//     SECURITY DEFINER *projection* that re-applies the exact per-row predicate
//     current_user_can_view_service_ticket(t.id) plus finance/operations field
//     redaction; migration 20). Row output is identical to what the caller's RLS
//     would allow, so it is leak-safe per row and per field.
//
// Deliberately NOT used for grounding: get_site_dashboard_snapshot,
// get_phase4_site_data and search_operational_records are SECURITY DEFINER and
// scope ONLY by company_id (they bypass RLS and return company-wide rows). Using
// them to ground a tenant/owner/guest would leak another unit's data, so this
// layer never touches them.
//
// Fallbacks (preserve the local/QA + e2e seed path and the 5xx-proof guarantee):
// when Supabase is not configured, when RLS returns no authorized rows, or on ANY
// retrieval error, this returns the existing deterministic seed framing unchanged
// and marks source = "local-seed", grounded = false. In the test/eval environment
// Supabase is blanked, so retrieval always takes the seed path and the golden set
// + AI e2e behavior is byte-for-byte identical to before Phase 3.

import { hasPermission, type Resource, type Role } from "./rbac"
import { isSupabaseConfigured, type UserProfile } from "./auth"
import type { AiLanguage } from "./ai-responses"
import {
  getFinanceLedgerData,
  getServiceTicketQueueData,
  type DataSource,
  type FinanceLedgerData,
  type ServiceTicketQueueData,
} from "./site-management-repository"

/** A single grounding fact tagged with the source row it was read from. */
export interface AiGroundingFact {
  label: string
  value: string
  /** Citation: "<table>:<id>" or "<table>:summary" for aggregates. */
  source: string
}

export interface AiGroundingContext {
  /** "supabase" only when live, RLS-authorized rows were used; else "local-seed". */
  source: DataSource
  /** True only when live RLS-scoped rows grounded the answer. */
  grounded: boolean
  /**
   * The grounding string used for BOTH the deterministic reply AND the LLM system
   * context AND the output-groundedness guard. On the seed path this equals the
   * caller's role-safe deterministic answer, byte-for-byte.
   */
  text: string
  /** Structured, cited facts (empty on the seed path). */
  facts: AiGroundingFact[]
  /** RLS-scoped readers/tables consulted (for observability / debugging). */
  readers: string[]
}

const liveHeader: Record<AiLanguage, string> = {
  tr: "Yetki kapsamınıza göre canlı veriler (RLS ile satır bazında filtrelendi)",
  en: "Live data within your authorized scope (row-filtered by RLS)",
  de: "Live-Daten in Ihrem zulässigen Bereich (zeilenweise durch RLS gefiltert)",
  ru: "Актуальные данные в пределах вашего доступа (построчная фильтрация RLS)",
}

const factLabels = {
  openLedger: {
    tr: "Açık defter toplamı",
    en: "Open ledger total",
    de: "Offener Buchsaldo",
    ru: "Итого открытый журнал",
  },
  overdueLedger: {
    tr: "Vadesi geçen tutar",
    en: "Overdue amount",
    de: "Überfälliger Betrag",
    ru: "Просроченная сумма",
  },
  legalAccounts: {
    tr: "Yasal/90+ gün riskli hesap",
    en: "Legal / 90+ day accounts",
    de: "Rechts-/90+-Tage-Konten",
    ru: "Счета с юр./90+ риском",
  },
  ledgerEntry: {
    tr: "Defter kaydı",
    en: "Ledger entry",
    de: "Buchungszeile",
    ru: "Запись журнала",
  },
  openTickets: {
    tr: "Açık servis talebi",
    en: "Open service tickets",
    de: "Offene Servicetickets",
    ru: "Открытые заявки",
  },
  overdueTickets: {
    tr: "SLA dışı talep",
    en: "SLA-breached tickets",
    de: "SLA-verletzte Tickets",
    ru: "Заявки с нарушением SLA",
  },
  urgentTickets: {
    tr: "Acil talep",
    en: "Urgent tickets",
    de: "Dringende Tickets",
    ru: "Срочные заявки",
  },
  ticket: {
    tr: "Servis talebi",
    en: "Service ticket",
    de: "Serviceticket",
    ru: "Сервисная заявка",
  },
} as const satisfies Record<string, Record<AiLanguage, string>>

function label(key: keyof typeof factLabels, language: AiLanguage): string {
  return factLabels[key][language] ?? factLabels[key].tr
}

function formatMoneyCents(cents: number, currency: string): string {
  const amount = (Number(cents) || 0) / 100
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "₺"
  return `${symbol}${amount.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`
}

function collectFinanceFacts(
  finance: FinanceLedgerData,
  language: AiLanguage,
  facts: AiGroundingFact[]
): void {
  const summary = finance.summary
  // RLS returns zero rows for roles that cannot read the base ledger; skip empty
  // aggregates so an authorized-but-empty view never emits misleading "0" noise.
  if (summary.openLedgerCents === 0 && finance.entries.length === 0) return

  facts.push({
    label: label("openLedger", language),
    value: formatMoneyCents(summary.openLedgerCents, summary.currency),
    source: "finance_ledger_entries:summary",
  })
  facts.push({
    label: label("overdueLedger", language),
    value: formatMoneyCents(summary.overdueLedgerCents, summary.currency),
    source: "finance_ledger_entries:summary",
  })
  if (summary.legalAccounts > 0) {
    facts.push({
      label: label("legalAccounts", language),
      value: String(summary.legalAccounts),
      source: "finance_ledger_entries:summary",
    })
  }
  for (const entry of finance.entries.slice(0, 2)) {
    const unit = entry.unitNo ?? "-"
    const detail = entry.description ?? entry.entryType
    facts.push({
      label: label("ledgerEntry", language),
      value: `${unit} ${detail} ${formatMoneyCents(entry.amountCents, entry.currency)}`,
      source: `finance_ledger_entries:${entry.id}`,
    })
  }
}

function collectTicketFacts(
  tickets: ServiceTicketQueueData,
  language: AiLanguage,
  facts: AiGroundingFact[]
): void {
  const summary = tickets.summary
  // An authorized-but-empty ticket scope (RLS returned nothing) grounds nothing.
  if (summary.totalTickets === 0 && tickets.tickets.length === 0) return

  facts.push({
    label: label("openTickets", language),
    value: String(summary.openTickets),
    source: "service_tickets:summary",
  })
  facts.push({
    label: label("overdueTickets", language),
    value: String(summary.overdueTickets),
    source: "service_tickets:summary",
  })
  if (summary.urgentTickets > 0) {
    facts.push({
      label: label("urgentTickets", language),
      value: String(summary.urgentTickets),
      source: "service_tickets:summary",
    })
  }
  for (const ticket of tickets.tickets.slice(0, 2)) {
    facts.push({
      label: label("ticket", language),
      value: `${ticket.flatNumber} ${ticket.title} (SLA ${ticket.slaHoursRemaining}h, ${ticket.priority})`,
      source: `service_tickets:${ticket.id}`,
    })
  }
}

function buildGroundedText(
  baseAnswer: string,
  facts: AiGroundingFact[],
  language: AiLanguage
): string {
  const header = liveHeader[language] ?? liveHeader.tr
  const lines = facts.map((fact) => `- ${fact.label}: ${fact.value} [${fact.source}]`)
  return `${baseAnswer}\n\n${header}:\n${lines.join("\n")}`
}

function seedContext(baseAnswer: string, readers: string[] = []): AiGroundingContext {
  return { source: "local-seed", grounded: false, text: baseAnswer, facts: [], readers }
}

/**
 * Retrieve the RLS-scoped grounding context for a dashboard AI turn.
 *
 * @param baseAnswer The caller's role-safe deterministic answer (the existing
 *   generateAiResponse output). It is the framing base for the live-grounded
 *   answer AND the seed fallback, so the seed path stays byte-for-byte identical.
 *
 * The resource comes from the Phase-2 access decision and is already known to be
 * permitted for the role (the RBAC intent gate ran first in the route). This
 * function only READS authorized data; it never widens scope. Which readers run
 * is gated by BOTH the role's permission AND the requested resource, but the
 * ultimate boundary is Postgres RLS on the caller's JWT: even if the gating were
 * wrong, an unauthorized row can never be returned to the caller.
 */
export async function retrieveAiGroundingContext(params: {
  profile: UserProfile
  role: Role
  language: AiLanguage
  message: string
  resource?: Resource
  baseAnswer: string
}): Promise<AiGroundingContext> {
  const { role, language, resource, baseAnswer } = params

  // Not configured -> deterministic seed framing, no DB access. Preserves the
  // local/QA + e2e seed path and the 5xx-proof guarantee.
  if (!isSupabaseConfigured()) {
    return seedContext(baseAnswer)
  }

  try {
    const facts: AiGroundingFact[] = []
    const readers: string[] = []

    const generalIntent = resource === undefined
    const financeIntent =
      resource === "finance" || resource === "reports" || generalIntent
    const ticketIntent =
      resource === "tickets" ||
      resource === "calendar" ||
      resource === "listings" ||
      resource === "reports" ||
      generalIntent

    // Both gates require the role's own view permission AND the requested
    // resource. RLS is still the real boundary underneath each reader.
    const financeAllowed = financeIntent && hasPermission(role, "finance", "view")
    const ticketsAllowed = ticketIntent && hasPermission(role, "tickets", "view")

    if (financeAllowed) {
      const finance = await getFinanceLedgerData({ limit: 6 })
      if (finance.source === "supabase") {
        readers.push("finance_ledger_entries")
        collectFinanceFacts(finance, language, facts)
      }
    }

    if (ticketsAllowed) {
      const tickets = await getServiceTicketQueueData({
        limit: 6,
        // Only live, RLS-authorized rows or a throw (caught below). Never a silent
        // seed mix into a "supabase"-sourced grounding.
        allowLocalSeedFallback: false,
      })
      if (tickets.source === "supabase") {
        readers.push("service_tickets")
        collectTicketFacts(tickets, language, facts)
      }
    }

    // No authorized live rows (RLS returned nothing, or the resource has no live
    // reader wired here): keep the role-safe seed framing, mark not-grounded.
    if (facts.length === 0) {
      return seedContext(baseAnswer, readers)
    }

    return {
      source: "supabase",
      grounded: true,
      text: buildGroundedText(baseAnswer, facts, language),
      facts,
      readers,
    }
  } catch {
    // Any retrieval error -> deterministic seed framing (5xx-proof, no leak).
    return seedContext(baseAnswer)
  }
}
