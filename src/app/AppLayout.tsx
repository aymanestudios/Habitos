import { Link, NavLink, Outlet } from 'react-router'
import { Icon } from '@/components/Icon'
import { APP_NAME } from '@/lib/constants'
import { navItems } from './navigation'
import type { NavItem } from './navigation'

// Marco común de todas las pantallas:
// - móvil: barra de pestañas abajo, con el botón "+" en el centro
// - escritorio (md en adelante): barra lateral a la izquierda
// <Outlet /> es el hueco donde React Router pinta la pantalla de cada ruta.

function MobileTab({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors ${
          isActive ? 'text-brand-ink' : 'text-muted'
        }`
      }
    >
      <Icon name={item.icon} />
      {item.label}
    </NavLink>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition-colors ${
          isActive ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'
        }`
      }
    >
      <Icon name={item.icon} />
      {item.label}
    </NavLink>
  )
}

export function AppLayout() {
  const firstTabs = navItems.slice(0, 2)
  const lastTabs = navItems.slice(2)

  return (
    <div className="pt-safe">
      {/* Barra lateral: solo escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <img
            src="/icon-192.png"
            alt=""
            aria-hidden="true"
            width={40}
            height={40}
            className="h-10 w-10 rounded-2xl"
          />
          <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
        </div>

        <nav className="flex flex-col gap-1" aria-label="Principal">
          {navItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>

        <Link
          to="/habitos/nuevo"
          className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 font-semibold text-on-brand transition-transform active:scale-95"
        >
          <Icon name="plus" className="h-5 w-5" />
          Nuevo hábito
        </Link>

        <Link
          to="/estado"
          className="mt-auto px-4 py-2 text-sm text-muted transition-colors hover:text-ink"
        >
          Estado del proyecto
        </Link>
      </aside>

      {/* Contenido de la pantalla actual */}
      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-5xl px-5 pb-32 pt-6 md:px-10 md:pb-12 md:pt-10">
          <Outlet />
        </div>
      </main>

      {/* Barra inferior: solo móvil */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-safe backdrop-blur md:hidden"
        aria-label="Principal"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-center">
          {firstTabs.map((item) => (
            <MobileTab key={item.to} item={item} />
          ))}
          <Link
            to="/habitos/nuevo"
            aria-label="Crear hábito"
            className="-mt-7 flex h-14 w-14 items-center justify-center justify-self-center rounded-full bg-brand text-on-brand shadow-lg shadow-brand/30 transition-transform active:scale-95"
          >
            <Icon name="plus" className="h-7 w-7" />
          </Link>
          {lastTabs.map((item) => (
            <MobileTab key={item.to} item={item} />
          ))}
        </div>
      </nav>
    </div>
  )
}
