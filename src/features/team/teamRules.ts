// Retos en equipo: dos amigos SUMAN sus aportaciones hasta una meta común (0026_team_challenges.sql).
// Todo lo importante (totales, cierre, XP) lo decide el SERVIDOR; aquí solo se prepara para enseñarlo.
// Los límites de abajo son los mismos que team_rule() en el servidor (que es quien manda).

export type TeamKind = 'distance' | 'pages' | 'minutes' | 'sessions' | 'team_habits' | 'custom'
export type TeamStatus = 'pending' | 'active' | 'completed' | 'declined' | 'cancelled' | 'expired'

export type TeamKindInfo = {
  kind: TeamKind
  label: string // "Caminar o correr"
  unit: string // "km" (custom: lo eligen ellos)
  verb: string // "Correr" → título por defecto
  minGoal: number
  maxGoal: number
  maxEntry: number // máximo por aportación (0 = automático)
  whole: boolean // solo números enteros
  goals: number[] // metas sugeridas
  quick: number[] // botones rápidos al aportar
  hint: string
}

export const TEAM_KINDS: TeamKindInfo[] = [
  { kind: 'distance', label: 'Caminar o correr', unit: 'km', verb: 'Kilómetros', minGoal: 2, maxGoal: 500, maxEntry: 60, whole: false, goals: [10, 20, 42], quick: [1, 3, 5, 10], hint: 'Sumad kilómetros andando o corriendo.' },
  { kind: 'pages', label: 'Lectura', unit: 'páginas', verb: 'Lectura', minGoal: 10, maxGoal: 5000, maxEntry: 300, whole: true, goals: [50, 100, 300], quick: [5, 10, 20, 50], hint: 'Cada página que leáis suma.' },
  { kind: 'minutes', label: 'Estudio', unit: 'min', verb: 'Estudio', minGoal: 15, maxGoal: 10000, maxEntry: 300, whole: true, goals: [120, 300, 600], quick: [15, 30, 45, 60], hint: 'Minutos de estudio entre los dos.' },
  { kind: 'sessions', label: 'Ejercicio', unit: 'sesiones', verb: 'Entrenos', minGoal: 2, maxGoal: 60, maxEntry: 3, whole: true, goals: [4, 6, 10], quick: [1, 2], hint: 'Cada entrenamiento cuenta como una sesión.' },
  { kind: 'team_habits', label: 'Hábitos', unit: 'hábitos', verb: 'Hábitos', minGoal: 4, maxGoal: 200, maxEntry: 0, whole: true, goals: [10, 20, 40], quick: [], hint: 'Cuenta solo: cada hábito que completéis suma.' },
  { kind: 'custom', label: 'Personalizado', unit: '', verb: '', minGoal: 1, maxGoal: 100000, maxEntry: 1000, whole: false, goals: [50, 100, 200], quick: [1, 5, 10, 20], hint: 'Elegid qué medís (flexiones, vasos de agua...).' },
]

export function kindInfo(kind: string): TeamKindInfo {
  return TEAM_KINDS.find((info) => info.kind === kind) ?? TEAM_KINDS[TEAM_KINDS.length - 1]
}

export const DURATIONS = [
  { days: 1, label: 'Hoy' },
  { days: 3, label: '3 días' },
  { days: 7, label: '1 semana' },
  { days: 14, label: '2 semanas' },
]

/** XP al cumplirlo (igual que team_xp_for en el servidor). */
export function teamXp(days: number): number {
  return days <= 1 ? 20 : days <= 4 ? 35 : 50
}

export const MIN_SHARE = 20 // % mínimo que aporta cada uno (decisión del 19/11/2026)

export type TeamPerson = { id: string; name: string; avatarPath: string | null; avatarColor: string | null }
export type Contribution = { id: string; mine: boolean; amount: number; at: string; date: string }

export type TeamChallenge = {
  id: string
  kind: TeamKind
  title: string | null
  unit: string
  goal: number
  minShare: number
  mode: 'shared' | 'min_each'
  status: TeamStatus
  startDate: string
  endDate: string
  days: number
  today: string
  createdByMe: boolean
  completedAt: string | null
  partner: TeamPerson
  mine: number
  theirs: number
  xp: number | null // XP que te dio (null = aún no)
  xpReward: number
  stillFriends: boolean
  recent: Contribution[]
}

const KINDS: TeamKind[] = ['distance', 'pages', 'minutes', 'sessions', 'team_habits', 'custom']
const STATUSES: TeamStatus[] = ['pending', 'active', 'completed', 'declined', 'cancelled', 'expired']
const num = (value: unknown, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function buildTeam(raw: unknown): TeamChallenge[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((row) => row && row.id && KINDS.includes(row.kind) && STATUSES.includes(row.status))
    .map((row) => {
      const partner = row.partner ?? {}
      return {
        id: String(row.id),
        kind: row.kind as TeamKind,
        title: row.title ? String(row.title) : null,
        unit: String(row.unit ?? ''),
        goal: num(row.goal, 1),
        minShare: num(row.min_share, MIN_SHARE),
        mode: row.mode === 'min_each' ? 'min_each' : 'shared',
        status: row.status as TeamStatus,
        startDate: String(row.start_date),
        endDate: String(row.end_date),
        days: Math.max(1, num(row.days, 1)),
        today: String(row.today ?? row.start_date),
        createdByMe: Boolean(row.created_by_me),
        completedAt: row.completed_at ? String(row.completed_at) : null,
        partner: {
          id: String(partner.id ?? ''),
          name: String(partner.name ?? 'Tu amigo'),
          avatarPath: partner.avatar_path ?? null,
          avatarColor: partner.avatar_color ?? null,
        },
        mine: num(row.mine),
        theirs: num(row.theirs),
        xp: row.xp === null || row.xp === undefined ? null : num(row.xp),
        xpReward: num(row.xp_reward, teamXp(num(row.days, 1))),
        stillFriends: row.still_friends !== false,
        recent: (Array.isArray(row.recent) ? row.recent : []).map((k: Record<string, unknown>) => ({
          id: String(k.id),
          mine: Boolean(k.mine),
          amount: num(k.amount),
          at: String(k.at),
          date: String(k.date),
        })),
      }
    })
}

const NUMBER = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })

/** "6,5 km", "1 página"... */
export function formatAmount(value: number, unit: string): string {
  const n = NUMBER.format(value)
  if (value === 1 && unit === 'páginas') return '1 página'
  if (value === 1 && unit === 'sesiones') return '1 sesión'
  if (value === 1 && unit === 'hábitos') return '1 hábito'
  return `${n} ${unit}`
}

/** Título del reto: el personalizado o el del tipo ("Lectura"). */
export function teamTitle(c: Pick<TeamChallenge, 'kind' | 'title'>): string {
  return c.title ?? kindInfo(c.kind).verb
}

/** Lo mínimo que debe aportar cada uno (en unidades). */
export function minEach(c: Pick<TeamChallenge, 'goal' | 'minShare' | 'mode'>): number {
  const raw = c.mode === 'min_each' ? c.goal / 2 : (c.goal * c.minShare) / 100
  return Math.round(raw * 10) / 10
}

export function totalPercent(c: Pick<TeamChallenge, 'goal' | 'mine' | 'theirs'>): number {
  if (!(c.goal > 0)) return 0
  return Math.min(100, Math.round(((c.mine + c.theirs) / c.goal) * 100))
}

/** Días que quedan (incluido hoy). 1 = último día. */
export function teamDaysLeft(c: Pick<TeamChallenge, 'endDate' | 'today'>): number {
  const end = Date.parse(`${c.endDate}T12:00:00Z`)
  const today = Date.parse(`${c.today}T12:00:00Z`)
  if (!Number.isFinite(end) || !Number.isFinite(today)) return 0
  return Math.max(0, Math.round((end - today) / 86_400_000) + 1)
}

export function timeLeftText(c: Pick<TeamChallenge, 'endDate' | 'today'>): string {
  const left = teamDaysLeft(c)
  if (left <= 0) return 'Terminado'
  if (left === 1) return 'Último día'
  return `Quedan ${left} días`
}

/** Frase de estado: qué falta para cumplirlo (siempre en positivo). */
export function progressText(c: TeamChallenge): string {
  if (c.status === 'completed') return '¡Reto cumplido!'
  if (c.status === 'expired') return 'Se acabó el tiempo. ¡La próxima vez!'
  if (c.status === 'cancelled') return 'Reto cancelado.'
  if (c.status === 'declined') return `${firstName(c.partner.name)} no se apuntó esta vez.`
  if (c.status === 'pending') {
    return c.createdByMe ? `Esperando a que ${firstName(c.partner.name)} acepte.` : `${firstName(c.partner.name)} te invita a este reto.`
  }
  const missingTotal = Math.max(0, c.goal - c.mine - c.theirs)
  const need = minEach(c)
  if (missingTotal > 0) return `Os faltan ${formatAmount(round1(missingTotal), c.unit)}.`
  if (c.mine < need) return `Ya llegáis a la meta: te faltan ${formatAmount(round1(need - c.mine), c.unit)} para tu parte.`
  if (c.theirs < need) return `Ya llegáis a la meta: a ${firstName(c.partner.name)} le faltan ${formatAmount(round1(need - c.theirs), c.unit)}.`
  return '¡Casi está!'
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** Valida una meta antes de enviarla (el servidor vuelve a comprobarlo). Devuelve el error o null. */
export function goalError(kind: TeamKind, goal: number): string | null {
  const info = kindInfo(kind)
  if (!Number.isFinite(goal) || goal <= 0) return 'Escribe una meta.'
  if (info.whole && !Number.isInteger(goal)) return 'La meta tiene que ser un número entero.'
  if (goal < info.minGoal) return `La meta mínima es ${formatAmount(info.minGoal, info.unit || 'unidades')}.`
  if (goal > info.maxGoal) return `La meta máxima es ${formatAmount(info.maxGoal, info.unit || 'unidades')}.`
  return null
}

/** Valida una aportación. `mine` = lo que ya llevas (nadie aporta más que la meta entera). */
export function amountError(c: Pick<TeamChallenge, 'kind' | 'goal' | 'mine' | 'unit'>, amount: number): string | null {
  const info = kindInfo(c.kind)
  if (!Number.isFinite(amount) || amount <= 0) return 'Escribe cuánto has hecho.'
  if (info.whole && !Number.isInteger(amount)) return 'Tiene que ser un número entero.'
  if (amount > info.maxEntry) return `Como mucho ${formatAmount(info.maxEntry, c.unit)} de una vez.`
  if (c.mine + amount > c.goal) return 'Eso supera la meta entera del reto.'
  return null
}

/** Convierte lo que escribe el usuario ("6,5") en número. */
export function parseAmount(text: string): number {
  const clean = text.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(clean)) return Number.NaN
  return Number(clean)
}

/** Días hasta una fecha límite (incluida). null si no vale (pasada o a más de 14 días). */
export function daysUntil(today: string, deadline: string): number | null {
  const a = Date.parse(`${today}T12:00:00Z`)
  const b = Date.parse(`${deadline}T12:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  const days = Math.round((b - a) / 86_400_000) + 1
  return days >= 1 && days <= 14 ? days : null
}

export function friendlyTeamError(message: string): string {
  if (message.includes('already_exists')) return 'Ya tenéis un reto en marcha o pendiente. Terminadlo antes de empezar otro.'
  if (message.includes('too_many')) return 'Puedes tener como mucho 3 retos a la vez.'
  if (message.includes('not_friends')) return 'Solo puedes hacer retos con tus amigos.'
  if (message.includes('invalid_goal')) return 'Esa meta no es válida para este tipo de reto.'
  if (message.includes('invalid_days')) return 'La duración tiene que ser de 1 a 14 días.'
  if (message.includes('custom_needs_title')) return 'Ponle nombre y unidad a tu reto.'
  if (message.includes('text_too_long')) return 'El nombre o la unidad son demasiado largos.'
  if (message.includes('invalid_amount')) return 'Esa cantidad no es válida.'
  if (message.includes('day_limit')) return 'Hoy ya has sumado mucho a este reto. ¡Mañana más!'
  if (message.includes('over_goal')) return 'Eso supera la meta entera del reto.'
  if (message.includes('challenge_closed') || message.includes('challenge_not_pending')) return 'Este reto ya no está en marcha.'
  if (message.includes('too_late')) return 'Ya no se puede deshacer (pasaron más de 15 minutos).'
  if (message.includes('challenge_not_found') || message.includes('contribution_not_found')) return 'Ese reto ya no existe.'
  if (/schema cache|create_team_challenge|get_my_team_challenges/i.test(message)) return 'Los retos en equipo aún no están activados. Inténtalo más tarde.'
  return 'No se pudo completar. Revisa la conexión e inténtalo otra vez.'
}

/** Aportaciones nuevas de tu compañero desde la última vez que miraste (para "¡Beto ha sumado 3 km!"). */
export function partnerNews(list: TeamChallenge[], seen: Record<string, string>): { id: string; text: string; lastAt: string }[] {
  const out: { id: string; text: string; lastAt: string }[] = []
  for (const c of list) {
    if (c.status !== 'active' && c.status !== 'completed') continue
    const theirs = c.recent.filter((k) => !k.mine)
    if (theirs.length === 0) continue
    const lastAt = theirs[0].at
    const since = seen[c.id]
    if (!since) continue // primera vez que vemos este reto en este móvil: no avisamos de lo antiguo
    const fresh = theirs.filter((k) => k.at > since)
    if (fresh.length === 0) continue
    const sum = round1(fresh.reduce((total, k) => total + k.amount, 0))
    out.push({ id: c.id, text: `¡${firstName(c.partner.name)} ha sumado ${formatAmount(sum, c.unit)}!`, lastAt })
  }
  return out
}

/** Nivel de "dúo" con un amigo según los retos cumplidos juntos. */
export function duoTier(completed: number): { name: string; next: number | null; step: number } | null {
  const tiers = [
    { at: 1, name: 'Primer reto juntos' },
    { at: 5, name: 'Buen equipo' },
    { at: 10, name: 'Gran dúo' },
    { at: 25, name: 'Dúo de leyenda' },
    { at: 50, name: 'Inseparables' },
  ]
  let index = -1
  tiers.forEach((tier, i) => {
    if (completed >= tier.at) index = i
  })
  if (index < 0) return null
  return { name: tiers[index].name, next: tiers[index + 1]?.at ?? null, step: index + 1 }
}
