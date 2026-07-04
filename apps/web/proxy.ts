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
  return url
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
  const accessProfilesEnabled =
    process.env.NEXT_PUBLIC_ENABLE_ACCESS_PROFILES === "true"

  if (!supabaseUrl || !supabaseKey) {
    // External auth is not configured yet; keep the local workspace usable.
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

  const { locale, pathWithoutLocale } = getLocaleAndPath(
    request.nextUrl.pathname
  )
  const isProtected = pathWithoutLocale.startsWith("/dashboard")
  const isPublic = publicRoutePrefixes.some((prefix) =>
    pathWithoutLocale.startsWith(prefix)
  )

  if (isProtected && !isAuthenticated && !accessProfilesEnabled) {
    return NextResponse.redirect(signInUrl(locale, request))
  }

  if (isPublic && isAuthenticated && pathWithoutLocale === "/login") {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  // next-intl may answer with a locale redirect (e.g. "/" -> "/tr") or a rewrite.
  // setAll already wrote the refreshed Supabase cookies onto intlResponse, so we
  // must return it directly — otherwise the redirect/rewrite is dropped and the
  // bare root URL 404s in production.
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
