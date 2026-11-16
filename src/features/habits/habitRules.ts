// Reglas de los hábitos: tipos, textos y validación del formulario.
// Es TypeScript "puro" (sin React) para que sea fácil de entender y de probar.

export type FrequencyType = 'daily' | 'days_of_week' | 'weekly_count' | 'weekly_total'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Visibility = 'private' | 'friends'
export type Category = 'health' | 'sport' | 'study' | 'mind' | 'work' | 'home' | 'social' | 'other'

// Un hábito tal como lo devuelve la base de datos (tabla habits)
export type Habit = {
  id: string
  title: string
  description: string | null
  frequency_type: FrequencyType
  days_of_week: number[] | null // 1 = lunes ... 7 = domingo
  weekly_target: number | null
  target_value: number | null
  unit: string | null
  difficulty: Difficulty
  visibility: Visibility
  category: Category
  start_date: string
  end_date: string | null
  archived_at: string | null
  created_at: string
}

// Lo que enviamos a la base de datos al crear o editar (solo las columnas permitidas)
export type HabitPayload = {
  title: string
  description: string | null
  frequency_type: FrequencyType
  days_of_week: number[] | null
  weekly_target: number | null
  target_value: number | null
  unit: string | null
  difficulty: Difficulty
  visibility: Visibility
  category: Category
  end_date: string | null
}

// Cambios al editar: el formulario completo, o solo archivar / restaurar
export type HabitChanges = Partial<HabitPayload> & { archived_at?: string | null }

// Lo que hay escrito en el formulario (todo en texto o números simples)
export type HabitFormValues = {
  title: string
  description: string
  frequencyType: FrequencyType
  days: number[]
  weeklyTarget: number
  targetValue: string
  unit: string
  difficulty: Difficulty
  visibility: Visibility
  category: Category
  endDate: string
}

export const TITLE_MAX = 60
export const DESCRIPTION_MAX = 200
export const UNIT_MAX = 20
export const TARGET_MAX = 100000

export const FREQUENCY_OPTIONS: { value: FrequencyType; label: string }[] = [
  { value: 'daily', label: 'Cada día' },
  { value: 'days_of_week', label: 'Días concretos' },
  { value: 'weekly_count', label: 'Veces por semana' },
  { value: 'weekly_total', label: 'Total semanal' },
]

export const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Media' },
  { value: 'hard', label: 'Difícil' },
]

export const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'private', label: 'Solo yo' },
  { value: 'friends', label: 'Mis amigos' },
]

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'health', label: 'Salud' },
  { value: 'sport', label: 'Deporte' },
  { value: 'study', label: 'Estudio' },
  { value: 'mind', label: 'Mente' },
  { value: 'work', label: 'Trabajo' },
  { value: 'home', label: 'Casa' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Otro' },
]

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<Category, string>

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
}

// Posición 0 = lunes (día 1) ... posición 6 = domingo (día 7)
export const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export const emptyHabitForm: HabitFormValues = {
  title: '',
  description: '',
  frequencyType: 'daily',
  days: [1, 2, 3, 4, 5],
  weeklyTarget: 3,
  targetValue: '',
  unit: '',
  difficulty: 'medium',
  visibility: 'private',
  category: 'other',
  endDate: '',
}

// Convierte un hábito guardado en los valores del formulario (para editarlo)
export function habitToForm(habit: Habit): HabitFormValues {
  return {
    title: habit.title,
    description: habit.description ?? '',
    frequencyType: habit.frequency_type,
    days: habit.days_of_week ?? emptyHabitForm.days,
    weeklyTarget: habit.weekly_target ?? emptyHabitForm.weeklyTarget,
    targetValue: habit.target_value === null ? '' : String(habit.target_value).replace('.', ','),
    unit: habit.unit ?? '',
    difficulty: habit.difficulty,
    visibility: habit.visibility,
    category: habit.category ?? 'other',
    endDate: habit.end_date ?? '',
  }
}

// Acepta "8", "2,5" o "2.5". Devuelve null si está vacío y NaN si no es un número.
function parseTarget(text: string): number | null {
  const clean = text.trim().replace(',', '.')
  if (clean === '') return null
  const value = Number(clean)
  return Number.isFinite(value) ? value : Number.NaN
}

// Devuelve un mensaje de error en español, o null si el formulario es válido.
// startDate: primer día del hábito (para comprobar que la fecha límite no es anterior).
export function validateHabitForm(values: HabitFormValues, startDate: string): string | null {
  const title = values.title.trim()
  if (title.length < 1) return 'Ponle un nombre al hábito.'
  if (title.length > TITLE_MAX) return `El nombre admite como máximo ${TITLE_MAX} caracteres.`
  if (values.description.trim().length > DESCRIPTION_MAX)
    return `La descripción admite como máximo ${DESCRIPTION_MAX} caracteres.`

  if (values.frequencyType === 'days_of_week' && values.days.length === 0)
    return 'Elige al menos un día de la semana.'
  if (
    values.frequencyType === 'weekly_count' &&
    (!Number.isInteger(values.weeklyTarget) || values.weeklyTarget < 1 || values.weeklyTarget > 7)
  )
    return 'Las veces por semana deben estar entre 1 y 7.'

  const target = parseTarget(values.targetValue)
  if (Number.isNaN(target)) return 'El objetivo debe ser un número, por ejemplo 8 o 2,5.'
  if (target !== null && target <= 0) return 'El objetivo debe ser mayor que 0.'
  if (target !== null && target > TARGET_MAX) return `El objetivo no puede superar ${TARGET_MAX}.`
  if (values.frequencyType === 'weekly_total' && target === null)
    return 'El total semanal necesita un objetivo numérico.'
  if (values.unit.trim().length > UNIT_MAX)
    return `La unidad admite como máximo ${UNIT_MAX} caracteres.`

  if (values.endDate && values.endDate < startDate)
    return 'La fecha límite no puede ser anterior al inicio del hábito.'

  return null
}

// Convierte el formulario (ya validado) en lo que se envía a la base de datos.
// No enviamos user_id ni start_date: los decide el servidor.
export function formToPayload(values: HabitFormValues): HabitPayload {
  const target = parseTarget(values.targetValue)
  const hasTarget = target !== null && !Number.isNaN(target)
  const unit = values.unit.trim()

  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    frequency_type: values.frequencyType,
    days_of_week:
      values.frequencyType === 'days_of_week'
        ? [...new Set(values.days)].sort((a, b) => a - b)
        : null,
    weekly_target: values.frequencyType === 'weekly_count' ? values.weeklyTarget : null,
    target_value: hasTarget ? target : null,
    unit: hasTarget && unit ? unit : null,
    difficulty: values.difficulty,
    visibility: values.visibility,
    category: values.category,
    end_date: values.endDate || null,
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value)
}

function quantity(value: number, unit: string | null): string {
  return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value)
}

// Texto de la frecuencia: "Lunes a viernes", "3 veces por semana", "30 km por semana"...
export function frequencyLabel(habit: Habit): string {
  switch (habit.frequency_type) {
    case 'daily':
      return 'Todos los días'
    case 'days_of_week': {
      const days = [...new Set(habit.days_of_week ?? [])].sort((a, b) => a - b)
      const key = days.join(',')
      if (key === '1,2,3,4,5,6,7') return 'Todos los días'
      if (key === '1,2,3,4,5') return 'Lunes a viernes'
      if (key === '6,7') return 'Fines de semana'
      return days.map((day) => DAY_SHORT[day - 1]).join(', ')
    }
    case 'weekly_count': {
      const times = habit.weekly_target ?? 1
      return `${times} ${times === 1 ? 'vez' : 'veces'} por semana`
    }
    case 'weekly_total':
      return `${quantity(habit.target_value ?? 0, habit.unit)} por semana`
  }
}

// Texto del objetivo numérico: "Meta: 8 vasos al día". Vacío si no hay objetivo.
export function targetLabel(habit: Habit): string {
  if (habit.target_value === null || habit.frequency_type === 'weekly_total') return ''
  const when = habit.frequency_type === 'weekly_count' ? 'cada vez' : 'al día'
  return `Meta: ${quantity(habit.target_value, habit.unit)} ${when}`
}

// Línea de resumen que se ve bajo el título en las listas
export function habitMeta(habit: Habit): string {
  return [frequencyLabel(habit), targetLabel(habit)].filter(Boolean).join(' · ')
}

// Los errores de Supabase no siempre son de tipo Error, así que sacamos el mensaje con cuidado.
export function errorMessage(caught: unknown): string {
  if (typeof caught === 'object' && caught !== null && 'message' in caught) {
    return String((caught as { message: unknown }).message)
  }
  return typeof caught === 'string' ? caught : ''
}

// Traduce los errores de la base de datos a algo que se entienda.
export function friendlyHabitError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('habits_title_length')) return `El nombre debe tener entre 1 y ${TITLE_MAX} caracteres.`
  if (text.includes('habits_end_after_start'))
    return 'La fecha límite no puede ser anterior al inicio del hábito.'
  if (text.includes('habits_frequency_shape'))
    return 'La frecuencia elegida no es válida. Revisa los días, las veces por semana o el objetivo.'
  if (text.includes('habits_target_positive')) return 'El objetivo debe ser mayor que 0.'
  if (
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('could not find the table')
  )
    return 'Falta crear la tabla de hábitos. ¿Has ejecutado la migración 0002_habits.sql en Supabase?'
  if (text.includes('failed to fetch') || text.includes('network'))
    return 'No se pudo conectar con Supabase. Revisa .env.local y tu conexión.'
  return message || 'Algo ha salido mal. Inténtalo de nuevo.'
}

// Traduce los errores de add_habit_progress (0003_habit_logs.sql) a algo que se entienda.
export function friendlyProgressError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('habit_archived')) return 'Ese hábito está archivado.'
  if (text.includes('before_start')) return 'Ese día es anterior al inicio del hábito.'
  if (text.includes('after_end')) return 'El hábito ya había terminado ese día.'
  if (text.includes('not_scheduled')) return 'Ese hábito no toca ese día.'
  if (text.includes('day_not_allowed')) return 'Solo se puede marcar hoy y ayer.'
  if (text.includes('habit_not_found')) return 'No se encontró el hábito.'
  if (text.includes('not_authenticated') || text.includes('jwt')) return 'Tu sesión ha caducado. Vuelve a entrar.'
  if (text.includes('add_habit_progress') || text.includes('habit_logs'))
    return 'No se pudo guardar. ¿Has ejecutado la migración 0003_habit_logs.sql en Supabase?'
  if (text.includes('failed to fetch') || text.includes('network')) return 'No hay conexión. Inténtalo de nuevo.'
  return 'No se pudo guardar. Inténtalo de nuevo.'
}
