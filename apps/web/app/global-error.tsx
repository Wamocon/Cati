"use client"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="tr">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "#f7f3ee",
            color: "#1f2933",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <section
            style={{
              width: "min(100%, 520px)",
              border: "1px solid rgba(31, 41, 51, 0.14)",
              borderRadius: "8px",
              background: "#fffaf5",
              padding: "28px",
              boxShadow: "0 24px 80px rgba(31, 41, 51, 0.12)",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9a3412",
              }}
            >
              Sistem durumu
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                lineHeight: 1.15,
                fontWeight: 900,
              }}
            >
              Sayfa yuklenemedi
            </h1>
            <p
              style={{
                margin: "14px 0 22px",
                fontSize: "15px",
                lineHeight: 1.7,
                color: "#52616f",
              }}
            >
              Beklenmeyen bir hata olustu. Operasyon ekranina geri donmek icin
              sayfayi yeniden deneyin.
            </p>
            <button
              onClick={() => reset()}
              style={{
                height: "40px",
                border: 0,
                borderRadius: "6px",
                background: "#0f766e",
                color: "#ffffff",
                padding: "0 16px",
                fontSize: "14px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Tekrar dene
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}
