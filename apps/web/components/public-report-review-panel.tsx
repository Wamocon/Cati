"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { FeatureInfo } from "@/components/feature-info"
import { createClient } from "@/lib/supabase/client"
import type {
  PublicReportLocale,
  PublicReportManagerRecord,
  PublicReportPlacementAction,
  PublicReportReviewAction,
  PublicReportReviewData,
} from "@/lib/public-report"
import { publicReportCopy, type PublicReportCopy } from "@/lib/public-report-copy"

export function PublicReportReviewPanel({ locale }: { locale: PublicReportLocale }) {
  const copy = publicReportCopy[locale]
  const manager = copy.manager
  const [data, setData] = useState<PublicReportReviewData>({ reports: [], placements: [], sites: [] })
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [placementBusy, setPlacementBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [reason, setReason] = useState(manager.defaultReason)
  const [siteId, setSiteId] = useState("")
  const [zoneCode, setZoneCode] = useState("")
  const [zoneLabels, setZoneLabels] = useState({ tr: "", en: "", de: "", ru: "" })

  const load = useCallback(async (quiet = false) => {
    try {
      const response = await fetch("/api/site-management/public-report", { cache: "no-store" })
      const payload = await response.json() as { queue?: PublicReportReviewData }
      if (!response.ok || !payload.queue) throw new Error("queue")
      setData(payload.queue)
      setSiteId((current) => current || payload.queue?.sites[0]?.id || "")
      setError("")
    } catch {
      if (!quiet) setError(manager.loadError)
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [manager.loadError])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0)
    const timer = window.setInterval(() => void load(true), 30_000)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return () => { window.clearTimeout(initialLoad); window.clearInterval(timer) }
    }
    const supabase = createClient()
    const channel = supabase
      .channel("public-problem-report-review")
      .on("postgres_changes", { event: "*", schema: "public", table: "public_problem_reports" }, () => void load(true))
      .subscribe()
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
      void supabase.removeChannel(channel)
    }
  }, [load])

  async function act(report: PublicReportManagerRecord, action: PublicReportReviewAction) {
    setBusyId(report.id)
    setError("")
    try {
      const response = await fetch("/api/site-management/public-report", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `public-report-review-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          reportId: report.id,
          expectedVersion: report.version,
          action,
          publicMessage: "",
          internalReason: action === "start_review" ? null : reason,
        }),
      })
      if (!response.ok) throw new Error("review")
      await load(true)
    } catch {
      setError(manager.actionError)
    } finally {
      setBusyId(null)
    }
  }

  async function managePlacement(
    action: PublicReportPlacementAction,
    placementId: string | null = null
  ) {
    const confirmation = action === "rotate"
      ? manager.confirmRotate
      : action === "revoke" ? manager.confirmRevoke : null
    if (confirmation && !window.confirm(confirmation)) return
    setPlacementBusy(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/site-management/public-report", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `public-report-placement-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          command: "manage_placement",
          placementAction: action,
          siteId: action === "create" ? siteId : null,
          placementId,
          zoneCode: action === "create" ? zoneCode : null,
          zoneLabels: action === "create" ? zoneLabels : null,
          validUntil: null,
        }),
      })
      if (!response.ok) throw new Error("placement")
      await load(true)
      if (action === "create") {
        setZoneCode("")
        setZoneLabels({ tr: "", en: "", de: "", ru: "" })
      }
      setNotice(manager.placementSaved)
    } catch {
      setError(manager.placementActionError)
    } finally {
      setPlacementBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <header><p className="text-sm font-semibold uppercase tracking-widest text-sky-700">{manager.kicker}</p><div className="mt-2 flex items-center gap-2"><h1 className="text-3xl font-bold text-slate-950">{manager.title}</h1><FeatureInfo featureKey="public_reports" side="bottom" /></div><p className="mt-2 max-w-3xl text-slate-600">{manager.intro}</p></header>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{notice}</p>}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div><h2 className="text-xl font-semibold">{manager.setupPlacements}</h2><p className="mt-1 max-w-3xl text-sm text-slate-600">{manager.setupIntro}</p></div>
        {data.sites.length === 0 && !loading ? <p className="text-sm text-slate-500">{manager.noSites}</p> : (
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void managePlacement("create") }}>
            <label className="space-y-1 text-sm font-medium"><span>{manager.siteSelect}</span><select required value={siteId} onChange={(event) => setSiteId(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2">{data.sites.map((site) => <option key={site.id} value={site.id}>{site.label}</option>)}</select></label>
            <label className="space-y-1 text-sm font-medium"><span>{manager.zoneCode}</span><input required minLength={2} maxLength={80} pattern="[a-z0-9][a-z0-9._-]{1,79}" value={zoneCode} onChange={(event) => setZoneCode(event.target.value.toLowerCase())} className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono" /></label>
            {(["tr", "en", "de", "ru"] as const).map((language) => {
              const label = language === "tr" ? manager.zoneLabelTr : language === "en" ? manager.zoneLabelEn : language === "de" ? manager.zoneLabelDe : manager.zoneLabelRu
              return <label key={language} className="space-y-1 text-sm font-medium"><span>{label}</span><input required minLength={2} maxLength={120} value={zoneLabels[language]} onChange={(event) => setZoneLabels((current) => ({ ...current, [language]: event.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            })}
            <div className="md:col-span-2"><button disabled={placementBusy || !siteId} className="rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{manager.createPlacement}</button></div>
          </form>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{manager.activePlacements}</h2>
        {data.placements.length === 0 ? <p className="text-sm text-slate-500">{loading ? manager.loading : manager.noPlacements}</p> : (
          <div className="grid gap-3 md:grid-cols-2">{data.placements.map((placement) => {
            const zone = placement.zoneLabels[locale] ?? placement.zoneLabels.tr ?? placement.zoneCode
            return <article key={placement.id} className={`rounded-2xl border border-slate-200 bg-white p-4 ${placement.active ? "" : "opacity-60"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{placement.siteLabel}</p><p className="text-sm text-slate-600">{zone}</p></div>{!placement.active && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{manager.inactivePlacement}</span>}</div>{placement.active && <div className="mt-3 flex flex-wrap gap-2"><Link className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-900" href={`/${locale}/new-level-premium/report-poster?qr=${encodeURIComponent(placement.publicCode)}`}>{manager.openPoster}</Link><button type="button" disabled={placementBusy} onClick={() => void managePlacement("rotate", placement.id)} className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50">{manager.rotatePlacement}</button><button type="button" disabled={placementBusy} onClick={() => void managePlacement("revoke", placement.id)} className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-50">{manager.revokePlacement}</button></div>}</article>
          })}</div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4"><h2 className="text-xl font-semibold">{manager.triageQueue}</h2><label className="w-full max-w-md space-y-1 text-sm font-medium"><span>{manager.internalReason}</span><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} className="w-full rounded-xl border border-slate-300 px-3 py-2" /></label></div>
        {data.reports.length === 0 ? <p className="rounded-2xl border border-dashed p-8 text-center text-slate-500">{loading ? manager.loading : manager.noReports}</p> : data.reports.map((report) => (
          <ReportCard key={report.id} report={report} locale={locale} copy={copy} busy={busyId === report.id} act={act} />
        ))}
      </section>
    </div>
  )
}

function ReportCard({ report, locale, copy, busy, act }: {
  report: PublicReportManagerRecord
  locale: PublicReportLocale
  copy: PublicReportCopy
  busy: boolean
  act: (report: PublicReportManagerRecord, action: PublicReportReviewAction) => Promise<void>
}) {
  const manager = copy.manager
  const zone = report.zoneLabels[locale] ?? report.zoneLabels.tr ?? report.zoneCode
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-slate-500">{report.reference} · v{report.version}</p><h3 className="mt-1 text-lg font-semibold">{report.siteLabel} · {zone}</h3></div><span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900">{copy.statusLabels[report.status]}</span></div>
      {report.safetyCode && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">{manager.safetyFlag}: {copy.safetyLabels[report.safetyCode]}. {manager.safetyTruth}</p>}
      <p className="mt-4 whitespace-pre-wrap text-slate-800">{report.description}</p>
      {report.locationDetail && <p className="mt-2 text-sm text-slate-600">{manager.locationDetail}: {report.locationDetail}</p>}
      {report.contactValue && <p className="mt-2 text-sm text-slate-600">{manager.optionalContact} · {report.contactKind === "email" ? copy.email : copy.phone}: {report.contactValue}</p>}
      {report.possibleDuplicateReference && <p className="mt-2 text-sm text-amber-700">{manager.possibleDuplicate}: {report.possibleDuplicateReference}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        {(report.status === "submitted" || report.status === "awaiting_information") && <button disabled={busy} onClick={() => void act(report, "start_review")} className="rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{manager.startReview}</button>}
        {report.status !== "converted" && report.status !== "rejected" && <button disabled={busy || report.status !== "under_review"} onClick={() => void act(report, "convert")} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{manager.convert}</button>}
        {report.status === "under_review" && <button disabled={busy} onClick={() => void act(report, "request_information")} className="rounded-full border px-4 py-2 text-sm font-semibold">{manager.requestInformation}</button>}
        {report.status === "under_review" && <button disabled={busy} onClick={() => void act(report, "reject")} className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-800">{manager.reject}</button>}
      </div>
    </article>
  )
}
