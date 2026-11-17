import { useState } from 'react'
import type { CSSProperties } from 'react'
import { avatarColorClass } from '@/lib/avatarStyle'
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
  emoji?: string | null // ya no se muestra (se quitaron los emojis del perfil); se acepta para no romper llamadas
  color?: string | null // color elegido en el perfil; si no hay, se usa el "tone"
  photo?: string | null // ruta de la foto de perfil (Storage); si hay, se ve la foto
  className?: string
  style?: CSSProperties
}

// Avatar: foto de perfil; si no hay, la inicial del nombre sobre su color.
export function Avatar({ name, tone = 'brand', color, photo, className = 'h-11 w-11 text-base', style }: Props) {
  const colorClass = avatarColorClass(color) ?? tones[tone]
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
        style={style}
      />
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${colorClass} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
