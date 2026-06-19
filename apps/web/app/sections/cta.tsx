"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Link } from "@/app/navigation"

export function CTA() {
  const t = useTranslations("cta")

  return (
    <section id="contact" className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="relative z-10 container">
        <motion.div
          initial={{ opacity: 1, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-8 text-center shadow-xl sm:p-12"
        >
          <h2 className="text-3xl font-black tracking-tight text-card-foreground sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="mailto:info@wamocon.com?subject=1Çatı Demo Talebi"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("primary")}
            </a>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-8 text-base font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t("secondary")}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
