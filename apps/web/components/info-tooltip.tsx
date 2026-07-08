"use client"

import { Info } from "lucide-react"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface InfoTooltipProps {
  label: string
  text: string
  className?: string
}

interface TooltipPosition {
  left: number
  top: number
  width: number
}

const EDGE_GAP = 16
const TRIGGER_GAP = 10
const MAX_TOOLTIP_WIDTH = 320
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function numberFromCss(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function InfoTooltip({ label, text, className }: InfoTooltipProps) {
  const tooltipId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<TooltipPosition>({
    left: EDGE_GAP,
    top: EDGE_GAP,
    width: MAX_TOOLTIP_WIDTH,
  })

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current

    if (!trigger || typeof window === "undefined") {
      return
    }

    const triggerRect = trigger.getBoundingClientRect()
    const main = trigger.closest("main")
    const mainRect = main?.getBoundingClientRect()
    const mainStyle = main ? window.getComputedStyle(main) : undefined
    const mainLeftPadding = mainStyle ? numberFromCss(mainStyle.paddingLeft) : 0
    const mainRightPadding = mainStyle ? numberFromCss(mainStyle.paddingRight) : 0
    const boundaryLeft = Math.max(
      EDGE_GAP,
      (mainRect?.left ?? 0) + mainLeftPadding
    )
    const boundaryRight = Math.min(
      window.innerWidth - EDGE_GAP,
      (mainRect?.right ?? window.innerWidth) - mainRightPadding
    )
    const availableWidth = Math.max(0, boundaryRight - boundaryLeft)
    const width = Math.min(MAX_TOOLTIP_WIDTH, availableWidth)
    const left = clamp(
      triggerRect.left + triggerRect.width / 2 - width / 2,
      boundaryLeft,
      Math.max(boundaryLeft, boundaryRight - width)
    )
    const estimatedHeight = Math.min(
      220,
      64 + Math.ceil(text.length / 42) * 20
    )
    const hasRoomBelow =
      triggerRect.bottom + TRIGGER_GAP + estimatedHeight <=
      window.innerHeight - EDGE_GAP
    const preferredTop = hasRoomBelow
      ? triggerRect.bottom + TRIGGER_GAP
      : triggerRect.top - TRIGGER_GAP - estimatedHeight
    const top = clamp(
      preferredTop,
      EDGE_GAP,
      Math.max(EDGE_GAP, window.innerHeight - EDGE_GAP - estimatedHeight)
    )

    setPosition({ left, top, width })
  }, [text])

  const showTooltip = useCallback(() => {
    updatePosition()
    setIsOpen(true)
  }, [updatePosition])

  const hideTooltip = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleViewportChange = () => updatePosition()

    window.addEventListener("resize", handleViewportChange)
    window.addEventListener("scroll", handleViewportChange, true)

    return () => {
      window.removeEventListener("resize", handleViewportChange)
      window.removeEventListener("scroll", handleViewportChange, true)
    }
  }, [isOpen, updatePosition])

  const tooltip =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            data-info-tooltip
            className="pointer-events-none fixed z-[90] max-h-[min(18rem,calc(100vh-2rem))] overflow-y-auto rounded-xl border border-border bg-popover p-3 text-left text-xs font-semibold leading-5 text-popover-foreground shadow-2xl shadow-black/12 break-words [overflow-wrap:anywhere]"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
            }}
          >
            {text}
          </span>,
          document.body
        )
      : null

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={isOpen ? tooltipId : undefined}
        data-info-tooltip-trigger
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={showTooltip}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            hideTooltip()
          }
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      >
        <Info className="h-4 w-4" />
      </button>
      {tooltip}
    </span>
  )
}
