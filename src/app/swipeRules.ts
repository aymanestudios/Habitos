// Reglas puras del gesto de deslizar entre pestañas (sin React). Se pueden probar solas.

export const SWIPE_DISTANCE = 70 // px mínimos para cambiar de pestaña
export const SWIPE_FAST = 0.45 // px/ms: un gesto rápido cuenta aunque sea más corto
export const EDGE_GUARD = 16 // px desde el borde: ahí manda el gesto del sistema (volver atrás)

/** ¿El dedo va de lado (y no hacia abajo, haciendo scroll)? Se decide en los primeros píxeles. */
export function isHorizontal(dx: number, dy: number): boolean | null {
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return null // aún no se sabe
  return Math.abs(dx) > Math.abs(dy) * 1.4
}

/** Al soltar: -1 = pestaña anterior, 1 = siguiente, 0 = quedarse. */
export function swipeResult(dx: number, ms: number): -1 | 0 | 1 {
  const speed = Math.abs(dx) / Math.max(ms, 1)
  const far = Math.abs(dx) >= SWIPE_DISTANCE
  const quick = Math.abs(dx) >= 35 && speed >= SWIPE_FAST
  if (!far && !quick) return 0
  return dx < 0 ? 1 : -1 // dedo a la izquierda = avanzar
}

/** Índice de la pestaña de una dirección, o -1 si no es una pantalla principal. */
export function tabIndex(pathname: string, tabs: string[]): number {
  const clean = pathname.replace(/\/+$/, '') || '/'
  return tabs.indexOf(clean)
}

/** Lo que se mueve la página mientras arrastras: sigue al dedo, pero frena en los extremos. */
export function dragOffset(dx: number, canGo: boolean): number {
  const damped = dx * 0.35
  return canGo ? damped : damped * 0.3
}
