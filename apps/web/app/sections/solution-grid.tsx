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
import { GlassCard } from "@/components/glass-card"
import { ScrollReveal } from "@/components/scroll-reveal"

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

const spans: Record<string, string> = {
  crm: "sm:col-span-2",
  listings: "sm:col-span-2",
  eids: "sm:col-span-2",
  offline: "sm:col-span-2",
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
    <section data-testid="solution-grid" className="relative border-y border-border/50 py-24">
      <div className="absolute inset-0 bg-muted/20" />
      <div className="container relative z-10">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </ScrollReveal>

        <div className="mt-14 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {keys.map((key, index) => {
            const Icon = icons[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04, duration: 0.5 }}
                className={spans[key] ?? ""}
              >
                <GlassCard className="group h-full p-5" hover>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary shadow-sm transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-card-foreground">{t(`items.${key}`)}</p>
                  <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-primary/5 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
