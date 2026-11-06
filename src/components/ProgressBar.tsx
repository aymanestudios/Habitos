type Tone = 'brand' | 'accent' | 'good'

// Las clases se escriben completas (no se montan con texto) para que Tailwind las detecte.
const tones: Record<Tone, string> = {
  brand: 'bg-brand',
  accent: 'bg-accent',
  good: 'bg-good',
}

type Props = { value: number; tone?: Tone; className?: string }

export function ProgressBar({ value, tone = 'brand', className = '' }: Props) {
  const pct = Math.min(Math.max(value, 0), 100)
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-surface-2 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${tones[tone]} transition-[width] duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
