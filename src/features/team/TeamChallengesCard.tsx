import { useState } from 'react'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { Skeleton } from '@/components/Skeleton'
import { challengeTitle, shortProgress } from '@/features/challenges/challengeRules'
import { useChallenges } from '@/features/challenges/useChallenges'
import { errorMessage } from '@/features/habits/habitRules'
import { useProfile } from '@/features/profile/useProfile'
import { CreateTeamSheet } from './CreateTeamSheet'
import type { TeamFriend } from './CreateTeamSheet'
import { TeamChallengeItem } from './TeamChallengeItem'
import { friendlyTeamError } from './teamRules'
import { useTeamChallenges } from './useTeam'

// Retos en equipo (Amigos): invitaciones, retos en marcha e historial. Sustituye a "Retos relámpago".
export function TeamChallengesCard({ friends }: { friends: TeamFriend[] }) {
  const team = useTeamChallenges(friends.length > 0)
  const legacy = useChallenges(friends.length > 0) // relámpago antiguos: solo se ven hasta que terminan
  const profile = useProfile()
  const [creating, setCreating] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  if (friends.length === 0) return null

  const list = team.data ?? []
  const incoming = list.filter((c) => c.status === 'pending' && !c.createdByMe)
  const outgoing = list.filter((c) => c.status === 'pending' && c.createdByMe)
  const active = list.filter((c) => c.status === 'active')
  const history = list.filter((c) => c.status !== 'pending' && c.status !== 'active')
  const oldFlash = (legacy.data ?? []).filter((c) => c.isCurrent)
  const me = { photo: profile.data?.avatar_path ?? null, color: profile.data?.avatar_color ?? null }
  const item = (c: (typeof list)[number]) => <TeamChallengeItem key={c.id} challenge={c} mePhoto={me.photo} meColor={me.color} />

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name="friends" className="h-5 w-5 text-brand-ink" />
          Retos en equipo
        </h2>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary flex items-center gap-1 px-3 py-2 text-sm">
          <Icon name="plus" className="h-4 w-4" />
          Nuevo
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">Una meta, dos personas: lo que hacéis se suma hasta llegar juntos.</p>

      {team.isError && <p className="mt-3 text-sm text-danger">{friendlyTeamError(errorMessage(team.error))}</p>}
      {team.isPending && <Skeleton className="mt-4 h-28 rounded-3xl" />}

      {team.isSuccess && list.length === 0 && oldFlash.length === 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-3xl bg-surface-2 p-4">
          <Mascot pose="laptop" className="h-16 shrink-0" />
          <p className="text-sm">
            <span className="block font-bold">Aún no tenéis retos</span>
            <span className="text-muted">Propón uno: 20 km entre los dos, 100 páginas, una semana de estudio…</span>
          </p>
        </div>
      )}

      {incoming.length > 0 && (
        <section className="mt-4 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">Te invitan</h3>
          {incoming.map(item)}
        </section>
      )}
      {active.length > 0 && (
        <section className="mt-4 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">En marcha</h3>
          {active.map(item)}
        </section>
      )}
      {outgoing.length > 0 && (
        <section className="mt-4 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">Esperando respuesta</h3>
          {outgoing.map(item)}
        </section>
      )}

      {oldFlash.length > 0 && (
        <section className="mt-4 rounded-2xl bg-surface-2 p-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">Reto relámpago (el último)</h3>
          {oldFlash.map((c) => (
            <p key={c.id} className="mt-1 text-sm">
              <span className="font-bold">{challengeTitle(c)}</span> con {c.partnerName} · <span className="text-muted">{shortProgress(c)}</span>
            </p>
          ))}
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-4">
          <button type="button" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory} className="flex w-full items-center justify-between rounded-2xl px-1 py-2 text-sm font-bold text-muted hover:text-ink">
            Historial ({history.length})
            <span className={`transition-transform ${showHistory ? 'rotate-180' : ''}`}>⌄</span>
          </button>
          {showHistory && <div className="animate-fade mt-2 space-y-3">{history.map(item)}</div>}
        </section>
      )}

      <CreateTeamSheet open={creating} friends={friends} onClose={() => setCreating(false)} />
    </Card>
  )
}
