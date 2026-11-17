// Reglas puras de Amigos (sin React ni Supabase).
// Los datos vienen de la función del servidor get_friends_overview (0006_friends.sql).

export type FriendKind = 'me' | 'friend' | 'incoming' | 'outgoing'

export type FriendRow = {
  kind: FriendKind
  friendship_id: string | null
  user_id: string
  display_name: string
  username: string
  level: number | null // solo de ti y de amigos aceptados
  week_xp: number | null
  current_streak: number | null
  friend_code: string | null // solo el tuyo
  avatar_emoji: string | null
  avatar_color: string | null
  avatar_path: string | null
}

export type RankedFriend = FriendRow & { position: number }

export type FriendsOverview = {
  myCode: string
  ranking: RankedFriend[] // tú + amigos, de más a menos XP esta semana
  incoming: FriendRow[]
  outgoing: FriendRow[]
  friendCount: number
}

const KINDS: FriendKind[] = ['me', 'friend', 'incoming', 'outgoing']
const numOrNull = (value: unknown) => (value === null || value === undefined ? null : Number(value))

export function buildOverview(raw: unknown): FriendsOverview {
  const rows: FriendRow[] = (Array.isArray(raw) ? raw : [])
    .filter((row) => row && KINDS.includes(row.kind))
    .map((row) => ({
      kind: row.kind as FriendKind,
      friendship_id: row.friendship_id ?? null,
      user_id: String(row.user_id),
      display_name: String(row.display_name ?? ''),
      username: String(row.username ?? ''),
      level: numOrNull(row.level),
      week_xp: numOrNull(row.week_xp),
      current_streak: numOrNull(row.current_streak),
      friend_code: row.friend_code ?? null,
      avatar_emoji: row.avatar_emoji ?? null,
      avatar_color: row.avatar_color ?? null,
      avatar_path: row.avatar_path ?? null,
    }))

  const sorted = rows
    .filter((row) => row.kind === 'me' || row.kind === 'friend')
    .sort(
      (a, b) =>
        (b.week_xp ?? 0) - (a.week_xp ?? 0) ||
        (b.current_streak ?? 0) - (a.current_streak ?? 0) ||
        a.display_name.localeCompare(b.display_name),
    )
  // Con los mismos XP se comparte puesto (1, 1, 3...)
  const ranking: RankedFriend[] = []
  sorted.forEach((row, index) => {
    const previous = ranking[index - 1]
    const tied = previous && (previous.week_xp ?? 0) === (row.week_xp ?? 0)
    ranking.push({ ...row, position: tied ? previous.position : index + 1 })
  })

  const byName = (a: FriendRow, b: FriendRow) => a.display_name.localeCompare(b.display_name)
  return {
    myCode: rows.find((row) => row.kind === 'me')?.friend_code ?? '',
    ranking,
    incoming: rows.filter((row) => row.kind === 'incoming').sort(byName),
    outgoing: rows.filter((row) => row.kind === 'outgoing').sort(byName),
    friendCount: rows.filter((row) => row.kind === 'friend').length,
  }
}

/** Limpia lo que escribe el usuario: mayúsculas, sin espacios ni guiones, máximo 8. */
export function cleanCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

/** "ABCD-EFGH": más fácil de leer y dictar. */
export function prettyCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

export function isCompleteCode(input: string): boolean {
  return cleanCode(input).length === 8
}

export function friendlyFriendError(message: string): string {
  if (message.includes('invalid_code')) return 'El código tiene 8 letras y números. Revísalo.'
  if (message.includes('code_not_found')) return 'No hay nadie con ese código. Revísalo con tu amigo.'
  if (message.includes('own_code')) return 'Ese es tu propio código. Pide el suyo a tu amigo.'
  if (message.includes('already_friends')) return 'Ya sois amigos.'
  if (message.includes('already_sent')) return 'Ya le enviaste una solicitud. Falta que la acepte.'
  if (message.includes('too_many_pending')) return 'Tienes demasiadas solicitudes sin responder. Cancela alguna.'
  if (message.includes('request_not_found')) return 'Esa solicitud ya no existe.'
  return 'No se pudo completar. Revisa la conexión e inténtalo otra vez.'
}

export function sentMessage(name: string, status: string): string {
  return status === 'accepted' ? `¡${name} y tú ya sois amigos!` : `Solicitud enviada a ${name}.`
}

/** Frase bajo el ranking. */
export function rankingMessage(overview: FriendsOverview): string {
  const me = overview.ranking.find((row) => row.kind === 'me')
  if (!me || overview.friendCount === 0) return ''
  if ((me.week_xp ?? 0) === 0) return 'Aún no has sumado XP esta semana. ¡Marca un hábito!'
  if (me.position === 1) return 'Vas en cabeza esta semana. ¡A mantenerlo!'
  const ahead = overview.ranking.filter((row) => row.position < me.position).pop()
  if (!ahead) return ''
  const gap = (ahead.week_xp ?? 0) - (me.week_xp ?? 0)
  return `Te faltan ${gap} XP para alcanzar a ${ahead.display_name}.`
}

// ---------------------------------------------------------------------------
// Actividad reciente de amigos (get_friend_activity, 0007_activity_categories.sql)
// ---------------------------------------------------------------------------

export const REACTIONS = ['🔥', '👏', '💪', '🎉'] as const
export type Reaction = (typeof REACTIONS)[number]

export type ActivityItem = {
  itemId: string
  itemType: 'event' | 'post' // post = publicación con foto (0012_photos.sql)
  userId: string
  name: string
  avatarPath: string | null
  avatarEmoji: string | null
  avatarColor: string | null
  kind: 'habit' | 'weekly_total' | 'day_bonus'
  habitTitle: string | null // en eventos, solo si el hábito es visible para amigos
  amount: number
  createdAt: string
  photoPath: string | null
  caption: string | null
  reactions: Partial<Record<Reaction, number>>
  myReaction: Reaction | null
  reactionCount: number
}

const ACTIVITY_KINDS = ['habit', 'weekly_total', 'day_bonus']
const isReaction = (value: unknown): value is Reaction => REACTIONS.includes(value as Reaction)

export function buildActivity(raw: unknown): ActivityItem[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((row) => row && ACTIVITY_KINDS.includes(row.kind) && (row.item_id || row.event_id))
    .map((row) => {
      const reactions: Partial<Record<Reaction, number>> = {}
      for (const [emoji, count] of Object.entries(row.reactions ?? {})) {
        if (isReaction(emoji)) reactions[emoji] = Number(count)
      }
      return {
        itemId: String(row.item_id ?? row.event_id),
        itemType: row.item_type === 'post' ? 'post' : 'event',
        userId: String(row.user_id),
        name: String(row.display_name ?? ''),
        avatarPath: row.avatar_path ?? null,
        avatarEmoji: row.avatar_emoji ?? null,
        avatarColor: row.avatar_color ?? null,
        kind: row.kind as ActivityItem['kind'],
        habitTitle: row.habit_title ?? null,
        amount: Number(row.amount ?? 0),
        createdAt: String(row.created_at),
        photoPath: row.photo_path ?? null,
        caption: row.caption ?? null,
        reactions,
        myReaction: isReaction(row.my_reaction) ? row.my_reaction : null,
        reactionCount: Number(row.reaction_count ?? 0),
      }
    })
}

/** "Beto completó «Correr»", "Ana completó todos sus hábitos de un día"... */
export function activityText(item: ActivityItem): string {
  if (item.kind === 'day_bonus') return `${item.name} completó todos sus hábitos de un día`
  if (item.kind === 'weekly_total') {
    return item.habitTitle
      ? `${item.name} cumplió su meta semanal de «${item.habitTitle}»`
      : `${item.name} cumplió una meta semanal`
  }
  if (item.itemType === 'post') return `${item.name} ha completado «${item.habitTitle ?? 'un hábito'}»`
  return item.habitTitle ? `${item.name} completó «${item.habitTitle}»` : `${item.name} completó un hábito`
}

/** "hace un momento", "hace 5 min", "hace 3 h", "ayer", "hace 4 días". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000)
  if (!Number.isFinite(minutes) || minutes < 2) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'ayer' : `hace ${days} días`
}

export function friendlyReactError(message: string): string {
  if (message.includes('not_allowed')) return 'Solo puedes reaccionar a la actividad de tus amigos.'
  return 'No se pudo reaccionar. Inténtalo otra vez.'
}
