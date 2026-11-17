import { useQuery } from '@tanstack/react-query'
import { env } from './env'
import { supabase } from './supabase'
import { extensionFor } from './imageTools'

// Supabase Storage: dónde viven las fotos (ver 0012_photos.sql).
//   avatars  → público (la foto de perfil la ven amigos y solicitudes)
//   evidence → privado (fotos de hábitos: solo con enlaces firmados que caducan)

export type Bucket = 'avatars' | 'evidence'

/** URL pública de una foto de perfil. */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path || !env.supabaseUrl) return null
  return `${env.supabaseUrl}/storage/v1/object/public/avatars/${path.split('/').map(encodeURIComponent).join('/')}`
}

/** Sube una imagen a TU carpeta (<id>/<aleatorio>.webp). Devuelve la ruta. */
export async function uploadImage(bucket: Bucket, userId: string, blob: Blob): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(blob)}`
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
    cacheControl: '31536000', // el nombre es único: se puede guardar en caché un año
  })
  if (error) throw error
  return path
}

/** Borra una imagen (sin romper nada si ya no existía). */
export async function removeImage(bucket: Bucket, path: string | null | undefined): Promise<void> {
  if (!path) return
  await supabase.storage.from(bucket).remove([path])
}

const SIGNED_SECONDS = 60 * 60 // 1 h

/** Enlaces temporales para fotos privadas. Storage comprueba si puedes verlas. */
export function useSignedUrls(paths: (string | null | undefined)[]) {
  const list = [...new Set(paths.filter((path): path is string => Boolean(path)))].sort()
  return useQuery({
    queryKey: ['signed-urls', list],
    enabled: list.length > 0,
    staleTime: (SIGNED_SECONDS - 10 * 60) * 1000, // se renuevan antes de caducar
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.storage.from('evidence').createSignedUrls(list, SIGNED_SECONDS)
      if (error) throw error
      const urls: Record<string, string> = {}
      for (const item of data ?? []) if (item.path && item.signedUrl) urls[item.path] = item.signedUrl
      return urls
    },
  })
}
