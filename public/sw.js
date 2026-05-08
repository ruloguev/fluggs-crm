// Service Worker para Flugzz PWA
// Estrategia: Network First para API, Cache First para assets estáticos

const CACHE_NAME = "flugzz-v1"
const STATIC_ASSETS = ["/", "/pipeline", "/dashboard", "/contactos"]

// Instalar — cachear assets clave
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  )
  self.skipWaiting()
})

// Activar — limpiar caches viejos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch — Network First para todo
self.addEventListener("fetch", (event) => {
  // Ignorar requests que no son GET o son de otras origins
  if (event.request.method !== "GET") return
  if (!event.request.url.startsWith(self.location.origin)) return

  // API calls: siempre red, sin cache
  if (event.request.url.includes("/api/")) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear respuestas exitosas
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() =>
        // Offline: servir desde cache si existe
        caches.match(event.request).then((cached) => {
          if (cached) return cached
          // Fallback para navegación
          if (event.request.mode === "navigate") {
            return caches.match("/") 
          }
          return new Response("Offline", { status: 503 })
        })
      )
  )
})