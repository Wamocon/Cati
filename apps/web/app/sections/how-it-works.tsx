"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"

export function HowItWorks() {
  const t = useTranslations("howItWorks")
  const steps = [1, 2, 3, 4, 5, 6, 7] as const

  return (
    <section className="border-y border-white/5 bg-[#0b1021] py-24">
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
        </motion.div>

        <div className="mt-14">
          <div className="relative">
            <div className="absolute top-6 left-0 hidden h-0.5 w-full bg-gradient-to-r from-[#f97316] via-[#2563eb] to-[#14b8a6] md:block" />
            <div className="grid gap-8 md:grid-cols-7">
              {steps.map((step, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#050914] text-sm font-black text-[#f97316] ring-2 ring-[#f97316]/30">
                    {step}
                  </div>
                  <p className="mt-4 text-xs font-medium leading-snug text-muted-foreground">
                    {t(`steps.${step}`)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
