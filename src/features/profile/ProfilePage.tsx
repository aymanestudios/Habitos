import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { DemoNotice } from '@/components/DemoNotice'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { ProgressBar } from '@/components/ProgressBar'
import { AccountCard } from './AccountCard'

// DISEÑO con datos ficticios.
const stats = [
  { label: 'Racha actual', value: '12' },
  { label: 'Mejor racha', value: '34' },
  { label: 'Hábitos hechos', value: '286' },
]

const privacy = [
  { label: 'Perfil visible para amigos', on: true },
  { label: 'Mostrar mi racha', on: true },
  { label: 'Hábitos nuevos privados por defecto', on: true },
]

export function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" />

      <AccountCard />

      <DemoNotice />

      <Card className="flex items-center gap-5">
        <Avatar name="Alex" className="h-20 w-20 text-3xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold">Alex</h2>
          <p className="text-muted">@alex</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm font-semibold text-accent-ink">
              <Icon name="bolt" className="h-4 w-4" />
              Nivel 7
            </span>
            <ProgressBar value={68} tone="accent" className="max-w-40" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Icon name="shield" className="h-5 w-5 text-brand-ink" />
          Privacidad
        </h2>
        <ul className="divide-y divide-line">
          {privacy.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-4 py-3">
              <span>{item.label}</span>
              <span
                className={`relative h-7 w-12 shrink-0 rounded-full ${item.on ? 'bg-brand' : 'bg-surface-2'}`}
                aria-hidden="true"
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                    item.on ? 'left-6' : 'left-1'
                  }`}
                />
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
