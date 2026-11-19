import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { DayRecapStory } from './DayRecapStory'
import { useDayRecap, useMarkDayRecapSeen } from './useDayRecap'

// Invitación discreta en Inicio: "Tu día de ayer está listo". Sale una vez (si ayer tenías algo)
// y nunca bloquea: se abre solo si la tocas. Cerrarla también cuenta como vista.
export function DayRecapInvite({ today }: { today: string }) {
  const recap = useDayRecap(null)
  const mark = useMarkDayRecapSeen()
  const [open, setOpen] = useState(false)
  const data = recap.data
  const visible = Boolean(data && data.worth && !data.seen)

  if (open && data) {
    return (
      <DayRecapStory
        recap={data}
        today={today}
        onClose={() => {
          setOpen(false)
          mark.mutate(data.date)
        }}
      />
    )
  }
  if (!visible || !data) return null

  return (
    <div className="animate-pop-in relative flex items-center gap-3 overflow-hidden rounded-3xl border-2 border-brand bg-brand-soft p-3 pr-2">
      <Mascot pose="default" className="animate-hop h-16 shrink-0" />
      <button type="button" onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left">
        <span className="block font-extrabold text-brand-ink">Tu día de ayer está listo</span>
        <span className="block text-sm text-ink/80">Un repaso rápido con el panda. Toca para verlo.</span>
      </button>
      <button
        type="button"
        onClick={() => mark.mutate(data.date)}
        aria-label="Ahora no"
        className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full text-brand-ink/70 hover:text-brand-ink"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  )
}
