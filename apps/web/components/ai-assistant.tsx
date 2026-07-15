"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useLocale, useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Languages,
  ShieldCheck,
} from "lucide-react"
import { useUser } from "@/components/user-provider"
import {
  getAiSuggestions,
  generateAiResponse,
  resolveAiLanguage,
} from "@/lib/ai-responses"
import type { Role } from "@/lib/rbac"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

const assistantCopy = {
  tr: {
    title: "1Çatı Operasyon Asistanı",
    inputLabel: "AI asistana mesaj yaz",
    sameLanguage: "Aynı dilde yanıt",
    humanActions: "İnsan onaylı aksiyon",
    defaultUser: "Operasyon kullanıcısı",
    placeholders: {
      accountant: "Aidat, tahsilat, depozito veya finans raporu sorun...",
      staff: "Atanan servis, saha notu veya rezervasyon işi sorun...",
      resident: "Servis, rezervasyon, belge veya mesaj hakkında sorun...",
    },
  },
  en: {
    title: "1Çatı Operations Assistant",
    inputLabel: "Message the AI assistant",
    sameLanguage: "Same-language replies",
    humanActions: "Human-approved actions",
    defaultUser: "Operations user",
    placeholders: {
      accountant: "Ask about fees, collections, deposits or finance reports...",
      staff: "Ask about assigned service, field notes or reservation work...",
      resident: "Ask about service, reservations, documents or messages...",
    },
  },
  de: {
    title: "1Çatı Betriebsassistent",
    inputLabel: "Nachricht an den KI-Assistenten",
    sameLanguage: "Antworten in derselben Sprache",
    humanActions: "Aktionen mit menschlicher Freigabe",
    defaultUser: "Betriebsnutzer",
    placeholders: {
      accountant:
        "Fragen Sie zu Hausgeld, Inkasso, Kautionen oder Finanzberichten...",
      staff:
        "Fragen Sie zu zugewiesenem Service, Feldnotizen oder Reservierungen...",
      resident:
        "Fragen Sie zu Service, Reservierungen, Dokumenten oder Nachrichten...",
    },
  },
  ru: {
    title: "Операционный ассистент 1Çatı",
    inputLabel: "Написать AI-ассистенту",
    sameLanguage: "Ответы на том же языке",
    humanActions: "Действия с подтверждением человеком",
    defaultUser: "Операционный пользователь",
    placeholders: {
      accountant:
        "Спросите о взносах, оплатах, депозитах или финансовых отчетах...",
      staff:
        "Спросите о назначенном сервисе, полевых заметках или бронировании...",
      resident:
        "Спросите о сервисе, бронировании, документах или сообщениях...",
    },
  },
} as const

const assistantTypingCopy = {
  tr: "Asistan yanıt hazırlıyor",
  en: "The assistant is preparing a response",
  de: "Der Assistent bereitet eine Antwort vor",
  ru: "Ассистент готовит ответ",
} as const

function resolveAssistantLocale(locale: string): keyof typeof assistantCopy {
  return locale in assistantCopy ? (locale as keyof typeof assistantCopy) : "tr"
}

function placeholderForRole(
  role: Role,
  fallback: string,
  copy: (typeof assistantCopy)[keyof typeof assistantCopy]
) {
  if (role === "accountant") {
    return copy.placeholders.accountant
  }

  if (role === "staff") {
    return copy.placeholders.staff
  }

  if (role === "owner" || role === "tenant") {
    return copy.placeholders.resident
  }

  return fallback
}

function ticketDraftMessage(language: unknown, title: string) {
  if (language === "tr") {
    return `Ticket taslağı gönderildi: ${title}. Uygulamadan önce insan onayı gerekir.`
  }
  if (language === "de") {
    return `Ticket-Entwurf gesendet: ${title}. Vor der Ausführung ist eine menschliche Freigabe erforderlich.`
  }
  if (language === "ru") {
    return `Черновик заявки отправлен: ${title}. Перед выполнением требуется одобрение человека.`
  }
  return `Ticket draft submitted: ${title}. Human approval is required before execution.`
}

export function AiAssistant() {
  const t = useTranslations("aiAssistant")
  const locale = resolveAssistantLocale(useLocale())
  const copy = assistantCopy[locale]
  const user = useUser()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("welcome", {
        role: user.full_name || user.email || copy.defaultUser,
      }),
    },
  ])
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const requestInFlightRef = useRef(false)
  const messageIdRef = useRef(0)
  const suggestions = getAiSuggestions(user.role, locale)
  const dialogTitleId = useId()
  const dialogDescriptionId = useId()

  useEffect(() => {
    if (!open || !overlayRef.current) return

    const background = Array.from(document.body.children)
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && element !== overlayRef.current
      )
      .map((element) => ({
        element,
        wasInert: element.hasAttribute("inert"),
        ariaHidden: element.getAttribute("aria-hidden"),
      }))

    background.forEach(({ element }) => {
      element.setAttribute("inert", "")
      element.setAttribute("aria-hidden", "true")
    })

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const focusTimer = window.requestAnimationFrame(() =>
      inputRef.current?.focus()
    )
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key !== "Tab" || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (
        event.shiftKey &&
        (active === first || !dialogRef.current.contains(active))
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (active === last || !dialogRef.current.contains(active))
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusTimer)
      document.removeEventListener("keydown", handleKeyDown)
      background.forEach(({ element, wasInert, ariaHidden }) => {
        if (!wasInert) element.removeAttribute("inert")
        if (ariaHidden === null) {
          element.removeAttribute("aria-hidden")
        } else {
          element.setAttribute("aria-hidden", ariaHidden)
        }
      })
      document.body.style.overflow = previousBodyOverflow
      window.requestAnimationFrame(() => returnFocusRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typing])

  async function sendMessage(text: string) {
    if (!text.trim() || requestInFlightRef.current) return
    requestInFlightRef.current = true
    messageIdRef.current += 1
    const userMsg: Message = {
      id: `u-${messageIdRef.current}`,
      role: "user",
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setTyping(true)
    inputRef.current?.focus({ preventScroll: true })

    const responseLocale = resolveAiLanguage(text, locale)
    let response = generateAiResponse(text, user.role, responseLocale)
    try {
      const result = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, locale }),
      })
      if (result.ok) {
        const payload = (await result.json()) as {
          reply?: unknown
          ticketDraft?: {
            id?: unknown
            status?: unknown
            title?: unknown
            category?: unknown
            priority?: unknown
            unitNo?: unknown
            requiresHumanApproval?: unknown
          } | null
          language?: unknown
        }
        if (typeof payload.reply === "string" && payload.reply.trim()) {
          response = payload.reply
          if (
            payload.ticketDraft &&
            typeof payload.ticketDraft.id === "string" &&
            typeof payload.ticketDraft.title === "string"
          ) {
            response = `${response}\n\n${ticketDraftMessage(payload.language, payload.ticketDraft.title)}`
            const ticketDraft = payload.ticketDraft
            window.dispatchEvent(
              new CustomEvent("site-management:action-logged", {
                detail: {
                  id: ticketDraft.id,
                  actionType: "ticket.create.ai_draft",
                  entityTable: "service_tickets",
                  entityExternalId:
                    typeof ticketDraft.unitNo === "string"
                      ? ticketDraft.unitNo
                      : "ai-ticket-draft",
                  title: ticketDraft.title,
                  status:
                    typeof ticketDraft.status === "string"
                      ? ticketDraft.status
                      : "submitted",
                  workflow: {
                    status: "submitted",
                    origin: "ai",
                    riskLevel: "medium",
                    executionMode: "request_only",
                    requiresHumanApproval: true,
                    approvalRoles: ["manager"],
                  },
                  metadata: {
                    origin: "ai",
                    proposedPayload: {
                      title: ticketDraft.title,
                      category: ticketDraft.category,
                      priority: ticketDraft.priority,
                      unitNo: ticketDraft.unitNo,
                    },
                  },
                },
              })
            )
          }
        }
      }
    } catch {
      response = generateAiResponse(text, user.role, responseLocale)
    }
    messageIdRef.current += 1
    const assistantMsg: Message = {
      id: `a-${messageIdRef.current}`,
      role: "assistant",
      content: response,
    }
    setMessages((prev) => [...prev, assistantMsg])
    setTyping(false)
    requestInFlightRef.current = false
  }

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        ref={launcherRef}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          returnFocusRef.current = launcherRef.current
          setOpen(true)
        }}
        data-testid="ai-assistant-open"
        className={cn(
          "fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-2xl ring-1 shadow-primary/30 ring-white/20 sm:right-6 sm:bottom-6 sm:h-14 sm:w-14",
          "bg-gradient-to-br from-primary via-teal-500 to-emerald-400 text-primary-foreground",
          open && "hidden"
        )}
        aria-label={t("open")}
      >
        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
      </motion.button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={overlayRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                data-testid="ai-assistant-overlay"
                className="fixed inset-0 z-50 flex items-end justify-end bg-black/35 p-3 sm:p-4 print:hidden"
                onMouseDown={(event) => {
                  if (event.currentTarget === event.target) setOpen(false)
                }}
              >
                <motion.section
                  ref={dialogRef}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={dialogTitleId}
                  aria-describedby={dialogDescriptionId}
                  data-testid="ai-assistant-panel"
                  className="premium-surface flex max-h-[calc(100svh-1.5rem)] w-[min(440px,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl shadow-2xl"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-primary/[0.12] to-amber-500/10 px-4 py-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary via-teal-500 to-amber-400 text-primary-foreground shadow-lg shadow-primary/[0.18]">
                        <Bot className="h-5 w-5" />
                        <span className="absolute right-1 bottom-1 h-2 w-2 rounded-full border border-white/80 bg-emerald-300" />
                      </div>
                      <div className="min-w-0">
                        <p
                          id={dialogTitleId}
                          className="text-sm leading-tight font-bold [overflow-wrap:anywhere] break-words text-foreground"
                        >
                          {copy.title}
                        </p>
                        <p
                          id={dialogDescriptionId}
                          className="text-[10px] leading-snug [overflow-wrap:anywhere] break-words text-muted-foreground"
                        >
                          {t("subtitle")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                      aria-label={t("close")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 border-b border-border/70 bg-muted/20 px-4 py-2">
                    <span className="inline-flex max-w-full min-w-0 flex-1 basis-full items-center gap-1 rounded-md border border-border bg-background/70 px-2 py-1 text-[10px] font-bold text-muted-foreground sm:basis-auto">
                      <Languages className="h-3 w-3 text-primary" />
                      <span className="min-w-0 [overflow-wrap:anywhere] break-words">
                        {copy.sameLanguage}
                      </span>
                    </span>
                    <span className="inline-flex max-w-full min-w-0 flex-1 basis-full items-center gap-1 rounded-md border border-border bg-background/70 px-2 py-1 text-[10px] font-bold text-muted-foreground sm:basis-auto">
                      <ShieldCheck className="h-3 w-3 text-primary" />
                      <span className="min-w-0 [overflow-wrap:anywhere] break-words">
                        {copy.humanActions}
                      </span>
                    </span>
                  </div>

                  {/* Messages */}
                  <div
                    ref={scrollRef}
                    role="log"
                    aria-label={copy.title}
                    aria-live="polite"
                    aria-relevant="additions text"
                    aria-busy={typing}
                    className="flex h-[min(20rem,calc(100svh-16rem))] min-h-40 flex-col gap-3 overflow-y-auto p-4"
                  >
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex max-w-[85%] min-w-0 gap-2",
                          msg.role === "user"
                            ? "ml-auto flex-row-reverse"
                            : "mr-auto"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                            msg.role === "user"
                              ? "bg-muted text-foreground"
                              : "bg-gradient-to-br from-primary to-teal-500 text-primary-foreground"
                          )}
                        >
                          {msg.role === "user" ? (
                            <User className="h-3.5 w-3.5" />
                          ) : (
                            <Bot className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "min-w-0 rounded-2xl px-3.5 py-2 text-sm leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-line",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-muted/50 text-foreground"
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {typing && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="mr-auto flex max-w-[85%] gap-2"
                      >
                        <span className="sr-only">
                          {assistantTypingCopy[locale]}
                        </span>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal-500 text-primary-foreground">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex items-center gap-1 rounded-2xl border border-border bg-muted/50 px-4 py-2">
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto border-b border-border bg-muted/30 px-4 py-2">
                    {suggestions.slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => sendMessage(s.prompt)}
                        className="min-h-8 max-w-full min-w-0 flex-1 basis-[calc(50%-0.25rem)] rounded-full border border-border bg-card px-3 py-1.5 text-center text-[11px] leading-snug font-medium [overflow-wrap:anywhere] break-words text-foreground transition-colors hover:border-primary hover:text-primary sm:flex-none sm:basis-auto"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      sendMessage(input)
                    }}
                    className="flex items-center gap-2 border-t border-border p-3"
                  >
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      aria-label={copy.inputLabel}
                      placeholder={placeholderForRole(
                        user.role,
                        t("placeholder"),
                        copy
                      )}
                      className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || typing}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-50"
                      aria-label={t("send")}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </motion.section>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
