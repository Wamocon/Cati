import type { Metadata } from "next"
import { getLocale } from "next-intl/server"
import { cn } from "@/lib/utils"
import "./globals.css"

export const metadata: Metadata = {
  title: "1Çatı ERP | Ataberk Estate",
  description:
    "Real estate ERP workspace for Ataberk Estate: CRM, portfolio, site operations, service, documents, finance and compliance.",
}

export const dynamic = "force-dynamic"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Correct lang per request enables CSS hyphens:auto for long German/Russian
  // compounds and gives screen readers the real page language.
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      dir="ltr"
      className={cn("antialiased")}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  )
}
