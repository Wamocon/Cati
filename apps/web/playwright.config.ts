import { defineConfig, devices } from "@playwright/test"

const useProductionServer = process.env.PLAYWRIGHT_SERVER_MODE === "production"
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "true"
const nextMode = useProductionServer ? "start" : "dev"
const port = process.env.PLAYWRIGHT_PORT ?? "3100"
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`
const readinessURL = process.env.PLAYWRIGHT_SERVER_URL ?? `${baseURL}/tr`
const nextServerCommand =
  process.platform === "win32"
    ? `cmd /c set ENABLE_ACCESS_PROFILES=true&& set NEXT_PUBLIC_ENABLE_ACCESS_PROFILES=true&& npm run ${nextMode} -- -p ${port}`
    : `ENABLE_ACCESS_PROFILES=true NEXT_PUBLIC_ENABLE_ACCESS_PROFILES=true npm run ${nextMode} -- -p ${port}`

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
    env: {
      ENABLE_ACCESS_PROFILES: "true",
      NEXT_PUBLIC_ENABLE_ACCESS_PROFILES: "true",
    },
    url: readinessURL,
    reuseExistingServer,
    timeout: 120_000,
  },
})
