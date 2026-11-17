import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Card } from '@/components/Card'
import { Mascot } from '@/components/Mascot'
import { TextField } from '@/components/TextField'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

// /nueva-contrasena: aquí llega el enlace del email "Recuperar contraseña".
// Supabase lee el enlace y abre una sesión temporal; con ella se guarda la contraseña nueva.
export function ResetPasswordPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password !== repeat) {
      setError('Las dos contraseñas no coinciden.')
      return
    }
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) {
      const text = updateError.message.toLowerCase()
      setError(
        text.includes('different from the old')
          ? 'La contraseña nueva tiene que ser distinta de la anterior.'
          : text.includes('password should')
            ? 'La contraseña es demasiado corta o débil.'
            : 'No se pudo guardar. Pide otro enlace e inténtalo de nuevo.',
      )
      return
    }
    setDone(true)
    window.setTimeout(() => navigate('/', { replace: true }), 1500)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Mascot className="mb-3 h-28" />
          <h1 className="text-2xl font-bold tracking-tight">Contraseña nueva</h1>
        </div>
        <Card>
          {loading ? (
            <p className="py-4 text-center text-muted">Comprobando el enlace...</p>
          ) : !session ? (
            <div className="space-y-4 text-center">
              <p>Este enlace ya no vale (caduca en una hora y solo se usa una vez).</p>
              <Link to="/login" className="block w-full btn-primary px-4 py-3">
                Pedir otro enlace
              </Link>
            </div>
          ) : done ? (
            <p className="rounded-2xl bg-good-soft px-4 py-3 text-center text-good-ink">¡Contraseña cambiada! Entrando…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <TextField label="Contraseña nueva" type="password" value={password} onChange={setPassword} autoComplete="new-password" required minLength={8} />
              <TextField label="Repítela" type="password" value={repeat} onChange={setRepeat} autoComplete="new-password" required minLength={8} />
              {error && (
                <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className="w-full btn-primary px-4 py-3">
                {busy ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
