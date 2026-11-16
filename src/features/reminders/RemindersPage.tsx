import { useState } from 'react'
import type { FormEvent } from 'react'
import { Card } from '@/components/Card'
import { ChoiceChips } from '@/components/ChoiceChips'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { PageHeader } from '@/components/PageHeader'
import { PageSkeleton } from '@/components/Skeleton'
import { TextField } from '@/components/TextField'
import { useNow } from '@/lib/useNow'
import { PushCard } from './PushCard'
import {
  REMINDER_NOTE_MAX,
  REMINDER_TITLE_MAX,
  REPEAT_OPTIONS,
  SNOOZE_OPTIONS,
  completeChanges,
  dayLabel,
  defaultDue,
  doneToday,
  formToReminder,
  groupReminders,
  repeatLabel,
  snoozedDue,
  timeLabel,
  toLocalInput,
  validateReminder,
} from './reminderRules'
import type { Reminder, ReminderFormValues } from './reminderRules'
import { useCreateReminder, useDeleteReminder, useReminders, useUpdateReminder } from './useReminders'

type Editing = { id: string | null; values: ReminderFormValues } // id null = recordatorio nuevo

export function RemindersPage() {
  const reminders = useReminders()
  const create = useCreateReminder()
  const update = useUpdateReminder()
  const remove = useDeleteReminder()
  const now = useNow()

  const [editing, setEditing] = useState<Editing | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [snoozing, setSnoozing] = useState<string | null>(null) // id del recordatorio con el menú "posponer" abierto

  function openNew() {
    setFormError(null)
    setEditing({ id: null, values: { title: '', note: '', due: toLocalInput(defaultDue(new Date())), repeat: 'none' } })
  }

  function openEdit(reminder: Reminder) {
    setFormError(null)
    setEditing({
      id: reminder.id,
      values: {
        title: reminder.title,
        note: reminder.note ?? '',
        due: toLocalInput(new Date(reminder.due_at)),
        repeat: reminder.repeat,
      },
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function setValue<K extends keyof ReminderFormValues>(key: K, value: ReminderFormValues[K]) {
    setEditing((current) => (current ? { ...current, values: { ...current.values, [key]: value } } : current))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    const problem = validateReminder(editing.values)
    setFormError(problem)
    if (problem) return
    const payload = formToReminder(editing.values)
    const done = { onSuccess: () => setEditing(null) }
    if (editing.id === null) create.mutate(payload, done)
    else update.mutate({ id: editing.id, changes: payload }, done)
  }

  if (reminders.isError) {
    return (
      <Card>
        <p className="text-danger">
          No se pudieron cargar tus recordatorios. ¿Has ejecutado la migración 0005_reminders.sql en Supabase?
        </p>
      </Card>
    )
  }
  if (!reminders.data) return <PageSkeleton />

  const groups = groupReminders(reminders.data, now)
  const saving = create.isPending || update.isPending
  const saveError = create.isError || update.isError || remove.isError

  function row(reminder: Reminder, tone: 'late' | 'normal' | 'done') {
    const isDone = tone === 'done'
    const repeat = repeatLabel(reminder.repeat)
    const meta = [dayLabel(reminder.due_at, now), repeat, doneToday(reminder, now) ? 'Hecho hoy ✓' : null]
      .filter(Boolean)
      .join(' · ')
    return (
      <li key={reminder.id} className="py-3">
        <div className="flex items-center gap-3">
          <span className={`w-12 shrink-0 text-sm font-bold ${tone === 'late' ? 'text-danger' : 'text-muted'}`}>
            {timeLabel(reminder.due_at)}
          </span>
          <button
            type="button"
            role="checkbox"
            aria-checked={isDone}
            aria-label={isDone ? `Volver a dejar pendiente: ${reminder.title}` : `Marcar como hecho: ${reminder.title}`}
            onClick={() =>
              update.mutate({
                id: reminder.id,
                changes: isDone ? { done_at: null } : completeChanges(reminder, new Date()),
              })
            }
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90 ${
              isDone ? 'border-good bg-good text-on-brand' : 'border-line text-transparent hover:border-brand'
            }`}
          >
            <Icon name="check" className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => openEdit(reminder)} className="min-w-0 flex-1 text-left">
            <span className={`block truncate font-semibold ${isDone ? 'text-muted line-through' : ''}`}>
              {reminder.title}
            </span>
            <span className="block truncate text-sm text-muted">
              {meta}
              {reminder.note ? ` · ${reminder.note}` : ''}
            </span>
          </button>
          {!isDone && (
            <button
              type="button"
              aria-label={`Posponer: ${reminder.title}`}
              aria-expanded={snoozing === reminder.id}
              onClick={() => setSnoozing(snoozing === reminder.id ? null : reminder.id)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Icon name="clock" className="h-5 w-5" />
            </button>
          )}
        </div>
        {snoozing === reminder.id && !isDone && (
          <div className="animate-pop-in mt-2 flex flex-wrap items-center gap-2 pl-15">
            <span className="text-sm text-muted">Posponer:</span>
            {SNOOZE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  update.mutate({
                    id: reminder.id,
                    changes: { due_at: snoozedDue(reminder.due_at, option.id, new Date()) },
                  })
                  setSnoozing(null)
                }}
                className="rounded-full border-2 border-line bg-surface px-3 py-1.5 text-sm font-bold text-muted transition-all hover:text-ink active:scale-95"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </li>
    )
  }

  function section(title: string, list: Reminder[], tone: 'late' | 'normal' | 'done') {
    if (list.length === 0) return null
    return (
      <Card>
        <h2 className={`text-lg font-bold ${tone === 'late' ? 'text-danger' : ''}`}>
          {title} <span className="text-sm font-semibold text-muted">· {list.length}</span>
        </h2>
        <ul className="divide-y divide-line">{list.map((reminder) => row(reminder, tone))}</ul>
      </Card>
    )
  }

  return (
    <div className="stagger space-y-6">
      <PageHeader
        title="Recordatorios"
        subtitle="Que no se te pase nada"
        action={
          !editing && (
            <button type="button" onClick={openNew} className="btn-primary flex shrink-0 items-center gap-2 px-4 py-2.5">
              <Icon name="plus" className="h-5 w-5" />
              Nuevo
            </button>
          )
        }
      />

      <PushCard />

      {editing && (
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-lg font-bold">{editing.id === null ? 'Nuevo recordatorio' : 'Editar recordatorio'}</h2>
            <TextField
              label="¿Qué quieres recordar?"
              value={editing.values.title}
              onChange={(value) => setValue('title', value)}
              maxLength={REMINDER_TITLE_MAX}
              placeholder="Entregar el trabajo de clase"
              required
            />
            <TextField
              label="Día y hora"
              type="datetime-local"
              value={editing.values.due}
              onChange={(value) => setValue('due', value)}
              required
            />
            <div>
              <span className="mb-1.5 block text-sm font-semibold">Se repite</span>
              <ChoiceChips
                label="Se repite"
                options={REPEAT_OPTIONS}
                value={editing.values.repeat}
                onChange={(value) => setValue('repeat', value)}
              />
            </div>
            <TextField
              label="Nota (opcional)"
              value={editing.values.note}
              onChange={(value) => setValue('note', value)}
              maxLength={REMINDER_NOTE_MAX}
            />

            {formError && (
              <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={saving} className="btn-primary px-6 py-3">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-2xl border-2 border-line px-5 py-2.5 font-bold text-muted transition-colors hover:text-ink"
              >
                Cancelar
              </button>
              {editing.id !== null && (
                <button
                  type="button"
                  onClick={() => {
                    const id = editing.id
                    if (id !== null) remove.mutate(id, { onSuccess: () => setEditing(null) })
                  }}
                  className="ml-auto rounded-2xl px-4 py-2.5 font-bold text-danger transition-colors hover:bg-danger-soft"
                >
                  Borrar
                </button>
              )}
            </div>
          </form>
        </Card>
      )}

      {saveError && (
        <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          No se pudo guardar el cambio. Revisa la conexión e inténtalo otra vez.
        </p>
      )}

      {reminders.data.length === 0 && !editing ? (
        <Card className="flex flex-col items-center text-center">
          <Mascot className="mb-2 h-32" />
          <h2 className="text-lg font-bold">Nada pendiente</h2>
          <p className="mt-1 text-muted">Apunta aquí lo que no quieres olvidar: una entrega, beber agua, una tarea...</p>
          <button type="button" onClick={openNew} className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-3">
            <Icon name="plus" className="h-5 w-5" />
            Crear recordatorio
          </button>
        </Card>
      ) : (
        <>
          {section('Atrasados', groups.overdue, 'late')}
          {section('Hoy', groups.today, 'normal')}
          {section('Próximos', groups.upcoming, 'normal')}
          {section('Hechos', groups.done, 'done')}
        </>
      )}

      <p className="text-center text-sm text-muted">
        Por ahora los recordatorios se ven al abrir la app; los avisos al móvil llegarán más adelante.
      </p>
    </div>
  )
}
