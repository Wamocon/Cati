import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { Geist } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const geist = Geist({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
})

export const metadata = {
  title: "Ataberk Estate — Türkiye'de Emlak | 1Çatı CRM",
  description:
    "Ataberk Estate'ten Türkiye'de emlak satışı ve kiralama. 212.000+ ilan, 6.000+ işlem, 150 çalışan. Artık 1Çatı mülk yönetim platformu ile.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const messages = await getMessages()

  return (
    <html
      lang="tr"
      className={cn("dark antialiased", geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
