// Deterministic AI response generator for the 1Cati site-management workspace.
// External LLM output is optional; this fallback always stays role-aware.

import {
  getAccessibleResources,
  hasPermission,
  type Resource,
  type Role,
} from "./rbac"
import {
  bookings,
  formatTry,
  getDebtAccounts,
  getSummary,
  phaseDeliveryRecords,
  serviceTickets,
} from "./site-management-data"
import {
  resolveChatLanguageFromMessage,
  type SupportedChatLanguage,
} from "./language-detection"

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

export type AiLanguage = SupportedChatLanguage

export function detectAiLanguage(prompt: string): AiLanguage {
  const lower = prompt.toLocaleLowerCase("tr-TR")
  if (/\b(der|die|das|des|den|dem|und|oder|bitte|danke|bericht|analysiere|analyse|gesundheit|gesamt|gesamten|portfolio|portfolios|einheit|einheiten|zahlung|schulden|buchung|zugang|heute|warum|serviceticket|serviceanfrage|stoerung|reparatur|wohnung|dringend|defekt)\b/i.test(lower)) return "de"
  if (/[а-яё]/i.test(prompt)) return "ru"
  if (/\b(und|oder|bitte|danke|bericht|zahlung|schulden|buchung|zugang|heute|warum|serviceticket|serviceanfrage|störung|stoerung|reparatur|wohnung|dringend|defekt)\b/i.test(lower)) return "de"
  if (/\b(the|and|or|please|report|payment|debt|booking|access|today|summary|image|photo|integration)\b/i.test(lower)) return "en"
  return "tr"
}

export function resolveAiLanguage(prompt: string, fallbackLocale: string): AiLanguage {
  return resolveChatLanguageFromMessage(prompt, fallbackLocale)
}

const languageNames: Record<AiLanguage, string> = {
  tr: "Turkish",
  en: "English",
  de: "German",
  ru: "Russian",
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
  guest: {
    role: "guest",
    label: "Misafir",
    scope: "Yetkili ilanlar, etkinlikler, cüzdan, takvim, belge ve iletişim görünümü.",
    allowedFocus: ["Yetkili ilanlar", "etkinlikler", "cüzdan bakiyesi", "takvim", "paylaşılan belge"],
    deniedFocus: ["Finans defteri", "tüm daire matrisi", "servis kuyruğu", "kullanıcı yönetimi"],
    operatingRule: "Yalnızca misafire açık modüller hakkında yönlendirir; finans tutarı veya iç kayıt göstermez.",
  },
  service_provider: {
    role: "service_provider",
    label: "Hizmet Sağlayıcı",
    scope: "Atanan servis işleri, tedarikçi faturaları ve misafir düzeyi etkinlik/cüzdan görünümü.",
    allowedFocus: ["Atanan servis işleri", "tedarikçi faturası", "takvim", "yetkili belge"],
    deniedFocus: ["Finans defteri", "tüm daire matrisi", "kullanıcı yönetimi", "platform ayarları"],
    operatingRule: "Yalnızca atanan işleri ve kendi faturalarını ele alır; şirket finans defterini göstermez.",
  },
  child_owner: {
    role: "child_owner",
    label: "Yönetilen Malik Hesabı",
    scope: "Vasi denetimindeki etkinlik, cüzdan (salt okunur), takvim ve rapor görünümü.",
    allowedFocus: ["Etkinlikler", "cüzdan bakiyesi (salt okunur)", "takvim"],
    deniedFocus: ["Finans defteri", "belge", "servis", "kullanıcı yönetimi"],
    operatingRule: "Vasi tarafından yetkilendirilen dar kapsamda kalır; hassas veri veya tutar göstermez.",
  },
  child_tenant: {
    role: "child_tenant",
    label: "Yönetilen Kiracı Hesabı",
    scope: "Vasi denetimindeki etkinlik, cüzdan (salt okunur), takvim ve rapor görünümü.",
    allowedFocus: ["Etkinlikler", "cüzdan bakiyesi (salt okunur)", "takvim"],
    deniedFocus: ["Finans defteri", "belge", "servis", "kullanıcı yönetimi"],
    operatingRule: "Vasi tarafından yetkilendirilen dar kapsamda kalır; hassas veri veya tutar göstermez.",
  },
  child_guest: {
    role: "child_guest",
    label: "Yönetilen Misafir Hesabı",
    scope: "Vasi denetimindeki etkinlik, cüzdan (salt okunur), takvim ve rapor görünümü.",
    allowedFocus: ["Etkinlikler", "cüzdan bakiyesi (salt okunur)", "takvim"],
    deniedFocus: ["Finans defteri", "belge", "servis", "kullanıcı yönetimi"],
    operatingRule: "Vasi tarafından yetkilendirilen dar kapsamda kalır; hassas veri veya tutar göstermez.",
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
    patterns: [
      "arıza",
      "ariza",
      "bakım",
      "bakim",
      "defekt",
      "maintenance",
      "reparatur",
      "ремонт",
      "service",
      "serviceanfrage",
      "serviceticket",
      "servis",
      "sla",
      "störung",
      "stoerung",
      "talep",
      "ticket",
      "заявк",
      "неисправ",
      "поломк",
      "сервис",
      "тикет",
    ],
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

// Single source of truth for localized resource labels. Reused by the RBAC
// denial copy (denialForRole) and the graceful out-of-scope decline
// (buildOutOfScopeDecline) so both stay consistent across languages.
const resourceLabels: Record<Resource, Record<AiLanguage, string>> = {
  calendar: { tr: "rezervasyon ve takvim", en: "booking and calendar", de: "Buchung und Kalender", ru: "бронирования и календаря" },
  communications: { tr: "iletişim", en: "communication", de: "Kommunikation", ru: "коммуникации" },
  dashboard: { tr: "genel panel", en: "dashboard", de: "Dashboard", ru: "панели" },
  deals: { tr: "iş akışı", en: "workflow", de: "Workflow", ru: "рабочего процесса" },
  documents: { tr: "belge", en: "documents", de: "Dokumente", ru: "документов" },
  eids_compliance: { tr: "erişim ve uyum", en: "access and compliance", de: "Zugang und Compliance", ru: "доступа и соответствия" },
  finance: { tr: "finans defteri", en: "finance ledger", de: "Finanzbuch", ru: "финансового журнала" },
  leads: { tr: "sakin ve CRM", en: "resident and CRM", de: "Bewohner und CRM", ru: "жителей и CRM" },
  listings: { tr: "daire matrisi ve portföy", en: "unit matrix and portfolio", de: "Wohnungsmatrix und Portfolio", ru: "матрицы квартир и портфеля" },
  reports: { tr: "rapor ve analiz", en: "reports and analytics", de: "Berichte und Analysen", ru: "отчетов и аналитики" },
  settings: { tr: "platform ayarları", en: "platform settings", de: "Plattformeinstellungen", ru: "настроек платформы" },
  tickets: { tr: "servis talebi", en: "service tickets", de: "Servicetickets", ru: "сервисных заявок" },
  users: { tr: "kullanıcı ve rol yönetimi", en: "user and role management", de: "Benutzer- und Rollenverwaltung", ru: "пользователей и ролей" },
  wallet: { tr: "cüzdan", en: "wallet", de: "Wallet", ru: "кошелька" },
  activities: { tr: "etkinlikler", en: "activities", de: "Aktivitäten", ru: "активностей" },
  guardianship: { tr: "vasilik", en: "guardianship", de: "Vormundschaft", ru: "опекунства" },
  vendor_invoices: { tr: "tedarikçi faturaları", en: "vendor invoices", de: "Lieferantenrechnungen", ru: "счетов поставщиков" },
}

function denialForRole(resource: Resource, role: Role, language: AiLanguage = "tr") {
  const label = resourceLabels[resource][language]

  if (language === "en") {
    return `This request needs ${label} permission. Your active role (${role}) cannot view that data. I can only help with modules visible to your role and records inside your allowed scope.`
  }

  if (language === "de") {
    return `Diese Anfrage benötigt die Berechtigung für ${label}. Deine aktive Rolle (${role}) darf diese Daten nicht sehen. Ich kann nur bei Modulen helfen, die für deine Rolle sichtbar sind.`
  }

  if (language === "ru") {
    return `Для этого запроса нужны права на ${label}. Ваша активная роль (${role}) не может видеть эти данные. Я могу помогать только с модулями и записями в рамках вашей роли.`
  }

  return `Bu istek ${label} yetkisi gerektirir. Aktif rolünüz (${role}) için bu veri kapalıdır; yalnızca sol menüde görünen modüller ve kendi yetki kapsamınızdaki kayıtlar hakkında yardımcı olabilirim.`
}

// Curated order of the modules the assistant actually helps with, used to build
// a friendly, deterministic capability list for the out-of-scope decline.
const AI_CAPABILITY_ORDER: Resource[] = [
  "tickets",
  "calendar",
  "finance",
  "documents",
  "reports",
  "communications",
  "listings",
  "wallet",
  "activities",
  "users",
  "settings",
  "eids_compliance",
]

// Help-topic keywords that are NOT tied to a specific resource but are still a
// recognized assistant intent (operational summaries, planning, automation, help
// requests, ...). Kept multilingual and >=4 chars to avoid accidental substring
// matches. Resource-scoped intents are covered separately by
// detectRequestedResource(); this list only adds the non-resource help topics.
const DASHBOARD_HELP_TERMS: string[] = [
  "summar", "özet", "ozet", "zusammenfass", "übersicht", "ubersicht", "обзор", "сводк",
  "operation", "operasyon", "betrieb",
  "plan", "план",
  "roadmap", "phase", "faz", "фаз",
  "automation", "otomasyon", "automatisier", "автоматиз",
  "route", "rota", "маршрут", "technician", "teknisyen", "techniker",
  "risk", "priorit", "öncelik", "oncelik", "приоритет",
  "overview", "genel bak", "durum", "status",
  "help me", "yardımcı", "yardimci", "hilfe", "помощь", "помоги",
]

/**
 * True when the dashboard message maps to a recognized assistant intent: either a
 * known resource (detectRequestedResource) or one of the non-resource help topics
 * above. When this is false AND the role cannot otherwise act on the request, the
 * route returns the graceful out-of-scope decline instead of a generic answer.
 */
export function isRecognizedDashboardIntent(message: string): boolean {
  if (detectRequestedResource(message)) return true
  const lower = message.toLocaleLowerCase("tr-TR")
  return DASHBOARD_HELP_TERMS.some((term) => lower.includes(term))
}

/**
 * Friendly, plain-language out-of-scope decline. Lists what the assistant CAN do
 * for this role (localized capability labels) instead of guessing at an
 * off-topic request. Distinct from the RBAC denial (denialForRole), which fires
 * for an allowed *topic* the role simply cannot view.
 */
export function buildOutOfScopeDecline(role: Role, language: AiLanguage = "tr"): string {
  const accessible = new Set(getAccessibleResources(role))
  const labelList = AI_CAPABILITY_ORDER.filter((resource) => accessible.has(resource))
    .slice(0, 6)
    .map((resource) => resourceLabels[resource][language])
    .join(", ")

  if (language === "en") {
    return `I could not map that request to a module you can use. I can help with ${labelList}. For anything outside this, please use the matching module or contact management.`
  }
  if (language === "de") {
    return `Ich konnte diese Anfrage keinem für Sie verfügbaren Modul zuordnen. Ich kann bei ${labelList} helfen. Für alles andere nutzen Sie bitte das passende Modul oder wenden Sie sich an die Verwaltung.`
  }
  if (language === "ru") {
    return `Я не смог сопоставить этот запрос с доступным вам модулем. Я могу помочь с: ${labelList}. По остальным вопросам используйте соответствующий модуль или обратитесь в управление.`
  }
  return `Bu isteği kullanabileceğiniz bir modüle eşleştiremedim. Şu konularda yardımcı olabilirim: ${labelList}. Bunun dışındaki konular için lütfen ilgili modülü kullanın veya yönetimle iletişime geçin.`
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

export function getAiAccessDecision(prompt: string, role: Role, language: AiLanguage = detectAiLanguage(prompt)): AiAccessDecision {
  const resource = detectRequestedResource(prompt)
  if (!resource) return { allowed: true }

  if (!hasPermission(role, resource, "view")) {
    return {
      allowed: false,
      deniedMessage: denialForRole(resource, role, language),
      resource,
    }
  }

  return { allowed: true, resource }
}

function generateResidentPortalResponse(role: Role, resource?: Resource) {
  const roleName = role === "owner" ? "Malik" : "Kiracı"
  const ownershipText =
    role === "owner"
      ? "kendi dairenize ve yetkili sakin kayıtlarınıza"
      : "yetkili olduğunuz daireye"

  if (resource === "tickets") {
    return `${roleName} rolünde ${ownershipText} bağlı servis taleplerini açabilir, durumunu takip edebilir ve yönetim ekibiyle mesajlaşabilirsiniz. Şirket geneli servis kuyruğu, borç listesi ve başka daire kayıtları gösterilmez.`
  }

  if (resource === "calendar") {
    return `${roleName} rolünde yalnızca ${ownershipText} bağlı rezervasyon, giriş-çıkış ve uygunluk akışlarını görebilirsiniz. Başka dairelerin takvimi ve operasyon planı kapalıdır.`
  }

  if (resource === "documents") {
    return `${roleName} rolünde sadece ${ownershipText} ait yetkili sözleşme, TAPU veya operasyon belgelerini görebilirsiniz. Diğer malik/kiracı belgeleri ve iç finans evrakı kapalıdır.`
  }

  if (resource === "communications") {
    return `${roleName} rolünde yönetim ekibiyle güvenli iletişim, bildirim ve talep takibini kullanabilirsiniz. İç ekip mesajları, finans onayları ve kullanıcı yönetimi kapalıdır.`
  }

  return `${roleName} çalışma alanında servis, rezervasyon, belge ve iletişim işlemleri kendi yetki kapsamınızla sınırlıdır. Daire matrisi, finans defteri, raporlar, kullanıcılar ve ayarlar bu rolde kapalıdır.`
}

function generateStaffPortalResponse(resource?: Resource) {
  if (resource === "tickets") {
    return "Personel rolünde atanan servis talepleri, SLA durumu, saha notları ve fotoğraf/video kanıtı önceliklidir. Borç listesi, finans onayı ve tüm portföy görünümü bu rolde kapalıdır."
  }

  if (resource === "calendar") {
    return "Personel rolünde günlük saha takvimi; giriş, çıkış, temizlik, gezinti ve görev saatlerini gösterir. Şirket geneli rezervasyon geliri veya finans mutabakatı kapalıdır."
  }

  if (resource === "documents") {
    return "Personel rolünde belge alanı iş kanıtı, fotoğraf, servis formu ve operasyon dokümanları içindir. Finans, TAPU ve kullanıcı yönetimi evrakı bu rolde kapalıdır."
  }

  if (resource === "communications") {
    return "Personel rolünde iletişim alanı atanan işler, saha notları ve yönetici bildirimleri içindir. İç finans veya yönetici onay trafiği gösterilmez."
  }

  return "Personel çalışma alanında atanan servis, rezervasyon, belge kanıtı ve ekip iletişimi görünür. Finans defteri, daire matrisi, raporlar, kullanıcılar ve ayarlar kapalıdır."
}

// Additive Phase-1 roles (guest / vendor / supervised child accounts). They must
// never fall through to the manager/admin/accountant summary branches, which read
// company debt/finance figures. This keeps their assistant scope safe by default.
const LIMITED_PORTAL_ROLES: ReadonlySet<Role> = new Set<Role>([
  "guest",
  "service_provider",
  "child_owner",
  "child_tenant",
  "child_guest",
])

function isLimitedPortalRole(role: Role): boolean {
  return LIMITED_PORTAL_ROLES.has(role)
}

function generateLimitedPortalResponse(role: Role, resource?: Resource) {
  const label = getAiRoleProfile(role).label
  if (role === "service_provider" && resource === "tickets") {
    return `${label} rolünde yalnızca size atanan servis işlerini görüntüleyip güncelleyebilir ve ilgili tedarikçi faturalarını hazırlayabilirsiniz. Şirket finans defteri, tüm daire matrisi ve kullanıcı yönetimi kapalıdır.`
  }
  return `${label} çalışma alanında yalnızca size açık modüller (etkinlikler, cüzdan, takvim, belge ve iletişim) ve kendi yetki kapsamınızdaki kayıtlar görünür. Şirket finans defteri, raporlanan borç tutarları, tüm daire matrisi ve kullanıcı yönetimi bu rolde kapalıdır.`
}

function generateLocalizedAiResponse(prompt: string, role: Role, language: Exclude<AiLanguage, "tr">, resource?: Resource) {
  const lower = prompt.toLocaleLowerCase("tr-TR")
  const summary = getSummary()
  const debtAccounts = getDebtAccounts()
  const legalAccounts = debtAccounts.filter((account) => account.paymentStatus === "legal")
  const blockedTickets = serviceTickets.filter((ticket) => ticket.debtBlocked)
  const overdueTickets = serviceTickets.filter((ticket) => ticket.slaHoursRemaining < 0)
  const checkoutBookings = bookings.filter((booking) => booking.status === "checkout_today" || booking.status === "deposit_review")
  const readyForUatPhases = phaseDeliveryRecords.filter((phase) => phase.status === "ready_for_uat")

  const topAccounts = debtAccounts
    .slice(0, 3)
    .map((account) => `${account.flatNumber}: ${formatTry(account.balanceTry)}`)
    .join("; ")
  const urgentTickets = overdueTickets
    .slice(0, 3)
    .map((ticket) => `${ticket.flatNumber} ${ticket.title} (${ticket.slaHoursRemaining}h)`)
    .join("; ")
  const checkoutQueue = checkoutBookings
    .map((booking) => `${booking.flatNumber} ${booking.guestName} (${formatTry(booking.depositTry)})`)
    .join("; ")

  const copy = {
    en: {
      resident:
        role === "owner"
          ? "As owner, you can ask about your own unit, documents, bookings, service requests and management messages. Other owners, staff records, global reports and company finance stay hidden."
          : "As tenant/guest, you can ask about your authorized unit, bookings, service requests, documents and management messages. Global finance, user roles and other units stay hidden.",
      staff: "As staff, I can help with assigned field jobs, SLA, route notes and photo/video proof. I will not show full finance ledgers or approve access/refund decisions.",
      phase: `Phase status: ${readyForUatPhases.map((phase) => `Phase ${phase.phase}`).join(", ")} are ready for UAT/demo QA. Phase 15 remains launch hardening, security, training and final acceptance.`,
      managerSummary: `Today's priority: ${summary.openTickets} open service tickets, ${summary.overdueTickets} SLA breaches, ${summary.restrictedAccess} access restrictions and ${summary.checkoutsToday} check-outs. Start with SLA risk, debt-blocked work and deposit evidence.`,
      accountantSummary: `Finance priority: ${topAccounts}. Total open debt is ${formatTry(summary.totalDebtTry)} and ${legalAccounts.length} accounts are in legal/90+ day risk. Payments, refunds, deposits and restrictions still need human approval.`,
      summary: `Current snapshot: ${summary.totalFlats} units, ${summary.occupancyRate}% occupancy, ${formatTry(summary.totalDebtTry)} open debt, ${summary.openTickets} open tickets and ${summary.checkoutsToday} check-outs.`,
      debt: `Collection priority: ${topAccounts}. ${legalAccounts.length} accounts are in legal/90+ day risk. AI can explain and draft follow-up text, but cannot apply restrictions or payments.`,
      service: urgentTickets
        ? `Service priority: ${urgentTickets}. ${blockedTickets.length} tickets are blocked by debt and need finance approval before dispatch.`
        : "No critical SLA breach is visible right now. Plan the field route by location, SLA and payment approval.",
      access: `${summary.restrictedAccess} units have restricted access. Review legal-risk debt first, then upcoming check-in access credentials. AI cannot activate or block access by itself.`,
      booking: checkoutQueue
        ? `Booking/deposit queue: ${checkoutQueue}. Do not refund a deposit before checkout photos, cleaning proof and manager/finance review are closed.`
        : "No critical deposit checkout queue is visible today. Pre-check ID, deposit, arrival time and access status for upcoming arrivals.",
      route: "Suggested field flow: handle overdue SLA work first, then paid/approved service orders, then proof uploads. Debt-blocked tickets stay in review.",
      automation: "Highest safe automation value: debt reminders, check-in checklist nudges, SLA alerts, and checkout proof packets. Sensitive execution remains approval-based.",
      integration: "Integration recommendation: keep Supabase live, keep payment/bank/SMS/email/access/camera providers in demo/provider-ready mode until client contracts, API keys and legal approval are confirmed.",
      image: "Image workflow: AI can summarize service photos, checkout proof and document scan quality, but it must not decide damage deductions, identity approval or camera-based access actions.",
      report: "Report draft flow: AI can create a short owner/manager narrative from approved metrics, then a human reviews it before sending.",
      limited:
        "In this workspace you can only reach the modules opened for your role (activities, wallet, calendar, documents and communication) and records inside your own scope. Company finance ledgers, reported debt figures, the full unit matrix and user management stay hidden.",
      default: `I can help with operations in ${languageNames.en}: units, tickets, finance summaries, bookings, communications, integrations and reports, limited by your role (${role}).`,
    },
    de: {
      resident:
        role === "owner"
          ? "Als Eigentümer können Sie Fragen zu Ihrer eigenen Einheit, Dokumenten, Buchungen, Serviceanfragen und Nachrichten stellen. Andere Eigentümer, Personal, globale Berichte und Firmenfinanzen bleiben verborgen."
          : "Als Mieter/Gast können Sie Fragen zu Ihrer berechtigten Einheit, Buchungen, Serviceanfragen, Dokumenten und Nachrichten stellen. Globale Finanzen, Rollen und andere Einheiten bleiben verborgen.",
      staff: "Als Mitarbeiter helfe ich bei zugewiesenen Aufgaben, SLA, Route, Notizen und Foto-/Videonachweisen. Finanzbücher oder Freigaben für Zugang/Rückerstattung zeige ich nicht.",
      phase: `Phasenstatus: ${readyForUatPhases.map((phase) => `Phase ${phase.phase}`).join(", ")} sind für UAT/Demo-QA bereit. Phase 15 bleibt Launch-Härtung, Security, Training und finale Abnahme.`,
      managerSummary: `Heutige Priorität: ${summary.openTickets} offene Servicetickets, ${summary.overdueTickets} SLA-Verstöße, ${summary.restrictedAccess} Zugangsbeschränkungen und ${summary.checkoutsToday} Check-outs. Zuerst SLA-Risiko, gesperrte Arbeiten und Depositenachweise prüfen.`,
      accountantSummary: `Finanzpriorität: ${topAccounts}. Offene Gesamtschuld: ${formatTry(summary.totalDebtTry)}; ${legalAccounts.length} Konten haben 90+ Tage/Rechtsrisiko. Zahlungen, Rückerstattungen, Kautionen und Sperren brauchen menschliche Freigabe.`,
      summary: `Aktueller Stand: ${summary.totalFlats} Einheiten, ${summary.occupancyRate}% Belegung, ${formatTry(summary.totalDebtTry)} offene Schuld, ${summary.openTickets} offene Tickets und ${summary.checkoutsToday} Check-outs.`,
      debt: `Inkasso-Priorität: ${topAccounts}. ${legalAccounts.length} Konten haben 90+ Tage/Rechtsrisiko. AI darf erklären und Textentwürfe erstellen, aber keine Zahlungen oder Sperren ausführen.`,
      service: urgentTickets
        ? `Service-Priorität: ${urgentTickets}. ${blockedTickets.length} Tickets sind wegen Schulden blockiert und brauchen Finanzfreigabe vor Einsatz.`
        : "Aktuell ist kein kritischer SLA-Verstoß sichtbar. Planen Sie die Route nach Ort, SLA und Zahlungsfreigabe.",
      access: `${summary.restrictedAccess} Einheiten haben beschränkten Zugang. Zuerst Rechts-/Schuldenrisiko prüfen, dann Check-in-Zugangsdaten. AI aktiviert oder sperrt keinen Zugang selbst.`,
      booking: checkoutQueue
        ? `Buchungs-/Kautionsqueue: ${checkoutQueue}. Keine Rückerstattung vor Check-out-Fotos, Reinigungsnachweis und Manager-/Finanzfreigabe.`
        : "Heute ist keine kritische Kautionsqueue sichtbar. Prüfen Sie ID, Kaution, Ankunftszeit und Zugang bei kommenden Anreisen.",
      route: "Empfohlener Außendienst: zuerst überfällige SLA-Arbeiten, dann bezahlte/freigegebene Aufträge, danach Nachweise hochladen. Schuldenblockierte Tickets bleiben in Prüfung.",
      automation: "Sichere Automatisierung mit hohem Nutzen: Schuldenerinnerungen, Check-in-Checklisten, SLA-Alarme und Check-out-Nachweispakete. Sensible Ausführung bleibt genehmigungspflichtig.",
      integration: "Integrationsempfehlung: Supabase live lassen; Zahlung, Bank, SMS, E-Mail, Zugang und Kameras im Demo-/Provider-ready-Modus lassen, bis Verträge, API-Keys und rechtliche Freigabe bestätigt sind.",
      image: "Bildworkflow: AI kann Servicefotos, Check-out-Nachweise und Scanqualität zusammenfassen, aber keine Schadenabzüge, Identitätsfreigaben oder kamerabasierten Zugangsaktionen entscheiden.",
      report: "Berichtsentwurf: AI erstellt kurze Owner-/Manager-Texte aus geprüften Metriken; ein Mensch prüft vor Versand.",
      limited:
        "In diesem Arbeitsbereich erreichen Sie nur die für Ihre Rolle freigegebenen Module (Aktivitäten, Wallet, Kalender, Dokumente und Kommunikation) sowie Datensätze in Ihrem eigenen Bereich. Firmenfinanzbücher, gemeldete Schuldenbeträge, die vollständige Wohnungsmatrix und die Benutzerverwaltung bleiben verborgen.",
      default: `Ich kann auf Deutsch bei Betrieb, Tickets, Finanzen, Buchungen, Kommunikation, Integrationen und Berichten helfen, begrenzt durch Ihre Rolle (${role}).`,
    },
    ru: {
      resident:
        role === "owner"
          ? "Как собственник, вы можете спрашивать о своей квартире, документах, бронированиях, сервисных заявках и сообщениях. Другие собственники, персонал, глобальные отчеты и финансы компании скрыты."
          : "Как арендатор/гость, вы можете спрашивать о своей разрешенной квартире, бронированиях, заявках, документах и сообщениях. Общие финансы, роли и другие квартиры скрыты.",
      staff: "Для персонала я помогаю с назначенными задачами, SLA, маршрутом, заметками и фото/видео-доказательствами. Финансовый журнал и решения по доступу/возвратам не показываю.",
      phase: `Статус фаз: ${readyForUatPhases.map((phase) => `фаза ${phase.phase}`).join(", ")} готовы для UAT/демо-QA. Фаза 15 остается для безопасности, обучения, запуска и финальной приемки.`,
      managerSummary: `Приоритет на сегодня: ${summary.openTickets} открытых заявок, ${summary.overdueTickets} нарушений SLA, ${summary.restrictedAccess} ограничений доступа и ${summary.checkoutsToday} выездов. Сначала SLA-риск, долги и депозитные доказательства.`,
      accountantSummary: `Финансовый приоритет: ${topAccounts}. Общий открытый долг: ${formatTry(summary.totalDebtTry)}; ${legalAccounts.length} счетов в 90+ днях/юридическом риске. Платежи, возвраты, депозиты и ограничения требуют одобрения человека.`,
      summary: `Текущий снимок: ${summary.totalFlats} квартир, занятость ${summary.occupancyRate}%, открытый долг ${formatTry(summary.totalDebtTry)}, ${summary.openTickets} открытых заявок и ${summary.checkoutsToday} выездов.`,
      debt: `Приоритет взыскания: ${topAccounts}. ${legalAccounts.length} счетов имеют 90+ дней/юридический риск. AI может объяснить и подготовить текст, но не выполняет платежи или ограничения.`,
      service: urgentTickets
        ? `Приоритет сервиса: ${urgentTickets}. ${blockedTickets.length} заявок заблокированы из-за долга и требуют финансового одобрения.`
        : "Критических нарушений SLA сейчас не видно. Планируйте маршрут по локации, SLA и подтверждению оплаты.",
      access: `${summary.restrictedAccess} квартир имеют ограниченный доступ. Сначала проверьте юридический долг, затем доступы для ближайших заездов. AI сам не активирует и не блокирует доступ.`,
      booking: checkoutQueue
        ? `Очередь бронирований/депозитов: ${checkoutQueue}. Не возвращайте депозит до фото выезда, подтверждения уборки и проверки менеджера/финансов.`
        : "Критической очереди депозитов сегодня не видно. Проверьте ID, депозит, время прибытия и доступ для будущих заездов.",
      route: "Полевой маршрут: сначала просроченные SLA, затем оплаченные/одобренные работы, затем загрузка доказательств. Заявки с долгом остаются на проверке.",
      automation: "Самая безопасная автоматизация: напоминания о долгах, чек-лист заезда, SLA-уведомления и пакеты доказательств после выезда. Чувствительные действия требуют одобрения.",
      integration: "Рекомендация по интеграциям: Supabase оставить live; платежи, банк, SMS, email, доступ и камеры держать в demo/provider-ready до контрактов, API-ключей и юридического одобрения.",
      image: "Workflow изображений: AI может резюмировать сервисные фото, доказательства выезда и качество сканов, но не решает удержания депозита, верификацию личности или доступ по камере.",
      report: "Черновик отчета: AI готовит короткий текст для собственника/менеджера на основе утвержденных метрик; человек проверяет перед отправкой.",
      limited:
        "В этом рабочем пространстве вам доступны только открытые для вашей роли модули (активности, кошелёк, календарь, документы и коммуникации) и записи в рамках вашей области. Финансовые журналы компании, суммы задолженности, полная матрица юнитов и управление пользователями скрыты.",
      default: `Я могу отвечать по-русски по операциям, заявкам, финансам, бронированиям, коммуникациям, интеграциям и отчетам в рамках вашей роли (${role}).`,
    },
  }[language]

  if (role === "owner" || role === "tenant") return copy.resident
  if (role === "staff") return copy.staff
  if (isLimitedPortalRole(role)) return copy.limited
  if (lower.includes("phase") || lower.includes("faz") || lower.includes("roadmap") || lower.includes("next")) return copy.phase
  if (role === "manager" && (lower.includes("summary") || lower.includes("operations") || lower.includes("plan") || lower.includes("heute"))) return copy.managerSummary
  if (role === "accountant" && (lower.includes("finance") || lower.includes("collection") || lower.includes("payment") || lower.includes("zahlung"))) return copy.accountantSummary
  if (lower.includes("debt") || lower.includes("collection") || lower.includes("schulden") || lower.includes("долг")) return copy.debt
  if (
    lower.includes("service") ||
    lower.includes("ticket") ||
    lower.includes("sla") ||
    lower.includes("serviceticket") ||
    lower.includes("serviceanfrage") ||
    lower.includes("störung") ||
    lower.includes("stoerung") ||
    lower.includes("reparatur") ||
    lower.includes("сервис") ||
    lower.includes("заявк") ||
    lower.includes("тикет") ||
    lower.includes("ремонт")
  ) return copy.service
  if (lower.includes("access") || lower.includes("zugang") || lower.includes("доступ")) return copy.access
  if (lower.includes("booking") || lower.includes("check") || lower.includes("buchung") || lower.includes("бронир")) return copy.booking
  if (lower.includes("route") || lower.includes("technical") || lower.includes("techniker") || lower.includes("маршрут")) return copy.route
  if (lower.includes("automation") || lower.includes("automatisierung") || lower.includes("автомат")) return copy.automation
  if (lower.includes("integration") || lower.includes("provider") || lower.includes("api") || lower.includes("интеграц")) return copy.integration
  if (lower.includes("image") || lower.includes("photo") || lower.includes("foto") || lower.includes("bild") || lower.includes("фото")) return copy.image
  if (lower.includes("report") || lower.includes("bericht") || lower.includes("отчет")) return copy.report
  if (resource === "reports") return copy.report
  if (resource === "settings") return copy.integration
  return copy.summary || copy.default
}

const aiSuggestionCopy: Record<AiLanguage, Record<string, Omit<AiSuggestion, "id">>> = {
  tr: {
    summary: { label: "Günlük özet", prompt: "Bugünkü site operasyonlarını özetle." },
    "debt-risk": { label: "Borç riski", prompt: "Bugün hangi daireler için borç aksiyonu gerekiyor?" },
    "service-priority": { label: "Servis önceliği", prompt: "Servis taleplerini SLA ve borç durumuna göre önceliklendir." },
    "finance-summary": { label: "Finans özeti", prompt: "Tahsilatları ve açık finans işlerini özetle." },
    "portfolio-health": { label: "Portföy sağlığı", prompt: "769 dairelik portföy sağlığını analiz et." },
    automation: { label: "Otomasyon fırsatı", prompt: "Sırada hangi iş akışları otomatikleştirilmeli?" },
    "cash-flow": { label: "Nakit akışı", prompt: "Tahsilatları ve açık borcu özetle." },
    operations: { label: "Operasyon planı", prompt: "Bugünkü operasyon planını oluştur." },
    "access-control": { label: "Erişim kontrolü", prompt: "Kısıtlı erişim risklerini göster." },
    legal: { label: "Yasal takip", prompt: "Hangi daireler yasal takip aşamasına taşınmalı?" },
    route: { label: "Teknik rota", prompt: "Bugün için teknisyen rotasını oluştur." },
    blocked: { label: "Blokeli servis", prompt: "Hangi servis talepleri borç nedeniyle blokeli?" },
    "my-flat": { label: "Daire durumu", prompt: "Dairemin durumu nedir?" },
    rentals: { label: "Kiralama", prompt: "Rezervasyon, belge ve açık servis durumumu göster." },
    "my-reservation": { label: "Rezervasyonum", prompt: "Rezervasyonumu ve yetkili belgelerimi göster." },
    "my-service": { label: "Servis talebim", prompt: "Açık servis taleplerimi göster." },
  },
  en: {
    summary: { label: "Daily summary", prompt: "Summarize today's site operations." },
    "debt-risk": { label: "Debt risk", prompt: "Which units need debt action today?" },
    "service-priority": { label: "Service priority", prompt: "Prioritize service tickets by SLA and debt status." },
    "finance-summary": { label: "Finance summary", prompt: "Summarize collections and open finance work." },
    "portfolio-health": { label: "Portfolio health", prompt: "Analyze the full 769-unit portfolio health." },
    automation: { label: "Automation opportunity", prompt: "Which workflows should be automated next?" },
    "cash-flow": { label: "Cash flow", prompt: "Summarize collections and outstanding debt." },
    operations: { label: "Operations plan", prompt: "Create today's operations plan." },
    "access-control": { label: "Access control", prompt: "Show restricted access risks." },
    legal: { label: "Legal follow-up", prompt: "Which units should move to legal follow-up?" },
    route: { label: "Technician route", prompt: "Build the technician route for today." },
    blocked: { label: "Blocked service", prompt: "Which service tickets are blocked by debt?" },
    "my-flat": { label: "Unit status", prompt: "What is the status of my unit?" },
    rentals: { label: "Rentals", prompt: "Show my reservation, documents and open service status." },
    "my-reservation": { label: "My reservation", prompt: "Show my reservation and authorized documents." },
    "my-service": { label: "My service request", prompt: "Show my open service requests." },
  },
  de: {
    summary: { label: "Tagesübersicht", prompt: "Fasse den heutigen Standortbetrieb zusammen." },
    "debt-risk": { label: "Schuldenrisiko", prompt: "Welche Einheiten brauchen heute eine Schuldenaktion?" },
    "service-priority": { label: "Servicepriorität", prompt: "Priorisiere Servicetickets nach SLA und Schuldenstatus." },
    "finance-summary": { label: "Finanzübersicht", prompt: "Fasse Zahlungseingänge und offene Finanzarbeit zusammen." },
    "portfolio-health": { label: "Portfoliogesundheit", prompt: "Analysiere die Gesundheit des gesamten Portfolios mit 769 Einheiten." },
    automation: { label: "Automatisierungschance", prompt: "Welche Workflows sollten als Nächstes automatisiert werden?" },
    "cash-flow": { label: "Cashflow", prompt: "Fasse Zahlungseingänge und offene Schulden zusammen." },
    operations: { label: "Operationsplan", prompt: "Erstelle den heutigen Operationsplan." },
    "access-control": { label: "Zugangskontrolle", prompt: "Zeige Risiken durch eingeschränkten Zugang." },
    legal: { label: "Rechtliche Nachverfolgung", prompt: "Welche Einheiten sollten in die rechtliche Nachverfolgung wechseln?" },
    route: { label: "Technikerroute", prompt: "Erstelle die Technikerroute für heute." },
    blocked: { label: "Blockierter Service", prompt: "Welche Servicetickets sind wegen Schulden blockiert?" },
    "my-flat": { label: "Einheitenstatus", prompt: "Wie ist der Status meiner Einheit?" },
    rentals: { label: "Vermietung", prompt: "Zeige meine Reservierung, Dokumente und offenen Servicestatus." },
    "my-reservation": { label: "Meine Reservierung", prompt: "Zeige meine Reservierung und autorisierten Dokumente." },
    "my-service": { label: "Meine Serviceanfrage", prompt: "Zeige meine offenen Serviceanfragen." },
  },
  ru: {
    summary: { label: "Дневная сводка", prompt: "Кратко опишите сегодняшние операции объекта." },
    "debt-risk": { label: "Риск долга", prompt: "Какие юниты сегодня требуют действия по долгу?" },
    "service-priority": { label: "Приоритет сервиса", prompt: "Расставьте сервисные заявки по SLA и статусу долга." },
    "finance-summary": { label: "Финансовая сводка", prompt: "Суммируйте оплаты и открытые финансовые задачи." },
    "portfolio-health": { label: "Состояние портфеля", prompt: "Проанализируйте состояние всего портфеля из 769 юнитов." },
    automation: { label: "Возможность автоматизации", prompt: "Какие рабочие процессы нужно автоматизировать следующими?" },
    "cash-flow": { label: "Денежный поток", prompt: "Суммируйте оплаты и открытый долг." },
    operations: { label: "Операционный план", prompt: "Создайте операционный план на сегодня." },
    "access-control": { label: "Контроль доступа", prompt: "Покажите риски ограниченного доступа." },
    legal: { label: "Юридический контроль", prompt: "Какие юниты нужно перевести в юридическое сопровождение?" },
    route: { label: "Маршрут техника", prompt: "Составьте маршрут техника на сегодня." },
    blocked: { label: "Заблокированный сервис", prompt: "Какие сервисные заявки заблокированы из-за долга?" },
    "my-flat": { label: "Статус юнита", prompt: "Какой статус моего юнита?" },
    rentals: { label: "Аренда", prompt: "Покажите мою бронь, документы и открытый статус сервиса." },
    "my-reservation": { label: "Моя бронь", prompt: "Покажите мою бронь и авторизованные документы." },
    "my-service": { label: "Моя сервисная заявка", prompt: "Покажите мои открытые сервисные заявки." },
  },
}

function suggestion(id: keyof typeof aiSuggestionCopy.en, language: AiLanguage): AiSuggestion {
  return { id, ...aiSuggestionCopy[language][id] }
}

export function getAiSuggestions(role: Role, language: AiLanguage = "tr"): AiSuggestion[] {
  const common: AiSuggestion[] =
    role === "admin" || role === "manager"
      ? [
          suggestion("summary", language),
          suggestion("debt-risk", language),
          suggestion("service-priority", language),
        ]
      : role === "accountant"
        ? [
            suggestion("finance-summary", language),
            suggestion("debt-risk", language),
          ]
        : []

  const roleSpecific: Record<Role, AiSuggestion[]> = {
    admin: [
      suggestion("portfolio-health", language),
      suggestion("automation", language),
      suggestion("cash-flow", language),
    ],
    manager: [
      suggestion("operations", language),
      suggestion("access-control", language),
    ],
    accountant: [
      suggestion("cash-flow", language),
      suggestion("legal", language),
    ],
    staff: [
      suggestion("route", language),
      suggestion("blocked", language),
    ],
    owner: [
      suggestion("my-flat", language),
      suggestion("rentals", language),
    ],
    tenant: [
      suggestion("my-reservation", language),
      suggestion("my-service", language),
    ],
    guest: [
      suggestion("my-flat", language),
      suggestion("my-reservation", language),
    ],
    service_provider: [
      suggestion("my-service", language),
      suggestion("route", language),
    ],
    child_owner: [
      suggestion("my-flat", language),
      suggestion("my-reservation", language),
    ],
    child_tenant: [
      suggestion("my-flat", language),
      suggestion("my-reservation", language),
    ],
    child_guest: [
      suggestion("my-flat", language),
      suggestion("my-reservation", language),
    ],
  }

  return [...common, ...roleSpecific[role]]
}

export function generateAiResponse(prompt: string, role: Role, language: AiLanguage = detectAiLanguage(prompt)): string {
  const lower = prompt.toLocaleLowerCase("tr-TR")
  const profile = getAiRoleProfile(role)
  const accessDecision = getAiAccessDecision(prompt, role, language)
  if (!accessDecision.allowed) {
    return accessDecision.deniedMessage ?? denialForRole("dashboard", role, language)
  }

  if (language !== "tr") {
    return generateLocalizedAiResponse(prompt, role, language, accessDecision.resource)
  }

  if (role === "owner" || role === "tenant") {
    return generateResidentPortalResponse(role, accessDecision.resource)
  }

  if (role === "staff") {
    return generateStaffPortalResponse(accessDecision.resource)
  }

  if (isLimitedPortalRole(role)) {
    return generateLimitedPortalResponse(role, accessDecision.resource)
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
    return `${profile.label} kapsamı: ${readyForUatPhases.map((phase) => `Faz ${phase.phase}`).join(", ")} UAT için hazır, ${activePhases.map((phase) => `Faz ${phase.phase}`).join(", ")} aktif geliştirmede, ${plannedPhases.length} faz planlı durumda. Sıradaki doğru adım Faz 7 ödeme/depozito/mutabakat kararlarını sağlayıcı ve hukuk onayıyla kapatmak; ardından servis siparişi, görev/SLA, rezervasyon ve iletişim fazları aynı RBAC ve audit modeliyle bağlanmalı.`
  }

  if (role === "manager" && (lower.includes("summary") || lower.includes("özet") || lower.includes("operations") || lower.includes("plan"))) {
    return `${profile.label} çalışma alanı için bugün öncelik: ${summary.openTickets} açık servis talebi, ${summary.overdueTickets} SLA dışı iş, ${summary.restrictedAccess} erişim kısıtı ve ${summary.checkoutsToday} check-out. Ekip yönlendirmesi önce SLA riski ve borç nedeniyle bekleyen servislerden başlamalı; finans kaydı oluşturulmadan muhasebe onayı istenmeli.`
  }

  if (role === "accountant" && (lower.includes("summary") || lower.includes("özet") || lower.includes("finance") || lower.includes("finans") || lower.includes("collection") || lower.includes("tahsilat"))) {
    const topAccounts = debtAccounts
      .slice(0, 3)
      .map((account) => `${account.flatNumber}: ${formatTry(account.balanceTry)}`)
      .join("; ")
    return `${profile.label} kapsamı için tahsilat önceliği: ${topAccounts}. Toplam açık borç ${formatTry(summary.totalDebtTry)}, 90+ gün/yasal riskte ${legalAccounts.length} hesap var. Ödeme, iade, depozito veya erişim kısıtı aksiyonu doğrudan uygulanmaz; mutabakat ve insan onayı gerekir.`
  }

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
      ? `Servis önceliği: ${urgent}. Borç blokeli ${blockedTickets.length} talep finans onayı bekliyor; personel yönlendirmeden önce ödeme durumu kontrol edilmeli.`
      : "Şu anda SLA dışı servis talebi yok. Günlük saha rotası açık taleplerin maliyet ve lokasyonuna göre planlanabilir."
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
    return `Bugünkü saha rota önerisi: ${route}. Borç blokeli işler ayrıldı; önce SLA riski olan ve ödeme onayı tamamlanan talepler kapatılmalı.`
  }

  if (lower.includes("automation") || lower.includes("otomasyon")) {
    return "En yüksek otomasyon getirisi üç akışta: aidat gecikme hatırlatmaları, borç durumuna göre erişim kodu kontrolü, check-out sonrası depozito ve hasar kapama. Bu üç akış operasyon süresini ciddi azaltır."
  }

  const roleContext =
    "Rolünüze göre daire, finans, servis, rezervasyon, iletişim ve rapor modülleri önceliklendirilir."

  return `Bu konuda yardımcı olabilirim. Mevcut veride ${summary.totalFlats} daire, ${summary.openTickets} açık servis talebi ve ${formatTry(summary.totalDebtTry)} açık borç var. ${roleContext}`
}
