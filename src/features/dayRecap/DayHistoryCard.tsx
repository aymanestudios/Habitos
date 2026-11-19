import { useState } from 'react'
import { Card } from '@/components/Card'
import { Mascot } from '@/components/Mascot'
import { addDays } from '@/lib/dates'
import { DayRecapStory } from './DayRecapStory'
import { shortDay } from './dayRecapRules'
import { useDayRecap, useMarkDayRecapSeen } from './useDayRecap'

// Estadísticas: volver a ver el resumen animado de cualquiera de los últimos 7 días.
export function DayHistoryCard({ today }: { today: string }) {
  const [date, setDate] = useState<string | null>(null)
  const recap = useDayRecap(date, date !== null)
  const mark = useMarkDayRecapSeen()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -(i + 1)))

  return (
    <Card className="flex items-center gap-4">
      <Mascot pose="default" className="hidden h-20 shrink-0 min-[400px]:block" />
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold">Tu día en Progress&amp;Go</h2>
        <p className="text-sm text-muted">Repasa con el panda cómo te fue.</p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {days.map((day, i) => (
            <button
              key={day}
              type="button"
              onClick={() => setDate(day)}
              className="shrink-0 rounded-full border-2 border-line bg-surface px-3 py-1.5 text-sm font-bold capitalize text-muted transition-all hover:text-ink active:scale-95"
            >
              {i === 0 ? 'Ayer' : shortDay(day)}
            </button>
          ))}
        </div>
        {date && recap.isError && <p className="mt-2 text-sm text-danger">Ese día no está disponible ahora mismo.</p>}
      </div>
      {date && recap.data && (
        <DayRecapStory
          key={date}
          recap={recap.data}
          today={today}
          onClose={() => {
            mark.mutate(date)
            setDate(null)
          }}
        />
      )}
    </Card>
  )
}
