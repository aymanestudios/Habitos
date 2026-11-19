// "+15 XP" que sale de donde has tocado y vuela hasta la barra de nivel (elemento con data-xp-target).
// Imperativo y sin React: no repinta la pantalla en cada fotograma (solo transform y opacity).
// Si la barra no está a la vista, el chip sube y se desvanece en el sitio.

let lastPointer: { x: number; y: number; at: number } | null = null
let listening = false

/** Recuerda dónde tocó el usuario por última vez (para que el XP salga de ahí). */
export function trackPointer(): () => void {
  if (listening || typeof document === 'undefined') return () => {}
  listening = true
  const onDown = (event: PointerEvent) => {
    lastPointer = { x: event.clientX, y: event.clientY, at: Date.now() }
  }
  document.addEventListener('pointerdown', onDown, { capture: true, passive: true })
  return () => {
    listening = false
    document.removeEventListener('pointerdown', onDown, { capture: true })
  }
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function visibleTarget(): HTMLElement | null {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-xp-target]'))
  for (const element of targets) {
    const rect = element.getBoundingClientRect()
    if (rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight) return element
  }
  return null
}

let active = 0

/** Lanza un chip de XP. `amount` es el XP REAL que ha devuelto el servidor (puede ser negativo). */
export function flyXp(amount: number, text?: string, tone?: 'team'): void {
  if (typeof document === 'undefined') return
  if (active >= 3) return // tocando muy rápido: no llenamos la pantalla de chips
  const gain = amount > 0
  const label = text ?? (gain ? `+${amount} XP` : `−${Math.abs(amount)} XP`)

  const recent = tone !== 'team' && lastPointer && Date.now() - lastPointer.at < 4000 ? lastPointer : null
  const startX = recent ? recent.x : window.innerWidth / 2
  const startY = recent ? recent.y : 96

  const chip = document.createElement('div')
  chip.setAttribute('aria-hidden', 'true')
  chip.textContent = label
  chip.className = tone === 'team' ? 'xp-chip xp-chip-team' : gain ? 'xp-chip xp-chip-gain' : 'xp-chip xp-chip-muted'
  chip.style.left = `${startX}px`
  chip.style.top = `${startY}px`
  document.body.appendChild(chip)
  active += 1

  const done = () => {
    chip.remove()
    active = Math.max(0, active - 1)
  }
  window.setTimeout(done, 3000) // por si el navegador pausa la animación

  if (reducedMotion()) {
    chip.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], {
      duration: 1200,
      fill: 'forwards',
    }).onfinish = done
    return
  }

  const target = gain ? visibleTarget() : null
  const rise = { transform: 'translate(-50%, -50%) translateY(-34px) scale(1.08)', opacity: 1, offset: 0.32 }
  if (!target) {
    chip.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
        rise,
        { transform: 'translate(-50%, -50%) translateY(-44px) scale(1)', opacity: 1, offset: 0.7 },
        { transform: 'translate(-50%, -50%) translateY(-60px) scale(1)', opacity: 0 },
      ],
      { duration: text ? 2400 : 1100, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
    ).onfinish = done
    return
  }

  const rect = target.getBoundingClientRect()
  const dx = rect.left + rect.width * 0.55 - startX
  const dy = rect.top + rect.height / 2 - startY
  const animation = chip.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
      rise,
      { transform: 'translate(-50%, -50%) translateY(-34px) scale(1)', opacity: 1, offset: 0.45 },
      { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.45)`, opacity: 0.85 },
    ],
    { duration: 900, easing: 'cubic-bezier(0.55, 0, 0.3, 1)', fill: 'forwards' },
  )
  animation.onfinish = () => {
    done()
    // La barra "recibe" el XP: un destello corto
    target.classList.remove('xp-hit')
    void target.offsetWidth // reinicia la animación si llega otro chip
    target.classList.add('xp-hit')
    window.setTimeout(() => target.classList.remove('xp-hit'), 650)
  }
}
