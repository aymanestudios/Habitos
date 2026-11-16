// Reglas puras de la pantalla de Estadísticas (sin React ni Supabase).
// Todo sale de tus hábitos y registros reales. Solo cuentan los hábitos diarios (los mismos del anillo de Hoy).
// Limitación conocida: los hábitos archivados no aparecen en el historial.

import { addDays, weekStart } from '@/lib/dates'
import { buildDayItems, isDailyKind, isScheduledOn, summarizeDay } from '@/features/habits/dayRules'
import type { LogRow } from '@/features/habits/dayRules'
import type { Habit } from '@/features/habits/habitRules'

export const HEATMAP_WEEKS = 12
export const BAR_WEEKS = 8

/** Primer día que hay que pedir a la base de datos: el lunes de hace 11 semanas. */
export function statsFrom(today: string): string {
  return addDays(weekStart(today), -7 * (HEATMAP_WEEKS - 1))
}

export type DayCell = {
  date: string
  future: boolean
  total: number // hábitos diarios que tocaban
  done: number
  level: 0 | 1 | 2 | 3 | 4 // intensidad del color: 0 = nada hecho ... 4 = todo
}

function levelFor(done: number, total: number): DayCell['level'] {
  if (total === 0 || done === 0) return 0
  const ratio = done / total
  if (ratio >= 1) return 4
  if (ratio >= 0.7) return 3
  if (ratio >= 0.4) return 2
  return 1
}

export function dayCell(habits: Habit[], logs: LogRow[], date: string, today: string): DayCell {
  if (date > today) return { date, future: true, total: 0, done: 0, level: 0 }
  const daily = habits.filter(isDailyKind)
  const { total, done } = summarizeDay(buildDayItems(daily, logs, date))
  return { date, future: false, total, done, level: levelFor(done, total) }
}

/** Calendario de actividad: 12 columnas (semanas, la última es la actual) de 7 días (lunes a domingo). */
export function buildHeatmap(habits: Habit[], logs: LogRow[], today: string): DayCell[][] {
  const first = statsFrom(today)
  return Array.from({ length: HEATMAP_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => dayCell(habits, logs, addDays(first, week * 7 + day), today)),
  )
}

export type WeekBar = { start: string; total: number; done: number; percent: number | null; current: boolean }

/** Porcentaje de cumplimiento de cada una de las últimas 8 semanas (null = esa semana no tocaba nada). */
export function buildWeekBars(heatmap: DayCell[][]): WeekBar[] {
  return heatmap.slice(-BAR_WEEKS).map((week, index, list) => {
    const total = week.reduce((sum, cell) => sum + cell.total, 0)
    const done = week.reduce((sum, cell) => sum + cell.done, 0)
    return {
      start: week[0].date,
      total,
      done,
      percent: total === 0 ? null : Math.round((done / total) * 100),
      current: index === list.length - 1,
    }
  })
}

/** Texto que compara esta semana con la anterior. */
export function compareWeeks(bars: WeekBar[]): string {
  const current = bars[bars.length - 1]
  const previous = bars[bars.length - 2]
  if (!current || current.percent === null) return 'Esta semana aún no tocaba ningún hábito.'
  if (!previous || previous.percent === null) return `Esta semana llevas un ${current.percent} %.`
  const diff = current.percent - previous.percent
  if (diff === 0) return `Igual que la semana pasada: ${current.percent} %.`
  return diff > 0
    ? `${diff} puntos más que la semana pasada. ¡Vas a más!`
    : `${Math.abs(diff)} puntos menos que la semana pasada. Aún estás a tiempo.`
}

export type HabitRank = { id: string; title: string; scheduled: number; done: number; percent: number }

/** Hábitos más constantes de los últimos 30 días (de más a menos). */
export function rankHabits(habits: Habit[], logs: LogRow[], today: string, days = 30): HabitRank[] {
  const dates = Array.from({ length: days }, (_, index) => addDays(today, -index))
  const doneDays = new Map<string, Set<string>>()
  for (const habit of habits.filter(isDailyKind)) {
    const goal = habit.target_value ?? 1
    const set = new Set<string>()
    for (const log of logs) {
      if (log.habit_id === habit.id && Number(log.value) + 1e-9 >= goal) set.add(log.local_date)
    }
    doneDays.set(habit.id, set)
  }
  return habits
    .filter(isDailyKind)
    .map((habit) => {
      const scheduledDates = dates.filter((date) => isScheduledOn(habit, date))
      const done = scheduledDates.filter((date) => doneDays.get(habit.id)?.has(date)).length
      const scheduled = scheduledDates.length
      return {
        id: habit.id,
        title: habit.title,
        scheduled,
        done,
        percent: scheduled === 0 ? 0 : Math.round((done / scheduled) * 100),
      }
    })
    .filter((rank) => rank.scheduled > 0)
    .sort((a, b) => b.percent - a.percent || b.done - a.done || a.title.localeCompare(b.title))
}

/** "3 nov" a partir de '2026-11-03'. */
export function shortDate(date: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`))
    .replace('.', '')
}

export function cellLabel(cell: DayCell): string {
  if (cell.future) return ''
  if (cell.total === 0) return `${shortDate(cell.date)}: sin hábitos`
  return `${shortDate(cell.date)}: ${cell.done} de ${cell.total}`
}
