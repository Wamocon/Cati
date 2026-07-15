"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  CalendarClock,
  CheckCircle2,
  Clipboard,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
  UserPlus,
} from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import {
  tenantAccessScopes,
  type TenantAccessData,
  type TenantAccessInvitation,
  type TenantAccessScope,
} from "@/lib/tenant-access"

type LocaleKey = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    title: "Kiracı erişim yönetimi",
    body: "Malik, sahip olduğu bağımsız bölüm için süreli erişim oluşturur. Kod yalnızca bir kez gösterilir; kabul, uzatma ve iptal denetim kaydına yazılır.",
    unavailable: "Canlı davet işlemleri için gerçek kimlik doğrulaması ve organizasyon ilişkisi gerekir. Yerel rol demosu veritabanı yetkisini taklit etmez.",
    loading: "Kiracı erişimi yükleniyor…",
    retry: "Yeniden dene",
    createTitle: "Süreli davet oluştur",
    tenantName: "Kiracı adı",
    tenantEmail: "Kiracı e-postası",
    unit: "Bağımsız bölüm",
    sponsor: "Davet eden malik",
    start: "Erişim başlangıcı",
    end: "Erişim bitişi",
    reason: "Gerekçe",
    scopes: "Erişim kapsamı",
    create: "Tek kullanımlı kod oluştur",
    provider: "E-posta sağlayıcısı etkin değil; kodu güvenli kanaldan paylaşın.",
    oneTime: "Bu kod tekrar gösterilmez",
    invitationId: "Davet kimliği",
    code: "Tek kullanımlı kod",
    copy: "Kopyala",
    copied: "Kopyalandı",
    list: "Davetler",
    noInvites: "Görülebilir davet yok.",
    redeemTitle: "Davet kodunu etkinleştir",
    redeemBody: "Davet kimliğini ve size iletilen kodu girin. Oturum e-postanız davetteki e-postayla aynı olmalıdır.",
    redeem: "Erişimi etkinleştir",
    extend: "90 gün uzat",
    revoke: "Erişimi iptal et",
    manageReason: "Uzatma/iptal gerekçesi",
    saved: "İşlem tamamlandı ve denetim kaydı oluşturuldu.",
    status: { pending: "Bekliyor", accepted: "Aktif", revoked: "İptal", expired: "Süresi doldu" },
    scope: { tickets: "Servis", calendar: "Rezervasyon", documents: "Belgeler", communications: "İletişim" },
  },
  en: {
    title: "Tenant access management",
    body: "An owner sponsors time-boxed access to an owned unit. The secret is shown once; redemption, extension, and revocation are audited.",
    unavailable: "Live invitations require real authentication and an organization relationship. Local role demos never imitate database authority.",
    loading: "Loading tenant access…",
    retry: "Retry",
    createTitle: "Create time-boxed invitation",
    tenantName: "Tenant name",
    tenantEmail: "Tenant email",
    unit: "Unit",
    sponsor: "Sponsoring owner",
    start: "Access starts",
    end: "Access ends",
    reason: "Reason",
    scopes: "Access scope",
    create: "Create one-time code",
    provider: "Email delivery is not activated; share the code through a trusted channel.",
    oneTime: "This code will not be shown again",
    invitationId: "Invitation ID",
    code: "One-time code",
    copy: "Copy",
    copied: "Copied",
    list: "Invitations",
    noInvites: "No invitations are visible.",
    redeemTitle: "Redeem invitation",
    redeemBody: "Enter the invitation ID and code you received. Your signed-in email must match the invited email.",
    redeem: "Activate access",
    extend: "Extend 90 days",
    revoke: "Revoke access",
    manageReason: "Reason for extension/revocation",
    saved: "Operation completed and recorded in the audit trail.",
    status: { pending: "Pending", accepted: "Active", revoked: "Revoked", expired: "Expired" },
    scope: { tickets: "Service", calendar: "Reservations", documents: "Documents", communications: "Communication" },
  },
  de: {
    title: "Mieterzugang verwalten",
    body: "Eigentümer vergeben zeitlich begrenzten Zugang zu eigenen Einheiten. Der Code wird einmal angezeigt; Annahme, Verlängerung und Widerruf werden auditiert.",
    unavailable: "Live-Einladungen erfordern echte Authentifizierung und eine Organisationsbeziehung. Lokale Rollendemos simulieren keine Datenbankrechte.",
    loading: "Mieterzugang wird geladen…",
    retry: "Erneut versuchen",
    createTitle: "Befristete Einladung erstellen",
    tenantName: "Name des Mieters",
    tenantEmail: "E-Mail des Mieters",
    unit: "Einheit",
    sponsor: "Einladender Eigentümer",
    start: "Zugang ab",
    end: "Zugang bis",
    reason: "Begründung",
    scopes: "Zugriffsumfang",
    create: "Einmalcode erstellen",
    provider: "E-Mail-Versand ist nicht aktiviert; Code über einen sicheren Kanal teilen.",
    oneTime: "Dieser Code wird nicht erneut angezeigt",
    invitationId: "Einladungs-ID",
    code: "Einmalcode",
    copy: "Kopieren",
    copied: "Kopiert",
    list: "Einladungen",
    noInvites: "Keine sichtbaren Einladungen.",
    redeemTitle: "Einladung einlösen",
    redeemBody: "Einladungs-ID und Code eingeben. Die angemeldete E-Mail muss mit der Einladung übereinstimmen.",
    redeem: "Zugang aktivieren",
    extend: "90 Tage verlängern",
    revoke: "Zugang widerrufen",
    manageReason: "Begründung für Verlängerung/Widerruf",
    saved: "Vorgang abgeschlossen und auditiert.",
    status: { pending: "Offen", accepted: "Aktiv", revoked: "Widerrufen", expired: "Abgelaufen" },
    scope: { tickets: "Service", calendar: "Reservierungen", documents: "Dokumente", communications: "Kommunikation" },
  },
  ru: {
    title: "Доступ арендатора",
    body: "Собственник выдаёт временный доступ к своему объекту. Секрет показывается один раз; активация, продление и отзыв аудируются.",
    unavailable: "Для реальных приглашений нужны аутентификация и связь с организацией. Локальная демо-роль не имитирует права БД.",
    loading: "Загрузка доступа…",
    retry: "Повторить",
    createTitle: "Создать временное приглашение",
    tenantName: "Имя арендатора",
    tenantEmail: "E-mail арендатора",
    unit: "Объект",
    sponsor: "Пригласивший собственник",
    start: "Начало доступа",
    end: "Окончание доступа",
    reason: "Причина",
    scopes: "Объём доступа",
    create: "Создать одноразовый код",
    provider: "Отправка e-mail не активирована; передайте код по доверенному каналу.",
    oneTime: "Код больше не покажется",
    invitationId: "ID приглашения",
    code: "Одноразовый код",
    copy: "Копировать",
    copied: "Скопировано",
    list: "Приглашения",
    noInvites: "Нет видимых приглашений.",
    redeemTitle: "Активировать приглашение",
    redeemBody: "Введите ID и код. E-mail текущей сессии должен совпадать с приглашением.",
    redeem: "Активировать доступ",
    extend: "Продлить на 90 дней",
    revoke: "Отозвать доступ",
    manageReason: "Причина продления/отзыва",
    saved: "Операция выполнена и записана в аудит.",
    status: { pending: "Ожидает", accepted: "Активен", revoked: "Отозван", expired: "Истёк" },
    scope: { tickets: "Сервис", calendar: "Бронирования", documents: "Документы", communications: "Связь" },
  },
} as const

function localeKey(locale: string): LocaleKey {
  return locale === "tr" || locale === "de" || locale === "ru" ? locale : "en"
}

function isoDate(offsetDays: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function effectiveStatus(invitation: TenantAccessInvitation) {
  if (invitation.status !== "pending") return invitation.status
  return Date.parse(invitation.redeemUntil) < Date.now() ? "expired" : "pending"
}

function statusVariant(status: ReturnType<typeof effectiveStatus>) {
  if (status === "accepted") return "success" as const
  if (status === "pending") return "warning" as const
  return "neutral" as const
}

function isTenantAccessData(value: unknown): value is TenantAccessData {
  if (!value || typeof value !== "object") return false
  const record = value as Partial<TenantAccessData>
  return (
    typeof record.mutationAvailable === "boolean" &&
    Array.isArray(record.invitations) &&
    Array.isArray(record.units) &&
    Array.isArray(record.sponsors)
  )
}

export function TenantAccessLivePanel() {
  const user = useUser()
  const t = copy[localeKey(useLocale())]
  const [data, setData] = useState<TenantAccessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState("")
  const [tenantEmail, setTenantEmail] = useState("")
  const [unitId, setUnitId] = useState("")
  const [sponsorId, setSponsorId] = useState("")
  const [accessFrom, setAccessFrom] = useState(() => isoDate(0))
  const [accessUntil, setAccessUntil] = useState(() => isoDate(365))
  const [scopes, setScopes] = useState<TenantAccessScope[]>([...tenantAccessScopes])
  const [reason, setReason] = useState("")
  const [invitationId, setInvitationId] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [manageId, setManageId] = useState<string | null>(null)
  const [manageReason, setManageReason] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [oneTime, setOneTime] = useState<{ id: string; code: string } | null>(null)
  const operationKeys = useRef(new Map<string, { fingerprint: string; key: string }>())

  const allowedRole = user.role === "admin" || user.role === "owner" || user.role === "tenant"

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/site-management/tenant-access", {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal,
      })
      const payload: unknown = await response.json()
      if (!response.ok || !isTenantAccessData(payload)) {
        const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
        throw new Error(typeof record.error === "string" ? record.error : "Tenant access could not be loaded.")
      }
      setData(payload)
      setUnitId((current) => current || payload.units[0]?.id || "")
      setSponsorId((current) => current || payload.sponsors[0]?.id || "")
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return
      setError(loadError instanceof Error ? loadError.message : "Tenant access could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!allowedRole) return
    const controller = new AbortController()
    void fetch("/api/site-management/tenant-access", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload: unknown = await response.json()
        if (!response.ok || !isTenantAccessData(payload)) {
          const record = payload && typeof payload === "object"
            ? (payload as Record<string, unknown>)
            : {}
          throw new Error(
            typeof record.error === "string"
              ? record.error
              : "Tenant access could not be loaded."
          )
        }
        return payload
      })
      .then((payload) => {
        setData(payload)
        setUnitId((current) => current || payload.units[0]?.id || "")
        setSponsorId((current) => current || payload.sponsors[0]?.id || "")
        setLoading(false)
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Tenant access could not be loaded."
        )
        setLoading(false)
      })
    return () => controller.abort()
  }, [allowedRole])

  const invitations = useMemo(() => data?.invitations ?? [], [data?.invitations])
  const selectedInvitation = useMemo(
    () => invitations.find((invitation) => invitation.id === manageId) ?? null,
    [invitations, manageId]
  )

  function stableKey(operation: string, body: unknown) {
    const fingerprint = JSON.stringify(body)
    const existing = operationKeys.current.get(operation)
    if (existing?.fingerprint === fingerprint) return existing.key
    const key = `${operation}:${crypto.randomUUID()}`
    operationKeys.current.set(operation, { fingerprint, key })
    return key
  }

  function replaceInvitation(invitation: TenantAccessInvitation) {
    setData((current) => {
      if (!current) return current
      const exists = current.invitations.some((item) => item.id === invitation.id)
      return {
        ...current,
        invitations: exists
          ? current.invitations.map((item) => (item.id === invitation.id ? invitation : item))
          : [invitation, ...current.invitations],
      }
    })
  }

  async function apiMutation(operation: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    setBusy(operation)
    setError(null)
    setNotice(null)
    const key = stableKey(operation, body)
    try {
      const response = await fetch("/api/site-management/tenant-access", {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify(body),
      })
      const payload: unknown = await response.json()
      const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
      if (!response.ok) throw new Error(typeof record.error === "string" ? record.error : "Tenant access operation failed.")
      operationKeys.current.delete(operation)
      const invitation = record.invitation as TenantAccessInvitation | undefined
      if (!invitation?.id) throw new Error("The server returned an invalid invitation.")
      replaceInvitation(invitation)
      return { invitation, oneTimeCode: typeof record.oneTimeCode === "string" ? record.oneTimeCode : null }
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Tenant access operation failed.")
      return null
    } finally {
      setBusy(null)
    }
  }

  async function createInvitation() {
    if (!unitId || !sponsorId || !tenantName.trim() || !tenantEmail.trim() || reason.trim().length < 10 || scopes.length === 0) return
    const result = await apiMutation("tenant-invite-create", "POST", {
      unitId,
      sponsorOwnerProfileId: sponsorId,
      tenantName: tenantName.trim(),
      tenantEmail: tenantEmail.trim(),
      allowedScopes: scopes,
      accessValidFrom: accessFrom,
      accessValidUntil: accessUntil,
      redeemFrom: new Date().toISOString(),
      redeemUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      reason: reason.trim(),
    })
    if (!result) return
    if (result.oneTimeCode) setOneTime({ id: result.invitation.id, code: result.oneTimeCode })
    setTenantName("")
    setTenantEmail("")
    setReason("")
    setNotice(t.saved)
  }

  async function redeemInvitation() {
    if (!invitationId.trim() || !inviteCode.trim()) return
    const result = await apiMutation("tenant-invite-redeem", "PATCH", {
      action: "redeem",
      invitationId: invitationId.trim(),
      inviteCode: inviteCode.trim(),
    })
    if (!result) return
    setInviteCode("")
    setNotice(t.saved)
    await load()
  }

  async function manageInvitation(action: "extend" | "revoke") {
    if (!selectedInvitation || manageReason.trim().length < 10) return
    const end = new Date(`${selectedInvitation.accessValidUntil}T00:00:00Z`)
    end.setUTCDate(end.getUTCDate() + 90)
    const body: Record<string, unknown> = {
      action,
      invitationId: selectedInvitation.id,
      expectedVersion: selectedInvitation.workflowVersion,
      reason: manageReason.trim(),
    }
    if (action === "extend") {
      body.accessValidUntil = end.toISOString().slice(0, 10)
      body.redeemUntil = selectedInvitation.status === "pending"
        ? new Date(Date.now() + 7 * 86_400_000).toISOString()
        : null
    }
    const result = await apiMutation(`tenant-invite-${action}:${selectedInvitation.id}`, "PATCH", body)
    if (!result) return
    setManageReason("")
    setManageId(null)
    setNotice(t.saved)
  }

  if (!allowedRole) return null
  if (loading) {
    return (
      <section aria-busy="true" className="rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t.loading}</p>
      </section>
    )
  }
  if (!data) {
    return (
      <section role="alert" className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.05] p-5">
        <p className="text-sm font-bold text-rose-700">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary"><RefreshCw className="h-4 w-4" />{t.retry}</button>
      </section>
    )
  }

  return (
    <section aria-labelledby="tenant-access-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-br from-primary/[0.09] via-card to-emerald-500/[0.05] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 id="tenant-access-title" className="text-lg font-black text-foreground">{t.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t.body}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {!data.mutationAvailable ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <p className="text-sm leading-6 text-muted-foreground">{t.unavailable}</p>
          </div>
        ) : user.role === "tenant" ? (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-black text-foreground">{t.redeemTitle}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.redeemBody}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold">{t.invitationId}<input value={invitationId} onChange={(event) => setInvitationId(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 font-mono text-sm font-normal" /></label>
              <label className="grid gap-1.5 text-xs font-bold">{t.code}<input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} autoComplete="one-time-code" className="h-10 rounded-lg border border-border bg-background px-3 font-mono text-sm font-normal" /></label>
            </div>
            <button type="button" onClick={() => void redeemInvitation()} disabled={!invitationId.trim() || !inviteCode.trim() || busy !== null} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{t.redeem}</button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="flex items-center gap-2 font-black text-foreground"><UserPlus className="h-4 w-4 text-primary" />{t.createTitle}</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1.5 text-xs font-bold">{t.tenantName}<input value={tenantName} onChange={(event) => setTenantName(event.target.value)} maxLength={160} className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal" /></label>
              <label className="grid gap-1.5 text-xs font-bold">{t.tenantEmail}<input value={tenantEmail} onChange={(event) => setTenantEmail(event.target.value)} type="email" maxLength={254} className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal" /></label>
              <label className="grid gap-1.5 text-xs font-bold">{t.unit}<select value={unitId} onChange={(event) => setUnitId(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"><option value="">—</option>{data.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select></label>
              {user.role === "admin" ? <label className="grid gap-1.5 text-xs font-bold">{t.sponsor}<select value={sponsorId} onChange={(event) => setSponsorId(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"><option value="">—</option>{data.sponsors.map((sponsor) => <option key={sponsor.id} value={sponsor.id}>{sponsor.label}</option>)}</select></label> : null}
              <label className="grid gap-1.5 text-xs font-bold">{t.start}<input value={accessFrom} onChange={(event) => setAccessFrom(event.target.value)} type="date" className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal" /></label>
              <label className="grid gap-1.5 text-xs font-bold">{t.end}<input value={accessUntil} min={accessFrom} onChange={(event) => setAccessUntil(event.target.value)} type="date" className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal" /></label>
              <fieldset className="rounded-lg border border-border bg-background p-3 md:col-span-2 xl:col-span-3"><legend className="px-1 text-xs font-bold">{t.scopes}</legend><div className="mt-1 flex flex-wrap gap-3">{tenantAccessScopes.map((scope) => <label key={scope} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={scopes.includes(scope)} onChange={(event) => setScopes((current) => event.target.checked ? [...current, scope] : current.filter((item) => item !== scope))} className="h-4 w-4 rounded border-border" />{t.scope[scope]}</label>)}</div></fieldset>
              <label className="grid gap-1.5 text-xs font-bold md:col-span-2 xl:col-span-3">{t.reason}<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" /></label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void createInvitation()} disabled={!unitId || !sponsorId || !tenantName.trim() || !tenantEmail.trim() || scopes.length === 0 || reason.trim().length < 10 || busy !== null} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy === "tenant-invite-create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{t.create}</button><p className="text-xs text-muted-foreground">{t.provider}</p></div>
          </div>
        )}

        {oneTime ? (
          <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
            <p className="font-black text-emerald-800">{t.oneTime}</p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">{t.invitationId}</dt><dd className="mt-1 break-all font-mono text-sm">{oneTime.id}</dd></div><div><dt className="text-xs text-muted-foreground">{t.code}</dt><dd className="mt-1 break-all font-mono text-sm font-bold">{oneTime.code}</dd></div></dl>
            <button type="button" onClick={() => void navigator.clipboard.writeText(`${oneTime.id}\n${oneTime.code}`).then(() => setNotice(t.copied))} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary"><Clipboard className="h-4 w-4" />{t.copy}</button>
          </div>
        ) : null}

        <div>
          <h3 className="flex items-center gap-2 font-black text-foreground"><CalendarClock className="h-4 w-4 text-primary" />{t.list}</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {invitations.length === 0 ? <p className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">{t.noInvites}</p> : invitations.map((invitation) => {
              const status = effectiveStatus(invitation)
              return <article key={invitation.id} className="rounded-xl border border-border bg-background p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-foreground">{invitation.tenantName}</p><p className="mt-1 text-xs text-muted-foreground">{invitation.emailMasked} · {invitation.codeHint}</p></div><StatusBadge variant={statusVariant(status)}>{t.status[status]}</StatusBadge></div><p className="mt-3 text-xs text-muted-foreground">{invitation.accessValidFrom} → {invitation.accessValidUntil}</p><div className="mt-2 flex flex-wrap gap-1.5">{invitation.allowedScopes.map((scope) => <span key={scope} className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px]">{t.scope[scope]}</span>)}</div>{(user.role === "owner" || user.role === "admin") && status !== "revoked" && status !== "expired" ? <button type="button" onClick={() => { setManageId(invitation.id); setManageReason("") }} className="mt-3 text-xs font-bold text-primary">{t.extend} / {t.revoke}</button> : null}</article>
            })}
          </div>
        </div>

        {selectedInvitation ? (
          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4"><label className="grid gap-1.5 text-xs font-bold">{t.manageReason}<textarea value={manageReason} onChange={(event) => setManageReason(event.target.value)} rows={2} maxLength={1000} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" /></label><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void manageInvitation("extend")} disabled={manageReason.trim().length < 10 || busy !== null} className="rounded-lg border border-primary/30 bg-background px-3 py-2 text-xs font-bold text-primary disabled:opacity-50">{t.extend}</button><button type="button" onClick={() => void manageInvitation("revoke")} disabled={manageReason.trim().length < 10 || busy !== null} className="rounded-lg border border-rose-500/30 bg-background px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">{t.revoke}</button></div></div>
        ) : null}

        <p aria-live="polite" className={error ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>{error ?? notice}</p>
      </div>
    </section>
  )
}
