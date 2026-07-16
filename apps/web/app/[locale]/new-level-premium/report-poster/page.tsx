import type { Metadata } from "next"
import { headers } from "next/headers"
import QRCode from "qrcode"
import { PrintButton } from "@/components/new-level-premium/print-button"
import { resolveDashboardLocale } from "@/lib/business-copy"
import type { PublicReportLocale, PublicReportPlacement } from "@/lib/public-report"
import { resolvePublicReportPlacement } from "@/lib/public-report-repository"

export const metadata: Metadata = {
  title: "1Çatı · QR problem-report poster",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

const copy = {
  tr: { title: "Bir sorun mu var? Karekodu okutun.", intro: "Hesap gerekmez. Bu karekod yalnızca aşağıdaki site ve konum için geçerlidir.", steps: ["Karekodu telefon kameranızla okutun", "Sorunu açıklayın ve gizlilik onayını verin", "Referans ile özel takip anahtarını kaydedin"], site: "Site", zone: "Konum", url: "Ya da şu adrese gidin:", print: "Posteri yazdır", setup: "QR posteri henüz yapılandırılmadı", setupBody: "Yönetici, Aktif QR Konumları listesinden bu sayfayı ilgili konum anahtarıyla açmalıdır. Geçerli anahtar olmadan karekod üretilmez." },
  en: { title: "Something wrong? Scan the code.", intro: "No account is needed. This QR code is valid only for the site and zone below.", steps: ["Scan the code with your phone camera", "Describe the problem and give privacy consent", "Save the reference and private tracking token"], site: "Site", zone: "Zone", url: "Or open:", print: "Print poster", setup: "QR poster is not configured", setupBody: "A manager must open this page from Active QR placements with the exact placement token. No code is generated without a valid token." },
  de: { title: "Problem entdeckt? Code scannen.", intro: "Kein Konto erforderlich. Dieser QR-Code gilt nur für den unten genannten Standort und Bereich.", steps: ["Code mit der Handykamera scannen", "Problem beschreiben und Datenschutz bestätigen", "Referenz und privaten Tracking-Schlüssel speichern"], site: "Standort", zone: "Bereich", url: "Oder öffnen:", print: "Poster drucken", setup: "QR-Poster ist nicht eingerichtet", setupBody: "Eine Verwaltungskraft muss diese Seite über die aktiven QR-Bereiche mit dem exakten Bereichsschlüssel öffnen. Ohne gültigen Schlüssel wird kein Code erzeugt." },
  ru: { title: "Есть проблема? Отсканируйте код.", intro: "Аккаунт не нужен. QR-код действует только для указанных ниже объекта и зоны.", steps: ["Отсканируйте код камерой телефона", "Опишите проблему и подтвердите согласие", "Сохраните номер и секретный ключ отслеживания"], site: "Объект", zone: "Зона", url: "Или откройте:", print: "Печать плаката", setup: "QR-плакат не настроен", setupBody: "Управляющий должен открыть страницу из списка активных QR-зон с точным ключом зоны. Без действительного ключа код не создаётся." },
} satisfies Record<PublicReportLocale, Record<string, string | string[]>>

async function canonicalOrigin() {
  const production = process.env.VERCEL_ENV === "production" || process.env.CATI_ENV === "production"
  for (const candidate of [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!candidate) continue
    try {
      const url = new URL(candidate)
      const local = url.hostname === "localhost" || url.hostname === "127.0.0.1"
      if (url.protocol === "https:" || (!production && local && url.protocol === "http:")) return url.origin
    } catch { /* ignore invalid configured origins */ }
  }
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  if (vercelHost && /^[a-z0-9.-]+\.vercel\.app$/i.test(vercelHost)) return `https://${vercelHost}`
  if (!production) {
    const host = (await headers()).get("host") ?? ""
    if (/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host)) return `http://${host}`
  }
  return "https://cati-blond.vercel.app"
}

export default async function ReportPosterPage({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ qr?: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = resolveDashboardLocale(rawLocale) as PublicReportLocale
  const token = (await searchParams).qr?.trim() ?? ""
  const t = copy[locale]
  let placement: PublicReportPlacement | null = null
  if (/^qr_[A-Za-z0-9_-]{16,100}$/.test(token)) {
    try { placement = await resolvePublicReportPlacement(token) } catch { placement = null }
  }

  if (!placement) {
    return <main className="min-h-svh bg-slate-50 px-6 py-16"><section className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-10 text-center shadow-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">1Çatı · UC10</p><h1 className="mt-4 text-3xl font-black">{t.setup as string}</h1><p className="mt-4 leading-7 text-slate-600">{t.setupBody as string}</p></section></main>
  }

  const targetUrl = `${await canonicalOrigin()}/${locale}/report/${encodeURIComponent(token)}`
  const qrSvg = await QRCode.toString(targetUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#061a17", light: "#ffffff" } })
  const zone = placement.zoneLabels[locale] ?? placement.zoneLabels.tr ?? placement.zoneCode

  return (
    <main className="min-h-svh bg-white px-6 py-10 text-[#061a17] print:py-0">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">1Çatı · UC10</p>
        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">{t.title as string}</h1>
        <p className="mt-4 max-w-md leading-7 text-[#061a17]/70">{t.intro as string}</p>
        <dl className="mt-5 grid w-full grid-cols-2 gap-3 rounded-2xl bg-sky-50 p-4"><div><dt className="text-xs font-bold uppercase text-sky-700">{t.site as string}</dt><dd className="font-semibold">{placement.siteLabel}</dd></div><div><dt className="text-xs font-bold uppercase text-sky-700">{t.zone as string}</dt><dd className="font-semibold">{zone}</dd></div></dl>
        <div className="mt-8 h-64 w-64 rounded-3xl border-4 border-[#061a17] p-3 [&>svg]:h-full [&>svg]:w-full" aria-label="QR code" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <ol className="mt-8 grid w-full gap-2 text-left">{(t.steps as string[]).map((step, index) => <li key={step} className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">{index + 1}</span>{step}</li>)}</ol>
        <p className="mt-6 text-xs font-semibold text-[#061a17]/55">{t.url as string}</p><p className="break-all text-sm font-bold">{targetUrl}</p>
        <div className="mt-8"><PrintButton label={t.print as string} /></div>
      </div>
    </main>
  )
}
