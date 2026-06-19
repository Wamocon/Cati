"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface DashboardPreviewProps {
  className?: string
}

export function DashboardPreview({ className }: DashboardPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-xl",
        className
      )}
    >
      {/* Window title bar */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="ml-3 h-4 flex-1 rounded-md bg-muted" />
      </div>

      <svg
        viewBox="0 0 640 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="property-img"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
            gradientUnits="objectBoundingBox"
          >
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0.25"
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--accent))"
              stopOpacity="0.15"
            />
          </linearGradient>
        </defs>

        {/* Sidebar */}
        <rect
          x="0"
          y="0"
          width="140"
          height="400"
          rx="8"
          fill="hsl(var(--muted))"
          opacity="0.5"
        />
        <rect
          x="16"
          y="24"
          width="100"
          height="8"
          rx="4"
          fill="hsl(var(--muted-foreground))"
          opacity="0.25"
        />
        <rect
          x="16"
          y="52"
          width="80"
          height="6"
          rx="3"
          fill="hsl(var(--primary))"
          opacity="0.25"
        />
        <rect
          x="16"
          y="74"
          width="90"
          height="6"
          rx="3"
          fill="hsl(var(--muted-foreground))"
          opacity="0.2"
        />
        <rect
          x="16"
          y="96"
          width="70"
          height="6"
          rx="3"
          fill="hsl(var(--muted-foreground))"
          opacity="0.2"
        />
        <rect
          x="16"
          y="118"
          width="85"
          height="6"
          rx="3"
          fill="hsl(var(--muted-foreground))"
          opacity="0.2"
        />

        {/* Header */}
        <rect
          x="164"
          y="16"
          width="180"
          height="14"
          rx="6"
          fill="hsl(var(--foreground))"
          opacity="0.1"
        />
        <rect
          x="164"
          y="42"
          width="120"
          height="8"
          rx="4"
          fill="hsl(var(--muted-foreground))"
          opacity="0.2"
        />

        {/* Stats row */}
        <rect
          x="164"
          y="72"
          width="130"
          height="70"
          rx="10"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
        <rect
          x="180"
          y="90"
          width="60"
          height="10"
          rx="4"
          fill="hsl(var(--foreground))"
          opacity="0.12"
        />
        <rect
          x="180"
          y="110"
          width="40"
          height="16"
          rx="3"
          fill="hsl(var(--primary))"
          opacity="0.35"
        />

        <rect
          x="314"
          y="72"
          width="130"
          height="70"
          rx="10"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
        <rect
          x="330"
          y="90"
          width="60"
          height="10"
          rx="4"
          fill="hsl(var(--foreground))"
          opacity="0.12"
        />
        <rect
          x="330"
          y="110"
          width="40"
          height="16"
          rx="3"
          fill="hsl(var(--accent))"
          opacity="0.4"
        />

        <rect
          x="464"
          y="72"
          width="130"
          height="70"
          rx="10"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
        <rect
          x="480"
          y="90"
          width="60"
          height="10"
          rx="4"
          fill="hsl(var(--foreground))"
          opacity="0.12"
        />
        <rect
          x="480"
          y="110"
          width="40"
          height="16"
          rx="3"
          fill="hsl(var(--primary))"
          opacity="0.35"
        />

        {/* Listing card 1 */}
        <rect
          x="164"
          y="160"
          width="430"
          height="96"
          rx="12"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
        <rect
          x="180"
          y="176"
          width="96"
          height="64"
          rx="8"
          fill="url(#property-img)"
        />
        <rect
          x="292"
          y="182"
          width="160"
          height="10"
          rx="4"
          fill="hsl(var(--foreground))"
          opacity="0.15"
        />
        <rect
          x="292"
          y="202"
          width="100"
          height="8"
          rx="3"
          fill="hsl(var(--muted-foreground))"
          opacity="0.2"
        />
        <rect
          x="292"
          y="222"
          width="80"
          height="8"
          rx="3"
          fill="hsl(var(--muted-foreground))"
          opacity="0.15"
        />
        <rect
          x="520"
          y="186"
          width="56"
          height="18"
          rx="8"
          fill="hsl(var(--primary))"
          opacity="0.2"
        />
        <rect
          x="525"
          y="190"
          width="46"
          height="10"
          rx="4"
          fill="hsl(var(--primary))"
          opacity="0.5"
        />

        {/* Listing card 2 */}
        <rect
          x="164"
          y="272"
          width="430"
          height="96"
          rx="12"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
        <rect
          x="180"
          y="288"
          width="96"
          height="64"
          rx="8"
          fill="url(#property-img)"
        />
        <rect
          x="292"
          y="294"
          width="140"
          height="10"
          rx="4"
          fill="hsl(var(--foreground))"
          opacity="0.15"
        />
        <rect
          x="292"
          y="314"
          width="110"
          height="8"
          rx="3"
          fill="hsl(var(--muted-foreground))"
          opacity="0.2"
        />
        <rect
          x="292"
          y="334"
          width="90"
          height="8"
          rx="3"
          fill="hsl(var(--muted-foreground))"
          opacity="0.15"
        />
        <rect
          x="520"
          y="298"
          width="56"
          height="18"
          rx="8"
          fill="hsl(var(--accent))"
          opacity="0.2"
        />
        <rect
          x="525"
          y="302"
          width="46"
          height="10"
          rx="4"
          fill="hsl(var(--accent))"
          opacity="0.6"
        />
      </svg>
    </motion.div>
  )
}
