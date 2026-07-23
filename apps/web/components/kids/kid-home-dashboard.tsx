"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  Award,
  Compass,
  PartyPopper,
  RefreshCw,
  Rocket,
  Sparkles,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { ActivitiesCatalog } from "@/components/activities/activities-catalog"
import { useUser } from "@/components/user-provider"
import { formatDualFromCents } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/rbac"
import type { WalletOverview as WalletOverviewPayload, WalletSummary } from "@/lib/wallet-repository"
import type { BookingView } from "@/lib/activities-repository"

type KidLocale = "tr" | "en" | "de" | "ru"

function resolveKidLocale(value: string): KidLocale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

// A gentle monthly goal. It never nags: reaching it celebrates, not reaching it is
// framed as an open invitation, never a failure or a broken streak.
const MONTHLY_GOAL = 4

interface KidCopy {
  greeting: string
  greetingNoName: string
  welcomeSub: string
  allowanceLabel: string
  allowanceNote: string
  lowTitle: string
  lowBody: string
  goalTitle: string
  goalProgress: string
  goalReached: string
  goalStart: string
  badgesTitle: string
  badgeLockedHint: string
  loading: string
}

const kidCopy: Record<KidLocale, KidCopy> = {
  en: {
    greeting: "Hi, {name}!",
    greetingNoName: "Hi there!",
    welcomeSub: "Here's your space. Pick a fun activity whenever you like.",
    allowanceLabel: "Your allowance",
    allowanceNote: "This is what you can spend on activities.",
    lowTitle: "Almost empty",
    lowBody: "When you're ready, ask a parent to top it up.",
    goalTitle: "This month",
    goalProgress: "{count} of {goal} activities",
    goalReached: "Amazing, you reached your goal!",
    goalStart: "Pick something fun to start!",
    badgesTitle: "Your badges",
    badgeLockedHint: "Keep exploring to unlock",
    loading: "Loading your space…",
  },
  tr: {
    greeting: "Merhaba, {name}!",
    greetingNoName: "Merhaba!",
    welcomeSub: "Burası senin alanın. İstediğin zaman eğlenceli bir etkinlik seç.",
    allowanceLabel: "Harçlığın",
    allowanceNote: "Etkinliklerde bunu harcayabilirsin.",
    lowTitle: "Neredeyse bitti",
    lowBody: "Hazır olduğunda bir büyüğünden yüklemesini isteyebilirsin.",
    goalTitle: "Bu ay",
    goalProgress: "{goal} etkinlikten {count} tanesi",
    goalReached: "Harika, hedefine ulaştın!",
    goalStart: "Başlamak için eğlenceli bir şey seç!",
    badgesTitle: "Rozetlerin",
    badgeLockedHint: "Keşfetmeye devam et, açılsın",
    loading: "Alanın yükleniyor…",
  },
  de: {
    greeting: "Hallo, {name}!",
    greetingNoName: "Hallo!",
    welcomeSub: "Das ist dein Bereich. Wähle jederzeit eine schöne Aktivität.",
    allowanceLabel: "Dein Taschengeld",
    allowanceNote: "Das kannst du für Aktivitäten ausgeben.",
    lowTitle: "Fast leer",
    lowBody: "Bitte ein Elternteil, es aufzuladen, wenn du bereit bist.",
    goalTitle: "Diesen Monat",
    goalProgress: "{count} von {goal} Aktivitäten",
    goalReached: "Super, du hast dein Ziel erreicht!",
    goalStart: "Wähle etwas Schönes zum Starten!",
    badgesTitle: "Deine Abzeichen",
    badgeLockedHint: "Entdecke weiter, um freizuschalten",
    loading: "Dein Bereich wird geladen…",
  },
  ru: {
    greeting: "Привет, {name}!",
    greetingNoName: "Привет!",
    welcomeSub: "Это твоё пространство. Выбирай интересную активность когда захочешь.",
    allowanceLabel: "Твои средства",
    allowanceNote: "Это можно потратить на активности.",
    lowTitle: "Почти закончились",
    lowBody: "Когда будешь готов, попроси родителя пополнить.",
    goalTitle: "В этом месяце",
    goalProgress: "{count} из {goal} активностей",
    goalReached: "Отлично, ты достиг цели!",
    goalStart: "Выбери что-нибудь интересное для начала!",
    badgesTitle: "Твои значки",
    badgeLockedHint: "Продолжай исследовать, чтобы открыть",
    loading: "Загружаем твоё пространство…",
  },
}

interface BadgeDefinition {
  key: string
  icon: LucideIcon
  label: Record<KidLocale, string>
  earned: (facts: { total: number; distinct: number }) => boolean
}

const badgeDefinitions: BadgeDefinition[] = [
  {
    key: "first",
    icon: Star,
    label: { en: "First activity", tr: "İlk etkinlik", de: "Erste Aktivität", ru: "Первая активность" },
    earned: ({ total }) => total >= 1,
  },
  {
    key: "explorer",
    icon: Compass,
    label: { en: "Explorer", tr: "Kâşif", de: "Entdecker", ru: "Исследователь" },
    earned: ({ total }) => total >= 3,
  },
  {
    key: "variety",
    icon: Award,
    label: { en: "Variety star", tr: "Çeşitlilik yıldızı", de: "Vielfalt-Star", ru: "Звезда разнообразия" },
    earned: ({ distinct }) => distinct >= 2,
  },
  {
    key: "super",
    icon: Rocket,
    label: { en: "Super explorer", tr: "Süper kâşif", de: "Super-Entdecker", ru: "Супер-исследователь" },
    earned: ({ total }) => total >= 5,
  },
]

function isThisMonth(value: string | null): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  )
}

// ---------------------------------------------------------------------------
// Progress ring: decorative SVG donut with an accessible text label.
// ---------------------------------------------------------------------------

function ProgressRing({ value, goal }: { value: number; goal: number }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const ratio = goal > 0 ? Math.min(value / goal, 1) : 0
  const dash = circumference * ratio

  return (
    <svg
      viewBox="0 0 80 80"
      className="h-24 w-24 shrink-0"
      role="img"
      aria-label={`${value} / ${goal}`}
    >
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-primary/15"
      />
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 40 40)"
        className="text-primary transition-[stroke-dasharray] duration-500 ease-out"
      />
      <text
        x="40"
        y="40"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-lg font-black"
      >
        {value}
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Allowance card: kid-specific copy; calm low-balance, no top-up button.
// ---------------------------------------------------------------------------

function KidAllowanceCard({ wallet, text }: { wallet: WalletSummary; text: KidCopy }) {
  return (
    <div
      data-testid="kid-allowance"
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.14] via-primary/[0.06] to-transparent p-5 shadow-lg shadow-black/[0.04]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
            {text.allowanceLabel}
          </p>
          <p className="mt-2 break-words text-3xl font-black text-foreground">
            {formatDualFromCents(wallet.balanceCents, wallet.currency)}
          </p>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            {text.allowanceNote}
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Wallet className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>

      {wallet.lowBalance ? (
        <div
          role="status"
          data-testid="kid-allowance-low"
          className="relative mt-4 rounded-2xl border border-primary/20 bg-background/70 p-3"
        >
          <p className="text-sm font-black text-foreground">{text.lowTitle}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{text.lowBody}</p>
        </div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kid home
// ---------------------------------------------------------------------------

export function KidHomeDashboard({ roleLabel }: { role: Role; roleLabel: string }) {
  const locale = resolveKidLocale(useLocale())
  const text = kidCopy[locale]
  const user = useUser()
  const firstName = (user.full_name ?? "").trim().split(/\s+/)[0] ?? ""

  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [bookings, setBookings] = useState<BookingView[]>([])
  const [ready, setReady] = useState(false)
  const sequence = useRef(0)

  const load = useCallback(async () => {
    const current = ++sequence.current
    try {
      const [walletResult, activitiesResult] = await Promise.allSettled([
        fetch("/api/site-management/wallet?limit=1", {
          cache: "no-store",
          headers: { accept: "application/json" },
        }),
        fetch("/api/site-management/activities", {
          cache: "no-store",
          headers: { accept: "application/json" },
        }),
      ])
      if (current !== sequence.current) return
      if (walletResult.status === "fulfilled" && walletResult.value.ok) {
        const payload = (await walletResult.value.json()) as WalletOverviewPayload
        setWallet(payload.wallet)
      }
      if (activitiesResult.status === "fulfilled" && activitiesResult.value.ok) {
        const payload = (await activitiesResult.value.json()) as {
          myBookings: BookingView[]
        }
        setBookings(Array.isArray(payload.myBookings) ? payload.myBookings : [])
      }
      if (current === sequence.current) setReady(true)
    } catch {
      if (current === sequence.current) setReady(true)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 0)
    const onChange = () => void load()
    window.addEventListener("site-management:changed", onChange)
    return () => {
      window.clearTimeout(handle)
      window.removeEventListener("site-management:changed", onChange)
    }
  }, [load])

  const enjoyed = bookings.filter((booking) => booking.status !== "cancelled")
  const monthCount = enjoyed.filter((booking) =>
    isThisMonth(booking.scheduledAt ?? booking.createdAt)
  ).length
  const distinct = new Set(
    enjoyed.map((booking) => booking.activityId).filter(Boolean)
  ).size
  const facts = { total: enjoyed.length, distinct }

  const goalMessage =
    monthCount >= MONTHLY_GOAL
      ? text.goalReached
      : monthCount === 0
        ? text.goalStart
        : text.goalProgress
            .replace("{count}", String(monthCount))
            .replace("{goal}", String(MONTHLY_GOAL))

  return (
    <div data-testid="kid-home" className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.16] via-primary/[0.06] to-transparent p-6 shadow-lg shadow-black/[0.04]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {roleLabel}
          </p>
          <h1 className="mt-3 text-2xl font-black text-foreground md:text-3xl">
            {firstName
              ? text.greeting.replace("{name}", firstName)
              : text.greetingNoName}
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            {text.welcomeSub}
          </p>
        </div>
      </div>

      {!ready ? (
        <div
          aria-busy="true"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-sm font-semibold text-muted-foreground shadow-sm"
        >
          <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          {text.loading}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {wallet ? <KidAllowanceCard wallet={wallet} text={text} /> : <div />}

          <section
            aria-label={text.goalTitle}
            className="rounded-3xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <ProgressRing value={monthCount} goal={MONTHLY_GOAL} />
              <div className="min-w-0">
                <h2 className="text-sm font-black uppercase tracking-[0.1em] text-primary">
                  {text.goalTitle}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-base font-black text-foreground">
                  {monthCount >= MONTHLY_GOAL ? (
                    <PartyPopper className="h-4 w-4 text-primary" aria-hidden="true" />
                  ) : null}
                  {goalMessage}
                </p>
              </div>
            </div>

            <h3 className="mt-5 text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">
              {text.badgesTitle}
            </h3>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {badgeDefinitions.map((badge) => {
                const earned = badge.earned(facts)
                const Icon = badge.icon
                return (
                  <li
                    key={badge.key}
                    data-testid="kid-badge"
                    data-earned={earned ? "true" : "false"}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center",
                      earned
                        ? "border-primary/30 bg-primary/10"
                        : "border-dashed border-border bg-muted/20"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        earned
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-black leading-tight",
                        earned ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {badge.label[locale]}
                    </span>
                    {!earned ? (
                      <span className="sr-only">{text.badgeLockedHint}</span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}

      <ActivitiesCatalog />
    </div>
  )
}
