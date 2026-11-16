// Logros: se calculan con tus datos reales (get_my_progress). No se guardan aparte: si cumples la condición, lo tienes.
import type { Progress } from './progressRules'

export type Achievement = { id: string; title: string; text: string; unlocked: boolean }

type Rule = { id: string; title: string; text: string; test: (p: Progress) => boolean }

const RULES: Rule[] = [
  { id: 'first', title: 'Primer paso', text: 'Completa 1 hábito', test: (p) => p.habits_done >= 1 },
  { id: 'done10', title: 'Cogiendo ritmo', text: 'Completa 10 hábitos', test: (p) => p.habits_done >= 10 },
  { id: 'done50', title: 'Imparable', text: 'Completa 50 hábitos', test: (p) => p.habits_done >= 50 },
  { id: 'done200', title: 'Leyenda', text: 'Completa 200 hábitos', test: (p) => p.habits_done >= 200 },
  { id: 'streak3', title: 'Tres seguidos', text: 'Racha de 3 días', test: (p) => p.best_streak >= 3 },
  { id: 'streak7', title: 'Semana redonda', text: 'Racha de 7 días', test: (p) => p.best_streak >= 7 },
  { id: 'streak30', title: 'Un mes entero', text: 'Racha de 30 días', test: (p) => p.best_streak >= 30 },
  { id: 'level2', title: 'Subiendo', text: 'Llega al nivel 2', test: (p) => p.level >= 2 },
  { id: 'level5', title: 'En forma', text: 'Llega al nivel 5', test: (p) => p.level >= 5 },
  { id: 'level10', title: 'Élite', text: 'Llega al nivel 10', test: (p) => p.level >= 10 },
]

export function buildAchievements(progress: Progress): Achievement[] {
  return RULES.map(({ test, ...rest }) => ({ ...rest, unlocked: test(progress) }))
}

export function achievementsSummary(list: Achievement[]): string {
  return `${list.filter((item) => item.unlocked).length} de ${list.length}`
}
