import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { DemoNotice } from '@/components/DemoNotice'
import { HabitRow } from '@/components/HabitRow'
import { Icon } from '@/components/Icon'
import { ProgressBar } from '@/components/ProgressBar'
import { ProgressRing } from '@/components/ProgressRing'
import { getUserTimezone, greetingFor, localHour } from '@/lib/dates'

// DISEÑO con datos ficticios. En la Fase 1 se sustituirán por datos reales de Supabase.
const habits = [
  { title: 'Entrenar 45 min', meta: 'Diario', done: true },
  { title: 'Leer 20 páginas', meta: 'Diario', done: true },
  { title: 'Estudiar programación', meta: 'Lun a Vie', done: true },
  { title: 'Beber agua', meta: '5 de 8 vasos', done: false, progress: 62 },
  { title: 'Dormir 8 horas', meta: 'Diario', done: false },
]

const friendActivity = [
  { name: 'Marta', text: 'completó su día al 100%', tone: 'good' as const },
  { name: 'Leo', text: 'subió al nivel 9', tone: 'accent' as const },
  { name: 'Sara', text: 'lleva 21 días de racha', tone: 'brand' as const },
]

export function DashboardPage() {
  const timeZone = getUserTimezone()
  const now = new Date()
  const greeting = greetingFor(localHour(now, timeZone))
  const dateLabel = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(now)

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted first-letter:uppercase">{dateLabel}</p>
          <h1 className="text-3xl font-bold tracking-tight">{greeting}, Alex</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-2 font-bold text-accent">
          <Icon name="flame" className="h-5 w-5" />
          12
        </div>
      </header>

      <DemoNotice />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex items-center gap-6 lg:col-span-2">
          <ProgressRing value={60}>
            <span className="text-3xl font-bold">60%</span>
            <span className="text-xs text-muted">de hoy</span>
          </ProgressRing>
          <div>
            <h2 className="text-lg font-bold">Vas muy bien</h2>
            <p className="mt-1 text-muted">Has completado 3 de 5 hábitos. Te quedan 2 para cerrar el día.</p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Nivel 7</h2>
            <span className="flex items-center gap-1 text-sm font-semibold text-accent">
              <Icon name="bolt" className="h-4 w-4" />
              340 XP
            </span>
          </div>
          <ProgressBar value={68} tone="accent" className="mt-4" />
          <p className="mt-3 text-sm text-muted">160 XP para el nivel 8</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-lg font-bold">Tus hábitos de hoy</h2>
          <div className="divide-y divide-line">
            {habits.map((habit) => (
              <HabitRow key={habit.title} {...habit} />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold">Tus amigos</h2>
          <ul className="space-y-4">
            {friendActivity.map((item) => (
              <li key={item.name} className="flex items-center gap-3">
                <Avatar name={item.name} tone={item.tone} />
                <p className="text-sm">
                  <span className="font-semibold">{item.name}</span>{' '}
                  <span className="text-muted">{item.text}</span>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
