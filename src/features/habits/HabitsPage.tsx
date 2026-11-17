import { PageSkeleton } from '@/components/Skeleton'
import { useState } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/Card'
import { ChoiceChips } from '@/components/ChoiceChips'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { PageHeader } from '@/components/PageHeader'
import { HABITS_TABS, SectionTabs } from '@/components/SectionTabs'
import { CATEGORY_LABEL, CATEGORY_OPTIONS, DIFFICULTY_LABEL, habitMeta } from './habitRules'
import type { Category, Habit } from './habitRules'
import { useHabits } from './useHabits'

type Filter = 'all' | 'daily' | 'weekly'
type CategoryFilter = 'all' | Category

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'daily', label: 'Diarios' },
  { value: 'weekly', label: 'Semanales' },
]

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  ...CATEGORY_OPTIONS,
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
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
        <Icon name="habits" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{habit.title}</p>
        <p className="truncate text-sm text-muted">
          {CATEGORY_LABEL[habit.category] ?? 'Otro'} · {habitMeta(habit)}
        </p>
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
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [showArchived, setShowArchived] = useState(false)

  const all = habits.data ?? []
  const active = all.filter((habit) => habit.archived_at === null)
  const archived = all.filter((habit) => habit.archived_at !== null)
  const visible = active.filter(
    (habit) => matchesFilter(habit, filter) && (category === 'all' || habit.category === category),
  )

  return (
    <div className="stagger space-y-6">
      <PageHeader
        title="Hábitos"
        subtitle="Todo lo que quieres sostener en el tiempo"
        action={
          <Link
            to="/habitos/nuevo"
            className="flex items-center gap-2 btn-primary px-4 py-2.5"
          >
            <Icon name="plus" className="h-5 w-5" />
            Nuevo
          </Link>
        }
      />

      <SectionTabs label="Hábitos" tabs={HABITS_TABS} />

      {habits.isPending && <PageSkeleton />}

      {habits.isError && (
        <Card>
          <p className="text-danger">
            No se pudieron cargar tus hábitos. ¿Has ejecutado la migración 0002_habits.sql en Supabase?
          </p>
        </Card>
      )}

      {habits.isSuccess && active.length === 0 && (
        <Card className="flex flex-col items-center text-center">
          <Mascot pose="gym" className="mb-2 h-32" />
          <h2 className="text-lg font-bold">Aún no tienes hábitos</h2>
          <p className="mt-1 text-muted">Crea el primero y empieza tu racha.</p>
          <Link
            to="/habitos/nuevo"
            className="mt-4 inline-flex items-center gap-2 btn-primary px-5 py-3"
          >
            <Icon name="plus" className="h-5 w-5" />
            Crear mi primer hábito
          </Link>
        </Card>
      )}

      {habits.isSuccess && active.length > 0 && (
        <>
          <ChoiceChips label="Filtrar hábitos" options={FILTERS} value={filter} onChange={setFilter} />
          {new Set(active.map((habit) => habit.category)).size > 1 && (
            <ChoiceChips
              label="Filtrar por categoría"
              options={CATEGORY_FILTERS}
              value={category}
              onChange={setCategory}
            />
          )}

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
