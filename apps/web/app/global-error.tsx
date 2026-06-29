"use client"

import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "#061a17",
            color: "#ffffff",
            fontFamily:
              'Aptos, "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          <section
            style={{
              width: "min(100%, 760px)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "24px",
              background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
              padding: "32px",
              boxShadow: "0 30px 100px rgba(0,0,0,0.28)",
              backdropFilter: "blur(18px)",
            }}
          >
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#a7f3d0",
              }}
            >
              System recovery
            </p>
            <h1
              style={{
                margin: 0,
                maxWidth: "620px",
                fontSize: "clamp(34px, 6vw, 64px)",
                lineHeight: 0.98,
                fontWeight: 950,
              }}
            >
              The ERP view could not be loaded.
            </h1>
            <p
              style={{
                margin: "20px 0 0",
                maxWidth: "620px",
                fontSize: "16px",
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.74)",
              }}
            >
              Please retry the screen. If the issue repeats, share the error digest with the administrator so the failed route can be traced in logs.
            </p>
            {error.digest && (
              <p
                style={{
                  margin: "18px 0 0",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Digest: {error.digest}
              </p>
            )}
            <div style={{ marginTop: "28px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <button
                onClick={() => reset()}
                style={{
                  height: "44px",
                  border: 0,
                  borderRadius: "999px",
                  background: "#ffffff",
                  color: "#061a17",
                  padding: "0 20px",
                  fontSize: "14px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <Link
                href="/tr/dashboard"
                style={{
                  height: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.1)",
                  color: "#ffffff",
                  padding: "0 20px",
                  fontSize: "14px",
                  fontWeight: 900,
                  textDecoration: "none",
                }}
              >
                Open dashboard
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}
