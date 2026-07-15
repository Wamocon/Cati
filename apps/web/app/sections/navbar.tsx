"use client"

import { Menu, X } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion"
import { Link } from "@/app/navigation"
import { usePathname } from "@/app/navigation"
import { CatiLogoMark } from "@/components/cati-logo"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "home", href: "/" },
  { label: "newLevel", href: "/new-level-premium" },
  { label: "catalog", href: "/#modules" },
  { label: "about", href: "/about" },
  { label: "platform", href: "/platform" },
  { label: "demo", href: "/pitch" },
  { label: "services", href: "/#workflows" },
  { label: "reviews", href: "/reviews" },
  { label: "contacts", href: "/#contact" },
  { label: "videos", href: "/videos", pulse: true },
]

const dialogFocusableSelector =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled])'

function keepFocusInsideDialog(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return

  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(dialogFocusableSelector)
  ).filter(
    (control) =>
      control.getAttribute("aria-hidden") !== "true" &&
      control.getClientRects().length > 0
  )
  const first = controls[0]
  const last = controls.at(-1)
  if (!first || !last) return

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

export function Navbar() {
  const t = useTranslations("nav")
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [activeHash, setActiveHash] = useState("")
  const mobileMenuId = "public-mobile-menu"
  const mobileMenuTitleId = "public-mobile-menu-title"
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileMenuRef = useRef<HTMLDialogElement>(null)
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null)
  const { scrollY } = useScroll()

  const closeMobileMenu = useCallback(() => setOpen(false), [])

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0
    if (latest > previous && latest > 120) {
      setHidden(true)
    } else {
      setHidden(false)
    }
  })

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    if (open) document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    const dialog = mobileMenuRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) dialog.showModal()
      mobileCloseButtonRef.current?.focus()
      return
    }

    if (dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1280px)")
    const closeAtDesktopWidth = () => {
      if (desktopQuery.matches) closeMobileMenu()
    }

    closeAtDesktopWidth()
    desktopQuery.addEventListener("change", closeAtDesktopWidth)
    return () => desktopQuery.removeEventListener("change", closeAtDesktopWidth)
  }, [closeMobileMenu])

  useEffect(() => {
    const updateActiveHash = () => setActiveHash(window.location.hash)
    updateActiveHash()
    window.addEventListener("hashchange", updateActiveHash)
    return () => window.removeEventListener("hashchange", updateActiveHash)
  }, [])

  return (
    <>
      <motion.header
        data-testid="public-navbar"
        variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }}
        animate={hidden ? "hidden" : "visible"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="glass fixed top-0 right-0 left-0 z-50 border-b border-border/50"
      >
        <div className="container flex h-16 items-center justify-between gap-2 sm:gap-3">
          <Link
            href="/"
            className="group flex min-w-0 shrink-0 items-center gap-2.5"
          >
            <CatiLogoMark className="shadow-lg shadow-primary/20 transition-transform group-hover:scale-105" />
            <div className="hidden min-w-0 flex-col min-[460px]:flex">
              <span className="text-sm leading-tight font-bold tracking-tight text-foreground">
                Ataberk Estate
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {t("platformSubtitle")}
              </span>
            </div>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0 rounded-full border border-border/60 bg-muted/40 px-1 py-1 backdrop-blur-sm xl:flex">
            {navItems.map((item) => {
              const active = isActiveNavItem(item.href, pathname, activeHash)

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground 2xl:gap-1.5 2xl:px-3 2xl:text-sm",
                    active &&
                      "bg-primary/10 font-bold text-primary shadow-sm ring-1 ring-primary/15"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.pulse ? <DemoPulse /> : null}
                  {t(item.label)}
                </Link>
              )
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <LocaleSwitcher />
            <Link
              href="/login?next=/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30"
            >
              {t("portal")}
            </Link>
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-1.5 xl:hidden">
            <LocaleSwitcher compact className="hidden min-[360px]:flex" />
            <button
              ref={menuButtonRef}
              type="button"
              data-testid="menu-toggle"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-foreground"
              onClick={() => setOpen((current) => !current)}
              aria-label={t("toggleMenu")}
              aria-expanded={open}
              aria-controls={mobileMenuId}
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
        </div>
      </motion.header>

      <dialog
        ref={mobileMenuRef}
        id={mobileMenuId}
        aria-labelledby={mobileMenuTitleId}
        onKeyDown={keepFocusInsideDialog}
        onCancel={(event) => {
          event.preventDefault()
          closeMobileMenu()
        }}
        onClose={() => {
          setOpen(false)
          menuButtonRef.current?.focus()
        }}
        className="fixed inset-0 z-[200] m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-background/95 p-0 text-foreground backdrop:bg-background/70 backdrop:backdrop-blur-xl xl:hidden"
      >
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full backdrop-blur-xl"
          >
            <h2 id={mobileMenuTitleId} className="sr-only">
              {t("toggleMenu")}
            </h2>
            <button
              ref={mobileCloseButtonRef}
              type="button"
              onClick={closeMobileMenu}
              aria-label={t("toggleMenu")}
              className="fixed top-4 right-4 z-[210] flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/80 text-foreground shadow-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="container flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain pt-24 pb-6 sm:pt-28 sm:pb-8">
              <nav
                aria-label={t("toggleMenu")}
                className="flex shrink-0 flex-col gap-1 sm:gap-2"
              >
                {navItems.map((item, index) => {
                  const active = isActiveNavItem(
                    item.href,
                    pathname,
                    activeHash
                  )

                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          "block rounded-2xl px-4 py-3 text-xl font-bold text-foreground transition-colors hover:bg-muted sm:py-4 sm:text-2xl",
                          active &&
                            "bg-primary/10 text-primary ring-1 ring-primary/15"
                        )}
                        aria-current={active ? "page" : undefined}
                        onClick={closeMobileMenu}
                      >
                        <span className="inline-flex items-center gap-2">
                          {item.pulse ? <DemoPulse /> : null}
                          {t(item.label)}
                        </span>
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>
              <div className="mt-4 space-y-4 border-t border-border pt-5 sm:mt-6 sm:pt-6">
                <div className="flex items-center">
                  <LocaleSwitcher />
                </div>
                <div className="grid gap-3">
                  <Link
                    href="/login?next=/dashboard"
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                    onClick={closeMobileMenu}
                  >
                    {t("portal")}
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </dialog>
    </>
  )
}

function DemoPulse() {
  return (
    <span
      className="relative inline-flex h-2.5 w-2.5 shrink-0"
      aria-hidden="true"
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-65" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_14px_color-mix(in_srgb,var(--primary)_68%,transparent)]" />
    </span>
  )
}

function isActiveNavItem(href: string, pathname: string, activeHash: string) {
  if (href.includes("#")) {
    const [basePath, hash] = href.split("#")
    return pathname === (basePath || "/") && activeHash === `#${hash}`
  }

  if (href === "/") return pathname === "/" && activeHash === ""
  return pathname === href || pathname.startsWith(`${href}/`)
}
