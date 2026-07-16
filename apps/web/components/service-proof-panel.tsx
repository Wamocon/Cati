"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  Camera,
  Check,
  ChevronDown,
  Clock3,
  FileCheck2,
  FileWarning,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Upload,
  Video,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Role } from "@/lib/rbac"
import type {
  ServiceProofFeed,
  ServiceProofMediaType,
  ServiceProofRecord,
} from "@/lib/service-proof-repository"

type Locale = "tr" | "en" | "de" | "ru"
type RequestState = "idle" | "loading" | "success" | "error"
type RealtimeState = "idle" | "connecting" | "connected" | "fallback"

const copy = {
  tr: {
    title: "İş kanıtı",
    summary:
      "Fotoğraf, video veya saha notu ekleyin; yönetim kapanıştan önce kontrol eder.",
    add: "Yeni kanıt",
    type: "Kanıt türü",
    noteType: "Saha notu",
    photoType: "Fotoğraf",
    videoType: "Video",
    note: "Yapılan iş ve sonucu",
    notePlaceholder:
      "Kontrol edilen alanı, yapılan işlemi ve sonucu kısa ve açık yazın.",
    file: "Dosya seç",
    photoHint: "JPEG, PNG veya WebP · en fazla 10 MB",
    videoHint: "MP4, MOV veya WebM · en fazla 50 MB",
    override: "Yönetim adına ekleme nedeni",
    overridePlaceholder:
      "Atanan çalışan yerine neden kanıt eklediğinizi açıklayın.",
    submit: "İncelemeye gönder",
    sending: "Doğrulanıyor ve gönderiliyor",
    loadError: "Kanıtlar şu anda yüklenemedi. Yeniden deneyin.",
    submitError: "Kanıt gönderilemedi. Bilgileri kontrol edip yeniden deneyin.",
    reviewError: "Karar kaydedilemedi. Listeyi yenileyip tekrar deneyin.",
    empty: "Bu görev için henüz kanıt yok.",
    pending: "İnceleme bekliyor",
    accepted: "Kabul edildi",
    rejected: "Düzeltme gerekli",
    stored: "Özel alanda saklandı",
    requested: "Yükleme hazırlanıyor",
    failed: "Yükleme başarısız",
    provider_not_connected: "Dosya bağlantısı henüz açık değil",
    not_required: "Dosya gerekmiyor",
    clean: "Güvenlik kontrolü geçti",
    scanPending: "Güvenlik kontrolü bekliyor",
    scanRejected: "Dosya güvenlik kontrolünden geçmedi",
    scanNotConnected: "Güvenlik taraması bağlı değil",
    view: "Dosyayı aç",
    history: "Geçmiş",
    reviewReason: "Karar açıklaması",
    reviewPlaceholder:
      "Kabul veya düzeltme nedenini en az 10 karakterle yazın.",
    accept: "Kabul et",
    reject: "Düzeltme iste",
    refresh: "Yenile",
    updated: "Son güncelleme",
    localTruth:
      "Demo modunda notlar kaydedilir; seçilen dosya gerçekten yüklenmiş gibi gösterilmez.",
    fileBlocked:
      "Dosya, özel saklama ve güvenlik kontrolü tamamlanmadan kabul edilemez.",
    submitted: "Kanıt incelemeye gönderildi.",
  },
  en: {
    title: "Work proof",
    summary:
      "Add a photo, video or field note; management checks it before close-out.",
    add: "New proof",
    type: "Proof type",
    noteType: "Field note",
    photoType: "Photo",
    videoType: "Video",
    note: "Work performed and result",
    notePlaceholder:
      "Briefly describe the area checked, work performed and outcome.",
    file: "Choose file",
    photoHint: "JPEG, PNG or WebP · up to 10 MB",
    videoHint: "MP4, MOV or WebM · up to 50 MB",
    override: "Reason for management submission",
    overridePlaceholder:
      "Explain why you are adding proof instead of the assigned staff member.",
    submit: "Send for review",
    sending: "Validating and sending",
    loadError: "Proof cannot be loaded right now. Try again.",
    submitError: "Proof could not be sent. Check the details and try again.",
    reviewError: "The decision could not be saved. Refresh and try again.",
    empty: "No proof has been added for this task.",
    pending: "Awaiting review",
    accepted: "Accepted",
    rejected: "Correction needed",
    stored: "Stored privately",
    requested: "Upload preparing",
    failed: "Upload failed",
    provider_not_connected: "File connection is not active yet",
    not_required: "No file required",
    clean: "Security check passed",
    scanPending: "Security check pending",
    scanRejected: "File failed the security check",
    scanNotConnected: "Security scan is not connected",
    view: "Open file",
    history: "History",
    reviewReason: "Decision explanation",
    reviewPlaceholder:
      "Explain acceptance or correction in at least 10 characters.",
    accept: "Accept",
    reject: "Request correction",
    refresh: "Refresh",
    updated: "Last updated",
    localTruth:
      "Demo mode stores notes; a selected file is never shown as actually uploaded.",
    fileBlocked:
      "A file cannot be accepted before private storage and security checks complete.",
    submitted: "Proof was sent for review.",
  },
  de: {
    title: "Leistungsnachweis",
    summary:
      "Foto, Video oder Einsatznotiz ergänzen; die Verwaltung prüft vor Abschluss.",
    add: "Neuer Nachweis",
    type: "Nachweisart",
    noteType: "Einsatznotiz",
    photoType: "Foto",
    videoType: "Video",
    note: "Durchgeführte Arbeit und Ergebnis",
    notePlaceholder:
      "Geprüften Bereich, Arbeit und Ergebnis kurz und klar beschreiben.",
    file: "Datei auswählen",
    photoHint: "JPEG, PNG oder WebP · bis 10 MB",
    videoHint: "MP4, MOV oder WebM · bis 50 MB",
    override: "Grund für Einreichung durch die Verwaltung",
    overridePlaceholder:
      "Begründen Sie, warum Sie statt der zugewiesenen Person einreichen.",
    submit: "Zur Prüfung senden",
    sending: "Wird geprüft und gesendet",
    loadError:
      "Nachweise können gerade nicht geladen werden. Erneut versuchen.",
    submitError:
      "Nachweis konnte nicht gesendet werden. Angaben prüfen und erneut versuchen.",
    reviewError:
      "Entscheidung konnte nicht gespeichert werden. Aktualisieren und erneut versuchen.",
    empty: "Für diese Aufgabe gibt es noch keinen Nachweis.",
    pending: "Prüfung ausstehend",
    accepted: "Akzeptiert",
    rejected: "Korrektur erforderlich",
    stored: "Privat gespeichert",
    requested: "Upload wird vorbereitet",
    failed: "Upload fehlgeschlagen",
    provider_not_connected: "Dateianbindung ist noch nicht aktiv",
    not_required: "Keine Datei erforderlich",
    clean: "Sicherheitsprüfung bestanden",
    scanPending: "Sicherheitsprüfung ausstehend",
    scanRejected: "Datei hat die Sicherheitsprüfung nicht bestanden",
    scanNotConnected: "Sicherheitsscan ist nicht verbunden",
    view: "Datei öffnen",
    history: "Verlauf",
    reviewReason: "Begründung der Entscheidung",
    reviewPlaceholder:
      "Akzeptanz oder Korrektur mit mindestens 10 Zeichen begründen.",
    accept: "Akzeptieren",
    reject: "Korrektur anfordern",
    refresh: "Aktualisieren",
    updated: "Zuletzt aktualisiert",
    localTruth:
      "Im Demo-Modus werden Notizen gespeichert; eine ausgewählte Datei gilt nicht als hochgeladen.",
    fileBlocked:
      "Eine Datei kann erst nach privater Speicherung und Sicherheitsprüfung akzeptiert werden.",
    submitted: "Nachweis wurde zur Prüfung gesendet.",
  },
  ru: {
    title: "Подтверждение работ",
    summary:
      "Добавьте фото, видео или заметку; управление проверит до закрытия заявки.",
    add: "Новое подтверждение",
    type: "Тип подтверждения",
    noteType: "Заметка сотрудника",
    photoType: "Фото",
    videoType: "Видео",
    note: "Выполненная работа и результат",
    notePlaceholder:
      "Кратко опишите проверенную зону, выполненную работу и результат.",
    file: "Выбрать файл",
    photoHint: "JPEG, PNG или WebP · до 10 МБ",
    videoHint: "MP4, MOV или WebM · до 50 МБ",
    override: "Причина добавления от имени управления",
    overridePlaceholder:
      "Объясните, почему подтверждение добавляется вместо назначенного сотрудника.",
    submit: "Отправить на проверку",
    sending: "Проверка и отправка",
    loadError: "Сейчас не удалось загрузить подтверждения. Повторите попытку.",
    submitError:
      "Не удалось отправить подтверждение. Проверьте данные и повторите.",
    reviewError: "Не удалось сохранить решение. Обновите список и повторите.",
    empty: "Для этой задачи подтверждений пока нет.",
    pending: "Ожидает проверки",
    accepted: "Принято",
    rejected: "Нужна корректировка",
    stored: "Сохранено в закрытом хранилище",
    requested: "Подготовка загрузки",
    failed: "Ошибка загрузки",
    provider_not_connected: "Подключение файлов ещё не активно",
    not_required: "Файл не требуется",
    clean: "Проверка безопасности пройдена",
    scanPending: "Ожидает проверки безопасности",
    scanRejected: "Файл не прошёл проверку безопасности",
    scanNotConnected: "Проверка безопасности не подключена",
    view: "Открыть файл",
    history: "История",
    reviewReason: "Обоснование решения",
    reviewPlaceholder:
      "Объясните принятие или корректировку минимум в 10 символах.",
    accept: "Принять",
    reject: "Запросить корректировку",
    refresh: "Обновить",
    updated: "Последнее обновление",
    localTruth:
      "В демо-режиме сохраняются заметки; выбранный файл не считается загруженным.",
    fileBlocked:
      "Файл нельзя принять до закрытого хранения и проверки безопасности.",
    submitted: "Подтверждение отправлено на проверку.",
  },
} satisfies Record<Locale, Record<string, string>>

const realtimeCopy = {
  tr: {
    connecting: "Canlı güncellemeler bağlanıyor…",
    connected: "Canlı güncellemeler açık",
    fallback:
      "Canlı bağlantı kullanılamıyor; liste her 30 saniyede otomatik yenileniyor.",
  },
  en: {
    connecting: "Connecting live updates…",
    connected: "Live updates are active",
    fallback:
      "Live connection is unavailable; the list refreshes automatically every 30 seconds.",
  },
  de: {
    connecting: "Live-Aktualisierung wird verbunden…",
    connected: "Live-Aktualisierung ist aktiv",
    fallback:
      "Die Live-Verbindung ist nicht verfügbar; die Liste wird alle 30 Sekunden automatisch aktualisiert.",
  },
  ru: {
    connecting: "Подключение обновлений в реальном времени…",
    connected: "Обновления в реальном времени активны",
    fallback:
      "Соединение в реальном времени недоступно; список автоматически обновляется каждые 30 секунд.",
  },
} satisfies Record<Locale, Record<Exclude<RealtimeState, "idle">, string>>

const residentSummaryCopy = {
  tr: "Talebiniz için yönetim tarafından onaylanan iş kanıtlarını görüntüleyin.",
  en: "View management-approved proof for work completed on your request.",
  de: "Sehen Sie die von der Verwaltung bestätigten Nachweise zu Ihrem Auftrag.",
  ru: "Просматривайте подтверждённые управляющей компанией результаты работ по вашей заявке.",
} satisfies Record<Locale, string>

function resolveLocale(value: string): Locale {
  return value === "en" || value === "de" || value === "ru" ? value : "tr"
}

function requestKey(prefix: string) {
  const id =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `${prefix}:${id}`
}

function formatBytes(value: number | null, locale: Locale) {
  if (!value) return ""
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "megabyte",
    maximumFractionDigits: 1,
  }).format(value / 1024 / 1024)
}

function proofIcon(type: ServiceProofMediaType) {
  if (type === "photo") return <Camera className="h-4 w-4" aria-hidden="true" />
  if (type === "video") return <Video className="h-4 w-4" aria-hidden="true" />
  return <MessageSquareText className="h-4 w-4" aria-hidden="true" />
}

function isSafeChangedBroadcast(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const payload = value as Record<string, unknown>
  return Object.keys(payload).length === 1 && payload.kind === "changed"
}

function uploadWithProgress(
  body: FormData,
  key: string,
  onProgress: (value: number) => void
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("POST", "/api/site-management/service-proofs")
    request.setRequestHeader("Idempotency-Key", key)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onerror = () => reject(new Error("network"))
    request.onload = () => {
      let data: Record<string, unknown> = {}
      try {
        data = JSON.parse(request.responseText) as Record<string, unknown>
      } catch {
        // The caller uses a business-friendly fallback for non-JSON failures.
      }
      resolve({
        ok: request.status >= 200 && request.status < 300,
        status: request.status,
        data,
      })
    }
    request.send(body)
  })
}

export function ServiceProofPanel({
  ticketId,
  workforceTaskId,
  role,
}: {
  ticketId: string
  workforceTaskId: string
  role: Role
}) {
  const locale = resolveLocale(useLocale())
  const text = copy[locale]
  const liveText = realtimeCopy[locale]
  const residentView = role === "owner" || role === "tenant"
  const summaryText = residentView ? residentSummaryCopy[locale] : text.summary
  const [open, setOpen] = useState(false)
  const [feed, setFeed] = useState<ServiceProofFeed | null>(null)
  const [loadState, setLoadState] = useState<RequestState>("idle")
  const [realtimeState, setRealtimeState] = useState<RealtimeState>("idle")
  const [submitState, setSubmitState] = useState<RequestState>("idle")
  const [reviewState, setReviewState] = useState<Record<string, RequestState>>(
    {}
  )
  const [message, setMessage] = useState("")
  const [mediaType, setMediaType] = useState<ServiceProofMediaType>("note")
  const [note, setNote] = useState("")
  const [overrideReason, setOverrideReason] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({})
  const fileInput = useRef<HTMLInputElement>(null)
  const submitIntentKey = useRef<string | null>(null)
  const reviewIntentKeys = useRef(
    new Map<string, { fingerprint: string; key: string }>()
  )
  const canSubmitForRole =
    role === "staff" || role === "manager" || role === "admin"
  const canUsePanel = canSubmitForRole || residentView

  function invalidateSubmitIntent() {
    submitIntentKey.current = null
  }

  function stableReviewKey(
    proof: ServiceProofRecord,
    decision: "accepted" | "rejected"
  ) {
    const fingerprint = JSON.stringify({
      evidenceId: proof.id,
      expectedVersion: proof.reviewVersion,
      decision,
      reason: reviewReasons[proof.id] ?? "",
    })
    const current = reviewIntentKeys.current.get(proof.id)
    if (current?.fingerprint === fingerprint) return current.key
    const key = requestKey("service-proof-review")
    reviewIntentKeys.current.set(proof.id, { fingerprint, key })
    return key
  }

  const fetchProofs = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoadState("loading")
      try {
        const params = new URLSearchParams({ ticketId, workforceTaskId })
        const response = await fetch(
          `/api/site-management/service-proofs?${params}`,
          {
            cache: "no-store",
          }
        )
        const data = (await response.json()) as ServiceProofFeed & {
          error?: string
        }
        if (!response.ok) throw new Error(data.error || "load")
        setFeed(data)
        setRealtimeState((current) =>
          data.source === "supabase"
            ? current === "idle"
              ? "connecting"
              : current
            : "idle"
        )
        setLoadState("success")
      } catch {
        if (!quiet) setLoadState("error")
      }
    },
    [ticketId, workforceTaskId]
  )

  useEffect(() => {
    if (!open || !canUsePanel) return
    const initial = window.setTimeout(() => void fetchProofs(), 0)
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchProofs(true)
    }, 30_000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(poll)
    }
  }, [canUsePanel, fetchProofs, open])

  useEffect(() => {
    submitIntentKey.current = null
    reviewIntentKeys.current.clear()
  }, [role, ticketId, workforceTaskId])

  useEffect(() => {
    if (!open || feed?.source !== "supabase") return

    let active = true
    let dispose: (() => void) | undefined

    void (async () => {
      try {
        const supabase = createClient()
        await supabase.realtime.setAuth()
        if (!active) return

        const channel = supabase
          .channel(`service-proof:${workforceTaskId}`, {
            config: { private: true },
          })
          .on("broadcast", { event: "changed" }, (message) => {
            if (!isSafeChangedBroadcast(message.payload)) return
            void fetchProofs(true)
          })
          .subscribe((status) => {
            if (!active) return
            if (status === "SUBSCRIBED") {
              setRealtimeState("connected")
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              setRealtimeState("fallback")
            }
          })

        dispose = () => void supabase.removeChannel(channel)
      } catch {
        if (active) setRealtimeState("fallback")
      }
    })()

    return () => {
      active = false
      dispose?.()
    }
  }, [feed?.source, fetchProofs, open, workforceTaskId])

  const fileAccept = useMemo(
    () =>
      mediaType === "photo"
        ? "image/jpeg,image/png,image/webp"
        : "video/mp4,video/quicktime,video/webm",
    [mediaType]
  )

  if (!canUsePanel) return null

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitState("loading")
    setUploadProgress(0)
    setMessage("")
    const body = new FormData()
    body.set("ticketId", ticketId)
    body.set("workforceTaskId", workforceTaskId)
    body.set("mediaType", mediaType)
    body.set("note", note)
    if (file) body.set("file", file)
    if (role === "manager" || role === "admin")
      body.set("overrideReason", overrideReason)
    const idempotencyKey =
      submitIntentKey.current ?? requestKey("service-proof-submit")
    submitIntentKey.current = idempotencyKey
    try {
      const result = await uploadWithProgress(
        body,
        idempotencyKey,
        setUploadProgress
      )
      if (!result.ok)
        throw new Error(
          typeof result.data.error === "string" ? result.data.error : "submit"
        )
      const data = result.data as unknown as { feed?: ServiceProofFeed }
      if (data.feed) setFeed(data.feed)
      else await fetchProofs(true)
      setSubmitState("success")
      setMessage(text.submitted)
      submitIntentKey.current = null
      setNote("")
      setOverrideReason("")
      setFile(null)
      setUploadProgress(100)
      if (fileInput.current) fileInput.current.value = ""
      window.dispatchEvent(new CustomEvent("site-management:changed"))
    } catch {
      setSubmitState("error")
      setMessage(text.submitError)
    }
  }

  async function review(
    proof: ServiceProofRecord,
    decision: "accepted" | "rejected"
  ) {
    setReviewState((current) => ({ ...current, [proof.id]: "loading" }))
    const idempotencyKey = stableReviewKey(proof, decision)
    try {
      const response = await fetch("/api/site-management/service-proofs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          evidenceId: proof.id,
          expectedVersion: proof.reviewVersion,
          decision,
          reason: reviewReasons[proof.id] ?? "",
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error || "review")
      reviewIntentKeys.current.delete(proof.id)
      setReviewState((current) => ({ ...current, [proof.id]: "success" }))
      await fetchProofs(true)
      window.dispatchEvent(new CustomEvent("site-management:changed"))
    } catch {
      setReviewState((current) => ({ ...current, [proof.id]: "error" }))
    }
  }

  return (
    <details
      className="group mt-3 rounded-xl border border-sky-500/15 bg-gradient-to-br from-sky-500/[0.06] via-background/70 to-emerald-500/[0.04]"
      onToggle={(event) => {
        const nextOpen = event.currentTarget.open
        setOpen(nextOpen)
        if (!nextOpen) setRealtimeState("idle")
        else if (feed?.source === "supabase") setRealtimeState("connecting")
      }}
      data-testid={`service-proof-panel-${workforceTaskId}`}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2 transition outline-none hover:bg-sky-500/[0.05] focus-visible:ring-2 focus-visible:ring-sky-500/60 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <FileCheck2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 text-left">
            <span className="block text-xs font-black text-foreground">
              {text.title}
            </span>
            <span className="block truncate text-[11px] font-semibold text-muted-foreground">
              {feed
                ? `${feed.evidence.length} · ${text.updated} ${new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(feed.generatedAt))}`
                : summaryText}
            </span>
          </span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="border-t border-sky-500/10 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="max-w-xl">
            <p className="text-xs leading-5 text-muted-foreground">
              {summaryText}
            </p>
            {feed?.source === "supabase" && realtimeState !== "idle" && (
              <p
                className={`mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold ${
                  realtimeState === "connected"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : realtimeState === "fallback"
                      ? "text-amber-800 dark:text-amber-200"
                      : "text-muted-foreground"
                }`}
                data-testid="service-proof-realtime-status"
                data-state={realtimeState}
                role="status"
                aria-live="polite"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    realtimeState === "connected"
                      ? "bg-emerald-500"
                      : realtimeState === "fallback"
                        ? "bg-amber-500"
                        : "animate-pulse bg-muted-foreground"
                  }`}
                  aria-hidden="true"
                />
                {liveText[realtimeState]}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void fetchProofs()}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-bold text-foreground transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label={text.refresh}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loadState === "loading" ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{text.refresh}</span>
          </button>
        </div>

        {feed?.source === "local-qa" && (
          <div
            className="mt-3 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] p-2.5 text-[11px] leading-4 font-semibold text-amber-800 dark:text-amber-200"
            role="note"
          >
            <FileWarning
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{text.localTruth}</span>
          </div>
        )}

        {(feed?.permissions.canSubmit ?? canSubmitForRole) && (
          <form
            className="mt-3 space-y-3 rounded-xl border border-border bg-background/80 p-3"
            onSubmit={submit}
          >
            <div className="flex items-center gap-2 text-xs font-black text-foreground">
              <Upload className="h-4 w-4 text-sky-600" aria-hidden="true" />
              {text.add}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-bold text-foreground">
                <span>{text.type}</span>
                <select
                  value={mediaType}
                  onChange={(event) => {
                    invalidateSubmitIntent()
                    setMediaType(event.target.value as ServiceProofMediaType)
                    setFile(null)
                    if (fileInput.current) fileInput.current.value = ""
                  }}
                  className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/50"
                >
                  <option value="note">{text.noteType}</option>
                  <option value="photo">{text.photoType}</option>
                  <option value="video">{text.videoType}</option>
                </select>
              </label>
              {mediaType !== "note" && (
                <label className="space-y-1 text-xs font-bold text-foreground">
                  <span>{text.file}</span>
                  <input
                    ref={fileInput}
                    type="file"
                    required
                    accept={fileAccept}
                    onChange={(event) => {
                      invalidateSubmitIntent()
                      setFile(event.target.files?.[0] ?? null)
                    }}
                    className="block min-h-10 w-full rounded-lg border border-border bg-background text-xs text-muted-foreground file:mr-3 file:min-h-10 file:border-0 file:border-r file:border-border file:bg-muted file:px-3 file:text-xs file:font-black file:text-foreground"
                  />
                  <span className="block font-medium text-muted-foreground">
                    {mediaType === "photo" ? text.photoHint : text.videoHint}
                  </span>
                </label>
              )}
            </div>
            <label className="block space-y-1 text-xs font-bold text-foreground">
              <span>{text.note}</span>
              <textarea
                value={note}
                required
                minLength={3}
                maxLength={2000}
                rows={3}
                onChange={(event) => {
                  invalidateSubmitIntent()
                  setNote(event.target.value)
                }}
                placeholder={text.notePlaceholder}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-sky-500/50"
              />
            </label>
            {(role === "manager" || role === "admin") && (
              <label className="block space-y-1 text-xs font-bold text-foreground">
                <span>{text.override}</span>
                <textarea
                  value={overrideReason}
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={2}
                  onChange={(event) => {
                    invalidateSubmitIntent()
                    setOverrideReason(event.target.value)
                  }}
                  placeholder={text.overridePlaceholder}
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-sky-500/50"
                />
              </label>
            )}
            {submitState === "loading" && (
              <div className="space-y-1" role="status" aria-live="polite">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>{text.sending}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadProgress}
                >
                  <div
                    className="h-full rounded-full bg-sky-500 transition-[width]"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p
                className={`text-xs font-bold ${submitState === "error" ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}
                role={submitState === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {message}
              </p>
              <button
                type="submit"
                disabled={submitState === "loading"}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitState === "loading" ? (
                  <LoaderCircle
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden="true" />
                )}
                {submitState === "loading" ? text.sending : text.submit}
              </button>
            </div>
          </form>
        )}

        <div className="mt-3 space-y-2" aria-live="polite">
          {loadState === "loading" && !feed && (
            <div
              className="flex min-h-20 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground"
              role="status"
            >
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              {text.sending}
            </div>
          )}
          {loadState === "error" && (
            <div
              className="flex min-h-20 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/[0.05] px-3 text-center text-xs font-bold text-rose-700 dark:text-rose-300"
              role="alert"
            >
              {text.loadError}
            </div>
          )}
          {feed && feed.evidence.length === 0 && (
            <div className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-border px-3 text-center text-xs font-semibold text-muted-foreground">
              {text.empty}
            </div>
          )}
          {feed?.evidence.map((proof) => {
            const reviewLoading = reviewState[proof.id] === "loading"
            const binaryBlocked =
              proof.mediaType !== "note" && !proof.canOpenFile
            return (
              <article
                key={proof.id}
                className="rounded-xl border border-border bg-background/85 p-3"
                data-testid={`service-proof-${proof.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                      {proofIcon(proof.mediaType)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground">
                        {proof.mediaType === "note"
                          ? text.noteType
                          : proof.mediaType === "photo"
                            ? text.photoType
                            : text.videoType}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 break-words text-muted-foreground">
                        {proof.note}
                      </p>
                      {proof.originalFilename && (
                        <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
                          {proof.originalFilename}
                          {proof.sizeBytes
                            ? ` · ${formatBytes(proof.sizeBytes, locale)}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${proof.reviewStatus === "accepted" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : proof.reviewStatus === "rejected" ? "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}
                  >
                    {proof.reviewStatus === "accepted"
                      ? text.accepted
                      : proof.reviewStatus === "rejected"
                        ? text.rejected
                        : text.pending}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                  <span className="rounded-full border border-border bg-muted/60 px-2 py-1 text-muted-foreground">
                    {text[proof.uploadStatus]}
                  </span>
                  {proof.mediaType !== "note" && (
                    <span className="rounded-full border border-border bg-muted/60 px-2 py-1 text-muted-foreground">
                      {proof.scanStatus === "clean"
                        ? text.clean
                        : proof.scanStatus === "pending"
                          ? text.scanPending
                          : proof.scanStatus === "rejected"
                            ? text.scanRejected
                            : text.scanNotConnected}
                    </span>
                  )}
                  {proof.canOpenFile && (
                    <a
                      href={`/api/site-management/service-proofs/${encodeURIComponent(proof.id)}/file`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
                    >
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                      {text.view}
                    </a>
                  )}
                </div>

                {feed.permissions.canReview &&
                  proof.reviewStatus === "pending" && (
                    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2.5">
                      {binaryBlocked && (
                        <p
                          className="mb-2 flex gap-1.5 text-[11px] leading-4 font-semibold text-amber-800 dark:text-amber-200"
                          role="note"
                        >
                          <FileWarning
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          {text.fileBlocked}
                        </p>
                      )}
                      <label className="block space-y-1 text-[11px] font-bold text-foreground">
                        <span>{text.reviewReason}</span>
                        <textarea
                          value={reviewReasons[proof.id] ?? ""}
                          minLength={10}
                          maxLength={1000}
                          rows={2}
                          onChange={(event) => {
                            reviewIntentKeys.current.delete(proof.id)
                            setReviewReasons((current) => ({
                              ...current,
                              [proof.id]: event.target.value,
                            }))
                          }}
                          placeholder={text.reviewPlaceholder}
                          className="w-full resize-y rounded-lg border border-border bg-background px-2.5 py-2 text-xs leading-5 outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </label>
                      {reviewState[proof.id] === "error" && (
                        <p
                          className="mt-1 text-[11px] font-bold text-rose-700 dark:text-rose-300"
                          role="alert"
                        >
                          {text.reviewError}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={
                            reviewLoading ||
                            binaryBlocked ||
                            (reviewReasons[proof.id]?.trim().length ?? 0) < 10
                          }
                          onClick={() => void review(proof, "accepted")}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-45 dark:text-emerald-300"
                        >
                          {reviewLoading ? (
                            <LoaderCircle
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {text.accept}
                        </button>
                        <button
                          type="button"
                          disabled={
                            reviewLoading ||
                            (reviewReasons[proof.id]?.trim().length ?? 0) < 10
                          }
                          onClick={() => void review(proof, "rejected")}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 text-[11px] font-black text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-45 dark:text-rose-300"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          {text.reject}
                        </button>
                      </div>
                    </div>
                  )}

                {proof.reviewReason && (
                  <p className="mt-2 rounded-lg bg-muted/50 px-2.5 py-2 text-[11px] leading-4 font-semibold text-muted-foreground">
                    {proof.reviewReason}
                  </p>
                )}
                {proof.events.length > 0 && (
                  <details className="mt-2">
                    <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 text-[11px] font-bold text-muted-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {text.history} ({proof.events.length})
                    </summary>
                    <ol className="mt-1 space-y-1 border-l border-border pl-3">
                      {proof.events.map((event) => (
                        <li
                          key={event.id}
                          className="text-[11px] leading-4 text-muted-foreground"
                        >
                          <span className="font-bold text-foreground">
                            {event.type}
                          </span>
                          {event.reason ? ` · ${event.reason}` : ""}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </details>
  )
}
