"use client"

import Link from "next/link"
import { Check, Copy, Loader2, Printer } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  classifyPublicReportSafety,
  PUBLIC_REPORT_CATEGORIES,
  type PublicReportCategory,
  type PublicReportLocale,
  type PublicReportPlacement,
  type PublicReportReceipt,
} from "@/lib/public-report"
import {
  friendlyPublicReportError,
  publicReportCopy,
  type PublicReportCopy,
} from "@/lib/public-report-copy"
import { PublicReportTracker } from "@/components/public-report-tracker"

export function PublicReportForm({ locale, qrToken }: {
  locale: PublicReportLocale
  qrToken: string
}) {
  const copy = publicReportCopy[locale]
  const submissionKey = useRef<string | null>(null)
  const receiptHeadingRef = useRef<HTMLHeadingElement>(null)
  const [placement, setPlacement] = useState<PublicReportPlacement | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState("")
  const [category, setCategory] = useState<PublicReportCategory>("technical")
  const [description, setDescription] = useState("")
  const [locationDetail, setLocationDetail] = useState("")
  const [contactKind, setContactKind] = useState<"" | "email" | "phone">("")
  const [contactValue, setContactValue] = useState("")
  const [consent, setConsent] = useState(false)
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false)
  const [companyWebsite, setCompanyWebsite] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<PublicReportReceipt | null>(null)
  const safety = classifyPublicReportSafety(`${description} ${locationDetail}`)

  useEffect(() => {
    const controller = new AbortController()
    void fetch(`/api/site-management/public-report?qrToken=${encodeURIComponent(qrToken)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as {
          ok?: boolean
          placement?: PublicReportPlacement & { zoneLabel?: string }
        }
        if (!response.ok || !payload.placement) throw new Error("unavailable")
        const next = payload.placement
        if (!next.zoneLabels && next.zoneLabel) {
          next.zoneLabels = { [locale]: next.zoneLabel }
        }
        setPlacement(next)
      })
      .catch((reason: unknown) => {
        if ((reason as { name?: string })?.name !== "AbortError") setError(copy.unavailable)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [copy.unavailable, locale, qrToken, reloadKey])

  // Move focus to the confirmation heading when the receipt appears so screen-reader
  // users hear that the report was received instead of losing focus with the old form.
  useEffect(() => {
    if (receipt) receiptHeadingRef.current?.focus()
  }, [receipt])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!placement || !consent || (safety.requiresEmergencyCall && !safetyAcknowledged)) return
    submissionKey.current ??= `public-report-${crypto.randomUUID()}`
    setSubmitting(true)
    setError("")
    try {
      const response = await fetch("/api/site-management/public-report", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Idempotency-Key": submissionKey.current },
        body: JSON.stringify({
          qrToken, category, description, locationDetail: locationDetail || null,
          language: locale, contactKind: contactKind || null,
          contactValue: contactKind ? contactValue : null,
          consent: true, consentLocale: locale,
          safetyAcknowledged: safety.requiresEmergencyCall && safetyAcknowledged,
          companyWebsite,
        }),
      })
      const payload = await response.json().catch(() => ({})) as {
        receipt?: PublicReportReceipt
        code?: string
      }
      if (!response.ok || !payload.receipt) {
        setError(friendlyPublicReportError(copy, payload.code, copy.genericError))
        return
      }
      setReceipt(payload.receipt)
    } catch {
      setError(copy.errorUnavailable)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="mx-auto max-w-2xl p-8 text-sm text-slate-600">{copy.loading}</p>
  if (!placement) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-8">
        <p role="alert" className="text-red-700">{error || copy.unavailable}</p>
        <button
          type="button"
          onClick={() => {
            setError("")
            setLoading(true)
            setReloadKey((key) => key + 1)
          }}
          className="inline-flex rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {copy.retry}
        </button>
      </div>
    )
  }
  const zoneLabel = placement.zoneLabels[locale] ?? placement.zoneLabels.tr ?? placement.zoneCode

  if (receipt) {
    return (
      <section
        aria-live="polite"
        className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-xl sm:p-10"
      >
        <h1 ref={receiptHeadingRef} tabIndex={-1} className="text-3xl font-semibold text-slate-950 outline-none">
          {copy.receiptTitle}
        </h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <ReceiptValue label={copy.reference} value={receipt.reference} copy={copy} />
          <ReceiptValue label={copy.trackingToken} value={receipt.trackingToken} copy={copy} />
        </div>
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">{copy.saveReceipt}</p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          {copy.print}
        </button>
        <PublicReportTracker
          locale={locale}
          initialCredentials={{
            reference: receipt.reference,
            trackingToken: receipt.trackingToken,
          }}
          embedded
        />
        <Link
          className="inline-flex rounded-full bg-slate-950 px-5 py-3 font-medium text-white"
          href={`/${locale}/report/track?ref=${encodeURIComponent(receipt.reference)}`}
        >
          {copy.track}
        </Link>
      </section>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">{copy.title}</h1>
        <p className="mt-2 text-slate-600">{copy.intro}</p>
      </div>
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        {copy.staticSafetyNotice}
      </p>
      <dl className="grid gap-3 rounded-2xl bg-sky-50 p-5 sm:grid-cols-2">
        <div><dt className="text-xs font-semibold uppercase text-sky-700">{copy.site}</dt><dd className="mt-1 font-medium">{placement.siteLabel}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-sky-700">{copy.zone}</dt><dd className="mt-1 font-medium">{zoneLabel}</dd></div>
      </dl>
      <Field label={copy.category}>
        <select aria-label={copy.category} value={category} onChange={(event) => setCategory(event.target.value as PublicReportCategory)} className="input">
          {PUBLIC_REPORT_CATEGORIES.map((value) => <option key={value} value={value}>{copy.categories[value]}</option>)}
        </select>
      </Field>
      <Field label={copy.location}><input aria-label={copy.location} value={locationDetail} onChange={(event) => setLocationDetail(event.target.value)} maxLength={240} className="input" /></Field>
      <Field label={copy.description}><textarea autoFocus aria-label={copy.description} required minLength={10} maxLength={4000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} className="input" /></Field>

      {safety.requiresEmergencyCall && (
        <div role="alert" className="space-y-3 rounded-2xl border-2 border-red-400 bg-red-50 p-5 text-red-950">
          <h2 className="text-lg font-semibold">{copy.emergencyTitle}</h2>
          <p>{copy.emergencyBody}</p>
          <a href="tel:112" className="inline-flex rounded-full bg-red-700 px-5 py-3 font-bold text-white">{copy.call112}</a>
          <label className="flex gap-3 text-sm"><input type="checkbox" checked={safetyAcknowledged} onChange={(event) => setSafetyAcknowledged(event.target.checked)} aria-label={copy.safetyAck} />{copy.safetyAck}</label>
        </div>
      )}

      <Field label={copy.contactKind}>
        <select aria-label={copy.contactKind} value={contactKind} onChange={(event) => { setContactKind(event.target.value as typeof contactKind); setContactValue("") }} className="input">
          <option value="">{copy.noContact}</option><option value="email">{copy.email}</option><option value="phone">{copy.phone}</option>
        </select>
      </Field>
      {contactKind && <Field label={copy.contact}><input aria-label={copy.contact} required type={contactKind === "email" ? "email" : "tel"} value={contactValue} onChange={(event) => setContactValue(event.target.value)} className="input" /></Field>}
      <div className="absolute left-[-10000px]" aria-hidden="true"><label>Company website<input tabIndex={-1} autoComplete="off" value={companyWebsite} onChange={(event) => setCompanyWebsite(event.target.value)} /></label></div>
      <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} aria-label={copy.consent} />
        <span><strong>{copy.consent}:</strong> {copy.consentText}</span>
      </label>
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      <button disabled={submitting || !consent || description.trim().length < 10 || (safety.requiresEmergencyCall && !safetyAcknowledged)} className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {submitting ? copy.submitting : copy.submit}
      </button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2 text-sm font-medium text-slate-800"><span>{label}</span>{children}</label>
}

function ReceiptValue({ label, value, copy }: { label: string; value: string; copy: PublicReportCopy }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard?.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is unavailable (insecure origin / in-app browser); the value stays
      // visible so the user can select and copy it by hand.
    }
  }
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? copy.copied : copy.copyLabel}
        </button>
      </div>
      <code className="mt-2 block break-all text-sm text-slate-950">{value}</code>
    </div>
  )
}
