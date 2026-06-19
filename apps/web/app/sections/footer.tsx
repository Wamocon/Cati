"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"

const footerLinks = {
  company: [
    { label: "О компании", href: "#" },
    { label: "Команда", href: "#" },
    { label: "Карьера", href: "#" },
    { label: "Контакты", href: "#" },
  ],
  catalog: [
    { label: "Все объекты", href: "#" },
    { label: "Новостройки", href: "#" },
    { label: "Аренда", href: "#" },
    { label: "VIP-объекты", href: "#" },
  ],
  services: [
    { label: "Покупка", href: "#" },
    { label: "Продажа", href: "#" },
    { label: "Управление арендой", href: "#" },
    { label: "Гражданство", href: "#" },
  ],
  legal: [
    { label: "Политика конфиденциальности", href: "#" },
    { label: "Условия использования", href: "#" },
  ],
}

export function Footer() {
  const t = useTranslations("footer")

  return (
    <footer id="contacts" className="border-t border-white/5 bg-[#050914] py-16">
      <div className="container">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f97316] to-[#ea580c] text-sm font-black text-white">
                1Ç
              </div>
              <span className="text-lg font-bold text-white">Ataberk Estate</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Продажа и управление недвижимостью в Турции для русскоязычных
              покупателей и иностранных владельцев.
            </p>
            <div className="mt-6 text-sm text-muted-foreground">
              <p>+90 (549) 557 7 557</p>
              <p>info@ataberkestate.com</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white">Компания</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white">Каталог</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {footerLinks.catalog.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white">Услуги</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {footerLinks.services.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>{t("rights")}</p>
          <p>{t("confidential")}</p>
        </div>
      </div>
    </footer>
  )
}
