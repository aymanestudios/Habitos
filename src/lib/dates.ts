// Utilidades de fechas y zonas horarias.
//
// REGLA DEL PROYECTO: un "día" es una fecha en texto ('2026-11-06') en la zona horaria
// del usuario, no un instante en UTC. Así el cambio de hora y los viajes no rompen rachas.

/** Zona horaria del dispositivo, por ejemplo "Europe/Madrid". */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Fecha local ('YYYY-MM-DD') de un instante en una zona horaria concreta. */
export function localDateString(date: Date, timeZone: string): string {
  // El formato inglés de Canadá (en-CA) devuelve justo AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Hora local (0-23) de un instante en una zona horaria concreta. */
export function localHour(date: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(date)
  return Number(hour) % 24
}

/** Lunes de la semana a la que pertenece una fecha local ('YYYY-MM-DD'). */
export function weekStart(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  const daysSinceMonday = (d.getUTCDay() + 6) % 7 // lunes = 0 ... domingo = 6
  d.setUTCDate(d.getUTCDate() - daysSinceMonday)
  return d.toISOString().slice(0, 10)
}

/** Suma (o resta) días a una fecha local ('YYYY-MM-DD'). Funciona con cambios de mes, año y bisiestos. */
export function addDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Día de la semana de una fecha local: 1 = lunes ... 7 = domingo (igual que days_of_week en la base de datos). */
export function isoWeekday(localDate: string): number {
  const [year, month, day] = localDate.split('-').map(Number)
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay() // 0 = domingo
  return jsDay === 0 ? 7 : jsDay
}

/** Saludo según la hora local. */
export function greetingFor(hour: number): string {
  if (hour >= 6 && hour < 13) return 'Buenos días'
  if (hour >= 13 && hour < 21) return 'Buenas tardes'
  return 'Buenas noches'
}
