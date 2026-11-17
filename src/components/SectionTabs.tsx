import { NavLink } from 'react-router'

type Tab = { to: string; label: string; end?: boolean }

// Pestañas dentro de una sección (p. ej. Hábitos | Recordatorios). Son enlaces: cada una tiene su dirección.
export function SectionTabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 rounded-2xl bg-surface-2 p-1">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex-1 rounded-xl px-3 py-2 text-center text-sm font-bold transition-all ${
              isActive ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

export const HABITS_TABS: Tab[] = [
  { to: '/habitos', label: 'Mis hábitos', end: true },
  { to: '/habitos/recordatorios', label: 'Recordatorios' },
]
