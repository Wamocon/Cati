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
  title: "Ataberk Estate — Недвижимость в Турции | 1Çatı CRM",
  description:
    "Продажа и аренда недвижимости в Турции от Ataberk Estate. 212 000+ объектов, 6 000+ сделок, 150 сотрудников. Теперь с платформой 1Çatı для управления объектами.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const messages = await getMessages()

  return (
    <html
      lang="ru"
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
