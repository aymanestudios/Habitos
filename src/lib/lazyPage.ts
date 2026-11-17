import { lazy } from 'react'
import type { ComponentType } from 'react'

// Pantallas "perezosas": su código se descarga aparte, así la app arranca antes en el móvil.
// - Se precargan en segundo plano unos segundos después de abrir la app (y el service worker las guarda:
//   así también abren sin conexión).
// - Si tras publicar una versión nueva el archivo viejo ya no existe, se recarga la app UNA vez.

const loaders: Array<() => Promise<unknown>> = []
const RELOAD_KEY = 'pg-chunk-reload'

export function lazyPage<K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) {
  loaders.push(loader)
  return lazy(async () => {
    try {
      const module = await loader()
      sessionStorage.removeItem(RELOAD_KEY)
      return { default: module[name] }
    } catch (error) {
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1')
        window.location.reload()
        return new Promise<never>(() => {}) // la página se recarga
      }
      throw error
    }
  })
}

/** Descarga en segundo plano todas las pantallas perezosas (cuando el móvil está libre). */
export function preloadPages() {
  const run = () => loaders.forEach((load) => void load().catch(() => {}))
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 5000 })
  else setTimeout(run, 3000)
}
