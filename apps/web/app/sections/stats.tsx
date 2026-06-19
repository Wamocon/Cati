"use client"

import { motion, useInView } from "framer-motion"
import { useTranslations } from "next-intl"
import { useRef } from "react"

function StatNumber({
  value,
  suffix = "",
}: {
  value: number
  suffix?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.5, scale: 0.95 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="text-3xl font-black text-foreground sm:text-4xl"
    >
      {value.toLocaleString("tr-TR").replace(/\./g, " ")}
      {suffix}
    </motion.div>
  )
}

const stats = [
  { value: 212298, label: "objects" },
  { value: 6000, label: "deals", suffix: "+" },
  { value: 17, label: "experience" },
  { value: 150, label: "employees" },
  { value: 9, label: "languages" },
]

export function Stats() {
  const t = useTranslations("stats")

  return (
    <section
      data-testid="stats"
      className="border-y border-border bg-muted/30 py-12"
    >
      <div className="container">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 1, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <StatNumber value={stat.value} suffix={stat.suffix} />
              <div className="mt-1 text-xs tracking-wider text-muted-foreground uppercase">
                {t(stat.label)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
