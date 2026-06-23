// Deterministic AI response generator for the 1Çatı demo assistant.
// No real LLM is called; responses are synthesized from mock data.

import { Role } from "./rbac"
import {
  deals,
  eidsRecords,
  financialHistory,
  getDashboardSummary,
  leads,
  properties,
  tickets,
} from "./demo-data"

export type AiSuggestion = {
  id: string
  label: string
  prompt: string
}

export function getAiSuggestions(role: Role): AiSuggestion[] {
  const common: AiSuggestion[] = [
    { id: "summary", label: "Günlük özet", prompt: "Give me a daily summary of the business." },
    { id: "hot-leads", label: "Sıcak adaylar", prompt: "Which leads should I prioritize today?" },
    { id: "eids-risk", label: "EİDS riskleri", prompt: "Show me EİDS compliance risks." },
  ]

  const roleSpecific: Record<Role, AiSuggestion[]> = {
    super_admin: [
      { id: "team-performance", label: "Ekip performansı", prompt: "Analyze team performance this month." },
      { id: "revenue-forecast", label: "Gelir tahmini", prompt: "Forecast revenue for next month." },
    ],
    company_admin: [
      { id: "revenue-forecast", label: "Gelir tahmini", prompt: "Forecast revenue for next month." },
      { id: "top-agents", label: "En iyi danışmanlar", prompt: "Who are the top performing agents?" },
    ],
    manager: [
      { id: "top-agents", label: "En iyi danışmanlar", prompt: "Who are the top performing agents?" },
      { id: "pipeline", label: "Pipeline durumu", prompt: "What is the current sales pipeline status?" },
    ],
    sales_consultant: [
      { id: "property-match", label: "Mülk eşleştir", prompt: "Find matching properties for hot leads." },
      { id: "follow-up", label: "Takip planı", prompt: "Create a follow-up plan for my leads." },
    ],
    listing_agent: [
      { id: "expiring-eids", label: "Biten yetkiler", prompt: "Which EİDS authorizations expire this week?" },
      { id: "new-listing", label: "Yeni ilan fırsatı", prompt: "Suggest new listing opportunities." },
    ],
    property_manager: [
      { id: "urgent-tickets", label: "Acil talepler", prompt: "List urgent maintenance tickets." },
      { id: "occupancy", label: "Doluluk oranı", prompt: "What is the current occupancy rate?" },
    ],
    accountant: [
      { id: "commission", label: "Komisyon raporu", prompt: "Summarize commission report." },
      { id: "expenses", label: "Gider analizi", prompt: "Analyze monthly expenses." },
    ],
    maintenance: [
      { id: "urgent-tickets", label: "Acil talepler", prompt: "List urgent maintenance tickets." },
      { id: "today", label: "Bugünkü işler", prompt: "What are my tasks for today?" },
    ],
    client: [
      { id: "my-property", label: "Mülküm durumu", prompt: "What is the status of my property?" },
      { id: "documents", label: "Belgelerim", prompt: "Show my pending documents." },
    ],
    viewer: [
      { id: "summary", label: "Özet", prompt: "Give me a business summary." },
    ],
  }

  return [...common, ...roleSpecific[role]]
}

export function generateAiResponse(prompt: string, role: Role): string {
  const lower = prompt.toLowerCase()
  const summary = getDashboardSummary()

  if (lower.includes("daily summary") || lower.includes("günlük özet") || lower.includes("özet")) {
    return `Bugün ${summary.activeListings} aktif ilan, ${summary.openLeads} açık aday (${summary.hotLeads} sıcak), ${summary.openTickets} açık bakım talebi ve ${summary.activeDeals} devam eden işlem var. Bu ay ${summary.dealsWonThisMonth} satış tamamlandı ve tahmini gelir ${summary.revenueThisMonthEur.toLocaleString("tr-TR")} €.`
  }

  if (lower.includes("hot lead") || lower.includes("sıcak aday") || lower.includes("prioritize")) {
    const hot = leads
      .filter((l) => l.status === "hot")
      .slice(0, 3)
      .map((l) => `${l.name} (${l.interest}, bütçe ${l.budgetEur.toLocaleString("tr-TR")} €)`)
      .join("; ")
    return hot
      ? `Bugün öncelikli adaylar: ${hot}. Bu adaylar son 7 günde aktif iletişimde ve yüksek skora sahip.`
      : "Şu anda sıcak aday bulunmuyor. Daha fazla potansiyel oluşturmak için Instagram ve WhatsApp kampanyalarınızı artırabilirsiniz."
  }

  if (lower.includes("eids") || lower.includes("yetki") || lower.includes("risk")) {
    const expiring = eidsRecords.filter((e) => e.status === "expiring").length
    const pending = eidsRecords.filter((e) => e.status === "pending").length
    return `EİDS durumu: ${pending} bekleyen yetkilendirme ve ${expiring} yakında bitecek yetki var. Bekleyenleri maliklerle iletişime geçerek çözmek, bitişleri yenilemek önemli.`
  }

  if (lower.includes("team performance") || lower.includes("performans") || lower.includes("top agent")) {
    const agentStats = deals.reduce<Record<string, number>>((acc, deal) => {
      acc[deal.agent] = (acc[deal.agent] || 0) + deal.commissionEur
      return acc
    }, {})
    const sorted = Object.entries(agentStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, comm]) => `${name} (${comm.toLocaleString("tr-TR")} €)`)
      .join(", ")
    return `Bu ay en çok komisyon üreten danışmanlar: ${sorted}. Performansı artırmak için sıcak adayları bu ekip üyelerine yönlendirmek faydalı olabilir.`
  }

  if (lower.includes("forecast") || lower.includes("tahmin") || lower.includes("revenue")) {
    const expected = Math.round(summary.revenueThisMonthEur * 1.12)
    return `Mevcut pipeline'a göre gelecek ay tahmini gelir ${expected.toLocaleString("tr-TR")} €. Bu, %12 büyüme öngörüyor. Müzakere aşamasındaki ${summary.activeDeals} işlem kritik.`
  }

  if (lower.includes("pipeline") || lower.includes("satış durumu")) {
    const stageCounts = deals.reduce<Record<string, number>>((acc, d) => {
      acc[d.stage] = (acc[d.stage] || 0) + 1
      return acc
    }, {})
    return `Pipeline: ${stageCounts.new || 0} yeni, ${stageCounts.contacted || 0} iletişimde, ${stageCounts.viewing || 0} gezinti, ${stageCounts.offer || 0} teklif, ${stageCounts.negotiation || 0} müzakere. Kapatma olasılığı yüksek teklifleri hızlandırın.`
  }

  if (lower.includes("property match") || lower.includes("eşleştir")) {
    const match = properties
      .filter((p) => p.status === "active" && p.priceEur <= 300000)
      .slice(0, 3)
      .map((p) => p.title)
      .join("; ")
    return `Sıcak aday bütçelerine uygun aktif mülkler: ${match}. Bu mülkler 300.000 € altında ve hemen gösterime hazır.`
  }

  if (lower.includes("follow-up") || lower.includes("takip")) {
    const followUps = leads
      .filter((l) => l.status === "warm" || l.status === "hot")
      .slice(0, 3)
      .map((l) => `${l.name} — ${l.source} üzerinden son iletişim ${new Date(l.lastContact).toLocaleDateString("tr-TR")}`)
      .join("; ")
    return `Bugünkü takip planı: ${followUps}. Her birine kişiselleştirilmiş mesaj göndermek dönüşümü artırır.`
  }

  if (lower.includes("urgent") || lower.includes("acil") || lower.includes("ticket")) {
    const urgent = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length
    return `Şu anda ${urgent} acil bakım talebi açık. Bu taleplere öncelik vermek mülk sahibi memnuniyetini korur.`
  }

  if (lower.includes("occupancy") || lower.includes("doluluk")) {
    return `Mevcut kiralama portföyünde doluluk oranı %${summary.occupancyRate}. Boşta kalan mülkleri listeleyerek doldurma kampanyası başlatılabilir.`
  }

  if (lower.includes("commission") || lower.includes("komisyon")) {
    const totalCommission = deals.filter((d) => d.stage === "closed_won").reduce((sum, d) => sum + d.commissionEur, 0)
    return `Kapanan işlemlerden toplam komisyon ${totalCommission.toLocaleString("tr-TR")} €. Pipeline'daki işlemlerle birlikte tahmini toplam komisyon ${(totalCommission * 1.4).toLocaleString("tr-TR")} €.`
  }

  if (lower.includes("expense") || lower.includes("gider")) {
    const totalExpenses = financialHistory.reduce((sum, f) => sum + f.expensesTry, 0)
    return `Son 12 ayda toplam işletme gideri ${totalExpenses.toLocaleString("tr-TR")} ₺. En büyük kalemler bakım, pazarlama ve personel.`
  }

  if (lower.includes("my property") || lower.includes("mülküm")) {
    return "Mülkünüz aktif olarak yönetiliyor. Son 30 günde 2 gezinti düzenlendi ve bakım talebi bulunmuyor. Aylık rapor hazır."
  }

  if (lower.includes("document") || lower.includes("belge")) {
    return "Bekleyen belgeleriniz: DASK poliçesi yenilemesi ve güncel tapu fotokopisi. Belgeler yüklendikteninde işlem süreci devam edecek."
  }

  if (lower.includes("today") || lower.includes("bugünkü")) {
    return `Bugün 3 bakım ziyareti planlandı: Villa #1021 klima, Daire #1847 elektrik, Penthouse #990 boya. Tüm malzemeler stokta mevcut.`
  }

  const roleContext =
    role === "client"
      ? "Malik portalında kendi mülk, belge ve raporlarınıza odaklanabilirsiniz."
      : role === "maintenance"
        ? "Teknisyen rolünde öncelik bakım talepleri ve saha takvimidir."
        : "Rolünüze göre erişebildiğiniz modüllerle devam edebilirsiniz."

  return `Bu konuda size yardımcı olabilirim. Mevcut verilere göre ${summary.activeListings} aktif ilan ve ${summary.openLeads} açık aday var. ${roleContext}`
}
