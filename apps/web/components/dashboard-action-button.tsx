"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DashboardActionButtonProps {
  actionType: string
  ariaLabel: string
  children: ReactNode
  className?: string
  entityTable?: string
  entityId?: string
  entityExternalId?: string
  metadata?: Record<string, unknown>
  successLabel?: string
  title?: string
}

type ActionState = "idle" | "loading" | "success" | "error"

export function DashboardActionButton({
  actionType,
  ariaLabel,
  children,
  className,
  entityTable,
  entityId,
  entityExternalId,
  metadata,
  successLabel = "Kaydedildi",
  title,
}: DashboardActionButtonProps) {
  const [state, setState] = useState<ActionState>("idle")

  async function logAction() {
    setState("loading")

    try {
      const response = await fetch("/api/site-management/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          entityTable,
          entityId,
          entityExternalId,
          title,
          metadata,
        }),
      })

      if (!response.ok) throw new Error("Action failed.")
      setState("success")
      window.setTimeout(() => setState("idle"), 1600)
    } catch {
      setState("error")
    }
  }

  const stateLabel =
    state === "loading"
      ? "Isleniyor"
      : state === "success"
        ? successLabel
        : state === "error"
          ? "Hata"
          : ariaLabel

  return (
    <button
      type="button"
      onClick={logAction}
      disabled={state === "loading"}
      aria-label={ariaLabel}
      title={stateLabel}
      data-state={state}
      className={cn(
        "transition-colors disabled:cursor-wait disabled:opacity-70 data-[state=success]:border-teal-500/60 data-[state=success]:text-teal-600 data-[state=error]:border-rose-500/60 data-[state=error]:text-rose-600",
        className
      )}
    >
      {children}
      <span className="sr-only" aria-live="polite">
        {stateLabel}
      </span>
    </button>
  )
}
