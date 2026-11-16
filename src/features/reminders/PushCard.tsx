import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { STATUS_TEXT } from './pushRules'
import { usePush } from './usePush'

// Tarjeta "Avisos en este dispositivo" (pantalla Recordatorios).
export function PushCard() {
  const push = usePush()
  if (!push.status) return null
  const { status } = push

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            status === 'on' ? 'bg-brand text-on-brand' : 'bg-brand-soft text-brand-ink'
          }`}
        >
          <Icon name="bell" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">Avisos en este dispositivo</h2>
          <p className="mt-1 text-sm text-muted">{STATUS_TEXT[status]}</p>
        </div>
      </div>

      {status === 'off' && (
        <button
          type="button"
          onClick={() => void push.enable()}
          disabled={push.busy}
          className="btn-primary mt-4 w-full px-4 py-3 disabled:opacity-60"
        >
          {push.busy ? 'Activando…' : 'Activar avisos'}
        </button>
      )}

      {status === 'on' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void push.test()}
            className="rounded-2xl border-2 border-line px-4 py-2.5 text-sm font-bold transition-colors hover:bg-surface-2"
          >
            Probar aviso
          </button>
          <button
            type="button"
            onClick={() => void push.disable()}
            disabled={push.busy}
            className="rounded-2xl px-4 py-2.5 text-sm font-bold text-muted transition-colors hover:text-ink"
          >
            Desactivar
          </button>
        </div>
      )}

      {push.error && (
        <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {push.error}
        </p>
      )}
    </Card>
  )
}
