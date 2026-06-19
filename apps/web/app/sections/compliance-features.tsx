"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { FileCheck, ShieldCheck, IdCard, CircleDollarSign, Bell, QrCode } from "lucide-react"

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
    <section data-testid="compliance-features" className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 1, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#f97316]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
            2026 Compliance
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </motion.div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {keys.map((key, index) => {
            const Icon = icons[key]
            const tag = t(`items.${key}.tag`)
            const isMvp = tag === "MVP"
            return (
              <motion.div
                key={key}
                initial={{ opacity: 1, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1021] p-6 transition-colors hover:border-[#2563eb]/30"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563eb]/10 text-[#3b82f6]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                      isMvp
                        ? "bg-[#22c55e]/10 text-[#22c55e]"
                        : "bg-[#f97316]/10 text-[#f97316]"
                    }`}
                  >
                    {tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`items.${key}.desc`)}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
