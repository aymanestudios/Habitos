// Service worker de Progress&Go: hace que la app arranque rápido y que abra aunque no haya conexión.
// Regla de oro: NUNCA toca las llamadas a Supabase (otro dominio) ni nada que no sea GET.
// Así los datos (hábitos, XP, sesión) siempre vienen del servidor y no se quedan "viejos".
// Si cambias este archivo, sube el número de VERSION para limpiar la caché antigua.
const VERSION = 'v2'
const SHELL = `pg-shell-${VERSION}`
const STATIC = `pg-static-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.add('/')))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function networkFirstPage(request) {
  try {
    const response = await fetch(request)
    if (response.ok) (await caches.open(SHELL)).put('/', response.clone())
    return response
  } catch {
    // Sin conexión: se abre la última versión guardada de la app (es una SPA: la misma página sirve para todas las rutas)
    return (await caches.match('/')) || Response.error()
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) (await caches.open(STATIC)).put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC)
  const cached = await cache.match(request)
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || refresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // Supabase y cualquier otro dominio: ni tocarlo
  if (url.pathname === '/sw.js') return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request)) // archivos con hash en el nombre: nunca cambian
  } else {
    event.respondWith(staleWhileRevalidate(request)) // iconos, mascota, manifest
  }
})
