import { useNavigate } from 'react-router'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { getUserTimezone, localDateString } from '@/lib/dates'
import { HabitForm } from './HabitForm'
import { emptyHabitForm, formToPayload } from './habitRules'
import { useCreateHabit } from './useHabits'

export function NewHabitPage() {
  const navigate = useNavigate()
  const createHabit = useCreateHabit()
  // Hoy según tu zona horaria: solo sirve para avisar si la fecha límite ya pasó.
  // El día de inicio real lo fija el servidor.
  const today = localDateString(new Date(), getUserTimezone())

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo hábito" subtitle="Algo que quieres sostener en el tiempo" />
      <Card>
        <HabitForm
          initial={emptyHabitForm}
          submitLabel="Crear hábito"
          startDate={today}
          onSubmit={async (values) => {
            await createHabit.mutateAsync(formToPayload(values))
            navigate('/habitos')
          }}
        />
      </Card>
    </div>
  )
}
