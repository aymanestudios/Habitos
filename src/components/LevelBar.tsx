import { useEffect, useRef, useState } from 'react'
import { useCountUp } from '@/lib/useCountUp'

type Props = { level: number; xpIntoLevel: number; xpLevelSize: number; className?: string }

// Insignia de nivel + barra de XP hacia el siguiente nivel.
// - El XP sube contando y la barra se rellena suave (los "+XP" vuelan hasta aquí: data-xp-target).
// - Si subes de nivel, la barra se llena hasta el final, vuelve a empezar y se rellena con lo que sobra
//   (no "retrocede"). Los números son siempre los del servidor: aquí solo se anima.
export function LevelBar({ level, xpIntoLevel, xpLevelSize, className = '' }: Props) {
  const pct = Math.min(100, Math.max(0, (xpIntoLevel / Math.max(1, xpLevelSize)) * 100))
  const shownXp = useCountUp(xpIntoLevel)
  const [bar, setBar] = useState({ width: pct, animate: true })
  const lastLevel = useRef(level)

  useEffect(() => {
    const previous = lastLevel.current
    lastLevel.current = level
    if (level <= previous || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBar({ width: pct, animate: level === previous })
      return
    }
    // Subida de nivel: 1) se llena, 2) vuelve a 0 sin animación, 3) se rellena con lo nuevo
    setBar({ width: 100, animate: true })
    const reset = window.setTimeout(() => setBar({ width: 0, animate: false }), 650)
    const refill = window.setTimeout(() => setBar({ width: pct, animate: true }), 700)
    return () => {
      window.clearTimeout(reset)
      window.clearTimeout(refill)
    }
  }, [level, pct])

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span
        key={level}
        className="animate-pop-in flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-lg font-bold text-accent-ink"
        aria-label={`Nivel ${level}`}
      >
        {level}
      </span>
      <div className="min-w-0 flex-1" data-xp-target>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Nivel {level}</span>
          <span className="tabular-nums">
            {shownXp} / {xpLevelSize} XP
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={`XP del nivel ${level}`}
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full origin-left rounded-full bg-accent ${bar.animate ? 'transition-[width] duration-700 ease-out' : ''}`}
            style={{ width: `${bar.width}%` }}
          />
        </div>
      </div>
    </div>
  )
}
