"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react"
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDot,
  Database,
  FileKey2,
  Link2,
  LoaderCircle,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react"
import { useLocale } from "next-intl"
import {
  buyerSourceKeys,
  buyerStageKeys,
  getBuyerPipelineCopy,
  resolveBuyerPipelineLocale,
  type BuyerConsentKey,
  type BuyerSourceKey,
  type BuyerStageKey,
} from "@/lib/buyer-pipeline-copy"
import type {
  BuyerConversion,
  BuyerNote,
  BuyerPipelineData,
  BuyerStageEvent,
} from "@/lib/buyer-pipeline-repository"
import { createClient } from "@/lib/supabase/client"

const buyerApi = "/api/site-management/buyer-pipeline"
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const digestPattern = /^[0-9a-f]{64}$/i

const transitions: Record<BuyerStageKey, BuyerStageKey[]> = {
  new: ["contacted", "lost"],
  contacted: ["qualified", "lost"],
  qualified: ["viewing", "offer", "lost"],
  viewing: ["offer", "lost"],
  offer: ["reservation", "lost"],
  reservation: ["due_diligence", "lost"],
  due_diligence: ["won", "lost"],
  won: [],
  lost: [],
}

type CreateDraft = {
  fullName: string
  email: string
  phone: string
  siteId: string
  unitId: string
  assignedManagerId: string
  source: BuyerSourceKey
  sourceDetail: string
  preferredLocale: "tr" | "en" | "de" | "ru"
  followUpAt: string
  consentStatus: BuyerConsentKey
  consentVersion: string
  consentTextDigest: string
  interestUnitIds: string[]
}

type EditDraft = {
  email: string
  phone: string
  assignedManagerId: string
  preferredLocale: "tr" | "en" | "de" | "ru"
  followUpAt: string
  sourceDetail: string
  consentStatus: BuyerConsentKey
  consentVersion: string
  consentTextDigest: string
  interestUnitIds: string[]
}

function initialCreate(locale: "tr" | "en" | "de" | "ru"): CreateDraft {
  return {
    fullName: "",
    email: "",
    phone: "",
    siteId: "",
    unitId: "",
    assignedManagerId: "",
    source: "website",
    sourceDetail: "",
    preferredLocale: locale,
    followUpAt: "",
    consentStatus: "pending",
    consentVersion: "",
    consentTextDigest: "",
    interestUnitIds: [],
  }
}

function commandKey(purpose: string) {
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `buyer-ui:${purpose}:${token}`
}

function dateLabel(value: string | null, locale: string) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function localDateTime(value: string | null) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  const offset = parsed.getTimezoneOffset() * 60_000
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16)
}

function isoDate(value: string) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function stageClass(stage: BuyerStageKey) {
  if (stage === "won")
    return "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
  if (stage === "lost")
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
  if (stage === "reservation" || stage === "due_diligence")
    return "border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-200"
  return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
}

function consentClass(consent: BuyerConsentKey) {
  if (consent === "granted")
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (consent === "withdrawn")
    return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300"
  return "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200"
}

function overdue(value: string | null) {
  return Boolean(
    value &&
    Number.isFinite(Date.parse(value)) &&
    Date.parse(value) < Date.now()
  )
}

async function responseMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: unknown }
    return typeof payload.error === "string" && payload.error.trim()
      ? payload.error
      : fallback
  } catch {
    return fallback
  }
}

const fieldClass =
  "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
const labelClass =
  "grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground"

function StagePill({ stage, label }: { stage: BuyerStageKey; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black tracking-[0.08em] uppercase ${stageClass(stage)}`}
    >
      {label}
    </span>
  )
}

function UnavailablePanel({
  workspace,
  copy,
}: {
  workspace: BuyerPipelineData
  copy: ReturnType<typeof getBuyerPipelineCopy>
}) {
  const detail =
    workspace.unavailableReason === "site_scope_required"
      ? copy.unavailableSite
      : workspace.unavailableReason === "company_scope_required"
        ? copy.unavailableCompany
        : copy.unavailableRealAuth
  return (
    <section
      className="rounded-[1.75rem] border border-amber-500/25 bg-amber-500/[0.06] p-6 shadow-sm"
      aria-labelledby="buyer-unavailable-title"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <div className="max-w-3xl">
          <h2
            id="buyer-unavailable-title"
            className="text-lg font-black text-foreground"
          >
            {copy.unavailableTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {detail}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {copy.unavailableNote}
          </p>
        </div>
      </div>
    </section>
  )
}

export function BuyerPipelineWorkspace() {
  const rawLocale = useLocale()
  const locale = resolveBuyerPipelineLocale(rawLocale)
  const copy = getBuyerPipelineCopy(locale)
  const [workspace, setWorkspace] = useState<BuyerPipelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createDraft, setCreateDraft] = useState<CreateDraft>(() =>
    initialCreate(locale)
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<BuyerStageKey | "all">("all")
  const [query, setQuery] = useState("")
  const [saving, setSaving] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [nextStage, setNextStage] = useState<BuyerStageKey | "">("")
  const [lossReason, setLossReason] = useState("")
  const [note, setNote] = useState("")
  const [targetType, setTargetType] = useState<
    "registration_request" | "reservation"
  >("registration_request")
  const [targetId, setTargetId] = useState("")

  const loadWorkspace = useCallback(
    async (quiet = false) => {
      if (!quiet) setRefreshing(true)
      try {
        const response = await fetch(`${buyerApi}?limit=150`, {
          cache: "no-store",
          credentials: "same-origin",
        })
        if (!response.ok)
          throw new Error(await responseMessage(response, copy.loadError))
        const data = (await response.json()) as BuyerPipelineData
        setWorkspace(data)
        setError(null)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : copy.loadError)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [copy.loadError]
  )

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadWorkspace(true))
    return () => window.cancelAnimationFrame(frame)
  }, [loadWorkspace])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadWorkspace(true)
    }, 30_000)
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadWorkspace(true)
    }
    document.addEventListener("visibilitychange", onVisibility)

    const configured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    if (!configured)
      return () => {
        window.clearInterval(timer)
        document.removeEventListener("visibilitychange", onVisibility)
      }

    const client = createClient()
    const changed = () => void loadWorkspace(true)
    let channel = client.channel("buyer-pipeline-ui")
    for (const table of [
      "buyer_prospects",
      "buyer_prospect_interests",
      "buyer_prospect_stage_events",
      "buyer_prospect_notes",
      "buyer_prospect_conversion_links",
    ]) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        changed
      )
    }
    channel.subscribe()
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
      void client.removeChannel(channel)
    }
  }, [loadWorkspace])

  useEffect(() => {
    if (!workspace?.sites.length || !workspace.managers.length) return
    const frame = window.requestAnimationFrame(() => {
      setCreateDraft((current) => ({
        ...current,
        siteId: workspace.sites.some((site) => site.id === current.siteId)
          ? current.siteId
          : workspace.sites[0].id,
        unitId: (workspace.units ?? []).some(
          (unit) =>
            unit.id === current.unitId &&
            unit.siteId ===
              (workspace.sites.some((site) => site.id === current.siteId)
                ? current.siteId
                : workspace.sites[0].id)
        )
          ? current.unitId
          : "",
        assignedManagerId: workspace.managers.some(
          (manager) => manager.id === current.assignedManagerId
        )
          ? current.assignedManagerId
          : workspace.managers[0].id,
      }))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [workspace?.managers, workspace?.sites, workspace?.units])

  useEffect(() => {
    const prospects = workspace?.prospects ?? []
    const frame = window.requestAnimationFrame(() => {
      if (!prospects.length) {
        setSelectedId(null)
        return
      }
      if (
        !selectedId ||
        !prospects.some((prospect) => prospect.id === selectedId)
      )
        setSelectedId(prospects[0].id)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selectedId, workspace?.prospects])

  const selected =
    workspace?.prospects.find((prospect) => prospect.id === selectedId) ?? null

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!selected) {
        setEditDraft(null)
        return
      }
      setEditDraft({
        email: selected.email ?? "",
        phone: selected.phone ?? "",
        assignedManagerId: selected.assignedManagerId,
        preferredLocale: selected.preferredLocale,
        followUpAt: localDateTime(selected.followUpAt),
        sourceDetail: selected.sourceDetail ?? "",
        consentStatus: selected.consentStatus,
        consentVersion: "",
        consentTextDigest: "",
        interestUnitIds: (workspace?.interests ?? [])
          .filter(
            (interest) =>
              interest.prospectId === selected.id && interest.unitId
          )
          .sort((a, b) => a.priority - b.priority)
          .map((interest) => interest.unitId as string)
          .slice(0, 20),
      })
      setNextStage(transitions[selected.stage][0] ?? "")
      setLossReason("")
      setNote("")
      setTargetId("")
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selected, workspace?.interests])

  const stageCounts = useMemo(
    () =>
      Object.fromEntries(
        buyerStageKeys.map((stage) => [
          stage,
          workspace?.prospects.filter((prospect) => prospect.stage === stage)
            .length ?? 0,
        ])
      ) as Record<BuyerStageKey, number>,
    [workspace?.prospects]
  )

  const visibleProspects = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale)
    return (workspace?.prospects ?? []).filter((prospect) => {
      if (stageFilter !== "all" && prospect.stage !== stageFilter) return false
      if (!normalized) return true
      return [
        prospect.fullName,
        prospect.email,
        prospect.phone,
        prospect.siteName,
        prospect.siteCode,
        prospect.unitLabel,
        prospect.assignedManagerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase(locale)
        .includes(normalized)
    })
  }, [locale, query, stageFilter, workspace?.prospects])

  const selectedNotes = useMemo(
    () =>
      (workspace?.notes ?? []).filter((item) => item.prospectId === selectedId),
    [selectedId, workspace?.notes]
  )
  const selectedEvents = useMemo(
    () =>
      (workspace?.stageEvents ?? []).filter(
        (item) => item.prospectId === selectedId
      ),
    [selectedId, workspace?.stageEvents]
  )
  const selectedConversions = useMemo(
    () =>
      (workspace?.conversions ?? []).filter(
        (item) => item.prospectId === selectedId
      ),
    [selectedId, workspace?.conversions]
  )
  const createUnits = useMemo(
    () =>
      (workspace?.units ?? []).filter(
        (unit) => unit.siteId === createDraft.siteId
      ),
    [createDraft.siteId, workspace?.units]
  )
  const selectedUnits = useMemo(
    () =>
      (workspace?.units ?? []).filter(
        (unit) => unit.siteId === selected?.siteId
      ),
    [selected?.siteId, workspace?.units]
  )
  const needsConsentEvidence = Boolean(
    selected?.consentStatus === "pending" &&
      editDraft?.consentStatus === "granted"
  )
  const editConsentOptions: BuyerConsentKey[] =
    selected?.consentStatus === "pending"
      ? ["pending", "granted"]
      : selected?.consentStatus === "granted"
        ? ["granted", "withdrawn"]
        : ["withdrawn"]
  const canMutate =
    workspace?.source === "supabase-live" && workspace.mutationAvailable

  async function persist(
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
    purpose: string,
    success: string,
    expectedVersion?: number
  ) {
    if (!canMutate || saving) return false
    setSaving(purpose)
    setError(null)
    setNotice(null)
    const key = commandKey(purpose)
    try {
      const response = await fetch(buyerApi, {
        method,
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
          ...(expectedVersion ? { "If-Match": `"${expectedVersion}"` } : {}),
        },
        body: JSON.stringify({
          ...body,
          idempotencyKey: key,
          ...(expectedVersion ? { expectedVersion } : {}),
        }),
      })
      if (!response.ok)
        throw new Error(await responseMessage(response, copy.mutationError))
      const result = (await response.json().catch(() => ({}))) as {
        duplicate?: boolean
      }
      setNotice(result.duplicate === true ? copy.duplicateNotice : success)
      await loadWorkspace(true)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.mutationError)
      return false
    } finally {
      setSaving(null)
    }
  }

  async function createProspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !createDraft.fullName.trim() ||
      (!createDraft.email.trim() && !createDraft.phone.trim())
    ) {
      setError(copy.validationContact)
      return
    }
    if (
      createDraft.consentStatus === "granted" &&
      (!createDraft.consentVersion.trim() ||
        !digestPattern.test(createDraft.consentTextDigest.trim()))
    ) {
      setError(copy.validationConsent)
      return
    }
    const created = await persist(
      "POST",
      {
        fullName: createDraft.fullName.trim(),
        email: createDraft.email.trim() || null,
        phone: createDraft.phone.trim() || null,
        source: createDraft.source,
        sourceDetail: createDraft.sourceDetail.trim() || null,
        siteId: createDraft.siteId,
        unitId: createDraft.unitId || null,
        assignedManagerId: createDraft.assignedManagerId,
        followUpAt: isoDate(createDraft.followUpAt),
        consentStatus: createDraft.consentStatus,
        consentVersion: createDraft.consentVersion.trim() || null,
        consentTextDigest:
          createDraft.consentTextDigest.trim().toLowerCase() || null,
        preferredLocale: createDraft.preferredLocale,
      },
      "create",
      copy.createSuccess
    )
    if (created) {
      setCreateDraft((current) => ({
        ...initialCreate(locale),
        siteId: current.siteId,
        assignedManagerId: current.assignedManagerId,
      }))
      setShowCreate(false)
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !editDraft) return
    if (!editDraft.email.trim() && !editDraft.phone.trim()) {
      setError(copy.validationContact)
      return
    }
    if (
      selected.consentStatus === "pending" &&
      editDraft.consentStatus === "granted" &&
      (!editDraft.consentVersion.trim() ||
        !digestPattern.test(editDraft.consentTextDigest.trim()))
    ) {
      setError(copy.validationConsent)
      return
    }
    await persist(
      "PATCH",
      {
        action: "update",
        prospectId: selected.id,
        email: editDraft.email.trim() || null,
        phone: editDraft.phone.trim() || null,
        assignedManagerId: editDraft.assignedManagerId,
        followUpAt: isoDate(editDraft.followUpAt),
        sourceDetail: editDraft.sourceDetail.trim() || null,
        consentStatus: editDraft.consentStatus,
        consentVersion: needsConsentEvidence
          ? editDraft.consentVersion.trim()
          : null,
        consentTextDigest: needsConsentEvidence
          ? editDraft.consentTextDigest.trim().toLowerCase()
          : null,
        preferredLocale: editDraft.preferredLocale,
        interestUnitIds: editDraft.interestUnitIds,
      },
      `update:${selected.id}`,
      copy.updateSuccess,
      selected.version
    )
  }

  async function moveStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !nextStage) return
    if (nextStage === "lost" && lossReason.trim().length < 3) {
      setError(copy.validationLoss)
      return
    }
    await persist(
      "PATCH",
      {
        action: "transition",
        prospectId: selected.id,
        toStage: nextStage,
        reason: lossReason.trim() || null,
      },
      `transition:${selected.id}:${nextStage}`,
      copy.transitionSuccess,
      selected.version
    )
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || note.trim().length < 2) return
    const saved = await persist(
      "PATCH",
      {
        action: "note",
        prospectId: selected.id,
        body: note.trim(),
      },
      `note:${selected.id}`,
      copy.noteSuccess,
      selected.version
    )
    if (saved) setNote("")
  }

  async function linkExisting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !uuidPattern.test(targetId.trim())) {
      setError(copy.validationTarget)
      return
    }
    const linked = await persist(
      "PATCH",
      {
        action: "convert",
        prospectId: selected.id,
        targetType,
        targetId: targetId.trim(),
      },
      `link:${selected.id}:${targetType}`,
      copy.linkSuccess,
      selected.version
    )
    if (linked) setTargetId("")
  }

  const handoffEligible =
    selected &&
    (targetType === "registration_request"
      ? selected.stage === "won" &&
        selected.consentStatus === "granted" &&
        Boolean(selected.email && selected.unitId)
      : ["reservation", "due_diligence", "won"].includes(selected.stage) &&
        Boolean(selected.unitId))

  return (
    <div className="space-y-6 pb-12">
      <header className="relative overflow-hidden rounded-[2rem] border border-slate-800/50 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_80px_-48px_rgba(2,132,199,0.85)] sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black tracking-[0.24em] text-cyan-300 uppercase">
              {copy.kicker}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              {copy.intro}
            </p>
          </div>
          <div className="flex max-w-2xl flex-wrap gap-2">
            <span className="inline-flex max-w-sm items-start gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-200">
              <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="block text-xs font-bold">
                  {copy.localAuthority}
                </span>
                <span className="mt-0.5 block text-[10px] leading-4 text-emerald-100/75">
                  {copy.localAuthorityDetail}
                </span>
              </span>
            </span>
            <span className="inline-flex max-w-sm items-start gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-amber-100">
              <CircleDot className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="block text-xs font-bold">
                  {copy.twentyReady}
                </span>
                <span className="mt-0.5 block text-[10px] leading-4 text-amber-100/75">
                  {copy.twentyDisconnected}
                </span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => void loadWorkspace()}
              disabled={refreshing}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              {copy.refresh}
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-200"
        >
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200"
        >
          <Check className="h-4 w-4" aria-hidden />
          {notice}
        </div>
      ) : null}

      {loading ? (
        <div
          className="flex min-h-52 items-center justify-center rounded-[1.75rem] border border-border bg-card text-sm font-semibold text-muted-foreground"
          role="status"
        >
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" aria-hidden />
          {copy.loading}
        </div>
      ) : !workspace ? (
        <div className="rounded-[1.75rem] border border-border bg-card p-6 text-sm text-muted-foreground">
          {copy.loadError}
        </div>
      ) : workspace.source !== "supabase-live" ? (
        <UnavailablePanel workspace={workspace} copy={copy} />
      ) : (
        <>
          <section
            className="rounded-[1.75rem] border border-border bg-card p-4 shadow-sm sm:p-5"
            aria-labelledby="buyer-stage-rail"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="buyer-stage-rail"
                  className="text-sm font-black tracking-[0.12em] text-foreground uppercase"
                >
                  {copy.stageRail}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.generatedAt}: {dateLabel(workspace.generatedAt, locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate((current) => !current)}
                disabled={!canMutate}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-50"
              >
                {showCreate ? (
                  <X className="h-4 w-4" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden />
                )}
                {showCreate ? copy.closeForm : copy.addBuyer}
              </button>
            </div>
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStageFilter("all")}
                  aria-pressed={stageFilter === "all"}
                  className={`min-h-12 rounded-xl border px-4 text-left text-xs font-black transition ${stageFilter === "all" ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
                >
                  {copy.allStages}
                  <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5">
                    {workspace.prospects.length}
                  </span>
                </button>
                {buyerStageKeys.map((stage, index) => (
                  <div key={stage} className="flex items-center gap-2">
                    {index ? (
                      <ChevronRight
                        className="h-4 w-4 text-border"
                        aria-hidden
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setStageFilter(stage)}
                      aria-pressed={stageFilter === stage}
                      aria-label={`${copy.stageLabels[stage]}: ${stageCounts[stage]}`}
                      className={`min-h-12 rounded-xl border px-4 text-left transition ${stageFilter === stage ? stageClass(stage) : "border-border bg-background text-muted-foreground hover:border-sky-500/40 hover:text-foreground"}`}
                    >
                      <span className="block text-[10px] font-black tracking-[0.08em] uppercase">
                        {copy.stageLabels[stage]}
                      </span>
                      <span className="mt-0.5 block text-sm font-black">
                        {stageCounts[stage]}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {showCreate ? (
            <form
              onSubmit={createProspect}
              className="rounded-[1.75rem] border border-sky-500/25 bg-card p-5 shadow-[0_20px_60px_-48px_rgba(2,132,199,0.8)] sm:p-6"
              aria-labelledby="create-buyer-title"
            >
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-600">
                  <UserRoundCheck className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2
                    id="create-buyer-title"
                    className="text-lg font-black text-foreground"
                  >
                    {copy.createTitle}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {copy.createIntro}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className={labelClass}>
                  {copy.name}
                  <input
                    className={fieldClass}
                    value={createDraft.fullName}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        fullName: event.target.value,
                      })
                    }
                    required
                    maxLength={120}
                    autoComplete="name"
                  />
                </label>
                <label className={labelClass}>
                  {copy.email}
                  <input
                    className={fieldClass}
                    type="email"
                    value={createDraft.email}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        email: event.target.value,
                      })
                    }
                    maxLength={254}
                    autoComplete="email"
                  />
                </label>
                <label className={labelClass}>
                  {copy.phone}
                  <input
                    className={fieldClass}
                    type="tel"
                    value={createDraft.phone}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        phone: event.target.value,
                      })
                    }
                    maxLength={40}
                    autoComplete="tel"
                  />
                </label>
                <label className={labelClass}>
                  {copy.site}
                  <select
                    className={fieldClass}
                    value={createDraft.siteId}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        siteId: event.target.value,
                        unitId: "",
                      })
                    }
                    required
                  >
                    {workspace.sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                        {site.code ? ` · ${site.code}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  {copy.primaryUnit}
                  <select
                    className={fieldClass}
                    value={createDraft.unitId}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        unitId: event.target.value,
                      })
                    }
                  >
                    <option value="">{copy.noPrimaryUnit}</option>
                    {createUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  {copy.manager}
                  <select
                    className={fieldClass}
                    value={createDraft.assignedManagerId}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        assignedManagerId: event.target.value,
                      })
                    }
                    required
                  >
                    {workspace.managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  {copy.source}
                  <select
                    className={fieldClass}
                    value={createDraft.source}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        source: event.target.value as BuyerSourceKey,
                      })
                    }
                  >
                    {buyerSourceKeys.map((source) => (
                      <option key={source} value={source}>
                        {copy.sourceLabels[source]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  {copy.sourceDetail}
                  <input
                    className={fieldClass}
                    value={createDraft.sourceDetail}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        sourceDetail: event.target.value,
                      })
                    }
                    maxLength={500}
                  />
                </label>
                <label className={labelClass}>
                  {copy.followUp}
                  <input
                    className={fieldClass}
                    type="datetime-local"
                    value={createDraft.followUpAt}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        followUpAt: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  {copy.preferredLocale}
                  <select
                    className={fieldClass}
                    value={createDraft.preferredLocale}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        preferredLocale: event.target
                          .value as CreateDraft["preferredLocale"],
                      })
                    }
                  >
                    {["tr", "en", "de", "ru"].map((value) => (
                      <option key={value} value={value}>
                        {value.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  {copy.consent}
                  <select
                    className={fieldClass}
                    value={createDraft.consentStatus}
                    onChange={(event) =>
                      setCreateDraft({
                        ...createDraft,
                        consentStatus: event.target.value as BuyerConsentKey,
                      })
                    }
                  >
                    {(["pending", "granted"] as const).map((value) => (
                      <option key={value} value={value}>
                        {copy.consentLabels[value]}
                      </option>
                    ))}
                  </select>
                  <span className="tracking-normal text-muted-foreground normal-case">
                    {createDraft.consentStatus === "granted"
                      ? copy.consentEvidenceHint
                      : copy.consentPendingHint}
                  </span>
                </label>
                {createDraft.consentStatus === "granted" ? (
                  <>
                    <label className={labelClass}>
                      {copy.consentVersion}
                      <input
                        className={fieldClass}
                        value={createDraft.consentVersion}
                        onChange={(event) =>
                          setCreateDraft({
                            ...createDraft,
                            consentVersion: event.target.value,
                          })
                        }
                        maxLength={80}
                        required
                      />
                    </label>
                    <label className={`${labelClass} md:col-span-2`}>
                      {copy.consentDigest}
                      <input
                        className={`${fieldClass} font-mono text-xs`}
                        value={createDraft.consentTextDigest}
                        onChange={(event) =>
                          setCreateDraft({
                            ...createDraft,
                            consentTextDigest: event.target.value,
                          })
                        }
                        minLength={64}
                        maxLength={64}
                        pattern="[0-9a-fA-F]{64}"
                        required
                      />
                    </label>
                  </>
                ) : null}
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={
                    saving !== null ||
                    !workspace.sites.length ||
                    !workspace.managers.length
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-black text-white transition hover:bg-sky-500 disabled:opacity-50"
                >
                  {saving === "create" ? (
                    <LoaderCircle
                      className="h-4 w-4 animate-spin"
                      aria-hidden
                    />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden />
                  )}
                  {saving === "create" ? copy.creating : copy.create}
                </button>
              </div>
            </form>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.45fr)]">
            <section
              className="min-w-0 rounded-[1.75rem] border border-border bg-card p-4 shadow-sm"
              aria-labelledby="buyer-list-title"
            >
              <div className="flex items-center justify-between gap-3">
                <h2
                  id="buyer-list-title"
                  className="text-lg font-black text-foreground"
                >
                  {copy.pipeline}
                </h2>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-black text-muted-foreground">
                  {visibleProspects.length}
                </span>
              </div>
              <label className="relative mt-4 block">
                <span className="sr-only">{copy.search}</span>
                <Search
                  className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                <input
                  className={`${fieldClass} pl-9`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.search}
                  type="search"
                />
              </label>
              <div className="mt-4 max-h-[58rem] space-y-3 overflow-y-auto pr-1">
                {visibleProspects.length ? (
                  visibleProspects.map((prospect) => (
                    <button
                      key={prospect.id}
                      type="button"
                      onClick={() => setSelectedId(prospect.id)}
                      aria-pressed={selectedId === prospect.id}
                      className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === prospect.id ? "border-sky-500/50 bg-sky-500/[0.07] shadow-sm" : "border-border bg-background hover:border-sky-500/30"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <StagePill
                          stage={prospect.stage}
                          label={copy.stageLabels[prospect.stage]}
                        />
                        <span className="text-[10px] font-black tracking-[0.08em] text-muted-foreground uppercase">
                          v{prospect.version}
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-black text-foreground">
                        {prospect.fullName}
                      </h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {prospect.email ?? prospect.phone ?? "-"}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" aria-hidden />
                          {prospect.siteName}
                        </span>
                        <span
                          className={`inline-flex items-center justify-end gap-1.5 ${overdue(prospect.followUpAt) ? "font-bold text-rose-600" : "text-muted-foreground"}`}
                        >
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                          {dateLabel(prospect.followUpAt, locale)}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {workspace.prospects.length
                      ? copy.noMatch
                      : copy.emptyPipeline}
                  </div>
                )}
              </div>
            </section>

            <section
              className="min-w-0 rounded-[1.75rem] border border-border bg-card p-4 shadow-sm sm:p-6"
              aria-labelledby="buyer-workbench-title"
            >
              {!selected || !editDraft ? (
                <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
                  {copy.selectBuyer}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black tracking-[0.16em] text-sky-600 uppercase">
                        {copy.buyerDesk}
                      </p>
                      <h2
                        id="buyer-workbench-title"
                        className="mt-2 text-2xl font-black tracking-[-0.03em] text-foreground"
                      >
                        {selected.fullName}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        {copy.buyerDeskIntro}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StagePill
                        stage={selected.stage}
                        label={copy.stageLabels[selected.stage]}
                      />
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${consentClass(selected.consentStatus)}`}
                      >
                        {copy.consentLabels[selected.consentStatus]}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 border-b border-border py-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-muted/45 p-3">
                      <p className="text-[10px] font-black tracking-[0.1em] text-muted-foreground uppercase">
                        {copy.site}
                      </p>
                      <p className="mt-1 text-sm font-bold text-foreground">
                        {selected.siteName}
                        {selected.siteCode ? ` · ${selected.siteCode}` : ""}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/45 p-3">
                      <p className="text-[10px] font-black tracking-[0.1em] text-muted-foreground uppercase">
                        {copy.assignedTo}
                      </p>
                      <p className="mt-1 text-sm font-bold text-foreground">
                        {selected.assignedManagerName ??
                          selected.assignedManagerId.slice(0, 8)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/45 p-3">
                      <p className="text-[10px] font-black tracking-[0.1em] text-muted-foreground uppercase">
                        {copy.unit}
                      </p>
                      <p className="mt-1 text-sm font-bold text-foreground">
                        {selected.unitLabel ?? copy.noUnit}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/45 p-3">
                      <p className="text-[10px] font-black tracking-[0.1em] text-muted-foreground uppercase">
                        {copy.lastUpdated} · {copy.version} {selected.version}
                      </p>
                      <p className="mt-1 text-sm font-bold text-foreground">
                        {dateLabel(selected.updatedAt, locale)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 py-5 lg:grid-cols-2">
                    <form
                      onSubmit={moveStage}
                      className="rounded-2xl border border-border bg-background p-4"
                      aria-labelledby="buyer-transition-title"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowRight
                          className="h-4 w-4 text-sky-600"
                          aria-hidden
                        />
                        <h3
                          id="buyer-transition-title"
                          className="text-sm font-black text-foreground"
                        >
                          {copy.nextStep}
                        </h3>
                      </div>
                      {transitions[selected.stage].length ? (
                        <>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {transitions[selected.stage].map((stage) => (
                              <button
                                key={stage}
                                type="button"
                                onClick={() => setNextStage(stage)}
                                aria-pressed={nextStage === stage}
                                className={`rounded-xl border px-3 py-2 text-xs font-black transition ${nextStage === stage ? stageClass(stage) : "border-border text-muted-foreground"}`}
                              >
                                {copy.stageLabels[stage]}
                              </button>
                            ))}
                          </div>
                          {nextStage === "lost" ? (
                            <label className={`${labelClass} mt-4`}>
                              {copy.lossReason}
                              <input
                                className={fieldClass}
                                value={lossReason}
                                onChange={(event) =>
                                  setLossReason(event.target.value)
                                }
                                minLength={3}
                                maxLength={1000}
                                required
                              />
                            </label>
                          ) : null}
                          <button
                            type="submit"
                            disabled={!nextStage || saving !== null}
                            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-xs font-black text-background disabled:opacity-50"
                          >
                            {saving?.startsWith("transition:") ? (
                              <LoaderCircle
                                className="h-4 w-4 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <ChevronRight className="h-4 w-4" aria-hidden />
                            )}
                            {copy.transition}
                          </button>
                        </>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">
                          {copy.terminalStage}
                        </p>
                      )}
                    </form>

                    <form
                      onSubmit={saveNote}
                      className="rounded-2xl border border-border bg-background p-4"
                      aria-labelledby="buyer-note-title"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquarePlus
                          className="h-4 w-4 text-sky-600"
                          aria-hidden
                        />
                        <h3
                          id="buyer-note-title"
                          className="text-sm font-black text-foreground"
                        >
                          {copy.noteTitle}
                        </h3>
                      </div>
                      <label className="mt-4 block">
                        <span className="sr-only">{copy.noteTitle}</span>
                        <textarea
                          className={`${fieldClass} min-h-24 py-3`}
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder={copy.notePlaceholder}
                          minLength={2}
                          maxLength={4000}
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={note.trim().length < 2 || saving !== null}
                        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-xs font-black text-background disabled:opacity-50"
                      >
                        {saving?.startsWith("note:") ? (
                          <LoaderCircle
                            className="h-4 w-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Plus className="h-4 w-4" aria-hidden />
                        )}
                        {copy.addNote}
                      </button>
                    </form>
                  </div>

                  <form
                    onSubmit={saveProfile}
                    className="border-t border-border py-5"
                    aria-labelledby="buyer-profile-title"
                  >
                    <div className="mb-4 flex items-center gap-2">
                      <UsersRound
                        className="h-4 w-4 text-sky-600"
                        aria-hidden
                      />
                      <h3
                        id="buyer-profile-title"
                        className="text-sm font-black text-foreground"
                      >
                        {copy.contact}
                      </h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <label className={labelClass}>
                        {copy.email}
                        <input
                          className={fieldClass}
                          type="email"
                          value={editDraft.email}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              email: event.target.value,
                            })
                          }
                          maxLength={254}
                        />
                      </label>
                      <label className={labelClass}>
                        {copy.phone}
                        <input
                          className={fieldClass}
                          type="tel"
                          value={editDraft.phone}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              phone: event.target.value,
                            })
                          }
                          maxLength={40}
                        />
                      </label>
                      <label className={labelClass}>
                        {copy.manager}
                        <select
                          className={fieldClass}
                          value={editDraft.assignedManagerId}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              assignedManagerId: event.target.value,
                            })
                          }
                        >
                          {workspace.managers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={labelClass}>
                        {copy.followUp}
                        <input
                          className={fieldClass}
                          type="datetime-local"
                          value={editDraft.followUpAt}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              followUpAt: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className={labelClass}>
                        {copy.preferredLocale}
                        <select
                          className={fieldClass}
                          value={editDraft.preferredLocale}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              preferredLocale: event.target
                                .value as EditDraft["preferredLocale"],
                            })
                          }
                        >
                          {["tr", "en", "de", "ru"].map((value) => (
                            <option key={value} value={value}>
                              {value.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={labelClass}>
                        {copy.sourceDetail}
                        <input
                          className={fieldClass}
                          value={editDraft.sourceDetail}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              sourceDetail: event.target.value,
                            })
                          }
                          maxLength={500}
                        />
                      </label>
                      <label className={`${labelClass} md:col-span-2`}>
                        {copy.unitInterests}
                        <select
                          className={`${fieldClass} min-h-28 py-2`}
                          multiple
                          size={Math.min(Math.max(selectedUnits.length, 3), 8)}
                          value={editDraft.interestUnitIds}
                          aria-describedby="buyer-interest-hint"
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              interestUnitIds: Array.from(
                                event.currentTarget.selectedOptions,
                                (option) => option.value
                              ).slice(0, 20),
                            })
                          }
                        >
                          {selectedUnits.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.label}
                            </option>
                          ))}
                        </select>
                        <span
                          id="buyer-interest-hint"
                          className="tracking-normal text-muted-foreground normal-case"
                        >
                          {copy.unitInterestsHint}
                        </span>
                      </label>
                      <label className={labelClass}>
                        {copy.consent}
                        <select
                          className={fieldClass}
                          value={editDraft.consentStatus}
                          onChange={(event) =>
                            setEditDraft({
                              ...editDraft,
                              consentStatus: event.target
                                .value as BuyerConsentKey,
                            })
                          }
                        >
                          {editConsentOptions.map((value) => (
                              <option key={value} value={value}>
                                {copy.consentLabels[value]}
                              </option>
                            ))}
                        </select>
                      </label>
                      {needsConsentEvidence ? (
                        <>
                          <label className={labelClass}>
                            {copy.consentVersion}
                            <input
                              className={fieldClass}
                              value={editDraft.consentVersion}
                              onChange={(event) =>
                                setEditDraft({
                                  ...editDraft,
                                  consentVersion: event.target.value,
                                })
                              }
                              required
                              maxLength={80}
                            />
                          </label>
                          <label className={labelClass}>
                            {copy.consentDigest}
                            <input
                              className={`${fieldClass} font-mono text-xs`}
                              value={editDraft.consentTextDigest}
                              onChange={(event) =>
                                setEditDraft({
                                  ...editDraft,
                                  consentTextDigest: event.target.value,
                                })
                              }
                              minLength={64}
                              maxLength={64}
                              pattern="[0-9a-fA-F]{64}"
                              required
                            />
                          </label>
                        </>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {needsConsentEvidence
                        ? copy.consentEvidenceHint
                        : selected.consentEvidenceRecorded
                          ? copy.consentEvidenceRetained
                          : copy.consentPendingHint}{" "}
                      {copy.conflictHint}
                    </p>
                    <button
                      type="submit"
                      disabled={saving !== null}
                      className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-black text-white disabled:opacity-50"
                    >
                      {saving?.startsWith("update:") ? (
                        <LoaderCircle
                          className="h-4 w-4 animate-spin"
                          aria-hidden
                        />
                      ) : (
                        <ShieldCheck className="h-4 w-4" aria-hidden />
                      )}
                      {saving?.startsWith("update:")
                        ? copy.saving
                        : copy.saveProfile}
                    </button>
                  </form>

                  <div className="grid gap-5 border-t border-border py-5 lg:grid-cols-2">
                    <form
                      onSubmit={linkExisting}
                      className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-4"
                      aria-labelledby="buyer-handoff-title"
                    >
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-amber-600" aria-hidden />
                        <h3
                          id="buyer-handoff-title"
                          className="text-sm font-black text-foreground"
                        >
                          {copy.handoffTitle}
                        </h3>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {copy.handoffIntro}
                      </p>
                      <div className="mt-4 grid gap-3">
                        <label className={labelClass}>
                          {copy.targetType}
                          <select
                            className={fieldClass}
                            value={targetType}
                            onChange={(event) =>
                              setTargetType(
                                event.target.value as typeof targetType
                              )
                            }
                          >
                            <option value="registration_request">
                              {copy.targetRegistration}
                            </option>
                            <option value="reservation">
                              {copy.targetReservation}
                            </option>
                          </select>
                        </label>
                        <label className={labelClass}>
                          {copy.targetId}
                          <input
                            className={`${fieldClass} font-mono text-xs`}
                            value={targetId}
                            onChange={(event) =>
                              setTargetId(event.target.value)
                            }
                            placeholder="00000000-0000-0000-0000-000000000000"
                          />
                        </label>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        {copy.handoffEligibility}
                      </p>
                      <p className="mt-2 flex items-start gap-2 text-xs leading-5 font-bold text-amber-800 dark:text-amber-200">
                        <FileKey2
                          className="mt-0.5 h-4 w-4 shrink-0"
                          aria-hidden
                        />
                        {copy.noFabrication}
                      </p>
                      <button
                        type="submit"
                        disabled={
                          !handoffEligible ||
                          !uuidPattern.test(targetId.trim()) ||
                          saving !== null
                        }
                        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-600 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {saving?.startsWith("link:") ? (
                          <LoaderCircle
                            className="h-4 w-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Link2 className="h-4 w-4" aria-hidden />
                        )}
                        {copy.linkExisting}
                      </button>
                    </form>

                    <div className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center gap-2">
                        <BadgeCheck
                          className="h-4 w-4 text-sky-600"
                          aria-hidden
                        />
                        <h3 className="text-sm font-black text-foreground">
                          {copy.linkedRecords}
                        </h3>
                      </div>
                      <div className="mt-3 space-y-2">
                        {selectedConversions.length ? (
                          selectedConversions.map(
                            (conversion: BuyerConversion) => (
                              <div
                                key={conversion.id}
                                className="rounded-xl border border-border bg-card p-3"
                              >
                                <p className="text-xs font-black text-foreground">
                                  {conversion.targetType ===
                                  "registration_request"
                                    ? copy.targetRegistration
                                    : copy.targetReservation}
                                </p>
                                <p className="mt-1 font-mono text-[10px] break-all text-muted-foreground">
                                  {conversion.targetId}
                                </p>
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  {copy.version} {conversion.version} ·{" "}
                                  {dateLabel(conversion.createdAt, locale)}
                                </p>
                              </div>
                            )
                          )
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {copy.noLinks}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 border-t border-border pt-5 lg:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-black text-foreground">
                        {copy.noteTitle}
                      </h3>
                      <div className="mt-3 space-y-2">
                        {selectedNotes.length ? (
                          selectedNotes.slice(0, 5).map((item: BuyerNote) => (
                            <div
                              key={item.id}
                              className="rounded-xl bg-muted/45 p-3"
                            >
                              <p className="text-sm leading-5 text-foreground">
                                {item.body}
                              </p>
                              <p className="mt-2 text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                                v{item.version} ·{" "}
                                {dateLabel(item.createdAt, locale)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {copy.noNotes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground">
                        {copy.history}
                      </h3>
                      <div className="mt-3 space-y-2">
                        {selectedEvents
                          .slice(0, 6)
                          .map((event: BuyerStageEvent) => (
                            <div
                              key={event.id}
                              className="flex items-center gap-3 rounded-xl bg-muted/45 p-3"
                            >
                              <StagePill
                                stage={event.toStage}
                                label={copy.stageLabels[event.toStage]}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-foreground">
                                  {event.reason ??
                                    `${event.fromStage ? copy.stageLabels[event.fromStage] : "-"} → ${copy.stageLabels[event.toStage]}`}
                                </p>
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  v{event.version} ·{" "}
                                  {dateLabel(event.createdAt, locale)}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
