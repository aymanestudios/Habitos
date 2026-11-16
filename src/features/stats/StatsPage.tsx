import { useMemo } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { PageHeader } from '@/components/PageHeader'
import { ProgressBar } from '@/components/ProgressBar'
import { PageSkeleton } from '@/components/Skeleton'
// Como Hoy, esta pantalla junta datos de otras partes: por eso importa de habits y profile.
import { DAY_LETTERS } from '@/features/habits/habitRules'
import { useHabitLogs } from '@/features/habits/useHabitLogs'
import { useHabits } from '@/features/habits/useHabits'
import { streakLabel } from '@/features/profile/progressRules'
import { useProfile } from '@/features/profile/useProfile'
import { useProgress } from '@/features/profile/useProgress'
import { getUserTimezone } from '@/lib/dates'
import { useToday } from '@/lib/useToday'
import { buildHeatmap, buildWeekBars, cellLabel, compareWeeks, rankHabits, shortDate, statsFrom } from './statsRules'
import type { DayCell } from './statsRules'

// Clases completas (Tailwind no detecta clases montadas con texto). De menos a más hecho.
const LEVEL_CLASS: Record<DayCell['level'], string> = {
  0: 'bg-surface-2',
  1: 'bg-brand/30',
  2: 'bg-brand/55',
  3: 'bg-brand',
  4: 'bg-brand-ink',
}

function cellClass(cell: DayCell): string {
  if (cell.future) return 'opacity-0'
  if (cell.total === 0) return 'border border-dashed border-line'
  return LEVEL_CLASS[cell.level]
}

export function StatsPage() {
  const profile = useProfile()
  const habits = useHabits()
  const progress = useProgress()
  const timeZone = profile.data?.timezone ?? getUserTimezone()
  const today = useToday(timeZone)
  const logs = useHabitLogs(statsFrom(today), today)

  const stats = useMemo(() => {
    if (!habits.data || !logs.data) return null
    const heatmap = buildHeatmap(habits.data, logs.data, today)
    const bars = buildWeekBars(heatmap)
    return { heatmap, bars, comparison: compareWeeks(bars), ranking: rankHabits(habits.data, logs.data, today) }
  }, [habits.data, logs.data, today])

  if (habits.isError || logs.isError) {
    return (
      <Card>
        <p className="text-danger">No se pudieron cargar tus estadísticas. Revisa la conexión e inténtalo otra vez.</p>
      </Card>
    )
  }
  if (!stats) return <PageSkeleton />

  const hasData = stats.bars.some((bar) => bar.total > 0)

  return (
    <div className="stagger space-y-6">
      <PageHeader title="Estadísticas" subtitle="Tu constancia, de un vistazo" />

      {!hasData ? (
        <Card className="flex flex-col items-center text-center">
          <Mascot className="mb-2 h-32" />
          <h2 className="text-lg font-bold">Aún no hay nada que medir</h2>
          <p className="mt-1 text-muted">Crea un hábito diario y márcalo unos días: aquí verás cómo avanzas.</p>
          <Link to="/habitos/nuevo" className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-3">
            <Icon name="plus" className="h-5 w-5" />
            Crear hábito
          </Link>
        </Card>
      ) : (
        <>
          {progress.data && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Racha actual', value: streakLabel(progress.data.current_streak) },
                { label: 'Mejor racha', value: streakLabel(progress.data.best_streak) },
                { label: 'Hábitos hechos', value: String(progress.data.habits_done) },
              ].map((item) => (
                <Card key={item.label} className="p-4 text-center">
                  <p className="text-xl font-bold">{item.value}</p>
                  <p className="mt-1 text-xs text-muted">{item.label}</p>
                </Card>
              ))}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-bold">Últimas 8 semanas</h2>
              <p className="mt-1 text-sm text-muted">{stats.comparison}</p>
              <div className="mt-4 flex h-36 items-end gap-2" role="img" aria-label="Porcentaje de hábitos hechos por semana">
                {stats.bars.map((bar) => (
                  <div key={bar.start} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-xs font-bold text-muted">{bar.percent === null ? '' : bar.percent}</span>
                    <div
                      className={`animate-rise w-full rounded-t-lg ${bar.current ? 'bg-brand-ink' : 'bg-brand'}`}
                      style={{ height: `${Math.max(bar.percent ?? 0, 3)}%` }}
                      title={`Semana del ${shortDate(bar.start)}: ${bar.percent === null ? 'sin hábitos' : `${bar.percent} %`}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2 border-t-2 border-line pt-2">
                {stats.bars.map((bar) => (
                  <span key={bar.start} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted">
                    {shortDate(bar.start)}
                  </span>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-bold">Calendario de actividad</h2>
              <p className="mt-1 text-sm text-muted">Cada cuadro es un día de las últimas 12 semanas.</p>
              <div className="mt-4 flex gap-1.5">
                <div className="flex flex-col gap-1.5 pr-1">
                  {DAY_LETTERS.map((letter, index) => (
                    <span key={index} className="flex aspect-square w-3 items-center text-[10px] font-bold text-muted">
                      {letter}
                    </span>
                  ))}
                </div>
                {stats.heatmap.map((week) => (
                  <div key={week[0].date} className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {week.map((cell) => (
                      <span
                        key={cell.date}
                        title={cellLabel(cell)}
                        className={`aspect-square w-full rounded-[5px] ${cellClass(cell)} ${
                          cell.date === today ? 'ring-2 ring-ink ring-offset-1 ring-offset-surface' : ''
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted">
                Menos
                {([0, 1, 2, 3, 4] as const).map((level) => (
                  <span key={level} className={`h-3 w-3 rounded-[4px] ${LEVEL_CLASS[level]}`} />
                ))}
                Más
              </div>
            </Card>
          </div>

          {stats.ranking.length > 0 && (
            <Card>
              <h2 className="text-lg font-bold">Tus hábitos más constantes</h2>
              <p className="mt-1 text-sm text-muted">Últimos 30 días.</p>
              <ul className="mt-3 space-y-4">
                {stats.ranking.slice(0, 5).map((rank, index) => (
                  <li key={rank.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate font-semibold">
                        <span className="mr-2 text-muted">{index + 1}</span>
                        {rank.title}
                      </span>
                      <span className="shrink-0 text-sm text-muted">
                        {rank.done} de {rank.scheduled} · <span className="font-bold text-ink">{rank.percent} %</span>
                      </span>
                    </div>
                    <ProgressBar value={rank.percent} tone={rank.percent >= 70 ? 'good' : 'brand'} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
