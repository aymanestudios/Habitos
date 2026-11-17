import { Link, useParams } from 'react-router'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { ProfileAvatar } from '@/components/ProfileAvatar'
import { PageSkeleton } from '@/components/Skeleton'
import { CATEGORY_LABEL } from '@/features/habits/habitRules'
import type { Category } from '@/features/habits/habitRules'
import { PostImage } from '@/features/posts/PostImage'
import { BadgeArt } from '@/features/rewards/RewardArt'
import { RARITY } from '@/features/rewards/rewardRules'
import type { Rarity } from '@/features/rewards/rewardRules'
import { shortDate } from '@/features/stats/statsRules'
import { useSignedUrls } from '@/lib/storage'
import { useFriendProfile, useRewardCatalog } from './useFriendProfile'

// Perfil de un amigo: pensado para VER su progreso (no para editar). Lo privado ni siquiera llega del servidor.
export function FriendProfilePage() {
  const { id } = useParams()
  const profile = useFriendProfile(id)
  const catalog = useRewardCatalog()
  const posts = profile.data?.stats?.posts ?? []
  const urls = useSignedUrls(posts.map((post) => post.photoPath))

  if (profile.isPending) return <PageSkeleton />
  if (profile.isError || !profile.data) {
    return (
      <Card className="text-center">
        <p className="font-semibold">Este perfil no está disponible.</p>
        <p className="mt-1 text-sm text-muted">Solo puedes ver el perfil de tus amigos.</p>
        <Link to="/amigos" className="mt-4 inline-block font-semibold text-brand-ink">
          ← Volver a Amigos
        </Link>
      </Card>
    )
  }

  const p = profile.data
  const byId = new Map((catalog.data ?? []).map((item) => [item.id, item]))
  const showcase = p.showcase.map((rid) => byId.get(rid)).filter((item) => item !== undefined)
  const unlockedBadges = (p.unlocked ?? []).map((rid) => byId.get(rid)).filter((item) => item?.kind === 'badge')
  const totalUnlocked = p.unlocked?.length ?? 0

  const hero = [
    { label: 'Nivel', value: p.level },
    { label: 'XP esta semana', value: p.weekXp },
    p.streak ? { label: 'Racha', value: `${p.streak.current} d` } : null,
  ].filter((item) => item !== null)

  return (
    <div className="stagger space-y-6">
      <Link to="/amigos" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        ← Amigos
      </Link>

      {/* Cabecera: avatar con lo que lleva puesto, nombre, frase e insignias destacadas */}
      <Card className="relative overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-soft to-transparent" aria-hidden="true" />
        <div className="relative flex flex-col items-center pt-4">
          <ProfileAvatar
            name={p.name}
            photo={p.avatarPath}
            color={p.avatarColor}
            frame={p.frame}
            accessory={p.accessory}
            effect={p.effect}
            size={112}
          />
          <h1 className="mt-4 text-2xl font-bold">{p.name}</h1>
          <p className="text-muted">@{p.username}</p>
          {p.bio && <p className="mt-2 max-w-sm text-[15px] italic">“{p.bio}”</p>}
          {showcase.length > 0 && (
            <div className="mt-4 flex justify-center gap-3">
              {showcase.map((item) => (
                <div key={item.id} className="flex w-20 flex-col items-center gap-1" title={item.description}>
                  <BadgeArt metric={item.metric} rarity={item.rarity as Rarity} size={48} />
                  <span className="text-[11px] font-bold leading-tight">{item.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={`relative mt-5 grid gap-2 ${hero.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {hero.map((item) => (
            <div key={item.label} className="rounded-2xl bg-surface-2 p-3">
              <p className="text-xl font-extrabold tabular-nums">{item.value}</p>
              <p className="text-xs text-muted">{item.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {p.stats && (
        <Card>
          <h2 className="text-lg font-bold">Su progreso</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-surface-2 p-3">
              <p className="text-xl font-extrabold">{p.stats.habitsDone}</p>
              <p className="text-xs text-muted">Hábitos hechos</p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3">
              <p className="text-xl font-extrabold">{p.stats.monthPercent === null ? '—' : `${p.stats.monthPercent} %`}</p>
              <p className="text-xs text-muted">Cumplido en 30 días</p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3">
              <p className="text-xl font-extrabold">{p.streak ? `${p.streak.best} d` : p.xpTotal}</p>
              <p className="text-xs text-muted">{p.streak ? 'Mejor racha' : 'XP totales'}</p>
            </div>
          </div>
          {p.stats.habits.length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {p.stats.habits.map((habit) => (
                <li key={habit.title} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{habit.title}</span>
                    <span className="block text-xs text-muted">{CATEGORY_LABEL[habit.category as Category] ?? 'Otro'}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-brand-ink">{habit.done30} veces en 30 días</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No comparte ningún hábito en concreto.</p>
          )}
        </Card>
      )}

      {posts.length > 0 && (
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Icon name="image" className="h-5 w-5 text-brand-ink" />
            Sus logros recientes
          </h2>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {posts.map((post) => (
              <li key={post.id} className="relative">
                <PostImage url={urls.data?.[post.photoPath]} loading={urls.isPending} alt={post.caption ?? post.habitTitle ?? 'Foto de un hábito'} className="aspect-square w-full" />
                <span className="absolute bottom-1 left-1 right-1 truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
                  {post.habitTitle ?? 'Hábito privado'} · {shortDate(post.localDate)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {p.unlocked && (
        <Card>
          <h2 className="flex items-baseline justify-between text-lg font-bold">
            Logros
            <span className="text-sm font-semibold text-muted">{totalUnlocked} conseguidos</span>
          </h2>
          {unlockedBadges.length > 0 ? (
            <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {unlockedBadges.map((item) =>
                item ? (
                  <li key={item.id} className="flex flex-col items-center gap-1 text-center" title={item.description}>
                    <BadgeArt metric={item.metric} rarity={item.rarity as Rarity} size={44} />
                    <span className={`text-[10px] font-bold leading-tight ${RARITY[item.rarity as Rarity]?.text ?? ''}`}>{item.title}</span>
                  </li>
                ) : null,
              )}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Aún no tiene insignias.</p>
          )}
        </Card>
      )}

      {(!p.stats || !p.streak || !p.unlocked) && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Icon name="lock" className="h-3.5 w-3.5" />
          {p.name} mantiene parte de su perfil en privado.
        </p>
      )}
    </div>
  )
}
