import { createNavigation } from "next-intl/navigation"
import { locales, defaultLocale } from "../i18n"

export const localePrefix = "always" as const

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  localePrefix,
})

export { locales, defaultLocale }
