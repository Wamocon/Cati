import { getRequestConfig } from "next-intl/server"

export const locales = ["tr", "en", "de", "ru"] as const
export const defaultLocale = "tr"

export default getRequestConfig(async ({ locale, requestLocale }) => {
  // next-intl v4: the segment locale must be read via requestLocale; `locale` is
  // only populated for explicit overrides (getTranslations({locale})). Support both.
  const requested = locale ?? (await requestLocale)
  const safeLocale = locales.includes(requested as (typeof locales)[number])
    ? requested
    : defaultLocale
  return {
    locale: safeLocale as string,
    messages: (await import(`./messages/${safeLocale}.json`)).default,
  }
})
