import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { buildSharedStreaks } from './sharedStreakRules'
import type { SharedStreak } from './sharedStreakRules'

export function useSharedStreaks(enabled: boolean) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['shared-streaks', user?.id],
    enabled: Boolean(user) && enabled,
    queryFn: async (): Promise<SharedStreak[]> => {
      const { data, error } = await supabase.rpc('get_shared_streaks')
      if (error) throw error
      return buildSharedStreaks(data)
    },
  })
}

function useRefresh() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return () => void queryClient.invalidateQueries({ queryKey: ['shared-streaks', user?.id] })
}

export function useStartSharedStreak() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase.rpc('start_shared_streak', { p_friend: friendId })
      if (error) throw error
    },
    onSettled: refresh,
  })
}

export function useEndSharedStreak() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('end_shared_streak', { p_id: id })
      if (error) throw error
    },
    onSettled: refresh,
  })
}

// "Dar un toque": le llega un aviso al móvil a tu amigo (si tiene los avisos activados).
export function useNudge() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (streakId: string) => {
      const { error } = await supabase.rpc('nudge_partner', { p_streak: streakId })
      if (error) throw error
    },
    onSettled: refresh,
  })
}
