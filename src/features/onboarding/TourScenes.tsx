import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { ProfileAvatar } from '@/components/ProfileAvatar'
import { useProfile } from '@/features/profile/useProfile'
import { useProgress } from '@/features/profile/useProgress'
import { BadgeArt } from '@/features/rewards/RewardArt'
import { Flame } from '@/features/streaks/Flame'
import type { StepId } from './onboardingRules'

// Ilustraciones animadas de cada paso del tutorial. Son EJEMPLOS de cómo se ve cada parte
// (no son datos tuyos ni se guardan): por eso dicen "Ejemplo" y usan nombres genéricos.
// Reutilizan piezas reales de la app: la llama de las rachas, las insignias de Logros y tu avatar.

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

function Frame({ children, label = 'Ejemplo' }: { children: ReactNode; label?: string }) {
  return (
    <div className="relative w-full rounded-[1.75rem] border-2 border-line bg-surface/85 p-4 shadow-card backdrop-blur-sm sm:p-5 [@media(max-height:700px)]:p-3">
      <span className="absolute -top-2.5 left-5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </div>
  )
}

function Sparkle({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`ob-spark absolute h-5 w-5 text-accent ${className}`} style={d(delay)}>
      <path fill="currentColor" d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
    </svg>
  )
}

// ---------- 1. Hábitos ----------
function HabitsScene() {
  const rows = [
    { name: 'Beber agua', meta: '6 / 8 vasos', pct: 75, done: false },
    { name: 'Leer', meta: '20 min', pct: 100, done: true },
    { name: 'Caminar', meta: 'Cada día', pct: 0, done: false },
  ]
  return (
    <Frame>
      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <div key={row.name} className="ob-up flex items-center gap-3 rounded-2xl bg-surface-2 p-3" style={d(150 + i * 140)}>
            <span
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                row.done ? 'border-good bg-good text-white' : 'border-line bg-surface'
              }`}
            >
              {row.done && (
                <span className="ob-check flex">
                  <Icon name="check" className="h-5 w-5" />
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-bold">{row.name}</span>
                <span className="shrink-0 text-xs font-semibold text-muted">{row.meta}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/70">
                <div
                  className={`ob-fill h-full rounded-full ${row.done ? 'bg-good' : 'bg-brand'}`}
                  style={{ ...d(500 + i * 160), width: `${row.pct}%`, '--to': `${row.pct}%` } as CSSProperties}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="ob-pop absolute -bottom-4 -right-3 btn-fab h-12 w-12 animate-float" style={d(700)} aria-hidden="true">
        <Icon name="plus" className="h-6 w-6" />
      </span>
    </Frame>
  )
}

// ---------- 2. XP y niveles ----------
function XpScene() {
  const levels = [
    { label: 'Fácil', xp: 10 },
    { label: 'Media', xp: 20 },
    { label: 'Difícil', xp: 30 },
  ]
  return (
    <Frame>
      <div className="flex items-center gap-3">
        <span className="ob-pop flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-2xl font-extrabold text-accent-ink" style={d(150)}>
          3
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex justify-between text-xs font-semibold text-muted">
            <span>Nivel 3</span>
            <span>Nivel 4</span>
          </div>
          <div className="relative h-3.5 overflow-hidden rounded-full bg-surface-2">
            <div className="ob-fill h-full rounded-full bg-accent" style={{ ...d(400), width: '82%', '--from': '30%', '--to': '82%' } as CSSProperties} />
          </div>
        </div>
      </div>
      <div className="relative mt-7 grid grid-cols-3 gap-2">
        {levels.map((level, i) => (
          <div key={level.label} className="ob-up relative rounded-2xl bg-surface-2 px-2 py-3 text-center" style={d(500 + i * 120)}>
            <span className="ob-float-xp pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-xs font-extrabold text-[#3d2a00]" style={d(900 + i * 500)}>
              +{level.xp} XP
            </span>
            <span className="block text-xs font-semibold text-muted">{level.label}</span>
            <span className="block text-lg font-extrabold text-accent-ink">{level.xp} XP</span>
          </div>
        ))}
      </div>
      <p className="ob-up mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-good-soft py-2 text-sm font-bold text-good-ink" style={d(950)}>
        <Icon name="bolt" className="h-4 w-4" /> Día completo: +20 XP
      </p>
    </Frame>
  )
}

// ---------- 3. Rachas ----------
function StreaksScene() {
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  return (
    <Frame>
      <div className="flex items-center gap-4">
        <div className="ob-pop shrink-0" style={d(150)}>
          <Flame days={12} size={92} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-extrabold leading-none">12 días</p>
          <p className="mt-1 text-sm font-semibold text-muted">de racha</p>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-ink">
            ❄️ 2 congelaciones al mes
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-between gap-1.5">
        {days.map((day, i) => (
          <span
            key={day}
            className="ob-light flex h-9 flex-1 items-center justify-center rounded-xl text-xs font-extrabold"
            style={{ ...d(300 + i * 260), background: 'var(--good)', color: '#fff' }}
          >
            {day}
          </span>
        ))}
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-muted">Cada día con el 70 % de tus hábitos hecho, suma</p>
    </Frame>
  )
}

// ---------- 4. Amigos y retos ----------
function Bubble({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface text-lg font-extrabold shadow-card ${tone}`}>
      {label}
    </span>
  )
}

function FriendsScene() {
  return (
    <Frame>
      <div className="relative flex items-center justify-between px-2">
        <div className="ob-pop flex flex-col items-center gap-1" style={d(150)}>
          <Bubble label="Tú" tone="bg-brand text-on-brand" />
        </div>
        <svg viewBox="0 0 120 20" className="mx-1 h-5 flex-1" aria-hidden="true">
          <line x1="2" y1="10" x2="118" y2="10" stroke="var(--brand-edge)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 10" className="ob-dash" />
        </svg>
        <span className="ob-pop absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-[#3d2a00] shadow-card" style={d(450)}>
          <Icon name="bolt" className="h-5 w-5" />
        </span>
        <div className="ob-pop flex flex-col items-center gap-1" style={d(300)}>
          <Bubble label="A" tone="bg-accent-soft text-accent-ink" />
        </div>
      </div>
      <div className="ob-up mt-4 rounded-2xl bg-surface-2 p-3" style={d(550)}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-extrabold">Reto en equipo · 20 km</span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">1 semana</span>
        </div>
        {[
          { who: 'Tú', to: '78%', tone: 'bg-brand', delay: 700 },
          { who: 'A', to: '64%', tone: 'bg-accent', delay: 850 },
        ].map((bar) => (
          <div key={bar.who} className="mt-1.5 flex items-center gap-2">
            <span className="w-6 text-xs font-bold text-muted">{bar.who}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line/70">
              <div className={`ob-race h-full rounded-full ${bar.tone}`} style={{ ...d(bar.delay), width: bar.to, '--to': bar.to } as CSSProperties} />
            </div>
          </div>
        ))}
      </div>
      <p className="ob-up mt-3 flex items-center justify-center gap-2 text-xs font-bold text-muted" style={d(800)}>
        Tu código de amigo
        <span className="rounded-lg border-2 border-dashed border-brand-edge px-2 py-0.5 font-mono tracking-[0.2em] text-brand-ink">••••••</span>
      </p>
    </Frame>
  )
}

// ---------- 5. Logros ----------
function RewardsScene() {
  const badges = [
    { metric: 'habits_done', rarity: 'common' as const },
    { metric: 'best_streak', rarity: 'special' as const },
    { metric: 'level', rarity: 'legendary' as const },
    { metric: 'friends', rarity: 'epic' as const },
  ]
  return (
    <Frame>
      <div className="relative grid grid-cols-4 place-items-center gap-2">
        {badges.map((badge, i) => (
          <div key={badge.metric} className="ob-pop" style={d(150 + i * 140)}>
            <div className={badge.rarity === 'legendary' ? 'ob-glow-badge' : ''}>
              <BadgeArt metric={badge.metric} rarity={badge.rarity} locked={i === 3} size={56} />
            </div>
          </div>
        ))}
        <Sparkle className="-top-2 left-[55%]" delay={300} />
        <Sparkle className="bottom-0 left-[44%] h-3.5 w-3.5" delay={1100} />
      </div>
      <div className="ob-up mt-4 flex items-center gap-3 rounded-2xl bg-accent-soft p-3" style={d(800)}>
        <span className="ticket-shine flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-2xl shadow-card">🎟️</span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-accent-ink">Ticket de cápsula</p>
          <p className="text-xs font-semibold text-muted">Cada 7 días cumplidos · skin misteriosa</p>
        </div>
      </div>
    </Frame>
  )
}

// ---------- 6. Perfil (con TU avatar de verdad) ----------
const DEMO_FRAMES = ['frame_teal', 'frame_flame', 'frame_gold', null]

function ProfileScene() {
  const profile = useProfile()
  const progress = useProgress()
  const streak = progress.data?.current_streak ?? 0
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setFrame((value) => (value + 1) % DEMO_FRAMES.length), 1600)
    return () => window.clearInterval(timer)
  }, [])
  const name = profile.data?.display_name ?? 'Tú'
  return (
    <Frame label="Así se verá">
      <div className="flex items-center gap-4">
        <div className="ob-pop relative" style={d(150)}>
          <ProfileAvatar
            name={name}
            photo={profile.data?.avatar_path}
            color={profile.data?.avatar_color}
            frame={DEMO_FRAMES[frame]}
            size={84}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-extrabold">{name}</p>
          {profile.data && <p className="truncate text-sm text-muted">@{profile.data.username}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {progress.data && (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-ink">Nivel {progress.data.level}</span>
            )}
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted">
              {streak > 0 ? `🔥 ${streak} ${streak === 1 ? 'día' : 'días'} de racha` : 'Tu racha empieza hoy'}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
        {[
          { icon: 'chart' as const, label: 'Estadísticas' },
          { icon: 'camera' as const, label: 'Tu foto' },
          { icon: 'lock' as const, label: 'Privacidad' },
        ].map((item, i) => (
          <span key={item.label} className="ob-up flex flex-col items-center gap-1 rounded-2xl bg-surface-2 py-3 text-muted" style={d(450 + i * 120)}>
            <Icon name={item.icon} className="h-5 w-5 text-brand-ink" />
            {item.label}
          </span>
        ))}
      </div>
    </Frame>
  )
}

export function TourScene({ id }: { id: StepId }) {
  switch (id) {
    case 'habits':
      return <HabitsScene />
    case 'xp':
      return <XpScene />
    case 'streaks':
      return <StreaksScene />
    case 'friends':
      return <FriendsScene />
    case 'rewards':
      return <RewardsScene />
    case 'profile':
      return <ProfileScene />
  }
}
