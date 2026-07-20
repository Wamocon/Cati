// Deterministic seed data layer for the 1Cati client workspace.
// All values are realistic but synthetic for local development and QA.

import { Role } from "./rbac"

export type PropertyType = "apartment" | "villa" | "penthouse" | "land" | "commercial"
export type DealStage = "new" | "contacted" | "viewing" | "offer" | "negotiation" | "closed_won" | "closed_lost"
export type TicketPriority = "low" | "medium" | "high" | "urgent"
export type TicketStatus = "open" | "in_progress" | "waiting_parts" | "resolved" | "closed"
export type EidsStatus = "authorized" | "pending" | "expiring" | "revoked" | "not_required"

export interface Property {
  id: string
  title: string
  type: PropertyType
  city: string
  district: string
  priceTry: number
  priceEur: number
  priceUsd: number
  bedrooms: number | null
  bathrooms: number | null
  areaM2: number
  eidsStatus: EidsStatus
  status: "active" | "reserved" | "sold" | "rented" | "inactive"
  owner: string
  agent: string
  imageGradient: string
  listedAt: string
}

export interface Lead {
  id: string
  name: string
  source: "whatsapp" | "instagram" | "website" | "referral" | "office"
  status: "new" | "hot" | "warm" | "cold" | "converted"
  language: "tr" | "ru" | "en" | "de"
  budgetEur: number
  interest: string
  agent: string
  lastContact: string
  score: number
}

export interface Deal {
  id: string
  propertyId: string
  propertyTitle: string
  clientName: string
  stage: DealStage
  valueEur: number
  commissionEur: number
  probability: number
  expectedClose: string
  agent: string
}

export interface Ticket {
  id: string
  propertyId: string
  propertyTitle: string
  title: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  assignedTo: string
  createdAt: string
  photos: number
}

export interface Activity {
  id: string
  type: "call" | "viewing" | "task" | "note" | "email" | "whatsapp" | "deal" | "ticket"
  message: string
  actor: string
  createdAt: string
  iconColor: string
}

export interface EidsRecord {
  id: string
  propertyId: string
  propertyTitle: string
  owner: string
  status: EidsStatus
  expiresAt: string | null
  authorizedAt: string | null
}

export interface FinancialSnapshot {
  month: string
  revenueTry: number
  revenueEur: number
  commissionTry: number
  expensesTry: number
  dealsClosed: number
}

export interface UserDirectoryEntry {
  id: string
  name: string
  role: Role
  email: string
  phone: string
  office: string
  activeDeals: number
}

export interface DashboardSummary {
  activeListings: number
  totalListings: number
  openLeads: number
  hotLeads: number
  openTickets: number
  urgentTickets: number
  activeDeals: number
  dealsWonThisMonth: number
  revenueThisMonthTry: number
  revenueThisMonthEur: number
  eidsPending: number
  eidsExpiring: number
  occupancyRate: number
}

function currency(amount: number, currency: "TRY" | "EUR" | "USD") {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount)
}

export function formatTry(n: number) {
  return currency(n, "TRY")
}

export function formatEur(n: number) {
  return currency(n, "EUR")
}

export function formatUsd(n: number) {
  return currency(n, "USD")
}

const cities = ["Alanya", "Antalya", "Kargıcak", "Mahmutlar", "Oba", "Konyaaltı"]
const districts: Record<string, string[]> = {
  Alanya: ["Kargıcak", "Mahmutlar", "Oba", "Avsallar", "Tosmur"],
  Antalya: ["Konyaaltı", "Lara", "Muratpaşa", "Kepez"],
  Kargıcak: ["Center", "Beach Zone", "Hillside"],
  Mahmutlar: ["Center", "Barbaros", "Kestel Border"],
}

const owners = [
  "Elena Sokolova",
  "Mehmet Yılmaz",
  "Sergey Petrov",
  "Ayşe Kaya",
  "Mustafa Demir",
  "Anna Kuznetsova",
  "Oleg Ivanov",
  "Fatma Şahin",
]

const agents = ["Mehmet", "Ayşe", "Can", "Elena", "Sergey", "Deniz", "Olga"]

const gradients = [
  "from-rose-400 to-orange-300",
  "from-amber-300 to-yellow-200",
  "from-emerald-400 to-teal-300",
  "from-sky-400 to-indigo-300",
  "from-violet-400 to-purple-300",
  "from-fuchsia-400 to-pink-300",
  "from-cyan-400 to-blue-300",
  "from-lime-400 to-green-300",
]

function seedRandom(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const rand = seedRandom(20260618)

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

function dateDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function dateDaysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export const properties: Property[] = Array.from({ length: 48 }).map((_, i) => {
  const city = pick(cities)
  const district = pick(districts[city] || ["Center"])
  const type = pick<PropertyType>(["apartment", "villa", "penthouse", "land", "commercial"])
  const priceEur = type === "land" ? 60000 + Math.floor(rand() * 200000) : 90000 + Math.floor(rand() * 650000)
  const areaM2 = type === "land" ? 400 + Math.floor(rand() * 1200) : 55 + Math.floor(rand() * 220)
  const eidsStatuses: EidsStatus[] = ["authorized", "authorized", "authorized", "pending", "expiring", "revoked", "not_required"]
  const status = pick<"active" | "reserved" | "sold" | "rented" | "inactive">([
    "active",
    "active",
    "active",
    "active",
    "reserved",
    "sold",
    "rented",
    "inactive",
  ])
  return {
    id: `P-${1001 + i}`,
    title: `${type === "apartment" ? "Daire" : type === "villa" ? "Villa" : type === "penthouse" ? "Penthouse" : type === "land" ? "Arsa" : "Ticari"} #${1001 + i}, ${district}`,
    type,
    city,
    district,
    priceEur,
    priceTry: priceEur * 37,
    priceUsd: priceEur * 1.08,
    bedrooms: type === "land" || type === "commercial" ? null : 1 + Math.floor(rand() * 4),
    bathrooms: type === "land" || type === "commercial" ? null : 1 + Math.floor(rand() * 3),
    areaM2,
    eidsStatus: pick(eidsStatuses),
    status,
    owner: pick(owners),
    agent: pick(agents),
    imageGradient: pick(gradients),
    listedAt: dateDaysAgo(Math.floor(rand() * 180)),
  }
})

export const leads: Lead[] = Array.from({ length: 36 }).map((_, i) => {
  const sources: Lead["source"][] = ["whatsapp", "instagram", "website", "referral", "office"]
  const statuses: Lead["status"][] = ["new", "hot", "warm", "cold", "converted"]
  const languages: Lead["language"][] = ["ru", "en", "de", "tr"]
  const status = pick(statuses)
  return {
    id: `L-${2001 + i}`,
    name: pick([
      "Anna K.",
      "Sergey P.", "Li W.", "Olga M.", "Hans M.", "Maria G.", "David B.", "Irina V.", "Alexei N.", "Thomas K.",
    ]),
    source: pick(sources),
    status,
    language: pick(languages),
    budgetEur: 80000 + Math.floor(rand() * 500000),
    interest: pick(["Alanya apartment", "Kargıcak villa", "Antalya investment", "Mahmutlar penthouse", "Commercial shop", "Land plot"]),
    agent: pick(agents),
    lastContact: dateDaysAgo(Math.floor(rand() * 14)),
    score: status === "hot" ? 80 + Math.floor(rand() * 19) : status === "converted" ? 90 + Math.floor(rand() * 10) : 30 + Math.floor(rand() * 50),
  }
})

export const deals: Deal[] = Array.from({ length: 24 }).map((_, i) => {
  const property = properties[i % properties.length]
  const stages: DealStage[] = ["new", "contacted", "viewing", "offer", "negotiation", "closed_won", "closed_lost"]
  const stage = pick(stages)
  const valueEur = property.priceEur
  return {
    id: `D-${3001 + i}`,
    propertyId: property.id,
    propertyTitle: property.title,
    clientName: pick(owners),
    stage,
    valueEur,
    commissionEur: Math.round(valueEur * 0.03),
    probability: stage === "closed_won" ? 100 : stage === "closed_lost" ? 0 : 20 + Math.floor(rand() * 70),
    expectedClose: dateDaysFromNow(stage === "closed_won" ? -Math.floor(rand() * 30) : Math.floor(rand() * 60)),
    agent: property.agent,
  }
})

export const tickets: Ticket[] = Array.from({ length: 28 }).map((_, i) => {
  const property = properties[i % properties.length]
  const priorities: TicketPriority[] = ["low", "medium", "high", "urgent"]
  const statuses: TicketStatus[] = ["open", "in_progress", "waiting_parts", "resolved", "closed"]
  return {
    id: `T-${4001 + i}`,
    propertyId: property.id,
    propertyTitle: property.title,
    title: pick([
      "Su kaçağı tespiti",
      "Klima bakımı",
      "Boya tadilatı",
      "Elektrik arızası",
      "Kapı kilidi değişimi",
      "Havuz temizliği",
      "Mobilya montajı",
      "Cam filmi değişimi",
    ]),
    description: "Owner reported issue via WhatsApp. Technician assigned and scheduled.",
    priority: pick(priorities),
    status: pick(statuses),
    assignedTo: pick(["Teknisyen Ahmet", "Teknisyen Burak", "Teknisyen Cem"]),
    createdAt: dateDaysAgo(Math.floor(rand() * 21)),
    photos: Math.floor(rand() * 5),
  }
})

export const eidsRecords: EidsRecord[] = properties
  .filter((p) => p.type !== "land")
  .slice(0, 32)
  .map((p) => ({
    id: `E-${p.id}`,
    propertyId: p.id,
    propertyTitle: p.title,
    owner: p.owner,
    status: p.eidsStatus,
    expiresAt: p.eidsStatus === "authorized" || p.eidsStatus === "expiring" ? dateDaysFromNow(7 + Math.floor(rand() * 170)) : null,
    authorizedAt: p.eidsStatus === "authorized" || p.eidsStatus === "expiring" ? dateDaysAgo(30 + Math.floor(rand() * 300)) : null,
  }))

export const activities: Activity[] = Array.from({ length: 40 }).map((_, i) => {
  const types: Activity["type"][] = ["call", "viewing", "task", "note", "email", "whatsapp", "deal", "ticket"]
  const type = pick(types)
  const property = pick(properties)
  const lead = pick(leads)
  const messages: Record<Activity["type"], string> = {
    call: `Called ${lead.name} about ${lead.interest}`,
    viewing: `Scheduled viewing for ${property.title}`,
    task: `Created follow-up task for ${property.agent}`,
    note: `Added note to ${property.title}`,
    email: `Sent contract draft to ${property.owner}`,
    whatsapp: `Replied to ${lead.name} on WhatsApp`,
    deal: `Moved ${property.title} deal to next stage`,
    ticket: `Updated maintenance ticket for ${property.title}`,
  }
  return {
    id: `A-${5001 + i}`,
    type,
    message: messages[type],
    actor: pick(agents),
    createdAt: dateDaysAgo(Math.floor(rand() * 7)),
    iconColor: pick([
      "text-blue-500",
      "text-emerald-500",
      "text-amber-500",
      "text-rose-500",
      "text-violet-500",
      "text-cyan-500",
    ]),
  }
})

export const financialHistory: FinancialSnapshot[] = Array.from({ length: 12 }).map((_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - 11 + i)
  const dealsClosed = 4 + Math.floor(rand() * 12)
  const revenueEur = dealsClosed * (120000 + Math.floor(rand() * 80000))
  return {
    month: d.toLocaleString("en-US", { month: "short" }),
    revenueTry: revenueEur * 37,
    revenueEur,
    commissionTry: revenueEur * 37 * 0.03,
    expensesTry: revenueEur * 37 * 0.12,
    dealsClosed,
  }
})

export const users: UserDirectoryEntry[] = Array.from({ length: 16 }).map((_, i) => {
  const roles: Role[] = [
    "admin",
    "manager",
    "accountant",
    "staff",
    "staff",
    "owner",
    "owner",
    "tenant",
    "tenant",
  ]
  return {
    id: `U-${6001 + i}`,
    name: pick([...owners, ...agents]),
    role: pick(roles),
    email: `user${i}@cati.local`,
    phone: `+90 549 557 ${7000 + i}`,
    office: pick(["Alanya HQ", "Antalya Branch", "Mahmutlar Office"]),
    activeDeals: Math.floor(rand() * 8),
  }
})

export function getDashboardSummary(): DashboardSummary {
  const activeListings = properties.filter((p) => p.status === "active").length
  const openLeads = leads.filter((l) => l.status !== "converted" && l.status !== "cold").length
  const hotLeads = leads.filter((l) => l.status === "hot").length
  const openTickets = tickets.filter((t) => t.status !== "closed" && t.status !== "resolved").length
  const urgentTickets = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed").length
  const activeDeals = deals.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost").length
  const wonThisMonth = deals.filter(
    (d) => d.stage === "closed_won" && new Date(d.expectedClose).getMonth() === new Date().getMonth()
  ).length
  const lastMonth = financialHistory[financialHistory.length - 1]
  return {
    activeListings,
    totalListings: properties.length,
    openLeads,
    hotLeads,
    openTickets,
    urgentTickets,
    activeDeals,
    dealsWonThisMonth: wonThisMonth,
    revenueThisMonthTry: lastMonth.revenueTry,
    revenueThisMonthEur: lastMonth.revenueEur,
    eidsPending: eidsRecords.filter((e) => e.status === "pending").length,
    eidsExpiring: eidsRecords.filter((e) => e.status === "expiring").length,
    occupancyRate: 86,
  }
}

export function getLeadSourceDistribution() {
  const sources: Lead["source"][] = ["whatsapp", "instagram", "website", "referral", "office"]
  return sources.map((source) => ({
    label: source,
    value: leads.filter((l) => l.source === source).length,
    color:
      source === "whatsapp"
        ? "#22c55e"
        : source === "instagram"
          ? "#f43f5e"
          : source === "website"
            ? "#3b82f6"
            : source === "referral"
              ? "#f59e0b"
              : "#8b5cf6",
  }))
}

export function getDealStageDistribution() {
  const stages: DealStage[] = ["new", "contacted", "viewing", "offer", "negotiation", "closed_won", "closed_lost"]
  return stages.map((stage) => ({
    label: stage,
    value: deals.filter((d) => d.stage === stage).length,
  }))
}

export function getMonthlyRevenue() {
  return financialHistory.map((f) => ({
    label: f.month,
    value: f.revenueEur,
    commission: Math.round(f.commissionTry / 37),
  }))
}
