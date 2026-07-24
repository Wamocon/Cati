"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { CalendarDays, CalendarSync, KeyRound } from "lucide-react"
import { useLocale } from "next-intl"
import { FeatureInfo } from "@/components/feature-info"
import { BookingLifecycleExperience } from "./booking-lifecycle-experience"
import { CalendarInteroperability } from "./calendar-interoperability"
import { MoveHandoverExperience } from "./move-handover-experience"

type Tab = "booking" | "handover" | "sharing"

const copy = {
  tr: { title: "Takvim ve rezervasyon", intro: "Rezervasyonları, taşınma ve teslim adımlarını ve takvim paylaşımını tek bir yerden takip edin.", booking: "Rezervasyon", handover: "Taşınma ve teslim", sharing: "Takvim paylaşımı", nav: "Sakin yolculuğu bölümleri" },
  en: { title: "Calendar and booking", intro: "Follow bookings, the move-in and handover steps, and calendar sharing all in one place.", booking: "Booking", handover: "Move and handover", sharing: "Calendar sharing", nav: "Resident journey sections" },
  de: { title: "Kalender und Buchung", intro: "Verfolgen Sie Buchungen, die Schritte für Einzug und Übergabe sowie die Kalenderfreigabe an einem Ort.", booking: "Buchung", handover: "Einzug und Übergabe", sharing: "Kalenderfreigabe", nav: "Bereiche der Bewohnerreise" },
  ru: { title: "Календарь и бронирование", intro: "Следите за бронированиями, шагами заезда и передачи, а также общим календарём в одном месте.", booking: "Бронирование", handover: "Заезд и передача", sharing: "Общий календарь", nav: "Разделы пути жителя" },
} as const

function localeOf(value: string): keyof typeof copy { return value === "tr" || value === "de" || value === "ru" ? value : "en" }
function tabFromHash(): Tab { const value = window.location.hash.slice(1); return value === "handover" || value === "sharing" ? value : "booking" }

export function ResidentJourneyTabs() {
  const t = copy[localeOf(useLocale())]
  const [tab, setTab] = useState<Tab>("booking")
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    booking: null,
    handover: null,
    sharing: null,
  })
  useEffect(() => { const sync = () => setTab(tabFromHash()); sync(); window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync) }, [])
  const select = (next: Tab) => { setTab(next); window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${next}`) }
  const tabs = [{ id: "booking" as const, label: t.booking, icon: CalendarDays }, { id: "handover" as const, label: t.handover, icon: KeyRound }, { id: "sharing" as const, label: t.sharing, icon: CalendarSync }]
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: Tab) => {
    const currentIndex = tabs.findIndex((item) => item.id === current)
    let nextIndex: number | null = null
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = tabs.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    const next = tabs[nextIndex].id
    select(next)
    tabRefs.current[next]?.focus()
  }

  return <div className="space-y-6"><div className="space-y-1"><div className="flex items-center gap-2"><h2 className="text-lg font-black text-foreground">{t.title}</h2><FeatureInfo featureKey="calendar" side="bottom" /></div><p className="max-w-3xl text-sm text-muted-foreground">{t.intro}</p></div><div role="tablist" aria-label={t.nav} aria-orientation="horizontal" className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-muted/30 p-2 sm:grid-cols-3">{tabs.map((item) => <button ref={(node) => { tabRefs.current[item.id] = node }} key={item.id} id={`resident-tab-${item.id}`} type="button" role="tab" aria-selected={tab === item.id} aria-controls={`resident-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onClick={() => select(item.id)} onKeyDown={(event) => handleKeyDown(event, item.id)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tab === item.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/70"}`}><item.icon className="h-4 w-4" aria-hidden="true" />{item.label}</button>)}</div><section id={`resident-panel-${tab}`} role="tabpanel" aria-labelledby={`resident-tab-${tab}`}>{tab === "booking" ? <BookingLifecycleExperience /> : tab === "handover" ? <MoveHandoverExperience /> : <CalendarInteroperability />}</section></div>
}
