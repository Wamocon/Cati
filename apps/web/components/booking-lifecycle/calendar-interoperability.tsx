"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  CalendarSync,
  Check,
  Clipboard,
  FileSearch,
  KeyRound,
  RefreshCw,
  RotateCw,
  ShieldX,
} from "lucide-react"
import { useLocale } from "next-intl"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { hasAnyPermission } from "@/lib/rbac"

type Locale = "tr" | "en" | "de" | "ru"
type Feed = {
  feed_id: string
  label: string
  scope_type: string
  site_id: string | null
  token_hint: string
  status: string
  workflow_version: number
  expires_at: string | null
  created_at: string
}
type FeedResponse = { generatedAt: string; source: string; feeds: Feed[] }
type Secret = { token: string; feedUrl: string; shownOnce: boolean }
type BookingScope = {
  scope?: { siteId?: string | null; siteName?: string; siteCode?: string }
  resources?: Array<{
    siteId?: string
    siteName?: string
    siteCode?: string
  }>
  bookings?: Array<{ siteId?: string; siteName?: string; siteCode?: string }>
}
type SiteOption = { id: string; label: string }
type ImportPreview = {
  batch: Record<string, unknown>
  parser: {
    totals: Record<string, number>
    warnings: string[]
    events: Array<{
      uid: string
      sequence: number
      startsAt: string | null
      status: string
      summary: string
      classification: string
      errors: string[]
    }>
  }
  limitation: string
}

const copy = {
  tr: {
    title: "Takvim paylaşımı",
    body: "Kişi ve daire ayrıntılarını dışarı çıkarmadan, iptal edilebilir bir takvim bağlantısı oluşturun veya bir ICS dosyasını yalnızca önizleyin.",
    provider:
      "Google, Outlook ve Cal.com bağlantıları API kimlikleri ve onay gelene kadar sağlayıcıya hazırdır; bağlı değildir.",
    refresh: "Yenile",
    create: "Güvenli bağlantı oluştur",
    label: "Takvim adı",
    scope: "Kapsam",
    site: "Tesis",
    personal: "Kendi rezervasyonlarım",
    assigned: "Atanmış işlerim",
    finance: "Finans görünümü",
    siteScope: "Tesis takvimi",
    organization: "Kurum takvimi",
    secret: "Bu bağlantı yalnızca şimdi gösterilir",
    copy: "Bağlantıyı kopyala",
    copied: "Kopyalandı",
    feeds: "Etkin bağlantılar",
    empty: "Henüz takvim bağlantısı yok.",
    rotate: "Bağlantıyı yenile",
    revoke: "Bağlantıyı iptal et",
    reason: "İptal nedeni",
    import: "ICS içe aktarma önizlemesi",
    choose: "ICS dosyası seç",
    preview: "Dosyayı güvenli şekilde önizle",
    previewOnly: "Önizleme kayıt oluşturmaz.",
    new: "Yeni",
    duplicate: "Tekrar",
    update: "Güncelleme",
    conflict: "Çakışma",
    invalid: "Geçersiz",
    loading: "Takvim bilgisi yükleniyor…",
    unavailable:
      "Kalıcı takvim hizmeti hazır değil; sahte bağlantı oluşturulmadı.",
    forbidden:
      "Bu rol için takvim bağlantısı veya içe aktarma işlemi izinli değil.",
    invalidRequest: "Gerekli alanları ve dosyayı kontrol edin.",
    generic: "Takvim işlemi tamamlanamadı.",
    source: "Kaynak",
    status: "Durum",
    start: "Başlangıç",
    active: "Etkin",
    revoked: "İptal edildi",
  },
  en: {
    title: "Calendar sharing",
    body: "Create a revocable calendar link without exposing resident/unit details, or preview an ICS file without importing it.",
    provider:
      "Google, Outlook, and Cal.com remain provider-ready-not connected-until credentials and consent are approved.",
    refresh: "Refresh",
    create: "Create secure link",
    label: "Calendar name",
    scope: "Scope",
    site: "Site",
    personal: "My bookings",
    assigned: "My assigned work",
    finance: "Finance view",
    siteScope: "Site calendar",
    organization: "Organization calendar",
    secret: "This link is shown only now",
    copy: "Copy link",
    copied: "Copied",
    feeds: "Calendar links",
    empty: "No calendar link exists yet.",
    rotate: "Rotate link",
    revoke: "Revoke link",
    reason: "Revocation reason",
    import: "ICS import preview",
    choose: "Choose an ICS file",
    preview: "Preview file safely",
    previewOnly: "Preview does not create records.",
    new: "New",
    duplicate: "Duplicate",
    update: "Update",
    conflict: "Conflict",
    invalid: "Invalid",
    loading: "Loading calendar information…",
    unavailable:
      "Persistent calendar service is not ready; no fake link was created.",
    forbidden: "This role cannot manage this feed or import.",
    invalidRequest: "Check the required fields and file.",
    generic: "The calendar action did not complete.",
    source: "Source",
    status: "Status",
    start: "Start",
    active: "Active",
    revoked: "Revoked",
  },
  de: {
    title: "Kalenderfreigabe",
    body: "Widerrufbaren Kalenderlink ohne Bewohner-/Wohnungsdetails erstellen oder eine ICS-Datei nur vorprüfen.",
    provider:
      "Google, Outlook und Cal.com sind anbieterbereit, aber ohne Zugangsdaten und Einwilligung nicht verbunden.",
    refresh: "Aktualisieren",
    create: "Sicheren Link erstellen",
    label: "Kalendername",
    scope: "Umfang",
    site: "Anlage",
    personal: "Meine Buchungen",
    assigned: "Meine Aufgaben",
    finance: "Finanzansicht",
    siteScope: "Anlagenkalender",
    organization: "Unternehmenskalender",
    secret: "Dieser Link wird nur jetzt angezeigt",
    copy: "Link kopieren",
    copied: "Kopiert",
    feeds: "Kalenderlinks",
    empty: "Noch kein Kalenderlink.",
    rotate: "Link erneuern",
    revoke: "Link widerrufen",
    reason: "Widerrufsgrund",
    import: "ICS-Importvorschau",
    choose: "ICS-Datei auswählen",
    preview: "Datei sicher vorprüfen",
    previewOnly: "Die Vorschau legt keine Datensätze an.",
    new: "Neu",
    duplicate: "Duplikat",
    update: "Aktualisierung",
    conflict: "Konflikt",
    invalid: "Ungültig",
    loading: "Kalenderdaten werden geladen…",
    unavailable:
      "Der dauerhafte Kalenderdienst ist nicht bereit; es wurde kein Scheinlink erstellt.",
    forbidden: "Diese Rolle darf den Feed oder Import nicht verwalten.",
    invalidRequest: "Bitte Pflichtfelder und Datei prüfen.",
    generic: "Kalenderaktion nicht abgeschlossen.",
    source: "Quelle",
    status: "Status",
    start: "Beginn",
    active: "Aktiv",
    revoked: "Widerrufen",
  },
  ru: {
    title: "Общий календарь",
    body: "Создайте отзываемую ссылку без данных жителей/квартир или только проверьте ICS-файл перед импортом.",
    provider:
      "Google, Outlook и Cal.com готовы к подключению, но не подключены без ключей и согласия.",
    refresh: "Обновить",
    create: "Создать безопасную ссылку",
    label: "Название календаря",
    scope: "Область",
    site: "Комплекс",
    personal: "Мои бронирования",
    assigned: "Мои задачи",
    finance: "Финансовый вид",
    siteScope: "Календарь комплекса",
    organization: "Календарь организации",
    secret: "Ссылка показывается только сейчас",
    copy: "Копировать ссылку",
    copied: "Скопировано",
    feeds: "Ссылки календаря",
    empty: "Ссылок пока нет.",
    rotate: "Обновить ссылку",
    revoke: "Отозвать ссылку",
    reason: "Причина отзыва",
    import: "Предпросмотр импорта ICS",
    choose: "Выберите ICS-файл",
    preview: "Безопасно проверить файл",
    previewOnly: "Предпросмотр не создаёт записи.",
    new: "Новый",
    duplicate: "Дубликат",
    update: "Обновление",
    conflict: "Конфликт",
    invalid: "Ошибка",
    loading: "Загружаем календарь…",
    unavailable:
      "Постоянный сервис календаря не готов; фиктивная ссылка не создана.",
    forbidden: "Эта роль не может управлять ссылкой или импортом.",
    invalidRequest: "Проверьте обязательные поля и файл.",
    generic: "Операция календаря не завершена.",
    source: "Источник",
    status: "Статус",
    start: "Начало",
    active: "Активна",
    revoked: "Отозвана",
  },
} as const

function localeOf(value: string): Locale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}
function key() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `calendar-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )
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
function messageFor(code: string | null, locale: Locale) {
  const t = copy[locale]
  if (code === "ICS_FORBIDDEN" || code === "ICS_AUTH_REQUIRED")
    return t.forbidden
  if (code === "ICS_REQUEST_INVALID" || code?.startsWith("ICS_INPUT"))
    return t.invalidRequest
  if (
    code === "ICS_CONFIGURATION_UNAVAILABLE" ||
    code === "ICS_DATABASE_UNAVAILABLE"
  )
    return t.unavailable
  return t.generic
}

class CalendarUiError extends Error {}

export function CalendarInteroperability() {
  const user = useUser()
  const locale = localeOf(useLocale())
  const t = copy[locale]
  const [data, setData] = useState<FeedResponse | null>(null)
  const [state, setState] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState<string | null>(null)
  const [label, setLabel] = useState("1Çatı")
  const [reason, setReason] = useState("")
  const [secret, setSecret] = useState<Secret | null>(null)
  const [copied, setCopied] = useState(false)
  const [sites, setSites] = useState<SiteOption[]>([])
  const [siteId, setSiteId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const pendingKeys = useRef(new Map<string, string>())

  const scopeType =
    user.role === "admin"
      ? siteId
        ? "site"
        : "organization"
      : user.role === "manager"
        ? "site"
        : user.role === "staff"
          ? "assigned_work"
          : user.role === "accountant"
            ? "finance_projection"
            : "my_bookings"
  const needsSite = scopeType === "site" || scopeType === "assigned_work"
  const canManageFeeds = hasAnyPermission(user.role, "calendar", [
    "create",
    "manage",
  ])
  const canImport = hasAnyPermission(user.role, "calendar", [
    "approve",
    "manage",
  ])

  const load = useCallback(async () => {
    setState("loading")
    try {
      const [feedResponse, scopeResponse] = await Promise.all([
        fetch("/api/site-management/calendar-feeds", { cache: "no-store" }),
        fetch("/api/site-management/booking-lifecycle", { cache: "no-store" }),
      ])
      const feedPayload = await feedResponse.json().catch(() => null)
      if (!feedResponse.ok)
        throw new CalendarUiError(messageFor(codeOf(feedPayload), locale))
      setData(feedPayload as FeedResponse)
      if (scopeResponse.ok) {
        const scope = (await scopeResponse.json()) as BookingScope
        const options = new Map<string, SiteOption>()
        const addSite = (
          id: string | null | undefined,
          name?: string,
          code?: string
        ) => {
          if (!id || options.has(id)) return
          const businessLabel = [name?.trim(), code?.trim()]
            .filter(Boolean)
            .join(" · ")
          options.set(id, {
            id,
            label: businessLabel || `${t.site} ${options.size + 1}`,
          })
        }
        for (const resource of scope.resources ?? []) {
          addSite(resource.siteId, resource.siteName, resource.siteCode)
        }
        for (const booking of scope.bookings ?? []) {
          addSite(booking.siteId, booking.siteName, booking.siteCode)
        }
        addSite(
          scope.scope?.siteId,
          scope.scope?.siteName,
          scope.scope?.siteCode
        )
        const nextSites = [...options.values()]
        setSites(nextSites)
        if (!siteId && nextSites[0]) setSiteId(nextSites[0].id)
      }
      setState("success")
    } catch (error) {
      setState("error")
      setMessage(error instanceof CalendarUiError ? error.message : t.generic)
    }
  }, [locale, siteId, t.generic, t.site])
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function mutate(
    action: "create" | "rotate" | "revoke",
    feedId?: string
  ) {
    if (needsSite && !siteId) {
      setMessage(t.invalidRequest)
      return
    }
    if (action === "revoke" && !reason.trim()) {
      setMessage(t.invalidRequest)
      return
    }
    const identity = `${action}:${feedId ?? label}:${scopeType}:${siteId}`
    let idempotency = pendingKeys.current.get(identity)
    if (!idempotency) {
      idempotency = key()
      pendingKeys.current.set(identity, idempotency)
    }
    setState("loading")
    setMessage(null)
    setCopied(false)
    try {
      const response = await fetch("/api/site-management/calendar-feeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotency,
        },
        body: JSON.stringify({
          action,
          feedId,
          label,
          scopeType,
          siteId: needsSite ? siteId : null,
          reason: action === "revoke" ? reason.trim() : null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok)
        throw new CalendarUiError(messageFor(codeOf(payload), locale))
      pendingKeys.current.delete(identity)
      setSecret((payload as { secret?: Secret }).secret ?? null)
      setMessage(action === "revoke" ? t.revoked : t.secret)
      await load()
    } catch (error) {
      setState("error")
      setMessage(error instanceof CalendarUiError ? error.message : t.generic)
    }
  }

  async function copySecret() {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret.feedUrl)
      setCopied(true)
    } catch {
      setMessage(t.generic)
    }
  }

  async function importPreview() {
    if (!file || !siteId) {
      setMessage(t.invalidRequest)
      return
    }
    setState("loading")
    setMessage(null)
    setPreview(null)
    const form = new FormData()
    form.set("file", file)
    form.set("siteId", siteId)
    try {
      const response = await fetch("/api/site-management/calendar-import", {
        method: "POST",
        headers: { "Idempotency-Key": key() },
        body: form,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok)
        throw new CalendarUiError(messageFor(codeOf(payload), locale))
      setPreview(payload as ImportPreview)
      setState("success")
      setMessage(t.previewOnly)
    } catch (error) {
      setState("error")
      setMessage(error instanceof CalendarUiError ? error.message : t.generic)
    }
  }

  const totals = useMemo(() => preview?.parser.totals ?? {}, [preview])

  return (
    <div className="space-y-6">
      <Card3D glow={false}>
        <section aria-labelledby="calendar-sharing-title" className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CalendarSync className="h-5 w-5 text-primary" />
                <h2
                  id="calendar-sharing-title"
                  className="text-base font-black"
                >
                  {t.title}
                </h2>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                {t.body}
              </p>
              <p className="mt-2 max-w-3xl text-xs font-semibold text-amber-700 dark:text-amber-300">
                {t.provider}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={state === "loading"}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
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
                className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${state === "error" ? "border-rose-500/30 bg-rose-500/10" : "border-primary/30 bg-primary/10"}`}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {message}
              </div>
            ) : null}
          </div>
          {canManageFeeds ? <form
            onSubmit={(event) => {
              event.preventDefault()
              void mutate("create")
            }}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="text-sm font-bold">
              {t.label}
              <input
                required
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2"
              />
            </label>
            <label className="text-sm font-bold">
              {t.scope}
              <input
                readOnly
                value={
                  scopeType === "my_bookings"
                    ? t.personal
                    : scopeType === "assigned_work"
                      ? t.assigned
                      : scopeType === "finance_projection"
                        ? t.finance
                        : scopeType === "organization"
                          ? t.organization
                          : t.siteScope
                }
                className="mt-1 min-h-11 w-full rounded-xl border border-border bg-muted px-3 font-normal"
              />
            </label>
            {needsSite || canImport ? (
              <label className="text-sm font-bold">
                {t.site}
                <select
                  required={needsSite}
                  value={siteId}
                  onChange={(event) => setSiteId(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2"
                >
                  <option value="">{t.organization}</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button
              type="submit"
              disabled={state === "loading" || (needsSite && !siteId)}
              className="min-h-11 self-end rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground focus-visible:ring-2 disabled:opacity-50"
            >
              <KeyRound className="mr-2 inline h-4 w-4" />
              {t.create}
            </button>
          </form> : null}
          {secret ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="font-black text-foreground">{t.secret}</p>
              <p className="mt-2 rounded-lg bg-background p-3 font-mono text-xs break-all">
                {secret.feedUrl}
              </p>
              <button
                type="button"
                onClick={() => void copySecret()}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold focus-visible:ring-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Clipboard className="h-4 w-4" />
                )}
                {copied ? t.copied : t.copy}
              </button>
            </div>
          ) : null}
          <div>
            <h3 className="text-sm font-black">{t.feeds}</h3>
            {canManageFeeds ? <label className="mt-3 block max-w-xl text-sm font-bold">
              {t.reason}
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 font-normal focus-visible:ring-2"
              />
            </label> : null}
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {data?.feeds.length ? (
                data.feeds.map((feed) => (
                  <article
                    key={feed.feed_id}
                    className="rounded-xl border border-border bg-muted/20 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="font-black">{feed.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          {feed.token_hint} · v{feed.workflow_version}
                        </p>
                      </div>
                      <StatusBadge
                        variant={
                          feed.status === "active" ? "success" : "neutral"
                        }
                      >
                        {feed.status === "active" ? t.active : t.revoked}
                      </StatusBadge>
                    </div>
                    {feed.status === "active" && canManageFeeds ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void mutate("rotate", feed.feed_id)}
                          disabled={state === "loading"}
                          className="min-h-11 rounded-xl border border-border px-3 text-xs font-black focus-visible:ring-2"
                        >
                          <RotateCw className="mr-1 inline h-4 w-4" />
                          {t.rotate}
                        </button>
                        <button
                          type="button"
                          onClick={() => void mutate("revoke", feed.feed_id)}
                          disabled={state === "loading" || !reason.trim()}
                          className="min-h-11 rounded-xl border border-rose-500/40 px-3 text-xs font-black text-rose-700 focus-visible:ring-2"
                        >
                          <ShieldX className="mr-1 inline h-4 w-4" />
                          {t.revoke}
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground lg:col-span-2">
                  {state === "loading" ? t.loading : t.empty}
                </p>
              )}
            </div>
          </div>
          {data ? (
            <p className="text-xs text-muted-foreground">
              {t.source}: {data.source} ·{" "}
              {new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(data.generatedAt))}
            </p>
          ) : null}
        </section>
      </Card3D>
      {canImport ? (
        <Card3D glow={false}>
          <section aria-labelledby="ics-import-title" className="space-y-4">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-primary" />
              <h2 id="ics-import-title" className="text-base font-black">
                {t.import}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">{t.previewOnly}</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="text-sm font-bold">
                {t.choose}
                <input
                  type="file"
                  accept=".ics,text/calendar"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 focus-visible:ring-2"
                />
              </label>
              <button
                type="button"
                onClick={() => void importPreview()}
                disabled={!file || !siteId || state === "loading"}
                className="min-h-11 self-end rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground focus-visible:ring-2 disabled:opacity-50"
              >
                {t.preview}
              </button>
            </div>
            {preview ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {["new", "duplicate", "update", "conflict", "invalid"].map(
                    (item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-border bg-muted/20 p-3"
                      >
                        <p className="text-xs font-bold text-muted-foreground">
                          {t[item as keyof typeof t]}
                        </p>
                        <p className="text-xl font-black">
                          {totals[item] ?? 0}
                        </p>
                      </div>
                    )
                  )}
                </div>
                <div className="max-h-72 overflow-auto rounded-xl border border-border">
                  <table className="w-full min-w-[36rem] text-left text-xs">
                    <thead className="sticky top-0 bg-background">
                      <tr>
                        <th className="p-3">UID</th>
                        <th className="p-3">{t.status}</th>
                        <th className="p-3">{t.start}</th>
                        <th className="p-3">{t.preview}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.parser.events.map((event) => (
                        <tr
                          key={`${event.uid}:${event.sequence}`}
                          className="border-t border-border"
                        >
                          <td className="max-w-48 truncate p-3 font-mono">
                            {event.uid}
                          </td>
                          <td className="p-3">
                            <StatusBadge
                              variant={
                                event.classification === "invalid" ||
                                event.classification === "conflict"
                                  ? "warning"
                                  : "info"
                              }
                            >
                              {t[event.classification as keyof typeof t] ??
                                t.invalid}
                            </StatusBadge>
                          </td>
                          <td className="p-3">{event.startsAt ?? "-"}</td>
                          <td className="max-w-64 truncate p-3">
                            {event.summary || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        </Card3D>
      ) : null}
    </div>
  )
}
