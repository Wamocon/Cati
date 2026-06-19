"use client"

import {
  Building2,
  Users,
  TicketCheck,
  CalendarDays,
  LogOut,
  FileCheck,
  CircleDollarSign,
  ShieldCheck,
  CloudOff,
  MessageSquare,
  BarChart3,
} from "lucide-react"
import Link from "next/link"

const menu = [
  { label: "İlanlar", icon: Building2, href: "#" },
  { label: "Müşteri Adayları", icon: Users, href: "#" },
  { label: "Talepler", icon: TicketCheck, href: "#" },
  { label: "Takvim", icon: CalendarDays, href: "#" },
  { label: "EİDS & Uyumluluk", icon: FileCheck, href: "#" },
  { label: "Finans & Döviz", icon: CircleDollarSign, href: "#" },
]

const modules = [
  { label: "Aktif İlanlar", value: "0", hint: "Twenty + Supabase bağlantısı sonrası" },
  { label: "Açık Adaylar", value: "0", hint: "Lead yönetimi" },
  { label: "Bakım Talepleri", value: "0", hint: "Fotoğraflı ticketlar" },
  { label: "Devam Eden İşlemler", value: "0", hint: "Satış / kiralama pipeline" },
]

const placeholders = [
  { label: "WhatsApp / Telegram Entegrasyonu", icon: MessageSquare },
  { label: "In-app VoIP & Video Görüşme", icon: Users },
  { label: "AI Lead Asistanı", icon: BarChart3 },
  { label: "Airbnb / Booking Sync", icon: CalendarDays },
  { label: "Otomatik KBS/e-GUEST", icon: ShieldCheck },
  { label: "Offline Saha Modu", icon: CloudOff },
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
          Burası Twenty ve Supabase'e bağlı CRM panosu olacak. Aşağıdaki kartlar MVP kapsamındaki modülleri gösterir.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-white/10 bg-[#0b1021] p-5"
            >
              <div className="text-2xl font-black text-white">{card.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {card.label}
              </div>
              <div className="mt-2 text-[10px] text-[#64748b]">{card.hint}</div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-bold text-white">Yol Haritası Modülleri</h2>
          <p className="text-sm text-muted-foreground">
            Bu özellikler sonraki fazlarda eklenecek; arayüzde yerleri hazır.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {placeholders.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-4 rounded-xl border border-dashed border-white/10 bg-[#0b1021]/50 p-4 opacity-70"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-muted-foreground">
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
