import { Navigate, Outlet, useLocation } from 'react-router'
import { OnboardingGate } from '@/features/onboarding/OnboardingGate'
import { useAuth } from './AuthProvider'

// Guardia de entrada: si no has iniciado sesión, te manda a /login.
// Envuelve las rutas privadas en routes.tsx.
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-muted">Cargando...</div>
  }

  if (!session) {
    // Guardamos a dónde iba para llevarle allí después de entrar
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <>
      <Outlet />
      {/* Tutorial de bienvenida: solo la primera vez (o si lo pides desde Perfil) */}
      <OnboardingGate />
    </>
  )
}
