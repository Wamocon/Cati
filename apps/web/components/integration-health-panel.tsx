"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"
import { useLocale } from "next-intl"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"

type IntegrationState =
  | "live"
  | "degraded"
  | "provider_ready"
  | "blocked"
  | "disabled"

type ProviderHealth = {
  id: string
  service: string
  provider: string
  state: IntegrationState
  evidence: string
  nextAction: string
  fallback: string
  checkedAt: string
  latencyMs: number | null
}

type IntegrationHealthResponse = {
  generatedAt: string
  source: string
  summary: Record<IntegrationState, number>
  providers: ProviderHealth[]
  limitations: string[]
}

const copy = {
  tr: {
    title: "Entegrasyon durumu",
    body: "Her hizmetin gerçek çalışma durumu, kanıtı, sonraki adımı ve güvenli yedeği burada görünür.",
    refresh: "Durumu yenile",
    loading: "Entegrasyon durumu kontrol ediliyor…",
    error: "Entegrasyon durumu şu anda alınamadı.",
    empty: "Gösterilecek entegrasyon bulunamadı.",
    checked: "Son kontrol",
    source: "Kaynak",
    next: "Sonraki adım",
    fallback: "Güvenli yedek",
    limitations: "Bu kontrolün sınırları",
    live: "Canlı",
    degraded: "Kısıtlı",
    provider_ready: "Sağlayıcıya hazır",
    blocked: "Onay/kimlik bilgisi bekliyor",
    disabled: "Bilerek kapalı",
  },
  en: {
    title: "Integration status",
    body: "See each service's actual operating state, evidence, next action, and safe fallback.",
    refresh: "Refresh status",
    loading: "Checking integration status…",
    error: "Integration status is unavailable right now.",
    empty: "No integrations are available.",
    checked: "Last checked",
    source: "Source",
    next: "Next action",
    fallback: "Safe fallback",
    limitations: "Limits of this check",
    live: "Live",
    degraded: "Degraded",
    provider_ready: "Provider-ready",
    blocked: "Awaiting approval/credentials",
    disabled: "Intentionally disabled",
  },
  de: {
    title: "Integrationsstatus",
    body: "Der tatsächliche Betriebszustand, Nachweis, nächste Schritt und sichere Ersatzweg jedes Dienstes sind sichtbar.",
    refresh: "Status aktualisieren",
    loading: "Integrationsstatus wird geprüft…",
    error: "Der Integrationsstatus ist derzeit nicht verfügbar.",
    empty: "Keine Integrationen verfügbar.",
    checked: "Zuletzt geprüft",
    source: "Quelle",
    next: "Nächster Schritt",
    fallback: "Sicherer Ersatzweg",
    limitations: "Grenzen dieser Prüfung",
    live: "Live",
    degraded: "Eingeschränkt",
    provider_ready: "Anbieterbereit",
    blocked: "Freigabe/Zugangsdaten fehlen",
    disabled: "Bewusst deaktiviert",
  },
  ru: {
    title: "Статус интеграций",
    body: "Здесь показаны реальное состояние сервиса, подтверждение, следующий шаг и безопасный резервный процесс.",
    refresh: "Обновить статус",
    loading: "Проверяем статус интеграций…",
    error: "Статус интеграций сейчас недоступен.",
    empty: "Интеграции не найдены.",
    checked: "Последняя проверка",
    source: "Источник",
    next: "Следующий шаг",
    fallback: "Безопасный резерв",
    limitations: "Ограничения проверки",
    live: "Работает",
    degraded: "Ограничено",
    provider_ready: "Готово к провайдеру",
    blocked: "Ожидает согласования/ключей",
    disabled: "Отключено намеренно",
  },
} as const

function resolveLocale(locale: string): keyof typeof copy {
  return locale === "tr" || locale === "de" || locale === "ru" ? locale : "en"
}

function variant(state: IntegrationState) {
  if (state === "live") return "success"
  if (state === "degraded" || state === "blocked") return "warning"
  if (state === "provider_ready") return "info"
  return "neutral"
}

export function IntegrationHealthPanel() {
  const locale = resolveLocale(useLocale())
  const t = copy[locale]
  const [data, setData] = useState<IntegrationHealthResponse | null>(null)
  const [state, setState] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    setError(null)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10_000)
    try {
      const response = await fetch("/api/site-management/integrations", {
        cache: "no-store",
        signal: controller.signal,
      })
      const payload = (await response.json().catch(() => null)) as
        | (IntegrationHealthResponse & { error?: string })
        | null
      if (!response.ok || !payload) throw new Error(payload?.error || t.error)
      setData(payload)
      setState("success")
    } catch (reason) {
      setState("error")
      setError(
        reason instanceof Error && reason.name !== "AbortError"
          ? reason.message
          : t.error
      )
    } finally {
      window.clearTimeout(timeout)
    }
  }, [t.error])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const checkedAt = data?.generatedAt
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(data.generatedAt))
    : "—"

  return (
    <Card3D glow={false}>
      <section aria-labelledby="integration-health-title" className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2
              id="integration-health-title"
              className="text-base font-black text-card-foreground"
            >
              {t.title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {t.body}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={state === "loading"}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-60"
          >
            <RefreshCw
              className={
                state === "loading"
                  ? "h-4 w-4 animate-spin motion-reduce:animate-none"
                  : "h-4 w-4"
              }
              aria-hidden="true"
            />
            {t.refresh}
          </button>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {state === "loading" && !data ? (
            <p className="flex min-h-16 items-center gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <Clock3 className="h-5 w-5" aria-hidden="true" />
              {t.loading}
            </p>
          ) : null}
          {state === "error" ? (
            <div
              role="alert"
              className="flex min-h-16 items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-800 dark:text-rose-200"
            >
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <p className="break-words">{error || t.error}</p>
            </div>
          ) : null}
        </div>

        {data ? (
          <>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              {(Object.keys(data.summary) as IntegrationState[]).map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-border bg-muted/30 p-3"
                >
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t[item]}
                  </p>
                  <p className="mt-1 text-2xl font-black text-foreground">
                    {data.summary[item]}
                  </p>
                </div>
              ))}
            </div>

            {data.providers.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {data.providers.map((item) => (
                  <article
                    key={item.id}
                    className="min-w-0 rounded-2xl border border-border bg-muted/20 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold tracking-wide break-words text-muted-foreground uppercase">
                          {item.service}
                        </p>
                        <h3 className="mt-1 text-sm font-black break-words text-foreground">
                          {item.provider}
                        </h3>
                      </div>
                      <StatusBadge variant={variant(item.state)}>
                        {t[item.state]}
                      </StatusBadge>
                    </div>
                    <p className="mt-3 text-sm break-words text-foreground">
                      {item.evidence}
                    </p>
                    <dl className="mt-4 space-y-3 text-xs">
                      <div>
                        <dt className="font-bold text-foreground">{t.next}</dt>
                        <dd className="mt-1 break-words text-muted-foreground">
                          {item.nextAction}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-bold text-foreground">
                          {t.fallback}
                        </dt>
                        <dd className="mt-1 break-words text-muted-foreground">
                          {item.fallback}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t.empty}
              </p>
            )}

            <div className="flex flex-col gap-1 rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                {t.checked}: {checkedAt}
              </span>
              <span className="break-all">
                {t.source}: {data.source}
              </span>
            </div>
            <details className="rounded-xl border border-border p-4 text-sm">
              <summary className="cursor-pointer font-bold text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                <span className="inline-flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  {t.limitations}
                </span>
              </summary>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                {data.limitations.map((item) => (
                  <li key={item} className="break-words">
                    {item}
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : null}
      </section>
    </Card3D>
  )
}
