export type SupportedChatLanguage = "tr" | "en" | "de" | "ru"

const supportedChatLanguages = ["tr", "en", "de", "ru"] as const

const greetingOnlyPattern =
  /^(?:hi+|hello+|hey+|hallo+|servus|moin|guten\s+(?:tag|morgen|abend)|merhaba+|selam+|привет+|здравствуй(?:те)?|добрый\s+(?:день|вечер|утро))[!?.\s,-]*$/iu

const brandTokenPattern = /1\s*[çc]at[ıii]?|[çc]at[ıi]/giu

function stripBrandTokens(message: string) {
  return message.replace(brandTokenPattern, " ")
}

export function resolveChatUiLocale(
  locale: string | null | undefined,
  defaultLocale: SupportedChatLanguage = "tr"
): SupportedChatLanguage {
  return supportedChatLanguages.includes(locale as SupportedChatLanguage)
    ? (locale as SupportedChatLanguage)
    : defaultLocale
}

export function detectExplicitChatLanguage(
  message: string
): SupportedChatLanguage | null {
  const text = stripBrandTokens(message).trim()
  if (!text || greetingOnlyPattern.test(text)) return null

  if (/[\u0400-\u04ff]/u.test(text)) return "ru"

  const scores: Record<Exclude<SupportedChatLanguage, "ru">, number> = {
    tr: 0,
    en: 0,
    de: 0,
  }

  if (/[çğıİöşüÇĞİÖŞÜ]/u.test(text)) scores.tr += 3
  if (/[äöüßÄÖÜ]/u.test(text)) scores.de += 3

  const lower = text.toLocaleLowerCase("tr-TR")
  const addScore = (
    language: Exclude<SupportedChatLanguage, "ru">,
    pattern: RegExp,
    weight = 1
  ) => {
    const matches = lower.match(pattern)
    if (matches) scores[language] += matches.length * weight
  }

  addScore(
    "de",
    /\b(ich|du|sie|wir|was|wie|warum|wieso|welche|welcher|welches|kann|können|bitte|danke|nicht|mit|für|uber|über|zugang|konto|wohnung|einheit|mieter|eigentümer|buchung|reservierung|zahlung|schulden|bericht|serviceanfrage|wartung|reparatur|störung|stoerung|dokument|sprache|deutsch)\b/giu
  )
  addScore(
    "tr",
    /\b(ben|sen|siz|biz|nedir|nasıl|nasil|neden|hangi|lütfen|lutfen|teşekkür|tesekkur|kayit|kayıt|giriş|giris|daire|kiracı|kiraci|malik|ödeme|odeme|borç|borc|aidat|servis|talep|belge|rapor|bugün|bugun|türkçe|turkce)\b/giu
  )
  addScore(
    "en",
    /\b(i|you|we|what|how|why|which|who|can|could|please|thanks|thank|not|with|for|access|account|unit|tenant|owner|booking|reservation|payment|debt|report|service|request|maintenance|repair|document|language|english|help|show|open)\b/giu
  )

  const entries = Object.entries(scores) as Array<[
    Exclude<SupportedChatLanguage, "ru">,
    number,
  ]>
  entries.sort((a, b) => b[1] - a[1])

  const [winner, topScore] = entries[0]
  const [, secondScore] = entries[1]
  if (topScore <= 0 || topScore === secondScore) return null

  return winner
}

export function resolveChatLanguageFromMessage(
  message: string,
  fallbackLocale: string | null | undefined
): SupportedChatLanguage {
  return detectExplicitChatLanguage(message) ?? resolveChatUiLocale(fallbackLocale)
}
