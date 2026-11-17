// Retos relámpago entre dos amigos (get_my_challenges, 0018). El progreso lo CALCULA el servidor.
// Cada uno participa con sus propios hábitos: nadie tiene que hacer deporte si no quiere.

export type ChallengeKind = 'xp' | 'habits' | 'category' | 'days'

export type Challenge = {
  id: string
  kind: ChallengeKind
  category: string | null
  target: number
  startDate: string
  endDate: string
  isCurrent: boolean
  createdByMe: boolean
  partnerId: string
  partnerName: string
  partnerAvatarPath: string | null
  partnerAvatarColor: string | null
  myValue: number
  partnerValue: number
  done: boolean
}

export type Preset = {
  id: string
  kind: ChallengeKind
  target: number
  days: 3 | 7
  category: string | null
  title: string
  text: string
}

// Retos listos para elegir: cortos, claros y sin presión
export const PRESETS: Preset[] = [
  { id: 'days3', kind: 'days', target: 3, days: 3, category: null, title: '3 días de constancia', text: 'Cada uno cumple su día los 3 días' },
  { id: 'days5', kind: 'days', target: 5, days: 7, category: null, title: 'Semana constante', text: 'Cada uno cumple 5 de los 7 días' },
  { id: 'habits10', kind: 'habits', target: 10, days: 7, category: null, title: '10 hábitos juntos', text: 'Completad 10 hábitos entre los dos' },
  { id: 'sport4', kind: 'category', target: 4, days: 7, category: 'sport', title: '4 entrenamientos', text: 'Hábitos de Deporte entre los dos' },
  { id: 'study5', kind: 'category', target: 5, days: 7, category: 'study', title: '5 sesiones de estudio', text: 'Hábitos de Estudio entre los dos' },
  { id: 'health5', kind: 'category', target: 5, days: 7, category: 'health', title: 'Semana sana', text: '5 hábitos de Salud entre los dos' },
  { id: 'mind5', kind: 'category', target: 5, days: 7, category: 'mind', title: 'Mente en calma', text: '5 hábitos de Mente entre los dos' },
  { id: 'xp300', kind: 'xp', target: 300, days: 7, category: null, title: '300 XP juntos', text: 'Sumad 300 XP entre los dos' },
]

/** Solo retos que encajan con TUS hábitos (los de categoría, si tienes alguno de esa categoría). */
export function availablePresets(myCategories: string[]): Preset[] {
  const mine = new Set(myCategories)
  return PRESETS.filter((preset) => preset.category === null || mine.has(preset.category))
}

const KINDS: ChallengeKind[] = ['xp', 'habits', 'category', 'days']

export function buildChallenges(raw: unknown): Challenge[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((row) => row && row.id && KINDS.includes(row.kind))
    .map((row) => ({
      id: String(row.id),
      kind: row.kind as ChallengeKind,
      category: row.category ?? null,
      target: Math.max(1, Number(row.target ?? 1)),
      startDate: String(row.start_date),
      endDate: String(row.end_date),
      isCurrent: Boolean(row.is_current),
      createdByMe: Boolean(row.created_by_me),
      partnerId: String(row.partner_id),
      partnerName: String(row.partner_name ?? ''),
      partnerAvatarPath: row.partner_avatar_path ?? null,
      partnerAvatarColor: row.partner_avatar_color ?? null,
      myValue: Number(row.my_value ?? 0),
      partnerValue: Number(row.partner_value ?? 0),
      done: Boolean(row.done),
    }))
}

const CATEGORY_NAME: Record<string, string> = {
  health: 'Salud', sport: 'Deporte', study: 'Estudio', mind: 'Mente', work: 'Trabajo', home: 'Casa', social: 'Social', other: 'Otro',
}

export function challengeTitle(c: Challenge): string {
  if (c.kind === 'days') return `${c.target} ${c.target === 1 ? 'día' : 'días'} de constancia`
  if (c.kind === 'xp') return `${c.target} XP juntos`
  if (c.kind === 'category') return `${c.target} de ${CATEGORY_NAME[c.category ?? 'other'] ?? 'Otro'}`
  return `${c.target} hábitos juntos`
}

/** "Días" = cada uno su barra. El resto = una barra compartida. */
export function isPersonal(c: Challenge): boolean {
  return c.kind === 'days'
}

export function percent(value: number, target: number): number {
  return Math.min(100, Math.round((value / Math.max(1, target)) * 100))
}

/** Barra compartida: parte tuya y parte de tu amigo (sin pasar de 100 entre los dos). */
export function sharedBar(c: Challenge): { mine: number; partner: number } {
  const mine = Math.min(100, (c.myValue / c.target) * 100)
  const partner = Math.min(100 - mine, (c.partnerValue / c.target) * 100)
  return { mine: Math.round(mine), partner: Math.round(partner) }
}

export function daysLeft(c: Challenge, today: string): number {
  const ms = Date.parse(`${c.endDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)
  return Math.max(0, Math.round(ms / 86400000) + 1)
}

export function statusText(c: Challenge, today: string): string {
  if (c.done) return '¡Reto cumplido! Lo habéis conseguido juntos.'
  if (!c.isCurrent) return 'Esta vez no llegasteis. ¡Otro intento cuando queráis!'
  const left = daysLeft(c, today)
  const when = left <= 1 ? 'Último día' : `Quedan ${left} días`
  if (isPersonal(c)) {
    const me = c.myValue >= c.target
    const them = c.partnerValue >= c.target
    if (me && !them) return `${when}. Tú ya lo tienes: ánimo a ${c.partnerName}.`
    if (!me && them) return `${when}. ${c.partnerName} ya lo tiene. ¡Te toca!`
    return `${when}.`
  }
  const missing = c.target - c.myValue - c.partnerValue
  return `${when}. Os ${missing === 1 ? 'falta' : 'faltan'} ${missing}${c.kind === 'xp' ? ' XP' : ''}.`
}

export function friendlyChallengeError(message: string): string {
  if (message.includes('already_exists')) return 'Ya tenéis un reto activo. Terminadlo (o cancelad) antes de empezar otro.'
  if (message.includes('not_friends')) return 'Solo puedes crear retos con tus amigos.'
  if (message.includes('invalid_target') || message.includes('invalid_days')) return 'Ese reto no es válido.'
  if (message.includes('challenge_not_found')) return 'Ese reto ya no existe.'
  if (/create_flash_challenge|schema cache/i.test(message)) return 'Falta ejecutar la migración 0018_flash_challenges.sql en Supabase.'
  return 'No se pudo completar. Revisa la conexión e inténtalo otra vez.'
}

/** Amigos sin reto activo contigo (solo puede haber uno activo por pareja). */
export function availablePartners<T extends { user_id: string }>(friends: T[], list: Challenge[]): T[] {
  const busy = new Set(list.filter((c) => c.isCurrent).map((c) => c.partnerId))
  return friends.filter((friend) => !busy.has(friend.user_id))
}

/** Fecha local de hoy en formato YYYY-MM-DD (solo para mostrar los días que quedan). */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Retos cumplidos que aún no has celebrado (seen = ids ya celebrados). */
export function freshDone(list: Challenge[], seen: string[]): Challenge[] {
  const known = new Set(seen)
  return list.filter((c) => c.done && !known.has(c.id))
}

/** Progreso total de un reto en % (en los de días, el del que va más atrasado: es lo que falta). */
export function overallPercent(c: Challenge): number {
  if (c.kind === 'days') return Math.min(percent(c.myValue, c.target), percent(c.partnerValue, c.target))
  return percent(c.myValue + c.partnerValue, c.target)
}

/** Línea corta para Inicio: "Tú 2/3 · Cris 1/3" o "7/10 entre los dos". */
export function shortProgress(c: Challenge): string {
  const unit = c.kind === 'xp' ? ' XP' : ''
  if (c.kind === 'days') {
    return `Tú ${Math.min(c.myValue, c.target)}/${c.target} · ${c.partnerName} ${Math.min(c.partnerValue, c.target)}/${c.target}`
  }
  return `${Math.min(c.myValue + c.partnerValue, c.target)}/${c.target}${unit} entre los dos`
}
