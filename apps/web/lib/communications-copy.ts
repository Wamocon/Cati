import type { CommunicationLocale } from "@/lib/communications-repository"

export interface CommunicationsCopy {
  title: string
  intro: string
  portalLive: string
  portalUnavailable: string
  externalNotConnected: string
  unavailableTitle: string
  unavailableBody: string
  loadError: string
  refresh: string
  threads: string
  delivery: string
  templates: string
  unread: string
  failed: string
  noThreads: string
  noMessages: string
  message: string
  sendPortalReply: string
  saving: string
  replyError: string
  attachment: string
  noDeliveries: string
  deadLetter: string
  noTemplates: string
  variants: string
  newThread: string
  firstThreadTitle: string
  firstThreadBody: string
  startFirstThread: string
  viewOnlyEmpty: string
  noAuthorizedSites: string
  site: string
  selectSite: string
  unitOptional: string
  siteWide: string
  subject: string
  subjectPlaceholder: string
  scope: string
  priority: string
  conversationLanguage: string
  participants: string
  participantsHint: string
  noEligibleParticipants: string
  scopeOperational: string
  scopeFinance: string
  scopeResident: string
  scopeAnnouncement: string
  priorityLow: string
  priorityMedium: string
  priorityHigh: string
  priorityUrgent: string
  cancel: string
  createThread: string
  creatingThread: string
  threadCreateError: string
  threadCreateSuccess: string
}

const copy: Record<CommunicationLocale, CommunicationsCopy> = {
  tr: {
    title: "İletişim merkezi",
    intro: "Yetkili portal görüşmeleri, çok dilli şablonlar ve doğrulanabilir teslim durumları.",
    portalLive: "Portal canlı",
    portalUnavailable: "Portal hazır değil",
    externalNotConnected: "Harici sağlayıcılar bağlı değil",
    unavailableTitle: "Gerçek oturum gerekli",
    unavailableBody: "Kalıcı portal görüşmeleri gerçek ve doğrulanmış bir oturum gerektirir.",
    loadError: "İletişim çalışma alanı yüklenemedi. Canlı veri gösterilmiyor.",
    refresh: "Yenile",
    threads: "Görüşmeler",
    delivery: "Teslimat",
    templates: "Şablonlar",
    unread: "Okunmamış",
    failed: "Başarısız",
    noThreads: "Yetki kapsamınızda görüşme yok.",
    noMessages: "Bu görüşmede henüz mesaj yok.",
    message: "Mesaj",
    sendPortalReply: "Portal yanıtı gönder",
    saving: "Kaydediliyor…",
    replyError: "Yanıt kaydedilemedi.",
    attachment: "Belge eki",
    noDeliveries: "Teslimat kaydı yok.",
    deadLetter: "Teslim edilemeyen",
    noTemplates: "Şablon yok.",
    variants: "Dil varyantları",
    newThread: "Yeni portal görüşmesi",
    firstThreadTitle: "İlk portal görüşmesini başlatın",
    firstThreadBody: "Yetkili tesisi, varsa bağımsız bölümü ve en az bir uygun katılımcıyı seçin. Görüşmeyi yalnızca seçtiğiniz kişiler görür.",
    startFirstThread: "İlk görüşmeyi başlat",
    viewOnlyEmpty: "Tesis ekibiniz işlem gerektiğinde bir portal görüşmesi başlatır. Yetkili olduğunuz görüşmeler burada görünür.",
    noAuthorizedSites: "Görüşme başlatmak için etkin bir tesis yetkisi gereklidir.",
    site: "Tesis",
    selectSite: "Tesis seçin",
    unitOptional: "Bağımsız bölüm (isteğe bağlı)",
    siteWide: "Tesis geneli",
    subject: "Konu",
    subjectPlaceholder: "Örn. taşınma günü koordinasyonu",
    scope: "Kategori",
    priority: "Öncelik",
    conversationLanguage: "Görüşme dili",
    participants: "Katılımcılar",
    participantsHint: "Yalnızca seçilen tesis veya bağımsız bölüm için yetkili kişiler gösterilir.",
    noEligibleParticipants: "Bu tesis, bağımsız bölüm ve kategoriyle eşleşen katılımcı yok. Farklı bir kategori deneyin veya kitleyi genişletmek için bağımsız bölüm seçimini kaldırın.",
    scopeOperational: "Operasyon",
    scopeFinance: "Finans",
    scopeResident: "Sakin hizmetleri",
    scopeAnnouncement: "Duyuru",
    priorityLow: "Düşük",
    priorityMedium: "Orta",
    priorityHigh: "Yüksek",
    priorityUrgent: "Acil",
    cancel: "İptal",
    createThread: "Portal görüşmesini oluştur",
    creatingThread: "Görüşme oluşturuluyor…",
    threadCreateError: "Görüşme oluşturulamadı. Kapsamı ve katılımcıları kontrol edip yeniden deneyin.",
    threadCreateSuccess: "Portal görüşmesi oluşturuldu.",
  },
  en: {
    title: "Communication center",
    intro: "Authorized portal conversations, multilingual templates, and verifiable delivery states.",
    portalLive: "Portal live",
    portalUnavailable: "Portal not ready",
    externalNotConnected: "External providers not connected",
    unavailableTitle: "Real sign-in required",
    unavailableBody: "Persistent portal conversations require a real, authenticated session.",
    loadError: "The communication workspace could not be loaded. No live data is shown.",
    refresh: "Refresh",
    threads: "Threads",
    delivery: "Delivery",
    templates: "Templates",
    unread: "Unread",
    failed: "Failed",
    noThreads: "No conversations are available in your scope.",
    noMessages: "This conversation has no messages yet.",
    message: "Message",
    sendPortalReply: "Send portal reply",
    saving: "Saving…",
    replyError: "The reply could not be saved.",
    attachment: "Document attachment",
    noDeliveries: "No delivery records are available.",
    deadLetter: "Undeliverable",
    noTemplates: "No templates are available.",
    variants: "Language variants",
    newThread: "New portal thread",
    firstThreadTitle: "Start the first portal thread",
    firstThreadBody: "Choose an authorized site, an optional unit, and at least one eligible participant. Only the people you choose can see the conversation.",
    startFirstThread: "Start first thread",
    viewOnlyEmpty: "Your property team starts a portal conversation when action is needed. Conversations you are authorized to see will appear here.",
    noAuthorizedSites: "An active site authorization is required before a thread can be started.",
    site: "Site",
    selectSite: "Select a site",
    unitOptional: "Unit (optional)",
    siteWide: "Site-wide",
    subject: "Subject",
    subjectPlaceholder: "For example, move-in day coordination",
    scope: "Category",
    priority: "Priority",
    conversationLanguage: "Conversation language",
    participants: "Participants",
    participantsHint: "Only people authorized for the selected site or unit are shown.",
    noEligibleParticipants: "No participant matches this site, unit, and category yet. Try a different category or clear the unit to widen the audience.",
    scopeOperational: "Operations",
    scopeFinance: "Finance",
    scopeResident: "Resident service",
    scopeAnnouncement: "Announcement",
    priorityLow: "Low",
    priorityMedium: "Medium",
    priorityHigh: "High",
    priorityUrgent: "Urgent",
    cancel: "Cancel",
    createThread: "Create portal thread",
    creatingThread: "Creating thread…",
    threadCreateError: "The thread could not be created. Check its scope and participants, then try again.",
    threadCreateSuccess: "Portal thread created.",
  },
  de: {
    title: "Kommunikationszentrale",
    intro: "Autorisierte Portalgespräche, mehrsprachige Vorlagen und überprüfbare Zustellstatus.",
    portalLive: "Portal aktiv",
    portalUnavailable: "Portal nicht bereit",
    externalNotConnected: "Externe Anbieter nicht verbunden",
    unavailableTitle: "Echte Anmeldung erforderlich",
    unavailableBody: "Dauerhafte Portalgespräche erfordern eine echte, authentifizierte Sitzung.",
    loadError: "Die Kommunikationsdaten konnten nicht geladen werden. Es werden keine Live-Daten angezeigt.",
    refresh: "Aktualisieren",
    threads: "Gespräche",
    delivery: "Zustellung",
    templates: "Vorlagen",
    unread: "Ungelesen",
    failed: "Fehlgeschlagen",
    noThreads: "In Ihrem Berechtigungsumfang sind keine Gespräche vorhanden.",
    noMessages: "Dieses Gespräch enthält noch keine Nachrichten.",
    message: "Nachricht",
    sendPortalReply: "Portalantwort speichern",
    saving: "Wird gespeichert…",
    replyError: "Die Antwort konnte nicht gespeichert werden.",
    attachment: "Dokumentanhang",
    noDeliveries: "Keine Zustellnachweise vorhanden.",
    deadLetter: "Unzustellbar",
    noTemplates: "Keine Vorlagen vorhanden.",
    variants: "Sprachvarianten",
    newThread: "Neues Portalgespräch",
    firstThreadTitle: "Erstes Portalgespräch starten",
    firstThreadBody: "Wählen Sie eine berechtigte Anlage, optional eine Einheit und mindestens einen zulässigen Teilnehmer. Nur die ausgewählten Personen sehen das Gespräch.",
    startFirstThread: "Erstes Gespräch starten",
    viewOnlyEmpty: "Ihr Objektteam startet bei Handlungsbedarf ein Portalgespräch. Für Sie freigegebene Gespräche erscheinen hier.",
    noAuthorizedSites: "Zum Starten eines Gesprächs ist eine aktive Anlagenberechtigung erforderlich.",
    site: "Anlage",
    selectSite: "Anlage auswählen",
    unitOptional: "Einheit (optional)",
    siteWide: "Gesamte Anlage",
    subject: "Betreff",
    subjectPlaceholder: "Zum Beispiel Koordination des Einzugstags",
    scope: "Kategorie",
    priority: "Priorität",
    conversationLanguage: "Gesprächssprache",
    participants: "Teilnehmer",
    participantsHint: "Es werden nur Personen angezeigt, die für die gewählte Anlage oder Einheit berechtigt sind.",
    noEligibleParticipants: "Kein Teilnehmer passt zu Anlage, Einheit und Kategorie. Wählen Sie eine andere Kategorie oder entfernen Sie die Einheit, um den Kreis zu erweitern.",
    scopeOperational: "Betrieb",
    scopeFinance: "Finanzen",
    scopeResident: "Bewohnerservice",
    scopeAnnouncement: "Ankündigung",
    priorityLow: "Niedrig",
    priorityMedium: "Mittel",
    priorityHigh: "Hoch",
    priorityUrgent: "Dringend",
    cancel: "Abbrechen",
    createThread: "Portalgespräch erstellen",
    creatingThread: "Gespräch wird erstellt…",
    threadCreateError: "Das Gespräch konnte nicht erstellt werden. Prüfen Sie Bereich und Teilnehmer und versuchen Sie es erneut.",
    threadCreateSuccess: "Portalgespräch erstellt.",
  },
  ru: {
    title: "Центр коммуникаций",
    intro: "Авторизованные диалоги портала, многоязычные шаблоны и проверяемые статусы доставки.",
    portalLive: "Портал активен",
    portalUnavailable: "Портал не готов",
    externalNotConnected: "Внешние провайдеры не подключены",
    unavailableTitle: "Требуется реальный вход",
    unavailableBody: "Постоянные диалоги портала требуют реального, проверенного входа.",
    loadError: "Не удалось загрузить рабочую область. Актуальные данные не показаны.",
    refresh: "Обновить",
    threads: "Диалоги",
    delivery: "Доставка",
    templates: "Шаблоны",
    unread: "Непрочитанные",
    failed: "Ошибка",
    noThreads: "В вашем контуре доступа нет диалогов.",
    noMessages: "В этом диалоге пока нет сообщений.",
    message: "Сообщение",
    sendPortalReply: "Сохранить ответ в портале",
    saving: "Сохранение…",
    replyError: "Не удалось сохранить ответ.",
    attachment: "Вложенный документ",
    noDeliveries: "Данных о доставке нет.",
    deadLetter: "Недоставленные",
    noTemplates: "Шаблонов нет.",
    variants: "Языковые варианты",
    newThread: "Новый диалог портала",
    firstThreadTitle: "Начать первый диалог портала",
    firstThreadBody: "Выберите доступный объект, при необходимости помещение и хотя бы одного допустимого участника. Диалог увидят только выбранные вами люди.",
    startFirstThread: "Начать первый диалог",
    viewOnlyEmpty: "Команда объекта начинает диалог портала, когда требуется действие. Доступные вам диалоги появятся здесь.",
    noAuthorizedSites: "Для создания диалога требуется действующий доступ к объекту.",
    site: "Объект",
    selectSite: "Выберите объект",
    unitOptional: "Помещение (необязательно)",
    siteWide: "Весь объект",
    subject: "Тема",
    subjectPlaceholder: "Например, координация дня заселения",
    scope: "Категория",
    priority: "Приоритет",
    conversationLanguage: "Язык диалога",
    participants: "Участники",
    participantsHint: "Показаны только лица, имеющие доступ к выбранному объекту или помещению.",
    noEligibleParticipants: "Нет участников для этого объекта, помещения и категории. Выберите другую категорию или очистите помещение, чтобы расширить круг.",
    scopeOperational: "Эксплуатация",
    scopeFinance: "Финансы",
    scopeResident: "Работа с жильцами",
    scopeAnnouncement: "Объявление",
    priorityLow: "Низкий",
    priorityMedium: "Средний",
    priorityHigh: "Высокий",
    priorityUrgent: "Срочный",
    cancel: "Отмена",
    createThread: "Создать диалог портала",
    creatingThread: "Диалог создаётся…",
    threadCreateError: "Не удалось создать диалог. Проверьте область и участников и повторите попытку.",
    threadCreateSuccess: "Диалог портала создан.",
  },
}

export function getCommunicationsCopy(value: string): CommunicationsCopy {
  const locale: CommunicationLocale =
    value === "en" || value === "de" || value === "ru" ? value : "tr"
  return copy[locale]
}
