import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublicReportTracker } from "@/components/public-report-tracker"
import { isPublicReportLocale } from "@/lib/public-report"

export const metadata: Metadata = {
  title: "1Çatı · Track a public report",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

export default async function PublicReportTrackingPage({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ ref?: string }>
}) {
  const { locale } = await params
  if (!isPublicReportLocale(locale)) notFound()
  // Pre-fill the reference from the receipt link so the user only re-enters the
  // private token. The token is deliberately never carried in the URL.
  const { ref } = await searchParams
  const reference = typeof ref === "string" ? ref.slice(0, 40) : ""
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <PublicReportTracker
        locale={locale}
        initialCredentials={reference ? { reference, trackingToken: "" } : undefined}
      />
    </main>
  )
}
