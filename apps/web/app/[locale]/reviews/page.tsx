"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/app/navigation"

export default function ReviewsPage() {
  const t = useTranslations("reviews")
  const tNav = useTranslations("nav")

  return (
    <main id="main" className="container max-w-3xl py-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← {tNav("home")}
      </Link>
      <h1 className="mt-6 text-3xl font-black text-foreground">{t("title")}</h1>
      <p className="mt-6 text-muted-foreground">{t("intro")}</p>

      <ul className="mt-8 space-y-6">
        {[0, 1, 2].map((i) => (
          <li key={i} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-card-foreground italic">“{t(`items.${i}.quote`)}”</p>
            <p className="mt-4 text-sm font-semibold text-foreground">
              {t(`items.${i}.author`)}
            </p>
            <p className="text-xs text-muted-foreground">{t(`items.${i}.role`)}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
