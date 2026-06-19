"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import {
  FileCheck,
  ShieldCheck,
  IdCard,
  CircleDollarSign,
  Bell,
  QrCode,
} from "lucide-react"
import { GlassCard } from "@/components/glass-card"
import { ScrollReveal } from "@/components/scroll-reveal"

const icons = {
  eids: FileCheck,
  dueDiligence: ShieldCheck,
  residence: IdCard,
  tax: CircleDollarSign,
  shortTerm: Bell,
  verification: QrCode,
}

export function ComplianceFeatures() {
  const t = useTranslations("compliance")
  const keys = [
    "eids",
    "dueDiligence",
    "residence",
    "tax",
    "shortTerm",
    "verification",
  ] as const

  return (
    <section data-testid="compliance-features" className="relative py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />
      <div className="container relative z-10">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-extrabold tracking-widest text-primary uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            2026 Compliance
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </ScrollReveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {keys.map((key, index) => {
            const Icon = icons[key]
            const tag = t(`items.${key}.tag`)
            const isMvp = tag === "MVP"
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
              >
                <GlassCard className="group h-full p-6" hover>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm transition-transform group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase ${
                        isMvp
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-card-foreground">
                    {t(`items.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`items.${key}.desc`)}
                  </p>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
