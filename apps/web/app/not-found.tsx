import Link from "next/link"

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 py-16 text-foreground">
      <section className="w-full max-w-lg rounded-lg border border-border bg-card p-7 shadow-xl shadow-foreground/10">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-primary">
          404
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight">
          Sayfa bulunamadi
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Aradiginiz operasyon ekrani tasinmis veya artik kullanilmiyor.
          Dashboard ana ekranina geri donebilirsiniz.
        </p>
        <Link
          href="/tr/dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
        >
          Dashboarda don
        </Link>
      </section>
    </main>
  )
}
