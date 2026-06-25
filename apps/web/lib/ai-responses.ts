// Deterministic AI response generator for the 1Çatı site-management demo.
// No external LLM is called in this demo; answers are synthesized from local mock data.

import { Role } from "./rbac"
import {
  bookings,
  formatTry,
  getDebtAccounts,
  getSummary,
  serviceTickets,
} from "./site-management-data"

export type AiSuggestion = {
  id: string
  label: string
  prompt: string
}

export function getAiSuggestions(role: Role): AiSuggestion[] {
  const common: AiSuggestion[] = [
    { id: "summary", label: "Günlük özet", prompt: "Give me today's site operations summary." },
    { id: "debt-risk", label: "Borç riski", prompt: "Which flats need debt action today?" },
    { id: "service-priority", label: "Servis önceliği", prompt: "Prioritize service tickets by SLA and debt status." },
  ]

  const roleSpecific: Record<Role, AiSuggestion[]> = {
    super_admin: [
      { id: "portfolio-health", label: "Portföy sağlığı", prompt: "Analyze the full 769-flat portfolio health." },
      { id: "automation", label: "Otomasyon fırsatı", prompt: "Which workflows should be automated next?" },
    ],
    company_admin: [
      { id: "portfolio-health", label: "Portföy sağlığı", prompt: "Analyze the full 769-flat portfolio health." },
      { id: "cash-flow", label: "Nakit akışı", prompt: "Summarize collections and outstanding debt." },
    ],
    manager: [
      { id: "operations", label: "Operasyon planı", prompt: "Create today's operations plan." },
      { id: "access-control", label: "Erişim kontrolü", prompt: "Show restricted access risks." },
    ],
    sales_consultant: [
      { id: "resident-followup", label: "Sakin takibi", prompt: "Which residents should be contacted today?" },
      { id: "booking", label: "Rezervasyon", prompt: "Show booking and move-in priorities." },
    ],
    listing_agent: [
      { id: "flat-readiness", label: "Daire hazırlığı", prompt: "Which flats are ready or blocked?" },
      { id: "booking", label: "Rezervasyon", prompt: "Show booking and move-in priorities." },
    ],
    property_manager: [
      { id: "service-priority", label: "Servis önceliği", prompt: "Prioritize service tickets by SLA and debt status." },
      { id: "checkout", label: "Çıkış kontrolü", prompt: "Which check-outs need deposit review?" },
    ],
    accountant: [
      { id: "cash-flow", label: "Nakit akışı", prompt: "Summarize collections and outstanding debt." },
      { id: "legal", label: "Yasal takip", prompt: "Which flats should move to legal follow-up?" },
    ],
    maintenance: [
      { id: "route", label: "Teknik rota", prompt: "Build the technician route for today." },
      { id: "blocked", label: "Blokeli servis", prompt: "Which service tickets are blocked by debt?" },
    ],
    client: [
      { id: "my-flat", label: "Daire durumu", prompt: "What is the status of my flat?" },
      { id: "payments", label: "Ödemelerim", prompt: "Show my payments and open service requests." },
    ],
    viewer: [
      { id: "summary", label: "Özet", prompt: "Give me today's site operations summary." },
    ],
  }

  return [...common, ...roleSpecific[role]]
}

export function generateAiResponse(prompt: string, role: Role): string {
  const lower = prompt.toLowerCase()
  const summary = getSummary()
  const debtAccounts = getDebtAccounts()
  const legalAccounts = debtAccounts.filter((account) => account.paymentStatus === "legal")
  const blockedTickets = serviceTickets.filter((ticket) => ticket.debtBlocked)
  const overdueTickets = serviceTickets.filter((ticket) => ticket.slaHoursRemaining < 0)
  const checkoutBookings = bookings.filter((booking) => booking.status === "checkout_today" || booking.status === "deposit_review")

  if (lower.includes("summary") || lower.includes("özet") || lower.includes("operations")) {
    return `Bugün ${summary.totalFlats} daire yönetimde, doluluk %${summary.occupancyRate}. Açık borç ${formatTry(summary.totalDebtTry)}, ${summary.openTickets} açık servis talebi, ${summary.overdueTickets} SLA dışı talep ve ${summary.checkoutsToday} check-out var. İlk öncelik borç kısıtı, SLA dışı servis ve depozito kontrolü.`
  }

  if (lower.includes("debt") || lower.includes("borç") || lower.includes("cash") || lower.includes("collection")) {
    const topAccounts = debtAccounts
      .slice(0, 3)
      .map((account) => `${account.flatNumber}: ${formatTry(account.balanceTry)}`)
      .join("; ")
    return `Tahsilat önceliği: ${topAccounts}. Toplam açık borç ${formatTry(summary.totalDebtTry)}. 90+ gün borçta ${legalAccounts.length} hesap var; bu hesaplarda erişim kısıtı ve yasal takip hazırlığı önerilir.`
  }

  if (lower.includes("service") || lower.includes("ticket") || lower.includes("sla") || lower.includes("servis")) {
    const urgent = overdueTickets
      .slice(0, 3)
      .map((ticket) => `${ticket.flatNumber} ${ticket.title} (${ticket.slaHoursRemaining} saat)`)
      .join("; ")
    return urgent
      ? `Servis önceliği: ${urgent}. Borç blokeli ${blockedTickets.length} talep finans onayı bekliyor; teknisyen yönlendirmeden önce ödeme durumu kontrol edilmeli.`
      : "Şu anda SLA dışı servis talebi yok. Günlük teknik rota açık taleplerin maliyet ve lokasyonuna göre planlanabilir."
  }

  if (lower.includes("access") || lower.includes("erişim") || lower.includes("restricted")) {
    return `${summary.restrictedAccess} dairede erişim kısıtı görünüyor. AI önerisi: önce yasal takipteki borçlu daireler, sonra check-in öncesi bekleyen erişim kodları kontrol edilmeli.`
  }

  if (lower.includes("booking") || lower.includes("check") || lower.includes("rezervasyon") || lower.includes("depozito")) {
    const queue = checkoutBookings
      .map((booking) => `${booking.flatNumber} ${booking.guestName} (${formatTry(booking.depositTry)})`)
      .join("; ")
    return queue
      ? `Bugünkü rezervasyon/depozito kuyruğu: ${queue}. Check-out fotoğrafı, temizlik onayı ve hasar kesintisi kapanmadan depozito iadesi yapılmamalı.`
      : "Bugün depozito incelemesi bekleyen kritik çıkış yok. Yaklaşan girişler için kimlik, ödeme ve erişim kodu ön kontrolü yapılabilir."
  }

  if (lower.includes("route") || lower.includes("technical") || lower.includes("teknik")) {
    const route = serviceTickets
      .filter((ticket) => ticket.status !== "closed" && ticket.status !== "resolved" && !ticket.debtBlocked)
      .slice(0, 4)
      .map((ticket) => `${ticket.flatNumber} - ${ticket.category}`)
      .join("; ")
    return `Bugünkü teknik rota önerisi: ${route}. Borç blokeli işler ayrıldı; önce SLA riski olan ve ödeme onayı tamamlanan talepler kapatılmalı.`
  }

  if (lower.includes("automation") || lower.includes("otomasyon")) {
    return "En yüksek otomasyon getirisi üç akışta: aidat gecikme hatırlatmaları, borç durumuna göre erişim kodu kontrolü, check-out sonrası depozito ve hasar kapama. Bu üç akış operasyon süresini ciddi azaltır."
  }

  const roleContext =
    role === "client"
      ? "Sakin portalında kendi daireniz, ödeme durumunuz, servis talepleriniz ve belgeleriniz görünür."
      : role === "maintenance"
        ? "Teknisyen rolünde sadece servis kuyruğu, SLA, fotoğraf kanıtı ve saha notları öne çıkar."
        : "Rolünüze göre daire, finans, servis, rezervasyon ve rapor modülleri önceliklendirilir."

  return `Bu konuda yardımcı olabilirim. Mevcut veride ${summary.totalFlats} daire, ${summary.openTickets} açık servis talebi ve ${formatTry(summary.totalDebtTry)} açık borç var. ${roleContext}`
}
