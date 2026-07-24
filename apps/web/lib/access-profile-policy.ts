/**
 * Access profiles are a deterministic local QA capability, never a production
 * authentication mode. A remote preview may opt in only when the operator
 * explicitly asserts the attached data plane holds demo records only.
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

  // A non-production preview may attach a Supabase data plane and still expose
  // the role switcher, but only when the operator asserts that plane holds demo
  // records only. CATI_DEMO_DATA_ISOLATED is that assertion and it fails closed:
  // absent or non-"true" keeps the switcher off. Point such a preview at a demo
  // project only. Attaching a plane that holds real owner, tenant, identity or
  // finance records makes those records readable by anyone with the URL and no
  // password.
  if (remoteDeployment) {
    const explicitlyIsolated =
      environment.CATI_ALLOW_REMOTE_ACCESS_PROFILES === "true" &&
      environment.CATI_DEMO_DATA_ISOLATED === "true"

    return serverQaFlag && explicitlyIsolated
  }

  return environment.NODE_ENV !== "production" || serverQaFlag
}
