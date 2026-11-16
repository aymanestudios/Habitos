// Reglas puras de los recordatorios (sin React ni Supabase), para poder probarlas.
// Un recordatorio es un INSTANTE (due_at). Se muestra en la hora del dispositivo.

export type Repeat = 'none' | 'daily' | 'weekly'

export type Reminder = {
  id: string
  title: string
  note: string | null
  due_at: string // ISO
  repeat: Repeat
  done_at: string | null
  last_done_at: string | null
}

export type ReminderPayload = { title: string; note: string | null; due_at: string; repeat: Repeat }
export type ReminderChanges = Partial<ReminderPayload> & { done_at?: string | null; last_done_at?: string | null }

export const REMINDER_TITLE_MAX = 80
export const REMINDER_NOTE_MAX = 200

export const REPEAT_OPTIONS: { value: Repeat; label: string }[] = [
  { value: 'none', label: 'Una vez' },
  { value: 'daily', label: 'Cada día' },
  { value: 'weekly', label: 'Cada semana' },
]

const pad = (n: number) => String(n).padStart(2, '0')

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Valor para <input type="datetime-local"> ('2026-11-16T18:30') en la hora del dispositivo. */
export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** De <input type="datetime-local"> a ISO. Devuelve null si no es una fecha válida. */
export function fromLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Hora propuesta al crear: la próxima hora en punto. */
export function defaultDue(now: Date): Date {
  const date = new Date(now)
  date.setHours(date.getHours() + 1, 0, 0, 0)
  return date
}

/** Siguiente fecha de un recordatorio que se repite: misma hora de reloj, el primer día que quede en el futuro. */
export function nextOccurrence(dueAt: string, repeat: Repeat, now: Date): string {
  const date = new Date(dueAt)
  const step = repeat === 'weekly' ? 7 : 1
  if (repeat === 'none') return dueAt
  do {
    date.setDate(date.getDate() + step) // setDate conserva la hora de reloj aunque cambie el horario de verano
  } while (date.getTime() <= now.getTime())
  return date.toISOString()
}

/** Qué hay que guardar al marcarlo como hecho. */
export function completeChanges(reminder: Reminder, now: Date): ReminderChanges {
  const nowIso = now.toISOString()
  if (reminder.repeat === 'none') return { done_at: nowIso }
  return { due_at: nextOccurrence(reminder.due_at, reminder.repeat, now), last_done_at: nowIso }
}

export type SnoozeOption = { id: string; label: string }
export const SNOOZE_OPTIONS: SnoozeOption[] = [
  { id: '10m', label: '10 min' },
  { id: '1h', label: '1 hora' },
  { id: 'tomorrow', label: 'Mañana' },
]

/** Posponer: desde ahora si ya pasó la hora, o desde su hora si aún no ha llegado. */
export function snoozedDue(dueAt: string, option: string, now: Date): string {
  const due = new Date(dueAt)
  if (option === 'tomorrow') {
    const date = new Date(now)
    date.setDate(date.getDate() + 1)
    date.setHours(due.getHours(), due.getMinutes(), 0, 0)
    return date.toISOString()
  }
  const base = Math.max(due.getTime(), now.getTime())
  return new Date(base + (option === '1h' ? 60 : 10) * 60_000).toISOString()
}

export type ReminderGroups = { overdue: Reminder[]; today: Reminder[]; upcoming: Reminder[]; done: Reminder[] }

export function groupReminders(reminders: Reminder[], now: Date): ReminderGroups {
  const groups: ReminderGroups = { overdue: [], today: [], upcoming: [], done: [] }
  const byDue = [...reminders].sort((a, b) => a.due_at.localeCompare(b.due_at))
  for (const reminder of byDue) {
    const due = new Date(reminder.due_at)
    if (reminder.done_at !== null) groups.done.push(reminder)
    else if (due.getTime() < now.getTime()) groups.overdue.push(reminder)
    else if (sameDay(due, now)) groups.today.push(reminder)
    else groups.upcoming.push(reminder)
  }
  groups.done.sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''))
  groups.done = groups.done.slice(0, 10)
  return groups
}

/** ¿Un recordatorio repetido ya se ha hecho hoy? */
export function doneToday(reminder: Reminder, now: Date): boolean {
  return reminder.last_done_at !== null && sameDay(new Date(reminder.last_done_at), now)
}

const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const dayFormat = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

/** "18:30" */
export function timeLabel(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/** "Hoy", "Mañana", "Ayer" o "lun, 23 nov" */
export function dayLabel(iso: string, now: Date): string {
  const date = new Date(iso)
  const shift = (days: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + days)
    return d
  }
  if (sameDay(date, now)) return 'Hoy'
  if (sameDay(date, shift(1))) return 'Mañana'
  if (sameDay(date, shift(-1))) return 'Ayer'
  return dayFormat.format(date).replace(/\./g, '')
}

export function repeatLabel(repeat: Repeat): string | null {
  if (repeat === 'daily') return 'Cada día'
  if (repeat === 'weekly') return 'Cada semana'
  return null
}

export type ReminderFormValues = { title: string; note: string; due: string; repeat: Repeat }

export function validateReminder(values: ReminderFormValues): string | null {
  const title = values.title.trim()
  if (title.length === 0) return 'Escribe qué quieres recordar.'
  if (title.length > REMINDER_TITLE_MAX) return `El título no puede pasar de ${REMINDER_TITLE_MAX} letras.`
  if (values.note.trim().length > REMINDER_NOTE_MAX) return `La nota no puede pasar de ${REMINDER_NOTE_MAX} letras.`
  if (fromLocalInput(values.due) === null) return 'Elige un día y una hora.'
  return null
}

export function formToReminder(values: ReminderFormValues): ReminderPayload {
  return {
    title: values.title.trim(),
    note: values.note.trim() === '' ? null : values.note.trim(),
    due_at: fromLocalInput(values.due) ?? new Date().toISOString(),
    repeat: values.repeat,
  }
}
