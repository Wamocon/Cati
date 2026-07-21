"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ClipboardCheck,
  Gauge,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react"
import { useLocale } from "next-intl"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"
import { formatDualFromCents } from "@/lib/currency"

type Locale = "tr" | "en" | "de" | "ru"
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }
type Row = Record<string, JsonValue>
type CandidateRelationship = {
  id: string
  unitId: string
  residentId: string
  relationship: string
  label: string
  startDate: string | null
  endDate: string | null
}
type CandidateReservation = {
  id: string
  siteId: string
  unitId: string
  residentId: string
  resourceId: string
  resourceName: string
  startsAt: string
  endsAt: string
  lifecycleStatus: string
  version: number
}
type CandidateDocument = {
  id: string
  siteId: string | null
  unitId: string | null
  residentId: string | null
  title: string
  category: string
}
type Capabilities = {
  canCreate: boolean
  canReschedule: boolean
  canCancel: boolean
  canOperate: boolean
  canPrepareAccess: boolean
  canApproveAccess: boolean
  canLinkDeposit: boolean
}
type Workspace = {
  generatedAt: string
  scope: {
    siteId: string | null
    role: string
    financeOnly: boolean
    capabilities: Capabilities
  }
  candidates: {
    relationships: CandidateRelationship[]
    reservations: CandidateReservation[]
    documents: CandidateDocument[]
  }
  appointments: Row[]
  checklistItems: Row[]
  evidence: Row[]
  meterReadings: Row[]
  conditionItems: Row[]
  turnoverWorkItems: Row[]
  accessRequests: Row[]
  depositSettlements: Row[]
  events: Row[]
}
type Receipt = {
  entityId: string
  appointmentId?: string
  version: number
  state: string
  replayed: boolean
}

class LocalizedHandoverError extends Error {
  constructor(readonly localizedMessage: string) {
    super("localized-handover-error")
  }
}

const copy = {
  tr: {
    title: "Taşınma ve teslim",
    body: "Randevu, kontrol listesi, sayaç, durum, kanıt referansı, anahtar/erişim hazırlığı ve devir işlerini tek kalıcı akışta yönetin.",
    refresh: "Yenile",
    source: "Doğrulandı",
    stale: "Veri eski olabilir",
    current: "Güncel",
    loading: "Teslim kayıtları yükleniyor…",
    unavailable:
      "Kalıcı teslim hizmeti hazır değil; sahte başarı gösterilmedi.",
    forbidden: "Bu işlem rolünüz veya daire kapsamınız için izinli değil.",
    conflict:
      "Kayıt başka bir işlemle değişti. Güncel sürüm yüklendi; tekrar değerlendirin.",
    invalid: "Gerekli alanları kontrol edin.",
    generic: "İşlem tamamlanamadı.",
    create: "Teslim randevusu oluştur",
    candidate: "Uygun rezervasyon ve sakin ilişkisi",
    noCandidate:
      "Uygun, onaylı rezervasyon ve aktif sakin ilişkisi bulunamadı.",
    moveIn: "Giriş / taşınma",
    moveOut: "Çıkış / taşınma",
    handover: "Konut teslimi",
    save: "Oluştur",
    appointments: "Randevular",
    empty: "Yetki alanınızda teslim randevusu yok.",
    start: "Başlangıç",
    end: "Bitiş",
    state: "Durum",
    actions: "İşlemler",
    reason: "Neden / not",
    reschedule: "Yeniden planla",
    cancel: "İptal et",
    prepare: "Hazırlığa al",
    ready: "Hazır işaretle",
    begin: "Başlat",
    complete: "Tamamla",
    checklist: "Kontrol listesi",
    item: "Kontrol maddesi",
    pending: "Bekliyor",
    completed: "Tamamlandı",
    blocked: "Engelli",
    notApplicable: "Uygulanmaz",
    update: "Kaydet",
    evidence: "Belge/kanıt referansı",
    document: "Belge kimliği",
    evidenceType: "Kanıt türü",
    meter: "Sayaç okuması",
    meterType: "Sayaç",
    reading: "Okuma",
    unit: "Birim",
    condition: "Konut durumu",
    area: "Alan",
    good: "İyi",
    fair: "Orta",
    damaged: "Hasarlı",
    notInspected: "İncelenmedi",
    access: "Anahtar ve erişim hazırlığı",
    accessTruth: "Gerçek durum",
    manualReady: "Manuel hazır",
    providerReady: "Sağlayıcıya hazır",
    revoked: "Geri alındı",
    humanApproval: "İnsan onayı verildi",
    accessWarning:
      "Bu işlem yalnızca hazırlık kaydıdır; bağlı donanım yoksa kapıyı açmaz.",
    turnover: "Temizlik / inceleme işi",
    workType: "İş türü",
    cleaning: "Temizlik",
    inspection: "İnceleme",
    repair: "Onarım",
    keyReturn: "Anahtar iadesi",
    accessRevocation: "Erişim iptali",
    due: "Son tarih",
    deposit: "Depozito kaydı",
    depositLink: "Mevcut depozito kaydını bağla",
    persisted: "Yetkili kayıttan yeniden okunarak doğrulandı",
    missing: "Komut döndü ancak kayıt yeniden okumada bulunamadı.",
    providerLimit:
      "Ödeme/iade ve fiziksel erişim sağlayıcıları bağlı değildir; yalnız manuel veya sağlayıcıya hazır durum kaydedilir.",
  },
  en: {
    title: "Move and handover",
    body: "Manage appointments, checklist, meters, condition, evidence references, key/access preparation, and turnover work in one persisted flow.",
    refresh: "Refresh",
    source: "Verified",
    stale: "Data may be stale",
    current: "Current",
    loading: "Loading handovers…",
    unavailable:
      "Persistent handover service is not ready; no fake success is shown.",
    forbidden: "Your role or unit scope does not allow this action.",
    conflict:
      "Another action changed this record. Review the refreshed version.",
    invalid: "Check the required fields.",
    generic: "The action did not complete.",
    create: "Create handover appointment",
    candidate: "Eligible reservation and resident relationship",
    noCandidate:
      "No eligible confirmed reservation with an active resident relationship.",
    moveIn: "Move-in",
    moveOut: "Move-out",
    handover: "Residential handover",
    save: "Create",
    appointments: "Appointments",
    empty: "No handover appointment is visible in your scope.",
    start: "Start",
    end: "End",
    state: "Status",
    actions: "Actions",
    reason: "Reason / notes",
    reschedule: "Reschedule",
    cancel: "Cancel",
    prepare: "Prepare",
    ready: "Mark ready",
    begin: "Start",
    complete: "Complete",
    checklist: "Checklist",
    item: "Checklist item",
    pending: "Pending",
    completed: "Completed",
    blocked: "Blocked",
    notApplicable: "Not applicable",
    update: "Save",
    evidence: "Document/evidence reference",
    document: "Document id",
    evidenceType: "Evidence type",
    meter: "Meter reading",
    meterType: "Meter",
    reading: "Reading",
    unit: "Unit",
    condition: "Property condition",
    area: "Area",
    good: "Good",
    fair: "Fair",
    damaged: "Damaged",
    notInspected: "Not inspected",
    access: "Key and access preparation",
    accessTruth: "Truth state",
    manualReady: "Manually ready",
    providerReady: "Provider-ready",
    revoked: "Revoked",
    humanApproval: "Human approval recorded",
    accessWarning:
      "This records preparation only; it does not open a door when no hardware provider is connected.",
    turnover: "Cleaning / inspection work",
    workType: "Work type",
    cleaning: "Cleaning",
    inspection: "Inspection",
    repair: "Repair",
    keyReturn: "Key return",
    accessRevocation: "Access revocation",
    due: "Due",
    deposit: "Deposit record",
    depositLink: "Link an existing deposit record",
    persisted: "Verified by re-reading the authoritative record",
    missing: "The command returned, but the record was not found on reload.",
    providerLimit:
      "Payment/refund and physical access providers are not connected; only manual or provider-ready states are recorded.",
  },
  de: {
    title: "Einzug, Auszug und Übergabe",
    body: "Termin, Checkliste, Zähler, Zustand, Nachweise, Schlüssel-/Zugangsvorbereitung und Folgearbeiten in einem gespeicherten Ablauf verwalten.",
    refresh: "Aktualisieren",
    source: "Bestätigt",
    stale: "Daten können veraltet sein",
    current: "Aktuell",
    loading: "Übergaben werden geladen…",
    unavailable:
      "Der dauerhafte Übergabedienst ist nicht bereit; kein Scheinerfolg.",
    forbidden: "Rolle oder Wohnungsumfang erlauben diese Aktion nicht.",
    conflict:
      "Der Datensatz wurde parallel geändert. Bitte die aktualisierte Version prüfen.",
    invalid: "Bitte Pflichtfelder prüfen.",
    generic: "Aktion nicht abgeschlossen.",
    create: "Übergabetermin anlegen",
    candidate: "Geeignete Buchung und Bewohnerbeziehung",
    noCandidate:
      "Keine bestätigte Buchung mit aktiver Bewohnerbeziehung verfügbar.",
    moveIn: "Einzug",
    moveOut: "Auszug",
    handover: "Wohnungsübergabe",
    save: "Anlegen",
    appointments: "Termine",
    empty: "Keine Übergabe im eigenen Berechtigungsbereich.",
    start: "Beginn",
    end: "Ende",
    state: "Status",
    actions: "Aktionen",
    reason: "Grund / Notiz",
    reschedule: "Verschieben",
    cancel: "Stornieren",
    prepare: "Vorbereiten",
    ready: "Als bereit markieren",
    begin: "Starten",
    complete: "Abschließen",
    checklist: "Checkliste",
    item: "Prüfpunkt",
    pending: "Ausstehend",
    completed: "Erledigt",
    blocked: "Blockiert",
    notApplicable: "Nicht relevant",
    update: "Speichern",
    evidence: "Dokument-/Nachweisreferenz",
    document: "Dokument-ID",
    evidenceType: "Nachweisart",
    meter: "Zählerstand",
    meterType: "Zähler",
    reading: "Stand",
    unit: "Einheit",
    condition: "Wohnungszustand",
    area: "Bereich",
    good: "Gut",
    fair: "Mittel",
    damaged: "Beschädigt",
    notInspected: "Nicht geprüft",
    access: "Schlüssel- und Zugangsvorbereitung",
    accessTruth: "Tatsächlicher Zustand",
    manualReady: "Manuell bereit",
    providerReady: "Anbieterbereit",
    revoked: "Entzogen",
    humanApproval: "Menschliche Freigabe dokumentiert",
    accessWarning:
      "Nur Vorbereitung: Ohne angebundenen Hardwareanbieter wird keine Tür geöffnet.",
    turnover: "Reinigung / Prüfung",
    workType: "Arbeitsart",
    cleaning: "Reinigung",
    inspection: "Prüfung",
    repair: "Reparatur",
    keyReturn: "Schlüsselrückgabe",
    accessRevocation: "Zugangsentzug",
    due: "Fällig",
    deposit: "Kautionsdatensatz",
    depositLink: "Vorhandene Kaution verknüpfen",
    persisted: "Durch erneutes Lesen des maßgeblichen Datensatzes bestätigt",
    missing:
      "Befehl beantwortet, Datensatz beim erneuten Lesen nicht gefunden.",
    providerLimit:
      "Zahlungs-/Erstattungs- und physische Zugangsanbieter sind nicht verbunden; nur manuelle oder anbieterbereite Zustände werden gespeichert.",
  },
  ru: {
    title: "Заезд, выезд и передача",
    body: "Управляйте встречей, чек-листом, счётчиками, состоянием, ссылками на доказательства, подготовкой ключей/доступа и последующими работами.",
    refresh: "Обновить",
    source: "Подтверждено",
    stale: "Данные могут устареть",
    current: "Актуально",
    loading: "Загружаем передачи…",
    unavailable:
      "Сервис постоянного хранения не готов; фиктивный успех не показывается.",
    forbidden: "Роль или область квартиры не разрешает действие.",
    conflict: "Запись изменена параллельно. Проверьте обновлённую версию.",
    invalid: "Проверьте обязательные поля.",
    generic: "Действие не завершено.",
    create: "Создать встречу передачи",
    candidate: "Подходящее бронирование и связь с жителем",
    noCandidate: "Нет подтверждённого бронирования с активной связью жителя.",
    moveIn: "Заезд",
    moveOut: "Выезд",
    handover: "Передача квартиры",
    save: "Создать",
    appointments: "Встречи",
    empty: "Нет встреч в вашей области доступа.",
    start: "Начало",
    end: "Окончание",
    state: "Статус",
    actions: "Действия",
    reason: "Причина / заметка",
    reschedule: "Перенести",
    cancel: "Отменить",
    prepare: "Подготовить",
    ready: "Отметить готовность",
    begin: "Начать",
    complete: "Завершить",
    checklist: "Чек-лист",
    item: "Пункт",
    pending: "Ожидает",
    completed: "Выполнено",
    blocked: "Заблокировано",
    notApplicable: "Не применяется",
    update: "Сохранить",
    evidence: "Ссылка на документ/доказательство",
    document: "ID документа",
    evidenceType: "Тип доказательства",
    meter: "Показание счётчика",
    meterType: "Счётчик",
    reading: "Показание",
    unit: "Единица",
    condition: "Состояние квартиры",
    area: "Зона",
    good: "Хорошо",
    fair: "Средне",
    damaged: "Повреждено",
    notInspected: "Не проверено",
    access: "Подготовка ключей и доступа",
    accessTruth: "Фактический статус",
    manualReady: "Готово вручную",
    providerReady: "Готово к провайдеру",
    revoked: "Отозвано",
    humanApproval: "Одобрено человеком",
    accessWarning:
      "Это только подготовка; без подключённого оборудования дверь не открывается.",
    turnover: "Уборка / осмотр",
    workType: "Тип работы",
    cleaning: "Уборка",
    inspection: "Осмотр",
    repair: "Ремонт",
    keyReturn: "Возврат ключа",
    accessRevocation: "Отзыв доступа",
    due: "Срок",
    deposit: "Запись депозита",
    depositLink: "Связать существующий депозит",
    persisted: "Подтверждено повторным чтением источника истины",
    missing: "Команда вернулась, но запись не найдена после обновления.",
    providerLimit:
      "Провайдеры оплаты/возврата и физического доступа не подключены; сохраняются только ручные или готовые к провайдеру статусы.",
  },
} as const

const optionCopy = {
  tr: {
    signature: "İmza",
    other: "Diğer",
    electricity: "Elektrik",
    water: "Su",
    gas: "Gaz",
    heat: "Isıtma",
    timeout: "İstek zaman aşımına uğradı; kayıtlar yeniden okunarak sonuç kontrol edildi.",
  },
  en: {
    signature: "Signature",
    other: "Other",
    electricity: "Electricity",
    water: "Water",
    gas: "Gas",
    heat: "Heat",
    timeout: "The request timed out; records were re-read to check the result.",
  },
  de: {
    signature: "Unterschrift",
    other: "Sonstiges",
    electricity: "Strom",
    water: "Wasser",
    gas: "Gas",
    heat: "Wärme",
    timeout: "Zeitüberschreitung; das Ergebnis wurde durch erneutes Lesen geprüft.",
  },
  ru: {
    signature: "Подпись",
    other: "Другое",
    electricity: "Электричество",
    water: "Вода",
    gas: "Газ",
    heat: "Отопление",
    timeout: "Время ожидания истекло; результат проверен повторным чтением записей.",
  },
} as const

function localeOf(value: string): Locale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}
function text(row: Row, key: string, fallback = "-") {
  const value = row[key]
  return typeof value === "string" && value ? value : fallback
}
function number(row: Row, key: string, fallback = 1) {
  const value = row[key]
  return typeof value === "number" ? value : fallback
}
function key() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `handover-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )
}
function localIstanbul(minutes: number) {
  const date = new Date(Date.now() + (180 + minutes) * 60_000)
  date.setUTCSeconds(0, 0)
  return date.toISOString().slice(0, 16)
}
function iso(value: string) {
  return new Date(`${value}:00+03:00`).toISOString()
}
function localInput(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return localIstanbul(60)
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(" ", "T")
}
function codeOf(value: unknown) {
  if (!value || typeof value !== "object") return null
  const error = (value as { error?: unknown }).error
  return error &&
    typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string"
    ? String((error as { code: string }).code)
    : null
}
function errorMessage(code: string | null, locale: Locale) {
  const t = copy[locale]
  if (code?.includes("BACKEND") || code?.includes("DATABASE"))
    return t.unavailable
  if (code?.includes("FORBIDDEN") || code?.includes("AUTH")) return t.forbidden
  if (code?.includes("VERSION") || code?.includes("IDEMPOTENCY"))
    return t.conflict
  if (code?.includes("INVALID_STATE")) return t.conflict
  if (code?.includes("VALIDATION") || code?.includes("REQUEST"))
    return t.invalid
  return t.generic
}
const statusCopy: Record<Locale, Record<string, string>> = {
  tr: {
    scheduled: "Planlandı",
    preparing: "Hazırlanıyor",
    ready: "Hazır",
    in_progress: "Devam ediyor",
    completed: "Tamamlandı",
    cancelled: "İptal edildi",
    pending: "Bekliyor",
    blocked: "Engelli",
    not_applicable: "Uygulanmaz",
    manual_ready: "Manuel hazır",
    provider_ready: "Sağlayıcıya hazır",
    revoked: "Geri alındı",
  },
  en: {
    scheduled: "Scheduled",
    preparing: "Preparing",
    ready: "Ready",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
    pending: "Pending",
    blocked: "Blocked",
    not_applicable: "Not applicable",
    manual_ready: "Manually ready",
    provider_ready: "Provider-ready",
    revoked: "Revoked",
  },
  de: {
    scheduled: "Geplant",
    preparing: "In Vorbereitung",
    ready: "Bereit",
    in_progress: "Läuft",
    completed: "Abgeschlossen",
    cancelled: "Storniert",
    pending: "Ausstehend",
    blocked: "Blockiert",
    not_applicable: "Nicht relevant",
    manual_ready: "Manuell bereit",
    provider_ready: "Anbieterbereit",
    revoked: "Entzogen",
  },
  ru: {
    scheduled: "Запланировано",
    preparing: "Подготовка",
    ready: "Готово",
    in_progress: "В процессе",
    completed: "Завершено",
    cancelled: "Отменено",
    pending: "Ожидает",
    blocked: "Заблокировано",
    not_applicable: "Не применимо",
    manual_ready: "Готово вручную",
    provider_ready: "Готово к провайдеру",
    revoked: "Отозвано",
  },
}
function statusLabel(status: string, locale: Locale) {
  return statusCopy[locale][status] ?? status.replaceAll("_", " ")
}
const checklistCopy: Record<Locale, Record<string, string>> = {
  tr: {
    identity_confirmed: "Kimlik doğrulandı",
    documents_reviewed: "Belgeler incelendi",
    access_prepared: "Erişim hazırlandı",
    meter_readings: "Sayaçlar kaydedildi",
    condition_recorded: "Konut durumu kaydedildi",
    keys_handed_over: "Anahtar teslimi",
    turnover_scheduled: "Devir işi planlandı",
    living_room: "Oturma odası",
    kitchen: "Mutfak",
    bathroom: "Banyo",
    bedroom: "Yatak odası",
    balcony: "Balkon",
    entrance: "Giriş",
  },
  en: {
    identity_confirmed: "Identity confirmed",
    documents_reviewed: "Documents reviewed",
    access_prepared: "Access prepared",
    meter_readings: "Meter readings recorded",
    condition_recorded: "Property condition recorded",
    keys_handed_over: "Keys handed over / returned",
    turnover_scheduled: "Turnover work scheduled",
    living_room: "Living room",
    kitchen: "Kitchen",
    bathroom: "Bathroom",
    bedroom: "Bedroom",
    balcony: "Balcony",
    entrance: "Entrance",
  },
  de: {
    identity_confirmed: "Identität bestätigt",
    documents_reviewed: "Dokumente geprüft",
    access_prepared: "Zugang vorbereitet",
    meter_readings: "Zählerstände erfasst",
    condition_recorded: "Wohnungszustand erfasst",
    keys_handed_over: "Schlüssel übergeben / zurückgenommen",
    turnover_scheduled: "Folgearbeit geplant",
    living_room: "Wohnzimmer",
    kitchen: "Küche",
    bathroom: "Bad",
    bedroom: "Schlafzimmer",
    balcony: "Balkon",
    entrance: "Eingang",
  },
  ru: {
    identity_confirmed: "Личность подтверждена",
    documents_reviewed: "Документы проверены",
    access_prepared: "Доступ подготовлен",
    meter_readings: "Показания записаны",
    condition_recorded: "Состояние записано",
    keys_handed_over: "Ключи переданы / возвращены",
    turnover_scheduled: "Работы запланированы",
    living_room: "Гостиная",
    kitchen: "Кухня",
    bathroom: "Ванная",
    bedroom: "Спальня",
    balcony: "Балкон",
    entrance: "Прихожая",
  },
}
function checklistLabel(code: string, locale: Locale) {
  return checklistCopy[locale][code] ?? code.replaceAll("_", " ")
}
const accessTypeCopy: Record<Locale, Record<string, string>> = {
  tr: { mobile_code: "Mobil kod", card: "Kart", plate: "Plaka", qr: "QR kod" },
  en: { mobile_code: "Mobile code", card: "Access card", plate: "Vehicle plate", qr: "QR code" },
  de: { mobile_code: "Mobiler Code", card: "Zugangskarte", plate: "Kennzeichen", qr: "QR-Code" },
  ru: { mobile_code: "Мобильный код", card: "Карта доступа", plate: "Номер автомобиля", qr: "QR-код" },
}
function accessTypeLabel(value: string, locale: Locale) {
  return accessTypeCopy[locale][value] ?? value
}
function variant(status: string) {
  if (["completed", "ready", "active", "manual_ready"].includes(status))
    return "success"
  if (["cancelled", "blocked", "damaged", "revoked"].includes(status))
    return "danger"
  if (["scheduled", "preparing", "pending", "provider_ready"].includes(status))
    return "warning"
  return "info"
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
const BILINGUAL_SEPARATOR = /\s[–-]\s|\s\/\s/
// Bilingual "Türkçe - English" names: show only the active locale's half.
function pickLocaleHalf(raw: string, locale: Locale): string {
  const parts = raw.split(BILINGUAL_SEPARATOR).map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) return locale === "tr" ? parts[0] : parts[parts.length - 1]
  return raw
}
function friendlyRef(value: string) {
  const compact = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  return compact ? `#${compact.slice(0, 6)}` : "—"
}

export function MoveHandoverExperience() {
  const locale = localeOf(useLocale())
  const t = copy[locale]
  const options = optionCopy[locale]
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [state, setState] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [verified, setVerified] = useState<"idle" | "yes" | "no">("idle")
  const [candidate, setCandidate] = useState("")
  const [kind, setKind] = useState("move_in")
  const [reason, setReason] = useState("")
  const [startsAt, setStartsAt] = useState(() => localIstanbul(60))
  const [endsAt, setEndsAt] = useState(() => localIstanbul(120))
  const [lastLoaded, setLastLoaded] = useState(0)
  const [clock, setClock] = useState(() => Date.now())
  const [online, setOnline] = useState(true)
  const [itemCode, setItemCode] = useState("identity_confirmed")
  const [checkStatus, setCheckStatus] = useState("completed")
  const [documentId, setDocumentId] = useState("")
  const [evidenceType, setEvidenceType] = useState("condition")
  const [meterType, setMeterType] = useState("electricity")
  const [reading, setReading] = useState("")
  const [readingUnit, setReadingUnit] = useState("kWh")
  const [areaCode, setAreaCode] = useState("living_room")
  const [conditionState, setConditionState] = useState("good")
  const [accessTruth, setAccessTruth] = useState("manual_ready")
  const [accessType, setAccessType] = useState("mobile_code")
  const [humanApproved, setHumanApproved] = useState(false)
  const [workType, setWorkType] = useState("cleaning")
  const [depositId, setDepositId] = useState("")
  const keys = useRef(new Map<string, string>())

  const load = useCallback(
    async (receipt?: Receipt | null) => {
      try {
        const response = await fetch("/api/site-management/move-handover", {
          cache: "no-store",
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload)
          throw new LocalizedHandoverError(errorMessage(codeOf(payload), locale))
        const data = payload as Workspace
        setWorkspace(data)
        setState("success")
        const loadedAt = Date.now()
        setLastLoaded(loadedAt)
        setClock(loadedAt)
        if (!candidate && data.candidates?.reservations[0]) {
          const reservation = data.candidates.reservations[0]
          const relationship = data.candidates.relationships.find(
            (item) =>
              item.unitId === reservation.unitId &&
              item.residentId === reservation.residentId
          )
          if (relationship) setCandidate(`${reservation.id}|${relationship.id}`)
        }
        if (receipt) {
          const id = receipt.appointmentId ?? receipt.entityId
          setVerified(
            data.appointments.some((item) => text(item, "id", "") === id)
              ? "yes"
              : "no"
          )
        }
        return data
      } catch (error) {
        setState("error")
        setMessage(
          error instanceof LocalizedHandoverError
            ? error.localizedMessage
            : t.unavailable
        )
        return null
      }
    },
    [candidate, locale, t.unavailable]
  )
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])
  useEffect(() => {
    const initialOnlineSync = window.setTimeout(
      () => setOnline(navigator.onLine),
      0
    )
    const timer = window.setInterval(() => {
      setClock(Date.now())
      if (navigator.onLine && document.visibilityState === "visible")
        void load()
    }, 30_000)
    const recover = () => {
      setOnline(navigator.onLine)
      setClock(Date.now())
      if (navigator.onLine) void load()
    }
    window.addEventListener("online", recover)
    window.addEventListener("offline", recover)
    return () => {
      window.clearTimeout(initialOnlineSync)
      window.clearInterval(timer)
      window.removeEventListener("online", recover)
      window.removeEventListener("offline", recover)
    }
  }, [load])

  async function command(body: Row, identity: string) {
    setPending(true)
    setMessage(null)
    setVerified("idle")
    let idempotency = keys.current.get(identity)
    if (!idempotency) {
      idempotency = key()
      keys.current.set(identity, idempotency)
    }
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12_000)
    try {
      const response = await fetch("/api/site-management/move-handover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotency,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload)
        throw new LocalizedHandoverError(errorMessage(codeOf(payload), locale))
      keys.current.delete(identity)
      const receipt = payload as Receipt
      setMessage(receipt.replayed ? t.persisted : t.persisted)
      await load(receipt)
      return receipt
    } catch (error) {
      setState("error")
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? options.timeout
          : error instanceof LocalizedHandoverError
            ? error.localizedMessage
            : navigator.onLine
              ? t.generic
              : t.unavailable
      )
      if (error instanceof DOMException && error.name === "AbortError")
        await load()
      return null
    } finally {
      window.clearTimeout(timeout)
      setPending(false)
    }
  }

  const candidatePairs = useMemo(
    () =>
      (workspace?.candidates?.reservations ?? []).flatMap((reservation) =>
        (workspace?.candidates?.relationships ?? [])
          .filter(
            (relationship) =>
              relationship.unitId === reservation.unitId &&
              relationship.residentId === reservation.residentId
          )
          .map((relationship) => ({
            value: `${reservation.id}|${relationship.id}`,
            label: `${pickLocaleHalf(reservation.resourceName, locale)} · ${relationship.label}`,
            reservation,
            relationship,
          }))
      ),
    [workspace, locale]
  )
  const capabilities = workspace?.scope.capabilities
  const stale =
    !online || !lastLoaded || clock - lastLoaded > 30_000

  async function appointmentCommand(
    appointment: Row,
    action: string,
    extra: Row = {}
  ) {
    const id = text(appointment, "id", "")
    const version = number(appointment, "version")
    await command(
      {
        action,
        appointmentId: id,
        expectedVersion: version,
        reason: reason.trim() || null,
        ...extra,
      },
      `${action}:${id}:${version}:${JSON.stringify(extra)}`
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">{t.title}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t.body}
          </p>
          <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            {t.providerLimit}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={state === "loading"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-bold focus-visible:ring-2 disabled:opacity-50"
        >
          <RefreshCw
            className={
              state === "loading"
                ? "h-4 w-4 animate-spin motion-reduce:animate-none"
                : "h-4 w-4"
            }
          />
          {t.refresh}
        </button>
      </div>
      <div aria-live="polite">
        {message ? (
          <div
            role={state === "error" ? "alert" : "status"}
            className={`flex items-start gap-2 rounded-xl border p-4 text-sm ${state === "error" || verified === "no" ? "border-rose-500/30 bg-rose-500/10" : "border-primary/30 bg-primary/10"}`}
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            {verified === "no" ? t.missing : message}
          </div>
        ) : null}
      </div>
      {workspace ? (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            <StatusBadge variant={stale ? "warning" : "success"}>
              {stale ? t.stale : t.current}
            </StatusBadge>
            <StatusBadge variant="info">{t.source}</StatusBadge>
            {verified === "yes" ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                {t.persisted}
              </span>
            ) : null}
          </div>
          {capabilities?.canCreate ? (
            <Card3D glow={false}>
              <h3 className="text-base font-black">{t.create}</h3>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  const [reservationId, relationshipId] = candidate.split("|")
                  void command(
                    {
                      action: "create",
                      reservationId,
                      relationshipId,
                      appointmentKind: kind,
                    },
                    `create:${candidate}:${kind}`
                  )
                }}
                className="mt-4 grid gap-3 sm:grid-cols-3"
              >
                <label className="text-sm font-bold sm:col-span-2">
                  {t.candidate}
                  <select
                    required
                    value={candidate}
                    onChange={(event) => setCandidate(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2"
                  >
                    <option value="">{t.noCandidate}</option>
                    {candidatePairs.map((pair) => (
                      <option key={pair.value} value={pair.value}>
                        {pair.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-bold">
                  {t.state}
                  <select
                    value={kind}
                    onChange={(event) => setKind(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2"
                  >
                    <option value="move_in">{t.moveIn}</option>
                    <option value="move_out">{t.moveOut}</option>
                    <option value="handover">{t.handover}</option>
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={!candidate || pending}
                  className="min-h-11 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground focus-visible:ring-2 disabled:opacity-50 sm:col-span-3"
                >
                  {t.save}
                </button>
              </form>
            </Card3D>
          ) : null}
          <Card3D glow={false}>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <h3 className="text-base font-black">{t.appointments}</h3>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {workspace.appointments.length ? (
                workspace.appointments.map((appointment) => {
                  const id = text(appointment, "id", "")
                  const status = text(appointment, "status", "scheduled")
                  const version = number(appointment, "version")
                  const details = {
                    checklist: workspace.checklistItems.filter(
                      (item) => text(item, "appointmentId", "") === id
                    ),
                    evidence: workspace.evidence.filter(
                      (item) => text(item, "appointmentId", "") === id
                    ),
                    meters: workspace.meterReadings.filter(
                      (item) => text(item, "appointmentId", "") === id
                    ),
                    condition: workspace.conditionItems.filter(
                      (item) => text(item, "appointmentId", "") === id
                    ),
                    turnover: workspace.turnoverWorkItems.filter(
                      (item) => text(item, "appointmentId", "") === id
                    ),
                    access: workspace.accessRequests.filter(
                      (item) => text(item, "appointmentId", "") === id
                    ),
                    deposits: workspace.depositSettlements.filter(
                      (item) =>
                        text(item, "appointmentId", "") === id ||
                        text(item, "reservationId", "") ===
                          text(appointment, "reservationId", "")
                    ),
                  }
                  const availableDocuments = workspace.candidates.documents.filter(
                    (document) =>
                      (!document.siteId ||
                        document.siteId === text(appointment, "siteId", "")) &&
                      (!document.unitId ||
                        document.unitId === text(appointment, "unitId", "")) &&
                      (!document.residentId ||
                        document.residentId === text(appointment, "residentId", ""))
                  )
                  const nextTransition: Record<
                    string,
                    { value: string; label: string }
                  > = {
                    scheduled: { value: "prepare", label: t.prepare },
                    preparing: { value: "mark_ready", label: t.ready },
                    ready: { value: "start", label: t.begin },
                    in_progress: { value: "complete", label: t.complete },
                  }
                  const next = nextTransition[status]
                  const canReschedule =
                    Boolean(capabilities?.canReschedule) &&
                    ["scheduled", "preparing", "ready"].includes(status)
                  const canCancel =
                    Boolean(capabilities?.canCancel) &&
                    ["scheduled", "preparing", "ready"].includes(status)
                  const openForUpdates = !["completed", "cancelled"].includes(
                    status
                  )
                  return (
                    <article
                      key={id}
                      data-testid="handover-appointment-row"
                      data-appointment-id={id}
                      className="rounded-2xl border border-border bg-muted/20 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="font-black">
                            {text(appointment, "appointmentKind") === "move_in"
                              ? t.moveIn
                              : text(appointment, "appointmentKind") ===
                                  "move_out"
                                ? t.moveOut
                                : t.handover}
                          </h4>
                          <p className="text-xs text-muted-foreground" title={id}>
                            {friendlyRef(id)} · v{version}
                          </p>
                        </div>
                        <span data-testid="handover-appointment-state">
                          <StatusBadge variant={variant(status)}>
                            {statusLabel(status, locale)}
                          </StatusBadge>
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="font-bold">{t.start}</dt>
                          <dd className="text-muted-foreground">
                            {formatDate(
                              text(appointment, "startsAt", ""),
                              locale
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-bold">{t.end}</dt>
                          <dd className="text-muted-foreground">
                            {formatDate(
                              text(appointment, "endsAt", ""),
                              locale
                            )}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span>
                          {t.checklist}: {details.checklist.length}
                        </span>
                        <span>
                          {t.evidence}: {details.evidence.length}
                        </span>
                        <span>
                          {t.meter}: {details.meters.length}
                        </span>
                        <span>
                          {t.condition}: {details.condition.length}
                        </span>
                        <span>
                          {t.turnover}: {details.turnover.length}
                        </span>
                      </div>
                      {details.checklist.length ? (
                        <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                          {details.checklist.map((item) => {
                            const code = text(item, "itemCode", "")
                            const itemStatus = text(item, "status", "pending")
                            return (
                              <li
                                key={text(item, "id", code)}
                                className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-2 py-1.5"
                              >
                                <span>
                                  {checklistLabel(code, locale)}
                                  {item.required === true ? " *" : ""}
                                </span>
                                <StatusBadge variant={variant(itemStatus)}>
                                  {statusLabel(itemStatus, locale)}
                                </StatusBadge>
                              </li>
                            )
                          })}
                        </ul>
                      ) : null}
                      {details.meters.length ||
                      details.condition.length ||
                      details.access.length ||
                      details.turnover.length ? (
                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                          {details.meters.map((item) => (
                            <p key={text(item, "id", "")} className="rounded-lg border border-border px-2 py-1.5">
                              {t.meter}: {statusLabel(text(item, "meterType"), locale)} · {number(item, "readingNumeric", 0)} {text(item, "readingUnit", "")}
                            </p>
                          ))}
                          {details.condition.map((item) => (
                            <p key={text(item, "id", "")} className="rounded-lg border border-border px-2 py-1.5">
                              {t.condition}: {checklistLabel(text(item, "areaCode"), locale)} · {statusLabel(text(item, "conditionState"), locale)}
                            </p>
                          ))}
                          {details.access.map((item) => (
                            <p key={text(item, "id", "")} className="rounded-lg border border-border px-2 py-1.5">
                              {t.access}: {accessTypeLabel(text(item, "credentialType"), locale)} · {statusLabel(text(item, "preparationTruth"), locale)}
                            </p>
                          ))}
                          {details.turnover.map((item) => (
                            <p key={text(item, "id", "")} className="rounded-lg border border-border px-2 py-1.5">
                              {t.turnover}: {checklistLabel(text(item, "workType"), locale)} · {statusLabel(text(item, "status"), locale)}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <details
                        className="mt-3"
                        onToggle={(event) => {
                          if (!event.currentTarget.open) return
                          setReason("")
                          setStartsAt(
                            localInput(text(appointment, "startsAt", ""))
                          )
                          setEndsAt(
                            localInput(text(appointment, "endsAt", ""))
                          )
                          setItemCode(
                            text(details.checklist[0] ?? {}, "itemCode", "identity_confirmed")
                          )
                          setDocumentId(availableDocuments[0]?.id ?? "")
                          setDepositId(text(details.deposits[0] ?? {}, "id", ""))
                          if (!capabilities?.canApproveAccess) {
                            setAccessTruth("blocked")
                            setHumanApproved(false)
                          }
                        }}
                      >
                        <summary className="cursor-pointer rounded-lg py-2 text-sm font-black focus-visible:ring-2">
                          {t.actions}
                        </summary>
                        <div className="space-y-4 pt-3">
                          {openForUpdates ? (
                            <label className="block text-xs font-bold">
                              {t.reason}
                              <input
                                value={reason}
                                onChange={(event) =>
                                  setReason(event.target.value)
                                }
                                className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal"
                              />
                            </label>
                          ) : null}
                          {canReschedule ? (
                            <div className="grid grid-cols-2 gap-2">
                            <input
                              aria-label={t.start}
                              type="datetime-local"
                              value={startsAt}
                              onChange={(event) =>
                                setStartsAt(event.target.value)
                              }
                              className="min-h-11 rounded-xl border border-border bg-background px-2 text-xs"
                            />
                            <input
                              aria-label={t.end}
                              type="datetime-local"
                              value={endsAt}
                              onChange={(event) =>
                                setEndsAt(event.target.value)
                              }
                              className="min-h-11 rounded-xl border border-border bg-background px-2 text-xs"
                            />
                            <button
                              data-testid="handover-reschedule"
                              type="button"
                              onClick={() =>
                                void appointmentCommand(
                                  appointment,
                                  "reschedule",
                                  {
                                    startsAt: iso(startsAt),
                                    endsAt: iso(endsAt),
                                  }
                                )
                              }
                              disabled={pending || !reason.trim()}
                              className="col-span-2 min-h-11 rounded-xl border border-border text-xs font-black"
                            >
                              {t.reschedule}
                            </button>
                            </div>
                          ) : null}
                          {canCancel ? (
                            <button
                              data-testid="handover-cancel"
                              type="button"
                              onClick={() =>
                                void appointmentCommand(appointment, "cancel")
                              }
                              disabled={pending || !reason.trim()}
                              className="min-h-11 w-full rounded-xl border border-rose-500 text-xs font-black text-rose-700 disabled:opacity-50"
                            >
                              {t.cancel}
                            </button>
                          ) : null}
                          {capabilities?.canOperate ? (
                            <>
                              {next ? (
                                <div className="grid gap-2">
                                  <button
                                    data-testid="handover-next-transition"
                                    type="button"
                                    onClick={() =>
                                      void appointmentCommand(
                                        appointment,
                                        "transition",
                                        { transition: next.value }
                                      )
                                    }
                                    disabled={pending}
                                    className="min-h-11 rounded-xl border border-border text-xs font-black"
                                  >
                                    {next.label}
                                  </button>
                                </div>
                              ) : null}
                              <section className="rounded-xl border border-border p-3">
                                <h5 className="text-sm font-black">
                                  {t.checklist}
                                </h5>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  <select
                                    data-testid="handover-checklist-selector"
                                    aria-label={t.item}
                                    value={itemCode}
                                    onChange={(event) =>
                                      setItemCode(event.target.value)
                                    }
                                    className="min-h-11 rounded-lg border border-border bg-background px-2 text-sm"
                                  >
                                    {details.checklist.map((item) => {
                                      const code = text(item, "itemCode", "")
                                      return (
                                        <option
                                          key={text(item, "id", code)}
                                          value={code}
                                          disabled={
                                            code === "keys_handed_over" &&
                                            status !== "in_progress"
                                          }
                                        >
                                          {checklistLabel(code, locale)} · {statusLabel(text(item, "status", "pending"), locale)}
                                        </option>
                                      )
                                    })}
                                  </select>
                                  <select
                                    aria-label={t.state}
                                    value={checkStatus}
                                    onChange={(event) =>
                                      setCheckStatus(event.target.value)
                                    }
                                    className="min-h-11 rounded-lg border border-border bg-background px-2 text-sm"
                                  >
                                    <option value="completed">
                                      {t.completed}
                                    </option>
                                    <option value="pending">{t.pending}</option>
                                    <option value="blocked">{t.blocked}</option>
                                    <option value="not_applicable">
                                      {t.notApplicable}
                                    </option>
                                  </select>
                                  <button
                                    data-testid="handover-checklist-update"
                                    type="button"
                                    onClick={() =>
                                      void appointmentCommand(
                                        appointment,
                                        "checklist",
                                        {
                                          itemCode,
                                          status: checkStatus,
                                          notes: reason.trim() || null,
                                        }
                                      )
                                    }
                                    disabled={
                                      pending ||
                                      !itemCode ||
                                      (checkStatus === "blocked" && !reason.trim()) ||
                                      (itemCode === "keys_handed_over" &&
                                        checkStatus === "completed" &&
                                        status !== "in_progress")
                                    }
                                    className="min-h-11 rounded-lg bg-primary text-xs font-black text-primary-foreground disabled:opacity-50 sm:col-span-2"
                                  >
                                    {t.update}
                                  </button>
                                </div>
                              </section>
                              <section className="rounded-xl border border-border p-3">
                                <h5 className="text-sm font-black">
                                  {t.evidence}
                                </h5>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  <select
                                    aria-label={t.document}
                                    value={documentId}
                                    onChange={(event) =>
                                      setDocumentId(event.target.value)
                                    }
                                    className="min-h-11 rounded-lg border border-border bg-background px-2 text-sm"
                                  >
                                    <option value="">{t.document}</option>
                                    {availableDocuments.map((document) => (
                                      <option key={document.id} value={document.id}>
                                        {document.title} · {document.category}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    aria-label={t.evidenceType}
                                    value={evidenceType}
                                    onChange={(event) =>
                                      setEvidenceType(event.target.value)
                                    }
                                    className="min-h-11 rounded-lg border border-border bg-background px-2 text-sm"
                                  >
                                    <option value="identity">
                                      {checklistLabel("identity_confirmed", locale)}
                                    </option>
                                    <option value="condition">
                                      {t.condition}
                                    </option>
                                    <option value="meter">{t.meter}</option>
                                    <option value="key_handover">
                                      {t.access}
                                    </option>
                                    <option value="signature">
                                      {options.signature}
                                    </option>
                                    <option value="other">
                                      {options.other}
                                    </option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void appointmentCommand(
                                        appointment,
                                        "evidence",
                                        {
                                          documentId,
                                          evidenceType,
                                          notes: reason.trim() || null,
                                        }
                                      )
                                    }
                                    disabled={pending || !documentId}
                                    className="min-h-11 rounded-lg bg-primary text-xs font-black text-primary-foreground disabled:opacity-50 sm:col-span-2"
                                  >
                                    {t.update}
                                  </button>
                                </div>
                              </section>
                              <div className="grid gap-3 lg:grid-cols-2">
                                <section className="rounded-xl border border-border p-3">
                                  <div className="flex items-center gap-2">
                                    <Gauge className="h-4 w-4" />
                                    <h5 className="text-sm font-black">
                                      {t.meter}
                                    </h5>
                                  </div>
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    <select
                                      aria-label={t.meterType}
                                      value={meterType}
                                      onChange={(event) =>
                                        setMeterType(event.target.value)
                                      }
                                      className="min-h-11 rounded-lg border bg-background px-2"
                                    >
                                      <option value="electricity">
                                        {options.electricity}
                                      </option>
                                      <option value="water">
                                        {options.water}
                                      </option>
                                      <option value="gas">{options.gas}</option>
                                      <option value="heat">
                                        {options.heat}
                                      </option>
                                      <option value="other">
                                        {options.other}
                                      </option>
                                    </select>
                                    <input
                                      aria-label={t.reading}
                                      type="number"
                                      step="any"
                                      value={reading}
                                      onChange={(event) =>
                                        setReading(event.target.value)
                                      }
                                      className="min-h-11 rounded-lg border bg-background px-2"
                                    />
                                    <input
                                      aria-label={t.unit}
                                      value={readingUnit}
                                      onChange={(event) =>
                                        setReadingUnit(event.target.value)
                                      }
                                      className="min-h-11 rounded-lg border bg-background px-2"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void appointmentCommand(
                                          appointment,
                                          "meter",
                                          {
                                            meterType,
                                            readingNumeric: Number(reading),
                                            readingUnit,
                                            readAt: new Date().toISOString(),
                                            evidenceDocumentId:
                                              documentId || null,
                                          }
                                        )
                                      }
                                      disabled={pending || !reading || !readingUnit.trim()}
                                      className="min-h-11 rounded-lg bg-primary text-xs font-black text-primary-foreground disabled:opacity-50"
                                    >
                                      {t.update}
                                    </button>
                                  </div>
                                </section>
                                <section className="rounded-xl border border-border p-3">
                                  <h5 className="text-sm font-black">
                                    {t.condition}
                                  </h5>
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    <select
                                      aria-label={t.area}
                                      value={areaCode}
                                      onChange={(event) =>
                                        setAreaCode(event.target.value)
                                      }
                                      className="min-h-11 rounded-lg border bg-background px-2"
                                    >
                                      {["living_room", "kitchen", "bathroom", "bedroom", "balcony", "entrance"].map((area) => (
                                        <option key={area} value={area}>
                                          {checklistLabel(area, locale)}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      aria-label={t.condition}
                                      value={conditionState}
                                      onChange={(event) =>
                                        setConditionState(event.target.value)
                                      }
                                      className="min-h-11 rounded-lg border bg-background px-2"
                                    >
                                      <option value="good">{t.good}</option>
                                      <option value="fair">{t.fair}</option>
                                      <option value="damaged">
                                        {t.damaged}
                                      </option>
                                      <option value="not_inspected">
                                        {t.notInspected}
                                      </option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void appointmentCommand(
                                          appointment,
                                          "condition",
                                          {
                                            areaCode,
                                            conditionState,
                                            notes: reason.trim() || null,
                                            evidenceDocumentId:
                                              documentId || null,
                                          }
                                        )
                                      }
                                      disabled={
                                        pending ||
                                        (conditionState === "damaged" && !reason.trim())
                                      }
                                      className="col-span-2 min-h-11 rounded-lg bg-primary text-xs font-black text-primary-foreground disabled:opacity-50"
                                    >
                                      {t.update}
                                    </button>
                                  </div>
                                </section>
                              </div>
                              {capabilities.canPrepareAccess ? (
                                <section className="rounded-xl border border-border p-3">
                                <div className="flex items-center gap-2">
                                  <KeyRound className="h-4 w-4" />
                                  <h5 className="text-sm font-black">
                                    {t.access}
                                  </h5>
                                </div>
                                <p className="mt-1 text-xs text-amber-700">
                                  {t.accessWarning}
                                </p>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  <select
                                    data-testid="handover-access-type"
                                    aria-label={t.access}
                                    value={accessType}
                                    onChange={(event) =>
                                      setAccessType(event.target.value)
                                    }
                                    className="min-h-11 rounded-lg border bg-background px-2"
                                  >
                                    {["mobile_code", "card", "plate", "qr"].map((value) => (
                                      <option key={value} value={value}>
                                        {accessTypeLabel(value, locale)}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    aria-label={t.accessTruth}
                                    value={
                                      capabilities.canApproveAccess
                                        ? accessTruth
                                        : "blocked"
                                    }
                                    onChange={(event) => {
                                      setAccessTruth(event.target.value)
                                      if (event.target.value === "blocked") {
                                        setHumanApproved(false)
                                      }
                                    }
                                    }
                                    disabled={!capabilities.canApproveAccess}
                                    className="min-h-11 rounded-lg border bg-background px-2"
                                  >
                                    <option value="blocked">{t.blocked}</option>
                                    {capabilities.canApproveAccess ? (
                                      <>
                                        <option value="manual_ready">
                                          {t.manualReady}
                                        </option>
                                        <option value="provider_ready">
                                          {t.providerReady}
                                        </option>
                                        <option value="revoked">{t.revoked}</option>
                                      </>
                                    ) : null}
                                  </select>
                                  {capabilities.canApproveAccess ? (
                                    <label className="flex min-h-11 items-center gap-2 rounded-lg border p-2 text-xs font-bold sm:col-span-2">
                                      <input
                                        type="checkbox"
                                        checked={humanApproved}
                                        onChange={(event) =>
                                          setHumanApproved(event.target.checked)
                                        }
                                      />
                                      {t.humanApproval}
                                    </label>
                                  ) : (
                                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs sm:col-span-2">
                                      {t.blocked} · {t.humanApproval}
                                    </p>
                                  )}
                                  <button
                                    data-testid="handover-access-prepare"
                                    type="button"
                                    onClick={() =>
                                      void appointmentCommand(
                                        appointment,
                                        "access.prepare",
                                        {
                                          accessType,
                                          truthState: capabilities.canApproveAccess
                                            ? accessTruth
                                            : "blocked",
                                          humanApproved:
                                            capabilities.canApproveAccess &&
                                            accessTruth !== "blocked"
                                              ? humanApproved
                                              : false,
                                          reason: reason.trim(),
                                        }
                                      )
                                    }
                                    disabled={
                                      pending ||
                                      !reason.trim() ||
                                      (capabilities.canApproveAccess &&
                                        accessTruth !== "blocked" &&
                                        !humanApproved)
                                    }
                                    className="min-h-11 rounded-lg bg-primary text-xs font-black text-primary-foreground disabled:opacity-50 sm:col-span-2"
                                  >
                                    {t.update}
                                  </button>
                                </div>
                                </section>
                              ) : null}
                              <section className="rounded-xl border border-border p-3">
                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4" />
                                  <h5 className="text-sm font-black">
                                    {t.turnover}
                                  </h5>
                                </div>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  <select
                                    aria-label={t.workType}
                                    value={workType}
                                    onChange={(event) =>
                                      setWorkType(event.target.value)
                                    }
                                    className="min-h-11 rounded-lg border bg-background px-2"
                                  >
                                    <option value="cleaning">
                                      {t.cleaning}
                                    </option>
                                    <option value="inspection">
                                      {t.inspection}
                                    </option>
                                    <option value="repair">{t.repair}</option>
                                    <option value="key_return">
                                      {t.keyReturn}
                                    </option>
                                    <option value="access_revocation">
                                      {t.accessRevocation}
                                    </option>
                                  </select>
                                  <input
                                    aria-label={t.due}
                                    type="datetime-local"
                                    value={endsAt}
                                    onChange={(event) =>
                                      setEndsAt(event.target.value)
                                    }
                                    className="min-h-11 rounded-lg border bg-background px-2"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void appointmentCommand(
                                        appointment,
                                        "turnover.create",
                                        {
                                          workType,
                                          assignedProfileId: null,
                                          dueAt: iso(endsAt),
                                        }
                                      )
                                    }
                                    disabled={pending}
                                    className="min-h-11 rounded-lg bg-primary text-xs font-black text-primary-foreground disabled:opacity-50 sm:col-span-2"
                                  >
                                    {t.update}
                                  </button>
                                </div>
                              </section>
                            </>
                          ) : null}
                          {capabilities?.canLinkDeposit ? (
                            <section className="rounded-xl border border-border p-3">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                <h5 className="text-sm font-black">
                                  {t.deposit}
                                </h5>
                              </div>
                              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                <select
                                  aria-label={t.deposit}
                                  value={depositId}
                                  onChange={(event) =>
                                    setDepositId(event.target.value)
                                  }
                                  className="min-h-11 flex-1 rounded-lg border bg-background px-2"
                                >
                                  <option value="">{t.deposit}</option>
                                  {details.deposits.map((deposit) => (
                                    <option
                                      key={text(deposit, "id", "")}
                                      value={text(deposit, "id", "")}
                                    >
                                      {statusLabel(text(deposit, "status", "pending"), locale)} · {formatDualFromCents(number(deposit, "depositAmountCents", 0), "TRY")}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void appointmentCommand(
                                      appointment,
                                      "deposit.link",
                                      { depositSettlementId: depositId }
                                    )
                                  }
                                  disabled={pending || !depositId}
                                  className="min-h-11 rounded-lg bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-50"
                                >
                                  {t.depositLink}
                                </button>
                              </div>
                            </section>
                          ) : null}
                        </div>
                      </details>
                    </article>
                  )
                })
              ) : (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground xl:col-span-2">
                  {t.empty}
                </p>
              )}
            </div>
          </Card3D>
        </>
      ) : state === "loading" ? (
        <div className="rounded-xl border border-border p-5 text-sm text-muted-foreground">
          {t.loading}
        </div>
      ) : null}
    </div>
  )
}
