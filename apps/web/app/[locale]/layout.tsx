import { notFound } from "next/navigation"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server"
import { locales } from "../../i18n"
import { LanguageDomSync } from "@/components/language-dom-sync"

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  type Locale = (typeof locales)[number]
  // Unprefixed / unknown single-segment paths (e.g. /dashboard, /robots.txt)
  // must 404, not silently render the Turkish homepage with HTTP 200.
  if (!locales.includes(rawLocale as Locale)) {
    notFound()
  }
  const locale = rawLocale as Locale
  // Binds this request's locale for server-only APIs (getLocale/getTranslations
  // in next-intl/server) used by async Server Components under this segment
  // (e.g. app/[locale]/platform/page.tsx). Without this, those calls fall back
  // to the configured defaultLocale ("tr") regardless of the URL segment.
  setRequestLocale(locale)
  const messages = await getMessages({ locale })
  const t = await getTranslations({ locale, namespace: "nav" })

  return (
    <NextIntlClientProvider
      formats={{}}
      locale={locale}
      messages={messages}
      now={new Date("2026-06-25T09:00:00+03:00")}
      timeZone="Europe/Istanbul"
    >
      <a href="#main" className="skip-link">{t("skipToContent")}</a>
      <LanguageDomSync locale={locale} />
      {children}
    </NextIntlClientProvider>
  )
}
