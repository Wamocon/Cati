"use client"

import { useId } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LineChartProps {
  data: { label: string; value: number }[]
  ariaLabel?: string
  className?: string
  height?: number
  strokeColor?: string
  fillColor?: string
  formatValue?: (v: number) => string
}

export function LineChart({
  data,
  ariaLabel = "Line chart",
  className,
  height = 160,
  strokeColor = "var(--primary)",
  fillColor = "var(--primary)",
  formatValue = (v) => v.toLocaleString("tr-TR"),
}: LineChartProps) {
  const gradientId = useId().replace(/:/g, "")
  const topPadding = 34
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

  const pathD = points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`
      const previous = points[index - 1]
      const controlX = previous.x + (point.x - previous.x) / 2
      return `C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`
    })
    .join(" ")
  const baseline = height - bottomPadding
  const areaD = `${pathD} L ${100 - xPadding} ${baseline} L ${xPadding} ${baseline} Z`
  const latestPoint = points[points.length - 1]

  return (
    <div
      className={cn(
        "group/chart relative w-full overflow-visible rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_18%_12%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_srgb,var(--card)_92%,transparent),color-mix(in_srgb,var(--muted)_54%,transparent))] shadow-inner shadow-black/[0.025] transition-colors group-hover/command:border-primary/35",
        className
      )}
      style={{ height }}
    >
      <svg
        viewBox={`0 0 100 ${height}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.25" />
            <stop offset="62%" stopColor={fillColor} stopOpacity="0.08" />
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
              strokeOpacity={0.34}
              strokeWidth={1}
            />
          )
        })}
        {points.map((point) => (
          <line
            key={point.label}
            x1={point.x}
            x2={point.x}
            y1={topPadding - 8}
            y2={baseline}
            stroke="var(--border)"
            strokeDasharray="2 5"
            strokeOpacity={0.18}
            strokeWidth={1}
          />
        ))}
        <motion.path
          d={areaD}
          fill={`url(#${gradientId}-area)`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeOpacity={0.14}
          strokeWidth={9}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <motion.path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2.25}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      </svg>
      <div className="absolute inset-0">
        {latestPoint && (
          <div
            className="pointer-events-none absolute rounded-full border border-primary/20 bg-background/90 px-2.5 py-1 text-[11px] font-black text-primary shadow-sm backdrop-blur"
            style={{
              left: `${Math.min(latestPoint.x, 88)}%`,
              top: Math.max(8, latestPoint.y - 36),
            }}
          >
            {formatValue(latestPoint.value)}
          </div>
        )}
        {points.map((p, i) => (
          <div key={p.label}>
            <motion.div
              className="group/point pointer-events-auto absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
              style={{
                left: `${p.x}%`,
                top: p.y,
              }}
              title={`${p.label}: ${formatValue(p.value)}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + i * 0.05 }}
            >
              <span
                className="absolute left-1/2 top-1/2 block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-background shadow-sm transition-transform group-hover/point:scale-125"
                style={{ borderColor: strokeColor }}
              />
              <span
                className="pointer-events-none absolute bottom-full left-1/2 mb-2 min-w-max -translate-x-1/2 rounded-lg border border-border bg-popover px-2 py-1 text-[11px] font-bold text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover/point:opacity-100"
              >
                {p.label}: {formatValue(p.value)}
              </span>
            </motion.div>
            <div
              className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-xs font-semibold leading-none text-muted-foreground sm:text-[13px]"
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
