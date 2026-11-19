import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useProgress } from '@/features/profile/useProgress'
import { takeNewUnlocks } from '@/features/rewards/rewardRules'
import { useMyRewards } from '@/features/rewards/useRewards'
import { CelebrationView } from './CelebrationViews'
import { enqueue, levelChange } from './celebrationRules'
import type { Celebration } from './celebrationRules'
import { flyXp, trackPointer } from './xpFlyer'
import { TeamWatcher } from '@/features/team/TeamWatcher'

// Celebraciones de toda la app en UN sitio, con cola: nunca hay dos ventanas a la vez.
// Las pantallas solo avisan ("ha pasado esto"); qué se ve y en qué orden se decide aquí.

type Api = {
  celebrate: (item: Celebration) => void
  /** "+15 XP" (o un aviso corto) que vuela hacia la barra de nivel. `amount` = XP real del servidor. */
  xp: (amount: number, text?: string) => void
  /** true mientras se ve una celebración grande o mediana (para que el panda de Inicio no "compita"). */
  busy: boolean
}

const noop: Api = { celebrate: () => {}, xp: () => {}, busy: false }
const CelebrationContext = createContext<Api>(noop)

export function useCelebrations(): Api {
  return useContext(CelebrationContext)
}

function readNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key)
    const value = raw === null ? null : Number(raw)
    return value !== null && Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // modo privado o sin espacio: como mucho se celebra otra vez
  }
}

// Vigila el nivel (del servidor). Si sube, se celebra una vez por dispositivo, aunque los datos lleguen tarde.
function LevelWatcher({ onLevel }: { onLevel: (from: number, to: number) => void }) {
  const { user } = useAuth()
  const progress = useProgress()
  const level = progress.data?.level
  useEffect(() => {
    if (!user || level === undefined) return
    const key = `pg-level-seen:${user.id}`
    const { celebrate, store } = levelChange(readNumber(key), level)
    writeNumber(key, store)
    if (celebrate) onLevel(celebrate.from, celebrate.to)
  }, [user, level, onLevel])
  return null
}

// Vigila los logros (los decide el servidor). Lo nuevo desde la última vez se celebra junto.
function RewardWatcher({ onRewards }: { onRewards: (item: Celebration) => void }) {
  const { user } = useAuth()
  const rewards = useMyRewards()
  useEffect(() => {
    if (!user || !rewards.data) return
    const fresh = takeNewUnlocks(rewards.data, user.id)
    if (fresh.length > 0) onRewards({ kind: 'rewards', rewards: fresh })
  }, [user, rewards.data, onRewards])
  return null
}

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Celebration | null>(null)
  const queue = useRef<Celebration[]>([]) // lo que espera turno (no se pinta: no hace falta estado)
  const [announce, setAnnounce] = useState('')
  const activeRef = useRef<Celebration | null>(null)
  activeRef.current = active

  useEffect(() => trackPointer(), [])

  const celebrate = useCallback((item: Celebration) => {
    if (!activeRef.current) {
      activeRef.current = item
      setActive(item)
      return
    }
    queue.current = enqueue(queue.current, item)
  }, [])

  const close = useCallback(() => {
    const [next, ...rest] = queue.current
    queue.current = rest
    activeRef.current = next ?? null
    setActive(null)
    // Pequeña pausa entre una y otra para que no parezca un parpadeo
    if (next) window.setTimeout(() => setActive(next), 220)
  }, [])

  const xp = useCallback((amount: number, text?: string) => {
    if (!Number.isFinite(amount) || (amount === 0 && !text)) return
    flyXp(amount, text)
    setAnnounce(text ?? (amount > 0 ? `Has ganado ${amount} XP` : `Se han quitado ${Math.abs(amount)} XP`))
  }, [])

  const onNews = useCallback((text: string) => {
    flyXp(0, text, 'team')
    setAnnounce(text)
  }, [])

  const onLevel = useCallback((from: number, to: number) => celebrate({ kind: 'level', from, to }), [celebrate])

  const api = useMemo<Api>(() => ({ celebrate, xp, busy: active !== null }), [celebrate, xp, active])

  return (
    <CelebrationContext.Provider value={api}>
      {children}
      <LevelWatcher onLevel={onLevel} />
      <RewardWatcher onRewards={celebrate} />
      <TeamWatcher onCelebrate={celebrate} onNews={onNews} />
      {active && <CelebrationView key={JSON.stringify(active).slice(0, 80)} item={active} onClose={close} />}
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </CelebrationContext.Provider>
  )
}
