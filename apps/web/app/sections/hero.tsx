"use client"

import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import {
  Search,
  ChevronDown,
  TrendingUp,
  Users,
  TicketCheck,
  Building2,
} from "lucide-react"
import Link from "next/link"

export function Hero() {
  const t = useTranslations("hero")

  return (
    <section className="relative overflow-hidden bg-background pt-10 pb-16 md:pt-14 md:pb-20">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-primary/5 blur-[140px]" />
        <div className="absolute top-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.02]" />
      </div>

      <div className="relative z-10 container">
        {/* Top copy — centered, readable width */}
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-primary shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            1Çatı — {t("badge")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl leading-[1.1] font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            {t("headline")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            {t("subheadline")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="#services"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] hover:bg-primary/90"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background px-8 text-base font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t("ctaSecondary")}
            </Link>
          </motion.div>
        </div>

        {/* Dashboard preview + search */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mx-auto mt-14 max-w-5xl"
        >
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-primary/5 sm:p-6 dark:shadow-black/40">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
                  1Ç
                </div>
                <span className="font-bold text-card-foreground">
                  1Çatı Panel
                </span>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                Live
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-muted p-4">
                <Building2 className="h-5 w-5 text-primary" />
                <div className="mt-2 text-2xl font-black text-card-foreground">
                  212,298
                </div>
                <div className="text-xs text-muted-foreground">Aktif ilan</div>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <Users className="h-5 w-5 text-accent" />
                <div className="mt-2 text-2xl font-black text-card-foreground">
                  1,247
                </div>
                <div className="text-xs text-muted-foreground">Adaylar</div>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <TicketCheck className="h-5 w-5 text-teal-600" />
                <div className="mt-2 text-2xl font-black text-card-foreground">
                  89
                </div>
                <div className="text-xs text-muted-foreground">Açık talep</div>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <div className="mt-2 text-2xl font-black text-card-foreground">
                  6,000+
                </div>
                <div className="text-xs text-muted-foreground">İşlem</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-xl bg-muted px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  {t("searchCity")}
                </div>
                <div className="mt-1 flex items-center justify-between text-sm font-medium text-foreground">
                  <span>Alanya</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="rounded-xl bg-muted px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  {t("searchType")}
                </div>
                <div className="mt-1 flex items-center justify-between text-sm font-medium text-foreground">
                  <span>{t("typeApartment")}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="rounded-xl bg-muted px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  {t("searchBudget")}
                </div>
                <div className="mt-1 flex items-center justify-between text-sm font-medium text-foreground">
                  <span>{t("budgetValue")}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="rounded-xl bg-muted px-4 py-3 lg:col-span-2">
                <div className="text-xs text-muted-foreground">
                  Son aktivite
                </div>
                <div className="mt-1 truncate text-sm font-medium text-foreground">
                  EİDS yetkilendirmesi onaylandı — Villa #4021
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button className="h-11 bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                <Search className="mr-2 h-4 w-4" />
                {t("ctaPrimary")}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
