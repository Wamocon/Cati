"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Building2, TicketCheck, CalendarDays } from "lucide-react"

const tabs = ["crm", "listings", "tickets", "calendar"] as const

const icons = {
  crm: Users,
  listings: Building2,
  tickets: TicketCheck,
  calendar: CalendarDays,
}

export function PlatformDemo() {
  const t = useTranslations("platformDemo")
  const [active, setActive] = useState<(typeof tabs)[number]>("crm")
  const data = t.raw(active) as {
    name: string
    columns: string[]
    rows: string[][]
  }
  const Icon = icons[active]

  return (
    <section className="border-y border-border bg-muted/30 py-24">
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
            {t("title")}
          </span>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 1, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        >
          {/* Mock window chrome */}
          <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <div className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-4 text-xs font-medium text-muted-foreground">
              1Çatı — {t("tabs.crm")}
            </span>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* Mock sidebar */}
            <div className="hidden w-48 border-r border-border bg-muted/50 p-4 md:block">
              {tabs.map((tab) => {
                const TabIcon = icons[tab]
                return (
                  <button
                    key={tab}
                    onClick={() => setActive(tab)}
                    className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active === tab
                        ? "bg-primary/10 font-semibold text-primary"
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
            <div className="flex gap-2 border-b border-border p-3 md:hidden">
              {tabs.map((tab) => {
                const TabIcon = icons[tab]
                return (
                  <button
                    key={tab}
                    onClick={() => setActive(tab)}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors ${
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
                  initial={{ opacity: 1, x: 10 }}
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
                        <tr className="border-b border-border">
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
                            className="border-b border-border last:border-0"
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
        </motion.div>
      </div>
    </section>
  )
}
