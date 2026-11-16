// Confeti hecho a mano: sin librerías, solo elementos del navegador y la API de animaciones (Web Animations).
// Se usa en dos momentos: un chispazo pequeño al marcar un hábito y una explosión al completar el día.

type BurstOptions = {
  count?: number // cuántas piezas
  power?: number // 1 = normal; más = llegan más lejos
}

// Colores de la marca, leídos de las variables CSS para que sigan el modo claro u oscuro
const COLOR_VARIABLES = ['--brand', '--accent', '--good', '--brand-ink']

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Lanza confeti desde un punto de la pantalla (en píxeles, como clientX / clientY). */
export function burst(x: number, y: number, { count = 24, power = 1 }: BurstOptions = {}): void {
  if (typeof window === 'undefined' || prefersReducedMotion()) return

  const styles = getComputedStyle(document.documentElement)
  const colors = COLOR_VARIABLES.map((name) => styles.getPropertyValue(name).trim()).filter(Boolean)
  if (colors.length === 0) return

  // Una capa transparente por encima de todo, que deja pasar los toques
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden'
  document.body.appendChild(layer)

  let remaining = count
  const cleanup = () => layer.remove()
  window.setTimeout(cleanup, 3000) // por si el navegador pausa las animaciones (pestaña oculta)

  for (let index = 0; index < count; index++) {
    const piece = document.createElement('span')
    const size = 6 + Math.random() * 6
    const round = Math.random() < 0.4
    piece.style.cssText =
      `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${round ? size : size * 0.5}px;` +
      `border-radius:${round ? '50%' : '2px'};background:${colors[index % colors.length]}`
    layer.appendChild(piece)

    // Salen hacia arriba en abanico y acaban cayendo
    const angle = ((-90 + (Math.random() - 0.5) * 140) * Math.PI) / 180
    const distance = (80 + Math.random() * 140) * power
    const dx = Math.cos(angle) * distance
    const dy = Math.sin(angle) * distance
    const fall = 120 + Math.random() * 120
    const spin = (Math.random() - 0.5) * 720

    const animation = piece.animate(
      [
        { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${spin / 2}deg)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + fall}px)) rotate(${spin}deg)`,
          opacity: 0,
        },
      ],
      { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' },
    )
    animation.onfinish = () => {
      remaining -= 1
      if (remaining === 0) cleanup()
    }
  }
}

/** Lanza confeti desde el centro de un elemento de la página (por ejemplo, el círculo de un hábito). */
export function burstFrom(element: Element | null, options?: BurstOptions): void {
  if (!element) return
  const box = element.getBoundingClientRect()
  burst(box.left + box.width / 2, box.top + box.height / 2, options)
}
