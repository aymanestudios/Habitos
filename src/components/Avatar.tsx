type Tone = 'brand' | 'accent' | 'good'

const tones: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand',
  accent: 'bg-accent-soft text-accent',
  good: 'bg-good-soft text-good',
}

type Props = { name: string; tone?: Tone; className?: string }

// Avatar con la inicial del nombre (en el MVP no hay fotos de perfil)
export function Avatar({ name, tone = 'brand', className = 'h-11 w-11 text-base' }: Props) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${tones[tone]} ${className}`}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
