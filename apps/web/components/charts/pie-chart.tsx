"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { cn } from "@/lib/utils"

interface PieChartProps {
  data: { label: string; value: number; color: string }[]
  className?: string
  size?: number
}

export function PieChart({ data, className, size = 160 }: PieChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1
  const radius = size / 2 - 8
  const center = size / 2

  const slices = data.reduce<
    {
      cumulative: number
      slices: Array<(typeof data)[number] & { path: string }>
    }
  >(
    (acc, d) => {
      const start = (acc.cumulative / total) * Math.PI * 2 - Math.PI / 2
      const nextCumulative = acc.cumulative + d.value
      const end = (nextCumulative / total) * Math.PI * 2 - Math.PI / 2
      const largeArc = end - start > Math.PI ? 1 : 0
      const x1 = center + radius * Math.cos(start)
      const y1 = center + radius * Math.sin(start)
      const x2 = center + radius * Math.cos(end)
      const y2 = center + radius * Math.sin(end)
      const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

      return {
        cumulative: nextCumulative,
        slices: [...acc.slices, { ...d, path }],
      }
    },
    { cumulative: 0, slices: [] }
  ).slices

  return (
    <div ref={ref} className={cn("flex flex-col items-center gap-4 sm:flex-row", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {slices.map((slice, i) => (
          <motion.path
            key={slice.label}
            d={slice.path}
            fill={slice.color}
            stroke="var(--background)"
            strokeWidth={2}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          />
        ))}
        <circle cx={center} cy={center} r={radius * 0.55} fill="var(--card)" />
        <text x={center} y={center - 4} textAnchor="middle" className="fill-foreground text-[10px] font-bold" style={{ fontSize: 18 }}>
          {total}
        </text>
        <text x={center} y={center + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]" style={{ fontSize: 12 }}>
          total
        </text>
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-1">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground capitalize">{d.label}</span>
            <span className="ml-auto font-semibold text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
