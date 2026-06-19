"use client"

import {
  Building2,
  Users,
  TicketCheck,
  CalendarDays,
  LogOut,
  FileCheck,
  CircleDollarSign,
  CloudOff,
  MessageSquare,
  BarChart3,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { Link } from "@/app/navigation"

const menu = [
  { label: "İlanlar", icon: Building2, href: "#" },
  { label: "Müşteri Adayları", icon: Users, href: "#" },
  { label: "Talepler", icon: TicketCheck, href: "#" },
  { label: "Takvim", icon: CalendarDays, href: "#" },
  { label: "EİDS & Uyumluluk", icon: FileCheck, href: "#" },
  { label: "Finans & Döviz", icon: CircleDollarSign, href: "#" },
]

const modules = [
  {
    label: "Aktif İlanlar",
    value: "0",
    hint: "Twenty + Supabase bağlantısı sonrası",
  },
  { label: "Açık Adaylar", value: "0", hint: "Lead yönetimi" },
  { label: "Bakım Talepleri", value: "0", hint: "Fotoğraflı ticketlar" },
  {
    label: "Devam Eden İşlemler",
    value: "0",
    hint: "Satış / kiralama pipeline",
  },
]

const placeholders = [
  { label: "WhatsApp / Telegram Entegrasyonu", icon: MessageSquare },
  { label: "In-app VoIP & Video Görüşme", icon: Users },
  { label: "AI Lead Asistanı", icon: BarChart3 },
  { label: "Airbnb / Booking Sync", icon: CalendarDays },
  { label: "Otomatik KBS/e-GUEST", icon: FileCheck },
  { label: "Offline Saha Modu", icon: CloudOff },
]

export default function DashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform duration-200 md:relative md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-teal-600 text-sm font-black text-primary-foreground">
                1Ç
              </div>
              <span className="text-lg font-bold text-card-foreground">
                1Çatı
              </span>
            </Link>
            <button
              className="text-muted-foreground md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-8 space-y-2">
            {menu.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto">
            <button className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8">
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-black text-foreground">Kontrol Paneli</h1>
        </div>

        <h1 className="hidden text-3xl font-black text-foreground md:block">
          Kontrol Paneli
        </h1>
        <p className="mt-2 text-muted-foreground">
          Burası Twenty ve Supabase&apos;e bağlı CRM panosu olacak. Aşağıdaki
          kartlar MVP kapsamındaki modülleri gösterir.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="text-2xl font-black text-card-foreground">
                {card.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {card.label}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground/70">
                {card.hint}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-bold text-foreground">
            Yol Haritası Modülleri
          </h2>
          <p className="text-sm text-muted-foreground">
            Bu özellikler sonraki fazlarda eklenecek; arayüzde yerleri hazır.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {placeholders.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-4 opacity-70"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
