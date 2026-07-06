import { NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import {
  aiImageWorkflows,
  aiPremiumRecommendations,
  getAiPremiumSummary,
} from "@/lib/site-management-data"

export const dynamic = "force-dynamic"

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "reports", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view AI premium analytics." },
      { status: 403 }
    )
  }

  return NextResponse.json({
    contractVersion: "phase-14-ai-premium.v1",
    source: "local-demo-contract",
    providerMode: "guardrailed-ai",
    generatedAt: new Date().toISOString(),
    role: profile.role,
    summary: getAiPremiumSummary(),
    recommendations: aiPremiumRecommendations,
    imageWorkflows: aiImageWorkflows,
    quality: {
      sameLanguageReplyTarget: true,
      humanApprovalForSensitiveActions: true,
      sourceLinkedRecommendations: true,
      imageWorkflowIsHumanReviewed: true,
      autonomousFinanceOrAccessActions: false,
    },
  })
}
