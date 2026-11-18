import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  closeDisabled?: boolean // mientras se sube algo, no se puede cerrar
}

// Panel que sube desde abajo en el móvil y sale centrado en el ordenador.
// Se cierra con la X, tocando fuera o con la tecla Escape.
export function Sheet({ open, title, onClose, children, closeDisabled = false }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  // onClose y closeDisabled cambian en cada render del padre (p. ej. al escribir una letra).
  // Si el efecto dependiera de ellos, se repetiría en cada tecla y panel.focus() cerraría el teclado del móvil.
  const latest = useRef({ onClose, closeDisabled })
  latest.current = { onClose, closeDisabled }

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // que no se mueva la página de detrás
    panel.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !latest.current.closeDisabled) latest.current.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={() => !closeDisabled && onClose()}
        className="animate-fade absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="animate-sheet pb-safe relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border-2 border-line bg-surface p-5 shadow-2xl outline-none sm:max-w-md sm:rounded-[28px]"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted transition-colors hover:text-ink disabled:opacity-40"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
