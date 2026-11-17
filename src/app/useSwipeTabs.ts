import { useEffect, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { navItems } from './navigation'
import { EDGE_GUARD, dragOffset, dragOpacity, isHorizontal, swipeResult, tabIndex } from './swipeRules'

const TABS = navItems.map((item) => item.to)
const SPRING = 'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.26s ease'

// ¿El dedo empezó en algo que ya usa el gesto de lado? (carruseles, barras de zoom, campos, paneles)
function blocked(target: EventTarget | null): boolean {
  if (document.body.style.overflow === 'hidden') return true // hay un panel abierto
  let node = target as HTMLElement | null
  while (node && node !== document.body) {
    if (node.dataset?.noSwipe !== undefined) return true
    const tag = node.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable) return true
    if (node.getAttribute?.('role') === 'dialog') return true
    // Solo miramos el estilo si de verdad el elemento es más ancho que su caja (barato en el caso normal)
    if (node.scrollWidth > node.clientWidth + 2) {
      const style = window.getComputedStyle(node)
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') return true
    }
    node = node.parentElement
  }
  return false
}

// Deslizar con el dedo entre las 5 pantallas principales (solo móvil / pantallas táctiles).
// FLUIDEZ: mientras arrastras, la página se mueve directamente (transform en la GPU, una vez por fotograma)
// sin volver a pintar React. Así no se re-dibuja toda la pantalla 60 veces por segundo.
export function useSwipeTabs() {
  const location = useLocation()
  const navigate = useNavigate()
  const index = tabIndex(location.pathname, TABS)
  const page = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number; t: number; horizontal: boolean | null } | null>(null)
  const frame = useRef(0)
  const pending = useRef(0)
  // A qué pantalla se llegó deslizando y desde qué lado (solo esa entra con animación lateral)
  const [enter, setEnter] = useState<{ path: string; from: 'left' | 'right' } | null>(null)

  function paint(x: number, animate: boolean) {
    const el = page.current
    if (!el) return
    el.style.transition = animate ? SPRING : 'none'
    el.style.transform = x ? `translate3d(${x}px, 0, 0)` : ''
    el.style.opacity = x ? String(dragOpacity(x, window.innerWidth)) : ''
    el.style.willChange = x && !animate ? 'transform' : ''
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  function onTouchStart(event: TouchEvent) {
    if (index < 0 || event.touches.length !== 1) return
    const touch = event.touches[0]
    if (touch.clientX < EDGE_GUARD || touch.clientX > window.innerWidth - EDGE_GUARD) return
    if (blocked(event.target)) return
    start.current = { x: touch.clientX, y: touch.clientY, t: performance.now(), horizontal: null }
  }

  function onTouchMove(event: TouchEvent) {
    const s = start.current
    if (!s) return
    const touch = event.touches[0]
    const dx = touch.clientX - s.x
    const dy = touch.clientY - s.y
    if (s.horizontal === null) s.horizontal = isHorizontal(dx, dy)
    if (s.horizontal === false) {
      start.current = null // es scroll vertical: no hacemos nada
      return
    }
    if (!s.horizontal) return
    const next = index + (dx < 0 ? 1 : -1)
    pending.current = dragOffset(dx, next >= 0 && next < TABS.length)
    if (!frame.current) {
      frame.current = requestAnimationFrame(() => {
        frame.current = 0
        paint(pending.current, false)
      })
    }
  }

  function onTouchEnd(event: TouchEvent) {
    const s = start.current
    start.current = null
    cancelAnimationFrame(frame.current)
    frame.current = 0
    if (!s || !s.horizontal) {
      paint(0, false)
      return
    }
    const touch = event.changedTouches[0]
    const direction = swipeResult(touch.clientX - s.x, performance.now() - s.t)
    const next = index + direction
    if (direction === 0 || next < 0 || next >= TABS.length) {
      paint(0, true) // vuelve a su sitio con un muelle suave
      return
    }
    setEnter({ path: TABS[next], from: direction === 1 ? 'right' : 'left' })
    navigate(TABS[next])
  }

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
    pageRef: page,
    enterClass:
      enter?.path === location.pathname ? (enter.from === 'right' ? 'animate-enter-right' : 'animate-enter-left') : '',
    pageKey: location.pathname,
  }
}
