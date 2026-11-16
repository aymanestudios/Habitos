import { useEffect, useRef, useState } from 'react'

// Hace que un número "suba" hasta su nuevo valor (XP, racha...). Con movimiento reducido cambia de golpe.
export function useCountUp(target: number, ms = 700): number {
  const [shown, setShown] = useState(target)
  const from = useRef(target)

  useEffect(() => {
    const start = from.current
    if (start === target) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = target
      setShown(target)
      return
    }
    let frame = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      const value = Math.round(start + (target - start) * eased)
      from.current = value
      setShown(value)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, ms])

  return shown
}
