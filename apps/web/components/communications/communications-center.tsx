"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  MessageSquarePlus,
  MessageSquareText,
  RefreshCcw,
  UsersRound,
  X,
} from "lucide-react"
import { useLocale } from "next-intl"
import { getCommunicationsCopy } from "@/lib/communications-copy"
import type { CommunicationWorkspace } from "@/lib/communications-repository"
import { createClient } from "@/lib/supabase/client"

type Tab = "threads" | "delivery" | "templates"
type ThreadDraft = {
  siteId: string
  unitId: string
  subject: string
  scopeKind: string
  priority: string
  locale: "tr" | "en" | "de" | "ru"
  participantProfileIds: string[]
}

const createRoleScopes = new Set(["organization", "managed_sites", "finance"])

function communicationLocale(value: string): ThreadDraft["locale"] {
  return value === "en" || value === "de" || value === "ru" ? value : "tr"
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function dateLabel(value: string | null, locale: string) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
}

function requestKey() {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `communication-ui:${random}`
}

export function CommunicationsCenter() {
  const locale = useLocale()
  const copy = getCommunicationsCopy(locale)
  const [workspace, setWorkspace] = useState<CommunicationWorkspace | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("threads")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reply, setReply] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [threadSaving, setThreadSaving] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)
  const [threadSuccess, setThreadSuccess] = useState<string | null>(null)
  const [threadDraft, setThreadDraft] = useState<ThreadDraft>(() => ({
    siteId: "",
    unitId: "",
    subject: "",
    scopeKind: "operational",
    priority: "medium",
    locale: communicationLocale(locale),
    participantProfileIds: [],
  }))
  const markedMessageIds = useRef(new Set<string>())

  const loadWorkspace = useCallback(async (threadId?: string | null, quiet = false) => {
    if (!quiet) setRefreshing(true)
    try {
      const query = new URLSearchParams({ view: "workspace" })
      if (threadId) query.set("threadId", threadId)
      const response = await fetch(`/api/site-management/communications?${query}`, {
        cache: "no-store",
        credentials: "same-origin",
      })
      if (!response.ok) throw new Error("workspace")
      const data = (await response.json()) as CommunicationWorkspace
      setWorkspace(data)
      setThreadDraft((current) => {
        const siteId = data.targets.sites.some((site) => site.id === current.siteId)
          ? current.siteId
          : data.targets.sites[0]?.id ?? ""
        const unitId = data.targets.units.some(
          (unit) => unit.id === current.unitId && unit.siteId === siteId
        )
          ? current.unitId
          : ""
        const scopeKind = data.roleScope === "finance" ? "finance" : current.scopeKind
        if (siteId === current.siteId && unitId === current.unitId && scopeKind === current.scopeKind) {
          return current
        }
        return { ...current, siteId, unitId, scopeKind, participantProfileIds: [] }
      })
      const nextThreadId = threadId ?? data.selectedThread?.thread.id ?? data.threads[0]?.id ?? null
      setSelectedThreadId(nextThreadId)
      setError(null)
      setLoadError(null)
      return data
    } catch {
      setWorkspace(null)
      setLoadError(copy.loadError)
      return null
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [copy.loadError])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadWorkspace(null, true), 0)
    return () => window.clearTimeout(initialLoad)
  }, [loadWorkspace])

  useEffect(() => {
    const timer = window.setInterval(() => void loadWorkspace(selectedThreadId, true), 30_000)
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadWorkspace(selectedThreadId, true)
    }
    document.addEventListener("visibilitychange", onVisibility)

    const configured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    if (!configured) {
      return () => {
        window.clearInterval(timer)
        document.removeEventListener("visibilitychange", onVisibility)
      }
    }

    const client = createClient()
    const changed = () => void loadWorkspace(selectedThreadId, true)
    const realtime = client
      .channel("portal-communications-ui")
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_communication_threads" }, changed)
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_communication_messages" }, changed)
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_communication_message_receipts" }, changed)
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_communication_deliveries" }, changed)
      .on("postgres_changes", { event: "*", schema: "public", table: "portal_communication_outbox" }, changed)
      .subscribe()

    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
      void client.removeChannel(realtime)
    }
  }, [loadWorkspace, selectedThreadId])

  const selected = workspace?.selectedThread?.thread.id === selectedThreadId
    ? workspace.selectedThread
    : workspace?.selectedThread ?? null

  const tabs = useMemo(
    () => [
      { id: "threads" as const, label: copy.threads },
      { id: "delivery" as const, label: copy.delivery },
      { id: "templates" as const, label: copy.templates },
    ],
    [copy.delivery, copy.templates, copy.threads]
  )

  const canCreateThread = Boolean(
    workspace?.mutationAvailable && createRoleScopes.has(workspace.roleScope)
  )
  const availableUnits = useMemo(
    () => workspace?.targets.units.filter((unit) => unit.siteId === threadDraft.siteId) ?? [],
    [threadDraft.siteId, workspace?.targets.units]
  )
  const scopeOptions = useMemo(
    () => workspace?.roleScope === "finance"
      ? [{ value: "finance", label: copy.scopeFinance }]
      : [
          { value: "operational", label: copy.scopeOperational },
          { value: "resident", label: copy.scopeResident },
          { value: "finance", label: copy.scopeFinance },
          { value: "announcement", label: copy.scopeAnnouncement },
        ],
    [copy.scopeAnnouncement, copy.scopeFinance, copy.scopeOperational, copy.scopeResident, workspace?.roleScope]
  )
  const eligibleParticipants = useMemo(() => {
    const unique = new Map<string, NonNullable<CommunicationWorkspace["targets"]["participants"]>[number]>()
    for (const participant of workspace?.targets.participants ?? []) {
      if (participant.siteId !== threadDraft.siteId) continue
      if (participant.unitId && participant.unitId !== threadDraft.unitId) continue
      if ((participant.role === "owner" || participant.role === "tenant") && !threadDraft.unitId) continue
      if (participant.role === "staff" && threadDraft.scopeKind !== "operational") continue
      if (participant.role === "accountant" && threadDraft.scopeKind !== "finance") continue
      unique.set(participant.profileId, participant)
    }
    return Array.from(unique.values()).sort((left, right) =>
      left.displayLabel.localeCompare(right.displayLabel, locale)
    )
  }, [locale, threadDraft.scopeKind, threadDraft.siteId, threadDraft.unitId, workspace?.targets.participants])
  const selectedParticipants = eligibleParticipants.filter((participant) =>
    threadDraft.participantProfileIds.includes(participant.profileId)
  )
  const threadFormValid = Boolean(
    canCreateThread &&
    workspace?.targets.sites.some((site) => site.id === threadDraft.siteId) &&
    threadDraft.subject.trim().length > 0 &&
    threadDraft.subject.trim().length <= 240 &&
    selectedParticipants.length > 0 &&
    selectedParticipants.length === threadDraft.participantProfileIds.length
  )

  function openThreadComposer() {
    if (!canCreateThread) return
    setThreadError(null)
    setThreadSuccess(null)
    setComposerOpen(true)
    setTab("threads")
  }

  function toggleParticipant(profileId: string) {
    const participant = eligibleParticipants.find((item) => item.profileId === profileId)
    if (!participant) return
    setThreadDraft((current) => {
      const selected = current.participantProfileIds.includes(profileId)
      if (selected) {
        return {
          ...current,
          participantProfileIds: current.participantProfileIds.filter((id) => id !== profileId),
        }
      }
      const withoutOtherStaff = participant.role === "staff"
        ? current.participantProfileIds.filter((id) =>
            eligibleParticipants.find((item) => item.profileId === id)?.role !== "staff"
          )
        : current.participantProfileIds
      return { ...current, participantProfileIds: [...withoutOtherStaff, profileId] }
    })
  }

  async function submitThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!threadFormValid || threadSaving) return
    setThreadSaving(true)
    setThreadError(null)
    setThreadSuccess(null)
    const participantProfileIds = selectedParticipants.map((participant) => participant.profileId)
    const assignedProfileId = selectedParticipants.find((participant) => participant.role === "staff")?.profileId ?? null
    try {
      const response = await fetch("/api/site-management/communications", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey(),
        },
        body: JSON.stringify({
          action: "create_thread",
          siteId: threadDraft.siteId,
          unitId: threadDraft.unitId || null,
          subject: threadDraft.subject.trim(),
          scopeKind: threadDraft.scopeKind,
          priority: threadDraft.priority,
          locale: threadDraft.locale,
          assignedProfileId,
          participantProfileIds,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        data?: CommunicationWorkspace
        result?: { threadId?: string }
      }
      if (!response.ok) throw new Error("create-thread")
      const threadId = payload.result?.threadId ?? payload.data?.selectedThread?.thread.id ?? null
      if (payload.data) setWorkspace(payload.data)
      if (threadId) setSelectedThreadId(threadId)
      if (!payload.data) await loadWorkspace(threadId, true)
      setThreadDraft((current) => ({
        ...current,
        subject: "",
        participantProfileIds: [],
      }))
      setComposerOpen(false)
      setThreadSuccess(copy.threadCreateSuccess)
    } catch {
      setThreadError(copy.threadCreateError)
    } finally {
      setThreadSaving(false)
    }
  }

  async function selectThread(threadId: string) {
    setSelectedThreadId(threadId)
    setReply("")
    const data = await loadWorkspace(threadId)
    const unreadMessages = data?.selectedThread?.messages
      .filter((message) => !message.readByCurrentUser && !markedMessageIds.current.has(message.id))
      .slice(0, 25) ?? []
    if (unreadMessages.length === 0) return

    await Promise.all(unreadMessages.map(async (message) => {
      markedMessageIds.current.add(message.id)
      try {
        const response = await fetch("/api/site-management/communications", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": requestKey(),
          },
          body: JSON.stringify({
            action: "mark_read",
            threadId,
            messageId: message.id,
          }),
        })
        if (!response.ok) throw new Error("mark-read")
      } catch {
        markedMessageIds.current.delete(message.id)
      }
    }))
    await loadWorkspace(threadId, true)
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = reply.trim()
    if (!selected || !body || saving) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/site-management/communications", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey(),
        },
        body: JSON.stringify({
          action: "reply",
          threadId: selected.thread.id,
          body,
          channel: "portal",
          locale,
        }),
      })
      if (!response.ok) throw new Error("reply")
      const payload = (await response.json()) as { data?: CommunicationWorkspace }
      if (payload.data) setWorkspace(payload.data)
      setReply("")
    } catch {
      setError(copy.replyError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden pb-10">
      <header className="rounded-3xl border border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">1Çatı</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.intro}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreateThread && workspace?.targets.sites.length ? (
              <button
                type="button"
                onClick={openThreadComposer}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MessageSquarePlus className="h-4 w-4" />
                {copy.newThread}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void loadWorkspace(selectedThreadId)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {copy.refresh}
            </button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Provider status">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            {workspace?.providerBoundary.portal === "live" ? copy.portalLive : copy.portalUnavailable}
          </span>
          <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
            {copy.externalNotConnected}
          </span>
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-border bg-card">
          <LoaderCircle className="h-7 w-7 animate-spin text-primary" aria-label="Loading" />
        </div>
      ) : loadError ? (
        <section role="alert" className="rounded-3xl border border-red-300/60 bg-red-50/70 p-6 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <h2 className="font-black text-foreground">{copy.unavailableTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadWorkspace(selectedThreadId)}
                className="mt-4 min-h-10 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {copy.refresh}
              </button>
            </div>
          </div>
        </section>
      ) : workspace?.source === "unavailable" ? (
        <section className="rounded-3xl border border-amber-300/60 bg-amber-50/70 p-6 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="font-black text-foreground">{copy.unavailableTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.unavailableBody}</p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [copy.threads, workspace?.summary.openThreads ?? 0],
              [copy.unread, workspace?.summary.unreadMessages ?? 0],
              [copy.failed, workspace?.summary.failedDeliveries ?? 0],
              [copy.deadLetter, workspace?.summary.deadLetters ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="min-w-0 rounded-2xl border border-border bg-card p-4">
                <p className="truncate text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-border bg-muted/40 p-1" role="tablist">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`min-h-10 flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tab === item.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {threadSuccess ? (
            <p role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-300/60 bg-emerald-50/70 px-4 py-3 text-sm font-bold text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {threadSuccess}
            </p>
          ) : null}

          {tab === "threads" && composerOpen && canCreateThread ? (
            <section className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-sm" aria-labelledby="new-thread-heading">
              <div className="flex items-start justify-between gap-4 border-b border-border bg-primary/[0.04] p-5 sm:p-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{copy.newThread}</p>
                  <h2 id="new-thread-heading" className="mt-2 text-xl font-black text-foreground">{copy.firstThreadTitle}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.firstThreadBody}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setComposerOpen(false)
                    setThreadError(null)
                  }}
                  aria-label={copy.cancel}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={submitThread} className="space-y-6 p-5 sm:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-black text-foreground">
                    <span>{copy.site}</span>
                    <select
                      value={threadDraft.siteId}
                      onChange={(event) => setThreadDraft((current) => ({
                        ...current,
                        siteId: event.target.value,
                        unitId: "",
                        participantProfileIds: [],
                      }))}
                      required
                      className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">{copy.selectSite}</option>
                      {workspace?.targets.sites.map((site) => (
                        <option key={site.id} value={site.id}>{site.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-black text-foreground">
                    <span>{copy.unitOptional}</span>
                    <select
                      value={threadDraft.unitId}
                      onChange={(event) => setThreadDraft((current) => ({
                        ...current,
                        unitId: event.target.value,
                        participantProfileIds: [],
                      }))}
                      className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">{copy.siteWide}</option>
                      {availableUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block space-y-2 text-sm font-black text-foreground">
                  <span>{copy.subject}</span>
                  <input
                    value={threadDraft.subject}
                    onChange={(event) => setThreadDraft((current) => ({ ...current, subject: event.target.value }))}
                    placeholder={copy.subjectPlaceholder}
                    minLength={1}
                    maxLength={240}
                    required
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-2 text-sm font-black text-foreground">
                    <span>{copy.scope}</span>
                    <select
                      value={threadDraft.scopeKind}
                      onChange={(event) => setThreadDraft((current) => ({
                        ...current,
                        scopeKind: event.target.value,
                        participantProfileIds: [],
                      }))}
                      className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
                    >
                      {scopeOptions.map((scope) => (
                        <option key={scope.value} value={scope.value}>{scope.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-black text-foreground">
                    <span>{copy.priority}</span>
                    <select
                      value={threadDraft.priority}
                      onChange={(event) => setThreadDraft((current) => ({ ...current, priority: event.target.value }))}
                      className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="low">{copy.priorityLow}</option>
                      <option value="medium">{copy.priorityMedium}</option>
                      <option value="high">{copy.priorityHigh}</option>
                      <option value="urgent">{copy.priorityUrgent}</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-black text-foreground">
                    <span>{copy.conversationLanguage}</span>
                    <select
                      value={threadDraft.locale}
                      onChange={(event) => setThreadDraft((current) => ({
                        ...current,
                        locale: communicationLocale(event.target.value),
                      }))}
                      className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="tr">Türkçe</option>
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                      <option value="ru">Русский</option>
                    </select>
                  </label>
                </div>

                <fieldset className="space-y-3" aria-describedby="participant-guidance">
                  <legend className="flex items-center gap-2 text-sm font-black text-foreground">
                    <UsersRound className="h-4 w-4 text-primary" />
                    {copy.participants}
                  </legend>
                  <p id="participant-guidance" className="text-xs leading-5 text-muted-foreground">{copy.participantsHint}</p>
                  {eligibleParticipants.length ? (
                    <div className="grid max-h-64 gap-2 overflow-y-auto rounded-2xl border border-border bg-muted/20 p-2 sm:grid-cols-2">
                      {eligibleParticipants.map((participant) => {
                        const checked = threadDraft.participantProfileIds.includes(participant.profileId)
                        return (
                          <label
                            key={participant.profileId}
                            className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${checked ? "border-primary bg-primary/5" : "border-transparent bg-background hover:border-border"}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleParticipant(participant.profileId)}
                              className="h-4 w-4 shrink-0 accent-primary"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-foreground">{participant.displayLabel}</span>
                              <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{statusLabel(participant.role)}</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-amber-300/60 bg-amber-50/70 p-4 text-sm font-bold leading-6 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
                      {copy.noEligibleParticipants}
                    </p>
                  )}
                </fieldset>

                {threadError ? <p role="alert" className="text-sm font-bold text-destructive">{threadError}</p> : null}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setComposerOpen(false)
                      setThreadError(null)
                    }}
                    className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {copy.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={!threadFormValid || threadSaving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {threadSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                    {threadSaving ? copy.creatingThread : copy.createThread}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {tab === "threads" && (
            <section role="tabpanel" className="grid min-w-0 gap-4 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.7fr)]">
              <div className="min-w-0 rounded-3xl border border-border bg-card p-3">
                <div className="space-y-2">
                  {workspace?.threads.length ? workspace.threads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => void selectThread(thread.id)}
                      aria-pressed={selectedThreadId === thread.id}
                      className={`w-full min-w-0 rounded-2xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedThreadId === thread.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/40 hover:border-border"}`}
                    >
                      <span className="block truncate text-sm font-black text-foreground">{thread.subject}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{thread.lastMessagePreview ?? thread.unitLabel ?? "-"}</span>
                      <span className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        <span>{statusLabel(thread.status)}</span>
                        {thread.unreadCount > 0 && <span className="text-primary">{thread.unreadCount} {copy.unread}</span>}
                      </span>
                    </button>
                  )) : <p className="p-4 text-sm text-muted-foreground">{copy.noThreads}</p>}
                </div>
              </div>

              <div className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-6">
                {selected ? (
                  <div className="min-w-0 space-y-5">
                    <div className="min-w-0 border-b border-border pb-4">
                      <h2 className="truncate text-lg font-black text-foreground">{selected.thread.subject}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selected.participants.map((participant) => participant.displayLabel).join(" · ")}
                      </p>
                    </div>
                    <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1" aria-live="polite">
                      {selected.messages.length ? selected.messages.map((message) => (
                        <article key={message.id} className="min-w-0 rounded-2xl bg-muted/45 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-black text-foreground">{message.senderLabel}</p>
                            <p className="text-[11px] text-muted-foreground">{dateLabel(message.createdAt, locale)}</p>
                          </div>
                          <p className="mt-2 break-words text-sm leading-6 text-foreground">{message.body}</p>
                          {message.attachments.map((attachment) => (
                            <a
                              key={attachment.documentId}
                              href={attachment.fileUrl}
                              className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <FileText className="h-4 w-4 shrink-0" />
                              <span className="truncate">{copy.attachment}</span>
                            </a>
                          ))}
                        </article>
                      )) : <p className="text-sm text-muted-foreground">{copy.noMessages}</p>}
                    </div>
                    {selected.thread.canReply && (
                      <form onSubmit={submitReply} className="space-y-3 border-t border-border pt-4">
                        <label htmlFor="communication-reply" className="text-sm font-black text-foreground">{copy.message}</label>
                        <textarea
                          id="communication-reply"
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          maxLength={10000}
                          rows={4}
                          className="mt-2 w-full resize-y rounded-2xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                        />
                        {error && <p role="alert" className="text-sm font-bold text-destructive">{error}</p>}
                        <button
                          type="submit"
                          disabled={saving || !reply.trim()}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <MessageSquareText className="h-4 w-4" />
                          {saving ? copy.saving : copy.sendPortalReply}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <MessageSquarePlus className="h-6 w-6" />
                    </span>
                    <h2 className="mt-4 text-lg font-black text-foreground">
                      {canCreateThread ? copy.firstThreadTitle : copy.noThreads}
                    </h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                      {canCreateThread
                        ? workspace?.targets.sites.length
                          ? copy.firstThreadBody
                          : copy.noAuthorizedSites
                        : copy.viewOnlyEmpty}
                    </p>
                    {canCreateThread && workspace?.targets.sites.length ? (
                      <button
                        type="button"
                        onClick={openThreadComposer}
                        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <MessageSquarePlus className="h-4 w-4" />
                        {copy.startFirstThread}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === "delivery" && (
            <section role="tabpanel" className="space-y-3 rounded-3xl border border-border bg-card p-4 sm:p-6">
              {workspace?.deliveries.length ? workspace.deliveries.map((delivery) => {
                const outbox = workspace.outbox.find((item) => item.deliveryId === delivery.id)
                return (
                  <article key={delivery.id} className="min-w-0 rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-foreground">{delivery.recipientLabel}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{delivery.channel} · {statusLabel(delivery.state)}</p>
                      </div>
                      {outbox?.status === "dead_letter" && (
                        <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-700 dark:text-red-300">{copy.deadLetter}</span>
                      )}
                    </div>
                    {delivery.lastError && <p className="mt-3 break-words text-sm font-bold text-destructive">{delivery.lastError}</p>}
                    {delivery.nextRetryAt && <p className="mt-2 text-xs text-muted-foreground">{dateLabel(delivery.nextRetryAt, locale)}</p>}
                  </article>
                )
              }) : <p className="text-sm text-muted-foreground">{copy.noDeliveries}</p>}
            </section>
          )}

          {tab === "templates" && (
            <section role="tabpanel" className="grid gap-3 md:grid-cols-2">
              {workspace?.templates.length ? workspace.templates.map((template) => (
                <article key={template.id} className="min-w-0 rounded-3xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="min-w-0 truncate font-black text-foreground">{template.name}</h2>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase text-muted-foreground">{statusLabel(template.status)}</span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{template.channel} · {template.purpose}</p>
                  <p className="mt-4 text-xs font-bold text-foreground">{copy.variants}: {template.variants.map((variant) => variant.locale.toUpperCase()).join(", ")}</p>
                </article>
              )) : <p className="text-sm text-muted-foreground">{copy.noTemplates}</p>}
            </section>
          )}
        </>
      )}
    </div>
  )
}
