"use client"

import { X } from "lucide-react"
import { useEffect, useId, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AppDialogProps {
  children: ReactNode
  closeLabel?: string
  description?: ReactNode
  footer?: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  size?: "md" | "lg" | "xl"
  title: ReactNode
}

const sizeClass = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
}

export function AppDialog({
  children,
  closeLabel = "Close",
  description,
  footer,
  onOpenChange,
  open,
  size = "lg",
  title,
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      window.setTimeout(() => closeRef.current?.focus(), 0)
    }

    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "app-dialog m-auto w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-2xl shadow-black/25 backdrop:bg-black/55",
        sizeClass[size]
      )}
      onCancel={(event) => {
        event.preventDefault()
        onOpenChange(false)
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onOpenChange(false)
      }}
    >
      <div className="flex max-h-[min(82vh,760px)] flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-black leading-tight text-card-foreground">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="mt-1 text-sm leading-6 text-muted-foreground">
                {description}
              </div>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={closeLabel}
            onClick={() => onOpenChange(false)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="border-t border-border px-5 py-4 sm:px-6">{footer}</footer>}
      </div>
    </dialog>
  )
}
