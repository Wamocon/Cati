"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/glass-card"
import { ScrollReveal } from "@/components/scroll-reveal"

export function HowItWorks() {
  const t = useTranslations("howItWorks")
  const steps = [1, 2, 3, 4, 5, 6, 7] as const

  return (
    <section id="how-it-works" className="relative py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="container relative z-10">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
        </ScrollReveal>

        <div className="mt-14">
          <div className="relative">
            <div className="absolute top-7 left-0 hidden h-0.5 w-full bg-gradient-to-r from-primary via-accent to-teal-500 md:block" />
            <div className="grid gap-6 md:grid-cols-7">
              {steps.map((step, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, duration: 0.5 }}
                  className="relative text-center"
                >
                  <GlassCard className="mx-auto flex h-14 w-14 items-center justify-center rounded-full p-0 text-base font-black text-primary shadow-lg shadow-primary/10">
                    {step}
                  </GlassCard>
                  <p className="mt-4 text-xs leading-snug font-semibold text-muted-foreground">
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
