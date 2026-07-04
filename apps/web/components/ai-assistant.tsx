"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Send, X, Bot, User } from "lucide-react"
import { useUser } from "@/components/user-provider"
import { getAiSuggestions, generateAiResponse } from "@/lib/ai-responses"
import { localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"
import type { Role } from "@/lib/rbac"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

function placeholderForRole(role: Role, fallback: string, locale: string) {
  if (role === "accountant") {
    return localizeBusinessCopy("Aidat, tahsilat, depozito veya finans raporu sorun...", locale)
  }

  if (role === "staff") {
    return localizeBusinessCopy("Atanan servis, saha notu veya rezervasyon işi sorun...", locale)
  }

  if (role === "owner" || role === "tenant") {
    return localizeBusinessCopy("Servis, rezervasyon, belge veya mesaj hakkında sorun...", locale)
  }

  return fallback
}

export function AiAssistant() {
  const t = useTranslations("aiAssistant")
  const locale = resolveDashboardLocale(useLocale())
  const user = useUser()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("welcome", {
        role: user.full_name || user.email || localizeBusinessCopy("Operasyon Kullanıcısı", locale),
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

    let response = generateAiResponse(text, user.role, locale)
    try {
      const result = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, locale }),
      })
      if (result.ok) {
        const payload = (await result.json()) as { reply?: unknown }
        if (typeof payload.reply === "string" && payload.reply.trim()) {
          response = payload.reply
        }
      }
    } catch {
      response = generateAiResponse(text, user.role, locale)
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
        className={cn(
          "fixed right-4 bottom-4 z-50 flex h-10 w-10 items-center justify-center rounded-full shadow-2xl shadow-primary/30 ring-1 ring-white/20 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14",
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
            className="premium-surface fixed right-4 bottom-4 z-50 flex w-[min(440px,92vw)] flex-col overflow-hidden rounded-xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-primary/[0.12] to-amber-500/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/[0.18]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">1Çatı {localizeBusinessCopy("Operasyon Asistanı", locale)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t("subtitle")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex h-80 flex-col gap-3 overflow-y-auto p-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex max-w-[85%] gap-2",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      msg.role === "user" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                    )}
                  >
                    {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
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
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
            <div className="flex gap-2 overflow-x-auto border-b border-border bg-muted/30 px-4 py-2">
              {suggestions.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  onClick={() => sendMessage(s.prompt)}
                  className="whitespace-nowrap rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
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
                placeholder={placeholderForRole(user.role, t("placeholder"), locale)}
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary"
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
