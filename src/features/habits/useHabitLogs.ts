import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { applyDelta } from './dayRules'
import type { LogRow } from './dayRules'
import type { Habit } from './habitRules'

type RawLog = { habit_id: string; local_date: string; value: number | string }

// Registros de todos tus hábitos entre dos fechas (ambas incluidas). Las políticas RLS dejan pasar solo los tuyos.
export function useHabitLogs(from: string, to: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['habit-logs', user?.id, from, to],
    enabled: Boolean(user),
    queryFn: async (): Promise<LogRow[]> => {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('habit_id, local_date, value')
        .gte('local_date', from)
        .lte('local_date', to)
      if (error) throw error
      // Postgres puede devolver los decimales (numeric) como texto: los pasamos a número
      return ((data ?? []) as RawLog[]).map((row) => ({
        habit_id: row.habit_id,
        local_date: row.local_date,
        value: Number(row.value),
      }))
    },
  })
}

export type ProgressChange = {
  habit: Habit
  date: string // el día que se ve en pantalla (solo para actualizar la pantalla al instante)
  dayOffset: 0 | -1 // 0 = hoy, -1 = ayer: es lo único que se manda; la fecha real la calcula el servidor
  delta: number // +1 / -1 en sí/no; +N / -N en numéricos
}

// Marca, desmarca o suma progreso. La pantalla se actualiza AL INSTANTE (UI optimista)
// y, si el servidor lo rechaza, vuelve a como estaba.
export function useAddProgress(from: string, to: string, onXp?: (xpDelta: number, change: ProgressChange) => void) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const key = ['habit-logs', user?.id, from, to]

  return useMutation({
    mutationKey: ['add-progress'],
    mutationFn: async ({ habit, dayOffset, delta }: ProgressChange) => {
      const { data, error } = await supabase.rpc('add_habit_progress', {
        p_habit_id: habit.id,
        p_delta: delta,
        p_day_offset: dayOffset,
      })
      if (error) throw error
      // La función devuelve una tabla de 1 fila; xp_delta = XP que este toque ha ganado (o quitado)
      const row = (Array.isArray(data) ? data[0] : data) as { xp_delta?: number | string } | null | undefined
      const xpDelta = Number(row?.xp_delta ?? 0)
      return Number.isFinite(xpDelta) ? xpDelta : 0
    },
    onSuccess: (xpDelta, change) => {
      onXp?.(xpDelta, change)
    },
    onMutate: async ({ habit, date, delta }) => {
      await queryClient.cancelQueries({ queryKey: ['habit-logs', user?.id] })
      const previous = queryClient.getQueryData<LogRow[]>(key)
      queryClient.setQueryData<LogRow[]>(key, (current) => applyDelta(current ?? [], habit, date, delta))
      return { previous }
    },
    onError: (_error, _change, context) => {
      queryClient.setQueryData<LogRow[]>(key, context?.previous)
    },
    onSettled: () => {
      // Si el usuario pulsa varias veces seguidas, solo releemos del servidor al terminar la última
      if (queryClient.isMutating({ mutationKey: ['add-progress'] }) === 1) {
        void queryClient.invalidateQueries({ queryKey: ['habit-logs', user?.id] })
        void queryClient.invalidateQueries({ queryKey: ['progress', user?.id] })
        void queryClient.invalidateQueries({ queryKey: ['shared-streaks', user?.id] }) // el fuego se actualiza al momento
      }
    },
  })
}
