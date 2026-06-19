"use client"

import { Link } from "@/app/navigation"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-black text-card-foreground">
            1Çatı Giriş
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ataberk Estate müşterileri ve çalışanları için müşteri paneli
          </p>
        </div>

        <form className="mt-8 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-card-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="siz@ornek.com"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-card-foreground"
            >
              Şifre
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Giriş Yap
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Supabase ile kimlik doğrulama, proje yapılandırması tamamlandığında
          etkinleştirilecektir.
        </p>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  )
}
