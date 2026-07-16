"use client"

import { useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"
import { ChevronDown, Globe2 } from "lucide-react"
import { locales, usePathname, useRouter } from "@/app/navigation"
import { cn } from "@/lib/utils"

type Locale = (typeof locales)[number]

const labels: Record<Locale, string> = {
  tr: "TR - Türkçe",
  en: "EN - English",
  de: "DE - Deutsch",
  ru: "RU - Русский",
}

const localeSwitcherCopy: Record<Locale, string> = {
  tr: "Dil seçimi",
  en: "Language selection",
  de: "Sprachauswahl",
  ru: "Выбор языка",
}

interface LocaleSwitcherProps {
  className?: string
  compact?: boolean
}

export function LocaleSwitcher({ className, compact = false }: LocaleSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeLocale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()

  function onSelect(value: Locale) {
    startTransition(() => {
      const query = searchParams.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { locale: value })
    })
  }

  return (
    <div className={cn("relative flex shrink-0 items-center", className)}>
      <Globe2 className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
      <select
        data-testid="locale-switcher"
        value={activeLocale}
        onChange={(event) => onSelect(event.target.value as Locale)}
        disabled={isPending}
        aria-busy={isPending}
        aria-label={localeSwitcherCopy[activeLocale]}
        title={compact ? labels[activeLocale] : localeSwitcherCopy[activeLocale]}
        className={cn(
          "h-9 appearance-none rounded-lg border border-border bg-card pl-7 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-wait disabled:opacity-70",
          compact
            ? "w-[68px] max-w-[68px] truncate pr-5 text-[11px]"
            : "w-[138px] pr-7"
        )}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {compact ? locale.toUpperCase() : labels[locale]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  )
}
