import { getRequestConfig } from "next-intl/server"

export const locales = ["tr", "en", "de", "ru"] as const
export const defaultLocale = "tr"

export default getRequestConfig(async ({ locale }) => {
  const safeLocale = locales.includes(locale as (typeof locales)[number])
    ? locale
    : defaultLocale
  return {
    locale: safeLocale as string,
    messages: (await import(`./messages/${safeLocale}.json`)).default,
  }
})
