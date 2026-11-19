import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { buildDayRecap } from './dayRecapRules'
import type { DayRecap } from './dayRecapRules'

/** Resumen de un día ya terminado (null = ayer). Una sola consulta pequeña; se guarda 30 min. */
export function useDayRecap(date: string | null, enabled = true) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['day-recap', user?.id, date ?? 'yesterday'],
    enabled: Boolean(user) && enabled,
    staleTime: 30 * 60_000,
    retry: false, // si la migración 0027 aún no está, simplemente no sale
    queryFn: async (): Promise<DayRecap | null> => {
      const { data, error } = await supabase.rpc('get_day_recap', { p_date: date })
      if (error) throw error
      return buildDayRecap(data)
    },
  })
}

/** Marca un día como visto (en el servidor: vale para todos tus dispositivos). */
export function useMarkDayRecapSeen() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (date: string) => {
      const { error } = await supabase.rpc('mark_day_recap_seen', { p_date: date })
      if (error) throw error
    },
    onSuccess: (_data, date) => {
      queryClient.setQueriesData<DayRecap | null>({ queryKey: ['day-recap', user?.id] }, (current) =>
        current && current.date === date ? { ...current, seen: true } : current,
      )
    },
  })
}
