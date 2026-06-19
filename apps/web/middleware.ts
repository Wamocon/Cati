import { type NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  // Supabase session refresh is temporarily disabled until env vars are configured.
  // Once NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set,
  // replace this with the updateSession helper from @/lib/supabase/middleware.
  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
