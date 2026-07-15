import { NextResponse } from "next/server"
import {
  detectAiLanguage,
  generateAiResponse,
  getAiAccessDecision,
  getAiRoleProfile,
  getAiRoleSystemInstruction,
  resolveAiLanguage,
} from "@/lib/ai-responses"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import { canAccessUnitForRole, isClientRole, normalizeUnitNo } from "@/lib/role-scoped-views"
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

const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

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
    "service ticket",
    "service request",
    "serviceanfrage",
    "serviceticket",
    "störung",
    "stoerung",
    "reparatur",
    "wartung",
    "defekt",
    "servis talep",
    "servis kayd",
    "talep",
    "talep oluştur",
    "arıza",
    "ariza",
    "bakım",
    "bakim",
    "заявк",
    "тикет",
    "сервис",
    "ремонт",
    "поломк",
    "неисправ",
  ]
  const createWords = [
    "create",
    "open",
    "raise",
    "submit",
    "fix",
    "repair",
    "send",
    "dispatch",
    "aç",
    "ac",
    "oluştur",
    "olustur",
    "kaydet",
    "gönder",
    "gonder",
    "yönlendir",
    "yonlendir",
    "erstellen",
    "öffnen",
    "oeffnen",
    "anlegen",
    "melden",
    "einreichen",
    "beheben",
    "reparieren",
    "senden",
    "создай",
    "создать",
    "открой",
    "открыть",
    "оформи",
    "зарегистрируй",
    "подай",
    "отправь",
    "отправьте",
  ]
  const issueWords = [
    "leak",
    "water",
    "no water",
    "door",
    "handle",
    "broken",
    "stuck",
    "electric",
    "power outage",
    "spark",
    "gas",
    "smoke",
    "fire",
    "alarm",
    "elevator",
    "lift",
    "sewage",
    "sewer",
    "blocked toilet",
    "toilet overflow",
    "lockout",
    "locked out",
    "gate",
    "barrier",
    "spa",
    "pool",
    "restaurant",
    "event",
    "plumbing",
    "pipe",
    "burst",
    "su",
    "su yok",
    "tesisat",
    "yangin",
    "duman",
    "gaz",
    "asansor",
    "asansör",
    "gider",
    "gider taşması",
    "gider tasmasi",
    "tuvalet",
    "bariyer",
    "havuz",
    "hijyen",
    "restoran",
    "etkinlik",
    "kıvılcım",
    "kivilcim",
    "kaçak",
    "kacak",
    "kapı",
    "kapi",
    "kapıda",
    "kapida",
    "kilit",
    "kol",
    "bozuk",
    "sıkıştı",
    "sikisti",
    "wasser",
    "kein wasser",
    "leck",
    "rohr",
    "tür",
    "tuer",
    "griff",
    "kaputt",
    "klemmt",
    "strom",
    "rauch",
    "feuer",
    "gasgeruch",
    "aufzug",
    "abfluss",
    "zugang",
    "вода",
    "протеч",
    "двер",
    "ручк",
    "слом",
    "застр",
    "электр",
  ]

  const urgentWords = [
    "urgent",
    "critical",
    "emergency",
    "immediate",
    "trapped",
    "gas",
    "smoke",
    "fire",
    "spark",
    "sewage",
    "lockout",
    "asansör",
    "yangın",
    "kıvılcım",
    "su kaçağı",
    "gider taşması",
    "acil",
    "kritik",
    "hemen",
    "dringend",
    "sofort",
    "kritisch",
    "сроч",
    "авар",
    "критич",
  ]
  const hasTicketIntent = ticketWords.some((word) => lower.includes(word))
  const hasCreateIntent = createWords.some((word) => lower.includes(word))
  const hasIssueSignal = issueWords.some((word) => lower.includes(word))
  const looksLikeReportedEmergency =
    Boolean(extractUnitNo(message)) &&
    hasIssueSignal &&
    urgentWords.some((word) => lower.includes(word))

  return (
    (hasCreateIntent && (hasTicketIntent || hasIssueSignal)) ||
    looksLikeReportedEmergency
  )
}

function extractUnitNo(message: string) {
  const patterns = [
    /\b(?:unit|flat|apartment|apt|daire|wohnung|einheit|квартира|апартамент|юнит)\s*([a-zçğıöşü]-?\d{1,4})\b/i,
    /\b([a-zçğıöşü]-\d{2,4})\b/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match?.[1]) return normalizeUnitNo(match[1])
  }

  return null
}

function detectTicketCategory(message: string) {
  const lower = message.toLocaleLowerCase("tr-TR")
  if (/gas|smoke|fire|alarm|yangin|yangın|duman|gaz|rauch|feuer|gasgeruch|пожар|дым/.test(lower)) return "life-safety"
  if (/elevator|lift|asansor|asansör|kabinde|aufzug|лифт/.test(lower)) return "elevator"
  if (/sewage|sewer|drain overflow|blocked toilet|toilet overflow|gider|tuvalet|kanalizasyon|abfluss|toilette|канал|унитаз/.test(lower)) return "sewer"
  if (/water|no water|leak|plumb|pipe|burst|su|su yok|tesisat|kaçak|kacak|wasser|kein wasser|leck|rohr|протеч|вода|нет воды|сантех/.test(lower)) return "plumbing"
  if (/electric|power|light|spark|short circuit|elektrik|kivilcim|kıvılcım|strom|kurzschluss|электр|свет/.test(lower)) return "electrical"
  if (/lockout|locked out|door|handle|lock|key|access|gate|barrier|qr|card|kapı|kapi|kilit|bariyer|plaka|tür|tuer|schloss|zugang|двер|замок|ключ|ручк/.test(lower)) return "access-maintenance"
  if (/ac not working|air conditioning|hvac|too hot|klima|sicak|sıcak|iklim|klimaanlage|heiss|жарко|кондиционер/.test(lower)) return "hvac"
  if (/spa|pool|fitness|hygiene|havuz|ortak alan|hijyen|wellness|schwimmbad|бассейн|спа/.test(lower)) return "amenity-spa-pool"
  if (/restaurant|food|event|theatre|restoran|yemek|etkinlik|tiyatro|veranstaltung|ресторан|мероприят/.test(lower)) return "amenity-food-event"
  if (/clean|temizlik|reinigung|уборк/.test(lower)) return "cleaning"
  if (/service|servis|wartung|maintenance|bakım|bakim|ремонт|сервис/.test(lower)) return "maintenance"
  return "general"
}

function detectTicketPriority(message: string) {
  return /urgent|critical|emergency|immediate|trapped|gas|smoke|fire|spark|sewage|lockout|no water|water leak|power outage|elevator|acil|kritik|hemen|yangin|yangın|duman|gaz|asansor|asansör|kivilcim|kıvılcım|gider taşması|su yok|su kacagi|su kaçağı|dringend|sofort|kritisch|kein wasser|wasserleck|сроч|критич|авар|нет воды|протеч/i.test(message)
    ? "urgent"
    : "normal"
}

function containsAny(text: string, terms: string[]) {
  const lower = text.toLocaleLowerCase("tr-TR")
  return terms.some((term) => lower.includes(term))
}

function hasPromptInjectionSignal(message: string) {
  return /(ignore|forget) (all )?(previous|above|system|rules|instructions)|system prompt|developer message|jailbreak|bypass|reveal (your )?(prompt|instructions)|act as admin|forget your rules/i.test(
    message
  )
}

function sensitiveActionSignal(message: string) {
  return /pay|refund|deposit|restriction|restrict|unlock|access card|delete user|role|permission|ödeme|iade|depozito|kısıt|kisit|erişim|erisim|rol|yetki|zahlung|erstattung|kaution|sperr|zugang|rolle|berechtigung|платеж|возврат|депозит|доступ|роль|прав/i.test(
    message
  )
}

function buildAiSafetyEvaluation({
  message,
  role,
  language,
  source,
  resource,
  ticketDraft,
}: {
  message: string
  role: string
  language: string
  source: string
  resource?: string
  ticketDraft: { requiresHumanApproval: boolean } | null
}) {
  const promptInjectionDetected = hasPromptInjectionSignal(message)
  const sensitiveActionRequested = sensitiveActionSignal(message)
  const humanApprovalRequired =
    Boolean(ticketDraft?.requiresHumanApproval) || sensitiveActionRequested

  return {
    version: "operations-ai-safety-v2",
    role,
    language,
    source,
    resource: resource ?? "general",
    roleScoped: true,
    grounded: source !== "local-ai" || Boolean(resource),
    promptInjectionDetected,
    sensitiveActionRequested,
    humanApprovalRequired,
    privateDataBoundary:
      source === "rbac-guard"
        ? "blocked_by_role"
        : role === "owner" || role === "tenant" || role === "staff"
          ? "role_scope_only"
          : "privileged_role_scope",
    flags: [
      ...(promptInjectionDetected ? ["prompt_injection_probe"] : []),
      ...(humanApprovalRequired ? ["human_approval_required"] : []),
      ...(source === "rbac-guard" ? ["rbac_guard_applied"] : []),
    ],
  }
}

function isLikelySameLanguage(text: string, language: ReturnType<typeof detectAiLanguage>) {
  const trimmed = text.trim()
  if (!trimmed) return false

  if (language === "ru") {
    const cyrillic = trimmed.match(/[\u0400-\u04ff]/g)?.length ?? 0
    return cyrillic >= 8
  }

  if (language === "de") {
    return containsAny(trimmed, [
      " der ",
      " die ",
      " das ",
      " und ",
      " für ",
      "freigabe",
      "wohnung",
      "service",
      "ticket",
      "nicht",
      "wird",
    ])
  }

  if (language === "tr") {
    return containsAny(trimmed, [
      " ve ",
      " için ",
      "servis",
      "talep",
      "onay",
      "daire",
      "borç",
      "gerek",
      "oluştur",
      "kaydı",
    ])
  }

  return containsAny(trimmed, [
    " the ",
    " and ",
    " for ",
    "service",
    "ticket",
    "approval",
    "request",
    "unit",
    "requires",
  ])
}

function buildTicketDraft(message: string) {
  const compact = message.replace(/\s+/g, " ").trim()
  const title = compact.length > 120 ? `${compact.slice(0, 117)}...` : compact
  return {
    title: title || "AI service ticket draft",
    description: compact,
    category: detectTicketCategory(compact),
    priority: detectTicketPriority(compact),
    unitNo: extractUnitNo(compact),
  }
}

export async function POST(request: Request) {
  let body: { message?: unknown; locale?: unknown; uiLocale?: unknown }
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
  const uiLocale =
    typeof body.locale === "string"
      ? body.locale
      : typeof body.uiLocale === "string"
        ? body.uiLocale
        : "tr"

  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = profile.role
  const language = resolveAiLanguage(message, uiLocale)
  const roleProfile = getAiRoleProfile(role)
  const accessDecision = getAiAccessDecision(message, role, language)
  const deterministicContext = generateAiResponse(message, role, language)
  const requestedTicketDraft = wantsTicketDraft(message)

  let ticketDraft:
    | {
        id: string
        status: string
        title: string
        category: string
        priority: string
        unitNo: string | null
        requiresHumanApproval: boolean
      }
    | null = null

  if (requestedTicketDraft) {
    const workflowAction = resolveWorkflowAction("ticket.create.ai_draft", "service_tickets")
    const ticketAccess = getAiAccessDecision("service ticket create", role, language)
    const canCreateTicketDraft = hasAnyPermission(role, workflowAction.resource, workflowAction.requiredActions)
    const draft = buildTicketDraft(message)
    const hasUnitScope = !isClientRole(role) || canAccessUnitForRole(role, draft.unitNo)
    if (ticketAccess.allowed && canCreateTicketDraft && hasUnitScope) {
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
          useLocalAccessProfile: profile.id === LOCAL_ACCESS_PROFILE_ID,
        })
        ticketDraft = {
          id: result.id,
          status: "submitted",
          title: draft.title,
          category: draft.category,
          priority: draft.priority,
          unitNo: draft.unitNo,
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
      evaluation: buildAiSafetyEvaluation({
        message,
        role,
        language,
        source: "rbac-guard",
        resource: accessDecision.resource,
        ticketDraft,
      }),
    })
  }

  if (requestedTicketDraft) {
    return NextResponse.json({
      reply: deterministicContext,
      source: "deterministic-fallback",
      role,
      roleProfile,
      language,
      resource: accessDecision.resource,
      ticketDraft,
      evaluation: buildAiSafetyEvaluation({
        message,
        role,
        language,
        source: "deterministic-fallback",
        resource: accessDecision.resource,
        ticketDraft,
      }),
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
      evaluation: buildAiSafetyEvaluation({
        message,
        role,
        language,
        source: "deterministic-fallback",
        resource: accessDecision.resource,
        ticketDraft,
      }),
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
    const guardedContent = isLikelySameLanguage(completion.content, language)
      ? completion.content
      : deterministicContext

    return NextResponse.json({
      reply: guardedContent,
      source: guardedContent === completion.content ? "local-ai" : "deterministic-language-guard",
      role,
      roleProfile,
      language,
      resource: accessDecision.resource,
      ticketDraft,
      model: completion.model,
      usage: completion.usage,
      evaluation: buildAiSafetyEvaluation({
        message,
        role,
        language,
        source: guardedContent === completion.content ? "local-ai" : "deterministic-language-guard",
        resource: accessDecision.resource,
        ticketDraft,
      }),
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
      evaluation: buildAiSafetyEvaluation({
        message,
        role,
        language,
        source: "deterministic-fallback",
        resource: accessDecision.resource,
        ticketDraft,
      }),
    })
  }
}
