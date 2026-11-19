import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { duoTier, firstName } from './teamRules'
import { useDuo } from './useTeam'

// "Dúo": retos cumplidos con este amigo. Se queda aunque dejéis de ser amigos (los retos no se borran).
export function DuoCard({ friendId, friendName }: { friendId: string; friendName: string }) {
  const duo = useDuo(friendId)
  const count = duo.data ?? 0
  const tier = duoTier(count)
  if (!duo.isSuccess) return null
  return (
    <Card className="flex items-center gap-3">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tier ? 'bg-accent text-on-brand' : 'bg-surface-2 text-muted'}`}>
        <Icon name="friends" className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        {tier ? (
          <>
            <p className="font-extrabold">{tier.name}</p>
            <p className="text-sm text-muted">
              {count === 1 ? '1 reto cumplido juntos' : `${count} retos cumplidos juntos`}
              {tier.next !== null && ` · próximo nivel a los ${tier.next}`}
            </p>
          </>
        ) : (
          <>
            <p className="font-bold">Aún sin retos juntos</p>
            <p className="text-sm text-muted">Propón uno a {firstName(friendName)} en Amigos → Retos en equipo.</p>
          </>
        )}
      </div>
      {tier && (
        <span className="flex gap-0.5" aria-label={`Nivel de dúo ${tier.step} de 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i <= tier.step ? 'bg-accent' : 'bg-surface-2'}`} />
          ))}
        </span>
      )}
    </Card>
  )
}
