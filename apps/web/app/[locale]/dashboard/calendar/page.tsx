"use client"

import { useTranslations } from "next-intl"
import { CalendarDays, Clock, MapPin } from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"

const events = [
  { time: "09:00", title: "Villa turu — Anna K.", location: "Kargıcak", type: "viewing" },
  { time: "10:30", title: "EİDS yetki görüşmesi", location: "Alanya Tapu", type: "task" },
  { time: "12:00", title: "Satış müzakere — Sergey P.", location: "Ofis", type: "meeting" },
  { time: "14:00", title: "Tapu randevusu", location: "Alanya Tapu", type: "task" },
  { time: "15:30", title: "Bakım kontrolü — Daire #1847", location: "Mahmutlar", type: "maintenance" },
  { time: "17:00", title: "Günlük ekip toplantısı", location: "Zoom", type: "meeting" },
]

const upcomingDays = [1, 2, 3].map((offset) => {
  const date = new Date("2026-06-23T09:00:00+03:00")
  date.setDate(date.getDate() + offset)
  return {
    offset,
    day: date.getDate(),
    month: date.toLocaleString("tr-TR", { month: "short" }),
  }
})

export default function CalendarPage() {
  const t = useTranslations("dashboardModules.calendar")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card3D className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-card-foreground">{t("today")}</h3>
            <StatusBadge variant="accent">{events.length} {t("events")}</StatusBadge>
          </div>
          <div className="space-y-3">
            {events.map((e, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{e.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> {e.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {e.location}
                      </span>
                    </div>
                  </div>
                </div>
                <StatusBadge
                  variant={e.type === "viewing" ? "success" : e.type === "meeting" ? "info" : e.type === "maintenance" ? "warning" : "neutral"}
                >
                  {t(`types.${e.type}`)}
                </StatusBadge>
              </div>
            ))}
          </div>
        </Card3D>

        <Card3D>
          <h3 className="mb-4 font-bold text-card-foreground">{t("upcoming")}</h3>
          <div className="space-y-4">
            {upcomingDays.map((d) => (
              <div key={d.offset} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">
                  <span>{d.day}</span>
                  <span className="text-[9px] uppercase text-muted-foreground">
                    {d.month}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{d.offset === 1 ? t("upcoming1") : d.offset === 2 ? t("upcoming2") : t("upcoming3")}</p>
                  <p className="text-xs text-muted-foreground">{d.offset === 1 ? "10:00 — Kargıcak" : d.offset === 2 ? "14:00 — Mahmutlar" : "11:00 — Ofis"}</p>
                </div>
              </div>
            ))}
          </div>
        </Card3D>
      </div>
    </div>
  )
}
