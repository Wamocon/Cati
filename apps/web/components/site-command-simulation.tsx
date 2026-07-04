"use client"

import type { CSSProperties } from "react"
import { useLocale } from "next-intl"
import { Activity, ArrowUpRight, LockKeyhole, TicketCheck, WalletCards } from "lucide-react"
import { Link } from "@/app/navigation"
import { cn } from "@/lib/utils"
import { interpolate, localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"
import {
  type BlockOverview,
  formatTryShort,
  getBlockOverview,
  getSummary,
  type SiteSummary,
  serviceTickets,
} from "@/lib/site-management-data"

const towerSkins = [
  "from-teal-500/30 via-cyan-400/15 to-white/5",
  "from-sky-500/30 via-teal-400/15 to-white/5",
  "from-amber-500/30 via-teal-400/15 to-white/5",
  "from-rose-500/30 via-amber-400/15 to-white/5",
]

interface SiteCommandSimulationProps {
  blocks?: BlockOverview[]
  className?: string
  summary?: SiteSummary
  urgentTicketCount?: number
}

export function SiteCommandSimulation({
  blocks: liveBlocks,
  className,
  summary: liveSummary,
  urgentTicketCount,
}: SiteCommandSimulationProps) {
  const locale = resolveDashboardLocale(useLocale())
  const blocks = liveBlocks ?? getBlockOverview()
  const summary = liveSummary ?? getSummary()
  const urgentTickets = serviceTickets.filter((ticket) => ticket.slaHoursRemaining < 0 || ticket.priority === "urgent")
  const urgentTicketTotal = urgentTicketCount ?? urgentTickets.length

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-[linear-gradient(135deg,color-mix(in_srgb,var(--card)_94%,transparent),color-mix(in_srgb,var(--primary)_8%,var(--card)))] p-4 shadow-sm md:p-5",
        className
      )}
      aria-label={localizeBusinessCopy("Site operations risk map", locale)}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(color-mix(in_srgb,var(--border)_70%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--border)_70%,transparent)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {localizeBusinessCopy("Operasyon risk haritası", locale)}
              </p>
              <h2 className="mt-3 text-lg font-black text-foreground md:text-xl">{localizeBusinessCopy("Blok, borç, servis ve erişim risk haritası", locale)}</h2>
              <p className="mt-1 max-w-2xl text-xs text-muted-foreground md:text-sm">
                {localizeBusinessCopy("8 blok ve 769 daire; borç, servis, erişim ve SLA riskleri tek operasyon görünümünde okunur.", locale)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-border bg-card/70 px-3 py-2">
                <p className="font-black text-foreground">{summary.restrictedAccess}</p>
                <p className="text-muted-foreground">{localizeBusinessCopy("kısıt", locale)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 px-3 py-2">
                <p className="font-black text-foreground">{summary.overdueTickets}</p>
                <p className="text-muted-foreground">SLA</p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 px-3 py-2">
                <p className="font-black text-foreground">{formatTryShort(summary.totalDebtTry)}</p>
                <p className="text-muted-foreground">{localizeBusinessCopy("borç", locale)}</p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/listings"
            aria-label={localizeBusinessCopy("3D blok risk haritasını daire matrisinde aç", locale)}
            className="mt-6 block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
          <div className="site-orbit-scene min-h-[300px] rounded-2xl border border-border/70 bg-background/70 p-4 transition hover:border-primary/40">
            <div className="site-grid-floor" />
            <div className="site-risk-route site-risk-route-a" />
            <div className="site-risk-route site-risk-route-b" />
            <div className="site-block-field">
              {blocks.map((block, index) => {
                const debtRatio = block.debtTry / Math.max(summary.totalDebtTry, 1)
                const height = 82 + Math.round((block.occupied / block.total) * 86)
                const alert = block.blocked > 4 || debtRatio > 0.13
                return (
                  <div
                    key={block.block}
                    className="site-tower-wrap"
                    style={{
                      "--tower-x": `${(index % 4) * 24}%`,
                      "--tower-y": `${Math.floor(index / 4) * 45}%`,
                      "--tower-height": `${height}px`,
                    } as CSSProperties}
                  >
                    <div className="site-tower-shadow" />
                    <div
                      className={cn(
                        "site-tower bg-gradient-to-b",
                        towerSkins[index % towerSkins.length],
                        alert && "site-tower-alert"
                      )}
                    >
                      {Array.from({ length: 12 }).map((_, windowIndex) => (
                        <span key={windowIndex} className={cn("site-window", windowIndex % 5 === 0 && "site-window-hot")} />
                      ))}
                    </div>
                    <div className="site-tower-label">
                      <span>{localizeBusinessCopy("Blok", locale)} {block.block}</span>
                      <strong>{block.total}</strong>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          </Link>
        </div>

        <aside className="grid gap-3 lg:w-72">
          {[
            {
              icon: WalletCards,
              label: localizeBusinessCopy("Tahsilat rotası", locale),
              value: formatTryShort(summary.totalDebtTry),
              text: localizeBusinessCopy("90+ gün, aktif rezervasyon ve erişim kısıtı birlikte skorlanır.", locale),
            },
            {
              icon: TicketCheck,
              label: localizeBusinessCopy("SLA alarmı", locale),
              value: interpolate(localizeBusinessCopy("{count} iş", locale), { count: urgentTicketTotal }),
              text: localizeBusinessCopy("Teknik rota ödeme onayı ve öncelik riskine göre sıralanır.", locale),
            },
            {
              icon: LockKeyhole,
              label: localizeBusinessCopy("Erişim motoru", locale),
              value: interpolate(localizeBusinessCopy("{count} kısıt", locale), { count: summary.restrictedAccess }),
              text: localizeBusinessCopy("Mobil kod, kart ve plaka kararları tek güvenlik modelinden geçer.", locale),
            },
            {
              icon: Activity,
              label: localizeBusinessCopy("AI nabız", locale),
              value: interpolate(localizeBusinessCopy("{count} risk", locale), { count: summary.aiRiskCount }),
              text: localizeBusinessCopy("Her risk aksiyona çevrilir: ara, kısıtla, servis ata, belge iste.", locale),
            },
          ].map((item) => {
            const href =
              item.icon === WalletCards
                ? "/dashboard/finance"
                : item.icon === TicketCheck
                  ? "/dashboard/tickets"
                  : item.icon === LockKeyhole
                    ? "/dashboard/compliance"
                    : "/dashboard/reports"

            return (
            <Link
              key={item.label}
              href={href}
              aria-label={interpolate(localizeBusinessCopy("{label} detayını aç", locale), { label: item.label })}
              className="block rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
            <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm backdrop-blur transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">{item.label}</p>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-black text-foreground">{item.value}</p>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
            </Link>
            )
          })}
        </aside>
      </div>
    </section>
  )
}
