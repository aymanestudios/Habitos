import type { MouseEvent } from 'react'
import { errorMessage } from '@/features/habits/habitRules'
import { canNudge, friendlyStreakError } from './sharedStreakRules'
import type { SharedStreak } from './sharedStreakRules'
import { useNudge } from './useSharedStreaks'

// "Dar un toque 🔥": avisa al móvil de tu amigo de que se apaga la racha (uno al día).
export function NudgeButton({ streak, compact = false }: { streak: SharedStreak; compact?: boolean }) {
  const nudge = useNudge()
  if (streak.partner.state !== 'pending') return null

  const sent = streak.iNudged || nudge.isSuccess
  const size = compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'

  if (sent) {
    return (
      <span className={`animate-pop-in inline-flex items-center gap-1.5 rounded-full bg-surface-2 font-bold text-muted ${size}`}>
        ✓ Toque enviado
      </span>
    )
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.preventDefault() // por si está dentro de un enlace
          event.stopPropagation()
          if (canNudge(streak)) nudge.mutate(streak.id)
        }}
        disabled={nudge.isPending}
        className={`inline-flex items-center gap-1.5 rounded-full border-2 border-orange-400 bg-orange-50 font-bold text-orange-700 transition-all hover:bg-orange-100 active:scale-95 disabled:opacity-60 dark-nudge ${size}`}
      >
        🔥 {nudge.isPending ? 'Enviando…' : `Dar un toque a ${streak.partnerName}`}
      </button>
      {nudge.isError && (
        <span className="text-xs text-danger" role="alert">
          {friendlyStreakError(errorMessage(nudge.error))}
        </span>
      )}
    </span>
  )
}
