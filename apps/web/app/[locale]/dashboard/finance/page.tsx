import { redirect } from "next/navigation"
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
    return <OwnerFinanceStatement />
  }

  const { PrivilegedFinanceDashboard } =
    await import("./privileged-finance-dashboard")
  return <PrivilegedFinanceDashboard />
}
