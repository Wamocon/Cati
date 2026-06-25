const urls = [
  "https://www.ataberkestate.com/articles/proekt-new-level-premium-investiruy-zarabatyvay-i-otdykhay",
  "https://vikingen.de/de/immobilien/1109-new-level-premium-avsallar-alanya",
  "https://irlanyahomes.com/de/properties/projects/avsallar/new-level-premium-apartments-alanya-turkey/",
  "https://turk.estate/de/real-estate/o222300/",
]

const headers = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  "accept-language": "de-DE,de;q=0.9,en;q=0.8,tr;q=0.7,ru;q=0.6",
}

const keywords = [
  "New Level",
  "Avsallar",
  "Alanya",
  "5-Sterne",
  "5-star",
  "Hotel",
  "Privatstrand",
  "private beach",
  "Incekum",
  "Raten",
  "0 %",
  "Miet",
  "ROI",
  "Eigentümer",
  "Rezeption",
  "Strand",
  "Transfer",
  "Pool",
  "Sauna",
  "Fitness",
  "Tennis",
  "Basketball",
  "Minigolf",
  "Bauabschluss",
  "2025",
  "52.000",
  "900",
  "Gazipaşa",
  "Antalya",
]

function decode(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&laquo;|&raquo;/g, '"')
    .replace(/&euro;/g, "EUR")
}

function clean(html = "") {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  )
}

function firstMatch(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decode(match[1].trim())
  }
  return ""
}

const report = []

for (const url of urls) {
  try {
    const response = await fetch(url, { headers })
    const html = await response.text()
    const text = clean(html)
    const title = firstMatch(html, [/<title>([\s\S]*?)<\/title>/i])
    const description = firstMatch(html, [
      /<meta name="description" content="([\s\S]*?)"/i,
      /<meta property="og:description" content="([\s\S]*?)"/i,
    ])
    const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
      .map((match) => clean(match[1]))
      .filter(Boolean)
      .slice(0, 6)
    const snippets = [
      ...new Set(
        keywords.flatMap((keyword) => {
          const index = text.toLowerCase().indexOf(keyword.toLowerCase())
          if (index < 0) return []
          return [text.slice(Math.max(0, index - 120), Math.min(text.length, index + 520))]
        })
      ),
    ].slice(0, 20)

    report.push({
      url,
      status: response.status,
      title,
      description,
      h1,
      textLength: text.length,
      snippets,
    })
  } catch (error) {
    report.push({ url, error: error.message })
  }
}

console.log(JSON.stringify(report, null, 2))
