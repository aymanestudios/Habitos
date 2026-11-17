import { useState } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { Mascot } from '@/components/Mascot'
import { newTicketCount } from './skinRules'
import { useMySkins } from './useSkins'

const KEY = 'pg-tickets-seen'

function readSeen(): number | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === null ? null : Number(raw)
  } catch {
    return null
  }
}

// Aviso en Inicio: "¡Has ganado un ticket!" (una vez por ticket, se cierra con la X).
export function TicketNotice() {
  const skins = useMySkins()
  const [seen, setSeen] = useState<number | null>(readSeen)
  const count = newTicketCount(skins.data, seen)
  if (count === 0 || !skins.data) return null

  function dismiss() {
    const earned = skins.data?.earned ?? 0
    try {
      localStorage.setItem(KEY, String(earned))
    } catch {
      // sin almacenamiento: reaparecerá la próxima vez
    }
    setSeen(earned)
  }

  return (
    <Card className="animate-pop-in flex items-center gap-3">
      <Mascot pose="cheer" className="animate-hop h-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{count === 1 ? '¡Has ganado un ticket!' : `¡Has ganado ${count} tickets!`}</p>
        <p className="text-sm text-muted">7 días cumplidos. Abre tu cápsula sorpresa.</p>
        <Link to="/logros" onClick={dismiss} className="mt-1 inline-block text-sm font-bold text-brand-ink">
          Ir a mis skins →
        </Link>
      </div>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={dismiss}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </Card>
  )
}
