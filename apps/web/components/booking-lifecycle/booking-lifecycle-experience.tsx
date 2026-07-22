"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react"
import { useLocale } from "next-intl"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { formatDual } from "@/lib/currency"
import { hasAnyPermission } from "@/lib/rbac"

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }
type Row = Record<string, JsonValue>

type Workspace = {
  contractVersion: "booking-lifecycle.v1"
  generatedAt: string
  scope: {
    siteId: string | null
    siteName: string | null
    siteCode: string | null
    role: string
  }
  resources: Row[]
  eligibleUnits: Row[]
  eligibleResidents: Row[]
  holds: Row[]
  bookings: Row[]
  waitlist: Row[]
  tasks: Row[]
  blackouts: Row[]
}

type Receipt = {
  entityType: "hold" | "waitlist" | "reservation" | "blackout" | "resource"
  entityId: string
  version: number
  state: string
  replayed: boolean
  holdId?: string
  reservationId?: string
  waitlistEntryId?: string
  blackoutId?: string
  expiresAt?: string
}

type Locale = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    title: "Rezervasyon ve tesis kullanımı",
    subtitle:
      "Uygunluğu görün, kuralları okuyun, güvenli bir süre tutun ve sonucu kalıcı kayıttan doğrulayın.",
    authoritative: "Doğrulandı",
    refresh: "Yenile",
    loading: "Rezervasyonlar yükleniyor…",
    unavailable: "Çevrimiçi rezervasyon şu anda kullanılamıyor.",
    configure:
      "Lütfen rezervasyon için site yönetim ofisiyle iletişime geçin.",
    stale: "Veri eski olabilir",
    fresh: "Güncel",
    lastSync: "Son yenileme",
    resources: "Rezervasyon yapılabilir alanlar",
    noResources: "Yetkinize uygun açık bir alan bulunamadı.",
    create: "Yeni rezervasyon",
    resource: "Alan / hizmet",
    unit: "Daire",
    noUnits: "Bu alan için yetkili bir daire bulunamadı.",
    resident: "Sakin",
    noResidents: "Bu daire için aktif ve yetkili bir sakin bulunamadı.",
    party: "Kişi sayısı",
    start: "Başlangıç",
    end: "Bitiş",
    timezone: "Saat dilimi: Europe/Istanbul",
    waitlist: "Yer yoksa bekleme listesine katıl",
    guest: "Misafir / sakin adı",
    notes: "Not",
    hold: "Bu zamanı ayır",
    commit: "Rezervasyonu kesinleştir",
    holdReady: "Süre geçici olarak tutuldu. Süre dolmadan kesinleştirin.",
    activeHolds: "Kalıcı süre tutmaları",
    inactiveHold: "Bu süre tutması artık aktif değil.",
    waitlisted: "Kapasite dolu; istek sıralı bekleme listesine kaydedildi.",
    persisted: "Yetkili kayıttan yeniden okunarak doğrulandı",
    notVerified: "Komut döndü ancak kayıt yeniden okuma sırasında bulunamadı.",
    replayed: "Aynı istek güvenli şekilde tekrarlandı.",
    bookings: "Rezervasyonlar",
    noBookings: "Yetki alanınızda rezervasyon yok.",
    rules: "Kurallar ve ücretler",
    approval: "Onay",
    payment: "Ödeme",
    deposit: "Kaution / depozito",
    capacity: "Kapasite",
    duration: "Süre",
    minutes: "dk",
    actions: "İşlemler",
    reason: "İşlem nedeni",
    approve: "Onayla",
    reject: "Reddet",
    cancel: "İptal et",
    checkIn: "Giriş yapıldı",
    complete: "Tamamla",
    noShow: "Gelmedi",
    revoke: "Erişimi geri al",
    reschedule: "Yeniden planla",
    finance: "Ödeme/depozito durumunu kaydet",
    manualRequired: "Manuel gerekli",
    providerReady: "Sağlayıcıya hazır",
    manualVerified: "Manuel doğrulandı",
    waived: "Muaf tutuldu",
    notRequired: "Gerekli değil",
    unavailableState: "Kullanılamıyor",
    waitlistTitle: "Bekleme listesi",
    promote: "Sıradakini güvenli şekilde teklif et",
    blackouts: "Bakım ve kapatma dönemleri",
    blackoutCreate: "Kapatma ekle",
    blackoutReason: "Kapatma nedeni",
    maintenance: "Bakım",
    commissioning: "Devreye alma",
    safety: "Güvenlik",
    admin: "Yönetim",
    pending: "İşlem sürüyor…",
    timeout:
      "Yanıt süresi doldu. Sonuç belirsiz olabilir; aynı istek anahtarı korunarak kayıt yeniden okunuyor.",
    invalid: "Lütfen gerekli alanları kontrol edin.",
    forbidden: "Bu işlem rolünüz veya birim kapsamınız için izinli değil.",
    conflict:
      "Kayıt başka bir işlemle değişti. Güncel veriyi okuyup tekrar değerlendirin.",
    capacityConflict:
      "Bu süre için kapasite kalmadı veya tampon süre çakışıyor.",
    blackoutConflict: "Alan bakımda, kapalı veya henüz devreye alınmadı.",
    expired: "Geçici tutma süresi doldu. Yeni bir süre tutun.",
    genericError: "İşlem tamamlanamadı; hiçbir başarı kaydı gösterilmedi.",
    noCharge: "Ücret yok",
    estimate: "örnek tahmin",
    selectResource: "Alan seçin",
    selectUnit: "Daire seçin",
    selectResident: "Sakin seçin",
    ref: "Referans",
  },
  en: {
    title: "Booking and shared facilities",
    subtitle:
      "Check eligibility, read the rules, hold a slot safely, and verify the outcome from persisted records.",
    authoritative: "Verified",
    refresh: "Refresh",
    loading: "Loading bookings…",
    unavailable: "Online booking isn't available yet.",
    configure:
      "Please contact the site office to make a reservation.",
    stale: "Data may be stale",
    fresh: "Current",
    lastSync: "Last refresh",
    resources: "Bookable resources",
    noResources: "No open resource is available in your scope.",
    create: "New booking",
    resource: "Resource / service",
    unit: "Unit",
    noUnits: "No authorized unit is available for this resource.",
    resident: "Resident",
    noResidents: "No active authorized resident is available for this unit.",
    party: "Party size",
    start: "Start",
    end: "End",
    timezone: "Time zone: Europe/Istanbul",
    waitlist: "Join the waitlist if full",
    guest: "Guest / resident name",
    notes: "Notes",
    hold: "Reserve this slot",
    commit: "Confirm booking",
    holdReady: "The slot is held temporarily. Confirm it before it expires.",
    activeHolds: "Persisted slot holds",
    inactiveHold: "This slot hold is no longer active.",
    waitlisted:
      "Capacity is full; the request was stored in the ordered waitlist.",
    persisted: "Verified by re-reading the authoritative record",
    notVerified:
      "The command returned, but its record was not found during the authoritative reload.",
    replayed: "The same request was replayed safely.",
    bookings: "Bookings",
    noBookings: "No booking is visible in your scope.",
    rules: "Rules & fees",
    approval: "Approval",
    payment: "Payment",
    deposit: "Deposit",
    capacity: "Capacity",
    duration: "Duration",
    minutes: "min",
    actions: "Actions",
    reason: "Action reason",
    approve: "Approve",
    reject: "Reject",
    cancel: "Cancel",
    checkIn: "Check in",
    complete: "Complete",
    noShow: "No-show",
    revoke: "Revoke access",
    reschedule: "Reschedule",
    finance: "Save payment/deposit state",
    manualRequired: "Manual required",
    providerReady: "Provider-ready",
    manualVerified: "Manually verified",
    waived: "Waived",
    notRequired: "Not required",
    unavailableState: "Unavailable",
    waitlistTitle: "Waitlist",
    promote: "Offer safely to the next entry",
    blackouts: "Maintenance and closure periods",
    blackoutCreate: "Add closure",
    blackoutReason: "Closure reason",
    maintenance: "Maintenance",
    commissioning: "Commissioning",
    safety: "Safety",
    admin: "Administration",
    pending: "Working…",
    timeout:
      "The request timed out. Its result may be unknown; the same request key is retained while records reload.",
    invalid: "Check the required fields.",
    forbidden: "Your role or unit scope does not allow this action.",
    conflict:
      "Another action changed this record. Review the refreshed version before trying again.",
    capacityConflict:
      "No capacity remains for this period, or its buffer overlaps.",
    blackoutConflict:
      "The resource is under maintenance, closed, or not commissioned.",
    expired: "The temporary hold expired. Create a new hold.",
    genericError: "The action did not complete; no success is being shown.",
    noCharge: "No charge",
    estimate: "demo estimate",
    selectResource: "Select a resource",
    selectUnit: "Select a unit",
    selectResident: "Select a resident",
    ref: "Ref.",
  },
  de: {
    title: "Buchung und Gemeinschaftsangebote",
    subtitle:
      "Berechtigung prüfen, Regeln lesen, Termin sicher halten und das Ergebnis aus dem gespeicherten Datensatz bestätigen.",
    authoritative: "Bestätigt",
    refresh: "Aktualisieren",
    loading: "Buchungen werden geladen…",
    unavailable: "Online-Buchung ist derzeit nicht verfügbar.",
    configure:
      "Bitte wenden Sie sich für eine Reservierung an das Verwaltungsbüro.",
    stale: "Daten können veraltet sein",
    fresh: "Aktuell",
    lastSync: "Letzte Aktualisierung",
    resources: "Buchbare Angebote",
    noResources: "Kein offenes Angebot im eigenen Berechtigungsbereich.",
    create: "Neue Buchung",
    resource: "Angebot",
    unit: "Wohnung",
    noUnits: "Für dieses Angebot ist keine berechtigte Wohnung verfügbar.",
    resident: "Bewohner",
    noResidents: "Für diese Wohnung ist kein aktiver berechtigter Bewohner verfügbar.",
    party: "Personenzahl",
    start: "Beginn",
    end: "Ende",
    timezone: "Zeitzone: Europe/Istanbul",
    waitlist: "Bei Belegung auf die Warteliste",
    guest: "Gast / Bewohner",
    notes: "Notiz",
    hold: "Diesen Termin reservieren",
    commit: "Buchung bestätigen",
    holdReady:
      "Der Termin ist vorübergehend gehalten. Bitte vor Ablauf bestätigen.",
    activeHolds: "Gespeicherte Terminreservierungen",
    inactiveHold: "Diese Terminreservierung ist nicht mehr aktiv.",
    waitlisted:
      "Die Kapazität ist belegt; die Anfrage wurde geordnet vorgemerkt.",
    persisted: "Durch erneutes Lesen des maßgeblichen Datensatzes bestätigt",
    notVerified:
      "Der Befehl wurde beantwortet, der Datensatz war beim erneuten Lesen aber nicht auffindbar.",
    replayed: "Dieselbe Anfrage wurde sicher wiederholt.",
    bookings: "Buchungen",
    noBookings: "Keine Buchung im eigenen Berechtigungsbereich.",
    rules: "Regeln & Gebühren",
    approval: "Freigabe",
    payment: "Zahlung",
    deposit: "Kaution",
    capacity: "Kapazität",
    duration: "Dauer",
    minutes: "Min.",
    actions: "Aktionen",
    reason: "Begründung",
    approve: "Freigeben",
    reject: "Ablehnen",
    cancel: "Stornieren",
    checkIn: "Einchecken",
    complete: "Abschließen",
    noShow: "Nicht erschienen",
    revoke: "Zugang entziehen",
    reschedule: "Verschieben",
    finance: "Zahlungs-/Kautionsstatus speichern",
    manualRequired: "Manuell erforderlich",
    providerReady: "Anbieterbereit",
    manualVerified: "Manuell geprüft",
    waived: "Erlassen",
    notRequired: "Nicht erforderlich",
    unavailableState: "Nicht verfügbar",
    waitlistTitle: "Warteliste",
    promote: "Nächsten Eintrag sicher anbieten",
    blackouts: "Wartungs- und Sperrzeiten",
    blackoutCreate: "Sperrzeit anlegen",
    blackoutReason: "Grund der Sperre",
    maintenance: "Wartung",
    commissioning: "Inbetriebnahme",
    safety: "Sicherheit",
    admin: "Verwaltung",
    pending: "Wird verarbeitet…",
    timeout:
      "Zeitüberschreitung. Das Ergebnis kann unbekannt sein; derselbe Anfrageschlüssel bleibt beim erneuten Lesen erhalten.",
    invalid: "Bitte Pflichtfelder prüfen.",
    forbidden: "Rolle oder Einheitsumfang erlauben diese Aktion nicht.",
    conflict:
      "Der Datensatz wurde parallel geändert. Bitte die aktualisierte Version prüfen.",
    capacityConflict:
      "Keine Kapazität oder Überschneidung mit einer Pufferzeit.",
    blackoutConflict:
      "Das Angebot ist in Wartung, gesperrt oder nicht in Betrieb.",
    expired: "Die Haltefrist ist abgelaufen. Bitte neu anfragen.",
    genericError:
      "Die Aktion wurde nicht abgeschlossen; es wird kein Erfolg angezeigt.",
    noCharge: "Keine Gebühr",
    estimate: "Beispielwert",
    selectResource: "Angebot auswählen",
    selectUnit: "Wohnung auswählen",
    selectResident: "Bewohner auswählen",
    ref: "Ref.",
  },
  ru: {
    title: "Бронирование и общие зоны",
    subtitle:
      "Проверьте доступ, правила и стоимость, безопасно удержите время и подтвердите результат по сохранённой записи.",
    authoritative: "Подтверждено",
    refresh: "Обновить",
    loading: "Загружаем бронирования…",
    unavailable: "Онлайн-бронирование сейчас недоступно.",
    configure:
      "Пожалуйста, свяжитесь с офисом для бронирования.",
    stale: "Данные могут устареть",
    fresh: "Актуально",
    lastSync: "Последнее обновление",
    resources: "Доступные объекты",
    noResources: "Нет открытых объектов в вашей области доступа.",
    create: "Новое бронирование",
    resource: "Объект / услуга",
    unit: "Квартира",
    noUnits: "Для этого объекта нет доступной квартиры в вашей области.",
    resident: "Житель",
    noResidents: "Для этой квартиры нет активного доступного жителя.",
    party: "Количество человек",
    start: "Начало",
    end: "Окончание",
    timezone: "Часовой пояс: Europe/Istanbul",
    waitlist: "Добавить в лист ожидания, если занято",
    guest: "Гость / житель",
    notes: "Примечание",
    hold: "Забронировать это время",
    commit: "Подтвердить бронирование",
    holdReady: "Время временно удерживается. Подтвердите до истечения срока.",
    activeHolds: "Сохранённые удержания времени",
    inactiveHold: "Это удержание времени больше не активно.",
    waitlisted: "Мест нет; запрос сохранён в упорядоченном листе ожидания.",
    persisted: "Подтверждено повторным чтением записи из источника истины",
    notVerified:
      "Команда вернулась, но запись не найдена при повторном чтении.",
    replayed: "Тот же запрос безопасно повторён.",
    bookings: "Бронирования",
    noBookings: "В вашей области доступа нет бронирований.",
    rules: "Правила и сборы",
    approval: "Согласование",
    payment: "Оплата",
    deposit: "Депозит",
    capacity: "Вместимость",
    duration: "Длительность",
    minutes: "мин",
    actions: "Действия",
    reason: "Причина",
    approve: "Согласовать",
    reject: "Отклонить",
    cancel: "Отменить",
    checkIn: "Отметить вход",
    complete: "Завершить",
    noShow: "Не явился",
    revoke: "Отозвать доступ",
    reschedule: "Перенести",
    finance: "Сохранить статус оплаты/депозита",
    manualRequired: "Нужно вручную",
    providerReady: "Готово к провайдеру",
    manualVerified: "Проверено вручную",
    waived: "Отменено по решению",
    notRequired: "Не требуется",
    unavailableState: "Недоступно",
    waitlistTitle: "Лист ожидания",
    promote: "Безопасно предложить следующему",
    blackouts: "Периоды обслуживания и закрытия",
    blackoutCreate: "Добавить закрытие",
    blackoutReason: "Причина закрытия",
    maintenance: "Обслуживание",
    commissioning: "Ввод в эксплуатацию",
    safety: "Безопасность",
    admin: "Администрация",
    pending: "Выполняется…",
    timeout:
      "Время ожидания истекло. Результат может быть неизвестен; тот же ключ запроса сохранён при обновлении записей.",
    invalid: "Проверьте обязательные поля.",
    forbidden: "Роль или область квартиры не разрешает это действие.",
    conflict: "Запись изменена параллельно. Проверьте обновлённую версию.",
    capacityConflict:
      "Нет свободной вместимости или пересекается буферное время.",
    blackoutConflict:
      "Объект закрыт, обслуживается или не введён в эксплуатацию.",
    expired: "Срок удержания истёк. Создайте новое удержание.",
    genericError: "Действие не завершено; успех не отображается.",
    noCharge: "Без оплаты",
    estimate: "пример",
    selectResource: "Выберите объект",
    selectUnit: "Выберите квартиру",
    selectResident: "Выберите жителя",
    ref: "Ном.",
  },
} as const

const stateLabels: Record<Locale, Record<string, string>> = {
  tr: {
    active: "Aktif",
    available: "Açık",
    held: "Tutuldu",
    waiting: "Bekliyor",
    offered: "Teklif edildi",
    pending: "Bekliyor",
    pending_approval: "Onay bekliyor",
    approved: "Onaylandı",
    confirmed: "Kesinleşti",
    checked_in: "Giriş yapıldı",
    completed: "Tamamlandı",
    cancelled: "İptal edildi",
    rejected: "Reddedildi",
    no_show: "Gelmedi",
    revoked: "Geri alındı",
    manual_required: "Manuel gerekli",
    provider_ready: "Sağlayıcıya hazır",
    manual_verified: "Manuel doğrulandı",
    not_required: "Gerekli değil",
    unavailable: "Kullanılamıyor",
    commissioned: "Devrede",
    commissioning: "Devreye alınıyor",
    maintenance: "Bakım",
    expired: "Süresi doldu",
    converted: "Rezervasyona dönüştü",
    unknown: "Bilinmeyen durum",
  },
  en: {
    active: "Active",
    available: "Available",
    held: "Held",
    waiting: "Waiting",
    offered: "Offered",
    pending: "Pending",
    pending_approval: "Pending approval",
    approved: "Approved",
    confirmed: "Confirmed",
    checked_in: "Checked in",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected",
    no_show: "No-show",
    revoked: "Revoked",
    manual_required: "Manual required",
    provider_ready: "Provider-ready",
    manual_verified: "Manually verified",
    not_required: "Not required",
    unavailable: "Unavailable",
    commissioned: "Commissioned",
    commissioning: "Commissioning",
    maintenance: "Maintenance",
    expired: "Expired",
    converted: "Converted to booking",
    unknown: "Unknown state",
  },
  de: {
    active: "Aktiv",
    available: "Verfügbar",
    held: "Gehalten",
    waiting: "Wartet",
    offered: "Angeboten",
    pending: "Ausstehend",
    pending_approval: "Freigabe ausstehend",
    approved: "Freigegeben",
    confirmed: "Bestätigt",
    checked_in: "Eingecheckt",
    completed: "Abgeschlossen",
    cancelled: "Storniert",
    rejected: "Abgelehnt",
    no_show: "Nicht erschienen",
    revoked: "Entzogen",
    manual_required: "Manuell erforderlich",
    provider_ready: "Anbieterbereit",
    manual_verified: "Manuell geprüft",
    not_required: "Nicht erforderlich",
    unavailable: "Nicht verfügbar",
    commissioned: "In Betrieb",
    commissioning: "Inbetriebnahme",
    maintenance: "Wartung",
    expired: "Abgelaufen",
    converted: "In Buchung umgewandelt",
    unknown: "Unbekannter Status",
  },
  ru: {
    active: "Активно",
    available: "Доступно",
    held: "Удерживается",
    waiting: "Ожидает",
    offered: "Предложено",
    pending: "Ожидает",
    pending_approval: "Ожидает согласования",
    approved: "Согласовано",
    confirmed: "Подтверждено",
    checked_in: "Вход отмечен",
    completed: "Завершено",
    cancelled: "Отменено",
    rejected: "Отклонено",
    no_show: "Не явился",
    revoked: "Отозвано",
    manual_required: "Нужно вручную",
    provider_ready: "Готово к провайдеру",
    manual_verified: "Проверено вручную",
    not_required: "Не требуется",
    unavailable: "Недоступно",
    commissioned: "Введено",
    commissioning: "Вводится",
    maintenance: "Обслуживание",
    expired: "Истекло",
    converted: "Преобразовано в бронирование",
    unknown: "Неизвестный статус",
  },
}

function localeOf(value: string): Locale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}
function text(row: Row | undefined, key: string, fallback = "-") {
  const value = row?.[key]
  return typeof value === "string" && value ? value : fallback
}
function number(row: Row | undefined, key: string, fallback = 0) {
  const value = row?.[key]
  return typeof value === "number" ? value : fallback
}
function stateLabel(value: string, locale: Locale) {
  return stateLabels[locale][value] ?? stateLabels[locale].unknown
}
function variant(value: string) {
  if (
    [
      "confirmed",
      "completed",
      "approved",
      "active",
      "commissioned",
      "manual_verified",
    ].includes(value)
  )
    return "success"
  if (
    ["cancelled", "rejected", "no_show", "revoked", "unavailable"].includes(
      value
    )
  )
    return "danger"
  if (
    [
      "pending",
      "pending_approval",
      "waiting",
      "held",
      "maintenance",
      "commissioning",
    ].includes(value)
  )
    return "warning"
  return "info"
}
function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value
}
function friendlyRef(value: string) {
  const compact = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  return compact ? `#${compact.slice(0, 6)}` : "—"
}

const resourceCategoryLabels: Record<Locale, Record<string, string>> = {
  tr: {
    spa_treatment: "Spa bakımı", spa_room: "Spa odası", sauna: "Sauna", steam_room: "Buhar odası",
    sports_court: "Spor sahası", game_room: "Oyun odası", event_area: "Etkinlik alanı", shuttle: "Servis",
    shared_facility: "Ortak alan", move_loading_slot: "Taşınma yükleme alanı", handover_appointment: "Konut teslim randevusu",
  },
  en: {
    spa_treatment: "Spa treatment", spa_room: "Spa room", sauna: "Sauna", steam_room: "Steam room",
    sports_court: "Sports court", game_room: "Game room", event_area: "Event area", shuttle: "Shuttle",
    shared_facility: "Shared facility", move_loading_slot: "Move loading slot", handover_appointment: "Handover appointment",
  },
  de: {
    spa_treatment: "Spa-Anwendung", spa_room: "Spa-Raum", sauna: "Sauna", steam_room: "Dampfbad",
    sports_court: "Sportplatz", game_room: "Spielzimmer", event_area: "Eventbereich", shuttle: "Shuttle",
    shared_facility: "Gemeinschaftsbereich", move_loading_slot: "Umzugs-Ladezone", handover_appointment: "Wohnungsübergabe-Termin",
  },
  ru: {
    spa_treatment: "Спа-процедура", spa_room: "Спа-комната", sauna: "Сауна", steam_room: "Парная",
    sports_court: "Спортивная площадка", game_room: "Игровая комната", event_area: "Зона мероприятий", shuttle: "Шаттл",
    shared_facility: "Общая зона", move_loading_slot: "Зона погрузки при переезде", handover_appointment: "Встреча передачи жилья",
  },
}

const BILINGUAL_SEPARATOR = /\s[–-]\s|\s\/\s/

// Some resource names are stored bilingually as "Türkçe - English". Show only the
// active locale's half so EN mode does not render both languages at once.
function pickLocaleHalf(raw: string, locale: Locale): string {
  const parts = raw.split(BILINGUAL_SEPARATOR).map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) return locale === "tr" ? parts[0] : parts[parts.length - 1]
  return raw
}
function localizeResourceName(item: Row, locale: Locale): string {
  const raw = text(item, "name", "")
  const category = text(item, "category", "")
  const categoryLabel = resourceCategoryLabels[locale][category]
  const parts = raw.split(BILINGUAL_SEPARATOR).map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) {
    if (locale === "tr") return parts[0]
    if (locale === "en") return parts[parts.length - 1]
    return categoryLabel ?? parts[parts.length - 1]
  }
  if (categoryLabel && (raw === categoryLabel || raw === resourceCategoryLabels.en[category])) {
    return categoryLabel
  }
  return raw || categoryLabel || "-"
}
function resourceTypeLabel(item: Row, locale: Locale): string {
  const category = text(item, "category", "")
  return resourceCategoryLabels[locale][category] ?? text(item, "typeName", text(item, "category"))
}
function resourceDisplay(item: Row, locale: Locale): string {
  const name = localizeResourceName(item, locale)
  const type = resourceTypeLabel(item, locale)
  return name === type ? name : `${name} · ${type}`
}
function sanitizeDescription(value: string): string {
  return value
    .replace(/\bUC\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[·:;,\-–]\s*/, "")
    .trim()
}
function feeText(truth: string, amountTry: number, t: (typeof copy)[Locale]): string {
  if (truth === "not_required") return t.notRequired
  if (truth === "waived") return t.waived
  if (truth === "unavailable") return t.unavailableState
  return amountTry > 0 ? `${formatDual(amountTry)} · ${t.estimate}` : t.noCharge
}
function localIstanbul(minutesFromNow: number) {
  const date = new Date(Date.now() + (180 + minutesFromNow) * 60_000)
  date.setUTCSeconds(0, 0)
  return date.toISOString().slice(0, 16)
}
function toIstanbulLocal(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? new Date(date.getTime() + 180 * 60_000).toISOString().slice(0, 16)
    : ""
}
function addIstanbulMinutes(value: string, minutes: number) {
  const date = new Date(`${value}:00+03:00`)
  return Number.isFinite(date.getTime())
    ? new Date(date.getTime() + (180 + minutes) * 60_000)
        .toISOString()
        .slice(0, 16)
    : ""
}
function istanbulIso(value: string) {
  return value ? new Date(`${value}:00+03:00`).toISOString() : ""
}
function key() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )
}
function formatDate(value: string, locale: Locale) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Istanbul",
      }).format(date)
    : "-"
}

function errorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const error = (payload as { error?: unknown }).error
  return error &&
    typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string"
    ? String((error as { code: string }).code)
    : null
}

function localizedError(code: string | null, locale: Locale) {
  const t = copy[locale]
  if (
    code === "BOOKING_CONFIGURATION_UNAVAILABLE" ||
    code === "BOOKING_BACKEND_UNAVAILABLE" ||
    code === "BOOKING_DATABASE_UNAVAILABLE"
  )
    return `${t.unavailable} ${t.configure}`
  if (code === "BOOKING_FORBIDDEN" || code === "BOOKING_AUTH_REQUIRED")
    return t.forbidden
  if (
    code === "BOOKING_VERSION_CONFLICT" ||
    code === "BOOKING_IDEMPOTENCY_CONFLICT"
  )
    return t.conflict
  if (code === "BOOKING_CAPACITY_CONFLICT") return t.capacityConflict
  if (code === "BOOKING_HOLD_EXPIRED") return t.expired
  if (
    code === "BOOKING_VALIDATION_FAILED" ||
    code === "BOOKING_REQUEST_INVALID"
  )
    return t.invalid
  if (code === "BOOKING_INVALID_STATE") return t.blackoutConflict
  return t.genericError
}

class LocalizedBookingError extends Error {}

export function BookingLifecycleExperience() {
  const locale = localeOf(useLocale())
  const t = copy[locale]
  const user = useUser()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loadState, setLoadState] = useState<"loading" | "success" | "error">(
    "loading"
  )
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [persistence, setPersistence] = useState<
    "idle" | "verified" | "missing"
  >("idle")
  const [lastLoadedAt, setLastLoadedAt] = useState<number>(0)
  const [clock, setClock] = useState(() => Date.now())
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  )
  const [resourceId, setResourceId] = useState("")
  const [unitId, setUnitId] = useState("")
  const [residentId, setResidentId] = useState("")
  const [partySize, setPartySize] = useState(1)
  const [startsAt, setStartsAt] = useState(() => localIstanbul(60))
  const [endsAt, setEndsAt] = useState(() => localIstanbul(120))
  const [joinWaitlist, setJoinWaitlist] = useState(true)
  const [guestName, setGuestName] = useState("")
  const [notes, setNotes] = useState("")
  const [reason, setReason] = useState("")
  const [paymentState, setPaymentState] = useState("manual_required")
  const [depositState, setDepositState] = useState("manual_required")
  const [blackoutType, setBlackoutType] = useState("maintenance")
  const [rescheduleStartsAt, setRescheduleStartsAt] = useState("")
  const [rescheduleEndsAt, setRescheduleEndsAt] = useState("")
  const commandKeys = useRef(new Map<string, string>())

  const verify = useCallback((data: Workspace, receipt?: Receipt | null) => {
    if (!receipt) return
    const id =
      receipt.reservationId ??
      receipt.waitlistEntryId ??
      receipt.holdId ??
      receipt.blackoutId ??
      receipt.entityId
    const records =
      receipt.entityType === "reservation"
        ? data.bookings
        : receipt.entityType === "waitlist"
          ? data.waitlist
          : receipt.entityType === "hold"
            ? data.holds
            : receipt.entityType === "blackout"
              ? data.blackouts
              : data.resources
    setPersistence(
      records.some((item) => text(item, "id", "") === id)
        ? "verified"
        : "missing"
    )
  }, [])

  const load = useCallback(
    async (receipt?: Receipt | null) => {
      try {
        const response = await fetch("/api/site-management/booking-lifecycle", {
          cache: "no-store",
        })
        const payload = (await response
          .json()
          .catch(() => null)) as Workspace | null
        if (!response.ok || !payload)
          throw new LocalizedBookingError(
            localizedError(errorCode(payload), locale)
          )
        setWorkspace(payload)
        setLoadState("success")
        const loadedAt = Date.now()
        setLastLoadedAt(loadedAt)
        setClock(loadedAt)
        verify(payload, receipt)
        if (!resourceId && payload.resources[0])
          setResourceId(text(payload.resources[0], "id", ""))
        if (!unitId && payload.resources[0]) {
          const firstSiteId = text(payload.resources[0], "siteId", "")
          const firstUnit = payload.eligibleUnits.find(
            (item) => text(item, "siteId", "") === firstSiteId
          )
          if (firstUnit) {
            const nextUnitId = text(firstUnit, "id", "")
            setUnitId(nextUnitId)
            if (!residentId) {
              const firstResident = payload.eligibleResidents.find(
                (item) => text(item, "unitId", "") === nextUnitId
              )
              if (firstResident)
                setResidentId(text(firstResident, "id", ""))
            }
          }
        }
        return payload
      } catch (error) {
        setLoadState("error")
        setAnnouncement(
          error instanceof LocalizedBookingError
            ? error.message
            : t.genericError
        )
        return null
      }
    },
    [locale, residentId, resourceId, t.genericError, unitId, verify]
  )

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])
  useEffect(() => {
    const recover = () => {
      setOnline(navigator.onLine)
      setClock(Date.now())
      if (navigator.onLine) void load()
    }
    const visible = () => {
      if (document.visibilityState === "visible") void load()
    }
    const timer = window.setInterval(() => {
      setClock(Date.now())
      if (navigator.onLine && document.visibilityState === "visible")
        void load()
    }, 30_000)
    window.addEventListener("online", recover)
    window.addEventListener("offline", recover)
    document.addEventListener("visibilitychange", visible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("online", recover)
      window.removeEventListener("offline", recover)
      document.removeEventListener("visibilitychange", visible)
    }
  }, [load])
  useEffect(() => {
    if (!("BroadcastChannel" in window)) return
    const channel = new BroadcastChannel("cati-booking-lifecycle")
    channel.onmessage = () => void load()
    return () => channel.close()
  }, [load])

  const selectedResource = useMemo(
    () =>
      workspace?.resources.find((item) => text(item, "id", "") === resourceId),
    [resourceId, workspace?.resources]
  )
  const eligibleUnits = useMemo(() => {
    const siteId = text(selectedResource, "siteId", "")
    return (workspace?.eligibleUnits ?? []).filter(
      (item) => text(item, "siteId", "") === siteId
    )
  }, [selectedResource, workspace?.eligibleUnits])
  const eligibleResidents = useMemo(
    () =>
      (workspace?.eligibleResidents ?? []).filter(
        (item) => text(item, "unitId", "") === unitId
      ),
    [unitId, workspace?.eligibleResidents]
  )
  const stale = !online || !lastLoadedAt || clock - lastLoadedAt > 30_000
  const canCreate = hasAnyPermission(user.role, "calendar", ["create", "manage"])
  const canApprove = hasAnyPermission(user.role, "calendar", ["approve", "manage"])
  const canOperate = hasAnyPermission(user.role, "calendar", ["update", "manage"])
  const canAttend = canCreate || canOperate
  const canAdminister =
    hasAnyPermission(user.role, "calendar", ["manage"]) ||
    (canApprove && canOperate)
  const canFinance = hasAnyPermission(user.role, "finance", [
    "update",
    "approve",
    "manage",
  ])

  async function command(body: Row, identity: string): Promise<Receipt | null> {
    setPending(identity)
    setAnnouncement(null)
    setPersistence("idle")
    let commandKey = commandKeys.current.get(identity)
    if (!commandKey) {
      commandKey = key()
      commandKeys.current.set(identity, commandKey)
    }
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12_000)
    try {
      const response = await fetch("/api/site-management/booking-lifecycle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": commandKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload)
        throw new LocalizedBookingError(
          localizedError(errorCode(payload), locale)
        )
      const receipt = payload as Receipt
      commandKeys.current.delete(identity)
      setAnnouncement(receipt.replayed ? t.replayed : t.persisted)
      await load(receipt)
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("cati-booking-lifecycle")
        channel.postMessage({ type: "refresh" })
        channel.close()
      }
      return receipt
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setAnnouncement(t.timeout)
        await load()
      } else
        setAnnouncement(
          error instanceof LocalizedBookingError
            ? error.message
            : t.genericError
        )
      return null
    } finally {
      window.clearTimeout(timeout)
      setPending(null)
    }
  }

  async function createHold() {
    const receipt = await command(
      {
        action: "hold",
        resourceId,
        unitId,
        residentId,
        partySize,
        startsAt: istanbulIso(startsAt),
        endsAt: istanbulIso(endsAt),
        waitlistIfFull: joinWaitlist,
      },
      `hold:${resourceId}:${unitId}:${residentId}:${startsAt}:${endsAt}:${partySize}`
    )
    if (receipt?.entityType === "waitlist") setAnnouncement(t.waitlisted)
  }
  async function commitHold(hold: Row) {
    const holdId = text(hold, "id", "")
    const version = number(hold, "version", 1)
    if (!holdId) return
    const receipt = await command(
      {
        action: "commit",
        holdId,
        expectedVersion: version,
        guestName,
        notes,
      },
      `commit:${holdId}:${version}`
    )
    if (receipt) {
      setGuestName("")
      setNotes("")
    }
  }
  async function bookingAction(booking: Row, action: string, extra: Row = {}) {
    const id = text(booking, "id", "")
    const version = number(booking, "version", 1)
    await command(
      {
        action,
        reservationId: id,
        expectedVersion: version,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...extra,
      },
      `${action}:${id}:${version}:${JSON.stringify(extra)}`
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">{t.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loadState === "loading"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-60"
        >
          <RefreshCw
            className={
              loadState === "loading"
                ? "h-4 w-4 animate-spin motion-reduce:animate-none"
                : "h-4 w-4"
            }
          />
          {t.refresh}
        </button>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {loadState === "loading" && !workspace ? (
          <div className="flex min-h-16 items-center gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <Clock3 className="h-5 w-5" />
            {t.loading}
          </div>
        ) : null}
        {announcement ? (
          <div
            role={loadState === "error" ? "alert" : "status"}
            className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${loadState === "error" || persistence === "missing" ? "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200" : "border-primary/30 bg-primary/10 text-foreground"}`}
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{announcement}</span>
          </div>
        ) : null}
      </div>

      {!workspace ? null : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge variant={stale ? "warning" : "success"}>
              {stale ? t.stale : t.fresh}
            </StatusBadge>
            <StatusBadge variant="info">{t.authoritative}</StatusBadge>
            <span className="text-muted-foreground">
              {t.lastSync}: {formatDate(workspace.generatedAt, locale)}
            </span>
            {persistence === "verified" ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {t.persisted}
              </span>
            ) : null}
            {persistence === "missing" ? (
              <span className="font-bold text-rose-700">{t.notVerified}</span>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            {canCreate ? (
              <Card3D glow={false}>
                <h2 className="text-base font-black">{t.create}</h2>
                <form
                  className="mt-4 grid gap-4 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void createHold()
                  }}
                >
                  <label className="text-sm font-bold sm:col-span-2">
                    {t.resource}
                    <select
                      required
                      value={resourceId}
                      onChange={(event) => {
                        const nextResourceId = event.target.value
                        const nextResource = workspace.resources.find(
                          (item) => text(item, "id", "") === nextResourceId
                        )
                        const nextSiteId = text(nextResource, "siteId", "")
                        const nextUnit = workspace.eligibleUnits.find(
                          (item) => text(item, "siteId", "") === nextSiteId
                        )
                        const nextUnitId = nextUnit
                          ? text(nextUnit, "id", "")
                          : ""
                        const nextResident = workspace.eligibleResidents.find(
                          (item) => text(item, "unitId", "") === nextUnitId
                        )
                        setResourceId(nextResourceId)
                        setUnitId(nextUnitId)
                        setResidentId(
                          nextResident ? text(nextResident, "id", "") : ""
                        )
                        setEndsAt(
                          addIstanbulMinutes(
                            startsAt,
                            number(nextResource, "defaultDurationMinutes", 60)
                          )
                        )
                      }}
                      className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <option value="" disabled>
                        {workspace.resources.length ? t.selectResource : t.noResources}
                      </option>
                      {workspace.resources.map((item) => (
                        <option key={text(item, "id")} value={text(item, "id")}>
                          {resourceDisplay(item, locale)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-bold sm:col-span-2">
                    {t.unit}
                    <select
                      required
                      value={unitId}
                      onChange={(event) => {
                        const nextUnitId = event.target.value
                        const nextResident = workspace.eligibleResidents.find(
                          (item) => text(item, "unitId", "") === nextUnitId
                        )
                        setUnitId(nextUnitId)
                        setResidentId(
                          nextResident ? text(nextResident, "id", "") : ""
                        )
                      }}
                      className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <option value="" disabled>
                        {eligibleUnits.length ? t.selectUnit : t.noUnits}
                      </option>
                      {eligibleUnits.map((item) => (
                        <option key={text(item, "id")} value={text(item, "id")}>
                          {text(item, "label", shortId(text(item, "id")))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-bold sm:col-span-2">
                    {t.resident}
                    <select
                      data-testid="booking-resident-selector"
                      required
                      value={residentId}
                      onChange={(event) => setResidentId(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <option value="" disabled>
                        {eligibleResidents.length ? t.selectResident : t.noResidents}
                      </option>
                      {eligibleResidents.map((item) => (
                        <option
                          key={`${text(item, "unitId")}:${text(item, "id")}`}
                          value={text(item, "id")}
                        >
                          {text(item, "label", shortId(text(item, "id")))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-bold">
                    {t.party}
                    <input
                      type="number"
                      min={1}
                      max={500}
                      required
                      value={partySize}
                      onChange={(event) =>
                        setPartySize(Number(event.target.value))
                      }
                      className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    />
                  </label>
                  <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-bold text-foreground">{t.rules}</p>
                    <p className="mt-1">
                      {t.capacity}: {number(selectedResource, "capacity", 1)} ·{" "}
                      {t.duration}:{" "}
                      {number(
                        selectedResource,
                        "defaultDurationMinutes",
                        60
                      )}{" "}
                      {t.minutes}
                    </p>
                    <p>
                      {t.approval}:{" "}
                      {text(selectedResource, "approvalRequirement", "none") !==
                      "none"
                        ? stateLabel("pending_approval", locale)
                        : stateLabel("not_required", locale)}
                    </p>
                    <p>
                      {t.payment}:{" "}
                      {feeText(
                        text(selectedResource, "priceTruth", "manual_required"),
                        number(selectedResource, "capacity", 1) * 500,
                        t
                      )}{" "}
                      · {t.deposit}:{" "}
                      {feeText(
                        text(selectedResource, "depositTruth", "manual_required"),
                        number(selectedResource, "capacity", 1) * 2000,
                        t
                      )}
                    </p>
                  </div>
                  <label className="text-sm font-bold">
                    {t.start}
                    <input
                      type="datetime-local"
                      required
                      value={startsAt}
                      onChange={(event) => {
                        const nextStartsAt = event.target.value
                        setStartsAt(nextStartsAt)
                        setEndsAt(
                          addIstanbulMinutes(
                            nextStartsAt,
                            number(
                              selectedResource,
                              "defaultDurationMinutes",
                              60
                            )
                          )
                        )
                      }}
                      className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    />
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {t.timezone}
                    </span>
                  </label>
                  <label className="text-sm font-bold">
                    {t.end}
                    <input
                      type="datetime-local"
                      required
                      value={endsAt}
                      onChange={(event) => setEndsAt(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border p-3 text-sm font-bold sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={joinWaitlist}
                      onChange={(event) =>
                        setJoinWaitlist(event.target.checked)
                      }
                      className="h-5 w-5"
                    />
                    {t.waitlist}
                  </label>
                  <button
                    data-testid="booking-create-hold"
                    type="submit"
                    disabled={
                      Boolean(pending) ||
                      !resourceId ||
                      !unitId ||
                      !residentId ||
                      !online
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 sm:col-span-2"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {pending?.startsWith("hold:") ? t.pending : t.hold}
                  </button>
                </form>
                {workspace.holds.length ? (
                  <section className="mt-4 space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <h3 className="text-sm font-black">{t.activeHolds}</h3>
                    <label className="block text-sm font-bold">
                      {t.guest}
                      <input
                        value={guestName}
                        onChange={(event) => setGuestName(event.target.value)}
                        className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      />
                    </label>
                    <label className="block text-sm font-bold">
                      {t.notes}
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        className="mt-2 min-h-24 w-full rounded-xl border border-border bg-background p-3 font-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      />
                    </label>
                    <div className="space-y-2">
                      {workspace.holds.map((hold) => {
                        const holdId = text(hold, "id", "")
                        const status = text(hold, "status", "unknown")
                        const expiresAt = text(hold, "expiresAt", "")
                        const active =
                          status === "active" &&
                          new Date(expiresAt).getTime() > clock
                        const resource = workspace.resources.find(
                          (item) =>
                            text(item, "id", "") ===
                            text(hold, "resourceId", "")
                        )
                        return (
                          <article
                            key={holdId}
                            data-testid={`booking-hold-${holdId}`}
                            data-hold-active={active ? "true" : "false"}
                            className="rounded-xl border border-border bg-background/80 p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-bold">
                                  {resource ? localizeResourceName(resource, locale) : t.resource}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(text(hold, "startsAt", ""), locale)} –{" "}
                                  {formatDate(text(hold, "endsAt", ""), locale)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {shortId(holdId)} · {formatDate(expiresAt, locale)}
                                </p>
                              </div>
                              <StatusBadge variant={variant(active ? "active" : status)}>
                                {active
                                  ? stateLabel("active", locale)
                                  : stateLabel(
                                      status === "active" ? "expired" : status,
                                      locale
                                    )}
                              </StatusBadge>
                            </div>
                            {active ? (
                              <button
                                data-testid={`booking-hold-commit-${holdId}`}
                                type="button"
                                onClick={() => void commitHold(hold)}
                                disabled={Boolean(pending) || !online}
                                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-black text-white focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none disabled:opacity-50"
                              >
                                {pending?.startsWith(`commit:${holdId}:`)
                                  ? t.pending
                                  : t.commit}
                              </button>
                            ) : (
                              <p className="mt-2 text-xs font-bold text-muted-foreground">
                                {t.inactiveHold}
                              </p>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  </section>
                ) : null}
              </Card3D>
            ) : null}

            <Card3D glow={false}>
                <h2 className="text-base font-black">{t.resources}</h2>
                <div className="mt-4 space-y-3">
                  {workspace.resources.length ? (
                    workspace.resources.map((item) => (
                      <article
                        key={text(item, "id")}
                        className="rounded-xl border border-border bg-muted/20 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-black">{localizeResourceName(item, locale)}</h3>
                            <p className="text-xs text-muted-foreground">
                              {resourceTypeLabel(item, locale)} ·{" "}
                              {text(item, "timezone", "Europe/Istanbul")}
                            </p>
                          </div>
                          <StatusBadge
                            variant={variant(
                              text(item, "commissioningState", "available")
                            )}
                          >
                            {stateLabel(
                              text(item, "commissioningState", "available"),
                              locale
                            )}
                          </StatusBadge>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {sanitizeDescription(text(item, "description", "")) || t.rules}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-lg bg-background px-2 py-1">
                            <Users className="mr-1 inline h-3.5 w-3.5" />
                            {t.capacity} {number(item, "capacity", 1)}
                          </span>
                          <span className="rounded-lg bg-background px-2 py-1">
                            <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
                            {number(
                              item,
                              "defaultDurationMinutes",
                              60
                            )}{" "}
                            {t.minutes}
                          </span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                      {t.noResources}
                    </p>
                  )}
                </div>
            </Card3D>
          </div>

          <Card3D glow={false}>
            <h2 className="text-base font-black">{t.bookings}</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {workspace.bookings.length ? (
                workspace.bookings.map((booking) => {
                  const id = text(booking, "id", "")
                  const status = text(booking, "lifecycleStatus", "pending")
                  const version = number(booking, "version", 1)
                  const approvalState = text(
                    booking,
                    "approvalState",
                    "not_required"
                  )
                  const activeBooking = ["requested", "confirmed"].includes(
                    status
                  )
                  const canDecide =
                    canApprove &&
                    status === "requested" &&
                    ["pending_owner", "pending_manager"].includes(
                      approvalState
                    ) &&
                    (canOperate || approvalState === "pending_owner")
                  const canCheckIn = canAttend && status === "confirmed"
                  const canComplete = canOperate && status === "checked_in"
                  const canNoShow = canOperate && status === "confirmed"
                  const canRevoke =
                    canAdminister && ["confirmed", "checked_in"].includes(status)
                  const canChangeSchedule = canCreate && activeBooking
                  const canUpdateFinance = canFinance && activeBooking
                  const hasActions =
                    canDecide ||
                    canCheckIn ||
                    canComplete ||
                    canNoShow ||
                    canRevoke ||
                    canChangeSchedule ||
                    canUpdateFinance
                  return (
                    <article
                      key={id}
                      data-testid={`booking-row-${id}`}
                      data-booking-state={status}
                      className="min-w-0 rounded-2xl border border-border bg-muted/20 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-black break-words">
                            {pickLocaleHalf(text(booking, "resourceName", t.resource), locale)}
                          </h3>
                          <p className="text-xs text-muted-foreground" title={id}>
                            {t.ref} {friendlyRef(id)} · v{version}
                          </p>
                        </div>
                        <StatusBadge variant={variant(status)}>
                          {stateLabel(status, locale)}
                        </StatusBadge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="font-bold">{t.start}</dt>
                          <dd className="text-muted-foreground">
                            {formatDate(text(booking, "startsAt", ""), locale)}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-bold">{t.end}</dt>
                          <dd className="text-muted-foreground">
                            {formatDate(text(booking, "endsAt", ""), locale)}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-bold">{t.payment}</dt>
                          <dd>
                            <StatusBadge
                              variant={variant(
                                text(booking, "paymentState", "manual_required")
                              )}
                            >
                              {stateLabel(
                                text(
                                  booking,
                                  "paymentState",
                                  "manual_required"
                                ),
                                locale
                              )}
                            </StatusBadge>
                          </dd>
                        </div>
                        <div>
                          <dt className="font-bold">{t.deposit}</dt>
                          <dd>
                            <StatusBadge
                              variant={variant(
                                text(
                                  booking,
                                  "depositTruthState",
                                  "manual_required"
                                )
                              )}
                            >
                              {stateLabel(
                                text(
                                  booking,
                                  "depositTruthState",
                                  "manual_required"
                                ),
                                locale
                              )}
                            </StatusBadge>
                          </dd>
                        </div>
                      </dl>
                      {hasActions ? (
                      <details
                        className="mt-4"
                        onToggle={(event) => {
                          if (!event.currentTarget.open) return
                          setReason("")
                          setRescheduleStartsAt(
                            toIstanbulLocal(text(booking, "startsAt", ""))
                          )
                          setRescheduleEndsAt(
                            toIstanbulLocal(text(booking, "endsAt", ""))
                          )
                          setPaymentState(
                            text(booking, "paymentState", "manual_required")
                          )
                          setDepositState(
                            text(
                              booking,
                              "depositTruthState",
                              "manual_required"
                            )
                          )
                        }}
                      >
                        <summary className="cursor-pointer rounded-lg py-2 text-sm font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                          {t.actions}
                        </summary>
                        <div className="space-y-3 pt-2">
                          <label className="block text-xs font-bold">
                            {t.reason}
                            <input
                              value={reason}
                              onChange={(event) =>
                                setReason(event.target.value)
                              }
                              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {canDecide ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void bookingAction(booking, "decide", {
                                      decision: "approve",
                                    })
                                  }
                                  disabled={Boolean(pending)}
                                  className="min-h-11 rounded-xl bg-emerald-700 px-3 text-xs font-black text-white focus-visible:ring-2"
                                >
                                  {t.approve}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void bookingAction(booking, "decide", {
                                      decision: "reject",
                                    })
                                  }
                                  disabled={Boolean(pending) || !reason.trim()}
                                  className="min-h-11 rounded-xl border border-rose-500 px-3 text-xs font-black text-rose-700 focus-visible:ring-2"
                                >
                                  {t.reject}
                                </button>
                              </>
                            ) : null}
                            {canCheckIn ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void bookingAction(booking, "transition", {
                                      transition: "check_in",
                                    })
                                  }
                                  disabled={Boolean(pending)}
                                  className="min-h-11 rounded-xl border border-border px-3 text-xs font-black focus-visible:ring-2"
                                >
                                  {t.checkIn}
                                </button>
                            ) : null}
                            {canComplete ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void bookingAction(booking, "transition", {
                                      transition: "complete",
                                    })
                                  }
                                  disabled={Boolean(pending)}
                                  className="min-h-11 rounded-xl border border-border px-3 text-xs font-black focus-visible:ring-2"
                                >
                                  {t.complete}
                                </button>
                            ) : null}
                            {canNoShow ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void bookingAction(booking, "transition", {
                                      transition: "no_show",
                                    })
                                  }
                                  disabled={Boolean(pending)}
                                  className="min-h-11 rounded-xl border border-border px-3 text-xs font-black focus-visible:ring-2"
                                >
                                  {t.noShow}
                                </button>
                            ) : null}
                            {canRevoke ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void bookingAction(booking, "transition", {
                                      transition: "revoke_access",
                                    })
                                  }
                                  disabled={Boolean(pending) || !reason.trim()}
                                  className="min-h-11 rounded-xl border border-border px-3 text-xs font-black focus-visible:ring-2"
                                >
                                  {t.revoke}
                                </button>
                            ) : null}
                            {canChangeSchedule ? (
                              <>
                                <label className="text-xs font-bold">
                                  {t.start}
                                  <input
                                    data-testid={`booking-reschedule-start-${id}`}
                                    type="datetime-local"
                                    required
                                    value={rescheduleStartsAt}
                                    onChange={(event) =>
                                      setRescheduleStartsAt(event.target.value)
                                    }
                                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal"
                                  />
                                </label>
                                <label className="text-xs font-bold">
                                  {t.end}
                                  <input
                                    data-testid={`booking-reschedule-end-${id}`}
                                    type="datetime-local"
                                    required
                                    value={rescheduleEndsAt}
                                    onChange={(event) =>
                                      setRescheduleEndsAt(event.target.value)
                                    }
                                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal"
                                  />
                                </label>
                                <button
                                  data-testid={`booking-reschedule-${id}`}
                                  type="button"
                                  onClick={() =>
                                    void bookingAction(booking, "reschedule", {
                                      startsAt: istanbulIso(rescheduleStartsAt),
                                      endsAt: istanbulIso(rescheduleEndsAt),
                                    })
                                  }
                                  disabled={
                                    Boolean(pending) ||
                                    !reason.trim() ||
                                    !rescheduleStartsAt ||
                                    !rescheduleEndsAt
                                  }
                                  className="min-h-11 rounded-xl border border-border px-3 text-xs font-black focus-visible:ring-2"
                                >
                                  {t.reschedule}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void bookingAction(booking, "cancel")
                                  }
                                  disabled={Boolean(pending) || !reason.trim()}
                                  className="min-h-11 rounded-xl border border-rose-500 px-3 text-xs font-black text-rose-700 focus-visible:ring-2"
                                >
                                  {t.cancel}
                                </button>
                              </>
                            ) : null}
                          </div>
                          {canUpdateFinance ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <select
                                aria-label={t.payment}
                                value={paymentState}
                                onChange={(event) =>
                                  setPaymentState(event.target.value)
                                }
                                className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
                              >
                                <option value="manual_required">
                                  {t.manualRequired}
                                </option>
                                <option value="provider_ready">
                                  {t.providerReady}
                                </option>
                                <option value="manual_verified">
                                  {t.manualVerified}
                                </option>
                                <option value="waived">{t.waived}</option>
                                <option value="not_required">
                                  {t.notRequired}
                                </option>
                                <option value="unavailable">
                                  {t.unavailableState}
                                </option>
                              </select>
                              <select
                                aria-label={t.deposit}
                                value={depositState}
                                onChange={(event) =>
                                  setDepositState(event.target.value)
                                }
                                className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
                              >
                                <option value="manual_required">
                                  {t.manualRequired}
                                </option>
                                <option value="provider_ready">
                                  {t.providerReady}
                                </option>
                                <option value="manual_verified">
                                  {t.manualVerified}
                                </option>
                                <option value="waived">{t.waived}</option>
                                <option value="not_required">
                                  {t.notRequired}
                                </option>
                                <option value="unavailable">
                                  {t.unavailableState}
                                </option>
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  void bookingAction(booking, "finance", {
                                    paymentState,
                                    depositState,
                                  })
                                }
                                disabled={Boolean(pending) || !reason.trim()}
                                className="min-h-11 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground focus-visible:ring-2 sm:col-span-2"
                              >
                                {t.finance}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </details>
                      ) : null}
                    </article>
                  )
                })
              ) : (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground lg:col-span-2">
                  {t.noBookings}
                </p>
              )}
            </div>
          </Card3D>

          {workspace.waitlist.length ? (
            <Card3D glow={false}>
              <h2 className="text-base font-black">{t.waitlistTitle}</h2>
              <div className="mt-4 space-y-2">
                {workspace.waitlist.map((item) => (
                  <div
                    key={text(item, "id")}
                    className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold">
                        {pickLocaleHalf(
                          text(item, "resourceName", shortId(text(item, "resourceId"))),
                          locale
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(text(item, "startsAt", ""), locale)} ·{" "}
                        {stateLabel(text(item, "status", "waiting"), locale)}
                      </p>
                    </div>
                    {canAdminister ? (
                      <button
                        type="button"
                        onClick={() =>
                          void command(
                            {
                              action: "waitlist.promote",
                              resourceId: text(item, "resourceId"),
                            },
                            `promote:${text(item, "resourceId")}`
                          )
                        }
                        disabled={Boolean(pending)}
                        className="min-h-11 rounded-xl border border-border px-3 text-xs font-black focus-visible:ring-2"
                      >
                        {t.promote}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card3D>
          ) : null}

          {canAdminister ? (
            <Card3D glow={false}>
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className="text-base font-black">{t.blackouts}</h2>
              </div>
              <form
                className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
                onSubmit={(event) => {
                  event.preventDefault()
                  void command(
                    {
                      action: "blackout.create",
                      resourceId,
                      startsAt: istanbulIso(startsAt),
                      endsAt: istanbulIso(endsAt),
                      blackoutType,
                      reason: reason.trim(),
                    },
                    `blackout:${resourceId}:${startsAt}:${endsAt}:${blackoutType}`
                  )
                }}
              >
                <select
                  aria-label={t.resource}
                  required
                  value={resourceId}
                  onChange={(event) => setResourceId(event.target.value)}
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  {workspace.resources.map((item) => (
                    <option key={text(item, "id")} value={text(item, "id")}>
                      {text(item, "name")}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t.blackouts}
                  value={blackoutType}
                  onChange={(event) => setBlackoutType(event.target.value)}
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="maintenance">{t.maintenance}</option>
                  <option value="commissioning">{t.commissioning}</option>
                  <option value="safety">{t.safety}</option>
                  <option value="admin">{t.admin}</option>
                </select>
                <input
                  aria-label={t.start}
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <input
                  aria-label={t.end}
                  type="datetime-local"
                  required
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <input
                  aria-label={t.blackoutReason}
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <button
                  type="submit"
                  disabled={Boolean(pending) || !resourceId || !reason.trim()}
                  className="min-h-11 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground focus-visible:ring-2"
                >
                  {t.blackoutCreate}
                </button>
              </form>
              {workspace.blackouts.length ? (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {workspace.blackouts.map((item) => (
                    <div
                      key={text(item, "id")}
                      className="rounded-xl border border-border p-3 text-sm"
                    >
                      <div className="flex justify-between gap-2">
                        <strong>
                          {stateLabel(
                            text(item, "blackoutType", "maintenance"),
                            locale
                          )}
                        </strong>
                        <StatusBadge variant="warning">
                          {stateLabel(text(item, "status", "active"), locale)}
                        </StatusBadge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(text(item, "startsAt", ""), locale)} –{" "}
                        {formatDate(text(item, "endsAt", ""), locale)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card3D>
          ) : null}
        </>
      )}
    </div>
  )
}
