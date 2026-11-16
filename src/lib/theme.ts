// TEMA: claro, oscuro o automático (el del sistema). La elección se guarda en este dispositivo.
// Funciona poniendo data-theme="light" | "dark" en <html>; los colores están en styles/index.css.
import { useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'auto'

const KEY = 'pg-theme'
const BG = { light: '#f7f3e9', dark: '#0f1b1c' } // igual que --bg, para la barra del navegador/iPhone

export function getThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // almacenamiento bloqueado (modo privado): se usa automático
  }
  return 'auto'
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(choice: ThemeChoice): 'light' | 'dark' {
  return choice === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : choice
}

export function applyTheme(choice: ThemeChoice, animate = false): void {
  const root = document.documentElement
  const resolved = resolveTheme(choice)
  if (root.dataset.theme === resolved) return
  if (animate) {
    root.classList.add('theme-switching')
    window.setTimeout(() => root.classList.remove('theme-switching'), 400)
  }
  root.dataset.theme = resolved
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', BG[resolved]))
}

export function setThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch {
    // sin almacenamiento: el tema se aplica igual, pero no se recordará
  }
  applyTheme(choice, true)
}

/** Para el selector de Perfil. En "automático" sigue al sistema en directo. */
export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(getThemeChoice)

  useEffect(() => {
    applyTheme(choice)
    if (choice !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('auto', true)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [choice])

  return [
    choice,
    (next) => {
      setThemeChoice(next)
      setChoice(next)
    },
  ]
}
