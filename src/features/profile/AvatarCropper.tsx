import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { maxOffset } from '@/lib/imageTools'

export const CROP_VIEW = 248 // lado del visor circular en px

type Props = {
  url: string // vista previa (URL temporal del archivo elegido)
  width: number
  height: number
  onChange: (state: { zoom: number; offsetX: number; offsetY: number }) => void
}

// Visor circular: arrastra para mover la foto y usa la barra para acercar.
export function AvatarCropper({ url, width, height, onChange }: Props) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const limit = maxOffset(width, height, CROP_VIEW, zoom)
  const clamp = (value: number, max: number) => Math.min(max, Math.max(-max, value))
  const x = clamp(offset.x, limit.x)
  const y = clamp(offset.y, limit.y)

  useEffect(() => {
    onChange({ zoom, offsetX: x, offsetY: y })
  }, [zoom, x, y, onChange])

  const scale = (CROP_VIEW / Math.min(width, height)) * zoom

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative touch-none select-none overflow-hidden rounded-full border-4 border-brand bg-surface-2 shadow-card"
        style={{ width: CROP_VIEW, height: CROP_VIEW, cursor: drag.current ? 'grabbing' : 'grab' }}
        onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = { x: event.clientX, y: event.clientY, ox: x, oy: y }
        }}
        onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
          if (!drag.current) return
          setOffset({
            x: drag.current.ox + event.clientX - drag.current.x,
            y: drag.current.oy + event.clientY - drag.current.y,
          })
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <img
          src={url}
          alt="Vista previa de tu foto"
          draggable={false}
          className="animate-fade pointer-events-none absolute left-1/2 top-1/2 max-w-none"
          style={{
            width: width * scale,
            height: height * scale,
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
          }}
        />
      </div>
      <label className="flex w-full max-w-[248px] items-center gap-3 text-sm text-muted">
        <span aria-hidden="true">−</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          aria-label="Acercar"
          className="w-full accent-[var(--brand-ink)]"
        />
        <span aria-hidden="true">+</span>
      </label>
      <p className="text-xs text-muted">Arrastra para colocarla.</p>
    </div>
  )
}
