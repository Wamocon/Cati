"use client"

import { Info, X } from "lucide-react"
import { useLocale } from "next-intl"
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { createPortal } from "react-dom"
import {
  getFeatureGuide,
  resolveFeatureGuideLocale,
  type FeatureGuideLocale,
} from "@/lib/feature-guide"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Shared popover primitive.
//
// Both help systems (the "i" info button here and the "coming soon" badge in
// coming-soon.tsx) open the same kind of small, dismissible panel with the same
// accessibility behaviour: opens on click, closes on Escape or an outside click,
// keeps keyboard focus inside while open, and returns focus to the trigger when
// it closes. It matches the muted popover styling used elsewhere in the app.
// ---------------------------------------------------------------------------

export type PopoverSide = "top" | "bottom" | "left" | "right"

export interface GuideTriggerProps {
  ref: RefObject<HTMLButtonElement | null>
  onClick: () => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void
  "aria-haspopup": "dialog"
  "aria-expanded": boolean
  "aria-controls": string | undefined
}

interface InfoPopoverProps {
  title: string
  closeLabel: string
  children: ReactNode
  renderTrigger: (props: GuideTriggerProps) => ReactNode
  side?: PopoverSide
  className?: string
  panelClassName?: string
}

interface PanelPosition {
  left: number
  top: number
}

const EDGE_GAP = 12
const TRIGGER_GAP = 10

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function placePanel(
  side: PopoverSide,
  trigger: DOMRect,
  panelWidth: number,
  panelHeight: number
): PanelPosition {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const clampLeft = (value: number) =>
    clamp(value, EDGE_GAP, Math.max(EDGE_GAP, viewportWidth - EDGE_GAP - panelWidth))
  const clampTop = (value: number) =>
    clamp(value, EDGE_GAP, Math.max(EDGE_GAP, viewportHeight - EDGE_GAP - panelHeight))

  const centeredLeft = clampLeft(
    trigger.left + trigger.width / 2 - panelWidth / 2
  )
  const centeredTop = clampTop(
    trigger.top + trigger.height / 2 - panelHeight / 2
  )

  const fitsBelow =
    trigger.bottom + TRIGGER_GAP + panelHeight <= viewportHeight - EDGE_GAP
  const fitsAbove = trigger.top - TRIGGER_GAP - panelHeight >= EDGE_GAP
  const fitsRight =
    trigger.right + TRIGGER_GAP + panelWidth <= viewportWidth - EDGE_GAP
  const fitsLeft = trigger.left - TRIGGER_GAP - panelWidth >= EDGE_GAP

  switch (side) {
    case "top":
      return fitsAbove
        ? { left: centeredLeft, top: trigger.top - TRIGGER_GAP - panelHeight }
        : { left: centeredLeft, top: clampTop(trigger.bottom + TRIGGER_GAP) }
    case "left":
      return fitsLeft
        ? { left: trigger.left - TRIGGER_GAP - panelWidth, top: centeredTop }
        : {
            left: fitsRight
              ? trigger.right + TRIGGER_GAP
              : clampLeft(trigger.left),
            top: centeredTop,
          }
    case "right":
      return fitsRight
        ? { left: trigger.right + TRIGGER_GAP, top: centeredTop }
        : {
            left: fitsLeft
              ? trigger.left - TRIGGER_GAP - panelWidth
              : clampLeft(trigger.right + TRIGGER_GAP),
            top: centeredTop,
          }
    case "bottom":
    default:
      return fitsBelow
        ? { left: centeredLeft, top: trigger.bottom + TRIGGER_GAP }
        : { left: centeredLeft, top: clampTop(trigger.top - TRIGGER_GAP - panelHeight) }
  }
}

const panelFocusableSelector =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function keepFocusInsidePanel(
  event: ReactKeyboardEvent<HTMLDivElement>
) {
  if (event.key !== "Tab") return

  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(panelFocusableSelector)
  ).filter(
    (control) =>
      control.getAttribute("aria-hidden") !== "true" &&
      control.getClientRects().length > 0
  )
  const first = controls[0]
  const last = controls.at(-1)
  if (!first || !last) return

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

export function InfoPopover({
  title,
  closeLabel,
  children,
  renderTrigger,
  side = "bottom",
  className,
  panelClassName,
}: InfoPopoverProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<PanelPosition | null>(null)
  const panelId = useId()
  const titleId = useId()

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel || typeof window === "undefined") return

    const triggerRect = trigger.getBoundingClientRect()
    setPosition(
      placePanel(side, triggerRect, panel.offsetWidth, panel.offsetHeight)
    )
  }, [side])

  const closePopover = useCallback((returnFocus: boolean) => {
    setIsOpen(false)
    setPosition(null)
    if (returnFocus) {
      const trigger = triggerRef.current
      window.requestAnimationFrame(() => trigger?.focus())
    }
  }, [])

  const openPopover = useCallback(() => {
    setIsOpen(true)
  }, [])

  // Position the panel once it is mounted, and keep it in place on resize/scroll.
  useEffect(() => {
    if (!isOpen) return

    updatePosition()

    const handleViewportChange = () => updatePosition()
    window.addEventListener("resize", handleViewportChange)
    window.addEventListener("scroll", handleViewportChange, true)

    return () => {
      window.removeEventListener("resize", handleViewportChange)
      window.removeEventListener("scroll", handleViewportChange, true)
    }
  }, [isOpen, updatePosition])

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (!isOpen) return
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  // Close on Escape or on a pointer press outside the trigger and the panel.
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        closePopover(true)
      }
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (
        target &&
        (triggerRef.current?.contains(target) ||
          panelRef.current?.contains(target))
      ) {
        return
      }
      closePopover(false)
    }

    document.addEventListener("keydown", handleKeyDown, true)
    document.addEventListener("pointerdown", handlePointerDown, true)

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      document.removeEventListener("pointerdown", handlePointerDown, true)
    }
  }, [isOpen, closePopover])

  const triggerProps: GuideTriggerProps = {
    ref: triggerRef,
    onClick: () => (isOpen ? closePopover(true) : openPopover()),
    onKeyDown: (event) => {
      if (event.key === "Escape" && isOpen) {
        closePopover(true)
      }
    },
    "aria-haspopup": "dialog",
    "aria-expanded": isOpen,
    "aria-controls": isOpen ? panelId : undefined,
  }

  const panel =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            onKeyDown={keepFocusInsidePanel}
            style={{
              left: position?.left ?? EDGE_GAP,
              top: position?.top ?? EDGE_GAP,
              visibility: position ? "visible" : "hidden",
            }}
            className={cn(
              "fixed z-[95] w-[min(20rem,calc(100vw-1.5rem))] max-h-[min(22rem,calc(100vh-2rem))] overflow-y-auto rounded-xl border border-border bg-popover p-4 text-left text-popover-foreground shadow-2xl shadow-black/20 [overflow-wrap:anywhere]",
              panelClassName
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id={titleId}
                className="text-sm font-bold leading-5 text-popover-foreground"
              >
                {title}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label={closeLabel}
                onClick={() => closePopover(true)}
                className="-mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 space-y-2 text-[0.8rem] leading-5 text-muted-foreground">
              {children}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <span className={cn("relative inline-flex", className)}>
      {renderTrigger(triggerProps)}
      {panel}
    </span>
  )
}

// ---------------------------------------------------------------------------
// The "i" info button.
// ---------------------------------------------------------------------------

const CLOSE_LABEL: Record<FeatureGuideLocale, string> = {
  tr: "Kapat",
  en: "Close",
  de: "Schließen",
  ru: "Закрыть",
}

const INFO_ARIA_WITH_TITLE: Record<FeatureGuideLocale, (title: string) => string> = {
  tr: (title) => `${title} hakkında bilgi`,
  en: (title) => `Information about ${title}`,
  de: (title) => `Informationen zu ${title}`,
  ru: (title) => `Информация о ${title}`,
}

const INFO_ARIA_GENERIC: Record<FeatureGuideLocale, string> = {
  tr: "Daha fazla bilgi",
  en: "More information",
  de: "Weitere Informationen",
  ru: "Подробнее",
}

/** Localized close label, reused by the coming-soon badge popover. */
export function guideCloseLabel(locale: string): string {
  return CLOSE_LABEL[resolveFeatureGuideLocale(locale)]
}

interface FeatureInfoProps {
  /** Registry key. When set, the title and body come from the guide. */
  featureKey?: string
  /** Overrides the heading. Required when no featureKey is given. */
  title?: string
  /** Overrides the body text. Required when no featureKey is given. */
  body?: string
  className?: string
  side?: PopoverSide
}

export function FeatureInfo({
  featureKey,
  title,
  body,
  className,
  side = "bottom",
}: FeatureInfoProps) {
  const locale = resolveFeatureGuideLocale(useLocale())
  const guide = featureKey ? getFeatureGuide(featureKey, locale) : null

  const heading = title ?? guide?.title ?? ""
  const text = body ?? guide?.whatItDoes ?? ""

  // Nothing to show means nothing to render, which keeps callers simple.
  if (!heading && !text) return null

  const ariaLabel = heading
    ? INFO_ARIA_WITH_TITLE[locale](heading)
    : INFO_ARIA_GENERIC[locale]

  return (
    <InfoPopover
      title={heading}
      closeLabel={CLOSE_LABEL[locale]}
      side={side}
      className={className}
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          aria-label={ariaLabel}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background/60 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 aria-expanded:bg-muted aria-expanded:text-foreground"
        >
          <Info aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}
    >
      {text ? <p>{text}</p> : null}
    </InfoPopover>
  )
}
