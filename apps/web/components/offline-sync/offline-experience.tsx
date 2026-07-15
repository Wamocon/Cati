"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale } from "next-intl"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CloudOff,
  Database,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import {
  OFFLINE_QUEUE_LIMIT,
  discardOfflineCommand,
  enqueueOfflineCommand,
  purgeExpiredOfflineCommands,
  purgeOfflineQueue,
  readOfflineQueue,
  replayOfflineQueue,
  resolveOfflineConflict,
  subscribeOfflineQueue,
  type OfflineQueueItem,
  type OfflineQueueSnapshot,
  type OfflineSafeCommandType,
} from "./offline-queue"

type SupportedLocale = "tr" | "en" | "de" | "ru"
type RequestState = "idle" | "loading" | "success" | "error"

interface OfflineContext {
  siteId: string
  unitId: string
  label: string
}

interface OfflineReadinessResponse {
  source: "supabase" | "local-qa" | "unavailable"
  generatedAt: string
  contexts: OfflineContext[]
  quality: {
    authoritativeReplay: boolean
    sensitiveActionsBlockedOffline: boolean
    queueRetentionHours: number
    queueLimit: number
  }
  warningCode?: string
}

const demoContext: OfflineContext = {
  siteId: "10000000-0000-4000-8000-000000000001",
  unitId: "10000000-0000-4000-8000-000000000018",
  label: "QA · A-018",
}

const copy = {
  tr: {
    title: "Sahada güvenli çalışma",
    subtitle:
      "Bağlantı kesildiğinde yalnızca güvenli bilet taslakları ve saha notları cihazda sıraya alınır. Finans, erişim, rol, onay ve acil yönlendirme her zaman çevrimiçi kontrol ister.",
    online: "Çevrimiçi",
    offline: "Çevrimdışı",
    fresh: "Güncel",
    stale: "Eski veri",
    lastSync: "Son eşitleme",
    never: "Henüz yok",
    queue: "Bekleyen işlem",
    conflicts: "İnceleme gereken çakışma",
    retry: "Şimdi eşitle",
    retrying: "Eşitleniyor",
    clear: "Cihaz kuyruğunu temizle",
    safeAction: "Güvenli çevrimdışı işlem ekle",
    actionType: "İşlem",
    createTicket: "Normal bilet oluştur",
    fieldNote: "Saha notu ekle",
    unit: "Daire / alan",
    titleLabel: "Kısa başlık",
    description: "Açıklama",
    category: "Kategori",
    ticketId: "Bilet kimliği",
    version: "Mevcut sürüm",
    note: "Not",
    visibility: "Görünürlük",
    internal: "Yalnız ekip",
    enqueue: "Kuyruğa ekle",
    queued: "İşlem cihazda güvenle saklandı.",
    noItems: "Bu cihazda bekleyen işlem yok.",
    discard: "Sil",
    reviewRetry: "Sunucu sürümüyle yeniden dene",
    conflictTitle: "Bu kayıt sunucuda değişti",
    conflictBody:
      "Eski veri otomatik olarak üzerine yazılmadı. Güncel durumu kontrol edin ve karar verin.",
    safetyTitle: "Çevrimdışı sınır",
    safetyBody:
      "Acil durum, ödeme, iade, depozito, erişim, rol ve yönetici onayı kuyruğa alınmaz. Acil durumda çevrimiçi acil yolunu veya 112'yi kullanın.",
    source: "Kaynak",
    loadError: "Çevrimdışı hazırlık bilgisi alınamadı.",
    unsupported: "Bu tarayıcı IndexedDB çevrimdışı kuyruğunu desteklemiyor.",
    queueFull:
      "Kuyruk sınırı doldu; önce bekleyen işlemleri eşitleyin veya silin.",
    persisted: "Cihazda kalıcı",
    actionError: "İşlem çevrimdışı kuyruğa eklenemedi.",
    noContext: "Bu rol için yetkili bir daire veya alan bulunamadı.",
    sourceSupabase: "Supabase · yetkili sunucu",
    sourceLocal: "Yerel QA · cihaz kuyruğu",
    sourceUnavailable: "Kullanılamıyor · güvenli kapalı",
    warningUnavailable:
      "Yetkili eşitleme hizmeti hazır değil; cihaz kuyruğu sunucuya gönderilmeyecek.",
    general: "Genel",
    maintenance: "Bakım",
    cleaning: "Temizlik",
    commonArea: "Ortak alan",
    attempts: "deneme",
    retention: "saklama",
    maximum: "en fazla",
    statusQueued: "Kuyrukta",
    statusSyncing: "Eşitleniyor",
    statusRetry: "Yeniden denenecek",
    statusConflict: "Çakışma",
    replayPending: "Yetkili sunucuya eşitleme bekliyor.",
  },
  en: {
    title: "Safe field work",
    subtitle:
      "When the connection drops, only safe ticket drafts and field notes are held on this device. Finance, access, role, approval, and emergency dispatch always require an online check.",
    online: "Online",
    offline: "Offline",
    fresh: "Current",
    stale: "Stale data",
    lastSync: "Last sync",
    never: "Not yet",
    queue: "Pending commands",
    conflicts: "Conflicts to review",
    retry: "Sync now",
    retrying: "Syncing",
    clear: "Clear device queue",
    safeAction: "Add an offline-safe command",
    actionType: "Action",
    createTicket: "Create a normal ticket",
    fieldNote: "Add a field note",
    unit: "Unit / area",
    titleLabel: "Short title",
    description: "Description",
    category: "Category",
    ticketId: "Ticket ID",
    version: "Current version",
    note: "Note",
    visibility: "Visibility",
    internal: "Team only",
    enqueue: "Add to queue",
    queued: "The command is safely stored on this device.",
    noItems: "There are no pending commands on this device.",
    discard: "Discard",
    reviewRetry: "Retry with server version",
    conflictTitle: "This record changed on the server",
    conflictBody:
      "Older data was not silently overwritten. Review the current state and choose what happens next.",
    safetyTitle: "Offline boundary",
    safetyBody:
      "Emergency, payment, refund, deposit, access, role, and manager-approval actions are never queued. Use the online emergency path or 112 for danger.",
    source: "Source",
    loadError: "Offline readiness could not be loaded.",
    unsupported: "This browser does not support the IndexedDB offline queue.",
    queueFull:
      "The queue limit is reached; sync or discard pending work first.",
    persisted: "Persisted on device",
    actionError: "The command could not be added to the offline queue.",
    noContext: "No authorized unit or area is available for this role.",
    sourceSupabase: "Supabase · authoritative server",
    sourceLocal: "Local QA · device queue",
    sourceUnavailable: "Unavailable · fail closed",
    warningUnavailable:
      "The authoritative sync service is not ready; the device queue will not be sent to the server.",
    general: "General",
    maintenance: "Maintenance",
    cleaning: "Cleaning",
    commonArea: "Common area",
    attempts: "attempt(s)",
    retention: "retention",
    maximum: "maximum",
    statusQueued: "Queued",
    statusSyncing: "Syncing",
    statusRetry: "Retry pending",
    statusConflict: "Conflict",
    replayPending: "Waiting to sync with the authoritative server.",
  },
  de: {
    title: "Sicher vor Ort arbeiten",
    subtitle:
      "Bei Verbindungsabbruch bleiben ausschließlich sichere Ticketentwürfe und Feldnotizen auf diesem Gerät. Finanzen, Zugang, Rollen, Freigaben und Notfall-Dispatch benötigen immer eine Online-Prüfung.",
    online: "Online",
    offline: "Offline",
    fresh: "Aktuell",
    stale: "Veraltete Daten",
    lastSync: "Letzte Synchronisierung",
    never: "Noch nicht",
    queue: "Ausstehende Vorgänge",
    conflicts: "Zu prüfende Konflikte",
    retry: "Jetzt synchronisieren",
    retrying: "Synchronisiert",
    clear: "Gerätewarteschlange leeren",
    safeAction: "Offline-sicheren Vorgang hinzufügen",
    actionType: "Aktion",
    createTicket: "Normales Ticket erstellen",
    fieldNote: "Feldnotiz ergänzen",
    unit: "Einheit / Bereich",
    titleLabel: "Kurzer Titel",
    description: "Beschreibung",
    category: "Kategorie",
    ticketId: "Ticket-ID",
    version: "Aktuelle Version",
    note: "Notiz",
    visibility: "Sichtbarkeit",
    internal: "Nur Team",
    enqueue: "In Warteschlange legen",
    queued: "Der Vorgang wurde dauerhaft auf diesem Gerät gespeichert.",
    noItems: "Auf diesem Gerät sind keine Vorgänge ausstehend.",
    discard: "Verwerfen",
    reviewRetry: "Mit Serverversion erneut versuchen",
    conflictTitle: "Dieser Datensatz wurde auf dem Server geändert",
    conflictBody:
      "Ältere Daten wurden nicht still überschrieben. Prüfen Sie den aktuellen Stand und entscheiden Sie bewusst.",
    safetyTitle: "Offline-Grenze",
    safetyBody:
      "Notfall-, Zahlungs-, Erstattungs-, Kautions-, Zugangs-, Rollen- und Managementfreigaben werden nie vorgemerkt. Bei Gefahr den Online-Notfallweg oder 112 nutzen.",
    source: "Quelle",
    loadError: "Die Offline-Bereitschaft konnte nicht geladen werden.",
    unsupported:
      "Dieser Browser unterstützt die IndexedDB-Warteschlange nicht.",
    queueFull:
      "Das Warteschlangenlimit ist erreicht; zuerst synchronisieren oder Einträge verwerfen.",
    persisted: "Auf Gerät gespeichert",
    actionError: "Der Vorgang konnte nicht offline vorgemerkt werden.",
    noContext: "Für diese Rolle ist keine berechtigte Einheit oder Fläche verfügbar.",
    sourceSupabase: "Supabase · maßgeblicher Server",
    sourceLocal: "Lokale QA · Gerätewarteschlange",
    sourceUnavailable: "Nicht verfügbar · sicher gesperrt",
    warningUnavailable:
      "Der maßgebliche Synchronisierungsdienst ist nicht bereit; die Gerätewarteschlange wird nicht an den Server gesendet.",
    general: "Allgemein",
    maintenance: "Wartung",
    cleaning: "Reinigung",
    commonArea: "Gemeinschaftsfläche",
    attempts: "Versuch(e)",
    retention: "Aufbewahrung",
    maximum: "maximal",
    statusQueued: "Vorgemerkt",
    statusSyncing: "Synchronisiert",
    statusRetry: "Erneuter Versuch ausstehend",
    statusConflict: "Konflikt",
    replayPending: "Wartet auf die Synchronisierung mit dem maßgeblichen Server.",
  },
  ru: {
    title: "Безопасная работа на объекте",
    subtitle:
      "При потере связи на устройстве сохраняются только безопасные черновики заявок и полевые заметки. Финансы, доступ, роли, согласования и экстренная диспетчеризация всегда требуют онлайн-проверки.",
    online: "Онлайн",
    offline: "Офлайн",
    fresh: "Актуально",
    stale: "Устаревшие данные",
    lastSync: "Последняя синхронизация",
    never: "Ещё не было",
    queue: "Ожидающие операции",
    conflicts: "Конфликты для проверки",
    retry: "Синхронизировать",
    retrying: "Синхронизация",
    clear: "Очистить очередь устройства",
    safeAction: "Добавить безопасную офлайн-операцию",
    actionType: "Действие",
    createTicket: "Создать обычную заявку",
    fieldNote: "Добавить полевую заметку",
    unit: "Объект / зона",
    titleLabel: "Краткий заголовок",
    description: "Описание",
    category: "Категория",
    ticketId: "ID заявки",
    version: "Текущая версия",
    note: "Заметка",
    visibility: "Видимость",
    internal: "Только команда",
    enqueue: "Добавить в очередь",
    queued: "Операция безопасно сохранена на этом устройстве.",
    noItems: "На этом устройстве нет ожидающих операций.",
    discard: "Удалить",
    reviewRetry: "Повторить с версией сервера",
    conflictTitle: "Запись была изменена на сервере",
    conflictBody:
      "Старые данные не перезаписали новые. Проверьте текущее состояние и выберите действие.",
    safetyTitle: "Граница офлайн-режима",
    safetyBody:
      "Экстренные, платёжные, возвратные, депозитные, доступные, ролевые и управляющие согласования не ставятся в очередь. При опасности используйте онлайн-путь или 112.",
    source: "Источник",
    loadError: "Не удалось загрузить готовность офлайн-режима.",
    unsupported: "Этот браузер не поддерживает офлайн-очередь IndexedDB.",
    queueFull:
      "Достигнут лимит очереди; сначала синхронизируйте или удалите операции.",
    persisted: "Сохранено на устройстве",
    actionError: "Не удалось добавить операцию в офлайн-очередь.",
    noContext: "Для этой роли нет разрешённого объекта или зоны.",
    sourceSupabase: "Supabase · основной сервер",
    sourceLocal: "Локальная QA · очередь устройства",
    sourceUnavailable: "Недоступно · безопасно закрыто",
    warningUnavailable:
      "Основной сервис синхронизации не готов; очередь устройства не будет отправлена на сервер.",
    general: "Общее",
    maintenance: "Обслуживание",
    cleaning: "Уборка",
    commonArea: "Общая зона",
    attempts: "попыток",
    retention: "хранение",
    maximum: "максимум",
    statusQueued: "В очереди",
    statusSyncing: "Синхронизация",
    statusRetry: "Ожидает повтора",
    statusConflict: "Конфликт",
    replayPending: "Ожидает синхронизации с основным сервером.",
  },
} satisfies Record<SupportedLocale, Record<string, string>>

function resolveLocale(value: string): SupportedLocale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

function formatTime(value: string | null, locale: SupportedLocale) {
  if (!value) return copy[locale].never
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value))
}

function queueBadge(item: OfflineQueueItem) {
  if (item.status === "conflict") return "danger" as const
  if (item.status === "retry") return "warning" as const
  if (item.status === "syncing") return "info" as const
  return "neutral" as const
}

function getClientId() {
  const key = "cati-offline-client-id"
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.localStorage.setItem(key, created)
  return created
}

export function OfflineExperience() {
  const locale = resolveLocale(useLocale())
  const t = copy[locale]
  const user = useUser()
  const actorKey = `${user.id}:${user.role}`
  const [snapshot, setSnapshot] = useState<OfflineQueueSnapshot>({
    supported: true,
    items: [],
    lastSyncAt: null,
    lastPurgeReason: null,
  })
  const [serverState, setServerState] =
    useState<OfflineReadinessResponse | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [message, setMessage] = useState<string | null>(null)
  const [clock, setClock] = useState(() => Date.now())
  const [online, setOnline] = useState(true)
  const [commandType, setCommandType] =
    useState<OfflineSafeCommandType>(() =>
      user.role === "staff" ? "ticket.field_note.append" : "ticket.create"
    )
  const [selectedContext, setSelectedContext] = useState(0)
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    category: "general",
  })
  const [noteForm, setNoteForm] = useState({
    ticketId: "",
    expectedVersion: "1",
    body: "",
  })

  const refresh = useCallback(async () => {
    const next = await readOfflineQueue(actorKey)
    setSnapshot(next)
    setOnline(navigator.onLine)
    setClock(Date.now())
  }, [actorKey])

  const loadReadiness = useCallback(async () => {
    try {
      const response = await fetch("/api/site-management/offline-sync", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error(t.loadError)
      setServerState((await response.json()) as OfflineReadinessResponse)
      setRequestState("success")
    } catch {
      setRequestState("error")
      setMessage(t.loadError)
    }
  }, [t.loadError])

  useEffect(() => {
    const initialize = async () => {
      const priorActor = window.localStorage.getItem("cati-offline-actor")
      if (priorActor && priorActor !== actorKey) {
        await purgeOfflineQueue("Role or signed-in user changed")
      }
      window.localStorage.setItem("cati-offline-actor", actorKey)
      await purgeExpiredOfflineCommands()
      await refresh()
      await loadReadiness()
    }
    void initialize()
    return subscribeOfflineQueue(() => void refresh())
  }, [actorKey, loadReadiness, refresh])

  useEffect(() => {
    if (
      !online ||
      snapshot.items.length === 0 ||
      snapshot.items.some((item) => item.status === "conflict")
    )
      return
    const timer = window.setTimeout(() => {
      void replayOfflineQueue(actorKey).then(() => refresh())
    }, 500)
    return () => window.clearTimeout(timer)
  }, [actorKey, online, refresh, snapshot.items])

  useEffect(() => {
    const handleReplayRequested = () => {
      if (navigator.onLine) {
        void replayOfflineQueue(actorKey).then(refresh)
      }
    }
    const handlePurged = () => {
      void refresh()
    }

    window.addEventListener(
      "cati:offline-replay-requested",
      handleReplayRequested
    )
    window.addEventListener("cati:offline-purged", handlePurged)
    return () => {
      window.removeEventListener(
        "cati:offline-replay-requested",
        handleReplayRequested
      )
      window.removeEventListener("cati:offline-purged", handlePurged)
    }
  }, [actorKey, refresh])

  useEffect(() => {
    const updateConnectivity = () => {
      setOnline(navigator.onLine)
      setClock(Date.now())
    }
    const timer = window.setInterval(() => setClock(Date.now()), 30_000)
    window.addEventListener("online", updateConnectivity)
    window.addEventListener("offline", updateConnectivity)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("online", updateConnectivity)
      window.removeEventListener("offline", updateConnectivity)
    }
  }, [])

  const contexts = serverState?.contexts.length
    ? serverState.contexts
    : serverState?.source === "local-qa"
      ? [demoContext]
      : []
  const queued = snapshot.items.filter((item) => item.status !== "conflict")
  const conflicts = snapshot.items.filter((item) => item.status === "conflict")
  const stale =
    !online ||
    !snapshot.lastSyncAt ||
    clock - new Date(snapshot.lastSyncAt).getTime() > 30_000
  const canCreateTicket = ["admin", "manager", "owner", "tenant"].includes(
    user.role
  )
  const canAppendFieldNote = ["admin", "manager", "staff"].includes(user.role)
  const allowedCommands = useMemo<OfflineSafeCommandType[]>(() => {
    const commands: OfflineSafeCommandType[] = []
    if (canCreateTicket) commands.push("ticket.create")
    if (canAppendFieldNote) commands.push("ticket.field_note.append")
    return commands
  }, [canAppendFieldNote, canCreateTicket])
  const effectiveCommandType = allowedCommands.includes(commandType)
    ? commandType
    : (allowedCommands[0] ?? commandType)
  const canEnqueue =
    snapshot.supported &&
    snapshot.items.length < OFFLINE_QUEUE_LIMIT &&
    allowedCommands.includes(effectiveCommandType)
  const sourceLabel = useMemo(() => {
    if (!serverState) return "—"
    if (serverState.source === "supabase") return t.sourceSupabase
    if (serverState.source === "local-qa") return t.sourceLocal
    return t.sourceUnavailable
  }, [serverState, t.sourceLocal, t.sourceSupabase, t.sourceUnavailable])

  async function enqueue() {
    setMessage(null)
    try {
      const context = contexts[selectedContext]
      if (effectiveCommandType === "ticket.create") {
        if (!context) throw new Error("OFFLINE_CONTEXT_UNAVAILABLE")
        await enqueueOfflineCommand({
          actorKey,
          role: user.role,
          clientId: getClientId(),
          commandType: effectiveCommandType,
          payload: {
            siteId: context.siteId,
            unitId: context.unitId,
            title: ticketForm.title,
            description: ticketForm.description || undefined,
            category: ticketForm.category,
            priority: "normal",
          },
        })
        setTicketForm({ title: "", description: "", category: "general" })
      } else {
        await enqueueOfflineCommand({
          actorKey,
          role: user.role,
          clientId: getClientId(),
          commandType: effectiveCommandType,
          payload: {
            ticketId: noteForm.ticketId,
            expectedVersion: Number(noteForm.expectedVersion),
            body: noteForm.body,
            visibility: "internal",
          },
        })
        setNoteForm((current) => ({ ...current, body: "" }))
      }
      setMessage(t.queued)
      await refresh()
    } catch (error) {
      const detail = error instanceof Error ? error.message : ""
      setMessage(
        detail.includes("queue limit")
          ? t.queueFull
          : detail.includes("not supported")
            ? t.unsupported
            : detail === "OFFLINE_CONTEXT_UNAVAILABLE"
              ? t.noContext
              : t.actionError
      )
    }
  }

  async function replay() {
    setRequestState("loading")
    const result = await replayOfflineQueue(actorKey)
    setRequestState(result.stoppedReason === "conflict" ? "error" : "success")
    await refresh()
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black text-foreground">{t.title}</h1>
          <StatusBadge variant={online ? "success" : "warning"}>
            {online ? t.online : t.offline}
          </StatusBadge>
          <StatusBadge variant={stale ? "warning" : "success"}>
            {stale ? t.stale : t.fresh}
          </StatusBadge>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {t.subtitle}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            {online ? (
              <Wifi className="h-7 w-7 text-emerald-600" />
            ) : (
              <WifiOff className="h-7 w-7 text-amber-600" />
            )}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">
                {online ? t.online : t.offline}
              </p>
              <p className="text-sm font-black text-foreground">
                {sourceLabel}
              </p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Database className="h-7 w-7 text-primary" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">
                {t.queue}
              </p>
              <p className="text-2xl font-black text-foreground">
                {queued.length}
              </p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-rose-600" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">
                {t.conflicts}
              </p>
              <p className="text-2xl font-black text-foreground">
                {conflicts.length}
              </p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Clock3 className="h-7 w-7 text-sky-600" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">
                {t.lastSync}
              </p>
              <p className="text-sm font-black text-foreground">
                {formatTime(snapshot.lastSyncAt, locale)}
              </p>
            </div>
          </div>
        </Card3D>
      </div>

      <div
        role="note"
        className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
      >
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <h2 className="text-sm font-black text-foreground">
              {t.safetyTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t.safetyBody}
            </p>
          </div>
        </div>
      </div>

      {!snapshot.supported && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-800 dark:text-rose-200"
        >
          {t.unsupported}
        </div>
      )}
      {(requestState === "error" || serverState?.warningCode) && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-900 dark:text-amber-100"
        >
          {serverState?.warningCode ? t.warningUnavailable : message ?? t.loadError}
        </div>
      )}
      <p
        aria-live="polite"
        className="min-h-5 text-sm font-semibold text-muted-foreground"
      >
        {message}
      </p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card3D glow={false}>
          <h2 className="text-base font-black text-foreground">
            {t.safeAction}
          </h2>
          {allowedCommands.length === 0 ? (
            <p role="note" className="mt-4 text-sm text-muted-foreground">
              {t.safetyBody}
            </p>
          ) : (
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void enqueue()
              }}
            >
            <label className="block text-sm font-bold text-foreground">
              {t.actionType}
              <select
                value={effectiveCommandType}
                onChange={(event) =>
                  setCommandType(event.target.value as OfflineSafeCommandType)
                }
                className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {canCreateTicket ? (
                  <option value="ticket.create">{t.createTicket}</option>
                ) : null}
                {canAppendFieldNote ? (
                  <option value="ticket.field_note.append">{t.fieldNote}</option>
                ) : null}
              </select>
            </label>
            {effectiveCommandType === "ticket.create" ? (
              <>
                <label className="block text-sm font-bold text-foreground">
                  {t.unit}
                  <select
                    value={selectedContext}
                    onChange={(event) =>
                      setSelectedContext(Number(event.target.value))
                    }
                    disabled={contexts.length === 0}
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    {contexts.map((context, index) => (
                      <option key={context.unitId} value={index}>
                        {context.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-bold text-foreground">
                  {t.titleLabel}
                  <input
                    value={ticketForm.title}
                    onChange={(event) =>
                      setTicketForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    required
                    maxLength={160}
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-foreground">
                  {t.description}
                  <textarea
                    value={ticketForm.description}
                    onChange={(event) =>
                      setTicketForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    maxLength={1000}
                    className="mt-1 min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-foreground">
                  {t.category}
                  <select
                    value={ticketForm.category}
                    onChange={(event) =>
                      setTicketForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <option value="general">{t.general}</option>
                    <option value="maintenance">{t.maintenance}</option>
                    <option value="cleaning">{t.cleaning}</option>
                    <option value="common-area">{t.commonArea}</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label className="block text-sm font-bold text-foreground">
                  {t.ticketId}
                  <input
                    value={noteForm.ticketId}
                    onChange={(event) =>
                      setNoteForm((current) => ({
                        ...current,
                        ticketId: event.target.value,
                      }))
                    }
                    required
                    inputMode="text"
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-foreground">
                  {t.version}
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={noteForm.expectedVersion}
                    onChange={(event) =>
                      setNoteForm((current) => ({
                        ...current,
                        expectedVersion: event.target.value,
                      }))
                    }
                    required
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-foreground">
                  {t.note}
                  <textarea
                    value={noteForm.body}
                    onChange={(event) =>
                      setNoteForm((current) => ({
                        ...current,
                        body: event.target.value,
                      }))
                    }
                    required
                    maxLength={1000}
                    className="mt-1 min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-foreground">
                  {t.visibility}
                  <select
                    value="internal"
                    disabled
                    className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <option value="internal">{t.internal}</option>
                  </select>
                </label>
              </>
            )}
            <button
              type="submit"
              disabled={
                !canEnqueue ||
                (effectiveCommandType === "ticket.create" &&
                  contexts.length === 0)
              }
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              {canEnqueue ? t.enqueue : t.queueFull}
            </button>
            </form>
          )}
        </Card3D>

        <Card3D glow={false}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-foreground">
                {t.queue}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {snapshot.items.length}/{OFFLINE_QUEUE_LIMIT} · {t.persisted}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void replay()}
                disabled={
                  !online || requestState === "loading" || queued.length === 0
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-black text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
              >
                <RefreshCw
                  className={
                    requestState === "loading"
                      ? "h-4 w-4 animate-spin"
                      : "h-4 w-4"
                  }
                />
                {requestState === "loading" ? t.retrying : t.retry}
              </button>
              <button
                type="button"
                onClick={() =>
                  void purgeOfflineQueue("User cleared the device queue").then(
                    refresh
                  )
                }
                disabled={snapshot.items.length === 0}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-500/30 px-3 text-sm font-black text-rose-700 hover:bg-rose-500/10 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {t.clear}
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-3" aria-live="polite">
            {snapshot.items.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <p className="mt-2 text-sm font-semibold text-muted-foreground">
                  {t.noItems}
                </p>
              </div>
            )}
            {snapshot.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black break-words text-foreground">
                      {item.commandType === "ticket.create"
                        ? (item.payload as { title: string }).title
                        : t.fieldNote}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      #{item.sequence} · {formatTime(item.createdAt, locale)} ·{" "}
                      {item.attempts} {t.attempts}
                    </p>
                  </div>
                  <StatusBadge variant={queueBadge(item)}>
                    {item.status === "queued"
                      ? t.statusQueued
                      : item.status === "syncing"
                        ? t.statusSyncing
                        : item.status === "retry"
                          ? t.statusRetry
                          : t.statusConflict}
                  </StatusBadge>
                </div>
                {item.status === "conflict" && (
                  <div
                    role="alert"
                    className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3"
                  >
                    <p className="text-sm font-black text-foreground">
                      {t.conflictTitle}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t.conflictBody}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void resolveOfflineConflict(item.id, "retry").then(
                            refresh
                          )
                        }
                        className="min-h-10 rounded-lg bg-primary px-3 text-xs font-black text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        {t.reviewRetry}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void discardOfflineCommand(item.id).then(refresh)
                        }
                        className="min-h-10 rounded-lg border border-border px-3 text-xs font-black text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        {t.discard}
                      </button>
                    </div>
                  </div>
                )}
                {item.lastError && item.status !== "conflict" && (
                  <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {t.replayPending}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card3D>
      </div>

      <footer className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
        <CloudOff className="h-4 w-4" />
        <span>
          {t.source}: {sourceLabel}
        </span>
        <span>·</span>
        <span>
          {serverState?.quality.queueRetentionHours ?? 72}h {t.retention}
        </span>
        <span>·</span>
        <span>
          {serverState?.quality.queueLimit ?? OFFLINE_QUEUE_LIMIT} {t.maximum}
        </span>
      </footer>
    </div>
  )
}
