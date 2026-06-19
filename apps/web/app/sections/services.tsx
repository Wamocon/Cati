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
    <section id="services" className="border-y border-border bg-muted/30 py-24">
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
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-card-foreground">
                  {t(key)}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
