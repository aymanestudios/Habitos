import { ProgressBar } from './ProgressBar'

type Props = { level: number; xpIntoLevel: number; xpLevelSize: number; className?: string }

// Insignia de nivel + barra de XP hacia el siguiente nivel.
export function LevelBar({ level, xpIntoLevel, xpLevelSize, className = '' }: Props) {
  const pct = (xpIntoLevel / xpLevelSize) * 100
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-lg font-bold text-accent-ink"
        aria-label={`Nivel ${level}`}
      >
        {level}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Nivel {level}</span>
          <span>
            {xpIntoLevel} / {xpLevelSize} XP
          </span>
        </div>
        <ProgressBar value={pct} tone="accent" />
      </div>
    </div>
  )
}
