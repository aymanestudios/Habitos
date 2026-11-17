import { QueryClient } from '@tanstack/react-query'

// TanStack Query guarda en memoria los datos que pedimos al servidor,
// evita pedirlos dos veces seguidas y los vuelve a pedir cuando conviene.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // durante 30 s consideramos los datos "frescos"
      refetchOnWindowFocus: true, // al volver a la app (PWA en segundo plano) se ponen al día los datos viejos
      retry: 1,
    },
  },
})
