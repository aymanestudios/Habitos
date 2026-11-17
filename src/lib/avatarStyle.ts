// Opciones del avatar (deben coincidir con 0011_profile_style.sql).

export const AVATAR_EMOJIS = [
  '🐼', '🦊', '🐯', '🐸', '🐙', '🦄', '🐧', '🦁', '🐨', '🐳',
  '🌵', '⚡', '🔥', '🌙', '🎧', '🎮', '⚽', '📚',
] as const

export type AvatarColor = 'teal' | 'coral' | 'violet' | 'amber' | 'green' | 'blue' | 'pink'

// Clases completas para que Tailwind las detecte
export const AVATAR_COLORS: { value: AvatarColor; label: string; className: string }[] = [
  { value: 'teal', label: 'Turquesa', className: 'bg-teal-300 text-teal-950' },
  { value: 'coral', label: 'Coral', className: 'bg-orange-300 text-orange-950' },
  { value: 'violet', label: 'Violeta', className: 'bg-violet-300 text-violet-950' },
  { value: 'amber', label: 'Ámbar', className: 'bg-amber-300 text-amber-950' },
  { value: 'green', label: 'Verde', className: 'bg-lime-300 text-lime-950' },
  { value: 'blue', label: 'Azul', className: 'bg-sky-300 text-sky-950' },
  { value: 'pink', label: 'Rosa', className: 'bg-pink-300 text-pink-950' },
]

export function avatarColorClass(color: string | null | undefined): string | null {
  return AVATAR_COLORS.find((option) => option.value === color)?.className ?? null
}

export function isAvatarEmoji(value: unknown): value is (typeof AVATAR_EMOJIS)[number] {
  return AVATAR_EMOJIS.includes(value as (typeof AVATAR_EMOJIS)[number])
}

export const BIO_MAX = 80
