import { Icon } from './Icon'
import { ProgressBar } from './ProgressBar'

type Props = {
  title: string
  meta: string
  done: boolean
  progress?: number // 0-100, solo para hábitos con objetivo numérico
}

// Fila de hábito: se reutiliza en Hoy y en Hábitos para no duplicar diseño.
export function HabitRow({ title, meta, done, progress }: Props) {
  return (
    <div className="flex items-center gap-4 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
          done ? 'border-brand bg-brand text-on-brand' : 'border-line text-transparent'
        }`}
      >
        <Icon name="check" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${done ? 'text-muted line-through' : 'text-ink'}`}>
          {title}
        </p>
        <p className="text-sm text-muted">{meta}</p>
        {progress !== undefined && !done && <ProgressBar value={progress} className="mt-2" />}
      </div>
    </div>
  )
}
