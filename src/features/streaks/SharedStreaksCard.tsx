import { useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { errorMessage } from '@/features/habits/habitRules'
import { useProfile } from '@/features/profile/useProfile'
import { getUserTimezone } from '@/lib/dates'
import { useToday } from '@/lib/useToday'
import { Flame } from './Flame'
import type { FlameMoment } from './Flame'
import { fireLook, milestoneText, progressToNext } from './fireRules'
import { friendlyStreakError, stateText, takeMoment, todayMessage } from './sharedStreakRules'
import type { DayProgress, SharedStreak } from './sharedStreakRules'
import { useEndSharedStreak, useSharedStreaks, useStartSharedStreak } from './useSharedStreaks'

type Friend = {
  user_id: string
  display_name: string
  avatar_emoji: string | null
  avatar_color: string | null
  avatar_path: string | null
}

// Sección "Rachas compartidas" (pantalla Amigos): una tarjeta y un fuego por pareja.
export function SharedStreaksCard({ friends }: { friends: Friend[] }) {
  const streaks = useSharedStreaks(friends.length > 0)
  const start = useStartSharedStreak()
  const [choosing, setChoosing] = useState(false)

  if (friends.length === 0) return null
  const list = streaks.data ?? []
  const withStreak = new Set(list.map((streak) => streak.partnerId))
  const free = friends.filter((friend) => !withStreak.has(friend.user_id))

  return (
    <section className="space-y-3" aria-labelledby="shared-streaks-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="shared-streaks-title" className="flex items-center gap-2 text-lg font-bold">
          <Icon name="flame" className="h-5 w-5 text-brand-ink" />
          Rachas compartidas
        </h2>
        {free.length > 0 && !choosing && (
          <button
            type="button"
            onClick={() => setChoosing(true)}
            className="btn-primary flex items-center gap-1 px-3 py-2 text-sm"
          >
            <Icon name="plus" className="h-4 w-4" />
            Nueva
          </button>
        )}
      </div>

      {streaks.isError && (
        <Card>
          <p className="text-sm text-danger">
            {friendlyStreakError(errorMessage(streaks.error))}
          </p>
        </Card>
      )}

      {choosing && (
        <Card className="animate-pop-in">
          <p className="font-semibold">¿Con quién quieres encender una racha?</p>
          <p className="mt-1 text-sm text-muted">
            Cada día que los dos cumpláis vuestros hábitos, el fuego crece. Si uno falla, vuelve a empezar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {free.map((friend) => (
              <button
                key={friend.user_id}
                type="button"
                disabled={start.isPending}
                onClick={() => start.mutate(friend.user_id, { onSuccess: () => setChoosing(false) })}
                className="flex items-center gap-2 rounded-full border-2 border-line bg-surface py-1.5 pl-1.5 pr-4 text-sm font-bold transition-all hover:border-brand active:scale-95 disabled:opacity-60"
              >
                <Avatar
                  name={friend.display_name}
                  emoji={friend.avatar_emoji}
                  color={friend.avatar_color}
                  photo={friend.avatar_path}
                  className="h-8 w-8 text-sm"
                />
                {friend.display_name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setChoosing(false)}
            className="mt-3 text-sm font-semibold text-muted hover:text-ink"
          >
            Cancelar
          </button>
          {start.isError && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {friendlyStreakError(errorMessage(start.error))}
            </p>
          )}
        </Card>
      )}

      {streaks.isPending && <div className="skeleton h-56 rounded-3xl" />}

      {streaks.isSuccess && list.length === 0 && !choosing && (
        <Card className="flex items-center gap-4">
          <Flame days={0} size={72} />
          <p className="text-sm text-muted">
            Enciende una racha con un amigo: cuantos más días seguidos cumpláis los dos, más espectacular será el fuego.
          </p>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((streak) => (
          <StreakCard key={streak.id} streak={streak} />
        ))}
      </div>
    </section>
  )
}

function StreakCard({ streak }: { streak: SharedStreak }) {
  const profile = useProfile()
  const today = useToday(profile.data?.timezone ?? getUserTimezone())
  const end = useEndSharedStreak()
  const [moment, setMoment] = useState<FlameMoment>(null)
  const [confirming, setConfirming] = useState(false)
  const look = fireLook(streak.current)

  // Animación especial (encender / evolucionar / racha mantenida), una vez por momento
  useEffect(() => {
    const next = takeMoment(streak, today)
    if (next) setMoment(next)
  }, [streak, today])

  useEffect(() => {
    if (!moment) return
    const timer = window.setTimeout(() => setMoment(null), 2600)
    return () => window.clearTimeout(timer)
  }, [moment])

  const banner =
    moment === 'kept' ? '¡Racha mantenida!' : moment === 'evolve' ? `¡Nuevo fuego: ${look.stage.name}!` : null

  return (
    <Card className="relative overflow-hidden">
      {/* Tinte suave del color del fuego detrás de la tarjeta (en oscuro destaca más) */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl dark-boost"
        style={{ background: look.palette.glow }}
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-4">
        <div className="relative flex w-28 shrink-0 justify-center">
          <Flame days={streak.current} size={124} moment={moment} />
          {banner && (
            <span
              key={banner}
              className="animate-published absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg"
              style={{ background: look.palette.outer }}
              role="status"
            >
              {banner}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              <MeAvatar />
              <Avatar
                name={streak.partnerName}
                emoji={streak.partnerAvatarEmoji}
                color={streak.partnerAvatarColor}
                photo={streak.partnerAvatarPath}
                className="h-8 w-8 text-sm ring-2 ring-surface"
              />
            </div>
            <p className="min-w-0 truncate text-sm font-semibold">Tú y {streak.partnerName}</p>
          </div>

          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tabular-nums tracking-tight">{streak.current}</span>
            <span className="text-sm font-semibold text-muted">{streak.current === 1 ? 'día' : 'días'}</span>
          </p>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: look.palette.outer }}>
            {look.lit ? look.stage.name : 'Por encender'}
          </p>

          {/* Progreso hasta la siguiente evolución */}
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={progressToNext(streak.current)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso hasta el siguiente fuego"
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressToNext(streak.current)}%`,
                background: `linear-gradient(90deg, ${look.palette.outer}, ${look.palette.tip})`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">{milestoneText(streak.current)}</p>
        </div>
      </div>

      {/* Estado de hoy de cada uno */}
      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <TodayPill who="Tú" progress={streak.me} />
        <TodayPill who={streak.partnerName} progress={streak.partner} />
      </div>
      <div className="relative mt-3 flex items-center justify-between gap-3 text-xs text-muted">
        <span>{todayMessage(streak)}</span>
        <span className="shrink-0">Récord: {streak.best} d</span>
      </div>

      <div className="relative mt-2">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Se perderá la racha y el récord.</span>
            <button
              type="button"
              onClick={() => end.mutate(streak.id)}
              disabled={end.isPending}
              className="rounded-full bg-danger-soft px-3 py-1.5 text-xs font-bold text-danger"
            >
              Sí, terminar
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border-2 border-line px-3 py-1 text-xs font-bold text-muted"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-xs font-semibold text-muted hover:text-ink"
          >
            Terminar racha compartida
          </button>
        )}
      </div>
    </Card>
  )
}

function MeAvatar() {
  const profile = useProfile()
  if (!profile.data) return <span className="h-8 w-8 rounded-full bg-surface-2 ring-2 ring-surface" />
  return (
    <Avatar
      name={profile.data.display_name}
      emoji={profile.data.avatar_emoji}
      color={profile.data.avatar_color}
      photo={profile.data.avatar_path}
      className="h-8 w-8 text-sm ring-2 ring-surface"
    />
  )
}

function TodayPill({ who, progress }: { who: string; progress: DayProgress }) {
  const done = progress.state !== 'pending'
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2 transition-colors ${
        done ? 'border-good bg-good-soft' : 'border-line bg-surface'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-good text-on-brand' : 'border-2 border-line text-transparent'
        }`}
      >
        <Icon name="check" className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold">{who}</span>
        <span className="block text-xs text-muted">{stateText(progress)}</span>
      </span>
    </div>
  )
}
