import { expect, test, type Page } from "@playwright/test"

async function setRole(page: Page, role: string) {
  if (page.url() === "about:blank") await page.goto("/tr/login")
  await page.context().addCookies([
    {
      name: "access_profile_role",
      value: role,
      url: new URL(page.url()).origin,
    },
  ])
}

test("accountant posts through the accessible form and manager receives a truthful read-only view", async ({ page }) => {
  test.setTimeout(90_000)
  await setRole(page, "accountant")
  await page.goto("/en/dashboard/finance")

  await expect(page.getByTestId("manual-payment-console")).toBeVisible()
  await expect(page.getByText("Manual / unreconciled", { exact: true }).first()).toBeVisible()
  await expect(page.getByTestId("manual-payment-form")).toBeVisible()
  await expect(page.getByTestId("manual-payment-currency")).toHaveAttribute(
    "readonly",
    ""
  )

  const reference = `UI-MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  await page.getByTestId("manual-payment-amount").fill("875.25")
  await page.getByTestId("manual-payment-reference").fill(reference)
  await page.getByTestId("manual-payment-note").fill(
    "Accounting checked the receipt image; independent bank reconciliation is still pending."
  )
  const paymentResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/site-management/manual-payments",
    { timeout: 30_000 }
  )
  await page.getByTestId("manual-payment-submit").click()
  const paymentResponse = await paymentResponsePromise
  expect(
    [200, 201],
    `manual payment API returned ${paymentResponse.status()}: ${await paymentResponse.text()}`
  ).toContain(paymentResponse.status())

  await expect(page.getByTestId("manual-payment-message")).toContainText(
    /posted as manual|earlier successful/i,
    { timeout: 10_000 }
  )
  await expect(page.getByTestId("manual-payment-history")).toContainText(reference)

  await page.reload()
  await expect(page.getByTestId("manual-payment-history")).toContainText(reference)

  await setRole(page, "manager")
  await page.reload()
  await expect(page.getByTestId("manual-payment-manager-readonly")).toBeVisible()
  await expect(page.getByTestId("manual-payment-form")).toHaveCount(0)
  await expect(page.getByTestId("manual-payment-history")).toContainText(reference)
})
