import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getUserTimezone } from '@/lib/dates'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'

// La sesión (quién ha entrado) la necesita toda la app, así que vive en un "contexto":
// cualquier componente puede preguntar "¿quién soy?" con useAuth().

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean // true mientras comprobamos si ya había una sesión guardada
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
}

async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

async function signUp(name: string, email: string, password: string) {
  // El nombre y la zona horaria viajan al servidor, que crea el perfil (migración 0001)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name, timezone: getUserTimezone() } },
  })
  if (error) throw error
  // Si la confirmación por email está activada, no hay sesión hasta que confirme
  return { needsConfirmation: data.session === null }
}

async function signOut() {
  await supabase.auth.signOut()
  queryClient.clear() // olvidamos los datos en memoria para que no los vea la siguiente persona
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. ¿Había una sesión guardada de otra vez?
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // 2. Avisos de Supabase: entrar, salir, sesión renovada...
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, loading, signIn, signUp, signOut }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return context
}
