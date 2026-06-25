export type LocalAiPurpose = "fast" | "reasoning" | "german-copy" | "pro"

export type LocalAiMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type LocalAiCompletionInput = {
  messages: LocalAiMessage[]
  purpose?: LocalAiPurpose
  maxTokens?: number
  temperature?: number
}

const modelEnvByPurpose: Record<LocalAiPurpose, string> = {
  fast: "AI_MODEL_FAST",
  reasoning: "AI_MODEL_REASONING",
  "german-copy": "AI_MODEL_GERMAN_COPY",
  pro: "AI_MODEL_PRO",
}

export async function isLocalAiConfigured() {
  return Boolean(process.env.AI_API_URL && process.env.AI_API_KEY)
}

export async function getLocalAiModel(purpose: LocalAiPurpose = "fast") {
  return (
    process.env[modelEnvByPurpose[purpose]] ??
    process.env.AI_MODEL_FAST ??
    "sokrates-fast"
  )
}

export async function completeWithLocalAi({
  messages,
  purpose = "fast",
  maxTokens = 500,
  temperature = 0.2,
}: LocalAiCompletionInput) {
  if (!(await isLocalAiConfigured())) {
    throw new Error("Local AI is not configured.")
  }

  const apiUrl = process.env.AI_API_URL
  const apiKey = process.env.AI_API_KEY
  const baseUrl = apiUrl!.replace(/\/$/, "")
  const chatPath = process.env.AI_CHAT_COMPLETIONS_PATH ?? "/chat/completions"
  const model = await getLocalAiModel(purpose)
  const response = await fetch(`${baseUrl}${chatPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!response.ok) {
    throw new Error(`Local AI request failed with status ${response.status}.`)
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Local AI response did not include assistant content.")
  }

  return {
    content: content.trim(),
    model: payload?.model ?? model,
    usage: payload?.usage ?? null,
  }
}
