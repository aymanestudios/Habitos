import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { buildActivity, buildOverview, cleanCode } from './friendRules'
import type { ActivityItem, FriendsOverview, Reaction } from './friendRules'

// Mi código, solicitudes y ranking. Todo lo calcula el servidor (get_friends_overview).
export function useFriends() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['friends', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<FriendsOverview> => {
      const { data, error } = await supabase.rpc('get_friends_overview')
      if (error) throw error
      return buildOverview(data)
    },
  })
}

function useRefreshFriends() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return () => queryClient.invalidateQueries({ queryKey: ['friends', user?.id] })
}

export function useSendFriendRequest() {
  const refresh = useRefreshFriends()
  return useMutation({
    mutationFn: async (code: string): Promise<{ name: string; status: string }> => {
      const { data, error } = await supabase.rpc('send_friend_request', { p_code: cleanCode(code) })
      if (error) throw error
      const row = (Array.isArray(data) ? data[0] : data) as { friend_name?: string; status?: string } | null
      return { name: row?.friend_name ?? 'tu amigo', status: row?.status ?? 'pending' }
    },
    onSuccess: refresh,
  })
}

export function useRespondFriendRequest() {
  const refresh = useRefreshFriends()
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_friend_request', { p_id: id, p_accept: accept })
      if (error) throw error
    },
    onSettled: refresh,
  })
}

// Quita un amigo o cancela una solicitud que enviaste.
export function useRemoveFriend() {
  const refresh = useRefreshFriends()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('remove_friend', { p_id: id })
      if (error) throw error
    },
    onSettled: refresh,
  })
}

// Lo que han hecho tus amigos en los últimos 7 días (get_friend_activity).
export function useFriendActivity(enabled: boolean) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['friend-activity', user?.id],
    enabled: Boolean(user) && enabled,
    queryFn: async (): Promise<ActivityItem[]> => {
      const { data, error } = await supabase.rpc('get_friend_activity')
      if (error) throw error
      return buildActivity(data)
    },
  })
}

// Pone, cambia o quita (mismo emoji otra vez) tu reacción a un evento de un amigo.
export function useReact() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ eventId, emoji }: { eventId: string; emoji: Reaction }) => {
      const { error } = await supabase.rpc('react_to_activity', { p_event: eventId, p_emoji: emoji })
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['friend-activity', user?.id] }),
  })
}
