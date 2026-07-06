import { useTranslations } from "next-intl"
import { Link } from "@/app/navigation"

export default function AboutPage() {
  const t = useTranslations("about")

  return (
    <main id="main" className="container max-w-3xl py-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Home
      </Link>
      <h1 className="mt-6 text-3xl font-black text-foreground">{t("title")}</h1>
      <p className="mt-6 text-muted-foreground">{t("p1")}</p>
      <p className="mt-4 text-muted-foreground">{t("p2")}</p>
    </main>
  )
}
