import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { KindPreview } from '@/features/rewards/RewardArt'
import { RARITY } from '@/features/rewards/rewardRules'
import { burst, burstFrom } from '@/lib/confetti'
import { levelMessage, levelSteps, sortRewards } from './celebrationRules'
import type { Celebration, RewardLite } from './celebrationRules'

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ---------- Carcasas ----------

/** Pantalla completa (celebraciones grandes). Se cierra con el botón, tocando fuera o con Escape. */
function Stage({ label, onClose, children, tone = 'brand' }: { label: string; onClose: () => void; children: ReactNode; tone?: 'brand' | 'gold' | 'violet' }) {
  const box = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    box.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="celebration-stage animate-fade fixed inset-0 z-[70] flex items-center justify-center p-6"
      onClick={() => close.current()}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />
      <div aria-hidden="true" className={`cel-rays cel-rays-${tone}`} />
      <div ref={box} className="relative flex w-full max-w-sm flex-col items-center text-center" onClick={(event: MouseEvent) => event.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** Tarjeta arriba (celebraciones medianas). Se cierra sola; el tiempo solo corre con la app a la vista. */
function TopCard({ label, onClose, ms = 5000, children }: { label: string; onClose: () => void; ms?: number; children: ReactNode }) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    let left = ms
    let started = Date.now()
    let timer: number | undefined
    const run = () => {
      started = Date.now()
      timer = window.setTimeout(() => close.current(), left)
    }
    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(timer)
        left -= Date.now() - started
      } else run()
    }
    if (!document.hidden) run()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [ms])

  return createPortal(
    <div
      role="status"
      aria-label={label}
      className="animate-cel-drop fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[65] mx-auto max-w-sm rounded-3xl border-2 border-accent bg-surface p-3 pr-2 shadow-2xl"
    >
      <div className="flex items-center gap-3">
        {children}
        <button
          type="button"
          onClick={() => close.current()}
          aria-label="Cerrar"
          className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  )
}

// ---------- Subida de nivel (la grande) ----------

function LevelUp({ from, to, onClose }: { from: number; to: number; onClose: () => void }) {
  const steps = levelSteps(from, to)
  const [index, setIndex] = useState(() => (reducedMotion() ? steps.length - 1 : 0))
  const badge = useRef<HTMLDivElement>(null)
  const final = index === steps.length - 1

  // El número antiguo "se transforma" en el nuevo: primero se ve el viejo, luego cuenta hasta el real
  useEffect(() => {
    if (final) return
    const timer = window.setTimeout(() => setIndex((value) => value + 1), index === 0 ? 650 : 200)
    return () => window.clearTimeout(timer)
  }, [index, final])

  useEffect(() => {
    if (!final) return
    burstFrom(badge.current, { count: 46, power: 1.25 })
    const second = window.setTimeout(() => burst(window.innerWidth / 2, window.innerHeight * 0.25, { count: 30, power: 1.1 }), 260)
    return () => window.clearTimeout(second)
  }, [final])

  const shown = steps[index]
  return (
    <Stage label={`Nivel ${to} alcanzado`} onClose={onClose}>
      <div className="animate-cel-mascot relative">
        <Mascot pose="star" className="h-32 drop-shadow-xl" />
      </div>
      <div ref={badge} className={`cel-level-badge relative -mt-3 ${final ? 'cel-level-final' : ''}`}>
        <span key={shown} className="animate-cel-num block">{shown}</span>
      </div>
      <p className="animate-cel-up mt-5 text-[13px] font-extrabold uppercase tracking-[0.18em] text-white/80" style={{ animationDelay: '0.15s' }}>
        {to - from > 1 ? `Has subido ${to - from} niveles` : 'Nuevo nivel'}
      </p>
      <h2 className="animate-cel-up mt-1 text-[28px] font-black leading-tight text-white" style={{ animationDelay: '0.25s' }}>
        ¡Nivel {to} alcanzado!
      </h2>
      <p className="animate-cel-up mt-2 max-w-[18rem] text-[15px] font-semibold text-white/85" style={{ animationDelay: '0.4s' }}>
        {levelMessage(to)}
      </p>
      <button
        type="button"
        data-autofocus
        onClick={onClose}
        className="btn-primary animate-cel-up mt-7 w-full max-w-[15rem] py-3.5"
        style={{ animationDelay: '0.55s' }}
      >
        ¡A por más!
      </button>
    </Stage>
  )
}

// ---------- Logros ----------

function RewardBig({ rewards, onClose }: { rewards: RewardLite[]; onClose: () => void }) {
  const [main, ...rest] = sortRewards(rewards)
  const art = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => burstFrom(art.current, { count: 40, power: 1.1 }), 380)
    return () => window.clearTimeout(timer)
  }, [])
  const rarity = RARITY[main.rarity]
  return (
    <Stage label={`Nuevo logro: ${main.title}`} onClose={onClose} tone={main.rarity === 'legendary' ? 'gold' : 'violet'}>
      <p className="animate-cel-up text-[13px] font-extrabold uppercase tracking-[0.18em] text-white/80">
        Nuevo logro · {rarity.label}
      </p>
      <div ref={art} className="animate-cel-reveal mt-4 rounded-[28px] bg-surface p-5 shadow-2xl">
        <KindPreview kind={main.kind} id={main.id} rarity={main.rarity} metric={main.metric} locked={false} size={112} />
      </div>
      <h2 className="animate-cel-up mt-5 text-[26px] font-black leading-tight text-white" style={{ animationDelay: '0.3s' }}>
        {main.title}
      </h2>
      <p className="animate-cel-up mt-1 text-[15px] font-semibold text-white/85" style={{ animationDelay: '0.4s' }}>
        {main.description}
      </p>
      {rest.length > 0 && (
        <p className="animate-cel-up mt-3 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white" style={{ animationDelay: '0.5s' }}>
          Y {rest.length === 1 ? `también: ${rest[0].title}` : `${rest.length} logros más`}
        </p>
      )}
      <div className="animate-cel-up mt-7 flex w-full max-w-[17rem] flex-col gap-2" style={{ animationDelay: '0.6s' }}>
        <button type="button" data-autofocus onClick={onClose} className="btn-primary py-3.5">
          ¡Genial!
        </button>
        <Link to="/logros" onClick={onClose} className="rounded-2xl py-2.5 text-sm font-bold text-white/85 hover:text-white">
          Ver en Logros
        </Link>
      </div>
    </Stage>
  )
}

function RewardCard({ rewards, onClose }: { rewards: RewardLite[]; onClose: () => void }) {
  const [main, ...rest] = sortRewards(rewards)
  const art = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => burstFrom(art.current, { count: 18, power: 0.7 }), 250)
    return () => window.clearTimeout(timer)
  }, [])
  const rarity = RARITY[main.rarity]
  return (
    <TopCard label={`Nuevo logro: ${main.title}`} onClose={onClose} ms={6000}>
      <div ref={art} className="animate-cel-reveal shrink-0">
        <KindPreview kind={main.kind} id={main.id} rarity={main.rarity} metric={main.metric} locked={false} size={48} />
      </div>
      <Link to="/logros" onClick={onClose} className="min-w-0 flex-1 py-0.5">
        <span className="block text-xs font-bold uppercase tracking-wide text-muted">
          {rest.length > 0 ? `¡${rewards.length} logros nuevos!` : '¡Nuevo logro!'}
        </span>
        <span className="block truncate font-extrabold">{main.title}</span>
        <span className="block truncate text-xs text-muted">
          <span className={`font-bold ${rarity.text}`}>{rarity.label}</span> · {main.description}
        </span>
      </Link>
    </TopCard>
  )
}

// ---------- Día completo ----------

function DayDone({ total, onClose }: { total: number; onClose: () => void }) {
  useEffect(() => {
    burst(window.innerWidth / 2, window.innerHeight * 0.3, { count: 60, power: 1.3 })
  }, [])
  return (
    <TopCard label="¡Día completo!" onClose={onClose} ms={3800}>
      <Mascot pose="cheer" className="animate-hop h-14 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold leading-tight">¡Día completo!</span>
        <span className="block text-sm text-muted">
          {total === 1 ? 'Has hecho tu hábito de hoy.' : `Has hecho tus ${total} hábitos de hoy.`}
        </span>
      </span>
    </TopCard>
  )
}

// ---------- Reto en equipo cumplido ----------

function TeamDone({ item, onClose }: { item: Extract<Celebration, { kind: 'team' }>; onClose: () => void }) {
  const pair = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => burstFrom(pair.current, { count: 50, power: 1.2 }), 420)
    return () => window.clearTimeout(timer)
  }, [])
  const fmt = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1).replace('.', ',')} ${item.unit}`
  return (
    <Stage label={`Reto cumplido: ${item.title}`} onClose={onClose}>
      <p className="animate-cel-up text-[13px] font-extrabold uppercase tracking-[0.18em] text-white/80">Reto en equipo cumplido</p>
      <div ref={pair} className="relative mt-5 flex items-end justify-center">
        <div className="animate-cel-left">
          <Avatar name={item.me.name} photo={item.me.avatarPath} color={item.me.avatarColor} className="h-20 w-20 text-2xl ring-4 ring-white/90" />
        </div>
        <div className="animate-cel-mascot -mx-3 z-10">
          <Mascot pose="cheer" className="h-24 drop-shadow-xl" />
        </div>
        <div className="animate-cel-right">
          <Avatar name={item.partner.name} photo={item.partner.avatarPath} color={item.partner.avatarColor} className="h-20 w-20 text-2xl ring-4 ring-white/90" />
        </div>
      </div>
      <h2 className="animate-cel-up mt-5 text-[26px] font-black leading-tight text-white" style={{ animationDelay: '0.3s' }}>
        ¡Lo habéis conseguido juntos!
      </h2>
      <p className="animate-cel-up mt-1 text-[15px] font-semibold text-white/85" style={{ animationDelay: '0.4s' }}>
        {item.title} · {fmt(item.target)}
      </p>
      <div className="animate-cel-up mt-4 grid w-full max-w-[17rem] grid-cols-2 gap-2 text-sm" style={{ animationDelay: '0.5s' }}>
        <span className="rounded-2xl bg-white/15 px-3 py-2 font-bold text-white">
          Tú<span className="block text-lg">{fmt(item.me.value)}</span>
        </span>
        <span className="rounded-2xl bg-white/15 px-3 py-2 font-bold text-white">
          <span className="block truncate">{item.partner.name.split(' ')[0]}</span>
          <span className="block text-lg">{fmt(item.partner.value)}</span>
        </span>
      </div>
      {item.xp > 0 && (
        <p className="animate-cel-up mt-3 rounded-full bg-accent px-4 py-1.5 text-sm font-extrabold text-on-brand" style={{ animationDelay: '0.6s' }}>
          +{item.xp} XP para cada uno
        </p>
      )}
      <button type="button" data-autofocus onClick={onClose} className="btn-primary animate-cel-up mt-6 w-full max-w-[15rem] py-3.5" style={{ animationDelay: '0.7s' }}>
        ¡Qué equipo!
      </button>
    </Stage>
  )
}

/** Pinta la celebración activa (solo una a la vez; el resto espera en la cola). */
export function CelebrationView({ item, onClose }: { item: Celebration; onClose: () => void }) {
  if (item.kind === 'level') return <LevelUp from={item.from} to={item.to} onClose={onClose} />
  if (item.kind === 'team') return <TeamDone item={item} onClose={onClose} />
  if (item.kind === 'day') return <DayDone total={item.total} onClose={onClose} />
  const big = item.rewards.some((reward) => reward.rarity === 'epic' || reward.rarity === 'legendary')
  return big ? <RewardBig rewards={item.rewards} onClose={onClose} /> : <RewardCard rewards={item.rewards} onClose={onClose} />
}
