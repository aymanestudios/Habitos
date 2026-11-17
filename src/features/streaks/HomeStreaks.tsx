import { Link } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { Flame } from './Flame'
import { fireLook } from './fireRules'
import { NudgeButton } from './NudgeButton'
import { momentBanner, useFireMoment } from './SharedStreaksCard'
import { inDanger, todayMessage } from './sharedStreakRules'
import type { SharedStreak } from './sharedStreakRules'
import { useSharedStreaks } from './useSharedStreaks'

// Rachas compartidas en la pantalla de inicio ("Hoy"): lo primero que se ve al entrar.
export function HomeStreaks() {
  const streaks = useSharedStreaks(true)
  if (streaks.isError) return null // p. ej. falta la migración: no molestamos en el inicio
  if (streaks.isPending) return <div className="skeleton h-40 rounded-3xl" />

  const list = streaks.data ?? []
  if (list.length === 0) {
    return (
      <Link
        to="/amigos"
        className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-line bg-surface p-4 transition-transform active:scale-[0.98]"
      >
        <Flame days={0} size={64} />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Enciende una racha con un amigo</span>
          <span className="block text-sm text-muted">Cuantos más días cumpláis juntos, más espectacular será vuestro fuego.</span>
        </span>
        <span className="text-2xl text-muted" aria-hidden="true">›</span>
      </Link>
    )
  }

  return (
    <section aria-label="Rachas compartidas">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="flame" className="h-5 w-5 text-brand-ink" />
          Rachas compartidas
        </h2>
        <Link to="/amigos" className="text-sm font-semibold text-brand-ink">
          Ver todas
        </Link>
      </div>
      {/* Varias rachas: se deslizan de lado en el móvil */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
        {list.map((streak) => (
          <HomeStreakCard key={streak.id} streak={streak} single={list.length === 1} />
        ))}
      </div>
    </section>
  )
}

function HomeStreakCard({ streak, single }: { streak: SharedStreak; single: boolean }) {
  const look = fireLook(streak.current)
  const moment = useFireMoment(streak)
  const banner = momentBanner(moment, look.stage.name)
  const danger = inDanger(streak)

  return (
    <Link
      to="/amigos"
      className={`relative flex shrink-0 snap-start items-center gap-3 overflow-hidden rounded-3xl border-2 bg-surface p-4 shadow-card transition-transform active:scale-[0.98] ${
        single ? 'w-full' : 'w-[85%] sm:w-auto'
      } ${danger ? 'border-orange-400' : 'border-line'}`}
    >
      <div
        className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full opacity-25 blur-3xl dark-boost"
        style={{ background: look.palette.glow }}
        aria-hidden="true"
      />
      <div className="relative flex w-20 shrink-0 justify-center">
        <Flame days={streak.current} size={92} moment={moment} />
        {banner && (
          <span
            key={banner}
            role="status"
            className="animate-published absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow-lg"
            style={{ background: look.palette.outer }}
          >
            {banner}
          </span>
        )}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Avatar
            name={streak.partnerName}
            emoji={streak.partnerAvatarEmoji}
            color={streak.partnerAvatarColor}
            photo={streak.partnerAvatarPath}
            className="h-7 w-7 text-xs"
          />
          <p className="min-w-0 truncate text-sm font-semibold">Tú y {streak.partnerName}</p>
          {danger && (
            <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              En peligro
            </span>
          )}
        </div>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tabular-nums tracking-tight">{streak.current}</span>
          <span className="text-sm font-semibold text-muted">{streak.current === 1 ? 'día' : 'días'}</span>
          <span className="ml-1 truncate text-xs font-bold uppercase tracking-wide" style={{ color: look.palette.outer }}>
            {look.lit ? look.stage.name : 'Por encender'}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted">{todayMessage(streak)}</p>
        <div className="mt-2">
          <NudgeButton streak={streak} compact />
        </div>
      </div>
    </Link>
  )
}
