import { getRequestConfig } from "next-intl/server"

export default getRequestConfig(async () => {
  // Turkish is the primary language for the modernised Ataberk landing page.
  const locale = "tr"

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
