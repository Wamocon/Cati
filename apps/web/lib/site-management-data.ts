// Deterministic mock backend data for the residential site-management CRM.
// The model is shaped around the client request: 769 flats, service, finance,
// bookings, access control, deposits, debt restrictions, and AI work queues.

export type FlatStatus = "occupied" | "vacant" | "reserved" | "maintenance" | "blocked"
export type AccessStatus = "active" | "restricted" | "pending" | "disabled"
export type PaymentStatus = "clear" | "minor_debt" | "overdue" | "legal"
export type ServicePriority = "low" | "medium" | "high" | "urgent"
export type ServiceStatus = "open" | "assigned" | "waiting_payment" | "in_progress" | "resolved" | "closed"
export type BookingStatus = "confirmed" | "precheck_pending" | "move_in_today" | "checkout_today" | "deposit_review" | "cancelled"
export type DepositStatus = "not_required" | "reserved" | "held" | "deduction_pending" | "refund_ready"
export type PhaseDeliveryStatus = "complete" | "ready_for_uat" | "in_progress" | "blocked"
export type ViewingStatus = "planned" | "confirmed" | "completed" | "follow_up_due" | "no_show"
export type PaymentPlanStatus = "on_track" | "due_soon" | "overdue" | "blocked"
export type PurchaseDocumentStatus = "verified" | "pending" | "missing" | "expired" | "rejected"
export type EligibilityStatus = "qualified" | "review_required" | "blocked" | "partner_review"

export interface FlatRecord {
  id: string
  block: string
  floor: number
  number: string
  type: string
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
  unitType: "1+1" | "2+1 Garden" | "2+1 Penthouse" | "3+1 Penthouse"
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
  role: "manager" | "accountant" | "maintenance" | "security" | "resident_support" | "admin"
  team: string
  phone: string
  language: "tr" | "en" | "de" | "ru"
  activeTasks: number
  approvalLimitTry: number
  accessScope: "all_site" | "finance_only" | "field_only" | "support_only"
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

const ownerNames = [
  "Ayse Kaya",
  "Mehmet Yilmaz",
  "Elena Sokolova",
  "Fatma Sahin",
  "Sergey Petrov",
  "Murat Demir",
  "Olga Ivanova",
  "Deniz Arslan",
  "Mustafa Aydin",
  "Anna Kuznetsova",
]

const residentNames = [
  "Aylin K.",
  "Burak T.",
  "Elif D.",
  "Cem O.",
  "Mert A.",
  "Zeynep S.",
  "Daria P.",
  "Kemal Y.",
  "Nina V.",
  "Hakan E.",
]

const assignees = [
  "Teknik - Ahmet",
  "Teknik - Burak",
  "Güvenlik - Selim",
  "Temizlik - Esra",
  "Muhasebe - Merve",
  "Operasyon - Can",
]

const blockNames = ["A", "B", "C", "D", "E", "F", "G", "H"]

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

export const flats: FlatRecord[] = Array.from({ length: 769 }).map((_, index) => {
  const block = blockNames[Math.min(Math.floor(index / 96), blockNames.length - 1)]
  const withinBlock = index - blockNames.indexOf(block) * 96
  const floor = Math.floor(withinBlock / 8) + 1
  const door = (withinBlock % 8) + 1
  const number = `${block}-${String(floor).padStart(2, "0")}${String(door).padStart(2, "0")}`
  const status: FlatStatus =
    index % 53 === 0
      ? "blocked"
      : index % 37 === 0
        ? "maintenance"
        : index % 19 === 0
          ? "vacant"
          : index % 29 === 0
            ? "reserved"
            : "occupied"
  const monthlyFeeTry = 1650 + (floor % 4) * 225 + (door % 3) * 80
  const balanceTry =
    status === "vacant"
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

  return {
    id: `FLAT-${1001 + index}`,
    block,
    floor,
    number,
    type: floor > 10 ? "3+1" : door % 4 === 0 ? "2+1" : door % 3 === 0 ? "1+1" : "Stüdyo",
    status,
    ownerName: ownerNames[index % ownerNames.length],
    residentName: residentType === "empty" ? "Boş" : residentNames[index % residentNames.length],
    residentType,
    phone: `+90 549 55${String(7000 + index).slice(-4)}`,
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

export const paymentPlans: PaymentPlanRecord[] = [
  {
    id: "PAY-701",
    dealName: "NLP-2G-014",
    buyerName: "Markus Weber",
    unitType: "2+1 Garden",
    listPriceEur: 241800,
    downPaymentPercent: 35,
    paidEur: 84630,
    nextDueEur: 18135,
    nextDueAt: isoDaysFromAnchor(9, 12),
    currencyRisk: "medium",
    status: "due_soon",
    approvalBlocker: "Payment plan signature pending",
  },
  {
    id: "PAY-702",
    dealName: "NLP-1A-092",
    buyerName: "Elena Morozova",
    unitType: "1+1",
    listPriceEur: 137600,
    downPaymentPercent: 35,
    paidEur: 48160,
    nextDueEur: 0,
    nextDueAt: isoDaysFromAnchor(28, 12),
    currencyRisk: "low",
    status: "on_track",
    approvalBlocker: "No blocker",
  },
  {
    id: "PAY-703",
    dealName: "NLP-PH-301",
    buyerName: "Ahmed Al Mansouri",
    unitType: "3+1 Penthouse",
    listPriceEur: 295900,
    downPaymentPercent: 40,
    paidEur: 80000,
    nextDueEur: 38360,
    nextDueAt: isoDaysFromAnchor(-3, 12),
    currencyRisk: "high",
    status: "overdue",
    approvalBlocker: "Second installment not verified",
  },
  {
    id: "PAY-704",
    dealName: "NLP-PH-217",
    buyerName: "Ayşe Karaca",
    unitType: "2+1 Penthouse",
    listPriceEur: 241900,
    downPaymentPercent: 35,
    paidEur: 0,
    nextDueEur: 84665,
    nextDueAt: isoDaysFromAnchor(2, 12),
    currencyRisk: "medium",
    status: "blocked",
    approvalBlocker: "Reservation contract missing",
  },
]

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

export const documentVault: DocumentVaultRecord[] = ([
  ["DOC-9001", "A-0101", "Ayse Kaya", "Aidat borcu yasal takip bildirimi.pdf", "Aidat", "verified", "420 KB", -1, "10 yıl finans arşivi"],
  ["DOC-9002", "A-0307", "Deniz Arslan", "Check-out hasar fotoğraf paketi.zip", "Depozito", "pending", "18.2 MB", 0, "Rezervasyon kapanışına bağlı"],
  ["DOC-9003", "B-0701", "Daria P.", "Depozito iade onayı.pdf", "Depozito", "pending", "860 KB", -2, "2 yıl misafir işlem arşivi"],
  ["DOC-9004", "C-0808", "Anna K.", "Kimlik ve giriş formu.pdf", "Kimlik", "verified", "1.4 MB", -1, "KVKK sınırlı erişim"],
  ["DOC-9005", "D-0702", "Mustafa Aydin", "Erişim kartı teslim tutanağı.pdf", "Uyum", "missing", "0 KB", -4, "Eksik belge alarmı"],
  ["DOC-9006", "F-0501", "Fatma Sahin", "Balkon camı servis raporu.pdf", "Servis", "verified", "2.1 MB", -3, "Servis kapanış kanıtı"],
  ["DOC-9007", "G-0405", "Sergey Petrov", "Otopark plaka yetki formu.pdf", "Uyum", "expired", "790 KB", -30, "Yenileme gerekli"],
  ["DOC-9008", "H-0303", "Mustafa Aydin", "Yasal takip dosyası.pdf", "Aidat", "verified", "3.8 MB", -1, "Hukuk erişimi gerekli"],
] as const).map(([id, flatNumber, ownerName, name, category, status, size, updatedOffset, retentionRule]) => ({
  id,
  flatNumber,
  ownerName,
  name,
  category,
  status,
  size,
  updatedAt: isoDaysFromAnchor(updatedOffset, 13),
  retentionRule,
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
    phase: 2,
    title: "UX/UI ve rol bazlı navigasyon",
    status: "complete",
    owner: "Product + UX",
    businessOutcome: "Yönetici, muhasebe, saha ekibi ve destek rolleri kendi işleri için sade bir panelden ilerler.",
    userGuide: "Sol menüden rolünüze açık modülü seçin; üst kartlarda kritik sayılar, altta detay tabloları ve arama kullanılır.",
    evidence: ["Rol bazlı menü", "Mobil uyumlu dashboard", "26/26 browser route audit", "Turkish workflow copy"],
  },
  {
    phase: 3,
    title: "Platform, Auth, RBAC ve audit temeli",
    status: "complete",
    owner: "Platform + Security",
    businessOutcome: "Demo auth, rol matrisi, yetki görünürlüğü ve denetim izi aynı işletim modeline bağlandı.",
    userGuide: "Ayarlar ekranında güvenlik kontrollerini, rol yetkilerini ve son audit olaylarını inceleyin.",
    evidence: ["Demo role switching", "RBAC filtered navigation", "Audit event model", "Supabase RLS migration draft"],
  },
  {
    phase: 4,
    title: "Site, blok, kat, daire ve import kontrolü",
    status: "complete",
    owner: "Data + Operations",
    businessOutcome: "769 daire blok/kat/durum/borç/erişim ilişkisiyle yönetilebilir ve import kalite kontrolü görülebilir.",
    userGuide: "Daire Matrisi ekranında blok özetini, görsel matrisi, import doğrulamasını ve detay tablosunu kullanın.",
    evidence: ["769 deterministic units", "Block/floor matrix", "Import validation summary", "Debt and access state"],
  },
  {
    phase: 5,
    title: "Malik, kiracı, misafir, personel ve roller",
    status: "complete",
    owner: "Operations + Admin",
    businessOutcome: "Sakin ve personel kayıtları ilişki, dil, iletişim, risk, görev ve yetki kapsamıyla takip edilir.",
    userGuide: "Sakinler ekranında müşteri kayıtlarını, Kullanıcılar & Roller ekranında ekip ve yetki matrisini yönetin.",
    evidence: ["Resident profile model", "Staff role table", "Role coverage matrix", "Risk and access indicators"],
  },
  {
    phase: 6,
    title: "Besichtigung, online tur ve takip akışı",
    status: "complete",
    owner: "Sales + Customer Success",
    businessOutcome: "Online tur, saha ziyareti, geri arama ve belge görüşmeleri lead hedefi, dil, sorumlu ve takip tarihiyle yönetilir.",
    userGuide: "Rezervasyon ekranında Phase 6 tur pipeline kartlarını, bugünkü işleri ve follow-up gerektiren görüşmeleri takip edin.",
    evidence: ["Viewing pipeline", "Follow-up due states", "Lead language and buyer-goal context", "No-show recovery action"],
  },
  {
    phase: 7,
    title: "Satış finans planı, 0% taksit ve blokaj",
    status: "complete",
    owner: "Finance + Sales",
    businessOutcome: "New Level Premium satışları için liste fiyatı, peşinat, kalan taksit, vade, kur riski ve onay blokajı aynı yerde okunur.",
    userGuide: "Finans ekranında Phase 7 ödeme planı kartlarını ve taksit tablosunu kullanarak gecikme, vade ve sözleşme blokajını kontrol edin.",
    evidence: ["0% installment plan model", "Overdue and blocked deal states", "Currency-risk indicators", "Approval blocker field"],
  },
  {
    phase: 8,
    title: "TAPU, KYC, EIDS ve satış belge dosyası",
    status: "complete",
    owner: "Backoffice + Compliance",
    businessOutcome: "Kaufakte; pasaport, KYC, TAPU, rezervasyon, satış sözleşmesi, EIDS ve ödeme planı statüleriyle takip edilir.",
    userGuide: "Belgeler ekranında Phase 8 satış dosyası kartlarını kullanın; eksik, bekleyen, reddedilen ve doğrulanan belgeleri arayın.",
    evidence: ["Purchase checklist", "Document-risk statuses", "TAPU/KYC/EIDS categories", "Next-action guidance"],
  },
  {
    phase: 9,
    title: "Oturum, vatandaşlık ve alıcı uygunluk ön kontrolü",
    status: "complete",
    owner: "Sales + Legal Partner",
    businessOutcome: "Alıcı hedefi, uyruk, bütçe, hedef daire, ekspertiz ihtiyacı ve bölge kontrolü garanti vermeden ön kontrolde gösterilir.",
    userGuide: "Erişim & Uyum ekranında Phase 9 uygunluk tablosunu kullanın; hukuki partner incelemesi gereken veya blokeli durumları ayırın.",
    evidence: ["Eligibility pre-check", "Residence/citizenship guardrails", "District quota status", "Legal partner review queue"],
  },
]

export const platformControls: PlatformControl[] = [
  {
    id: "CTL-AUTH-01",
    area: "Auth",
    title: "Demo rol seçimi ve gerçek auth ayrımı",
    status: "active",
    owner: "Platform",
    detail: "Supabase yoksa demo profil devreye girer; Supabase yapılandırıldığında gerçek kullanıcı profili önceliklidir.",
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
    detail: "Supabase migration şirket, site ve rol bağlamını RLS politikalarına hazırlayacak şekilde tasarlanmıştır.",
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
    actor: "Demo Manager",
    action: "Rol bazlı panele giriş yaptı",
    module: "Auth",
    risk: "low",
    timestamp: isoDaysFromAnchor(0, 8),
    decision: "Oturum demo rolüyle sınırlandı.",
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

export const importBatches: ImportBatch[] = [
  {
    id: "IMP-769-01",
    source: "Client master flat list",
    totalRows: 769,
    validRows: 752,
    warningRows: 17,
    rejectedRows: 0,
    status: "ready_to_apply",
    importedBy: "Operations Admin",
    checkedAt: isoDaysFromAnchor(0, 13),
  },
  {
    id: "IMP-RES-02",
    source: "Owner and resident contact list",
    totalRows: 618,
    validRows: 603,
    warningRows: 15,
    rejectedRows: 0,
    status: "review_required",
    importedBy: "Resident Support",
    checkedAt: isoDaysFromAnchor(0, 14),
  },
  {
    id: "IMP-FIN-03",
    source: "Opening balance ledger",
    totalRows: 769,
    validRows: 769,
    warningRows: 0,
    rejectedRows: 0,
    status: "validated",
    importedBy: "Finance",
    checkedAt: isoDaysFromAnchor(0, 15),
  },
]

export const importFindings: ImportFinding[] = [
  {
    id: "FND-01",
    severity: "warning",
    area: "Sakin telefon",
    affectedRows: 9,
    message: "Bazı telefonlar WhatsApp formatına göre eksik ülke kodu içeriyor.",
    recommendedAction: "Import öncesi +90 standardına normalize edin.",
  },
  {
    id: "FND-02",
    severity: "warning",
    area: "Kimlik durumu",
    affectedRows: 6,
    message: "Misafir kayıtlarında kimlik belgesi bekleyen satırlar var.",
    recommendedAction: "Erişim kodu üretilmeden belge kontrolü zorunlu kalsın.",
  },
  {
    id: "FND-03",
    severity: "info",
    area: "Daire tipi",
    affectedRows: 2,
    message: "Daire tipi müşteri dosyasında boş, sistem varsayılan değer önerdi.",
    recommendedAction: "Operasyon yöneticisi import ön izlemesinde doğrulasın.",
  },
  {
    id: "FND-04",
    severity: "info",
    area: "Açılış bakiyesi",
    affectedRows: 0,
    message: "Finans açılış bakiyesi satırlarında kritik hata bulunmadı.",
    recommendedAction: "Ledger importu çift kayıt korumasıyla uygulanabilir.",
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
    role: "maintenance",
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
    role: "security",
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
    role: "resident_support",
    team: "Sakin Destek",
    phone: "+90 532 110 1005",
    language: "ru",
    activeTasks: 18,
    approvalLimitTry: 5000,
    accessScope: "support_only",
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
  { role: "Yönetici", users: 2, canApproveFinance: true, canRestrictAccess: true, canManageUsers: true, canExportData: true },
  { role: "Muhasebe", users: 3, canApproveFinance: true, canRestrictAccess: false, canManageUsers: false, canExportData: true },
  { role: "Teknisyen", users: 8, canApproveFinance: false, canRestrictAccess: false, canManageUsers: false, canExportData: false },
  { role: "Güvenlik", users: 5, canApproveFinance: false, canRestrictAccess: true, canManageUsers: false, canExportData: false },
  { role: "Sakin Destek", users: 4, canApproveFinance: false, canRestrictAccess: false, canManageUsers: false, canExportData: false },
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
    return {
      block,
      total: records.length,
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
