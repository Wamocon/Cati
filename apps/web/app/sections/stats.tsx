"use client"

import { motion, useInView, useSpring, useTransform } from "framer-motion"
import { useTranslations, useLocale } from "next-intl"
import { useRef, useEffect } from "react"
import { GlassCard } from "@/components/glass-card"

function StatNumber({
  value,
  suffix = "",
}: {
  value: number
  suffix?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const spring = useSpring(0, { duration: 2500, bounce: 0 })
  const locale = useLocale()
  const display = useTransform(spring, (current) =>
    Math.floor(current)
      .toLocaleString(
        locale === "ru"
          ? "ru-RU"
          : locale === "de"
            ? "de-DE"
            : locale === "en"
              ? "en-US"
              : "tr-TR"
      )
      .replace(/\./g, " ")
  )

  useEffect(() => {
    if (isInView) {
      spring.set(value)
    }
  }, [isInView, spring, value])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="text-3xl font-black text-foreground sm:text-4xl"
    >
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.div>
  )
}

const stats = [
  { value: 212298, label: "objects" },
  { value: 6000, label: "deals", suffix: "+" },
  { value: 12, label: "experience" },
  { value: 150, label: "employees" },
  { value: 4, label: "languages" },
]

export function Stats() {
  const t = useTranslations("stats")

  return (
    <section data-testid="stats" className="relative py-12 md:py-16">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30" />
      <div className="relative z-10 container">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
            >
              <GlassCard
                className="flex flex-col items-center justify-center py-6 text-center"
                hover
              >
                <StatNumber value={stat.value} suffix={stat.suffix} />
                <div className="mt-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {t(stat.label)}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
