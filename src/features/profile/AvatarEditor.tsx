import { useCallback, useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { usePhotoPicker } from '@/components/usePhotoPicker'
import { errorMessage } from '@/features/habits/habitRules'
import { loadImage } from '@/lib/imageTools'
import { AvatarCropper } from './AvatarCropper'
import type { AvatarCrop } from './useAvatar'
import { friendlyPhotoError, useRemoveAvatar, useSaveAvatar } from './useAvatar'
import type { Profile } from './useProfile'

type Picked = { file: File; url: string; width: number; height: number }

// Foto de perfil: tocar el avatar → hacer foto / galería / quitar → recortar → guardar.
export function AvatarEditor({ profile, open, onClose }: { profile: Profile; open: boolean; onClose: () => void }) {
  const save = useSaveAvatar()
  const remove = useRemoveAvatar()
  const [picked, setPicked] = useState<Picked | null>(null)
  const [crop, setCrop] = useState<AvatarCrop>({ zoom: 1, offsetX: 0, offsetY: 0 })
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const busy = save.isPending || remove.isPending

  // Libera la vista previa al cambiar de foto o cerrar
  useEffect(() => () => {
    if (picked) URL.revokeObjectURL(picked.url)
  }, [picked])

  const reset = useCallback(() => {
    setPicked(null)
    setError(null)
    setDone(null)
    save.reset()
    remove.reset()
  }, [save, remove])

  const close = useCallback(() => {
    if (busy) return
    reset()
    onClose()
  }, [busy, reset, onClose])

  const picker = usePhotoPicker({
    camera: 'user',
    onError: setError,
    onPick: async (file) => {
      setError(null)
      try {
        const image = await loadImage(file)
        const size = { width: image.width, height: image.height }
        image.close()
        setPicked({ file, url: URL.createObjectURL(file), ...size })
      } catch (caught) {
        setError(errorMessage(caught))
      }
    },
  })

  const onCrop = useCallback((state: AvatarCrop) => setCrop(state), [])

  function finish(message: string) {
    setDone(message)
    setPicked(null)
    window.setTimeout(() => {
      reset()
      onClose()
    }, 1100)
  }

  return (
    <Sheet open={open} title="Foto de perfil" onClose={close} closeDisabled={busy}>
      {picker.inputs}

      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="animate-published flex h-16 w-16 items-center justify-center rounded-full bg-good text-on-brand">
            <Icon name="check" className="h-8 w-8" />
          </span>
          <p className="text-lg font-bold">{done}</p>
        </div>
      ) : picked ? (
        <div className="space-y-5">
          <AvatarCropper url={picked.url} width={picked.width} height={picked.height} onChange={onCrop} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPicked(null)}
              disabled={busy}
              className="flex-1 rounded-2xl border-2 border-line px-4 py-3 font-bold transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                save.mutate(
                  { file: picked.file, crop, previous: profile.avatar_path },
                  { onSuccess: () => finish('¡Foto actualizada!') },
                )
              }
              className="btn-primary flex flex-1 items-center justify-center gap-2 px-4 py-3 disabled:opacity-70"
            >
              {save.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {save.isPending ? 'Subiendo…' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-center pb-2">
            <Avatar
              name={profile.display_name}
              emoji={profile.avatar_emoji}
              color={profile.avatar_color}
              photo={profile.avatar_path}
              className="h-28 w-28 text-5xl"
            />
          </div>
          <button
            type="button"
            onClick={picker.openCamera}
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-line px-4 py-3.5 font-bold transition-colors hover:bg-surface-2"
          >
            <Icon name="camera" className="h-5 w-5 text-brand-ink" />
            Hacer una foto
          </button>
          <button
            type="button"
            onClick={picker.openGallery}
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-line px-4 py-3.5 font-bold transition-colors hover:bg-surface-2"
          >
            <Icon name="image" className="h-5 w-5 text-brand-ink" />
            Elegir de la galería o del ordenador
          </button>
          {profile.avatar_path && (
            <button
              type="button"
              disabled={busy}
              onClick={() => remove.mutate(profile.avatar_path, { onSuccess: () => finish('Foto quitada') })}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 font-bold text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
            >
              <Icon name="trash" className="h-5 w-5" />
              {remove.isPending ? 'Quitando…' : 'Quitar foto y usar avatar'}
            </button>
          )}
          <p className="pt-1 text-center text-xs text-muted">
            JPG, PNG o WebP. Se recorta en círculo, se reduce y se le quitan los datos de ubicación.
          </p>
        </div>
      )}

      {(error || save.isError || remove.isError) && !done && (
        <p className="animate-pop-in mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {error ?? friendlyPhotoError(errorMessage(save.error ?? remove.error))}
        </p>
      )}
    </Sheet>
  )
}
