import { redirect } from "next/navigation"
import { ComingSoon } from "@/components/coming-soon"
import { FeatureInfo } from "@/components/feature-info"
import { OwnerFinanceStatement } from "@/components/owner-finance-statement"
import { getUserProfile } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

export default async function FinancePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const profile = await getUserProfile()

  if (!profile || !hasPermission(profile.role, "finance", "view")) {
    redirect(`/${locale}/dashboard`)
  }

  if (profile.role === "owner") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <FeatureInfo featureKey="finance" side="bottom" />
        </div>
        <OwnerFinanceStatement />
      </div>
    )
  }

  const { PrivilegedFinanceDashboard } =
    await import("./privileged-finance-dashboard")
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FeatureInfo featureKey="finance" side="bottom" />
        <ComingSoon featureKey="bank_reconciliation" />
      </div>
      <PrivilegedFinanceDashboard />
    </div>
  )
}
