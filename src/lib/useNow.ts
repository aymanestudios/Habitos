import { useEffect, useState } from 'react'

// La hora actual, refrescada cada medio minuto y al volver a la app (para que "atrasado" y "hoy" estén al día).
export function useNow(everyMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const update = () => setNow(new Date())
    const timer = window.setInterval(update, everyMs)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [everyMs])

  return now
}
