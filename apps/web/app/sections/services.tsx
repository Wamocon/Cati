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
  ] as const

  return (
    <section id="services" className="py-24">
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

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {keys.map((key, index) => {
            const Icon = icons[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#0b1021] p-4 transition-colors hover:border-white/20"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#f97316]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-white">
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
