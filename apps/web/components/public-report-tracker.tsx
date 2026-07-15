"use client"

import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import type { PublicReportLocale, PublicReportTrackingStatus } from "@/lib/public-report"
import { friendlyPublicReportError, publicReportCopy } from "@/lib/public-report-copy"

export function PublicReportTracker({
  locale,
  initialCredentials,
  embedded = false,
}: {
  locale: PublicReportLocale
  initialCredentials?: { reference: string; trackingToken: string }
  embedded?: boolean
}) {
  const copy = publicReportCopy[locale]
  const [reference, setReference] = useState(initialCredentials?.reference ?? "")
  const [trackingToken, setTrackingToken] = useState(
    initialCredentials?.trackingToken ?? ""
  )
  const [activeCredentials, setActiveCredentials] = useState<{ reference: string; token: string } | null>(null)
  const [report, setReport] = useState<PublicReportTrackingStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async (credentials: { reference: string; token: string }, quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const response = await fetch("/api/site-management/public-report", {
        method: "POST",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "track",
          reference: credentials.reference,
          trackingToken: credentials.token,
        }),
      })
      const payload = await response.json().catch(() => ({})) as {
        report?: PublicReportTrackingStatus
        code?: string
      }
      if (!response.ok || !payload.report) {
        if (!quiet) setError(friendlyPublicReportError(copy, payload.code, copy.trackingNotFound))
        return false
      }
      setReport(payload.report)
      setError("")
      return true
    } catch {
      if (!quiet) setError(copy.errorUnavailable)
      return false
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [copy])

  useEffect(() => {
    if (!activeCredentials) return
    const timer = window.setInterval(() => void load(activeCredentials, true), 30_000)
    return () => window.clearInterval(timer)
  }, [activeCredentials, load])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const credentials = { reference: reference.trim(), token: trackingToken.trim() }
    if (!credentials.reference || !credentials.token) return
    // Only start the 30s background poller once a lookup actually succeeds, so a
    // mistyped reference/token doesn't silently poll forever.
    const ok = await load(credentials)
    setActiveCredentials(ok ? credentials : null)
  }

  return (
    <section
      className={
        embedded
          ? "space-y-4 border-t border-slate-200 pt-6"
          : "mx-auto max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-10"
      }
    >
      <div><h1 className="text-3xl font-semibold text-slate-950">{copy.track}</h1><p className="mt-2 text-slate-600">{copy.trackingIntro}</p></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-2 text-sm font-medium"><span>{copy.reference}</span><input autoFocus={!embedded} required maxLength={40} autoComplete="off" value={reference} onChange={(event) => setReference(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
        <label className="block space-y-2 text-sm font-medium"><span>{copy.trackingToken}</span><input required maxLength={200} autoComplete="off" value={trackingToken} onChange={(event) => setTrackingToken(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono" /></label>
        <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 font-semibold text-white disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{loading ? copy.checking : copy.checkStatus}</button>
      </form>
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      {report && (
        <div className="space-y-4 border-t border-slate-200 pt-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{report.reference}</h2><span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900">{copy.status}: {copy.statusLabels[report.status]}</span></div>
          <p className="rounded-2xl bg-slate-50 p-4 text-slate-700">{report.message}</p>
          <ol className="space-y-3">
            {report.history.map((entry, index) => <li key={`${entry.at}-${index}`} className="border-l-2 border-sky-300 pl-4"><p className="font-medium">{copy.statusLabels[entry.status]}</p><p className="text-sm text-slate-600">{entry.message}</p><time className="text-xs text-slate-500">{new Date(entry.at).toLocaleString(locale)}</time></li>)}
          </ol>
        </div>
      )}
    </section>
  )
}
