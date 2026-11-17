import type { IconName } from '@/components/Icon'

// Las 5 secciones principales (las mismas en móvil y escritorio).
// Recordatorios vive dentro de Hábitos y Estadísticas dentro de Perfil (ver app/routes.tsx).
export type NavItem = { to: string; label: string; icon: IconName; end?: boolean }

export const navItems: NavItem[] = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/habitos', label: 'Hábitos', icon: 'habits' },
  { to: '/amigos', label: 'Amigos', icon: 'friends' },
  { to: '/logros', label: 'Logros', icon: 'trophy' },
  { to: '/perfil', label: 'Perfil', icon: 'profile' },
]
