import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { parseMark, shouldShowTour, storageKey } from './onboardingRules'
import type { LocalMark } from './onboardingRules'

// ===== "Ver tutorial de bienvenida" desde Perfil =====
// Un interruptor global muy pequeño (sin librerías): Perfil lo enciende y la puerta del tutorial lo escucha.
let replaying = false
const listeners = new Set<() => void>()

function setReplay(value: boolean) {
  replaying = value
  listeners.forEach((listener) => listener())
}

export function openOnboarding() {
  setReplay(true)
}

function useReplay() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => replaying,
  )
}

// ===== Copia en el dispositivo =====
function readMark(userId: string): LocalMark {
  try {
    return parseMark(localStorage.getItem(storageKey(userId)))
  } catch {
    return null // modo privado o almacenamiento bloqueado: manda el servidor
  }
}

function writeMark(userId: string, mark: Exclude<LocalMark, null>) {
  try {
    localStorage.setItem(storageKey(userId), mark)
  } catch {
    // sin almacenamiento: el servidor lo recuerda igual
  }
}

async function tellServer(userId: string) {
  const { error } = await supabase.rpc('finish_onboarding')
  if (error) throw error
  writeMark(userId, 'done')
}

/**
 * Estado del tutorial para quien ha entrado.
 * - open: si hay que mostrarlo ahora (primera vez o "Ver tutorial" desde Perfil)
 * - replay: true si lo ha abierto a mano (al terminar no le movemos de pantalla)
 * - finish(): al terminar o saltar. Cierra al momento y avisa al servidor (reintenta si no hay conexión).
 */
export function useOnboarding() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()
  const replay = useReplay()
  const [mark, setMark] = useState<LocalMark>(() => (userId ? readMark(userId) : null))

  // Si cambia la cuenta (cerrar sesión y entrar con otra), se vuelve a leer su marca
  useEffect(() => {
    setMark(userId ? readMark(userId) : null)
  }, [userId])

  // Solo preguntamos al servidor si en este dispositivo no consta nada
  const status = useQuery({
    queryKey: ['onboarding', userId],
    enabled: Boolean(userId) && mark === null,
    staleTime: Infinity,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.from('profiles').select('onboarded_at').eq('id', userId!).single()
      if (error) throw error
      return (data as { onboarded_at: string | null }).onboarded_at
    },
  })

  // Si el servidor ya lo sabía (lo vio en otro dispositivo), lo apuntamos aquí también
  useEffect(() => {
    if (userId && mark === null && typeof status.data === 'string') {
      writeMark(userId, 'done')
      setMark('done')
    }
  }, [userId, mark, status.data])

  // Quedó pendiente de avisar (sin conexión la otra vez): se reintenta en silencio
  useEffect(() => {
    if (userId && mark === 'pending') {
      tellServer(userId)
        .then(() => setMark('done'))
        .catch(() => {})
    }
  }, [userId, mark])

  const finish = useCallback(() => {
    setReplay(false)
    if (!userId) return
    if (mark !== 'done') {
      writeMark(userId, 'pending')
      setMark('pending') // el efecto de arriba avisa al servidor
    }
    queryClient.setQueryData(['onboarding', userId], new Date().toISOString())
  }, [userId, mark, queryClient])

  const auto = shouldShowTour(mark, status.isSuccess ? status.data : undefined)
  return { open: Boolean(userId) && (auto || replay), replay, finish }
}
