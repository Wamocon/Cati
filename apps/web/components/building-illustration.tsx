"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface BuildingIllustrationProps {
  className?: string
}

export function BuildingIllustration({ className }: BuildingIllustrationProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <motion.svg
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewBox="0 0 800 640"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        role="img"
        aria-labelledby="building-title building-desc"
      >
        <title id="building-title">Modern residential tower illustration</title>
        <desc id="building-desc">A modern apartment tower with balconies, a swimming pool, palm trees and sun.</desc>
        <defs>
          <linearGradient
            id="building-sky"
            x1="400"
            y1="0"
            x2="400"
            y2="640"
            gradientUnits="userSpaceOnUse"
          >
            <stop
              offset="0%"
              stopColor="var(--primary)"
              stopOpacity="0.12"
            />
            <stop
              offset="60%"
              stopColor="var(--background)"
              stopOpacity="0"
            />
          </linearGradient>
          <linearGradient
            id="tower-face"
            x1="400"
            y1="80"
            x2="400"
            y2="560"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FDF8F3" />
            <stop offset="100%" stopColor="#EDE6DD" />
          </linearGradient>
          <linearGradient
            id="tower-side"
            x1="540"
            y1="80"
            x2="620"
            y2="560"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#E8E0D5" />
            <stop offset="100%" stopColor="#D6CFC4" />
          </linearGradient>
          <linearGradient
            id="window-glass"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
            gradientUnits="objectBoundingBox"
          >
            <stop
              offset="0%"
              stopColor="var(--primary)"
              stopOpacity="0.55"
            />
            <stop
              offset="100%"
              stopColor="var(--primary)"
              stopOpacity="0.25"
            />
          </linearGradient>
          <linearGradient
            id="pool-water"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.8" />
          </linearGradient>
          <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="16"
              stdDeviation="20"
              floodColor="var(--foreground)"
              floodOpacity="0.08"
            />
          </filter>
        </defs>

        {/* Sky glow behind building */}
        <rect
          x="60"
          y="20"
          width="680"
          height="600"
          rx="32"
          fill="url(#building-sky)"
          opacity="0.6"
        />

        {/* Ground / landscaped podium */}
        <path
          d="M120 560 Q400 540 680 560 L680 600 Q400 620 120 600 Z"
          fill="var(--muted)"
          opacity="0.5"
        />

        {/* Side building */}
        <g filter="url(#soft-shadow)">
          <rect
            x="520"
            y="260"
            width="140"
            height="300"
            rx="12"
            fill="#F3EEE6"
          />
          <rect
            x="540"
            y="280"
            width="100"
            height="260"
            rx="8"
            fill="url(#tower-face)"
          />
          {/* Side building windows */}
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 3 }).map((_, col) => (
              <rect
                key={`side-${row}-${col}`}
                x={552 + col * 30}
                y={300 + row * 46}
                width={18}
                height={28}
                rx={3}
                fill="url(#window-glass)"
              />
            ))
          )}
        </g>

        {/* Main tower */}
        <g filter="url(#soft-shadow)">
          {/* Main body */}
          <rect
            x="220"
            y="80"
            width="300"
            height="480"
            rx="20"
            fill="url(#tower-face)"
          />
          {/* Right side shade */}
          <path
            d="M520 80 L560 100 L560 560 L520 560 Z"
            fill="url(#tower-side)"
            opacity="0.7"
          />
          {/* Roof crown */}
          <path d="M240 80 L500 80 L490 60 L250 60 Z" fill="#E8E0D5" />
          <rect x="360" y="35" width="20" height="35" rx="3" fill="#D6CFC4" />

          {/* Balconies */}
          {Array.from({ length: 8 }).map((_, row) => (
            <rect
              key={`balcony-${row}`}
              x={200}
              y={135 + row * 52}
              width={340}
              height={10}
              rx={4}
              fill="#E8E0D5"
              opacity="0.8"
            />
          ))}

          {/* Windows grid */}
          {Array.from({ length: 8 }).map((_, row) =>
            Array.from({ length: 5 }).map((_, col) => (
              <rect
                key={`win-${row}-${col}`}
                x={245 + col * 50}
                y={115 + row * 52}
                width={30}
                height={40}
                rx={5}
                fill="url(#window-glass)"
                stroke="var(--border)"
                strokeWidth="0.5"
                strokeOpacity="0.4"
              />
            ))
          )}

          {/* Entrance canopy */}
          <path d="M310 560 L430 560 L450 530 L290 530 Z" fill="#D6CFC4" />
          <rect
            x="355"
            y="540"
            width="30"
            height="20"
            rx="2"
            fill="#5C5045"
            opacity="0.5"
          />
        </g>

        {/* Pool */}
        <g>
          <rect
            x="280"
            y="575"
            width="180"
            height="30"
            rx="15"
            fill="url(#pool-water)"
          />
          <rect
            x="300"
            y="582"
            width="140"
            height="4"
            rx="2"
            fill="white"
            opacity="0.25"
          />
          <rect
            x="320"
            y="590"
            width="100"
            height="3"
            rx="1.5"
            fill="white"
            opacity="0.2"
          />
        </g>

        {/* Palm tree left */}
        <g transform="translate(150, 500)">
          <path
            d="M10 80 Q15 40 35 10"
            stroke="#8D7F6F"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse
            cx="35"
            cy="10"
            rx="22"
            ry="8"
            fill="#6DA34D"
            transform="rotate(-20 35 10)"
          />
          <ellipse
            cx="35"
            cy="10"
            rx="22"
            ry="8"
            fill="#6DA34D"
            transform="rotate(20 35 10)"
          />
          <ellipse
            cx="35"
            cy="10"
            rx="22"
            ry="8"
            fill="#6DA34D"
            transform="rotate(90 35 10)"
          />
        </g>

        {/* Palm tree right */}
        <g transform="translate(610, 490)">
          <path
            d="M20 90 Q10 50 0 15"
            stroke="#8D7F6F"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse
            cx="0"
            cy="15"
            rx="20"
            ry="7"
            fill="#6DA34D"
            transform="rotate(-25 0 15)"
          />
          <ellipse
            cx="0"
            cy="15"
            rx="20"
            ry="7"
            fill="#6DA34D"
            transform="rotate(25 0 15)"
          />
          <ellipse
            cx="0"
            cy="15"
            rx="20"
            ry="7"
            fill="#6DA34D"
            transform="rotate(90 0 15)"
          />
        </g>

        {/* Sun */}
        <circle cx="680" cy="100" r="28" fill="#FBBF24" opacity="0.25" />
        <circle cx="680" cy="100" r="18" fill="#FBBF24" opacity="0.45" />

        {/* Floating stats dots */}
        <circle
          cx="180"
          cy="160"
          r="4"
          fill="var(--primary)"
          opacity="0.4"
        />
        <circle
          cx="620"
          cy="200"
          r="3"
          fill="var(--accent)"
          opacity="0.4"
        />
        <circle
          cx="160"
          cy="380"
          r="3"
          fill="var(--primary)"
          opacity="0.3"
        />
      </motion.svg>

      {/* Subtle floating reflection card */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-primary/10 ring-inset" />
    </div>
  )
}
