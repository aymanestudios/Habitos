import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { Mascot } from '@/components/Mascot'
import type { MascotPose } from '@/components/Mascot'
import { useProfile } from '@/features/profile/useProfile'
import { APP_NAME } from '@/lib/constants'
import { burstFrom } from '@/lib/confetti'
import { LAST_SCREEN, TOUR_STEPS, clampScreen, stepAt } from './onboardingRules'
import { TourScene } from './TourScenes'

// Tutorial de bienvenida: pantalla completa por encima de la app, con el panda como guía.
// Bienvenida → 6 pasos → final con confeti. Se avanza con botones, flechas del teclado o deslizando.
// Con "reducir movimiento" del sistema todo aparece sin animaciones (regla global en index.css).

type Props = {
  replay: boolean // abierto a mano desde Perfil
  onSkip: () => void
  onDone: () => void
}

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

// Posición de las manchas del fondo en cada pantalla (dan sensación de profundidad al avanzar)
const BLOBS: Array<[number, number][]> = [
  [[-10, -8], [60, 10], [10, 70]],
  [[50, -12], [-20, 30], [55, 65]],
  [[-15, 20], [55, -10], [20, 75]],
  [[40, 30], [-10, -15], [60, 70]],
  [[-20, 55], [50, 0], [5, -10]],
  [[55, 50], [-15, 5], [35, -15]],
  [[0, -15], [60, 40], [-15, 60]],
  [[20, 10], [-20, 60], [60, -10]],
]

function ArrowIcon({ back = false }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${back ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/** El panda hablando: se balancea mientras aparecen las palabras del bocadillo, luego flota. */
function Guide({ pose, text, side, size = 'h-28 sm:h-32', startDelay = 200 }: {
  pose: MascotPose
  text: string
  side: 'left' | 'right'
  size?: string
  startDelay?: number
}) {
  const words = text.split(' ')
  const speakMs = words.length * 45
  const talks = Math.max(2, Math.round(speakMs / 420))
  return (
    <div className={`flex items-end gap-3 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
      <div className="ob-pop shrink-0" style={delay(startDelay - 100)}>
        <div className="ob-talk" style={{ animationIterationCount: talks, animationDelay: `${startDelay}ms` }}>
          <div className="ob-idle" style={{ animationDelay: `${startDelay + talks * 420}ms` }}>
            <Mascot pose={pose} className={`${size} drop-shadow-[0_10px_14px_rgb(0_0_0/0.12)]`} />
          </div>
        </div>
      </div>
      <div
        className={`ob-bubble relative mb-6 min-w-0 flex-1 rounded-3xl border-2 border-line bg-surface px-4 py-3 text-[15px] font-semibold leading-snug shadow-card [@media(max-height:700px)]:text-sm ${
          side === 'right' ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
        style={{ animationDelay: `${startDelay}ms`, transformOrigin: side === 'right' ? '100% 100%' : '0% 100%' }}
      >
        {/* Piquito del bocadillo, apuntando al panda */}
        <span
          aria-hidden="true"
          className={`absolute -bottom-[2px] h-4 w-4 rotate-45 border-b-2 border-line bg-surface ${
            side === 'right' ? '-right-[7px] border-r-2' : '-left-[7px] border-l-2'
          }`}
        />
        <p className="relative">
          {words.map((word, i) => (
            <span key={i} className="ob-word" style={{ animationDelay: `${startDelay + 120 + i * 45}ms` }}>
              {word}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}

function Background({ screen }: { screen: number }) {
  const spots = BLOBS[screen] ?? BLOBS[0]
  const colors = ['var(--brand)', 'var(--accent)', 'var(--good)']
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {spots.map(([x, y], i) => (
        <div
          key={i}
          className="ob-blob"
          style={{
            width: i === 0 ? '55vmax' : '40vmax',
            height: i === 0 ? '55vmax' : '40vmax',
            transform: `translate(${x}vw, ${y}vh)`,
          }}
        >
          <div className="ob-drift h-full w-full rounded-full" style={{ background: colors[i], animationDelay: `${i * -3}s` }} />
        </div>
      ))}
      <div className="ob-dots absolute inset-0 opacity-70" />
    </div>
  )
}

function Progress({ screen }: { screen: number }) {
  // Un segmento por paso; el actual se estira
  return (
    <div className="flex flex-1 items-center gap-1.5" role="progressbar" aria-label="Progreso del tutorial" aria-valuemin={0} aria-valuemax={TOUR_STEPS.length} aria-valuenow={Math.min(screen, TOUR_STEPS.length)}>
      {TOUR_STEPS.map((step, i) => {
        const index = i + 1
        const state = screen > index ? 'done' : screen === index ? 'now' : 'next'
        return (
          <span
            key={step.id}
            className={`ob-seg h-2 rounded-full ${state === 'next' ? 'bg-line' : 'bg-brand'}`}
            style={{ flexGrow: state === 'now' ? 2.6 : 1 }}
          />
        )
      })}
    </div>
  )
}

function WelcomeScreen({ name, onStart, onSkip }: { name: string | null; onStart: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="relative mb-2 flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
        <span aria-hidden="true" className="absolute inset-6 rounded-full bg-brand-soft" />
        <span aria-hidden="true" className="ob-ring absolute inset-6 rounded-full border-4 border-brand" />
        <span aria-hidden="true" className="ob-ring absolute inset-6 rounded-full border-4 border-accent" style={delay(1300)} />
        <svg viewBox="0 0 24 24" aria-hidden="true" className="ob-spark absolute left-4 top-8 h-6 w-6 text-accent" style={delay(200)}>
          <path fill="currentColor" d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
        </svg>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="ob-spark absolute bottom-10 right-3 h-5 w-5 text-brand-edge" style={delay(900)}>
          <path fill="currentColor" d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
        </svg>
        <div className="ob-drop relative">
          <div className="ob-idle" style={{ animationDelay: '1s' }}>
            <Mascot pose="default" className="h-44 drop-shadow-[0_14px_18px_rgb(0_0_0/0.15)] sm:h-52" />
          </div>
        </div>
      </div>

      <span className="ob-up mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-ink" style={delay(500)}>
        <img src="/favicon.svg" alt="" aria-hidden="true" width={18} height={18} className="h-[18px] w-[18px]" />
        {APP_NAME}
      </span>
      <h1 id="ob-title" tabIndex={-1} className="outline-none ob-up max-w-md text-3xl font-extrabold leading-tight sm:text-4xl" style={delay(600)}>
        ¡Hola{name ? `, ${name}` : ''}! ¡Bienvenido a {APP_NAME}! 🐾
      </h1>
      <div className="ob-up mt-4 max-w-md space-y-2 text-[17px] leading-snug text-muted" style={delay(750)}>
        <p>Me alegra mucho que estés aquí. Soy tu compañero de aventuras y voy a enseñarte cómo funciona todo esto.</p>
        <p className="font-bold text-ink">¿Preparado para empezar a mejorar tus hábitos?</p>
      </div>

      <div className="ob-up mt-8 flex w-full max-w-xs flex-col items-stretch gap-3" style={delay(900)}>
        <button type="button" onClick={onStart} className="ob-next btn-primary flex items-center justify-center gap-2 px-6 py-4 text-base">
          ¡Vamos allá!
          <span className="ob-arrow"><ArrowIcon /></span>
        </button>
        <button type="button" onClick={onSkip} className="rounded-xl py-2 text-sm font-bold text-muted transition-colors hover:text-ink">
          Saltar introducción
        </button>
      </div>
    </div>
  )
}

function StepScreen({ screen }: { screen: number }) {
  const step = stepAt(screen)!
  return (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-6 px-5 py-6 [@media(max-height:700px)]:gap-4 [@media(max-height:700px)]:py-3 md:grid-cols-2 md:gap-14 md:px-10">
      <div className={`relative px-1 ${step.side === 'right' ? 'md:order-2' : ''}`}>
        <TourScene id={step.id} />
      </div>
      <div className="min-w-0">
        <p className="ob-up mb-2 text-xs font-extrabold uppercase tracking-wider text-brand-ink" style={delay(60)}>
          Paso {screen} de {TOUR_STEPS.length} · {step.tab}
        </p>
        <h2 id="ob-title" tabIndex={-1} className="outline-none ob-up text-3xl font-extrabold leading-tight md:text-4xl" style={delay(120)}>
          {step.title}
        </h2>
        <div className="mt-4">
          <Guide pose={step.pose} text={step.says} side={step.side} size="h-28 sm:h-32 [@media(max-height:700px)]:h-20" startDelay={300} />
        </div>
        {/* En pantallas muy bajitas (iPhone SE) basta con el panda y la escena */}
        <ul className="mt-1 space-y-2 [@media(max-height:700px)]:hidden">
          {step.points.map((point, i) => (
            <li key={point} className="ob-up flex items-start gap-2.5 text-[15px] font-semibold" style={delay(700 + i * 110)}>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-good-soft text-good-ink">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function FinalScreen({ onEnter, replay }: { onEnter: () => void; replay: boolean }) {
  const mascot = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Confeti al llegar (dos golpes, como al completar el día)
    const first = window.setTimeout(() => burstFrom(mascot.current, { count: 70, power: 1.6 }), 450)
    const second = window.setTimeout(() => burstFrom(mascot.current, { count: 40, power: 1.2 }), 1100)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(second)
    }
  }, [])
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="relative mb-4 flex h-60 w-60 items-center justify-center sm:h-72 sm:w-72">
        <span aria-hidden="true" className="capsule-rays absolute -inset-10 rounded-full" />
        <span aria-hidden="true" className="capsule-glow absolute inset-10 rounded-full bg-accent-soft blur-xl" />
        <div ref={mascot} className="ob-drop relative">
          <div className="ob-idle" style={{ animationDelay: '1s' }}>
            <Mascot pose="cheer" className="h-48 drop-shadow-[0_14px_18px_rgb(0_0_0/0.15)] sm:h-56" />
          </div>
        </div>
      </div>
      <h2 id="ob-title" tabIndex={-1} className="outline-none ob-up text-4xl font-extrabold leading-tight sm:text-5xl" style={delay(350)}>
        ¡Ya estás preparado!
      </h2>
      <p className="ob-up mt-4 max-w-md text-[17px] leading-snug text-muted" style={delay(500)}>
        Ahora empieza tu aventura. Crea tu primer hábito, consigue experiencia y demuestra de lo que eres capaz.
      </p>
      <p className="ob-up mt-2 text-lg font-extrabold text-brand-ink" style={delay(620)}>
        ¡Vamos a progresar!
      </p>
      <button
        type="button"
        onClick={onEnter}
        className="ob-up ob-next btn-primary mt-8 flex w-full max-w-xs items-center justify-center gap-2 px-6 py-4 text-base"
        style={delay(780)}
       
      >
        {replay ? 'Volver a la app' : `Entrar en ${APP_NAME}`}
        <span className="ob-arrow"><ArrowIcon /></span>
      </button>
    </div>
  )
}

export function OnboardingTour({ replay, onSkip, onDone }: Props) {
  const [screen, setScreen] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [closing, setClosing] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)
  const profile = useProfile()
  const firstName = profile.data?.display_name.trim().split(/\s+/)[0] ?? null

  const go = useCallback(
    (target: number) => {
      const next = clampScreen(target)
      setDirection(next >= screen ? 'next' : 'prev')
      setScreen(next)
    },
    [screen],
  )

  // Cierre con un fundido corto (no de golpe)
  const close = useCallback(
    (then: () => void) => {
      if (closing) return
      setClosing(true)
      window.setTimeout(then, 260)
    },
    [closing],
  )

  // La página de detrás no se mueve mientras está abierto
  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  // Teclado: flechas para moverse, Escape para salir
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' && screen < LAST_SCREEN) go(screen + 1)
      else if (event.key === 'ArrowLeft' && screen > 0) go(screen - 1)
      else if (event.key === 'Escape') close(onSkip)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, go, close, onSkip])

  // Al cambiar de pantalla, el foco va a su título (lo leen los lectores de pantalla; las flechas siguen funcionando)
  useEffect(() => {
    root.current?.querySelector<HTMLElement>('#ob-title')?.focus({ preventScroll: true })
    root.current?.querySelector('[data-scroll]')?.scrollTo({ top: 0 })
  }, [screen])

  function onTouchStart(event: TouchEvent) {
    touchX.current = event.touches[0].clientX
  }
  function onTouchEnd(event: TouchEvent) {
    if (touchX.current === null) return
    const dx = event.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 60) return
    if (dx < 0 && screen > 0 && screen < LAST_SCREEN) go(screen + 1)
    if (dx > 0 && screen > 1) go(screen - 1)
  }

  const isStep = stepAt(screen) !== null
  const isLastStep = screen === TOUR_STEPS.length

  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ob-title"
      className={`fixed inset-0 z-[70] flex flex-col bg-bg text-ink transition-opacity duration-300 ${closing ? 'opacity-0' : 'animate-fade'}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Background screen={screen} />

      {/* Arriba: progreso y "Saltar" */}
      <div className="pt-safe relative z-10">
        <div className={`mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-5 md:px-10 ${screen === 0 ? 'invisible' : ''}`}>
          <Progress screen={screen} />
          {isStep && (
            <button type="button" onClick={() => close(onSkip)} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-bold text-muted transition-colors hover:bg-surface-2 hover:text-ink">
              Saltar
            </button>
          )}
        </div>
      </div>

      {/* Contenido de la pantalla (con la animación según la dirección) */}
      <div data-scroll className="relative z-10 flex flex-1 flex-col overflow-y-auto overscroll-contain">
        <div key={screen} className={`my-auto w-full ${screen === 0 ? '' : direction === 'next' ? 'ob-in-next' : 'ob-in-prev'}`}>
          {screen === 0 && <WelcomeScreen name={firstName} onStart={() => go(1)} onSkip={() => close(onSkip)} />}
          {isStep && <StepScreen screen={screen} />}
          {screen === LAST_SCREEN && <FinalScreen replay={replay} onEnter={() => close(onDone)} />}
        </div>
      </div>

      {/* Abajo: atrás / siguiente (solo en los pasos) */}
      {isStep && (
        <div className="pb-safe relative z-10">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 pb-4 pt-2 md:px-10 md:pb-8">
            <button
              type="button"
              onClick={() => go(screen - 1)}
              aria-label={screen === 1 ? 'Volver a la bienvenida' : 'Paso anterior'}
              className="ob-back flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-line bg-surface text-ink shadow-card hover:bg-surface-2"
            >
              <ArrowIcon back />
            </button>
            <button
              type="button"
              onClick={() => go(screen + 1)}
              className="ob-next btn-primary flex h-14 flex-1 items-center justify-center gap-2 px-6 text-base sm:max-w-xs"
             
            >
              {isLastStep ? '¡Terminar!' : 'Siguiente'}
              <span className="ob-arrow"><ArrowIcon /></span>
            </button>
          </div>
        </div>
      )}

      {/* Aviso para lectores de pantalla */}
      <p className="sr-only" aria-live="polite">
        {isStep ? `Paso ${screen} de ${TOUR_STEPS.length}: ${stepAt(screen)!.title}` : ''}
      </p>
    </div>,
    document.body,
  )
}
