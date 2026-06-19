"use client"

import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Search, ChevronDown } from "lucide-react"

export function Hero() {
  const t = useTranslations("hero")

  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden pt-12 pb-20">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[#050914]" />
      <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-[#f97316]/10 blur-[120px]" />
      <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-[#2563eb]/10 blur-[120px]" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />

      <div className="container relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-[#f97316] backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f97316] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f97316]" />
          </span>
          1Çatı — yeni emlak yönetim platformu
        </motion.div>

        <motion.h1
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="max-w-4xl text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          {t("headline")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
        >
          {t("subheadline")}
        </motion.p>

        <motion.div
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <Button
            size="lg"
            className="bg-[#f97316] px-8 text-base font-bold text-white hover:bg-[#ea580c]"
          >
            {t("ctaPrimary")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/10 px-8 text-base hover:bg-white/5"
          >
            {t("ctaSecondary")}
          </Button>
        </motion.div>

        {/* Search widget mockup */}
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 w-full max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-6"
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white/5 px-4 py-3 text-left">
              <div className="text-xs text-muted-foreground">Şehir</div>
              <div className="mt-1 flex items-center justify-between text-sm font-medium">
                <span>Alanya</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="rounded-xl bg-white/5 px-4 py-3 text-left">
              <div className="text-xs text-muted-foreground">Tip</div>
              <div className="mt-1 flex items-center justify-between text-sm font-medium">
                <span>Daire</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="rounded-xl bg-white/5 px-4 py-3 text-left">
              <div className="text-xs text-muted-foreground">Bütçe</div>
              <div className="mt-1 flex items-center justify-between text-sm font-medium">
                <span>100.000 €'ye kadar</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Button className="h-auto bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
              <Search className="mr-2 h-4 w-4" />
              Ara
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
