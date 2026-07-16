export type ReportingLocale = "tr" | "en" | "de" | "ru"
export type ReportingTypeKey = "finance_ledger" | "unit_inventory" | "ticket_operations" | "compliance_cases"

export interface ReportingCopy {
  kicker: string
  title: string
  intro: string
  internalLive: string
  internalUnavailable: string
  internalEvidence: string
  providerReady: string
  bulkExport: string
  externalStorage: string
  providerBoundary: string
  refresh: string
  unavailableTitle: string
  realAuthUnavailable: string
  companyUnavailable: string
  unavailableNote: string
  requestTitle: string
  requestIntro: string
  reportType: string
  siteScope: string
  allAssignedSites: string
  allAssignedSitesHint: string
  clearSites: string
  filters: string
  from: string
  to: string
  dateHint: string
  status: string
  allStatuses: string
  generate: string
  generating: string
  requestSuccess: string
  historyTitle: string
  historyIntro: string
  requests: string
  artifacts: string
  pendingReview: string
  readyArtifacts: string
  noRequests: string
  noArtifacts: string
  created: string
  snapshot: string
  rows: string
  selectedSites: string
  allScope: string
  version: string
  failure: string
  download: string
  downloadIntegrity: string
  sourceTables: string
  limitations: string
  metrics: string
  commentaryTitle: string
  groundedLabel: string
  reviewReason: string
  reasonPlaceholder: string
  reasonHint: string
  approve: string
  reject: string
  loading: string
  loadError: string
  mutationError: string
  reviewError: string
  validationError: string
  lastUpdated: string
  liveDatabase: string
  unavailable: string
  maxRows: string
  typeLabels: Record<ReportingTypeKey, string>
  typeDescriptions: Record<ReportingTypeKey, string>
  statusLabels: Record<string, string>
}

const copies: Record<ReportingLocale, ReportingCopy> = {
  tr: {
    kicker: "UC16 · Operasyon kanıt odası",
    title: "Kalıcı rapor arşivi",
    intro: "Yetkili kaynaklardan değişmez CSV kanıtları üretin, veri kesitini doğrulayın ve açıklamaları insan onayıyla yönetin.",
    internalLive: "İç arşiv canlı",
    internalUnavailable: "İç arşiv kullanılamıyor",
    internalEvidence: "İstek, dosya içeriği, kaynak kesiti ve inceleme izi veritabanında kalıcıdır.",
    providerReady: "Sağlayıcı hazır",
    bulkExport: "Toplu dışa aktarma",
    externalStorage: "Harici nesne depolama",
    providerBoundary: "50.000 satır üzeri ve harici depolama, sağlayıcı bağlantısı kurulana kadar çalıştırılmaz.",
    refresh: "Yenile",
    unavailableTitle: "Gerçek kuruluş oturumu gerekli",
    realAuthUnavailable: "Yerel erişim profili kalıcı rapor oluşturamaz veya varmış gibi rapor geçmişi gösteremez.",
    companyUnavailable: "Bu oturumda doğrulanmış kuruluş kapsamı bulunmuyor.",
    unavailableNote: "Supabase ve gerçek kuruluş kimliği etkinleştiğinde yalnızca yetkili siteler yüklenir.",
    requestTitle: "Yeni kanıt kesiti",
    requestIntro: "Tür, atanmış siteler ve sınırlı filtreler. Boş site seçimi yetkili tüm siteleri kapsar.",
    reportType: "Rapor türü",
    siteScope: "Atanmış site kapsamı",
    allAssignedSites: "Tüm atanmış siteler",
    allAssignedSitesHint: "Seçim yoksa sunucu yalnızca yetkili site kapsamının tamamını kullanır.",
    clearSites: "Tümünü kullan",
    filters: "Kaynak filtreleri",
    from: "Başlangıç",
    to: "Bitiş (hariç)",
    dateHint: "En fazla 366 gün; bitiş anı dahil değildir.",
    status: "Kaynak durumu",
    allStatuses: "Tüm durumlar",
    generate: "Kalıcı rapor üret",
    generating: "Rapor üretiliyor…",
    requestSuccess: "Rapor isteği kaydedildi ve sicil yenilendi.",
    historyTitle: "İstek ve dosya sicili",
    historyIntro: "Her satır canlı veritabanı durumudur; yerel örnek veya tarayıcı depolaması kullanılmaz.",
    requests: "İstekler",
    artifacts: "Dosyalar",
    pendingReview: "İnsan incelemesi",
    readyArtifacts: "Hazır dosya",
    noRequests: "Yetki kapsamınızda henüz rapor isteği yok.",
    noArtifacts: "Henüz indirilebilir kalıcı dosya yok.",
    created: "Oluşturuldu",
    snapshot: "Kaynak kesiti",
    rows: "Satır",
    selectedSites: "Site",
    allScope: "Tüm yetkili kapsam",
    version: "Sürüm",
    failure: "Hata",
    download: "Doğrulanmış CSV indir",
    downloadIntegrity: "İndirmede SHA-256 ve bayt boyutu sunucuda yeniden doğrulanır.",
    sourceTables: "Kaynak tablolar",
    limitations: "Sınırlar",
    metrics: "Kaynak metrikleri",
    commentaryTitle: "Kaynağa dayalı açıklama",
    groundedLabel: "Kaynak verisine bağlı; karar değildir",
    reviewReason: "İnceleme gerekçesi",
    reasonPlaceholder: "Onay veya ret gerekçesini en az 10 karakterle yazın",
    reasonHint: "Beklenen sürüm ile kaydedilir; çakışan incelemeler reddedilir.",
    approve: "Açıklamayı onayla",
    reject: "Açıklamayı reddet",
    loading: "Canlı rapor sicili yükleniyor",
    loadError: "Canlı rapor sicili yüklenemedi.",
    mutationError: "Rapor isteği kaydedilemedi.",
    reviewError: "İnceleme kararı kaydedilemedi.",
    validationError: "İnceleme gerekçesi en az 10 karakter olmalıdır.",
    lastUpdated: "Son yenileme",
    liveDatabase: "Supabase canlı",
    unavailable: "Kullanılamıyor",
    maxRows: "İç dosya sınırı",
    typeLabels: { finance_ledger: "Finans defteri", unit_inventory: "Daire envanteri", ticket_operations: "Talep operasyonları", compliance_cases: "Uyum vakaları" },
    typeDescriptions: {
      finance_ledger: "Tutar, para birimi, dönem ve ödeme durumunu kaynak defterden çıkarır.",
      unit_inventory: "Daire, doluluk ve mülkiyet durumunun yetkili kesitini üretir.",
      ticket_operations: "İş akışı, öncelik ve SLA alanlarını servis taleplerinden çıkarır.",
      compliance_cases: "Risk, engel ve insan kararı alanlarını uyum vakalarından çıkarır.",
    },
    statusLabels: {
      queued: "Sırada", generating: "Üretiliyor", ready: "Hazır", failed: "Başarısız", pending_human_review: "İnsan incelemesi bekliyor", approved: "Onaylandı", rejected: "Reddedildi",
      draft: "Taslak", open: "Açık", partially_paid: "Kısmen ödendi", paid: "Ödendi", overdue: "Gecikmiş", cancelled: "İptal", occupied: "Dolu", vacant: "Boş", reserved: "Rezerve", blocked: "Engelli", unknown: "Bilinmiyor",
      submitted: "Gönderildi", triage: "Ön değerlendirme", accepted: "Kabul edildi", assigned: "Atandı", acknowledged: "Alındı", in_progress: "Devam ediyor", waiting_resident: "Sakin bekleniyor", manager_review: "Yönetici incelemesi", rework: "Yeniden çalışma", resolved: "Çözüldü", closed: "Kapalı", pending_review: "İnceleme bekliyor", in_review: "İncelemede",
    },
  },
  en: {
    kicker: "UC16 · Operations evidence room",
    title: "Persistent report archive",
    intro: "Generate immutable CSV evidence from authorized sources, inspect its data cut, and keep commentary under human approval.",
    internalLive: "Internal archive live",
    internalUnavailable: "Internal archive unavailable",
    internalEvidence: "The request, file payload, source snapshot, and review trail persist in the database.",
    providerReady: "Provider-ready",
    bulkExport: "Bulk export",
    externalStorage: "External object storage",
    providerBoundary: "More than 50,000 rows and external storage stay inactive until a provider is connected.",
    refresh: "Refresh",
    unavailableTitle: "A real organization session is required",
    realAuthUnavailable: "A local access profile cannot create persistent reports or display fabricated report history.",
    companyUnavailable: "This session has no verified organization scope.",
    unavailableNote: "Once Supabase and a real organization identity are active, authorized sites load here.",
    requestTitle: "New evidence cut",
    requestIntro: "Choose a type, assigned sites, and bounded filters. No selected site means every authorized site.",
    reportType: "Report type",
    siteScope: "Assigned site scope",
    allAssignedSites: "All assigned sites",
    allAssignedSitesHint: "With no selection, the server uses the complete authorized site scope only.",
    clearSites: "Use all",
    filters: "Source filters",
    from: "From",
    to: "To (exclusive)",
    dateHint: "Maximum 366 days; the end instant is excluded.",
    status: "Source status",
    allStatuses: "All statuses",
    generate: "Generate persistent report",
    generating: "Generating report…",
    requestSuccess: "The report request was persisted and the register refreshed.",
    historyTitle: "Request and artifact register",
    historyIntro: "Every row reflects live database state; no local sample or browser storage is used.",
    requests: "Requests",
    artifacts: "Artifacts",
    pendingReview: "Human review",
    readyArtifacts: "Ready artifacts",
    noRequests: "There are no report requests in your authorized scope yet.",
    noArtifacts: "No persistent downloadable artifact exists yet.",
    created: "Created",
    snapshot: "Source cut",
    rows: "Rows",
    selectedSites: "Sites",
    allScope: "All authorized scope",
    version: "Version",
    failure: "Failure",
    download: "Download verified CSV",
    downloadIntegrity: "SHA-256 and byte length are checked again on the server during download.",
    sourceTables: "Source tables",
    limitations: "Limitations",
    metrics: "Source metrics",
    commentaryTitle: "Source-grounded commentary",
    groundedLabel: "Bound to source data; not a decision",
    reviewReason: "Review reason",
    reasonPlaceholder: "Give an approval or rejection reason of at least 10 characters",
    reasonHint: "Saved against the expected version; conflicting reviews are rejected.",
    approve: "Approve commentary",
    reject: "Reject commentary",
    loading: "Loading the live report register",
    loadError: "The live report register could not be loaded.",
    mutationError: "The report request could not be persisted.",
    reviewError: "The review decision could not be persisted.",
    validationError: "The review reason must contain at least 10 characters.",
    lastUpdated: "Last refresh",
    liveDatabase: "Supabase live",
    unavailable: "Unavailable",
    maxRows: "Internal artifact limit",
    typeLabels: { finance_ledger: "Finance ledger", unit_inventory: "Unit inventory", ticket_operations: "Ticket operations", compliance_cases: "Compliance cases" },
    typeDescriptions: {
      finance_ledger: "Extracts amounts, currency, periods, and payment state from the source ledger.",
      unit_inventory: "Produces an authorized cut of unit, occupancy, and ownership state.",
      ticket_operations: "Extracts workflow, priority, and SLA fields from service tickets.",
      compliance_cases: "Extracts risk, blocker, and human-decision fields from compliance cases.",
    },
    statusLabels: {
      queued: "Queued", generating: "Generating", ready: "Ready", failed: "Failed", pending_human_review: "Pending human review", approved: "Approved", rejected: "Rejected",
      draft: "Draft", open: "Open", partially_paid: "Partially paid", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled", occupied: "Occupied", vacant: "Vacant", reserved: "Reserved", blocked: "Blocked", unknown: "Unknown",
      submitted: "Submitted", triage: "Triage", accepted: "Accepted", assigned: "Assigned", acknowledged: "Acknowledged", in_progress: "In progress", waiting_resident: "Waiting for resident", manager_review: "Manager review", rework: "Rework", resolved: "Resolved", closed: "Closed", pending_review: "Pending review", in_review: "In review",
    },
  },
  de: {
    kicker: "UC16 · Operativer Nachweisraum",
    title: "Dauerhaftes Berichtsarchiv",
    intro: "Erzeugen Sie unveränderliche CSV-Nachweise aus autorisierten Quellen, prüfen Sie den Datenstand und steuern Sie Kommentare durch menschliche Freigabe.",
    internalLive: "Internes Archiv aktiv",
    internalUnavailable: "Internes Archiv nicht verfügbar",
    internalEvidence: "Anfrage, Dateiinhalt, Quelldatenstand und Prüfspur bleiben dauerhaft in der Datenbank.",
    providerReady: "Anbieterbereit",
    bulkExport: "Massendatenexport",
    externalStorage: "Externer Objektspeicher",
    providerBoundary: "Mehr als 50.000 Zeilen und externer Speicher bleiben bis zur Anbieteranbindung inaktiv.",
    refresh: "Aktualisieren",
    unavailableTitle: "Eine echte Organisationssitzung ist erforderlich",
    realAuthUnavailable: "Ein lokales Zugriffsprofil kann keine dauerhaften Berichte erzeugen oder erfundene Historie anzeigen.",
    companyUnavailable: "Diese Sitzung besitzt keinen verifizierten Organisationsumfang.",
    unavailableNote: "Mit Supabase und echter Organisationsidentität werden hier ausschließlich autorisierte Anlagen geladen.",
    requestTitle: "Neuer Nachweisstand",
    requestIntro: "Wählen Sie Typ, zugewiesene Anlagen und begrenzte Filter. Ohne Auswahl gelten alle autorisierten Anlagen.",
    reportType: "Berichtstyp",
    siteScope: "Zugewiesene Anlagen",
    allAssignedSites: "Alle zugewiesenen Anlagen",
    allAssignedSitesHint: "Ohne Auswahl verwendet der Server ausschließlich den vollständigen autorisierten Umfang.",
    clearSites: "Alle verwenden",
    filters: "Quellenfilter",
    from: "Von",
    to: "Bis (exklusiv)",
    dateHint: "Maximal 366 Tage; der Endzeitpunkt ist nicht enthalten.",
    status: "Quellenstatus",
    allStatuses: "Alle Status",
    generate: "Dauerhaften Bericht erzeugen",
    generating: "Bericht wird erzeugt…",
    requestSuccess: "Die Berichtsanfrage wurde gespeichert und das Register aktualisiert.",
    historyTitle: "Anfrage- und Dateiregister",
    historyIntro: "Jede Zeile zeigt den Live-Datenbankstand; lokale Beispieldaten und Browserspeicher werden nicht verwendet.",
    requests: "Anfragen",
    artifacts: "Dateien",
    pendingReview: "Menschliche Prüfung",
    readyArtifacts: "Fertige Dateien",
    noRequests: "In Ihrem Umfang sind noch keine Berichtsanfragen vorhanden.",
    noArtifacts: "Es ist noch keine dauerhaft gespeicherte Datei verfügbar.",
    created: "Erstellt",
    snapshot: "Quelldatenstand",
    rows: "Zeilen",
    selectedSites: "Anlagen",
    allScope: "Gesamter autorisierter Umfang",
    version: "Version",
    failure: "Fehler",
    download: "Geprüfte CSV herunterladen",
    downloadIntegrity: "SHA-256 und Byte-Länge werden beim Download serverseitig erneut geprüft.",
    sourceTables: "Quelltabellen",
    limitations: "Einschränkungen",
    metrics: "Quellmetriken",
    commentaryTitle: "Quellengebundener Kommentar",
    groundedLabel: "An Quelldaten gebunden; keine Entscheidung",
    reviewReason: "Prüfbegründung",
    reasonPlaceholder: "Begründen Sie Freigabe oder Ablehnung mit mindestens 10 Zeichen",
    reasonHint: "Wird gegen die erwartete Version gespeichert; konkurrierende Prüfungen werden abgewiesen.",
    approve: "Kommentar freigeben",
    reject: "Kommentar ablehnen",
    loading: "Live-Berichtsregister wird geladen",
    loadError: "Das Live-Berichtsregister konnte nicht geladen werden.",
    mutationError: "Die Berichtsanfrage konnte nicht gespeichert werden.",
    reviewError: "Die Prüfentscheidung konnte nicht gespeichert werden.",
    validationError: "Die Prüfbegründung muss mindestens 10 Zeichen enthalten.",
    lastUpdated: "Letzte Aktualisierung",
    liveDatabase: "Supabase live",
    unavailable: "Nicht verfügbar",
    maxRows: "Internes Dateilimit",
    typeLabels: { finance_ledger: "Finanzbuch", unit_inventory: "Wohnungsbestand", ticket_operations: "Vorgangsbetrieb", compliance_cases: "Compliance-Fälle" },
    typeDescriptions: {
      finance_ledger: "Extrahiert Beträge, Währungen, Perioden und Zahlungsstatus aus dem Quellbuch.",
      unit_inventory: "Erzeugt einen autorisierten Stand von Wohnung, Belegung und Eigentum.",
      ticket_operations: "Extrahiert Workflow-, Prioritäts- und SLA-Felder aus Servicevorgängen.",
      compliance_cases: "Extrahiert Risiko-, Blocker- und Entscheidungsfelder aus Compliance-Fällen.",
    },
    statusLabels: {
      queued: "Eingereiht", generating: "Wird erzeugt", ready: "Bereit", failed: "Fehlgeschlagen", pending_human_review: "Menschliche Prüfung ausstehend", approved: "Freigegeben", rejected: "Abgelehnt",
      draft: "Entwurf", open: "Offen", partially_paid: "Teilbezahlt", paid: "Bezahlt", overdue: "Überfällig", cancelled: "Storniert", occupied: "Belegt", vacant: "Frei", reserved: "Reserviert", blocked: "Gesperrt", unknown: "Unbekannt",
      submitted: "Eingereicht", triage: "Triage", accepted: "Angenommen", assigned: "Zugewiesen", acknowledged: "Bestätigt", in_progress: "In Bearbeitung", waiting_resident: "Bewohner ausstehend", manager_review: "Managerprüfung", rework: "Nacharbeit", resolved: "Gelöst", closed: "Geschlossen", pending_review: "Prüfung ausstehend", in_review: "In Prüfung",
    },
  },
  ru: {
    kicker: "UC16 · Операционный архив доказательств",
    title: "Постоянный архив отчётов",
    intro: "Создавайте неизменяемые CSV-доказательства из разрешённых источников, проверяйте срез и оставляйте комментарии под контролем человека.",
    internalLive: "Внутренний архив активен",
    internalUnavailable: "Внутренний архив недоступен",
    internalEvidence: "Запрос, файл, срез источников и история проверки постоянно хранятся в базе данных.",
    providerReady: "Готово к провайдеру",
    bulkExport: "Массовый экспорт",
    externalStorage: "Внешнее объектное хранилище",
    providerBoundary: "Более 50 000 строк и внешнее хранилище не запускаются до подключения провайдера.",
    refresh: "Обновить",
    unavailableTitle: "Требуется реальная сессия организации",
    realAuthUnavailable: "Локальный профиль не может создавать постоянные отчёты или показывать вымышленную историю.",
    companyUnavailable: "У этой сессии нет подтверждённого контура организации.",
    unavailableNote: "После настройки Supabase и реальной идентификации загрузятся только разрешённые объекты.",
    requestTitle: "Новый срез доказательств",
    requestIntro: "Выберите тип, назначенные объекты и ограниченные фильтры. Пустой выбор означает все разрешённые объекты.",
    reportType: "Тип отчёта",
    siteScope: "Назначенные объекты",
    allAssignedSites: "Все назначенные объекты",
    allAssignedSitesHint: "Без выбора сервер использует только полный разрешённый контур объектов.",
    clearSites: "Использовать все",
    filters: "Фильтры источника",
    from: "С",
    to: "До (не включая)",
    dateHint: "Не более 366 дней; конечный момент не включается.",
    status: "Статус источника",
    allStatuses: "Все статусы",
    generate: "Создать постоянный отчёт",
    generating: "Создание отчёта…",
    requestSuccess: "Запрос сохранён, реестр обновлён.",
    historyTitle: "Реестр запросов и файлов",
    historyIntro: "Каждая строка отражает живую базу; локальные примеры и хранилище браузера не используются.",
    requests: "Запросы",
    artifacts: "Файлы",
    pendingReview: "Проверка человеком",
    readyArtifacts: "Готовые файлы",
    noRequests: "В разрешённом контуре пока нет запросов отчётов.",
    noArtifacts: "Постоянных файлов для скачивания пока нет.",
    created: "Создан",
    snapshot: "Срез источника",
    rows: "Строки",
    selectedSites: "Объекты",
    allScope: "Весь разрешённый контур",
    version: "Версия",
    failure: "Ошибка",
    download: "Скачать проверенный CSV",
    downloadIntegrity: "SHA-256 и размер повторно проверяются сервером при скачивании.",
    sourceTables: "Таблицы-источники",
    limitations: "Ограничения",
    metrics: "Метрики источника",
    commentaryTitle: "Комментарий на основе источников",
    groundedLabel: "Привязан к данным; не является решением",
    reviewReason: "Причина проверки",
    reasonPlaceholder: "Укажите причину одобрения или отклонения минимум из 10 символов",
    reasonHint: "Сохраняется с ожидаемой версией; конфликтующая проверка отклоняется.",
    approve: "Одобрить комментарий",
    reject: "Отклонить комментарий",
    loading: "Загрузка живого реестра отчётов",
    loadError: "Не удалось загрузить живой реестр отчётов.",
    mutationError: "Не удалось сохранить запрос отчёта.",
    reviewError: "Не удалось сохранить решение проверки.",
    validationError: "Причина проверки должна содержать не менее 10 символов.",
    lastUpdated: "Последнее обновление",
    liveDatabase: "Supabase активно",
    unavailable: "Недоступно",
    maxRows: "Лимит внутреннего файла",
    typeLabels: { finance_ledger: "Финансовый реестр", unit_inventory: "Реестр квартир", ticket_operations: "Операции по заявкам", compliance_cases: "Комплаенс-кейсы" },
    typeDescriptions: {
      finance_ledger: "Выгружает суммы, валюты, периоды и статус оплаты из исходного реестра.",
      unit_inventory: "Создаёт разрешённый срез квартир, занятости и собственности.",
      ticket_operations: "Выгружает этапы, приоритеты и SLA из сервисных заявок.",
      compliance_cases: "Выгружает риски, блокеры и поля решений человека из комплаенс-кейсов.",
    },
    statusLabels: {
      queued: "В очереди", generating: "Формируется", ready: "Готов", failed: "Ошибка", pending_human_review: "Ожидает проверки человеком", approved: "Одобрено", rejected: "Отклонено",
      draft: "Черновик", open: "Открыт", partially_paid: "Частично оплачено", paid: "Оплачено", overdue: "Просрочено", cancelled: "Отменено", occupied: "Занято", vacant: "Свободно", reserved: "Зарезервировано", blocked: "Заблокировано", unknown: "Неизвестно",
      submitted: "Отправлено", triage: "Триаж", accepted: "Принято", assigned: "Назначено", acknowledged: "Подтверждено", in_progress: "В работе", waiting_resident: "Ожидание жильца", manager_review: "Проверка менеджера", rework: "Доработка", resolved: "Решено", closed: "Закрыто", pending_review: "Ожидает проверки", in_review: "На проверке",
    },
  },
}

export const reportFilterStatuses: Record<ReportingTypeKey, readonly string[]> = {
  finance_ledger: ["draft", "open", "partially_paid", "paid", "overdue", "cancelled"],
  unit_inventory: ["occupied", "vacant", "reserved", "blocked", "unknown"],
  ticket_operations: ["submitted", "triage", "accepted", "assigned", "acknowledged", "in_progress", "waiting_resident", "manager_review", "rework", "resolved", "closed", "cancelled"],
  compliance_cases: ["pending_review", "in_review", "approved", "rejected", "blocked", "closed"],
}

export function getReportingCopy(value: string): ReportingCopy {
  const locale: ReportingLocale = value === "en" || value === "de" || value === "ru" ? value : "tr"
  return copies[locale]
}
