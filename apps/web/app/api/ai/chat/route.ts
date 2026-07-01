import { NextResponse } from "next/server"
import {
  detectAiLanguage,
  generateAiResponse,
  getAiAccessDecision,
  getAiRoleProfile,
  getAiRoleSystemInstruction,
} from "@/lib/ai-responses"
import { getUserProfile } from "@/lib/auth"
import {
  completeWithLocalAi,
  isLocalAiConfigured,
  LocalAiPurpose,
} from "@/lib/local-ai"
import { logClientAction } from "@/lib/site-management-repository"
import {
  buildWorkflowMetadata,
  resolveWorkflowAction,
} from "@/lib/action-catalog"

function choosePurpose(message: string): LocalAiPurpose {
  const lower = message.toLocaleLowerCase("tr-TR")
  if (
    lower.includes("rapor") ||
    lower.includes("analiz") ||
    lower.includes("risk") ||
    lower.includes("plan") ||
    lower.includes("finans") ||
    lower.includes("finance") ||
    lower.includes("bericht") ||
    lower.includes("report") ||
    lower.includes("integration") ||
    lower.includes("image") ||
    lower.includes("photo")
  ) {
    return "pro"
  }
  return "fast"
}

function wantsTicketDraft(message: string) {
  const lower = message.toLocaleLowerCase("tr-TR")
  const ticketWords = [
    "ticket",
    "service request",
    "servis talep",
    "servis kayd",
    "talep aç",
    "talep olustur",
    "talep oluştur",
    "arıza",
    "ariza",
  ]
  const createWords = [
    "create",
    "open",
    "raise",
    "submit",
    "aç",
    "ac",
    "oluştur",
    "olustur",
    "kaydet",
  ]

  return (
    ticketWords.some((word) => lower.includes(word)) &&
    createWords.some((word) => lower.includes(word))
  )
}

function buildTicketDraft(message: string) {
  const compact = message.replace(/\s+/g, " ").trim()
  const title = compact.length > 120 ? `${compact.slice(0, 117)}...` : compact
  return {
    title: title || "AI service ticket draft",
    description: compact,
    category: "general",
    priority: /urgent|acil|kritik|critical/i.test(compact) ? "urgent" : "normal",
  }
}

export async function POST(request: Request) {
  let body: { message?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Message is too long" }, { status: 413 })
  }

  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = profile.role
  const language = detectAiLanguage(message)
  const roleProfile = getAiRoleProfile(role)
  const accessDecision = getAiAccessDecision(message, role, language)
  const deterministicContext = generateAiResponse(message, role, language)

  let ticketDraft:
    | {
        id: string
        status: string
        title: string
        requiresHumanApproval: boolean
      }
    | null = null

  if (wantsTicketDraft(message)) {
    const ticketAccess = getAiAccessDecision("service ticket create", role, language)
    if (ticketAccess.allowed) {
      const workflowAction = resolveWorkflowAction("ticket.create.ai_draft", "service_tickets")
      const draft = buildTicketDraft(message)
      try {
        const result = await logClientAction({
          actionType: "ticket.create.ai_draft",
          entityTable: "service_tickets",
          entityExternalId: "ai-ticket-draft",
          title: draft.title,
          metadata: {
            proposedPayload: draft,
            ai: {
              language,
              source: "chat",
              modelExecution: "draft_only",
            },
            ...buildWorkflowMetadata({
              action: workflowAction,
              origin: "ai",
              requestedByRole: role,
              requestedById: profile.id,
            }),
          },
        })
        ticketDraft = {
          id: result.id,
          status: "submitted",
          title: draft.title,
          requiresHumanApproval: workflowAction.requiresHumanApproval,
        }
      } catch {
        ticketDraft = null
      }
    }
  }

  if (!accessDecision.allowed) {
    return NextResponse.json({
      reply: deterministicContext,
      source: "rbac-guard",
      role,
      roleProfile,
      language,
      resource: accessDecision.resource,
      ticketDraft,
    })
  }

  if (!(await isLocalAiConfigured())) {
    return NextResponse.json({
      reply: deterministicContext,
      source: "deterministic-fallback",
      role,
      roleProfile,
      language,
      resource: accessDecision.resource,
      ticketDraft,
    })
  }

  try {
    const completion = await completeWithLocalAi({
      purpose: choosePurpose(message),
      maxTokens: 520,
      temperature: 0.15,
      messages: [
        {
          role: "system",
          content: [
            "You are the 1Cati property-management CRM operations assistant.",
            getAiRoleSystemInstruction(role),
            `Reply only in the user's detected language: ${language}.`,
            "Keep the answer short, clear and professional. Do not use tables or code blocks.",
            "Do not directly execute finance, refund, deposit, debt restriction, access-card, security or user-permission actions; only recommend and state when human approval is required.",
            "Do not invent data. Use only the system context and active role scope.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Active role: ${role}\nDetected language: ${language}\nSystem context: ${deterministicContext}\nUser question: ${message}`,
        },
      ],
    })

    return NextResponse.json({
      reply: completion.content,
      source: "local-ai",
      role,
      roleProfile,
      language,
      resource: accessDecision.resource,
      ticketDraft,
      model: completion.model,
      usage: completion.usage,
    })
  } catch {
    return NextResponse.json({
      reply: deterministicContext,
      source: "deterministic-fallback",
      role,
      roleProfile,
      language,
      resource: accessDecision.resource,
      ticketDraft,
    })
  }
}
