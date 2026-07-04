"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowDownUp,
  Download,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react"
import { useLocale } from "next-intl"
import { Card3D } from "@/components/3d-card"
import { DashboardActionButton } from "@/components/dashboard-action-button"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"
import { localizeOperationalValue } from "@/lib/unit-matrix-copy"
import { hasPermission } from "@/lib/rbac"
import { createClient } from "@/lib/supabase/client"
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

function formatCents(cents: number, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function shortDate(value: string | null, locale: string) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
  })
    .formatToParts(new Date(value))
    .map((part) => (part.type === "month" ? localizeBusinessCopy(part.value, locale) : part.value))
    .join("")
}

function statusVariant(status: string) {
  if (status === "paid") return "success" as const
  if (status === "open" || status === "partially_paid") return "warning" as const
  if (status === "overdue") return "danger" as const
  if (status === "draft") return "info" as const
  return "neutral" as const
}

function statusLabel(status: string, locale: string) {
  if (status === "paid") return localizeBusinessCopy("Ödendi", locale)
  if (status === "open") return localizeBusinessCopy("Açık", locale)
  if (status === "partially_paid") return localizeBusinessCopy("Kısmi", locale)
  if (status === "overdue") return localizeBusinessCopy("Gecikmiş", locale)
  if (status === "draft") return localizeBusinessCopy("Taslak", locale)
  if (status === "cancelled") return localizeBusinessCopy("İptal", locale)
  return status || localizeBusinessCopy("Bilinmiyor", locale)
}

function entryLabel(entry: FinanceLedgerEntry, locale: string) {
  return [
    entry.unitNo ?? localizeBusinessCopy("Daire yok", locale),
    entry.residentName ? localizeOperationalValue(entry.residentName, resolveDashboardLocale(locale)) : localizeBusinessCopy("Kişi yok", locale),
    entry.description ? localizeBusinessCopy(entry.description, locale) : entry.entryType,
  ].join(" - ")
}

export function FinanceLiveLedger() {
  const locale = resolveDashboardLocale(useLocale())
  const user = useUser()
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
  const lastUpdated = useMemo(() => {
    if (!data?.generatedAt) return null
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(data.generatedAt))
      .map((part) => (part.type === "month" ? localizeBusinessCopy(part.value, locale) : part.value))
      .join("")
  }, [data, locale])
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
              {localizeBusinessCopy("Finans defteri", locale)}
            </h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {localizeBusinessCopy(
              "Aidat, ödeme, depozito, ceza ve düzeltme kayıtları değiştirilemez defter mantığıyla takip edilir. Hassas finans aksiyonları onay ve denetim akışına alınır.",
              locale
            )}
          </p>
          {lastUpdated && (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {localizeBusinessCopy("Son güncelleme:", locale)} {lastUpdated}
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
            {localizeBusinessCopy("Defteri yenile", locale)}
          </button>
          {canExportLedger && (
          <DashboardActionButton
            actionType="finance.ledger.export"
            ariaLabel={localizeBusinessCopy("Finans defteri dışa aktarım isteği oluştur", locale)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/15"
            entityTable="finance_ledger_entries"
            metadata={{ source: data?.source ?? "unknown", phase: 6 }}
            successLabel={localizeBusinessCopy("Dışa aktarım isteği alındı", locale)}
            title={localizeBusinessCopy("Finans defteri dışa aktarım isteği", locale)}
          >
            <Download className="h-4 w-4" />
            {localizeBusinessCopy("Dışa aktar", locale)}
          </DashboardActionButton>
          )}
        </div>
      </div>

      {requestState === "error" && (
        <div role="alert" className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {localizeBusinessCopy(
            "Finans defteri şu anda alınamadı. Yenile butonu ile tekrar deneyin veya API durumunu kontrol edin.",
            locale
          )}
        </div>
      )}

      {failedQualityChecks.length > 0 && (
        <div role="alert" className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
          {localizeBusinessCopy("Finans defteri kalite kontrolü dikkat istiyor:", locale)} {failedQualityChecks.map((check) => check.label).join(", ")}
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
            <p className="text-xs font-bold uppercase text-muted-foreground">{localizeBusinessCopy(label as string, locale)}</p>
            <p className="mt-1 text-xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <ArrowDownUp className="h-4 w-4" />
            {localizeBusinessCopy("Son finans kayıtları", locale)}
          </div>
          {latestEntries.map((entry) => (
            <div
              key={entry.id}
              className="grid gap-3 rounded-lg border border-border/70 bg-background/70 p-3 sm:grid-cols-[1fr_auto_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{entryLabel(entry, locale)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.entryType} / {entry.period ?? "-"} / {localizeBusinessCopy("vade", locale)} {shortDate(entry.dueDate, locale)}
                </p>
              </div>
              <p className="text-sm font-black text-foreground">
                {formatCents(entry.amountCents, entry.currency)}
              </p>
              <StatusBadge variant={statusVariant(entry.status)}>
                {statusLabel(entry.status, locale)}
              </StatusBadge>
            </div>
          ))}
          {latestEntries.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {localizeBusinessCopy("Finans kaydı bulunamadı.", locale)}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/25 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-black text-foreground">{localizeBusinessCopy("Finans kontrol modeli", locale)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {localizeBusinessCopy(
                  "Onaylanmış finans kaydı doğrudan değiştirilmez; düzeltme için karşı kayıt açılır. Dışa aktarım, mutabakat ve ödeme aksiyonları role göre denetim akışına alınır.",
                  locale
                )}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Onaylı kayıt", locale)}</p>
                  <p className="text-lg font-black">{data?.summary.postedEntries ?? 0}</p>
                </div>
                <div className="rounded-lg bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Yasal risk", locale)}</p>
                  <p className="text-lg font-black">{data?.summary.legalAccounts ?? 0}</p>
                </div>
                <div className="rounded-lg bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Kısıtlı", locale)}</p>
                  <p className="text-lg font-black">{data?.summary.restrictedUnits ?? 0}</p>
                </div>
                <div className="rounded-lg bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Denetim", locale)}</p>
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
