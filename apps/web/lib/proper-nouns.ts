// Brand / development proper nouns that must render VERBATIM in every locale.
//
// The client requires the development name "New Level Premium" to never be
// machine-translated. Some copy dictionaries had localized variants
// ("Yeni Seviye Premium", "Neues Niveau Premium", "Новый уровень Премиум");
// these guards normalize any such variant back to the canonical English form
// so localize helpers can pin the brand without touching surrounding copy.

// Canonical brand forms. Keep this list narrow so the guard only ever affects
// genuine proper nouns, never unrelated descriptive phrases.
const CANONICAL_PROPER_NOUNS = ["New Level Premium"] as const

// Known localized variant -> canonical form.
const properNounVariants: Record<string, string> = {
  "Yeni Seviye Premium": "New Level Premium",
  "Neues Niveau Premium": "New Level Premium",
  "Новый уровень Премиум": "New Level Premium",
}

/**
 * Exact-match guard. If the whole (trimmed) value is the canonical brand or a
 * known localized variant of it, return the canonical form; otherwise null.
 */
export function pinProperNoun(value: string): string | null {
  const trimmed = value.trim()
  if ((CANONICAL_PROPER_NOUNS as readonly string[]).includes(trimmed)) return trimmed
  return properNounVariants[trimmed] ?? null
}

/**
 * Substring guard. Replaces any known localized brand variant that appears
 * inside a larger string with the canonical form, leaving the surrounding
 * (descriptive) copy untouched. Variants are matched longest-first so a shorter
 * variant can never partially consume a longer one.
 */
export function pinProperNouns(value: string): string {
  let result = value
  for (const variant of Object.keys(properNounVariants).sort(
    (a, b) => b.length - a.length
  )) {
    if (result.includes(variant)) {
      result = result.split(variant).join(properNounVariants[variant])
    }
  }
  return result
}
