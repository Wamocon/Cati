"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { useEffect, useRef } from "react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import {
  ArrowDownRight,
  Building2,
  LayoutDashboard,
  Map,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { KineticHeadline } from "@/components/kinetic-headline"
import { localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"

export function Hero() {
  const t = useTranslations("hero")
  const locale = useLocale()
  const dashboardLocale = resolveDashboardLocale(locale)
  const rootRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    let cleanup: (() => void) | undefined

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ])
      gsap.registerPlugin(ScrollTrigger)

      const intro = gsap.timeline({ defaults: { ease: "power3.out" } })
      intro
        .fromTo(imageRef.current, { scale: 1.1, autoAlpha: 0.65 }, { scale: 1, autoAlpha: 1, duration: 1.1 })
        .fromTo(panelRef.current, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, "-=0.55")

      const scrub = gsap.to(imageRef.current, {
        yPercent: 8,
        scale: 1.06,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      })

      cleanup = () => {
        intro.kill()
        scrub.scrollTrigger?.kill()
        scrub.kill()
      }
    })().catch(() => undefined)

    return () => cleanup?.()
  }, [])

  return (
    <section
      ref={rootRef}
      className="relative min-h-[calc(100svh-104px)] overflow-hidden bg-[#061a17] text-white"
    >
      <div ref={imageRef} className="absolute inset-0">
        <Image
          src="/new-level-premium/resort-exterior.jpg"
          alt="New Level Premium Avsallar resort residence and shared facilities"
          fill
          sizes="100vw"
          preload
          className="object-cover"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,16,14,0.9)_0%,rgba(3,16,14,0.67)_39%,rgba(3,16,14,0.28)_72%,rgba(3,16,14,0.2)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,rgba(50,214,189,0.28),transparent_30%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:auto,72px_72px,72px_72px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

      <div className="relative z-10 container">
        <div className="flex min-h-[calc(100svh-104px)] flex-col justify-center gap-10 py-16 md:py-24">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-xs font-black tracking-[0.08em] text-emerald-50 shadow-sm backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
              1Cati ERP - {t("badge")}
            </motion.div>

            <KineticHeadline
              text={t("headline")}
              className="max-w-4xl text-4xl leading-[0.98] font-black tracking-tight break-words hyphens-auto text-white drop-shadow-[0_10px_34px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-7xl xl:text-8xl"
            />

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 max-w-2xl text-lg leading-8 text-white/78"
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
                href="#platform"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-black text-[#061a17] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                <LayoutDashboard className="h-4 w-4" />
                {t("ctaPrimary")}
              </Link>
              <Link
                href={`/${locale}/login`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/12 px-8 text-base font-bold text-white shadow-sm backdrop-blur transition hover:bg-white/18"
              >
                <ShieldCheck className="h-4 w-4" />
                {t("ctaSecondary")}
              </Link>
            </motion.div>

          </div>

          <div
            ref={panelRef}
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_320px] lg:items-end"
          >
            <div className="grid gap-3 text-xs text-white/74 sm:grid-cols-3">
              {[
                { title: t("previewTitle"), text: t("previewActivityText"), icon: LayoutDashboard },
                { title: t("badgeReturnValue"), text: t("badgeReturn"), icon: TrendingUp },
                { title: t("badgeListingsValue"), text: t("badgeListings"), icon: Building2 },
              ].map(({ title, text, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-white/14 bg-[#061a17]/44 px-4 py-3 shadow-xl shadow-black/15 backdrop-blur-xl">
                  <Icon className="mb-3 h-4 w-4 text-emerald-200" />
                  <span className="font-black text-white">{title}</span>
                  <p className="mt-1 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <Link
              href="#new-level"
              className="group relative hidden min-h-40 overflow-hidden rounded-3xl border border-white/16 bg-white/12 p-4 text-white shadow-2xl shadow-black/25 backdrop-blur-xl md:block"
            >
              <Image
                src="/new-level-premium/masterplan-aerial.jpg"
                alt="New Level Premium site masterplan preview"
                fill
                sizes="320px"
                className="object-cover opacity-55 transition duration-500 group-hover:scale-105 group-hover:opacity-72"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061a17] via-[#061a17]/42 to-transparent" />
              <div className="relative z-10 flex h-full min-h-32 flex-col justify-end">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/14 backdrop-blur">
                  <Map className="h-4 w-4" />
                </div>
                <p className="text-sm font-black">New Level Premium</p>
                <p className="mt-1 text-xs text-white/70">{localizeBusinessCopy("Avsallar master plandan operasyon kaydına", dashboardLocale)}</p>
                <ArrowDownRight className="absolute right-1 bottom-1 h-5 w-5 transition group-hover:translate-x-1 group-hover:translate-y-1" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
