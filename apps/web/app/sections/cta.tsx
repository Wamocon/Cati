"use client"

import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import Link from "next/link"

export function CTA() {
  const t = useTranslations("cta")

  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f97316]/10 via-[#050914] to-[#2563eb]/10" />
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 1, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#0b1021]/80 p-8 text-center backdrop-blur-md sm:p-12"
        >
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="bg-[#f97316] px-8 text-base font-bold text-white hover:bg-[#ea580c]"
            >
              {t("primary")}
            </Button>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-background px-8 text-base font-medium text-foreground transition-colors hover:bg-white/5"
            >
              {t("secondary")}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
