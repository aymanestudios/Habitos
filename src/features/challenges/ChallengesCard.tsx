import { useState } from 'react'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { errorMessage } from '@/features/habits/habitRules'
import {
  TARGET_OPTIONS,
  availablePartners,
  challengeMessage,
  friendlyChallengeError,
  shares,
} from './challengeRules'
import { useCancelChallenge, useChallenges, useCreateChallenge } from './useChallenges'

type Friend = { user_id: string; display_name: string }

// Retos cooperativos de la semana: tú + un amigo, una meta de XP entre los dos.
export function ChallengesCard({ friends }: { friends: Friend[] }) {
  const challenges = useChallenges(friends.length > 0)
  const create = useCreateChallenge()
  const cancel = useCancelChallenge()
  const [creating, setCreating] = useState(false)
  const [friendId, setFriendId] = useState<string | null>(null)
  const [target, setTarget] = useState<number>(300)
  const [confirming, setConfirming] = useState<string | null>(null)

  if (friends.length === 0) return null

  const list = challenges.data ?? []
  const free = availablePartners(friends, list)
  const selected = free.find((friend) => friend.user_id === friendId) ?? free[0]

  function submit() {
    if (!selected) return
    create.mutate(
      { friendId: selected.user_id, target },
      { onSuccess: () => setCreating(false) },
    )
  }

  const error = create.error ?? cancel.error

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name="bolt" className="h-5 w-5 text-brand-ink" />
          Retos de la semana
        </h2>
        {!creating && free.length > 0 && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn-primary flex items-center gap-1 px-3 py-2 text-sm"
          >
            <Icon name="plus" className="h-4 w-4" />
            Nuevo
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Tú y un amigo sumáis XP juntos hasta llegar a la meta antes del domingo.</p>

      {challenges.isError && (
        <p className="mt-2 text-sm text-danger">
          No se pudieron cargar los retos. ¿Has ejecutado la migración 0008_challenges.sql en Supabase?
        </p>
      )}

      {creating && selected && (
        <div className="mt-4 space-y-3 rounded-2xl bg-surface-2 p-4">
          <p className="text-sm font-semibold">¿Con quién?</p>
          <div className="flex flex-wrap gap-2">
            {free.map((friend) => (
              <button
                key={friend.user_id}
                type="button"
                aria-pressed={friend.user_id === selected.user_id}
                onClick={() => setFriendId(friend.user_id)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                  friend.user_id === selected.user_id
                    ? 'border-brand bg-brand-soft text-brand-ink'
                    : 'border-line bg-surface text-muted'
                }`}
              >
                {friend.display_name}
              </button>
            ))}
          </div>
          <p className="text-sm font-semibold">Meta entre los dos</p>
          <div className="flex flex-wrap gap-2">
            {TARGET_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === target}
                onClick={() => setTarget(option)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                  option === target ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-muted'
                }`}
              >
                {option} XP
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={submit} disabled={create.isPending} className="btn-primary px-4 py-2.5 text-sm">
              Crear reto
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-2xl px-4 py-2.5 text-sm font-bold text-muted hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {challenges.isSuccess && list.length === 0 && !creating && (
        <p className="mt-3 text-muted">No tienes retos esta semana. Crea uno y motivaos el uno al otro.</p>
      )}

      {list.length > 0 && (
        <ul className="mt-3 space-y-4">
          {list.map((challenge) => {
            const part = shares(challenge)
            return (
              <li key={challenge.id} className={challenge.isCurrent ? '' : 'opacity-70'}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate font-semibold">
                    Tú + {challenge.partnerName}
                    {!challenge.isCurrent && <span className="ml-2 text-xs text-muted">semana pasada</span>}
                  </p>
                  <p className="shrink-0 text-sm font-bold">
                    {challenge.total}/{challenge.target} XP {challenge.done && '🎉'}
                  </p>
                </div>
                <div
                  className="mt-2 flex h-3 overflow-hidden rounded-full bg-surface-2"
                  role="progressbar"
                  aria-valuenow={challenge.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Reto con ${challenge.partnerName}`}
                >
                  <div className="h-full bg-brand transition-all duration-700" style={{ width: `${part.mine}%` }} />
                  <div className="h-full bg-accent transition-all duration-700" style={{ width: `${part.partner}%` }} />
                </div>
                <div className="mt-1 flex justify-between gap-3 text-xs text-muted">
                  <span>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand" />
                    Tú {challenge.myXp}
                    <span className="mx-1 ml-3 inline-block h-2 w-2 rounded-full bg-accent" />
                    {challenge.partnerName} {challenge.partnerXp}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{challengeMessage(challenge)}</p>
                {challenge.isCurrent &&
                  (confirming === challenge.id ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => cancel.mutate(challenge.id, { onSettled: () => setConfirming(null) })}
                        className="rounded-full bg-danger-soft px-3 py-1.5 text-sm font-bold text-danger"
                      >
                        Sí, cancelar reto
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="rounded-full border-2 border-line px-3 py-1.5 text-sm font-bold text-muted"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(challenge.id)}
                      className="mt-1 text-xs font-semibold text-muted hover:text-ink"
                    >
                      Cancelar reto
                    </button>
                  ))}
              </li>
            )
          })}
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
