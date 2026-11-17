import { useState } from 'react'
import { Card } from '@/components/Card'
import { errorMessage } from '@/features/habits/habitRules'
import { CapsuleSheet } from './CapsuleSheet'
import { cycle, friendlySkinError, skinSrc, ticketText } from './skinRules'
import { useEquipSkin, useMySkins } from './useSkins'

function TicketIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" />
      <path d="M14 5v3M14 11v2M14 16v3" />
    </svg>
  )
}

// Skins del panda: tickets (1 cada 7 días cumplidos), cápsula misteriosa y tu colección.
// Solo se ven las skins que ya has conseguido: el resto es una sorpresa.
export function SkinsCard() {
  const skins = useMySkins()
  const equip = useEquipSkin()
  const [opening, setOpening] = useState(false)

  if (skins.isError) return null // p. ej. falta la migración: la página de Logros sigue funcionando
  if (!skins.data) return null
  const state = skins.data
  const turn = cycle(state)
  const canOpen = state.unlimited || state.available > 0

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <TicketIcon className="h-5 w-5 text-brand-ink" />
            Skins del panda
          </h2>
          <p className="mt-1 text-sm text-muted">Cada 7 días cumplidos ganas un ticket para una cápsula sorpresa.</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-surface-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold">{ticketText(state)}</p>
          <button
            type="button"
            onClick={() => setOpening(true)}
            disabled={!canOpen}
            className="btn-primary shrink-0 px-4 py-2 text-sm"
          >
            Abrir cápsula
          </button>
        </div>
        {!state.unlimited && (
          <div className="mt-3">
            <div
              className="h-2.5 overflow-hidden rounded-full bg-surface"
              role="progressbar"
              aria-valuenow={turn.done}
              aria-valuemin={0}
              aria-valuemax={turn.per}
              aria-label="Días hasta el próximo ticket"
            >
              <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${(turn.done / turn.per) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {turn.done}/{turn.per} días para el próximo ticket
            </p>
          </div>
        )}
        {state.unlimited && <p className="mt-2 text-xs text-muted">Estamos en pruebas: puedes abrir todas las cápsulas que quieras.</p>}
      </div>

      {state.owned.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Aún no tienes ninguna skin. ¡Abre tu primera cápsula y descubre cuál te toca!</p>
      ) : (
        <>
          <h3 className="mt-5 font-bold">Tu colección</h3>
          <ul className="mt-2 grid grid-cols-3 gap-3">
            {state.owned.map((skin) => {
              const active = state.equipped === skin.id
              return (
                <li key={skin.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    disabled={equip.isPending}
                    onClick={() => equip.mutate(active ? null : skin.id)}
                    className={`flex w-full flex-col items-center rounded-2xl border-2 p-2 transition-all active:scale-95 ${
                      active ? 'border-brand bg-brand-soft' : 'border-line bg-surface'
                    }`}
                  >
                    <img src={skinSrc(skin)} alt="" width={skin.width} height={skin.height} loading="lazy" className="h-20 w-auto max-w-full object-contain" />
                    <span className="mt-1 line-clamp-1 text-xs font-bold">{skin.name}</span>
                    <span className={`text-[11px] font-semibold ${active ? 'text-brand-ink' : 'text-muted'}`}>
                      {active ? 'Tu compañero' : 'Toca para usarla'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-muted">La skin que elijas acompaña a tu panda en toda la app. Toca otra vez para quitarla.</p>
        </>
      )}

      {equip.isError && (
        <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {friendlySkinError(errorMessage(equip.error))}
        </p>
      )}

      <CapsuleSheet open={opening} onClose={() => setOpening(false)} canOpen={canOpen} unlimited={state.unlimited} equippedId={state.equipped} />
    </Card>
  )
}
