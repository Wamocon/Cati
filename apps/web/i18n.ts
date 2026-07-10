import { getRequestConfig } from "next-intl/server"

export const locales = ["tr", "en", "de", "ru"] as const
export const defaultLocale = "tr"

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const requestedLocale = locale ?? (await requestLocale)
  const safeLocale = locales.includes(requestedLocale as (typeof locales)[number])
    ? requestedLocale
    : defaultLocale
  return {
    locale: safeLocale as string,
    messages: (await import(`./messages/${safeLocale}.json`)).default,
  }
})
