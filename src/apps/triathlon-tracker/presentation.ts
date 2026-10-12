import { Bike, Footprints, Waves } from 'lucide-react'
import type { Discipline } from './types'
import { formatTrainingDurationInput } from './domain/units'

// Gleiche Werte wie --sport-color in triathlon-tracker.css; beide gemeinsam ändern.
export const disciplineColors = {
  swim: '#2f7fb8',
  bike: '#c58a12',
  run: '#c4563d',
} satisfies Record<Discipline, string>

// Gleiche Werte wie --sport-fill in triathlon-tracker.css: dunklere Töne, auf
// denen weiße Schrift WCAG AA erfüllt (Plankarten, Achsen-Badges).
export const disciplineFillColors = {
  swim: '#2a72a6',
  bike: '#97680c',
  run: '#b04a33',
} satisfies Record<Discipline, string>

// Genau ein Icon je Disziplin; Varianten wie Gehen erhalten kein eigenes.
export const disciplineIcons = { swim: Waves, bike: Bike, run: Footprints }
export const disciplines = ['swim', 'bike', 'run'] as const

type TrainingKind = { discipline: Discipline; isWalk?: boolean }

export function trainingLabelKey(training: TrainingKind) {
  return training.isWalk
    ? ('triathlon.variant.walk' as const)
    : (`triathlon.discipline.${training.discipline}` as const)
}

export function formatTrainingDuration(seconds: number | null) {
  if (seconds === null) return '—'
  if (seconds % 60 !== 0) {
    return formatTrainingDurationInput(seconds)
  }
  const minutes = Math.round(seconds / 60)
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}`.trim()
    : `${minutes} min`
}
