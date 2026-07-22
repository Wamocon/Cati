"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale } from "next-intl"
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type {
  RegistrationRecommendation,
  RegistrationRequestRecord,
  RegistrationReviewData,
} from "@/lib/registration"
import { useUser } from "@/components/user-provider"

type LocaleKey = "tr" | "en" | "de" | "ru"
type Draft = { reason: string; unitId: string; siteIds: string[] }

const copy = {
  en: {
    title: "Registration review",
    intro: "A live queue from public request to scoped activation. Managers recommend; administrators alone grant or reject access.",
    live: "Live data",
    refresh: "Refresh",
    search: "Search name, reference or unit",
    all: "All",
    pending: "Needs review",
    empty: "No registration requests match this view.",
    unavailable: "Real authentication and the registration database are required for review actions. No demo decision was written.",
    reason: "Decision note (required)",
    reasonHint: "Record what was checked and why this action is appropriate.",
    unit: "Approved unit",
    sites: "Approved work sites",
    recommendApprove: "Recommend approval",
    recommendMore: "Request information",
    recommendReject: "Recommend rejection",
    approve: "Approve & create activation",
    reject: "Reject request",
    consent: "KVKK consent",
    evidence: "Identity evidence",
    manual: "Manual review required",
    noEvidence: "Not required",
    history: "Workflow history",
    oneTime: "One-time activation link",
    oneTimeHint: "Copy this now. The plaintext token is shown only in this successful admin response and is never stored.",
    copyLink: "Copy link",
    copied: "Copied",
    lastUpdated: "Last updated",
    managerBoundary: "Your recommendation is recorded, but it does not create access.",
    selectUnit: "Select an exact unit",
    selectSite: "Select at least one site",
    failed: "The action could not be completed. Refresh and try again.",
    owner: "Owner",
    tenant: "Tenant",
    staff: "Staff",
  },
  tr: {
    title: "Kayıt inceleme",
    intro: "Genel talepten kapsamlı aktivasyona canlı kuyruk. Sorumlu önerir; erişimi yalnızca yönetici onaylar veya reddeder.",
    live: "Canlı veriler",
    refresh: "Yenile",
    search: "Ad, referans veya daire ara",
    all: "Tümü",
    pending: "İnceleme bekliyor",
    empty: "Bu görünüme uyan kayıt talebi yok.",
    unavailable: "İnceleme işlemleri için gerçek kimlik doğrulama ve kayıt veritabanı gerekir. Demo kararı yazılmadı.",
    reason: "Karar notu (zorunlu)",
    reasonHint: "Neyin kontrol edildiğini ve işlemin neden uygun olduğunu kaydedin.",
    unit: "Onaylanan daire",
    sites: "Onaylanan çalışma siteleri",
    recommendApprove: "Onay öner",
    recommendMore: "Ek bilgi iste",
    recommendReject: "Red öner",
    approve: "Onayla ve aktivasyon oluştur",
    reject: "Talebi reddet",
    consent: "KVKK onayı",
    evidence: "Kimlik kanıtı",
    manual: "Manuel inceleme gerekli",
    noEvidence: "Gerekli değil",
    history: "İş akışı geçmişi",
    oneTime: "Tek kullanımlık aktivasyon bağlantısı",
    oneTimeHint: "Şimdi kopyalayın. Açık token yalnızca bu başarılı yönetici yanıtında gösterilir ve saklanmaz.",
    copyLink: "Bağlantıyı kopyala",
    copied: "Kopyalandı",
    lastUpdated: "Son güncelleme",
    managerBoundary: "Öneriniz kaydedilir ancak erişim oluşturmaz.",
    selectUnit: "Kesin bir daire seçin",
    selectSite: "En az bir site seçin",
    failed: "İşlem tamamlanamadı. Yenileyip tekrar deneyin.",
    owner: "Malik",
    tenant: "Kiracı",
    staff: "Personel",
  },
  de: {
    title: "Registrierungsprüfung",
    intro: "Live-Warteschlange von der öffentlichen Anfrage bis zur begrenzten Aktivierung. Manager empfehlen; nur Admins geben Zugang frei.",
    live: "Live-Daten",
    refresh: "Aktualisieren",
    search: "Name, Referenz oder Einheit suchen",
    all: "Alle",
    pending: "Prüfung offen",
    empty: "Keine Registrierungsanfrage passt zu dieser Ansicht.",
    unavailable: "Für Prüfaktionen sind echte Authentifizierung und die Registrierungsdatenbank nötig. Keine Demo-Entscheidung wurde gespeichert.",
    reason: "Entscheidungsnotiz (Pflicht)",
    reasonHint: "Dokumentieren Sie Prüfung und Begründung.",
    unit: "Freigegebene Einheit",
    sites: "Freigegebene Einsatzorte",
    recommendApprove: "Freigabe empfehlen",
    recommendMore: "Information anfordern",
    recommendReject: "Ablehnung empfehlen",
    approve: "Freigeben & Aktivierung erzeugen",
    reject: "Anfrage ablehnen",
    consent: "KVKK-Einwilligung",
    evidence: "Identitätsnachweis",
    manual: "Manuelle Prüfung erforderlich",
    noEvidence: "Nicht erforderlich",
    history: "Workflow-Verlauf",
    oneTime: "Einmaliger Aktivierungslink",
    oneTimeHint: "Jetzt kopieren. Das Klartext-Token wird nur in dieser erfolgreichen Admin-Antwort gezeigt und nie gespeichert.",
    copyLink: "Link kopieren",
    copied: "Kopiert",
    lastUpdated: "Zuletzt aktualisiert",
    managerBoundary: "Ihre Empfehlung wird protokolliert, erstellt aber keinen Zugang.",
    selectUnit: "Genaue Einheit wählen",
    selectSite: "Mindestens einen Standort wählen",
    failed: "Aktion nicht abgeschlossen. Aktualisieren und erneut versuchen.",
    owner: "Eigentümer",
    tenant: "Mieter",
    staff: "Mitarbeiter",
  },
  ru: {
    title: "Проверка регистраций",
    intro: "Живая очередь от публичной заявки до ограниченной активации. Менеджер рекомендует; доступ выдаёт только администратор.",
    live: "Данные в реальном времени",
    refresh: "Обновить",
    search: "Поиск по имени, номеру или квартире",
    all: "Все",
    pending: "Ожидают проверки",
    empty: "Подходящих заявок нет.",
    unavailable: "Для действий нужны реальная авторизация и база регистраций. Деморешение не сохранено.",
    reason: "Примечание к решению (обязательно)",
    reasonHint: "Укажите, что проверено и почему действие обосновано.",
    unit: "Одобренная квартира",
    sites: "Одобренные объекты работы",
    recommendApprove: "Рекомендовать одобрение",
    recommendMore: "Запросить сведения",
    recommendReject: "Рекомендовать отказ",
    approve: "Одобрить и создать активацию",
    reject: "Отклонить заявку",
    consent: "Согласие KVKK",
    evidence: "Документ личности",
    manual: "Нужна ручная проверка",
    noEvidence: "Не требуется",
    history: "История процесса",
    oneTime: "Одноразовая ссылка активации",
    oneTimeHint: "Скопируйте сейчас. Открытый токен показывается только в этом успешном ответе и не хранится.",
    copyLink: "Копировать ссылку",
    copied: "Скопировано",
    lastUpdated: "Обновлено",
    managerBoundary: "Рекомендация записывается, но не создаёт доступ.",
    selectUnit: "Выберите точную квартиру",
    selectSite: "Выберите хотя бы один объект",
    failed: "Действие не выполнено. Обновите и повторите.",
    owner: "Собственник",
    tenant: "Арендатор",
    staff: "Персонал",
  },
} as const

function localeKey(value: string): LocaleKey {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

function badge(status: RegistrationRequestRecord["status"]) {
  if (status === "activated") return "bg-emerald-500/10 text-emerald-700"
  if (status === "approved") return "bg-blue-500/10 text-blue-700"
  if (status === "rejected") return "bg-rose-500/10 text-rose-700"
  return "bg-amber-500/10 text-amber-800"
}

export function RegistrationReviewPanel() {
  const user = useUser()
  const locale = localeKey(useLocale())
  const t = copy[locale]
  const [data, setData] = useState<RegistrationReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [queueOnly, setQueueOnly] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [busyId, setBusyId] = useState("")
  const [activationLink, setActivationLink] = useState("")
  const [copied, setCopied] = useState(false)

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true)
    try {
      const response = await fetch("/api/site-management/registration", { cache: "no-store" })
      const payload = (await response.json()) as RegistrationReviewData & { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "registration review unavailable")
      setData(payload)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.failed)
    } finally {
      if (!background) setLoading(false)
    }
  }, [t.failed])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (data?.source !== "supabase" || !process.env.NEXT_PUBLIC_SUPABASE_URL) return
    const supabase = createClient()
    const channel = supabase
      .channel("registration-review-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "registration_requests" }, () => void load(true))
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [data?.source, load])

  const requests = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale)
    return (data?.requests ?? []).filter((request) => {
      if (queueOnly && request.status !== "submitted" && request.status !== "under_review") return false
      return !normalized || `${request.fullName} ${request.reference} ${request.unitClaim ?? ""} ${request.emailMasked}`
        .toLocaleLowerCase(locale).includes(normalized)
    })
  }, [data?.requests, locale, query, queueOnly])

  function draftFor(id: string): Draft {
    return drafts[id] ?? { reason: "", unitId: "", siteIds: [] }
  }

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...draftFor(id), ...patch } }))
  }

  async function mutate(request: RegistrationRequestRecord, action: "recommend" | "approve" | "reject", recommendation?: RegistrationRecommendation) {
    const draft = draftFor(request.id)
    setBusyId(request.id)
    setError("")
    try {
      const response = await fetch("/api/site-management/registration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          action,
          requestId: request.id,
          expectedVersion: request.workflowVersion,
          reason: draft.reason,
          recommendation,
          unitId: request.requestedRole === "staff" ? null : draft.unitId || null,
          siteIds: request.requestedRole === "staff" ? draft.siteIds : [],
          activationExpiresAt: action === "approve" ? new Date(Date.now() + 7 * 86_400_000).toISOString() : null,
        }),
      })
      const payload = (await response.json()) as { registration?: RegistrationRequestRecord; error?: string }
      if (!response.ok || !payload.registration) throw new Error(payload.error ?? t.failed)
      setData((current) => current ? {
        ...current,
        generatedAt: new Date().toISOString(),
        requests: current.requests.map((item) => item.id === request.id ? payload.registration! : item),
      } : current)
      const token = payload.registration.activationToken
      if (action === "approve" && token) {
        const url = new URL(`/${locale}/signup`, window.location.origin)
        url.hash = new URLSearchParams({
          reference: payload.registration.reference,
          activation: token,
        }).toString()
        setActivationLink(url.toString())
        setCopied(false)
      }
      setDrafts((current) => ({ ...current, [request.id]: { reason: "", unitId: "", siteIds: [] } }))
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : t.failed)
    } finally {
      setBusyId("")
    }
  }

  if (user.role !== "admin" && user.role !== "manager") return null

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="registration-review-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-primary"><UserCheck className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[0.16em]">{t.live}</span></div>
          <h2 id="registration-review-title" className="mt-2 text-xl font-black text-card-foreground">{t.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{t.intro}</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold hover:bg-muted" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{t.refresh}
        </button>
      </div>

      {activationLink && (
        <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4" role="status">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><div className="min-w-0 flex-1"><p className="font-black text-foreground">{t.oneTime}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{t.oneTimeHint}</p><code className="mt-3 block overflow-x-auto rounded-xl bg-background p-3 text-xs">{activationLink}</code><button type="button" onClick={async () => { await navigator.clipboard.writeText(activationLink); setCopied(true) }} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-black text-background"><Clipboard className="h-4 w-4" />{copied ? t.copied : t.copyLink}</button></div></div>
        </div>
      )}

      {(error || data?.source === "unavailable") && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-900" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error || t.unavailable}</span></div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <label className="relative min-w-[240px] flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><span className="sr-only">{t.search}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm" /></label>
        <div className="flex rounded-xl border border-border p-1"><button type="button" onClick={() => setQueueOnly(true)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${queueOnly ? "bg-foreground text-background" : "text-muted-foreground"}`}>{t.pending}</button><button type="button" onClick={() => setQueueOnly(false)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${!queueOnly ? "bg-foreground text-background" : "text-muted-foreground"}`}>{t.all}</button></div>
      </div>

      <div className="mt-5 grid gap-4">
        {!loading && requests.length === 0 && <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t.empty}</p>}
        {requests.map((request) => {
          const draft = draftFor(request.id)
          const resident = request.requestedRole !== "staff"
          const ready = draft.reason.trim().length >= 10
          const scopeReady = resident ? Boolean(draft.unitId) : draft.siteIds.length > 0
          return (
            <article key={request.id} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${badge(request.status)}`}>{request.status.replace("_", " ")}</span><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{t[request.requestedRole]}</span><code className="text-xs text-muted-foreground">{request.reference}</code></div><h3 className="mt-2 font-black text-foreground">{request.fullName}</h3><p className="mt-1 text-xs text-muted-foreground">{request.emailMasked}{request.phone ? ` · ${request.phone}` : ""}{request.unitClaim ? ` · ${request.unitClaim}` : ""}</p></div><div className="text-right text-xs text-muted-foreground"><p>{t.consent}: {request.consentVersion}</p><p>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(request.createdAt))}</p></div></div>

              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-xl bg-muted/40 p-3"><p className="font-black text-foreground">{t.evidence}</p><p className="mt-1 text-muted-foreground">{resident ? `${request.identityType ?? "-"} · ${request.identityNumberMasked ?? "-"} · ${t.manual}` : t.noEvidence}</p></div>{request.managerRecommendation && <div className="rounded-xl bg-muted/40 p-3"><p className="font-black text-foreground">{request.managerRecommendation.replace("_", " ")}</p><p className="mt-1 text-muted-foreground">{request.managerRecommendationReason}</p></div>}</div>

              {request.status !== "approved" && request.status !== "activated" && request.status !== "rejected" && data?.mutationAvailable && (
                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1.5 text-xs font-black text-foreground">{t.reason}<textarea value={draft.reason} onChange={(event) => updateDraft(request.id, { reason: event.target.value })} placeholder={t.reasonHint} maxLength={1000} className="min-h-20 rounded-xl border border-border bg-background p-3 text-sm font-normal" /></label>
                  {user.role === "admin" ? <>
                    {resident ? <label className="grid gap-1.5 text-xs font-black">{t.unit}<select value={draft.unitId} onChange={(event) => updateDraft(request.id, { unitId: event.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal"><option value="">{t.selectUnit}</option>{data.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select></label> : <fieldset className="rounded-xl border border-border p-3"><legend className="px-1 text-xs font-black">{t.sites}</legend><div className="mt-1 flex flex-wrap gap-3">{data.sites.map((site) => <label key={site.id} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.siteIds.includes(site.id)} onChange={(event) => updateDraft(request.id, { siteIds: event.target.checked ? [...draft.siteIds, site.id] : draft.siteIds.filter((id) => id !== site.id) })} />{site.label}</label>)}</div>{draft.siteIds.length === 0 && <p className="mt-2 text-xs text-muted-foreground">{t.selectSite}</p>}</fieldset>}
                    <div className="flex flex-wrap gap-2"><button type="button" disabled={!ready || !scopeReady || busyId === request.id} onClick={() => void mutate(request, "approve")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-50"><ShieldCheck className="h-4 w-4" />{t.approve}</button><button type="button" disabled={!ready || busyId === request.id} onClick={() => void mutate(request, "reject")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-500/30 px-4 text-sm font-black text-rose-700 disabled:opacity-50"><XCircle className="h-4 w-4" />{t.reject}</button></div>
                  </> : <><p className="text-xs text-muted-foreground">{t.managerBoundary}</p><div className="flex flex-wrap gap-2"><button type="button" disabled={!ready || busyId === request.id} onClick={() => void mutate(request, "recommend", "approve")} className="h-10 rounded-xl bg-foreground px-3 text-xs font-black text-background disabled:opacity-50">{t.recommendApprove}</button><button type="button" disabled={!ready || busyId === request.id} onClick={() => void mutate(request, "recommend", "more_information")} className="h-10 rounded-xl border border-border px-3 text-xs font-black disabled:opacity-50">{t.recommendMore}</button><button type="button" disabled={!ready || busyId === request.id} onClick={() => void mutate(request, "recommend", "reject")} className="h-10 rounded-xl border border-rose-500/30 px-3 text-xs font-black text-rose-700 disabled:opacity-50">{t.recommendReject}</button></div></>}
                </div>
              )}

              <details className="mt-4 rounded-xl border border-border"><summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-xs font-black"><Clock3 className="h-4 w-4 text-primary" />{t.history} ({request.history.length})</summary><ol className="border-t border-border px-4 py-3">{request.history.map((event) => <li key={event.id} className="border-l-2 border-primary/25 pb-3 pl-3 text-xs last:pb-0"><p className="font-black text-foreground">v{event.requestVersion} · {event.eventType.replace("_", " ")}</p><p className="mt-0.5 text-muted-foreground">{event.reason ?? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</p></li>)}</ol></details>
            </article>
          )
        })}
      </div>
      {data?.generatedAt && <p className="mt-4 text-right text-xs text-muted-foreground">{t.lastUpdated}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(data.generatedAt))}</p>}
    </section>
  )
}
