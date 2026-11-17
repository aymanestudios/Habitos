// Recompensas cosméticas. Qué tienes desbloqueado lo calcula el SERVIDOR (get_my_rewards, 0016).
// Aquí solo se ordena y se prepara para enseñarlo. Son cosméticas: no dan XP ni ventajas.

export type RewardKind = 'badge' | 'frame' | 'accessory' | 'effect'
export type Rarity = 'common' | 'special' | 'epic' | 'legendary'

export type Reward = {
  id: string
  kind: RewardKind
  rarity: Rarity
  title: string
  description: string
  metric: string
  threshold: number
  value: number
  unlocked: boolean
  equipped: boolean
  showcased: boolean
  percent: number // 0-100 hacia el desbloqueo
}

export const RARITY: Record<Rarity, { label: string; text: string; ring: string; soft: string; order: number }> = {
  // Clases completas para Tailwind; los fondos son translúcidos para que valgan en claro y oscuro
  common: { label: 'Común', text: 'text-slate-500', ring: 'border-slate-400/50', soft: 'bg-slate-500/10', order: 0 },
  special: { label: 'Especial', text: 'text-sky-500', ring: 'border-sky-400/60', soft: 'bg-sky-500/10', order: 1 },
  epic: { label: 'Épico', text: 'text-violet-500', ring: 'border-violet-400/60', soft: 'bg-violet-500/10', order: 2 },
  legendary: { label: 'Legendario', text: 'text-amber-500', ring: 'border-amber-400/70', soft: 'bg-amber-500/15', order: 3 },
}

export const KIND_LABEL: Record<RewardKind, string> = {
  badge: 'Insignias',
  frame: 'Marcos',
  accessory: 'Accesorios',
  effect: 'Efectos',
}

export const KIND_SINGULAR: Record<RewardKind, string> = {
  badge: 'Insignia',
  frame: 'Marco',
  accessory: 'Accesorio',
  effect: 'Efecto',
}

const KINDS: RewardKind[] = ['badge', 'frame', 'accessory', 'effect']
const RARITIES: Rarity[] = ['common', 'special', 'epic', 'legendary']

export function buildRewards(raw: unknown): Reward[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((row) => row && KINDS.includes(row.kind) && RARITIES.includes(row.rarity))
    .map((row) => {
      const threshold = Math.max(1, Number(row.threshold ?? 1))
      const value = Math.max(0, Number(row.value ?? 0))
      return {
        id: String(row.id),
        kind: row.kind as RewardKind,
        rarity: row.rarity as Rarity,
        title: String(row.title),
        description: String(row.description),
        metric: String(row.metric),
        threshold,
        value,
        unlocked: Boolean(row.unlocked),
        equipped: Boolean(row.equipped),
        showcased: Boolean(row.showcased),
        percent: Math.min(100, Math.round((value / threshold) * 100)),
      }
    })
}

/** Las recompensas bloqueadas que tienes más cerca (para "Tu próxima recompensa"). */
export function nextRewards(rewards: Reward[], count = 3): Reward[] {
  return rewards
    .filter((reward) => !reward.unlocked && reward.value > 0)
    .sort((a, b) => b.percent - a.percent || RARITY[a.rarity].order - RARITY[b.rarity].order)
    .slice(0, count)
}

export function remainingText(reward: Reward): string {
  const left = reward.threshold - reward.value
  const unit: Record<string, [string, string]> = {
    best_streak: ['día de racha', 'días de racha'],
    shared_best: ['día de racha compartida', 'días de racha compartida'],
    level: ['nivel', 'niveles'],
    friends: ['amigo', 'amigos'],
    posts: ['foto', 'fotos'],
    challenges_won: ['reto', 'retos'],
  }
  const [one, many] = unit[reward.metric] ?? ['hábito', 'hábitos']
  return `Te ${left === 1 ? 'falta' : 'faltan'} ${left} ${left === 1 ? one : many}`
}

export function summary(rewards: Reward[]): { unlocked: number; total: number; byRarity: Record<Rarity, number> } {
  const byRarity = { common: 0, special: 0, epic: 0, legendary: 0 }
  for (const reward of rewards) if (reward.unlocked) byRarity[reward.rarity] += 1
  return { unlocked: rewards.filter((reward) => reward.unlocked).length, total: rewards.length, byRarity }
}

export type Equipment = { frame: string | null; accessory: string | null; effect: string | null; badges: string[] }

export function currentEquipment(rewards: Reward[]): Equipment {
  const pick = (kind: RewardKind) => rewards.find((reward) => reward.kind === kind && reward.equipped)?.id ?? null
  return {
    frame: pick('frame'),
    accessory: pick('accessory'),
    effect: pick('effect'),
    badges: rewards.filter((reward) => reward.kind === 'badge' && reward.showcased).map((reward) => reward.id),
  }
}

/** Equipar/quitar un objeto (o destacar/quitar una insignia, máx. 3). Devuelve el equipo nuevo. */
export function toggleEquip(equipment: Equipment, reward: Reward): Equipment {
  if (reward.kind === 'badge') {
    const has = equipment.badges.includes(reward.id)
    const badges = has ? equipment.badges.filter((id) => id !== reward.id) : [...equipment.badges, reward.id].slice(-3)
    return { ...equipment, badges }
  }
  const current = equipment[reward.kind]
  return { ...equipment, [reward.kind]: current === reward.id ? null : reward.id }
}

export function isWorn(equipment: Equipment, reward: Reward): boolean {
  return reward.kind === 'badge' ? equipment.badges.includes(reward.id) : equipment[reward.kind] === reward.id
}

export function friendlyRewardError(message: string): string {
  if (message.includes('reward_locked')) return 'Aún no tienes desbloqueado ese objeto.'
  if (message.includes('too_many_badges')) return 'Puedes destacar hasta 3 insignias.'
  if (/get_my_rewards|reward_catalog|schema cache/i.test(message)) return 'Esto no está disponible ahora mismo. Inténtalo más tarde.'
  return 'No se pudo guardar. Inténtalo otra vez.'
}

// --- "¡Nueva recompensa!": recuerdo local de cuáles ya celebraste (el dato real está en Supabase) ---
const SEEN_KEY = 'pg-rewards-seen'

export function takeNewUnlocks(rewards: Reward[]): Reward[] {
  const unlocked = rewards.filter((reward) => reward.unlocked)
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    localStorage.setItem(SEEN_KEY, JSON.stringify(unlocked.map((reward) => reward.id)))
    if (raw === null) return [] // primera vez en este dispositivo: no celebramos lo antiguo
    const seen = new Set(JSON.parse(raw) as string[])
    return unlocked.filter((reward) => !seen.has(reward.id))
  } catch {
    return []
  }
}
