import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Sheet } from '@/components/Sheet'
import { errorMessage } from '@/features/habits/habitRules'
import { localToday } from '@/features/challenges/challengeRules'
import { TeamKindIcon } from './TeamArt'
import {
  DURATIONS,
  MIN_SHARE,
  TEAM_KINDS,
  daysUntil,
  formatAmount,
  friendlyTeamError,
  goalError,
  kindInfo,
  parseAmount,
  teamXp,
} from './teamRules'
import type { TeamKind } from './teamRules'
import { useCreateTeamChallenge } from './useTeam'

export type TeamFriend = { user_id: string; display_name: string; avatar_path: string | null; avatar_color: string | null }

// Crear un reto en equipo, en un solo panel: amigo → tipo → meta → duración → invitar.
export function CreateTeamSheet({ open, friends, onClose }: { open: boolean; friends: TeamFriend[]; onClose: () => void }) {
  const create = useCreateTeamChallenge()
  const [friendId, setFriendId] = useState<string | null>(null)
  const [kind, setKind] = useState<TeamKind>('distance')
  const [goalText, setGoalText] = useState('20')
  const [title, setTitle] = useState('')
  const [unit, setUnit] = useState('')
  const [days, setDays] = useState(7)
  const [deadline, setDeadline] = useState('')
  const [tried, setTried] = useState(false)

  const today = localToday()
  const friend = friends.find((f) => f.user_id === friendId) ?? (friends.length === 1 ? friends[0] : undefined)
  const info = kindInfo(kind)
  const goal = parseAmount(goalText)
  const shownUnit = kind === 'custom' ? unit.trim() || 'unidades' : info.unit
  const deadlineDays = deadline ? daysUntil(today, deadline) : null
  const finalDays = deadline ? deadlineDays : days

  const problem =
    (!friend && 'Elige con quién.') ||
    (kind === 'custom' && !title.trim() && 'Ponle nombre al reto.') ||
    (kind === 'custom' && !unit.trim() && 'Escribe qué medís (por ejemplo, flexiones).') ||
    goalError(kind, goal) ||
    (finalDays === null && 'La fecha límite tiene que ser de hoy a dentro de 14 días.') ||
    null

  function chooseKind(next: TeamKind) {
    setKind(next)
    setGoalText(String(kindInfo(next).goals[1] ?? kindInfo(next).goals[0]))
  }

  function close() {
    if (create.isPending) return
    create.reset()
    setTried(false)
    setDeadline('')
    onClose()
  }

  function submit() {
    setTried(true)
    if (problem || !friend || finalDays === null) return
    create.mutate(
      {
        friendId: friend.user_id,
        kind,
        goal,
        days: finalDays,
        title: kind === 'custom' ? title.trim() : null,
        unit: kind === 'custom' ? unit.trim() : null,
      },
      { onSuccess: close },
    )
  }

  const chip = (active: boolean) =>
    `rounded-full border-2 px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
      active ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-muted hover:text-ink'
    }`

  return (
    <Sheet open={open} title="Nuevo reto en equipo" onClose={close} closeDisabled={create.isPending}>
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold">1. ¿Con quién?</h3>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Amigo">
            {friends.map((f) => {
              const active = friend?.user_id === f.user_id
              return (
                <button
                  key={f.user_id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFriendId(f.user_id)}
                  className={`flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-bold transition-all active:scale-95 ${
                    active ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-muted'
                  }`}
                >
                  <Avatar name={f.display_name} photo={f.avatar_path} color={f.avatar_color} className="h-7 w-7 text-xs" />
                  {f.display_name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">2. ¿Qué vais a sumar?</h3>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de reto">
            {TEAM_KINDS.map((item) => {
              const active = item.kind === kind
              return (
                <button
                  key={item.kind}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => chooseKind(item.kind)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center text-xs font-bold transition-all active:scale-95 ${
                    active ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-muted'
                  }`}
                >
                  <TeamKindIcon kind={item.kind} className="h-6 w-6" />
                  {item.label}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted">{info.hint}</p>
        </section>

        {kind === 'custom' && (
          <section className="grid grid-cols-[1fr_8rem] gap-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Nombre</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value.slice(0, 40))}
                placeholder="Flexiones"
                className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Unidad</span>
              <input
                value={unit}
                onChange={(event) => setUnit(event.target.value.slice(0, 12))}
                placeholder="flexiones"
                className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base outline-none focus:border-brand"
              />
            </label>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold">3. Meta entre los dos</h3>
          <div className="flex items-center gap-3">
            <input
              value={goalText}
              onChange={(event) => setGoalText(event.target.value.replace(/[^\d.,]/g, '').slice(0, 7))}
              inputMode={info.whole ? 'numeric' : 'decimal'}
              aria-label={`Meta en ${shownUnit}`}
              className="w-28 rounded-2xl border border-line bg-surface px-4 py-3 text-center text-lg font-bold outline-none focus:border-brand"
            />
            <span className="font-semibold text-muted">{shownUnit}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {info.goals.map((value) => (
              <button key={value} type="button" onClick={() => setGoalText(String(value))} className={chip(goal === value)}>
                {formatAmount(value, shownUnit)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">4. ¿Cuánto tiempo?</h3>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Duración">
            {DURATIONS.map((d) => (
              <button
                key={d.days}
                type="button"
                role="radio"
                aria-checked={!deadline && days === d.days}
                onClick={() => {
                  setDays(d.days)
                  setDeadline('')
                }}
                className={chip(!deadline && days === d.days)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-3 text-sm">
            <span className="font-semibold text-muted">o hasta el</span>
            <input
              type="date"
              value={deadline}
              min={today}
              onChange={(event) => setDeadline(event.target.value)}
              className="!w-auto rounded-2xl border border-line bg-surface px-3 py-2 text-base outline-none focus:border-brand"
            />
          </label>
        </section>

        {friend && !goalError(kind, goal) && finalDays !== null && (
          <p className="rounded-2xl bg-surface-2 p-4 text-sm">
            <span className="font-bold">
              {formatAmount(goal, shownUnit)} entre {friend.display_name.split(' ')[0]} y tú
            </span>{' '}
            en {finalDays === 1 ? '1 día' : `${finalDays} días`}. Cada uno aporta al menos {MIN_SHARE} %
            ({formatAmount(Math.round(goal * MIN_SHARE) / 100, shownUnit)}).{' '}
            <span className="font-bold text-accent-ink">+{teamXp(finalDays)} XP para cada uno</span> al cumplirlo.
            {info.maxEntry > 0 && <span className="mt-1 block text-xs text-muted">Cada uno apunta lo que hace: es un reto de confianza.</span>}
          </p>
        )}

        {((tried && problem) || create.error) && (
          <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
            {create.error ? friendlyTeamError(errorMessage(create.error)) : problem}
          </p>
        )}

        <button type="button" onClick={submit} disabled={create.isPending} className="btn-primary w-full py-3.5 disabled:opacity-60">
          {create.isPending ? 'Enviando…' : 'Enviar invitación'}
        </button>
      </div>
    </Sheet>
  )
}
