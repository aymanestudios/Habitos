import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { Sheet } from '@/components/Sheet'
import { CATEGORY_LABEL } from '@/features/habits/habitRules'
import type { Category } from '@/features/habits/habitRules'
import { recapMessage, recapPose, weekRange } from './homeRules'
import type { WeekRecap } from './homeRules'

// Resumen semanal presentado por el panda: breve y visual. Solo cifras reales.
export function WeekRecapSheet({ recap, open, onClose }: { recap: WeekRecap | null; open: boolean; onClose: () => void }) {
  if (!recap) return null
  const tiles = [
    { label: 'Hábitos completados', value: String(recap.current.completed) },
    { label: 'Cumplimiento', value: recap.current.percent === null ? '—' : `${recap.current.percent} %` },
    { label: 'XP ganados', value: `+${recap.current.xp}` },
    { label: 'Racha al cerrar', value: `${recap.streakEnd} d` },
  ]
  const top = recap.topCategory ? (CATEGORY_LABEL[recap.topCategory as Category] ?? null) : null

  return (
    <Sheet open={open} title="Tu semana" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <p className="-mt-2 text-sm font-semibold capitalize text-muted">{weekRange(recap)}</p>
        <div className="animate-hop mt-2">
          <Mascot pose={recapPose(recap)} className="h-32" />
        </div>
        <p className="animate-pop-in mt-3 rounded-2xl rounded-tl-sm border-2 border-line bg-surface px-4 py-3 text-[15px] font-semibold shadow-card">
          {recapMessage(recap)}
        </p>

        <div className="stagger mt-5 grid w-full grid-cols-2 gap-2">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl bg-surface-2 p-3">
              <p className="text-2xl font-extrabold tabular-nums">{tile.value}</p>
              <p className="text-xs text-muted">{tile.label}</p>
            </div>
          ))}
        </div>

        {(recap.newRecord || top) && (
          <div className="mt-3 flex w-full flex-wrap justify-center gap-2">
            {recap.newRecord && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-sm font-bold text-amber-600">
                <Icon name="trophy" className="h-4 w-4" />
                Récord personal: {recap.newRecord} días de racha
              </span>
            )}
            {top && (
              <span className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-bold text-brand-ink">
                Tu fuerte: {top}
              </span>
            )}
          </div>
        )}

        {recap.previous && recap.previous.percent !== null && recap.current.percent !== null && (
          <p className="mt-3 text-xs text-muted">
            Semana anterior: {recap.previous.completed} hábitos · {recap.previous.percent} % · +{recap.previous.xp} XP
          </p>
        )}

        <button type="button" onClick={onClose} className="btn-primary mt-5 w-full px-4 py-3">
          ¡A por esta semana!
        </button>
      </div>
    </Sheet>
  )
}
