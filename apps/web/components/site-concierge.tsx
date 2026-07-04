"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, MessageCircle, Send, Sparkles, User, X } from "lucide-react"
import { publicAiSuggestions } from "@/lib/public-ai-knowledge"
import { cn } from "@/lib/utils"

type LocaleKey = "tr" | "en" | "de" | "ru"

function resolveLocale(value: string): LocaleKey {
  return (["tr", "en", "de", "ru"] as const).includes(value as LocaleKey)
    ? (value as LocaleKey)
    : "tr"
}

const copy = {
  tr: {
    whatsappLabel: "WhatsApp ile site yönetimine yazın",
    whatsappMessage:
      "Merhaba, New Level Premium / 1Çatı hakkında bilgi almak istiyorum.",
    menuLabel: "İletişim ve yardım",
    waShort: "WhatsApp",
    aiShort: "1Çatı asistanı",
    aiLabel: "1Çatı asistanına sorun",
    title: "1Çatı Asistanı",
    subtitle: "Ürün soruları için buradayım, kişisel veriye erişimim yok",
    welcome:
      "Merhaba! 1Çatı'nın ne olduğunu, avantajlarını, kaydı ve New Level Premium'u sorabilirsiniz. Kişisel veya daireye özel verilere erişimim yok.",
    placeholder: "1Çatı hakkında sorun...",
    send: "Gönder",
    close: "Kapat",
    error: "Yanıt alınamadı. Lütfen tekrar deneyin.",
  },
  en: {
    whatsappLabel: "Message site management on WhatsApp",
    whatsappMessage:
      "Hello, I would like to learn more about New Level Premium / 1Çatı.",
    menuLabel: "Contact & help",
    waShort: "WhatsApp",
    aiShort: "1Çatı assistant",
    aiLabel: "Ask the 1Çatı assistant",
    title: "1Çatı Assistant",
    subtitle: "Here for product questions, no access to personal data",
    welcome:
      "Hello! Ask me what 1Çatı is, its advantages, registration or New Level Premium. I have no access to personal or unit data.",
    placeholder: "Ask about 1Çatı...",
    send: "Send",
    close: "Close",
    error: "No answer received. Please try again.",
  },
  de: {
    whatsappLabel: "Hausverwaltung per WhatsApp erreichen",
    whatsappMessage:
      "Hallo, ich möchte mehr über New Level Premium / 1Çatı erfahren.",
    menuLabel: "Kontakt & Hilfe",
    waShort: "WhatsApp",
    aiShort: "1Çatı-Assistent",
    aiLabel: "1Çatı-Assistenten fragen",
    title: "1Çatı-Assistent",
    subtitle: "Für Produktfragen da, kein Zugriff auf persönliche Daten",
    welcome:
      "Hallo! Fragen Sie mich, was 1Çatı ist, welche Vorteile es hat, wie die Registrierung läuft oder zu New Level Premium. Auf persönliche oder Einheitsdaten habe ich keinen Zugriff.",
    placeholder: "Zu 1Çatı fragen...",
    send: "Senden",
    close: "Schließen",
    error: "Keine Antwort erhalten. Bitte erneut versuchen.",
  },
  ru: {
    whatsappLabel: "Написать управлению в WhatsApp",
    whatsappMessage:
      "Здравствуйте, хочу узнать больше о New Level Premium / 1Çatı.",
    menuLabel: "Связь и помощь",
    waShort: "WhatsApp",
    aiShort: "Ассистент 1Çatı",
    aiLabel: "Спросить ассистента 1Çatı",
    title: "Ассистент 1Çatı",
    subtitle: "Отвечаю на вопросы о продукте, без доступа к личным данным",
    welcome:
      "Здравствуйте! Спросите меня, что такое 1Çatı, о его преимуществах, регистрации или New Level Premium. Доступа к личным данным и данным квартир у меня нет.",
    placeholder: "Спросите о 1Çatı...",
    send: "Отправить",
    close: "Закрыть",
    error: "Ответ не получен. Пожалуйста, попробуйте снова.",
  },
} satisfies Record<LocaleKey, unknown>

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.04 4C9.42 4 4.05 9.36 4.05 15.97c0 2.11.55 4.17 1.6 5.99L4 28l6.19-1.62a12 12 0 0 0 5.85 1.49h.01c6.61 0 11.98-5.36 11.98-11.97 0-3.2-1.25-6.21-3.51-8.47A11.9 11.9 0 0 0 16.04 4Zm0 21.85h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.22-3.67.96.98-3.58-.24-.37a9.92 9.92 0 0 1-1.52-5.29c0-5.5 4.47-9.96 9.98-9.96 2.66 0 5.16 1.04 7.04 2.92a9.88 9.88 0 0 1 2.92 7.05c0 5.5-4.48 9.87-9.97 9.87Zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.89 1.22 3.09.15.2 2.11 3.22 5.1 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  )
}

export function SiteConcierge({ page }: { page: string }) {
  const locale = resolveLocale(useLocale())
  const t = copy[locale] as (typeof copy)["tr"]

  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "900000000000"
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t.whatsappMessage)}`

  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: t.welcome },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)
  const suggestions = publicAiSuggestions[locale]

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typing])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || typing) return
    idRef.current += 1
    setMessages((prev) => [
      ...prev,
      { id: `u-${idRef.current}`, role: "user", content: trimmed },
    ])
    setInput("")
    setTyping(true)

    let reply = t.error
    try {
      const response = await fetch("/api/ai/public-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, locale, page }),
      })
      const data = (await response.json()) as { reply?: unknown }
      if (response.ok && typeof data.reply === "string" && data.reply.trim()) {
        reply = data.reply
      }
    } catch {
      // keep error copy
    }
    idRef.current += 1
    setMessages((prev) => [
      ...prev,
      { id: `a-${idRef.current}`, role: "assistant", content: reply },
    ])
    setTyping(false)
  }

  return (
    <>
      {/* Single speed-dial launcher: one compact button at rest, expands to
          reveal WhatsApp + AI actions on tap. Keeps the footprint small so the
          fixed control never covers page content the way a tall two-button
          stack did on narrow phones. */}
      <div
        data-testid="site-concierge"
        className={cn(
          "fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 print:hidden sm:right-6 sm:bottom-6",
          open && "hidden"
        )}
      >
        {/* Click-away backdrop while the menu is open (mobile-friendly). */}
        {menuOpen && (
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 -z-10 cursor-default"
          />
        )}

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col items-end gap-2.5"
            >
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.whatsappLabel}
                title={t.whatsappLabel}
                data-testid="concierge-whatsapp"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-full bg-[#25D366] py-1.5 pr-2 pl-4 text-sm font-bold text-white shadow-xl shadow-black/20 ring-1 ring-white/25 transition hover:-translate-y-0.5"
              >
                <span className="whitespace-nowrap">{t.waShort}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                  <WhatsAppIcon className="h-5 w-5" />
                </span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setOpen(true)
                  setMenuOpen(false)
                }}
                aria-label={t.aiLabel}
                title={t.aiLabel}
                data-testid="concierge-ai-open"
                className="flex items-center gap-2.5 rounded-full bg-gradient-to-br from-primary via-teal-500 to-emerald-400 py-1.5 pr-2 pl-4 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/25 ring-1 ring-white/20 transition hover:-translate-y-0.5"
              >
                <span className="whitespace-nowrap">{t.aiShort}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                  <Sparkles className="h-5 w-5" />
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={t.menuLabel}
          aria-expanded={menuOpen}
          title={t.menuLabel}
          data-testid="concierge-toggle"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary via-teal-500 to-emerald-400 text-primary-foreground shadow-2xl shadow-primary/30 ring-1 ring-white/20 sm:h-14 sm:w-14"
        >
          {menuOpen ? (
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            data-testid="concierge-panel"
            className="fixed right-4 bottom-4 z-50 flex w-[min(420px,92vw)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl print:hidden sm:right-6 sm:bottom-6"
          >
            <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-primary/[0.12] to-emerald-500/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/[0.18]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{t.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label={t.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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
                      msg.role === "user"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
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

            <div className="flex gap-2 overflow-x-auto border-b border-border bg-muted/30 px-4 py-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="whitespace-nowrap rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>

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
                placeholder={t.placeholder}
                maxLength={600}
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.whatsappLabel}
                title={t.whatsappLabel}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:opacity-90"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-50"
                aria-label={t.send}
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
