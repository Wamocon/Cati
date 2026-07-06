import { NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import {
  getIntegrationSummary,
  integrationProviders,
} from "@/lib/site-management-data"

export const dynamic = "force-dynamic"

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "settings", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view integration readiness." },
      { status: 403 }
    )
  }

  return NextResponse.json({
    contractVersion: "phase-13-integration-readiness.v1",
    source: "local-demo-contract",
    providerMode: "simulation",
    generatedAt: new Date().toISOString(),
    role: profile.role,
    summary: getIntegrationSummary(),
    providers: integrationProviders,
    quality: {
      supabaseConnected: true,
      liveExternalProvidersConnected: false,
      providerPlaceholdersPresent: true,
      clientApprovalRequired: true,
      manualFallbacksDefined: true,
    },
  })
}
