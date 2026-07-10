"use client"

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { useLocale } from "next-intl"
import { CheckCircle2, ChevronDown, MoreHorizontal } from "lucide-react"
import { DashboardActionButton } from "@/components/dashboard-action-button"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
} from "@/lib/operational-copy"
import { cn } from "@/lib/utils"

export interface DashboardActionMenuItem {
  key: string
  label: string
  actionType: string
  ariaLabel?: string
  description?: string
  icon?: ReactNode
  href?: string
  target?: string
  download?: boolean | string
  entityTable?: string
  entityId?: string
  entityExternalId?: string
  title?: string
  metadata?: Record<string, unknown>
  disabled?: boolean
}

interface MenuPosition {
  left?: number
  right?: number
  top?: number
  bottom?: number
  width?: number
}

interface DashboardActionMenuProps {
  items: DashboardActionMenuItem[]
  label?: string
  ariaLabel?: string
  buttonClassName?: string
  menuClassName?: string
  compact?: boolean
  onActionStart?: (item: DashboardActionMenuItem) => void
  onActionComplete?: (
    item: DashboardActionMenuItem,
    state: "success" | "error"
  ) => void
}

function withIconClass(icon: ReactNode) {
  if (!isValidElement(icon)) return icon
  const iconElement = icon as ReactElement<{ className?: string }>
  return cloneElement(iconElement, {
    className: cn("h-4 w-4 shrink-0", iconElement.props.className),
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function DashboardActionMenu({
  items,
  label = "Actions",
  ariaLabel,
  buttonClassName,
  menuClassName,
  compact = false,
  onActionStart,
  onActionComplete,
}: DashboardActionMenuProps) {
  const locale = resolveDashboardLocale(useLocale())
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<MenuPosition>({})
  const portalRoot = typeof document === "undefined" ? null : document.body

  const enabledItems = items.filter((item) => !item.disabled)
  const hasItems = enabledItems.length > 0
  const menuLabel = localizeDashboardTextPart(label, locale)
  const menuAriaLabel = localizeDashboardTextPart(ariaLabel ?? label, locale)

  const updatePosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return

    const box = button.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (viewportWidth < 640) {
      setPosition({
        left: 12,
        right: 12,
        bottom: 12,
      })
      return
    }

    const width = Math.min(320, Math.max(240, box.width))
    const left = clamp(box.right - width, 12, viewportWidth - width - 12)
    const estimatedHeight = Math.min(520, 44 + enabledItems.length * 56)
    const spaceBelow = viewportHeight - box.bottom - 12
    const spaceAbove = box.top - 12
    const opensAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow
    const preferredTop = opensAbove ? box.top - estimatedHeight - 8 : box.bottom + 8
    const top = clamp(preferredTop, 12, Math.max(12, viewportHeight - estimatedHeight - 12))

    setPosition({ left, top, width })
  }, [enabledItems.length])

  const closeMenu = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])

  const openMenu = useCallback(() => {
    if (!hasItems) return
    updatePosition()
    setOpen(true)
  }, [hasItems, updatePosition])

  useEffect(() => {
    if (!open) return

    const focusTimer = window.setTimeout(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus()
    }, 0)

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        menuRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    const handleReposition = () => updatePosition()

    document.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("resize", handleReposition)
    window.addEventListener("scroll", handleReposition, true)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("resize", handleReposition)
      window.removeEventListener("scroll", handleReposition, true)
    }
  }, [open, updatePosition])

  function focusMenuItem(index: number) {
    const buttons =
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]'
      ) ?? []
    buttons[index]?.focus()
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      openMenu()
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      openMenu()
      window.setTimeout(() => focusMenuItem(enabledItems.length - 1), 0)
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]'
      ) ?? []
    )
    const currentIndex = buttons.findIndex(
      (button) => button === document.activeElement
    )

    if (event.key === "Escape") {
      event.preventDefault()
      closeMenu()
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      focusMenuItem((currentIndex + 1) % buttons.length)
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      focusMenuItem((currentIndex - 1 + buttons.length) % buttons.length)
    }

    if (event.key === "Home") {
      event.preventDefault()
      focusMenuItem(0)
    }

    if (event.key === "End") {
      event.preventDefault()
      focusMenuItem(buttons.length - 1)
    }
  }

  function logLinkedAction(item: DashboardActionMenuItem) {
    onActionStart?.(item)
    void fetch("/api/site-management/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionType: item.actionType,
        entityTable: item.entityTable,
        entityId: item.entityId,
        entityExternalId: item.entityExternalId,
        title: item.title,
        metadata: item.metadata,
      }),
    })
      .then((response) => {
        onActionComplete?.(item, response.ok ? "success" : "error")
        if (response.ok) {
          window.dispatchEvent(new CustomEvent("site-management:changed"))
        }
      })
      .catch(() => onActionComplete?.(item, "error"))
    setOpen(false)
  }

  const menuStyle: CSSProperties = {
    left: position.left,
    right: position.right,
    top: position.top,
    bottom: position.bottom,
    width: position.width,
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={menuAriaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={!hasItems}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleButtonKeyDown}
        className={cn(
          "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-black text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-50",
          compact && "h-9 w-9 px-0",
          buttonClassName
        )}
      >
        {compact ? (
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        ) : (
          <>
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>{menuLabel}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition",
                open && "rotate-180"
              )}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {portalRoot &&
        open &&
        createPortal(
          <div
            id={menuId}
            ref={menuRef}
            role="menu"
            aria-label={menuAriaLabel}
            onKeyDown={handleMenuKeyDown}
            style={menuStyle}
            className={cn(
              "fixed z-[70] max-h-[min(520px,calc(100vh-24px))] overflow-auto rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl shadow-black/20",
              "sm:max-w-[min(320px,calc(100vw-24px))]",
              menuClassName
            )}
          >
            <div className="px-2 pb-2 pt-1 text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              {menuLabel}
            </div>
            <div className="grid gap-1">
              {enabledItems.map((item) => {
                const itemLabel = localizeDashboardTextPart(item.label, locale)
                const itemAriaLabel = localizeDashboardTextPart(
                  item.ariaLabel ?? item.label,
                  locale
                )
                const content = (
                  <span className="flex min-w-0 flex-1 items-start gap-2">
                    {withIconClass(item.icon) ?? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate">{itemLabel}</span>
                      {item.description && (
                        <span className="mt-0.5 block text-xs font-medium leading-snug text-muted-foreground">
                          {localizeDashboardTextPart(item.description, locale)}
                        </span>
                      )}
                    </span>
                  </span>
                )

                if (item.href) {
                  return (
                    <a
                      key={item.key}
                      role="menuitem"
                      href={item.href}
                      target={item.target}
                      rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                      download={item.download}
                      aria-label={itemAriaLabel}
                      onClick={() => logLinkedAction(item)}
                      className="flex w-full justify-start rounded-lg border-0 bg-transparent px-3 py-2 text-left text-sm font-bold text-popover-foreground shadow-none transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                    >
                      {content}
                    </a>
                  )
                }

                return (
                  <DashboardActionButton
                    key={item.key}
                    role="menuitem"
                    actionType={item.actionType}
                    ariaLabel={itemAriaLabel}
                    entityTable={item.entityTable}
                    entityId={item.entityId}
                    entityExternalId={item.entityExternalId}
                    title={item.title}
                    metadata={item.metadata}
                    onActionStart={() => onActionStart?.(item)}
                    onActionComplete={(state) => {
                      onActionComplete?.(item, state)
                      if (state === "success") {
                        window.setTimeout(() => setOpen(false), 1800)
                      }
                    }}
                    showInlineState
                    className="w-full justify-start rounded-lg border-0 bg-transparent px-3 py-2 text-left text-sm font-bold text-popover-foreground shadow-none hover:bg-muted"
                  >
                    {content}
                  </DashboardActionButton>
                )
              })}
            </div>
          </div>,
          portalRoot
        )}
    </>
  )
}
