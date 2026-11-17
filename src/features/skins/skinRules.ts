// Skins del panda (gacha). TypeScript puro.
// Los tickets, la cápsula y las skins las decide el SERVIDOR (0022). Aquí solo se interpreta lo que devuelve.
// Las skins son un misterio: el cliente solo conoce las que ya tienes.

export type Skin = { id: string; name: string; file: string; width: number; height: number }

export type SkinState = {
  okDays: number
  earned: number
  spent: number
  available: number
  unlimited: boolean // modo prueba: tickets infinitos
  daysPerTicket: number
  equipped: string | null
  owned: Skin[]
}

export type CapsuleResult = { skin: Skin; isNew: boolean; available: number; unlimited: boolean }

function toSkin(row: Record<string, unknown>): Skin {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    file: String(row.file ?? ''),
    width: Math.max(1, Number(row.width ?? 1)),
    height: Math.max(1, Number(row.height ?? 1)),
  }
}

export function buildSkinState(raw: unknown): SkinState {
  const data = (raw ?? {}) as Record<string, unknown>
  const owned = Array.isArray(data.owned) ? (data.owned as Record<string, unknown>[]).filter((r) => r && r.id && r.file).map(toSkin) : []
  const equipped = typeof data.equipped === 'string' && owned.some((skin) => skin.id === data.equipped) ? data.equipped : null
  return {
    okDays: Number(data.ok_days ?? 0),
    earned: Number(data.earned ?? 0),
    spent: Number(data.spent ?? 0),
    available: Number(data.available ?? 0),
    unlimited: Boolean(data.unlimited),
    daysPerTicket: Math.max(1, Number(data.days_per_ticket ?? 7)),
    equipped,
    owned,
  }
}

export function buildCapsuleResult(raw: unknown): CapsuleResult {
  const data = (raw ?? {}) as Record<string, unknown>
  return {
    skin: toSkin(data),
    isNew: Boolean(data.is_new),
    available: Number(data.available ?? 0),
    unlimited: Boolean(data.unlimited),
  }
}

export function skinSrc(skin: Pick<Skin, 'file'>): string {
  return `/skins/${skin.file}`
}

export function equippedSkin(state: SkinState | undefined): Skin | null {
  if (!state || !state.equipped) return null
  return state.owned.find((skin) => skin.id === state.equipped) ?? null
}

/** Días cumplidos hacia el próximo ticket: { done: 3, per: 7, left: 4 }. */
export function cycle(state: SkinState): { done: number; per: number; left: number } {
  const done = state.okDays % state.daysPerTicket
  return { done, per: state.daysPerTicket, left: state.daysPerTicket - done }
}

export function ticketText(state: SkinState): string {
  if (state.unlimited) return 'Tickets infinitos (modo prueba)'
  if (state.available === 0) return 'Sin tickets por ahora'
  return state.available === 1 ? '1 ticket listo' : `${state.available} tickets listos`
}

/** ¿Hay un ticket nuevo que avisar en Inicio? (seen = tickets ganados que ya conocías) */
export function newTicketCount(state: SkinState | undefined, seen: number | null): number {
  if (!state || state.unlimited || state.available <= 0) return 0
  const base = seen ?? 0
  return Math.max(0, Math.min(state.available, state.earned - base))
}

export function friendlySkinError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('no_tickets')) return 'Aún no tienes tickets. Cumple 7 días y conseguirás uno.'
  if (text.includes('all_owned')) return '¡Ya tienes todas las skins! No se ha gastado tu ticket.'
  if (text.includes('not_owned')) return 'Esa skin todavía no es tuya.'
  if (text.includes('failed to fetch') || text.includes('network')) return 'No hay conexión. Inténtalo de nuevo.'
  return 'No se pudo completar. Inténtalo de nuevo.'
}
