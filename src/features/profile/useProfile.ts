import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

export type Profile = {
  id: string
  username: string
  display_name: string
  timezone: string
  avatar_emoji: string | null
  avatar_color: string
  bio: string | null
  avatar_path: string | null
}

// Pide a Supabase el perfil de quien ha entrado. TanStack Query lo guarda en memoria.
// Las políticas RLS garantizan que solo se puede leer el propio perfil.
export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, timezone, avatar_emoji, avatar_color, bio, avatar_path')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export type ProfileStyle = { avatar_emoji: string | null; avatar_color: string; bio: string | null }

// Guarda el emoji, el color y la frase del perfil (0011_profile_style.sql).
export function useUpdateProfileStyle() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (style: ProfileStyle) => {
      const bio = style.bio?.trim() ?? ''
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_emoji: style.avatar_emoji, avatar_color: style.avatar_color, bio: bio === '' ? null : bio })
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      void queryClient.invalidateQueries({ queryKey: ['friends', user?.id] })
    },
  })
}
