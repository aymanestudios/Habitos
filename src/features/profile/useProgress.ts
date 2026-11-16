import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { normalizeProgress } from './progressRules'
import type { Progress } from './progressRules'

// XP, nivel y racha. Los calcula el servidor (función get_my_progress), que solo devuelve los tuyos.
export function useProgress() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['progress', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Progress> => {
      const { data, error } = await supabase.rpc('get_my_progress')
      if (error) throw error
      return normalizeProgress(data)
    },
  })
}
