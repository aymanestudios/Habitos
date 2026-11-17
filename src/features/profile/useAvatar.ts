import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { cropFromView, loadImage, renderSquare } from '@/lib/imageTools'
import { removeImage, uploadImage } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { CROP_VIEW } from './AvatarCropper'

export type AvatarCrop = { zoom: number; offsetX: number; offsetY: number }

function useRefreshPeople() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    void queryClient.invalidateQueries({ queryKey: ['friends', user?.id] })
  }
}

async function setAvatarPath(userId: string, path: string | null) {
  const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId)
  if (error) throw error
}

// Recorta, comprime, sube la foto nueva, la guarda en el perfil y borra la anterior.
export function useSaveAvatar() {
  const { user } = useAuth()
  const refresh = useRefreshPeople()
  return useMutation({
    mutationFn: async ({ file, crop, previous }: { file: File; crop: AvatarCrop; previous: string | null }) => {
      const image = await loadImage(file)
      try {
        const square = cropFromView(image.width, image.height, CROP_VIEW, crop.zoom, crop.offsetX, crop.offsetY)
        const blob = await renderSquare(image, square, 512)
        const path = await uploadImage('avatars', user!.id, blob)
        try {
          await setAvatarPath(user!.id, path)
        } catch (error) {
          await removeImage('avatars', path) // no dejar fotos sueltas si falla el guardado
          throw error
        }
        if (previous && previous !== path) await removeImage('avatars', previous).catch(() => {})
      } finally {
        image.close()
      }
    },
    onSuccess: refresh,
  })
}

// Quita la foto: vuelve al emoji/inicial y borra el archivo.
export function useRemoveAvatar() {
  const { user } = useAuth()
  const refresh = useRefreshPeople()
  return useMutation({
    mutationFn: async (previous: string | null) => {
      await setAvatarPath(user!.id, null)
      await removeImage('avatars', previous).catch(() => {})
    },
    onSuccess: refresh,
  })
}

export function friendlyPhotoError(message: string): string {
  if (/mime|type/i.test(message)) return 'Ese formato no está permitido. Usa JPG, PNG o WebP.'
  if (/size|large|exceed/i.test(message)) return 'La foto pesa demasiado incluso comprimida. Prueba con otra.'
  if (/abrir|navegador|preparar/i.test(message)) return message
  if (/avatar_path|column/i.test(message)) return 'Falta ejecutar la migración 0012_photos.sql en Supabase.'
  return 'No se pudo guardar la foto. Revisa la conexión e inténtalo otra vez.'
}
