// Reglas de la pantalla "Hoy": qué hábitos tocan un día y cuánto llevas.
// TypeScript "puro" (sin React ni Supabase) para poder probarlo con casos límite.
// La base de datos aplica las mismas reglas al escribir (0003_habit_logs.sql); aquí solo se muestran.

import { addDays, isoWeekday, weekStart } from '@/lib/dates'
import type { Habit } from './habitRules'

// Una fila de habit_logs: lo acumulado de un hábito en un día. Sin fila = nada hecho.
export type LogRow = { habit_id: string; local_date: string; value: number }

export const MAX_VALUE = 100000

// Tolerancia para comparar decimales (0.1 + 0.2 no es exactamente 0.3 en un ordenador)
const EPSILON = 1e-9

function reached(value: number, goal: number): boolean {
  return value + EPSILON >= goal
}

/** Los hábitos "diarios" (todos los días o días concretos) son los que cuentan para el anillo del día. */
export function isDailyKind(habit: Habit): boolean {
  return habit.frequency_type === 'daily' || habit.frequency_type === 'days_of_week'
}

/** ¿El hábito existe ese día? (no archivado, ya empezado y no terminado) */
export function isActiveOn(habit: Habit, date: string): boolean {
  if (habit.archived_at !== null) return false
  if (date < habit.start_date) return false // las fechas AAAA-MM-DD se comparan bien como texto
  if (habit.end_date !== null && date > habit.end_date) return false
  return true
}

/** ¿Toca este hábito ese día? Los semanales se pueden hacer cualquier día de la semana. */
export function isScheduledOn(habit: Habit, date: string): boolean {
  if (!isActiveOn(habit, date)) return false
  if (habit.frequency_type === 'days_of_week') return (habit.days_of_week ?? []).includes(isoWeekday(date))
  return true
}

/** Cuánto suma cada pulsación de + o −. Escalones automáticos según la meta (más adelante: escribir el número). */
export function stepFor(target: number | null): number {
  if (target === null || target <= 12) return 1
  if (target <= 60) return 5
  if (target <= 300) return 25
  if (target <= 1000) return 100
  if (target <= 5000) return 500
  return 1000
}

/** Los 7 días (lunes a domingo) de la semana a la que pertenece una fecha. */
export function weekDates(date: string): string[] {
  const start = weekStart(date)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

function valueOn(logs: LogRow[], habitId: string, date: string): number {
  const row = logs.find((log) => log.habit_id === habitId && log.local_date === date)
  return row ? Number(row.value) : 0
}

export type WeekInfo =
  | { kind: 'count'; done: number; goal: number; complete: boolean } // N veces por semana
  | { kind: 'total'; sum: number; goal: number; complete: boolean } // una cantidad total a la semana

// Un hábito tal como se pinta en un día concreto
export type DayItem = {
  habit: Habit
  value: number // lo acumulado ese día
  numeric: boolean // tiene meta numérica: se maneja con − y +
  checked: boolean // hecho (sí/no marcado, meta del día alcanzada o, en total semanal, meta de la semana)
  progress: number // 0 a 100
  step: number
  week: WeekInfo | null
}

/** Convierte hábitos + registros en lo que se ve un día: solo los que tocan, con su progreso. */
export function buildDayItems(habits: Habit[], logs: LogRow[], date: string): DayItem[] {
  const week = weekDates(date)

  return habits
    .filter((habit) => isScheduledOn(habit, date))
    .map((habit): DayItem => {
      const numeric = habit.target_value !== null
      const threshold = habit.target_value ?? 1
      const value = valueOn(logs, habit.id, date)
      const base = { habit, value, numeric, step: stepFor(habit.target_value) }

      if (habit.frequency_type === 'weekly_total') {
        const sum = week.reduce((total, day) => total + valueOn(logs, habit.id, day), 0)
        const complete = reached(sum, threshold)
        return {
          ...base,
          checked: complete,
          progress: Math.min(100, (sum / threshold) * 100),
          week: { kind: 'total', sum, goal: threshold, complete },
        }
      }

      const checked = reached(value, threshold)
      const progress = Math.min(100, (value / threshold) * 100)

      if (habit.frequency_type === 'weekly_count') {
        const goal = habit.weekly_target ?? 1
        const done = week.filter((day) => reached(valueOn(logs, habit.id, day), threshold)).length
        return { ...base, checked, progress, week: { kind: 'count', done, goal, complete: done >= goal } }
      }

      return { ...base, checked, progress, week: null }
    })
}

export type DaySummary = { total: number; done: number; percent: number }

/** Resumen del día: solo cuentan los hábitos diarios. El porcentaje incluye el progreso parcial (5 de 8 vasos). */
export function summarizeDay(items: DayItem[]): DaySummary {
  const daily = items.filter((item) => isDailyKind(item.habit))
  const done = daily.filter((item) => item.checked).length
  const percent =
    daily.length === 0 ? 0 : Math.round(daily.reduce((sum, item) => sum + item.progress, 0) / daily.length)
  return { total: daily.length, done, percent }
}

/**
 * Aplica un cambio a los registros en memoria, igual que lo hará el servidor.
 * Sirve para que la pantalla responda al instante (UI optimista); luego el servidor confirma.
 */
export function applyDelta(logs: LogRow[], habit: Habit, date: string, delta: number): LogRow[] {
  const max = habit.target_value === null ? 1 : MAX_VALUE
  const next = Math.round(Math.max(0, Math.min(max, valueOn(logs, habit.id, date) + delta)) * 100) / 100
  const others = logs.filter((log) => !(log.habit_id === habit.id && log.local_date === date))
  return next === 0 ? others : [...others, { habit_id: habit.id, local_date: date, value: next }]
}

/** Texto animado del panda según cómo va el día. Tono siempre positivo. */
export function dayMessage(
  summary: DaySummary,
  isToday: boolean,
  streak = 0,
): { title: string; text: string } {
  const { total, done } = summary
  const left = total - done

  if (total === 0) {
    return isToday
      ? { title: 'Día libre', text: 'Hoy no hay hábitos fijos. Descansa, o crea uno nuevo.' }
      : { title: 'Ayer sin hábitos fijos', text: 'No había nada programado para ayer.' }
  }
  if (done === total) {
    return isToday
      ? {
          title: '¡Día completo!',
          text: streak >= 2 ? `Todo hecho. ¡${streak} días seguidos!` : 'Todo hecho. Mañana seguimos.',
        }
      : { title: 'Ayer lo clavaste', text: 'Todo hecho.' }
  }
  if (!isToday) {
    return { title: 'Ayer', text: `Hiciste ${done} de ${total}. Aún puedes marcar lo que falte.` }
  }
  if (done === 0) {
    return { title: 'Empezamos suave', text: `Tienes ${total} por delante. Con uno pequeño ya arrancas.` }
  }
  return {
    title: 'Vas muy bien',
    text: `Llevas ${done} de ${total}. ${left === 1 ? 'Te queda 1' : `Te quedan ${left}`} para cerrar el día.`,
  }
}

const amountFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })

/** Cantidad legible: 3, 0,5, 12.345 */
export function formatAmount(value: number): string {
  return amountFormat.format(value)
}

/** Línea pequeña bajo el título de un hábito en "Hoy": cuánto llevas ("5 de 8 vasos", "2 de 3 veces esta semana"...). */
export function itemMeta(item: DayItem): string {
  const { habit, value, week } = item
  const unit = habit.unit ? ` ${habit.unit}` : ''
  const target = habit.target_value
  const day = item.numeric && target !== null ? `${formatAmount(value)} de ${formatAmount(target)}${unit}` : ''

  if (week?.kind === 'total') {
    const base = `${formatAmount(week.sum)} de ${formatAmount(week.goal)}${unit} esta semana`
    return value > 0 ? `${base} · hoy ${formatAmount(value)}` : base
  }
  if (week?.kind === 'count') {
    const weekly = `${week.done} de ${week.goal} ${week.goal === 1 ? 'vez' : 'veces'} esta semana`
    return day ? `${day} · ${weekly}` : weekly
  }
  return day || (habit.description ?? '')
}
