import { useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { navItems } from './navigation'
import { EDGE_GUARD, dragOffset, isHorizontal, swipeResult, tabIndex } from './swipeRules'

const TABS = navItems.map((item) => item.to)

// ¿El dedo empezó en algo que ya usa el gesto de lado? (carruseles, barras de zoom, campos, paneles)
function blocked(target: EventTarget | null): boolean {
  let node = target as HTMLElement | null
  while (node && node !== document.body) {
    if (node.dataset?.noSwipe !== undefined) return true
    const tag = node.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable) return true
    if (node.getAttribute?.('role') === 'dialog') return true
    const style = window.getComputedStyle(node)
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 2) return true
    node = node.parentElement
  }
  return document.body.style.overflow === 'hidden' // hay un panel abierto
}

// Deslizar con el dedo entre las 5 pantallas principales (solo móvil / pantallas táctiles).
export function useSwipeTabs() {
  const location = useLocation()
  const navigate = useNavigate()
  const index = tabIndex(location.pathname, TABS)
  const start = useRef<{ x: number; y: number; t: number; horizontal: boolean | null } | null>(null)
  const [offset, setOffset] = useState(0)
  // A qué pantalla se llegó deslizando y desde qué lado (solo esa entra con animación lateral)
  const [enter, setEnter] = useState<{ path: string; from: 'left' | 'right' } | null>(null)

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
    if (s.horizontal) {
      const next = index + (dx < 0 ? 1 : -1)
      setOffset(dragOffset(dx, next >= 0 && next < TABS.length))
    }
  }

  function onTouchEnd(event: TouchEvent) {
    const s = start.current
    start.current = null
    setOffset(0)
    if (!s || !s.horizontal) return
    const touch = event.changedTouches[0]
    const direction = swipeResult(touch.clientX - s.x, performance.now() - s.t)
    const next = index + direction
    if (direction === 0 || next < 0 || next >= TABS.length) return
    setEnter({ path: TABS[next], from: direction === 1 ? 'right' : 'left' })
    navigate(TABS[next])
  }

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
    offset,
    enterClass:
      enter?.path === location.pathname ? (enter.from === 'right' ? 'animate-enter-right' : 'animate-enter-left') : '',
    pageKey: location.pathname,
  }
}
