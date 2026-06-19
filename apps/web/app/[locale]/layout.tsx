import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { locales } from "../../i18n"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  // Validate the dynamic segment is awaited so Next.js can resolve the route.
  void (await params)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
