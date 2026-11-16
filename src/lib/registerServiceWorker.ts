// Activa el service worker (public/sw.js) solo en la versión publicada.
// En desarrollo (npm run dev) NO se registra: la caché daría la falsa impresión de que los cambios no se ven.
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Si falla, la app funciona igual, solo que sin modo sin conexión
    })
  })
}
