"use client"

import { Mail, Phone } from "lucide-react"
import { useTranslations } from "next-intl"

export function TopBar() {
  const t = useTranslations("topBar")

  return (
    <div className="border-b border-border bg-muted/50 backdrop-blur-md">
      <div className="container flex h-10 items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <a
            href={`tel:${t("phone").replace(/\s/g, "")}`}
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Phone className="h-3 w-3" />
            <span>{t("phone")}</span>
          </a>
          <a
            href={`mailto:${t("email")}`}
            className="hidden items-center gap-1.5 transition-colors hover:text-foreground sm:flex"
          >
            <Mail className="h-3 w-3" />
            <span>{t("email")}</span>
          </a>
        </div>
        <a
          href="https://www.ataberkestate.com/sites/default/files/ataberkestate.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-primary/80"
        >
          <span>{t("presentation")}</span>
        </a>
      </div>
    </div>
  )
}
