import type {
  BookingRecord,
  DocumentVaultRecord,
  ServiceTicket,
} from "./site-management-data"
import type { Role } from "./rbac"

const ownerUnits = new Set(["A-001", "A-054", "D-023"])
const tenantUnits = new Set(["A-018", "A-023"])
const ownerBookings = new Set(["A-012", "B-040", "D-087"])
const tenantBookings = new Set(["A-012", "A-023"])

export function isClientRole(role: Role) {
  return role === "owner" || role === "tenant"
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
