import type {
  AccessHandoffRecord,
  BookingReadinessRecord,
  BookingRecord,
  CommunicationThreadRecord,
  DepositSettlementRecord,
  DocumentPacketRecord,
  DocumentVaultRecord,
  GuestLifecycleEventRecord,
  MessageTemplateRecord,
  NotificationDeliveryRecord,
  NotificationRuleRecord,
  OfflineSyncRecord,
  ServiceTicket,
  TurnoverTaskRecord,
} from "./site-management-data"
import type { Role } from "./rbac"

const ownerUnits = new Set(["A-001", "A-054", "D-023"])
const tenantUnits = new Set(["A-018", "A-023"])
const ownerBookings = new Set(["A-012", "B-040", "D-087"])
const tenantBookings = new Set(["A-012", "A-023"])

export function isClientRole(role: Role) {
  return role === "owner" || role === "tenant"
}

export function normalizeUnitNo(unitNo: string | null | undefined) {
  return typeof unitNo === "string" && unitNo.trim()
    ? unitNo.trim().toLocaleUpperCase("tr-TR")
    : null
}

export function accessibleUnitsForRole(role: Role) {
  if (role === "owner") return ownerUnits
  if (role === "tenant") return tenantUnits
  return null
}

export function canAccessUnitForRole(role: Role, unitNo: string | null | undefined) {
  const unitScope = accessibleUnitsForRole(role)
  if (!unitScope) return true
  const normalizedUnitNo = normalizeUnitNo(unitNo)
  return Boolean(normalizedUnitNo && unitScope.has(normalizedUnitNo))
}

export function isFieldRole(role: Role) {
  return role === "staff"
}

export function shouldMaskFinance(role: Role) {
  return isClientRole(role) || isFieldRole(role)
}

export function visibleServiceTicketsForRole(
  role: Role,
  tickets: ServiceTicket[]
) {
  if (role === "owner") {
    return tickets.filter((ticket) => ownerUnits.has(ticket.flatNumber))
  }

  if (role === "tenant") {
    return tickets.filter((ticket) => tenantUnits.has(ticket.flatNumber))
  }

  if (role === "staff") {
    return tickets.filter((ticket) => ticket.category !== "Tahsilat")
  }

  return tickets
}

export function visibleBookingsForRole(role: Role, records: BookingRecord[]) {
  if (role === "owner") {
    return records.filter((booking) => ownerBookings.has(booking.flatNumber))
  }

  if (role === "tenant") {
    return records.filter((booking) => tenantBookings.has(booking.flatNumber))
  }

  return records
}

function visibleBookingFlatNumbers(role: Role) {
  if (role === "owner") return ownerBookings
  if (role === "tenant") return tenantBookings
  return null
}

export function visibleBookingReadinessForRole(role: Role, records: BookingReadinessRecord[]) {
  const scope = visibleBookingFlatNumbers(role)
  if (scope) return records.filter((record) => scope.has(record.flatNumber))
  return records
}

export function visibleTurnoverTasksForRole(role: Role, records: TurnoverTaskRecord[]) {
  const scope = visibleBookingFlatNumbers(role)
  if (scope) return records.filter((record) => scope.has(record.flatNumber))
  if (role === "accountant") return records.filter((record) => record.owner === "Finance")
  return records
}

export function visibleAccessHandoffsForRole(role: Role, records: AccessHandoffRecord[]) {
  const scope = visibleBookingFlatNumbers(role)
  if (scope) return records.filter((record) => scope.has(record.flatNumber))
  if (role === "accountant") return records.filter((record) => record.status === "restricted" || record.status === "pending")
  return records
}

export function visibleDepositSettlementsForRole(role: Role, records: DepositSettlementRecord[]) {
  const scope = visibleBookingFlatNumbers(role)
  if (scope) return records.filter((record) => scope.has(record.flatNumber))
  if (role === "staff") return records.filter((record) => record.status === "evidence_needed" || record.status === "manager_review")
  return records
}

export function visibleCommunicationThreadsForRole(role: Role, records: CommunicationThreadRecord[]) {
  if (role === "owner") return records.filter((record) => record.audience === "Malik")
  if (role === "tenant") return records.filter((record) => record.audience === "Kiraci" || record.audience === "Misafir")
  if (role === "staff") return records.filter((record) => record.audience === "Personel" || record.audience === "Operasyon")
  if (role === "accountant") return records.filter((record) => record.audience === "Malik" || record.audience === "Muhasebe" || record.owner === "Finance")
  return records
}

export function visibleNotificationRulesForRole(role: Role, records: NotificationRuleRecord[]) {
  if (role === "owner") return records.filter((record) => record.target.includes("Owner"))
  if (role === "tenant") return records.filter((record) => record.target.includes("tenant") || record.target.includes("Guest"))
  if (role === "staff") return records.filter((record) => record.target.includes("Staff") || record.owner === "Operations")
  if (role === "accountant") return records.filter((record) => record.owner === "Finance" || record.target.includes("Owner"))
  return records
}

export function visibleNotificationDeliveriesForRole(role: Role, records: NotificationDeliveryRecord[]) {
  if (role === "owner") return records.filter((record) => record.recipient.toLowerCase().includes("owner"))
  if (role === "tenant") return records.filter((record) => record.recipient.toLowerCase().includes("guest"))
  if (role === "staff") return records.filter((record) => record.recipient.toLowerCase().includes("staff") || record.recipient.toLowerCase().includes("route"))
  if (role === "accountant") return records.filter((record) => record.recipient.toLowerCase().includes("finance") || record.ruleId === "NTF-01")
  return records
}

export function visibleMessageTemplatesForRole(role: Role, records: MessageTemplateRecord[]) {
  if (role === "owner" || role === "tenant") {
    return records.filter((record) =>
      ["booking_confirmation", "pre_arrival", "move_in", "in_stay", "post_stay", "document", "service"].includes(record.useCase)
    )
  }
  if (role === "staff") return records.filter((record) => record.useCase === "service" || record.useCase === "checkout" || record.useCase === "in_stay")
  if (role === "accountant") return records.filter((record) => record.useCase === "debt" || record.useCase === "checkout" || record.useCase === "post_stay")
  return records
}

export function visibleGuestLifecycleEventsForRole(role: Role, records: GuestLifecycleEventRecord[]) {
  const scope = visibleBookingFlatNumbers(role)
  if (scope) return records.filter((record) => scope.has(record.flatNumber))
  if (role === "staff") return records.filter((record) => record.stage === "arrival_day" || record.stage === "in_stay" || record.stage === "checkout")
  if (role === "accountant") return records.filter((record) => record.stage === "checkout" || record.stage === "post_stay_feedback")
  return records
}

export function visibleDocumentPacketsForRole(role: Role, records: DocumentPacketRecord[]) {
  if (role === "owner") return records.filter((record) => record.audience === "owner")
  if (role === "tenant") return records.filter((record) => record.audience === "tenant" || record.audience === "guest")
  if (role === "staff") return records.filter((record) => record.audience === "staff" || record.retentionClass === "service")
  if (role === "accountant") return records.filter((record) => record.retentionClass === "finance")
  return records
}

export function visibleDocumentsForRole(
  role: Role,
  documents: DocumentVaultRecord[]
) {
  if (!isClientRole(role) && !isFieldRole(role)) return documents

  const scopeLabel =
    role === "tenant"
      ? "Yetkili kiracı kaydı"
      : role === "owner"
        ? "Yetkili malik kaydı"
        : "Operasyon görev dosyası"

  return documents.slice(0, isClientRole(role) ? 4 : 8).map((document, index) => ({
    ...document,
    flatNumber:
      role === "tenant"
        ? index % 2 === 0
          ? "A-018"
          : "A-023"
        : role === "owner"
          ? index % 2 === 0
            ? "A-001"
            : "D-023"
          : document.flatNumber,
    ownerName: scopeLabel,
    retentionRule: document.status === "verified" ? "Portalda görüntülenebilir" : "Yönetim onayı bekliyor",
  }))
}

export function visibleOfflineSyncQueueForRole(
  role: Role,
  records: OfflineSyncRecord[]
) {
  if (role === "admin" || role === "manager") return records
  if (role === "staff") return records.filter((record) => record.role === "staff")
  return []
}
