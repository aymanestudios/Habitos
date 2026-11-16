// Historial de UN hábito: cómo le ha ido día a día en las últimas 12 semanas.
// TypeScript puro (sin React ni Supabase). Ve también los días de un hábito ya archivado.

import { addDays, isoWeekday, weekStart } from '@/lib/dates'
import type { LogRow } from './dayRules'
import type { Habit } from './habitRules'

export const HISTORY_WEEKS = 12

export type HistoryState = 'future' | 'off' | 'done' | 'partial' | 'missed'
export type HistoryCell = { date: string; value: number; state: HistoryState }

export type HistorySummary = {
  doneDays: number // días con el objetivo del día cumplido
  scheduledDays: number // días que tocaba (solo hábitos diarios)
  percent: number | null // null en hábitos semanales
  bestRun: number // mejor tanda de días seguidos cumplidos (solo diarios)
  weeksMet: number // semanas con la meta semanal cumplida (solo semanales)
  weeksCounted: number
  total: number // suma de todo lo registrado
}

const EPSILON = 1e-9

export function historyFrom(today: string): string {
  return addDays(weekStart(today), -7 * (HISTORY_WEEKS - 1))
}

function isDaily(habit: Habit): boolean {
  return habit.frequency_type === 'daily' || habit.frequency_type === 'days_of_week'
}

// ¿Existía el hábito ese día? (empezado, sin terminar y sin archivar todavía)
function existedOn(habit: Habit, date: string): boolean {
  if (date < habit.start_date) return false
  if (habit.end_date !== null && date > habit.end_date) return false
  if (habit.archived_at !== null && date > habit.archived_at.slice(0, 10)) return false
  return true
}

function scheduledOn(habit: Habit, date: string): boolean {
  if (!existedOn(habit, date)) return false
  if (habit.frequency_type === 'days_of_week') return (habit.days_of_week ?? []).includes(isoWeekday(date))
  return true
}

export function buildHistory(habit: Habit, logs: LogRow[], today: string): HistoryCell[][] {
  const values = new Map<string, number>()
  for (const log of logs) if (log.habit_id === habit.id) values.set(log.local_date, Number(log.value))
  const goal = habit.target_value ?? 1
  const first = historyFrom(today)

  return Array.from({ length: HISTORY_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, day): HistoryCell => {
      const date = addDays(first, week * 7 + day)
      const value = values.get(date) ?? 0
      if (date > today) return { date, value, state: 'future' }
      // Los semanales no tienen "fallo" por día: solo se ve lo que hiciste
      if (!isDaily(habit)) {
        if (!existedOn(habit, date)) return { date, value, state: 'off' }
        if (value <= 0) return { date, value, state: 'off' }
        return { date, value, state: habit.frequency_type === 'weekly_total' || value + EPSILON < goal ? 'partial' : 'done' }
      }
      if (!scheduledOn(habit, date)) return { date, value, state: value > 0 ? 'partial' : 'off' }
      if (value + EPSILON >= goal) return { date, value, state: 'done' }
      if (value > 0) return { date, value, state: 'partial' }
      // Hoy aún no cuenta como fallo: queda día por delante
      return { date, value, state: date === today ? 'off' : 'missed' }
    }),
  )
}

export function summarizeHistory(habit: Habit, cells: HistoryCell[][], today: string): HistorySummary {
  const flat = cells.flat().filter((cell) => cell.state !== 'future')
  const total = flat.reduce((sum, cell) => sum + cell.value, 0)
  const goal = habit.target_value ?? 1

  if (!isDaily(habit)) {
    let weeksMet = 0
    let weeksCounted = 0
    for (const week of cells) {
      if (!week.some((cell) => cell.state !== 'future' && existedOn(habit, cell.date))) continue
      weeksCounted += 1
      const met =
        habit.frequency_type === 'weekly_total'
          ? week.reduce((sum, cell) => sum + cell.value, 0) + EPSILON >= goal
          : week.filter((cell) => cell.value + EPSILON >= goal).length >= (habit.weekly_target ?? 1)
      if (met) weeksMet += 1
    }
    const doneDays = flat.filter((cell) => cell.value > 0).length
    return { doneDays, scheduledDays: 0, percent: null, bestRun: 0, weeksMet, weeksCounted, total }
  }

  let doneDays = 0
  let scheduledDays = 0
  let run = 0
  let bestRun = 0
  for (const cell of flat) {
    if (!scheduledOn(habit, cell.date)) continue
    if (cell.date === today && cell.state !== 'done') continue // hoy aún no ha terminado
    scheduledDays += 1
    if (cell.state === 'done') {
      doneDays += 1
      run += 1
      bestRun = Math.max(bestRun, run)
    } else {
      run = 0
    }
  }
  return {
    doneDays,
    scheduledDays,
    percent: scheduledDays === 0 ? null : Math.round((doneDays / scheduledDays) * 100),
    bestRun,
    weeksMet: 0,
    weeksCounted: 0,
    total,
  }
}
