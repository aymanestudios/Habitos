import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import type { Privacy, Profile } from './useProfile'
import { useUpdatePrivacy } from './useProfile'

const OPTIONS: { key: keyof Privacy; title: string; text: string }[] = [
  { key: 'share_streak', title: 'Mi racha', text: 'Racha actual y mejor racha' },
  { key: 'share_stats', title: 'Mis estadísticas', text: 'Cumplimiento y hábitos marcados como "Mis amigos"' },
  { key: 'share_achievements', title: 'Mis logros', text: 'Insignias conseguidas' },
]

// Privacidad: qué ven tus amigos al entrar en tu perfil. Lo aplica el servidor, no solo la pantalla.
export function PrivacyCard({ profile }: { profile: Profile }) {
  const update = useUpdatePrivacy()
  const current: Privacy = {
    share_streak: profile.share_streak ?? true,
    share_stats: profile.share_stats ?? true,
    share_achievements: profile.share_achievements ?? true,
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Icon name="lock" className="h-5 w-5 text-brand-ink" />
        Privacidad
      </h2>
      <p className="mt-1 text-sm text-muted">
        Qué ven tus amigos en tu perfil. Siempre ven tu nombre, foto, nivel y lo que llevas equipado. Tus hábitos privados y
        tus fotos "Solo yo" nunca se comparten.
      </p>
      <ul className="mt-3 divide-y divide-line">
        {OPTIONS.map((option) => {
          const on = current[option.key]
          return (
            <li key={option.key} className="flex items-center justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="block font-semibold">{option.title}</span>
                <span className="block text-xs text-muted">{option.text}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Compartir ${option.title.toLowerCase()} con mis amigos`}
                disabled={update.isPending}
                onClick={() => update.mutate({ ...current, [option.key]: !on })}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? 'bg-brand' : 'bg-line'}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
              </button>
            </li>
          )
        })}
      </ul>
      {update.isError && <p className="mt-2 text-sm text-danger">No se pudo guardar. Inténtalo otra vez.</p>}
    </Card>
  )
}
