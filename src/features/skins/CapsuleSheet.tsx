import { useEffect, useRef, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { errorMessage } from '@/features/habits/habitRules'
import { burst } from '@/lib/confetti'
import { friendlySkinError, skinSrc } from './skinRules'
import type { CapsuleResult } from './skinRules'
import { useEquipSkin, useOpenCapsule } from './useSkins'

type Props = {
  open: boolean
  onClose: () => void
  canOpen: boolean // hay ticket (o modo prueba)
  unlimited: boolean
  equippedId: string | null
}

// Cápsula misteriosa: se sacude, se abre y aparece la skin sorpresa.
export function CapsuleSheet({ open, onClose, canOpen, unlimited, equippedId }: Props) {
  const opening = useOpenCapsule()
  const equip = useEquipSkin()
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'reveal'>('idle')
  const [result, setResult] = useState<CapsuleResult | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!open) {
      setPhase('idle')
      setResult(null)
      opening.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function start() {
    if (phase === 'shaking') return
    setPhase('shaking')
    setResult(null)
    const startedAt = Date.now()
    opening.mutate(undefined, {
      onSuccess: (data) => {
        // Mínimo ~1,6 s de sacudida para que se sienta como abrir una cápsula
        const wait = Math.max(0, 1600 - (Date.now() - startedAt))
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
          setResult(data)
          setPhase('reveal')
          burst(window.innerWidth / 2, window.innerHeight * 0.4, { count: data.isNew ? 90 : 30, power: 1.5 })
        }, wait)
      },
      onError: () => setPhase('idle'),
    })
  }

  const skin = result?.skin
  const isEquipped = skin ? equippedId === skin.id : false

  return (
    <Sheet open={open} title="Cápsula misteriosa" onClose={onClose} closeDisabled={phase === 'shaking'}>
      <div className="flex flex-col items-center text-center">
        {phase !== 'reveal' && (
          <>
            <div className={`my-4 ${phase === 'shaking' ? 'animate-capsule-shake' : 'animate-float'}`} aria-hidden="true">
              <Capsule />
            </div>
            <p className="text-muted">
              {phase === 'shaking' ? 'Abriendo…' : 'Dentro hay una skin sorpresa para tu panda. ¿La abrimos?'}
            </p>
            {unlimited && <p className="mt-1 text-xs text-muted">Modo prueba: tickets infinitos.</p>}
            <button
              type="button"
              onClick={start}
              disabled={!canOpen || phase === 'shaking'}
              className="btn-primary mt-4 w-full px-5 py-3"
            >
              {phase === 'shaking' ? 'Abriendo…' : 'Abrir cápsula'}
            </button>
          </>
        )}

        {phase === 'reveal' && skin && result && (
          <>
            <p className="animate-pop-in text-sm font-bold uppercase tracking-wide text-brand-ink">
              {result.isNew ? '¡Skin nueva!' : 'Repetida (solo en modo prueba)'}
            </p>
            <img
              key={skin.id}
              src={skinSrc(skin)}
              alt=""
              width={skin.width}
              height={skin.height}
              className="animate-tada my-3 h-44 w-auto max-w-full object-contain"
            />
            <h3 className="text-xl font-extrabold">{skin.name}</h3>
            <p className="mt-1 text-sm text-muted">Ya está en tu colección.</p>
            <div className="mt-4 flex w-full flex-col gap-2">
              <button
                type="button"
                disabled={isEquipped || equip.isPending}
                onClick={() => equip.mutate(skin.id)}
                className="btn-primary px-5 py-3"
              >
                {isEquipped ? 'Es tu compañero' : 'Ponérsela a mi panda'}
              </button>
              {(result.unlimited || result.available > 0) && (
                <button
                  type="button"
                  onClick={start}
                  className="rounded-2xl border-2 border-line px-5 py-2.5 font-bold text-muted transition-colors hover:text-ink"
                >
                  Abrir otra cápsula
                </button>
              )}
            </div>
          </>
        )}

        {(opening.isError || equip.isError) && (
          <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
            {friendlySkinError(errorMessage(opening.error ?? equip.error))}
          </p>
        )}
      </div>
    </Sheet>
  )
}

// La cápsula: dos mitades y un "?" (solo CSS, usa los colores del tema)
function Capsule() {
  return (
    <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-ink/80 shadow-card">
      <div className="absolute inset-x-0 top-0 h-1/2 bg-brand" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-surface-2" />
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-ink/80" />
      <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-ink/80 bg-surface text-xl font-extrabold">
        ?
      </div>
      <div className="absolute left-4 top-3 h-4 w-8 -rotate-12 rounded-full bg-white/40" />
    </div>
  )
}
