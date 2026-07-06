import createIntlMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { locales, defaultLocale } from "./i18n"

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
})

const publicRoutePrefixes = ["/login"]

function getLocaleAndPath(pathname: string): {
  locale: string
  pathWithoutLocale: string
} {
  const segments = pathname.split("/").filter(Boolean)
  const locale = locales.includes(segments[0] as (typeof locales)[number])
    ? segments[0]
    : defaultLocale
  const pathWithoutLocale =
    locale === segments[0] ? "/" + segments.slice(1).join("/") : pathname
  return { locale, pathWithoutLocale }
}

function signInUrl(locale: string, request: NextRequest): URL {
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}/login`
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
  url.search = ""
  url.searchParams.set("next", nextPath.replace(`/${locale}`, "") || "/dashboard")
  return url
}

function accessProfilesEnabledForRequest() {
  const productionDeployment =
    process.env.VERCEL_ENV === "production" ||
    process.env.CATI_ENV === "production"
  const serverQaFlag = process.env.ENABLE_ACCESS_PROFILES === "true"
  const legacyDevFlag =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_ENABLE_ACCESS_PROFILES === "true"
  const remoteDeployment = Boolean(process.env.VERCEL_ENV || process.env.VERCEL_URL)
  const remoteQaAllowed = process.env.CATI_ALLOW_REMOTE_ACCESS_PROFILES === "true"

  return !productionDeployment && (!remoteDeployment || remoteQaAllowed) && (serverQaFlag || legacyDevFlag)
}

export default async function proxy(request: NextRequest) {
  // 1. Apply next-intl routing (locale prefix, redirects, rewrites).
  const intlResponse = intlMiddleware(request)

  // 2. Refresh the Supabase session and forward cookies.
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const accessProfilesEnabled = accessProfilesEnabledForRequest()
  const { locale, pathWithoutLocale } = getLocaleAndPath(
    request.nextUrl.pathname
  )
  const isProtected = pathWithoutLocale.startsWith("/dashboard")
  const isPublic = publicRoutePrefixes.some((prefix) =>
    pathWithoutLocale.startsWith(prefix)
  )

  if (!supabaseUrl || !supabaseKey) {
    if (isProtected && !accessProfilesEnabled) {
      return NextResponse.redirect(signInUrl(locale, request))
    }
    return intlResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
          intlResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()
  const isAuthenticated = Boolean(claimsData?.claims?.sub && !claimsError)

  if (isProtected && !isAuthenticated && !accessProfilesEnabled) {
    return NextResponse.redirect(signInUrl(locale, request))
  }

  if (isPublic && isAuthenticated && pathWithoutLocale === "/login") {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  if (
    intlResponse.headers.has("location") ||
    intlResponse.headers.has("x-middleware-rewrite")
  ) {
    return intlResponse
  }

  // Merge any cookies set by intlMiddleware into the final response.
  intlResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append(key, value)
    }
  })

  return response
}

export const config = {
  matcher: ["/", "/(tr|en|de|ru)/:path*"],
}
