import { expect, test } from "@playwright/test"
import { openDashboardAs } from "../support/flows"

test.describe("dashboard AI assistant accessibility", () => {
  test("uses a named modal, contains keyboard focus, isolates the dashboard, and restores focus", async ({
    page,
  }) => {
    await openDashboardAs(page, "manager", "/en/dashboard")

    const trigger = page.getByTestId("ai-assistant-open")
    await trigger.click()

    const dialog = page.getByRole("dialog", {
      name: "1Çatı Operations Assistant",
    })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute("aria-modal", "true")
    await expect(dialog).toHaveAttribute("aria-labelledby", /.+/)
    await expect(dialog).toHaveAttribute("aria-describedby", /.+/)

    const textbox = dialog.getByRole("textbox", {
      name: "Message the AI assistant",
    })
    await expect(textbox).toBeFocused()

    expect(
      await dialog.evaluate((element) => {
        const overlay = element.parentElement
        return Array.from(document.body.children)
          .filter((sibling) => sibling !== overlay)
          .every(
            (sibling) =>
              sibling.hasAttribute("inert") &&
              sibling.getAttribute("aria-hidden") === "true"
          )
      })
    ).toBe(true)
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden"
    )

    const focusable = dialog.locator(
      'a[href]:visible, button:not([disabled]):visible, input:not([disabled]):visible, select:not([disabled]):visible, textarea:not([disabled]):visible, [tabindex]:not([tabindex="-1"]):visible'
    )
    expect(await focusable.count()).toBeGreaterThan(1)

    await focusable.last().focus()
    await page.keyboard.press("Tab")
    await expect(focusable.first()).toBeFocused()

    await focusable.first().focus()
    await page.keyboard.press("Shift+Tab")
    await expect(focusable.last()).toBeFocused()

    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden"
    )
    expect(
      await trigger.evaluate((element) => {
        let root = element as HTMLElement
        while (root.parentElement && root.parentElement !== document.body) {
          root = root.parentElement
        }
        return {
          inert: root.hasAttribute("inert"),
          ariaHidden: root.getAttribute("aria-hidden"),
        }
      })
    ).toEqual({ inert: false, ariaHidden: null })
  })

  test("announces in-flight and completed assistant responses without moving focus", async ({
    page,
  }) => {
    let releaseResponse: () => void = () => {}
    let requestCount = 0
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = () => resolve()
    })
    await page.route("**/api/ai/chat", async (route) => {
      requestCount += 1
      await responseGate
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply:
            "The assigned service request remains pending manager approval.",
          language: "en",
        }),
      })
    })

    await openDashboardAs(page, "manager", "/en/dashboard")
    await page.getByTestId("ai-assistant-open").click()

    const dialog = page.getByRole("dialog", {
      name: "1Çatı Operations Assistant",
    })
    const conversation = dialog.getByRole("log", {
      name: "1Çatı Operations Assistant",
    })
    await expect(conversation).toHaveAttribute("aria-live", "polite")
    await expect(conversation).toHaveAttribute(
      "aria-relevant",
      "additions text"
    )
    await expect(conversation).toHaveAttribute("aria-busy", "false")

    const textbox = dialog.getByRole("textbox", {
      name: "Message the AI assistant",
    })
    const sendButton = dialog.getByRole("button", { name: "Send" })
    await textbox.fill("What is the status of the assigned service request?")
    await sendButton.click()

    await expect(conversation).toHaveAttribute("aria-busy", "true")
    await expect(dialog.getByRole("status")).toHaveText(
      "The assistant is preparing a response"
    )
    await expect(textbox).toBeEnabled()
    await expect(textbox).toBeFocused()
    await expect(sendButton).toBeDisabled()

    await textbox.fill("Keep this follow-up ready while the answer is pending.")
    await textbox.press("Enter")
    await expect.poll(() => requestCount).toBe(1)
    await expect(textbox).toHaveValue(
      "Keep this follow-up ready while the answer is pending."
    )

    releaseResponse()
    await expect(
      conversation.getByText(
        "The assigned service request remains pending manager approval."
      )
    ).toBeVisible()
    await expect(conversation).toHaveAttribute("aria-busy", "false")
    await expect(dialog.getByRole("status")).toHaveCount(0)
    await expect(sendButton).toBeEnabled()
    await expect(textbox).toBeFocused()
  })
})
