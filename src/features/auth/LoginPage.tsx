import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { Card } from '@/components/Card'
import { Mascot } from '@/components/Mascot'
import { TextField } from '@/components/TextField'
import { APP_NAME } from '@/lib/constants'
import { isSupabaseConfigured } from '@/lib/env'
import { useAuth } from './AuthProvider'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'register' | 'forgot'

// Supabase devuelve los errores en inglés; aquí los traducimos a algo que se entienda.
function friendlyAuthError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (text.includes('already registered')) return 'Ese email ya tiene cuenta. Prueba a entrar.'
  if (text.includes('password should')) return 'La contraseña es demasiado corta o débil.'
  if (text.includes('email not confirmed'))
    return 'Aún no has confirmado tu email. Abre el enlace que te enviamos (mira también en spam) o pide otro abajo.'
  if (text.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.'
  if (text.includes('failed to fetch') || text.includes('network'))
    return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.'
  if (text.includes('database error'))
    return 'No se pudo crear tu cuenta ahora mismo. Inténtalo más tarde.'
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
  // Email pendiente de confirmar: se puede pedir otro enlace (con 60 s de espera entre envíos)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [resendWait, setResendWait] = useState(0)

  useEffect(() => {
    if (resendWait <= 0) return
    const timer = window.setTimeout(() => setResendWait((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendWait])

  // Si confirmas el email desde otro dispositivo (el móvil), este se entera solo:
  // mientras espera, reintenta entrar cada 12 s (máx. 6 min). Si aún no está confirmado, falla en silencio.
  useEffect(() => {
    if (!pendingEmail || !password) return
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      if (tries > 30) {
        window.clearInterval(timer)
        return
      }
      void supabase.auth.signInWithPassword({ email: pendingEmail, password })
    }, 12000)
    return () => window.clearInterval(timer)
  }, [pendingEmail, password])

  async function resendConfirmation() {
    if (!pendingEmail || resendWait > 0) return
    setError(null)
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: pendingEmail,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (resendError) {
      setError(friendlyAuthError(resendError.message))
      return
    }
    setInfo(`Te hemos enviado otro enlace a ${pendingEmail}. Mira también en spam.`)
    setResendWait(60)
  }

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
      if (mode === 'forgot') {
        // Enlace para elegir contraseña nueva (página /nueva-contrasena).
        // Siempre el mismo mensaje, exista o no la cuenta: así nadie puede averiguar qué emails están registrados.
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/nueva-contrasena`,
        })
        if (resetError && resetError.message.toLowerCase().includes('rate limit')) throw resetError
        setInfo('Si hay una cuenta con ese email, te llegará un enlace para elegir una contraseña nueva. Mira también en spam.')
      } else if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        const { needsConfirmation } = await signUp(name.trim(), email.trim(), password)
        if (needsConfirmation) {
          setPendingEmail(email.trim())
          setResendWait(60)
          setInfo(`¡Casi está! Te hemos enviado un email a ${email.trim()}. Pulsa el enlace para activar tu cuenta (mira también en spam).`)
        }
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : ''
      if (message.toLowerCase().includes('email not confirmed')) setPendingEmail(email.trim())
      setError(friendlyAuthError(message))
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

          {mode === 'forgot' ? (
            <div className="mb-5">
              <h2 className="text-lg font-bold">Recuperar contraseña</h2>
              <p className="mt-1 text-sm text-muted">Te enviamos un enlace a tu email para elegir una nueva.</p>
            </div>
          ) : (
          <div className="mb-5 grid grid-cols-2 rounded-2xl bg-surface-2 p-1">
            <button type="button" className={tabClass('login')} onClick={() => setMode('login')}>
              Entrar
            </button>
            <button type="button" className={tabClass('register')} onClick={() => setMode('register')}>
              Crear cuenta
            </button>
          </div>
          )}

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
            {mode !== 'forgot' && (
              <TextField
                label="Contraseña"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
              />
            )}

            {error && (
              <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            {info && <p className="rounded-2xl bg-good-soft px-4 py-3 text-sm text-good-ink">{info}</p>}
            {pendingEmail && mode !== 'forgot' && (
              <button
                type="button"
                onClick={() => void resendConfirmation()}
                disabled={resendWait > 0}
                className="w-full rounded-2xl border-2 border-line px-4 py-2.5 text-sm font-bold text-brand-ink disabled:text-muted"
              >
                {resendWait > 0 ? `Reenviar email de confirmación (${resendWait} s)` : 'Reenviar email de confirmación'}
              </button>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full btn-primary px-4 py-3"
            >
              {busy ? 'Un momento...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}
            </button>
          </form>

          {mode !== 'register' && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'forgot' ? 'login' : 'forgot')
                setError(null)
                setInfo(null)
              }}
              className="mt-4 w-full text-center text-sm font-semibold text-brand-ink"
            >
              {mode === 'forgot' ? 'Volver a entrar' : '¿Has olvidado la contraseña?'}
            </button>
          )}
        </Card>
      </div>
    </div>
  )
}
