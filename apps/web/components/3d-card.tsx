"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface Card3DProps {
  children: React.ReactNode
  className?: string
  innerClassName?: string
  glow?: boolean
}

export function Card3D({ children, className, innerClassName, glow = true }: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [hovering, setHovering] = useState(false)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    setRotateX(((y - centerY) / centerY) * -6)
    setRotateY(((x - centerX) / centerX) * 6)
  }

  function handleMouseLeave() {
    setRotateX(0)
    setRotateY(0)
    setHovering(false)
  }

  return (
    <div
      ref={ref}
      className={cn("group perspective-[1000px]", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          "relative transform-gpu rounded-2xl border border-border bg-card p-5 shadow-sm transition-transform duration-200 ease-out will-change-transform",
          glow && "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:opacity-0 before:transition-opacity before:duration-300 group-hover:before:opacity-100",
          innerClassName
        )}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${hovering ? 1.01 : 1})`,
          transformStyle: "preserve-3d",
        }}
      >
        {glow && (
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `radial-gradient(circle at ${50 + rotateY * 5}% ${50 - rotateX * 5}%, color-mix(in srgb, var(--primary) 12%, transparent), transparent 60%)`,
            }}
          />
        )}
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  )
}
