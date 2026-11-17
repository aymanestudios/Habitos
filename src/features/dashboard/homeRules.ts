// Reglas puras de Inicio: resumen semanal y bienvenida. Todo sale de datos reales del servidor
// (get_week_recap / get_today_glance, 0017). Nunca se inventa una cifra: si no hay datos, no se compara.

export type WeekNumbers = { completed: number; percent: number | null; xp: number }

export type WeekRecap = {
  weekStart: string
  weekEnd: string
  current: WeekNumbers
  previous: WeekNumbers | null // null = la semana anterior no tenía hábitos: no se compara
  streakEnd: number
  newRecord: number | null // mejor racha nueva conseguida esa semana
  topCategory: string | null
  changePct: number | null // % más (o menos) hábitos completados que la semana anterior
}

type RawWeek = { scheduled?: number; done?: number; completed?: number; xp?: number }

function numbers(raw: RawWeek | undefined): WeekNumbers & { scheduled: number } {
  const scheduled = Number(raw?.scheduled ?? 0)
  const done = Number(raw?.done ?? 0)
  return {
    scheduled,
    completed: Number(raw?.completed ?? 0),
    percent: scheduled > 0 ? Math.round((done / scheduled) * 100) : null,
    xp: Number(raw?.xp ?? 0),
  }
}

export function buildWeekRecap(raw: unknown): WeekRecap | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const cur = numbers(r.current as RawWeek)
  const prev = numbers(r.previous as RawWeek)
  if (cur.scheduled === 0 && cur.completed === 0) return null // semana sin hábitos: no hay nada que resumir
  const before = Number(r.best_before ?? 0)
  const after = Number(r.best_after ?? 0)
  const hasPrev = prev.scheduled > 0 || prev.completed > 0
  return {
    weekStart: String(r.week_start),
    weekEnd: String(r.week_end),
    current: { completed: cur.completed, percent: cur.percent, xp: cur.xp },
    previous: hasPrev ? { completed: prev.completed, percent: prev.percent, xp: prev.xp } : null,
    streakEnd: Number(r.streak_end ?? 0),
    newRecord: after > before && after > 1 ? after : null,
    topCategory: typeof r.top_category === 'string' ? r.top_category : null,
    changePct:
      hasPrev && prev.completed > 0 ? Math.round(((cur.completed - prev.completed) / prev.completed) * 100) : null,
  }
}

/** Frase del panda con las cifras reales. Anima siempre, nunca culpabiliza. */
export function recapMessage(recap: WeekRecap): string {
  const n = recap.current.completed
  if (n === 0) return 'La semana pasada fue tranquila. ¡Esta semana es una nueva oportunidad!'
  let text = `¡La semana pasada completaste ${n} ${n === 1 ? 'hábito' : 'hábitos'}!`
  if (recap.changePct === null) text += recap.previous ? ' ¡Gran salto respecto a la anterior!' : ' ¡Buen comienzo!'
  else if (recap.changePct > 0) text += ` Has mejorado un ${recap.changePct} % respecto a la semana anterior. ¡Sigue así!`
  else if (recap.changePct === 0) text += ' Igual de constante que la semana anterior.'
  else text += ' Algo menos que la anterior, pero cada día suma.'
  return text
}

export type RecapPose = 'star' | 'cheer' | 'gym' | 'sleep'

export function recapPose(recap: WeekRecap): RecapPose {
  if (recap.newRecord) return 'star'
  if (recap.current.completed === 0) return 'sleep'
  if ((recap.changePct ?? 0) > 0 || (recap.previous === null && recap.current.completed > 0)) return 'cheer'
  return 'gym'
}

const RANGE = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export function weekRange(recap: WeekRecap): string {
  const a = RANGE.format(new Date(`${recap.weekStart}T12:00:00Z`)).replace('.', '')
  const b = RANGE.format(new Date(`${recap.weekEnd}T12:00:00Z`)).replace('.', '')
  return `${a} – ${b}`
}

// --- Cuándo enseñar cada cosa (recuerdo local: solo evita repetir, los datos están en Supabase) ---

function seen(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return 'x' // sin almacenamiento: mejor no molestar
  }
}
function mark(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // nada
  }
}

/** El resumen sale UNA vez por semana (la primera vez que entras a partir del lunes). */
export function takeRecap(recap: WeekRecap | null): boolean {
  if (!recap) return false
  if (seen('pg-recap-seen') === recap.weekStart) return false
  mark('pg-recap-seen', recap.weekStart)
  return true
}

export type Welcome = { title: string; text: string }

/** Bienvenida si vuelves tras 3+ días sin marcar nada (una vez al día). Cálida, sin reproches. */
export function welcomeFor(name: string, daysAway: number | null, today: string): Welcome | null {
  if (daysAway === null || daysAway < 3) return null
  if (seen('pg-welcome') === today) return null
  mark('pg-welcome', today)
  return daysAway >= 7
    ? { title: `¡Cuánto tiempo, ${name}!`, text: 'Me alegra verte. Empieza por algo pequeño: un solo hábito ya cuenta.' }
    : { title: `¡Qué bien verte de nuevo, ${name}!`, text: 'Hoy es un buen día para retomar. Paso a paso.' }
}

const EASE: Record<string, number> = { easy: 0, medium: 1, hard: 2 }

/** Plan fácil para retomar: el hábito pendiente más sencillo de hoy (o null si no hay ninguno). */
export function easyStart<T extends { checked: boolean; habit: { difficulty: string } }>(items: T[]): T | null {
  const pending = items.filter((item) => !item.checked)
  if (pending.length === 0) return null
  return pending.reduce((best, item) => ((EASE[item.habit.difficulty] ?? 1) < (EASE[best.habit.difficulty] ?? 1) ? item : best))
}
