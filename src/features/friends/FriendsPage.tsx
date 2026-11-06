import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { DemoNotice } from '@/components/DemoNotice'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'

// DISEÑO con datos ficticios.
const ranking = [
  { name: 'Marta', xp: 420, streak: 21, tone: 'good' as const },
  { name: 'Alex (tú)', xp: 380, streak: 12, tone: 'brand' as const },
  { name: 'Leo', xp: 310, streak: 8, tone: 'accent' as const },
  { name: 'Sara', xp: 250, streak: 4, tone: 'brand' as const },
]

export function FriendsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Amigos" subtitle="Constancia en equipo" />

      <DemoNotice />

      <Card className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Tu código de amigo</p>
          <p className="mt-1 text-2xl font-bold tracking-widest">K7QM-92XD</p>
        </div>
        <button
          type="button"
          disabled
          className="flex items-center gap-2 rounded-2xl bg-brand-soft px-4 py-2.5 font-semibold text-brand opacity-60"
        >
          <Icon name="copy" className="h-5 w-5" />
          Copiar
        </button>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">Ranking de la semana</h2>
          <span className="text-sm text-muted">XP</span>
        </div>
        <ul className="divide-y divide-line">
          {ranking.map((friend, index) => (
            <li key={friend.name} className="flex items-center gap-4 py-3">
              <span className="w-5 text-center font-bold text-muted">{index + 1}</span>
              <Avatar name={friend.name} tone={friend.tone} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{friend.name}</p>
                <p className="flex items-center gap-1 text-sm text-accent">
                  <Icon name="flame" className="h-4 w-4" />
                  {friend.streak} días
                </p>
              </div>
              <span className="font-bold">{friend.xp}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
