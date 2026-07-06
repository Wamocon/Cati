import type { Metadata } from "next"
import { PwaClient } from "@/components/pwa-client"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import "./globals.css"

export const metadata: Metadata = {
  title: "1Çatı ERP | Ataberk Estate",
  description:
    "Real estate ERP workspace for Ataberk Estate: CRM, portfolio, site operations, service, documents, finance and compliance.",
}

export const dynamic = "force-dynamic"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="tr"
      dir="ltr"
      className={cn("antialiased")}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen bg-background font-sans text-foreground">
        <ThemeProvider>
          {children}
          <PwaClient />
        </ThemeProvider>
      </body>
    </html>
  )
}
