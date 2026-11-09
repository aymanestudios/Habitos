import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { Habit, HabitChanges, HabitPayload } from './habitRules'

const COLUMNS =
  'id, title, description, frequency_type, days_of_week, weekly_target, target_value, unit, difficulty, visibility, start_date, end_date, archived_at, created_at'

// Todos los hábitos del usuario (activos y archivados). Las políticas RLS hacen que solo lleguen los suyos.
export function useHabits() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['habits', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Habit[]> => {
      const { data, error } = await supabase
        .from('habits')
        .select(COLUMNS)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Habit[]
    },
  })
}

// Tras cualquier cambio, volvemos a pedir la lista para que todas las pantallas muestren lo nuevo.
function useRefreshHabits() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return () => queryClient.invalidateQueries({ queryKey: ['habits', user?.id] })
}

export function useCreateHabit() {
  const refresh = useRefreshHabits()

  return useMutation({
    mutationFn: async (payload: HabitPayload) => {
      const { error } = await supabase.from('habits').insert(payload)
      if (error) throw error
    },
    onSuccess: refresh,
  })
}

// Sirve para editar, archivar (archived_at con fecha) y restaurar (archived_at a null).
export function useUpdateHabit() {
  const refresh = useRefreshHabits()

  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: HabitChanges }) => {
      const { data, error } = await supabase.from('habits').update(changes).eq('id', id).select('id')
      if (error) throw error
      // Si RLS no deja tocar la fila, Supabase no da error: simplemente no actualiza nada
      if (!data || data.length === 0) throw new Error('No se pudo guardar: el hábito no existe o no es tuyo.')
    },
    onSuccess: refresh,
  })
}
