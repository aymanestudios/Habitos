import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { burst } from '@/lib/confetti'
import { challengeTitle, daysLeft, freshDone, localToday, overallPercent, shortProgress } from './challengeRules'
import type { Challenge } from './challengeRules'
import { useChallenges } from './useChallenges'

const SEEN_KEY = 'pg-challenges-celebrated'

function readSeen(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.map(String) : []
  } catch {
    return []
  }
}

function saveSeen(ids: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-50)))
  } catch {
    // sin almacenamiento: como mucho se celebra otra vez
  }
}

// Retos relámpago en Inicio: los activos (máx. 2) y, una vez, la celebración del panda al cumplir uno.
export function HomeChallenges() {
  const challenges = useChallenges(true)
  const [party, setParty] = useState<Challenge | null>(null)

  useEffect(() => {
    if (!challenges.data) return
    const seen = readSeen()
    const fresh = freshDone(challenges.data, seen)
    if (fresh.length === 0) return
    saveSeen([...seen, ...fresh.map((c) => c.id)])
    setParty(fresh[0])
    burst(window.innerWidth / 2, window.innerHeight * 0.3, { count: 60, power: 1.3 })
  }, [challenges.data])

  const active = (challenges.data ?? []).filter((c) => c.isCurrent && !c.done).slice(0, 2)
  if (!party && active.length === 0) return null
  const today = localToday()

  return (
    <div className="space-y-3">
      {party && (
        <Card className="animate-pop-in flex items-center gap-3">
          <Mascot pose="cheer" className="animate-tada h-16 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">¡Reto cumplido con {party.partnerName}!</p>
            <p className="text-sm text-muted">{challengeTitle(party)}. Buen trabajo en equipo.</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setParty(null)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </Card>
      )}

      {active.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Icon name="bolt" className="h-5 w-5 text-brand-ink" />
              Tus retos
            </h2>
            <Link to="/amigos" className="text-sm font-bold text-brand-ink">
              Ver
            </Link>
          </div>
          <ul className="mt-3 space-y-3">
            {active.map((c) => {
              const left = daysLeft(c, today)
              return (
                <li key={c.id}>
                  <Link to="/amigos" className="flex items-center gap-3">
                    <Avatar
                      name={c.partnerName}
                      photo={c.partnerAvatarPath}
                      color={c.partnerAvatarColor}
                      tone="accent"
                      className="h-9 w-9 text-sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-bold">{challengeTitle(c)}</span>
                        <span className="shrink-0 text-xs text-muted">{left <= 1 ? 'Último día' : `${left} días`}</span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-brand" style={{ width: `${overallPercent(c)}%` }} />
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted">{shortProgress(c)}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
