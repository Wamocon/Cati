export const buyerStageKeys = [
  "new",
  "contacted",
  "qualified",
  "viewing",
  "offer",
  "reservation",
  "due_diligence",
  "won",
  "lost",
] as const

export const buyerSourceKeys = [
  "website",
  "referral",
  "portal",
  "walk_in",
  "phone",
  "partner",
  "import",
] as const

export type BuyerPipelineLocale = "tr" | "en" | "de" | "ru"
export type BuyerStageKey = (typeof buyerStageKeys)[number]
export type BuyerSourceKey = (typeof buyerSourceKeys)[number]
export type BuyerConsentKey = "pending" | "granted" | "withdrawn"

export interface BuyerPipelineCopy {
  kicker: string
  title: string
  intro: string
  localAuthority: string
  localAuthorityDetail: string
  twentyReady: string
  twentyDisconnected: string
  refresh: string
  loading: string
  loadError: string
  unavailableTitle: string
  unavailableRealAuth: string
  unavailableCompany: string
  unavailableSite: string
  unavailableNote: string
  stageRail: string
  allStages: string
  pipeline: string
  emptyPipeline: string
  noMatch: string
  search: string
  addBuyer: string
  closeForm: string
  createTitle: string
  createIntro: string
  name: string
  email: string
  phone: string
  site: string
  manager: string
  source: string
  sourceDetail: string
  preferredLocale: string
  followUp: string
  consent: string
  consentVersion: string
  consentDigest: string
  consentPendingHint: string
  consentEvidenceHint: string
  consentEvidenceRetained: string
  create: string
  creating: string
  createSuccess: string
  duplicateNotice: string
  createError: string
  selectBuyer: string
  buyerDesk: string
  buyerDeskIntro: string
  contact: string
  assignedTo: string
  lastUpdated: string
  version: string
  unit: string
  noUnit: string
  primaryUnit: string
  noPrimaryUnit: string
  unitInterests: string
  unitInterestsHint: string
  nextStep: string
  terminalStage: string
  lossReason: string
  transition: string
  transitionSuccess: string
  saveProfile: string
  saving: string
  updateSuccess: string
  noteTitle: string
  notePlaceholder: string
  addNote: string
  noteSuccess: string
  noNotes: string
  handoffTitle: string
  handoffIntro: string
  targetType: string
  targetRegistration: string
  targetReservation: string
  targetId: string
  linkExisting: string
  linkSuccess: string
  handoffEligibility: string
  noFabrication: string
  linkedRecords: string
  noLinks: string
  history: string
  generatedAt: string
  conflictHint: string
  validationContact: string
  validationConsent: string
  validationLoss: string
  validationTarget: string
  mutationError: string
  stageLabels: Record<BuyerStageKey, string>
  sourceLabels: Record<BuyerSourceKey, string>
  consentLabels: Record<BuyerConsentKey, string>
}

const tr: BuyerPipelineCopy = {
  kicker: "UC24 · Operasyonel satış odası",
  title: "Alıcı hattı",
  intro:
    "Potansiyel alıcıları ilk temastan kanıtlı devir teslimine kadar, site kapsamı ve iyimser kilitleme ile yönetin.",
  localAuthority: "Yerel veritabanı yetkili kaynak",
  localAuthorityDetail:
    "Kayıtlar yalnızca gerçek kuruluş oturumunda Supabase'e kalıcı olarak yazılır.",
  twentyReady: "Twenty sağlayıcıya hazır",
  twentyDisconnected:
    "Twenty bağlantısı kurulmadı; senkronizasyon iddiası yok.",
  refresh: "Yenile",
  loading: "Canlı alıcı hattı yükleniyor",
  loadError: "Canlı alıcı hattı yüklenemedi.",
  unavailableTitle: "Kalıcı alıcı hattı kullanılamıyor",
  unavailableRealAuth:
    "Yerel erişim profili kalıcı alıcı kayıtlarını gösteremez veya oluşturamaz.",
  unavailableCompany: "Bu oturumun doğrulanmış kuruluş kapsamı yok.",
  unavailableSite: "Bu yöneticiye aktif bir site kapsamı atanmadı.",
  unavailableNote:
    "Supabase ve gerçek kuruluş kimliği etkin olduğunda yalnızca yetkili siteler ve yöneticiler yüklenir. Örnek alıcı gösterilmez.",
  stageRail: "Aşama hattı",
  allStages: "Tüm aşamalar",
  pipeline: "Potansiyel alıcılar",
  emptyPipeline: "Yetkili kapsamınızda henüz potansiyel alıcı yok.",
  noMatch: "Bu filtreyle eşleşen alıcı yok.",
  search: "Ad, iletişim, site veya daire ara",
  addBuyer: "Alıcı ekle",
  closeForm: "Formu kapat",
  createTitle: "Kapsamlı alıcı kaydı",
  createIntro:
    "Site ve sorumlu yönetici sunucudaki yetki kapsamından gelir. En az bir iletişim kanalı gerekir.",
  name: "Ad soyad",
  email: "E-posta",
  phone: "Telefon",
  site: "Site",
  manager: "Sorumlu yönetici",
  source: "Kaynak",
  sourceDetail: "Kaynak ayrıntısı",
  preferredLocale: "Tercih edilen dil",
  followUp: "Takip zamanı",
  consent: "KVKK izni",
  consentVersion: "İzin metni sürümü",
  consentDigest: "İzin kanıtı SHA-256",
  consentPendingHint: "Beklemede seçimi izin verildiği anlamına gelmez.",
  consentEvidenceHint:
    "Verildi durumu sürüm ve 64 karakterlik SHA-256 kanıtı gerektirir.",
  consentEvidenceRetained:
    "Mevcut izin kanıtı sunucuda değiştirilemez biçimde korunur; yeniden girmeniz gerekmez.",
  create: "Kalıcı kayıt oluştur",
  creating: "Kaydediliyor…",
  createSuccess: "Alıcı kaydı veritabanına yazıldı.",
  duplicateNotice: "Aynı iletişim bilgilerine sahip mevcut bir alıcı bulundu; yeni kayıt oluşturulmadı.",
  createError: "Alıcı kaydı oluşturulamadı.",
  selectBuyer: "Çalışmak için bir alıcı seçin.",
  buyerDesk: "Alıcı çalışma masası",
  buyerDeskIntro:
    "Her komut mevcut sürüme karşı kaydedilir; başka bir kullanıcı güncellediyse çakışma reddedilir.",
  contact: "İletişim",
  assignedTo: "Sorumlu",
  lastUpdated: "Son güncelleme",
  version: "Sürüm",
  unit: "Kanıtlı daire",
  noUnit: "Daire kanıtı bağlanmadı",
  primaryUnit: "Birincil daire",
  noPrimaryUnit: "Birincil daire yok",
  unitInterests: "İlgilenilen daireler",
  unitInterestsHint: "Seçili site için en fazla 20 daire seçin.",
  nextStep: "Sonraki aşama",
  terminalStage: "Bu alıcı terminal aşamada.",
  lossReason: "Kayıp nedeni",
  transition: "Aşamaya geçir",
  transitionSuccess: "Aşama kalıcı olarak güncellendi.",
  saveProfile: "Profil ve takibi kaydet",
  saving: "Kaydediliyor…",
  updateSuccess: "Profil veritabanında güncellendi.",
  noteTitle: "İç not",
  notePlaceholder: "Doğrulanabilir takip notu yazın",
  addNote: "Notu kaydet",
  noteSuccess: "Not değişmez geçmişe eklendi.",
  noNotes: "Henüz not yok.",
  handoffTitle: "Mevcut kayda bağlantı",
  handoffIntro:
    "Yalnızca zaten var olan ve sunucuda kanıt eşleşmesi doğrulanan bir kayıt talebi veya operasyonel rezervasyon bağlanabilir.",
  targetType: "Mevcut hedef türü",
  targetRegistration: "Mevcut malik kayıt talebi",
  targetReservation: "Mevcut operasyonel rezervasyon",
  targetId: "Mevcut kayıt UUID'si",
  linkExisting: "Mevcut kaydı bağla",
  linkSuccess: "Mevcut hedef kanıtla bağlandı.",
  handoffEligibility:
    "Kayıt devri: kazanıldı + izin + e-posta + daire kanıtı. Rezervasyon: rezervasyon aşaması veya sonrası + eşleşen mevcut operasyonel rezervasyon.",
  noFabrication:
    "Bu işlem kayıt veya rezervasyon oluşturmaz; yalnızca bağlantı kurar (UC08/UC18 komşuluğu).",
  linkedRecords: "Bağlı mevcut kayıtlar",
  noLinks: "Henüz mevcut hedef bağlantısı yok.",
  history: "Son aktivite",
  generatedAt: "Veri kesiti",
  conflictHint:
    "Sürüm çakışmasında yenileyin ve değişikliği tekrar değerlendirin.",
  validationContact: "Ad ile e-posta veya telefon gereklidir.",
  validationConsent:
    "Verilmiş izin için sürüm ve 64 karakterlik SHA-256 kanıtı gerekir.",
  validationLoss: "Kayıp aşaması için en az 3 karakterlik neden gerekir.",
  validationTarget: "Var olan hedefin geçerli UUID'sini girin.",
  mutationError: "Değişiklik kaydedilemedi.",
  stageLabels: {
    new: "Yeni",
    contacted: "Temas",
    qualified: "Nitelikli",
    viewing: "Gösterim",
    offer: "Teklif",
    reservation: "Rezervasyon",
    due_diligence: "İnceleme",
    won: "Kazanıldı",
    lost: "Kaybedildi",
  },
  sourceLabels: {
    website: "Web sitesi",
    referral: "Referans",
    portal: "Portal",
    walk_in: "Ofis ziyareti",
    phone: "Telefon",
    partner: "İş ortağı",
    import: "İçe aktarma",
  },
  consentLabels: {
    pending: "Beklemede",
    granted: "Kanıtla verildi",
    withdrawn: "Geri çekildi",
  },
}

const en: BuyerPipelineCopy = {
  kicker: "UC24 · Operational sales room",
  title: "Buyer pipeline",
  intro:
    "Move prospects from first contact to an evidence-backed hand-off with site scope and optimistic locking.",
  localAuthority: "Local database authoritative",
  localAuthorityDetail:
    "Records persist in Supabase only for a real organization session.",
  twentyReady: "Twenty provider-ready",
  twentyDisconnected: "Twenty is not connected; no synchronization is claimed.",
  refresh: "Refresh",
  loading: "Loading the live buyer pipeline",
  loadError: "The live buyer pipeline could not be loaded.",
  unavailableTitle: "Persistent buyer pipeline unavailable",
  unavailableRealAuth:
    "A local access profile cannot display or create persistent buyer records.",
  unavailableCompany: "This session has no verified organization scope.",
  unavailableSite: "This manager has no active site assignment.",
  unavailableNote:
    "When Supabase and a real organization identity are active, only authorized sites and managers load. No sample buyers are shown.",
  stageRail: "Stage rail",
  allStages: "All stages",
  pipeline: "Prospects",
  emptyPipeline: "There are no prospects in your authorized scope yet.",
  noMatch: "No buyer matches this filter.",
  search: "Search name, contact, site, or unit",
  addBuyer: "Add buyer",
  closeForm: "Close form",
  createTitle: "Scoped buyer record",
  createIntro:
    "Site and manager come from server-authorized scope. At least one contact channel is required.",
  name: "Full name",
  email: "Email",
  phone: "Phone",
  site: "Site",
  manager: "Assigned manager",
  source: "Source",
  sourceDetail: "Source detail",
  preferredLocale: "Preferred language",
  followUp: "Follow-up time",
  consent: "KVKK consent",
  consentVersion: "Consent text version",
  consentDigest: "Consent evidence SHA-256",
  consentPendingHint: "Pending does not represent granted consent.",
  consentEvidenceHint:
    "Granted requires a version and a 64-character SHA-256 evidence digest.",
  consentEvidenceRetained:
    "Existing consent evidence remains immutable on the server; do not enter it again.",
  create: "Create persistent record",
  creating: "Creating…",
  createSuccess: "The buyer record was persisted.",
  duplicateNotice: "An existing buyer with matching contact details was found; no new record was created.",
  createError: "The buyer record could not be created.",
  selectBuyer: "Select a buyer to work on.",
  buyerDesk: "Buyer workbench",
  buyerDeskIntro:
    "Every command is saved against the current version; concurrent changes are rejected.",
  contact: "Contact",
  assignedTo: "Assigned to",
  lastUpdated: "Last updated",
  version: "Version",
  unit: "Evidence-backed unit",
  noUnit: "No unit evidence linked",
  primaryUnit: "Primary unit",
  noPrimaryUnit: "No primary unit",
  unitInterests: "Units of interest",
  unitInterestsHint: "Select up to 20 units from this buyer's site.",
  nextStep: "Next stage",
  terminalStage: "This buyer is in a terminal stage.",
  lossReason: "Loss reason",
  transition: "Move to stage",
  transitionSuccess: "The stage was persisted.",
  saveProfile: "Save profile and follow-up",
  saving: "Saving…",
  updateSuccess: "The profile was updated in the database.",
  noteTitle: "Internal note",
  notePlaceholder: "Add a verifiable follow-up note",
  addNote: "Save note",
  noteSuccess: "The note was added to append-only history.",
  noNotes: "No notes yet.",
  handoffTitle: "Link an existing record",
  handoffIntro:
    "Only an already-existing registration request or operational reservation that passes server evidence matching can be linked.",
  targetType: "Existing target type",
  targetRegistration: "Existing owner registration request",
  targetReservation: "Existing operational reservation",
  targetId: "Existing record UUID",
  linkExisting: "Link existing record",
  linkSuccess: "The existing target was linked with evidence checks.",
  handoffEligibility:
    "Registration: won + consent + email + unit evidence. Reservation: reservation stage or later + matching existing operational reservation.",
  noFabrication:
    "This never creates a registration or reservation; it only links one (UC08/UC18 adjacency).",
  linkedRecords: "Linked existing records",
  noLinks: "No existing target is linked yet.",
  history: "Recent activity",
  generatedAt: "Data cut",
  conflictHint: "On a version conflict, refresh and reassess the change.",
  validationContact: "A name and email or phone are required.",
  validationConsent:
    "Granted consent requires a version and 64-character SHA-256 evidence digest.",
  validationLoss: "A loss reason of at least 3 characters is required.",
  validationTarget: "Enter a valid UUID for an existing target.",
  mutationError: "The change could not be persisted.",
  stageLabels: {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    viewing: "Viewing",
    offer: "Offer",
    reservation: "Reservation",
    due_diligence: "Due diligence",
    won: "Won",
    lost: "Lost",
  },
  sourceLabels: {
    website: "Website",
    referral: "Referral",
    portal: "Portal",
    walk_in: "Walk-in",
    phone: "Phone",
    partner: "Partner",
    import: "Import",
  },
  consentLabels: {
    pending: "Pending",
    granted: "Granted with evidence",
    withdrawn: "Withdrawn",
  },
}

const de: BuyerPipelineCopy = {
  ...en,
  kicker: "UC24 · Operativer Sales Room",
  title: "Käufer-Pipeline",
  intro:
    "Führen Sie Interessenten vom Erstkontakt bis zur belegten Übergabe – standortbezogen und mit optimistischer Sperre.",
  localAuthority: "Lokale Datenbank maßgeblich",
  localAuthorityDetail:
    "Datensätze werden nur mit einer echten Organisationssitzung in Supabase gespeichert.",
  twentyReady: "Twenty provider-ready",
  twentyDisconnected:
    "Twenty ist nicht verbunden; eine Synchronisierung wird nicht behauptet.",
  refresh: "Aktualisieren",
  loading: "Live-Käufer-Pipeline wird geladen",
  loadError: "Die Live-Käufer-Pipeline konnte nicht geladen werden.",
  unavailableTitle: "Persistente Käufer-Pipeline nicht verfügbar",
  unavailableRealAuth:
    "Ein lokales Zugriffsprofil darf keine persistenten Käuferdatensätze anzeigen oder erstellen.",
  unavailableCompany:
    "Diese Sitzung hat keinen verifizierten Organisationskontext.",
  unavailableSite: "Diesem Manager ist kein aktiver Standort zugewiesen.",
  unavailableNote:
    "Mit Supabase und echter Organisationsidentität werden ausschließlich berechtigte Standorte und Manager geladen. Es erscheinen keine Demo-Käufer.",
  stageRail: "Phasenleiste",
  allStages: "Alle Phasen",
  pipeline: "Interessenten",
  emptyPipeline: "Im berechtigten Bereich gibt es noch keine Interessenten.",
  noMatch: "Kein Käufer entspricht diesem Filter.",
  search: "Name, Kontakt, Standort oder Einheit suchen",
  addBuyer: "Käufer anlegen",
  closeForm: "Formular schließen",
  createTitle: "Käuferdatensatz im Berechtigungsbereich",
  createIntro:
    "Standort und Manager stammen aus dem serverseitig berechtigten Bereich. Mindestens ein Kontaktweg ist erforderlich.",
  name: "Vollständiger Name",
  email: "E-Mail",
  phone: "Telefon",
  site: "Standort",
  manager: "Zuständiger Manager",
  source: "Quelle",
  sourceDetail: "Quellendetail",
  preferredLocale: "Bevorzugte Sprache",
  followUp: "Wiedervorlage",
  consent: "KVKK-Einwilligung",
  consentVersion: "Version des Einwilligungstexts",
  consentDigest: "SHA-256-Einwilligungsnachweis",
  consentPendingHint:
    "Ausstehend bedeutet nicht, dass eine Einwilligung erteilt wurde.",
  consentEvidenceHint:
    "Erteilt erfordert Version und einen 64-stelligen SHA-256-Nachweis.",
  consentEvidenceRetained:
    "Der bestehende Einwilligungsnachweis bleibt serverseitig unveränderlich; er muss nicht erneut eingegeben werden.",
  create: "Persistent anlegen",
  creating: "Wird angelegt…",
  createSuccess: "Der Käuferdatensatz wurde gespeichert.",
  duplicateNotice: "Ein vorhandener Käufer mit übereinstimmenden Kontaktdaten wurde gefunden; es wurde kein neuer Datensatz erstellt.",
  createError: "Der Käuferdatensatz konnte nicht angelegt werden.",
  selectBuyer: "Wählen Sie einen Käufer zur Bearbeitung.",
  buyerDesk: "Käufer-Arbeitsplatz",
  buyerDeskIntro:
    "Jeder Befehl wird gegen die aktuelle Version gespeichert; parallele Änderungen werden abgelehnt.",
  contact: "Kontakt",
  assignedTo: "Zuständig",
  lastUpdated: "Zuletzt aktualisiert",
  version: "Version",
  unit: "Belegte Einheit",
  noUnit: "Kein Einheitsnachweis verknüpft",
  primaryUnit: "Primäre Einheit",
  noPrimaryUnit: "Keine primäre Einheit",
  unitInterests: "Interessante Einheiten",
  unitInterestsHint: "Wählen Sie bis zu 20 Einheiten aus diesem Objekt.",
  nextStep: "Nächste Phase",
  terminalStage: "Dieser Käufer befindet sich in einer Endphase.",
  lossReason: "Verlustgrund",
  transition: "In Phase verschieben",
  transitionSuccess: "Die Phase wurde persistent aktualisiert.",
  saveProfile: "Profil und Wiedervorlage speichern",
  saving: "Wird gespeichert…",
  updateSuccess: "Das Profil wurde in der Datenbank aktualisiert.",
  noteTitle: "Interne Notiz",
  notePlaceholder: "Nachvollziehbare Wiedervorlagenotiz hinzufügen",
  addNote: "Notiz speichern",
  noteSuccess: "Die Notiz wurde dem unveränderlichen Verlauf hinzugefügt.",
  noNotes: "Noch keine Notizen.",
  handoffTitle: "Bestehenden Datensatz verknüpfen",
  handoffIntro:
    "Verknüpft werden kann nur eine bereits bestehende Registrierungsanfrage oder operative Reservierung, deren Nachweise der Server abgleicht.",
  targetType: "Bestehender Zieltyp",
  targetRegistration: "Bestehende Eigentümer-Registrierungsanfrage",
  targetReservation: "Bestehende operative Reservierung",
  targetId: "UUID des bestehenden Datensatzes",
  linkExisting: "Bestehenden Datensatz verknüpfen",
  linkSuccess: "Das bestehende Ziel wurde nach Nachweisprüfung verknüpft.",
  handoffEligibility:
    "Registrierung: gewonnen + Einwilligung + E-Mail + Einheitsnachweis. Reservierung: ab Reservierungsphase + passende bestehende operative Reservierung.",
  noFabrication:
    "Der Vorgang erstellt weder Registrierung noch Reservierung; er verknüpft nur (UC08/UC18-Nähe).",
  linkedRecords: "Verknüpfte bestehende Datensätze",
  noLinks: "Noch kein bestehendes Ziel verknüpft.",
  history: "Letzte Aktivität",
  generatedAt: "Datenstand",
  conflictHint:
    "Bei Versionskonflikt aktualisieren und die Änderung neu bewerten.",
  validationContact: "Name und E-Mail oder Telefon sind erforderlich.",
  validationConsent:
    "Erteilte Einwilligung erfordert Version und 64-stelligen SHA-256-Nachweis.",
  validationLoss:
    "Für verloren sind mindestens 3 Zeichen Begründung erforderlich.",
  validationTarget: "Geben Sie eine gültige UUID eines bestehenden Ziels ein.",
  mutationError: "Die Änderung konnte nicht gespeichert werden.",
  stageLabels: {
    new: "Neu",
    contacted: "Kontaktiert",
    qualified: "Qualifiziert",
    viewing: "Besichtigung",
    offer: "Angebot",
    reservation: "Reservierung",
    due_diligence: "Due Diligence",
    won: "Gewonnen",
    lost: "Verloren",
  },
  sourceLabels: {
    website: "Website",
    referral: "Empfehlung",
    portal: "Portal",
    walk_in: "Laufkundschaft",
    phone: "Telefon",
    partner: "Partner",
    import: "Import",
  },
  consentLabels: {
    pending: "Ausstehend",
    granted: "Mit Nachweis erteilt",
    withdrawn: "Widerrufen",
  },
}

const ru: BuyerPipelineCopy = {
  ...en,
  kicker: "UC24 · Операционный отдел продаж",
  title: "Воронка покупателей",
  intro:
    "Ведите покупателей от первого контакта до подтверждённой передачи с учётом объекта и контроля версий.",
  localAuthority: "Локальная база — источник истины",
  localAuthorityDetail:
    "Записи сохраняются в Supabase только в реальной сессии организации.",
  twentyReady: "Twenty готов к подключению",
  twentyDisconnected: "Twenty не подключён; синхронизация не заявляется.",
  refresh: "Обновить",
  loading: "Загрузка актуальной воронки",
  loadError: "Не удалось загрузить актуальную воронку покупателей.",
  unavailableTitle: "Постоянная воронка недоступна",
  unavailableRealAuth:
    "Локальный профиль доступа не может показывать или создавать постоянные записи покупателей.",
  unavailableCompany: "У сессии нет подтверждённой области организации.",
  unavailableSite: "У менеджера нет активного назначения на объект.",
  unavailableNote:
    "После подключения Supabase и реальной личности организации загрузятся только разрешённые объекты и менеджеры. Демоданные не показываются.",
  stageRail: "Этапы",
  allStages: "Все этапы",
  pipeline: "Потенциальные покупатели",
  emptyPipeline: "В разрешённой области пока нет покупателей.",
  noMatch: "Покупатели по фильтру не найдены.",
  search: "Поиск по имени, контакту, объекту или квартире",
  addBuyer: "Добавить покупателя",
  closeForm: "Закрыть форму",
  createTitle: "Запись покупателя в разрешённой области",
  createIntro:
    "Объект и менеджер берутся из серверных прав. Нужен хотя бы один канал связи.",
  name: "Имя и фамилия",
  email: "Email",
  phone: "Телефон",
  site: "Объект",
  manager: "Ответственный менеджер",
  source: "Источник",
  sourceDetail: "Детали источника",
  preferredLocale: "Предпочитаемый язык",
  followUp: "Дата контакта",
  consent: "Согласие KVKK",
  consentVersion: "Версия текста согласия",
  consentDigest: "SHA-256 подтверждения согласия",
  consentPendingHint: "Ожидание не означает, что согласие получено.",
  consentEvidenceHint:
    "Для полученного согласия нужны версия и 64-значный SHA-256.",
  consentEvidenceRetained:
    "Существующее подтверждение согласия неизменно хранится на сервере; вводить его повторно не нужно.",
  create: "Создать постоянную запись",
  creating: "Создание…",
  createSuccess: "Запись покупателя сохранена.",
  duplicateNotice: "Найдена существующая запись покупателя с совпадающими контактными данными; новая запись не создана.",
  createError: "Не удалось создать запись покупателя.",
  selectBuyer: "Выберите покупателя для работы.",
  buyerDesk: "Рабочее место покупателя",
  buyerDeskIntro:
    "Каждая команда сохраняется для текущей версии; параллельные изменения отклоняются.",
  contact: "Контакт",
  assignedTo: "Ответственный",
  lastUpdated: "Обновлено",
  version: "Версия",
  unit: "Подтверждённая квартира",
  noUnit: "Квартира не подтверждена",
  primaryUnit: "Основная квартира",
  noPrimaryUnit: "Основная квартира не выбрана",
  unitInterests: "Интересующие квартиры",
  unitInterestsHint: "Выберите до 20 квартир на объекте этого покупателя.",
  nextStep: "Следующий этап",
  terminalStage: "Покупатель находится на финальном этапе.",
  lossReason: "Причина потери",
  transition: "Перевести на этап",
  transitionSuccess: "Этап сохранён.",
  saveProfile: "Сохранить профиль и контакт",
  saving: "Сохранение…",
  updateSuccess: "Профиль обновлён в базе.",
  noteTitle: "Внутренняя заметка",
  notePlaceholder: "Добавьте проверяемую заметку",
  addNote: "Сохранить заметку",
  noteSuccess: "Заметка добавлена в неизменяемую историю.",
  noNotes: "Заметок пока нет.",
  handoffTitle: "Связать существующую запись",
  handoffIntro:
    "Можно связать только уже существующий запрос регистрации или операционную бронь после серверной проверки доказательств.",
  targetType: "Тип существующей цели",
  targetRegistration: "Существующий запрос регистрации владельца",
  targetReservation: "Существующая операционная бронь",
  targetId: "UUID существующей записи",
  linkExisting: "Связать существующую запись",
  linkSuccess: "Существующая цель связана после проверки.",
  handoffEligibility:
    "Регистрация: выиграно + согласие + email + квартира. Бронь: этап брони или позднее + соответствующая существующая операционная бронь.",
  noFabrication:
    "Операция не создаёт регистрацию или бронь, а только связывает их (связь с UC08/UC18).",
  linkedRecords: "Связанные существующие записи",
  noLinks: "Существующие цели ещё не связаны.",
  history: "Последняя активность",
  generatedAt: "Срез данных",
  conflictHint:
    "При конфликте версий обновите данные и повторно оцените изменение.",
  validationContact: "Нужны имя и email или телефон.",
  validationConsent:
    "Для полученного согласия нужны версия и 64-значный SHA-256.",
  validationLoss: "Для потери укажите причину минимум из 3 символов.",
  validationTarget: "Введите корректный UUID существующей цели.",
  mutationError: "Не удалось сохранить изменение.",
  stageLabels: {
    new: "Новый",
    contacted: "Контакт",
    qualified: "Квалифицирован",
    viewing: "Просмотр",
    offer: "Предложение",
    reservation: "Бронь",
    due_diligence: "Проверка",
    won: "Выигран",
    lost: "Потерян",
  },
  sourceLabels: {
    website: "Сайт",
    referral: "Рекомендация",
    portal: "Портал",
    walk_in: "Визит",
    phone: "Телефон",
    partner: "Партнёр",
    import: "Импорт",
  },
  consentLabels: {
    pending: "Ожидается",
    granted: "Получено с доказательством",
    withdrawn: "Отозвано",
  },
}

const copies: Record<BuyerPipelineLocale, BuyerPipelineCopy> = {
  tr,
  en,
  de,
  ru,
}

export function resolveBuyerPipelineLocale(value: string): BuyerPipelineLocale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

export function getBuyerPipelineCopy(value: string): BuyerPipelineCopy {
  return copies[resolveBuyerPipelineLocale(value)]
}
