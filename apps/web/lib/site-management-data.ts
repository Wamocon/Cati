import {
  newLevelPremiumBlocks,
  newLevelPremiumDataset,
  newLevelPremiumUnits,
  type NewLevelPremiumSaleStatus,
} from "./new-level-premium-data"

// Deterministic local backend data for the residential site-management CRM.
// The model is shaped around the client request: 769 flats, service, finance,
// bookings, access control, deposits, debt restrictions, and AI work queues.

export type FlatStatus = "occupied" | "vacant" | "reserved" | "maintenance" | "blocked"
export type AccessStatus = "active" | "restricted" | "pending" | "disabled"
export type PaymentStatus = "clear" | "minor_debt" | "overdue" | "legal"
export type ServicePriority = "low" | "medium" | "high" | "urgent"
export type ServiceStatus = "open" | "assigned" | "waiting_payment" | "in_progress" | "resolved" | "closed"
export type BookingStatus = "confirmed" | "precheck_pending" | "move_in_today" | "checkout_today" | "deposit_review" | "cancelled"
export type DepositStatus = "not_required" | "reserved" | "held" | "deduction_pending" | "refund_ready"
export type PhaseDeliveryStatus = "complete" | "ready_for_uat" | "in_progress" | "planned" | "blocked"
export type ViewingStatus = "planned" | "confirmed" | "completed" | "follow_up_due" | "no_show"
export type PaymentPlanStatus = "on_track" | "due_soon" | "overdue" | "blocked"
export type PurchaseDocumentStatus = "verified" | "pending" | "missing" | "expired" | "rejected"
export type EligibilityStatus = "qualified" | "review_required" | "blocked" | "partner_review"

export interface FlatRecord {
  id: string
  block: string
  floor: number
  floorLabel: string
  number: string
  displayNumber: string
  type: string
  areaText: string | null
  interiorM2: number | null
  outdoorM2: number | null
  saleStatus: NewLevelPremiumSaleStatus
  buyNowEur: number | null
  nextPriceEur: number[]
  priceSource: string | null
  numberingSource: string | null
  sourceNotes: string | null
  status: FlatStatus
  ownerName: string
  residentName: string
  residentType: "owner" | "tenant" | "guest" | "empty"
  phone: string
  monthlyFeeTry: number
  balanceTry: number
  depositTry: number
  accessStatus: AccessStatus
  paymentStatus: PaymentStatus
  serviceOpen: number
  bookingStatus: "none" | "incoming" | "active" | "checkout"
  lastPaymentAt: string
}

export interface ServiceTicket {
  id: string
  flatId: string
  flatNumber: string
  title: string
  category: string
  priority: ServicePriority
  status: ServiceStatus
  assignee: string
  requester: string
  openedAt: string
  dueAt: string
  slaHoursRemaining: number
  debtBlocked: boolean
  paymentVerified: boolean
  mediaCount: number
  estimatedCostTry: number
}

export type ServiceCatalogCategory =
  | "maintenance"
  | "cleaning"
  | "transfer"
  | "amenity"
  | "security"
  | "inspection"
  | "concierge"

export type ServiceDebtPolicy = "allow" | "manager_review" | "block_until_clear"
export type ServiceProviderType = "internal" | "vendor" | "mixed"
export type ServiceOrderStatus =
  | "draft"
  | "debt_check"
  | "payment_pending"
  | "task_created"
  | "assigned"
  | "completed"
  | "blocked"
  | "cancelled"
export type ServiceDebtCheckStatus = "clear" | "minor_debt_review" | "blocked"
export type ServicePaymentDecision =
  | "no_charge"
  | "collect_before_dispatch"
  | "debit_to_account"
  | "paid_or_debit_approved"
  | "hold"

export interface ServiceCatalogItem {
  id: string
  code: string
  name: string
  category: ServiceCatalogCategory
  description: string
  basePriceTry: number
  currency: "TRY"
  slaHours: number
  debtPolicy: ServiceDebtPolicy
  requiresPayment: boolean
  requiresDeposit: boolean
  team: string
  providerType: ServiceProviderType
  active: boolean
  serviceLevel: "standard" | "premium" | "emergency"
  popularityScore: number
}

export interface ServiceOrderRecord {
  id: string
  orderNo: string
  catalogItemId: string
  catalogItemName: string
  ticketId: string
  flatNumber: string
  requester: string
  status: ServiceOrderStatus
  debtCheckStatus: ServiceDebtCheckStatus
  paymentDecision: ServicePaymentDecision
  quotedPriceTry: number
  currency: "TRY"
  slaHours: number
  assignedTeam: string
  taskCreated: boolean
  requestedForAt: string
  createdAt: string
  nextAction: string
}

export interface WorkforceTaskRecord {
  id: string
  ticketId: string
  flatNumber: string
  title: string
  team: string
  assignee: string
  status: ServiceStatus
  priority: ServicePriority
  slaHoursRemaining: number
  routeSlot: string
  checklist: string[]
  requiresMedia: boolean
  mediaCount: number
  managerApprovalRequired: boolean
  lastUpdateAt: string
  fieldNote: string
  completionReadiness: number
}

export interface BookingRecord {
  id: string
  flatId: string
  flatNumber: string
  guestName: string
  channel: "Airbnb" | "Booking.com" | "Owner" | "Direct" | "Corporate"
  checkIn: string
  checkOut: string
  status: BookingStatus
  depositStatus: DepositStatus
  depositTry: number
  accessCodeStatus: AccessStatus
  cleaningStatus: "scheduled" | "in_progress" | "done" | "blocked"
}

export interface ViewingRecord {
  id: string
  leadName: string
  leadLanguage: "tr" | "en" | "de" | "ru"
  buyerGoal: "investment" | "holiday_home" | "residence" | "citizenship"
  preferredUnit: string
  channel: "WhatsApp" | "Telegram" | "Website" | "Phone" | "Partner"
  appointmentType: "online_tour" | "site_visit" | "callback" | "document_call"
  status: ViewingStatus
  scheduledAt: string
  assignedTo: string
  followUpDueAt: string
  nextAction: string
}

export interface PaymentPlanRecord {
  id: string
  dealName: string
  buyerName: string
  unitType: string
  listPriceEur: number
  downPaymentPercent: number
  paidEur: number
  nextDueEur: number
  nextDueAt: string
  currencyRisk: "low" | "medium" | "high"
  status: PaymentPlanStatus
  approvalBlocker: string
}

export interface PurchaseChecklistRecord {
  id: string
  dealName: string
  buyerName: string
  unitType: string
  documentType: "Passport" | "KYC" | "TAPU" | "Reservation" | "Sales Contract" | "EIDS" | "Payment Plan"
  status: PurchaseDocumentStatus
  owner: string
  dueAt: string
  risk: "low" | "medium" | "high"
  nextAction: string
}

export interface BuyerEligibilityRecord {
  id: string
  buyerName: string
  nationality: "DE" | "TR" | "RU" | "GB" | "AE"
  buyerGoal: "residence" | "citizenship" | "investment" | "holiday_home"
  targetUnit: string
  declaredBudgetEur: number
  appraisalRequired: boolean
  districtCheck: "clear" | "quota_review" | "restricted"
  status: EligibilityStatus
  legalPartner: string
  nextAction: string
}

export interface DebtAccount {
  flatId: string
  flatNumber: string
  ownerName: string
  balanceTry: number
  agingBucket: "0-30" | "31-60" | "61-90" | "90+"
  paymentStatus: PaymentStatus
  accessStatus: AccessStatus
  lastPaymentAt: string
  suggestedAction: string
}

export interface CashFlowPoint {
  label: string
  collectedTry: number
  outstandingTry: number
  serviceSpendTry: number
}

export interface ResidentRecord {
  id: string
  flatId: string
  flatNumber: string
  name: string
  relation: "owner" | "tenant" | "guest"
  language: "tr" | "en" | "de" | "ru"
  phone: string
  email: string
  balanceTry: number
  serviceOpen: number
  accessStatus: AccessStatus
  communicationPreference: "WhatsApp" | "Telefon" | "E-posta" | "Portal"
  riskScore: number
  lastContactAt: string
}

export interface AccessControlRecord {
  id: string
  flatId: string
  flatNumber: string
  residentName: string
  zone: "Ana Kapı" | "Otopark" | "Havuz" | "Asansör" | "Depo"
  credential: "Mobil Kod" | "Kart" | "Plaka" | "QR"
  status: AccessStatus
  reason: string
  lastEventAt: string
  riskLevel: "low" | "medium" | "high" | "critical"
}

export interface DocumentVaultRecord {
  id: string
  flatNumber: string
  ownerName: string
  name: string
  category: "Kimlik" | "Sözleşme" | "Depozito" | "Servis" | "Aidat" | "Uyum"
  status: "verified" | "pending" | "missing" | "expired"
  size: string
  updatedAt: string
  retentionRule: string
}

export interface ReportCardRecord {
  id: string
  title: string
  cadence: "Günlük" | "Haftalık" | "Aylık" | "Anlık"
  owner: string
  status: "ready" | "scheduled" | "needs_review"
  metric: string
  insight: string
}

export interface SiteSummary {
  totalFlats: number
  occupiedFlats: number
  vacantFlats: number
  maintenanceFlats: number
  blockedFlats: number
  occupancyRate: number
  totalDebtTry: number
  monthlyExpectedTry: number
  depositExposureTry: number
  openTickets: number
  overdueTickets: number
  activeBookings: number
  checkoutsToday: number
  restrictedAccess: number
  aiRiskCount: number
}

export interface BlockOverview {
  block: string
  total: number
  availableForSale: number
  sold: number
  sourceMissing: number
  minBuyNowEur: number | null
  maxBuyNowEur: number | null
  priceSourceStatus: "parsed" | "missing"
  numberingSource: string | null
  occupied: number
  vacant: number
  blocked: number
  maintenance: number
  debtTry: number
}

export interface PhaseDeliveryRecord {
  phase: number
  title: string
  status: PhaseDeliveryStatus
  owner: string
  businessOutcome: string
  userGuide: string
  evidence: string[]
}

export interface PlatformControl {
  id: string
  area: "Auth" | "RBAC" | "Audit" | "Data" | "AI"
  title: string
  status: "active" | "review" | "planned"
  owner: string
  detail: string
}

export interface AuditEvent {
  id: string
  actor: string
  action: string
  module: string
  risk: "low" | "medium" | "high"
  timestamp: string
  decision: string
}

export interface ImportBatch {
  id: string
  source: string
  totalRows: number
  validRows: number
  warningRows: number
  rejectedRows: number
  status: "validated" | "review_required" | "ready_to_apply"
  importedBy: string
  checkedAt: string
}

export interface ImportFinding {
  id: string
  severity: "info" | "warning" | "error"
  area: string
  affectedRows: number
  message: string
  recommendedAction: string
}

export interface StaffMember {
  id: string
  name: string
  role: "admin" | "manager" | "accountant" | "staff"
  team: string
  phone: string
  language: "tr" | "en" | "de" | "ru"
  activeTasks: number
  approvalLimitTry: number
  accessScope: "all_site" | "operations" | "finance_only" | "field_only" | "resident_only"
  status: "active" | "training" | "restricted"
}

export interface RoleCoverage {
  role: string
  users: number
  canApproveFinance: boolean
  canRestrictAccess: boolean
  canManageUsers: boolean
  canExportData: boolean
}

const assignees = [
  "Teknik - Ahmet",
  "Teknik - Burak",
  "Güvenlik - Selim",
  "Temizlik - Esra",
  "Muhasebe - Merve",
  "Operasyon - Can",
]

const blockNames = newLevelPremiumBlocks.map((block) => block.name)

function isoDaysFromAnchor(days: number, hour = 9) {
  const date = new Date("2026-06-24T09:00:00+03:00")
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

function paymentStatusFor(balanceTry: number): PaymentStatus {
  if (balanceTry >= 18000) return "legal"
  if (balanceTry >= 9000) return "overdue"
  if (balanceTry > 0) return "minor_debt"
  return "clear"
}

function accessStatusFor(status: FlatStatus, paymentStatus: PaymentStatus): AccessStatus {
  if (status === "blocked" || paymentStatus === "legal") return "restricted"
  if (status === "vacant" || status === "reserved") return "pending"
  if (status === "maintenance") return "disabled"
  return "active"
}

function flatStatusForSaleStatus(saleStatus: NewLevelPremiumSaleStatus, index: number): FlatStatus {
  if (saleStatus === "sold") {
    if (index % 53 === 0) return "blocked"
    if (index % 37 === 0) return "maintenance"
    return "occupied"
  }

  if (saleStatus === "available") {
    return index % 29 === 0 ? "reserved" : "vacant"
  }

  return index % 41 === 0 ? "blocked" : "vacant"
}

export const flats: FlatRecord[] = newLevelPremiumUnits.map((unit, index) => {
  const block = unit.block
  const floor = unit.floorLevel
  const number = unit.unitNo
  const saleStatus = unit.saleStatus
  const status = flatStatusForSaleStatus(saleStatus, index)
  const sizeBasis = unit.interiorM2 ?? 50
  const monthlyFeeTry = 1450 + Math.round(sizeBasis * 18) + Math.max(floor, 0) * 45
  const balanceTry =
    status === "vacant" || status === "reserved"
      ? 0
      : index % 41 === 0
        ? monthlyFeeTry * 12
        : index % 17 === 0
          ? monthlyFeeTry * 6
          : index % 7 === 0
            ? monthlyFeeTry * 2
            : 0
  const paymentStatus = paymentStatusFor(balanceTry)
  const residentType: FlatRecord["residentType"] =
    status === "vacant" || status === "maintenance" ? "empty" : index % 11 === 0 ? "guest" : index % 3 === 0 ? "tenant" : "owner"
  const ownerName =
    saleStatus === "available" ? "Satış portföyü" : "Malik kaydı bekliyor"
  const residentName =
    residentType === "empty" ? "Sakin kaydı yok" : "Sakin kaydı bekliyor"

  return {
    id: unit.id,
    block,
    floor,
    floorLabel: unit.floorLabel,
    number,
    displayNumber: unit.displayNo,
    type: unit.unitType,
    areaText: unit.areaText,
    interiorM2: unit.interiorM2,
    outdoorM2: unit.outdoorM2,
    saleStatus,
    buyNowEur: unit.buyNowEur,
    nextPriceEur: [...unit.nextPriceEur],
    priceSource: unit.priceSource,
    numberingSource: unit.numberingSource,
    sourceNotes: unit.notes,
    status,
    ownerName,
    residentName,
    residentType,
    phone: "Kaynak bekliyor",
    monthlyFeeTry,
    balanceTry,
    depositTry: residentType === "tenant" || residentType === "guest" ? monthlyFeeTry * 2 : 0,
    accessStatus: accessStatusFor(status, paymentStatus),
    paymentStatus,
    serviceOpen: index % 31 === 0 ? 2 : index % 13 === 0 ? 1 : 0,
    bookingStatus:
      residentType === "guest" && index % 5 === 0
        ? "checkout"
        : residentType === "guest"
          ? "active"
          : status === "reserved"
            ? "incoming"
            : "none",
    lastPaymentAt: isoDaysFromAnchor(-(index % 42), 11),
  }
})

function byFlatIndex(index: number) {
  return flats[index % flats.length]
}

export const serviceTickets: ServiceTicket[] = ([
  ["SRV-2401", 0, "Asansör kapısı arızası", "Asansör", "urgent", "assigned", 6, true, false, 3, 8200],
  ["SRV-2402", 17, "Daire içi su kaçağı", "Tesisat", "urgent", "in_progress", -5, false, true, 5, 12400],
  ["SRV-2403", 31, "Klima drenaj kontrolü", "İklimlendirme", "medium", "open", 18, false, true, 2, 2100],
  ["SRV-2404", 53, "Aidat borcu nedeniyle hizmet bekliyor", "Finans onayı", "high", "waiting_payment", -12, true, false, 1, 4600],
  ["SRV-2405", 76, "Ortak alan kamera kontrolü", "Güvenlik", "high", "assigned", 11, false, true, 4, 6800],
  ["SRV-2406", 101, "Check-out sonrası hasar raporu", "Depozito", "high", "open", 9, false, false, 8, 9800],
  ["SRV-2407", 142, "Elektrik pano bakımı", "Elektrik", "medium", "in_progress", 24, false, true, 2, 3500],
  ["SRV-2408", 203, "Temizlik ekibi yönlendirme", "Temizlik", "low", "resolved", 36, false, true, 6, 1750],
  ["SRV-2409", 281, "Havuz teknik ölçüm", "Ortak alan", "medium", "assigned", 20, false, true, 2, 5200],
  ["SRV-2410", 337, "Kapı giriş kartı yenileme", "Erişim", "high", "waiting_payment", -2, true, false, 1, 900],
  ["SRV-2411", 418, "Yangın sensörü testi", "Güvenlik", "medium", "closed", 48, false, true, 3, 2400],
  ["SRV-2412", 512, "Balkon camı hasar tespiti", "Hasar", "high", "open", 7, false, false, 7, 7200],
  ["SRV-2413", 604, "Otopark bariyer erişimi", "Erişim", "medium", "assigned", 15, false, true, 2, 1600],
  ["SRV-2414", 690, "Legal takip öncesi son bildirim", "Tahsilat", "urgent", "waiting_payment", -18, true, false, 0, 0],
] as const)
  .map(([id, flatIndex, title, category, priority, status, slaHoursRemaining, debtBlocked, paymentVerified, mediaCount, estimatedCostTry], i) => {
    const flat = byFlatIndex(Number(flatIndex))
    return {
      id: String(id),
      flatId: flat.id,
      flatNumber: flat.number,
      title: String(title),
      category: String(category),
      priority: priority as ServicePriority,
      status: status as ServiceStatus,
      assignee: assignees[i % assignees.length],
      requester: flat.residentName === "Boş" ? flat.ownerName : flat.residentName,
      openedAt: isoDaysFromAnchor(-((i % 8) + 1), 10),
      dueAt: isoDaysFromAnchor(Math.ceil(Number(slaHoursRemaining) / 24), 16),
      slaHoursRemaining: Number(slaHoursRemaining),
      debtBlocked: Boolean(debtBlocked),
      paymentVerified: Boolean(paymentVerified),
      mediaCount: Number(mediaCount),
      estimatedCostTry: Number(estimatedCostTry),
    }
  })

export const serviceCatalogItems: ServiceCatalogItem[] = [
  {
    id: "CAT-CLEAN-STD",
    code: "CLEAN-STD",
    name: "Standart daire temizligi",
    category: "cleaning",
    description: "Daire teslimi, kisa konaklama sonrasi temizlik ve temel sarf malzeme kontrolu.",
    basePriceTry: 2500,
    currency: "TRY",
    slaHours: 24,
    debtPolicy: "manager_review",
    requiresPayment: true,
    requiresDeposit: false,
    team: "Kat hizmetleri",
    providerType: "mixed",
    active: true,
    serviceLevel: "standard",
    popularityScore: 96,
  },
  {
    id: "CAT-CLEAN-DEEP",
    code: "CLEAN-DEEP",
    name: "Derin temizlik ve checkout hazirligi",
    category: "cleaning",
    description: "Checkout sonrasi detayli temizlik, hasar fotograflari ve depozito kontrol notu.",
    basePriceTry: 6200,
    currency: "TRY",
    slaHours: 18,
    debtPolicy: "manager_review",
    requiresPayment: true,
    requiresDeposit: true,
    team: "Kat hizmetleri",
    providerType: "mixed",
    active: true,
    serviceLevel: "premium",
    popularityScore: 88,
  },
  {
    id: "CAT-MAINT-AC",
    code: "MAINT-AC",
    name: "Klima bakimi ve drenaj kontrolu",
    category: "maintenance",
    description: "Filtre, drenaj, sogutma performansi ve servis kaniti ile periyodik klima bakimi.",
    basePriceTry: 2100,
    currency: "TRY",
    slaHours: 36,
    debtPolicy: "allow",
    requiresPayment: true,
    requiresDeposit: false,
    team: "Teknik",
    providerType: "internal",
    active: true,
    serviceLevel: "standard",
    popularityScore: 84,
  },
  {
    id: "CAT-MAINT-PLUMB",
    code: "MAINT-PLUMB",
    name: "Acil tesisat mudahalesi",
    category: "maintenance",
    description: "Su kacagi, gider tikanikligi ve acil tesisat onarimi icin hizli saha yonlendirmesi.",
    basePriceTry: 9800,
    currency: "TRY",
    slaHours: 4,
    debtPolicy: "allow",
    requiresPayment: true,
    requiresDeposit: false,
    team: "Teknik",
    providerType: "vendor",
    active: true,
    serviceLevel: "emergency",
    popularityScore: 91,
  },
  {
    id: "CAT-TRANSFER-AYT",
    code: "TRANSFER-AYT",
    name: "Antalya havalimani transferi",
    category: "transfer",
    description: "Malik, kiraci ve misafirler icin planli havalimani transferi ve varis bildirimi.",
    basePriceTry: 4500,
    currency: "TRY",
    slaHours: 48,
    debtPolicy: "block_until_clear",
    requiresPayment: true,
    requiresDeposit: false,
    team: "Rezervasyon",
    providerType: "vendor",
    active: true,
    serviceLevel: "premium",
    popularityScore: 79,
  },
  {
    id: "CAT-AMENITY-SPA",
    code: "AMENITY-SPA",
    name: "Spa, fitness ve ortak alan rezervasyonu",
    category: "amenity",
    description: "Ortak alan kapasitesi, aidat durumu ve kullanici yetkisine gore rezervasyon kontrolu.",
    basePriceTry: 0,
    currency: "TRY",
    slaHours: 12,
    debtPolicy: "block_until_clear",
    requiresPayment: false,
    requiresDeposit: false,
    team: "Sakin destek",
    providerType: "internal",
    active: true,
    serviceLevel: "standard",
    popularityScore: 73,
  },
  {
    id: "CAT-SEC-ACCESS",
    code: "SEC-ACCESS",
    name: "Kart, QR ve plaka erisim islemi",
    category: "security",
    description: "Yeni kart/QR, plaka tanimi, kayip kart iptali ve erisim log kontrolu.",
    basePriceTry: 900,
    currency: "TRY",
    slaHours: 8,
    debtPolicy: "block_until_clear",
    requiresPayment: true,
    requiresDeposit: false,
    team: "Guvenlik",
    providerType: "internal",
    active: true,
    serviceLevel: "standard",
    popularityScore: 82,
  },
  {
    id: "CAT-INSP-DAMAGE",
    code: "INSP-DAMAGE",
    name: "Hasar tespiti ve depozito raporu",
    category: "inspection",
    description: "Checkout, bakim veya sikayet sonrasi fotograf/video kanitli hasar raporu.",
    basePriceTry: 7200,
    currency: "TRY",
    slaHours: 12,
    debtPolicy: "manager_review",
    requiresPayment: false,
    requiresDeposit: true,
    team: "Operasyon",
    providerType: "internal",
    active: true,
    serviceLevel: "premium",
    popularityScore: 77,
  },
]

const catalogByCategory: Partial<Record<string, string>> = {
  Asansor: "CAT-MAINT-AC",
  Tesisat: "CAT-MAINT-PLUMB",
  Iklimlendirme: "CAT-MAINT-AC",
  "Finans onayi": "CAT-AMENITY-SPA",
  Guvenlik: "CAT-SEC-ACCESS",
  Depozito: "CAT-INSP-DAMAGE",
  Elektrik: "CAT-MAINT-AC",
  Temizlik: "CAT-CLEAN-STD",
  "Ortak alan": "CAT-AMENITY-SPA",
  Erisim: "CAT-SEC-ACCESS",
  Hasar: "CAT-INSP-DAMAGE",
  Tahsilat: "CAT-AMENITY-SPA",
}

function catalogForTicket(ticket: ServiceTicket, index: number) {
  const matchedId = catalogByCategory[ticket.category]
  return (
    serviceCatalogItems.find((item) => item.id === matchedId) ??
    serviceCatalogItems[index % serviceCatalogItems.length]
  )
}

function paymentDecisionForTicket(
  ticket: ServiceTicket,
  catalogItem: ServiceCatalogItem
): ServicePaymentDecision {
  if (ticket.debtBlocked) return "hold"
  if (!catalogItem.requiresPayment || catalogItem.basePriceTry === 0) return "no_charge"
  if (ticket.paymentVerified) return "paid_or_debit_approved"
  if (catalogItem.debtPolicy === "allow") return "debit_to_account"
  return "collect_before_dispatch"
}

function serviceOrderStatusForTicket(ticket: ServiceTicket): ServiceOrderStatus {
  if (ticket.debtBlocked) return "blocked"
  if (ticket.status === "waiting_payment") return "payment_pending"
  if (ticket.status === "resolved" || ticket.status === "closed") return "completed"
  if (ticket.status === "assigned" || ticket.status === "in_progress") return "assigned"
  return "debt_check"
}

function serviceOrderNextAction(
  ticket: ServiceTicket,
  paymentDecision: ServicePaymentDecision
) {
  if (ticket.debtBlocked) return "Muhasebe onayi ve borc kontrolu tamamlanmadan saha isine cikarma"
  if (paymentDecision === "collect_before_dispatch") return "Odeme linki veya cari hesaba borclandirma secimini onayla"
  if (ticket.status === "open") return "SLA ve ekip uygunluguna gore gorevi ata"
  if (ticket.status === "assigned") return "Personel rota ve medya kaniti talimatini gonder"
  if (ticket.status === "in_progress") return "Saha notu ve kapanis kanitini kontrol et"
  if (ticket.status === "resolved") return "Malik/kiraci memnuniyet ve kapanis onayini al"
  return "Arsiv ve rapor kontrolu"
}

export const serviceOrders: ServiceOrderRecord[] = serviceTickets.slice(0, 12).map((ticket, index) => {
  const catalogItem = catalogForTicket(ticket, index)
  const paymentDecision = paymentDecisionForTicket(ticket, catalogItem)
  const quotedPriceTry = ticket.estimatedCostTry > 0 ? ticket.estimatedCostTry : catalogItem.basePriceTry

  return {
    id: `ORD-${ticket.id.replace("SRV-", "")}`,
    orderNo: `ORD-${ticket.id.replace("SRV-", "")}`,
    catalogItemId: catalogItem.id,
    catalogItemName: catalogItem.name,
    ticketId: ticket.id,
    flatNumber: ticket.flatNumber,
    requester: ticket.requester,
    status: serviceOrderStatusForTicket(ticket),
    debtCheckStatus: ticket.debtBlocked
      ? "blocked"
      : ticket.paymentVerified
        ? "clear"
        : "minor_debt_review",
    paymentDecision,
    quotedPriceTry,
    currency: "TRY",
    slaHours: catalogItem.slaHours,
    assignedTeam: catalogItem.team,
    taskCreated: ticket.status !== "open" && !ticket.debtBlocked,
    requestedForAt: isoDaysFromAnchor(index % 4, 10 + (index % 6)),
    createdAt: ticket.openedAt,
    nextAction: serviceOrderNextAction(ticket, paymentDecision),
  }
})

const workforceChecklistByTeam: Record<string, string[]> = {
  Teknik: ["Sorunu yerinde dogrula", "Oncesi fotograf yukle", "Parca/islem notunu gir", "Kapanis kaniti yukle"],
  Guvenlik: ["Kimlik/yetki kontrolu", "Kart/QR/plaka islem kaydi", "Access log kontrolu", "Kapanis onayi"],
  "Kat hizmetleri": ["Daire giris kontrolu", "Temizlik checklist", "Fotograf kaniti", "Teslim notu"],
  Operasyon: ["Hasar alanini isaretle", "Depozito etkisini not et", "Yonetici onayi al", "Kapanis raporu"],
  Rezervasyon: ["Varis saatini dogrula", "Tedarikciyi ata", "Misafir bildirimini gonder", "Tamamlandi onayi"],
  "Sakin destek": ["Yetki kapsamını dogrula", "Randevu uygunlugunu kontrol et", "Bildirim gonder", "Geri bildirim al"],
}

function taskCompletionReadiness(ticket: ServiceTicket) {
  const evidenceScore = Math.min(ticket.mediaCount * 18, 54)
  const statusScore =
    ticket.status === "closed" || ticket.status === "resolved"
      ? 40
      : ticket.status === "in_progress"
        ? 28
        : ticket.status === "assigned"
          ? 18
          : 8
  const financePenalty = ticket.debtBlocked ? 35 : 0
  return Math.max(0, Math.min(100, evidenceScore + statusScore - financePenalty))
}

export const workforceTasks: WorkforceTaskRecord[] = serviceTickets.slice(0, 12).map((ticket, index) => {
  const catalogItem = catalogForTicket(ticket, index)
  const checklist =
    workforceChecklistByTeam[catalogItem.team] ??
    ["Talebi dogrula", "Saha notu gir", "Medya kaniti yukle", "Kapanis onayi al"]

  return {
    id: `TASK-${ticket.id.replace("SRV-", "")}`,
    ticketId: ticket.id,
    flatNumber: ticket.flatNumber,
    title: ticket.title,
    team: catalogItem.team,
    assignee: ticket.assignee,
    status: ticket.status,
    priority: ticket.priority,
    slaHoursRemaining: ticket.slaHoursRemaining,
    routeSlot:
      ticket.slaHoursRemaining < 0
        ? "Hemen"
        : index % 3 === 0
          ? "Sabah"
          : index % 3 === 1
            ? "Ogle"
            : "Aksam",
    checklist,
    requiresMedia: ticket.status !== "closed",
    mediaCount: ticket.mediaCount,
    managerApprovalRequired: ticket.debtBlocked || ticket.estimatedCostTry >= 7000,
    lastUpdateAt: isoDaysFromAnchor(-(index % 3), 9 + (index % 8)),
    fieldNote: ticket.debtBlocked
      ? "Finans onayi bekleniyor; saha aksiyonu kilitli."
      : ticket.slaHoursRemaining < 0
        ? "SLA asimi var; ekip lideri eskalasyonu gerekli."
        : "Atama ve kanit akisi hazir.",
    completionReadiness: taskCompletionReadiness(ticket),
  }
})

export const bookings: BookingRecord[] = ([
  ["BKG-501", 11, "Murat A.", "Direct", -2, 2, "move_in_today", "held", 6400, "active", "done"],
  ["BKG-502", 22, "Nina Volkova", "Booking.com", -6, 0, "checkout_today", "deduction_pending", 7200, "restricted", "scheduled"],
  ["BKG-503", 37, "Corporate Group", "Corporate", 1, 8, "precheck_pending", "reserved", 12000, "pending", "scheduled"],
  ["BKG-504", 58, "Elif D.", "Owner", 0, 5, "confirmed", "not_required", 0, "active", "done"],
  ["BKG-505", 91, "Sergey Petrov", "Airbnb", 3, 10, "confirmed", "held", 7600, "pending", "scheduled"],
  ["BKG-506", 144, "Daria P.", "Direct", -5, 0, "deposit_review", "refund_ready", 5400, "disabled", "in_progress"],
  ["BKG-507", 188, "Kemal Y.", "Booking.com", 4, 12, "confirmed", "held", 6800, "pending", "scheduled"],
  ["BKG-508", 255, "Anna K.", "Airbnb", -1, 1, "checkout_today", "deduction_pending", 8500, "restricted", "scheduled"],
  ["BKG-509", 333, "Mustafa A.", "Owner", 2, 7, "precheck_pending", "not_required", 0, "pending", "scheduled"],
  ["BKG-510", 401, "Olga I.", "Direct", 0, 6, "move_in_today", "held", 6200, "active", "done"],
] as const)
  .map(([id, flatIndex, guestName, channel, checkInOffset, checkOutOffset, status, depositStatus, depositTry, accessCodeStatus, cleaningStatus]) => {
    const flat = byFlatIndex(Number(flatIndex))
    return {
      id: String(id),
      flatId: flat.id,
      flatNumber: flat.number,
      guestName: String(guestName),
      channel: channel as BookingRecord["channel"],
      checkIn: isoDaysFromAnchor(Number(checkInOffset), 14),
      checkOut: isoDaysFromAnchor(Number(checkOutOffset), 11),
      status: status as BookingStatus,
      depositStatus: depositStatus as DepositStatus,
      depositTry: Number(depositTry),
      accessCodeStatus: accessCodeStatus as AccessStatus,
      cleaningStatus: cleaningStatus as BookingRecord["cleaningStatus"],
    }
  })

export const viewingPipeline: ViewingRecord[] = [
  {
    id: "VIEW-601",
    leadName: "Markus Weber",
    leadLanguage: "de",
    buyerGoal: "investment",
    preferredUnit: "2+1 Garden",
    channel: "Website",
    appointmentType: "online_tour",
    status: "follow_up_due",
    scheduledAt: isoDaysFromAnchor(0, 16),
    assignedTo: "Selin Satış",
    followUpDueAt: isoDaysFromAnchor(1, 10),
    nextAction: "ROI sheet and German project pack",
  },
  {
    id: "VIEW-602",
    leadName: "Elena Morozova",
    leadLanguage: "ru",
    buyerGoal: "holiday_home",
    preferredUnit: "1+1",
    channel: "Telegram",
    appointmentType: "site_visit",
    status: "confirmed",
    scheduledAt: isoDaysFromAnchor(1, 13),
    assignedTo: "Daria Destek",
    followUpDueAt: isoDaysFromAnchor(2, 10),
    nextAction: "Beach club and hotel-service walkthrough",
  },
  {
    id: "VIEW-603",
    leadName: "Ahmed Al Mansouri",
    leadLanguage: "en",
    buyerGoal: "citizenship",
    preferredUnit: "3+1 Penthouse",
    channel: "WhatsApp",
    appointmentType: "document_call",
    status: "planned",
    scheduledAt: isoDaysFromAnchor(2, 15),
    assignedTo: "Can Operasyon",
    followUpDueAt: isoDaysFromAnchor(3, 11),
    nextAction: "Eligibility pre-check with legal partner",
  },
  {
    id: "VIEW-604",
    leadName: "Ayşe Karaca",
    leadLanguage: "tr",
    buyerGoal: "residence",
    preferredUnit: "2+1 Penthouse",
    channel: "Phone",
    appointmentType: "callback",
    status: "completed",
    scheduledAt: isoDaysFromAnchor(-1, 17),
    assignedTo: "Selin Satış",
    followUpDueAt: isoDaysFromAnchor(0, 12),
    nextAction: "Reserve unit once payment plan confirmed",
  },
  {
    id: "VIEW-605",
    leadName: "James Wilson",
    leadLanguage: "en",
    buyerGoal: "investment",
    preferredUnit: "1+1",
    channel: "Partner",
    appointmentType: "online_tour",
    status: "no_show",
    scheduledAt: isoDaysFromAnchor(-1, 11),
    assignedTo: "Merve Muhasebe",
    followUpDueAt: isoDaysFromAnchor(0, 18),
    nextAction: "Send no-show recovery message",
  },
]

const paymentPlanBuyers = [
  "Markus Weber",
  "Elena Morozova",
  "Ahmed Al Mansouri",
  "Ayşe Karaca",
  "James Wilson",
  "Olga Morozova",
  "Thomas Klein",
  "Daria Volkova",
]

export const paymentPlans: PaymentPlanRecord[] = flats
  .filter((flat) => flat.saleStatus === "available" && flat.buyNowEur)
  .slice(0, 10)
  .map((flat, index) => {
    const listPriceEur = flat.buyNowEur ?? 0
    const status: PaymentPlanStatus =
      index % 7 === 0 ? "blocked" : index % 5 === 0 ? "overdue" : index % 3 === 0 ? "due_soon" : "on_track"
    const downPaymentPercent = index % 4 === 0 ? 40 : 35
    const paidEur = status === "blocked" ? 0 : Math.round(listPriceEur * (downPaymentPercent / 100))
    const nextDueEur =
      status === "on_track" ? 0 : status === "blocked" ? paidEur || Math.round(listPriceEur * 0.35) : Math.round(listPriceEur * 0.12)

    return {
      id: `PAY-${701 + index}`,
      dealName: `${flat.number} satış planı`,
      buyerName: paymentPlanBuyers[index % paymentPlanBuyers.length],
      unitType: flat.type,
      listPriceEur,
      downPaymentPercent,
      paidEur,
      nextDueEur,
      nextDueAt: isoDaysFromAnchor(status === "overdue" ? -3 : 7 + index, 12),
      currencyRisk: listPriceEur >= 250000 ? "high" : listPriceEur >= 180000 ? "medium" : "low",
      status,
      approvalBlocker:
        status === "blocked"
          ? "Reservation contract missing"
          : status === "overdue"
            ? "Installment not verified"
            : status === "due_soon"
              ? "Payment plan signature pending"
              : "No blocker",
    }
  })

export const purchaseChecklist: PurchaseChecklistRecord[] = [
  {
    id: "DOCBUY-801",
    dealName: "NLP-2G-014",
    buyerName: "Markus Weber",
    unitType: "2+1 Garden",
    documentType: "Reservation",
    status: "verified",
    owner: "Backoffice",
    dueAt: isoDaysFromAnchor(0, 18),
    risk: "low",
    nextAction: "Ready for payment-plan signature",
  },
  {
    id: "DOCBUY-802",
    dealName: "NLP-2G-014",
    buyerName: "Markus Weber",
    unitType: "2+1 Garden",
    documentType: "Payment Plan",
    status: "pending",
    owner: "Finance",
    dueAt: isoDaysFromAnchor(1, 12),
    risk: "medium",
    nextAction: "Collect buyer signature",
  },
  {
    id: "DOCBUY-803",
    dealName: "NLP-PH-301",
    buyerName: "Ahmed Al Mansouri",
    unitType: "3+1 Penthouse",
    documentType: "KYC",
    status: "missing",
    owner: "Compliance",
    dueAt: isoDaysFromAnchor(0, 16),
    risk: "high",
    nextAction: "Request passport and source-of-funds pack",
  },
  {
    id: "DOCBUY-804",
    dealName: "NLP-PH-301",
    buyerName: "Ahmed Al Mansouri",
    unitType: "3+1 Penthouse",
    documentType: "TAPU",
    status: "pending",
    owner: "Legal partner",
    dueAt: isoDaysFromAnchor(3, 13),
    risk: "high",
    nextAction: "Validate title deed pack before contract",
  },
  {
    id: "DOCBUY-805",
    dealName: "NLP-1A-092",
    buyerName: "Elena Morozova",
    unitType: "1+1",
    documentType: "EIDS",
    status: "verified",
    owner: "Listing admin",
    dueAt: isoDaysFromAnchor(14, 10),
    risk: "low",
    nextAction: "Keep listing authorization attached",
  },
  {
    id: "DOCBUY-806",
    dealName: "NLP-PH-217",
    buyerName: "Ayşe Karaca",
    unitType: "2+1 Penthouse",
    documentType: "Sales Contract",
    status: "rejected",
    owner: "Backoffice",
    dueAt: isoDaysFromAnchor(1, 15),
    risk: "high",
    nextAction: "Correct buyer name before reservation",
  },
]

export const buyerEligibility: BuyerEligibilityRecord[] = [
  {
    id: "ELG-901",
    buyerName: "Markus Weber",
    nationality: "DE",
    buyerGoal: "investment",
    targetUnit: "2+1 Garden",
    declaredBudgetEur: 260000,
    appraisalRequired: false,
    districtCheck: "clear",
    status: "qualified",
    legalPartner: "Ataberk Legal Desk",
    nextAction: "Proceed with reservation and ROI pack",
  },
  {
    id: "ELG-902",
    buyerName: "Elena Morozova",
    nationality: "RU",
    buyerGoal: "holiday_home",
    targetUnit: "1+1",
    declaredBudgetEur: 145000,
    appraisalRequired: false,
    districtCheck: "quota_review",
    status: "review_required",
    legalPartner: "Alanya Residence Advisor",
    nextAction: "Check residence-zone status before promise",
  },
  {
    id: "ELG-903",
    buyerName: "Ahmed Al Mansouri",
    nationality: "AE",
    buyerGoal: "citizenship",
    targetUnit: "3+1 Penthouse",
    declaredBudgetEur: 320000,
    appraisalRequired: true,
    districtCheck: "clear",
    status: "partner_review",
    legalPartner: "Citizenship legal partner",
    nextAction: "Need appraisal and source-of-funds review",
  },
  {
    id: "ELG-904",
    buyerName: "James Wilson",
    nationality: "GB",
    buyerGoal: "residence",
    targetUnit: "1+1",
    declaredBudgetEur: 120000,
    appraisalRequired: false,
    districtCheck: "restricted",
    status: "blocked",
    legalPartner: "Ataberk Legal Desk",
    nextAction: "Do not promise residence suitability",
  },
]

export const cashFlow: CashFlowPoint[] = [
  { label: "Kas", collectedTry: 1112000, outstandingTry: 426000, serviceSpendTry: 172000 },
  { label: "Şub", collectedTry: 1186000, outstandingTry: 398000, serviceSpendTry: 164000 },
  { label: "Mar", collectedTry: 1248000, outstandingTry: 372000, serviceSpendTry: 188000 },
  { label: "Nis", collectedTry: 1321000, outstandingTry: 341000, serviceSpendTry: 205000 },
  { label: "May", collectedTry: 1289000, outstandingTry: 389000, serviceSpendTry: 192000 },
  { label: "Haz", collectedTry: 1376000, outstandingTry: 417000, serviceSpendTry: 218000 },
]

export const siteActivities = [
  { id: "ACT-1", actor: "Muhasebe", message: "23 daire için otomatik borç hatırlatma kuyruğu hazırlandı.", type: "Tahsilat", tone: "warning" },
  { id: "ACT-2", actor: "Operasyon", message: "Bugünkü 2 check-out için depozito hasar kontrolü açıldı.", type: "Rezervasyon", tone: "info" },
  { id: "ACT-3", actor: "Güvenlik", message: "Legal takipteki 15 daire için erişim kısıtlama listesi güncellendi.", type: "Erişim", tone: "danger" },
  { id: "ACT-4", actor: "Teknik", message: "Acil asansör talebi teknisyene atandı ve SLA sayacı başladı.", type: "Servis", tone: "danger" },
  { id: "ACT-5", actor: "AI", message: "Haziran tahsilat riski yüksek 37 hesap için öncelik skoru üretildi.", type: "AI", tone: "success" },
]

export const aiInsights = [
  {
    title: "Tahsilat önceliği",
    detail: "37 hesapta gecikme riski yüksek. AI, önce 90+ gün ve aktif rezervasyonu olan daireleri öneriyor.",
  },
  {
    title: "Servis darboğazı",
    detail: "3 talep SLA dışına çıktı. Borç blokeli talepler finans onayı olmadan sahaya gönderilmemeli.",
  },
  {
    title: "Check-out kontrolü",
    detail: "2 check-out bugün kapanıyor. Depozito kesintisi ve temizlik kanıtı aynı akışta tamamlanmalı.",
  },
]

export const residents: ResidentRecord[] = flats
  .filter((flat) => flat.residentType !== "empty")
  .slice(0, 120)
  .map((flat, index) => {
    const relation = flat.residentType === "owner" ? "owner" : flat.residentType === "tenant" ? "tenant" : "guest"
    const riskScore = Math.min(
      99,
      Math.round(flat.balanceTry / 450) + flat.serviceOpen * 12 + (flat.accessStatus === "restricted" ? 28 : 0) + (relation === "guest" ? 8 : 0)
    )
    return {
      id: `RES-${7001 + index}`,
      flatId: flat.id,
      flatNumber: flat.number,
      name: relation === "owner" ? flat.ownerName : flat.residentName,
      relation,
      language: (["tr", "en", "de", "ru"] as const)[index % 4],
      phone: flat.phone,
      email: `${flat.number.toLowerCase().replace("-", ".")}@resident.cati.local`,
      balanceTry: flat.balanceTry,
      serviceOpen: flat.serviceOpen,
      accessStatus: flat.accessStatus,
      communicationPreference: (["WhatsApp", "Telefon", "E-posta", "Portal"] as const)[index % 4],
      riskScore,
      lastContactAt: isoDaysFromAnchor(-(index % 18), 15),
    }
  })

export const accessControlRecords: AccessControlRecord[] = flats
  .filter((flat) => flat.accessStatus !== "active" || flat.bookingStatus !== "none" || flat.balanceTry > 0)
  .slice(0, 56)
  .map((flat, index) => {
    const zone = (["Ana Kapı", "Otopark", "Havuz", "Asansör", "Depo"] as const)[index % 5]
    const credential = (["Mobil Kod", "Kart", "Plaka", "QR"] as const)[index % 4]
    const riskLevel: AccessControlRecord["riskLevel"] =
      flat.accessStatus === "restricted" && flat.paymentStatus === "legal"
        ? "critical"
        : flat.accessStatus === "restricted"
          ? "high"
          : flat.accessStatus === "pending"
            ? "medium"
            : "low"
    return {
      id: `ACS-${8101 + index}`,
      flatId: flat.id,
      flatNumber: flat.number,
      residentName: flat.residentName === "Boş" ? flat.ownerName : flat.residentName,
      zone,
      credential,
      status: flat.accessStatus,
      reason:
        flat.accessStatus === "restricted"
          ? "Aidat borcu veya depozito kontrolü"
          : flat.accessStatus === "pending"
            ? "Giriş ön kontrolü bekliyor"
            : flat.accessStatus === "disabled"
              ? "Bakım veya güvenlik kapaması"
              : "Normal kullanım",
      lastEventAt: isoDaysFromAnchor(-(index % 10), 8 + (index % 8)),
      riskLevel,
    }
  })

function documentCategoryForSource(category: string): DocumentVaultRecord["category"] {
  if (category === "price_list") return "Sözleşme"
  if (category === "legal_document") return "Uyum"
  if (category === "rental_income") return "Sözleşme"
  if (category === "floor_plan" || category === "facility_map" || category === "numbering") return "Servis"
  return "Uyum"
}

export const documentVault: DocumentVaultRecord[] = newLevelPremiumDataset.documents.slice(0, 18).map((document, index) => ({
  id: `DOC-NLP-${String(index + 1).padStart(3, "0")}`,
  flatNumber: document.category === "price_list" ? `${document.title.charAt(0)}-pricing` : "NLP-AVS",
  ownerName: "Ataberk Estate",
  name: document.title,
  category: documentCategoryForSource(document.category),
  status: document.status === "active" ? "verified" : "pending",
  size: "Kaynak dosya",
  updatedAt: isoDaysFromAnchor(-(index % 7), 13),
  retentionRule:
    document.status === "active"
      ? `Kaynak: ${document.path}`
      : `OCR / insan onayı gerekli: ${document.path}`,
}))

export const reportCards: ReportCardRecord[] = [
  {
    id: "RPT-01",
    title: "Yönetim Kurulu Operasyon Özeti",
    cadence: "Haftalık",
    owner: "Müdür",
    status: "ready",
    metric: "769 daire / %90 doluluk",
    insight: "Borç ve servis SLA riski aynı raporda izlenmeli.",
  },
  {
    id: "RPT-02",
    title: "Aidat Tahsilat ve Yaşlandırma",
    cadence: "Günlük",
    owner: "Muhasebe",
    status: "ready",
    metric: "1.4M ₺ açık borç",
    insight: "90+ gün borçlu 19 hesap erişim kısıtıyla takip edilmeli.",
  },
  {
    id: "RPT-03",
    title: "Servis SLA ve Maliyet Kontrolü",
    cadence: "Anlık",
    owner: "Operasyon",
    status: "needs_review",
    metric: "4 SLA dışı servis",
    insight: "Borç blokeli servisler finans onayı olmadan sahaya düşmemeli.",
  },
  {
    id: "RPT-04",
    title: "Rezervasyon, Depozito ve Hasar",
    cadence: "Günlük",
    owner: "Misafir Operasyonu",
    status: "scheduled",
    metric: "2 kritik check-out",
    insight: "Depozito kesintisi fotoğraf kanıtı ile kapatılmalı.",
  },
  {
    id: "RPT-05",
    title: "Erişim Güvenliği ve Uyum",
    cadence: "Anlık",
    owner: "Güvenlik",
    status: "ready",
    metric: "33 kısıtlı erişim",
    insight: "Mobil kod, kart ve plaka erişimi aynı karar motorundan yönetilmeli.",
  },
]

export const phaseDeliveryRecords: PhaseDeliveryRecord[] = [
  {
    phase: 1,
    title: "Keşif, kapsam kilidi ve pazar kıyası",
    status: "complete",
    owner: "Product + Delivery",
    businessOutcome: "769 dairelik site, roller, finans, servis, rezervasyon, erişim ve raporlama kapsamı tek ERP hedefinde netleşir.",
    userGuide: "Yönetim özeti ve dokümantasyon merkezinden kapsam, risk ve karar kayıtlarını kontrol edin.",
    evidence: ["İhtiyaç haritası", "ERP modül planı", "Pazar kıyası", "Karar kaydı"],
  },
  {
    phase: 2,
    title: "UX/UI tasarım sistemi ve ürün navigasyonu",
    status: "complete",
    owner: "Product + UX",
    businessOutcome: "Yönetici, muhasebe, saha ekibi, sakin ve destek rolleri kendi işlerine uygun, sade ve erişilebilir arayüzden ilerler.",
    userGuide: "Sol menüden rolünüze açık modülü seçin; üst kartlarda kritik sayılar, altta detay tabloları, arama ve aksiyonlar kullanılır.",
    evidence: ["Role-based navigation", "Mobile dashboard", "Accessible card routing", "Turkish-first UX"],
  },
  {
    phase: 3,
    title: "Platform temeli, auth, RBAC ve audit",
    status: "complete",
    owner: "Platform + Security",
    businessOutcome: "Oturum, rol, izin, RLS ve denetim izi bütün hassas işlemler için gerçek kontrol zemini sağlar.",
    userGuide: "Ayarlar ekranında güvenlik kontrollerini, rol yetkilerini ve son audit olaylarını inceleyin.",
    evidence: ["Güvenli oturum temeli", "Rol bazlı navigasyon", "Denetimli aksiyon servisi", "Korumalı ekranlar"],
  },
  {
    phase: 4,
    title: "Site, blok, kat, daire ve veri importu",
    status: "complete",
    owner: "Data + Operations",
    businessOutcome: "769 daire blok, kat, durum, borç ve erişim ilişkisiyle filtrelenebilir; import kalite kapısı yönetilir.",
    userGuide: "Daire Matrisi ekranında blok özetini, canlı matrisi, import doğrulamasını ve detay tablosunu kullanın.",
    evidence: ["769 live units", "Block/floor matrix", "Veri kontrol ve uygulama isteği", "Anlık yenileme"],
  },
  {
    phase: 5,
    title: "Kullanıcı, malik, kiracı ve personel yönetimi",
    status: "ready_for_uat",
    owner: "Operations + Admin",
    businessOutcome: "Her kişi doğru daire, hesap, belge, iletişim dili ve yetki kapsamıyla tek kayıtta yönetilir.",
    userGuide: "Kullanıcılar ekranında sakin, malik, kiracı, personel ve rol ilişkilerini kontrol edin.",
    evidence: ["Resident profile model", "Kişi dizini servisi", "Kullanıcı yönetim paneli", "Rol matrisi"],
  },
  {
    phase: 6,
    title: "Finans ledger motoru",
    status: "ready_for_uat",
    owner: "Finance + Engineering",
    businessOutcome: "Bakiyeler ekran hesabından değil, hesap, borç/alacak, tahakkuk, düzeltme ve ekstre kayıtlarından hesaplanır.",
    userGuide: "Finans ekranında aidat, borç, tahsilat, gecikme ve ekstre hareketlerini ledger mantığıyla inceleyin.",
    evidence: ["Finans defteri modeli", "Finans defteri servisi", "Finans operasyon paneli", "Denetimli finans aksiyonları"],
  },
  {
    phase: 7,
    title: "Ödeme, depozito, mutabakat ve borç kısıtı",
    status: "in_progress",
    owner: "Finance + Legal",
    businessOutcome: "Ödeme, depozito, iade, borç eşiği ve servis/erişim kısıtları muhasebe ve hukuk onayıyla yürür.",
    userGuide: "Finans ve Uyum ekranlarında gecikme, depozito, kısıt ve onay kuyruğunu takip edin.",
    evidence: ["Debt restriction model", "Deposit states", "Finance approval queue", "Human-approved access policy"],
  },
  {
    phase: 8,
    title: "Servis kataloğu ve servis siparişi akışı",
    status: "planned",
    owner: "Operations + Finance",
    businessOutcome: "Temizlik, transfer, bakım ve özel hizmetler fiyat, SLA, borç kontrolü ve görev üretimiyle siparişe dönüşür.",
    userGuide: "Servis Talepleri ekranında katalog, borç kontrolü, görev üretimi ve durum takibini yönetin.",
    evidence: ["Service catalogue target", "Debt-check gate", "Task handoff", "Resident order flow"],
  },
  {
    phase: 9,
    title: "Görev, saha ekibi, SLA ve medya raporu",
    status: "planned",
    owner: "Technical + Staff",
    businessOutcome: "Saha işleri atama, öncelik, SLA, foto/video kanıt, iptal ve yönetici onayıyla görünür olur.",
    userGuide: "Servis Talepleri ekranında görev panosu, SLA riski ve saha raporlarını yönetin.",
    evidence: ["Task board target", "Mobile staff flow", "SLA timer", "Media proof"],
  },
  {
    phase: 10,
    title: "Rezervasyon, kiralama, move-in ve checkout",
    status: "planned",
    owner: "Reservations + Operations",
    businessOutcome: "Müsaitlik, rezervasyon, depozito, giriş hazırlığı, checkout, kesinti ve erişim kapatma tek süreç olur.",
    userGuide: "Rezervasyon ekranında takvim, giriş/çıkış işleri, depozito ve final kontrol adımlarını takip edin.",
    evidence: ["Booking calendar", "Move-in checklist", "Checkout settlement", "Access action queue"],
  },
  {
    phase: 11,
    title: "İletişim, bildirim ve doküman merkezi",
    status: "planned",
    owner: "Support + Backoffice",
    businessOutcome: "Sakin, malik, yönetici ve personel iletişimi daire, borç, görev, rezervasyon ve belgeyle ilişkilendirilir.",
    userGuide: "İletişim ve Belgeler ekranlarında konuşma, duyuru, bildirim ve dosya izinlerini yönetin.",
    evidence: ["Communication inbox", "Document vault", "Notification templates", "Permission-safe attachments"],
  },
  {
    phase: 12,
    title: "Mobil PWA ve kurulabilir kullanıcı deneyimi",
    status: "planned",
    owner: "Frontend + QA",
    businessOutcome: "Sakin, personel ve yönetici ana işleri telefondan hızlı, erişilebilir ve kurulabilir PWA olarak yapılır.",
    userGuide: "Mobil görünümde bakiye, servis, görev, belge, sohbet ve bildirim akışlarını test edin.",
    evidence: ["Mobile E2E", "Installable PWA target", "Touch-safe navigation", "Performance budget"],
  },
  {
    phase: 13,
    title: "Dış sistem entegrasyonları",
    status: "planned",
    owner: "Integrations + Security",
    businessOutcome: "Banka/ödeme, SMS/e-posta, erişim kartı/bariyer, sayaç ve kimlik sistemleri test modu ve retry kuyruğuyla bağlanır.",
    userGuide: "Ayarlar ekranında entegrasyon durumu, son hata, manuel retry ve bağlantı loglarını takip edin.",
    evidence: ["Adapter pattern", "Webhook/retry target", "Integration health", "Manual fallback"],
  },
  {
    phase: 14,
    title: "AI premium katmanı ve gelişmiş analitik",
    status: "planned",
    owner: "AI Governance + Analytics",
    businessOutcome: "AI günlük brifing, borç riski, servis triage, anomali, doğal dil arama ve rapor taslağı üretir; hassas işlem yapmaz.",
    userGuide: "AI Rapor Merkezi'nde önerileri kaynak, güven ve insan onayıyla inceleyin.",
    evidence: ["AI command center", "Guardrailed recommendations", "Source-linked answers", "Evaluation set"],
  },
  {
    phase: 15,
    title: "QA, güvenlik, performans, kabul testi ve canlıya geçiş",
    status: "planned",
    owner: "QA + Delivery",
    businessOutcome: "Üretim canlıya geçmeden önce güvenlik, performans, yedekleme, eğitim, kabul testi ve destek kanıtı tamamlanır.",
    userGuide: "Raporlar ve dokümantasyon üzerinden test, kabul, eğitim ve canlıya geçiş checklist durumunu yönetin.",
    evidence: ["Otomatik test kapsamı", "Security checklist", "Kabul onayı", "Canlıya geçiş runbooku"],
  },
]

export const platformControls: PlatformControl[] = [
  {
    id: "CTL-AUTH-01",
    area: "Auth",
    title: "Rol profili ve oturum kontrolü",
    status: "active",
    owner: "Platform",
    detail: "Yerel çalışma ortamında yetki profili kullanılabilir; üretim ortamında doğrulanmış kullanıcı profili önceliklidir.",
  },
  {
    id: "CTL-RBAC-01",
    area: "RBAC",
    title: "Rol bazlı menü ve yetki matrisi",
    status: "active",
    owner: "Security",
    detail: "Her rol için görüntüleme, oluşturma, onay, dışa aktarma ve yönetim hakları açık tanımlanır.",
  },
  {
    id: "CTL-AUD-01",
    area: "Audit",
    title: "Finans, erişim ve AI karar izi",
    status: "active",
    owner: "Compliance",
    detail: "Hassas kararlar aktör, modül, sebep, risk ve zaman bilgisiyle izlenebilir şekilde modellenir.",
  },
  {
    id: "CTL-DATA-01",
    area: "Data",
    title: "Şirket/site izolasyon hazırlığı",
    status: "review",
    owner: "Data",
    detail: "Veri modeli şirket, site ve rol bağlamını güvenli erişim politikalarına hazırlayacak şekilde tasarlanmıştır.",
  },
  {
    id: "CTL-AI-01",
    area: "AI",
    title: "AI aksiyonlarında insan onayı",
    status: "review",
    owner: "AI Governance",
    detail: "AI finans, erişim veya hassas verilerde doğrudan işlem yapmaz; öneri ve onay kuyruğu üretir.",
  },
]

export const auditEvents: AuditEvent[] = [
  {
    id: "AUD-2401",
    actor: "Operasyon Sorumlusu",
    action: "Rol bazlı panele giriş yaptı",
    module: "Auth",
    risk: "low",
    timestamp: isoDaysFromAnchor(0, 8),
    decision: "Oturum rol yetkileriyle sınırlandı.",
  },
  {
    id: "AUD-2402",
    actor: "Muhasebe - Merve",
    action: "90+ gün borçlu hesapları dışa aktardı",
    module: "Finans",
    risk: "high",
    timestamp: isoDaysFromAnchor(0, 9),
    decision: "Dışa aktarma finans rolü kapsamında izinli.",
  },
  {
    id: "AUD-2403",
    actor: "Güvenlik - Selim",
    action: "Kısıtlı erişim listesi inceledi",
    module: "Erişim",
    risk: "medium",
    timestamp: isoDaysFromAnchor(0, 10),
    decision: "Sadece güvenlik ve yönetici kapsamındaki alanlar gösterildi.",
  },
  {
    id: "AUD-2404",
    actor: "AI Operasyon",
    action: "Tahsilat önceliği önerisi oluşturdu",
    module: "AI",
    risk: "high",
    timestamp: isoDaysFromAnchor(0, 11),
    decision: "Öneri beklemede; ödeme veya erişim işlemi otomatik yapılmadı.",
  },
  {
    id: "AUD-2405",
    actor: "Operasyon - Can",
    action: "Daire import doğrulama raporunu onayladı",
    module: "Daire Import",
    risk: "medium",
    timestamp: isoDaysFromAnchor(0, 12),
    decision: "Uyarılar yönetici incelemesine bırakıldı; hatalı satır yok.",
  },
]

const sourceMissingUnitRows = newLevelPremiumUnits.filter(
  (unit) => unit.dataQuality === "source_missing"
).length

export const importBatches: ImportBatch[] = [
  {
    id: "IMP-769-01",
    source: "New Level Premium price-list package",
    totalRows: newLevelPremiumDataset.project.totalUnits,
    validRows: newLevelPremiumDataset.project.totalUnits - sourceMissingUnitRows,
    warningRows: sourceMissingUnitRows,
    rejectedRows: 0,
    status: "ready_to_apply",
    importedBy: "Data import harness",
    checkedAt: isoDaysFromAnchor(0, 13),
  },
  {
    id: "IMP-DOC-02",
    source: "Project documents, facility map and floor plans",
    totalRows: newLevelPremiumDataset.documents.length,
    validRows: newLevelPremiumDataset.documents.filter((document) => document.status === "active").length,
    warningRows: newLevelPremiumDataset.documents.filter((document) => document.status !== "active").length,
    rejectedRows: 0,
    status: "review_required",
    importedBy: "Document control",
    checkedAt: isoDaysFromAnchor(0, 14),
  },
  {
    id: "IMP-MEDIA-03",
    source: "Construction and showroom media",
    totalRows: newLevelPremiumDataset.media.length,
    validRows: newLevelPremiumDataset.media.length,
    warningRows: 0,
    rejectedRows: 0,
    status: "validated",
    importedBy: "Marketing ops",
    checkedAt: isoDaysFromAnchor(0, 15),
  },
]

export const importFindings: ImportFinding[] = [
  ...newLevelPremiumDataset.findings.map((finding, index) => ({
    id: `FND-NLP-${String(index + 1).padStart(2, "0")}`,
    severity: finding.severity as ImportFinding["severity"],
    area: finding.area,
    affectedRows: finding.area.includes("Block B") ? 105 : finding.area.includes("Block D") ? 123 : 0,
    message: finding.message,
    recommendedAction: "Eksik kaynak dosyayı ekleyin veya yönetici onayıyla kaydı kaynak eksik olarak yayınlayın.",
  })),
  {
    id: "FND-NLP-DOC",
    severity: "info",
    area: "Scan-only legal documents",
    affectedRows: newLevelPremiumDataset.documents.filter((document) => document.status === "scan_review").length,
    message: "İmar, tapu ve yetki belgelerinin bir kısmı tarama/PDF görseli olarak geldi; OCR veya insan doğrulaması gerekir.",
    recommendedAction: "Cloud Storage yüklemesinden sonra belge tiplerini ve resmi geçerlilik tarihlerini manuel onaydan geçirin.",
  },
]

export const staffMembers: StaffMember[] = [
  {
    id: "USR-101",
    name: "Selin Yönetici",
    role: "manager",
    team: "Site Yönetimi",
    phone: "+90 532 110 1001",
    language: "tr",
    activeTasks: 9,
    approvalLimitTry: 150000,
    accessScope: "all_site",
    status: "active",
  },
  {
    id: "USR-102",
    name: "Merve Muhasebe",
    role: "accountant",
    team: "Finans",
    phone: "+90 532 110 1002",
    language: "tr",
    activeTasks: 14,
    approvalLimitTry: 75000,
    accessScope: "finance_only",
    status: "active",
  },
  {
    id: "USR-103",
    name: "Ahmet Teknik",
    role: "staff",
    team: "Teknik",
    phone: "+90 532 110 1003",
    language: "tr",
    activeTasks: 11,
    approvalLimitTry: 12000,
    accessScope: "field_only",
    status: "active",
  },
  {
    id: "USR-104",
    name: "Selim Güvenlik",
    role: "staff",
    team: "Güvenlik",
    phone: "+90 532 110 1004",
    language: "tr",
    activeTasks: 6,
    approvalLimitTry: 0,
    accessScope: "field_only",
    status: "active",
  },
  {
    id: "USR-105",
    name: "Daria Destek",
    role: "staff",
    team: "Sakin Destek",
    phone: "+90 532 110 1005",
    language: "ru",
    activeTasks: 18,
    approvalLimitTry: 5000,
    accessScope: "resident_only",
    status: "training",
  },
  {
    id: "USR-106",
    name: "Can Operasyon",
    role: "admin",
    team: "Operasyon",
    phone: "+90 532 110 1006",
    language: "en",
    activeTasks: 7,
    approvalLimitTry: 100000,
    accessScope: "all_site",
    status: "active",
  },
]

export const roleCoverage: RoleCoverage[] = [
  { role: "Yönetim", users: 1, canApproveFinance: true, canRestrictAccess: true, canManageUsers: true, canExportData: true },
  { role: "Sorumlu", users: 2, canApproveFinance: false, canRestrictAccess: true, canManageUsers: false, canExportData: true },
  { role: "Muhasebe", users: 3, canApproveFinance: true, canRestrictAccess: false, canManageUsers: false, canExportData: true },
  { role: "Personel", users: 17, canApproveFinance: false, canRestrictAccess: false, canManageUsers: false, canExportData: false },
  { role: "Malik", users: 511, canApproveFinance: false, canRestrictAccess: false, canManageUsers: false, canExportData: true },
  { role: "Kiracı", users: 184, canApproveFinance: false, canRestrictAccess: false, canManageUsers: false, canExportData: false },
]

export const statusLabels: Record<FlatStatus, string> = {
  occupied: "Dolu",
  vacant: "Boş",
  reserved: "Rezerve",
  maintenance: "Bakımda",
  blocked: "Blokeli",
}

export const accessLabels: Record<AccessStatus, string> = {
  active: "Aktif",
  restricted: "Kısıtlı",
  pending: "Bekliyor",
  disabled: "Kapalı",
}

export const paymentLabels: Record<PaymentStatus, string> = {
  clear: "Temiz",
  minor_debt: "Küçük borç",
  overdue: "Gecikmiş",
  legal: "Yasal takip",
}

export const serviceStatusLabels: Record<ServiceStatus, string> = {
  open: "Açık",
  assigned: "Atandı",
  waiting_payment: "Ödeme bekliyor",
  in_progress: "İşlemde",
  resolved: "Çözüldü",
  closed: "Kapandı",
}

export const priorityLabels: Record<ServicePriority, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  urgent: "Acil",
}

export const bookingStatusLabels: Record<BookingStatus, string> = {
  confirmed: "Onaylandı",
  precheck_pending: "Ön kontrol",
  move_in_today: "Bugün giriş",
  checkout_today: "Bugün çıkış",
  deposit_review: "Depozito kontrol",
  cancelled: "İptal",
}

export const depositLabels: Record<DepositStatus, string> = {
  not_required: "Yok",
  reserved: "Rezerve",
  held: "Tutuldu",
  deduction_pending: "Kesinti bekliyor",
  refund_ready: "İade hazır",
}

export function formatTry(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatTryShort(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ₺`
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K ₺`
  return formatTry(amount)
}

export function formatEur(amount: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatEurShort(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M €`
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K €`
  return formatEur(amount)
}

export function getBlockOverview(): BlockOverview[] {
  return blockNames.map((block) => {
    const records = flats.filter((flat) => flat.block === block)
    const blockSource = newLevelPremiumBlocks.find((item) => item.name === block)
    return {
      block,
      total: records.length,
      availableForSale: records.filter((flat) => flat.saleStatus === "available").length,
      sold: records.filter((flat) => flat.saleStatus === "sold").length,
      sourceMissing: records.filter((flat) => flat.saleStatus === "source_missing").length,
      minBuyNowEur: blockSource?.minBuyNowEur ?? null,
      maxBuyNowEur: blockSource?.maxBuyNowEur ?? null,
      priceSourceStatus: blockSource?.priceSourceStatus ?? "missing",
      numberingSource: blockSource?.numberingSource ?? null,
      occupied: records.filter((flat) => flat.status === "occupied").length,
      vacant: records.filter((flat) => flat.status === "vacant").length,
      blocked: records.filter((flat) => flat.accessStatus === "restricted").length,
      maintenance: records.filter((flat) => flat.status === "maintenance").length,
      debtTry: records.reduce((sum, flat) => sum + flat.balanceTry, 0),
    }
  })
}

export function getDebtAccounts(): DebtAccount[] {
  return flats
    .filter((flat) => flat.balanceTry > 0)
    .sort((a, b) => b.balanceTry - a.balanceTry)
    .slice(0, 32)
    .map((flat) => ({
      flatId: flat.id,
      flatNumber: flat.number,
      ownerName: flat.ownerName,
      balanceTry: flat.balanceTry,
      agingBucket: flat.paymentStatus === "legal" ? "90+" : flat.paymentStatus === "overdue" ? "61-90" : "31-60",
      paymentStatus: flat.paymentStatus,
      accessStatus: flat.accessStatus,
      lastPaymentAt: flat.lastPaymentAt,
      suggestedAction:
        flat.paymentStatus === "legal"
          ? "Yasal takip ve erişim kısıtı"
          : flat.paymentStatus === "overdue"
            ? "Telefon + WhatsApp tahsilat"
            : "Otomatik hatırlatma",
    }))
}

export function getDebtAging() {
  const accounts = getDebtAccounts()
  const buckets = ["0-30", "31-60", "61-90", "90+"] as const
  return buckets.map((bucket) => ({
    label: bucket,
    value: accounts.filter((account) => account.agingBucket === bucket).reduce((sum, account) => sum + account.balanceTry, 0),
  }))
}

export function getSummary(): SiteSummary {
  const occupiedFlats = flats.filter((flat) => flat.status === "occupied" || flat.status === "reserved").length
  const vacantFlats = flats.filter((flat) => flat.status === "vacant").length
  const maintenanceFlats = flats.filter((flat) => flat.status === "maintenance").length
  const blockedFlats = flats.filter((flat) => flat.status === "blocked").length
  const openTickets = serviceTickets.filter((ticket) => ticket.status !== "closed" && ticket.status !== "resolved").length
  const overdueTickets = serviceTickets.filter((ticket) => ticket.slaHoursRemaining < 0).length
  const restrictedAccess = flats.filter((flat) => flat.accessStatus === "restricted").length
  const checkoutsToday = bookings.filter((booking) => booking.status === "checkout_today").length
  return {
    totalFlats: flats.length,
    occupiedFlats,
    vacantFlats,
    maintenanceFlats,
    blockedFlats,
    occupancyRate: Math.round((occupiedFlats / flats.length) * 100),
    totalDebtTry: flats.reduce((sum, flat) => sum + flat.balanceTry, 0),
    monthlyExpectedTry: flats.reduce((sum, flat) => sum + flat.monthlyFeeTry, 0),
    depositExposureTry: bookings.reduce((sum, booking) => sum + booking.depositTry, 0),
    openTickets,
    overdueTickets,
    activeBookings: bookings.filter((booking) => booking.status !== "cancelled").length,
    checkoutsToday,
    restrictedAccess,
    aiRiskCount: overdueTickets + restrictedAccess + checkoutsToday,
  }
}

export function getOccupancyTrend() {
  return [
    { label: "Ocak", value: 82 },
    { label: "Şub", value: 84 },
    { label: "Mar", value: 85 },
    { label: "Nis", value: 87 },
    { label: "May", value: 86 },
    { label: "Haz", value: getSummary().occupancyRate },
  ]
}

export function getFlatStatusDistribution() {
  return (Object.keys(statusLabels) as FlatStatus[]).map((status) => ({
    label: statusLabels[status],
    value: flats.filter((flat) => flat.status === status).length,
    color:
      status === "occupied"
        ? "#14b8a6"
        : status === "vacant"
          ? "#3b82f6"
          : status === "reserved"
            ? "#8b5cf6"
            : status === "maintenance"
              ? "#f59e0b"
              : "#ef4444",
  }))
}

export function getResidentSummary() {
  return {
    total: residents.length,
    owners: residents.filter((resident) => resident.relation === "owner").length,
    tenants: residents.filter((resident) => resident.relation === "tenant").length,
    guests: residents.filter((resident) => resident.relation === "guest").length,
    highRisk: residents.filter((resident) => resident.riskScore >= 70).length,
    whatsapp: residents.filter((resident) => resident.communicationPreference === "WhatsApp").length,
  }
}

export function getAccessSummary() {
  return {
    total: accessControlRecords.length,
    restricted: accessControlRecords.filter((record) => record.status === "restricted").length,
    pending: accessControlRecords.filter((record) => record.status === "pending").length,
    critical: accessControlRecords.filter((record) => record.riskLevel === "critical").length,
    zones: ["Ana Kapı", "Otopark", "Havuz", "Asansör", "Depo"].map((zone) => ({
      label: zone,
      value: accessControlRecords.filter((record) => record.zone === zone).length,
    })),
  }
}

export function getDocumentSummary() {
  return {
    total: documentVault.length,
    verified: documentVault.filter((document) => document.status === "verified").length,
    pending: documentVault.filter((document) => document.status === "pending").length,
    missing: documentVault.filter((document) => document.status === "missing").length,
    expired: documentVault.filter((document) => document.status === "expired").length,
  }
}

export function getReportSummary() {
  return {
    total: reportCards.length,
    ready: reportCards.filter((report) => report.status === "ready").length,
    review: reportCards.filter((report) => report.status === "needs_review").length,
    scheduled: reportCards.filter((report) => report.status === "scheduled").length,
  }
}

export function getViewingSummary() {
  return {
    total: viewingPipeline.length,
    confirmed: viewingPipeline.filter((viewing) => viewing.status === "confirmed").length,
    followUpDue: viewingPipeline.filter((viewing) => viewing.status === "follow_up_due").length,
    noShow: viewingPipeline.filter((viewing) => viewing.status === "no_show").length,
    onlineTours: viewingPipeline.filter((viewing) => viewing.appointmentType === "online_tour").length,
  }
}

export function getPaymentPlanSummary() {
  return {
    total: paymentPlans.length,
    onTrack: paymentPlans.filter((plan) => plan.status === "on_track").length,
    dueSoon: paymentPlans.filter((plan) => plan.status === "due_soon").length,
    overdue: paymentPlans.filter((plan) => plan.status === "overdue").length,
    blocked: paymentPlans.filter((plan) => plan.status === "blocked").length,
    openExposureEur: paymentPlans.reduce((sum, plan) => sum + plan.nextDueEur, 0),
  }
}

export function getPurchaseChecklistSummary() {
  return {
    total: purchaseChecklist.length,
    verified: purchaseChecklist.filter((document) => document.status === "verified").length,
    pending: purchaseChecklist.filter((document) => document.status === "pending").length,
    missing: purchaseChecklist.filter((document) => document.status === "missing").length,
    highRisk: purchaseChecklist.filter((document) => document.risk === "high").length,
  }
}

export function getEligibilitySummary() {
  return {
    total: buyerEligibility.length,
    qualified: buyerEligibility.filter((record) => record.status === "qualified").length,
    review: buyerEligibility.filter((record) => record.status === "review_required" || record.status === "partner_review").length,
    blocked: buyerEligibility.filter((record) => record.status === "blocked").length,
    appraisalRequired: buyerEligibility.filter((record) => record.appraisalRequired).length,
  }
}

export function getPhaseDeliverySummary() {
  return {
    total: phaseDeliveryRecords.length,
    complete: phaseDeliveryRecords.filter((phase) => phase.status === "complete").length,
    readyForUat: phaseDeliveryRecords.filter((phase) => phase.status === "ready_for_uat").length,
    inProgress: phaseDeliveryRecords.filter((phase) => phase.status === "in_progress").length,
    planned: phaseDeliveryRecords.filter((phase) => phase.status === "planned").length,
    blocked: phaseDeliveryRecords.filter((phase) => phase.status === "blocked").length,
    evidenceCount: phaseDeliveryRecords.reduce((sum, phase) => sum + phase.evidence.length, 0),
  }
}

export function getPlatformControlSummary() {
  return {
    total: platformControls.length,
    active: platformControls.filter((control) => control.status === "active").length,
    review: platformControls.filter((control) => control.status === "review").length,
    highRiskAuditEvents: auditEvents.filter((event) => event.risk === "high").length,
  }
}

export function getImportSummary() {
  const totalRows = importBatches.reduce((sum, batch) => sum + batch.totalRows, 0)
  const validRows = importBatches.reduce((sum, batch) => sum + batch.validRows, 0)
  const warningRows = importBatches.reduce((sum, batch) => sum + batch.warningRows, 0)
  const rejectedRows = importBatches.reduce((sum, batch) => sum + batch.rejectedRows, 0)
  return {
    totalRows,
    validRows,
    warningRows,
    rejectedRows,
    readinessRate: Math.round((validRows / Math.max(totalRows, 1)) * 100),
    batchesReady: importBatches.filter((batch) => batch.status === "validated" || batch.status === "ready_to_apply").length,
  }
}

export function getStaffSummary() {
  return {
    total: staffMembers.length,
    active: staffMembers.filter((member) => member.status === "active").length,
    training: staffMembers.filter((member) => member.status === "training").length,
    activeTasks: staffMembers.reduce((sum, member) => sum + member.activeTasks, 0),
    financeApprovers: roleCoverage.filter((role) => role.canApproveFinance).reduce((sum, role) => sum + role.users, 0),
  }
}
