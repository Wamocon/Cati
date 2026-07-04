"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/app/navigation"
import { CatiLogoMark } from "@/components/cati-logo"

const linkHrefs: Record<string, string[]> = {
  company: ["/about", "/platform", "#modules", "#modules", "#contacts"],
  catalog: ["#modules", "#modules", "#modules", "#modules"],
  services: ["#modules", "#modules", "#modules", "#modules"],
  legal: ["/privacy", "/terms"],
}

export function Footer() {
  const t = useTranslations("footer")

  const columns = [
    { title: t("companyTitle"), key: "company" },
    { title: t("catalogTitle"), key: "catalog" },
    { title: t("servicesTitle"), key: "services" },
    { title: t("legalTitle"), key: "legal" },
  ] as const

  return (
    <footer
      id="contacts"
      className="relative border-t border-border/50 bg-muted/20 pt-12 pb-24 md:pt-16 md:pb-24"
    >
      <div className="container">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="group flex items-center gap-2.5">
              <CatiLogoMark className="shadow-lg shadow-primary/20 transition-transform group-hover:scale-105" />
              <span className="text-lg font-bold text-foreground">
                Ataberk Estate
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("description")}
            </p>
            <div className="mt-6 space-y-1 text-sm text-muted-foreground">
              <p>+90 (549) 557 7 557</p>
              <p>info@ataberkestate.com</p>
            </div>
          </div>

          {columns.map((col) => {
            const items = t.raw(col.key) as string[]
            const hrefs = linkHrefs[col.key]
            return (
              <div key={col.key}>
                <h4 className="text-sm font-bold text-foreground">
                  {col.title}
                </h4>
                <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  {items.map((label, idx) => (
                    <li key={label}>
                      <Link
                        href={hrefs[idx] ?? "#"}
                        className="transition-colors hover:text-foreground"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>{t("rights")}</p>
          <p>{t("securityNote")}</p>
        </div>
      </div>
    </footer>
  )
}
