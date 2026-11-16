import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { DemoNotice } from '@/components/DemoNotice'
import { Icon } from '@/components/Icon'
import { LevelBar } from '@/components/LevelBar'
import { PageHeader } from '@/components/PageHeader'
import { AccountCard } from './AccountCard'
import { freezesText, xpToNext } from './progressRules'
import { useProfile } from './useProfile'
import { useProgress } from './useProgress'

// Estos ajustes de privacidad son de ejemplo hasta la fase de amigos.
const privacy = [
  { label: 'Perfil visible para amigos', on: true },
  { label: 'Mostrar mi racha', on: true },
  { label: 'Hábitos nuevos privados por defecto', on: true },
]

export function ProfilePage() {
  const profile = useProfile()
  const progress = useProgress()

  const stats = progress.data
    ? [
        { label: 'Racha actual', value: progress.data.current_streak },
        { label: 'Mejor racha', value: progress.data.best_streak },
        { label: 'Hábitos hechos', value: progress.data.habits_done },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" />

      {profile.data && (
        <Card className="flex items-center gap-5">
          <Avatar name={profile.data.display_name} className="h-20 w-20 text-3xl" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold">{profile.data.display_name}</h2>
            <p className="truncate text-muted">@{profile.data.username}</p>
            {progress.data && (
              <LevelBar
                className="mt-3"
                level={progress.data.level}
                xpIntoLevel={progress.data.xp_into_level}
                xpLevelSize={progress.data.xp_level_size}
              />
            )}
          </div>
        </Card>
      )}

      {progress.isError && (
        <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          No se pudo cargar tu progreso. ¿Has ejecutado la migración 0004_xp_streaks.sql en Supabase?
        </p>
      )}

      {progress.data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <Card key={stat.label} className="p-4 text-center">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="mt-1 text-xs text-muted">{stat.label}</p>
              </Card>
            ))}
          </div>

          <Card className="space-y-2">
            <p className="flex items-center gap-2">
              <Icon name="bolt" className="h-5 w-5 text-accent-ink" />
              <span className="font-semibold">{progress.data.xp_total} XP en total</span>
            </p>
            <p className="text-sm text-muted">Te faltan {xpToNext(progress.data)} XP para el nivel {progress.data.level + 1}.</p>
            <p className="flex items-center gap-2 text-sm text-muted">
              <Icon name="flame" className="h-5 w-5 text-brand-ink" />
              {freezesText(progress.data.freezes_left)}
            </p>
          </Card>
        </>
      )}

      <AccountCard />

      <Card>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Icon name="shield" className="h-5 w-5 text-brand-ink" />
          Privacidad
        </h2>
        <div className="mb-1">
          <DemoNotice />
        </div>
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
