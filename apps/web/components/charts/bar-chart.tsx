"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  className?: string
  height?: number
  formatValue?: (v: number) => string
}

export function BarChart({ data, className, height = 160, formatValue = (v) => v.toLocaleString("tr-TR") }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className={cn("min-w-0 w-full", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-muted/20 px-3 pt-5 pb-3">
        <div
          className="pointer-events-none absolute inset-x-3 top-5 bottom-12 grid grid-rows-4"
          aria-hidden="true"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="border-t border-border/60" />
          ))}
        </div>
        <div
          className="relative grid items-end gap-3"
          style={{ gridTemplateColumns: `repeat(${data.length}, minmax(38px, 1fr))`, minHeight: height }}
        >
          {data.map((d, i) => {
            const barHeight = Math.max((d.value / max) * height, 8)
            return (
              <div key={d.label} className="flex min-w-0 flex-col items-center justify-end gap-2">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, delay: i * 0.05, ease: "easeOut" }}
                  className="text-center text-[11px] font-black leading-none text-foreground sm:text-xs"
                >
                  {formatValue(d.value)}
                </motion.div>
                <motion.div
                  initial={{ height: 0, opacity: 0.72 }}
                  animate={{ height: barHeight, opacity: 1 }}
                  transition={{ duration: 0.75, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full max-w-[74px] rounded-t-xl shadow-sm"
                  style={{
                    background: `linear-gradient(180deg, ${d.color || "var(--primary)"} 0%, color-mix(in srgb, ${d.color || "var(--primary)"} 78%, #03110f) 100%)`,
                  }}
                />
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
