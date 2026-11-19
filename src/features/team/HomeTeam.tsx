import { Link } from 'react-router'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { splitBar } from '@/features/celebrations/celebrationRules'
import { SplitBar, TeamKindIcon } from './TeamArt'
import { firstName, formatAmount, teamTitle, timeLeftText } from './teamRules'
import { useTeamChallenges } from './useTeam'

// Inicio: invitaciones pendientes y retos en equipo en marcha (máx. 2), con la barra conjunta.
export function HomeTeam() {
  const team = useTeamChallenges()
  const list = team.data ?? []
  const invites = list.filter((c) => c.status === 'pending' && !c.createdByMe)
  const active = list.filter((c) => c.status === 'active').slice(0, 2)
  if (invites.length === 0 && active.length === 0) return null

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name="friends" className="h-5 w-5 text-brand-ink" />
          Retos en equipo
        </h2>
        <Link to="/amigos" className="text-sm font-bold text-brand-ink">
          Ver
        </Link>
      </div>
      {invites.length > 0 && (
        <Link to="/amigos" className="animate-pop-in mt-3 flex items-center gap-3 rounded-2xl bg-brand-soft p-3 text-brand-ink">
          <Icon name="bell" className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 text-sm font-bold">
            {invites.length === 1
              ? `${firstName(invites[0].partner.name)} te invita: ${teamTitle(invites[0])}`
              : `Tienes ${invites.length} invitaciones a retos`}
          </span>
          <span className="text-sm font-extrabold">Ver</span>
        </Link>
      )}
      <ul className="mt-3 space-y-3">
        {active.map((c) => {
          const bar = splitBar(c.mine, c.theirs, c.goal)
          return (
            <li key={c.id}>
              <Link to="/amigos" className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                  <TeamKindIcon kind={c.kind} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold">
                      {teamTitle(c)} con {firstName(c.partner.name)}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{timeLeftText(c)}</span>
                  </span>
                  <SplitBar mine={bar.mine} theirs={bar.theirs} className="mt-1 h-2" />
                  <span className="mt-1 block truncate text-xs text-muted">
                    {formatAmount(c.mine + c.theirs, c.unit)} de {formatAmount(c.goal, c.unit)}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
