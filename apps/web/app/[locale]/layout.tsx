import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { locales } from "../../i18n"

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  type Locale = (typeof locales)[number]
  const locale: Locale = locales.includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : "tr"
  const messages = await getMessages({ locale })

  return (
    <NextIntlClientProvider
      formats={{}}
      locale={locale}
      messages={messages}
      now={new Date("2026-06-25T09:00:00+03:00")}
      timeZone="Europe/Istanbul"
    >
      {children}
    </NextIntlClientProvider>
  )
}
