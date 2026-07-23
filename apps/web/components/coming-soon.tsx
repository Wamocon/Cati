"use client"

import { Clock } from "lucide-react"
import { useLocale } from "next-intl"
import { InfoPopover, guideCloseLabel, type PopoverSide } from "@/components/feature-info"
import {
  getFeatureGuide,
  resolveFeatureGuideLocale,
  type FeatureGuideLocale,
} from "@/lib/feature-guide"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// The subtle "coming soon" badge.
//
// A small, muted pill that quietly signals a feature is on the way. Clicking it
// opens the shared popover with an honest, plain-language explanation: what the
// feature will do, that it is coming soon, and what still has to be arranged
// before it can go live. It never shouts and never uses technical wording.
// ---------------------------------------------------------------------------

const BADGE_LABEL: Record<FeatureGuideLocale, string> = {
  tr: "Yakında",
  en: "Coming soon",
  de: "Bald verfügbar",
  ru: "Скоро",
}

const WHATS_NEEDED_HEADING: Record<FeatureGuideLocale, string> = {
  tr: "Devreye almak için gerekenler",
  en: "What is still needed",
  de: "Was noch nötig ist",
  ru: "Что нужно для запуска",
}

const TRIGGER_ARIA: Record<FeatureGuideLocale, (title: string) => string> = {
  tr: (title) => `${title}, yakında geliyor. Ayrıntılar için açın.`,
  en: (title) => `${title}, coming soon. Open for details.`,
  de: (title) => `${title}, bald verfügbar. Für Details öffnen.`,
  ru: (title) => `${title}, скоро. Откройте, чтобы узнать подробности.`,
}

interface ComingSoonProps {
  /** Registry key of a feature that carries a `comingSoon` block. */
  featureKey: string
  className?: string
  /**
   * "badge" is a standalone pill; "inline" sits quietly next to a label and
   * shares its baseline. Both open the same explanation on click.
   */
  variant?: "badge" | "inline"
  side?: PopoverSide
}

export function ComingSoon({
  featureKey,
  className,
  variant = "badge",
  side = "bottom",
}: ComingSoonProps) {
  const locale = resolveFeatureGuideLocale(useLocale())
  const guide = getFeatureGuide(featureKey, locale)

  // Only render for features that actually have a coming-soon explanation.
  if (!guide?.comingSoon) return null

  const badgeText = BADGE_LABEL[locale]

  return (
    <InfoPopover
      title={guide.title}
      closeLabel={guideCloseLabel(locale)}
      side={side}
      className={cn("align-middle", className)}
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          aria-label={TRIGGER_ARIA[locale](guide.title)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/60 font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 aria-expanded:bg-muted aria-expanded:text-foreground",
            variant === "inline"
              ? "px-1.5 py-0.5 text-[0.65rem]"
              : "px-2 py-0.5 text-[0.7rem]"
          )}
        >
          <Clock aria-hidden="true" className="h-3 w-3" />
          <span>{badgeText}</span>
        </button>
      )}
    >
      <p>{guide.comingSoon.summary}</p>
      <div className="pt-1">
        <p className="text-[0.7rem] font-semibold tracking-wide text-foreground/80 uppercase">
          {WHATS_NEEDED_HEADING[locale]}
        </p>
        <p className="mt-1">{guide.comingSoon.whatsNeeded}</p>
      </div>
    </InfoPopover>
  )
}
