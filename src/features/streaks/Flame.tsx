import { useId } from 'react'
import type { CSSProperties } from 'react'
import { fireLook } from './fireRules'

export type FlameMoment = 'ignite' | 'evolve' | 'kept' | null

type Props = {
  days: number
  size?: number // alto en px
  moment?: FlameMoment // animación especial de un momento (encender, evolucionar, racha mantenida)
  className?: string
}

// Dibujo de la llama (SVG): tres capas con degradados, lenguas laterales, resplandor,
// brasas que suben, chispas y aro de luz en la legendaria. Colores y tamaño salen de fireRules.
// Solo se animan transform y opacity (barato para el móvil). Con "reducir movimiento" se queda quieta.

const OUTER =
  'M46 4C50 22 60 30 66 40C70 30 70 24 68 16C80 30 86 52 84 80C82 112 68 134 50 134C32 134 16 114 16 86C16 64 26 50 34 38C35 48 39 54 43 57C40 40 42 20 46 4Z'
const MID =
  'M48 34C52 48 60 56 64 64C66 58 66 54 65 48C72 60 74 74 72 92C70 114 61 127 50 127C39 127 29 115 29 95C29 80 35 70 40 62C41 70 44 74 47 76C45 62 45 48 48 34Z'
const CORE =
  'M50 64C55 77 62 88 62 103C62 117 57 125 50 125C43 125 38 117 38 104C38 94 43 86 47 79C48 85 49 88 50 90C49 81 49 72 50 64Z'
const TONGUE_LEFT = 'M30 114C21 106 19 94 13 86C26 91 33 101 36 114Z'
const TONGUE_RIGHT = 'M70 114C79 106 81 94 87 86C74 91 67 101 64 114Z'

// Posiciones fijas (no aleatorias: así la llama no "salta" al volver a pintarse)
const EMBER_X = [44, 56, 38, 62, 50, 41, 59, 47, 53, 35, 65, 50, 43, 57]
const BURST_ANGLES = Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2)

export function Flame({ days, size = 120, moment = null, className = '' }: Props) {
  const look = fireLook(days)
  const id = useId().replace(/:/g, '')
  const p = look.palette
  // Más intensidad = movimiento un poco más vivo
  const speed = 1.15 - look.intensity * 0.35
  const style = {
    '--flame-speed': `${speed}`,
    width: size * 0.78,
    height: size,
  } as CSSProperties

  const momentClass =
    moment === 'ignite' ? 'flame-ignite' : moment === 'evolve' ? 'flame-evolve' : moment === 'kept' ? 'flame-kept' : ''

  return (
    <div className={`relative shrink-0 ${className}`} style={style} aria-hidden="true">
      {/* Resplandor detrás de la llama */}
      <div
        className="flame-glow absolute inset-x-[-30%] bottom-[-8%] top-[18%] rounded-full blur-2xl"
        style={{
          background: `radial-gradient(closest-side, ${p.glow}, transparent)`,
          opacity: look.lit ? 0.35 + look.intensity * 0.45 : 0.18,
        }}
      />

      {look.halo && (
        // Fuego legendario: aro de luz suave con una chispa que gira despacio
        <div
          className="flame-halo absolute left-1/2 top-[28%] aspect-square w-[124%] rounded-full"
          style={{
            transform: 'translateX(-50%)', // centrado también si "reducir movimiento" para la animación
            border: `1.5px solid ${p.tip}55`,
            boxShadow: `0 0 26px ${p.glow}55, inset 0 0 20px ${p.glow}30`,
          }}
        >
          <span
            className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: '#ffffff', boxShadow: `0 0 10px 3px ${p.glow}` }}
          />
        </div>
      )}

      <svg viewBox="0 0 100 140" className={`relative h-full w-full overflow-visible ${momentClass}`}>
        <defs>
          <linearGradient id={`${id}-o`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={p.outer} />
            <stop offset="65%" stopColor={p.mid} />
            <stop offset="100%" stopColor={p.tip} />
          </linearGradient>
          <linearGradient id={`${id}-m`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={p.mid} />
            <stop offset="100%" stopColor={p.tip} stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id={`${id}-c`} cx="50%" cy="78%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor={p.core} />
            <stop offset="100%" stopColor={p.mid} stopOpacity="0.2" />
          </radialGradient>
        </defs>

        <g
          className="flame-body"
          style={{ transform: `scale(${look.scale})`, transformOrigin: '50px 134px', opacity: look.lit ? 1 : 0.55 }}
        >
          {look.tongues && (
            <>
              <path d={TONGUE_LEFT} fill={`url(#${id}-o)`} className="flame-tongue-l" opacity="0.75" />
              <path d={TONGUE_RIGHT} fill={`url(#${id}-o)`} className="flame-tongue-r" opacity="0.75" />
            </>
          )}
          <path d={OUTER} fill={`url(#${id}-o)`} className="flame-outer" />
          <path d={MID} fill={`url(#${id}-m)`} className="flame-mid" />
          <path d={CORE} fill={`url(#${id}-c)`} className="flame-core" />
        </g>

        {/* Brasas que suben y se apagan */}
        {Array.from({ length: look.particles }, (_, i) => (
          <circle
            key={`e${i}`}
            cx={EMBER_X[i % EMBER_X.length]}
            cy={118}
            r={1.4 + (i % 3) * 0.5}
            fill={i % 2 ? p.tip : p.core}
            className="flame-ember"
            style={
              {
                '--dx': `${((i % 5) - 2) * 4}px`,
                animationDelay: `${(i * 0.37) % 2.4}s`,
                animationDuration: `${2.2 + (i % 4) * 0.35}s`,
              } as CSSProperties
            }
          />
        ))}

        {/* Chispas (desde el fuego rojo) */}
        {Array.from({ length: look.sparks }, (_, i) => (
          <circle
            key={`s${i}`}
            cx={EMBER_X[(i * 3 + 1) % EMBER_X.length]}
            cy={96}
            r={0.9}
            fill="#ffffff"
            className="flame-spark"
            style={
              {
                '--dx': `${((i % 3) - 1) * 9}px`,
                animationDelay: `${(i * 0.53) % 1.8}s`,
              } as CSSProperties
            }
          />
        ))}

        {/* Explosión de partículas al mantener la racha o evolucionar */}
        {(moment === 'kept' || moment === 'evolve') &&
          BURST_ANGLES.map((angle, i) => (
            <circle
              key={`b${i}`}
              cx={50}
              cy={86}
              r={moment === 'evolve' ? 2.4 : 1.8}
              fill={i % 2 ? p.tip : p.core}
              className="flame-burst"
              style={
                {
                  '--bx': `${Math.cos(angle) * (moment === 'evolve' ? 70 : 52)}px`,
                  '--by': `${Math.sin(angle) * (moment === 'evolve' ? 70 : 52)}px`,
                  animationDelay: `${(i % 4) * 0.04}s`,
                } as CSSProperties
              }
            />
          ))}
      </svg>
    </div>
  )
}
