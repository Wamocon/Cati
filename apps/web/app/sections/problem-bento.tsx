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
  FileCheck,
  ShieldX,
  IdCard,
} from "lucide-react"

const icons = {
  leads: MessageCircleWarning,
  admin: Clock,
  tools: Puzzle,
  maintenance: Wrench,
  compliance: ShieldAlert,
  owners: Globe,
  eids: FileCheck,
  fraud: ShieldX,
  permits: IdCard,
}

export function ProblemBento() {
  const t = useTranslations("problems")
  const keys = [
    "leads",
    "admin",
    "tools",
    "maintenance",
    "compliance",
    "owners",
    "eids",
    "fraud",
    "permits",
  ] as const

  return (
    <section id="about" data-testid="problem-bento" className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest text-primary uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            2026 Gerçekliği
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </motion.div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {keys.map((key, index) => {
            const Icon = icons[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 1, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-card-foreground">
                  {t(`${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`${key}.desc`)}
                </p>
                <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-primary/5 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
