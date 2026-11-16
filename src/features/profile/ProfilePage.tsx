import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { ChoiceChips } from '@/components/ChoiceChips'
import { Icon } from '@/components/Icon'
import { LevelBar } from '@/components/LevelBar'
import { PageHeader } from '@/components/PageHeader'
import { useTheme } from '@/lib/theme'
import type { ThemeChoice } from '@/lib/theme'
import { AccountCard } from './AccountCard'
import { freezesText, xpToNext } from './progressRules'
import { useProfile } from './useProfile'
import { useProgress } from './useProgress'

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'auto', label: 'Automático' },
]

export function ProfilePage() {
  const [theme, setTheme] = useTheme()
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
    <div className="stagger space-y-6">
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

      <Card>
        <h2 className="text-lg font-bold">Apariencia</h2>
        <p className="mb-3 mt-1 text-sm text-muted">Automático sigue el modo de tu dispositivo.</p>
        <ChoiceChips label="Tema" options={THEMES} value={theme} onChange={setTheme} />
      </Card>

      <AccountCard />
    </div>
  )
}
