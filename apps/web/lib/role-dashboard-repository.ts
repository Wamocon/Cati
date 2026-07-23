import type { UserProfile } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/auth"
import { getOwnerFinanceData } from "@/lib/owner-finance-repository"
import {
  accessibleUnitsForRole,
  visibleBookingsForRole,
  visibleDocumentsForRole,
  visibleServiceTicketsForRole,
} from "@/lib/role-scoped-views"
import {
  getFinanceLedgerData,
  getServiceTicketQueueData,
} from "@/lib/site-management-repository"
import {
  bookings,
  documentVault,
  flats,
  getDebtAccounts,
} from "@/lib/site-management-data"
import { createClient } from "@/lib/supabase/server"

export const ROLE_DASHBOARD_CONTRACT_VERSION = "role-dashboard.v1" as const

export type FocusedDashboardRole = "accountant" | "staff" | "owner" | "tenant"
export type RoleDashboardSource = "supabase" | "local-seed"
export type RoleDashboardScope =
  | "company-finance"
  | "assigned-work"
  | "verified-owner-units"
  | "verified-tenant-units"

export type RoleDashboardMetricKey =
  | "activeReservations"
  | "assignedTasks"
  | "documents"
  | "openBalance"
  | "openEntries"
  | "openTickets"
  | "overdueBalance"
  | "overdueEntries"
  | "overdueTasks"
  | "postedEntries"
  | "scopedUnits"
  | "urgentTickets"

export interface RoleDashboardMetric {
  key: RoleDashboardMetricKey
  value: number
  format: "count" | "currency"
  currency?: string
  href: string
}

export interface RoleDashboardUnit {
  id: string
  unitNo: string
  occupancyStatus: string
}

export interface RoleDashboardItem {
  id: string
  kind: "booking" | "document" | "finance" | "task" | "ticket"
  title: string
  context: string | null
  status: string
  timestamp: string | null
  unitNo: string | null
  href: string
}

export interface RoleDashboardSnapshot {
  contractVersion: typeof ROLE_DASHBOARD_CONTRACT_VERSION
  role: FocusedDashboardRole
  source: RoleDashboardSource
  generatedAt: string
  scope: RoleDashboardScope
  realtimeTables: string[]
  metrics: RoleDashboardMetric[]
  units: RoleDashboardUnit[]
  priorityItems: RoleDashboardItem[]
  warning?: string
}

const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"
const CLOSED_TICKET_STATUSES = new Set(["cancelled", "closed", "resolved"])
const CLOSED_TASK_STATUSES = new Set(["cancelled", "closed", "resolved"])
const ACTIVE_RESERVATION_STATUSES = new Set([
  "confirmed",
  "deposit_review",
  "move_in_today",
  "precheck_pending",
  "scheduled",
])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function relatedRecord(value: unknown) {
  if (Array.isArray(value)) return asRecord(value[0])
  return asRecord(value)
}

function unitNoFromRow(row: Record<string, unknown>) {
  return asNullableString(relatedRecord(row.units).unit_no)
}

function byNewest(left: RoleDashboardItem, right: RoleDashboardItem) {
  const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0
  const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0
  return rightTime - leftTime
}

function isFocusedDashboardRole(
  role: UserProfile["role"]
): role is FocusedDashboardRole {
  return (
    role === "accountant" ||
    role === "staff" ||
    role === "owner" ||
    role === "tenant"
  )
}

function localUnits(role: "owner" | "tenant") {
  const allowed = accessibleUnitsForRole(role) ?? new Set<string>()
  return flats
    .filter((flat) => allowed.has(flat.number))
    .map((flat) => ({
      id: flat.id,
      unitNo: flat.number,
      occupancyStatus: flat.status,
    }))
}

async function localAccountantSnapshot(): Promise<RoleDashboardSnapshot> {
  // "Open" is every unit that still carries an outstanding balance (dues not
  // yet settled); "overdue" is the genuinely past-due subset (overdue + legal
  // aging). getDebtAccounts() only returns the top ~32 debtors, which are all
  // already overdue/legal, so it must NOT double as the "open" population, or
  // the open and overdue tiles collapse into the same figure.
  const openAccounts = flats.filter((flat) => flat.balanceTry > 0)
  const overdueAccounts = openAccounts.filter(
    (flat) => flat.paymentStatus === "overdue" || flat.paymentStatus === "legal"
  )
  const priorityAccounts = getDebtAccounts()

  return {
    contractVersion: ROLE_DASHBOARD_CONTRACT_VERSION,
    role: "accountant",
    source: "local-seed",
    generatedAt: new Date().toISOString(),
    scope: "company-finance",
    realtimeTables: ["finance_ledger_entries"],
    metrics: [
      {
        key: "openBalance",
        value: openAccounts.reduce(
          (sum, flat) => sum + flat.balanceTry * 100,
          0
        ),
        format: "currency",
        currency: "TRY",
        href: "/dashboard/finance",
      },
      {
        key: "overdueBalance",
        value: overdueAccounts.reduce(
          (sum, flat) => sum + flat.balanceTry * 100,
          0
        ),
        format: "currency",
        currency: "TRY",
        href: "/dashboard/finance",
      },
      {
        key: "openEntries",
        value: openAccounts.length,
        format: "count",
        href: "/dashboard/finance",
      },
      {
        key: "overdueEntries",
        value: overdueAccounts.length,
        format: "count",
        href: "/dashboard/reports",
      },
    ],
    units: [],
    priorityItems: priorityAccounts.slice(0, 8).map((account) => ({
      id: `qa-finance-${account.flatId}`,
      kind: "finance",
      title: account.flatNumber,
      context: account.suggestedAction,
      status: account.paymentStatus,
      timestamp: account.lastPaymentAt,
      unitNo: account.flatNumber,
      href: "/dashboard/finance",
    })),
    warning:
      "Controlled local QA projection. No production finance records are connected.",
  }
}

async function localStaffSnapshot(): Promise<RoleDashboardSnapshot> {
  const queue = await getServiceTicketQueueData({
    limit: 100,
    allowLocalSeedFallback: true,
    useLocalAccessProfile: true,
  })
  // The single local staff access profile represents Ahmet in the Technical
  // team. Keep the QA view deterministic and assignment-scoped instead of
  // presenting the entire workforce queue as if it belonged to one person.
  const tasks = queue.workforceTasks.filter(
    (task) => task.assignee === "Teknik - Ahmet" || task.team === "Teknik"
  )
  const ticketIds = new Set(tasks.map((task) => task.ticketId))
  const tickets = queue.tickets.filter((ticket) => ticketIds.has(ticket.id))
  const openTasks = tasks.filter(
    (task) => !CLOSED_TASK_STATUSES.has(task.status)
  )
  const openTickets = tickets.filter(
    (ticket) => !CLOSED_TICKET_STATUSES.has(ticket.status)
  )

  return {
    contractVersion: ROLE_DASHBOARD_CONTRACT_VERSION,
    role: "staff",
    source: "local-seed",
    generatedAt: new Date().toISOString(),
    scope: "assigned-work",
    realtimeTables: [
      "workforce_tasks",
      "service_tickets",
      "service_ticket_events",
      "media_reports",
    ],
    metrics: [
      {
        key: "assignedTasks",
        value: openTasks.length,
        format: "count",
        href: "/dashboard/tickets",
      },
      {
        key: "overdueTasks",
        value: openTasks.filter((task) => task.slaHoursRemaining < 0).length,
        format: "count",
        href: "/dashboard/tickets",
      },
      {
        key: "openTickets",
        value: openTickets.length,
        format: "count",
        href: "/dashboard/tickets",
      },
      {
        key: "urgentTickets",
        value: openTickets.filter((ticket) => ticket.priority === "urgent")
          .length,
        format: "count",
        href: "/dashboard/tickets",
      },
    ],
    units: [],
    priorityItems: tasks.slice(0, 8).map((task) => ({
      id: task.id,
      kind: "task",
      title: task.title,
      context: task.team,
      status: task.status,
      timestamp: task.lastUpdateAt,
      unitNo: task.flatNumber,
      href: "/dashboard/tickets",
    })),
    warning: "Controlled local QA staff persona (Ahmet / Technical team).",
  }
}

async function localResidentSnapshot(
  role: "owner" | "tenant"
): Promise<RoleDashboardSnapshot> {
  const queue = await getServiceTicketQueueData({
    limit: 100,
    allowLocalSeedFallback: true,
    useLocalAccessProfile: true,
  })
  const units = localUnits(role)
  const allowedUnitNos = new Set(units.map((unit) => unit.unitNo))
  const scopedTickets = visibleServiceTicketsForRole(
    role,
    queue.tickets
  ).filter((ticket) => allowedUnitNos.has(ticket.flatNumber))
  const scopedBookings = visibleBookingsForRole(role, bookings).filter(
    (booking) => allowedUnitNos.has(booking.flatNumber)
  )
  const scopedDocuments = visibleDocumentsForRole(role, documentVault).filter(
    (document) => allowedUnitNos.has(document.flatNumber)
  )
  const openTickets = scopedTickets.filter(
    (ticket) => !CLOSED_TICKET_STATUSES.has(ticket.status)
  )
  const activeReservations = scopedBookings.filter((booking) =>
    ACTIVE_RESERVATION_STATUSES.has(booking.status)
  )
  const ownerFinance =
    role === "owner"
      ? await getOwnerFinanceData({ limit: 100, useLocalAccessProfile: true })
      : null

  const priorityItems: RoleDashboardItem[] = [
    ...scopedTickets.map((ticket) => ({
      id: ticket.id,
      kind: "ticket" as const,
      title: ticket.title,
      context: ticket.category,
      status: ticket.status,
      timestamp: ticket.openedAt,
      unitNo: ticket.flatNumber,
      href: "/dashboard/tickets",
    })),
    ...scopedBookings.map((booking) => ({
      id: booking.id,
      kind: "booking" as const,
      title: booking.resourceName ?? booking.guestName,
      context: booking.approvalStatus ?? null,
      status: booking.status,
      timestamp: booking.checkIn,
      unitNo: booking.flatNumber,
      href: "/dashboard/calendar",
    })),
    ...scopedDocuments.map((document) => ({
      id: document.id,
      kind: "document" as const,
      title: document.name,
      context: document.category,
      status: document.status,
      timestamp: document.updatedAt,
      unitNo: document.flatNumber,
      href: "/dashboard/documents",
    })),
  ]

  return {
    contractVersion: ROLE_DASHBOARD_CONTRACT_VERSION,
    role,
    source: "local-seed",
    generatedAt: new Date().toISOString(),
    scope: role === "owner" ? "verified-owner-units" : "verified-tenant-units",
    realtimeTables:
      role === "owner"
        ? ["units", "service_tickets", "reservations", "documents"]
        : ["units", "service_tickets", "reservations", "documents"],
    metrics: [
      {
        key: "scopedUnits",
        value: units.length,
        format: "count",
        href: "/dashboard/documents",
      },
      ...(role === "owner" &&
      ownerFinance &&
      ownerFinance.summary.openBalanceCents !== null
        ? [
            {
              key: "openBalance" as const,
              value: ownerFinance.summary.openBalanceCents,
              format: "currency" as const,
              currency: ownerFinance.summary.currency,
              href: "/dashboard/finance",
            },
          ]
        : []),
      {
        key: "openTickets",
        value: openTickets.length,
        format: "count",
        href: "/dashboard/tickets",
      },
      {
        key: "activeReservations",
        value: activeReservations.length,
        format: "count",
        href: "/dashboard/calendar",
      },
      {
        key: "documents",
        value: scopedDocuments.length,
        format: "count",
        href: "/dashboard/documents",
      },
    ],
    units,
    priorityItems: priorityItems.sort(byNewest).slice(0, 8),
    warning:
      "Controlled local QA relationship projection; unit numbers are demo-only.",
  }
}

async function liveAccountantSnapshot(): Promise<RoleDashboardSnapshot> {
  const finance = await getFinanceLedgerData({ limit: 40 })

  return {
    contractVersion: ROLE_DASHBOARD_CONTRACT_VERSION,
    role: "accountant",
    source: finance.source,
    generatedAt: finance.generatedAt,
    scope: "company-finance",
    realtimeTables: ["finance_ledger_entries"],
    metrics: [
      {
        key: "openBalance",
        value: finance.summary.openLedgerCents,
        format: "currency",
        currency: finance.summary.currency,
        href: "/dashboard/finance",
      },
      {
        key: "overdueBalance",
        value: finance.summary.overdueLedgerCents,
        format: "currency",
        currency: finance.summary.currency,
        href: "/dashboard/finance",
      },
      {
        key: "openEntries",
        value: finance.summary.openEntries,
        format: "count",
        href: "/dashboard/finance",
      },
      {
        key: "postedEntries",
        value: finance.summary.postedEntries,
        format: "count",
        href: "/dashboard/reports",
      },
    ],
    units: [],
    priorityItems: finance.entries.slice(0, 8).map((entry) => ({
      id: entry.id,
      kind: "finance",
      title: entry.unitNo ?? entry.entryType,
      context: entry.description,
      status: entry.status,
      timestamp: entry.postedAt ?? entry.dueDate,
      unitNo: entry.unitNo,
      href: "/dashboard/finance",
    })),
    warning: finance.warning,
  }
}

async function liveStaffSnapshot(): Promise<RoleDashboardSnapshot> {
  const supabase = await createClient()
  const [taskResponse, ticketResponse] = await Promise.all([
    supabase
      .from("workforce_tasks")
      .select(
        "id, task_no, title, team, status, priority, sla_due_at, updated_at, units(unit_no)"
      )
      .order("sla_due_at", { ascending: true, nullsFirst: false })
      .limit(250),
    supabase
      .from("service_tickets")
      .select(
        "id, ticket_no, title, category, status, priority, sla_due_at, updated_at, units(unit_no)"
      )
      .order("sla_due_at", { ascending: true, nullsFirst: false })
      .limit(250),
  ])
  if (taskResponse.error) throw taskResponse.error
  if (ticketResponse.error) throw ticketResponse.error

  const tasks = Array.isArray(taskResponse.data)
    ? taskResponse.data.map(asRecord)
    : []
  const tickets = Array.isArray(ticketResponse.data)
    ? ticketResponse.data.map(asRecord)
    : []
  const openTasks = tasks.filter(
    (task) => !CLOSED_TASK_STATUSES.has(asString(task.status))
  )
  const openTickets = tickets.filter(
    (ticket) => !CLOSED_TICKET_STATUSES.has(asString(ticket.status))
  )
  const now = Date.now()

  return {
    contractVersion: ROLE_DASHBOARD_CONTRACT_VERSION,
    role: "staff",
    source: "supabase",
    generatedAt: new Date().toISOString(),
    scope: "assigned-work",
    realtimeTables: [
      "workforce_tasks",
      "service_tickets",
      "service_ticket_events",
      "media_reports",
    ],
    metrics: [
      {
        key: "assignedTasks",
        value: openTasks.length,
        format: "count",
        href: "/dashboard/tickets",
      },
      {
        key: "overdueTasks",
        value: openTasks.filter((task) => {
          const dueAt = asNullableString(task.sla_due_at)
          return dueAt ? new Date(dueAt).getTime() < now : false
        }).length,
        format: "count",
        href: "/dashboard/tickets",
      },
      {
        key: "openTickets",
        value: openTickets.length,
        format: "count",
        href: "/dashboard/tickets",
      },
      {
        key: "urgentTickets",
        value: openTickets.filter((ticket) => ticket.priority === "urgent")
          .length,
        format: "count",
        href: "/dashboard/tickets",
      },
    ],
    units: [],
    priorityItems: openTasks.slice(0, 8).map((task) => ({
      id: asString(task.id, asString(task.task_no)),
      kind: "task",
      title: asString(task.title, asString(task.task_no, "Assigned task")),
      context: asNullableString(task.team),
      status: asString(task.status, "open"),
      timestamp:
        asNullableString(task.updated_at) ?? asNullableString(task.sla_due_at),
      unitNo: unitNoFromRow(task),
      href: "/dashboard/tickets",
    })),
  }
}

async function liveResidentSnapshot(
  role: "owner" | "tenant"
): Promise<RoleDashboardSnapshot> {
  const supabase = await createClient()
  const unitResponse = await supabase
    .from("units")
    .select("id, unit_no, occupancy_status")
    .order("unit_no", { ascending: true })
    .limit(250)
  if (unitResponse.error) throw unitResponse.error

  const unitRows = Array.isArray(unitResponse.data)
    ? unitResponse.data.map(asRecord)
    : []
  const units = unitRows.flatMap((unit) => {
    const id = asString(unit.id)
    const unitNo = asString(unit.unit_no)
    return id && unitNo
      ? [
          {
            id,
            unitNo,
            occupancyStatus: asString(unit.occupancy_status, "unknown"),
          },
        ]
      : []
  })
  const unitIds = units.map((unit) => unit.id)

  const [ticketResponse, bookingResponse, documentResponse, ownerFinance] =
    await Promise.all([
      unitIds.length
        ? supabase
            .from("service_tickets")
            .select(
              "id, ticket_no, title, category, status, priority, created_at, updated_at, unit_id, units(unit_no)"
            )
            .in("unit_id", unitIds)
            .order("updated_at", { ascending: false })
            .limit(250)
        : Promise.resolve({ data: [], error: null }),
      unitIds.length
        ? supabase
            .from("reservations")
            .select(
              "id, resource_name, status, approval_status, check_in_at, updated_at, unit_id, units(unit_no)"
            )
            .in("unit_id", unitIds)
            .order("check_in_at", { ascending: true })
            .limit(250)
        : Promise.resolve({ data: [], error: null }),
      unitIds.length
        ? supabase
            .from("documents")
            .select(
              "id, title, category, status, review_status, visibility, updated_at, unit_id, units(unit_no)"
            )
            .in("unit_id", unitIds)
            .order("updated_at", { ascending: false })
            .limit(250)
        : Promise.resolve({ data: [], error: null }),
      role === "owner"
        ? getOwnerFinanceData({ limit: 100 })
        : Promise.resolve(null),
    ])
  if (ticketResponse.error) throw ticketResponse.error
  if (bookingResponse.error) throw bookingResponse.error
  if (documentResponse.error) throw documentResponse.error

  const tickets = Array.isArray(ticketResponse.data)
    ? ticketResponse.data.map(asRecord)
    : []
  const reservations = Array.isArray(bookingResponse.data)
    ? bookingResponse.data.map(asRecord)
    : []
  const documents = Array.isArray(documentResponse.data)
    ? documentResponse.data.map(asRecord)
    : []
  const openTickets = tickets.filter(
    (ticket) => !CLOSED_TICKET_STATUSES.has(asString(ticket.status))
  )
  const activeReservations = reservations.filter((reservation) =>
    ACTIVE_RESERVATION_STATUSES.has(asString(reservation.status))
  )

  const priorityItems: RoleDashboardItem[] = [
    ...tickets.map((ticket) => ({
      id: asString(ticket.id, asString(ticket.ticket_no)),
      kind: "ticket" as const,
      title: asString(
        ticket.title,
        asString(ticket.ticket_no, "Service request")
      ),
      context: asNullableString(ticket.category),
      status: asString(ticket.status, "open"),
      timestamp:
        asNullableString(ticket.updated_at) ??
        asNullableString(ticket.created_at),
      unitNo: unitNoFromRow(ticket),
      href: "/dashboard/tickets",
    })),
    ...reservations.map((reservation) => ({
      id: asString(reservation.id),
      kind: "booking" as const,
      title: asString(reservation.resource_name, "Reservation"),
      context: asNullableString(reservation.approval_status),
      status: asString(reservation.status, "scheduled"),
      timestamp:
        asNullableString(reservation.updated_at) ??
        asNullableString(reservation.check_in_at),
      unitNo: unitNoFromRow(reservation),
      href: "/dashboard/calendar",
    })),
    ...documents.map((document) => ({
      id: asString(document.id),
      kind: "document" as const,
      title: asString(document.title, "Document"),
      context: asNullableString(document.category),
      status: asString(
        document.review_status,
        asString(document.status, "active")
      ),
      timestamp: asNullableString(document.updated_at),
      unitNo: unitNoFromRow(document),
      href: "/dashboard/documents",
    })),
  ]

  return {
    contractVersion: ROLE_DASHBOARD_CONTRACT_VERSION,
    role,
    source: "supabase",
    generatedAt: new Date().toISOString(),
    scope: role === "owner" ? "verified-owner-units" : "verified-tenant-units",
    realtimeTables:
      role === "owner"
        ? ["units", "service_tickets", "reservations", "documents"]
        : ["units", "service_tickets", "reservations", "documents"],
    metrics: [
      {
        key: "scopedUnits",
        value: units.length,
        format: "count",
        href: "/dashboard/documents",
      },
      ...(role === "owner" &&
      ownerFinance &&
      ownerFinance.summary.openBalanceCents !== null
        ? [
            {
              key: "openBalance" as const,
              value: ownerFinance.summary.openBalanceCents,
              format: "currency" as const,
              currency: ownerFinance.summary.currency,
              href: "/dashboard/finance",
            },
          ]
        : []),
      {
        key: "openTickets",
        value: openTickets.length,
        format: "count",
        href: "/dashboard/tickets",
      },
      {
        key: "activeReservations",
        value: activeReservations.length,
        format: "count",
        href: "/dashboard/calendar",
      },
      {
        key: "documents",
        value: documents.length,
        format: "count",
        href: "/dashboard/documents",
      },
    ],
    units,
    priorityItems: priorityItems.sort(byNewest).slice(0, 8),
  }
}

export async function getRoleDashboardSnapshot(
  profile: UserProfile
): Promise<RoleDashboardSnapshot> {
  if (!isFocusedDashboardRole(profile.role)) {
    throw new Error("This endpoint supports focused role dashboards only.")
  }

  const useLocalAccessProfile =
    !isSupabaseConfigured() || profile.id === LOCAL_ACCESS_PROFILE_ID
  if (useLocalAccessProfile) {
    if (profile.role === "accountant") return localAccountantSnapshot()
    if (profile.role === "staff") return localStaffSnapshot()
    return localResidentSnapshot(profile.role)
  }

  if (profile.role === "accountant") return liveAccountantSnapshot()
  if (profile.role === "staff") return liveStaffSnapshot()
  return liveResidentSnapshot(profile.role)
}
