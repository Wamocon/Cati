import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublicReportForm } from "@/components/public-report-form"
import { isPublicReportLocale } from "@/lib/public-report"

export const metadata: Metadata = {
  title: "1Çatı · Public problem report",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

export default async function PublicReportPage({ params }: {
  params: Promise<{ locale: string; qrToken: string }>
}) {
  const { locale, qrToken } = await params
  if (!isPublicReportLocale(locale) || !/^qr_[A-Za-z0-9_-]{16,100}$/.test(qrToken)) notFound()
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-4 py-10 sm:py-16">
      <PublicReportForm locale={locale} qrToken={qrToken} />
    </main>
  )
}
