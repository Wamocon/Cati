"use client"

import { useTransition } from "react"
import { useParams } from "next/navigation"
import { useRouter, usePathname } from "@/app/navigation"
import { locales } from "@/app/navigation"
import { Globe } from "lucide-react"

const labels: Record<string, string> = {
  tr: "TR",
  en: "EN",
  de: "DE",
  ru: "RU",
}

export function LocaleSwitcher() {
  const params = useParams()
  const currentLocale = (params?.locale as string) || "tr"
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function onSelect(value: string) {
    startTransition(() => {
      router.replace(pathname, { locale: value })
    })
  }

  return (
    <div className="relative flex items-center">
      <Globe className="absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
      <select
        data-testid="locale-switcher"
        defaultValue={currentLocale}
        onChange={(e) => onSelect(e.target.value)}
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
