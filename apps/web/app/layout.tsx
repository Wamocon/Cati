import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { getTranslations } from "next-intl/server"
import { cn } from "@/lib/utils"
import "./globals.css"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata")
  return {
    title: t("title"),
    description: t("description"),
  }
}

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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
