export function getServerSupabaseConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return {
    supabaseUrl,
    publishableKey,
    isConfigured: Boolean(supabaseUrl && publishableKey),
  }
}

export function getServiceRoleSupabaseConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  return {
    supabaseUrl,
    serviceRoleKey,
    isConfigured: Boolean(supabaseUrl && serviceRoleKey),
  }
}
