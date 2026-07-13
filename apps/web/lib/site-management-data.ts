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
export type ServiceStatus = "open" | "assigned" | "waiting_approval" | "waiting_payment" | "in_progress" | "resolved" | "closed"
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
  description?: string | null
  category: string
  priority: ServicePriority
  status: ServiceStatus
  assignee: string
  requester: string
  requesterRole?: string
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
  resourceName?: string
  notes?: string | null
  approvalStatus?: "pending_owner" | "approved" | "rejected"
  channel: "Airbnb" | "Booking.com" | "Owner" | "Direct" | "Corporate"
  checkIn: string
  checkOut: string
  status: BookingStatus
  depositStatus: DepositStatus
  depositTry: number
  accessCodeStatus: AccessStatus
  cleaningStatus: "scheduled" | "in_progress" | "done" | "blocked"
}

export type ReadinessStepStatus = "done" | "pending" | "blocked"

export interface ReadinessStep {
  label: string
  owner: string
  status: ReadinessStepStatus
}

export interface BookingReadinessRecord {
  id: string
  bookingId: string
  flatNumber: string
  guestName: string
  readinessScore: number
  riskLevel: "low" | "medium" | "high" | "critical"
  steps: ReadinessStep[]
  blocker: string
  nextAction: string
}

export interface TurnoverTaskRecord {
  id: string
  bookingId: string
  flatNumber: string
  title: string
  owner: string
  status: "queued" | "in_progress" | "ready" | "blocked"
  priority: ServicePriority
  dueAt: string
  slaHoursRemaining: number
  progress: number
  evidenceRequired: boolean
  checklist: string[]
  dependency: string
  nextAction: string
}

export interface AccessHandoffRecord {
  id: string
  bookingId: string
  flatNumber: string
  credential: "mobile_code" | "card" | "plate" | "qr"
  provider: "demo" | "Salto KS" | "Hikvision" | "Dormakaba" | "Parasut task"
  status: AccessStatus
  validFrom: string
  validUntil: string
  blocker: string
  nextAction: string
}

export interface DepositSettlementRecord {
  id: string
  bookingId: string
  flatNumber: string
  guestName: string
  depositTry: number
  proposedDeductionTry: number
  refundTry: number
  status: "not_started" | "evidence_needed" | "manager_review" | "finance_ready" | "closed"
  evidenceCount: number
  approvalOwner: string
  nextAction: string
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
  storageBucket?: string | null
  storagePath?: string | null
  sourcePath?: string | null
}

export interface CommunicationThreadRecord {
  id: string
  channel: "WhatsApp" | "Portal" | "Email" | "SMS" | "Push" | "Team"
  audience: "Malik" | "Kiraci" | "Misafir" | "Personel" | "Operasyon" | "Muhasebe"
  subject: string
  owner: string
  status: "needs_reply" | "in_progress" | "ready" | "blocked"
  priority: ServicePriority
  language: "tr" | "en" | "de" | "ru"
  relatedEntity: string
  consentStatus: "ok" | "missing" | "opted_out"
  sentiment: "positive" | "neutral" | "risk"
  lastMessage: string
  nextAction: string
}

export interface NotificationRuleRecord {
  id: string
  trigger: string
  target: string
  channel: "WhatsApp + E-posta" | "Push + SMS" | "Portal + E-posta" | "Team + Push"
  owner: string
  status: "active" | "review" | "disabled"
  languageMode: "single" | "multilingual"
  approvalRequired: boolean
  failover: string
}

export interface NotificationDeliveryRecord {
  id: string
  ruleId: string
  recipient: string
  channel: "WhatsApp" | "Email" | "SMS" | "Push" | "Portal"
  status: "queued" | "sent" | "delivered" | "failed" | "manual_review"
  relatedEntity: string
  attempts: number
  lastAttemptAt: string
  nextRetryAt: string
  providerMode: "demo" | "provider_ready" | "manual"
}

export interface MessageTemplateRecord {
  id: string
  title: string
  useCase:
    | "booking_confirmation"
    | "pre_arrival"
    | "move_in"
    | "in_stay"
    | "checkout"
    | "post_stay"
    | "debt"
    | "service"
    | "document"
    | "announcement"
    | "onboarding"
  languages: Array<"tr" | "en" | "de" | "ru">
  channel: "WhatsApp" | "Email" | "SMS" | "Push" | "Portal"
  owner: string
  approvalStatus: "approved" | "needs_review" | "draft"
  variables: string[]
  preview: string
}

export interface GuestLifecycleEventRecord {
  id: string
  bookingId: string
  flatNumber: string
  guestName: string
  stage: "booking_confirmed" | "pre_arrival" | "arrival_day" | "in_stay" | "checkout" | "post_stay_feedback"
  channel: "WhatsApp" | "Email" | "SMS" | "Push" | "Portal" | "Call"
  timing: string
  status: "ready" | "queued" | "sent" | "suppressed" | "needs_review"
  tone: "warm" | "informational" | "service" | "feedback" | "risk"
  title: string
  body: string
  fallback: string
  edgeCase: string
  consentRequired: boolean
  sentimentSignal: "none" | "positive" | "watch" | "recovery"
  owner: string
  nextAction: string
}

export interface RoleOnboardingPlanRecord {
  role: "admin" | "manager" | "accountant" | "staff" | "owner" | "tenant"
  title: string
  audience: string
  inviteMode: "admin_invite" | "request_approval" | "provider_ready"
  identityOptions: string[]
  requiredChecks: string[]
  firstRunSteps: string[]
  defaultChannel: "Portal" | "Email" | "WhatsApp" | "Push"
  productionGate: string
}

export interface MobileWebCapabilityRecord {
  id: string
  title: string
  audience: "manager" | "staff" | "resident" | "all"
  surface: "Responsive Web" | "Installable PWA" | "Offline Queue" | "Touch UX" | "Accessibility"
  status: "ready" | "simulation" | "provider_ready" | "needs_device_test"
  priority: "core" | "important" | "later"
  description: string
  evidence: string
  qaSignal: string
}

export interface OfflineSyncRecord {
  id: string
  role: "manager" | "staff" | "owner" | "tenant"
  module: "tickets" | "calendar" | "documents" | "communications" | "dashboard"
  action: string
  status: "synced" | "queued" | "conflict" | "read_only_cached"
  device: string
  lastSyncAt: string
  retryPolicy: string
  dataScope: string
  guardrail: string
}

export interface IntegrationProviderRecord {
  id: string
  category:
    | "Supabase"
    | "Payments"
    | "Banking"
    | "SMS"
    | "Email"
    | "Access"
    | "Camera"
    | "Identity"
    | "Ticketing"
  provider: string
  mode: "live" | "simulation" | "placeholder" | "provider_ready"
  status: "connected" | "demo_ready" | "blocked_pending_client" | "manual_fallback"
  idealNow: string
  scalePath: string
  requiredFromClient: string
  dataHandled: string
  fallback: string
  riskLevel: "low" | "medium" | "high"
}

export interface AiRecommendationRecord {
  id: string
  mode:
    | "daily_briefing"
    | "service_triage"
    | "debt_risk"
    | "booking_review"
    | "report_draft"
    | "integration_advice"
    | "natural_language_search"
  title: string
  audience: "admin" | "manager" | "accountant" | "staff" | "resident"
  status: "ready" | "human_review" | "provider_ready"
  confidence: number
  languageSupport: Array<"tr" | "en" | "de" | "ru">
  sourceRecords: string[]
  recommendation: string
  humanApproval: string
  modelFit: string
}

export interface AiImageWorkflowRecord {
  id: string
  title: string
  source: "service_photo" | "checkout_photo" | "document_scan" | "camera_event"
  status: "mock_ready" | "provider_ready" | "human_review"
  aiUse: string
  guardrail: string
  output: string
}

export interface DocumentPacketRecord {
  id: string
  title: string
  audience: "owner" | "tenant" | "guest" | "buyer" | "staff" | "management"
  relatedEntity: string
  status: "complete" | "missing_items" | "signature_pending" | "review"
  requiredDocuments: number
  completedDocuments: number
  signatureStatus: "not_required" | "sent" | "signed" | "blocked"
  retentionClass: "legal" | "finance" | "service" | "guest"
  nextAction: string
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
    id: "CAT-EMERG-LIFE-SAFETY",
    code: "EMERG-LIFE-SAFETY",
    name: "Can guvenligi ve gaz/duman alarmi",
    category: "security",
    description: "Gaz kokusu, duman, yangin alarmi veya can guvenligi uyarisi icin aninda guvenlik ve yonetici eskalasyonu.",
    basePriceTry: 0,
    currency: "TRY",
    slaHours: 1,
    debtPolicy: "allow",
    requiresPayment: false,
    requiresDeposit: false,
    team: "Guvenlik",
    providerType: "mixed",
    active: true,
    serviceLevel: "emergency",
    popularityScore: 99,
  },
  {
    id: "CAT-MAINT-ELEC",
    code: "MAINT-ELEC",
    name: "Acil elektrik kesintisi ve kivilcim riski",
    category: "maintenance",
    description: "Daire veya ortak alanda elektrik kesintisi, kivilcim, pano kokusu ve aydinlatma riski icin teknik mudaahele.",
    basePriceTry: 7200,
    currency: "TRY",
    slaHours: 2,
    debtPolicy: "allow",
    requiresPayment: true,
    requiresDeposit: false,
    team: "Teknik",
    providerType: "mixed",
    active: true,
    serviceLevel: "emergency",
    popularityScore: 94,
  },
  {
    id: "CAT-MAINT-ELEVATOR",
    code: "MAINT-ELEVATOR",
    name: "Asansor arizasi ve kabinde kalma",
    category: "maintenance",
    description: "Asansor durmasi, kabinde kalma, kata hizalanmama veya alarm durumunda sozlesmeli servis ve guvenlik yonlendirmesi.",
    basePriceTry: 0,
    currency: "TRY",
    slaHours: 1,
    debtPolicy: "allow",
    requiresPayment: false,
    requiresDeposit: false,
    team: "Teknik",
    providerType: "vendor",
    active: true,
    serviceLevel: "emergency",
    popularityScore: 93,
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
    id: "CAT-MAINT-SEWER",
    code: "MAINT-SEWER",
    name: "Gider tasmasi ve kanalizasyon riski",
    category: "maintenance",
    description: "Gider tikanikligi, tuvalet tasmasi, kotu koku ve hijyen riski icin acil tesisat/vendor yonlendirmesi.",
    basePriceTry: 8600,
    currency: "TRY",
    slaHours: 3,
    debtPolicy: "allow",
    requiresPayment: true,
    requiresDeposit: false,
    team: "Teknik",
    providerType: "vendor",
    active: true,
    serviceLevel: "emergency",
    popularityScore: 90,
  },
  {
    id: "CAT-MAINT-HVAC-URGENT",
    code: "MAINT-HVAC-URGENT",
    name: "Acil klima ve konfor riski",
    category: "maintenance",
    description: "Yuksek sicaklik, yasli/misafir konfor riski veya premium konaklama sikayeti icin hizli klima kontrolu.",
    basePriceTry: 6500,
    currency: "TRY",
    slaHours: 8,
    debtPolicy: "allow",
    requiresPayment: true,
    requiresDeposit: false,
    team: "Teknik",
    providerType: "mixed",
    active: true,
    serviceLevel: "emergency",
    popularityScore: 86,
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
    id: "CAT-AMENITY-SPA-INCIDENT",
    code: "AMENITY-SPA-INCIDENT",
    name: "Spa, havuz ve ortak alan olay yonetimi",
    category: "amenity",
    description: "Spa, havuz, fitness veya ortak alanda hijyen, kapasite, ekipman ya da misafir guvenligi olayini is akisiyla yonetir.",
    basePriceTry: 0,
    currency: "TRY",
    slaHours: 2,
    debtPolicy: "allow",
    requiresPayment: false,
    requiresDeposit: false,
    team: "Sakin destek",
    providerType: "mixed",
    active: true,
    serviceLevel: "emergency",
    popularityScore: 83,
  },
  {
    id: "CAT-AMENITY-FOOD-EVENT-INCIDENT",
    code: "AMENITY-FOOD-EVENT-INCIDENT",
    name: "Restoran ve etkinlik operasyon olayi",
    category: "amenity",
    description: "Restoran, tiyatro, etkinlik veya kalabalik sosyal alanlarda kapasite, servis aksakligi ve misafir sikayetlerini yonlendirir.",
    basePriceTry: 0,
    currency: "TRY",
    slaHours: 2,
    debtPolicy: "allow",
    requiresPayment: false,
    requiresDeposit: false,
    team: "Restoran",
    providerType: "mixed",
    active: true,
    serviceLevel: "emergency",
    popularityScore: 81,
  },
  {
    id: "CAT-AMENITY-THEATRE",
    code: "AMENITY-THEATRE",
    name: "Saha etkinlik ve tiyatro performansi",
    category: "amenity",
    description: "Site icindeki tiyatro, sahne ve etkinlik talepleri icin kapasite, takvim ve sakin uygunluk kontrolu.",
    basePriceTry: 0,
    currency: "TRY",
    slaHours: 72,
    debtPolicy: "manager_review",
    requiresPayment: false,
    requiresDeposit: false,
    team: "Sosyal tesis",
    providerType: "mixed",
    active: true,
    serviceLevel: "premium",
    popularityScore: 69,
  },
  {
    id: "CAT-AMENITY-RESTAURANT",
    code: "AMENITY-RESTAURANT",
    name: "Restoran rezervasyonu ve malik avantajlari",
    category: "amenity",
    description: "Restoran kullanimi, masa rezervasyonu, malik avantajlari ve misafir yonlendirme talepleri.",
    basePriceTry: 0,
    currency: "TRY",
    slaHours: 24,
    debtPolicy: "manager_review",
    requiresPayment: false,
    requiresDeposit: false,
    team: "Sakin destek",
    providerType: "mixed",
    active: true,
    serviceLevel: "standard",
    popularityScore: 76,
  },
  {
    id: "CAT-CONCIERGE-EXCURSION",
    code: "CONCIERGE-EXCURSION",
    name: "Tur, quad, bisiklet, jeep ve dag gezisi yonlendirmesi",
    category: "concierge",
    description: "Quad, bisiklet turu, jeep safari, dag gezisi ve yerel aktivite talepleri icin dis saglayici yonlendirmesi.",
    basePriceTry: 3500,
    currency: "TRY",
    slaHours: 48,
    debtPolicy: "manager_review",
    requiresPayment: true,
    requiresDeposit: false,
    team: "Concierge",
    providerType: "vendor",
    active: true,
    serviceLevel: "premium",
    popularityScore: 72,
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
    id: "CAT-SEC-LOCKOUT",
    code: "SEC-LOCKOUT",
    name: "Acil erisim, kapi ve bariyer kilidi",
    category: "security",
    description: "Daireye girememe, kart/QR calismamasi, kapida kalma, bariyer veya plaka gecis arizasi icin guvenlik yonlendirmesi.",
    basePriceTry: 1200,
    currency: "TRY",
    slaHours: 2,
    debtPolicy: "allow",
    requiresPayment: true,
    requiresDeposit: false,
    team: "Guvenlik",
    providerType: "internal",
    active: true,
    serviceLevel: "emergency",
    popularityScore: 88,
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
  "Can guvenligi": "CAT-EMERG-LIFE-SAFETY",
  Gaz: "CAT-EMERG-LIFE-SAFETY",
  Duman: "CAT-EMERG-LIFE-SAFETY",
  Yangin: "CAT-EMERG-LIFE-SAFETY",
  Asansor: "CAT-MAINT-ELEVATOR",
  Tesisat: "CAT-MAINT-PLUMB",
  Su: "CAT-MAINT-PLUMB",
  Gider: "CAT-MAINT-SEWER",
  Kanalizasyon: "CAT-MAINT-SEWER",
  Tuvalet: "CAT-MAINT-SEWER",
  Iklimlendirme: "CAT-MAINT-AC",
  "Acil klima": "CAT-MAINT-HVAC-URGENT",
  "Finans onayi": "CAT-AMENITY-SPA",
  Guvenlik: "CAT-SEC-ACCESS",
  Depozito: "CAT-INSP-DAMAGE",
  Elektrik: "CAT-MAINT-ELEC",
  Temizlik: "CAT-CLEAN-STD",
  "Ortak alan": "CAT-AMENITY-SPA",
  Spa: "CAT-AMENITY-SPA",
  Havuz: "CAT-AMENITY-SPA-INCIDENT",
  Fitness: "CAT-AMENITY-SPA",
  Restoran: "CAT-AMENITY-RESTAURANT",
  "Restoran olayi": "CAT-AMENITY-FOOD-EVENT-INCIDENT",
  Tiyatro: "CAT-AMENITY-THEATRE",
  Etkinlik: "CAT-AMENITY-THEATRE",
  "Etkinlik olayi": "CAT-AMENITY-FOOD-EVENT-INCIDENT",
  Gezi: "CAT-CONCIERGE-EXCURSION",
  Tur: "CAT-CONCIERGE-EXCURSION",
  Erisim: "CAT-SEC-ACCESS",
  "Acil erisim": "CAT-SEC-LOCKOUT",
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

function readinessStepsForBooking(booking: BookingRecord): ReadinessStep[] {
  const depositReady =
    booking.depositStatus === "held" ||
    booking.depositStatus === "not_required" ||
    booking.depositStatus === "refund_ready"
  const accessReady = booking.accessCodeStatus === "active"
  const cleaningReady = booking.cleaningStatus === "done"
  const checkoutFlow = booking.status === "checkout_today" || booking.status === "deposit_review"

  return [
    {
      label: "Identity and guest profile",
      owner: "Front office",
      status: booking.status === "precheck_pending" ? "pending" : "done",
    },
    {
      label: checkoutFlow ? "Checkout evidence" : "Deposit/payment gate",
      owner: checkoutFlow ? "Operations" : "Finance",
      status: depositReady ? "done" : booking.depositStatus === "deduction_pending" ? "blocked" : "pending",
    },
    {
      label: checkoutFlow ? "Damage inspection" : "Cleaning checklist",
      owner: "Housekeeping",
      status: cleaningReady ? "done" : booking.cleaningStatus === "blocked" ? "blocked" : "pending",
    },
    {
      label: checkoutFlow ? "Access revoke" : "Access handoff",
      owner: "Security",
      status: accessReady ? "done" : booking.accessCodeStatus === "restricted" ? "blocked" : "pending",
    },
    {
      label: checkoutFlow ? "Final statement" : "Welcome message",
      owner: "Support",
      status: booking.status === "deposit_review" ? "pending" : "done",
    },
  ]
}

function readinessRisk(steps: ReadinessStep[], booking: BookingRecord): BookingReadinessRecord["riskLevel"] {
  const blocked = steps.filter((step) => step.status === "blocked").length
  const pending = steps.filter((step) => step.status === "pending").length

  if (blocked >= 2 || booking.accessCodeStatus === "restricted") return "critical"
  if (blocked > 0 || booking.status === "deposit_review") return "high"
  if (pending >= 2 || booking.status === "precheck_pending") return "medium"
  return "low"
}

function readinessNextAction(booking: BookingRecord, steps: ReadinessStep[]) {
  const blocked = steps.find((step) => step.status === "blocked")
  if (blocked) return `${blocked.owner}: unblock ${blocked.label.toLowerCase()} before guest flow continues`
  const pending = steps.find((step) => step.status === "pending")
  if (pending) return `${pending.owner}: finish ${pending.label.toLowerCase()}`
  if (booking.status === "checkout_today") return "Close inspection and prepare deposit statement"
  if (booking.status === "move_in_today") return "Send final arrival instruction and monitor access log"
  return "Keep booking monitored in normal queue"
}

export const bookingReadinessRecords: BookingReadinessRecord[] = bookings.map((booking) => {
  const steps = readinessStepsForBooking(booking)
  const done = steps.filter((step) => step.status === "done").length
  const blocker = steps.find((step) => step.status === "blocked")?.label ?? "No hard blocker"

  return {
    id: `READY-${booking.id.replace("BKG-", "")}`,
    bookingId: booking.id,
    flatNumber: booking.flatNumber,
    guestName: booking.guestName,
    readinessScore: Math.round((done / steps.length) * 100),
    riskLevel: readinessRisk(steps, booking),
    steps,
    blocker,
    nextAction: readinessNextAction(booking, steps),
  }
})

export const turnoverTasks: TurnoverTaskRecord[] = bookings
  .filter((booking) => booking.status !== "cancelled")
  .flatMap((booking, index) => {
    const checkoutMode = booking.status === "checkout_today" || booking.status === "deposit_review"
    const cleaningStatus: TurnoverTaskRecord["status"] =
      booking.cleaningStatus === "done"
        ? "ready"
        : booking.cleaningStatus === "in_progress"
          ? "in_progress"
          : booking.cleaningStatus === "blocked"
            ? "blocked"
            : "queued"
    const inspectionProgress =
      booking.depositStatus === "refund_ready"
        ? 90
        : booking.depositStatus === "deduction_pending"
          ? 45
          : checkoutMode
            ? 35
            : 15
    const cleaningPriority: ServicePriority =
      checkoutMode ? "high" : booking.status === "move_in_today" ? "urgent" : "medium"
    const operationsStatus: TurnoverTaskRecord["status"] =
      booking.accessCodeStatus === "restricted" || booking.depositStatus === "deduction_pending"
        ? "blocked"
        : booking.accessCodeStatus === "active"
          ? "ready"
          : "queued"
    const operationsPriority: ServicePriority = checkoutMode ? "high" : "medium"

    const tasks: TurnoverTaskRecord[] = [
      {
        id: `TURN-${booking.id.replace("BKG-", "")}-CLEAN`,
        bookingId: booking.id,
        flatNumber: booking.flatNumber,
        title: checkoutMode ? "Checkout clean and damage sweep" : "Move-in cleaning handover",
        owner: "Housekeeping",
        status: cleaningStatus,
        priority: cleaningPriority,
        dueAt: checkoutMode ? booking.checkOut : booking.checkIn,
        slaHoursRemaining: checkoutMode ? index - 2 : 6 + index,
        progress: booking.cleaningStatus === "done" ? 100 : booking.cleaningStatus === "in_progress" ? 65 : 25,
        evidenceRequired: true,
        checklist: ["Room photos", "Linen/minibar state", "Meter/access note", "Supervisor closeout"],
        dependency: checkoutMode ? "Guest checkout time confirmed" : "Payment and identity precheck",
        nextAction: checkoutMode ? "Upload damage evidence and supervisor closeout" : "Confirm cleaning handover before guest arrival",
      },
      {
        id: `TURN-${booking.id.replace("BKG-", "")}-OPS`,
        bookingId: booking.id,
        flatNumber: booking.flatNumber,
        title: checkoutMode ? "Final statement package" : "Arrival instruction package",
        owner: checkoutMode ? "Finance" : "Guest support",
        status: operationsStatus,
        priority: operationsPriority,
        dueAt: checkoutMode ? booking.checkOut : booking.checkIn,
        slaHoursRemaining: checkoutMode ? index : 8 + index,
        progress: inspectionProgress,
        evidenceRequired: checkoutMode,
        checklist: checkoutMode
          ? ["Damage evidence", "Deposit math", "Manager approval", "Resident statement"]
          : ["Welcome message", "Access credential", "House rules", "Emergency contact"],
        dependency: checkoutMode ? "Inspection evidence complete" : "Access credential issued",
        nextAction: checkoutMode ? "Prepare final statement for finance approval" : "Send arrival instructions after access check",
      },
    ]
    return tasks
  })
  .slice(0, 14)

export const accessHandoffs: AccessHandoffRecord[] = bookings
  .filter((booking) => booking.status !== "cancelled")
  .map((booking, index) => ({
    id: `ACC-HO-${booking.id.replace("BKG-", "")}`,
    bookingId: booking.id,
    flatNumber: booking.flatNumber,
    credential: (["mobile_code", "card", "plate", "qr"] as const)[index % 4],
    provider: (["demo", "Salto KS", "Hikvision", "Dormakaba", "demo"] as const)[index % 5],
    status: booking.accessCodeStatus,
    validFrom: booking.checkIn,
    validUntil: booking.checkOut,
    blocker:
      booking.accessCodeStatus === "restricted"
        ? "Debt/deposit gate requires manager approval"
        : booking.accessCodeStatus === "pending"
          ? "Waiting for identity, payment or arrival time"
          : "No blocker",
    nextAction:
      booking.accessCodeStatus === "active"
        ? "Monitor first access event"
        : booking.status === "checkout_today"
          ? "Prepare revoke command after checkout"
          : "Prepare credential in demo queue",
  }))

export const depositSettlements: DepositSettlementRecord[] = bookings
  .filter((booking) => booking.depositTry > 0)
  .map((booking, index) => {
    const proposedDeductionTry =
      booking.depositStatus === "deduction_pending"
        ? Math.round(booking.depositTry * (index % 2 === 0 ? 0.35 : 0.22))
        : booking.depositStatus === "refund_ready"
          ? 0
          : booking.status === "checkout_today"
            ? Math.round(booking.depositTry * 0.12)
            : 0
    const status: DepositSettlementRecord["status"] =
      booking.depositStatus === "refund_ready"
        ? "finance_ready"
        : booking.depositStatus === "deduction_pending"
          ? "manager_review"
          : booking.status === "checkout_today"
            ? "evidence_needed"
            : "not_started"

    return {
      id: `SET-${booking.id.replace("BKG-", "")}`,
      bookingId: booking.id,
      flatNumber: booking.flatNumber,
      guestName: booking.guestName,
      depositTry: booking.depositTry,
      proposedDeductionTry,
      refundTry: Math.max(0, booking.depositTry - proposedDeductionTry),
      status,
      evidenceCount: status === "manager_review" ? 4 : status === "evidence_needed" ? 1 : 2,
      approvalOwner: status === "finance_ready" ? "Finance" : "Operations manager",
      nextAction:
        status === "finance_ready"
          ? "Create refund payment request"
          : status === "manager_review"
            ? "Approve itemized deductions with media evidence"
            : status === "evidence_needed"
              ? "Upload checkout inspection photos"
              : "Wait until checkout window opens",
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
  storagePath: document.path.replaceAll("\\", "/"),
  sourcePath: document.path,
}))

export const communicationThreads: CommunicationThreadRecord[] = [
  {
    id: "COM-301",
    channel: "WhatsApp",
    audience: "Malik",
    subject: "Aidat balance and access warning",
    owner: "Finance",
    status: "needs_reply",
    priority: "high",
    language: "tr",
    relatedEntity: "FIN-90PLUS",
    consentStatus: "ok",
    sentiment: "risk",
    lastMessage: "Payment plan needs approval today before access restriction is prepared.",
    nextAction: "Finance to send approved payment-plan link and log response",
  },
  {
    id: "COM-302",
    channel: "Portal",
    audience: "Kiraci",
    subject: "Air-condition service appointment",
    owner: "Resident support",
    status: "in_progress",
    priority: "medium",
    language: "en",
    relatedEntity: "SRV-202",
    consentStatus: "ok",
    sentiment: "neutral",
    lastMessage: "Technician will attach photo report after the visit.",
    nextAction: "Confirm visit slot and keep resident in the same thread",
  },
  {
    id: "COM-303",
    channel: "Team",
    audience: "Operasyon",
    subject: "Today checkout and deposit control",
    owner: "Operations",
    status: "ready",
    priority: "high",
    language: "tr",
    relatedEntity: "BKG-502",
    consentStatus: "ok",
    sentiment: "neutral",
    lastMessage: "Cleaning, damage evidence and refund decision are linked in one flow.",
    nextAction: "Supervisor to approve inspection package",
  },
  {
    id: "COM-304",
    channel: "Email",
    audience: "Malik",
    subject: "Monthly owner finance report ready",
    owner: "Finance",
    status: "ready",
    priority: "low",
    language: "de",
    relatedEntity: "RPT-02",
    consentStatus: "ok",
    sentiment: "positive",
    lastMessage: "Report is shared only with the relevant owner account.",
    nextAction: "Send secure portal link after final review",
  },
  {
    id: "COM-305",
    channel: "SMS",
    audience: "Misafir",
    subject: "Move-in access code precheck",
    owner: "Guest support",
    status: "blocked",
    priority: "urgent",
    language: "ru",
    relatedEntity: "BKG-503",
    consentStatus: "missing",
    sentiment: "risk",
    lastMessage: "SMS consent is missing; use portal and manual call fallback.",
    nextAction: "Collect consent or switch to portal-only message",
  },
  {
    id: "COM-306",
    channel: "Push",
    audience: "Personel",
    subject: "SLA breach prevention",
    owner: "Operations",
    status: "in_progress",
    priority: "urgent",
    language: "tr",
    relatedEntity: "TASK-204",
    consentStatus: "ok",
    sentiment: "neutral",
    lastMessage: "Field route needs media evidence before closeout.",
    nextAction: "Team lead to confirm ETA and upload proof",
  },
  {
    id: "COM-307",
    channel: "Portal",
    audience: "Muhasebe",
    subject: "Deposit settlement approval",
    owner: "Finance",
    status: "needs_reply",
    priority: "high",
    language: "tr",
    relatedEntity: "SET-508",
    consentStatus: "ok",
    sentiment: "risk",
    lastMessage: "Damage deduction needs manager approval and final statement.",
    nextAction: "Finance to review itemized deduction before refund",
  },
]

export const notificationRules: NotificationRuleRecord[] = [
  {
    id: "NTF-01",
    trigger: "Debt balance greater than zero and access risk",
    target: "Owner / tenant by unit relation",
    channel: "WhatsApp + E-posta",
    owner: "Finance",
    status: "active",
    languageMode: "multilingual",
    approvalRequired: true,
    failover: "Portal inbox and manual call",
  },
  {
    id: "NTF-02",
    trigger: "SLA below 4 hours",
    target: "Staff and operations manager",
    channel: "Team + Push",
    owner: "Operations",
    status: "active",
    languageMode: "single",
    approvalRequired: false,
    failover: "Team lead phone call",
  },
  {
    id: "NTF-03",
    trigger: "Check-in today",
    target: "Guest / tenant",
    channel: "Push + SMS",
    owner: "Guest support",
    status: "review",
    languageMode: "multilingual",
    approvalRequired: false,
    failover: "Portal inbox",
  },
  {
    id: "NTF-04",
    trigger: "Missing document or signature",
    target: "Owner / buyer",
    channel: "Portal + E-posta",
    owner: "Backoffice",
    status: "active",
    languageMode: "multilingual",
    approvalRequired: false,
    failover: "Manual document desk task",
  },
  {
    id: "NTF-05",
    trigger: "Checkout settlement ready",
    target: "Finance and operations manager",
    channel: "Team + Push",
    owner: "Finance",
    status: "active",
    languageMode: "single",
    approvalRequired: true,
    failover: "Daily finance queue",
  },
]

export const notificationDeliveries: NotificationDeliveryRecord[] = [
  {
    id: "DLV-7001",
    ruleId: "NTF-01",
    recipient: "A-14 owner",
    channel: "WhatsApp",
    status: "delivered",
    relatedEntity: "FIN-90PLUS",
    attempts: 1,
    lastAttemptAt: isoDaysFromAnchor(0, 8),
    nextRetryAt: isoDaysFromAnchor(0, 18),
    providerMode: "demo",
  },
  {
    id: "DLV-7002",
    ruleId: "NTF-03",
    recipient: "BKG-503 guest",
    channel: "SMS",
    status: "manual_review",
    relatedEntity: "BKG-503",
    attempts: 0,
    lastAttemptAt: isoDaysFromAnchor(0, 9),
    nextRetryAt: isoDaysFromAnchor(0, 12),
    providerMode: "manual",
  },
  {
    id: "DLV-7003",
    ruleId: "NTF-02",
    recipient: "Technical staff route",
    channel: "Push",
    status: "sent",
    relatedEntity: "TASK-204",
    attempts: 1,
    lastAttemptAt: isoDaysFromAnchor(0, 10),
    nextRetryAt: isoDaysFromAnchor(0, 14),
    providerMode: "provider_ready",
  },
  {
    id: "DLV-7004",
    ruleId: "NTF-04",
    recipient: "NLP-PH-217 buyer",
    channel: "Email",
    status: "queued",
    relatedEntity: "DOCBUY-806",
    attempts: 0,
    lastAttemptAt: isoDaysFromAnchor(0, 11),
    nextRetryAt: isoDaysFromAnchor(0, 13),
    providerMode: "demo",
  },
  {
    id: "DLV-7005",
    ruleId: "NTF-05",
    recipient: "Finance desk",
    channel: "Portal",
    status: "failed",
    relatedEntity: "SET-508",
    attempts: 2,
    lastAttemptAt: isoDaysFromAnchor(0, 12),
    nextRetryAt: isoDaysFromAnchor(0, 15),
    providerMode: "demo",
  },
]

export const guestLifecycleEvents: GuestLifecycleEventRecord[] = [
  {
    id: "GX-BOOK-501",
    bookingId: "BKG-501",
    flatNumber: "A-012",
    guestName: "Murat A.",
    stage: "booking_confirmed",
    channel: "WhatsApp",
    timing: "Immediately after booking confirmation",
    status: "sent",
    tone: "warm",
    title: "Thank you and booking received",
    body: "Thank you, Murat. Your New Level Premium stay is confirmed. We will keep the useful arrival details in one secure portal thread.",
    fallback: "Portal inbox copy is kept if WhatsApp fails.",
    edgeCase: "Do not send if booking is unpaid, duplicated or cancelled within the grace window.",
    consentRequired: true,
    sentimentSignal: "positive",
    owner: "Guest support",
    nextAction: "Keep the thread open for arrival questions",
  },
  {
    id: "GX-PRE-503",
    bookingId: "BKG-503",
    flatNumber: "A-038",
    guestName: "Corporate Group",
    stage: "pre_arrival",
    channel: "Portal",
    timing: "48 hours before arrival",
    status: "needs_review",
    tone: "informational",
    title: "Quiet pre-arrival checklist",
    body: "Your arrival checklist is ready: ID upload, deposit status, arrival time and house rules. Please complete it before access is released.",
    fallback: "Manual call task if portal is not opened within 12 hours.",
    edgeCase: "Hold access details until identity, deposit and consent checks are complete.",
    consentRequired: false,
    sentimentSignal: "watch",
    owner: "Guest support",
    nextAction: "Collect ID scan and house-rules signature",
  },
  {
    id: "GX-ARR-510",
    bookingId: "BKG-510",
    flatNumber: "D-087",
    guestName: "Olga I.",
    stage: "arrival_day",
    channel: "Push",
    timing: "Morning of arrival",
    status: "queued",
    tone: "service",
    title: "Arrival day welcome",
    body: "Welcome to New Level Premium. Your access method, Wi-Fi and support contact are available in the portal. We are here if anything feels unclear.",
    fallback: "Switch to SMS only if portal push is not delivered.",
    edgeCase: "Suppress if access is restricted or room readiness is below 80%.",
    consentRequired: true,
    sentimentSignal: "none",
    owner: "Operations",
    nextAction: "Monitor first access event and route guest questions",
  },
  {
    id: "GX-STAY-505",
    bookingId: "BKG-505",
    flatNumber: "A-092",
    guestName: "Sergey Petrov",
    stage: "in_stay",
    channel: "Portal",
    timing: "After first night",
    status: "ready",
    tone: "service",
    title: "Subtle comfort check",
    body: "We hope everything is comfortable. If you need towels, cleaning or technical support, you can send one request from this thread.",
    fallback: "No repeated reminder; show support card in portal only.",
    edgeCase: "Do not send more than one comfort check unless the guest starts a conversation.",
    consentRequired: false,
    sentimentSignal: "none",
    owner: "Resident support",
    nextAction: "Keep as passive portal card unless guest replies",
  },
  {
    id: "GX-OUT-502",
    bookingId: "BKG-502",
    flatNumber: "A-023",
    guestName: "Nina Volkova",
    stage: "checkout",
    channel: "Email",
    timing: "Evening before checkout",
    status: "queued",
    tone: "informational",
    title: "Checkout guidance without pressure",
    body: "Tomorrow's checkout is scheduled. Please leave cards on the table, check personal items and use the portal if you need a late-checkout request.",
    fallback: "Portal inbox copy and housekeeping task remain visible.",
    edgeCase: "Send manager review instead of guest message if deposit deduction is already disputed.",
    consentRequired: true,
    sentimentSignal: "watch",
    owner: "Operations",
    nextAction: "Confirm cleaning slot and access revoke timing",
  },
  {
    id: "GX-FB-508",
    bookingId: "BKG-508",
    flatNumber: "C-046",
    guestName: "Anna K.",
    stage: "post_stay_feedback",
    channel: "Portal",
    timing: "24 hours after checkout close",
    status: "suppressed",
    tone: "feedback",
    title: "Thank you and private feedback",
    body: "Thank you for staying with us. If anything could have been better, please tell us privately first so the team can close it properly.",
    fallback: "Send public-review request only after no open service, deposit or complaint risk remains.",
    edgeCase: "Suppressed because checkout deposit has a pending deduction review.",
    consentRequired: false,
    sentimentSignal: "recovery",
    owner: "Guest support",
    nextAction: "Wait for deposit settlement before feedback request",
  },
]

export const roleOnboardingPlans: RoleOnboardingPlanRecord[] = [
  {
    role: "admin",
    title: "Administrator access setup",
    audience: "Internal platform administrator",
    inviteMode: "admin_invite",
    identityOptions: ["Email/password", "Google Workspace SSO", "2FA before production"],
    requiredChecks: ["Management approval", "Export permission review", "Audit responsibility accepted"],
    firstRunSteps: ["Confirm company profile", "Review roles", "Check security settings"],
    defaultChannel: "Email",
    productionGate: "Enable only after named admin approval and backup admin assignment.",
  },
  {
    role: "manager",
    title: "Operations manager onboarding",
    audience: "Site manager / responsible operator",
    inviteMode: "admin_invite",
    identityOptions: ["Google sign-in", "Email magic link", "Yandex ID for RU-speaking operators"],
    requiredChecks: ["Portfolio scope", "Approval limits", "Provider simulation acknowledgement"],
    firstRunSteps: ["Open dashboard", "Check today queue", "Review service and booking alerts"],
    defaultChannel: "Portal",
    productionGate: "Connect live providers only after contracts and API keys are approved.",
  },
  {
    role: "accountant",
    title: "Finance workspace onboarding",
    audience: "Accounting and collection team",
    inviteMode: "admin_invite",
    identityOptions: ["Email/password", "Google sign-in"],
    requiredChecks: ["Finance approval limits", "Banking permission", "Debt restriction policy"],
    firstRunSteps: ["Review ledger", "Confirm payment-control queue", "Check deposit settlements"],
    defaultChannel: "Email",
    productionGate: "Requires finance/legal sign-off before live payment or banking integration.",
  },
  {
    role: "staff",
    title: "Field staff mobile onboarding",
    audience: "Technicians, cleaning, security and guest support",
    inviteMode: "request_approval",
    identityOptions: ["Phone/email invite", "Google sign-in", "Yandex ID where needed"],
    requiredChecks: ["Team assignment", "Task scope", "No finance visibility"],
    firstRunSteps: ["Open assigned tasks", "Confirm daily route", "Upload first proof photo"],
    defaultChannel: "Push",
    productionGate: "Device and staff roster must be approved before real access cards/cameras are connected.",
  },
  {
    role: "owner",
    title: "Owner portal onboarding",
    audience: "Property owner / seller",
    inviteMode: "request_approval",
    identityOptions: ["Email magic link", "Google sign-in", "Yandex ID for Russian-language owners"],
    requiredChecks: ["Unit ownership match", "Preferred language", "Communication consent"],
    firstRunSteps: ["Confirm profile", "Review documents", "Check statements and service history"],
    defaultChannel: "Portal",
    productionGate: "Owner must be matched to original unit data before production access.",
  },
  {
    role: "tenant",
    title: "Tenant / guest portal onboarding",
    audience: "Tenant, guest or authorized resident",
    inviteMode: "request_approval",
    identityOptions: ["Email magic link", "Yandex ID", "Google sign-in"],
    requiredChecks: ["Booking/unit relation", "Consent", "Identity or house-rule acceptance"],
    firstRunSteps: ["Open welcome thread", "Complete pre-arrival checklist", "Use support request if needed"],
    defaultChannel: "Portal",
    productionGate: "Access credentials are hidden until booking, deposit and consent rules pass.",
  },
]

export const mobileWebCapabilities: MobileWebCapabilityRecord[] = [
  {
    id: "MW-RESP-01",
    title: "One responsive web app, no native app dependency",
    audience: "all",
    surface: "Responsive Web",
    status: "ready",
    priority: "core",
    description: "Dashboard, service, booking, document and communication flows stay in the same Next.js web app and adapt to phone, tablet and desktop.",
    evidence: "Shared RBAC, locale routing, mobile sidebar and responsive tables are reused across modules.",
    qaSignal: "No horizontal overflow on 390px mobile smoke checks.",
  },
  {
    id: "MW-PWA-02",
    title: "Installable web shell",
    audience: "all",
    surface: "Installable PWA",
    status: "provider_ready",
    priority: "core",
    description: "Manifest and service-worker shell allow a browser install target when HTTPS production hosting is enabled.",
    evidence: "Manifest route, service worker registration and app icons are provider-ready.",
    qaSignal: "Manifest and service worker are discoverable in browser QA.",
  },
  {
    id: "MW-FIELD-03",
    title: "Staff field flow from phone",
    audience: "staff",
    surface: "Touch UX",
    status: "ready",
    priority: "core",
    description: "Technicians and cleaning staff can view assigned jobs, SLA, route slot, checklist and proof requirements on mobile.",
    evidence: "Tickets, calendar and communications are RBAC-visible for staff and hidden from finance.",
    qaSignal: "Staff mobile smoke covers tickets and calendar.",
  },
  {
    id: "MW-OFFLINE-04",
    title: "Offline-safe read and retry queue",
    audience: "all",
    surface: "Offline Queue",
    status: "simulation",
    priority: "important",
    description: "Critical records can be represented as safe read-only snapshots and queued-write scenarios for demo. Production write sync needs an IndexedDB queue, retry worker, idempotent server API and conflict approval flow.",
    evidence: "Current app has a PWA shell and demo queue records; sensitive finance, access and deposit writes remain blocked until server approval.",
    qaSignal: "Demo queue records expose retry policy, scope and guardrail; live write queue is not enabled.",
  },
  {
    id: "MW-A11Y-05",
    title: "Accessible mobile operations",
    audience: "all",
    surface: "Accessibility",
    status: "ready",
    priority: "important",
    description: "Touch targets, skip link, labels, reduced-motion support and clear role-scoped navigation are kept across the web app.",
    evidence: "Buttons use labels/icons, tables remain searchable, and denied pages explain role scope.",
    qaSignal: "Browser smoke checks h1, labels and mobile overflow.",
  },
]

export const offlineSyncQueue: OfflineSyncRecord[] = [
  {
    id: "OFF-9001",
    role: "staff",
    module: "tickets",
    action: "Upload before/after proof for TASK-204",
    status: "queued",
    device: "Technician Android Chrome",
    lastSyncAt: isoDaysFromAnchor(0, 9),
    retryPolicy: "Retry when online, then manager review after 3 failed attempts",
    dataScope: "Assigned task only, no finance values",
    guardrail: "Cannot close job until media reaches server",
  },
  {
    id: "OFF-9002",
    role: "manager",
    module: "dashboard",
    action: "Read daily operation snapshot",
    status: "read_only_cached",
    device: "Manager iPhone Safari",
    lastSyncAt: isoDaysFromAnchor(0, 8),
    retryPolicy: "Refresh on reconnect",
    dataScope: "KPI snapshot, no write action",
    guardrail: "Stale badge remains visible until refresh",
  },
  {
    id: "OFF-9003",
    role: "tenant",
    module: "communications",
    action: "Draft support message from portal thread",
    status: "queued",
    device: "Resident mobile browser",
    lastSyncAt: isoDaysFromAnchor(0, 10),
    retryPolicy: "Send once online, preserve local timestamp",
    dataScope: "Own booking/thread only",
    guardrail: "No broadcast or staff thread access",
  },
  {
    id: "OFF-9004",
    role: "owner",
    module: "documents",
    action: "Open monthly owner statement",
    status: "synced",
    device: "Owner tablet browser",
    lastSyncAt: isoDaysFromAnchor(0, 11),
    retryPolicy: "Use secure cached copy for 24 hours",
    dataScope: "Own unit documents only",
    guardrail: "Expired or changed documents require fresh server check",
  },
  {
    id: "OFF-9005",
    role: "manager",
    module: "calendar",
    action: "Resolve checkout/deposit conflict",
    status: "conflict",
    device: "Operations desktop fallback",
    lastSyncAt: isoDaysFromAnchor(0, 12),
    retryPolicy: "Manual compare before write",
    dataScope: "Booking BKG-508 and settlement SET-508",
    guardrail: "Deposit refund stays blocked until finance approval",
  },
]

export const integrationProviders: IntegrationProviderRecord[] = [
  {
    id: "INT-SUPA-01",
    category: "Supabase",
    provider: "Supabase PostgreSQL/Auth/Realtime/Storage",
    mode: "live",
    status: "connected",
    idealNow: "Keep as the main app backend and source of truth.",
    scalePath: "Add production RLS audit, backups, storage policies and realtime channels per module.",
    requiredFromClient: "Production project confirmation, environment variables and data migration approval.",
    dataHandled: "Users, roles, units, finance, tickets, bookings, documents and audit records.",
    fallback: "Local demo seed is used only when Supabase is not configured.",
    riskLevel: "low",
  },
  {
    id: "INT-PAY-02",
    category: "Payments",
    provider: "iyzico / PayTR / Param placeholder adapter",
    mode: "placeholder",
    status: "blocked_pending_client",
    idealNow: "Keep demo payment and deposit flows; do not charge real cards yet.",
    scalePath: "Provider adapter with webhook signature check, retry queue and reconciliation mapping.",
    requiredFromClient: "Chosen provider contract, API keys, legal approval, refund/deposit policy.",
    dataHandled: "Card token, amount, currency, transaction state and refund reference.",
    fallback: "Manual bank transfer and accountant approval queue.",
    riskLevel: "high",
  },
  {
    id: "INT-BANK-03",
    category: "Banking",
    provider: "Bank statement/import and reconciliation placeholder",
    mode: "simulation",
    status: "demo_ready",
    idealNow: "Use generated reconciliation examples and manual statement import for the demo.",
    scalePath: "Bank-specific import/API adapter after account owner approves access.",
    requiredFromClient: "Bank list, account permissions, file format/API decision and finance sign-off.",
    dataHandled: "IBAN, statement rows, payer reference, amount and value date.",
    fallback: "CSV upload and accountant matching.",
    riskLevel: "medium",
  },
  {
    id: "INT-SMS-04",
    category: "SMS",
    provider: "NetGSM / Twilio compatible placeholder",
    mode: "provider_ready",
    status: "demo_ready",
    idealNow: "Prepare templates, consent checks and retry queues; send no live SMS until approved.",
    scalePath: "Add provider credentials, sender ID approval, delivery receipts and rate limits.",
    requiredFromClient: "Sender name, consent language, SMS provider account and pricing approval.",
    dataHandled: "Phone, template, delivery status, consent and retry count.",
    fallback: "Portal inbox and manual call task.",
    riskLevel: "medium",
  },
  {
    id: "INT-EMAIL-05",
    category: "Email",
    provider: "Resend / SMTP placeholder",
    mode: "provider_ready",
    status: "demo_ready",
    idealNow: "Use provider-ready email templates for documents, reports and onboarding.",
    scalePath: "Domain verification, SPF/DKIM/DMARC and suppression list management.",
    requiredFromClient: "Sending domain, sender address, template approvals and retention policy.",
    dataHandled: "Email, template variables, delivery events and unsubscribe/suppression state.",
    fallback: "Portal notification and downloadable document packet.",
    riskLevel: "medium",
  },
  {
    id: "INT-ACCESS-06",
    category: "Access",
    provider: "Salto KS / Dormakaba / Hikvision placeholder",
    mode: "placeholder",
    status: "blocked_pending_client",
    idealNow: "Keep access cards/barriers in simulation and human approval mode.",
    scalePath: "Adapter per provider with credential lifecycle, audit event import and manual override.",
    requiredFromClient: "Hardware/provider decision, API availability, access zones and legal sign-off.",
    dataHandled: "Credential id, zone, validity, resident relation and audit event.",
    fallback: "Manual security desk task and printed guest list.",
    riskLevel: "high",
  },
  {
    id: "INT-CAM-07",
    category: "Camera",
    provider: "Hikvision / camera event placeholder",
    mode: "placeholder",
    status: "blocked_pending_client",
    idealNow: "Do not connect live cameras for demo; model event references only.",
    scalePath: "Event-only integration first, then image/video review with privacy controls.",
    requiredFromClient: "Camera provider, site privacy policy, retention period and authorized users.",
    dataHandled: "Event timestamp, camera zone, incident link and retention class.",
    fallback: "Manual incident log and uploaded photo evidence.",
    riskLevel: "high",
  },
  {
    id: "INT-ID-08",
    category: "Identity",
    provider: "Google OAuth / Yandex ID provider-ready",
    mode: "provider_ready",
    status: "demo_ready",
    idealNow: "Keep login buttons provider-ready; live OAuth only after client app IDs are approved.",
    scalePath: "Supabase OAuth providers, redirect URL allowlist, domain policy and account linking.",
    requiredFromClient: "Google/Yandex app credentials, redirect domains and login policy.",
    dataHandled: "User id, email, role, language and consent state.",
    fallback: "Email/password, magic link or local access profile in controlled QA.",
    riskLevel: "medium",
  },
  {
    id: "INT-TKT-09",
    category: "Ticketing",
    provider: "Internal 1Cati ticketing with Twenty CRM relation",
    mode: "live",
    status: "connected",
    idealNow: "Use the internal ticketing board as the operational ticket system for now.",
    scalePath: "Keep Twenty CRM for relationship data, and sync only approved contact/deal references.",
    requiredFromClient: "Confirm whether external helpdesk is required later.",
    dataHandled: "Ticket, SLA, assignee, media proof, resident relation and action log.",
    fallback: "CSV export or manual CRM note.",
    riskLevel: "low",
  },
]

export const aiPremiumRecommendations: AiRecommendationRecord[] = [
  {
    id: "AI-BRIEF-01",
    mode: "daily_briefing",
    title: "Daily operations briefing",
    audience: "manager",
    status: "ready",
    confidence: 88,
    languageSupport: ["tr", "en", "de", "ru"],
    sourceRecords: ["serviceTickets", "bookings", "debtAccounts", "guestLifecycleEvents"],
    recommendation: "Summarize open tickets, SLA breaches, checkouts, debt restrictions and guest messages in one short briefing.",
    humanApproval: "No direct action; manager decides assignments and escalations.",
    modelFit: "Reliable for Qwen-class text models because it summarizes structured records.",
  },
  {
    id: "AI-SVC-02",
    mode: "service_triage",
    title: "Service ticket triage",
    audience: "manager",
    status: "ready",
    confidence: 84,
    languageSupport: ["tr", "en", "de", "ru"],
    sourceRecords: ["serviceTickets", "workforceTasks", "serviceOrders"],
    recommendation: "Rank tickets by SLA, urgency, debt block and media requirement, then propose the next safe task.",
    humanApproval: "AI cannot close tickets or bypass debt approval.",
    modelFit: "Safe because prioritization uses explicit fields and no hidden judgment.",
  },
  {
    id: "AI-DEBT-03",
    mode: "debt_risk",
    title: "Debt and restriction explanation",
    audience: "accountant",
    status: "human_review",
    confidence: 81,
    languageSupport: ["tr", "en", "de"],
    sourceRecords: ["financeLedger", "debtAccounts", "accessControlRecords"],
    recommendation: "Explain why an account is high risk and draft a payment-follow-up note.",
    humanApproval: "Finance/legal approval required before restriction, refund, deposit or payment action.",
    modelFit: "Good for explanation; not allowed for autonomous financial execution.",
  },
  {
    id: "AI-BOOK-04",
    mode: "booking_review",
    title: "Booking and checkout risk review",
    audience: "manager",
    status: "ready",
    confidence: 86,
    languageSupport: ["tr", "en", "de", "ru"],
    sourceRecords: ["bookings", "depositSettlements", "accessHandoffs", "documentPackets"],
    recommendation: "Detect missing ID/deposit/access/cleaning steps and propose a guest-safe message.",
    humanApproval: "No access code or deposit refund is released by AI.",
    modelFit: "Structured checklist reasoning is reliable and easy to audit.",
  },
  {
    id: "AI-RPT-05",
    mode: "report_draft",
    title: "Owner and manager report draft",
    audience: "admin",
    status: "ready",
    confidence: 82,
    languageSupport: ["tr", "en", "de", "ru"],
    sourceRecords: ["reportCards", "cashFlow", "debtAging", "phaseDeliveryRecords"],
    recommendation: "Draft concise monthly or weekly report text from approved metrics.",
    humanApproval: "Report must be reviewed before being sent externally.",
    modelFit: "Works well because numbers come from the app and AI only writes narrative.",
  },
  {
    id: "AI-INT-06",
    mode: "integration_advice",
    title: "Integration readiness advisor",
    audience: "admin",
    status: "provider_ready",
    confidence: 79,
    languageSupport: ["tr", "en", "de"],
    sourceRecords: ["integrationProviders", "platformControls"],
    recommendation: "Explain which providers can remain demo-only and what is needed before production connection.",
    humanApproval: "Client/provider decision stays outside AI.",
    modelFit: "Good fit for checklist and dependency explanation.",
  },
  {
    id: "AI-NL-07",
    mode: "natural_language_search",
    title: "Natural language operational search",
    audience: "resident",
    status: "ready",
    confidence: 83,
    languageSupport: ["tr", "en", "de", "ru"],
    sourceRecords: ["searchIndex", "rolePermissions", "roleScopedViews"],
    recommendation: "Answer only from the user's allowed modules and same language as the question.",
    humanApproval: "RBAC guard blocks out-of-scope finance, user and global portfolio requests.",
    modelFit: "High value because the model interprets language while the app enforces permissions.",
  },
]

export const aiImageWorkflows: AiImageWorkflowRecord[] = [
  {
    id: "AIMG-SRV-01",
    title: "Service photo proof summary",
    source: "service_photo",
    status: "mock_ready",
    aiUse: "Summarize uploaded before/after photos into a clean field note for manager review.",
    guardrail: "Human checks the photo and the job cannot close without uploaded evidence.",
    output: "Suggested completion note, missing-proof warning and resident-friendly explanation.",
  },
  {
    id: "AIMG-CHK-02",
    title: "Checkout damage evidence review",
    source: "checkout_photo",
    status: "provider_ready",
    aiUse: "Compare checkout photo notes against deposit settlement checklist and flag unclear damage claims.",
    guardrail: "AI cannot decide deductions or refunds; finance/manager approval remains mandatory.",
    output: "Damage checklist, confidence flag and required extra photos.",
  },
  {
    id: "AIMG-DOC-03",
    title: "Document scan quality assistant",
    source: "document_scan",
    status: "mock_ready",
    aiUse: "Detect whether ID, TAPU or contract scans are readable enough before backoffice review.",
    guardrail: "No identity verification is finalized by AI; originals and legal review still apply.",
    output: "Readability status, missing corner/blur warning and upload guidance.",
  },
  {
    id: "AIMG-CAM-04",
    title: "Camera event triage placeholder",
    source: "camera_event",
    status: "human_review",
    aiUse: "Use event metadata only for now; live images/videos stay disabled until privacy approval.",
    guardrail: "No face recognition, no live camera stream, and no automated access restriction.",
    output: "Incident log draft linked to manual security review.",
  },
]

export const messageTemplates: MessageTemplateRecord[] = [
  {
    id: "TPL-BOOKING-01",
    title: "Booking thank-you and next steps",
    useCase: "booking_confirmation",
    languages: ["tr", "en", "de", "ru"],
    channel: "WhatsApp",
    owner: "Guest support",
    approvalStatus: "approved",
    variables: ["guest_name", "booking_id", "portal_link"],
    preview: "Thank you {{guest_name}}. Your booking {{booking_id}} is confirmed; useful next steps are in your secure portal.",
  },
  {
    id: "TPL-PREARRIVAL-01",
    title: "Pre-arrival checklist without spam",
    useCase: "pre_arrival",
    languages: ["tr", "en", "de", "ru"],
    channel: "Portal",
    owner: "Guest support",
    approvalStatus: "approved",
    variables: ["guest_name", "arrival_time", "checklist_link"],
    preview: "Your arrival checklist is ready. Please complete only the missing items before access is released.",
  },
  {
    id: "TPL-MOVEIN-01",
    title: "Move-in welcome and access handoff",
    useCase: "move_in",
    languages: ["tr", "en", "de", "ru"],
    channel: "WhatsApp",
    owner: "Guest support",
    approvalStatus: "approved",
    variables: ["guest_name", "flat_number", "check_in_time", "access_method"],
    preview: "Welcome {{guest_name}}, your access details for {{flat_number}} are ready in the portal.",
  },
  {
    id: "TPL-COMFORT-01",
    title: "First-night comfort check",
    useCase: "in_stay",
    languages: ["tr", "en", "ru"],
    channel: "Portal",
    owner: "Resident support",
    approvalStatus: "approved",
    variables: ["guest_name", "support_link"],
    preview: "We hope everything is comfortable. If you need support, one request from the portal is enough.",
  },
  {
    id: "TPL-CHECKOUT-01",
    title: "Checkout inspection and deposit status",
    useCase: "checkout",
    languages: ["tr", "en", "de", "ru"],
    channel: "Portal",
    owner: "Operations",
    approvalStatus: "approved",
    variables: ["guest_name", "flat_number", "refund_amount", "statement_link"],
    preview: "Your checkout statement is ready. Please review the deposit result in the secure portal.",
  },
  {
    id: "TPL-FEEDBACK-01",
    title: "Post-stay thank-you and private feedback",
    useCase: "post_stay",
    languages: ["tr", "en", "de", "ru"],
    channel: "Portal",
    owner: "Guest support",
    approvalStatus: "needs_review",
    variables: ["guest_name", "feedback_link", "review_link"],
    preview: "Thank you for staying with us. Please share private feedback first; we will ask for a public review only when open issues are closed.",
  },
  {
    id: "TPL-DEBT-01",
    title: "Debt reminder with human approval",
    useCase: "debt",
    languages: ["tr", "en", "de", "ru"],
    channel: "Email",
    owner: "Finance",
    approvalStatus: "needs_review",
    variables: ["resident_name", "balance", "due_date", "payment_link"],
    preview: "Please review the open balance and choose a payment option before the due date.",
  },
  {
    id: "TPL-SERVICE-01",
    title: "Service appointment and proof request",
    useCase: "service",
    languages: ["tr", "en", "ru"],
    channel: "Push",
    owner: "Resident support",
    approvalStatus: "approved",
    variables: ["ticket_id", "appointment_time", "technician_name"],
    preview: "Your service appointment is scheduled. Proof and notes will remain in this ticket.",
  },
  {
    id: "TPL-DOC-01",
    title: "Missing document request",
    useCase: "document",
    languages: ["tr", "en", "de", "ru"],
    channel: "Email",
    owner: "Backoffice",
    approvalStatus: "approved",
    variables: ["document_type", "deadline", "secure_upload_link"],
    preview: "Please upload the missing document through the secure link before the deadline.",
  },
  {
    id: "TPL-ANN-01",
    title: "Site announcement with target preview",
    useCase: "announcement",
    languages: ["tr", "en", "de", "ru"],
    channel: "Portal",
    owner: "Management",
    approvalStatus: "draft",
    variables: ["audience", "topic", "effective_date"],
    preview: "A new site announcement is available for your account.",
  },
]

export const documentPackets: DocumentPacketRecord[] = [
  {
    id: "PACK-MOVEIN-01",
    title: "Move-in guest packet",
    audience: "guest",
    relatedEntity: "BKG-503",
    status: "missing_items",
    requiredDocuments: 6,
    completedDocuments: 4,
    signatureStatus: "sent",
    retentionClass: "guest",
    nextAction: "Collect ID scan and house-rules signature before access release",
  },
  {
    id: "PACK-CHECKOUT-01",
    title: "Checkout evidence and settlement packet",
    audience: "management",
    relatedEntity: "SET-508",
    status: "review",
    requiredDocuments: 8,
    completedDocuments: 6,
    signatureStatus: "not_required",
    retentionClass: "finance",
    nextAction: "Attach final damage photos and manager decision",
  },
  {
    id: "PACK-OWNER-01",
    title: "Monthly owner statement packet",
    audience: "owner",
    relatedEntity: "RPT-02",
    status: "complete",
    requiredDocuments: 5,
    completedDocuments: 5,
    signatureStatus: "not_required",
    retentionClass: "finance",
    nextAction: "Share secure portal link with owner",
  },
  {
    id: "PACK-BUYER-01",
    title: "Sales KYC and TAPU packet",
    audience: "buyer",
    relatedEntity: "DOCBUY-806",
    status: "signature_pending",
    requiredDocuments: 7,
    completedDocuments: 5,
    signatureStatus: "blocked",
    retentionClass: "legal",
    nextAction: "Correct buyer name and resend signature request",
  },
  {
    id: "PACK-STAFF-01",
    title: "Field service proof packet",
    audience: "staff",
    relatedEntity: "TASK-204",
    status: "missing_items",
    requiredDocuments: 4,
    completedDocuments: 2,
    signatureStatus: "not_required",
    retentionClass: "service",
    nextAction: "Upload before/after photos and resident sign-off",
  },
]

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
  {
    id: "RPT-06",
    title: "AI Gunluk Operasyon Brifingi",
    cadence: "Günlük",
    owner: "Mudur + AI",
    status: "ready",
    metric: "7 AI akisi / 4 dil",
    insight: "AI, SLA, borc, rezervasyon ve iletisim onceliklerini kaynakli ozetler; aksiyon insan onayinda kalir.",
  },
  {
    id: "RPT-07",
    title: "AI Fotograf Kanit ve Belge Kalite Kontrolu",
    cadence: "Anlık",
    owner: "Operasyon + Backoffice",
    status: "needs_review",
    metric: "4 gorsel is akisi",
    insight: "Fotograf/belge AI yardimi kanit kalitesini aciklar; hasar, iade veya kimlik kararini tek basina vermez.",
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
    status: "ready_for_uat",
    owner: "Finance + Legal",
    businessOutcome: "Ödeme, depozito, iade, borç eşiği ve servis/erişim kısıtları muhasebe ve hukuk onayıyla yürür.",
    userGuide: "Finans ve Uyum ekranlarında gecikme, depozito, kısıt ve onay kuyruğunu takip edin.",
    evidence: ["Debt restriction model", "Deposit states", "Finance approval queue", "Human-approved access policy"],
  },
  {
    phase: 8,
    title: "Servis kataloğu ve servis siparişi akışı",
    status: "ready_for_uat",
    owner: "Operations + Finance",
    businessOutcome: "Temizlik, transfer, bakım ve özel hizmetler fiyat, SLA, borç kontrolü ve görev üretimiyle siparişe dönüşür.",
    userGuide: "Servis Talepleri ekranında katalog, borç kontrolü, görev üretimi ve durum takibini yönetin.",
    evidence: ["Service catalogue", "Debt-check gate", "Service order API", "Resident order flow"],
  },
  {
    phase: 9,
    title: "Görev, saha ekibi, SLA ve medya raporu",
    status: "ready_for_uat",
    owner: "Technical + Staff",
    businessOutcome: "Saha işleri atama, öncelik, SLA, foto/video kanıt, iptal ve yönetici onayıyla görünür olur.",
    userGuide: "Servis Talepleri ekranında görev panosu, SLA riski ve saha raporlarını yönetin.",
    evidence: ["Task board", "Mobile staff flow", "SLA timer", "Media proof"],
  },
  {
    phase: 10,
    title: "Rezervasyon, kiralama, move-in ve checkout",
    status: "ready_for_uat",
    owner: "Reservations + Operations",
    businessOutcome: "Müsaitlik, rezervasyon, depozito, giriş hazırlığı, checkout, kesinti ve erişim kapatma tek süreç olur.",
    userGuide: "Rezervasyon ekranında takvim, giriş/çıkış işleri, depozito ve final kontrol adımlarını takip edin.",
    evidence: [
      "Booking operations API",
      "Move-in readiness board",
      "Checkout settlement queue",
      "Access handoff queue",
      "Phase 10/11 QA harness",
    ],
  },
  {
    phase: 11,
    title: "İletişim, bildirim ve doküman merkezi",
    status: "ready_for_uat",
    owner: "Support + Backoffice",
    businessOutcome: "Sakin, malik, yönetici ve personel iletişimi daire, borç, görev, rezervasyon ve belgeyle ilişkilendirilir.",
    userGuide: "İletişim ve Belgeler ekranlarında konuşma, duyuru, bildirim ve dosya izinlerini yönetin.",
    evidence: [
      "Omnichannel inbox",
      "Multilingual template library",
      "Notification retry queue",
      "Document packet board",
      "Provider-ready simulation mode",
    ],
  },
  {
    phase: 12,
    title: "Mobil uyumlu web/PWA ve offline-guvenli deneyim",
    status: "ready_for_uat",
    owner: "Frontend + QA",
    businessOutcome: "Native mobile app yerine tek web uygulamasi telefonda hizli, kurulabilir, erisilebilir ve offline-safe calisir.",
    userGuide: "Offline Senkron ekraninda mobil web hazirligini, offline kuyrugu, stale veri uyarilarini ve rol kapsamlarini test edin.",
    evidence: ["Responsive web surface", "Manifest/service worker shell", "Offline retry queue", "Touch-safe QA"],
  },
  {
    phase: 13,
    title: "Dis sistem entegrasyonlari",
    status: "ready_for_uat",
    owner: "Integrations + Security",
    businessOutcome: "Supabase canli backend olarak kullanilir; odeme, banka, SMS, e-posta, erisim, kamera ve OAuth baglantilari demo/provider-ready placeholder olarak durur.",
    userGuide: "Ayarlar ekraninda entegrasyon durumunu, musteri tarafindan gereken karar/API key listesini ve manuel fallback planini takip edin.",
    evidence: ["Supabase connected", "Provider-ready placeholders", "Integration health matrix", "Manual fallback"],
  },
  {
    phase: 14,
    title: "AI premium katmani ve gelismis analitik",
    status: "ready_for_uat",
    owner: "AI Governance + Analytics",
    businessOutcome: "AI gunluk brifing, servis triage, borc riski, rezervasyon kontrolu, rapor taslagi, entegrasyon tavsiyesi ve gorsel kanit yardimi uretir; hassas islem yapmaz.",
    userGuide: "AI Rapor Merkezi ve sohbet asistaninda onerileri kaynak, guven, dil ve insan onayi notuyla inceleyin.",
    evidence: ["AI command center", "Same-language assistant", "Guardrailed recommendations", "Image-proof workflow"],
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

export interface TenantAccessGrant {
  id: string
  tenantName: string
  unit: string
  ownerName: string
  startOffsetDays: number
  endOffsetDays: number
  scope: string[]
  inviteCode: string
}

// Owner-sponsored, time-boxed tenant access grants (New Level Premium model).
// Demo seed for the tenant time-access panel in the Users dashboard.
export const tenantAccessGrants: TenantAccessGrant[] = [
  { id: "grant-1", tenantName: "Ivan Petrov", unit: "B3 / 12", ownerName: "Ahmet Yılmaz", startOffsetDays: -20, endOffsetDays: 70, scope: ["tickets", "documents", "communications"], inviteCode: "NLP-INV-8F3A2C" },
  { id: "grant-2", tenantName: "Sofia Novak", unit: "A1 / 5", ownerName: "Elena Kaya", startOffsetDays: -85, endOffsetDays: 6, scope: ["tickets", "calendar", "communications"], inviteCode: "NLP-INV-11B7D9" },
  { id: "grant-3", tenantName: "Mehmet Demir", unit: "C2 / 8", ownerName: "Ahmet Yılmaz", startOffsetDays: -120, endOffsetDays: -3, scope: ["tickets", "documents"], inviteCode: "NLP-INV-77E1A0" },
  { id: "grant-4", tenantName: "Anna Ivanova", unit: "B1 / 3", ownerName: "Deniz Aksoy", startOffsetDays: -10, endOffsetDays: 20, scope: ["tickets", "documents", "communications"], inviteCode: "NLP-INV-3C9F45" },
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
  waiting_approval: "Owner approval pending",
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

export function getBookingOperationsSummary() {
  return {
    totalBookings: bookings.filter((booking) => booking.status !== "cancelled").length,
    moveInsToday: bookings.filter((booking) => booking.status === "move_in_today").length,
    checkoutsToday: bookings.filter((booking) => booking.status === "checkout_today").length,
    readinessBlocked: bookingReadinessRecords.filter((record) => record.riskLevel === "critical" || record.riskLevel === "high").length,
    averageReadiness: Math.round(
      bookingReadinessRecords.reduce((sum, record) => sum + record.readinessScore, 0) /
        Math.max(bookingReadinessRecords.length, 1)
    ),
    turnoverTasks: turnoverTasks.length,
    blockedTurnoverTasks: turnoverTasks.filter((task) => task.status === "blocked").length,
    accessPending: accessHandoffs.filter((handoff) => handoff.status === "pending" || handoff.status === "restricted").length,
    settlementsOpen: depositSettlements.filter((settlement) => settlement.status !== "closed").length,
    settlementExposureTry: depositSettlements.reduce((sum, settlement) => sum + settlement.depositTry, 0),
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

export function getCommunicationSummary() {
  return {
    openThreads: communicationThreads.length,
    urgentThreads: communicationThreads.filter((thread) => thread.priority === "high" || thread.priority === "urgent").length,
    blockedThreads: communicationThreads.filter((thread) => thread.status === "blocked").length,
    consentIssues: communicationThreads.filter((thread) => thread.consentStatus !== "ok").length,
    activeRules: notificationRules.filter((rule) => rule.status === "active").length,
    deliveryFailures: notificationDeliveries.filter(
      (delivery) => delivery.status === "failed" || delivery.status === "manual_review"
    ).length,
    multilingualTemplates: messageTemplates.filter((template) => template.languages.length >= 4).length,
    pendingApprovals: messageTemplates.filter((template) => template.approvalStatus !== "approved").length,
    lifecycleSteps: guestLifecycleEvents.length,
    lifecycleReady: guestLifecycleEvents.filter((event) => event.status === "ready" || event.status === "queued").length,
    lifecycleSuppressed: guestLifecycleEvents.filter((event) => event.status === "suppressed").length,
    lifecycleReview: guestLifecycleEvents.filter((event) => event.status === "needs_review").length,
  }
}

export function getDocumentPacketSummary() {
  return {
    totalPackets: documentPackets.length,
    completePackets: documentPackets.filter((packet) => packet.status === "complete").length,
    missingOrReview: documentPackets.filter(
      (packet) => packet.status === "missing_items" || packet.status === "review"
    ).length,
    signatureBlocked: documentPackets.filter((packet) => packet.signatureStatus === "blocked").length,
    completionRate: Math.round(
      (documentPackets.reduce((sum, packet) => sum + packet.completedDocuments, 0) /
        Math.max(documentPackets.reduce((sum, packet) => sum + packet.requiredDocuments, 0), 1)) *
        100
    ),
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

export function getMobileWebSummary(records = offlineSyncQueue) {
  return {
    capabilities: mobileWebCapabilities.length,
    ready: mobileWebCapabilities.filter((item) => item.status === "ready").length,
    providerReady: mobileWebCapabilities.filter((item) => item.status === "provider_ready").length,
    needsDeviceTest: mobileWebCapabilities.filter((item) => item.status === "needs_device_test").length,
    simulation: mobileWebCapabilities.filter((item) => item.status === "simulation").length,
    queuedWrites: records.filter((item) => item.status === "queued").length,
    conflicts: records.filter((item) => item.status === "conflict").length,
    readOnlyCached: records.filter((item) => item.status === "read_only_cached").length,
  }
}

export function getIntegrationSummary() {
  return {
    total: integrationProviders.length,
    connected: integrationProviders.filter((item) => item.status === "connected").length,
    demoReady: integrationProviders.filter((item) => item.status === "demo_ready").length,
    blockedPendingClient: integrationProviders.filter((item) => item.status === "blocked_pending_client").length,
    manualFallback: integrationProviders.filter((item) => item.status === "manual_fallback").length,
    highRisk: integrationProviders.filter((item) => item.riskLevel === "high").length,
    liveProviders: integrationProviders.filter((item) => item.mode === "live").length,
  }
}

export function getAiPremiumSummary() {
  return {
    recommendations: aiPremiumRecommendations.length,
    ready: aiPremiumRecommendations.filter((item) => item.status === "ready").length,
    humanReview: aiPremiumRecommendations.filter((item) => item.status === "human_review").length,
    providerReady: aiPremiumRecommendations.filter((item) => item.status === "provider_ready").length,
    imageWorkflows: aiImageWorkflows.length,
    imageProviderReady: aiImageWorkflows.filter((item) => item.status === "provider_ready").length,
    multilingual: aiPremiumRecommendations.filter((item) => item.languageSupport.length >= 4).length,
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
