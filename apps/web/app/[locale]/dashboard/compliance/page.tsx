"use client"

import { motion } from "framer-motion"
import { useLocale } from "next-intl"
import { BadgeCheck, BarChart3, Car, DoorOpen, FileSearch, KeyRound, LockKeyhole, Network, Scale, ShieldAlert, ShieldCheck } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { BarChart } from "@/components/charts/bar-chart"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import {
  accessControlRecords,
  accessLabels,
  buyerEligibility,
  getAccessSummary,
  getEligibilitySummary,
  type AccessControlRecord,
  type AccessStatus,
  type EligibilityStatus,
} from "@/lib/site-management-data"
import { localizeBusinessCopy, resolveDashboardLocale, interpolate } from "@/lib/business-copy"
import { localizeOperationalValue } from "@/lib/unit-matrix-copy"

function statusVariant(status: AccessStatus) {
  if (status === "active") return "success"
  if (status === "restricted") return "danger"
  if (status === "pending") return "warning"
  return "neutral"
}

function riskVariant(risk: AccessControlRecord["riskLevel"]) {
  if (risk === "critical") return "danger"
  if (risk === "high") return "danger"
  if (risk === "medium") return "warning"
  return "success"
}

function riskLabel(risk: AccessControlRecord["riskLevel"], locale: string) {
  if (risk === "critical") return localizeBusinessCopy("Kritik", locale)
  if (risk === "high") return localizeBusinessCopy("Yüksek", locale)
  if (risk === "medium") return localizeBusinessCopy("Orta", locale)
  return localizeBusinessCopy("Düşük", locale)
}

function eligibilityVariant(status: EligibilityStatus) {
  if (status === "qualified") return "success"
  if (status === "review_required" || status === "partner_review") return "warning"
  return "danger"
}

function eligibilityLabel(status: EligibilityStatus, locale: string) {
  if (status === "qualified") return localizeBusinessCopy("Uygun", locale)
  if (status === "review_required") return localizeBusinessCopy("Kontrol gerekli", locale)
  if (status === "partner_review") return localizeBusinessCopy("Partner incelemesi", locale)
  return localizeBusinessCopy("Blokeli", locale)
}

function ComplianceCommandScene({
  summary,
}: {
  summary: ReturnType<typeof getAccessSummary>
}) {
  const locale = resolveDashboardLocale(useLocale())
  const flow = [
    { label: localizeBusinessCopy("Kimlik", locale), detail: localizeBusinessCopy("QR, kart, plaka", locale), icon: KeyRound },
    { label: localizeBusinessCopy("Finans", locale), detail: localizeBusinessCopy("Borç ve depozito", locale), icon: LockKeyhole },
    { label: localizeBusinessCopy("Karar", locale), detail: localizeBusinessCopy("Geçiş veya kısıt", locale), icon: DoorOpen },
  ]
  const bars = [
    { label: localizeBusinessCopy("Kapı", locale), value: 84 },
    { label: localizeBusinessCopy("Otopark", locale), value: 63 },
    { label: localizeBusinessCopy("Havuz", locale), value: 56 },
    { label: localizeBusinessCopy("Asansör", locale), value: 48 },
  ]

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950 text-white shadow-2xl shadow-primary/[0.14]">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.055)_1px,transparent_1px)] [background-size:46px_46px]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,.94),rgba(6,95,70,.86)_48%,rgba(17,24,39,.95)),radial-gradient(circle_at_72%_18%,rgba(251,191,36,.16),transparent_28%)]" />
        <motion.div
          aria-hidden="true"
          className="absolute left-[12%] top-[20%] h-32 w-[58%] rounded-full border border-dashed border-white/18"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute right-12 top-16 h-24 w-24 rounded-2xl border border-white/15 bg-white/[0.05]"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute bottom-0 left-0 right-0 hidden h-28 items-end gap-2 px-7 opacity-70 sm:flex">
          {[74, 54, 88, 62, 44, 78, 52, 66, 40].map((height, index) => (
            <motion.div
              key={index}
              className="min-w-6 flex-1 rounded-t-lg border border-white/10 bg-white/[0.085]"
              initial={{ height: 12 }}
              animate={{ height }}
              transition={{ delay: index * 0.05, duration: 0.7 }}
            />
          ))}
        </div>
        <div className="relative z-10 flex min-h-[360px] flex-col gap-7 p-5 sm:min-h-[380px] sm:p-6 xl:min-h-[360px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/70">
                {localizeBusinessCopy("Erişim karar motoru", locale)}
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-4xl 2xl:text-5xl">
                {localizeBusinessCopy("Kapı, borç, depozito ve kimlik tek karar motorunda", locale)}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
                {localizeBusinessCopy(
                  "Sistem erişim kararını sadece geçiş kartı olarak değil; ödeme, rezervasyon, belge ve güvenlik sinyaliyle birlikte değerlendirir.",
                  locale
                )}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-right backdrop-blur sm:p-4">
              <ShieldAlert className="ml-auto h-5 w-5 text-amber-200" />
              <p className="mt-3 text-4xl font-black">{summary.restricted}</p>
              <p className="mt-1 text-xs text-white/65">{localizeBusinessCopy("aktif kısıt", locale)}</p>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-2 sm:gap-3">
            {flow.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.label}
                  className="min-w-0 rounded-xl border border-white/12 bg-white/[0.08] p-3 backdrop-blur transition-colors hover:bg-white/[0.13] sm:p-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.08 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase text-white/55">
                        0{index + 1}
                      </p>
                      <p className="mt-1 text-sm font-black">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-white/65">{item.detail}</p>
                    </div>
                    <Icon className="hidden h-5 w-5 shrink-0 text-emerald-200 sm:block" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4">
        <Card3D glow={false}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">
                {localizeBusinessCopy("Canlı risk filtresi", locale)}
              </p>
              <h2 className="mt-1 text-lg font-black text-card-foreground">
                {interpolate(localizeBusinessCopy("{pending} bekleyen, {critical} kritik karar", locale), {
                  pending: summary.pending,
                  critical: summary.critical,
                })}
              </h2>
            </div>
            <Network className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-5 space-y-4">
            {bars.map((bar, index) => (
              <div key={bar.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-card-foreground">{bar.label}</span>
                  <span className="font-black text-primary">{bar.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-teal-500 to-amber-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${bar.value}%` }}
                    transition={{ delay: 0.15 + index * 0.07, duration: 0.65 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card3D>

        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Denetim ritmi", locale)}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {localizeBusinessCopy("Her geçiş kararı kullanıcı, sebep, saat ve belge referansıyla kayıt altında tutulur.", locale)}
              </p>
            </div>
          </div>
        </Card3D>
      </div>
    </section>
  )
}

export default function CompliancePage() {
  const locale = resolveDashboardLocale(useLocale())
  const summary = getAccessSummary()
  const eligibilitySummary = getEligibilitySummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{localizeBusinessCopy("Erişim & Uyum", locale)}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {localizeBusinessCopy(
            "Mobil kod, kart, plaka, QR, borç kısıtı, depozito kontrolü ve güvenlik olaylarını tek karar motorunda izleyin.",
            locale
          )}
        </p>
      </div>

      <ComplianceCommandScene summary={summary} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Takipteki kayıt", locale)}</p>
              <AnimatedCounter value={summary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Kısıtlı", locale)}</p>
              <AnimatedCounter value={summary.restricted} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <KeyRound className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Bekleyen", locale)}</p>
              <AnimatedCounter value={summary.pending} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Kritik risk", locale)}</p>
              <AnimatedCounter value={summary.critical} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Erişim bölgesi yoğunluğu", locale)}</h2>
            <StatusBadge variant="accent">
              {interpolate(localizeBusinessCopy("{count} bölge", locale), { count: summary.zones.length })}
            </StatusBadge>
          </div>
          <BarChart
            data={summary.zones.map((zone) => ({ label: localizeBusinessCopy(zone.label, locale), value: zone.value, color: "var(--primary)" }))}
            height={230}
          />
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <DoorOpen className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Kapı karar motoru", locale)}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {localizeBusinessCopy("Borç, rezervasyon, depozito ve kimlik kontrolü tamamlanmadan geçici erişim açılmaz.", locale)}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Car className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Plaka ve otopark", locale)}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {localizeBusinessCopy("Otopark, misafir ve sakin erişimleri aynı uyum kayıtlarına bağlanır.", locale)}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 text-teal-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Denetim izi", locale)}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {localizeBusinessCopy("Her erişim kararı kullanıcı, sebep, saat ve belge referansıyla denetlenebilir tutulur.", locale)}
                </p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-card-foreground">
                {localizeBusinessCopy("Oturum, vatandaşlık ve alıcı uygunluk ön kontrolü", locale)}
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {localizeBusinessCopy(
                "Satış ekibi uygunluk ön kontrolünü görür; sistem hukuki garanti vermez ve riskli durumları partner incelemesine gönderir.",
                locale
              )}
            </p>
          </div>
          <StatusBadge variant={eligibilitySummary.blocked > 0 ? "danger" : "success"}>
            {interpolate(localizeBusinessCopy("{count} inceleme kuyruğu", locale), { count: eligibilitySummary.review })}
          </StatusBadge>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Alıcı dosyası", locale)}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Ön uygun", locale)}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.qualified}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Ekspertiz gerekli", locale)}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.appraisalRequired}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Blokeli", locale)}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.blocked}</p>
          </div>
        </div>
        <DataTable
          data={buyerEligibility}
          pageSize={6}
          searchValue={(record) => `${record.id} ${record.buyerName} ${record.nationality} ${record.buyerGoal} ${record.targetUnit} ${record.nextAction}`}
          columns={[
            { key: "id", header: localizeBusinessCopy("Kontrol", locale), sortable: true, render: (record) => record.id },
            { key: "buyer", header: localizeBusinessCopy("Alıcı", locale), render: (record) => record.buyerName },
            { key: "goal", header: localizeBusinessCopy("Hedef", locale), sortable: true, render: (record) => localizeBusinessCopy(record.buyerGoal, locale) },
            {
              key: "budget",
              header: localizeBusinessCopy("Bütçe", locale),
              sortable: true,
              sortValue: (record) => record.declaredBudgetEur,
              render: (record) => `${record.declaredBudgetEur.toLocaleString("de-DE")} €`,
            },
            { key: "district", header: localizeBusinessCopy("Bölge", locale), render: (record) => localizeBusinessCopy(record.districtCheck, locale) },
            {
              key: "appraisal",
              header: localizeBusinessCopy("Ekspertiz", locale),
              render: (record) => (
                <span className="inline-flex items-center gap-1">
                  <FileSearch className="h-3.5 w-3.5 text-muted-foreground" />
                  {record.appraisalRequired ? localizeBusinessCopy("Gerekli", locale) : localizeBusinessCopy("Gerekmez", locale)}
                </span>
              ),
            },
            {
              key: "status",
              header: localizeBusinessCopy("Durum", locale),
              render: (record) => <StatusBadge variant={eligibilityVariant(record.status)}>{eligibilityLabel(record.status, locale)}</StatusBadge>,
            },
            { key: "next", header: localizeBusinessCopy("Sonraki aksiyon", locale), render: (record) => localizeBusinessCopy(record.nextAction, locale) },
          ]}
        />
      </Card3D>

      <DataTable
        data={accessControlRecords}
        searchValue={(record) => `${record.flatNumber} ${record.residentName} ${record.zone} ${record.credential} ${record.reason}`}
        columns={[
          { key: "flat", header: localizeBusinessCopy("Daire", locale), sortable: true, render: (record) => record.flatNumber },
          { key: "resident", header: localizeBusinessCopy("Sakin", locale), render: (record) => localizeOperationalValue(record.residentName, locale) },
          { key: "zone", header: localizeBusinessCopy("Bölge", locale), sortable: true, render: (record) => localizeBusinessCopy(record.zone, locale) },
          {
            key: "credential",
            header: localizeBusinessCopy("Kimlik", locale),
            sortable: true,
            render: (record) => localizeBusinessCopy(record.credential, locale),
          },
          {
            key: "status",
            header: localizeBusinessCopy("Erişim", locale),
            render: (record) => (
              <StatusBadge variant={statusVariant(record.status)}>{localizeBusinessCopy(accessLabels[record.status], locale)}</StatusBadge>
            ),
          },
          {
            key: "risk",
            header: localizeBusinessCopy("Risk", locale),
            sortable: true,
            sortValue: (record) => record.riskLevel,
            render: (record) => <StatusBadge variant={riskVariant(record.riskLevel)}>{riskLabel(record.riskLevel, locale)}</StatusBadge>,
          },
          { key: "reason", header: localizeBusinessCopy("Sebep", locale), render: (record) => localizeBusinessCopy(record.reason, locale) },
        ]}
      />
    </div>
  )
}
