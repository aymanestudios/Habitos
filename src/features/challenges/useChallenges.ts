import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { buildChallenges } from './challengeRules'
import type { Challenge } from './challengeRules'

export function useChallenges(enabled: boolean) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['challenges', user?.id],
    enabled: Boolean(user) && enabled,
    queryFn: async (): Promise<Challenge[]> => {
      const { data, error } = await supabase.rpc('get_my_challenges')
      if (error) throw error
      return buildChallenges(data)
    },
  })
}

function useRefreshChallenges() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return () => queryClient.invalidateQueries({ queryKey: ['challenges', user?.id] })
}

export function useCreateChallenge() {
  const refresh = useRefreshChallenges()
  return useMutation({
    mutationFn: async ({ friendId, target }: { friendId: string; target: number }) => {
      const { error } = await supabase.rpc('create_challenge', { p_friend: friendId, p_target: target })
      if (error) throw error
    },
    onSettled: refresh,
  })
}

export function useCancelChallenge() {
  const refresh = useRefreshChallenges()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_challenge', { p_id: id })
      if (error) throw error
    },
    onSettled: refresh,
  })
}
