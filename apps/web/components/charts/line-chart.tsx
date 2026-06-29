"use client"

import { motion } from "framer-motion"
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
  const topPadding = 42
  const bottomPadding = 34
  const chartHeight = Math.max(height - topPadding - bottomPadding, 56)
  const values = data.map((d) => d.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const domainMax = max + range * 0.22
  const domainMin = Math.max(0, min - range * 0.16)
  const domainRange = Math.max(domainMax - domainMin, 1)
  const xPadding = 8
  const stepX = data.length > 1 ? (100 - xPadding * 2) / (data.length - 1) : 0

  const points = data.map((d, i) => {
    const x = xPadding + i * stepX
    const y =
      topPadding + chartHeight - ((d.value - domainMin) / domainRange) * chartHeight
    return { x, y, ...d }
  })

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const baseline = height - bottomPadding
  const areaD = `${pathD} L ${100 - xPadding} ${baseline} L ${xPadding} ${baseline} Z`

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border/70 bg-muted/20",
        className
      )}
      style={{ height }}
    >
      <svg
        viewBox={`0 0 100 ${height}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Line chart"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 4 }).map((_, index) => {
          const y = topPadding + (chartHeight / 3) * index
          return (
            <line
              key={index}
              x1={xPadding}
              x2={100 - xPadding}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeOpacity={0.58}
              strokeWidth={1}
            />
          )
        })}
        <motion.path
          d={areaD}
          fill="url(#lineGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={0.72}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0">
        {points.map((p, i) => (
          <div key={p.label}>
            <motion.div
              className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-background shadow-sm"
              style={{
                left: `${p.x}%`,
                top: p.y,
                borderColor: strokeColor,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + i * 0.05 }}
            />
            <div
              className="absolute -translate-x-1/2 whitespace-nowrap text-[13px] font-black leading-none text-foreground sm:text-sm"
              style={{ left: `${p.x}%`, top: Math.max(10, p.y - 27) }}
            >
              {formatValue(p.value)}
            </div>
            <div
              className="absolute -translate-x-1/2 whitespace-nowrap text-xs font-semibold leading-none text-muted-foreground sm:text-[13px]"
              style={{ left: `${p.x}%`, top: height - 33 }}
            >
              {p.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
