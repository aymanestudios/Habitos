import { useEffect, useMemo, useRef, useState } from 'react'
import { LoadError } from '@/components/LoadError'
import { Link } from 'react-router'
import { Card } from '@/components/Card'
import { HabitRow } from '@/components/HabitRow'
import { Icon } from '@/components/Icon'
import { LevelBar } from '@/components/LevelBar'
import { Mascot } from '@/components/Mascot'
import { MOOD_ANIMATION, MOOD_POSE, mascotMood, reactionFor } from './mascotRules'
import { easyStart, takeRecap, welcomeFor } from './homeRules'
import { HomeChallenges } from '@/features/challenges/HomeChallenges'
import type { Welcome } from './homeRules'
import { useTodayGlance, useWeekRecap } from './useHome'
import { WeekRecapSheet } from './WeekRecapSheet'
import { Avatar } from '@/components/Avatar'
import { activityText, timeAgo } from '@/features/friends/friendRules'
import { useFriendActivity } from '@/features/friends/useFriends'
import { nextRewards, remainingText } from '@/features/rewards/rewardRules'
import { completesHabit } from '@/features/posts/postRules'
import { SharePostSheet } from '@/features/posts/SharePostSheet'
import { useMyRecentPosts } from '@/features/posts/usePosts'
import { HomeStreaks } from '@/features/streaks/HomeStreaks'
import { KindPreview } from '@/features/rewards/RewardArt'
import { RARITY, takeNewUnlocks } from '@/features/rewards/rewardRules'
import type { Reward } from '@/features/rewards/rewardRules'
import { useMyRewards } from '@/features/rewards/useRewards'
import { PageSkeleton } from '@/components/Skeleton'
import { ProgressRing } from '@/components/ProgressRing'
// Hoy es la pantalla que junta cosas de otras partes, por eso (y solo por eso) importa de habits y profile.
import { buildDayItems, dayMessage, isDailyKind, itemMeta, summarizeDay } from '@/features/habits/dayRules'
import type { DayItem } from '@/features/habits/dayRules'
import { errorMessage, friendlyProgressError } from '@/features/habits/habitRules'
import { useAddProgress, useHabitLogs } from '@/features/habits/useHabitLogs'
import { useHabits } from '@/features/habits/useHabits'
import { streakLabel, xpToastText } from '@/features/profile/progressRules'
import { completeChanges, groupReminders, timeLabel } from '@/features/reminders/reminderRules'
import { useReminders, useUpdateReminder } from '@/features/reminders/useReminders'
import { useProfile } from '@/features/profile/useProfile'
import { useProgress } from '@/features/profile/useProgress'
import { burst } from '@/lib/confetti'
import { addDays, getUserTimezone, greetingFor, localHour, weekStart } from '@/lib/dates'
import { useNow } from '@/lib/useNow'
import { useToday } from '@/lib/useToday'

type View = 'today' | 'yesterday'

export function DashboardPage() {
  const profile = useProfile()
  const habits = useHabits()
  // Siempre la zona horaria del PERFIL (la misma que usa el servidor), no la del dispositivo
  const timeZone = profile.data?.timezone ?? getUserTimezone()
  const today = useToday(timeZone)
  const [view, setView] = useState<View>('today')
  const isToday = view === 'today'
  const date = isToday ? today : addDays(today, -1)

  // Se piden los registros desde el lunes de la semana de "ayer" hasta hoy: cubre ambas vistas
  const from = weekStart(addDays(today, -1))
  const logs = useHabitLogs(from, today)
  const progress = useProgress()
  const reminders = useReminders()
  const updateReminder = useUpdateReminder()
  const now = useNow()

  // Aviso flotante "+20 XP": el servidor dice cuántos XP ha ganado (o quitado) cada toque
  const [toast, setToast] = useState<{ id: number; text: string; gain: boolean } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  function showToast(text: string, gain: boolean, ms = 1800) {
    window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text, gain })
    toastTimer.current = window.setTimeout(() => setToast(null), ms)
  }
  const addProgress = useAddProgress(from, today, (xpDelta, change) => {
    const text = xpToastText(xpDelta)
    if (text) {
      showToast(text, xpDelta > 0)
    } else if (change.delta > 0 && change.habit.target_value === null && change.date === change.habit.start_date) {
      // El día que se crea un hábito no da XP (regla anti-trampas): se lo explicamos en vez de callar
      showToast('Primer día: mañana ya suma XP', false, 2600)
    }
  })

  const items = useMemo(
    () => buildDayItems(habits.data ?? [], logs.data ?? [], date),
    [habits.data, logs.data, date],
  )
  const summary = summarizeDay(items)
  const message = dayMessage(summary, isToday, progress.data?.current_streak ?? 0)
  const allDone = summary.total > 0 && summary.done === summary.total
  const ready = profile.isSuccess && habits.isSuccess && logs.isSuccess

  // Celebración: confeti y baile de la mascota al pasar de "día incompleto" a "día completo".
  // Al abrir la app o cambiar entre Hoy/Ayer no se dispara (solo cuando TÚ completas el día).
  const [celebrating, setCelebrating] = useState(false)
  const [levelUp, setLevelUp] = useState<number | null>(null) // tarjeta "¡Nivel N!" con el panda de la estrella

  // Datos de un vistazo, resumen semanal y actividad de amigos (0017 y 0012)
  const glance = useTodayGlance()
  const recap = useWeekRecap()
  const friendActivity = useFriendActivity(true)
  const [recapOpen, setRecapOpen] = useState(false)
  const [welcome, setWelcome] = useState<Welcome | null>(null)
  const firstNameForWelcome = profile.data?.display_name.split(' ')[0] ?? ''
  useEffect(() => {
    // El resumen sale una vez por semana; la bienvenida, si vuelves tras unos días (una vez al día)
    if (recap.isSuccess && takeRecap(recap.data ?? null)) setRecapOpen(true)
  }, [recap.isSuccess, recap.data])
  useEffect(() => {
    if (!glance.data || !firstNameForWelcome) return
    const next = welcomeFor(firstNameForWelcome, glance.data.daysAway, today)
    if (next) setWelcome(next) // solo se abre; se cierra con la X
  }, [glance.data, firstNameForWelcome, today])

  // ¡Nueva recompensa! (lo desbloqueado lo calcula el servidor; aquí solo se celebra una vez)
  const rewards = useMyRewards()
  const [newReward, setNewReward] = useState<Reward | null>(null)
  useEffect(() => {
    if (!rewards.data) return
    const fresh = takeNewUnlocks(rewards.data)
    if (fresh.length > 0) setNewReward(fresh[fresh.length - 1])
  }, [rewards.data])
  useEffect(() => {
    if (!newReward) return
    const timer = window.setTimeout(() => setNewReward(null), 6000)
    return () => window.clearTimeout(timer)
  }, [newReward])

  // Fotos de logros: aviso "¿Quieres compartir tu progreso?" y panel para publicar
  type ShareTarget = { habitId: string; title: string; dayOffset: 0 | -1 }
  const [sharePrompt, setSharePrompt] = useState<ShareTarget | null>(null)
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null)
  const recentPosts = useMyRecentPosts(addDays(today, -1))
  const postedKeys = useMemo(
    () => new Set((recentPosts.data ?? []).map((post) => `${post.habit_id}|${post.local_date}`)),
    [recentPosts.data],
  )
  useEffect(() => {
    if (!sharePrompt) return
    const timer = window.setTimeout(() => setSharePrompt(null), 9000) // se va solo si no lo usas
    return () => window.clearTimeout(timer)
  }, [sharePrompt])
  const lastDay = useRef<{ date: string; allDone: boolean } | null>(null)
  const celebrationTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!ready) return
    const last = lastDay.current
    if (last && last.date === date && !last.allDone && allDone) {
      burst(window.innerWidth / 2, window.innerHeight * 0.35, { count: 70, power: 1.4 })
      setCelebrating(true)
      window.clearTimeout(celebrationTimer.current)
      celebrationTimer.current = window.setTimeout(() => setCelebrating(false), 1200)
    }
    lastDay.current = { date, allDone }
  }, [ready, date, allDone])

  // Subida de nivel: solo cuando el nivel SUBE mientras estás en la pantalla (no al abrir la app)
  const lastLevel = useRef<number | null>(null)
  const levelTimer = useRef<number | undefined>(undefined)
  const level = progress.data?.level
  useEffect(() => {
    if (level === undefined) return
    const previous = lastLevel.current
    lastLevel.current = level
    if (previous !== null && level > previous) {
      burst(window.innerWidth / 2, window.innerHeight * 0.3, { count: 90, power: 1.6 })
      setCelebrating(true)
      window.clearTimeout(celebrationTimer.current)
      celebrationTimer.current = window.setTimeout(() => setCelebrating(false), 1200)
      window.clearTimeout(levelTimer.current)
      setLevelUp(level)
      levelTimer.current = window.setTimeout(() => setLevelUp(null), 3200)
    }
  }, [level])

  // El panda reacciona al momento cada vez que completas un hábito de hoy (unos segundos)
  const todayDone = useMemo(
    () => (habits.data ? summarizeDay(buildDayItems(habits.data, logs.data ?? [], today)) : null),
    [habits.data, logs.data, today],
  )
  const [reaction, setReaction] = useState<{ id: number; text: string } | null>(null)
  const reactionTimer = useRef<number | undefined>(undefined)
  const lastDone = useRef<{ date: string; done: number } | null>(null)
  useEffect(() => {
    if (!ready || !todayDone) return
    const last = lastDone.current
    lastDone.current = { date: today, done: todayDone.done }
    if (!last || last.date !== today || todayDone.done <= last.done) return
    const text = reactionFor(todayDone.done, todayDone.total, today)
    window.clearTimeout(reactionTimer.current)
    if (!text) {
      setReaction(null)
      return
    }
    setReaction({ id: Date.now(), text })
    reactionTimer.current = window.setTimeout(() => setReaction(null), 2800)
  }, [ready, todayDone, today])

  useEffect(
    () => () => {
      window.clearTimeout(reactionTimer.current)
      window.clearTimeout(celebrationTimer.current)
      window.clearTimeout(toastTimer.current)
      window.clearTimeout(levelTimer.current)
    },
    [],
  )

  if (profile.isError || habits.isError || logs.isError) {
    return (
      <LoadError
        what="tu día"
        onRetry={() => {
          void profile.refetch()
          void habits.refetch()
          void logs.refetch()
        }}
      />
    )
  }

  if (!profile.data || !habits.data || !logs.data) {
    return <PageSkeleton />
  }

  const firstName = profile.data.display_name.split(' ')[0]
  const hour = localHour(new Date(), timeZone)
  const greeting = greetingFor(hour)
  // Mediodía en UTC para formatear una fecha "suelta" sin que ninguna zona horaria la mueva de día
  const dateLabel = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))

  const hasHabits = habits.data.some((habit) => habit.archived_at === null)
  const dailyItems = items.filter((item) => isDailyKind(item.habit))
  const weeklyItems = items.filter((item) => !isDailyKind(item.habit))

  // La mascota mira siempre HOY (aunque estés viendo la pestaña de ayer)
  const todaySummary = isToday ? summary : summarizeDay(buildDayItems(habits.data, logs.data ?? [], today))
  const mascot = mascotMood({
    hasHabits,
    total: todaySummary.total,
    done: todaySummary.done,
    streak: progress.data?.current_streak ?? 0,
    hour,
    date: today,
  })

  const easy = isToday ? easyStart(dailyItems) : null // plan fácil al volver tras unos días

  const nearestReward = rewards.data ? (nextRewards(rewards.data, 1)[0] ?? null) : null
  const recentFriends = (friendActivity.data ?? []).slice(0, 2)

  // Recordatorios pendientes de hoy (y atrasados). Si la tabla aún no existe, la tarjeta simplemente no sale.
  const reminderGroups = groupReminders(reminders.data ?? [], now)
  const pendingReminders = [...reminderGroups.overdue, ...reminderGroups.today]
  const remindersCard = reminders.data && (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name="bell" className="h-5 w-5 text-brand-ink" />
          Recordatorios
        </h2>
        <Link to="/habitos/recordatorios" className="text-sm font-bold text-brand-ink">
          {reminders.data.length === 0 ? 'Añadir' : 'Ver todos'}
        </Link>
      </div>
      {pendingReminders.length === 0 ? (
        <p className="mt-1 text-sm text-muted">Nada pendiente para hoy.</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {pendingReminders.slice(0, 3).map((reminder) => (
            <li key={reminder.id} className="flex items-center gap-3 py-2.5">
              <span
                className={`w-12 shrink-0 text-sm font-bold ${
                  new Date(reminder.due_at) < now ? 'text-danger' : 'text-muted'
                }`}
              >
                {timeLabel(reminder.due_at)}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{reminder.title}</span>
              <button
                type="button"
                aria-label={`Marcar como hecho: ${reminder.title}`}
                onClick={() =>
                  updateReminder.mutate({ id: reminder.id, changes: completeChanges(reminder, new Date()) })
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-line text-transparent transition-all hover:border-brand hover:text-brand-ink active:scale-90"
              >
                <Icon name="check" className="h-4 w-4" />
              </button>
            </li>
          ))}
          {pendingReminders.length > 3 && (
            <li className="pt-2 text-sm text-muted">Y {pendingReminders.length - 3} más.</li>
          )}
        </ul>
      )}
    </Card>
  )

  function change(item: DayItem, delta: number) {
    if (item.checked) return // hecho = cerrado: ni sumar ni quitar
    addProgress.mutate({ habit: item.habit, date, dayOffset: isToday ? 0 : -1, delta })
    // Al completarlo, ofrecemos (sin obligar) compartir una foto
    if (completesHabit(item.value, delta, item.numeric ? item.habit.target_value : 1)) {
      setSharePrompt({ habitId: item.habit.id, title: item.habit.title, dayOffset: isToday ? 0 : -1 })
    }
  }

  function shareFor(item: DayItem) {
    return {
      shared: postedKeys.has(`${item.habit.id}|${date}`),
      onShare: () => {
        setSharePrompt(null)
        setShareTarget({ habitId: item.habit.id, title: item.habit.title, dayOffset: isToday ? 0 : -1 })
      },
    }
  }

  function renderRow(item: DayItem) {
    const common = { title: item.habit.title, meta: itemMeta(item), done: item.checked }
    if (item.numeric) {
      return (
        <HabitRow
          key={item.habit.id}
          {...common}
          share={shareFor(item)}
          progress={item.progress}
          counter={{
            onMinus: () => change(item, -item.step),
            onPlus: () => change(item, item.step),
            canMinus: item.value > 0,
          }}
        />
      )
    }
    return (
      <HabitRow
        key={item.habit.id}
        {...common}
        share={shareFor(item)}
        onToggle={() => change(item, item.value >= 1 ? -1 : 1)}
      />
    )
  }

  return (
    <>
      {toast && (
        <div
          key={toast.id}
          role="status"
          className={`animate-xp pointer-events-none fixed left-1/2 top-20 z-50 rounded-full px-5 py-2 text-lg font-bold shadow-lg ${
            toast.gain ? 'bg-accent text-on-brand' : 'bg-surface-2 text-muted'
          }`}
        >
          {toast.text}
        </div>
      )}

      {newReward && levelUp === null && (
        <Link
          to="/logros"
          role="status"
          onClick={() => setNewReward(null)}
          className="animate-published fixed inset-x-3 top-20 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-3xl border-2 border-accent bg-surface p-3 pr-5 shadow-2xl"
        >
          <Mascot pose="star" className="h-14" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold uppercase tracking-wide text-muted">¡Nueva recompensa!</span>
            <span className="block truncate font-extrabold">{newReward.title}</span>
            <span className={`block text-xs font-bold ${RARITY[newReward.rarity].text}`}>{RARITY[newReward.rarity].label} · Toca para verla</span>
          </span>
          <KindPreview kind={newReward.kind} id={newReward.id} rarity={newReward.rarity} metric={newReward.metric} locked={false} size={44} />
        </Link>
      )}

      {levelUp !== null && (
        <div
          role="status"
          className="animate-published pointer-events-none fixed inset-x-0 top-20 z-50 mx-auto flex w-fit items-center gap-3 rounded-3xl border-2 border-accent bg-surface py-2 pl-2 pr-6 shadow-2xl"
        >
          <Mascot pose="star" className="h-16" />
          <span>
            <span className="block text-xl font-extrabold">¡Nivel {levelUp}!</span>
            <span className="block text-sm text-muted">Sigue así, vas imparable.</span>
          </span>
        </div>
      )}

      <div className="stagger space-y-5">
        <header className="min-w-0">
          <p className="text-sm text-muted first-letter:uppercase">{dateLabel}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting}, {firstName}
          </h1>
        </header>

        {/* Bienvenida al volver tras unos días: cálida y sin reproches (se cierra y no vuelve hoy) */}
        {welcome && (
          <Card className="animate-pop-in flex items-center gap-3">
            <Mascot pose="default" className="animate-hop h-16 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{welcome.title}</p>
              <p className="text-sm text-muted">{welcome.text}</p>
              {easy && (
                <button
                  type="button"
                  onClick={() => {
                    change(easy, easy.numeric ? easy.step : 1)
                    setWelcome(null)
                  }}
                  className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-bold text-brand-ink active:scale-95"
                >
                  <Icon name="check" className="h-4 w-4 shrink-0" />
                  <span className="truncate">Empezar por: {easy.habit.title}</span>
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setWelcome(null)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </Card>
        )}

        {/* Rachas compartidas: lo primero que se ve al entrar */}
        <HomeStreaks />

        {/* Retos relámpago activos (y la celebración del panda al cumplir uno) */}
        <HomeChallenges />

        {!hasHabits ? (
          <Card className="flex flex-col items-center text-center">
            <Mascot pose="gym" className="mb-2 h-32" />
            <h2 className="text-lg font-bold">Aún no tienes hábitos</h2>
            <p className="mt-1 text-muted">Crea el primero y empieza tu racha.</p>
            <Link to="/habitos/nuevo" className="mt-4 inline-flex items-center gap-2 btn-primary px-5 py-3">
              <Icon name="plus" className="h-5 w-5" />
              Crear mi primer hábito
            </Link>
          </Card>
        ) : (
          <>
            {/* TU DÍA: progreso, XP de hoy, racha y nivel en una sola tarjeta, con el panda */}
            <Card className="relative overflow-hidden">
              <div className="flex items-center gap-4">
                <ProgressRing value={summary.percent} size={104} stroke={10} tone={allDone ? 'good' : 'brand'}>
                  <span className="text-2xl font-bold">{summary.total === 0 ? '—' : `${summary.percent}%`}</span>
                  <span className="text-xs text-muted">{isToday ? 'de hoy' : 'de ayer'}</span>
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-tight">{message.title}</h2>
                  <p key={reaction ? reaction.id : mascot.text} className="animate-pop-in mt-1 text-sm text-muted">
                    {isToday ? (reaction?.text ?? mascot.text) : message.text}
                  </p>
                </div>
                <div
                  key={reaction ? reaction.id : mascot.mood}
                  className={`hidden shrink-0 origin-bottom min-[400px]:block ${reaction ? 'animate-hop' : MOOD_ANIMATION[mascot.mood]}`}
                >
                  <Mascot
                    pose={levelUp ? 'star' : reaction ? 'gym' : MOOD_POSE[mascot.mood]}
                    className={`h-20 max-w-[110px] object-contain origin-bottom ${celebrating ? 'animate-tada' : ''}`}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
                <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-accent-ink">
                  <Icon name="bolt" className="h-4 w-4" />+{glance.data?.xpToday ?? 0} XP hoy
                </span>
                {progress.data && (
                  <span className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-brand-ink">
                    <Icon name="flame" className="h-4 w-4" />
                    {streakLabel(progress.data.current_streak)}
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-muted">
                  {summary.done}/{summary.total} hechos
                </span>
              </div>
              {progress.data && (
                <LevelBar
                  className="mt-3"
                  level={progress.data.level}
                  xpIntoLevel={progress.data.xp_into_level}
                  xpLevelSize={progress.data.xp_level_size}
                />
              )}
            </Card>

            {/* La recompensa más cercana: un objetivo claro y alcanzable */}
            {nearestReward && (
              <Link
                to="/logros"
                className="flex items-center gap-3 rounded-3xl border-2 border-line bg-surface p-3 pr-4 transition-transform active:scale-[0.98]"
              >
                <KindPreview
                  kind={nearestReward.kind}
                  id={nearestReward.id}
                  rarity={nearestReward.rarity}
                  metric={nearestReward.metric}
                  locked={false}
                  size={44}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">Próxima recompensa: {nearestReward.title}</span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${nearestReward.percent}%` }} />
                  </span>
                  <span className="mt-1 block text-xs text-muted">{remainingText(nearestReward)}</span>
                </span>
                <span className="text-xl text-muted" aria-hidden="true">›</span>
              </Link>
            )}

            {addProgress.isError && (
              <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                {friendlyProgressError(errorMessage(addProgress.error))}
              </p>
            )}

            <div className={`grid gap-5 ${weeklyItems.length > 0 ? 'lg:grid-cols-3' : ''}`}>
              <div className={`space-y-5 ${weeklyItems.length > 0 ? 'lg:col-span-2' : ''}`}>
                {dailyItems.length > 0 && (
                  <Card>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <h2 className="text-lg font-bold">{isToday ? 'Tus hábitos de hoy' : 'Tus hábitos de ayer'}</h2>
                      {/* Ayer solo para corregir algo que olvidaste marcar */}
                      <button
                        type="button"
                        onClick={() => setView(isToday ? 'yesterday' : 'today')}
                        className="text-sm font-bold text-brand-ink"
                      >
                        {isToday ? '¿Olvidaste algo ayer?' : 'Volver a hoy'}
                      </button>
                    </div>
                    <div className="divide-y divide-line">{dailyItems.map(renderRow)}</div>
                  </Card>
                )}

                {isToday && pendingReminders.length > 0 && remindersCard}

                {/* Qué hacen tus amigos (lo último, en pequeño) */}
                {isToday && recentFriends.length > 0 && (
                  <Card>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-bold">Tus amigos</h2>
                      <Link to="/amigos" className="text-sm font-bold text-brand-ink">
                        Ver más
                      </Link>
                    </div>
                    <ul className="mt-1 divide-y divide-line">
                      {recentFriends.map((item) => (
                        <li key={`${item.itemType}-${item.itemId}`}>
                          <Link to={`/amigos/${item.userId}`} className="flex items-center gap-3 py-2.5">
                            <Avatar
                              name={item.name}
                              color={item.avatarColor}
                              photo={item.avatarPath}
                              className="h-9 w-9 text-sm"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{activityText(item)}</span>
                              <span className="block text-xs text-muted">
                                {timeAgo(item.createdAt)}
                                {item.photoPath && ' · con foto'}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>

              {weeklyItems.length > 0 && (
                <Card className="self-start">
                  <h2 className="mb-1 text-lg font-bold">Esta semana</h2>
                  <div className="divide-y divide-line">{weeklyItems.map(renderRow)}</div>
                </Card>
              )}
            </div>
          </>
        )}
      <WeekRecapSheet recap={recap.data ?? null} open={recapOpen} onClose={() => setRecapOpen(false)} />
    </div>
      {sharePrompt && !shareTarget && (
        <div
          key={sharePrompt.habitId}
          role="status"
          className="animate-sheet fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-md items-center gap-3 rounded-3xl border-2 border-line bg-surface p-3 pl-4 shadow-2xl lg:bottom-6"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
            <Icon name="camera" className="h-5 w-5" />
          </span>
          <p className="min-w-0 flex-1 text-sm">
            <span className="block font-bold">¿Quieres compartir tu progreso?</span>
            <span className="block truncate text-muted">{sharePrompt.title}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setShareTarget(sharePrompt)
              setSharePrompt(null)
            }}
            className="btn-primary shrink-0 px-4 py-2 text-sm"
          >
            Compartir
          </button>
          <button
            type="button"
            onClick={() => setSharePrompt(null)}
            aria-label="Ahora no"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      )}
      <SharePostSheet target={shareTarget} onClose={() => setShareTarget(null)} />
    </>
  )
}
