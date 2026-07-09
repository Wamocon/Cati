const CACHE_NAME = "cati-web-shell-v2"
const SHELL_URLS = [
  "/",
  "/tr/login",
  "/tr/dashboard",
  "/tr/new-level-premium",
  "/de/videos",
  "/icons/cati-icon.svg",
  "/favicon.ico",
  "/new-level-premium/resort-exterior.jpg",
  "/new-level-premium/showroom-bedroom.jpg",
  "/new-level-premium/masterplan-aerial.jpg",
  "/new-level-premium/site-progress-2026.jpg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/tr/dashboard")))
    )
    return
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/new-level-premium/") ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)))
  }
})
