import type { ReactNode } from 'react'

// Tarjeta base: borde de 2 px y una sombra muy sutil para dar profundidad. Todas las secciones de la app se apoyan en ella.
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border-2 border-line bg-surface p-5 shadow-card ${className}`}>
      {children}
    </div>
  )
}
