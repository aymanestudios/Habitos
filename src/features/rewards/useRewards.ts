import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { buildRewards } from './rewardRules'
import type { Equipment, Reward } from './rewardRules'

export function useMyRewards() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['rewards', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Reward[]> => {
      const { data, error } = await supabase.rpc('get_my_rewards')
      if (error) throw error
      return buildRewards(data)
    },
  })
}

// Guardar lo equipado: el servidor comprueba que todo está desbloqueado.
export function useEquip() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (equipment: Equipment) => {
      const { error } = await supabase.rpc('equip_rewards', {
        p_frame: equipment.frame,
        p_accessory: equipment.accessory,
        p_effect: equipment.effect,
        p_badges: equipment.badges,
      })
      if (error) throw error
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['rewards', user?.id] })
      void queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      void queryClient.invalidateQueries({ queryKey: ['friend-profile'] })
    },
  })
}
