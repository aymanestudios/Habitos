import { useState } from 'react'
import { Card } from '@/components/Card'
import { errorMessage } from '@/features/habits/habitRules'
import { AVATAR_COLORS, BIO_MAX } from '@/lib/avatarStyle'
import type { Profile } from './useProfile'
import { useUpdateProfileStyle } from './useProfile'

// "Tu perfil": color del avatar (cuando no hay foto) y una frase. Marcos y accesorios se equipan en Logros.
export function StyleCard({ profile }: { profile: Profile }) {
  const save = useUpdateProfileStyle()
  const [color, setColor] = useState(profile.avatar_color || 'teal')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [saved, setSaved] = useState(false)
  const changed = color !== (profile.avatar_color || 'teal') || bio.trim() !== (profile.bio ?? '')

  function submit() {
    setSaved(false)
    // avatar_emoji se deja como estaba (ya no se muestra, pero no borramos datos)
    save.mutate({ avatar_emoji: profile.avatar_emoji, avatar_color: color, bio }, { onSuccess: () => setSaved(true) })
  }

  return (
    <Card>
      <h2 className="text-lg font-bold">Tu perfil</h2>

      <label className="mt-3 block">
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

      {!profile.avatar_path && (
        <>
          <p className="text-sm font-semibold">Color del avatar</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Color del avatar">
            {AVATAR_COLORS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={color === option.value}
                aria-label={option.label}
                title={option.label}
                onClick={() => setColor(option.value)}
                className={`h-10 w-10 rounded-full transition-all active:scale-90 ${option.className} ${
                  color === option.value ? 'ring-[3px] ring-brand ring-offset-2 ring-offset-surface' : 'opacity-80'
                }`}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={submit} disabled={!changed || save.isPending} className="btn-primary px-5 py-2.5 disabled:opacity-50">
          {save.isPending ? 'Guardando…' : 'Guardar'}
        </button>
        {saved && !changed && <span className="animate-pop-in text-sm font-semibold text-good-ink">¡Guardado!</span>}
      </div>
      {save.isError && (
        <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {errorMessage(save.error).includes('column') ? 'Esto no está disponible ahora mismo.' : 'No se pudo guardar. Inténtalo otra vez.'}
        </p>
      )}
    </Card>
  )
}
