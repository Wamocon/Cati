/**
 * Access profiles are a deterministic local QA capability, never a production
 * authentication mode. A remote preview may opt in only when it is explicitly
 * isolated from every Supabase data plane.
 */
export function accessProfilesEnabledForEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env
): boolean {
  const productionRuntime = environment.NODE_ENV === "production"
  const productionDeployment =
    environment.VERCEL_ENV === "production" ||
    environment.CATI_ENV === "production"

  // No flag may turn any production runtime (Vercel or self-hosted) into an
  // unauthenticated role switcher. NODE_ENV is intentionally authoritative:
  // remote preview profiles must run in an explicitly non-production QA
  // process as well as satisfy the isolation checks below.
  if (productionRuntime || productionDeployment) return false

  const remoteDeployment = Boolean(
    environment.VERCEL_ENV || environment.VERCEL_URL
  )
  const serverQaFlag = environment.ENABLE_ACCESS_PROFILES === "true"

  if (remoteDeployment) {
    const explicitlyIsolated =
      environment.CATI_ALLOW_REMOTE_ACCESS_PROFILES === "true" &&
      environment.CATI_DEMO_DATA_ISOLATED === "true"
    const hasSupabaseDataPlane = Boolean(
      environment.NEXT_PUBLIC_SUPABASE_URL ||
        environment.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        environment.SUPABASE_URL ||
        environment.SUPABASE_SERVICE_ROLE_KEY
    )

    return serverQaFlag && explicitlyIsolated && !hasSupabaseDataPlane
  }

  return environment.NODE_ENV !== "production" || serverQaFlag
}
