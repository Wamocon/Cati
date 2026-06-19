"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import {
  MessageCircleWarning,
  Clock,
  Puzzle,
  Wrench,
  ShieldAlert,
  Globe,
} from "lucide-react"

const icons = {
  leads: MessageCircleWarning,
  admin: Clock,
  tools: Puzzle,
  maintenance: Wrench,
  compliance: ShieldAlert,
  owners: Globe,
}

export function ProblemBento() {
  const t = useTranslations("problems")
  const keys = ["leads", "admin", "tools", "maintenance", "compliance", "owners"] as const

  return (
    <section id="about" className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </motion.div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {keys.map((key, index) => {
            const Icon = icons[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1021] p-6 transition-colors hover:border-[#f97316]/30"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#f97316]/10 text-[#f97316]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {t(`${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`${key}.desc`)}
                </p>
                <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-[#f97316]/5 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
