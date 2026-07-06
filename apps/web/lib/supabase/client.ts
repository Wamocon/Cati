import { createBrowserClient } from "@supabase/ssr"
import { getPublicSupabaseConfig } from "./public-env"

export function createClient() {
  const { supabaseUrl, publishableKey } = getPublicSupabaseConfig()

  return createBrowserClient(supabaseUrl!, publishableKey!)
}
