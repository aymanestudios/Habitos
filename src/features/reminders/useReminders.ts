import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { Reminder, ReminderChanges, ReminderPayload } from './reminderRules'

const COLUMNS = 'id, title, note, due_at, repeat, done_at, last_done_at'

// Tus recordatorios. Las políticas RLS hacen que solo lleguen los tuyos.
export function useReminders() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['reminders', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Reminder[]> => {
      const { data, error } = await supabase.from('reminders').select(COLUMNS).order('due_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Reminder[]
    },
  })
}

function useRefreshReminders() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return () => queryClient.invalidateQueries({ queryKey: ['reminders', user?.id] })
}

export function useCreateReminder() {
  const refresh = useRefreshReminders()
  return useMutation({
    mutationFn: async (payload: ReminderPayload) => {
      const { error } = await supabase.from('reminders').insert(payload)
      if (error) throw error
    },
    onSuccess: refresh,
  })
}

// Sirve para editar, completar, deshacer y posponer.
export function useUpdateReminder() {
  const refresh = useRefreshReminders()
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: ReminderChanges }) => {
      const { data, error } = await supabase.from('reminders').update(changes).eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('No se pudo guardar: el recordatorio no existe o no es tuyo.')
    },
    onSuccess: refresh,
  })
}

export function useDeleteReminder() {
  const refresh = useRefreshReminders()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reminders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: refresh,
  })
}
