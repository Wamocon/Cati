"use client"

import type { ElementType, ReactNode } from "react"
import { useLocale } from "next-intl"
import { ArrowUpRight } from "lucide-react"
import { Link } from "@/app/navigation"
import { Card3D } from "@/components/3d-card"
import { InfoTooltip } from "@/components/info-tooltip"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
} from "@/lib/operational-copy"
import { cn } from "@/lib/utils"

interface DashboardSectionProps {
  title: string
  description?: string
  icon?: ElementType
  badge?: ReactNode
  info?: string
  actionHref?: string
  actionLabel?: string
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function DashboardSection({
  title,
  description,
  icon: Icon,
  badge,
  info,
  actionHref,
  actionLabel = "Open full view",
  children,
  className,
  contentClassName,
}: DashboardSectionProps) {
  const locale = resolveDashboardLocale(useLocale())
  const sectionTitle = localizeDashboardTextPart(title, locale)
  const sectionDescription = description
    ? localizeDashboardTextPart(description, locale)
    : undefined
  const sectionInfo = info ? localizeDashboardTextPart(info, locale) : undefined
  const sectionActionLabel = localizeDashboardTextPart(actionLabel, locale)

  return (
    <Card3D className={className} glow={false}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && <Icon className="h-5 w-5 shrink-0 text-primary" />}
            <h2 className="text-sm font-bold leading-tight text-card-foreground">{sectionTitle}</h2>
            {sectionInfo && <InfoTooltip label={`${sectionTitle} info`} text={sectionInfo} />}
          </div>
          {description && (
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
              {sectionDescription}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {badge}
          {actionHref && (
            <Link
              href={actionHref}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-black text-foreground transition hover:bg-muted"
            >
              {sectionActionLabel}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
    </Card3D>
  )
}
