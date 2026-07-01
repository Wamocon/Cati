"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  ariaLabel?: string
  className?: string
  height?: number
  formatValue?: (v: number) => string
  totalLabel?: string
}

export function BarChart({
  data,
  ariaLabel,
  className,
  height = 160,
  formatValue = (v) => v.toLocaleString("tr-TR"),
  totalLabel = "Total",
}: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className={cn("min-w-0 w-full", className)}>
      <div
        className="relative overflow-visible rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_16%_12%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_srgb,var(--card)_92%,transparent),color-mix(in_srgb,var(--muted)_52%,transparent))] px-3 pb-3 pt-8 shadow-inner shadow-black/[0.025] transition-colors group-hover/command:border-primary/35"
        role="img"
        aria-label={ariaLabel ?? `Bar chart, ${totalLabel.toLowerCase()} ${formatValue(total)}`}
      >
        <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[11px] font-black text-muted-foreground backdrop-blur">
          {totalLabel} {formatValue(total)}
        </div>
        <div
          className="pointer-events-none absolute inset-x-3 bottom-12 top-8 grid grid-rows-4"
          aria-hidden="true"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="border-t border-border/35" />
          ))}
        </div>
        <div
          className="relative grid items-end gap-3"
          style={{ gridTemplateColumns: `repeat(${data.length}, minmax(38px, 1fr))`, minHeight: height }}
        >
          {data.map((d, i) => {
            const barHeight = Math.max((d.value / max) * height, 8)
            return (
              <div
                key={d.label}
                className="group/bar relative flex min-w-0 flex-col items-center justify-end gap-2 rounded-xl px-1 pb-1 transition-colors hover:bg-background/45"
                title={`${d.label}: ${formatValue(d.value)}`}
              >
                <span className="pointer-events-none absolute top-0 z-20 min-w-max -translate-y-1 rounded-lg border border-border bg-popover px-2 py-1 text-[11px] font-bold text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover/bar:opacity-100">
                  {d.label}: {formatValue(d.value)}
                </span>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, delay: i * 0.05, ease: "easeOut" }}
                  className="rounded-full border border-border/70 bg-background/78 px-2 py-1 text-center text-[11px] font-black leading-none text-foreground shadow-sm backdrop-blur sm:text-xs"
                >
                  {formatValue(d.value)}
                </motion.div>
                <div className="flex w-full max-w-[74px] items-end justify-center rounded-t-xl bg-background/55 p-1 shadow-inner">
                  <motion.div
                    initial={{ height: 0, opacity: 0.72 }}
                    animate={{ height: barHeight, opacity: 1 }}
                    whileHover={{ scaleX: 1.08 }}
                    transition={{ duration: 0.75, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full rounded-t-xl shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_14%,transparent)]"
                    style={{
                      background: `linear-gradient(180deg, color-mix(in srgb, ${d.color || "var(--primary)"} 92%, white) 0%, ${d.color || "var(--primary)"} 45%, color-mix(in srgb, ${d.color || "var(--primary)"} 72%, #03110f) 100%)`,
                    }}
                  />
                </div>
                <span className="min-h-5 min-w-0 text-center text-[11px] font-semibold leading-4 text-muted-foreground [overflow-wrap:anywhere]">
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
