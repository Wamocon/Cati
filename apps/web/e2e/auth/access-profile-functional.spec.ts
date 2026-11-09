import { expect, test } from "@playwright/test"
import { accessProfilesEnabledForEnvironment } from "../../lib/access-profile-policy"
import { accessRoles } from "../support/test-catalog"
import { dashboardSidebar } from "../support/flows"

test.describe("Functional tests - authentication and access profiles", () => {
  test("production can never enable anonymous role switching", () => {
    const permissiveFlags = {
      NODE_ENV: "production",
      ENABLE_ACCESS_PROFILES: "true",
      CATI_ALLOW_REMOTE_ACCESS_PROFILES: "true",
      CATI_DEMO_DATA_ISOLATED: "true",
    }

    expect(
      accessProfilesEnabledForEnvironment({
        ...permissiveFlags,
        VERCEL_ENV: "production",
      })
    ).toBe(false)
    expect(
      accessProfilesEnabledForEnvironment({
        ...permissiveFlags,
        CATI_ENV: "production",
      })
    ).toBe(false)
    expect(accessProfilesEnabledForEnvironment(permissiveFlags)).toBe(false)
    expect(
      accessProfilesEnabledForEnvironment({
        ...permissiveFlags,
        VERCEL_ENV: "preview",
        VERCEL_URL: "isolated-preview.example.test",
      })
    ).toBe(false)
  })

  test("remote preview requires an explicit demo-data assertion", () => {
    const isolatedPreview = {
      NODE_ENV: "test",
      VERCEL_ENV: "preview",
      VERCEL_URL: "isolated-preview.example.test",
      ENABLE_ACCESS_PROFILES: "true",
      CATI_ALLOW_REMOTE_ACCESS_PROFILES: "true",
      CATI_DEMO_DATA_ISOLATED: "true",
    }

    expect(accessProfilesEnabledForEnvironment(isolatedPreview)).toBe(true)
    expect(
      accessProfilesEnabledForEnvironment({
        ...isolatedPreview,
        CATI_DEMO_DATA_ISOLATED: "false",
      })
    ).toBe(false)
    // A preview may now attach a Supabase data plane and still switch roles.
    // CATI_DEMO_DATA_ISOLATED is the operator's assertion that the attached
    // project holds demo records only; the code cannot verify that claim.
    expect(
      accessProfilesEnabledForEnvironment({
        ...isolatedPreview,
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
      })
    ).toBe(true)
    expect(
      accessProfilesEnabledForEnvironment({
        ...isolatedPreview,
        SUPABASE_SERVICE_ROLE_KEY: "server-secret",
      })
    ).toBe(true)
    // The assertion must still be explicit, and production still fails closed.
    expect(
      accessProfilesEnabledForEnvironment({
        ...isolatedPreview,
        CATI_ALLOW_REMOTE_ACCESS_PROFILES: undefined,
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      })
    ).toBe(false)
    expect(
      accessProfilesEnabledForEnvironment({
        ...isolatedPreview,
        NODE_ENV: "production",
      })
    ).toBe(false)
  })

  test("local development and test stay available while local production fails closed", () => {
    expect(
      accessProfilesEnabledForEnvironment({ NODE_ENV: "development" })
    ).toBe(true)
    expect(accessProfilesEnabledForEnvironment({ NODE_ENV: "test" })).toBe(true)
    expect(
      accessProfilesEnabledForEnvironment({
        NODE_ENV: "production",
        ENABLE_ACCESS_PROFILES: "true",
      })
    ).toBe(false)
    expect(
      accessProfilesEnabledForEnvironment({ NODE_ENV: "production" })
    ).toBe(false)
  })

  test("access-profile status endpoint is available", async ({ request }) => {
    const response = await request.get("/api/access-profile")
    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(typeof payload.enabled).toBe("boolean")
  })

  test("invalid access-profile role is rejected", async ({ request }) => {
    const response = await request.post("/api/access-profile", { data: { role: "invalid_role" } })
    expect(response.status()).toBe(400)
  })

  for (const { role } of accessRoles) {
    test(`valid access-profile role can open dashboard: ${role}`, async ({ page }) => {
      const response = await page.request.post("/api/access-profile", { data: { role } })
      expect(response.status()).toBe(200)
      await page.goto("/tr/dashboard")
      await expect(page.locator("main")).toBeVisible()
      if ((page.viewportSize()?.width ?? 1280) < 768) {
        await expect(page.getByTestId("dashboard-menu-toggle")).toBeVisible()
      } else {
        await expect(dashboardSidebar(page)).toBeVisible()
      }
    })
  }
})
