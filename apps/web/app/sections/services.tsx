"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import {
  Home,
  ArrowLeftRight,
  KeyRound,
  Scale,
  IdCard,
  Headset,
  Plane,
  Video,
  ClipboardCheck,
  CircleDollarSign,
  Smartphone,
} from "lucide-react"
import { GlassCard } from "@/components/glass-card"
import { ScrollReveal } from "@/components/scroll-reveal"

const icons = {
  buy: Home,
  sell: ArrowLeftRight,
  rent: KeyRound,
  legal: Scale,
  citizenship: IdCard,
  aftersales: Headset,
  tour: Plane,
  online: Video,
  compliance: ClipboardCheck,
  tax: CircleDollarSign,
  offline: Smartphone,
}

const spans: Record<string, string> = {
  buy: "sm:col-span-2",
  aftersales: "sm:col-span-2",
}

export function Services() {
  const t = useTranslations("services")
  const keys = [
    "buy",
    "sell",
    "rent",
    "legal",
    "citizenship",
    "aftersales",
    "tour",
    "online",
    "compliance",
    "tax",
    "offline",
  ] as const

  return (
    <section id="services" className="relative border-y border-border/50 py-24">
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
                transition={{ delay: index * 0.03, duration: 0.5 }}
                className={spans[key] ?? ""}
              >
                <GlassCard className="group flex h-full items-center gap-4 p-4" hover>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-card-foreground">{t(key)}</span>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
