// Central lookup for free-text business copy (dashboard UI, seed-data values,
// AI assistant strings, platform marketing copy) that is not routed through
// next-intl message catalogs. Extends the existing resolveDashboardLocale /
// localizeOperationalValue pattern from unit-matrix-copy.ts instead of
// introducing a second localization mechanism.
//
// Usage:
//   const locale = resolveDashboardLocale(useLocale())
//   localizeBusinessCopy(ticket.title, locale)
//   interpolate(localizeBusinessCopy("{count} kayit eslesti.", locale), { count })

import { resolveDashboardLocale, interpolate, type DashboardLocale } from "./unit-matrix-copy"
import { trCopy } from "./business-copy.tr"
import { enCopy } from "./business-copy.en"
import { deCopy } from "./business-copy.de"
import { ruCopy } from "./business-copy.ru"

const dictionaries: Record<DashboardLocale, Record<string, string>> = {
  tr: trCopy,
  en: enCopy,
  de: deCopy,
  ru: ruCopy,
}

const normalizedDictionaries = new Map<DashboardLocale, Map<string, string>>()

function normalizeLookupKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
}

function getNormalizedDictionary(locale: DashboardLocale) {
  const cached = normalizedDictionaries.get(locale)
  if (cached) return cached

  const normalized = new Map<string, string>()
  for (const [source, translated] of Object.entries(dictionaries[locale])) {
    const key = normalizeLookupKey(source)
    if (!normalized.has(key)) normalized.set(key, translated)
  }

  normalizedDictionaries.set(locale, normalized)
  return normalized
}

export function localizeBusinessCopy(
  text: string | null | undefined,
  locale: string
): string {
  if (!text) return ""
  const resolved = resolveDashboardLocale(locale)
  // tr is the canonical source language: Turkish source strings pass through
  // unchanged; only the English seed enum/status values in trCopy are mapped.
  return (
    dictionaries[resolved][text] ??
    dictionaries[resolved][text.trim()] ??
    getNormalizedDictionary(resolved).get(normalizeLookupKey(text)) ??
    text
  )
}

export { resolveDashboardLocale, interpolate }
export type { DashboardLocale }
