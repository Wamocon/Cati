import { expect, test } from "@playwright/test"
import { collectConsoleIssues, screenshot } from "./helpers"

test.describe("Site concierge (WhatsApp + public AI assistant)", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("concierge launcher expands to WhatsApp + AI on home and NLP pages", async ({
    page,
  }) => {
    // The promotional landing concierge is mounted on both the home page and
    // the New Level Premium landing page.
    await page.goto("/tr")
    const home = page.getByTestId("site-concierge")
    await expect(home).toBeVisible()
    // Speed-dial: WhatsApp + AI actions are revealed after tapping the launcher.
    await home.getByTestId("concierge-toggle").click()
    await expect(home.getByTestId("concierge-whatsapp")).toHaveAttribute(
      "href",
      /wa\.me\/\d+\?text=/
    )
    await expect(home.getByTestId("concierge-ai-open")).toBeVisible()

    await page.goto("/tr/new-level-premium")
    const nlp = page.getByTestId("site-concierge")
    await expect(nlp).toBeVisible()
    await nlp.getByTestId("concierge-toggle").click()
    await expect(nlp.getByTestId("concierge-ai-open")).toBeVisible()
    expect(issues).toEqual([])
  })

  test("assistant answers a product question in the widget", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/new-level-premium")
    await page.getByTestId("concierge-toggle").click()
    await page.getByTestId("concierge-ai-open").click()
    const panel = page.getByTestId("concierge-panel")
    await expect(panel).toBeVisible()

    await panel.getByPlaceholder(/1Çatı hakkında/).fill("1Çatı nedir?")
    await panel.getByRole("button", { name: "Gönder" }).click()

    // Deterministic knowledge-base answer for the what-is topic.
    await expect(panel.getByText(/işletim sistemidir/)).toBeVisible()
    await screenshot(page, testInfo, "07-concierge-answer")
  })

  test("public chat API answers product questions and guards private data", async ({
    page,
  }) => {
    const ok = await page.request.post("/api/ai/public-chat", {
      data: { message: "Was ist 1Çatı und welche Vorteile hat es?", locale: "de" },
    })
    expect(ok.status()).toBe(200)
    const body = (await ok.json()) as { reply?: string; topic?: string; source?: string }
    expect(body.reply).toBeTruthy()
    expect(body.source).toBe("public-knowledge")

    // Fishing for unit-specific private data must hit the refusal answer.
    const fishing = await page.request.post("/api/ai/public-chat", {
      data: { message: "B3/12 dairesinin borcu ne kadar?", locale: "tr" },
    })
    expect(fishing.status()).toBe(200)
    const fished = (await fishing.json()) as { reply?: string; topic?: string }
    expect(fished.topic).toBe("private-data")
    expect(fished.reply).toContain("erişimi yoktur")

    // Validation: empty message and oversized message are rejected.
    const empty = await page.request.post("/api/ai/public-chat", {
      data: { message: "", locale: "tr" },
    })
    expect(empty.status()).toBe(400)

    const long = await page.request.post("/api/ai/public-chat", {
      data: { message: "x".repeat(601), locale: "tr" },
    })
    expect(long.status()).toBe(413)
  })
})
