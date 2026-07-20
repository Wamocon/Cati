import type { Metadata } from "next"
import { resolveDashboardLocale } from "@/lib/unit-matrix-copy"
import { NewLevelImmersion } from "../../sections/new-level-immersion"
import { Footer } from "../../sections/footer"
import { Navbar } from "../../sections/navbar"
import { NlpHero } from "@/components/new-level-premium/nlp-hero"
import { NlpWhy } from "@/components/new-level-premium/nlp-why"
import { NlpAmenities } from "@/components/new-level-premium/nlp-amenities"
import { NlpDesire } from "@/components/new-level-premium/nlp-desire"
import { NlpRegistration } from "@/components/new-level-premium/nlp-registration"
import { NlpAfter } from "@/components/new-level-premium/nlp-after"
import { NlpShare } from "@/components/new-level-premium/nlp-share"
import { NlpReport } from "@/components/new-level-premium/nlp-report"
import { NlpLove } from "@/components/new-level-premium/nlp-love"
import { SiteConcierge } from "@/components/site-concierge"

export const metadata: Metadata = {
  title: "New Level Premium, 1Çatı ERP",
  description:
    "New Level Premium Avsallar on 1Çatı: see why the ERP fits, register for owner/tenant/staff access, and report an issue on the grounds, no account needed.",
}

// Section order follows the AISDALSLove funnel: Attention (hero) · Interest
// (why/pains) · Search (masterplan + amenities to explore) · Desire (premium
// differentiation) · Action (registration) · Like + Loyalty (after you join) ·
// Share (invite + public report) · Love (emotional close).
export default async function NewLevelPremiumPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = resolveDashboardLocale(rawLocale)

  return (
    <>
      <Navbar />
      <div className="h-16" />
      <main id="main" className="relative">
        <NlpHero locale={locale} />
        <NlpWhy locale={locale} />
        <NewLevelImmersion />
        <NlpAmenities locale={locale} />
        <NlpDesire locale={locale} />
        <NlpRegistration />
        <NlpAfter locale={locale} />
        <NlpShare locale={locale} />
        <NlpReport />
        <NlpLove locale={locale} />
      </main>
      <SiteConcierge page="new-level-premium" />
      <Footer />
    </>
  )
}
