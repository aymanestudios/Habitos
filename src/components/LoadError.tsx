import { Mascot } from './Mascot'

type Props = {
  what: string // "tus hábitos", "la parte de amigos"...
  onRetry?: () => void
  compact?: boolean // dentro de otra tarjeta: solo una línea
}

// Error al cargar: amable, sin jerga técnica, y con un botón para reintentar.
export function LoadError({ what, onRetry, compact = false }: Props) {
  const retry = onRetry && (
    <button
      type="button"
      onClick={onRetry}
      className={compact ? 'ml-1 font-bold underline' : 'btn-primary mt-4 px-5 py-2.5 text-sm'}
    >
      Reintentar
    </button>
  )

  if (compact) {
    return (
      <p className="mt-2 text-sm text-danger" role="alert">
        No se pudo cargar {what}.{retry}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center rounded-3xl border-2 border-line bg-surface p-6 text-center" role="alert">
      <Mascot pose="sleep" className="h-20" />
      <p className="mt-3 font-bold">No se pudo cargar {what}</p>
      <p className="mt-1 text-sm text-muted">Revisa la conexión e inténtalo otra vez.</p>
      {retry}
    </div>
  )
}
