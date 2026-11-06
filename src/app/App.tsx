import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { queryClient } from '@/lib/queryClient'
import { AppRoutes } from './routes'

// Aquí se "enchufan" las herramientas globales:
// - QueryClientProvider: datos del servidor (TanStack Query)
// - BrowserRouter: navegación entre pantallas (React Router)
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
