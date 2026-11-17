// Reglas puras de las publicaciones de hábitos (0012_photos.sql).

export type PostVisibility = 'private' | 'friends'

export type HabitPost = {
  id: string
  habit_id: string
  local_date: string
  photo_path: string
  caption: string | null
  visibility: PostVisibility
  created_at: string
}

export const CAPTION_MAX = 200

export const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; hint: string }[] = [
  { value: 'friends', label: 'Mis amigos', hint: 'Saldrá en su actividad con el nombre del hábito.' },
  { value: 'private', label: 'Solo yo', hint: 'Un recuerdo privado: solo lo ves tú.' },
]

/** ¿Este toque completa el hábito? (para ofrecer "¿Quieres compartir tu progreso?") */
export function completesHabit(value: number, delta: number, target: number | null): boolean {
  const goal = target ?? 1
  return value < goal && value + delta >= goal
}

export function cleanCaption(caption: string): string | null {
  const trimmed = caption.trim()
  return trimmed === '' ? null : trimmed.slice(0, CAPTION_MAX)
}

export function friendlyPostError(message: string): string {
  if (message.includes('not_completed')) return 'Primero marca el hábito como hecho.'
  if (message.includes('photo_not_found')) return 'La foto no llegó a subirse. Inténtalo otra vez.'
  if (message.includes('caption_too_long')) return `El comentario puede tener como máximo ${CAPTION_MAX} caracteres.`
  if (message.includes('habit_not_found')) return 'Ese hábito ya no existe.'
  if (/mime|type/i.test(message)) return 'Ese formato no está permitido. Usa JPG, PNG o WebP.'
  if (/size|large|exceed/i.test(message)) return 'La foto pesa demasiado. Prueba con otra.'
  if (/habit_posts|publish_habit_post|schema cache/i.test(message)) return 'Falta ejecutar la migración 0012_photos.sql en Supabase.'
  if (/abrir|navegador|preparar/i.test(message)) return message
  return 'No se pudo publicar. Revisa la conexión e inténtalo otra vez.'
}
