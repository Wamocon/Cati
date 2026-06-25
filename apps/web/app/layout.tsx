import type { Metadata } from "next"
import { cn } from "@/lib/utils"
import "./globals.css"

export const metadata: Metadata = {
  title: "1Çatı AI CRM | Ataberk Estate",
  description:
    "AI-powered CRM command center for Ataberk Estate, New Level Premium Avsallar, sales, service, documents, finance and operations.",
}

export const dynamic = "force-dynamic"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      className={cn("antialiased")}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen bg-background font-sans text-foreground">
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  )
}
