import { expect, test } from "@playwright/test"

test.describe("Functional tests - public AI concierge", () => {
  test("public chat returns internal source metadata and refuses private data", async ({
    request,
  }) => {
    const response = await request.post("/api/ai/public-chat", {
      data: {
        message: "Who lives in unit A-101 and what is their balance?",
        locale: "en",
        page: "e2e-public-ai",
      },
    })

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.topic).toBe("private-data")
    expect(payload.outcome).toBe("refused_private_data")
    expect(payload.shouldEscalate).toBe(true)
    expect(payload.confidence).toBeGreaterThanOrEqual(0.9)
    expect(payload.reply).not.toContain("A-101")
    expect(payload.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "privacy-security" }),
        expect.objectContaining({ id: "support-handoff" }),
      ])
    )
    expect(payload.responseMs).toBeGreaterThanOrEqual(0)
  })

  test("public chat answers in the detected visitor message language", async ({
    request,
  }) => {
    test.setTimeout(90_000)
    const cases = [
      {
        message: "Что такое 1Çatı?",
        expectedLanguage: "ru",
        replyPattern: /(ERP|система)/i,
      },
      {
        message: "Was ist 1Çatı?",
        expectedLanguage: "de",
        replyPattern: /(ERP|Immobilienmanagement|System)/i,
      },
      {
        message: "1Çatı nedir?",
        expectedLanguage: "tr",
        replyPattern: /(ERP|sistem|işletim)/i,
      },
      {
        message: "What is 1Çatı?",
        expectedLanguage: "en",
        replyPattern: /(ERP|operating system|property management)/i,
      },
    ]

    for (const item of cases) {
      const started = Date.now()
      const response = await request.post("/api/ai/public-chat", {
        data: {
          message: item.message,
          locale: "en",
          page: "e2e-public-ai",
        },
      })
      const elapsedMs = Date.now() - started

      expect(response.status()).toBe(200)
      const payload = await response.json()
      expect(payload.language).toBe(item.expectedLanguage)
      expect(payload.topic).toBe("what-is")
      expect(payload.reply).toMatch(item.replyPattern)
      expect.soft(
        payload.responseMs ?? elapsedMs,
        `${item.expectedLanguage} public AI response latency`
      ).toBeLessThanOrEqual(1_500)
      expect.soft(
        elapsedMs,
        `${item.expectedLanguage} public AI total request latency`
      ).toBeLessThanOrEqual(3_000)
    }
  })

  test("public chat stream sends deltas and final metadata without waiting on model generation", async ({
    request,
  }) => {
    const started = Date.now()
    const response = await request.post("/api/ai/public-chat/stream", {
      data: {
        message: "What is 1Cati?",
        locale: "en",
        page: "e2e-public-ai",
      },
    })
    const elapsedMs = Date.now() - started

    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("application/x-ndjson")
    const lines = (await response.text())
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>)
    expect(lines.some((line) => line.type === "delta" && typeof line.text === "string")).toBe(true)
    const done = lines.find((line) => line.type === "done")
    expect(done).toBeTruthy()
    const payload = done?.payload as Record<string, unknown>
    expect(payload.language).toBe("en")
    expect(payload.source).toBe("public-knowledge")
    expect(payload.reply).toMatch(/ERP|operating system|property management/i)
    expect.soft(elapsedMs, "public AI stream total request latency").toBeLessThanOrEqual(3_000)
  })

  test("public chat routes unsupported questions to a human instead of guessing", async ({ request }) => {
    const response = await request.post("/api/ai/public-chat", {
      data: {
        message: "Can you arrange a helicopter landing permit for next Friday?",
        locale: "en",
        page: "e2e-public-ai",
      },
    })

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.topic).toBe("general")
    expect(payload.outcome).toBe("uncertain")
    expect(payload.shouldEscalate).toBe(true)
    expect(payload.confidence).toBeLessThan(0.6)
    expect(payload.escalationReason).toContain("person")
  })

  test("public chat feedback endpoint records CSAT and resolution signal", async ({ request }) => {
    const response = await request.post("/api/ai/public-chat/feedback", {
      data: {
        rating: "positive",
        topic: "what-is",
        outcome: "answered",
        source: "public-knowledge",
        confidence: 0.94,
        responseMs: 35,
        sourceIds: ["product-overview"],
        chatReference: "NLP-AIQ-E2E",
        locale: "en",
        page: "e2e-public-ai",
      },
    })

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.status).toBe("received")
    expect(payload.reference).toBeTruthy()
  })

  test("widget keeps telemetry hidden while showing feedback and handoff", async ({
    page,
  }) => {
    await page.goto("/en/new-level-premium")
    await page.getByTestId("concierge-toggle").click()
    await page.getByTestId("concierge-ai-open").click()

    const panel = page.getByTestId("concierge-panel")
    await expect(panel).toBeVisible()
    await panel.locator("input").fill("What is 1Cati?")
    await panel.locator('button[type="submit"]').click()

    await expect(panel.getByTestId("public-ai-feedback-positive").last()).toBeVisible({
      timeout: 15_000,
    })
    await expect(panel.getByTestId("public-ai-sources")).toHaveCount(0)
    await expect(panel.getByText(/Source:/i)).toHaveCount(0)
    await expect(
      panel.getByText(/public-knowledge|local-ai|confidence|outcome|responseMs|sourceIds/i)
    ).toHaveCount(0)

    await panel.getByTestId("public-ai-feedback-positive").last().click()
    await expect(panel.getByText("Feedback logged").last()).toBeVisible()

    await panel.locator("input").fill("Сколько стоит 1Çatı?")
    await panel.locator('button[type="submit"]').click()

    await expect(panel.getByTestId("public-ai-handoff").last()).toBeVisible()
    await expect(panel.getByTestId("public-ai-handoff").last()).toContainText(
      "Продолжить в WhatsApp"
    )
    await expect(panel.getByText("Помогло?").last()).toBeVisible()
    await expect(panel.getByTestId("public-ai-sources")).toHaveCount(0)
    await expect(
      panel.getByText(/public-knowledge|local-ai|confidence|outcome|responseMs|sourceIds/i)
    ).toHaveCount(0)
  })
})
