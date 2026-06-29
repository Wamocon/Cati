"use client"

import { AlertTriangle, Home, RotateCw } from "lucide-react"
import { Link } from "@/app/navigation"

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-5 py-10 text-foreground">
      <section className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-black/[0.06] sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-destructive">Screen error</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-card-foreground">
          This page could not be loaded safely.
        </h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          Retry the view. If it fails again, send the digest to support so the route, role and API response can be traced.
        </p>
        {error.digest && (
          <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Digest: {error.digest}
          </p>
        )}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
          >
            <RotateCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-black text-foreground transition hover:bg-muted"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </div>
      </section>
    </main>
  )
}
