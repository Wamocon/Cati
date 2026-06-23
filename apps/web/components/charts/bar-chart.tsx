"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { cn } from "@/lib/utils"

interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  className?: string
  height?: number
  formatValue?: (v: number) => string
}

export function BarChart({ data, className, height = 160, formatValue = (v) => v.toLocaleString("tr-TR") }: BarChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })
  const max = Math.max(...data.map((d) => d.value), 1)
  const gap = 0.25

  return (
    <div ref={ref} className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${data.length * 100} ${height}`} className="w-full overflow-visible" preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 24)
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
                initial={{ height: 0, y: height }}
                animate={isInView ? { height: h, y: height - h } : {}}
                transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
              />
              <text x={x + w / 2} y={height - h - 8} textAnchor="middle" className="fill-foreground text-[10px] font-semibold" style={{ fontSize: 18 }}>
                {formatValue(d.value)}
              </text>
              <text x={x + w / 2} y={height + 16} textAnchor="middle" className="fill-muted-foreground text-[10px]" style={{ fontSize: 16 }}>
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
