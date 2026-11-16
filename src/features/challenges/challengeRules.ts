// Reglas puras de los retos cooperativos (get_my_challenges, 0008_challenges.sql).
// Un reto: tú y un amigo sumáis XP juntos esta semana hasta llegar a la meta.

export const TARGET_OPTIONS = [150, 300, 500, 800] as const

export type Challenge = {
  id: string
  weekStart: string
  target: number
  isCurrent: boolean
  createdByMe: boolean
  partnerId: string
  partnerName: string
  myXp: number
  partnerXp: number
  total: number
  percent: number // 0-100
  done: boolean
}

export function buildChallenges(raw: unknown): Challenge[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((row) => row && row.id)
    .map((row) => {
      const target = Math.max(1, Number(row.target_xp ?? 1))
      const myXp = Number(row.my_xp ?? 0)
      const partnerXp = Number(row.partner_xp ?? 0)
      const total = myXp + partnerXp
      return {
        id: String(row.id),
        weekStart: String(row.week_start),
        target,
        isCurrent: Boolean(row.is_current),
        createdByMe: Boolean(row.created_by_me),
        partnerId: String(row.partner_id),
        partnerName: String(row.partner_name ?? ''),
        myXp,
        partnerXp,
        total,
        percent: Math.min(100, Math.round((total / target) * 100)),
        done: total >= target,
      }
    })
}

/** Parte de la barra que pones tú y la que pone tu amigo (en % de la meta, sin pasar de 100 entre los dos). */
export function shares(challenge: Challenge): { mine: number; partner: number } {
  const mine = Math.min(100, (challenge.myXp / challenge.target) * 100)
  const partner = Math.min(100 - mine, (challenge.partnerXp / challenge.target) * 100)
  return { mine: Math.round(mine), partner: Math.round(partner) }
}

export function challengeMessage(challenge: Challenge): string {
  const left = challenge.target - challenge.total
  if (challenge.done) return challenge.isCurrent ? '¡Reto cumplido! Lo habéis conseguido juntos.' : 'Cumplido la semana pasada.'
  if (!challenge.isCurrent) return `No llegasteis la semana pasada (faltaron ${left} XP).`
  if (challenge.total === 0) return `Aún no habéis empezado. ¡Marca un hábito!`
  return `Os faltan ${left} XP entre los dos.`
}

/** Amigos con los que aún no tienes reto esta semana. */
export function availablePartners<T extends { user_id: string }>(friends: T[], challenges: Challenge[]): T[] {
  const busy = new Set(challenges.filter((c) => c.isCurrent).map((c) => c.partnerId))
  return friends.filter((friend) => !busy.has(friend.user_id))
}

export function friendlyChallengeError(message: string): string {
  if (message.includes('already_exists')) return 'Ya tenéis un reto esta semana.'
  if (message.includes('not_friends')) return 'Solo puedes crear retos con tus amigos.'
  if (message.includes('invalid_target')) return 'La meta debe estar entre 50 y 2000 XP.'
  if (message.includes('challenge_not_found')) return 'Ese reto ya no existe.'
  return 'No se pudo completar. Revisa la conexión e inténtalo otra vez.'
}
