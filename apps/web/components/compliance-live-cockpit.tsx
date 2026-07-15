"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useLocale } from "next-intl"
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  History,
  Info,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Wifi,
  WifiOff,
} from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import type {
  ComplianceCase,
  ComplianceCaseStatus,
  ComplianceCockpitData,
  ComplianceDecision,
  ComplianceDecisionEvent,
  ComplianceRiskLevel,
} from "@/lib/compliance-repository"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type LocaleKey = "tr" | "en" | "de" | "ru"
type RealtimeState = "checking" | "connected" | "recovery" | "error"
type LoadState = "loading" | "ready" | "error"
type CaseTypeFilter = ComplianceCase["caseType"] | "all"
type CaseStatusFilter = ComplianceCaseStatus | "all"
type RiskFilter = ComplianceRiskLevel | "all"

const copy = {
  tr: {
    eyebrow: "Erişim ve alıcı uyum kokpiti",
    title: "Karar bekleyen dosyaları tek yerde yönetin",
    intro:
      "Erişim, depozito ve alıcı ön kontrollerini aynı sırada inceleyin. Her karar gerekçeli, insan onaylı ve denetlenebilirdir.",
    refresh: "Yenile",
    retry: "Tekrar dene",
    loading: "Uyum dosyaları yükleniyor…",
    loadError: "Uyum dosyaları şu anda yüklenemiyor.",
    refreshError: "Son güncelleme alınamadı; ekrandaki önceki kayıtlar korunuyor.",
    lastUpdated: "Son güncelleme",
    justNow: "az önce",
    sourceLive: "Organizasyon verisi",
    sourceDemo: "Açıkça etiketlenmiş demo verisi",
    realtime: "Gerçek zaman bağlı",
    checking: "Gerçek zaman kontrol ediliyor",
    recovery: "30 sn kurtarma yenilemesi",
    realtimeError: "Gerçek zaman kesildi; yenileme devam ediyor",
    demoTitle: "Bu görünüm demo kayıtları gösteriyor",
    demoBody:
      "Yerel rol profili veritabanı yetkisini taklit etmez. Karar düğmeleri yalnızca gerçek, organizasyon kapsamlı oturumda açılır.",
    boundariesTitle: "Karar sınırları",
    accessBoundary: "Fiziksel erişim",
    accessBlocked:
      "Kart, kapı veya bariyer bağlantısı aktif değil. Bu ekrandaki onay fiziksel erişim açmaz.",
    accessConfigured:
      "Sağlayıcı yapılandırılmış olsa bile bu inceleme erişim açmaz; ayrı yetkili işlem gerekir.",
    moneyBoundary: "Para ve depozito",
    moneyBody:
      "Onay, ödeme, kesinti veya iade yapmaz. Finans işlemi ayrı muhasebe onayı ister.",
    legalBoundary: "Alıcı uygunluğu",
    legalBody:
      "Bu bir operasyonel ön kontroldür, hukuki garanti değildir. Gerektiğinde güncel uzman görüşü alınır.",
    metrics: {
      total: "Toplam dosya",
      pending: "İnceleme sırası",
      blocked: "Blokeli",
      critical: "Kritik risk",
    },
    filters: "Dosyaları filtrele",
    search: "Dosya, kişi, daire veya sonraki adımı ara",
    type: "Dosya türü",
    status: "Durum",
    risk: "Risk",
    allTypes: "Tüm türler",
    allStatuses: "Tüm durumlar",
    allRisks: "Tüm riskler",
    clearFilters: "Filtreleri temizle",
    queue: "İnceleme sırası",
    queueCount: (count: number) => `${count} dosya`,
    noCasesTitle: "Henüz uyum dosyası yok",
    noCasesBody: "Yetkili saha kapsamınızda kayıt oluştuğunda burada görünecektir.",
    noResultsTitle: "Filtrelerle eşleşen dosya yok",
    noResultsBody: "Arama metnini veya filtreleri değiştirin.",
    selectCase: "Ayrıntı ve geçmişi görmek için bir dosya seçin.",
    caseDetails: "Dosya ayrıntısı",
    reference: "Referans",
    siteUnit: "Saha / daire",
    exposure: "Finansal tutar",
    origin: "Veri kaynağı",
    updated: "Güncellendi",
    blocker: "Mevcut engel",
    noBlocker: "Kayıtlı engel yok.",
    nextAction: "Önerilen sonraki adım",
    noNextAction: "Yeni bir sonraki adım tanımlanmadı.",
    evidence: "Dosya bilgileri",
    noEvidence: "Ek yapılandırılmış bilgi yok.",
    history: "Karar geçmişi",
    historyEmpty: "Bu dosya için henüz karar kaydı yok.",
    version: (version: number) => `Sürüm ${version}`,
    decisionTitle: "İnsan kararı kaydet",
    decisionBody:
      "Karar yalnızca inceleme durumunu günceller. Fiziksel erişim, para hareketi ve hukuki garanti üretmez.",
    decision: "Karar",
    rationale: "Karar gerekçesi",
    rationaleHint: "Kanıtı, kontrol sonucunu ve beklenen sonraki adımı en az 10 karakterle yazın.",
    rationalePlaceholder: "Örn. Kimlik belgesi kontrol edildi; fiziksel erişim ayrı işlemde kapalı kalacak.",
    characters: (count: number) => `${count}/1000 karakter`,
    submitDecision: "Gerekçeli kararı kaydet",
    saving: "Karar kaydediliyor…",
    saved: "Karar kaydedildi ve geçmişe eklendi.",
    conflict:
      "Dosya siz incelerken değişti. En güncel sürüm yüklendi; yeniden kontrol edin.",
    decisionUnavailable:
      "Bu ortamda karar kaydı kapalıdır. Gerçek organizasyon oturumuyla açılır.",
    reviewer: "İnceleyen",
    fromTo: (from: string, to: string) => `${from} → ${to}`,
    humanOnly: "İnsan kararı",
    caseTypes: {
      access: "Erişim",
      deposit: "Depozito",
      buyer_suitability: "Alıcı ön kontrolü",
    },
    statuses: {
      pending_review: "İnceleme bekliyor",
      in_review: "İncelemede",
      approved: "Onaylandı",
      rejected: "Reddedildi",
      blocked: "Blokeli",
      closed: "Kapalı",
    },
    risks: { low: "Düşük", medium: "Orta", high: "Yüksek", critical: "Kritik" },
    decisions: {
      approve: "Ön kontrolü onayla",
      reject: "Reddet",
      request_information: "Bilgi iste",
      block: "Bloke et",
      close: "Dosyayı kapat",
      reopen: "Yeniden aç",
    },
    origins: {
      manual: "Manuel kayıt",
      client_import: "Müşteri aktarımı",
      operational_projection: "Operasyon kaydı",
      demo_seed: "Demo senaryosu",
    },
  },
  en: {
    eyebrow: "Access and buyer compliance cockpit",
    title: "Manage every review-ready case in one place",
    intro:
      "Review access, deposit, and buyer pre-checks in one queue. Every decision is reasoned, human-approved, and auditable.",
    refresh: "Refresh",
    retry: "Try again",
    loading: "Loading compliance cases…",
    loadError: "Compliance cases cannot be loaded right now.",
    refreshError: "The latest refresh failed; the previous records remain visible.",
    lastUpdated: "Last updated",
    justNow: "just now",
    sourceLive: "Organization data",
    sourceDemo: "Clearly labelled demo data",
    realtime: "Realtime connected",
    checking: "Checking realtime",
    recovery: "30 s recovery refresh",
    realtimeError: "Realtime disconnected; refresh continues",
    demoTitle: "This view contains demo records",
    demoBody:
      "A local role profile never imitates database authority. Decision controls open only for a real organization-scoped session.",
    boundariesTitle: "Decision boundaries",
    accessBoundary: "Physical access",
    accessBlocked:
      "The card, gate, or barrier provider is not active. Approval on this screen never opens physical access.",
    accessConfigured:
      "Even when a provider is configured, this review does not open access; a separate authorized action is required.",
    moneyBoundary: "Money and deposits",
    moneyBody:
      "Approval does not pay, deduct, or refund money. A separate accounting approval is required.",
    legalBoundary: "Buyer suitability",
    legalBody:
      "This is an operational pre-check, not a legal guarantee. Current qualified advice is required when indicated.",
    metrics: {
      total: "Total cases",
      pending: "Review queue",
      blocked: "Blocked",
      critical: "Critical risk",
    },
    filters: "Filter cases",
    search: "Search by case, person, unit, or next step",
    type: "Case type",
    status: "Status",
    risk: "Risk",
    allTypes: "All types",
    allStatuses: "All statuses",
    allRisks: "All risks",
    clearFilters: "Clear filters",
    queue: "Review queue",
    queueCount: (count: number) => `${count} cases`,
    noCasesTitle: "No compliance cases yet",
    noCasesBody: "New records in your authorized site scope will appear here.",
    noResultsTitle: "No cases match these filters",
    noResultsBody: "Change the search text or filters.",
    selectCase: "Select a case to see its detail and history.",
    caseDetails: "Case details",
    reference: "Reference",
    siteUnit: "Site / unit",
    exposure: "Financial amount",
    origin: "Data source",
    updated: "Updated",
    blocker: "Current blocker",
    noBlocker: "No blocker is recorded.",
    nextAction: "Recommended next step",
    noNextAction: "No new next step is recorded.",
    evidence: "Case information",
    noEvidence: "No additional structured information is available.",
    history: "Decision history",
    historyEmpty: "No decision has been recorded for this case yet.",
    version: (version: number) => `Version ${version}`,
    decisionTitle: "Record a human decision",
    decisionBody:
      "This changes review state only. It never moves money, opens physical access, or creates a legal guarantee.",
    decision: "Decision",
    rationale: "Decision reason",
    rationaleHint: "Describe the evidence, review result, and expected next step in at least 10 characters.",
    rationalePlaceholder: "For example: Identity evidence reviewed; physical access remains closed for a separate action.",
    characters: (count: number) => `${count}/1000 characters`,
    submitDecision: "Record reasoned decision",
    saving: "Recording decision…",
    saved: "The decision was recorded and added to the history.",
    conflict:
      "The case changed while you were reviewing it. The latest version is loaded; review it again.",
    decisionUnavailable:
      "Decision recording is closed in this environment. It opens with a real organization session.",
    reviewer: "Reviewed by",
    fromTo: (from: string, to: string) => `${from} → ${to}`,
    humanOnly: "Human decision",
    caseTypes: {
      access: "Access",
      deposit: "Deposit",
      buyer_suitability: "Buyer pre-check",
    },
    statuses: {
      pending_review: "Pending review",
      in_review: "In review",
      approved: "Approved",
      rejected: "Rejected",
      blocked: "Blocked",
      closed: "Closed",
    },
    risks: { low: "Low", medium: "Medium", high: "High", critical: "Critical" },
    decisions: {
      approve: "Approve pre-check",
      reject: "Reject",
      request_information: "Request information",
      block: "Block",
      close: "Close case",
      reopen: "Reopen",
    },
    origins: {
      manual: "Manual record",
      client_import: "Client import",
      operational_projection: "Operational record",
      demo_seed: "Demo scenario",
    },
  },
  de: {
    eyebrow: "Zugangs- und Käufer-Compliance",
    title: "Alle prüfbereiten Fälle an einem Ort steuern",
    intro:
      "Zugang, Kaution und Käufer-Vorprüfung in einer Warteschlange prüfen. Jede Entscheidung ist begründet, menschlich freigegeben und auditierbar.",
    refresh: "Aktualisieren",
    retry: "Erneut versuchen",
    loading: "Compliance-Fälle werden geladen…",
    loadError: "Compliance-Fälle können gerade nicht geladen werden.",
    refreshError: "Die Aktualisierung ist fehlgeschlagen; die bisherigen Daten bleiben sichtbar.",
    lastUpdated: "Zuletzt aktualisiert",
    justNow: "gerade eben",
    sourceLive: "Organisationsdaten",
    sourceDemo: "Klar gekennzeichnete Demodaten",
    realtime: "Echtzeit verbunden",
    checking: "Echtzeit wird geprüft",
    recovery: "30-Sek.-Wiederherstellung",
    realtimeError: "Echtzeit getrennt; Aktualisierung läuft weiter",
    demoTitle: "Diese Ansicht enthält Demodatensätze",
    demoBody:
      "Ein lokales Rollenprofil simuliert keine Datenbankrechte. Entscheidungen sind nur mit echter Organisationssitzung möglich.",
    boundariesTitle: "Entscheidungsgrenzen",
    accessBoundary: "Physischer Zugang",
    accessBlocked:
      "Karten-, Tor- oder Schrankenanbieter ist nicht aktiv. Eine Freigabe hier öffnet keinen physischen Zugang.",
    accessConfigured:
      "Auch bei konfiguriertem Anbieter öffnet diese Prüfung keinen Zugang; eine separate autorisierte Aktion ist nötig.",
    moneyBoundary: "Geld und Kaution",
    moneyBody:
      "Die Freigabe führt keine Zahlung, Verrechnung oder Erstattung aus. Dafür ist eine separate Buchhaltungsfreigabe nötig.",
    legalBoundary: "Käufereignung",
    legalBody:
      "Dies ist eine operative Vorprüfung, keine Rechtsgarantie. Wo nötig, ist aktueller qualifizierter Rat einzuholen.",
    metrics: {
      total: "Fälle gesamt",
      pending: "Prüfwarteschlange",
      blocked: "Blockiert",
      critical: "Kritisches Risiko",
    },
    filters: "Fälle filtern",
    search: "Nach Fall, Person, Einheit oder nächstem Schritt suchen",
    type: "Fallart",
    status: "Status",
    risk: "Risiko",
    allTypes: "Alle Arten",
    allStatuses: "Alle Status",
    allRisks: "Alle Risiken",
    clearFilters: "Filter löschen",
    queue: "Prüfwarteschlange",
    queueCount: (count: number) => `${count} Fälle`,
    noCasesTitle: "Noch keine Compliance-Fälle",
    noCasesBody: "Neue Datensätze in Ihrem berechtigten Standortbereich erscheinen hier.",
    noResultsTitle: "Keine Fälle passen zu diesen Filtern",
    noResultsBody: "Suche oder Filter anpassen.",
    selectCase: "Wählen Sie einen Fall, um Details und Verlauf zu sehen.",
    caseDetails: "Falldetails",
    reference: "Referenz",
    siteUnit: "Standort / Einheit",
    exposure: "Finanzieller Betrag",
    origin: "Datenquelle",
    updated: "Aktualisiert",
    blocker: "Aktuelle Blockade",
    noBlocker: "Keine Blockade erfasst.",
    nextAction: "Empfohlener nächster Schritt",
    noNextAction: "Kein neuer nächster Schritt erfasst.",
    evidence: "Fallinformationen",
    noEvidence: "Keine weiteren strukturierten Informationen verfügbar.",
    history: "Entscheidungsverlauf",
    historyEmpty: "Für diesen Fall wurde noch keine Entscheidung erfasst.",
    version: (version: number) => `Version ${version}`,
    decisionTitle: "Menschliche Entscheidung erfassen",
    decisionBody:
      "Nur der Prüfstatus ändert sich. Geld, physischer Zugang und Rechtsgarantie bleiben ausgeschlossen.",
    decision: "Entscheidung",
    rationale: "Begründung",
    rationaleHint: "Nachweis, Prüfergebnis und nächsten Schritt mit mindestens 10 Zeichen beschreiben.",
    rationalePlaceholder: "Beispiel: Identität geprüft; physischer Zugang bleibt bis zur separaten Aktion geschlossen.",
    characters: (count: number) => `${count}/1000 Zeichen`,
    submitDecision: "Begründete Entscheidung speichern",
    saving: "Entscheidung wird gespeichert…",
    saved: "Die Entscheidung wurde gespeichert und dem Verlauf hinzugefügt.",
    conflict:
      "Der Fall wurde während Ihrer Prüfung geändert. Die neueste Version ist geladen; bitte erneut prüfen.",
    decisionUnavailable:
      "Entscheidungen sind in dieser Umgebung geschlossen. Eine echte Organisationssitzung schaltet sie frei.",
    reviewer: "Geprüft von",
    fromTo: (from: string, to: string) => `${from} → ${to}`,
    humanOnly: "Menschliche Entscheidung",
    caseTypes: {
      access: "Zugang",
      deposit: "Kaution",
      buyer_suitability: "Käufer-Vorprüfung",
    },
    statuses: {
      pending_review: "Prüfung ausstehend",
      in_review: "In Prüfung",
      approved: "Freigegeben",
      rejected: "Abgelehnt",
      blocked: "Blockiert",
      closed: "Geschlossen",
    },
    risks: { low: "Niedrig", medium: "Mittel", high: "Hoch", critical: "Kritisch" },
    decisions: {
      approve: "Vorprüfung freigeben",
      reject: "Ablehnen",
      request_information: "Information anfordern",
      block: "Blockieren",
      close: "Fall schließen",
      reopen: "Erneut öffnen",
    },
    origins: {
      manual: "Manueller Datensatz",
      client_import: "Kundenimport",
      operational_projection: "Betriebsdatensatz",
      demo_seed: "Demoszenario",
    },
  },
  ru: {
    eyebrow: "Контроль доступа и проверка покупателей",
    title: "Управляйте всеми делами на проверке в одном месте",
    intro:
      "Проверяйте доступ, депозит и предварительную пригодность покупателя в одной очереди. Каждое решение обосновано, принято человеком и доступно для аудита.",
    refresh: "Обновить",
    retry: "Повторить",
    loading: "Загрузка дел…",
    loadError: "Сейчас не удалось загрузить дела.",
    refreshError: "Обновление не удалось; предыдущие данные остаются на экране.",
    lastUpdated: "Последнее обновление",
    justNow: "только что",
    sourceLive: "Данные организации",
    sourceDemo: "Чётко обозначенные демоданные",
    realtime: "Онлайн-обновление подключено",
    checking: "Проверка онлайн-обновления",
    recovery: "Резервное обновление 30 с",
    realtimeError: "Онлайн-связь прервана; обновление продолжается",
    demoTitle: "В этом разделе показаны демозаписи",
    demoBody:
      "Локальная демороль не имитирует полномочия базы данных. Решения доступны только в реальной сессии организации.",
    boundariesTitle: "Границы решения",
    accessBoundary: "Физический доступ",
    accessBlocked:
      "Провайдер карт, ворот или шлагбаума не активирован. Одобрение здесь не открывает физический доступ.",
    accessConfigured:
      "Даже при настроенном провайдере эта проверка не открывает доступ; требуется отдельное полномочное действие.",
    moneyBoundary: "Деньги и депозит",
    moneyBody:
      "Одобрение не выполняет оплату, удержание или возврат. Требуется отдельное согласование бухгалтерии.",
    legalBoundary: "Пригодность покупателя",
    legalBody:
      "Это операционная предварительная проверка, а не юридическая гарантия. При необходимости требуется актуальное заключение специалиста.",
    metrics: {
      total: "Всего дел",
      pending: "Очередь проверки",
      blocked: "Заблокировано",
      critical: "Критический риск",
    },
    filters: "Фильтры",
    search: "Поиск по делу, человеку, объекту или следующему шагу",
    type: "Тип дела",
    status: "Статус",
    risk: "Риск",
    allTypes: "Все типы",
    allStatuses: "Все статусы",
    allRisks: "Все риски",
    clearFilters: "Сбросить фильтры",
    queue: "Очередь проверки",
    queueCount: (count: number) => `${count} дел`,
    noCasesTitle: "Дел пока нет",
    noCasesBody: "Новые записи в доступных вам объектах появятся здесь.",
    noResultsTitle: "Нет дел с такими фильтрами",
    noResultsBody: "Измените поиск или фильтры.",
    selectCase: "Выберите дело, чтобы увидеть подробности и историю.",
    caseDetails: "Подробности дела",
    reference: "Ссылка",
    siteUnit: "Комплекс / объект",
    exposure: "Финансовая сумма",
    origin: "Источник данных",
    updated: "Обновлено",
    blocker: "Текущая блокировка",
    noBlocker: "Блокировка не указана.",
    nextAction: "Рекомендуемый следующий шаг",
    noNextAction: "Новый следующий шаг не указан.",
    evidence: "Информация по делу",
    noEvidence: "Дополнительной структурированной информации нет.",
    history: "История решений",
    historyEmpty: "По этому делу ещё нет решения.",
    version: (version: number) => `Версия ${version}`,
    decisionTitle: "Записать решение человека",
    decisionBody:
      "Меняется только статус проверки. Деньги не переводятся, доступ не открывается, юридическая гарантия не даётся.",
    decision: "Решение",
    rationale: "Обоснование",
    rationaleHint: "Опишите доказательства, результат проверки и следующий шаг минимум в 10 символах.",
    rationalePlaceholder: "Например: Личность проверена; физический доступ остаётся закрыт до отдельного действия.",
    characters: (count: number) => `${count}/1000 символов`,
    submitDecision: "Записать обоснованное решение",
    saving: "Решение сохраняется…",
    saved: "Решение сохранено и добавлено в историю.",
    conflict:
      "Дело изменилось во время проверки. Загружена последняя версия; проверьте его снова.",
    decisionUnavailable:
      "Решения закрыты в этой среде. Они доступны в реальной сессии организации.",
    reviewer: "Проверил",
    fromTo: (from: string, to: string) => `${from} → ${to}`,
    humanOnly: "Решение человека",
    caseTypes: {
      access: "Доступ",
      deposit: "Депозит",
      buyer_suitability: "Проверка покупателя",
    },
    statuses: {
      pending_review: "Ожидает проверки",
      in_review: "На проверке",
      approved: "Одобрено",
      rejected: "Отклонено",
      blocked: "Заблокировано",
      closed: "Закрыто",
    },
    risks: { low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический" },
    decisions: {
      approve: "Одобрить проверку",
      reject: "Отклонить",
      request_information: "Запросить данные",
      block: "Заблокировать",
      close: "Закрыть дело",
      reopen: "Открыть снова",
    },
    origins: {
      manual: "Ручная запись",
      client_import: "Импорт клиента",
      operational_projection: "Операционная запись",
      demo_seed: "Демосценарий",
    },
  },
} as const

const riskOrder: Record<ComplianceRiskLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const factLabels: Record<LocaleKey, Record<string, string>> = {
  tr: {
    credentialType: "Kimlik türü",
    requestedAction: "Talep edilen işlem",
    sourceStatus: "Operasyon durumu",
    providerCode: "Sağlayıcı",
    validFrom: "Geçerlilik başlangıcı",
    validUntil: "Geçerlilik sonu",
    proposedDeductionCents: "Önerilen kesinti",
    refundAmountCents: "İade tutarı",
    evidenceCount: "Kanıt sayısı",
    approvalOwner: "Onay sorumlusu",
    nationality: "Uyruk",
    buyerGoal: "Alıcı hedefi",
    districtCheck: "Bölge kontrolü",
    appraisalRequired: "Ekspertiz gerekli",
    legalDisclaimer: "Hukuki sınır",
  },
  en: {
    credentialType: "Credential type",
    requestedAction: "Requested action",
    sourceStatus: "Operational status",
    providerCode: "Provider",
    validFrom: "Valid from",
    validUntil: "Valid until",
    proposedDeductionCents: "Proposed deduction",
    refundAmountCents: "Refund amount",
    evidenceCount: "Evidence count",
    approvalOwner: "Approval owner",
    nationality: "Nationality",
    buyerGoal: "Buyer goal",
    districtCheck: "District check",
    appraisalRequired: "Appraisal required",
    legalDisclaimer: "Legal boundary",
  },
  de: {
    credentialType: "Nachweisart",
    requestedAction: "Beantragte Aktion",
    sourceStatus: "Betriebsstatus",
    providerCode: "Anbieter",
    validFrom: "Gültig ab",
    validUntil: "Gültig bis",
    proposedDeductionCents: "Vorgeschlagener Abzug",
    refundAmountCents: "Erstattungsbetrag",
    evidenceCount: "Anzahl Nachweise",
    approvalOwner: "Freigabeverantwortung",
    nationality: "Staatsangehörigkeit",
    buyerGoal: "Käuferziel",
    districtCheck: "Gebietsprüfung",
    appraisalRequired: "Gutachten erforderlich",
    legalDisclaimer: "Rechtliche Grenze",
  },
  ru: {
    credentialType: "Тип пропуска",
    requestedAction: "Запрошенное действие",
    sourceStatus: "Операционный статус",
    providerCode: "Провайдер",
    validFrom: "Действует с",
    validUntil: "Действует до",
    proposedDeductionCents: "Предлагаемое удержание",
    refundAmountCents: "Сумма возврата",
    evidenceCount: "Количество доказательств",
    approvalOwner: "Ответственный за согласование",
    nationality: "Гражданство",
    buyerGoal: "Цель покупателя",
    districtCheck: "Проверка района",
    appraisalRequired: "Нужна оценка",
    legalDisclaimer: "Юридическая граница",
  },
}

function localeKey(locale: string): LocaleKey {
  return locale === "tr" || locale === "de" || locale === "ru" ? locale : "en"
}

function isCockpitData(value: unknown): value is ComplianceCockpitData {
  if (!value || typeof value !== "object") return false
  const record = value as Partial<ComplianceCockpitData>
  return (
    (record.source === "supabase-live" || record.source === "local-demo-contract") &&
    typeof record.generatedAt === "string" &&
    typeof record.mutationAvailable === "boolean" &&
    Array.isArray(record.cases) &&
    Array.isArray(record.recentDecisions) &&
    Boolean(record.summary) &&
    Boolean(record.providerBoundary)
  )
}

function hasRealtimeEnvironment() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_ENABLE_REALTIME !== "false"
  )
}

function statusVariant(status: ComplianceCaseStatus) {
  if (status === "approved") return "success" as const
  if (status === "pending_review" || status === "in_review") return "warning" as const
  if (status === "rejected" || status === "blocked") return "danger" as const
  return "neutral" as const
}

function riskVariant(risk: ComplianceRiskLevel) {
  if (risk === "critical" || risk === "high") return "danger" as const
  if (risk === "medium") return "warning" as const
  return "success" as const
}

function decisionsFor(status: ComplianceCaseStatus): ComplianceDecision[] {
  if (status === "pending_review" || status === "in_review") {
    return ["approve", "request_information", "block", "reject"]
  }
  if (status === "closed") return ["reopen"]
  return ["reopen", "close"]
}

function formatDate(value: string, locale: LocaleKey) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "—"
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(parsed)
}

function formatMoney(caseItem: ComplianceCase, locale: LocaleKey) {
  if (caseItem.financialExposureCents === null || !caseItem.currency) return "—"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: caseItem.currency,
    maximumFractionDigits: 2,
  }).format(caseItem.financialExposureCents / 100)
}

function formatFact(value: unknown, locale: LocaleKey) {
  if (typeof value === "boolean") {
    if (locale === "tr") return value ? "Evet" : "Hayır"
    if (locale === "de") return value ? "Ja" : "Nein"
    if (locale === "ru") return value ? "Да" : "Нет"
    return value ? "Yes" : "No"
  }
  if (typeof value === "string" || typeof value === "number") return String(value)
  return JSON.stringify(value)
}

function readApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return { message: fallback, code: "" }
  const record = payload as Record<string, unknown>
  return {
    message: typeof record.error === "string" ? record.error : fallback,
    code: typeof record.code === "string" ? record.code : "",
  }
}

export function ComplianceLiveCockpit() {
  const locale = localeKey(useLocale())
  const t = copy[locale]
  const user = useUser()
  const [data, setData] = useState<ComplianceCockpitData | null>(null)
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [realtimeState, setRealtimeState] = useState<RealtimeState>("checking")
  const [error, setError] = useState<string | null>(null)
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<CaseTypeFilter>("all")
  const [statusFilter, setStatusFilter] = useState<CaseStatusFilter>("all")
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all")
  const [decision, setDecision] = useState<ComplianceDecision>("approve")
  const [rationale, setRationale] = useState("")
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const dataRef = useRef<ComplianceCockpitData | null>(null)
  const operationKeys = useRef(new Map<string, string>())

  const load = useCallback(async (background = false) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    if (!background) setLoadState("loading")
    setError(null)
    if (background) setRefreshWarning(null)

    try {
      const response = await fetch("/api/site-management/compliance-cases?limit=250", {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
      const payload: unknown = await response.json()
      if (!response.ok || !isCockpitData(payload)) {
        throw new Error(readApiError(payload, t.loadError).message)
      }
      dataRef.current = payload
      setData(payload)
      setSelectedId((current) =>
        current && payload.cases.some((item) => item.id === current)
          ? current
          : payload.cases[0]?.id ?? null
      )
      setLoadState("ready")
      if (payload.source !== "supabase-live" || !hasRealtimeEnvironment()) {
        setRealtimeState("recovery")
      }
    } catch (loadError) {
      if (controller.signal.aborted) return
      const message = loadError instanceof Error ? loadError.message : t.loadError
      if (background && dataRef.current) {
        setRefreshWarning(t.refreshError)
        return
      }
      setError(message)
      setLoadState("error")
    }
  }, [t.loadError, t.refreshError])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0)
    const poll = window.setInterval(() => void load(true), 30_000)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void load(true)
    }
    const handleChange = () => void load(true)
    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("site-management:changed", handleChange)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(poll)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("site-management:changed", handleChange)
      abortRef.current?.abort()
    }
  }, [load])

  useEffect(() => {
    if (data?.source !== "supabase-live" || !hasRealtimeEnvironment()) {
      return
    }

    const supabase = createClient()
    let refreshTimer: number | null = null
    let channel = supabase.channel("compliance-cockpit")
    const invalidate = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => void load(true), 180)
    }
    channel = channel
      .on("postgres_changes", { event: "*", schema: "public", table: "compliance_cases" }, invalidate)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "compliance_case_decisions" }, invalidate)
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setRealtimeState("connected")
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setRealtimeState("error")
      }
    })

    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [data?.source, load])

  const filteredCases = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale)
    return [...(data?.cases ?? [])]
      .filter((item) => typeFilter === "all" || item.caseType === typeFilter)
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => riskFilter === "all" || item.riskLevel === riskFilter)
      .filter((item) => {
        if (!normalized) return true
        return [
          item.caseNumber,
          item.subjectName,
          item.subjectReference,
          item.siteName,
          item.siteCode,
          item.unitLabel,
          item.blocker,
          item.nextAction,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(normalized)
      })
      .sort((left, right) => {
        const riskDifference = riskOrder[left.riskLevel] - riskOrder[right.riskLevel]
        if (riskDifference) return riskDifference
        return Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
      })
  }, [data?.cases, locale, query, riskFilter, statusFilter, typeFilter])

  const selectedCase = useMemo(
    () => data?.cases.find((item) => item.id === selectedId) ?? null,
    [data?.cases, selectedId]
  )
  const selectedHistory = useMemo(
    () =>
      (data?.recentDecisions ?? [])
        .filter((item) => item.caseId === selectedId)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    [data?.recentDecisions, selectedId]
  )
  const allowedDecisions = selectedCase ? decisionsFor(selectedCase.status) : []
  const effectiveDecision = allowedDecisions.includes(decision)
    ? decision
    : allowedDecisions[0]
  const canDecide =
    Boolean(selectedCase && data?.mutationAvailable) &&
    (user.role === "admin" || user.role === "manager")

  function selectCase(caseId: string) {
    setSelectedId(caseId)
    setDecision("approve")
    setRationale("")
    setNotice(null)
    setDecisionError(null)
  }

  function clearFilters() {
    setQuery("")
    setTypeFilter("all")
    setStatusFilter("all")
    setRiskFilter("all")
  }

  async function submitDecision() {
    if (!selectedCase || !canDecide || !effectiveDecision || rationale.trim().length < 10) return
    const trimmedRationale = rationale.trim()
    const fingerprint = JSON.stringify({
      caseId: selectedCase.id,
      expectedVersion: selectedCase.version,
      decision: effectiveDecision,
      rationale: trimmedRationale,
    })
    const idempotencyKey =
      operationKeys.current.get(fingerprint) ?? `compliance-ui:${crypto.randomUUID()}`
    operationKeys.current.set(fingerprint, idempotencyKey)
    setSaving(true)
    setNotice(null)
    setDecisionError(null)

    try {
      const response = await fetch("/api/site-management/compliance-cases", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          "If-Match": `"${selectedCase.version}"`,
        },
        body: JSON.stringify({
          caseId: selectedCase.id,
          expectedVersion: selectedCase.version,
          decision: effectiveDecision,
          rationale: trimmedRationale,
        }),
      })
      const payload: unknown = await response.json()
      if (!response.ok) {
        const parsed = readApiError(payload, t.loadError)
        if (response.status === 409 || parsed.code === "COMPLIANCE_VERSION_CONFLICT") {
          await load(true)
          setDecisionError(t.conflict)
          return
        }
        throw new Error(parsed.message)
      }
      const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
      if (!isCockpitData(record.data)) throw new Error(t.loadError)
      dataRef.current = record.data
      setData(record.data)
      setRationale("")
      setNotice(t.saved)
      operationKeys.current.delete(fingerprint)
      window.dispatchEvent(new CustomEvent("site-management:changed"))
    } catch (submitError) {
      setDecisionError(submitError instanceof Error ? submitError.message : t.loadError)
    } finally {
      setSaving(false)
    }
  }

  if (loadState === "loading" && !data) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-12" aria-busy="true">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm font-semibold text-muted-foreground shadow-sm">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          {t.loading}
        </div>
      </div>
    )
  }

  if (loadState === "error" && !data) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-12">
        <section className="max-w-lg rounded-3xl border border-rose-500/20 bg-card p-7 text-center shadow-sm" role="alert">
          <AlertCircle className="mx-auto size-9 text-rose-600" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-black text-foreground">{t.loadError}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <RefreshCw className="size-4" aria-hidden="true" />
            {t.retry}
          </button>
        </section>
      </div>
    )
  }

  if (!data) return null

  const realtimeLabel =
    realtimeState === "connected"
      ? t.realtime
      : realtimeState === "checking"
        ? t.checking
        : realtimeState === "error"
          ? t.realtimeError
          : t.recovery
  const facts = selectedCase
    ? Object.entries(selectedCase.facts).filter(([key]) => key !== "demo")
    : []

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 px-3 pb-12 pt-4 sm:px-5 lg:px-7" data-testid="compliance-live-cockpit">
      <header className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
        <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-9 lg:py-8">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-primary">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {t.eyebrow}
            </div>
            <h1 className="text-balance text-3xl font-black tracking-tight text-foreground sm:text-4xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{t.intro}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:max-w-sm lg:justify-end">
            <StatusBadge variant={data.source === "supabase-live" ? "success" : "warning"}>
              {data.source === "supabase-live" ? t.sourceLive : t.sourceDemo}
            </StatusBadge>
            <StatusBadge variant={realtimeState === "connected" ? "success" : realtimeState === "error" ? "danger" : "neutral"}>
              <span className="inline-flex items-center gap-1.5">
                {realtimeState === "connected" ? <Wifi className="size-3" aria-hidden="true" /> : <WifiOff className="size-3" aria-hidden="true" />}
                {realtimeLabel}
              </span>
            </StatusBadge>
            <span className="text-xs text-muted-foreground">
              {t.lastUpdated}: <time dateTime={data.generatedAt}>{formatDate(data.generatedAt, locale)}</time>
            </span>
            <button type="button" onClick={() => void load(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label={t.refresh}>
              <RefreshCw className={cn("size-4", loadState === "loading" && "animate-spin")} aria-hidden="true" />
              {t.refresh}
            </button>
          </div>
        </div>
        <div className="h-1 bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--primary)/0.18),transparent)]" />
      </header>

      {refreshWarning ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-900 dark:text-amber-200" role="status">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {refreshWarning}
        </div>
      ) : null}

      {data.source === "local-demo-contract" ? (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-4" aria-labelledby="compliance-demo-title">
          <Info className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          <div>
            <h2 id="compliance-demo-title" className="text-sm font-black text-foreground">{t.demoTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.demoBody}</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-[24px] border border-border bg-card p-4 shadow-sm sm:p-5" aria-labelledby="decision-boundaries-title">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="size-5 text-primary" aria-hidden="true" />
          <h2 id="decision-boundaries-title" className="text-sm font-black text-foreground">{t.boundariesTitle}</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {[
            { icon: UserCheck, title: t.accessBoundary, body: data.providerBoundary.accessExecution === "configured" ? t.accessConfigured : t.accessBlocked },
            { icon: Banknote, title: t.moneyBoundary, body: t.moneyBody },
            { icon: Scale, title: t.legalBoundary, body: t.legalBody },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-muted/35 p-4">
              <item.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-black text-foreground">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t.metrics.total}>
        {[
          { label: t.metrics.total, value: data.summary.total, icon: FileSearch, tone: "text-primary bg-primary/10" },
          { label: t.metrics.pending, value: data.summary.pending, icon: Clock3, tone: "text-amber-700 bg-amber-500/10 dark:text-amber-300" },
          { label: t.metrics.blocked, value: data.summary.blocked, icon: ShieldAlert, tone: "text-rose-700 bg-rose-500/10 dark:text-rose-300" },
          { label: t.metrics.critical, value: data.summary.critical, icon: AlertCircle, tone: "text-rose-700 bg-rose-500/10 dark:text-rose-300" },
        ].map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className={cn("flex size-9 items-center justify-center rounded-xl", metric.tone)}>
              <metric.icon className="size-4" aria-hidden="true" />
            </div>
            <p className="mt-4 text-3xl font-black tabular-nums text-foreground">{metric.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{metric.label}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[24px] border border-border bg-card p-4 shadow-sm sm:p-5" aria-labelledby="compliance-filters-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-primary" aria-hidden="true" />
            <h2 id="compliance-filters-title" className="text-sm font-black text-foreground">{t.filters}</h2>
          </div>
          <button type="button" onClick={clearFilters} className="min-h-10 rounded-lg px-3 text-xs font-bold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {t.clearFilters}
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,1.7fr)_repeat(3,minmax(9rem,1fr))]">
          <label className="space-y-1.5 text-xs font-bold text-muted-foreground">
            <span>{t.search}</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className="min-h-11 w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15" />
            </span>
          </label>
          <FilterSelect label={t.type} value={typeFilter} onChange={(value) => setTypeFilter(value as CaseTypeFilter)} options={[{ value: "all", label: t.allTypes }, ...Object.entries(t.caseTypes).map(([value, label]) => ({ value, label }))]} />
          <FilterSelect label={t.status} value={statusFilter} onChange={(value) => setStatusFilter(value as CaseStatusFilter)} options={[{ value: "all", label: t.allStatuses }, ...Object.entries(t.statuses).map(([value, label]) => ({ value, label }))]} />
          <FilterSelect label={t.risk} value={riskFilter} onChange={(value) => setRiskFilter(value as RiskFilter)} options={[{ value: "all", label: t.allRisks }, ...Object.entries(t.risks).map(([value, label]) => ({ value, label }))]} />
        </div>
      </section>

      {data.cases.length === 0 ? (
        <EmptyState icon={BadgeCheck} title={t.noCasesTitle} body={t.noCasesBody} />
      ) : filteredCases.length === 0 ? (
        <EmptyState icon={Search} title={t.noResultsTitle} body={t.noResultsBody} action={<button type="button" onClick={clearFilters} className="mt-4 min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{t.clearFilters}</button>} />
      ) : (
        <section className="grid min-h-[680px] overflow-hidden rounded-[26px] border border-border bg-card shadow-sm xl:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.6fr)]" aria-label={t.queue}>
          <div className="border-b border-border bg-muted/20 xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-black text-foreground">{t.queue}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.queueCount(filteredCases.length)}</p>
              </div>
              <History className="size-5 text-primary" aria-hidden="true" />
            </div>
            <ul className="max-h-[680px] overflow-y-auto p-2" aria-label={t.queue}>
              {filteredCases.map((item) => (
                <li key={item.id}>
                <button type="button" onClick={() => selectCase(item.id)} aria-current={selectedId === item.id ? "true" : undefined} className={cn("mb-1 w-full rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", selectedId === item.id ? "border-primary/35 bg-primary/7 shadow-sm" : "border-transparent hover:border-border hover:bg-background")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-primary">{item.caseNumber}</p>
                      <p className="mt-1 truncate text-sm font-black text-foreground">{item.subjectName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{t.caseTypes[item.caseType]} · {item.unitLabel ?? item.subjectReference ?? item.siteName}</p>
                    </div>
                    <ChevronRight className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition", selectedId === item.id && "translate-x-0.5 text-primary")} aria-hidden="true" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <StatusBadge variant={riskVariant(item.riskLevel)}>{t.risks[item.riskLevel]}</StatusBadge>
                    <StatusBadge variant={statusVariant(item.status)}>{t.statuses[item.status]}</StatusBadge>
                  </div>
                </button>
                </li>
              ))}
            </ul>
          </div>

          {selectedCase ? (
            <div className="min-w-0 p-4 sm:p-6 lg:p-7" data-testid="compliance-case-detail">
              <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge variant={riskVariant(selectedCase.riskLevel)}>{t.risks[selectedCase.riskLevel]}</StatusBadge>
                    <StatusBadge variant={statusVariant(selectedCase.status)}>{t.statuses[selectedCase.status]}</StatusBadge>
                    <StatusBadge variant="neutral">{t.version(selectedCase.version)}</StatusBadge>
                  </div>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-primary">{selectedCase.caseNumber}</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">{selectedCase.subjectName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t.caseTypes[selectedCase.caseType]}</p>
                </div>
                <StatusBadge variant={selectedCase.dataOrigin === "demo_seed" ? "warning" : "info"}>{t.origins[selectedCase.dataOrigin]}</StatusBadge>
              </div>

              <div className="grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-4">
                <DetailDatum label={t.reference} value={selectedCase.subjectReference ?? selectedCase.caseNumber} />
                <DetailDatum label={t.siteUnit} value={`${selectedCase.siteName}${selectedCase.unitLabel ? ` · ${selectedCase.unitLabel}` : ""}`} />
                <DetailDatum label={t.exposure} value={formatMoney(selectedCase, locale)} />
                <DetailDatum label={t.updated} value={formatDate(selectedCase.updatedAt, locale)} />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <article className={cn("rounded-2xl border p-4", selectedCase.blocker ? "border-rose-500/25 bg-rose-500/7" : "border-emerald-500/20 bg-emerald-500/7")}>
                  <div className="flex items-center gap-2">
                    {selectedCase.blocker ? <ShieldAlert className="size-4 text-rose-600" aria-hidden="true" /> : <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />}
                    <h3 className="text-sm font-black text-foreground">{t.blocker}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedCase.blocker ?? t.noBlocker}</p>
                </article>
                <article className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="size-4 text-primary" aria-hidden="true" />
                    <h3 className="text-sm font-black text-foreground">{t.nextAction}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedCase.nextAction ?? t.noNextAction}</p>
                </article>
              </div>

              <section className="mt-5 rounded-2xl border border-border p-4" aria-labelledby="case-information-title">
                <h3 id="case-information-title" className="text-sm font-black text-foreground">{t.evidence}</h3>
                {facts.length ? (
                  <dl className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
                    {facts.map(([key, value]) => (
                      <div key={key} className="border-t border-border/70 pt-3 first:border-t-0 first:pt-0 sm:first:border-t sm:first:pt-3">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{factLabels[locale][key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2")}</dt>
                        <dd className="mt-1 break-words text-sm font-semibold text-foreground">{formatFact(value, locale)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">{t.noEvidence}</p>
                )}
              </section>

              <section className="mt-5 rounded-2xl border border-border p-4" aria-labelledby="decision-history-title">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-primary" aria-hidden="true" />
                  <h3 id="decision-history-title" className="text-sm font-black text-foreground">{t.history}</h3>
                </div>
                {selectedHistory.length ? (
                  <ol className="mt-4 space-y-3">
                    {selectedHistory.map((event) => <HistoryItem key={event.id} event={event} locale={locale} />)}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">{t.historyEmpty}</p>
                )}
              </section>

              <section className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5" aria-labelledby="human-decision-title">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <UserCheck className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 id="human-decision-title" className="text-sm font-black text-foreground">{t.decisionTitle}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.decisionBody}</p>
                  </div>
                </div>

                {canDecide ? (
                  <div className="mt-5 grid gap-4">
                    <div className="space-y-1.5 text-xs font-bold text-muted-foreground">
                      <label htmlFor="compliance-decision-select">{t.decision}</label>
                      <select id="compliance-decision-select" value={effectiveDecision} onChange={(event) => setDecision(event.target.value as ComplianceDecision)} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
                        {allowedDecisions.map((item) => <option key={item} value={item}>{t.decisions[item]}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5 text-xs font-bold text-muted-foreground">
                      <label htmlFor="compliance-rationale">{t.rationale}</label>
                      <textarea id="compliance-rationale" value={rationale} onChange={(event) => setRationale(event.target.value.slice(0, 1000))} placeholder={t.rationalePlaceholder} aria-describedby="compliance-rationale-hint compliance-rationale-count" rows={4} className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium leading-6 text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15" />
                    </div>
                    <div className="-mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                      <p id="compliance-rationale-hint">{t.rationaleHint}</p>
                      <p id="compliance-rationale-count" className="tabular-nums">{t.characters(rationale.length)}</p>
                    </div>
                    <div aria-live="polite">
                      {notice ? <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{notice}</p> : null}
                      {decisionError ? <p className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300" role="alert">{decisionError}</p> : null}
                    </div>
                    <button type="button" onClick={() => void submitDecision()} disabled={saving || rationale.trim().length < 10} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-fit">
                      {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <BadgeCheck className="size-4" aria-hidden="true" />}
                      {saving ? t.saving : t.submitDecision}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                    <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {t.decisionUnavailable}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center p-8 text-center text-sm text-muted-foreground">{t.selectCase}</div>
          )}
        </section>
      )}
    </div>
  )

  function HistoryItem({ event, locale: itemLocale }: { event: ComplianceDecisionEvent; locale: LocaleKey }) {
    return (
      <li className="relative rounded-xl border border-border bg-muted/25 px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant="info">{t.decisions[event.decision]}</StatusBadge>
            <span className="text-xs font-semibold text-muted-foreground">{t.fromTo(t.statuses[event.fromStatus], t.statuses[event.toStatus])}</span>
          </div>
          <time dateTime={event.createdAt} className="text-xs text-muted-foreground">{formatDate(event.createdAt, itemLocale)}</time>
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground">{event.rationale}</p>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t.reviewer}: {event.actorRole === "admin" ? "Admin" : "Manager"} · {t.humanOnly}</p>
      </li>
    )
  }
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1.5 text-xs font-bold text-muted-foreground">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function DetailDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/25 px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-foreground">{value}</p>
    </div>
  )
}

function EmptyState({ icon: Icon, title, body, action }: { icon: typeof Search; title: string; body: string; action?: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-dashed border-border bg-card px-5 py-14 text-center shadow-sm">
      <Icon className="mx-auto size-8 text-primary" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-black text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{body}</p>
      {action}
    </section>
  )
}
