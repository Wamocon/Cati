"use client"

import { motion, useInView } from "framer-motion"
import { useTranslations } from "next-intl"
import { useRef, useEffect, useState } from "react"

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 2000
    const start = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.floor(eased * value))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [isInView, value])

  return (
    <span ref={ref}>
      {display.toLocaleString("ru-RU")}
      {suffix}
    </span>
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
    <section className="border-y border-white/5 bg-[#0b1021] py-12">
      <div className="container">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl font-black text-white sm:text-4xl">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {t(stat.label)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
