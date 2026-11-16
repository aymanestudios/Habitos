import { useEffect, useState } from 'react'
import { localDateString } from './dates'

/**
 * La fecha de hoy ('YYYY-MM-DD') en la zona horaria dada.
 * Se actualiza sola al pasar la medianoche o al volver a la app, sin tener que recargar.
 */
export function useToday(timeZone: string): string {
  const [today, setToday] = useState(() => localDateString(new Date(), timeZone))

  useEffect(() => {
    const update = () => setToday(localDateString(new Date(), timeZone))
    update()
    const timer = window.setInterval(update, 30_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [timeZone])

  return today
}
