"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/app/navigation"

export default function PrivacyPage() {
  const t = useTranslations("privacy")
  const tNav = useTranslations("nav")

  return (
    <main id="main" className="container max-w-3xl py-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← {tNav("home")}
      </Link>
      <h1 className="mt-6 text-3xl font-black text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("updated")}</p>
      <p className="mt-6 text-muted-foreground">{t("intro")}</p>

      <section className="mt-10 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("dataTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("dataText")}</p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("useTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("useText")}</p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("rightsTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("rightsText")}</p>
        </div>
      </section>
    </main>
  )
}
