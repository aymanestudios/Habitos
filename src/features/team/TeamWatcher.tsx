import { useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useProfile } from '@/features/profile/useProfile'
import type { Celebration } from '@/features/celebrations/celebrationRules'
import { partnerNews, teamTitle } from './teamRules'
import { useTeamChallenges } from './useTeam'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // sin almacenamiento: como mucho se avisa otra vez
  }
}

// Vigila los retos en equipo (datos del servidor) para:
//  - celebrar UNA vez (por dispositivo) cada reto cumplido, con los dos avatares y lo que aportó cada uno;
//  - avisar con un chip pequeño cuando tu compañero suma algo ("¡Beto ha sumado 3 km!").
// Sin tiempo real: se entera al volver a la app o cada minuto mientras hay retos en marcha.
export function TeamWatcher({ onCelebrate, onNews }: { onCelebrate: (item: Celebration) => void; onNews: (text: string) => void }) {
  const { user } = useAuth()
  const team = useTeamChallenges()
  const profile = useProfile()

  useEffect(() => {
    if (!user || !team.data || !profile.data) return
    const doneKey = `pg-team-celebrated:${user.id}`
    const seenKey = `pg-team-seen:${user.id}`
    const first = read<string[] | null>(doneKey, null) === null
    const celebrated = new Set(read<string[]>(doneKey, []))
    const seen = read<Record<string, string>>(seenKey, {})

    // 1. Retos cumplidos nuevos (la primera vez en este móvil no se celebra lo antiguo)
    const fresh = team.data.filter((c) => c.status === 'completed' && !celebrated.has(c.id))
    if (!first) {
      for (const c of fresh) {
        onCelebrate({
          kind: 'team',
          id: c.id,
          title: teamTitle(c),
          target: c.goal,
          unit: c.unit,
          xp: c.xp ?? 0,
          me: { name: profile.data.display_name, avatarPath: profile.data.avatar_path, avatarColor: profile.data.avatar_color, value: c.mine },
          partner: { name: c.partner.name, avatarPath: c.partner.avatarPath, avatarColor: c.partner.avatarColor, value: c.theirs },
        })
      }
    }
    write(doneKey, [...celebrated, ...fresh.map((c) => c.id)].slice(-80))

    // 2. Lo nuevo de tu compañero (solo retos en marcha; si se acaba de cumplir, ya lo dice la celebración)
    for (const news of partnerNews(team.data.filter((c) => c.status === 'active'), seen)) onNews(news.text)
    const nextSeen: Record<string, string> = {}
    for (const c of team.data) {
      const theirs = c.recent.find((k) => !k.mine)
      nextSeen[c.id] = theirs?.at ?? seen[c.id] ?? '0'
    }
    write(seenKey, nextSeen)
  }, [user, team.data, profile.data, onCelebrate, onNews])

  return null
}
