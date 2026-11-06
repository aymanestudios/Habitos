import type { ReactNode } from 'react'

type Props = { title: string; subtitle?: string; action?: ReactNode }

export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
