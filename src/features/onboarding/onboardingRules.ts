// Tutorial de bienvenida: textos y reglas (sin React, se pueden probar solos).
// Todo lo que se explica aquí EXISTE en la app; si una función cambia, cambia también su paso.

import type { MascotPose } from '@/components/Mascot'

export type StepId = 'habits' | 'xp' | 'streaks' | 'friends' | 'rewards' | 'profile'

export type TourStep = {
  id: StepId
  tab: string // cómo se llama la sección en la barra de navegación
  title: string
  says: string // lo que dice el panda (bocadillo)
  points: string[] // 2-3 ideas cortas
  pose: MascotPose
  side: 'left' | 'right' // dónde se coloca el panda
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'habits',
    tab: 'Hábitos',
    title: 'Tus hábitos',
    says: '¡Empezamos por lo más importante! Crea tus hábitos y avanza poco a poco. ¡Cada pequeño paso cuenta!',
    points: ['Cada día, unos días o X veces por semana', 'Con meta de número: vasos, páginas, minutos…', 'Márcalos en Inicio y pon recordatorios'],
    pose: 'gym',
    side: 'left',
  },
  {
    id: 'xp',
    tab: 'Inicio',
    title: 'XP y niveles',
    says: 'Cada vez que cumples un hábito ganas experiencia. ¡Cuanto más avances, más subirás de nivel!',
    points: ['Fácil 10 XP · Media 20 · Difícil 30', '+20 XP extra si completas todo el día', 'Cada nivel pide un poco más que el anterior'],
    pose: 'star',
    side: 'right',
  },
  {
    id: 'streaks',
    tab: 'Inicio',
    title: 'Rachas y constancia',
    says: 'La constancia es la clave. Mantén tus hábitos y construye tu racha. ¡Y también puedes compartirla con un amigo!',
    points: ['Un día cuenta si haces el 70 % de tus hábitos', '2 congelaciones al mes por si un día falla', 'Racha compartida: un fuego que crece entre los dos'],
    pose: 'default',
    side: 'left',
  },
  {
    id: 'friends',
    tab: 'Amigos',
    title: 'Amigos y retos',
    says: '¡Esto es todavía más divertido acompañado! Añade amigos, mira sus progresos y motivaos mutuamente.',
    points: ['Añádelos con tu código de amigo', 'Retos relámpago de unos días entre los dos', 'Comparte fotos de tus hábitos (si quieres)'],
    pose: 'laptop',
    side: 'right',
  },
  {
    id: 'rewards',
    tab: 'Logros',
    title: 'Logros y recompensas',
    says: '¡Hay muchas cosas por conseguir! Cumple objetivos, alcanza nuevos hitos y desbloquea recompensas.',
    points: ['Insignias, marcos, accesorios y efectos', 'Cada 7 días cumplidos: un ticket de cápsula', 'Dentro hay una skin sorpresa para tu panda'],
    pose: 'star',
    side: 'left',
  },
  {
    id: 'profile',
    tab: 'Perfil',
    title: 'Tu perfil',
    says: 'Este es tu espacio. Mira cómo vas progresando y personalízalo para hacerlo tuyo.',
    points: ['Tu nivel, tus rachas y tus estadísticas', 'Foto, colores, frase y tema claro u oscuro', 'Tú decides qué ven tus amigos'],
    pose: 'default',
    side: 'right',
  },
]

// Pantallas del recorrido: bienvenida, los pasos y el final
export const TOTAL_SCREENS = TOUR_STEPS.length + 2
export const LAST_SCREEN = TOTAL_SCREENS - 1

export function clampScreen(index: number): number {
  return Math.min(Math.max(index, 0), LAST_SCREEN)
}

/** Paso del tutorial que corresponde a una pantalla (null en bienvenida y final). */
export function stepAt(screen: number): TourStep | null {
  return screen >= 1 && screen <= TOUR_STEPS.length ? TOUR_STEPS[screen - 1] : null
}

// ===== Recordar que ya lo has visto =====
// La verdad está en el servidor (profiles.onboarded_at). En el dispositivo guardamos una copia
// para no preguntar en cada recarga y para cerrar al momento aunque no haya conexión:
//   'done'    → el servidor ya lo sabe
//   'pending' → lo has terminado/saltado aquí, pero falta avisar al servidor (se reintenta)
export type LocalMark = 'done' | 'pending' | null

export function storageKey(userId: string): string {
  return `pg-onboarded:${userId}`
}

export function parseMark(value: string | null): LocalMark {
  return value === 'done' || value === 'pending' ? value : null
}

/** ¿Hay que enseñar el tutorial automáticamente? */
export function shouldShowTour(mark: LocalMark, serverOnboardedAt: string | null | undefined): boolean {
  if (mark) return false // en este dispositivo ya se vio o saltó
  if (serverOnboardedAt === undefined) return false // aún no sabemos: no molestamos mientras carga
  return serverOnboardedAt === null
}
