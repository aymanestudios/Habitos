import { PageSkeleton } from '@/components/Skeleton'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { HabitForm } from './HabitForm'
import { errorMessage, formToPayload, friendlyHabitError, habitToForm } from './habitRules'
import { useHabits, useUpdateHabit } from './useHabits'

export function EditHabitPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const habits = useHabits()
  const updateHabit = useUpdateHabit()
  const [actionError, setActionError] = useState<string | null>(null)

  if (habits.isPending) {
    return <PageSkeleton />
  }

  const habit = habits.data?.find((item) => item.id === id)

  if (!habit) {
    return (
      <div className="space-y-6">
        <PageHeader title="Hábito no encontrado" />
        <Card>
          <p className="text-muted">Este hábito no existe o no es tuyo.</p>
          <Link to="/habitos" className="mt-4 inline-block font-semibold text-brand-ink">
            Volver a Hábitos
          </Link>
        </Card>
      </div>
    )
  }

  const archived = habit.archived_at !== null

  // Archivar y restaurar son el mismo cambio: poner o quitar la fecha de archivado.
  async function setArchived(value: boolean) {
    if (!habit) return
    setActionError(null)
    try {
      await updateHabit.mutateAsync({
        id: habit.id,
        changes: { archived_at: value ? new Date().toISOString() : null },
      })
      navigate('/habitos')
    } catch (caught) {
      setActionError(friendlyHabitError(errorMessage(caught)))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Editar hábito" />

      {archived && (
        <Card className="flex items-center justify-between gap-4">
          <p className="text-muted">Este hábito está archivado y no aparece en tu lista.</p>
          <button
            type="button"
            onClick={() => void setArchived(false)}
            disabled={updateHabit.isPending}
            className="shrink-0 btn-primary px-4 py-2.5"
          >
            Restaurar
          </button>
        </Card>
      )}

      <Card>
        <HabitForm
          key={habit.id}
          initial={habitToForm(habit)}
          submitLabel="Guardar cambios"
          startDate={habit.start_date}
          onSubmit={async (values) => {
            await updateHabit.mutateAsync({ id: habit.id, changes: formToPayload(values) })
            navigate('/habitos')
          }}
        />
      </Card>

      {!archived && (
        <Card>
          <h2 className="text-lg font-bold">Archivar hábito</h2>
          <p className="mt-1 text-muted">
            Dejará de aparecer en tus listas, pero conservas su historial. Puedes restaurarlo cuando quieras.
          </p>
          {actionError && (
            <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              {actionError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void setArchived(true)}
            disabled={updateHabit.isPending}
            className="mt-4 w-full rounded-2xl border border-line px-4 py-3 font-semibold transition-colors hover:bg-surface-2 disabled:opacity-60"
          >
            Archivar
          </button>
        </Card>
      )}
    </div>
  )
}
