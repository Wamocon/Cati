import { defineConfig, devices } from "@playwright/test"

const nextDevCommand =
  process.platform === "win32"
    ? "node_modules\\.bin\\next.CMD dev -p 3100"
    : "node_modules/.bin/next dev -p 3100"

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
    command: nextDevCommand,
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
