import { avatarColorClass, isAvatarEmoji } from '@/lib/avatarStyle'

type Tone = 'brand' | 'accent' | 'good'

const tones: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-ink',
  accent: 'bg-accent-soft text-accent-ink',
  good: 'bg-good-soft text-good-ink',
}

type Props = {
  name: string
  tone?: Tone
  emoji?: string | null // si la persona eligió uno (perfil), se ve en vez de la inicial
  color?: string | null // color elegido en el perfil; si no hay, se usa el "tone"
  className?: string
}

// Avatar: emoji elegido o inicial del nombre, sobre el color elegido (no hay fotos de perfil)
export function Avatar({ name, tone = 'brand', emoji, color, className = 'h-11 w-11 text-base' }: Props) {
  const colorClass = avatarColorClass(color) ?? tones[tone]
  const showEmoji = isAvatarEmoji(emoji)
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${colorClass} ${className}`}
      aria-hidden="true"
    >
      {showEmoji ? <span className="leading-none">{emoji}</span> : name.charAt(0).toUpperCase()}
    </span>
  )
}
