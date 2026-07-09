"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Send, X, Bot, User, Languages, ShieldCheck } from "lucide-react"
import { useUser } from "@/components/user-provider"
import { getAiSuggestions, generateAiResponse, resolveAiLanguage } from "@/lib/ai-responses"
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
      accountant: "Fragen Sie zu Hausgeld, Inkasso, Kautionen oder Finanzberichten...",
      staff: "Fragen Sie zu zugewiesenem Service, Feldnotizen oder Reservierungen...",
      resident: "Fragen Sie zu Service, Reservierungen, Dokumenten oder Nachrichten...",
    },
  },
  ru: {
    title: "Операционный ассистент 1Çatı",
    inputLabel: "Написать AI-ассистенту",
    sameLanguage: "Ответы на том же языке",
    humanActions: "Действия с подтверждением человеком",
    defaultUser: "Операционный пользователь",
    placeholders: {
      accountant: "Спросите о взносах, оплатах, депозитах или финансовых отчетах...",
      staff: "Спросите о назначенном сервисе, полевых заметках или бронировании...",
      resident: "Спросите о сервисе, бронировании, документах или сообщениях...",
    },
  },
} as const

function resolveAssistantLocale(locale: string): keyof typeof assistantCopy {
  return locale in assistantCopy ? (locale as keyof typeof assistantCopy) : "tr"
}

function placeholderForRole(role: Role, fallback: string, copy: (typeof assistantCopy)[keyof typeof assistantCopy]) {
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
  const messageIdRef = useRef(0)
  const suggestions = getAiSuggestions(user.role, locale)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typing])

  async function sendMessage(text: string) {
    if (!text.trim()) return
    messageIdRef.current += 1
    const userMsg: Message = {
      id: `u-${messageIdRef.current}`,
      role: "user",
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setTyping(true)

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
  }

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        data-testid="ai-assistant-open"
        className={cn(
          "fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-2xl shadow-primary/30 ring-1 ring-white/20 sm:right-6 sm:bottom-6 sm:h-14 sm:w-14",
          "bg-gradient-to-br from-primary via-teal-500 to-emerald-400 text-primary-foreground",
          open && "hidden"
        )}
        aria-label={t("open")}
      >
        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            data-testid="ai-assistant-panel"
            className="premium-surface fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex max-h-[calc(100svh-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl shadow-2xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[min(440px,92vw)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-primary/[0.12] to-amber-500/10 px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary via-teal-500 to-amber-400 text-primary-foreground shadow-lg shadow-primary/[0.18]">
                  <Bot className="h-5 w-5" />
                  <span className="absolute right-1 bottom-1 h-2 w-2 rounded-full border border-white/80 bg-emerald-300" />
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold leading-tight text-foreground [overflow-wrap:anywhere]">{copy.title}</p>
                  <p className="break-words text-[10px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                    {t("subtitle")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-border/70 bg-muted/20 px-4 py-2">
              <span className="inline-flex min-w-0 max-w-full flex-1 basis-full items-center gap-1 rounded-md border border-border bg-background/70 px-2 py-1 text-[10px] font-bold text-muted-foreground sm:basis-auto">
                <Languages className="h-3 w-3 text-primary" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{copy.sameLanguage}</span>
              </span>
              <span className="inline-flex min-w-0 max-w-full flex-1 basis-full items-center gap-1 rounded-md border border-border bg-background/70 px-2 py-1 text-[10px] font-bold text-muted-foreground sm:basis-auto">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{copy.humanActions}</span>
              </span>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex h-[min(20rem,calc(100svh-16rem))] min-h-40 flex-col gap-3 overflow-y-auto p-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex min-w-0 max-w-[85%] gap-2",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
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
                    {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={cn(
                      "min-w-0 rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-line [overflow-wrap:anywhere]",
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
                <div className="mr-auto flex max-w-[85%] gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal-500 text-primary-foreground">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl border border-border bg-muted/50 px-4 py-2">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
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
                  className="min-h-8 min-w-0 max-w-full flex-1 basis-[calc(50%-0.25rem)] rounded-full border border-border bg-card px-3 py-1.5 text-center text-[11px] font-medium leading-snug text-foreground transition-colors break-words hover:border-primary hover:text-primary [overflow-wrap:anywhere] sm:flex-none sm:basis-auto"
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label={copy.inputLabel}
                placeholder={placeholderForRole(user.role, t("placeholder"), copy)}
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
