"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PieChartProps {
  data: { label: string; value: number; color: string }[]
  ariaLabel?: string
  className?: string
  size?: number
  totalLabel?: string
}

function svgNumber(value: number) {
  return Number(value.toFixed(3)).toString()
}

export function PieChart({
  data,
  ariaLabel = "Portfolio status distribution",
  className,
  size = 160,
  totalLabel = "total",
}: PieChartProps) {
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
      const path = [
        "M",
        svgNumber(center),
        svgNumber(center),
        "L",
        svgNumber(x1),
        svgNumber(y1),
        "A",
        svgNumber(radius),
        svgNumber(radius),
        "0",
        largeArc,
        "1",
        svgNumber(x2),
        svgNumber(y2),
        "Z",
      ].join(" ")

      return {
        cumulative: nextCumulative,
        slices: [...acc.slices, { ...d, path }],
      }
    },
    { cumulative: 0, slices: [] }
  ).slices

  return (
    <div className={cn("flex flex-col items-center gap-4 sm:flex-row", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={ariaLabel}>
        <circle cx={center} cy={center} r={radius} fill="var(--muted)" opacity={0.55} />
        {slices.map((slice, i) => (
          <motion.path
            key={slice.label}
            d={slice.path}
            fill={slice.color}
            stroke="var(--background)"
            strokeWidth={2}
            className="cursor-pointer transition-opacity hover:opacity-85"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.025 }}
            style={{ transformOrigin: `${center}px ${center}px` }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <title>{`${slice.label}: ${slice.value}`}</title>
          </motion.path>
        ))}
        <circle cx={center} cy={center} r={radius * 0.58} fill="var(--card)" stroke="var(--border)" strokeWidth={1} />
        <text x={center} y={center - 4} textAnchor="middle" className="fill-foreground text-[10px] font-bold" style={{ fontSize: 18 }}>
          {total}
        </text>
        <text x={center} y={center + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]" style={{ fontSize: 12 }}>
          {totalLabel}
        </text>
      </svg>
      <div className="grid w-full grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-1">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex items-center gap-2 rounded-lg border border-transparent bg-muted/35 px-2 py-1.5 text-xs transition-colors hover:border-primary/20 hover:bg-primary/[0.055]"
            title={`${d.label}: ${d.value}`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground capitalize">{d.label}</span>
            <span className="ml-auto font-semibold text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
