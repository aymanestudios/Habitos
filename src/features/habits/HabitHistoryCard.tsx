import { useMemo } from 'react'
import { Card } from '@/components/Card'
import { Skeleton } from '@/components/Skeleton'
import { useProfile } from '@/features/profile/useProfile'
import { shortDate } from '@/features/stats/statsRules'
import { getUserTimezone } from '@/lib/dates'
import { useToday } from '@/lib/useToday'
import { formatAmount } from './dayRules'
import { DAY_LETTERS } from './habitRules'
import type { Habit } from './habitRules'
import { HISTORY_WEEKS, buildHistory, historyFrom, summarizeHistory } from './historyRules'
import type { HistoryCell, HistoryState } from './historyRules'
import { useHabitLogs } from './useHabitLogs'

// Clases completas para que Tailwind las detecte
const STATE_CLASS: Record<HistoryState, string> = {
  future: 'opacity-0',
  off: 'bg-surface-2',
  done: 'bg-brand',
  partial: 'bg-brand-soft',
  missed: 'border-2 border-dashed border-line',
}

const STATE_TEXT: Record<HistoryState, string> = {
  future: '',
  off: 'no tocaba',
  done: 'hecho',
  partial: 'a medias',
  missed: 'no hecho',
}

function label(cell: HistoryCell, unit: string | null): string {
  if (cell.state === 'future') return ''
  const amount = cell.value > 0 ? ` (${formatAmount(cell.value)}${unit ? ` ${unit}` : ''})` : ''
  return `${shortDate(cell.date)}: ${STATE_TEXT[cell.state]}${amount}`
}

// Calendario de las últimas 12 semanas de un hábito + resumen.
export function HabitHistoryCard({ habit }: { habit: Habit }) {
  const profile = useProfile()
  const timeZone = profile.data?.timezone ?? getUserTimezone()
  const today = useToday(timeZone)
  const logs = useHabitLogs(historyFrom(today), today)

  const history = useMemo(() => {
    if (!logs.data) return null
    const cells = buildHistory(habit, logs.data, today)
    return { cells, summary: summarizeHistory(habit, cells, today) }
  }, [habit, logs.data, today])

  if (logs.isError) return null
  if (!history) return <Skeleton className="h-48 rounded-3xl" />

  const { cells, summary } = history
  const daily = summary.percent !== null || summary.scheduledDays > 0
  const stats = daily
    ? [
        { label: 'Cumplido', value: summary.percent === null ? '—' : `${summary.percent} %` },
        { label: 'Días hechos', value: String(summary.doneDays) },
        { label: 'Mejor tanda', value: `${summary.bestRun} d` },
      ]
    : [
        { label: 'Semanas cumplidas', value: `${summary.weeksMet}/${summary.weeksCounted}` },
        { label: 'Días con algo', value: String(summary.doneDays) },
        { label: 'Total', value: `${formatAmount(summary.total)}${habit.unit ? ` ${habit.unit}` : ''}` },
      ]

  return (
    <Card>
      <h2 className="text-lg font-bold">Historial</h2>
      <p className="mt-1 text-sm text-muted">Últimas {HISTORY_WEEKS} semanas de este hábito.</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl bg-surface-2 p-3 text-center">
            <p className="text-lg font-bold">{item.value}</p>
            <p className="text-xs text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-1.5">
        <div className="flex flex-col gap-1.5 pr-1">
          {DAY_LETTERS.map((letter, index) => (
            <span key={index} className="flex aspect-square w-3 items-center text-[10px] font-bold text-muted">
              {letter}
            </span>
          ))}
        </div>
        {cells.map((week) => (
          <div key={week[0].date} className="flex min-w-0 flex-1 flex-col gap-1.5">
            {week.map((cell) => (
              <span
                key={cell.date}
                title={label(cell, habit.unit)}
                aria-label={label(cell, habit.unit) || undefined}
                className={`aspect-square w-full rounded-[5px] ${STATE_CLASS[cell.state]} ${
                  cell.date === today ? 'ring-2 ring-ink ring-offset-1 ring-offset-surface' : ''
                }`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {(['done', 'partial', 'missed', 'off'] as const)
          .filter((state) => daily || state !== 'missed')
          .map((state) => (
            <span key={state} className="flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded-[4px] ${STATE_CLASS[state]}`} />
              {STATE_TEXT[state]}
            </span>
          ))}
      </div>
    </Card>
  )
}
