import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { buildWeekRecap } from './homeRules'
import type { WeekRecap } from './homeRules'

export type TodayGlance = { xpToday: number; daysAway: number | null }

// XP de hoy y días sin entrar (get_today_glance, 0017)
export function useTodayGlance() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['glance', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<TodayGlance> => {
      const { data, error } = await supabase.rpc('get_today_glance')
      if (error) throw error
      const row = (data ?? {}) as { xp_today?: number; days_away?: number | null }
      return { xpToday: Number(row.xp_today ?? 0), daysAway: row.days_away ?? null }
    },
  })
}

// Resumen de la última semana completa (get_week_recap, 0017)
export function useWeekRecap() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['week-recap', user?.id],
    enabled: Boolean(user),
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<WeekRecap | null> => {
      const { data, error } = await supabase.rpc('get_week_recap')
      if (error) throw error
      return buildWeekRecap(data)
    },
  })
}
