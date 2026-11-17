import { useEffect, useRef } from 'react'
import { burstFrom } from '@/lib/confetti'
import { usePulse } from '@/lib/usePulse'
import { Icon } from './Icon'
import { ProgressBar } from './ProgressBar'

type Counter = {
  onMinus: () => void
  onPlus: () => void
  canMinus: boolean
}

type Props = {
  title: string
  meta?: string
  done: boolean
  progress?: number // 0-100, solo para hábitos con objetivo numérico
  onToggle?: () => void // hábito de sí/no: tocar la fila lo marca o desmarca
  counter?: Counter // hábito numérico: botones − y +
  share?: { onShare: () => void; shared: boolean } // botón de cámara cuando está hecho
}

// Fila de hábito de la pantalla "Hoy".
// Al completarse, el círculo hace un "rebote" y suelta un chispazo de confeti.
export function HabitRow({ title, meta, done, progress, onToggle, counter, share }: Props) {
  const badge = useRef<HTMLSpanElement>(null)
  const pulse = usePulse(done)

  useEffect(() => {
    if (pulse) burstFrom(badge.current, { count: 12, power: 0.6 })
  }, [pulse])

  const circle = (
    <span
      ref={badge}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
        done ? 'border-good bg-good text-on-brand' : 'border-line text-transparent'
      } ${pulse ? 'animate-pop' : ''}`}
    >
      <Icon name="check" className="h-5 w-5" />
    </span>
  )

  const text = (
    <div className="min-w-0 flex-1">
      <p className={`truncate font-semibold ${done ? 'text-muted line-through' : 'text-ink'}`}>{title}</p>
      {meta && <p className="text-sm text-muted">{meta}</p>}
      {progress !== undefined && !done && <ProgressBar value={progress} className="mt-2" />}
    </div>
  )

  // Cámara: compartir una foto del logro (solo cuando el hábito está hecho)
  const shareButton = share && done && (
    <button
      type="button"
      onClick={share.onShare}
      aria-label={share.shared ? `Cambiar la foto de ${title}` : `Compartir una foto de ${title}`}
      className={`animate-pop-in flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 ${
        share.shared ? 'bg-brand text-on-brand' : 'bg-surface-2 text-brand-ink'
      }`}
    >
      <Icon name="camera" className="h-5 w-5" />
    </button>
  )

  if (onToggle) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-4 py-3 text-left transition-transform active:scale-[0.99]"
        >
          {circle}
          {text}
        </button>
        {shareButton}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 py-3">
      {circle}
      {text}
      {shareButton}
      {counter && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={counter.onMinus}
            disabled={!counter.canMinus}
            aria-label="Quitar"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink transition-transform active:scale-90 disabled:opacity-40"
          >
            <Icon name="minus" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={counter.onPlus}
            aria-label="Sumar"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-on-brand transition-transform active:scale-90"
          >
            <Icon name="plus" className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
