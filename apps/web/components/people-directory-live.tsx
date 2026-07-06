"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale } from "next-intl"
import {
  Download,
  Languages,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { DashboardActionMenu } from "@/components/dashboard-action-menu"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
  toIntlLocale,
} from "@/lib/operational-copy"
import { localizeOperationalValue } from "@/lib/unit-matrix-copy"
import { hasPermission } from "@/lib/rbac"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type {
  PeopleDirectoryData,
  PeopleDirectoryResident,
  PeopleDirectoryStaffMember,
} from "@/lib/site-management-repository"

type RequestState = "idle" | "loading" | "success" | "error"

const PEOPLE_REALTIME_TABLES = [
  "profiles",
  "residents",
  "unit_residents",
  "staff_members",
  "role_coverage",
  "client_action_requests",
]

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function formatNumber(value: number, locale = "tr-TR") {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

function statusVariant(status: string) {
  if (status === "active" || status === "verified") return "success" as const
  if (status === "training" || status === "pending") return "warning" as const
  if (status === "blocked" || status === "restricted" || status === "rejected") return "danger" as const
  return "neutral" as const
}

function relationshipLabel(relationship: string) {
  if (relationship === "owner") return "Malik"
  if (relationship === "tenant") return "Kiracı"
  if (relationship === "guest") return "Misafir"
  if (relationship === "family") return "Aile"
  if (relationship === "authorized_contact") return "Yetkili"
  return "Sakin"
}

function staffRoleLabel(role: string) {
  if (role === "admin") return "Yönetim"
  if (role === "manager") return "Sorumlu"
  if (role === "accountant") return "Muhasebe"
  return "Personel"
}

function staffLine(member: PeopleDirectoryStaffMember, t: (value: string) => string) {
  return [member.team, member.phone ?? t("telefon yok"), member.language.toUpperCase()].join(" / ")
}

function residentLine(resident: PeopleDirectoryResident, t: (value: string) => string) {
  return [
    resident.unitNo ?? t("Daire bağlantısı yok"),
    resident.preferredChannel,
    resident.preferredLanguage.toUpperCase(),
  ].join(" / ")
}

const peopleMetricLabels = {
  tr: ["Personel", "Sakin", "Malik / Kiracı", "Riskli kayıt"],
  en: ["Staff", "Residents", "Owner / tenant", "Risk records"],
  de: ["Personal", "Bewohner", "Eigentümer / Mieter", "Risiko"],
  ru: ["Персонал", "Жители", "Владелец / арендатор", "Риск"],
} as const

export function PeopleDirectoryLive() {
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
  const intlLocale = toIntlLocale(locale)
  const t = (value: string) => localizeDashboardTextPart(value, locale)
  const [data, setData] = useState<PeopleDirectoryData | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const canExportDirectory = hasPermission(user.role, "users", "export")

  const fetchPeople = useCallback(async () => {
    setRequestState("loading")
    try {
      const response = await fetch("/api/site-management/users?limit=80", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("People directory request failed.")
      setData((await response.json()) as PeopleDirectoryData)
      setRequestState("success")
    } catch {
      setRequestState("error")
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchPeople()
    }, 0)
    const handleOperationalChange = () => {
      void fetchPeople()
    }

    window.addEventListener("site-management:changed", handleOperationalChange)

    return () => {
      window.clearTimeout(handle)
      window.removeEventListener("site-management:changed", handleOperationalChange)
    }
  }, [fetchPeople])

  useEffect(() => {
    if (!hasSupabasePublicEnv() || data?.source !== "supabase") return

    const supabase = createClient()
    let channel = supabase.channel("phase5-people-directory")

    PEOPLE_REALTIME_TABLES.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          void fetchPeople()
        }
      )
    })

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [data?.source, fetchPeople])

  const topStaff = useMemo(
    () => data?.staffMembers.slice(0, 4) ?? [],
    [data]
  )
  const topResidents = useMemo(
    () => data?.residents.slice(0, 5) ?? [],
    [data]
  )
  const lastUpdated = data?.generatedAt
    ? new Intl.DateTimeFormat(intlLocale, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(data.generatedAt))
    : null
  const failedQualityChecks = useMemo(
    () => data?.quality.checks.filter((check) => check.status === "failed") ?? [],
    [data]
  )

  return (
    <Card3D glow={false} className="overflow-hidden" aria-busy={requestState === "loading"}>
      <div className="flex flex-col gap-4 border-b border-border/70 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-base font-black text-card-foreground">
              {t("Kişi ve rol dizini")}
            </h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t("Personel, malik, kiracı, misafir ve rol kapsamı tek dizinden yönetilir. Ekip yükü, erişim kapsamı ve riskli kayıtlar aynı ekranda takip edilir.")}
          </p>
          {lastUpdated && (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {t("Son güncelleme")}: {lastUpdated}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchPeople()}
            disabled={requestState === "loading"}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw className={cn("h-4 w-4", requestState === "loading" && "animate-spin")} />
            {t("Kişi verisini yenile")}
          </button>
          {canExportDirectory && (
            <DashboardActionMenu
              label="Aksiyonlar"
              ariaLabel="Kisi dizini aksiyonlari"
              buttonClassName="border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
              items={[
                {
                  key: "export",
                  label: "Disa aktar",
                  description: "Kisi dizini dis aktarim istegi olusturur.",
                  icon: <Download />,
                  actionType: "users.directory.export",
                  ariaLabel: "Kisi dizini disa aktarim istegi olustur",
                  entityTable: "profiles",
                  title: "Kisi dizini disa aktarim istegi",
                  metadata: { source: data?.source ?? "unknown", phase: 5 },
                },
              ]}
            />
          )}
        </div>
      </div>

      {requestState === "error" && (
        <div role="alert" className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {t("Kişi dizini şu anda alınamadı. Yenile butonu ile tekrar deneyin veya API durumunu kontrol edin.")}
        </div>
      )}

      {failedQualityChecks.length > 0 && (
        <div role="alert" className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
          {t("Kişi dizini kalite kontrolü dikkat istiyor")}: {failedQualityChecks.map((check) => t(check.label)).join(", ")}
        </div>
      )}

      <div className="grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [peopleMetricLabels[locale][0], data?.summary.staffTotal ?? 0],
          [peopleMetricLabels[locale][1], data?.summary.residentTotal ?? 0],
          [peopleMetricLabels[locale][2], (data?.summary.owners ?? 0) + (data?.summary.tenants ?? 0)],
          [peopleMetricLabels[locale][3], data?.summary.highRiskResidents ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">{t(String(label))}</p>
            <p className="mt-1 text-xl font-black text-foreground">
              {formatNumber(Number(value), intlLocale)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            {t("Personel iş yükü")}
          </div>
          {topStaff.map((member) => (
            <div key={member.id} className="rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{member.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{staffLine(member, t)}</p>
                </div>
                <StatusBadge variant={statusVariant(member.status)}>
                  {t(staffRoleLabel(member.role))}
                </StatusBadge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-muted-foreground">{t("Görev")}</p>
                  <p className="font-black">{member.activeTasks}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-muted-foreground">{t("Kapsam")}</p>
                  <p className="font-black">{member.accessScope}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <Users className="h-4 w-4" />
            {t("Sakin bağlantıları")}
          </div>
          {topResidents.map((resident) => (
            <div key={`${resident.id}-${resident.unitNo ?? "no-unit"}`} className="rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{localizeOperationalValue(resident.fullName, locale)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{residentLine(resident, t)}</p>
                </div>
                <StatusBadge variant={statusVariant(resident.identityStatus)}>
                  {t(relationshipLabel(resident.relationship))}
                </StatusBadge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <StatusBadge variant={statusVariant(resident.status)}>
                  {t(resident.status)}
                </StatusBadge>
                <span className="font-bold text-muted-foreground">{t("Risk")} {resident.riskScore}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/25 p-4">
          <div className="flex items-start gap-3">
            <Languages className="mt-0.5 h-5 w-5 text-primary" />
            <div className="w-full min-w-0">
              <h3 className="text-sm font-black text-foreground">{t("Rol kapsamı")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("Rol matrisi kullanıcı görünürlüğü, finans onayı, erişim kısıtı ve dışa aktarım yetkisini ayrı ayrı tutar.")}
              </p>
              <div className="mt-4 space-y-2">
                {(data?.roleCoverage ?? []).slice(0, 6).map((role) => (
                  <div key={role.id} className="flex items-center justify-between gap-3 rounded-lg bg-background/80 p-2">
                    <span className="truncate text-xs font-bold text-foreground">{t(role.roleLabel)}</span>
                    <span className="text-xs font-black text-muted-foreground">{role.usersCount}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-background/80 p-3">
                  <p className="text-muted-foreground">{t("Onaycı")}</p>
                  <p className="text-lg font-black">{data?.summary.financeApprovers ?? 0}</p>
                </div>
                <div className="rounded-lg bg-background/80 p-3">
                  <p className="text-muted-foreground">{t("Denetim")}</p>
                  <p className="text-lg font-black">{data?.recentActions.length ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card3D>
  )
}
