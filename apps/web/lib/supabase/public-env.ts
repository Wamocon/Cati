export function getPublicSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return {
    supabaseUrl,
    publishableKey,
    isConfigured: Boolean(supabaseUrl && publishableKey),
  }
}

export function isPublicSupabaseConfigured() {
  return getPublicSupabaseConfig().isConfigured
}
