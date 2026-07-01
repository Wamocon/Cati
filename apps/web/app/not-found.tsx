import Link from "next/link"
import { Home, LayoutDashboard, SearchX } from "lucide-react"
import { CatiLogoMark } from "@/components/cati-logo"

export default function NotFound() {
  return (
    <main className="min-h-svh bg-[#061a17] px-5 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-5xl flex-col">
        <Link href="/tr" className="inline-flex w-fit items-center gap-3">
          <CatiLogoMark className="shadow-xl shadow-black/20" />
          <span className="text-sm font-black">1Çatı ERP</span>
        </Link>

        <section className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">404 / Route not found</p>
            <h1 className="mt-5 text-5xl font-black leading-[0.98] sm:text-6xl">
              This workspace page is not available.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/72">
              The link may be old, the module may have moved, or your role may not include this route. Return to the public site or open the ERP dashboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tr"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[#061a17] transition hover:bg-emerald-50"
              >
                <Home className="h-4 w-4" />
                Public site
              </Link>
              <Link
                href="/tr/dashboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/10 px-6 text-sm font-black text-white backdrop-blur transition hover:bg-white/16"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/14 bg-white/10 p-6 shadow-2xl shadow-black/25 backdrop-blur">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px]" />
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/12">
                <SearchX className="h-7 w-7 text-emerald-100" />
              </div>
              <div className="mt-8 grid gap-3">
                {["Check the URL and language prefix", "Confirm your role has access", "Use dashboard search for the record"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/12 bg-[#061a17]/45 px-4 py-3 text-sm font-bold text-white/82">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
