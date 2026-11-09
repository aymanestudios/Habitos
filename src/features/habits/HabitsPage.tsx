import { useState } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/Card'
import { ChoiceChips } from '@/components/ChoiceChips'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { DIFFICULTY_LABEL, habitMeta } from './habitRules'
import type { Habit } from './habitRules'
import { useHabits } from './useHabits'

type Filter = 'all' | 'daily' | 'weekly'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'daily', label: 'Diarios' },
  { value: 'weekly', label: 'Semanales' },
]

// "Diarios" = cada día o días concretos. "Semanales" = veces por semana o total semanal.
function matchesFilter(habit: Habit, filter: Filter): boolean {
  if (filter === 'all') return true
  const isDaily = habit.frequency_type === 'daily' || habit.frequency_type === 'days_of_week'
  return filter === 'daily' ? isDaily : !isDaily
}

function HabitListRow({ habit, muted = false }: { habit: Habit; muted?: boolean }) {
  return (
    <Link
      to={`/habitos/${habit.id}/editar`}
      className={`flex items-center gap-4 py-3 transition-opacity hover:opacity-80 ${muted ? 'opacity-60' : ''}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon name="habits" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{habit.title}</p>
        <p className="truncate text-sm text-muted">{habitMeta(habit)}</p>
      </div>
      <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
        {DIFFICULTY_LABEL[habit.difficulty]}
      </span>
    </Link>
  )
}

export function HabitsPage() {
  const habits = useHabits()
  const [filter, setFilter] = useState<Filter>('all')
  const [showArchived, setShowArchived] = useState(false)

  const all = habits.data ?? []
  const active = all.filter((habit) => habit.archived_at === null)
  const archived = all.filter((habit) => habit.archived_at !== null)
  const visible = active.filter((habit) => matchesFilter(habit, filter))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hábitos"
        subtitle="Todo lo que quieres sostener en el tiempo"
        action={
          <Link
            to="/habitos/nuevo"
            className="hidden items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 font-semibold text-white transition-transform active:scale-95 md:flex"
          >
            <Icon name="plus" className="h-5 w-5" />
            Nuevo
          </Link>
        }
      />

      {habits.isPending && <p className="text-muted">Cargando...</p>}

      {habits.isError && (
        <Card>
          <p className="text-danger">
            No se pudieron cargar tus hábitos. ¿Has ejecutado la migración 0002_habits.sql en Supabase?
          </p>
        </Card>
      )}

      {habits.isSuccess && active.length === 0 && (
        <Card className="text-center">
          <h2 className="text-lg font-bold">Aún no tienes hábitos</h2>
          <p className="mt-1 text-muted">Crea el primero y empieza tu racha.</p>
          <Link
            to="/habitos/nuevo"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 font-semibold text-white transition-transform active:scale-95"
          >
            <Icon name="plus" className="h-5 w-5" />
            Crear mi primer hábito
          </Link>
        </Card>
      )}

      {habits.isSuccess && active.length > 0 && (
        <>
          <ChoiceChips label="Filtrar hábitos" options={FILTERS} value={filter} onChange={setFilter} />

          <Card>
            {visible.length === 0 ? (
              <p className="text-muted">Ningún hábito con este filtro.</p>
            ) : (
              <div className="divide-y divide-line">
                {visible.map((habit) => (
                  <HabitListRow key={habit.id} habit={habit} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {habits.isSuccess && archived.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowArchived((current) => !current)}
            aria-expanded={showArchived}
            className="text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            {showArchived ? 'Ocultar archivados' : `Ver archivados (${archived.length})`}
          </button>

          {showArchived && (
            <Card>
              <div className="divide-y divide-line">
                {archived.map((habit) => (
                  <HabitListRow key={habit.id} habit={habit} muted />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
