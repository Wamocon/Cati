import { defineConfig, devices } from "@playwright/test"

const useProductionServer = process.env.PLAYWRIGHT_SERVER_MODE === "production"
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "true"
const nextMode = useProductionServer ? "start" : "dev"
const nextServerCommand =
  process.platform === "win32"
    ? `cmd /c set NEXT_PUBLIC_ENABLE_ACCESS_PROFILES=true&& npm run ${nextMode} -- -p 3100`
    : `NEXT_PUBLIC_ENABLE_ACCESS_PROFILES=true npm run ${nextMode} -- -p 3100`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://localhost:3100",
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
      NEXT_PUBLIC_ENABLE_ACCESS_PROFILES: "true",
    },
    url: "http://localhost:3100",
    reuseExistingServer,
    timeout: 120_000,
  },
})
