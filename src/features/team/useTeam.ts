import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { buildTeam } from './teamRules'
import type { TeamChallenge, TeamKind } from './teamRules'

// Retos en equipo (get_my_team_challenges, 0026). Sin tiempo real: se ponen al día al volver a la app,
// al hacer algo y, mientras hay alguno en marcha, cada minuto (una consulta pequeña).
export function useTeamChallenges(enabled = true) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['team', user?.id],
    enabled: Boolean(user) && enabled,
    queryFn: async (): Promise<TeamChallenge[]> => {
      const { data, error } = await supabase.rpc('get_my_team_challenges')
      if (error) throw error
      return buildTeam(data)
    },
    refetchInterval: (query) =>
      (query.state.data ?? []).some((c) => c.status === 'active' || c.status === 'pending') ? 60_000 : false,
    refetchIntervalInBackground: false,
  })
}

function useRefresh() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['team', user?.id] })
    // Al cumplirse un reto cambian el XP, el nivel y los logros
    void queryClient.invalidateQueries({ queryKey: ['progress', user?.id] })
    void queryClient.invalidateQueries({ queryKey: ['glance', user?.id] })
    void queryClient.invalidateQueries({ queryKey: ['rewards', user?.id] })
  }
}

export type NewTeamChallenge = { friendId: string; kind: TeamKind; goal: number; days: number; title: string | null; unit: string | null }

export function useCreateTeamChallenge() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (input: NewTeamChallenge) => {
      const { error } = await supabase.rpc('create_team_challenge', {
        p_friend: input.friendId,
        p_kind: input.kind,
        p_goal: input.goal,
        p_days: input.days,
        p_title: input.title,
        p_unit: input.unit,
      })
      if (error) throw error
    },
    onSettled: refresh,
  })
}

export function useRespondTeamChallenge() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_team_challenge', { p_id: id, p_accept: accept })
      if (error) throw error
    },
    onSettled: refresh,
  })
}

export type ContributionResult = { status: string; mine: number; partner: number; xp: number }

export function useAddContribution() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }): Promise<ContributionResult> => {
      const { data, error } = await supabase.rpc('add_team_contribution', { p_id: id, p_amount: amount })
      if (error) throw error
      const row = (data ?? {}) as Record<string, unknown>
      return { status: String(row.status ?? ''), mine: Number(row.mine ?? 0), partner: Number(row.partner ?? 0), xp: Number(row.xp ?? 0) }
    },
    onSettled: refresh,
  })
}

export function useRemoveContribution() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (contributionId: string) => {
      const { error } = await supabase.rpc('remove_team_contribution', { p_contribution: contributionId })
      if (error) throw error
    },
    onSettled: refresh,
  })
}

export function useCancelTeamChallenge() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_challenge', { p_id: id })
      if (error) throw error
    },
    onSettled: refresh,
  })
}

/** Retos cumplidos con un amigo (también los relámpago). Sigue contando aunque dejéis de ser amigos. */
export function useDuo(friendId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['duo', user?.id, friendId],
    enabled: Boolean(user && friendId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('get_duo', { p_friend: friendId })
      if (error) throw error
      return Number((data as { completed?: number } | null)?.completed ?? 0)
    },
  })
}
