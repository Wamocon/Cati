import { Home, LayoutDashboard, SearchX } from "lucide-react"
import { Link } from "@/app/navigation"

export default function LocaleNotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-5 py-10 text-foreground">
      <section className="w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/[0.06]">
        <div className="grid md:grid-cols-[0.82fr_1fr]">
          <div className="bg-[#061a17] p-6 text-white sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <SearchX className="h-6 w-6 text-emerald-100" />
            </div>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">404</p>
            <h1 className="mt-3 text-4xl font-black leading-tight">
              Page not found.
            </h1>
          </div>
          <div className="p-6 sm:p-8">
            <p className="text-base leading-8 text-muted-foreground">
              The route may have moved, or your role may not include this ERP module. Use the dashboard or return to the public site.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-black text-foreground transition hover:bg-muted"
              >
                <Home className="h-4 w-4" />
                Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
