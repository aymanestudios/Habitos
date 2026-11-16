import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/Card'
import { ChoiceChips } from '@/components/ChoiceChips'
import { HabitRow } from '@/components/HabitRow'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { ProgressRing } from '@/components/ProgressRing'
// Hoy es la pantalla que junta cosas de otras partes, por eso (y solo por eso) importa de habits y profile.
import { buildDayItems, dayMessage, isDailyKind, itemMeta, summarizeDay } from '@/features/habits/dayRules'
import type { DayItem } from '@/features/habits/dayRules'
import { errorMessage, friendlyProgressError } from '@/features/habits/habitRules'
import { useAddProgress, useHabitLogs } from '@/features/habits/useHabitLogs'
import { useHabits } from '@/features/habits/useHabits'
import { useProfile } from '@/features/profile/useProfile'
import { burst } from '@/lib/confetti'
import { addDays, getUserTimezone, greetingFor, localHour, weekStart } from '@/lib/dates'
import { useToday } from '@/lib/useToday'

type View = 'today' | 'yesterday'

const VIEWS: { value: View; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
]

export function DashboardPage() {
  const profile = useProfile()
  const habits = useHabits()
  // Siempre la zona horaria del PERFIL (la misma que usa el servidor), no la del dispositivo
  const timeZone = profile.data?.timezone ?? getUserTimezone()
  const today = useToday(timeZone)
  const [view, setView] = useState<View>('today')
  const isToday = view === 'today'
  const date = isToday ? today : addDays(today, -1)

  // Se piden los registros desde el lunes de la semana de "ayer" hasta hoy: cubre ambas vistas
  const from = weekStart(addDays(today, -1))
  const logs = useHabitLogs(from, today)
  const addProgress = useAddProgress(from, today)

  const items = useMemo(
    () => buildDayItems(habits.data ?? [], logs.data ?? [], date),
    [habits.data, logs.data, date],
  )
  const summary = summarizeDay(items)
  const message = dayMessage(summary, isToday)
  const allDone = summary.total > 0 && summary.done === summary.total
  const ready = profile.isSuccess && habits.isSuccess && logs.isSuccess

  // Celebración: confeti y baile de la mascota al pasar de "día incompleto" a "día completo".
  // Al abrir la app o cambiar entre Hoy/Ayer no se dispara (solo cuando TÚ completas el día).
  const [celebrating, setCelebrating] = useState(false)
  const lastDay = useRef<{ date: string; allDone: boolean } | null>(null)
  const celebrationTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!ready) return
    const last = lastDay.current
    if (last && last.date === date && !last.allDone && allDone) {
      burst(window.innerWidth / 2, window.innerHeight * 0.35, { count: 70, power: 1.4 })
      setCelebrating(true)
      window.clearTimeout(celebrationTimer.current)
      celebrationTimer.current = window.setTimeout(() => setCelebrating(false), 1200)
    }
    lastDay.current = { date, allDone }
  }, [ready, date, allDone])

  useEffect(() => () => window.clearTimeout(celebrationTimer.current), [])

  if (profile.isError || habits.isError || logs.isError) {
    return (
      <Card>
        <p className="text-danger">
          No se pudieron cargar tus hábitos. ¿Has ejecutado las migraciones 0002_habits.sql y 0003_habit_logs.sql en
          Supabase?
        </p>
      </Card>
    )
  }

  if (!profile.data || !habits.data || !logs.data) {
    return <p className="text-muted">Cargando...</p>
  }

  const firstName = profile.data.display_name.split(' ')[0]
  const greeting = greetingFor(localHour(new Date(), timeZone))
  // Mediodía en UTC para formatear una fecha "suelta" sin que ninguna zona horaria la mueva de día
  const dateLabel = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))

  const hasHabits = habits.data.some((habit) => habit.archived_at === null)
  const dailyItems = items.filter((item) => isDailyKind(item.habit))
  const weeklyItems = items.filter((item) => !isDailyKind(item.habit))

  function change(item: DayItem, delta: number) {
    addProgress.mutate({ habit: item.habit, date, dayOffset: isToday ? 0 : -1, delta })
  }

  function renderRow(item: DayItem) {
    const common = { title: item.habit.title, meta: itemMeta(item), done: item.checked }
    if (item.numeric) {
      return (
        <HabitRow
          key={item.habit.id}
          {...common}
          progress={item.progress}
          counter={{
            onMinus: () => change(item, -item.step),
            onPlus: () => change(item, item.step),
            canMinus: item.value > 0,
          }}
        />
      )
    }
    return <HabitRow key={item.habit.id} {...common} onToggle={() => change(item, item.value >= 1 ? -1 : 1)} />
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted first-letter:uppercase">{dateLabel}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting}, {firstName}
          </h1>
        </div>
        {/* La mascota flota despacito; al completar el día baila */}
        <div className="animate-float shrink-0">
          <Mascot className={`h-20 origin-bottom ${celebrating ? 'animate-tada' : ''}`} />
        </div>
      </header>

      {!hasHabits ? (
        <Card className="flex flex-col items-center text-center">
          <Mascot className="mb-2 h-32" />
          <h2 className="text-lg font-bold">Aún no tienes hábitos</h2>
          <p className="mt-1 text-muted">Crea el primero y empieza tu racha.</p>
          <Link
            to="/habitos/nuevo"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 font-semibold text-on-brand transition-transform active:scale-95"
          >
            <Icon name="plus" className="h-5 w-5" />
            Crear mi primer hábito
          </Link>
        </Card>
      ) : (
        <>
          <ChoiceChips label="Día" options={VIEWS} value={view} onChange={setView} />

          {addProgress.isError && (
            <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              {friendlyProgressError(errorMessage(addProgress.error))}
            </p>
          )}

          <div className={`grid gap-6 ${weeklyItems.length > 0 ? 'lg:grid-cols-3' : ''}`}>
            <div className={`space-y-6 ${weeklyItems.length > 0 ? 'lg:col-span-2' : ''}`}>
              <Card className="flex items-center gap-5">
                <ProgressRing value={summary.percent} size={112} stroke={11} tone={allDone ? 'good' : 'brand'}>
                  <span className="text-2xl font-bold">{summary.total === 0 ? '—' : `${summary.percent}%`}</span>
                  <span className="text-xs text-muted">{isToday ? 'de hoy' : 'de ayer'}</span>
                </ProgressRing>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{message.title}</h2>
                  <p className="mt-1 text-muted">{message.text}</p>
                </div>
              </Card>

              {dailyItems.length > 0 && (
                <Card>
                  <h2 className="mb-1 text-lg font-bold">{isToday ? 'Tus hábitos de hoy' : 'Tus hábitos de ayer'}</h2>
                  <div className="divide-y divide-line">{dailyItems.map(renderRow)}</div>
                </Card>
              )}
            </div>

            {weeklyItems.length > 0 && (
              <Card className="self-start">
                <h2 className="mb-1 text-lg font-bold">Esta semana</h2>
                <div className="divide-y divide-line">{weeklyItems.map(renderRow)}</div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
