"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import {
  Users,
  Building2,
  TicketCheck,
  CalendarDays,
  FolderOpen,
  FileText,
  ShieldCheck,
  Languages,
  FileCheck,
  ClipboardCheck,
  CircleDollarSign,
  CloudOff,
} from "lucide-react"

const icons = {
  crm: Users,
  listings: Building2,
  tickets: TicketCheck,
  calendar: CalendarDays,
  documents: FolderOpen,
  reports: FileText,
  roles: ShieldCheck,
  languages: Languages,
  eids: FileCheck,
  compliance: ClipboardCheck,
  currency: CircleDollarSign,
  offline: CloudOff,
}

export function SolutionGrid() {
  const t = useTranslations("solution")
  const keys = [
    "crm",
    "listings",
    "tickets",
    "calendar",
    "documents",
    "reports",
    "roles",
    "languages",
    "eids",
    "compliance",
    "currency",
    "offline",
  ] as const

  return (
    <section
      data-testid="solution-grid"
      className="border-y border-border bg-muted/30 py-24"
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </motion.div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {keys.map((key, index) => {
            const Icon = icons[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 1, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.03, duration: 0.5 }}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-card-foreground">
                  {t(`items.${key}`)}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
