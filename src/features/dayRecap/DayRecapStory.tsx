import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import type { MascotPose } from '@/components/Mascot'
import { ProgressRing } from '@/components/ProgressRing'
import { Flame } from '@/features/streaks/Flame'
import { burstFrom } from '@/lib/confetti'
import { useCountUp } from '@/lib/useCountUp'
import { closingFor, dayLabel, dayPercent, habitsLine, scenesFor, streakLine, teamLines } from './dayRecapRules'
import type { DayRecap, SceneId } from './dayRecapRules'

// Pequeña historia del día con el panda: 3-6 escenas cortas, todas con datos reales.
// Se avanza tocando (derecha = siguiente, izquierda = anterior), con los botones o con las flechas.
// "Saltar" la cierra en cualquier momento. No bloquea nada: es una capa que se quita al momento.

function Bubble({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <p className="animate-cel-up relative mx-auto max-w-[19rem] rounded-3xl border-2 border-line bg-surface px-5 py-3.5 text-center text-[17px] font-bold leading-snug shadow-card" style={{ animationDelay: `${delay}s` }}>
      {children}
    </p>
  )
}

function Panda({ pose, className = 'h-36' }: { pose: MascotPose; className?: string }) {
  return (
    <div className="animate-cel-mascot">
      <div className="ob-idle">
        <Mascot pose={pose} className={className} />
      </div>
    </div>
  )
}

function CountUp({ to, prefix = '' }: { to: number; prefix?: string }) {
  const [target, setTarget] = useState(0)
  useEffect(() => {
    const timer = window.setTimeout(() => setTarget(to), 250)
    return () => window.clearTimeout(timer)
  }, [to])
  const shown = useCountUp(target, 1100)
  return (
    <span className="tabular-nums">
      {prefix}
      {shown}
    </span>
  )
}

function Scene({ id, recap, today }: { id: SceneId; recap: DayRecap; today: string }) {
  const spot = useRef<HTMLDivElement>(null)
  const [ring, setRing] = useState(0)
  const pct = dayPercent(recap)

  useEffect(() => {
    if (id === 'habits' && pct !== null) {
      const timer = window.setTimeout(() => setRing(pct), 200)
      return () => window.clearTimeout(timer)
    }
  }, [id, pct])

  // Pequeño confeti solo en los momentos buenos (día completo, nivel, récord, reto cumplido)
  useEffect(() => {
    const good =
      (id === 'habits' && pct === 100) ||
      (id === 'xp' && recap.levelAfter > recap.levelBefore) ||
      (id === 'streak' && recap.newRecord) ||
      (id === 'team' && recap.team.some((t) => t.completed))
    if (!good) return
    const timer = window.setTimeout(() => burstFrom(spot.current, { count: 26, power: 0.9 }), 700)
    return () => window.clearTimeout(timer)
  }, [id, pct, recap])

  if (id === 'welcome') {
    return (
      <>
        <Panda pose="default" className="h-44" />
        <Bubble delay={0.35}>¡Vamos a ver qué tal te fue {dayLabel(recap.date, today)}!</Bubble>
      </>
    )
  }

  if (id === 'habits') {
    return (
      <>
        <div ref={spot} className="animate-cel-reveal">
          {pct !== null ? (
            <ProgressRing value={ring} size={168} stroke={14} tone={pct === 100 ? 'good' : 'brand'}>
              <span className="text-4xl font-black tabular-nums">
                {recap.done}/{recap.scheduled}
              </span>
              <span className="text-xs font-bold text-muted">hábitos</span>
            </ProgressRing>
          ) : (
            <span className="flex h-36 w-36 items-center justify-center rounded-full bg-good text-5xl font-black text-on-brand">{recap.completed}</span>
          )}
        </div>
        <Bubble delay={0.3}>{habitsLine(recap)}</Bubble>
        {recap.habits.length > 0 && (
          <ul className="flex max-w-xs flex-wrap justify-center gap-1.5">
            {recap.habits.map((h, i) => (
              <li key={h.title + i} className="animate-cel-up flex items-center gap-1 rounded-full bg-good-soft px-3 py-1 text-xs font-bold text-good-ink" style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
                <Icon name="check" className="h-3.5 w-3.5" />
                {h.title}
              </li>
            ))}
          </ul>
        )}
      </>
    )
  }

  if (id === 'xp') {
    const levelUp = recap.levelAfter > recap.levelBefore
    return (
      <>
        <Panda pose="star" className="h-32" />
        <div ref={spot} className="animate-cel-reveal rounded-[28px] bg-accent px-8 py-4 text-5xl font-black text-[#3b2a06] shadow-xl">
          <CountUp to={recap.xp} prefix="+" /> XP
        </div>
        <Bubble delay={0.4}>
          {levelUp ? `¡Conseguiste ${recap.xp} XP y subiste al nivel ${recap.levelAfter}!` : `¡Conseguiste ${recap.xp} XP!`}
          {recap.xpTeam > 0 && <span className="mt-1 block text-sm font-semibold text-muted">{recap.xpTeam} de ellos por un reto en equipo.</span>}
        </Bubble>
      </>
    )
  }

  if (id === 'streak') {
    return (
      <>
        <div ref={spot} className="animate-cel-reveal relative">
          <Flame days={recap.streak} size={150} moment={recap.newRecord ? 'evolve' : 'kept'} />
        </div>
        <Bubble delay={0.3}>{streakLine(recap)}</Bubble>
      </>
    )
  }

  if (id === 'team') {
    return (
      <>
        <div ref={spot}>
          <Panda pose="cheer" className="h-36" />
        </div>
        <div className="space-y-2">
          {teamLines(recap).map((line, i) => (
            <Bubble key={line} delay={0.3 + i * 0.15}>{line}</Bubble>
          ))}
        </div>
      </>
    )
  }

  const closing = closingFor(recap)
  return (
    <>
      <Panda pose={closing.pose} className="h-40" />
      <div className="animate-cel-up text-center" style={{ animationDelay: '0.3s' }}>
        <h2 className="text-2xl font-black">{closing.title}</h2>
        <p className="mx-auto mt-2 max-w-[18rem] text-[15px] font-semibold text-muted">{closing.text}</p>
      </div>
    </>
  )
}

export function DayRecapStory({ recap, today, onClose }: { recap: DayRecap; today: string; onClose: () => void }) {
  const scenes = scenesFor(recap)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const last = index === scenes.length - 1
  const box = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  function go(step: 1 | -1) {
    setDirection(step > 0 ? 'next' : 'prev')
    setIndex((value) => {
      const next = value + step
      if (next >= scenes.length) {
        window.setTimeout(() => close.current(), 0)
        return value
      }
      return Math.max(0, next)
    })
  }
  const goRef = useRef(go)
  goRef.current = go

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    box.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current()
      else if (event.key === 'ArrowRight') goRef.current(1)
      else if (event.key === 'ArrowLeft') goRef.current(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label="Tu día en Progress&Go"
      tabIndex={-1}
      className="animate-fade fixed inset-0 z-[70] flex flex-col bg-bg outline-none"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ob-blob absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-soft blur-3xl" />
        <div className="ob-blob absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-accent-soft blur-3xl" style={{ animationDelay: '-6s' }} />
      </div>

      {/* Arriba: progreso por escenas y "Saltar" */}
      <div className="pt-safe relative z-10 px-4">
        <div className="mx-auto flex max-w-md items-center gap-3 pt-3">
          <div className="flex flex-1 gap-1.5" role="progressbar" aria-label="Escena" aria-valuemin={1} aria-valuemax={scenes.length} aria-valuenow={index + 1}>
            {scenes.map((scene, i) => (
              <span key={scene} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span className={`block h-full rounded-full bg-brand transition-[width] duration-500 ${i <= index ? 'w-full' : 'w-0'}`} />
              </span>
            ))}
          </div>
          <button type="button" onClick={() => close.current()} className="rounded-full px-3 py-1.5 text-sm font-bold text-muted hover:text-ink">
            Saltar
          </button>
        </div>
      </div>

      {/* Escena: tocar a la izquierda vuelve, en el resto avanza */}
      <div className="relative z-10 flex flex-1 items-center justify-center overflow-hidden px-6">
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => go(-1)} className="absolute inset-y-0 left-0 z-10 w-1/4" />
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => go(1)} className="absolute inset-y-0 right-0 z-10 w-3/4" />
        <div key={scenes[index]} className={`flex w-full max-w-md flex-col items-center gap-5 ${direction === 'next' ? 'ob-in-next' : 'ob-in-prev'}`} aria-live="polite">
          <Scene id={scenes[index]} recap={recap} today={today} />
        </div>
      </div>

      {/* Abajo: anterior / siguiente */}
      <div className="pb-safe relative z-20 px-6">
        <div className="mx-auto flex max-w-md items-center gap-3 pb-6">
          {index > 0 && (
            <button type="button" onClick={() => go(-1)} aria-label="Escena anterior" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-line bg-surface text-muted">
              <span aria-hidden="true" className="text-xl font-black">‹</span>
            </button>
          )}
          <button type="button" onClick={() => go(1)} className="btn-primary flex-1 py-3.5">
            {last ? '¡A por hoy!' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
