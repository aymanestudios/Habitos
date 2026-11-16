import type { ReactNode } from 'react'

type Tone = 'brand' | 'good'

// Las clases se escriben completas (no se montan con texto) para que Tailwind las detecte.
const tones: Record<Tone, string> = {
  brand: 'stroke-brand',
  good: 'stroke-good',
}

type Props = {
  value: number // 0 a 100
  tone?: Tone // 'good' (verde) cuando el día está completo
  size?: number
  stroke?: number
  children?: ReactNode // contenido que va dentro del anillo
}

export function ProgressRing({ value, size = 132, stroke = 12, tone = 'brand', children }: Props) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(value, 0), 100)
  const offset = circumference * (1 - pct / 100)

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${tones[tone]} transition-[stroke-dashoffset,stroke] duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
