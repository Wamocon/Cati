"use client"

import { useEffect } from "react"

export function PwaClient() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_PWA === "true") return
    if (!("serviceWorker" in navigator)) return

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      } catch {
        // The app remains a normal responsive web app if service-worker registration is unavailable.
      }
    }

    register()
  }, [])

  return null
}
