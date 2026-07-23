"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import {
  Clock,
  FileCheck,
  Globe,
  IdCard,
  MessageCircleWarning,
  Puzzle,
  ShieldAlert,
  ShieldX,
  Wrench,
} from "lucide-react"
import { GlassCard } from "@/components/glass-card"
import { ScrollReveal } from "@/components/scroll-reveal"
import { cn } from "@/lib/utils"

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

const flowSteps = ["lead", "unit", "decision", "report"] as const

export function ProblemBento() {
  const t = useTranslations("problems")

  return (
    <section
      id="about"
      data-testid="problem-bento"
      className="relative overflow-hidden bg-[#f8faf9] py-16 md:py-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,107,87,0.10),transparent_28%),radial-gradient(circle_at_82%_64%,rgba(20,184,166,0.10),transparent_32%)]" />
      <div className="relative z-10 container">
        <ScrollReveal className="grid gap-8 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ff6b57]/20 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#c94d3e] shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b57]" />
              {t("sectionBadge")}
            </span>
            <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {t("title")}
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:justify-self-end">
            {t("subtitle")}
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/[0.07]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:38px_38px]" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 380 520" aria-hidden="true">
              <path
                d="M62 86 C180 120 110 238 216 252 C310 264 244 390 326 430"
                fill="none"
                stroke="#ff6b57"
                strokeLinecap="round"
                strokeWidth="6"
                strokeDasharray="12 16"
                opacity="0.75"
              />
            </svg>
            <div className="relative z-10 flex min-h-[470px] flex-col justify-between">
              {flowSteps.map((step, i) => {
                const no = String(i + 1).padStart(2, "0")
                return (
                  <div key={step} className="w-64 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl shadow-slate-900/[0.08] backdrop-blur">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c94d3e]">{no}</p>
                    <p className="mt-2 text-lg font-black text-foreground">{t(`flow.${step}.title`)}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{t(`flow.${step}.text`)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid min-w-0 auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {keys.map((key, index) => {
              const Icon = icons[key]
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04, duration: 0.45 }}
                  className="min-w-0"
                >
                  <GlassCard className="group h-full min-w-0 p-4 sm:p-5" hover>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10 transition-transform group-hover:scale-110">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={cn("h-2 w-12 rounded-full", index % 3 === 0 ? "bg-[#ff6b57]/70" : "bg-teal-500/45")} />
                    </div>
                    <h3 className="text-base font-black text-card-foreground [overflow-wrap:anywhere]">
                      {t(`${key}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                      {t(`${key}.desc`)}
                    </p>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
