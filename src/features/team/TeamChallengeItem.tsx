import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { splitBar } from '@/features/celebrations/celebrationRules'
import { useCelebrations } from '@/features/celebrations/CelebrationProvider'
import { errorMessage } from '@/features/habits/habitRules'
import { burstFrom } from '@/lib/confetti'
import { SplitBar, TeamKindIcon } from './TeamArt'
import {
  amountError,
  firstName,
  formatAmount,
  friendlyTeamError,
  kindInfo,
  minEach,
  parseAmount,
  progressText,
  teamTitle,
  timeLeftText,
  totalPercent,
} from './teamRules'
import type { TeamChallenge } from './teamRules'
import { useAddContribution, useCancelTeamChallenge, useRemoveContribution, useRespondTeamChallenge } from './useTeam'

// Panel para apuntar lo que has hecho (solo lo tuyo: el servidor no deja apuntar por otro).
function ContributeSheet({ challenge, onClose }: { challenge: TeamChallenge | null; onClose: () => void }) {
  const add = useAddContribution()
  const celebrations = useCelebrations()
  const [text, setText] = useState('')
  const [tried, setTried] = useState(false)
  const c = challenge
  const info = kindInfo(c?.kind ?? 'custom')
  const amount = parseAmount(text)
  const problem = c ? amountError(c, amount) : null

  function close() {
    if (add.isPending) return
    add.reset()
    setText('')
    setTried(false)
    onClose()
  }

  function submit() {
    setTried(true)
    if (!c || problem) return
    add.mutate(
      { id: c.id, amount },
      {
        onSuccess: (result) => {
          close()
          // Si con esto se cumple el reto, la celebración grande la lanza TeamWatcher (con los datos del servidor)
          if (result.status !== 'completed') celebrations.xp(0, `+${formatAmount(amount, c.unit)} al reto`)
        },
      },
    )
  }

  return (
    <Sheet open={c !== null} title="Apuntar progreso" onClose={close} closeDisabled={add.isPending}>
      {c && (
        <div className="space-y-4">
          <p className="-mt-2 text-sm text-muted">
            {teamTitle(c)} · llevas <span className="font-bold text-ink">{formatAmount(c.mine, c.unit)}</span>
          </p>
          <div className="flex items-center justify-center gap-3">
            <input
              value={text}
              onChange={(event) => setText(event.target.value.replace(/[^\d.,]/g, '').slice(0, 6))}
              inputMode={info.whole ? 'numeric' : 'decimal'}
              placeholder="0"
              aria-label={`Cantidad en ${c.unit}`}
              className="w-32 rounded-2xl border-2 border-line bg-surface px-4 py-3 text-center text-3xl font-black outline-none focus:border-brand"
            />
            <span className="text-lg font-bold text-muted">{c.unit}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {info.quick.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setText(String(value))}
                className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                  amount === value ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line text-muted'
                }`}
              >
                +{formatAmount(value, c.unit)}
              </button>
            ))}
          </div>
          {((tried && problem) || add.error) && (
            <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              {add.error ? friendlyTeamError(errorMessage(add.error)) : problem}
            </p>
          )}
          <button type="button" onClick={submit} disabled={add.isPending} className="btn-primary w-full py-3.5 disabled:opacity-60">
            {add.isPending ? 'Guardando…' : 'Sumar al reto'}
          </button>
          <p className="text-center text-xs text-muted">Si te equivocas, puedes deshacerlo durante 15 minutos.</p>
        </div>
      )}
    </Sheet>
  )
}

/** Cuánto aporta cada uno, con su avatar. */
function Person({ name, photo, color, value, unit, tone, need }: {
  name: string; photo: string | null; color: string | null; value: number; unit: string; tone: 'brand' | 'accent'; need: number
}) {
  const ok = value >= need
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={`rounded-full p-0.5 ${tone === 'brand' ? 'bg-brand' : 'bg-accent'}`}>
        <Avatar name={name} photo={photo} color={color} className="h-8 w-8 text-xs" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-muted">{name}</span>
        <span className="flex items-center gap-1 truncate text-sm font-extrabold tabular-nums">
          <span className="truncate">{formatAmount(value, unit)}</span>
          {need > 0 && ok && <Icon name="check" className="h-3.5 w-3.5 text-good" />}
        </span>
      </span>
    </div>
  )
}

/** Una tarjeta de reto: estado, tiempo, los dos, barra conjunta, recompensa y botón para aportar. */
export function TeamChallengeItem({ challenge: c, mePhoto, meColor }: {
  challenge: TeamChallenge; mePhoto: string | null; meColor: string | null
}) {
  const respond = useRespondTeamChallenge()
  const cancel = useCancelTeamChallenge()
  const remove = useRemoveContribution()
  const [contributing, setContributing] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const bar = splitBar(c.mine, c.theirs, c.goal)
  const need = minEach(c)
  const info = kindInfo(c.kind)
  const card = useRef<HTMLDivElement>(null)

  // La barra crece cuando entra progreso nuevo: un pequeño destello en la tarjeta
  const lastTotal = useRef(c.mine + c.theirs)
  const [bump, setBump] = useState(0)
  useEffect(() => {
    const total = c.mine + c.theirs
    if (total > lastTotal.current) setBump(Date.now())
    lastTotal.current = total
  }, [c.mine, c.theirs])
  useEffect(() => {
    if (bump && c.status === 'active') burstFrom(card.current?.querySelector('[data-bar]') ?? null, { count: 10, power: 0.5 })
  }, [bump, c.status])

  const undoable = c.recent.find((k) => k.mine && Date.now() - Date.parse(k.at) < 15 * 60_000)
  const error = respond.error ?? cancel.error ?? remove.error
  const closed = c.status !== 'active' && c.status !== 'pending'

  return (
    <div ref={card} className={`rounded-3xl border-2 p-4 ${c.status === 'completed' ? 'border-good/60 bg-good-soft/40' : 'border-line bg-surface'} ${closed ? 'opacity-90' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${c.status === 'completed' ? 'bg-good text-on-brand' : 'bg-brand-soft text-brand-ink'}`}>
          <TeamKindIcon kind={c.kind} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold leading-tight">{teamTitle(c)}</p>
          <p className="text-sm text-muted">
            {formatAmount(c.goal, c.unit)} entre los dos
            {(c.status === 'active' || c.status === 'pending') && <> · {c.status === 'pending' ? `${c.days} ${c.days === 1 ? 'día' : 'días'}` : timeLeftText(c)}</>}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-extrabold text-accent-ink">
          {c.status === 'completed' && c.xp !== null ? (c.xp > 0 ? `+${c.xp} XP` : 'Sin XP') : `+${c.xpReward} XP`}
        </span>
      </div>

      {c.status !== 'pending' && (
        <>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Person name="Tú" photo={mePhoto} color={meColor} value={c.mine} unit={c.unit} tone="brand" need={need} />
            <span className="whitespace-nowrap rounded-full bg-surface-2 px-2.5 py-1 text-sm font-black tabular-nums">{totalPercent(c)} %</span>
            <div className="flex min-w-0 justify-end">
              <Person name={firstName(c.partner.name)} photo={c.partner.avatarPath} color={c.partner.avatarColor} value={c.theirs} unit={c.unit} tone="accent" need={need} />
            </div>
          </div>
          <div data-bar className={`mt-3 ${bump ? 'animate-pop-in' : ''}`} key={bump}>
            <SplitBar mine={bar.mine} theirs={bar.theirs} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {progressText(c)}
            {c.status === 'active' && need > 0 && ` Mínimo de cada uno: ${formatAmount(need, c.unit)}.`}
            {c.status === 'completed' && c.xp === 0 && ' (Ya habías ganado XP con 2 retos esta semana.)'}
          </p>
        </>
      )}
      {c.status === 'pending' && <p className="mt-3 text-sm">{progressText(c)}</p>}

      {error && <p className="mt-2 text-sm text-danger">{friendlyTeamError(errorMessage(error))}</p>}

      {/* Acciones */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {c.status === 'pending' && !c.createdByMe && (
          <>
            <button type="button" disabled={respond.isPending} onClick={() => respond.mutate({ id: c.id, accept: true })} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-60">
              ¡Me apunto!
            </button>
            <button type="button" disabled={respond.isPending} onClick={() => respond.mutate({ id: c.id, accept: false })} className="rounded-2xl px-4 py-2.5 text-sm font-bold text-muted hover:text-ink">
              Ahora no
            </button>
          </>
        )}
        {c.status === 'pending' && c.createdByMe && (
          <button type="button" disabled={cancel.isPending} onClick={() => cancel.mutate(c.id)} className="rounded-2xl px-3 py-2 text-sm font-bold text-muted hover:text-ink">
            Retirar invitación
          </button>
        )}
        {c.status === 'active' && info.maxEntry > 0 && c.stillFriends && (
          <button type="button" onClick={() => setContributing(true)} className="btn-primary flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm">
            <Icon name="plus" className="h-4 w-4" />
            Apuntar progreso
          </button>
        )}
        {c.status === 'active' && info.maxEntry === 0 && (
          <p className="flex-1 text-xs font-semibold text-brand-ink">Suma solo: completa tus hábitos de hoy.</p>
        )}
        {c.status === 'active' && undoable && (
          <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(undoable.id)} className="rounded-2xl px-3 py-2 text-sm font-bold text-muted hover:text-ink">
            Deshacer {formatAmount(undoable.amount, c.unit)}
          </button>
        )}
        {c.status === 'active' && !confirmLeave && (
          <button type="button" onClick={() => setConfirmLeave(true)} className="ml-auto rounded-2xl px-2 py-2 text-xs font-bold text-muted hover:text-ink">
            Abandonar
          </button>
        )}
        {c.status === 'active' && confirmLeave && (
          <span className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-muted">¿Seguro? Nadie gana XP.</span>
            <button type="button" onClick={() => cancel.mutate(c.id)} className="rounded-full bg-danger-soft px-3 py-1.5 font-bold text-danger">Sí</button>
            <button type="button" onClick={() => setConfirmLeave(false)} className="rounded-full px-2 py-1.5 font-bold text-muted">No</button>
          </span>
        )}
      </div>

      <ContributeSheet challenge={contributing ? c : null} onClose={() => setContributing(false)} />
    </div>
  )
}
