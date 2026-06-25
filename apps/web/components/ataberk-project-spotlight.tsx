"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, Building, CheckCircle2, Sparkles } from "lucide-react"
import {
  clientKpis,
  clientProfile,
  clientServicePillars,
  clientVisualAnchors,
  clientWorkflow,
} from "@/lib/client-context"
import { cn } from "@/lib/utils"

export function AtaberkProjectSpotlight({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={cn(
        "ataberk-spotlight relative overflow-hidden rounded-xl border border-white/10 bg-[#07110f] text-white shadow-[0_24px_80px_rgba(3,18,16,0.24)]",
        compact ? "p-4 md:p-5" : "p-5 md:p-6"
      )}
      aria-label="Ataberk Estate client project spotlight"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(42,219,185,0.22),transparent_32%),radial-gradient(circle_at_80%_8%,rgba(216,168,76,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.08))]" />
      <div className="absolute right-6 top-8 hidden h-52 w-52 rounded-full border border-white/10 lg:block" />
      <div className="absolute right-16 top-20 hidden h-28 w-28 rounded-full border border-amber-300/20 lg:block" />

      <div className="relative z-10 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold uppercase text-emerald-100">
              <Sparkles className="h-3.5 w-3.5" />
              Client pilot
            </span>
            {clientVisualAnchors.map((anchor) => (
              <span
                key={anchor.label}
                className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[11px] font-semibold text-white/[0.72]"
              >
                {anchor.label}: <span className="text-white">{anchor.value}</span>
              </span>
            ))}
          </div>

          <div className="mt-5 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-100/80">
              {clientProfile.clientName} / {clientProfile.pilotLocation}
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-black leading-tight text-white md:text-4xl">
              {clientProfile.pilotProject} als erstes Premium-Projekt im {clientProfile.productName}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/[0.68] md:text-base">
              {clientProfile.sourceNote}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {clientKpis.map((kpi, index) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-white/10 bg-white/[0.075] p-3 backdrop-blur-xl"
              >
                <p className="text-[11px] font-bold uppercase text-white/50">{kpi.label}</p>
                <p className="mt-1 text-2xl font-black text-white">{kpi.value}</p>
                <p className="mt-1 text-[11px] leading-4 text-white/[0.58]">{kpi.note}</p>
              </motion.div>
            ))}
          </div>

          {!compact && (
            <div className="mt-5 grid gap-2 md:grid-cols-2">
              {clientServicePillars.slice(0, 4).map((pillar) => (
                <div key={pillar.title} className="flex gap-3 rounded-xl border border-white/10 bg-black/[0.12] p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-amber-100">
                    <pillar.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{pillar.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-white/[0.58]">{pillar.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative min-h-[390px] overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:38px_38px]" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Sales journey</p>
              <h3 className="mt-1 text-lg font-black text-white">Avsallar command flow</h3>
            </div>
            <a
              href={clientProfile.publicWebsite}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white transition hover:bg-white/[0.16]"
              aria-label="Open Ataberk Estate website"
            >
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="relative z-10 mt-5 space-y-3">
            {clientWorkflow.map((step) => (
              <div
                key={step.label}
                className="group relative rounded-xl border border-white/10 bg-[#07110f]/70 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-300/10 text-emerald-100 ring-1 ring-emerald-200/15">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black text-amber-100">{step.label}</span>
                      <h4 className="text-sm font-bold text-white">{step.title}</h4>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-white/[0.58]">{step.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <motion.div
            aria-hidden="true"
            animate={{ y: [0, -8, 0], rotate: [0, 1.2, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-5 right-5 hidden w-44 rounded-xl border border-amber-200/20 bg-amber-200/10 p-3 text-amber-50 shadow-[0_18px_60px_rgba(216,168,76,0.22)] lg:block"
          >
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="text-xs font-black">New Level Premium</span>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1">
              {Array.from({ length: 20 }).map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-3 rounded-[3px] bg-white/[0.18]",
                    index % 4 === 0 && "bg-emerald-200/60",
                    index % 7 === 0 && "bg-amber-200/70"
                  )}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-amber-50/[0.78]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              5-Sterne-Projekt / Avsallar
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
