// Celebraciones: QUÉ se celebra y en qué orden. Sin React: se puede probar suelto.
//
// Tres intensidades (las grandes son especiales precisamente porque casi nunca salen):
//   small  → "+15 XP" que vuela hacia la barra de nivel (no hace cola: es instantáneo)
//   medium → día completo, logro normal, reto en equipo cumplido (tarjeta que se cierra sola o al tocar)
//   big    → subir de nivel, logro épico o legendario (pantalla completa, se puede saltar)
//
// Todo lo que se celebra viene del SERVIDOR (nivel, XP, logros, retos). Aquí no se calcula nada de eso.

import type { Rarity, RewardKind } from '@/features/rewards/rewardRules'

export type Intensity = 'small' | 'medium' | 'big'

export type RewardLite = {
  id: string
  kind: RewardKind
  rarity: Rarity
  title: string
  description: string
  metric: string
}

export type TeamMember = { name: string; avatarPath: string | null; avatarColor: string | null; value: number }

export type Celebration =
  | { kind: 'level'; from: number; to: number }
  | { kind: 'rewards'; rewards: RewardLite[] }
  | { kind: 'day'; done: number; total: number }
  | { kind: 'team'; id: string; title: string; target: number; unit: string; me: TeamMember; partner: TeamMember; xp: number }

// Orden de la cola: primero lo más importante
const PRIORITY: Record<Celebration['kind'], number> = { level: 0, team: 1, rewards: 2, day: 3 }

export const MAX_QUEUE = 5

export function intensityOf(item: Celebration): Intensity {
  if (item.kind === 'level') return 'big'
  if (item.kind === 'rewards') {
    return item.rewards.some((reward) => reward.rarity === 'epic' || reward.rarity === 'legendary') ? 'big' : 'medium'
  }
  return 'medium'
}

/**
 * Añade una celebración a la cola sin amontonar ventanas:
 * - Varias subidas de nivel seguidas = una sola (del primer nivel al último).
 * - Varios logros = una sola tarjeta con todos (sin repetidos).
 * - Un mismo reto o un "día completo" no se repite.
 * - Ordenada por importancia y con un máximo (lo que sobra se descarta: nunca son datos, solo avisos).
 */
export function enqueue(queue: Celebration[], item: Celebration): Celebration[] {
  const next = [...queue]
  if (item.kind === 'level') {
    if (item.to <= item.from) return queue
    const index = next.findIndex((entry) => entry.kind === 'level')
    if (index >= 0) {
      const current = next[index] as Extract<Celebration, { kind: 'level' }>
      next[index] = { kind: 'level', from: Math.min(current.from, item.from), to: Math.max(current.to, item.to) }
      return next
    }
  } else if (item.kind === 'rewards') {
    if (item.rewards.length === 0) return queue
    const index = next.findIndex((entry) => entry.kind === 'rewards')
    if (index >= 0) {
      const current = next[index] as Extract<Celebration, { kind: 'rewards' }>
      const seen = new Set(current.rewards.map((reward) => reward.id))
      next[index] = { kind: 'rewards', rewards: [...current.rewards, ...item.rewards.filter((reward) => !seen.has(reward.id))] }
      return next
    }
  } else if (item.kind === 'team') {
    if (next.some((entry) => entry.kind === 'team' && entry.id === item.id)) return queue
  } else if (item.kind === 'day') {
    if (next.some((entry) => entry.kind === 'day')) return queue
  }
  next.push(item)
  next.sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind])
  return next.slice(0, MAX_QUEUE)
}

/** Logros ordenados para enseñarlos: el más raro primero. */
export function sortRewards(rewards: RewardLite[]): RewardLite[] {
  const order: Record<Rarity, number> = { legendary: 0, epic: 1, special: 2, common: 3 }
  return [...rewards].sort((a, b) => order[a.rarity] - order[b.rarity])
}

// Mensajes de subida de nivel: siempre en positivo, distintos según el nivel (sin azar: no "bailan" al repintar)
const LEVEL_MESSAGES = [
  '¡Cada día estás más cerca de tus objetivos!',
  'Lo que haces cada día se nota.',
  'Paso a paso, has llegado hasta aquí.',
  'Tu constancia está dando frutos.',
  'Sigue así: lo mejor está por llegar.',
  'Pequeños hábitos, grandes cambios.',
]

export function levelMessage(level: number): string {
  return LEVEL_MESSAGES[Math.abs(level) % LEVEL_MESSAGES.length]
}

/** Números por los que pasa el contador al subir varios niveles (máx. 6 pasos, el último siempre es el real). */
export function levelSteps(from: number, to: number): number[] {
  if (to <= from) return [to]
  const count = to - from
  if (count <= 5) return Array.from({ length: count + 1 }, (_, i) => from + i)
  const steps = [from]
  for (let i = 1; i < 5; i++) steps.push(from + Math.round((count * i) / 5))
  steps.push(to)
  return steps
}

/**
 * ¿Hay que celebrar una subida de nivel? `seen` es el último nivel ya celebrado en este dispositivo.
 * La primera vez (seen = null) no se celebra nada: solo se apunta (así no salta al instalar la app).
 * Si el nivel baja (p. ej. un hábito borrado quita XP), se apunta el nuevo sin celebrar.
 */
export function levelChange(seen: number | null, level: number): { celebrate: { from: number; to: number } | null; store: number } {
  if (!Number.isFinite(level) || level < 1) return { celebrate: null, store: seen ?? 1 }
  if (seen === null || level <= seen) return { celebrate: null, store: level }
  return { celebrate: { from: seen, to: level }, store: level }
}

/** Reparto de una barra conjunta en porcentajes (para los retos en equipo). Nunca pasa del 100 %. */
export function splitBar(mine: number, theirs: number, target: number): { mine: number; theirs: number } {
  if (!(target > 0)) return { mine: 0, theirs: 0 }
  const a = Math.max(0, mine)
  const b = Math.max(0, theirs)
  const total = Math.min(100, ((a + b) / target) * 100)
  if (a + b === 0) return { mine: 0, theirs: 0 }
  const mineShare = (a / (a + b)) * total
  return { mine: Math.round(mineShare * 10) / 10, theirs: Math.round((total - mineShare) * 10) / 10 }
}
