import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

export type Profile = {
  id: string
  username: string
  display_name: string
  timezone: string
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
        .select('id, username, display_name, timezone')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      return data
    },
  })
}
