"use client"

import { useLocale, useTranslations } from "next-intl"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Bell,
  CircleDollarSign,
  FileCheck,
  IdCard,
  QrCode,
  ShieldCheck,
} from "lucide-react"
import { GlassCard } from "@/components/glass-card"
import { ScrollReveal } from "@/components/scroll-reveal"

type LocaleKey = "tr" | "en" | "de" | "ru"

const icons = {
  eids: FileCheck,
  dueDiligence: ShieldCheck,
  residence: IdCard,
  tax: CircleDollarSign,
  shortTerm: Bell,
  verification: QrCode,
}

const mapCopy = {
  tr: {
    label: "Turkiye kontrol akisi",
    title: "Uyumluluk bir etiket degil, karar kapisidir.",
    text:
      "EIDS, tapu inceleme, oturum uygunlugu, vergi riski ve kiralama bildirimi; ilan, servis veya teslim ilerlemeden once ayni onay kuyruguna baglanir.",
    lanes: [
      ["EIDS", "Malik yetkisi"],
      ["TAPU", "Belge kontrolu"],
      ["KBS/e-GUEST", "Kiralama bildirimi"],
    ],
  },
  en: {
    label: "Turkey operating checks",
    title: "Compliance is a decision path, not a badge list.",
    text:
      "EIDS, title deed review, residence eligibility, tax exposure and rental reporting feed the same approval queue before a listing, service or handover moves forward.",
    lanes: [
      ["EIDS", "Owner authorization"],
      ["TAPU", "Document review"],
      ["KBS/e-GUEST", "Rental reporting"],
    ],
  },
  de: {
    label: "Tuerkei Kontrollfluss",
    title: "Compliance ist ein Entscheidungsweg, keine Statusplakette.",
    text:
      "EIDS, Grundbuchpruefung, Aufenthaltspruefung, Steuer- und Mietmeldungen laufen in dieselbe Freigabe.",
    lanes: [
      ["EIDS", "Eigentuemerfreigabe"],
      ["TAPU", "Dokumentenpruefung"],
      ["KBS/e-GUEST", "Mietmeldung"],
    ],
  },
  ru: {
    label: "Turkey operating checks",
    title: "Compliance is a decision path, not a badge list.",
    text:
      "EIDS, title deed review, residence eligibility, tax exposure and rental reporting feed one approval queue.",
    lanes: [
      ["EIDS", "Owner authorization"],
      ["TAPU", "Document review"],
      ["KBS/e-GUEST", "Rental reporting"],
    ],
  },
} satisfies Record<
  LocaleKey,
  { label: string; title: string; text: string; lanes: Array<[string, string]> }
>

export function ComplianceFeatures() {
  const t = useTranslations("compliance")
  const locale = useLocale()
  const map = mapCopy[(locale as LocaleKey) in mapCopy ? (locale as LocaleKey) : "tr"]
  const keys = [
    "eids",
    "dueDiligence",
    "residence",
    "tax",
    "shortTerm",
    "verification",
  ] as const

  return (
    <section
      data-testid="compliance-features"
      className="relative overflow-hidden py-16 md:py-24"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.025] to-background" />
      <div className="relative z-10 container">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-extrabold tracking-widest text-primary uppercase shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("sectionBadge")}
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </ScrollReveal>

        <div className="mx-auto mt-10 max-w-6xl rounded-[2rem] border border-border bg-card p-4 shadow-2xl shadow-black/[0.05] md:mt-14 md:p-6">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="rounded-[1.5rem] border border-border bg-[#f8faf9] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                {map.label}
              </p>
              <h3 className="mt-4 text-2xl font-black leading-tight text-card-foreground">
                {map.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {map.text}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {map.lanes.map(([title, text], index) => (
                <div key={title} className="relative rounded-2xl border border-border bg-background p-4">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {index === 0 ? <FileCheck className="h-5 w-5" /> : index === 1 ? <ShieldCheck className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}
                    </span>
                    {index < 2 && <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />}
                  </div>
                  <p className="text-sm font-black text-card-foreground">{title}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {keys.map((key, index) => {
            const Icon = icons[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 1, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                className="min-w-0"
              >
                <GlassCard className="group h-full min-w-0 p-4 sm:p-6" hover>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-card-foreground [overflow-wrap:anywhere]">
                    {t(`items.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                    {t(`items.${key}.desc`)}
                  </p>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
