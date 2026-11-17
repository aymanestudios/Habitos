// El fuego de una racha compartida: TODO sale de los días (nada se guarda en la base de datos).
// TypeScript puro: sin React, se puede probar y reutilizar.

export type FirePalette = {
  outer: string // capa exterior
  mid: string // capa media
  core: string // corazón (lo más claro)
  tip: string // puntas
  glow: string // resplandor
}

export type FireStage = {
  index: number
  min: number // primer día de la etapa
  max: number // último día (Infinity en la legendaria)
  name: string // "Fuego rojo"
  unlock: string // "el fuego rojo" (para "6 días para desbloquear el fuego rojo")
  palette: FirePalette
}

export const FIRE_STAGES: FireStage[] = [
  { index: 0, min: 1, max: 25, name: 'Fuego inicial', unlock: 'el fuego inicial',
    palette: { outer: '#f97316', mid: '#fb923c', core: '#fde68a', tip: '#fdba74', glow: '#fb923c' } },
  { index: 1, min: 26, max: 50, name: 'Fuego intensificado', unlock: 'el fuego intensificado',
    palette: { outer: '#ea580c', mid: '#f97316', core: '#fef08a', tip: '#fb923c', glow: '#f97316' } },
  { index: 2, min: 51, max: 100, name: 'Fuego rojo', unlock: 'el fuego rojo',
    palette: { outer: '#dc2626', mid: '#f0541a', core: '#fde047', tip: '#ef4444', glow: '#ef4444' } },
  { index: 3, min: 101, max: 150, name: 'Fuego rojo y morado', unlock: 'el fuego rojo y morado',
    palette: { outer: '#b91c1c', mid: '#ea580c', core: '#fcd34d', tip: '#a855f7', glow: '#db2777' } },
  { index: 4, min: 151, max: 200, name: 'Fuego morado', unlock: 'el fuego morado',
    palette: { outer: '#7c3aed', mid: '#a855f7', core: '#f5d0fe', tip: '#c084fc', glow: '#a855f7' } },
  { index: 5, min: 201, max: 250, name: 'Fuego morado y azul', unlock: 'el fuego morado y azul',
    palette: { outer: '#6d28d9', mid: '#6366f1', core: '#e0e7ff', tip: '#3b82f6', glow: '#818cf8' } },
  { index: 6, min: 251, max: 299, name: 'Fuego azul', unlock: 'el fuego azul',
    palette: { outer: '#2563eb', mid: '#0ea5e9', core: '#e0f2fe', tip: '#22d3ee', glow: '#38bdf8' } },
  { index: 7, min: 300, max: Infinity, name: 'Fuego legendario', unlock: 'el fuego legendario',
    palette: { outer: '#1d4ed8', mid: '#06b6d4', core: '#f0fdff', tip: '#a78bfa', glow: '#22d3ee' } },
]

export const LEGENDARY_DAY = 300
const BLEND_MAX = 0.75 // al final de una etapa ya lleva un 75 % del color de la siguiente; el resto, al desbloquearla

/** Etapa que corresponde a un número de días (0 días = fuego por encender, etapa inicial). */
export function stageFor(days: number): FireStage {
  const d = Math.max(0, Math.floor(days))
  return FIRE_STAGES.find((stage) => d >= stage.min && d <= stage.max) ?? FIRE_STAGES[0]
}

/** Días de la etapa en los que se va mezclando el color de la siguiente (5 en las de 25 días, 10 en las de 50). */
export function blendWindow(stage: FireStage): number {
  if (!Number.isFinite(stage.max)) return 0
  const length = stage.max - stage.min + 1
  return Math.min(10, Math.max(5, Math.round(length * 0.2)))
}

/** 0..1: cuánto color de la siguiente etapa se mezcla ya (suave, acelera al final). */
export function blendAmount(days: number): number {
  const stage = stageFor(days)
  const window = blendWindow(stage)
  if (window === 0) return 0
  const start = stage.max - window // el día anterior al primero que mezcla
  if (days <= start) return 0
  const t = Math.min(1, (days - start) / window)
  return Math.pow(t, 1.4) * BLEND_MAX
}

/** 0..1: avance dentro de la etapa (la legendaria sigue creciendo despacio hasta el día 400). */
export function stageProgress(days: number): number {
  const stage = stageFor(days)
  const d = Math.max(stage.min, days)
  const max = Number.isFinite(stage.max) ? stage.max : 400
  return Math.min(1, (d - stage.min) / Math.max(1, max - stage.min))
}

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** Mezcla dos colores #rrggbb (t = 0 → a, t = 1 → b). */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const k = Math.min(1, Math.max(0, t))
  return `#${ca
    .map((channel, i) => Math.round(channel + (cb[i] - channel) * k).toString(16).padStart(2, '0'))
    .join('')}`
}

export type FireLook = {
  days: number
  lit: boolean // false = 0 días: brasa a la espera
  stage: FireStage
  next: FireStage | null
  palette: FirePalette // ya mezclada con la siguiente etapa
  blend: number
  progress: number // 0..1 dentro de la etapa
  intensity: number // 0..1 en todo el recorrido (tamaño, brillo, velocidad)
  scale: number // tamaño de la llama
  particles: number // brasas que suben
  sparks: number // chispas (desde el fuego rojo)
  tongues: boolean // lenguas laterales (desde el fuego rojo)
  halo: boolean // aro de luz (fuego legendario)
  daysToNext: number | null
}

const PARTICLES = [2, 4, 5, 6, 7, 8, 10, 12]
const SPARKS = [0, 0, 3, 4, 5, 6, 7, 9]

export function fireLook(rawDays: number): FireLook {
  const days = Math.max(0, Math.floor(rawDays))
  const stage = stageFor(days)
  const next = FIRE_STAGES[stage.index + 1] ?? null
  const blend = next ? blendAmount(days) : 0
  const base = stage.palette
  const palette: FirePalette = next
    ? {
        outer: mixHex(base.outer, next.palette.outer, blend),
        mid: mixHex(base.mid, next.palette.mid, blend),
        core: mixHex(base.core, next.palette.core, blend),
        tip: mixHex(base.tip, next.palette.tip, blend),
        glow: mixHex(base.glow, next.palette.glow, blend),
      }
    : base
  const progress = days === 0 ? 0 : stageProgress(days)
  const intensity = days === 0 ? 0 : Math.min(1, (stage.index + progress) / FIRE_STAGES.length)
  return {
    days,
    lit: days > 0,
    stage,
    next,
    palette,
    blend,
    progress,
    intensity,
    scale: days === 0 ? 0.55 : 0.7 + intensity * 0.32,
    particles: days === 0 ? 0 : PARTICLES[stage.index] + (progress > 0.5 ? 1 : 0),
    sparks: SPARKS[stage.index],
    tongues: stage.index >= 2,
    halo: stage.index >= 7,
    daysToNext: next ? next.min - days : null,
  }
}

/** "6 días para desbloquear el fuego morado" · "¡Fuego legendario desbloqueado!" */
export function milestoneText(days: number): string {
  const look = fireLook(days)
  if (!look.next || look.daysToNext === null) return '¡Fuego legendario! Una racha extraordinaria.'
  const n = look.daysToNext
  return `${n} ${n === 1 ? 'día' : 'días'} para desbloquear ${look.next.unlock}`
}

/** % de avance hacia la siguiente etapa (para la barra). */
export function progressToNext(days: number): number {
  const look = fireLook(days)
  if (!look.next) return 100
  const from = look.stage.index === 0 ? 0 : look.stage.min - 1
  return Math.round(((days - from) / (look.next.min - 1 - from)) * 100)
}
