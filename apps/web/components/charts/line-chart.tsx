"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { cn } from "@/lib/utils"

interface LineChartProps {
  data: { label: string; value: number }[]
  className?: string
  height?: number
  strokeColor?: string
  fillColor?: string
  formatValue?: (v: number) => string
}

export function LineChart({
  data,
  className,
  height = 160,
  strokeColor = "var(--primary)",
  fillColor = "var(--primary)",
  formatValue = (v) => v.toLocaleString("tr-TR"),
}: LineChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })
  const padding = 20
  const width = data.length * 60
  const chartHeight = height - padding * 2
  const max = Math.max(...data.map((d) => d.value), 1)
  const stepX = width / (data.length - 1)

  const points = data.map((d, i) => {
    const x = i * stepX
    const y = padding + chartHeight - (d.value / max) * chartHeight
    return { x, y, ...d }
  })

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`

  return (
    <div ref={ref} className={cn("w-full overflow-x-auto", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaD}
          fill="url(#lineGradient)"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : {}}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
        {points.map((p, i) => (
          <g key={p.label}>
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={5}
              fill="var(--background)"
              stroke={strokeColor}
              strokeWidth={2}
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ delay: 0.8 + i * 0.05 }}
            />
            <text x={p.x} y={p.y - 12} textAnchor="middle" className="fill-foreground text-[10px] font-semibold" style={{ fontSize: 14 }}>
              {formatValue(p.value)}
            </text>
            <text x={p.x} y={height - 4} textAnchor="middle" className="fill-muted-foreground text-[10px]" style={{ fontSize: 14 }}>
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
