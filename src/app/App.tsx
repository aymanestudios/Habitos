import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { queryClient } from '@/lib/queryClient'
import { AppRoutes } from './routes'

// Aquí se "enchufan" las herramientas globales:
// - QueryClientProvider: datos del servidor (TanStack Query)
// - BrowserRouter: navegación entre pantallas (React Router)
// - ErrorBoundary: si algo falla, aviso con botón de recargar en vez de pantalla en blanco
export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
