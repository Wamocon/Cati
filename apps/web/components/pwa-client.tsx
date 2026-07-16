"use client"

import { useEffect } from "react"

export function PwaClient() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_PWA === "true") return
    if (!("serviceWorker" in navigator)) return

    let cancelled = false
    let unsubscribeAuth: (() => void) | undefined

    const purgeSensitiveState = async (notifyServiceWorker = true) => {
      try {
        const { purgeOfflineQueue } = await import("@/components/offline-sync/offline-queue")
        await purgeOfflineQueue("Authentication or access profile changed")
      } catch {
        // A failed local purge is followed by a direct IndexedDB deletion in the service worker.
      }

      if (notifyServiceWorker) {
        navigator.serviceWorker.controller?.postMessage({ type: "CATI_PURGE_SENSITIVE" })
      }
      window.dispatchEvent(new CustomEvent("cati:offline-purged"))
    }

    const onServiceWorkerMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "CATI_PURGE_SENSITIVE") void purgeSensitiveState(false)
      if (event.data?.type === "CATI_REPLAY_OFFLINE_QUEUE") {
        window.dispatchEvent(new CustomEvent("cati:offline-replay-requested"))
      }
    }

    navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage)

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      } catch {
        // The app remains a normal responsive web app if service-worker registration is unavailable.
      }
    }

    void register()

    const configureAuthPurge = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return

      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data } = supabase.auth.onAuthStateChange((event) => {
          if (event === "SIGNED_OUT") void purgeSensitiveState()
        })
        if (cancelled) data.subscription.unsubscribe()
        else unsubscribeAuth = () => data.subscription.unsubscribe()
      } catch {
        // The access-profile endpoint remains a second purge boundary for local QA sessions.
      }
    }

    void configureAuthPurge()

    return () => {
      cancelled = true
      unsubscribeAuth?.()
      navigator.serviceWorker.removeEventListener("message", onServiceWorkerMessage)
    }
  }, [])

  return null
}
