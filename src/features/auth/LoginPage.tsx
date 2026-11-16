import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { Card } from '@/components/Card'
import { Mascot } from '@/components/Mascot'
import { TextField } from '@/components/TextField'
import { APP_NAME } from '@/lib/constants'
import { isSupabaseConfigured } from '@/lib/env'
import { useAuth } from './AuthProvider'

type Mode = 'login' | 'register'

// Supabase devuelve los errores en inglés; aquí los traducimos a algo que se entienda.
function friendlyAuthError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (text.includes('already registered')) return 'Ese email ya tiene cuenta. Prueba a entrar.'
  if (text.includes('password should')) return 'La contraseña es demasiado corta o débil.'
  if (text.includes('email not confirmed'))
    return 'Confirma tu email antes de entrar (revisa tu bandeja de entrada).'
  if (text.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.'
  if (text.includes('failed to fetch') || text.includes('network'))
    return 'No se pudo conectar con Supabase. Revisa .env.local y tu conexión.'
  if (text.includes('database error'))
    return 'No se pudo crear el perfil. ¿Has ejecutado la migración 0001_profiles.sql en Supabase?'
  return message || 'Algo ha salido mal. Inténtalo de nuevo.'
}

export function LoginPage() {
  const { session, signIn, signUp } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // Si ya hay sesión (acabas de entrar o ya la tenías), fuera de aquí
  if (session) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        const { needsConfirmation } = await signUp(name.trim(), email.trim(), password)
        if (needsConfirmation) {
          setInfo('Te hemos enviado un email para confirmar la cuenta. Ábrelo y vuelve a entrar.')
        }
      }
    } catch (caught) {
      setError(friendlyAuthError(caught instanceof Error ? caught.message : ''))
    } finally {
      setBusy(false)
    }
  }

  function tabClass(tab: Mode) {
    return `rounded-xl py-2.5 text-sm font-semibold transition-colors ${
      mode === tab ? 'bg-surface text-ink shadow-sm' : 'text-muted'
    }`
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Mascot className="mb-3 h-36" />
          <h1 className="text-3xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="mt-1 text-muted">Constancia en equipo</p>
        </div>

        <Card>
          {!isSupabaseConfigured && (
            <p className="mb-5 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
              Falta configurar <strong>.env.local</strong>. Mira el estado en{' '}
              <Link to="/estado" className="font-semibold underline">
                /estado
              </Link>
              .
            </p>
          )}

          <div className="mb-5 grid grid-cols-2 rounded-2xl bg-surface-2 p-1">
            <button type="button" className={tabClass('login')} onClick={() => setMode('login')}>
              Entrar
            </button>
            <button type="button" className={tabClass('register')} onClick={() => setMode('register')}>
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <TextField
                label="Tu nombre"
                value={name}
                onChange={setName}
                autoComplete="name"
                required
              />
            )}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={8}
            />

            {error && (
              <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            {info && <p className="rounded-2xl bg-good-soft px-4 py-3 text-sm text-good-ink">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full btn-primary px-4 py-3"
            >
              {busy ? 'Un momento...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}
