import { expect, test } from "@playwright/test"

test.describe("Public video library", () => {
  test("renders the 19-video player and supports playlist selection", async ({ page }) => {
    await page.setViewportSize({ width: 1720, height: 1100 })
    await page.goto("/tr/videos")

    await expect(
      page.getByRole("heading", {
        name: "1Çatı ile site yönetimini tek merkezden görün, yönetin ve büyütün.",
      })
    ).toBeVisible()
    await expect(page.getByTestId("video-library")).toBeVisible()
    await expect(page.getByTestId("video-player")).toBeVisible()
    await expect(page.locator('[data-testid^="video-card-"]')).toHaveCount(19)
    await expect(page.getByText("Video dosyası hazırlanıyor")).toHaveCount(0)
    await expect(page.getByLabel("Hız")).toBeVisible()
    await expect(
      page.locator(
        'button[aria-label="Altyazı yok"], button[aria-label="Altyazı açık"], button[aria-label="Altyazı kapalı"]'
      )
    ).toHaveCount(1)

    const video = page.locator("video").first()
    await expect(video).toBeVisible()
    await expect(video).toHaveAttribute(
      "src",
      /\/storage\/v1\/object\/public\/Demo%20Videos\/tr\/heygen-2026-07-09\/videos\/01-cati-90-saniyede\.mp4$/
    )
    await expect(video).toHaveAttribute(
      "poster",
      /\/storage\/v1\/object\/public\/Demo%20Videos\/tr\/heygen-2026-07-09\/posters\/01-cati-90-saniyede\.png$/
    )

    await page.getByTestId("video-card-04-egitim-01-login-roller-veri-guvenligi").click()
    await expect(
      page.getByRole("heading", {
        name: "Eğitim 01 - Login, Roller ve Veri Güvenliği",
      })
    ).toBeVisible()
    await expect(video).toHaveAttribute(
      "src",
      /\/storage\/v1\/object\/public\/Demo%20Videos\/tr\/heygen-2026-07-09\/videos\/04-egitim-01-login-roller-veri-guvenligi\.mp4$/
    )
  })
})
