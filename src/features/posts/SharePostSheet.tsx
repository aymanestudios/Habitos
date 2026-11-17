import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { usePhotoPicker } from '@/components/usePhotoPicker'
import { errorMessage } from '@/features/habits/habitRules'
import { burstFrom } from '@/lib/confetti'
import { CAPTION_MAX, VISIBILITY_OPTIONS, friendlyPostError } from './postRules'
import type { PostVisibility } from './postRules'
import { usePublishPost } from './usePosts'

// Círculo verde con confeti (una sola vez al aparecer)
function PublishedBadge() {
  const badge = useRef<HTMLSpanElement>(null)
  useEffect(() => burstFrom(badge.current, { count: 18, power: 0.8 }), [])
  return (
    <span
      ref={badge}
      className="animate-published flex h-16 w-16 items-center justify-center rounded-full bg-good text-on-brand"
    >
      <Icon name="check" className="h-8 w-8" />
    </span>
  )
}

type Target = { habitId: string; title: string; dayOffset: 0 | -1 }

// "¿Quieres compartir tu progreso?": foto (cámara o galería) + comentario + quién lo ve → publicar.
export function SharePostSheet({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const publish = usePublishPost()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [visibility, setVisibility] = useState<PostVisibility>('friends')
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState(false)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const picker = usePhotoPicker({
    camera: 'environment',
    onError: setError,
    onPick: (picked) => {
      setError(null)
      setFile(picked)
      setPreview(URL.createObjectURL(picked))
    },
  })

  function close() {
    if (publish.isPending) return
    setFile(null)
    setPreview(null)
    setCaption('')
    setVisibility('friends')
    setError(null)
    setPublished(false)
    publish.reset()
    onClose()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!target || !file) return
    setError(null)
    publish.mutate(
      { habitId: target.habitId, dayOffset: target.dayOffset, file, caption, visibility },
      {
        onSuccess: () => {
          setPublished(true)
          window.setTimeout(close, 1400)
        },
        onError: (caught) => setError(friendlyPostError(errorMessage(caught))),
      },
    )
  }

  const option = VISIBILITY_OPTIONS.find((item) => item.value === visibility)

  return (
    <Sheet open={target !== null} title="Comparte tu progreso" onClose={close} closeDisabled={publish.isPending}>
      {picker.inputs}
      {target && (
        <p className="-mt-2 mb-4 text-sm text-muted">
          {target.dayOffset === 0 ? 'Hoy' : 'Ayer'} · <span className="font-semibold text-ink">{target.title}</span>
        </p>
      )}

      {published ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <PublishedBadge />
          <p className="text-lg font-bold">{visibility === 'friends' ? '¡Publicado!' : '¡Guardado en tu historial!'}</p>
          <p className="text-sm text-muted">
            {visibility === 'friends' ? 'Tus amigos ya pueden verlo y reaccionar.' : 'Solo tú puedes verlo.'}
          </p>
        </div>
      ) : !preview ? (
        <div className="space-y-3">
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
          <p className="pt-1 text-center text-xs text-muted">Es opcional: el hábito ya cuenta como hecho.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <img
              src={preview}
              alt="Vista previa"
              className="animate-fade max-h-[45dvh] w-full rounded-2xl bg-surface-2 object-contain"
            />
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setPreview(null)
              }}
              disabled={publish.isPending}
              className="absolute right-2 top-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur disabled:opacity-50"
            >
              Cambiar foto
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Comentario (opcional)</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, CAPTION_MAX))}
              rows={2}
              placeholder="¿Cómo ha ido?"
              className="mt-2 w-full resize-none rounded-2xl border-2 border-line bg-surface px-4 py-3 outline-none transition-colors focus:border-brand"
            />
            <span className="block text-right text-xs text-muted">
              {caption.length}/{CAPTION_MAX}
            </span>
          </label>

          <div>
            <span className="text-sm font-semibold">¿Quién puede verlo?</span>
            <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Quién puede verlo">
              {VISIBILITY_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={visibility === item.value}
                  onClick={() => setVisibility(item.value)}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                    visibility === item.value ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line text-muted'
                  }`}
                >
                  <Icon name={item.value === 'private' ? 'lock' : 'friends'} className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
            {option && <p className="mt-2 text-xs text-muted">{option.hint}</p>}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              disabled={publish.isPending}
              className="flex-1 rounded-2xl border-2 border-line px-4 py-3 font-bold transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={publish.isPending}
              className="btn-primary flex flex-1 items-center justify-center gap-2 px-4 py-3 disabled:opacity-70"
            >
              {publish.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {publish.isPending ? 'Publicando…' : visibility === 'friends' ? 'Publicar' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {error && !published && (
        <p className="animate-pop-in mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </Sheet>
  )
}
