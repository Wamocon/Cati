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
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { KineticHeadline } from "@/components/kinetic-headline"
import { BuildingIllustration } from "@/components/building-illustration"
import { GlassCard } from "@/components/glass-card"
import { cn } from "@/lib/utils"

export function Hero() {
  const t = useTranslations("hero")

  const stats = [
    {
      icon: Building2,
      value: "212,298",
      labelKey: "activeListings",
      color: "text-primary",
    },
    { icon: Users, value: "1,247", labelKey: "leads", color: "text-accent" },
    {
      icon: TicketCheck,
      value: "89",
      labelKey: "openTickets",
      color: "text-teal-600",
    },
    {
      icon: TrendingUp,
      value: "6,000+",
      labelKey: "transactions",
      color: "text-emerald-600",
    },
  ]

  return (
    <section className="relative min-h-screen overflow-hidden bg-background pt-28 pb-16 md:pt-36 md:pb-24">
      {/* Aurora ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] left-1/2 h-[800px] w-[900px] -translate-x-1/2 rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute top-[5%] -right-[5%] h-[600px] w-[600px] rounded-full bg-accent/6 blur-[100px]" />
        <div className="absolute bottom-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[90px]" />
      </div>

      <div className="relative z-10 container">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          {/* Left copy */}
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              1Çatı — {t("badge")}
            </motion.div>

            <KineticHeadline
              text={t("headline")}
              className="text-4xl leading-[1.05] font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl"
            />

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
            >
              {t("subheadline")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 flex flex-col items-start gap-3 sm:flex-row"
            >
              <Link
                href="#services"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90 hover:shadow-primary/30"
              >
                {t("ctaPrimary")}
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background/80 px-8 text-base font-medium text-foreground backdrop-blur-sm transition-all hover:bg-muted"
              >
                {t("ctaSecondary")}
              </Link>
            </motion.div>

            {/* Quick stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {stats.map((stat, index) => (
                <GlassCard key={index} className="p-4" hover>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                  <div className="mt-2 text-xl font-black text-card-foreground">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(`statLabels.${stat.labelKey}`)}
                  </div>
                </GlassCard>
              ))}
            </motion.div>
          </div>

          {/* Right building illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden h-[420px] lg:block lg:h-[520px]"
          >
            <BuildingIllustration className="h-full w-full" />

            {/* Floating badge */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 -right-4 rounded-2xl border border-border/60 bg-background/90 p-4 shadow-xl backdrop-blur-md dark:bg-card/80"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-card-foreground">
                    +24%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("badgeReturn")}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute bottom-16 -left-4 rounded-2xl border border-border/60 bg-background/90 p-4 shadow-xl backdrop-blur-md dark:bg-card/80"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-card-foreground">
                    212,298+
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("badgeListings")}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <GlassCard glow className="p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
                  1Ç
                </div>
                <span className="font-bold text-card-foreground">
                  {t("previewTitle")}
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 uppercase">
                {t("previewStatus")}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-xl bg-muted/70 px-4 py-3 dark:bg-muted/40">
                <div className="text-xs text-muted-foreground">
                  {t("searchCity")}
                </div>
                <div className="mt-1 flex items-center justify-between text-sm font-medium text-foreground">
                  <span>Alanya</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="rounded-xl bg-muted/70 px-4 py-3 dark:bg-muted/40">
                <div className="text-xs text-muted-foreground">
                  {t("searchType")}
                </div>
                <div className="mt-1 flex items-center justify-between text-sm font-medium text-foreground">
                  <span>{t("typeApartment")}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="rounded-xl bg-muted/70 px-4 py-3 dark:bg-muted/40">
                <div className="text-xs text-muted-foreground">
                  {t("searchBudget")}
                </div>
                <div className="mt-1 flex items-center justify-between text-sm font-medium text-foreground">
                  <span>{t("budgetValue")}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="rounded-xl bg-muted/70 px-4 py-3 sm:col-span-3 lg:col-span-2 dark:bg-muted/40">
                <div className="text-xs text-muted-foreground">
                  {t("previewActivityLabel")}
                </div>
                <div className="mt-1 truncate text-sm font-medium text-foreground">
                  {t("previewActivityText")}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                <Search className="mr-2 h-4 w-4" />
                {t("ctaPrimary")}
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  )
}
