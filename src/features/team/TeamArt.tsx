import type { TeamKind } from './teamRules'

// Iconos propios de cada tipo de reto (trazo redondeado, a juego con components/Icon.tsx)
const PATHS: Record<TeamKind, string> = {
  distance: 'M13.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM9 21l2.2-5.2L14 18v3M7.5 11.5 10 8l3.5 1 2 3 3 .5M10 8l1.2 7.8',
  pages: 'M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5V5.5ZM12 6v13.5',
  minutes: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 9v4l2.5 2M9.5 2.5h5',
  sessions: 'M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11',
  team_habits: 'M4 12.5 8.5 17 20 6.5',
  custom: 'M12 3.5l2.4 5 5.4.6-4 3.7 1.1 5.4L12 15.5l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6L12 3.5Z',
}

export function TeamKindIcon({ kind, className = 'h-5 w-5' }: { kind: TeamKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[kind]} />
    </svg>
  )
}

/** Barra conjunta repartida: tu parte (turquesa) y la de tu compañero (dorado). Se rellena suave. */
export function SplitBar({ mine, theirs, className = 'h-3' }: { mine: number; theirs: number; className?: string }) {
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-surface-2 ${className}`} aria-hidden="true">
      <span className="h-full bg-brand transition-[width] duration-700 ease-out" style={{ width: `${mine}%` }} />
      <span className="h-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${theirs}%` }} />
    </div>
  )
}
