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
  const gap = 0.25
  const topSpace = 28
  const labelSpace = 22
  const chartBottom = height - labelSpace

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${data.length * 100} ${height}`} className="w-full overflow-visible" preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.value / max) * Math.max(chartBottom - topSpace, 1)
          const x = i * 100 + gap * 50
          const w = 100 - gap * 100
          return (
            <g key={d.label}>
              <motion.rect
                x={x}
                y={height - h}
                width={w}
                rx={8}
                fill={d.color || "var(--primary)"}
                initial={{ height: 0, y: chartBottom }}
                animate={{ height: h, y: chartBottom - h }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
              />
              <text x={x + w / 2} y={chartBottom - h - 8} textAnchor="middle" className="fill-foreground text-[10px] font-semibold" style={{ fontSize: 18 }}>
                {formatValue(d.value)}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d) => (
          <span key={d.label} className="truncate text-center text-xs font-medium text-muted-foreground">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}
