"use client"

import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"

interface HyperFrameProps {
  className?: string
}

export function HyperFrame({ className }: HyperFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: -8, y: 12 })
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    if (!isHovering) {
      const interval = setInterval(() => {
        setRotation((prev) => ({
          x: prev.x + Math.sin(Date.now() / 2000) * 0.3,
          y: prev.y + Math.cos(Date.now() / 2400) * 0.3,
        }))
      }, 50)
      return () => clearInterval(interval)
    }
  }, [isHovering])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
    const y = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    setRotation({ x: -x * 14, y: y * 14 })
  }

  return (
    <div
      ref={containerRef}
      className={cn("perspective-1000 relative", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
        setRotation({ x: -8, y: 12 })
      }}
    >
      <div
        className="preserve-3d relative h-full w-full transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        }}
      >
        {/* Back frame */}
        <div className="absolute inset-0 rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 shadow-2xl" />

        {/* 3D building wireframe */}
        <div className="preserve-3d absolute inset-8 flex items-center justify-center">
          {/* Main tower */}
          <div
            className="preserve-3d relative h-48 w-32 bg-gradient-to-b from-primary/20 to-primary/5 sm:h-56 sm:w-40"
            style={{ transform: "translateZ(30px)" }}
          >
            {/* Windows */}
            {Array.from({ length: 6 }).map((_, row) =>
              Array.from({ length: 3 }).map((_, col) => (
                <div
                  key={`${row}-${col}`}
                  className="absolute h-4 w-5 rounded-sm bg-primary/30 shadow-[0_0_8px_rgba(20,184,166,0.3)]"
                  style={{
                    top: `${12 + row * 16}%`,
                    left: `${12 + col * 28}%`,
                    transform: "translateZ(2px)",
                  }}
                />
              ))
            )}
            {/* Left side */}
            <div
              className="absolute top-0 left-0 h-full w-8 origin-left -skew-y-12 bg-gradient-to-b from-primary/15 to-primary/5"
              style={{ transform: "rotateY(-90deg) translateZ(0px)" }}
            />
            {/* Right side */}
            <div
              className="absolute top-0 right-0 h-full w-8 origin-right skew-y-12 bg-gradient-to-b from-primary/10 to-transparent"
              style={{ transform: "rotateY(90deg) translateZ(0px)" }}
            />
            {/* Top */}
            <div
              className="absolute -top-4 left-0 h-8 w-full origin-bottom -skew-x-12 bg-primary/25"
              style={{ transform: "rotateX(90deg) translateZ(0px)" }}
            />
          </div>

          {/* Side building */}
          <div
            className="preserve-3d absolute right-4 bottom-4 h-28 w-20 bg-gradient-to-b from-accent/20 to-accent/5 sm:right-8 sm:bottom-8 sm:h-32 sm:w-24"
            style={{ transform: "translateZ(15px)" }}
          >
            <div
              className="absolute top-0 left-0 h-full w-6 origin-left -skew-y-12 bg-gradient-to-b from-accent/15 to-transparent"
              style={{ transform: "rotateY(-90deg)" }}
            />
            <div
              className="absolute -top-3 left-0 h-6 w-full origin-bottom -skew-x-12 bg-accent/25"
              style={{ transform: "rotateX(90deg)" }}
            />
          </div>

          {/* Floating platform */}
          <div
            className="absolute -bottom-4 left-1/2 h-4 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-md"
            style={{ transform: "translateX(-50%) translateZ(-20px)" }}
          />
        </div>

        {/* Corner accents */}
        <div className="absolute -top-px -right-px h-16 w-16 overflow-hidden rounded-tr-3xl">
          <div className="absolute top-0 right-0 h-px w-full bg-gradient-to-l from-primary/60 to-transparent" />
          <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-primary/60 to-transparent" />
        </div>
        <div className="absolute -bottom-px -left-px h-16 w-16 overflow-hidden rounded-bl-3xl">
          <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-accent/60 to-transparent" />
          <div className="absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-accent/60 to-transparent" />
        </div>
      </div>
    </div>
  )
}
