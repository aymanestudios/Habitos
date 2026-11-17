import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { errorMessage } from '@/features/habits/habitRules'
import { useHabits } from '@/features/habits/useHabits'
import {
  availablePartners,
  availablePresets,
  challengeTitle,
  friendlyChallengeError,
  isPersonal,
  localToday,
  percent,
  sharedBar,
  statusText,
} from './challengeRules'
import type { Challenge } from './challengeRules'
import { useCancelChallenge, useChallenges, useCreateChallenge } from './useChallenges'

type Friend = { user_id: string; display_name: string }

// Retos relámpago: tú + un amigo, 3 o 7 días, cooperativos. El servidor cuenta el progreso.
export function ChallengesCard({ friends }: { friends: Friend[] }) {
  const challenges = useChallenges(friends.length > 0)
  const habits = useHabits()
  const create = useCreateChallenge()
  const cancel = useCancelChallenge()
  const [creating, setCreating] = useState(false)
  const [friendId, setFriendId] = useState<string | null>(null)
  const [presetId, setPresetId] = useState<string>('days3')
  const [confirming, setConfirming] = useState<string | null>(null)

  if (friends.length === 0) return null

  const list = challenges.data ?? []
  const free = availablePartners(friends, list)
  const selected = free.find((friend) => friend.user_id === friendId) ?? free[0]
  const myCategories = (habits.data ?? []).filter((h) => !h.archived_at).map((h) => String(h.category))
  const presets = availablePresets(myCategories)
  const preset = presets.find((p) => p.id === presetId) ?? presets[0]
  const today = localToday()

  function submit() {
    if (!selected || !preset) return
    create.mutate({ friendId: selected.user_id, preset }, { onSuccess: () => setCreating(false) })
  }

  const error = create.error ?? cancel.error
  const chip = (active: boolean) =>
    `rounded-full border-2 px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
      active ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-muted'
    }`

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name="bolt" className="h-5 w-5 text-brand-ink" />
          Retos relámpago
        </h2>
        {!creating && free.length > 0 && (
          <button type="button" onClick={() => setCreating(true)} className="btn-primary flex items-center gap-1 px-3 py-2 text-sm">
            <Icon name="plus" className="h-4 w-4" />
            Nuevo
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Retos cortos con un amigo. Cada uno con sus propios hábitos, juntos hasta la meta.</p>

      {challenges.isError && (
        <p className="mt-2 text-sm text-danger">{friendlyChallengeError(errorMessage(challenges.error))}</p>
      )}

      {creating && selected && preset && (
        <div className="mt-4 space-y-3 rounded-2xl bg-surface-2 p-4">
          <p className="text-sm font-semibold">¿Con quién?</p>
          <div className="flex flex-wrap gap-2">
            {free.map((friend) => (
              <button
                key={friend.user_id}
                type="button"
                aria-pressed={friend.user_id === selected.user_id}
                onClick={() => setFriendId(friend.user_id)}
                className={chip(friend.user_id === selected.user_id)}
              >
                {friend.display_name}
              </button>
            ))}
          </div>
          <p className="text-sm font-semibold">Elige el reto</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={p.id === preset.id}
                onClick={() => setPresetId(p.id)}
                className={`rounded-2xl border-2 px-4 py-3 text-left transition-all active:scale-[0.98] ${
                  p.id === preset.id ? 'border-brand bg-brand-soft' : 'border-line bg-surface'
                }`}
              >
                <span className="block font-bold">{p.title}</span>
                <span className="block text-xs text-muted">
                  {p.text} · {p.days} días
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={submit} disabled={create.isPending} className="btn-primary px-4 py-2.5 text-sm">
              Lanzar reto
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-2xl px-4 py-2.5 text-sm font-bold text-muted hover:text-ink">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {challenges.isSuccess && list.length === 0 && !creating && (
        <p className="mt-3 text-muted">No tienes retos ahora. Lanza uno de 3 días y motivaos el uno al otro.</p>
      )}

      {list.length > 0 && (
        <ul className="mt-3 space-y-5">
          {list.map((c) => (
            <ChallengeItem
              key={c.id}
              c={c}
              today={today}
              confirming={confirming === c.id}
              onAskCancel={() => setConfirming(c.id)}
              onKeep={() => setConfirming(null)}
              onCancel={() => cancel.mutate(c.id, { onSettled: () => setConfirming(null) })}
            />
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {friendlyChallengeError(errorMessage(error))}
        </p>
      )}
    </Card>
  )
}

type ItemProps = {
  c: Challenge
  today: string
  confirming: boolean
  onAskCancel: () => void
  onKeep: () => void
  onCancel: () => void
}

function ChallengeItem({ c, today, confirming, onAskCancel, onKeep, onCancel }: ItemProps) {
  const failed = !c.isCurrent && !c.done
  const unit = c.kind === 'xp' ? ' XP' : ''
  return (
    <li className={failed ? 'opacity-70' : ''}>
      <div className="flex items-center gap-3">
        <Avatar
          name={c.partnerName}
          photo={c.partnerAvatarPath}
          color={c.partnerAvatarColor}
          tone="accent"
          className="h-9 w-9 text-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{challengeTitle(c)}</p>
          <p className="truncate text-xs text-muted">Tú + {c.partnerName}</p>
        </div>
        {c.done ? (
          <span className="shrink-0 rounded-full bg-good-soft px-2.5 py-1 text-xs font-bold text-good-ink">Cumplido</span>
        ) : failed ? (
          <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted">Terminado</span>
        ) : (
          !isPersonal(c) && (
            <span className="shrink-0 text-sm font-bold">
              {c.myValue + c.partnerValue}/{c.target}
              {unit}
            </span>
          )
        )}
      </div>

      {isPersonal(c) ? (
        <div className="mt-2 space-y-1.5">
          <PersonBar label="Tú" value={c.myValue} target={c.target} tone="bg-brand" />
          <PersonBar label={c.partnerName} value={c.partnerValue} target={c.target} tone="bg-accent" />
        </div>
      ) : (
        <SharedBar c={c} unit={unit} />
      )}

      <p className="mt-1.5 text-sm text-muted">{statusText(c, today)}</p>

      {c.isCurrent &&
        !c.done &&
        (confirming ? (
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={onCancel} className="rounded-full bg-danger-soft px-3 py-1.5 text-sm font-bold text-danger">
              Sí, cancelar reto
            </button>
            <button type="button" onClick={onKeep} className="rounded-full border-2 border-line px-3 py-1.5 text-sm font-bold text-muted">
              No
            </button>
          </div>
        ) : (
          <button type="button" onClick={onAskCancel} className="mt-1 text-xs font-semibold text-muted hover:text-ink">
            Cancelar reto
          </button>
        ))}
    </li>
  )
}

function SharedBar({ c, unit }: { c: Challenge; unit: string }) {
  const part = sharedBar(c)
  return (
    <>
      <div
        className="mt-2 flex h-3 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={part.mine + part.partner}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Reto con ${c.partnerName}`}
      >
        <div className="h-full bg-brand transition-all duration-700" style={{ width: `${part.mine}%` }} />
        <div className="h-full bg-accent transition-all duration-700" style={{ width: `${part.partner}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand" />
        Tú {c.myValue}
        {unit}
        <span className="mx-1 ml-3 inline-block h-2 w-2 rounded-full bg-accent" />
        {c.partnerName} {c.partnerValue}
        {unit}
      </p>
    </>
  )
}

function PersonBar({ label, value, target, tone }: { label: string; value: number; target: number; tone: string }) {
  const pct = percent(value, target)
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 truncate text-muted">{label}</span>
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${value} de ${target} días`}
      >
        <div className={`h-full ${tone} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right font-bold">
        {Math.min(value, target)}/{target}
      </span>
    </div>
  )
}
