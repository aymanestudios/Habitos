// Qué dice y cómo se mueve la mascota según cómo te va. TypeScript puro.
// Tono siempre amable: anima, nunca riñe.

export type MascotMood = 'sleepy' | 'hello' | 'cheer' | 'proud' | 'party' | 'worried' | 'rest' | 'new'

export type MascotInput = {
  hasHabits: boolean
  total: number // hábitos diarios de hoy
  done: number
  streak: number
  hour: number // 0-23, hora local
  date: string // YYYY-MM-DD (para variar la frase cada día)
}

const LINES: Record<MascotMood, string[]> = {
  new: ['¡Hola! Soy tu panda. Crea tu primer hábito y empezamos juntos.'],
  sleepy: ['Buenos días… *bosteza* ¿Empezamos con algo fácil?', 'Aún con legañas, pero listo para ayudarte.'],
  hello: ['¡Hoy es buen día para sumar XP!', 'Un hábito pequeño ya cuenta. ¿Cuál hacemos primero?', '¡Vamos allá! Yo te animo desde aquí.'],
  cheer: ['¡Bien! Ya has empezado, lo más difícil.', 'Sigue así, lo estás haciendo genial.', '¡Paso a paso! Cada uno suma.'],
  proud: ['¡Casi lo tienes! Un empujón más.', 'Estoy muy orgulloso de ti. ¡Falta poquito!'],
  party: ['¡DÍA COMPLETO! 🎉 Eres una máquina.', '¡Todo hecho! Hoy toca celebrarlo.', '¡Lo has clavado! Mañana más.'],
  worried: ['Se acaba el día… ¡tu racha te espera!', 'Aún estás a tiempo. ¡Uno rápido y salvamos la racha!'],
  rest: ['Hoy no toca nada fijo. ¡Disfruta del descanso!', 'Día libre. Recarga pilas.'],
}

function pick(list: string[], seed: string): string {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return list[Math.abs(hash) % list.length]
}

export function mascotMood(input: MascotInput): { mood: MascotMood; text: string } {
  const { hasHabits, total, done, streak, hour, date } = input
  let mood: MascotMood
  if (!hasHabits) mood = 'new'
  else if (total === 0) mood = 'rest'
  else if (done >= total) mood = 'party'
  else if (hour >= 20 && streak > 0 && done / total < 0.7) mood = 'worried'
  else if (done / total >= 0.7) mood = 'proud'
  else if (done > 0) mood = 'cheer'
  else if (hour < 9) mood = 'sleepy'
  else mood = 'hello'

  let text = pick(LINES[mood], `${date}-${mood}`)
  if (mood === 'worried') text = `${text} (${streak} ${streak === 1 ? 'día' : 'días'})`
  return { mood, text }
}

// Animación de la mascota para cada ánimo (clases completas para Tailwind)
export const MOOD_ANIMATION: Record<MascotMood, string> = {
  new: 'animate-hop',
  sleepy: 'animate-breathe',
  hello: 'animate-float',
  cheer: 'animate-hop',
  proud: 'animate-hop',
  party: 'animate-tada',
  worried: 'animate-wiggle',
  rest: 'animate-breathe',
}
