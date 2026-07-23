"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  Check,
  ClipboardCheck,
  Inbox,
  Loader2,
  Sparkles,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { ticketAssigneeOptions } from "@/lib/ticket-routing"

type LocaleKey = "tr" | "en" | "de" | "ru"

function localeKey(value: string): LocaleKey {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

type Kind = "ai_suggestion" | "action_request" | "service_ticket"

interface Decision {
  endpoint: string
  method: "PATCH"
  approveBody: Record<string, unknown>
  declineBody: Record<string, unknown>
  approveHeaders?: Record<string, string>
  declineHeaders?: Record<string, string>
  approveRequiresResponder?: boolean
  approveRequiresReason?: boolean
  declineRequiresReason?: boolean
}

interface PendingItem {
  id: string
  kind: Kind
  title: string
  summary: string
  requestedBy: string | null
  requestedAt: string | null
  decideVia: Decision
}

// Responder queues offered when approving an AI-drafted ticket. Values come
// straight from the server allowlist (minus the triage queue, which the ticket
// API rejects as a final assignee) so they can never drift out of sync; only the
// business labels below are localized.
const RESPONDER_VALUES = ticketAssigneeOptions.filter(
  (value) => value !== "Operations triage queue"
)

// Business language only: no table names, enums, permission strings or UUIDs
// surface here. Turkish leads; en is the fallback for other locales.
const copy = {
  tr: {
    loading: "Onay kutusu yükleniyor…",
    empty: "Şu an onayınızı bekleyen bir şey yok.",
    errorLoad: "Onay kutusu şu an açılamadı. Yenileyip tekrar deneyin.",
    retry: "Tekrar dene",
    approve: "Onayla",
    decline: "Reddet",
    approved: "Onaylandı.",
    declined: "Reddedildi.",
    failed: "İşlem tamamlanamadı. Yenileyip tekrar deneyin.",
    requestedBy: "İsteyen",
    aiAssistant: "Yapay zekâ asistanı",
    teamMember: "Ekip üyesi",
    chooseResponder: "Sorumlu ekibi seçin",
    confirmApprove: "Onayla ve yönlendir",
    cancel: "Vazgeç",
    reasonLabel: "Karar gerekçesi",
    reasonPlaceholder: "Bu kararın gerekçesini kısaca yazın",
    reasonRequired: "Devam etmek için bir gerekçe yazın.",
    kinds: {
      ai_suggestion: "Yapay zekâ önerisi",
      action_request: "İşlem isteği",
      service_ticket: "Servis onayı",
    },
    summaryFallback: {
      ai_suggestion: "Yapay zekânın hazırladığı bir istek onayınızı bekliyor.",
      action_request: "Bir istek onayınızı bekliyor.",
      service_ticket: "Bir servis kaydı onayınızı bekliyor.",
    },
    responders: {
      "Life-safety response queue": "Can güvenliği ekibi",
      "Gas response queue": "Gaz müdahale ekibi",
      "Electrical response queue": "Elektrik ekibi",
      "Elevator response queue": "Asansör ekibi",
      "Plumbing response queue": "Tesisat ekibi",
      "Security response queue": "Güvenlik ekibi",
      "Cleaning queue": "Temizlik ekibi",
      "Resident amenity response queue": "Ortak alan ekibi",
      "Restaurant and event response queue": "Restoran ve etkinlik ekibi",
    } as Record<string, string>,
  },
  en: {
    loading: "Loading your approval inbox…",
    empty: "Nothing needs your approval right now.",
    errorLoad: "The approval inbox could not open. Refresh and try again.",
    retry: "Try again",
    approve: "Approve",
    decline: "Decline",
    approved: "Approved.",
    declined: "Declined.",
    failed: "The action could not be completed. Refresh and try again.",
    requestedBy: "Requested by",
    aiAssistant: "AI assistant",
    teamMember: "Team member",
    chooseResponder: "Choose the responding team",
    confirmApprove: "Approve and route",
    cancel: "Cancel",
    reasonLabel: "Reason for your decision",
    reasonPlaceholder: "Briefly explain why you are making this decision",
    reasonRequired: "Enter a reason to continue.",
    kinds: {
      ai_suggestion: "AI suggestion",
      action_request: "Action request",
      service_ticket: "Service approval",
    },
    summaryFallback: {
      ai_suggestion: "An AI-drafted request is waiting for your approval.",
      action_request: "A request is waiting for your approval.",
      service_ticket: "A service record is waiting for your approval.",
    },
    responders: {
      "Life-safety response queue": "Life-safety team",
      "Gas response queue": "Gas response team",
      "Electrical response queue": "Electrical team",
      "Elevator response queue": "Elevator team",
      "Plumbing response queue": "Plumbing team",
      "Security response queue": "Security team",
      "Cleaning queue": "Cleaning team",
      "Resident amenity response queue": "Amenity team",
      "Restaurant and event response queue": "Restaurant & event team",
    } as Record<string, string>,
  },
  de: {
    loading: "Freigabe-Eingang wird geladen…",
    empty: "Derzeit wartet nichts auf Ihre Freigabe.",
    errorLoad: "Der Freigabe-Eingang konnte nicht geöffnet werden. Aktualisieren und erneut versuchen.",
    retry: "Erneut versuchen",
    approve: "Freigeben",
    decline: "Ablehnen",
    approved: "Freigegeben.",
    declined: "Abgelehnt.",
    failed: "Aktion nicht abgeschlossen. Aktualisieren und erneut versuchen.",
    requestedBy: "Angefordert von",
    aiAssistant: "KI-Assistent",
    teamMember: "Teammitglied",
    chooseResponder: "Zuständiges Team wählen",
    confirmApprove: "Freigeben und zuweisen",
    cancel: "Abbrechen",
    reasonLabel: "Begründung Ihrer Entscheidung",
    reasonPlaceholder: "Begründen Sie diese Entscheidung kurz",
    reasonRequired: "Bitte geben Sie eine Begründung ein, um fortzufahren.",
    kinds: {
      ai_suggestion: "KI-Vorschlag",
      action_request: "Aktionsanfrage",
      service_ticket: "Servicefreigabe",
    },
    summaryFallback: {
      ai_suggestion: "Eine von der KI entworfene Anfrage wartet auf Ihre Freigabe.",
      action_request: "Eine Anfrage wartet auf Ihre Freigabe.",
      service_ticket: "Ein Servicevorgang wartet auf Ihre Freigabe.",
    },
    responders: {
      "Life-safety response queue": "Team Lebenssicherheit",
      "Gas response queue": "Gas-Notdienst",
      "Electrical response queue": "Elektro-Team",
      "Elevator response queue": "Aufzug-Team",
      "Plumbing response queue": "Sanitär-Team",
      "Security response queue": "Sicherheitsteam",
      "Cleaning queue": "Reinigungsteam",
      "Resident amenity response queue": "Team Gemeinschaftsbereich",
      "Restaurant and event response queue": "Restaurant- & Event-Team",
    } as Record<string, string>,
  },
  ru: {
    loading: "Загрузка папки согласований…",
    empty: "Сейчас ничего не ждёт вашего согласования.",
    errorLoad: "Не удалось открыть папку согласований. Обновите и повторите.",
    retry: "Повторить",
    approve: "Согласовать",
    decline: "Отклонить",
    approved: "Согласовано.",
    declined: "Отклонено.",
    failed: "Действие не выполнено. Обновите и повторите.",
    requestedBy: "Запросил",
    aiAssistant: "ИИ-ассистент",
    teamMember: "Сотрудник",
    chooseResponder: "Выберите ответственную команду",
    confirmApprove: "Согласовать и направить",
    cancel: "Отмена",
    reasonLabel: "Причина решения",
    reasonPlaceholder: "Кратко объясните причину этого решения",
    reasonRequired: "Введите причину, чтобы продолжить.",
    kinds: {
      ai_suggestion: "Предложение ИИ",
      action_request: "Запрос действия",
      service_ticket: "Согласование сервиса",
    },
    summaryFallback: {
      ai_suggestion: "Запрос, подготовленный ИИ, ожидает вашего согласования.",
      action_request: "Запрос ожидает вашего согласования.",
      service_ticket: "Сервисная запись ожидает вашего согласования.",
    },
    responders: {
      "Life-safety response queue": "Команда безопасности жизни",
      "Gas response queue": "Газовая аварийная команда",
      "Electrical response queue": "Электротехническая команда",
      "Elevator response queue": "Команда по лифтам",
      "Plumbing response queue": "Сантехническая команда",
      "Security response queue": "Служба безопасности",
      "Cleaning queue": "Команда уборки",
      "Resident amenity response queue": "Команда общих зон",
      "Restaurant and event response queue": "Команда ресторана и мероприятий",
    } as Record<string, string>,
  },
} as const

const kindMeta: Record<
  Kind,
  { Icon: LucideIcon; variant: "accent" | "info" | "warning" }
> = {
  ai_suggestion: { Icon: Sparkles, variant: "accent" },
  action_request: { Icon: ClipboardCheck, variant: "info" },
  service_ticket: { Icon: Wrench, variant: "warning" },
}

function formatWhen(value: string | null, locale: string): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
}

export function AdminApprovalsInbox() {
  const user = useUser()
  const locale = localeKey(useLocale())
  const t = copy[locale]

  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [busyId, setBusyId] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  // Which item is showing its responder picker, and the current choice per item.
  const [responderFor, setResponderFor] = useState("")
  const [responderChoice, setResponderChoice] = useState<Record<string, string>>(
    {}
  )
  // Which item is showing its reason input, for which decision, the typed text
  // per item, and whether the current input failed the non-empty check.
  const [reasonFor, setReasonFor] = useState("")
  const [reasonAction, setReasonAction] = useState<"approve" | "decline">("approve")
  const [reasonText, setReasonText] = useState<Record<string, string>>({})
  const [reasonInvalid, setReasonInvalid] = useState(false)
  const reasonInputRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/site-management/approvals", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("unavailable")
      const payload = (await response.json()) as { items?: PendingItem[] }
      setItems(Array.isArray(payload.items) ? payload.items : [])
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user.role !== "admin") return
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [user.role, load])

  const decide = useCallback(
    async (
      item: PendingItem,
      action: "approve" | "decline",
      options?: { responder?: string; reason?: string }
    ) => {
      setBusyId(item.id)
      setError("")
      setNotice("")
      const via = item.decideVia
      const isApprove = action === "approve"
      const extraHeaders = (isApprove ? via.approveHeaders : via.declineHeaders) ?? {}
      let body: Record<string, unknown> = isApprove ? via.approveBody : via.declineBody
      // A responder only ever applies to an approval (AI drafts); a reason
      // applies to whichever side prompted for it. Both are merged in without
      // touching the idempotency key the repository baked into the body/headers.
      if (isApprove && options?.responder) {
        body = { ...body, assignee: options.responder }
      }
      if (options?.reason) {
        body = { ...body, reason: options.reason }
      }
      try {
        const response = await fetch(via.endpoint, {
          method: via.method,
          headers: { "Content-Type": "application/json", ...extraHeaders },
          body: JSON.stringify(body),
        })
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(payload.error ?? t.failed)
        }
        // Optimistically drop the row, then reconcile with the server so any
        // newly-arrived item appears and any race is corrected.
        setItems((current) => current.filter((row) => row.id !== item.id))
        setResponderFor("")
        setReasonFor("")
        setReasonInvalid(false)
        setNotice(isApprove ? t.approved : t.declined)
        await load()
      } catch (decideError) {
        setError(decideError instanceof Error ? decideError.message : t.failed)
      } finally {
        setBusyId("")
      }
    },
    [load, t.approved, t.declined, t.failed]
  )

  // Move focus to the reason input whenever it is revealed, so a keyboard/screen-
  // reader user lands directly on the field they must fill in.
  useEffect(() => {
    if (reasonFor) reasonInputRef.current?.focus()
  }, [reasonFor])

  const openReasonInput = useCallback(
    (item: PendingItem, action: "approve" | "decline") => {
      setError("")
      setNotice("")
      setReasonInvalid(false)
      setResponderFor("")
      // Toggle closed only when the same decision is re-clicked; switching
      // between Approve and Decline keeps the panel open and swaps the action.
      setReasonFor((current) =>
        current === item.id && reasonAction === action ? "" : item.id
      )
      setReasonAction(action)
    },
    [reasonAction]
  )

  const submitReason = useCallback(
    (item: PendingItem) => {
      const value = (reasonText[item.id] ?? "").trim()
      if (!value) {
        setReasonInvalid(true)
        reasonInputRef.current?.focus()
        return
      }
      void decide(item, reasonAction, { reason: value })
    },
    [decide, reasonAction, reasonText]
  )

  function onApproveClick(item: PendingItem) {
    if (item.decideVia.approveRequiresResponder) {
      setError("")
      setNotice("")
      setReasonFor("")
      setResponderFor((current) => (current === item.id ? "" : item.id))
      setResponderChoice((current) =>
        current[item.id] ? current : { ...current, [item.id]: RESPONDER_VALUES[0] }
      )
      return
    }
    if (item.decideVia.approveRequiresReason) {
      openReasonInput(item, "approve")
      return
    }
    void decide(item, "approve")
  }

  function onDeclineClick(item: PendingItem) {
    if (item.decideVia.declineRequiresReason) {
      openReasonInput(item, "decline")
      return
    }
    void decide(item, "decline")
  }

  if (user.role !== "admin") return null

  return (
    <div className="space-y-4" data-testid="admin-approvals-inbox">
      {(error || notice) && (
        <p
          aria-live="polite"
          className={`text-xs font-semibold ${error ? "text-rose-600" : "text-emerald-700"}`}
        >
          {error || notice}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t.loading}
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <p className="text-sm text-muted-foreground">{t.errorLoad}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t.retry}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => {
            const meta = kindMeta[item.kind]
            const isBusy = busyId === item.id
            const requester =
              item.requestedBy ??
              (item.kind === "ai_suggestion" ? t.aiAssistant : t.teamMember)
            const when = formatWhen(item.requestedAt, locale)
            const summary = item.summary || t.summaryFallback[item.kind]
            const pickingResponder = responderFor === item.id
            const choice = responderChoice[item.id] ?? RESPONDER_VALUES[0]
            const pickingReason = reasonFor === item.id
            const reasonValue = reasonText[item.id] ?? ""

            return (
              <li
                key={item.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={meta.variant}>
                        <meta.Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {t.kinds[item.kind]}
                      </StatusBadge>
                    </div>
                    {item.title && (
                      <p className="mt-2 min-w-0 break-words text-sm font-black text-foreground">
                        {item.title}
                      </p>
                    )}
                    <p className="mt-1 min-w-0 break-words text-sm leading-5 text-muted-foreground">
                      {summary}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t.requestedBy}: <span className="font-semibold text-foreground">{requester}</span>
                      {when && <span> · {when}</span>}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApproveClick(item)}
                      disabled={isBusy}
                      aria-expanded={
                        item.decideVia.approveRequiresResponder
                          ? pickingResponder
                          : item.decideVia.approveRequiresReason
                            ? pickingReason && reasonAction === "approve"
                            : undefined
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-500/30 px-3 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {t.approve}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeclineClick(item)}
                      disabled={isBusy}
                      aria-expanded={
                        item.decideVia.declineRequiresReason
                          ? pickingReason && reasonAction === "decline"
                          : undefined
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-500/30 px-3 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      {t.decline}
                    </button>
                  </div>
                </div>

                {/* AI-drafted tickets materialize real work, so approval first
                    asks which team should own it. */}
                {pickingResponder && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/20 p-3">
                    <label className="grid gap-1.5 text-xs font-bold text-foreground">
                      {t.chooseResponder}
                      <select
                        value={choice}
                        onChange={(event) =>
                          setResponderChoice((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium"
                      >
                        {RESPONDER_VALUES.map((value) => (
                          <option key={value} value={value}>
                            {t.responders[value] ?? value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void decide(item, "approve", { responder: choice })}
                      disabled={isBusy}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {t.confirmApprove}
                    </button>
                    <button
                      type="button"
                      onClick={() => setResponderFor("")}
                      disabled={isBusy}
                      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                    >
                      {t.cancel}
                    </button>
                  </div>
                )}

                {/* A real service ticket's owner-approval decision records a
                    reason on both sides, so Approve and Decline first ask for
                    one before replaying the tickets PATCH. */}
                {pickingReason && (
                  <div className="mt-3 grid gap-2 rounded-lg border border-border bg-muted/20 p-3">
                    <label className="grid gap-1.5 text-xs font-bold text-foreground">
                      {t.reasonLabel}
                      <textarea
                        ref={reasonInputRef}
                        value={reasonValue}
                        rows={2}
                        onChange={(event) => {
                          const value = event.target.value
                          setReasonInvalid(false)
                          setReasonText((current) => ({
                            ...current,
                            [item.id]: value,
                          }))
                        }}
                        placeholder={t.reasonPlaceholder}
                        aria-invalid={reasonInvalid}
                        aria-describedby={
                          reasonInvalid ? `${item.id}-reason-error` : undefined
                        }
                        className="min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium"
                      />
                    </label>
                    {reasonInvalid && (
                      <p
                        id={`${item.id}-reason-error`}
                        className="text-xs font-semibold text-rose-600"
                      >
                        {t.reasonRequired}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => submitReason(item)}
                        disabled={isBusy}
                        className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${
                          reasonAction === "approve"
                            ? "bg-emerald-600 hover:bg-emerald-600/90"
                            : "bg-rose-600 hover:bg-rose-600/90"
                        }`}
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : reasonAction === "approve" ? (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {reasonAction === "approve" ? t.approve : t.decline}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReasonFor("")
                          setReasonInvalid(false)
                        }}
                        disabled={isBusy}
                        className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
