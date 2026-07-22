"use client"

import { useEffect, useState } from "react"
import {
  ArrowRight,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  History,
  ShieldCheck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { AdminApprovalsInbox } from "@/components/admin-approvals-inbox"
import { UserAdministrationPanel } from "@/components/user-administration-panel"
import { cn } from "@/lib/utils"

type LocaleKey = "tr" | "en" | "de" | "ru"

function localeKey(value: string): LocaleKey {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

// Business language only. No table names, roles, permission strings, or platform
// internals appear here — this hub speaks to an administrator, not to the schema.
const copy = {
  tr: {
    overview: "Genel bakış",
    open: "Aç",
    tiles: {
      people: { label: "Kişiler", desc: "Ekip ve sakinler tek yerde." },
      approvals: { label: "Onay bekleyenler", desc: "İncelemenizi bekleyen istekler." },
      money: { label: "Para", desc: "Aidat, ödeme ve tahsilat." },
      service: { label: "Servis işleri", desc: "Bakım ve saha çalışmaları." },
    },
    sections: {
      people: {
        title: "Kişiler ve erişim",
        desc: "Hesap ekleyin, bilgileri düzenleyin, rol atayın veya erişimi askıya alın.",
      },
      approvals: {
        title: "Onayınız gerekiyor",
        desc: "Onayınızı bekleyen istekleri tek yerden onaylayın veya reddedin.",
      },
      money: {
        title: "Para",
        desc: "Aidat, ödeme, tahsilat ve iade denetimi.",
        body: "Canlı finans denetimi yakında bu bölüme gelecek.",
        cta: "Finansı aç",
      },
      property: {
        title: "Mülk ve servisler",
        desc: "Bakım talepleri, saha işleri ve etkinlikler.",
        body: "Mülk ve servis denetimi yakında bu bölümde toplanacak.",
        cta: "Servisleri aç",
      },
      audit: {
        title: "Etkinlik ve denetim",
        desc: "Son yönetici işlemleri.",
        body: "Yakında son yönetici işlemlerini burada göreceksiniz.",
      },
    },
  },
  en: {
    overview: "Overview",
    open: "Open",
    tiles: {
      people: { label: "People", desc: "Team and residents in one place." },
      approvals: { label: "Awaiting approval", desc: "Requests waiting for your review." },
      money: { label: "Money", desc: "Dues, payments and collections." },
      service: { label: "Service jobs", desc: "Maintenance and field work." },
    },
    sections: {
      people: {
        title: "People & access",
        desc: "Add accounts, edit details, assign roles or suspend access.",
      },
      approvals: {
        title: "Needs your approval",
        desc: "Approve or decline everything waiting on your review, in one place.",
      },
      money: {
        title: "Money",
        desc: "Dues, payments, collections and refund oversight.",
        body: "Live financial oversight is coming to this section soon.",
        cta: "Open finance",
      },
      property: {
        title: "Property & services",
        desc: "Maintenance requests, field work and activities.",
        body: "Property and service oversight will be gathered in this section soon.",
        cta: "Open services",
      },
      audit: {
        title: "Activity & audit",
        desc: "Recent administrator actions.",
        body: "Soon you'll see recent administrator actions here.",
      },
    },
  },
  de: {
    overview: "Überblick",
    open: "Öffnen",
    tiles: {
      people: { label: "Personen", desc: "Team und Bewohner an einem Ort." },
      approvals: { label: "Warten auf Freigabe", desc: "Anfragen, die auf Ihre Prüfung warten." },
      money: { label: "Finanzen", desc: "Beiträge, Zahlungen und Einzüge." },
      service: { label: "Serviceaufträge", desc: "Wartung und Feldarbeit." },
    },
    sections: {
      people: {
        title: "Personen & Zugang",
        desc: "Konten anlegen, Details bearbeiten, Rollen zuweisen oder Zugang aussetzen.",
      },
      approvals: {
        title: "Ihre Freigabe erforderlich",
        desc: "Alles, was auf Ihre Prüfung wartet, an einem Ort freigeben oder ablehnen.",
      },
      money: {
        title: "Finanzen",
        desc: "Beiträge, Zahlungen, Einzüge und Erstattungsaufsicht.",
        body: "Die Live-Finanzaufsicht kommt bald in diesen Bereich.",
        cta: "Finanzen öffnen",
      },
      property: {
        title: "Objekt & Services",
        desc: "Wartungsanfragen, Feldarbeit und Aktivitäten.",
        body: "Die Objekt- und Serviceaufsicht wird bald in diesem Bereich gebündelt.",
        cta: "Services öffnen",
      },
      audit: {
        title: "Aktivität & Prüfung",
        desc: "Letzte Administratoraktionen.",
        body: "Bald sehen Sie hier die letzten Administratoraktionen.",
      },
    },
  },
  ru: {
    overview: "Обзор",
    open: "Открыть",
    tiles: {
      people: { label: "Люди", desc: "Команда и жители в одном месте." },
      approvals: { label: "Ждут согласования", desc: "Запросы, ожидающие вашей проверки." },
      money: { label: "Финансы", desc: "Взносы, платежи и сборы." },
      service: { label: "Сервисные работы", desc: "Обслуживание и полевые работы." },
    },
    sections: {
      people: {
        title: "Люди и доступ",
        desc: "Добавляйте учётные записи, изменяйте данные, назначайте роли или приостанавливайте доступ.",
      },
      approvals: {
        title: "Требуется ваше согласование",
        desc: "Согласуйте или отклоните всё, что ждёт вашей проверки, в одном месте.",
      },
      money: {
        title: "Финансы",
        desc: "Взносы, платежи, сборы и контроль возвратов.",
        body: "Живой финансовый контроль скоро появится в этом разделе.",
        cta: "Открыть финансы",
      },
      property: {
        title: "Объекты и услуги",
        desc: "Заявки на обслуживание, полевые работы и мероприятия.",
        body: "Контроль объектов и услуг скоро будет собран в этом разделе.",
        cta: "Открыть услуги",
      },
      audit: {
        title: "Активность и аудит",
        desc: "Последние действия администратора.",
        body: "Скоро вы увидите здесь последние действия администратора.",
      },
    },
  },
} as const

// Shape of the fields we read from GET /api/site-management/users. We intentionally
// type only what the tile needs so the hub stays decoupled from the full contract.
interface UsersEndpointResponse {
  summary?: { staffTotal?: number; residentTotal?: number }
  administration?: { available?: boolean; users?: unknown[] }
}

// Real count of people, never fabricated. When the live administration snapshot is
// available we count managed accounts; otherwise we fall back to the directory
// summary (team + residents), which is present in every environment.
function computePeopleCount(payload: UsersEndpointResponse): number | null {
  const admin = payload.administration
  if (admin && admin.available === true && Array.isArray(admin.users)) {
    return admin.users.length
  }
  const summary = payload.summary
  if (
    summary &&
    typeof summary.staffTotal === "number" &&
    typeof summary.residentTotal === "number"
  ) {
    return summary.staffTotal + summary.residentTotal
  }
  return null
}

const tileClass =
  "group flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors duration-150 hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"

function TileIcon({ Icon }: { Icon: LucideIcon }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  )
}

function CollapsibleSection({
  id,
  Icon,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  id: string
  Icon: LucideIcon
  title: string
  description: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const titleId = `${id}-title`
  const panelId = `${id}-panel`

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <h2 id={titleId} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <TileIcon Icon={Icon} />
          <span className="min-w-0 flex-1">
            <span className="block text-base font-black text-foreground">{title}</span>
            <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">
              {description}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      </h2>
      <div
        id={panelId}
        role="region"
        aria-labelledby={titleId}
        hidden={!open}
        className="border-t border-border p-5"
      >
        {children}
      </div>
    </section>
  )
}

// A placeholder section: an honest one-line note plus a deep-link to where the
// work lives today. No invented metrics — the live surface arrives in a later phase.
function PlaceholderBody({
  body,
  cta,
  href,
}: {
  body: string
  cta: string
  href: string
}) {
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{body}</p>
      <Link
        href={href}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
      >
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  )
}

export function AdminControlCenter({ locale }: { locale: string }) {
  const c = copy[localeKey(locale)]
  const [peopleCount, setPeopleCount] = useState<number | null>(null)
  const [peopleState, setPeopleState] = useState<"loading" | "ready" | "error">(
    "loading"
  )
  const [approvalsCount, setApprovalsCount] = useState<number | null>(null)
  const [approvalsState, setApprovalsState] = useState<
    "loading" | "ready" | "error"
  >("loading")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch("/api/site-management/users?limit=80", {
          cache: "no-store",
        })
        if (!response.ok) throw new Error("unavailable")
        const payload = (await response.json()) as UsersEndpointResponse
        if (cancelled) return
        setPeopleCount(computePeopleCount(payload))
        setPeopleState("ready")
      } catch {
        if (!cancelled) setPeopleState("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Real count of items awaiting approval from the same endpoint the inbox uses.
  // Honest number or "—"; never a fabricated figure.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch("/api/site-management/approvals", {
          cache: "no-store",
        })
        if (!response.ok) throw new Error("unavailable")
        const payload = (await response.json()) as { items?: unknown[] }
        if (cancelled) return
        setApprovalsCount(Array.isArray(payload.items) ? payload.items.length : 0)
        setApprovalsState("ready")
      } catch {
        if (!cancelled) setApprovalsState("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const peopleDisplay =
    peopleState === "loading"
      ? "…"
      : peopleCount === null
        ? "—"
        : peopleCount.toLocaleString(localeKey(locale))

  const approvalsDisplay =
    approvalsState === "loading"
      ? "…"
      : approvalsCount === null
        ? "—"
        : approvalsCount.toLocaleString(localeKey(locale))

  const navTiles = [
    {
      key: "money",
      Icon: CircleDollarSign,
      href: "/dashboard/finance",
      ...c.tiles.money,
    },
    {
      key: "service",
      Icon: Wrench,
      href: "/dashboard/tickets",
      ...c.tiles.service,
    },
  ] as const

  return (
    <div className="space-y-6">
      {/* At-a-glance overview. The People tile is real data; the others are honest
          deep-links to where each area lives today (no fabricated counts). */}
      <section aria-labelledby="admin-overview-heading">
        <h2 id="admin-overview-heading" className="sr-only">
          {c.overview}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <a href="#admin-people" className={tileClass}>
            <TileIcon Icon={Users} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.tiles.people.label}
              </span>
              <span className="mt-0.5 block text-2xl font-black leading-tight text-foreground">
                {peopleDisplay}
              </span>
              <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                {c.tiles.people.desc}
              </span>
            </span>
          </a>

          {/* Real pending-approval count from the same endpoint as the inbox
              below; jumps to that section rather than fabricating a figure. */}
          <a href="#admin-approvals" className={tileClass}>
            <TileIcon Icon={ClipboardCheck} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.tiles.approvals.label}
              </span>
              <span className="mt-0.5 block text-2xl font-black leading-tight text-foreground">
                {approvalsDisplay}
              </span>
              <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                {c.tiles.approvals.desc}
              </span>
            </span>
          </a>

          {navTiles.map(({ key, Icon, href, label, desc }) => (
            <Link key={key} href={href} className={tileClass}>
              <TileIcon Icon={Icon} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-sm font-bold text-primary">
                  {c.open}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                  {desc}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 1. People & access — the fully working Phase 3 section. The panel fetches
          its own data and self-hides for non-admins, so it needs no props. */}
      <CollapsibleSection
        id="admin-people"
        Icon={Users}
        title={c.sections.people.title}
        description={c.sections.people.desc}
        defaultOpen
      >
        <UserAdministrationPanel />
      </CollapsibleSection>

      {/* 2. Needs your approval — the unified inbox. It fetches its own data,
          self-hides for non-admins, and dispatches each decision to the existing
          per-kind endpoint, so it needs no props. */}
      <CollapsibleSection
        id="admin-approvals"
        Icon={ClipboardCheck}
        title={c.sections.approvals.title}
        description={c.sections.approvals.desc}
        defaultOpen
      >
        <AdminApprovalsInbox />
      </CollapsibleSection>

      {/* 3. Money — Phase 5 adds live oversight. */}
      <CollapsibleSection
        id="admin-money"
        Icon={CircleDollarSign}
        title={c.sections.money.title}
        description={c.sections.money.desc}
      >
        <PlaceholderBody
          body={c.sections.money.body}
          cta={c.sections.money.cta}
          href="/dashboard/finance"
        />
      </CollapsibleSection>

      {/* 4. Property & services — Phase 5. */}
      <CollapsibleSection
        id="admin-property"
        Icon={Wrench}
        title={c.sections.property.title}
        description={c.sections.property.desc}
      >
        <PlaceholderBody
          body={c.sections.property.body}
          cta={c.sections.property.cta}
          href="/dashboard/tickets"
        />
      </CollapsibleSection>

      {/* 5. Activity & audit — Phase 5 surfaces recent admin actions here. */}
      <CollapsibleSection
        id="admin-audit"
        Icon={History}
        title={c.sections.audit.title}
        description={c.sections.audit.desc}
      >
        <p className="flex max-w-2xl items-start gap-2 text-sm leading-6 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {c.sections.audit.body}
        </p>
      </CollapsibleSection>
    </div>
  )
}
