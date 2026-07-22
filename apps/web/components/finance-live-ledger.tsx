"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale } from "next-intl"
import {
  ArrowDownUp,
  Download,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { DashboardActionMenu } from "@/components/dashboard-action-menu"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { hasPermission } from "@/lib/rbac"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
  toIntlLocale,
} from "@/lib/operational-copy"
import { createClient } from "@/lib/supabase/client"
import { formatDualFromCents } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type {
  FinanceLedgerData,
  FinanceLedgerEntry,
} from "@/lib/site-management-repository"

type RequestState = "idle" | "loading" | "success" | "error"

const FINANCE_REALTIME_TABLES = [
  "finance_ledger_entries",
  "payment_transactions",
  "client_action_requests",
]

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Show every ledger figure in both Lira and Euro via the shared helper. The
// stored records are integer minor units (kuruş/cents).
function formatCents(cents: number, currency = "TRY") {
  return formatDualFromCents(cents, currency === "EUR" ? "EUR" : "TRY")
}

const shortMonthsTr = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
]

function shortDate(value: string | null, locale = "tr-TR") {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  // Turkish month abbreviations are rendered explicitly so the ledger date never
  // shows an English month (e.g. under an ICU-minimal runtime). Other locales
  // keep the Intl short-month formatting.
  if (locale.startsWith("tr")) {
    return `${String(date.getDate()).padStart(2, "0")} ${shortMonthsTr[date.getMonth()]}`
  }
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(date)
}

// Ledger category codes → Turkish business labels. The enum stays in the data;
// only the displayed text is localized (the wrapping localizer handles other
// locales via the shared dictionary).
function entryTypeLabel(entryType: string) {
  if (entryType === "dues") return "Aidat"
  if (entryType === "payment") return "Ödeme"
  if (entryType === "deposit") return "Depozito"
  if (entryType === "penalty") return "Ceza"
  if (entryType === "maintenance") return "Bakım"
  if (entryType === "rent") return "Kira"
  if (entryType === "fee") return "Ücret"
  if (entryType === "refund") return "İade"
  if (entryType === "adjustment") return "Düzeltme"
  return entryType || "Kayıt"
}

function statusVariant(status: string) {
  if (status === "paid") return "success" as const
  if (status === "open" || status === "partially_paid") return "warning" as const
  if (status === "overdue") return "danger" as const
  if (status === "draft") return "info" as const
  return "neutral" as const
}

function statusLabel(status: string) {
  if (status === "paid") return "Ödendi"
  if (status === "open") return "Açık"
  if (status === "partially_paid") return "Kısmi"
  if (status === "overdue") return "Gecikmiş"
  if (status === "draft") return "Taslak"
  if (status === "cancelled") return "İptal"
  return status || "Bilinmiyor"
}

function entryLabel(entry: FinanceLedgerEntry) {
  return [
    entry.unitNo ?? "Daire yok",
    entry.residentName ?? "Kişi yok",
    entry.description ?? entry.entryType,
  ].join(" - ")
}

export function FinanceLiveLedger() {
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
  const intlLocale = toIntlLocale(locale)
  const t = (value: string) => localizeDashboardTextPart(value, locale)
  const [data, setData] = useState<FinanceLedgerData | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const canExportLedger = hasPermission(user.role, "finance", "export")

  const fetchLedger = useCallback(async () => {
    setRequestState("loading")
    try {
      const response = await fetch("/api/site-management/finance?limit=12", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Finance ledger request failed.")
      setData((await response.json()) as FinanceLedgerData)
      setRequestState("success")
    } catch {
      setRequestState("error")
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchLedger()
    }, 0)
    const handleOperationalChange = () => {
      void fetchLedger()
    }

    window.addEventListener("site-management:changed", handleOperationalChange)

    return () => {
      window.clearTimeout(handle)
      window.removeEventListener("site-management:changed", handleOperationalChange)
    }
  }, [fetchLedger])

  useEffect(() => {
    if (!hasSupabasePublicEnv() || data?.source !== "supabase") return

    const supabase = createClient()
    let channel = supabase.channel("phase6-finance-ledger")

    FINANCE_REALTIME_TABLES.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          void fetchLedger()
        }
      )
    })

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [data?.source, fetchLedger])

  const currency = data?.summary.currency ?? "TRY"
  const latestEntries = useMemo(() => data?.entries.slice(0, 5) ?? [], [data])
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
            <WalletCards className="h-5 w-5 text-primary" />
            <h2 className="text-base font-black text-card-foreground">
              {t("Finans defteri")}
            </h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t("Aidat, ödeme, depozito, ceza ve düzeltme kayıtları değiştirilemez defter mantığıyla takip edilir. Hassas finans aksiyonları onay ve denetim akışına alınır.")}
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
            onClick={() => void fetchLedger()}
            disabled={requestState === "loading"}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw className={cn("h-4 w-4", requestState === "loading" && "animate-spin")} />
            {t("Defteri yenile")}
          </button>
          {canExportLedger && (
            <DashboardActionMenu
              label="Aksiyonlar"
              ariaLabel="Finans defteri aksiyonlari"
              buttonClassName="border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
              items={[
                {
                  key: "export",
                  label: "Disa aktar",
                  description: "Finans defteri dis aktarim istegi olusturur.",
                  icon: <Download />,
                  actionType: "finance.ledger.export",
                  ariaLabel: "Finans defteri disa aktarim istegi olustur",
                  entityTable: "finance_ledger_entries",
                  title: "Finans defteri disa aktarim istegi",
                  metadata: { source: data?.source ?? "unknown", phase: 6 },
                },
              ]}
            />
          )}
        </div>
      </div>

      {requestState === "error" && (
        <div role="alert" className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {t("Finans defteri şu anda alınamadı. Yenile butonu ile tekrar deneyin veya API durumunu kontrol edin.")}
        </div>
      )}

      {failedQualityChecks.length > 0 && (
        <div role="alert" className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
          {t("Finans defteri kalite kontrolü dikkat istiyor")}: {failedQualityChecks.map((check) => check.label).join(", ")}
        </div>
      )}

      <div className="grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Açık bakiye", formatCents(data?.summary.openLedgerCents ?? 0, currency)],
          ["Gecikmiş", formatCents(data?.summary.overdueLedgerCents ?? 0, currency)],
          ["Bu ay tahsilat", formatCents(data?.summary.paidThisMonthCents ?? 0, currency)],
          ["Açık kayıt", data?.summary.openEntries ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">{t(String(label))}</p>
            <p className="mt-1 text-xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <ArrowDownUp className="h-4 w-4" />
            {t("Son finans kayıtları")}
          </div>
          {latestEntries.map((entry) => (
            <div
              key={entry.id}
              className="grid gap-3 rounded-lg border border-border/70 bg-background/70 p-3 sm:grid-cols-[1fr_auto_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{t(entryLabel(entry))}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(entryTypeLabel(entry.entryType))} / {entry.period ?? "-"} / {t("vade")} {shortDate(entry.dueDate, intlLocale)}
                </p>
              </div>
              <p className="text-sm font-black text-foreground">
                {formatCents(entry.amountCents, entry.currency)}
              </p>
              <StatusBadge variant={statusVariant(entry.status)}>
                {t(statusLabel(entry.status))}
              </StatusBadge>
            </div>
          ))}
          {latestEntries.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t("Finans kaydı bulunamadı.")}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/25 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-black text-foreground">{t("Finans kontrol modeli")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("Onaylanmış finans kaydı doğrudan değiştirilmez; düzeltme için karşı kayıt açılır. Dışa aktarım, mutabakat ve ödeme aksiyonları role göre denetim akışına alınır.")}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">{t("Onaylı kayıt")}</p>
                  <p className="text-lg font-black">{data?.summary.postedEntries ?? 0}</p>
                </div>
                <div className="rounded-lg bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">{t("Yasal risk")}</p>
                  <p className="text-lg font-black">{data?.summary.legalAccounts ?? 0}</p>
                </div>
                <div className="rounded-lg bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">{t("Kısıtlı")}</p>
                  <p className="text-lg font-black">{data?.summary.restrictedUnits ?? 0}</p>
                </div>
                <div className="rounded-lg bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">{t("Denetim")}</p>
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
