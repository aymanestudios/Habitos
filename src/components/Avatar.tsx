import { useState } from 'react'
import { avatarColorClass, isAvatarEmoji } from '@/lib/avatarStyle'
import { avatarUrl } from '@/lib/storage'

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
  photo?: string | null // ruta de la foto de perfil (Storage); si hay, se ve la foto
  className?: string
}

// Avatar: foto de perfil; si no hay, emoji elegido o inicial del nombre sobre su color.
export function Avatar({ name, tone = 'brand', emoji, color, photo, className = 'h-11 w-11 text-base' }: Props) {
  const colorClass = avatarColorClass(color) ?? tones[tone]
  const showEmoji = isAvatarEmoji(emoji)
  const url = avatarUrl(photo)
  const [failed, setFailed] = useState<string | null>(null)

  if (url && failed !== url) {
    return (
      <img
        key={url}
        src={url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(url)}
        className={`animate-fade shrink-0 rounded-full bg-surface-2 object-cover ${className}`}
      />
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${colorClass} ${className}`}
      aria-hidden="true"
    >
      {showEmoji ? <span className="leading-none">{emoji}</span> : name.charAt(0).toUpperCase()}
    </span>
  )
}
