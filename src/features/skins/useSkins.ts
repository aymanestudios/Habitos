import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { buildCapsuleResult, buildSkinState, equippedSkin } from './skinRules'
import type { CapsuleResult, Skin, SkinState } from './skinRules'

export function useMySkins() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['skins', user?.id],
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: async (): Promise<SkinState> => {
      const { data, error } = await supabase.rpc('get_my_skins')
      if (error) throw error
      return buildSkinState(data)
    },
  })
}

/** La skin equipada (tu compañero), o null si no tienes ninguna / aún no ha cargado. */
export function useEquippedSkin(): Skin | null {
  const skins = useMySkins()
  return equippedSkin(skins.data)
}

function useRefreshSkins() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['skins', user?.id] })
    void queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
  }
}

// Abrir la cápsula: el servidor gasta el ticket y elige la skin.
export function useOpenCapsule() {
  const refresh = useRefreshSkins()
  return useMutation({
    mutationFn: async (): Promise<CapsuleResult> => {
      const { data, error } = await supabase.rpc('open_skin_capsule')
      if (error) throw error
      return buildCapsuleResult(data)
    },
    onSettled: refresh,
  })
}

export function useEquipSkin() {
  const refresh = useRefreshSkins()
  return useMutation({
    mutationFn: async (skinId: string | null) => {
      const { error } = await supabase.rpc('equip_skin', { p_skin: skinId })
      if (error) throw error
    },
    onSettled: refresh,
  })
}
