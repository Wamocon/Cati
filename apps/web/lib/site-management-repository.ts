import { createClient } from "@/lib/supabase/server"
import { isDemoAuthEnabled, isSupabaseConfigured } from "@/lib/auth"
import {
  documentVault,
  flats,
  getSummary,
  residents,
  serviceTickets,
} from "@/lib/site-management-data"

export type DataSource = "supabase" | "demo-fallback"

export interface DashboardSnapshot {
  source: DataSource
  generatedAt: string
  company: {
    id: string
    name: string
    slug?: string
    currency?: string
  }
  site: {
    id: string
    name: string
    code?: string
    city?: string
    district?: string
    totalUnits?: number
  }
  summary: {
    totalUnits: number
    occupiedUnits: number
    vacantUnits: number
    blockedUnits: number
    openTickets: number
    overdueTickets: number
    openLedgerCents: number
    activeReservations: number
    pendingAiActions: number
  }
  units: Array<Record<string, unknown>>
  tickets: Array<Record<string, unknown>>
  recentActions: Array<Record<string, unknown>>
  warning?: string
}

export interface OperationalSearchResult {
  entityTable: string
  entityId: string | null
  entityExternalId: string | null
  title: string
  summary: string | null
  rank: number
  metadata: Record<string, unknown>
}

export interface ClientActionInput {
  actionType: string
  entityTable?: string | null
  entityId?: string | null
  entityExternalId?: string | null
  title?: string | null
  metadata?: Record<string, unknown>
}

export interface ClientActionResult {
  id: string
  source: DataSource
  status: "logged" | "demo-logged"
}

function demoSnapshot(warning?: string): DashboardSnapshot {
  const summary = getSummary()

  return {
    source: "demo-fallback",
    generatedAt: new Date().toISOString(),
    company: {
      id: "demo-company",
      name: "Ataberk Estate",
      slug: "ataberk-estate",
      currency: "TRY",
    },
    site: {
      id: "demo-site",
      name: "New Level Premium Avsallar",
      code: "NLP-AVS",
      city: "Alanya",
      district: "Avsallar",
      totalUnits: summary.totalFlats,
    },
    summary: {
      totalUnits: summary.totalFlats,
      occupiedUnits: summary.occupiedFlats,
      vacantUnits: summary.vacantFlats,
      blockedUnits: summary.blockedFlats,
      openTickets: summary.openTickets,
      overdueTickets: summary.overdueTickets,
      openLedgerCents: summary.totalDebtTry * 100,
      activeReservations: summary.activeBookings,
      pendingAiActions: summary.aiRiskCount,
    },
    units: flats.slice(0, 48).map((flat) => ({
      id: flat.id,
      unit_no: flat.number,
      unit_type: flat.type,
      occupancy_status: flat.status,
      ownership_status: flat.residentType,
      balance_try: flat.balanceTry,
    })),
    tickets: serviceTickets.slice(0, 12).map((ticket) => ({
      id: ticket.id,
      ticket_no: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      status: ticket.status,
      category: ticket.category,
      estimated_cost_cents: ticket.estimatedCostTry * 100,
    })),
    recentActions: [],
    warning,
  }
}

function canUseDemoFallback() {
  return isDemoAuthEnabled()
}

function normalizeSnapshot(payload: unknown): DashboardSnapshot {
  const value = payload as Partial<DashboardSnapshot> | null
  if (!value || typeof value !== "object") {
    throw new Error("Dashboard snapshot payload is invalid.")
  }

  return {
    source: "supabase",
    generatedAt:
      typeof value.generatedAt === "string"
        ? value.generatedAt
        : new Date().toISOString(),
    company:
      value.company && typeof value.company === "object"
        ? (value.company as DashboardSnapshot["company"])
        : { id: "unknown", name: "Unknown company" },
    site:
      value.site && typeof value.site === "object"
        ? (value.site as DashboardSnapshot["site"])
        : { id: "unknown", name: "Unknown site" },
    summary:
      value.summary && typeof value.summary === "object"
        ? (value.summary as DashboardSnapshot["summary"])
        : demoSnapshot().summary,
    units: Array.isArray(value.units) ? value.units : [],
    tickets: Array.isArray(value.tickets) ? value.tickets : [],
    recentActions: Array.isArray(value.recentActions)
      ? value.recentActions
      : [],
  }
}

function normalizeSearchRows(payload: unknown): OperationalSearchResult[] {
  if (!Array.isArray(payload)) return []

  return payload.map((row) => {
    const record = row as Record<string, unknown>
    return {
      entityTable: String(record.entity_table ?? ""),
      entityId:
        typeof record.entity_id === "string" ? record.entity_id : null,
      entityExternalId:
        typeof record.entity_external_id === "string"
          ? record.entity_external_id
          : null,
      title: String(record.title ?? ""),
      summary: typeof record.summary === "string" ? record.summary : null,
      rank: Number(record.rank ?? 0),
      metadata:
        record.metadata && typeof record.metadata === "object"
          ? (record.metadata as Record<string, unknown>)
          : {},
    }
  })
}

function demoSearch(query: string, limit: number): OperationalSearchResult[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []

  const records: OperationalSearchResult[] = [
    ...flats.map((flat) => ({
      entityTable: "units",
      entityId: null,
      entityExternalId: flat.id,
      title: `${flat.number} unit`,
      summary: `${flat.ownerName} ${flat.residentName} ${flat.status} ${flat.paymentStatus}`,
      rank: 1,
      metadata: { unitNo: flat.number },
    })),
    ...serviceTickets.map((ticket) => ({
      entityTable: "service_tickets",
      entityId: null,
      entityExternalId: ticket.id,
      title: `${ticket.id} ${ticket.title}`,
      summary: `${ticket.flatNumber} ${ticket.category} ${ticket.priority} ${ticket.status}`,
      rank: 1,
      metadata: { ticketNo: ticket.id },
    })),
    ...residents.map((resident) => ({
      entityTable: "residents",
      entityId: null,
      entityExternalId: resident.id,
      title: resident.name,
      summary: `${resident.flatNumber} ${resident.phone} ${resident.email} ${resident.language}`,
      rank: 1,
      metadata: { flatNumber: resident.flatNumber },
    })),
    ...documentVault.map((document) => ({
      entityTable: "documents",
      entityId: null,
      entityExternalId: document.id,
      title: document.name,
      summary: `${document.flatNumber} ${document.ownerName} ${document.category} ${document.status}`,
      rank: 1,
      metadata: { documentId: document.id },
    })),
  ]

  return records
    .filter((record) =>
      `${record.title} ${record.summary ?? ""} ${record.entityExternalId ?? ""}`
        .toLowerCase()
        .includes(normalized)
    )
    .slice(0, Math.min(Math.max(limit, 1), 50))
}

function isUuid(value: string | null | undefined) {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  )
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!isSupabaseConfigured()) {
    return demoSnapshot("Supabase is not configured; using deterministic demo data.")
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("get_site_dashboard_snapshot")
    if (error) throw error
    return normalizeSnapshot(data)
  } catch (error) {
    if (canUseDemoFallback()) {
      return demoSnapshot(
        "Supabase snapshot failed; demo fallback is enabled for this environment."
      )
    }
    throw error
  }
}

export async function searchOperationalRecords(
  query: string,
  limit = 20
): Promise<{ source: DataSource; results: OperationalSearchResult[] }> {
  if (!isSupabaseConfigured()) {
    return { source: "demo-fallback", results: demoSearch(query, limit) }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("search_operational_records", {
      p_query: query,
      p_limit: limit,
    })
    if (error) throw error
    return { source: "supabase", results: normalizeSearchRows(data) }
  } catch (error) {
    if (canUseDemoFallback()) {
      return { source: "demo-fallback", results: demoSearch(query, limit) }
    }
    throw error
  }
}

export async function logClientAction(
  input: ClientActionInput
): Promise<ClientActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      id: `demo-action-${Date.now()}`,
      source: "demo-fallback",
      status: "demo-logged",
    }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("log_client_action", {
      p_action_type: input.actionType,
      p_entity_table: input.entityTable ?? null,
      p_entity_id: isUuid(input.entityId) ? input.entityId : null,
      p_entity_external_id: input.entityExternalId ?? null,
      p_title: input.title ?? null,
      p_metadata: input.metadata ?? {},
    })
    if (error) throw error
    return {
      id: typeof data === "string" ? data : `action-${Date.now()}`,
      source: "supabase",
      status: "logged",
    }
  } catch (error) {
    if (canUseDemoFallback()) {
      return {
        id: `demo-action-${Date.now()}`,
        source: "demo-fallback",
        status: "demo-logged",
      }
    }
    throw error
  }
}
