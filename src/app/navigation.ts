import type { IconName } from '@/components/Icon'

// Las secciones principales de la app. Móvil y escritorio leen esta misma lista,
// así que para añadir una sección basta con añadirla aquí y crear su ruta.
export type NavItem = { to: string; label: string; icon: IconName; end?: boolean }

export const navItems: NavItem[] = [
  { to: '/', label: 'Hoy', icon: 'home', end: true },
  { to: '/habitos', label: 'Hábitos', icon: 'habits' },
  { to: '/amigos', label: 'Amigos', icon: 'friends' },
  { to: '/perfil', label: 'Perfil', icon: 'profile' },
]
