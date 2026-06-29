import { NextResponse } from "next/server"
import {
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

function choosePurpose(message: string): LocalAiPurpose {
  const lower = message.toLocaleLowerCase("tr-TR")
  if (
    lower.includes("rapor") ||
    lower.includes("analiz") ||
    lower.includes("risk") ||
    lower.includes("plan") ||
    lower.includes("finans")
  ) {
    return "pro"
  }
  return "fast"
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
  const roleProfile = getAiRoleProfile(role)
  const accessDecision = getAiAccessDecision(message, role)
  const deterministicContext = generateAiResponse(message, role)

  if (!accessDecision.allowed) {
    return NextResponse.json({
      reply: deterministicContext,
      source: "rbac-guard",
      role,
      roleProfile,
      resource: accessDecision.resource,
    })
  }

  if (!(await isLocalAiConfigured())) {
    return NextResponse.json({
      reply: deterministicContext,
      source: "deterministic-fallback",
      role,
      roleProfile,
      resource: accessDecision.resource,
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
            "Sen 1Cati site yonetim CRM icin Turkce konusan operasyon asistanisin.",
            getAiRoleSystemInstruction(role),
            "Kisa, net ve profesyonel cevap ver. Markdown, kalin yazi isareti, tablo veya kod blogu kullanma.",
            "Finans, iade, depozito, borc kisiti, erisim karti, guvenlik veya kullanici yetkisi aksiyonlarini dogrudan uygulama; sadece oner ve insan onayi gerektigini belirt.",
            "Uydurma veri kullanma. Verilen sistem baglamina ve aktif rol kapsamına dayan.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Kullanici rolu: ${role}\nSistem baglami: ${deterministicContext}\nKullanici sorusu: ${message}`,
        },
      ],
    })

    return NextResponse.json({
      reply: completion.content,
      source: "local-ai",
      role,
      roleProfile,
      resource: accessDecision.resource,
      model: completion.model,
      usage: completion.usage,
    })
  } catch {
    return NextResponse.json({
      reply: deterministicContext,
      source: "deterministic-fallback",
      role,
      roleProfile,
      resource: accessDecision.resource,
    })
  }
}
