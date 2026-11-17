import { useState } from 'react'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { shortDate } from '@/features/stats/statsRules'
import { useSignedUrls } from '@/lib/storage'
import { PostImage } from './PostImage'
import { VISIBILITY_OPTIONS } from './postRules'
import type { HabitPost } from './postRules'
import { useDeletePost, useHabitPosts, useUpdatePost } from './usePosts'

// "Tus fotos" de un hábito: galería + ver una en grande, cambiar quién la ve o borrarla.
export function HabitPostsCard({ habitId }: { habitId: string }) {
  const posts = useHabitPosts(habitId)
  const list = posts.data ?? []
  const urls = useSignedUrls(list.map((post) => post.photo_path))
  const [openId, setOpenId] = useState<string | null>(null)
  const open = list.find((post) => post.id === openId) ?? null

  if (posts.isError || (posts.isSuccess && list.length === 0)) return null

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Icon name="image" className="h-5 w-5 text-brand-ink" />
        Tus fotos
      </h2>
      <p className="mt-1 text-sm text-muted">Pequeños logros que has guardado o compartido.</p>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {(posts.isPending ? [null, null, null] : list).map((post, index) => (
          <li key={post?.id ?? index}>
            {post ? (
              <button
                type="button"
                onClick={() => setOpenId(post.id)}
                className="relative block w-full overflow-hidden rounded-2xl transition-transform active:scale-95"
                aria-label={`Foto del ${shortDate(post.local_date)}`}
              >
                <PostImage
                  url={urls.data?.[post.photo_path]}
                  loading={urls.isPending}
                  alt=""
                  className="aspect-square w-full"
                />
                <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
                  {shortDate(post.local_date)}
                </span>
                {post.visibility === 'private' && (
                  <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
                    <Icon name="lock" className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            ) : (
              <div className="skeleton aspect-square w-full rounded-2xl" />
            )}
          </li>
        ))}
      </ul>

      <PostDetail post={open} url={open ? urls.data?.[open.photo_path] : undefined} onClose={() => setOpenId(null)} />
    </Card>
  )
}

function PostDetail({ post, url, onClose }: { post: HabitPost | null; url: string | undefined; onClose: () => void }) {
  const update = useUpdatePost()
  const remove = useDeletePost()
  const [confirming, setConfirming] = useState(false)
  const busy = update.isPending || remove.isPending

  function close() {
    setConfirming(false)
    update.reset()
    remove.reset()
    onClose()
  }

  return (
    <Sheet open={post !== null} title={post ? `Foto del ${shortDate(post.local_date)}` : ''} onClose={close} closeDisabled={busy}>
      {post && (
        <div className="space-y-4">
          <PostImage url={url} alt={post.caption ?? 'Foto del hábito'} className="max-h-[50dvh] min-h-48 w-full" />
          {post.caption && <p className="text-[15px]">{post.caption}</p>}

          <div>
            <span className="text-sm font-semibold">¿Quién puede verla?</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {VISIBILITY_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={post.visibility === item.value}
                  disabled={busy}
                  onClick={() => update.mutate({ id: post.id, visibility: item.value, caption: post.caption ?? '' })}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-60 ${
                    post.visibility === item.value ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line text-muted'
                  }`}
                >
                  <Icon name={item.value === 'private' ? 'lock' : 'friends'} className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {confirming ? (
            <div className="animate-pop-in rounded-2xl bg-danger-soft p-4">
              <p className="text-sm font-semibold text-danger">¿Borrar la publicación y la foto? No se puede deshacer.</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove.mutate(post, { onSuccess: close })}
                  className="rounded-full bg-danger px-4 py-2 text-sm font-bold text-surface disabled:opacity-60"
                >
                  {remove.isPending ? 'Borrando…' : 'Sí, borrar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-full border-2 border-line px-4 py-2 text-sm font-bold text-muted"
                >
                  No
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex items-center gap-2 text-sm font-bold text-danger"
            >
              <Icon name="trash" className="h-4 w-4" />
              Borrar publicación
            </button>
          )}

          {(update.isError || remove.isError) && (
            <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              No se pudo guardar el cambio. Inténtalo otra vez.
            </p>
          )}
        </div>
      )}
    </Sheet>
  )
}
