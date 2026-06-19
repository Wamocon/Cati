"use client"

import { useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { locales, defaultLocale } from "@/app/navigation"
import { Globe } from "lucide-react"

const labels: Record<string, string> = {
  tr: "TR",
  en: "EN",
  de: "DE",
  ru: "RU",
}

type Locale = (typeof locales)[number]

export function LocaleSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  // Derive the current locale directly from the URL so we never get out of sync
  // with next-intl's state (which was causing /en/en double-prefix bugs).
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
      const target = rest === "/" ? `/${value}` : `/${value}${rest}`
      router.push(target)
    })
  }

  return (
    <div className="relative flex items-center">
      <Globe className="absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
      <select
        data-testid="locale-switcher"
        value={currentLocale}
        onChange={(e) => onSelect(e.target.value as Locale)}
        disabled={isPending}
        className="h-8 appearance-none rounded-lg border border-border bg-background pr-6 pl-7 text-xs font-medium text-foreground transition-colors hover:border-primary focus:border-primary focus:outline-none"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {labels[locale]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-[10px] text-muted-foreground">
        ▾
      </span>
    </div>
  )
}
