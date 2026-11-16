// Reglas puras (sin React ni Supabase) del progreso de juego: nivel, XP y racha.
// Los números de verdad los calcula el servidor (0004_xp_streaks.sql); aquí solo se preparan para mostrarlos.

export type Progress = {
  xp_total: number
  level: number
  xp_into_level: number // XP ganados dentro del nivel actual
  xp_level_size: number // XP que hacen falta para pasar de este nivel al siguiente
  current_streak: number
  best_streak: number
  freezes_left: number // días que aún se pueden fallar este mes sin perder la racha
  today_scheduled: number
  today_done: number
  today_ok: boolean // hoy ya llegas al 70 %
  habits_done: number
}

const EMPTY: Progress = {
  xp_total: 0,
  level: 1,
  xp_into_level: 0,
  xp_level_size: 100,
  current_streak: 0,
  best_streak: 0,
  freezes_left: 2,
  today_scheduled: 0,
  today_done: 0,
  today_ok: false,
  habits_done: 0,
}

function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** La función devuelve una tabla (un array de 1 fila). Esto acepta fila suelta, array o vacío y siempre devuelve datos válidos. */
export function normalizeProgress(raw: unknown): Progress {
  const row = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null | undefined
  if (!row || typeof row !== 'object') return EMPTY
  return {
    xp_total: num(row.xp_total, 0),
    level: Math.max(1, num(row.level, 1)),
    xp_into_level: Math.max(0, num(row.xp_into_level, 0)),
    xp_level_size: Math.max(1, num(row.xp_level_size, 100)),
    current_streak: Math.max(0, num(row.current_streak, 0)),
    best_streak: Math.max(0, num(row.best_streak, 0)),
    freezes_left: Math.max(0, num(row.freezes_left, 2)),
    today_scheduled: Math.max(0, num(row.today_scheduled, 0)),
    today_done: Math.max(0, num(row.today_done, 0)),
    today_ok: row.today_ok === true,
    habits_done: Math.max(0, num(row.habits_done, 0)),
  }
}

/** Porcentaje (0-100) de la barra del nivel. */
export function levelPercent(p: Progress): number {
  return Math.min(100, Math.max(0, Math.round((p.xp_into_level / p.xp_level_size) * 100)))
}

/** XP que faltan para el siguiente nivel. */
export function xpToNext(p: Progress): number {
  return Math.max(0, p.xp_level_size - p.xp_into_level)
}

/** "3 días" / "1 día" / "Sin racha" */
export function streakLabel(days: number): string {
  if (days <= 0) return 'Sin racha'
  return days === 1 ? '1 día' : `${days} días`
}

/** Mensaje corto bajo la racha de la tarjeta de Hoy. */
export function streakHint(p: Progress): string {
  if (p.current_streak === 0) {
    return p.today_scheduled > 0 ? 'Completa el 70 % de hoy y empieza tu racha.' : 'Crea un hábito y empieza tu racha.'
  }
  if (p.today_ok) return 'Hoy ya cuenta para tu racha.'
  if (p.today_scheduled === 0) return 'Hoy no hay hábitos fijos: tu racha sigue a salvo.'
  return 'Completa el 70 % de hoy para sumar un día más.'
}

/** Explica las congelaciones en lenguaje normal. */
export function freezesText(left: number): string {
  if (left <= 0) return 'Este mes ya no puedes fallar ningún día sin perder la racha.'
  if (left === 1) return 'Este mes puedes fallar 1 día más sin perder la racha.'
  return `Este mes puedes fallar ${left} días sin perder la racha.`
}

/** Texto del aviso flotante: "+20 XP" (o "−20 XP" al desmarcar). Devuelve null si no hay cambio. */
export function xpToastText(delta: number): string | null {
  if (!Number.isFinite(delta) || delta === 0) return null
  return delta > 0 ? `+${delta} XP` : `−${Math.abs(delta)} XP`
}
