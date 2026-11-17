import { useState } from 'react'
import { Card } from '@/components/Card'
import { Mascot } from '@/components/Mascot'
import { PageHeader } from '@/components/PageHeader'
import { SkinsCard } from '@/features/skins/SkinsCard'
import { ProfileAvatar } from '@/components/ProfileAvatar'
import { Sheet } from '@/components/Sheet'
import { PageSkeleton } from '@/components/Skeleton'
import { errorMessage } from '@/features/habits/habitRules'
import { useProfile } from '@/features/profile/useProfile'
import { KindPreview } from './RewardArt'
import {
  KIND_LABEL,
  KIND_SINGULAR,
  RARITY,
  currentEquipment,
  friendlyRewardError,
  isWorn,
  nextRewards,
  remainingText,
  summary,
  toggleEquip,
} from './rewardRules'
import type { Reward, RewardKind } from './rewardRules'
import { useEquip, useMyRewards } from './useRewards'

const KIND_ORDER: RewardKind[] = ['badge', 'frame', 'accessory', 'effect']

// LOGROS: lo que has conseguido, lo que tienes más cerca y equipar recompensas en tu perfil.
export function AchievementsPage() {
  const rewards = useMyRewards()
  const profile = useProfile()
  const [openId, setOpenId] = useState<string | null>(null)

  if (rewards.isPending) return <PageSkeleton />
  if (rewards.isError) {
    return (
      <Card>
        <p className="text-danger">{friendlyRewardError(errorMessage(rewards.error))}</p>
      </Card>
    )
  }

  const list = rewards.data ?? []
  const stats = summary(list)
  const equipment = currentEquipment(list)
  const next = nextRewards(list)
  const open = list.find((reward) => reward.id === openId) ?? null

  return (
    <div className="stagger space-y-6">
      <PageHeader title="Logros" subtitle="Consigue recompensas y luce tu progreso" />

      {/* Skins del panda: tickets y cápsula misteriosa */}
      <SkinsCard />

      {/* Resumen + cómo te ven tus amigos */}
      <Card className="flex items-center gap-5">
        {profile.data && (
          <ProfileAvatar
            name={profile.data.display_name}
            photo={profile.data.avatar_path}
            color={profile.data.avatar_color}
            frame={equipment.frame}
            accessory={equipment.accessory}
            effect={equipment.effect}
            size={84}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-extrabold tabular-nums">
            {stats.unlocked}
            <span className="text-lg font-bold text-muted">/{stats.total}</span>
          </p>
          <p className="text-sm text-muted">recompensas desbloqueadas</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(['common', 'special', 'epic', 'legendary'] as const).map((rarity) => (
              <span key={rarity} className={`rounded-full px-2 py-0.5 text-xs font-bold ${RARITY[rarity].soft} ${RARITY[rarity].text}`}>
                {stats.byRarity[rarity]} {RARITY[rarity].label}
              </span>
            ))}
          </div>
        </div>
        <Mascot pose="star" className="hidden h-24 sm:block" />
      </Card>

      {next.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold">Tu próxima recompensa</h2>
          <ul className="mt-3 space-y-3">
            {next.map((reward) => (
              <li key={reward.id}>
                <button type="button" onClick={() => setOpenId(reward.id)} className="flex w-full items-center gap-3 text-left">
                  <KindPreview kind={reward.kind} id={reward.id} rarity={reward.rarity} metric={reward.metric} locked={false} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{reward.title}</span>
                      <span className={`shrink-0 text-xs font-bold ${RARITY[reward.rarity].text}`}>{RARITY[reward.rarity].label}</span>
                    </span>
                    <span className="mt-1 block h-2 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${reward.percent}%` }} />
                    </span>
                    <span className="mt-1 block text-xs text-muted">{remainingText(reward)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {KIND_ORDER.map((kind) => {
        const items = list.filter((reward) => reward.kind === kind)
        if (items.length === 0) return null
        return (
          <section key={kind}>
            <h2 className="mb-2 flex items-baseline justify-between text-lg font-bold">
              {KIND_LABEL[kind]}
              <span className="text-sm font-semibold text-muted">
                {items.filter((reward) => reward.unlocked).length}/{items.length}
              </span>
            </h2>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {items.map((reward) => (
                <li key={reward.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(reward.id)}
                    className={`relative flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-transform active:scale-95 ${
                      reward.unlocked ? `${RARITY[reward.rarity].ring} ${RARITY[reward.rarity].soft}` : 'border-dashed border-line'
                    }`}
                  >
                    <KindPreview kind={reward.kind} id={reward.id} rarity={reward.rarity} metric={reward.metric} locked={!reward.unlocked} />
                    <span className="line-clamp-2 text-xs font-bold leading-tight">{reward.title}</span>
                    {isWorn(equipment, reward) && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-brand px-1.5 text-[10px] font-bold text-on-brand">
                        {kind === 'badge' ? 'Destacada' : 'Puesto'}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <p className="text-center text-xs text-muted">
        Las recompensas son solo estéticas: no dan XP ni ventajas. Se calculan con tu progreso real.
      </p>

      <RewardSheet reward={open} equipment={equipment} onClose={() => setOpenId(null)} />
    </div>
  )
}

function RewardSheet({
  reward,
  equipment,
  onClose,
}: {
  reward: Reward | null
  equipment: ReturnType<typeof currentEquipment>
  onClose: () => void
}) {
  const equip = useEquip()
  const worn = reward ? isWorn(equipment, reward) : false

  function close() {
    equip.reset()
    onClose()
  }

  return (
    <Sheet open={reward !== null} title={reward?.title ?? ''} onClose={close} closeDisabled={equip.isPending}>
      {reward && (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={reward.unlocked ? 'animate-published' : ''}>
            <KindPreview kind={reward.kind} id={reward.id} rarity={reward.rarity} metric={reward.metric} locked={!reward.unlocked} size={96} />
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${RARITY[reward.rarity].soft} ${RARITY[reward.rarity].text}`}>
            {RARITY[reward.rarity].label} · {KIND_SINGULAR[reward.kind]}
          </span>
          <p className="text-muted">{reward.description}</p>

          {reward.unlocked ? (
            <button
              type="button"
              disabled={equip.isPending}
              onClick={() => equip.mutate(toggleEquip(equipment, reward))}
              className={`w-full rounded-2xl px-4 py-3 font-bold transition-all active:scale-95 disabled:opacity-60 ${
                worn ? 'border-2 border-line text-muted' : 'btn-primary'
              }`}
            >
              {equip.isPending
                ? 'Guardando…'
                : reward.kind === 'badge'
                  ? worn
                    ? 'Quitar de destacadas'
                    : 'Destacar en mi perfil'
                  : worn
                    ? 'Quitar'
                    : 'Ponérmelo'}
            </button>
          ) : (
            <div className="w-full">
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-brand" style={{ width: `${reward.percent}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted">
                {reward.value}/{reward.threshold} · {remainingText(reward)}
              </p>
            </div>
          )}
          {reward.kind === 'badge' && reward.unlocked && (
            <p className="text-xs text-muted">Puedes destacar hasta 3 insignias. Tus amigos las verán en tu perfil.</p>
          )}
          {equip.isError && (
            <p className="w-full rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              {friendlyRewardError(errorMessage(equip.error))}
            </p>
          )}
        </div>
      )}
    </Sheet>
  )
}
