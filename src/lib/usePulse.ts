import { useEffect, useRef, useState } from 'react'

/**
 * Devuelve true durante un instante (por defecto 0,7 s) justo cuando `flag` pasa de false a true.
 * No dispara al cargar la pantalla: así los hábitos ya hechos no "saltan" todos a la vez al abrir la app.
 */
export function usePulse(flag: boolean, ms = 700): boolean {
  const [pulse, setPulse] = useState(false)
  const previous = useRef(flag)

  useEffect(() => {
    const turnedOn = flag && !previous.current
    previous.current = flag
    if (!turnedOn) {
      setPulse(false)
      return
    }
    setPulse(true)
    const timer = window.setTimeout(() => setPulse(false), ms)
    return () => window.clearTimeout(timer)
  }, [flag, ms])

  return pulse
}
