import { expect, test } from "@playwright/test"

const businessRoles = [
  "admin",
  "manager",
  "accountant",
  "staff",
  "owner",
  "tenant",
] as const

test.skip(
  process.env.PLAYWRIGHT_SERVER_MODE !== "production",
  "This security probe runs only against the production Next.js runtime."
)

test("production reports access profiles disabled and rejects every role", async ({
  request,
}) => {
  const status = await request.get("/api/access-profile")
  expect(status.status()).toBe(200)
  expect(await status.json()).toEqual({ enabled: false })
  expect(status.headers()["cache-control"]).toContain("no-store")

  for (const role of businessRoles) {
    const response = await request.post("/api/access-profile", {
      data: { role },
    })
    expect(response.status(), `${role} must be rejected in production`).toBe(403)
    expect(response.headers()["set-cookie"] ?? "").not.toContain(
      "access_profile_role"
    )
  }
})

test("production login exposes real auth but no synthetic role controls", async ({
  page,
}) => {
  await page.goto("/tr/login")

  await expect(page.locator("#email")).toBeVisible()
  await expect(page.locator("#password")).toBeVisible()
  await expect(page.getByTestId("demo-full-access")).toHaveCount(0)
  await expect(page.getByTestId("demo-role-menu")).toHaveCount(0)
  await expect(page.getByTestId("qa-role-catalogue-link")).toHaveCount(0)
  for (const role of businessRoles) {
    await expect(page.getByTestId(`demo-role-option-${role}`)).toHaveCount(0)
  }
})

test("production does not expose the direct QA role catalogue", async ({
  page,
}) => {
  const response = await page.goto("/tr/login/profiles")

  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: /QA role profiles/i })).toHaveCount(0)
  await expect(page.locator("main article")).toHaveCount(0)
})

test("a forged access-profile cookie cannot open a production dashboard", async ({
  page,
}) => {
  const baseUrl = test.info().project.use.baseURL
  expect(typeof baseUrl).toBe("string")
  await page.context().addCookies([
    {
      name: "access_profile_role",
      value: "admin",
      url: String(baseUrl),
    },
  ])

  await page.goto("/tr/dashboard")
  await expect(page).toHaveURL(/\/tr\/login(?:\?|$)/)
  await expect(page.getByTestId("demo-full-access")).toHaveCount(0)
})
