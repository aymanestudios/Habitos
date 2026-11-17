// Perfil de un amigo (get_friend_profile, 0016). El servidor ya quita lo que no quiere compartir:
// aquí solo se ordena. Si un dato falta, es porque es privado.

export type FriendProfile = {
  userId: string
  name: string
  username: string
  avatarPath: string | null
  avatarColor: string | null
  bio: string | null
  level: number
  xpTotal: number
  weekXp: number
  frame: string | null
  accessory: string | null
  effect: string | null
  showcase: string[]
  streak: { current: number; best: number } | null // null = no la comparte
  unlocked: string[] | null // null = no comparte sus logros
  stats: {
    habitsDone: number
    monthPercent: number | null
    habits: { title: string; category: string; done30: number }[]
    posts: { id: string; photoPath: string; caption: string | null; localDate: string; habitTitle: string }[]
  } | null // null = no comparte estadísticas
}

const arr = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

export function buildFriendProfile(raw: unknown): FriendProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const month = r.month as { scheduled?: number; done?: number } | undefined
  return {
    userId: String(r.user_id),
    name: String(r.display_name ?? ''),
    username: String(r.username ?? ''),
    avatarPath: (r.avatar_path as string | null) ?? null,
    avatarColor: (r.avatar_color as string | null) ?? null,
    bio: (r.bio as string | null) ?? null,
    level: Number(r.level ?? 1),
    xpTotal: Number(r.xp_total ?? 0),
    weekXp: Number(r.week_xp ?? 0),
    frame: (r.equipped_frame as string | null) ?? null,
    accessory: (r.equipped_accessory as string | null) ?? null,
    effect: (r.equipped_effect as string | null) ?? null,
    showcase: arr<string>(r.showcase_badges),
    streak: 'current_streak' in r ? { current: Number(r.current_streak ?? 0), best: Number(r.best_streak ?? 0) } : null,
    unlocked: 'unlocked' in r ? arr<string>(r.unlocked) : null,
    stats:
      'habits_done' in r
        ? {
            habitsDone: Number(r.habits_done ?? 0),
            monthPercent:
              month && Number(month.scheduled) > 0 ? Math.round((Number(month.done) / Number(month.scheduled)) * 100) : null,
            habits: arr<{ title: string; category: string; done_30: number }>(r.habits).map((habit) => ({
              title: String(habit.title),
              category: String(habit.category),
              done30: Number(habit.done_30 ?? 0),
            })),
            posts: arr<{ id: string; photo_path: string; caption: string | null; local_date: string; habit_title: string }>(r.posts).map(
              (post) => ({
                id: String(post.id),
                photoPath: String(post.photo_path),
                caption: post.caption ?? null,
                localDate: String(post.local_date),
                habitTitle: String(post.habit_title),
              }),
            ),
          }
        : null,
  }
}
