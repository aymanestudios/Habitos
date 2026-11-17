import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import type { FormEvent } from 'react'
import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { ChallengesCard } from '@/features/challenges/ChallengesCard'
import { PostImage } from '@/features/posts/PostImage'
import { SharedStreaksCard } from '@/features/streaks/SharedStreaksCard'
import { useSignedUrls } from '@/lib/storage'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { PageSkeleton } from '@/components/Skeleton'
import { errorMessage } from '@/features/habits/habitRules'
import {
  REACTIONS,
  activityText,
  cleanCode,
  friendlyFriendError,
  friendlyReactError,
  isCompleteCode,
  prettyCode,
  rankingMessage,
  sentMessage,
  timeAgo,
} from './friendRules'
import {
  useFriendActivity,
  useFriends,
  useReact,
  useRemoveFriend,
  useRespondFriendRequest,
  useSendFriendRequest,
} from './useFriends'

// Colores del podio (clases completas para que Tailwind las detecte)
const MEDAL: Record<number, string> = {
  1: 'bg-accent text-on-brand',
  2: 'bg-surface-2 text-ink',
  3: 'bg-brand-soft text-brand-ink',
}

export function FriendsPage() {
  const friends = useFriends()
  const send = useSendFriendRequest()
  const respond = useRespondFriendRequest()
  const remove = useRemoveFriend()
  const react = useReact()
  const activity = useFriendActivity((friends.data?.friendCount ?? 0) > 0)
  const activityItems = activity.data ?? []
  // Fotos de las publicaciones: enlaces temporales (1 h); Storage comprueba que puedes verlas
  const photoUrls = useSignedUrls(activityItems.map((item) => item.photoPath))

  const [code, setCode] = useState('')
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null) // amistad que se está a punto de quitar
  const [adding, setAdding] = useState(false) // panel "Añadir amigos" (códigos y solicitudes enviadas)
  const closeAdding = useCallback(() => setAdding(false), [])

  if (friends.isError) {
    return (
      <Card>
        <p className="text-danger">
          No se pudo cargar la parte de amigos. ¿Has ejecutado la migración 0006_friends.sql en Supabase?
        </p>
      </Card>
    )
  }
  if (!friends.data) return <PageSkeleton />

  const overview = friends.data
  const shareText = `Hazte mi amigo en Progress&Go. Mi código: ${prettyCode(overview.myCode)}`

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(overview.myCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Sin permiso para copiar: el código sigue en pantalla para copiarlo a mano
    }
  }

  async function shareCode() {
    try {
      await navigator.share({ text: shareText, url: window.location.origin })
    } catch {
      // El usuario cerró el menú de compartir: no pasa nada
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setNotice(null)
    send.mutate(code, {
      onSuccess: (result) => {
        setCode('')
        setNotice({ text: sentMessage(result.name, result.status), ok: true })
      },
      onError: (error) => setNotice({ text: friendlyFriendError(errorMessage(error)), ok: false }),
    })
  }

  return (
    <div className="stagger space-y-6">
      <PageHeader
        title="Amigos"
        subtitle="Constancia en equipo"
        action={
          <button type="button" onClick={() => setAdding(true)} className="btn-primary flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm">
            <Icon name="plus" className="h-4 w-4" />
            Añadir amigos
          </button>
        }
      />

      <Sheet open={adding} title="Añadir amigos" onClose={closeAdding}>
        <div className="space-y-6">
          <section>
            <h3 className="font-bold">Con su código</h3>
            <p className="mt-1 text-sm text-muted">Escribe su código de 8 letras y números.</p>
            <form onSubmit={submit} className="mt-3 space-y-3">
              <input
                value={prettyCode(cleanCode(code))}
                onChange={(event) => setCode(cleanCode(event.target.value))}
                aria-label="Código de tu amigo"
                placeholder="ABCD-2345"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-center text-xl font-bold tracking-[0.2em] outline-none transition-colors placeholder:font-semibold placeholder:text-muted/60 focus:border-brand"
              />
              <button type="submit" disabled={!isCompleteCode(code) || send.isPending} className="btn-primary w-full px-4 py-3">
                {send.isPending ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </form>
            {notice && (
              <p
                role="status"
                className={`animate-pop-in mt-3 rounded-2xl px-4 py-3 text-sm ${
                  notice.ok ? 'bg-good-soft text-good-ink' : 'bg-danger-soft text-danger'
                }`}
              >
                {notice.text}
              </p>
            )}
          </section>
          <section>
            <h3 className="font-bold">Tu código</h3>
            <p className="mt-1 text-sm text-muted">Pásaselo a un amigo para que te añada.</p>
            <p className="mt-3 select-all rounded-2xl bg-brand-soft py-4 text-center text-2xl font-extrabold tracking-[0.2em] text-brand-ink">
              {prettyCode(overview.myCode)}
            </p>
            <div className="mt-3 flex gap-3">
              <button type="button" onClick={copyCode} className="btn-primary flex-1 px-4 py-3">
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
              {typeof navigator.share === 'function' && (
                <button
                  type="button"
                  onClick={shareCode}
                  className="flex-1 rounded-2xl border-2 border-line px-4 py-2.5 font-bold text-muted transition-colors hover:text-ink"
                >
                  Compartir
                </button>
              )}
            </div>
          </section>
          {overview.outgoing.length > 0 && (
            <section>
              <h3 className="font-bold">Esperando respuesta</h3>
            <ul className="divide-y divide-line">
              {overview.outgoing.map((row) => (
                <li key={row.user_id} className="flex items-center gap-3 py-3">
                  <Avatar name={row.display_name} tone="accent" color={row.avatar_color} photo={row.avatar_path} />
                  <p className="min-w-0 flex-1 truncate font-semibold">{row.display_name}</p>
                  <button
                    type="button"
                    onClick={() => row.friendship_id && remove.mutate(row.friendship_id)}
                    className="rounded-2xl px-3 py-2 text-sm font-bold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    Cancelar
                  </button>
                </li>
              ))}
            </ul>
            </section>
          )}

        </div>
      </Sheet>


      {overview.incoming.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold">
            Solicitudes <span className="text-sm font-semibold text-muted">· {overview.incoming.length}</span>
          </h2>
          <ul className="divide-y divide-line">
            {overview.incoming.map((row) => (
              <li key={row.user_id} className="flex items-center gap-3 py-3">
                <Avatar name={row.display_name} tone="accent" color={row.avatar_color} photo={row.avatar_path} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{row.display_name}</p>
                  <p className="truncate text-sm text-muted">@{row.username}</p>
                </div>
                <button
                  type="button"
                  disabled={respond.isPending}
                  onClick={() => row.friendship_id && respond.mutate({ id: row.friendship_id, accept: true })}
                  className="btn-primary px-4 py-2"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  disabled={respond.isPending}
                  aria-label={`Rechazar a ${row.display_name}`}
                  onClick={() => row.friendship_id && respond.mutate({ id: row.friendship_id, accept: false })}
                  className="rounded-2xl px-3 py-2 font-bold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  No
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {overview.friendCount === 0 ? (
        <Card className="flex flex-col items-center text-center">
          <Mascot pose="laptop" className="mb-2 h-32" />
          <h2 className="text-lg font-bold">Mejor acompañado</h2>
          <p className="mt-1 text-muted">
            Cuando tengas amigos, aquí veréis quién suma más XP cada semana. Solo comparten nivel, XP y racha: tus
            hábitos siguen siendo privados.
          </p>
          <button type="button" onClick={() => setAdding(true)} className="btn-primary mt-4 flex items-center gap-2 px-5 py-3">
            <Icon name="plus" className="h-5 w-5" />
            Añadir amigos
          </button>
        </Card>
      ) : (
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Icon name="bolt" className="h-5 w-5 text-accent-ink" />
            Ranking de la semana
          </h2>
          <p className="mt-1 text-sm text-muted">{rankingMessage(overview)}</p>
          <ol className="mt-2 divide-y divide-line">
            {overview.ranking.map((row) => {
              const isMe = row.kind === 'me'
              return (
                <li key={row.user_id} className={`py-3 ${isMe ? '-mx-3 rounded-2xl bg-brand-soft px-3' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                        MEDAL[row.position] ?? 'text-muted'
                      }`}
                    >
                      {row.position}
                    </span>
                    <Link
                      to={isMe ? '/perfil' : `/amigos/${row.user_id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl transition-opacity hover:opacity-80"
                      aria-label={isMe ? 'Tu perfil' : `Ver el perfil de ${row.display_name}`}
                    >
                      <Avatar name={row.display_name} tone={isMe ? 'brand' : 'good'} color={row.avatar_color} photo={row.avatar_path} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{isMe ? `${row.display_name} (tú)` : row.display_name}</p>
                        <p className="flex items-center gap-1 truncate text-sm text-muted">
                          Nivel {row.level ?? 1} · <Icon name="flame" className="h-4 w-4" />
                          {row.current_streak ?? 0}
                        </p>
                      </div>
                    </Link>
                    <span className="shrink-0 font-extrabold">{row.week_xp ?? 0} XP</span>
                    {!isMe && (
                      <button
                        type="button"
                        aria-label={`Quitar a ${row.display_name} de amigos`}
                        onClick={() => setConfirming(confirming === row.friendship_id ? null : row.friendship_id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl leading-none text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {!isMe && confirming !== null && confirming === row.friendship_id && (
                    <div className="animate-pop-in mt-2 flex flex-wrap items-center justify-end gap-2">
                      <span className="text-sm text-muted">¿Quitar de amigos?</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (row.friendship_id) remove.mutate(row.friendship_id)
                          setConfirming(null)
                        }}
                        className="rounded-full bg-danger-soft px-3 py-1.5 text-sm font-bold text-danger"
                      >
                        Sí, quitar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="rounded-full border-2 border-line px-3 py-1.5 text-sm font-bold text-muted"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      <SharedStreaksCard friends={overview.ranking.filter((row) => row.kind === 'friend')} />

      <ChallengesCard friends={overview.ranking.filter((row) => row.kind === 'friend')} />

      {overview.friendCount > 0 && (
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Icon name="bell" className="h-5 w-5 text-brand-ink" />
            Actividad reciente
          </h2>
          {activity.isError && (
            <p className="mt-2 text-sm text-danger">
              No se pudo cargar la actividad. ¿Has ejecutado las migraciones 0007 y 0012 en Supabase?
            </p>
          )}
          {activity.isSuccess && activityItems.length === 0 && (
            <p className="mt-2 text-muted">
              Aún no hay actividad. Cuando tus amigos completen hábitos, lo verás aquí y podrás animarlos.
            </p>
          )}
          {activity.isSuccess && activityItems.length > 0 && (
            <ul className="mt-2 divide-y divide-line">
              {activityItems.map((item) => (
                <li key={`${item.itemType}-${item.itemId}`} className="py-3">
                  <div className="flex items-start gap-3">
                    <Link to={`/amigos/${item.userId}`} aria-label={`Ver el perfil de ${item.name}`} className="shrink-0">
                      <Avatar
                        name={item.name}
                        tone={item.kind === 'day_bonus' ? 'good' : 'brand'}
                        emoji={item.avatarEmoji}
                        color={item.avatarColor}
                        photo={item.avatarPath}
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{activityText(item)}</p>
                      <p className="text-sm text-muted">
                        {timeAgo(item.createdAt)}
                        {item.amount > 0 && ` · +${item.amount} XP`}
                      </p>
                      {item.photoPath && (
                        <figure className="mt-3">
                          <PostImage
                            url={photoUrls.data?.[item.photoPath]}
                            loading={photoUrls.isPending}
                            alt={item.caption ?? `Foto de ${item.name}: ${item.habitTitle ?? 'hábito'}`}
                            className="aspect-[4/5] max-h-[440px] w-full sm:aspect-[4/3]"
                          />
                          {item.caption && <figcaption className="mt-2 text-[15px]">{item.caption}</figcaption>}
                        </figure>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Reacciones">
                        {REACTIONS.map((emoji) => {
                          const mine = item.myReaction === emoji
                          const count = item.reactions[emoji] ?? 0
                          return (
                            <button
                              key={emoji}
                              type="button"
                              aria-pressed={mine}
                              aria-label={`Reaccionar con ${emoji}`}
                              onClick={() => react.mutate({ item, emoji })}
                              className={`flex h-9 min-w-9 items-center justify-center gap-1 rounded-full border-2 px-3 text-sm font-bold transition-all active:scale-90 ${
                                mine
                                  ? 'border-brand bg-brand-soft text-brand-ink'
                                  : 'border-line bg-surface text-muted hover:text-ink'
                              }`}
                            >
                              <span>{emoji}</span>
                              {count > 0 && <span>{count}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {react.isError && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {friendlyReactError(errorMessage(react.error))}
            </p>
          )}
        </Card>
      )}

      {(respond.isError || remove.isError) && (
        <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {friendlyFriendError(errorMessage(respond.error ?? remove.error))}
        </p>
      )}
    </div>
  )
}
