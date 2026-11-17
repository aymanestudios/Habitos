import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { errorMessage } from '@/features/habits/habitRules'
import { AVATAR_COLORS, AVATAR_EMOJIS, BIO_MAX } from '@/lib/avatarStyle'
import type { Profile } from './useProfile'
import { useUpdateProfileStyle } from './useProfile'

// "Personaliza tu perfil": emoji, color y una frase. Tus amigos ven el emoji y el color.
export function StyleCard({ profile }: { profile: Profile }) {
  const save = useUpdateProfileStyle()
  const [emoji, setEmoji] = useState<string | null>(profile.avatar_emoji)
  const [color, setColor] = useState(profile.avatar_color || 'teal')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [saved, setSaved] = useState(false)

  const changed =
    emoji !== profile.avatar_emoji || color !== (profile.avatar_color || 'teal') || bio.trim() !== (profile.bio ?? '')

  function submit() {
    setSaved(false)
    save.mutate({ avatar_emoji: emoji, avatar_color: color, bio }, { onSuccess: () => setSaved(true) })
  }

  const chip = (active: boolean) =>
    `flex h-11 w-11 items-center justify-center rounded-full text-xl transition-all active:scale-90 ${
      active ? 'ring-[3px] ring-brand ring-offset-2 ring-offset-surface' : 'opacity-80 hover:opacity-100'
    }`

  return (
    <Card>
      <div className="flex items-center gap-4">
        <Avatar name={profile.display_name} emoji={emoji} color={color} className="h-16 w-16 text-3xl" />
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Personaliza tu perfil</h2>
          <p className="text-sm text-muted">Tus amigos ven tu emoji y tu color en el ranking.</p>
        </div>
      </div>

      <p className="mt-5 text-sm font-semibold">Emoji</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Emoji del avatar">
        <button
          type="button"
          aria-pressed={emoji === null}
          onClick={() => setEmoji(null)}
          className={`${chip(emoji === null)} bg-surface-2 text-sm font-bold text-muted`}
        >
          {profile.display_name.charAt(0).toUpperCase()}
        </button>
        {AVATAR_EMOJIS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={emoji === option}
            aria-label={`Emoji ${option}`}
            onClick={() => setEmoji(option)}
            className={`${chip(emoji === option)} bg-surface-2`}
          >
            {option}
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm font-semibold">Color</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Color del avatar">
        {AVATAR_COLORS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={color === option.value}
            aria-label={option.label}
            title={option.label}
            onClick={() => setColor(option.value)}
            className={`${chip(color === option.value)} ${option.className}`}
          />
        ))}
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-semibold">Tu frase</span>
        <input
          type="text"
          value={bio}
          maxLength={BIO_MAX}
          onChange={(event) => {
            setBio(event.target.value)
            setSaved(false)
          }}
          placeholder="Ej.: Un poco cada día"
          className="mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 outline-none transition-colors focus:border-brand"
        />
        <span className="mt-1 block text-right text-xs text-muted">
          {bio.length}/{BIO_MAX}
        </span>
      </label>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!changed || save.isPending}
          className="btn-primary px-5 py-2.5 disabled:opacity-50"
        >
          {save.isPending ? 'Guardando…' : 'Guardar'}
        </button>
        {saved && !changed && <span className="animate-pop-in text-sm font-semibold text-good-ink">¡Guardado!</span>}
      </div>

      {save.isError && (
        <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {errorMessage(save.error).includes('column')
            ? 'Falta ejecutar la migración 0011_profile_style.sql en Supabase.'
            : 'No se pudo guardar. Inténtalo otra vez.'}
        </p>
      )}
    </Card>
  )
}
