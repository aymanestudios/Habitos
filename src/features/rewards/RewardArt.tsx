import { useId } from 'react'
import type { ReactNode } from 'react'
import type { Rarity, RewardKind } from './rewardRules'

// Dibujos de las recompensas (SVG propios, sin emojis): medallas, marcos, accesorios y efectos.
// El color sale de la rareza: común gris, especial turquesa-azul, épico violeta, legendario dorado.

export const RARITY_COLORS: Record<Rarity, [string, string]> = {
  common: ['#94a3b8', '#e2e8f0'],
  special: ['#0ea5e9', '#5eead4'],
  epic: ['#7c3aed', '#e879f9'],
  legendary: ['#f59e0b', '#fef08a'],
}

// Icono de cada insignia según lo que mide
const BADGE_ICON: Record<string, string> = {
  habits_done: 'M8 12.5l3 3 5.5-6.5',
  best_streak: 'M12.6 5c1 2.3 3.8 3.8 3.8 7.4a4.4 4.4 0 0 1-8.8 0c0-1.9 1-3.2 2-4 .1 1.1.6 1.9 1.4 2.3-.3-2.3.3-4.2 1.6-5.7zM12 17.6a1.7 1.7 0 0 1-1.7-1.7c0-1.1.9-1.8 1.4-2.6.3.9 2 1.4 2 2.6a1.7 1.7 0 0 1-1.7 1.7z',
  level: 'M12 5.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L12 15.3l-3.8 2 .7-4.3-3.1-3 4.3-.6z',
  study_done: 'M6 7.5c2-.8 4.2-.6 6 .8 1.8-1.4 4-1.6 6-.8V17c-2-.8-4.2-.6-6 .8-1.8-1.4-4-1.6-6-.8zM12 8.3v9.5',
  sport_done: 'M5 12h14M7 9v6M17 9v6M4.5 10.5v3M19.5 10.5v3',
  health_done: 'M12 17.5s-5.5-3.3-5.5-7a3 3 0 0 1 5.5-1.7 3 3 0 0 1 5.5 1.7c0 3.7-5.5 7-5.5 7z',
  mind_done: 'M12 17.5c-3.5 0-5.5-2.5-5.5-5.5 2.5 0 4.5 1 5.5 3 1-2 3-3 5.5-3 0 3-2 5.5-5.5 5.5zM12 15c-1.2-2-1.2-4.5 0-7.5 1.2 3 1.2 5.5 0 7.5z',
  friends: 'M9.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 16.5a3.5 3.5 0 0 1 7 0M15 11.2a1.8 1.8 0 1 0 0-3.6M14.5 13.4a3.2 3.2 0 0 1 3.5 3.1',
  posts: 'M6.5 9.5h2l1-1.5h5l1 1.5h2v7h-11zM12 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  challenges_won: 'M8 6.5h8v3a4 4 0 0 1-8 0zM12 13.5v3M9.5 17h5M8 7.5H6v1a2 2 0 0 0 2 2M16 7.5h2v1a2 2 0 0 1-2 2',
  shared_best: 'M9.5 7c.5 1.8 2.8 2.9 2.8 5.5a2.8 2.8 0 0 1-5.6 0c0-1.1.5-1.9 1.1-2.4.2.6.5 1 1 1.2-.1-1.6.2-3 .7-4.3zM14.5 9c.4 1.4 2.2 2.3 2.2 4.4a2.2 2.2 0 0 1-4.4.3',
}

export function BadgeArt({ metric, rarity, locked = false, size = 56 }: { metric: string; rarity: Rarity; locked?: boolean; size?: number }) {
  const id = useId().replace(/:/g, '')
  const [a, b] = RARITY_COLORS[rarity]
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={locked ? 'opacity-35 grayscale' : ''}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={b} />
          <stop offset="100%" stopColor={a} />
        </linearGradient>
      </defs>
      {/* Medalla hexagonal con cinta de rareza */}
      <path d="M12 1.5l8.7 5v10L12 21.5l-8.7-5v-10z" fill={`url(#${id}g)`} />
      <path d="M12 3.6l6.9 4v8L12 19.4l-6.9-3.8v-8z" fill="var(--surface)" opacity="0.92" />
      <path
        d={BADGE_ICON[metric] ?? BADGE_ICON.habits_done}
        fill={metric === 'best_streak' || metric === 'level' || metric === 'health_done' ? a : 'none'}
        fillRule="evenodd"
        stroke={a}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {rarity === 'legendary' && !locked && <circle cx="12" cy="1.6" r="1.1" fill="#fff" className="reward-twinkle" />}
    </svg>
  )
}

// --- Accesorios ---
function Crown({ legendary }: { legendary: boolean }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 32 22" className="h-full w-full drop-shadow" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={legendary ? '#a5f3fc' : '#fde68a'} />
          <stop offset="100%" stopColor={legendary ? '#2563eb' : '#d97706'} />
        </linearGradient>
      </defs>
      <path d="M3 19 1.5 5l8 6L16 2l6.5 9 8-6L29 19z" fill={`url(#${id}c)`} stroke={legendary ? '#1e3a8a' : '#92400e'} strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="3" y="17.5" width="26" height="3.5" rx="1.2" fill={legendary ? '#1d4ed8' : '#b45309'} />
      <circle cx="16" cy="12.5" r="2.1" fill={legendary ? '#c4b5fd' : '#ef4444'} />
      <circle cx="8.5" cy="14" r="1.4" fill={legendary ? '#67e8f9' : '#22d3ee'} />
      <circle cx="23.5" cy="14" r="1.4" fill={legendary ? '#67e8f9' : '#22d3ee'} />
    </svg>
  )
}

function SmallBadge({ children }: { children: ReactNode }) {
  return (
    // Fondo claro siempre: los dibujos se leen igual en modo claro y oscuro
    <span
      className="flex h-full w-full items-center justify-center rounded-full border-2 border-surface shadow-card"
      style={{ background: '#fffaf0' }}
    >
      <svg viewBox="0 0 24 24" className="h-[78%] w-[78%]" aria-hidden="true">
        {children}
      </svg>
    </span>
  )
}

export function AccessoryArt({ id }: { id: string }) {
  switch (id) {
    case 'acc_crown':
      return <Crown legendary={false} />
    case 'acc_legend_crown':
      return <Crown legendary />
    case 'acc_carrot':
      return (
        <SmallBadge>
          <path d="M14.5 9.5 6 19.5c-.6.6-1.6-.4-1-1l10-8.5z" fill="#f97316" />
          <path d="M9 14.5l1.5 1M11 12.3l1.4 1.2" stroke="#c2410c" strokeWidth="1" strokeLinecap="round" />
          <path d="M14.5 9.5c.5-2.5 2-4 3.5-4.5-.3 1.6-.5 2.6-1.2 3.5 1.2-.4 2.5-.2 3.7.5-1.4.9-2.7 1.4-4 1.2" fill="#22c55e" />
        </SmallBadge>
      )
    case 'acc_bamboo':
      return (
        <SmallBadge>
          <path d="M11 20V8" stroke="#16a34a" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M9.6 12.5h2.8M9.6 16.5h2.8" stroke="#15803d" strokeWidth="1.2" />
          <path d="M11.5 9c1.5-3 4-4.2 6.5-4-1 2.6-3.3 4.2-6.5 4zM10.5 11c-1.3-2.2-3.3-3-5.5-2.6 1 2 3 3 5.5 2.6z" fill="#4ade80" />
        </SmallBadge>
      )
    case 'acc_headband':
      return (
        <SmallBadge>
          <path d="M4 13c4-4 12-4 16 0v3c-4-4-12-4-16 0z" fill="#fff" stroke="#94a3b8" strokeWidth="0.8" />
          <path d="M4.5 14.2c4-3.4 11-3.4 15 0" stroke="#14b8a6" strokeWidth="1.6" fill="none" />
          <path d="M19.5 14l2 2.5M19.8 15.5l1 3" stroke="#14b8a6" strokeWidth="1.3" strokeLinecap="round" />
        </SmallBadge>
      )
    case 'acc_glasses':
      return (
        <SmallBadge>
          <circle cx="8" cy="13" r="3.4" fill="#e0f2fe" stroke="#1e293b" strokeWidth="1.5" />
          <circle cx="16" cy="13" r="3.4" fill="#e0f2fe" stroke="#1e293b" strokeWidth="1.5" />
          <path d="M11.4 12.6c.4-.5 1.8-.5 1.2 0M4.6 12.2 2.5 11M19.4 12.2l2.1-1.2" stroke="#1e293b" strokeWidth="1.3" strokeLinecap="round" />
        </SmallBadge>
      )
    default:
      return null
  }
}

/** ¿El accesorio va encima de la cabeza (coronas) o como chapita en la esquina? */
export function accessoryOnTop(id: string | null): boolean {
  return id === 'acc_crown' || id === 'acc_legend_crown'
}

// --- Marcos (CSS: degradados alrededor del avatar) ---
export const FRAME_STYLE: Record<string, { background: string; className?: string }> = {
  frame_teal: { background: 'linear-gradient(135deg, #5eead4, #14b8a6)' },
  frame_flame: { background: 'conic-gradient(from 200deg, #fde047, #f97316, #dc2626, #f97316, #fde047)' },
  frame_friends: { background: 'conic-gradient(from 90deg, #14b8a6, #5eead4, #fb923c, #f97316, #14b8a6)' },
  frame_gold: { background: 'conic-gradient(from 0deg, #fef3c7, #f59e0b, #fde68a, #b45309, #fef3c7)' },
  frame_legend: {
    background: 'conic-gradient(from 0deg, #22d3ee, #6366f1, #a78bfa, #06b6d4, #2563eb, #22d3ee)',
    className: 'reward-spin',
  },
}

export function KindPreview({ kind, id, rarity, metric, locked, size = 56 }: {
  kind: RewardKind; id: string; rarity: Rarity; metric: string; locked: boolean; size?: number
}) {
  const dim = locked ? 'opacity-35 grayscale' : ''
  if (kind === 'badge') return <BadgeArt metric={metric} rarity={rarity} locked={locked} size={size} />
  if (kind === 'frame') {
    const frame = FRAME_STYLE[id]
    return (
      <span className={`relative inline-flex items-center justify-center ${dim}`} style={{ width: size, height: size }}>
        <span className={`absolute inset-0 rounded-full ${frame?.className ?? ''}`} style={{ background: frame?.background }} />
        <span className="relative rounded-full bg-surface-2" style={{ width: size - 12, height: size - 12 }} />
      </span>
    )
  }
  if (kind === 'accessory') {
    return (
      <span className={`inline-flex items-center justify-center ${dim}`} style={{ width: size, height: size }}>
        <span style={{ width: size * 0.82, height: accessoryOnTop(id) ? size * 0.6 : size * 0.82 }}>
          <AccessoryArt id={id} />
        </span>
      </span>
    )
  }
  return (
    <span className={`relative inline-flex items-center justify-center ${dim}`} style={{ width: size, height: size }}>
      <EffectLayer id={id} />
      <span className="relative rounded-full bg-surface-2" style={{ width: size * 0.62, height: size * 0.62 }} />
    </span>
  )
}

// --- Efectos (alrededor del avatar) ---
export function EffectLayer({ id }: { id: string | null }) {
  if (id === 'fx_aura') {
    return (
      <span
        className="reward-aura pointer-events-none absolute -inset-[18%] rounded-full blur-md"
        style={{ background: 'radial-gradient(closest-side, #22d3ee, #6366f1 55%, transparent)' }}
        aria-hidden="true"
      />
    )
  }
  if (id === 'fx_sparkles') {
    const spots = [
      { top: '-6%', left: '12%', delay: '0s' },
      { top: '10%', left: '92%', delay: '0.6s' },
      { top: '78%', left: '-4%', delay: '1.1s' },
      { top: '88%', left: '80%', delay: '1.6s' },
    ]
    return (
      <span className="pointer-events-none absolute inset-0" aria-hidden="true">
        {spots.map((spot, index) => (
          <svg key={index} viewBox="0 0 10 10" className="reward-twinkle absolute h-[22%] w-[22%]" style={{ top: spot.top, left: spot.left, animationDelay: spot.delay }}>
            <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4z" fill="#fde68a" />
          </svg>
        ))}
      </span>
    )
  }
  return null
}
