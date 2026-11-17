import { Link } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { ChoiceChips } from '@/components/ChoiceChips'
import { Icon } from '@/components/Icon'
import { LevelBar } from '@/components/LevelBar'
import { PageHeader } from '@/components/PageHeader'
import { useTheme } from '@/lib/theme'
import type { ThemeChoice } from '@/lib/theme'
import { achievementsSummary, buildAchievements } from './achievements'
import { AccountCard } from './AccountCard'
import { StyleCard } from './StyleCard'
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
          <Avatar
            name={profile.data.display_name}
            emoji={profile.data.avatar_emoji}
            color={profile.data.avatar_color}
            className="h-20 w-20 text-4xl"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold">{profile.data.display_name}</h2>
            <p className="truncate text-muted">@{profile.data.username}</p>
            {profile.data.bio && <p className="mt-1 text-sm italic">“{profile.data.bio}”</p>}
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

      {progress.data &&
        (() => {
          const achievements = buildAchievements(progress.data)
          return (
            <Card>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold">Logros</h2>
                <span className="text-sm font-semibold text-muted">{achievementsSummary(achievements)}</span>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {achievements.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-2xl border-2 p-3 text-center ${
                      item.unlocked ? 'border-accent bg-accent-soft' : 'border-dashed border-line opacity-60'
                    }`}
                  >
                    <span
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${
                        item.unlocked ? 'bg-accent text-on-brand' : 'bg-surface-2 text-muted'
                      }`}
                    >
                      <Icon name={item.unlocked ? 'check' : 'shield'} className="h-5 w-5" />
                    </span>
                    <span className="mt-2 block text-sm font-bold">{item.title}</span>
                    <span className="block text-xs text-muted">{item.text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })()}

      <Link
        to="/estadisticas"
        className="flex items-center gap-4 rounded-3xl border-2 border-line bg-surface p-5 shadow-card transition-transform active:scale-[0.98]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
          <Icon name="chart" className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold">Estadísticas</span>
          <span className="block text-sm text-muted">Calendario, semanas y hábitos más constantes</span>
        </span>
        <span className="text-2xl text-muted" aria-hidden="true">›</span>
      </Link>

      {profile.data && <StyleCard key={profile.data.id} profile={profile.data} />}

      <Card>
        <h2 className="text-lg font-bold">Apariencia</h2>
        <p className="mb-3 mt-1 text-sm text-muted">Automático sigue el modo de tu dispositivo.</p>
        <ChoiceChips label="Tema" options={THEMES} value={theme} onChange={setTheme} />
      </Card>

      <AccountCard />
    </div>
  )
}
