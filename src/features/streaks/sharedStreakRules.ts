// Rachas compartidas: datos de get_shared_streaks (0013_shared_streaks.sql) + estado de hoy.
import { stageFor } from './fireRules'

export type SharedStreak = {
  id: string
  startedOn: string
  createdByMe: boolean
  partnerId: string
  partnerName: string
  partnerAvatarPath: string | null
  partnerAvatarEmoji: string | null
  partnerAvatarColor: string | null
  current: number
  best: number
  todayCounted: boolean
  me: DayProgress
  partner: DayProgress
  iNudged: boolean // hoy ya le diste un toque
  nudgedMe: boolean // te ha dado un toque (últimas horas)
}

export type DayProgress = { scheduled: number; done: number; state: 'ok' | 'free' | 'pending' }

const STREAK_PERCENT = 70 // igual que game_rule('streak_percent')

export function dayProgress(scheduled: number, done: number): DayProgress {
  if (scheduled === 0) return { scheduled, done, state: 'free' }
  return { scheduled, done, state: done * 100 >= scheduled * STREAK_PERCENT ? 'ok' : 'pending' }
}

export function buildSharedStreaks(raw: unknown): SharedStreak[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((row) => row && row.id)
    .map((row) => ({
      id: String(row.id),
      startedOn: String(row.started_on),
      createdByMe: Boolean(row.created_by_me),
      partnerId: String(row.partner_id),
      partnerName: String(row.partner_name ?? ''),
      partnerAvatarPath: row.partner_avatar_path ?? null,
      partnerAvatarEmoji: row.partner_avatar_emoji ?? null,
      partnerAvatarColor: row.partner_avatar_color ?? null,
      current: Number(row.current_streak ?? 0),
      best: Number(row.best_streak ?? 0),
      todayCounted: Boolean(row.today_counted),
      me: dayProgress(Number(row.my_scheduled ?? 0), Number(row.my_done ?? 0)),
      partner: dayProgress(Number(row.partner_scheduled ?? 0), Number(row.partner_done ?? 0)),
      iNudged: Boolean(row.i_nudged_today),
      nudgedMe: Boolean(row.nudged_me_today),
    }))
}

export function stateText(progress: DayProgress): string {
  if (progress.state === 'free') return 'Día libre'
  if (progress.state === 'ok') return '¡Cumplido!'
  return `${progress.done}/${progress.scheduled} hechos`
}

/** ¿Puedo darle un toque? Solo si aún no ha cumplido y hoy no se lo he dado ya. */
export function canNudge(streak: SharedStreak): boolean {
  return streak.partner.state === 'pending' && !streak.iNudged
}

/** ¿Peligra la racha? (hay días que perder y alguno aún no ha cumplido) */
export function inDanger(streak: SharedStreak): boolean {
  return streak.current > 0 && !streak.todayCounted
}

/** Frase debajo de la llama según cómo va hoy. */
export function todayMessage(streak: SharedStreak): string {
  if (streak.todayCounted) return 'Hoy ya está: racha mantenida.'
  if (streak.nudgedMe && streak.me.state === 'pending') return `🔥 ${streak.partnerName} te ha dado un toque. ¡Te toca!`
  const meDone = streak.me.state !== 'pending'
  const partnerDone = streak.partner.state !== 'pending'
  if (meDone && !partnerDone) return `Tú ya cumpliste. Falta ${streak.partnerName}.`
  if (!meDone && partnerDone) return `${streak.partnerName} ya cumplió. ¡Te toca!`
  return streak.current > 0 ? 'Cumplid los dos para mantener el fuego.' : 'Cumplid los dos hoy para encender la llama.'
}

// --- Momentos especiales (solo recuerdo local de qué animación ya viste; el dato real está en Supabase) ---

export type FireMoment = 'ignite' | 'evolve' | 'kept' | null
type Seen = { stage: number; keptOn: string | null }

const key = (id: string) => `pg-fire-${id}`

function readSeen(id: string): Seen | null {
  try {
    const raw = localStorage.getItem(key(id))
    return raw ? (JSON.parse(raw) as Seen) : null
  } catch {
    return null
  }
}

function writeSeen(id: string, seen: Seen) {
  try {
    localStorage.setItem(key(id), JSON.stringify(seen))
  } catch {
    // modo privado o sin espacio: simplemente se repetirá la animación
  }
}

/** Qué animación toca enseñar ahora (y la marca como vista). */
export function takeMoment(streak: SharedStreak, today: string): FireMoment {
  const stage = streak.current > 0 ? stageFor(streak.current).index : 0
  const seen = readSeen(streak.id)
  let moment: FireMoment = null
  if (!seen) moment = 'ignite'
  else if (streak.current > 0 && stage > seen.stage) moment = 'evolve'
  else if (streak.todayCounted && seen.keptOn !== today) moment = 'kept'
  writeSeen(streak.id, {
    stage: streak.current > 0 ? stage : 0, // si se rompe, el fuego vuelve a la etapa inicial
    keptOn: streak.todayCounted ? today : (seen?.keptOn ?? null),
  })
  return moment
}

export function friendlyStreakError(message: string): string {
  if (message.includes('already_exists')) return 'Ya tenéis una racha compartida.'
  if (message.includes('not_friends')) return 'Solo puedes compartir racha con tus amigos.'
  if (message.includes('already_nudged')) return 'Hoy ya le has dado un toque.'
  if (message.includes('partner_done')) return '¡Ya ha cumplido! No hace falta avisar.'
  if (message.includes('streak_not_found')) return 'Esa racha ya no existe.'
  if (/shared_streak|schema cache/i.test(message)) return 'Falta ejecutar la migración 0013_shared_streaks.sql en Supabase.'
  return 'No se pudo completar. Inténtalo otra vez.'
}
