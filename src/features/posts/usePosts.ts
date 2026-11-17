import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { loadImage, renderResized } from '@/lib/imageTools'
import { removeImage, uploadImage } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { cleanCaption } from './postRules'
import type { HabitPost, PostVisibility } from './postRules'

const COLUMNS = 'id, habit_id, local_date, photo_path, caption, visibility, created_at'

// Mis publicaciones de los últimos días (sirve para saber qué hábitos ya tienen foto hoy/ayer).
export function useMyRecentPosts(from: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['posts', user?.id, 'since', from],
    enabled: Boolean(user),
    queryFn: async (): Promise<HabitPost[]> => {
      const { data, error } = await supabase.from('habit_posts').select(COLUMNS).gte('local_date', from)
      if (error) throw error
      return (data ?? []) as HabitPost[]
    },
  })
}

// Todas mis fotos de un hábito (para su historial).
export function useHabitPosts(habitId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['posts', user?.id, 'habit', habitId],
    enabled: Boolean(user),
    queryFn: async (): Promise<HabitPost[]> => {
      const { data, error } = await supabase
        .from('habit_posts')
        .select(COLUMNS)
        .eq('habit_id', habitId)
        .order('local_date', { ascending: false })
        .limit(60)
      if (error) throw error
      return (data ?? []) as HabitPost[]
    },
  })
}

function useRefreshPosts() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return () => void queryClient.invalidateQueries({ queryKey: ['posts', user?.id] })
}

export type PublishInput = {
  habitId: string
  dayOffset: 0 | -1
  file: File
  caption: string
  visibility: PostVisibility
}

// Comprime → sube a evidence/<tu id>/ → publica (el servidor comprueba que el hábito está hecho)
// → borra la foto anterior de ese día si la había.
export function usePublishPost() {
  const { user } = useAuth()
  const refresh = useRefreshPosts()
  return useMutation({
    mutationFn: async (input: PublishInput) => {
      const image = await loadImage(input.file)
      let path: string
      try {
        path = await uploadImage('evidence', user!.id, await renderResized(image, 1600))
      } finally {
        image.close()
      }
      const { data, error } = await supabase.rpc('publish_habit_post', {
        p_habit: input.habitId,
        p_day_offset: input.dayOffset,
        p_path: path,
        p_caption: cleanCaption(input.caption),
        p_visibility: input.visibility,
      })
      if (error) {
        await removeImage('evidence', path).catch(() => {}) // no dejar fotos sueltas
        throw error
      }
      const row = (Array.isArray(data) ? data[0] : data) as { replaced_path?: string | null } | null
      if (row?.replaced_path) await removeImage('evidence', row.replaced_path).catch(() => {})
    },
    onSuccess: refresh,
  })
}

// Cambiar quién la ve (o el comentario).
export function useUpdatePost() {
  const refresh = useRefreshPosts()
  return useMutation({
    mutationFn: async ({ id, visibility, caption }: { id: string; visibility: PostVisibility; caption: string }) => {
      const { error } = await supabase
        .from('habit_posts')
        .update({ visibility, caption: cleanCaption(caption) })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: refresh,
  })
}

// Borrar la publicación y su foto.
export function useDeletePost() {
  const refresh = useRefreshPosts()
  return useMutation({
    mutationFn: async (post: HabitPost) => {
      const { error } = await supabase.from('habit_posts').delete().eq('id', post.id)
      if (error) throw error
      await removeImage('evidence', post.photo_path).catch(() => {})
    },
    onSuccess: refresh,
  })
}
