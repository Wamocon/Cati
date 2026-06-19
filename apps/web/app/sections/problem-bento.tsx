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
import { GlassCard } from "@/components/glass-card"
import { ScrollReveal } from "@/components/scroll-reveal"

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

const spans: Record<string, string> = {
  leads: "sm:col-span-2",
  compliance: "sm:col-span-2",
  permits: "sm:col-span-2",
}

export function ProblemBento() {
  const t = useTranslations("problems")
  const keys = [
    "leads",
    "admin",
    "tools",
    "compliance",
    "maintenance",
    "owners",
    "eids",
    "fraud",
    "permits",
  ] as const

  return (
    <section id="about" data-testid="problem-bento" className="relative py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="container relative z-10">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-extrabold tracking-widest text-primary uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            2026 Gerçekliği
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </ScrollReveal>

        <div className="mt-14 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {keys.map((key, index) => {
            const Icon = icons[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                className={spans[key] ?? ""}
              >
                <GlassCard className="group h-full p-6" hover>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10 transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-card-foreground">{t(`${key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`${key}.desc`)}
                  </p>
                  <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-primary/5 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
