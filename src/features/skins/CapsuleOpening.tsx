import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/Icon'
import { errorMessage } from '@/features/habits/habitRules'
import { burst } from '@/lib/confetti'
import { SkinArt } from './SkinArt'
import { friendlySkinError, rouletteSteps } from './skinRules'
import type { CapsuleResult } from './skinRules'
import { useEquipSkin, useOpenCapsule } from './useSkins'

type Phase = 'ready' | 'charging' | 'roulette' | 'chosen' | 'reveal'

type Props = {
  open: boolean
  onClose: () => void
  canOpen: boolean
  unlimited: boolean
  equippedId: string | null
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Posición de cada sombra en el círculo (en % del escenario)
function spot(index: number, count: number) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2
  return { left: 50 + Math.cos(angle) * 36, top: 50 + Math.sin(angle) * 36 }
}

// EL MOMENTO ESPECIAL (1 ticket = 7 días de esfuerzo):
// cápsula brillando → se sacude → destello → aparecen las sombras de todas las skins →
// un foco va pasando cada vez más lento → se ilumina la tuya → va al centro y se revela en color.
export function CapsuleOpening({ open, onClose, canOpen, unlimited, equippedId }: Props) {
  const opening = useOpenCapsule()
  const equip = useEquipSkin()
  const [phase, setPhase] = useState<Phase>('ready')
  const [result, setResult] = useState<CapsuleResult | null>(null)
  const [lit, setLit] = useState(-1)
  const [flash, setFlash] = useState(0)
  const timers = useRef<number[]>([])

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms))
  }
  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }

  useEffect(() => {
    if (open) return
    clearTimers()
    setPhase('ready')
    setResult(null)
    setLit(-1)
    opening.reset()
    equip.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => () => clearTimers(), [])

  // Escape y bloqueo del scroll de la página de detrás
  const busy = phase === 'charging' || phase === 'roulette' || phase === 'chosen'
  useEffect(() => {
    if (!open) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, busy, onClose])

  function reveal(data: CapsuleResult) {
    setPhase('reveal')
    setFlash((n) => n + 1)
    burst(window.innerWidth / 2, window.innerHeight * 0.42, { count: data.isNew ? 140 : 50, power: 1.8 })
    later(() => burst(window.innerWidth * 0.25, window.innerHeight * 0.5, { count: 50, power: 1.2 }), 250)
    later(() => burst(window.innerWidth * 0.75, window.innerHeight * 0.5, { count: 50, power: 1.2 }), 450)
  }

  function play(data: CapsuleResult) {
    setResult(data)
    setFlash((n) => n + 1)
    const count = data.silhouettes.length
    if (count === 0 || reducedMotion()) {
      reveal(data)
      return
    }
    setPhase('roulette')
    setLit(-1)
    let t = 650 // primero aparecen las sombras
    for (const [index, wait] of rouletteSteps(count, data.winner)) {
      later(() => setLit(index), t)
      t += wait
    }
    later(() => setPhase('chosen'), t + 250) // la tuya brilla y las demás se apagan
    later(() => reveal(data), t + 1500)
  }

  function start() {
    if (busy) return
    clearTimers()
    setPhase('charging')
    setResult(null)
    const startedAt = Date.now()
    opening.mutate(undefined, {
      onSuccess: (data) => later(() => play(data), Math.max(0, 1500 - (Date.now() - startedAt))),
      onError: () => setPhase('ready'),
    })
  }

  if (!open) return null
  const skin = result?.skin
  const isEquipped = skin ? equippedId === skin.id : false
  const sils = result?.silhouettes ?? []
  const again = result ? result.unlimited || result.available > 0 : canOpen

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cápsula misteriosa"
      className="animate-fade fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-white"
      style={{ background: 'radial-gradient(circle at 50% 42%, #3b2a5c 0%, #17131f 55%, #0b0a10 100%)' }}
    >
      {!busy && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:text-white"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      )}

      {/* Destello blanco en cada cambio importante */}
      {flash > 0 && <div key={flash} className="capsule-flash pointer-events-none absolute inset-0 bg-white" aria-hidden="true" />}

      {/* Escenario cuadrado: cápsula, círculo de sombras o la skin revelada */}
      <div className="relative aspect-square w-[min(86vw,380px)]">
        <div
          className={`capsule-rays pointer-events-none absolute -inset-1/4 rounded-full transition-opacity duration-700 ${
            phase === 'roulette' ? 'opacity-30' : 'opacity-100'
          }`}
          aria-hidden="true"
        />

        {(phase === 'ready' || phase === 'charging') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="capsule-glow absolute h-2/3 w-2/3 rounded-full"
              style={{ background: 'radial-gradient(circle, rgb(255 200 90 / 0.55), transparent 70%)' }}
              aria-hidden="true"
            />
            <div className={phase === 'charging' ? 'animate-capsule-shake' : 'animate-float'}>
              <Capsule charging={phase === 'charging'} />
            </div>
          </div>
        )}

        {(phase === 'roulette' || phase === 'chosen') &&
          sils.map((file, index) => {
            const winner = index === result?.winner
            const chosen = phase === 'chosen'
            const pos = chosen && winner ? { left: 50, top: 50 } : spot(index, sils.length)
            const on = chosen ? winner : lit === index
            return (
              <img
                key={file + index}
                src={`/skins/sil/${file}`}
                alt=""
                draggable={false}
                className={`sil-in absolute select-none object-contain transition-all duration-700 ease-out ${
                  chosen && winner ? 'sil-chosen' : ''
                }`}
                style={{
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  width: chosen && winner ? '52%' : '27%',
                  height: chosen && winner ? '52%' : '27%',
                  animationDelay: chosen ? undefined : `${index * 90}ms`,
                  transform: `translate(-50%, -50%) scale(${on && !chosen ? 1.16 : 1})`,
                  opacity: chosen && !winner ? 0 : 1,
                  filter: on
                    ? 'brightness(1) drop-shadow(0 0 12px rgb(255 214 110)) drop-shadow(0 0 28px rgb(255 170 40))'
                    : 'brightness(0) drop-shadow(0 0 2px rgb(200 180 255 / 0.7)) drop-shadow(0 0 8px rgb(140 110 220 / 0.35))',
                  transitionDuration: chosen ? '900ms' : '160ms',
                }}
              />
            )
          })}

        {phase === 'reveal' && skin && (
          <div className="skin-reveal absolute inset-0 flex items-center justify-center">
            <div
              className="capsule-glow absolute h-3/4 w-3/4 rounded-full"
              style={{ background: 'radial-gradient(circle, rgb(255 210 110 / 0.5), transparent 70%)' }}
              aria-hidden="true"
            />
            <SkinArt skin={skin} className="relative h-[72%] max-w-full" />
          </div>
        )}
      </div>

      {/* Textos y botones */}
      <div className="mt-2 flex min-h-[9.5rem] w-full max-w-sm flex-col items-center text-center">
        {phase === 'ready' && (
          <>
            <h2 className="text-2xl font-extrabold">Cápsula misteriosa</h2>
            <p className="mt-1 text-white/70">7 días de esfuerzo dentro. ¿Qué skin te tocará?</p>
            {unlimited && <p className="mt-1 text-xs text-white/50">Modo prueba: tickets infinitos.</p>}
            <button type="button" onClick={start} disabled={!canOpen} className="btn-primary mt-4 w-full px-5 py-3 text-lg">
              Abrir
            </button>
          </>
        )}
        {phase === 'charging' && <p className="animate-pulse text-lg font-bold text-white/80">Abriendo…</p>}
        {phase === 'roulette' && <p className="text-lg font-bold text-white/80">¿Cuál será la tuya?</p>}
        {phase === 'chosen' && <p className="animate-pop-in text-lg font-extrabold text-amber-300">¡Esta es la tuya!</p>}
        {phase === 'reveal' && skin && result && (
          <>
            <p className="animate-pop-in text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
              {result.isNew ? '¡Skin nueva!' : 'Repetida (modo prueba)'}
            </p>
            <h2 className="animate-pop-in mt-1 text-3xl font-extrabold">{skin.name}</h2>
            <div className="mt-4 flex w-full flex-col gap-2">
              <button
                type="button"
                disabled={isEquipped || equip.isPending}
                onClick={() => equip.mutate(skin.id)}
                className="btn-primary px-5 py-3"
              >
                {isEquipped ? 'Es tu compañero ✓' : 'Ponérsela a mi panda'}
              </button>
              {again && (
                <button
                  type="button"
                  onClick={start}
                  className="rounded-2xl border-2 border-white/20 px-5 py-2.5 font-bold text-white/80 transition-colors hover:text-white"
                >
                  Abrir otra cápsula
                </button>
              )}
            </div>
          </>
        )}
        {(opening.isError || equip.isError) && (
          <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-red-200" role="alert">
            {friendlySkinError(errorMessage(opening.error ?? equip.error))}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}

// La cápsula: dos mitades, un "?" y un brillo. Al cargar se ilumina el centro.
function Capsule({ charging }: { charging: boolean }) {
  return (
    <div className="relative h-40 w-40 overflow-hidden rounded-full border-4 border-black/70 shadow-[0_0_40px_rgb(255_190_80/0.45)]">
      <div className="absolute inset-x-0 top-0 h-1/2" style={{ background: 'linear-gradient(160deg, #ffd56b, #f59e0b)' }} />
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: 'linear-gradient(200deg, #f5f0ff, #c9bde6)' }} />
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-black/70" />
      <div
        className={`absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-black/70 text-2xl font-black transition-colors duration-500 ${
          charging ? 'bg-amber-200 text-amber-700 shadow-[0_0_30px_rgb(255_220_120)]' : 'bg-white text-neutral-800'
        }`}
      >
        ?
      </div>
      <div className="absolute left-6 top-4 h-5 w-10 -rotate-12 rounded-full bg-white/50" />
    </div>
  )
}
