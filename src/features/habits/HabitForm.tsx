import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { ChoiceChips } from '@/components/ChoiceChips'
import { Icon } from '@/components/Icon'
import { TextField } from '@/components/TextField'
import {
  DAY_LETTERS,
  DAY_NAMES,
  DESCRIPTION_MAX,
  DIFFICULTY_OPTIONS,
  FREQUENCY_OPTIONS,
  TITLE_MAX,
  UNIT_MAX,
  VISIBILITY_OPTIONS,
  errorMessage,
  friendlyHabitError,
  validateHabitForm,
} from './habitRules'
import type { HabitFormValues } from './habitRules'

type Props = {
  initial: HabitFormValues
  submitLabel: string
  startDate: string // primer día del hábito, para validar la fecha límite
  onSubmit: (values: HabitFormValues) => Promise<void>
}

const sectionLabel = 'mb-2 block text-sm font-semibold'
const hint = 'mt-2 text-sm text-muted'

// Formulario compartido por "Nuevo hábito" y "Editar hábito" (así no se duplica).
// Guarda lo que escribes en "values"; al enviar, valida y llama a onSubmit.
export function HabitForm({ initial, submitLabel, startDate, onSubmit }: Props) {
  const [values, setValues] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof HabitFormValues>(key: K, value: HabitFormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }))
  }

  function toggleDay(day: number) {
    const days = values.days.includes(day)
      ? values.days.filter((current) => current !== day)
      : [...values.days, day].sort((a, b) => a - b)
    update('days', days)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const problem = validateHabitForm(values, startDate)
    if (problem) {
      setError(problem)
      return
    }

    setBusy(true)
    try {
      await onSubmit(values)
    } catch (caught) {
      setError(friendlyHabitError(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  const targetTitle =
    values.frequencyType === 'weekly_total'
      ? 'Objetivo semanal (obligatorio)'
      : 'Objetivo numérico (opcional)'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <TextField
        label="Nombre"
        value={values.title}
        onChange={(value) => update('title', value)}
        placeholder="Ej.: Entrenar 45 min"
        maxLength={TITLE_MAX}
        required
      />

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Descripción (opcional)</span>
        <textarea
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
          rows={2}
          maxLength={DESCRIPTION_MAX}
          className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-base outline-none transition-colors placeholder:text-muted focus:border-brand"
        />
      </label>

      <div>
        <span className={sectionLabel}>Frecuencia</span>
        <ChoiceChips
          label="Frecuencia"
          options={FREQUENCY_OPTIONS}
          value={values.frequencyType}
          onChange={(value) => update('frequencyType', value)}
        />

        {values.frequencyType === 'days_of_week' && (
          <div className="mt-4 flex gap-2" role="group" aria-label="Días de la semana">
            {DAY_LETTERS.map((letter, index) => {
              const day = index + 1
              const selected = values.days.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  aria-label={DAY_NAMES[index]}
                  aria-pressed={selected}
                  onClick={() => toggleDay(day)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold transition-all active:scale-90 ${
                    selected ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-muted'
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        )}

        {values.frequencyType === 'weekly_count' && (
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              aria-label="Una vez menos"
              onClick={() => update('weeklyTarget', Math.max(1, values.weeklyTarget - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-xl font-bold"
            >
              −
            </button>
            <span className="min-w-28 text-center font-semibold">
              {values.weeklyTarget} {values.weeklyTarget === 1 ? 'vez' : 'veces'} por semana
            </span>
            <button
              type="button"
              aria-label="Una vez más"
              onClick={() => update('weeklyTarget', Math.min(7, values.weeklyTarget + 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-brand-ink"
            >
              <Icon name="plus" className="h-5 w-5" />
            </button>
          </div>
        )}

        {values.frequencyType === 'weekly_total' && (
          <p className={hint}>
            Los progresos de toda la semana se suman hasta llegar a la cantidad que indiques abajo.
          </p>
        )}
      </div>

      <div>
        <span className={sectionLabel}>{targetTitle}</span>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Cantidad"
            value={values.targetValue}
            onChange={(value) => update('targetValue', value)}
            inputMode="decimal"
            placeholder="8"
          />
          <TextField
            label="Unidad"
            value={values.unit}
            onChange={(value) => update('unit', value)}
            maxLength={UNIT_MAX}
            placeholder="vasos"
          />
        </div>
        <p className={hint}>
          Por ejemplo 8 vasos o 5 km. Si lo dejas vacío, el hábito es de hecho / no hecho.
        </p>
      </div>

      <div>
        <span className={sectionLabel}>Dificultad</span>
        <ChoiceChips
          label="Dificultad"
          options={DIFFICULTY_OPTIONS}
          value={values.difficulty}
          onChange={(value) => update('difficulty', value)}
        />
        <p className={hint}>Decidirá cuánta XP da. Se activa en la parte 1.4.</p>
      </div>

      <div>
        <span className={sectionLabel}>¿Quién puede verlo?</span>
        <ChoiceChips
          label="Visibilidad"
          options={VISIBILITY_OPTIONS}
          value={values.visibility}
          onChange={(value) => update('visibility', value)}
        />
        <p className={hint}>
          Por defecto es privado. Tus amigos podrán ver los compartidos cuando llegue la parte de amigos.
        </p>
      </div>

      <TextField
        label="Fecha límite (opcional)"
        type="date"
        value={values.endDate}
        onChange={(value) => update('endDate', value)}
      />

      {error && (
        <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="submit"
          disabled={busy}
          className="btn-primary px-6 py-3"
        >
          {busy ? 'Guardando...' : submitLabel}
        </button>
        <Link
          to="/habitos"
          className="rounded-2xl border border-line px-6 py-3 text-center font-semibold transition-colors hover:bg-surface-2"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
