import { getRequestConfig } from "next-intl/server"

export default getRequestConfig(async () => {
  // Russian is the default and primary language for Ataberk's audience.
  const locale = "ru"

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
