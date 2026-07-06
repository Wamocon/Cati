import { NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import {
  communicationThreads,
  getCommunicationSummary,
  guestLifecycleEvents,
  messageTemplates,
  notificationDeliveries,
  notificationRules,
} from "@/lib/site-management-data"
import {
  visibleCommunicationThreadsForRole,
  visibleGuestLifecycleEventsForRole,
  visibleMessageTemplatesForRole,
  visibleNotificationDeliveriesForRole,
  visibleNotificationRulesForRole,
} from "@/lib/role-scoped-views"

export const dynamic = "force-dynamic"

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "communications", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view communication data." },
      { status: 403 }
    )
  }

  return NextResponse.json({
    contractVersion: "phase-11-communications.v1",
    source: "local-demo-contract",
    providerMode: "simulation",
    generatedAt: new Date().toISOString(),
    role: profile.role,
    summary: getCommunicationSummary(),
    threads: visibleCommunicationThreadsForRole(profile.role, communicationThreads),
    lifecycle: visibleGuestLifecycleEventsForRole(profile.role, guestLifecycleEvents),
    rules: visibleNotificationRulesForRole(profile.role, notificationRules),
    deliveries: visibleNotificationDeliveriesForRole(profile.role, notificationDeliveries),
    templates: visibleMessageTemplatesForRole(profile.role, messageTemplates),
    quality: {
      targetPreviewRequired: true,
      consentGate: true,
      retryQueue: true,
      guestLifecycleQueue: true,
      feedbackSuppression: true,
      multilingualTemplates: ["tr", "en", "de", "ru"],
      liveProviderConnected: false,
    },
  })
}
