import { defineConfig, devices } from "@playwright/test"

const useProductionServer = process.env.PLAYWRIGHT_SERVER_MODE === "production"
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "true"
const nextMode = useProductionServer ? "start" : "dev"
const port = process.env.PLAYWRIGHT_PORT ?? "3100"
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`
const readinessURL = process.env.PLAYWRIGHT_SERVER_URL ?? `${baseURL}/tr`
const configuredBaseUrl = new URL(baseURL)
const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"])

if (useProductionServer && !loopbackHosts.has(configuredBaseUrl.hostname)) {
  throw new Error("Production access-profile probes must use an owned loopback server.")
}
if (useProductionServer && reuseExistingServer) {
  throw new Error("Production access-profile probes may not reuse an existing server.")
}
const nextServerCommand =
  process.platform === "win32"
    ? `cmd /c set ENABLE_ACCESS_PROFILES=true&& npm run ${nextMode} -- -p ${port}`
    : `ENABLE_ACCESS_PROFILES=true npm run ${nextMode} -- -p ${port}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report" }],
    ["junit", { outputFile: "../../quality/results/playwright-junit/results.xml" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: nextServerCommand,
    // E2E runs against a deterministic environment on purpose: the built-in AI
    // fallback (no live gateway) and local seed data (no live Supabase) keep
    // assertions on AI answers and intake references stable and repeatable.
    // The real cloud + AI wiring in apps/web/.env.local is for dev/demo, not the
    // test suite; these blanks override any values loaded from .env.local.
    env: {
      ENABLE_ACCESS_PROFILES: "true",
      // Canonical isolated-QA flags (match scripts/release-demo-harness.mjs) so the
      // service-evidence local-QA store activates instead of trying to build a
      // Supabase client with blank credentials. In dev with no VERCEL_* vars these
      // do not change access-profile enablement (see access-profile-policy.ts).
      CATI_ENV: "qa",
      CATI_DEMO_DATA_ISOLATED: "true",
      AI_API_URL: "",
      AI_API_KEY: "",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
    url: readinessURL,
    reuseExistingServer,
    timeout: 120_000,
  },
})
