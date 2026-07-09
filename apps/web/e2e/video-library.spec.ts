import { expect, test } from "@playwright/test"

test.describe("Public video library", () => {
  test("renders the 19-video player and supports playlist selection", async ({ page }) => {
    await page.setViewportSize({ width: 1720, height: 1100 })
    await page.goto("/en/videos")

    await expect(page.getByRole("link", { name: "Videos" }).first()).toBeVisible()
    await expect(page.getByTestId("video-library")).toBeVisible()
    await expect(page.getByTestId("video-player")).toBeVisible()
    await expect(page.locator('[data-testid^="video-card-"]')).toHaveCount(19)
    await expect(page.getByText("Video file pending in Supabase")).toBeVisible()
    await expect(page.getByLabel("Speed")).toBeVisible()
    await expect(
      page.locator(
        'button[aria-label="No captions"], button[aria-label="Captions on"], button[aria-label="Captions off"]'
      )
    ).toHaveCount(1)

    await page.getByTestId("video-card-login-roles-rbac").click()
    await expect(
      page.getByRole("heading", { name: "Login, demo roles and RBAC" })
    ).toBeVisible()
  })
})
