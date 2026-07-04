import type { Metadata } from "next"
import { headers } from "next/headers"
import QRCode from "qrcode"
import { resolveDashboardLocale } from "@/lib/business-copy"
import { PrintButton } from "@/components/new-level-premium/print-button"

export const metadata: Metadata = {
  title: "New Level Premium: Report an issue (QR poster)",
  robots: { index: false, follow: false },
}

type LocaleKey = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    kicker: "New Level Premium · 1Çatı",
    title: "Bir sorun mu var? Karekodu okutun.",
    intro: "Malik, kiracı ya da misafir olun, hesaba gerek yok. Telefonunuzla okutup bildirin, çözülene kadar takip edin.",
    steps: ["Karekodu telefon kameranızla okutun", "Konumu ve kısa bir not yazın", "Referans numaranızı alın"],
    urlLabel: "Ya da şu adrese gidin:",
    print: "Posteri yazdır",
  },
  en: {
    kicker: "New Level Premium · 1Çatı",
    title: "Something wrong? Scan the code.",
    intro: "Owners, tenants and guests can report without an account. Scan with your phone, tell us, and follow it to resolution.",
    steps: ["Scan the code with your camera", "Enter the location and a short note", "Get your reference number"],
    urlLabel: "Or go to:",
    print: "Print poster",
  },
  de: {
    kicker: "New Level Premium · 1Çatı",
    title: "Etwas nicht in Ordnung? Code scannen.",
    intro: "Eigentümer, Mieter und Gäste melden ohne Konto. Mit dem Handy scannen, uns Bescheid geben und bis zur Lösung verfolgen.",
    steps: ["Code mit der Kamera scannen", "Ort und kurze Beschreibung eingeben", "Referenznummer erhalten"],
    urlLabel: "Oder öffnen Sie:",
    print: "Poster drucken",
  },
  ru: {
    kicker: "New Level Premium · 1Çatı",
    title: "Что-то не так? Отсканируйте код.",
    intro: "Собственник, арендатор или гость: аккаунт не нужен. Отсканируйте телефоном, сообщите и следите за обращением до решения.",
    steps: ["Отсканируйте код камерой", "Укажите место и краткое описание", "Получите номер обращения"],
    urlLabel: "Или перейдите:",
    print: "Печать плаката",
  },
} satisfies Record<LocaleKey, unknown>

export default async function ReportPosterPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = resolveDashboardLocale(rawLocale)
  const t = copy[locale] as (typeof copy)["tr"]

  const headerList = await headers()
  const host = headerList.get("host") ?? "cati-blond.vercel.app"
  const proto =
    headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https")
  const targetUrl = `${proto}://${host}/${locale}/new-level-premium#report`

  const qrSvg = await QRCode.toString(targetUrl, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#061a17", light: "#ffffff" },
  })

  return (
    <main className="min-h-svh bg-white px-6 py-10 text-[#061a17] print:py-0">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{t.kicker}</p>
        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">{t.title}</h1>
        <p className="mt-4 max-w-md text-base leading-7 text-[#061a17]/70">{t.intro}</p>

        <div
          className="mt-8 h-64 w-64 rounded-3xl border-4 border-[#061a17] p-3 [&>svg]:h-full [&>svg]:w-full"
          aria-label="QR code"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />

        <ol className="mt-8 grid w-full gap-2 text-left">
          {t.steps.map((step, i) => (
            <li key={step} className="flex items-center gap-3 rounded-xl border border-[#061a17]/12 px-4 py-3 text-sm font-bold">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <p className="mt-6 text-xs font-semibold text-[#061a17]/55">{t.urlLabel}</p>
        <p className="break-all text-sm font-bold">{targetUrl}</p>

        <div className="mt-8">
          <PrintButton label={t.print} />
        </div>
      </div>
    </main>
  )
}
