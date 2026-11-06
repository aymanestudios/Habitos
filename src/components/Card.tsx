import type { ReactNode } from 'react'

// Tarjeta base: fondo, borde y sombra suaves. Todas las secciones de la app se apoyan en ella.
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-line bg-surface p-5 shadow-card ${className}`}>
      {children}
    </div>
  )
}
