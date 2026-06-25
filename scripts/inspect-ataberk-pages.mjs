const urls = [
  "https://www.ataberkestate.com/",
  "https://www.ataberkestate.com/articles/proekt-new-level-premium-investiruy-zarabatyvay-i-otdykhay",
  "https://www.ataberkestate.com/turkey/complex-in-avsallar",
  "https://www.ataberkestate.com/turkey/alanya",
]

const headers = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  "accept-language": "de-DE,de;q=0.9,en;q=0.8,tr;q=0.7,ru;q=0.6",
}

function decode(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&laquo;|&raquo;/g, '"')
    .replace(/&euro;/g, "EUR")
}

function clean(value = "") {
  return decode(
    value
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
    .slice(0, 5)
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((match) => clean(match[1]))
    .filter(Boolean)
    .slice(0, 12)
  const links = [...html.matchAll(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ href: match[1], text: clean(match[2]) }))
    .filter((link) =>
      /Avsallar|Alanya|New Level|расср|онлайн|мебел|заяв|WhatsApp|Telegram|тур|застрой|rassrochka|obustroystvo|online/i.test(
        `${link.text} ${link.href}`
      )
    )
    .slice(0, 40)
  const images = [...html.matchAll(/<img[^>]*(?:data-lazy|src)="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi)]
    .map((match) => ({ src: match[1], alt: decode(match[2]) }))
    .filter((image) => image.src && !image.src.startsWith("data:"))
    .slice(0, 20)
  const needles = [
    "New Level",
    "Avsallar",
    "Alanya",
    "расср",
    "инвест",
    "доход",
    "онлайн",
    "мебел",
    "застрой",
  ]
  const snippets = needles.flatMap((needle) => {
    const index = text.toLowerCase().indexOf(needle.toLowerCase())
    if (index < 0) return []
    return [text.slice(Math.max(0, index - 140), Math.min(text.length, index + 460))]
  })

  report.push({
    url,
    status: response.status,
    title,
    description,
    h1,
    h2,
    links,
    images,
    snippets,
  })
}

console.log(JSON.stringify(report, null, 2))
