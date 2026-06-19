"use client"

import {
  Building2,
  Users,
  TicketCheck,
  CalendarDays,
  LogOut,
} from "lucide-react"
import Link from "next/link"

const menu = [
  { label: "İlanlar", icon: Building2, href: "#" },
  { label: "Müşteri Adayları", icon: Users, href: "#" },
  { label: "Talepler", icon: TicketCheck, href: "#" },
  { label: "Takvim", icon: CalendarDays, href: "#" },
]

export default function DashboardPage() {
  return (
    <div className="flex min-h-svh bg-[#050914]">
      <aside className="relative w-64 border-r border-white/10 bg-[#0b1021] p-6">
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
          <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white">
            <LogOut className="h-4 w-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-black text-white">Kontrol Paneli</h1>
        <p className="mt-2 text-muted-foreground">
          Burası Twenty ve Supabase'e bağlı CRM panosu olacak.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Aktif İlanlar", value: "0" },
            { label: "Açık Adaylar", value: "0" },
            { label: "Bakım Talepleri", value: "0" },
            { label: "Devam Eden İşlemler", value: "0" },
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
