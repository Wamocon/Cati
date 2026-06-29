"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/app/navigation"
import { GlassCard } from "@/components/glass-card"
import { ScrollReveal } from "@/components/scroll-reveal"

export function CTA() {
  const t = useTranslations("cta")

  return (
    <section id="contact" className="relative overflow-hidden py-16 md:py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/8" />
      <div className="absolute top-1/2 left-1/2 h-[min(500px,calc(100vw-2rem))] w-[min(500px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />
      <div className="relative z-10 container">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <GlassCard glow className="p-8 sm:p-12">
            <h2 className="text-3xl font-black tracking-tight text-card-foreground sm:text-4xl lg:text-5xl">
              {t("title")}
            </h2>
            <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={`mailto:info@ataberkestate.com?subject=${encodeURIComponent(t("mailSubject"))}`}
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30"
              >
                {t("primary")}
              </a>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background/80 px-8 text-base font-medium text-foreground backdrop-blur-sm transition-all hover:bg-muted"
              >
                {t("secondary")}
              </Link>
            </div>
          </GlassCard>
        </ScrollReveal>
      </div>
    </section>
  )
}
