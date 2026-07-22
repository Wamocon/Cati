"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { ArrowUpRight, ShieldCheck, Users } from "lucide-react"
import { Link } from "@/app/navigation"
import { cn } from "@/lib/utils"
import type { GuardianWorkspace } from "@/lib/guardianship-repository"

type SummaryLocale = "tr" | "en" | "de" | "ru"

function resolveSummaryLocale(value: string): SummaryLocale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

interface SummaryCopy {
  title: string
  manage: string
  childrenCount: string
  pending: string
  none: string
  addFirst: string
}

const summaryCopy: Record<SummaryLocale, SummaryCopy> = {
  en: {
    title: "My children",
    manage: "Manage",
    childrenCount: "supervised {count}",
    pending: "{count} waiting for your OK",
    none: "No child accounts yet.",
    addFirst: "Add a child account",
  },
  tr: {
    title: "Çocuklarım",
    manage: "Yönet",
    childrenCount: "{count} hesap",
    pending: "{count} onayınızı bekliyor",
    none: "Henüz çocuk hesabı yok.",
    addFirst: "Çocuk hesabı ekle",
  },
  de: {
    title: "Meine Kinder",
    manage: "Verwalten",
    childrenCount: "{count} betreut",
    pending: "{count} warten auf Ihre Freigabe",
    none: "Noch keine Kinderkonten.",
    addFirst: "Kinderkonto hinzufügen",
  },
  ru: {
    title: "Мои дети",
    manage: "Управлять",
    childrenCount: "{count} под опекой",
    pending: "{count} ждут вашего одобрения",
    none: "Пока нет аккаунтов детей.",
    addFirst: "Добавить аккаунт ребёнка",
  },
}

/** Compact "My children" summary for the owner / tenant home. It never blocks the
 * host dashboard: on any load failure it simply renders nothing. */
export function ChildrenSummaryCard({ className }: { className?: string }) {
  const locale = resolveSummaryLocale(useLocale())
  const text = summaryCopy[locale]
  const [data, setData] = useState<GuardianWorkspace | null>(null)
  const [failed, setFailed] = useState(false)
  const sequence = useRef(0)

  const load = useCallback(async () => {
    const current = ++sequence.current
    try {
      const response = await fetch("/api/site-management/guardianship", {
        cache: "no-store",
        headers: { accept: "application/json" },
      })
      if (!response.ok) throw new Error("guardianship summary failed")
      const payload = (await response.json()) as GuardianWorkspace
      if (current !== sequence.current) return
      setData(payload)
    } catch {
      if (current === sequence.current) setFailed(true)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 0)
    const onChange = () => void load()
    window.addEventListener("site-management:changed", onChange)
    return () => {
      window.clearTimeout(handle)
      window.removeEventListener("site-management:changed", onChange)
    }
  }, [load])

  if (failed) return null

  const childCount = data?.children.length ?? 0
  const pendingCount =
    data?.children.reduce((sum, child) => sum + child.pendingApprovals.length, 0) ?? 0

  return (
    <section
      data-testid="children-summary"
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm",
        className
      )}
      aria-label={text.title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-foreground">{text.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {childCount > 0
                ? text.childrenCount.replace("{count}", String(childCount))
                : text.none}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/children"
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-black text-primary outline-none transition hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"
        >
          {childCount > 0 ? text.manage : text.addFirst}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {pendingCount > 0 ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {text.pending.replace("{count}", String(pendingCount))}
        </p>
      ) : null}
    </section>
  )
}
