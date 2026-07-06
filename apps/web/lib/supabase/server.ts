import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import {
  getServerSupabaseConfig,
  getServiceRoleSupabaseConfig,
} from "./server-env"

export async function createClient() {
  const cookieStore = await cookies()
  const { supabaseUrl, publishableKey } = getServerSupabaseConfig()

  return createServerClient(supabaseUrl!, publishableKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  })
}

export function createServiceRoleClient() {
  const { supabaseUrl, serviceRoleKey } = getServiceRoleSupabaseConfig()

  if (!supabaseUrl || !serviceRoleKey) return null

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
