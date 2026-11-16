// Bloques de carga: ocupan el sitio del contenido mientras llegan los datos (mejor que un "Cargando...").
export function Skeleton({ className = 'h-24' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando">
      <Skeleton className="h-14 w-2/3" />
      <Skeleton className="h-28" />
      <Skeleton className="h-36" />
      <Skeleton className="h-56" />
    </div>
  )
}
