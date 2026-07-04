// Deterministic AI response generator for the 1Cati site-management workspace.
// External LLM output is optional; this fallback always stays role-aware.

import { hasPermission, type Resource, type Role } from "./rbac"
import {
  bookings,
  formatTry,
  getDebtAccounts,
  getSummary,
  phaseDeliveryRecords,
  serviceTickets,
} from "./site-management-data"
import { localizeBusinessCopy, interpolate } from "./business-copy"

export type AiSuggestion = {
  id: string
  label: string
  prompt: string
}

export type AiAccessDecision = {
  allowed: boolean
  deniedMessage?: string
  resource?: Resource
}

export type AiRoleProfile = {
  role: Role
  label: string
  scope: string
  allowedFocus: string[]
  deniedFocus: string[]
  operatingRule: string
}

const aiRoleProfiles: Record<Role, AiRoleProfile> = {
  admin: {
    role: "admin",
    label: "Yönetim",
    scope: "Şirket, portföy, kullanıcı, finans, ayar, entegrasyon ve denetim genel görünümü.",
    allowedFocus: ["Portföy sağlığı", "faz geçişleri", "RBAC/audit", "entegrasyon riski", "finans ve operasyon özeti"],
    deniedFocus: ["İnsan onayı olmadan finans, erişim veya kullanıcı yetkisi uygulama"],
    operatingRule: "Stratejik karar desteği verir; hassas işlemler için onay ve denetim izi ister.",
  },
  manager: {
    role: "manager",
    label: "Sorumlu",
    scope: "Günlük site operasyonu, SLA, servis, rezervasyon, personel ve risk takibi.",
    allowedFocus: ["Günlük operasyon planı", "SLA önceliği", "servis kuyruğu", "erişim riski", "personel yükü"],
    deniedFocus: ["Muhasebe kaydı oluşturma", "global ayar değiştirme", "kullanıcı yetkisi değiştirme"],
    operatingRule: "Operasyon önceliği üretir; finans kayıtlarını sadece izleme/eskalasyon bağlamında kullanır.",
  },
  accountant: {
    role: "accountant",
    label: "Muhasebe",
    scope: "Finans defteri, tahsilat, aidat, depozito, mutabakat ve rapor hazırlığı.",
    allowedFocus: ["Tahsilat önceliği", "ledger kontrolü", "depozito kuyruğu", "mutabakat", "finans raporu"],
    deniedFocus: ["Kullanıcı yönetimi", "saha işi kapatma", "erişim kartı uygulama"],
    operatingRule: "Finans kararını önerir; ödeme, iade, depozito veya kısıt aksiyonu için insan onayı ister.",
  },
  staff: {
    role: "staff",
    label: "Personel",
    scope: "Atanmış saha işleri, servis durumu, takvim, belge kanıtı ve ekip iletişimi.",
    allowedFocus: ["Atanmış görevler", "SLA", "saha rotası", "foto/video kanıt", "servis blokaj durumu"],
    deniedFocus: ["Finans bakiyeleri", "tüm daire matrisi", "raporlar", "kullanıcı/rol yönetimi"],
    operatingRule: "Saha aksiyonunu açıklar; borç bilgisini sadece servis blokaj bayrağı olarak ele alır, tutar göstermez.",
  },
  owner: {
    role: "owner",
    label: "Malik",
    scope: "Kendi dairesi, yetkili sakinleri, belgeleri, rezervasyonları, servisleri ve yönetim iletişimi.",
    allowedFocus: ["Kendi daire durumu", "yetkili belgeler", "servis talebi", "rezervasyon", "yönetim mesajı"],
    deniedFocus: ["Başka daireler", "personel listesi", "şirket finans defteri", "raporlar"],
    operatingRule: "Sadece sahip olduğu veya yetkilendirildiği kayıtlar hakkında yönlendirir.",
  },
  tenant: {
    role: "tenant",
    label: "Kiracı",
    scope: "Kiracıya yetkili daire, servis talebi, rezervasyon, belge ve iletişim akışı.",
    allowedFocus: ["Kendi servis talebi", "kendi rezervasyonu", "yetkili belge", "yönetim mesajı"],
    deniedFocus: ["Malik kayıtları", "başka sakinler", "finans defteri", "tüm portföy"],
    operatingRule: "Kiracı kapsamı dışındaki kayıtları reddeder ve uygun modüle yönlendirir.",
  },
}

const aiIntentMatchers: Array<{ resource: Resource; patterns: string[] }> = [
  {
    resource: "users",
    patterns: ["user", "users", "role", "rbac", "kullanıcı", "rol", "personel listesi"],
  },
  {
    resource: "settings",
    patterns: ["settings", "integration", "api key", "ayar", "entegrasyon", "webhook"],
  },
  {
    resource: "finance",
    patterns: [
      "aidat",
      "balance",
      "bakiye",
      "borç",
      "cash",
      "collection",
      "debt",
      "deposit",
      "depozito",
      "finance",
      "ledger",
      "nakit",
      "payment",
      "ödeme",
      "tahsilat",
    ],
  },
  {
    resource: "listings",
    patterns: [
      "769",
      "all flats",
      "all units",
      "block",
      "daire matrisi",
      "flat list",
      "other units",
      "portfolio",
      "portföy",
      "tüm daire",
      "unit matrix",
    ],
  },
  {
    resource: "reports",
    patterns: ["analysis", "analytics", "analiz", "global", "portfolio health", "rapor", "report", "risk map"],
  },
  {
    resource: "eids_compliance",
    patterns: ["access", "compliance", "eids", "erişim", "kısıt", "restricted", "uyum"],
  },
  {
    resource: "calendar",
    patterns: ["booking", "calendar", "check-in", "check-out", "checkout", "rezervasyon", "takvim"],
  },
  {
    resource: "documents",
    patterns: ["belge", "contract", "document", "evrak", "sözleşme", "tapu"],
  },
  {
    resource: "communications",
    patterns: ["bildirim", "chat", "communication", "iletişim", "message", "mesaj"],
  },
  {
    resource: "tickets",
    patterns: ["bakım", "maintenance", "service", "servis", "sla", "talep", "ticket"],
  },
]

function detectRequestedResource(prompt: string): Resource | undefined {
  const lower = prompt.toLocaleLowerCase("tr-TR")
  const hasTicketIntent = aiIntentMatchers
    .find((intent) => intent.resource === "tickets")
    ?.patterns.some((pattern) => lower.includes(pattern))
  const hasCalendarIntent = aiIntentMatchers
    .find((intent) => intent.resource === "calendar")
    ?.patterns.some((pattern) => lower.includes(pattern))
  const hasFinanceIntent = aiIntentMatchers
    .find((intent) => intent.resource === "finance")
    ?.patterns.some((pattern) => lower.includes(pattern))

  if (hasTicketIntent) return "tickets"
  if (hasCalendarIntent && !hasFinanceIntent) return "calendar"

  return aiIntentMatchers.find((intent) =>
    intent.patterns.some((pattern) => lower.includes(pattern))
  )?.resource
}

function denialForRole(resource: Resource, role: Role, locale: string) {
  const labels: Record<Resource, string> = {
    calendar: "rezervasyon ve takvim",
    communications: "iletişim",
    dashboard: "genel panel",
    deals: "iş akışı",
    documents: "belge",
    eids_compliance: "erişim ve uyum",
    finance: "finans defteri",
    leads: "sakin ve CRM",
    listings: "daire matrisi ve portföy",
    offline_sync: "offline senkron",
    reports: "rapor ve analiz",
    settings: "platform ayarları",
    tickets: "servis talebi",
    users: "kullanıcı ve rol yönetimi",
  }

  return interpolate(
    localizeBusinessCopy(
      "Bu istek {resourceLabel} yetkisi gerektirir. Aktif rolünüz ({role}) için bu veri kapalıdır; yalnızca sol menüde görünen modüller ve kendi yetki kapsamınızdaki kayıtlar hakkında yardımcı olabilirim.",
      locale
    ),
    { resourceLabel: localizeBusinessCopy(labels[resource], locale), role }
  )
}

export function getAiRoleProfile(role: Role): AiRoleProfile {
  return aiRoleProfiles[role]
}

export function getAiRoleSystemInstruction(role: Role) {
  const profile = getAiRoleProfile(role)
  return [
    `Aktif rol: ${profile.label}.`,
    `Rol kapsamı: ${profile.scope}`,
    `Öncelikli yardım alanları: ${profile.allowedFocus.join(", ")}.`,
    `Kapalı alanlar: ${profile.deniedFocus.join(", ")}.`,
    `Kural: ${profile.operatingRule}`,
  ].join(" ")
}

export function getAiAccessDecision(prompt: string, role: Role, locale = "tr"): AiAccessDecision {
  const resource = detectRequestedResource(prompt)
  if (!resource) return { allowed: true }

  if (!hasPermission(role, resource, "view")) {
    return {
      allowed: false,
      deniedMessage: denialForRole(resource, role, locale),
      resource,
    }
  }

  return { allowed: true, resource }
}

function generateResidentPortalResponse(role: Role, resource: Resource | undefined, locale: string) {
  const roleName = localizeBusinessCopy(role === "owner" ? "Malik" : "Kiracı", locale)
  const ownershipText = localizeBusinessCopy(
    role === "owner"
      ? "kendi dairenize ve yetkili sakin kayıtlarınıza"
      : "yetkili olduğunuz daireye",
    locale
  )

  if (resource === "tickets") {
    return interpolate(
      localizeBusinessCopy(
        "{roleName} rolünde {ownershipText} bağlı servis taleplerini açabilir, durumunu takip edebilir ve yönetim ekibiyle mesajlaşabilirsiniz. Şirket geneli servis kuyruğu, borç listesi ve başka daire kayıtları gösterilmez.",
        locale
      ),
      { roleName, ownershipText }
    )
  }

  if (resource === "calendar") {
    return interpolate(
      localizeBusinessCopy(
        "{roleName} rolünde yalnızca {ownershipText} bağlı rezervasyon, giriş-çıkış ve uygunluk akışlarını görebilirsiniz. Başka dairelerin takvimi ve operasyon planı kapalıdır.",
        locale
      ),
      { roleName, ownershipText }
    )
  }

  if (resource === "documents") {
    return interpolate(
      localizeBusinessCopy(
        "{roleName} rolünde sadece {ownershipText} ait yetkili sözleşme, TAPU veya operasyon belgelerini görebilirsiniz. Diğer malik/kiracı belgeleri ve iç finans evrakı kapalıdır.",
        locale
      ),
      { roleName, ownershipText }
    )
  }

  if (resource === "communications") {
    return interpolate(
      localizeBusinessCopy(
        "{roleName} rolünde yönetim ekibiyle güvenli iletişim, bildirim ve talep takibini kullanabilirsiniz. İç ekip mesajları, finans onayları ve kullanıcı yönetimi kapalıdır.",
        locale
      ),
      { roleName }
    )
  }

  return interpolate(
    localizeBusinessCopy(
      "{roleName} çalışma alanında servis, rezervasyon, belge ve iletişim işlemleri kendi yetki kapsamınızla sınırlıdır. Daire matrisi, finans defteri, raporlar, kullanıcılar ve ayarlar bu rolde kapalıdır.",
      locale
    ),
    { roleName }
  )
}

function generateStaffPortalResponse(resource: Resource | undefined, locale: string) {
  if (resource === "tickets") {
    return localizeBusinessCopy(
      "Personel rolünde atanan servis talepleri, SLA durumu, saha notları ve fotoğraf/video kanıtı önceliklidir. Borç listesi, finans onayı ve tüm portföy görünümü bu rolde kapalıdır.",
      locale
    )
  }

  if (resource === "calendar") {
    return localizeBusinessCopy(
      "Personel rolünde günlük saha takvimi; giriş, çıkış, temizlik, gezinti ve görev saatlerini gösterir. Şirket geneli rezervasyon geliri veya finans mutabakatı kapalıdır.",
      locale
    )
  }

  if (resource === "documents") {
    return localizeBusinessCopy(
      "Personel rolünde belge alanı iş kanıtı, fotoğraf, servis formu ve operasyon dokümanları içindir. Finans, TAPU ve kullanıcı yönetimi evrakı bu rolde kapalıdır.",
      locale
    )
  }

  if (resource === "communications") {
    return localizeBusinessCopy(
      "Personel rolünde iletişim alanı atanan işler, saha notları ve yönetici bildirimleri içindir. İç finans veya yönetici onay trafiği gösterilmez.",
      locale
    )
  }

  return localizeBusinessCopy(
    "Personel çalışma alanında atanan servis, rezervasyon, belge kanıtı ve ekip iletişimi görünür. Finans defteri, daire matrisi, raporlar, kullanıcılar ve ayarlar kapalıdır.",
    locale
  )
}

export function getAiSuggestions(role: Role, locale = "tr"): AiSuggestion[] {
  const common: AiSuggestion[] =
    role === "admin" || role === "manager"
      ? [
          { id: "summary", label: "Günlük özet", prompt: "Give me today's site operations summary." },
          { id: "debt-risk", label: "Borç riski", prompt: "Which flats need debt action today?" },
          { id: "service-priority", label: "Servis önceliği", prompt: "Prioritize service tickets by SLA and debt status." },
        ]
      : role === "accountant"
        ? [
            { id: "finance-summary", label: "Finans özeti", prompt: "Summarize collections and open finance work." },
            { id: "debt-risk", label: "Borç riski", prompt: "Which accounts need finance follow-up today?" },
          ]
        : []

  const roleSpecific: Record<Role, AiSuggestion[]> = {
    admin: [
      { id: "portfolio-health", label: "Portföy sağlığı", prompt: "Analyze the full 769-flat portfolio health." },
      { id: "automation", label: "Otomasyon fırsatı", prompt: "Which workflows should be automated next?" },
      { id: "cash-flow", label: "Nakit akışı", prompt: "Summarize collections and outstanding debt." },
    ],
    manager: [
      { id: "operations", label: "Operasyon planı", prompt: "Create today's operations plan." },
      { id: "access-control", label: "Erişim kontrolü", prompt: "Show restricted access risks." },
    ],
    accountant: [
      { id: "cash-flow", label: "Nakit akışı", prompt: "Summarize collections and outstanding debt." },
      { id: "legal", label: "Yasal takip", prompt: "Which flats should move to legal follow-up?" },
    ],
    staff: [
      { id: "route", label: "Teknik rota", prompt: "Build the technician route for today." },
      { id: "blocked", label: "Blokeli servis", prompt: "Which service tickets are blocked by debt?" },
    ],
    owner: [
      { id: "my-flat", label: "Daire durumu", prompt: "What is the status of my flat?" },
      { id: "rentals", label: "Kiralama", prompt: "Show my reservation, documents and open service status." },
    ],
    tenant: [
      { id: "my-reservation", label: "Rezervasyonum", prompt: "Show my reservation and authorized documents." },
      { id: "my-service", label: "Servis talebim", prompt: "Show my open service requests." },
    ],
  }

  return [...common, ...roleSpecific[role]].map((suggestion) => ({
    ...suggestion,
    label: localizeBusinessCopy(suggestion.label, locale),
  }))
}

export function generateAiResponse(prompt: string, role: Role, locale = "tr"): string {
  const lower = prompt.toLocaleLowerCase("tr-TR")
  const profile = getAiRoleProfile(role)
  const accessDecision = getAiAccessDecision(prompt, role, locale)
  if (!accessDecision.allowed) {
    return accessDecision.deniedMessage ?? denialForRole("dashboard", role, locale)
  }

  if (role === "owner" || role === "tenant") {
    return generateResidentPortalResponse(role, accessDecision.resource, locale)
  }

  if (role === "staff") {
    return generateStaffPortalResponse(accessDecision.resource, locale)
  }

  const summary = getSummary()
  const debtAccounts = getDebtAccounts()
  const legalAccounts = debtAccounts.filter((account) => account.paymentStatus === "legal")
  const blockedTickets = serviceTickets.filter((ticket) => ticket.debtBlocked)
  const overdueTickets = serviceTickets.filter((ticket) => ticket.slaHoursRemaining < 0)
  const checkoutBookings = bookings.filter((booking) => booking.status === "checkout_today" || booking.status === "deposit_review")
  const readyForUatPhases = phaseDeliveryRecords.filter((phase) => phase.status === "ready_for_uat")
  const activePhases = phaseDeliveryRecords.filter((phase) => phase.status === "in_progress")
  const plannedPhases = phaseDeliveryRecords.filter((phase) => phase.status === "planned")

  if (role === "admin" && (lower.includes("phase") || lower.includes("faz") || lower.includes("roadmap") || lower.includes("next"))) {
    const readyList = readyForUatPhases.map((phase) => `Faz ${phase.phase}`).join(", ")
    const activeList = activePhases.map((phase) => `Faz ${phase.phase}`).join(", ")
    return interpolate(
      localizeBusinessCopy(
        "{roleLabel} kapsamı: {readyList} UAT için hazır, {activeList} aktif geliştirmede, {plannedCount} faz planlı durumda. Sıradaki doğru adım Faz 7 ödeme/depozito/mutabakat kararlarını sağlayıcı ve hukuk onayıyla kapatmak; ardından servis siparişi, görev/SLA, rezervasyon ve iletişim fazları aynı RBAC ve audit modeliyle bağlanmalı.",
        locale
      ),
      { roleLabel: localizeBusinessCopy(profile.label, locale), readyList, activeList, plannedCount: plannedPhases.length }
    )
  }

  if (role === "manager" && (lower.includes("summary") || lower.includes("özet") || lower.includes("operations") || lower.includes("plan"))) {
    return interpolate(
      localizeBusinessCopy(
        "{roleLabel} çalışma alanı için bugün öncelik: {openTickets} açık servis talebi, {overdueTickets} SLA dışı iş, {restrictedAccess} erişim kısıtı ve {checkoutsToday} check-out. Ekip yönlendirmesi önce SLA riski ve borç nedeniyle bekleyen servislerden başlamalı; finans kaydı oluşturulmadan muhasebe onayı istenmeli.",
        locale
      ),
      {
        roleLabel: localizeBusinessCopy(profile.label, locale),
        openTickets: summary.openTickets,
        overdueTickets: summary.overdueTickets,
        restrictedAccess: summary.restrictedAccess,
        checkoutsToday: summary.checkoutsToday,
      }
    )
  }

  if (role === "accountant" && (lower.includes("summary") || lower.includes("özet") || lower.includes("finance") || lower.includes("finans") || lower.includes("collection") || lower.includes("tahsilat"))) {
    const topAccounts = debtAccounts
      .slice(0, 3)
      .map((account) => `${account.flatNumber}: ${formatTry(account.balanceTry)}`)
      .join("; ")
    return interpolate(
      localizeBusinessCopy(
        "{roleLabel} kapsamı için tahsilat önceliği: {topAccounts}. Toplam açık borç {totalDebt}, 90+ gün/yasal riskte {legalCount} hesap var. Ödeme, iade, depozito veya erişim kısıtı aksiyonu doğrudan uygulanmaz; mutabakat ve insan onayı gerekir.",
        locale
      ),
      {
        roleLabel: localizeBusinessCopy(profile.label, locale),
        topAccounts,
        totalDebt: formatTry(summary.totalDebtTry),
        legalCount: legalAccounts.length,
      }
    )
  }

  if (lower.includes("summary") || lower.includes("özet") || lower.includes("operations")) {
    return interpolate(
      localizeBusinessCopy(
        "Bugün {totalFlats} daire yönetimde, doluluk %{occupancyRate}. Açık borç {totalDebt}, {openTickets} açık servis talebi, {overdueTickets} SLA dışı talep ve {checkoutsToday} check-out var. İlk öncelik borç kısıtı, SLA dışı servis ve depozito kontrolü.",
        locale
      ),
      {
        totalFlats: summary.totalFlats,
        occupancyRate: summary.occupancyRate,
        totalDebt: formatTry(summary.totalDebtTry),
        openTickets: summary.openTickets,
        overdueTickets: summary.overdueTickets,
        checkoutsToday: summary.checkoutsToday,
      }
    )
  }

  if (lower.includes("debt") || lower.includes("borç") || lower.includes("cash") || lower.includes("collection")) {
    const topAccounts = debtAccounts
      .slice(0, 3)
      .map((account) => `${account.flatNumber}: ${formatTry(account.balanceTry)}`)
      .join("; ")
    return interpolate(
      localizeBusinessCopy(
        "Tahsilat önceliği: {topAccounts}. Toplam açık borç {totalDebt}. 90+ gün borçta {legalCount} hesap var; bu hesaplarda erişim kısıtı ve yasal takip hazırlığı önerilir.",
        locale
      ),
      { topAccounts, totalDebt: formatTry(summary.totalDebtTry), legalCount: legalAccounts.length }
    )
  }

  if (lower.includes("service") || lower.includes("ticket") || lower.includes("sla") || lower.includes("servis")) {
    const urgent = overdueTickets
      .slice(0, 3)
      .map((ticket) => `${ticket.flatNumber} ${localizeBusinessCopy(ticket.title, locale)} (${ticket.slaHoursRemaining} ${localizeBusinessCopy("saat", locale)})`)
      .join("; ")
    return urgent
      ? interpolate(
          localizeBusinessCopy(
            "Servis önceliği: {urgent}. Borç blokeli {blockedCount} talep finans onayı bekliyor; personel yönlendirmeden önce ödeme durumu kontrol edilmeli.",
            locale
          ),
          { urgent, blockedCount: blockedTickets.length }
        )
      : localizeBusinessCopy(
          "Şu anda SLA dışı servis talebi yok. Günlük saha rotası açık taleplerin maliyet ve lokasyonuna göre planlanabilir.",
          locale
        )
  }

  if (lower.includes("access") || lower.includes("erişim") || lower.includes("restricted")) {
    return interpolate(
      localizeBusinessCopy(
        "{restrictedAccess} dairede erişim kısıtı görünüyor. AI önerisi: önce yasal takipteki borçlu daireler, sonra check-in öncesi bekleyen erişim kodları kontrol edilmeli.",
        locale
      ),
      { restrictedAccess: summary.restrictedAccess }
    )
  }

  if (lower.includes("booking") || lower.includes("check") || lower.includes("rezervasyon") || lower.includes("depozito")) {
    const queue = checkoutBookings
      .map((booking) => `${booking.flatNumber} ${booking.guestName} (${formatTry(booking.depositTry)})`)
      .join("; ")
    return queue
      ? interpolate(
          localizeBusinessCopy(
            "Bugünkü rezervasyon/depozito kuyruğu: {queue}. Check-out fotoğrafı, temizlik onayı ve hasar kesintisi kapanmadan depozito iadesi yapılmamalı.",
            locale
          ),
          { queue }
        )
      : localizeBusinessCopy(
          "Bugün depozito incelemesi bekleyen kritik çıkış yok. Yaklaşan girişler için kimlik, ödeme ve erişim kodu ön kontrolü yapılabilir.",
          locale
        )
  }

  if (lower.includes("route") || lower.includes("technical") || lower.includes("teknik")) {
    const route = serviceTickets
      .filter((ticket) => ticket.status !== "closed" && ticket.status !== "resolved" && !ticket.debtBlocked)
      .slice(0, 4)
      .map((ticket) => `${ticket.flatNumber} - ${localizeBusinessCopy(ticket.category, locale)}`)
      .join("; ")
    return interpolate(
      localizeBusinessCopy(
        "Bugünkü saha rota önerisi: {route}. Borç blokeli işler ayrıldı; önce SLA riski olan ve ödeme onayı tamamlanan talepler kapatılmalı.",
        locale
      ),
      { route }
    )
  }

  if (lower.includes("automation") || lower.includes("otomasyon")) {
    return localizeBusinessCopy(
      "En yüksek otomasyon getirisi üç akışta: aidat gecikme hatırlatmaları, borç durumuna göre erişim kodu kontrolü, check-out sonrası depozito ve hasar kapama. Bu üç akış operasyon süresini ciddi azaltır.",
      locale
    )
  }

  const roleContext = localizeBusinessCopy(
    "Rolünüze göre daire, finans, servis, rezervasyon, iletişim ve rapor modülleri önceliklendirilir.",
    locale
  )

  return interpolate(
    localizeBusinessCopy(
      "Bu konuda yardımcı olabilirim. Mevcut veride {totalFlats} daire, {openTickets} açık servis talebi ve {totalDebt} açık borç var. {roleContext}",
      locale
    ),
    {
      totalFlats: summary.totalFlats,
      openTickets: summary.openTickets,
      totalDebt: formatTry(summary.totalDebtTry),
      roleContext,
    }
  )
}
