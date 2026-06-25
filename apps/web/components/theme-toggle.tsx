"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { useTranslations } from "next-intl"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useTranslations("theme")
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark"

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
      aria-label={t("toggle")}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  )
}
