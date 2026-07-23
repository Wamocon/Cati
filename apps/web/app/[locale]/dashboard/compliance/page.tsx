import { ComingSoon } from "@/components/coming-soon"
import { ComplianceLiveCockpit } from "@/components/compliance-live-cockpit"
import { FeatureInfo } from "@/components/feature-info"

export default function CompliancePage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FeatureInfo featureKey="compliance" side="bottom" />
        <ComingSoon featureKey="access_control" />
      </div>
      <ComplianceLiveCockpit />
    </div>
  )
}
