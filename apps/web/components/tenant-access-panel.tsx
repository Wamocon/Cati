"use client"

import { useMemo, useState } from "react"
import { useLocale } from "next-intl"
import {
  Ban,
  CalendarClock,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"
import { resolveDashboardLocale } from "@/lib/business-copy"
import { tenantAccessGrants, type TenantAccessGrant } from "@/lib/site-management-data"

type LocaleKey = "tr" | "en" | "de" | "ru"
type GrantStatus = "active" | "expiring" | "expired"

const localeTag: Record<LocaleKey, string> = {
  tr: "tr-TR",
  en: "en-GB",
  de: "de-DE",
  ru: "ru-RU",
}

const copy = {
  tr: {
    title: "Kiracı zaman erişimi",
    subtitle:
      "Malik davet eder, süreyi seçer ve tüm kira boyunca sorumluluğu taşır. Erişim seçilen sürede kendiliğinden sona erer — manuel kapatma gerekmez.",
    active: "Aktif",
    expiring: "Yakında bitiyor",
    expired: "Süresi doldu",
    daysLeft: "gün kaldı",
    daysAgo: "gün önce doldu",
    sponsoredBy: "Davet eden malik",
    invite: "Davet oluştur",
    tenantName: "Kiracı adı",
    unit: "Daire (ör. B3 / 12)",
    duration: "Süre",
    days: "gün",
    create: "Zaman sınırlı davet oluştur",
    extend: "90 gün uzat",
    revoke: "İptal et",
    code: "Davet kodu",
    validUntil: "Bitiş",
    empty: "Aktif kiracı daveti yok.",
  },
  en: {
    title: "Tenant time-boxed access",
    subtitle:
      "The owner invites, chooses the window, and carries responsibility for the whole lease. Access expires on its own — no manual off-switch.",
    active: "Active",
    expiring: "Expiring soon",
    expired: "Expired",
    daysLeft: "days left",
    daysAgo: "days ago",
    sponsoredBy: "Sponsoring owner",
    invite: "Create invite",
    tenantName: "Tenant name",
    unit: "Unit (e.g. B3 / 12)",
    duration: "Duration",
    days: "days",
    create: "Create time-boxed invite",
    extend: "Extend 90 days",
    revoke: "Revoke",
    code: "Invite code",
    validUntil: "Ends",
    empty: "No active tenant invites.",
  },
  de: {
    title: "Mieter-Zeitzugang",
    subtitle:
      "Der Eigentümer lädt ein, wählt die Dauer und trägt die Verantwortung über die gesamte Mietzeit. Der Zugang läuft von selbst ab — kein manuelles Abschalten.",
    active: "Aktiv",
    expiring: "Läuft bald ab",
    expired: "Abgelaufen",
    daysLeft: "Tage übrig",
    daysAgo: "Tagen abgelaufen",
    sponsoredBy: "Einladender Eigentümer",
    invite: "Einladung erstellen",
    tenantName: "Mietername",
    unit: "Einheit (z. B. B3 / 12)",
    duration: "Dauer",
    days: "Tage",
    create: "Zeitlich begrenzte Einladung erstellen",
    extend: "Um 90 Tage verlängern",
    revoke: "Widerrufen",
    code: "Einladungscode",
    validUntil: "Ende",
    empty: "Keine aktiven Mietereinladungen.",
  },
  ru: {
    title: "Временный доступ арендатора",
    subtitle:
      "Собственник приглашает, выбирает срок и несёт ответственность весь период аренды. Доступ истекает сам — без ручного отключения.",
    active: "Активен",
    expiring: "Скоро истекает",
    expired: "Истёк",
    daysLeft: "дн. осталось",
    daysAgo: "дн. назад истёк",
    sponsoredBy: "Пригласивший собственник",
    invite: "Создать приглашение",
    tenantName: "Имя арендатора",
    unit: "Квартира (напр. B3 / 12)",
    duration: "Срок",
    days: "дн.",
    create: "Создать ограниченное по времени приглашение",
    extend: "Продлить на 90 дней",
    revoke: "Отозвать",
    code: "Код приглашения",
    validUntil: "Окончание",
    empty: "Нет активных приглашений арендаторов.",
  },
} satisfies Record<LocaleKey, Record<string, string>>

function statusOf(endOffsetDays: number): GrantStatus {
  if (endOffsetDays < 0) return "expired"
  if (endOffsetDays <= 14) return "expiring"
  return "active"
}

function statusVariant(status: GrantStatus): "success" | "warning" | "danger" {
  if (status === "active") return "success"
  if (status === "expiring") return "warning"
  return "danger"
}

export function TenantAccessPanel() {
  const locale = resolveDashboardLocale(useLocale()) as LocaleKey
  const t = copy[locale] ?? copy.tr
  const [grants, setGrants] = useState<TenantAccessGrant[]>(() =>
    tenantAccessGrants.map((g) => ({ ...g }))
  )
  // Capture the render baseline once at mount so date math stays pure per render.
  const [nowMs] = useState(() => Date.now())
  const [showForm, setShowForm] = useState(false)
  const [newTenant, setNewTenant] = useState("")
  const [newUnit, setNewUnit] = useState("")
  const [newDuration, setNewDuration] = useState(90)

  const summary = useMemo(() => {
    let active = 0
    let expiring = 0
    let expired = 0
    for (const g of grants) {
      const s = statusOf(g.endOffsetDays)
      if (s === "active") active++
      else if (s === "expiring") expiring++
      else expired++
    }
    return { active, expiring, expired }
  }, [grants])

  function formatEnd(offsetDays: number) {
    const date = new Date(nowMs + offsetDays * 86_400_000)
    return date.toLocaleDateString(localeTag[locale])
  }

  function extend(id: string) {
    setGrants((prev) =>
      prev.map((g) => (g.id === id ? { ...g, endOffsetDays: g.endOffsetDays + 90 } : g))
    )
  }

  function revoke(id: string) {
    setGrants((prev) => prev.filter((g) => g.id !== id))
  }

  function createInvite() {
    if (!newTenant.trim() || !newUnit.trim()) return
    const code = `NLP-INV-${Date.now().toString(36).toUpperCase().slice(-6)}`
    setGrants((prev) => [
      {
        id: `grant-${code}`,
        tenantName: newTenant.trim(),
        unit: newUnit.trim(),
        ownerName: "—",
        startOffsetDays: 0,
        endOffsetDays: newDuration,
        scope: ["tickets", "documents", "communications"],
        inviteCode: code,
      },
      ...prev,
    ])
    setNewTenant("")
    setNewUnit("")
    setShowForm(false)
  }

  const sorted = [...grants].sort((a, b) => a.endOffsetDays - b.endOffsetDays)

  return (
    <Card3D glow={false}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-6 w-6 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-card-foreground">{t.title}</h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          {t.invite}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-xs font-semibold text-emerald-700">{t.active}</p>
          <p className="mt-1 text-2xl font-black text-foreground">{summary.active}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold text-amber-700">{t.expiring}</p>
          <p className="mt-1 text-2xl font-black text-foreground">{summary.expiring}</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
          <p className="text-xs font-semibold text-rose-700">{t.expired}</p>
          <p className="mt-1 text-2xl font-black text-foreground">{summary.expired}</p>
        </div>
      </div>

      {showForm && (
        <div className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input
            value={newTenant}
            onChange={(e) => setNewTenant(e.target.value)}
            placeholder={t.tenantName}
            aria-label={t.tenantName}
            maxLength={80}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
          />
          <input
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            placeholder={t.unit}
            aria-label={t.unit}
            maxLength={40}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
          />
          <select
            value={newDuration}
            onChange={(e) => setNewDuration(Number(e.target.value))}
            aria-label={t.duration}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value={30}>30 {t.days}</option>
            <option value={90}>90 {t.days}</option>
            <option value={180}>180 {t.days}</option>
          </select>
          <button
            type="button"
            onClick={createInvite}
            disabled={!newTenant.trim() || !newUnit.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {t.create}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-3" data-testid="tenant-access-list">
        {sorted.length === 0 && (
          <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            {t.empty}
          </p>
        )}
        {sorted.map((grant) => {
          const status = statusOf(grant.endOffsetDays)
          const daysText =
            status === "expired"
              ? `${Math.abs(grant.endOffsetDays)} ${t.daysAgo}`
              : `${grant.endOffsetDays} ${t.daysLeft}`
          return (
            <div
              key={grant.id}
              className="rounded-xl border border-border bg-muted/20 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge variant={statusVariant(status)}>
                      {status === "active" ? t.active : status === "expiring" ? t.expiring : t.expired}
                    </StatusBadge>
                    <span className="text-sm font-black text-foreground">{grant.tenantName}</span>
                    <span className="text-xs text-muted-foreground">• {grant.unit}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.sponsoredBy}: <span className="font-semibold text-foreground">{grant.ownerName}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {t.validUntil}: {formatEnd(grant.endOffsetDays)} · {daysText}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
                      <KeyRound className="h-3 w-3" />
                      {grant.inviteCode}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {grant.scope.map((s) => (
                      <span key={s} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => extend(grant.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-bold text-foreground transition hover:border-primary/40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t.extend}
                  </button>
                  <button
                    type="button"
                    onClick={() => revoke(grant.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/5 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-500/10"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {t.revoke}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" />
        {t.subtitle}
      </p>
    </Card3D>
  )
}
