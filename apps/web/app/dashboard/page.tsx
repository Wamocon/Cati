"use client"

import { Button } from "@/components/ui/button"
import {
  Building2,
  Users,
  TicketCheck,
  CalendarDays,
  LogOut,
} from "lucide-react"
import Link from "next/link"

const menu = [
  { label: "Объекты", icon: Building2, href: "#" },
  { label: "Лиды", icon: Users, href: "#" },
  { label: "Заявки", icon: TicketCheck, href: "#" },
  { label: "Календарь", icon: CalendarDays, href: "#" },
]

export default function DashboardPage() {
  return (
    <div className="flex min-h-svh bg-[#050914]">
      <aside className="w-64 border-r border-white/10 bg-[#0b1021] p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f97316] to-[#ea580c] text-sm font-black text-white">
            1Ç
          </div>
          <span className="text-lg font-bold text-white">1Çatı</span>
        </Link>

        <nav className="mt-8 space-y-2">
          {menu.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-black text-white">Панель управления</h1>
        <p className="mt-2 text-muted-foreground">
          Здесь будет CRM-дашборд, подключённый к Twenty и Supabase.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Активные объекты", value: "0" },
            { label: "Открытые лиды", value: "0" },
            { label: "Заявки на ремонт", value: "0" },
            { label: "Сделки в работе", value: "0" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-white/10 bg-[#0b1021] p-5"
            >
              <div className="text-2xl font-black text-white">{card.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {card.label}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
