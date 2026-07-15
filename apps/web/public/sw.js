const STATIC_CACHE = "cati-static-v3"
const OFFLINE_DATABASE = "cati-offline-commands-v1"
const MAX_STATIC_ENTRIES = 80
const SAFE_SHELL_URLS = ["/offline.html", "/icons/cati-icon.svg", "/favicon.ico"]

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)))
}

async function notifyClients(type) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" })
  clients.forEach((client) => client.postMessage({ type }))
}

function deleteOfflineDatabase() {
  return new Promise((resolve) => {
    if (!("indexedDB" in self)) {
      resolve()
      return
    }

    const request = indexedDB.deleteDatabase(OFFLINE_DATABASE)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}

async function purgeSensitiveState() {
  await notifyClients("CATI_PURGE_SENSITIVE")
  await deleteOfflineDatabase()

  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName !== STATIC_CACHE)
      .map((cacheName) => caches.delete(cacheName))
  )
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(SAFE_SHELL_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "CATI_PURGE_SENSITIVE") {
    event.waitUntil(purgeSensitiveState())
  }

  if (event.data?.type === "CATI_REPLAY_OFFLINE_QUEUE") {
    event.waitUntil(notifyClients("CATI_REPLAY_OFFLINE_QUEUE"))
  }
})

self.addEventListener("sync", (event) => {
  if (event.tag === "cati-offline-replay") {
    event.waitUntil(notifyClients("CATI_REPLAY_OFFLINE_QUEUE"))
  }
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  if (
    url.pathname === "/api/access-profile" &&
    (request.method === "POST" || request.method === "DELETE")
  ) {
    event.respondWith(
      fetch(request).then(async (response) => {
        if (response.ok) await purgeSensitiveState()
        return response
      })
    )
    return
  }

  if (request.method !== "GET") return

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/dashboard/")) return

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")))
    return
  }

  const isSafeStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico"

  if (isSafeStaticAsset) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok && response.type === "basic") {
          const cache = await caches.open(STATIC_CACHE)
          await cache.put(request, response.clone())
          await trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES)
        }
        return response
      })
    )
  }
})
