"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Building2, TicketCheck, CalendarDays } from "lucide-react"
import { GlassCard } from "@/components/glass-card"
import { ScrollReveal } from "@/components/scroll-reveal"
import { DashboardPreview } from "@/components/dashboard-preview"

const tabs = ["crm", "listings", "tickets", "calendar"] as const

const icons = {
  crm: Users,
  listings: Building2,
  tickets: TicketCheck,
  calendar: CalendarDays,
}

export function PlatformWorkflow() {
  const t = useTranslations("platformWorkflow")
  const [active, setActive] = useState<(typeof tabs)[number]>("crm")
  const data = t.raw(active) as {
    name: string
    columns: string[]
    rows: string[][]
  }
  const Icon = icons[active]

  return (
    <section id="modules" className="relative scroll-mt-24 border-y border-border/50 py-16 md:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-muted/20" />
      <div className="relative z-10 container">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-extrabold tracking-widest text-primary uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("title")}
          </span>
          <p className="mt-5 text-muted-foreground">{t("subtitle")}</p>
        </ScrollReveal>

        <div className="mx-auto mt-10 grid max-w-6xl items-center gap-8 md:mt-12 lg:grid-cols-5">
          {/* Left: interactive table */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <GlassCard glow className="overflow-hidden p-0">
              {/* Mock window chrome */}
              <div className="flex items-center gap-2 border-b border-border/60 bg-muted/50 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-400/80" />
                <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                <span className="ml-4 text-xs font-medium text-muted-foreground">
                  1Çatı, {t("tabs.crm")}
                </span>
              </div>

              <div className="flex flex-col md:flex-row">
                {/* Mock sidebar */}
                <div className="hidden w-48 border-r border-border/60 bg-muted/30 p-3 md:block">
                  {tabs.map((tab) => {
                    const TabIcon = icons[tab]
                    return (
                      <button
                        key={tab}
                        onClick={() => setActive(tab)}
                        className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                          active === tab
                            ? "bg-primary/10 font-semibold text-primary shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <TabIcon className="h-4 w-4" />
                        {t(`tabs.${tab}`)}
                      </button>
                    )
                  })}
                </div>

                {/* Mobile tabs */}
                <div className="flex gap-2 border-b border-border/60 p-3 md:hidden">
                  {tabs.map((tab) => {
                    const TabIcon = icons[tab]
                    return (
                      <button
                        key={tab}
                        onClick={() => setActive(tab)}
                        className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition-colors ${
                          active === tab
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <TabIcon className="h-4 w-4" />
                        {t(`tabs.${tab}`)}
                      </button>
                    )
                  })}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 md:p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={active}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold text-card-foreground">
                          {data.name}
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-border/60">
                              {data.columns.map((col) => (
                                <th
                                  key={col}
                                  className="pr-4 pb-2 font-semibold text-card-foreground"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.rows.map((row, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                              >
                                {row.map((cell, cidx) => (
                                  <td
                                    key={cidx}
                                    className="py-3 pr-4 text-muted-foreground"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Right: dashboard preview visual */}
          <div className="lg:col-span-2">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  )
}
