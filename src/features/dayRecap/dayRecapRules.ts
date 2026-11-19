// "Tu día en Progress&Go": qué escenas se enseñan y con qué frases. Solo datos reales (get_day_recap, 0027).
// Sin datos de algo → esa escena no sale (nunca se inventa ni se enseña una escena vacía).

export type DayRecapTeam = { label: string; unit: string; partner: string; mineDay: number; completed: boolean }

export type DayRecap = {
  date: string
  scheduled: number
  done: number
  state: 'ok' | 'miss' | 'free'
  completed: number
  habits: { title: string; category: string }[]
  xp: number
  xpTeam: number
  levelBefore: number
  levelAfter: number
  streak: number
  bestStreak: number
  newRecord: boolean
  team: DayRecapTeam[]
  seen: boolean
  worth: boolean
}

const n = (value: unknown) => {
  const x = Number(value)
  return Number.isFinite(x) ? x : 0
}

export function buildDayRecap(raw: unknown): DayRecap | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!r.date || r.before_account) return null
  const state = r.state === 'ok' || r.state === 'miss' ? r.state : 'free'
  return {
    date: String(r.date),
    scheduled: n(r.scheduled),
    done: n(r.done),
    state,
    completed: n(r.completed),
    habits: (Array.isArray(r.habits) ? r.habits : []).map((h: Record<string, unknown>) => ({ title: String(h.title ?? ''), category: String(h.category ?? 'other') })),
    xp: n(r.xp),
    xpTeam: n(r.xp_team),
    levelBefore: Math.max(1, n(r.level_before)),
    levelAfter: Math.max(1, n(r.level_after)),
    streak: n(r.streak),
    bestStreak: n(r.best_streak),
    newRecord: Boolean(r.new_record),
    team: (Array.isArray(r.team) ? r.team : []).map((t: Record<string, unknown>) => ({
      label: String(t.label ?? ''),
      unit: String(t.unit ?? ''),
      partner: String(t.partner ?? ''),
      mineDay: n(t.mine_day),
      completed: Boolean(t.completed),
    })),
    seen: Boolean(r.seen),
    worth: Boolean(r.worth),
  }
}

export type SceneId = 'welcome' | 'habits' | 'xp' | 'streak' | 'team' | 'close'

/** Escenas que tienen datos reales, en orden. Bienvenida y cierre siempre. */
export function scenesFor(recap: DayRecap): SceneId[] {
  const scenes: SceneId[] = ['welcome']
  if (recap.scheduled > 0 || recap.completed > 0) scenes.push('habits')
  if (recap.xp > 0) scenes.push('xp')
  if (recap.streak > 0) scenes.push('streak')
  if (recap.team.some((t) => t.completed || t.mineDay > 0)) scenes.push('team')
  scenes.push('close')
  return scenes
}

export function habitsLine(recap: DayRecap): string {
  if (recap.scheduled > 0) {
    if (recap.done === recap.scheduled) {
      return recap.scheduled === 1 ? '¡Completaste tu hábito del día!' : `¡Completaste tus ${recap.scheduled} hábitos!`
    }
    if (recap.done === 0) return `Tenías ${recap.scheduled} ${recap.scheduled === 1 ? 'hábito' : 'hábitos'} y fue un día de descanso.`
    return `¡Completaste ${recap.done} de tus ${recap.scheduled} hábitos!`
  }
  return recap.completed === 1 ? '¡Completaste 1 hábito!' : `¡Completaste ${recap.completed} hábitos!`
}

/** % del día (para el anillo). Sin hábitos programados = null. */
export function dayPercent(recap: DayRecap): number | null {
  if (recap.scheduled <= 0) return null
  return Math.min(100, Math.round((recap.done / recap.scheduled) * 100))
}

export function streakLine(recap: DayRecap): string {
  if (recap.newRecord) return `¡Nuevo récord: ${recap.streak} ${recap.streak === 1 ? 'día' : 'días'} seguidos!`
  return recap.streak === 1 ? '¡Empezaste una racha nueva!' : `¡Llevas ${recap.streak} días manteniendo tu constancia!`
}

export function teamLines(recap: DayRecap): string[] {
  return recap.team.map((t) => {
    if (t.completed) return `¡Tú y ${t.partner.split(' ')[0]} completasteis un reto juntos! (${t.label})`
    const amount = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(t.mineDay)
    return `Sumaste ${amount} ${t.unit} al reto con ${t.partner.split(' ')[0]}.`
  })
}

export type Closing = { title: string; text: string; pose: 'cheer' | 'gym' | 'sleep' | 'star' }

/** Cierre según cómo fue el día. Sin culpa: descansar también vale. */
export function closingFor(recap: DayRecap): Closing {
  const pct = dayPercent(recap)
  const anything = recap.completed > 0 || recap.xp > 0 || recap.team.some((t) => t.mineDay > 0)
  if (!anything) {
    return { title: 'No todos los días salen como esperamos', text: 'Lo importante es poder volver a intentarlo. Hoy es un buen día para eso.', pose: 'sleep' }
  }
  if ((pct !== null && pct >= 70) || (pct === null && recap.completed >= 2) || recap.team.some((t) => t.completed)) {
    return { title: '¡Menudo día!', text: 'Sigue construyendo tu progreso. Hoy tienes otra oportunidad de brillar.', pose: recap.newRecord ? 'star' : 'cheer' }
  }
  return { title: 'Avanzaste a tu ritmo', text: 'Cada paso cuenta. Hoy tienes otra oportunidad.', pose: 'gym' }
}

const LONG = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const SHORT = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })

/** "ayer" o "el martes 17 de noviembre" (fecha local del usuario, sin líos de zona horaria). */
export function dayLabel(date: string, today: string): string {
  const diff = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 86_400_000)
  if (diff === 1) return 'ayer'
  return `el ${LONG.format(new Date(`${date}T12:00:00Z`))}`
}

export function shortDay(date: string): string {
  return SHORT.format(new Date(`${date}T12:00:00Z`)).replace('.', '')
}
