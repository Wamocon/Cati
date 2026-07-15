import { notFound, redirect } from "next/navigation"
import { PublicReportReviewPanel } from "@/components/public-report-review-panel"
import { getUserProfile } from "@/lib/auth"
import { isPublicReportLocale } from "@/lib/public-report"

export default async function PublicReportsPage({ params }: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isPublicReportLocale(locale)) notFound()
  const profile = await getUserProfile()
  if (!profile) redirect(`/${locale}/login`)
  if (profile.role !== "manager" && profile.role !== "admin") notFound()
  return <PublicReportReviewPanel locale={locale} />
}
