import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { buildFriendProfile } from './friendProfileRules'
import type { FriendProfile } from './friendProfileRules'

export function useFriendProfile(userId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['friend-profile', user?.id, userId],
    enabled: Boolean(user && userId),
    retry: false, // si no sois amigos, no insistimos
    queryFn: async (): Promise<FriendProfile | null> => {
      const { data, error } = await supabase.rpc('get_friend_profile', { p_user: userId })
      if (error) throw error
      return buildFriendProfile(data)
    },
  })
}

// Catálogo de recompensas (nombres, rarezas): es público para usuarios con sesión
export function useRewardCatalog() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['reward-catalog'],
    enabled: Boolean(user),
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('reward_catalog').select('id, kind, rarity, title, description, metric').order('sort')
      if (error) throw error
      return (data ?? []) as { id: string; kind: string; rarity: string; title: string; description: string; metric: string }[]
    },
  })
}
