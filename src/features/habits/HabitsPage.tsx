import { Card } from '@/components/Card'
import { DemoNotice } from '@/components/DemoNotice'
import { HabitRow } from '@/components/HabitRow'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'

// DISEÑO con datos ficticios.
const filters = ['Todos', 'Diarios', 'Semanales']

const habits = [
  { title: 'Entrenar 45 min', meta: 'Diario · racha de 12 días', done: true },
  { title: 'Leer 20 páginas', meta: 'Diario · racha de 5 días', done: true },
  { title: 'Estudiar programación', meta: 'Lunes a viernes', done: true },
  { title: 'Beber agua', meta: 'Diario · 5 de 8 vasos', done: false, progress: 62 },
  { title: 'Correr 30 km', meta: 'Esta semana · 18 de 30 km', done: false, progress: 60 },
  { title: 'Dormir 8 horas', meta: 'Diario', done: false },
]

export function HabitsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hábitos"
        subtitle="Todo lo que quieres sostener en el tiempo"
        action={
          <button
            type="button"
            disabled
            className="hidden items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 font-semibold text-white opacity-60 md:flex"
          >
            <Icon name="plus" className="h-5 w-5" />
            Nuevo
          </button>
        }
      />

      <DemoNotice />

      <div className="flex gap-2">
        {filters.map((filter, index) => (
          <span
            key={filter}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              index === 0 ? 'bg-ink text-bg' : 'bg-surface-2 text-muted'
            }`}
          >
            {filter}
          </span>
        ))}
      </div>

      <Card>
        <div className="divide-y divide-line">
          {habits.map((habit) => (
            <HabitRow key={habit.title} {...habit} />
          ))}
        </div>
      </Card>
    </div>
  )
}
