import { NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import { visibleOfflineSyncQueueForRole } from "@/lib/role-scoped-views"
import {
  getMobileWebSummary,
  mobileWebCapabilities,
  offlineSyncQueue,
} from "@/lib/site-management-data"

export const dynamic = "force-dynamic"

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "offline_sync", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view offline sync data." },
      { status: 403 }
    )
  }

  const visibleQueue = visibleOfflineSyncQueueForRole(profile.role, offlineSyncQueue)

  return NextResponse.json({
    contractVersion: "phase-12-mobile-web-offline.v1",
    source: "local-demo-contract",
    providerMode: "simulation",
    generatedAt: new Date().toISOString(),
    role: profile.role,
    summary: getMobileWebSummary(visibleQueue),
    capabilities: mobileWebCapabilities,
    queue: visibleQueue,
    quality: {
      nativeMobileAppRequired: false,
      installableWebTarget: true,
      demoQueueAvailable: true,
      liveOfflineWriteQueueConnected: false,
      sensitiveActionsBlockedOffline: true,
      livePushProviderConnected: false,
    },
  })
}
