"use client"

import type { CSSProperties } from "react"
import { Activity, LockKeyhole, Radar, TicketCheck, WalletCards } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  formatTryShort,
  getBlockOverview,
  getSummary,
  serviceTickets,
} from "@/lib/site-management-data"

const towerSkins = [
  "from-teal-500/30 via-cyan-400/15 to-white/5",
  "from-sky-500/30 via-teal-400/15 to-white/5",
  "from-amber-500/30 via-teal-400/15 to-white/5",
  "from-rose-500/30 via-amber-400/15 to-white/5",
]

export function SiteCommandSimulation({ className }: { className?: string }) {
  const blocks = getBlockOverview()
  const summary = getSummary()
  const urgentTickets = serviceTickets.filter((ticket) => ticket.slaHoursRemaining < 0 || ticket.priority === "urgent")

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-[linear-gradient(135deg,color-mix(in_srgb,var(--card)_94%,transparent),color-mix(in_srgb,var(--primary)_8%,var(--card)))] p-4 shadow-sm md:p-5",
        className
      )}
      aria-label="3D site operations simulation"
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(color-mix(in_srgb,var(--border)_70%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--border)_70%,transparent)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase text-primary">
                <Radar className="h-3.5 w-3.5" />
                Canlı Site Simülasyonu
              </div>
              <h2 className="mt-3 text-lg font-black text-foreground md:text-xl">Blok, borç, servis ve erişim risk haritası</h2>
              <p className="mt-1 max-w-2xl text-xs text-muted-foreground md:text-sm">
                8 blok ve 769 daire, AI öncelik motoru için tek 3D operasyon sahnesinde okunur.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-border bg-card/70 px-3 py-2">
                <p className="font-black text-foreground">{summary.restrictedAccess}</p>
                <p className="text-muted-foreground">kısıt</p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 px-3 py-2">
                <p className="font-black text-foreground">{summary.overdueTickets}</p>
                <p className="text-muted-foreground">SLA</p>
              </div>
              <div className="rounded-xl border border-border bg-card/70 px-3 py-2">
                <p className="font-black text-foreground">{formatTryShort(summary.totalDebtTry)}</p>
                <p className="text-muted-foreground">borç</p>
              </div>
            </div>
          </div>

          <div className="site-orbit-scene mt-6 min-h-[300px] rounded-2xl border border-border/70 bg-background/70 p-4">
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
                      <span>Blok {block.block}</span>
                      <strong>{block.total}</strong>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <aside className="grid gap-3 lg:w-72">
          {[
            {
              icon: WalletCards,
              label: "Tahsilat rotası",
              value: formatTryShort(summary.totalDebtTry),
              text: "90+ gün, aktif rezervasyon ve erişim kısıtı birlikte skorlanır.",
            },
            {
              icon: TicketCheck,
              label: "SLA alarmı",
              value: `${urgentTickets.length} iş`,
              text: "Teknik rota ödeme onayı ve öncelik riskine göre sıralanır.",
            },
            {
              icon: LockKeyhole,
              label: "Erişim motoru",
              value: `${summary.restrictedAccess} kısıt`,
              text: "Mobil kod, kart ve plaka kararları tek güvenlik modelinden geçer.",
            },
            {
              icon: Activity,
              label: "AI nabız",
              value: `${summary.aiRiskCount} risk`,
              text: "Her risk aksiyona çevrilir: ara, kısıtla, servis ata, belge iste.",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card/80 p-3 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">{item.label}</p>
                </div>
                <p className="text-sm font-black text-foreground">{item.value}</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </aside>
      </div>
    </section>
  )
}
