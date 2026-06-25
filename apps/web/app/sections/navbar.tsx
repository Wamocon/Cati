"use client"

import { Menu, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion"
import { Link } from "@/app/navigation"
import { CatiLogoMark } from "@/components/cati-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { LocaleSwitcher } from "@/components/locale-switcher"

const navItems = [
  { label: "home", href: "#" },
  { label: "catalog", href: "#services" },
  { label: "about", href: "/about" },
  { label: "pitch", href: "/pitch" },
  { label: "services", href: "#services" },
  { label: "reviews", href: "/reviews" },
  { label: "contacts", href: "#contacts" },
]

export function Navbar() {
  const t = useTranslations("nav")
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0
    if (latest > previous && latest > 120) {
      setHidden(true)
    } else {
      setHidden(false)
    }
  })

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  return (
    <>
      <motion.header
        variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }}
        animate={hidden ? "hidden" : "visible"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="glass fixed top-10 right-0 left-0 z-50 border-b border-border/50"
      >
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5">
            <CatiLogoMark className="shadow-lg shadow-primary/20 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-sm leading-tight font-bold tracking-tight text-foreground">
                Ataberk Estate
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {t("platformSubtitle")}
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-1 backdrop-blur-sm lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t(item.label)}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <LocaleSwitcher />
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t("login")}
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30"
            >
              {t("portal")}
            </Link>
          </div>

          <button
            data-testid="menu-toggle"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-foreground lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label={t("toggleMenu")}
          >
            <AnimatePresence mode="wait">
              {open ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-4 w-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="h-4 w-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl lg:hidden"
          >
            <div className="container flex h-full flex-col pt-28 pb-8">
              <nav className="flex flex-1 flex-col gap-2">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      className="block rounded-2xl px-4 py-4 text-2xl font-bold text-foreground transition-colors hover:bg-muted"
                      onClick={() => setOpen(false)}
                    >
                      {t(item.label)}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="space-y-4 border-t border-border pt-6">
                <div className="flex items-center justify-between">
                  <LocaleSwitcher />
                  <ThemeToggle />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                    onClick={() => setOpen(false)}
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                    onClick={() => setOpen(false)}
                  >
                    {t("portal")}
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
