"use client"

import { Menu, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link } from "@/app/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { LocaleSwitcher } from "@/components/locale-switcher"

const navItems = [
  { label: "home", href: "#" },
  { label: "catalog", href: "#catalog" },
  { label: "about", href: "#about" },
  { label: "services", href: "#services" },
  { label: "reviews", href: "#reviews" },
  { label: "contacts", href: "#contacts" },
]

export function Navbar() {
  const t = useTranslations("nav")
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-teal-600 text-sm font-black text-primary-foreground">
            1Ç
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Ataberk Estate
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("login")}
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("portal")}
          </Link>
        </div>

        <button
          className="p-2 text-foreground md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-background md:hidden"
          >
            <nav className="container flex flex-col gap-4 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {t(item.label)}
                </Link>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <LocaleSwitcher />
                <ThemeToggle />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {t("login")}
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {t("portal")}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
