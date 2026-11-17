import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router'
import { useOnboarding } from './useOnboarding'

// El tutorial se descarga aparte (solo lo necesitan las cuentas nuevas).
// Si la descarga fallase, no se enseña: nunca debe impedir usar la app.
const OnboardingTour = lazy(() =>
  import('./OnboardingTour')
    .then((module) => ({ default: module.OnboardingTour }))
    .catch(() => ({ default: () => null })),
)

// Va dentro de RequireAuth: solo existe con la sesión iniciada y no retrasa la carga de la app
// (mientras se comprueba si ya lo viste, no sale nada).
export function OnboardingGate() {
  const { open, replay, finish } = useOnboarding()
  const navigate = useNavigate()

  if (!open) return null

  function close(enterApp: boolean) {
    finish()
    // Primera vez y terminado: a Inicio, donde le señalamos "Crear mi primer hábito"
    if (enterApp && !replay) navigate('/', { state: { firstHabit: true } })
  }

  return (
    <Suspense fallback={null}>
      <OnboardingTour replay={replay} onSkip={() => close(false)} onDone={() => close(true)} />
    </Suspense>
  )
}
