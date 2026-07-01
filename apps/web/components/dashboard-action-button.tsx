"use client"

import { useEffect, useRef, useState, type AriaRole, type ReactNode } from "react"
import { useLocale } from "next-intl"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
} from "@/lib/operational-copy"
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
  onActionComplete?: (state: Extract<ActionState, "success" | "error">) => void
  onActionStart?: () => void
  role?: AriaRole
  successLabel?: string
  tabIndex?: number
  title?: string
}

type ActionState = "idle" | "loading" | "success" | "error"

interface ActionResponsePayload {
  id?: unknown
  source?: unknown
  status?: unknown
  workflow?: {
    requiresHumanApproval?: unknown
    executionMode?: unknown
    riskLevel?: unknown
    approvalRoles?: unknown
    actionType?: unknown
  }
}

const actionStateCopy = {
  tr: { loading: "İşleniyor", success: "Kaydedildi", error: "Hata" },
  en: { loading: "Processing", success: "Saved", error: "Error" },
  de: { loading: "Wird verarbeitet", success: "Gespeichert", error: "Fehler" },
  ru: { loading: "Обработка", success: "Сохранено", error: "Ошибка" },
} as const

function resolveActionLocale(locale: string): keyof typeof actionStateCopy {
  return locale in actionStateCopy ? (locale as keyof typeof actionStateCopy) : "tr"
}

function submittedLabel(locale: keyof typeof actionStateCopy) {
  if (locale === "en") return "Sent for approval"
  if (locale === "de") return "Zur Freigabe gesendet"
  if (locale === "ru") return "Отправлено на одобрение"
  return "Onaya gönderildi"
}

export function DashboardActionButton({
  actionType,
  ariaLabel,
  children,
  className,
  entityTable,
  entityId,
  entityExternalId,
  metadata,
  onActionComplete,
  onActionStart,
  role,
  successLabel,
  tabIndex,
  title,
}: DashboardActionButtonProps) {
  const activeLocale = useLocale()
  const locale = resolveDashboardLocale(activeLocale)
  const actionLocale = resolveActionLocale(activeLocale)
  const copy = actionStateCopy[actionLocale]
  const [state, setState] = useState<ActionState>("idle")
  const [requiresApproval, setRequiresApproval] = useState(false)
  const resetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    }
  }, [])

  async function logAction() {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
    onActionStart?.()
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

      const payload = (await response.json().catch(() => ({}))) as ActionResponsePayload
      if (!response.ok) throw new Error("Action failed.")
      const workflowRequiresApproval = payload.workflow?.requiresHumanApproval === true
      setRequiresApproval(workflowRequiresApproval)
      window.dispatchEvent(new CustomEvent("site-management:changed"))
      window.dispatchEvent(
        new CustomEvent("site-management:action-logged", {
          detail: {
            ...payload,
            actionType,
            entityTable,
            entityId,
            entityExternalId,
            title,
            metadata,
          },
        })
      )
      setState("success")
      resetTimerRef.current = window.setTimeout(() => {
        setState("idle")
        setRequiresApproval(false)
        onActionComplete?.("success")
      }, 900)
    } catch {
      setState("error")
      onActionComplete?.("error")
    }
  }

  const displayAriaLabel = localizeDashboardTextPart(ariaLabel, locale)
  const displaySuccessLabel = successLabel
    ? localizeDashboardTextPart(successLabel, locale)
    : undefined
  const stateLabel =
    state === "loading"
      ? copy.loading
      : state === "success"
        ? (displaySuccessLabel ?? (requiresApproval ? submittedLabel(actionLocale) : copy.success))
        : state === "error"
          ? copy.error
          : displayAriaLabel

  return (
    <button
      type="button"
      onClick={logAction}
      disabled={state === "loading"}
      aria-label={displayAriaLabel}
      role={role}
      tabIndex={tabIndex}
      title={stateLabel}
      data-state={state}
      className={cn(
        "scroll-mt-32 transition-colors disabled:cursor-wait disabled:opacity-70 data-[state=success]:border-teal-500/60 data-[state=success]:text-teal-600 data-[state=error]:border-rose-500/60 data-[state=error]:text-rose-600",
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
