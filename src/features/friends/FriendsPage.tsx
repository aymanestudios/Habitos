import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { PageHeader } from '@/components/PageHeader'

// Lo que traerá la Fase 2. Hasta entonces la pantalla es honesta: sin datos inventados.
const soon = [
  { icon: 'friends', text: 'Añade amigos con tu código' },
  { icon: 'bolt', text: 'Ranking semanal de XP' },
  { icon: 'flame', text: 'Mira las rachas de tus amigos y anímalos' },
] as const

export function FriendsPage() {
  return (
    <div className="stagger space-y-6">
      <PageHeader title="Amigos" subtitle="Constancia en equipo" />

      <Card className="flex flex-col items-center text-center">
        <Mascot className="mb-2 h-32" />
        <h2 className="text-lg font-bold">Muy pronto</h2>
        <p className="mt-1 text-muted">Pronto podrás hacer hábitos junto a tus amigos.</p>
        <ul className="mt-4 w-full max-w-sm space-y-3 text-left">
          {soon.map((item) => (
            <li key={item.text} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
