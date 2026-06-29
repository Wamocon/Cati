"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Globe2 } from "lucide-react"
import { locales, defaultLocale } from "@/app/navigation"
import { cn } from "@/lib/utils"

type Locale = (typeof locales)[number]

const labels: Record<Locale, string> = {
  tr: "TR · Türkçe",
  en: "EN · English",
  de: "DE · Deutsch",
  ru: "RU · Русский",
}

interface LocaleSwitcherProps {
  className?: string
  compact?: boolean
}

export function LocaleSwitcher({ className, compact = false }: LocaleSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const segments = pathname.split("/").filter(Boolean)
  const currentLocale: Locale = locales.includes(segments[0] as Locale)
    ? (segments[0] as Locale)
    : defaultLocale

  function onSelect(value: Locale) {
    startTransition(() => {
      const rest =
        currentLocale === segments[0]
          ? "/" + segments.slice(1).join("/")
          : pathname
      const targetPath = rest === "/" ? `/${value}` : `/${value}${rest}`
      const query = searchParams.toString()
      router.push(query ? `${targetPath}?${query}` : targetPath)
    })
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <Globe2 className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
      <select
        data-testid="locale-switcher"
        value={currentLocale}
        onChange={(event) => onSelect(event.target.value as Locale)}
        disabled={isPending}
        aria-label="Dil seçimi / Language selection"
        title="Dil seçimi / Language selection"
        className={cn(
          "h-9 appearance-none rounded-lg border border-border bg-card pl-7 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-wait disabled:opacity-70",
          compact ? "w-[82px] pr-6" : "w-[138px] pr-7"
        )}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {compact ? locale.toUpperCase() : labels[locale]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  )
}
