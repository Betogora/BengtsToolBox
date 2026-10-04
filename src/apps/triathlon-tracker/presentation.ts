import { Bike, Footprints, Waves } from 'lucide-react'
import type { Discipline } from './types'
import { formatTrainingDurationInput } from './domain/units'

export const disciplineColors = {
  swim: '#236492',
  bike: '#94610c',
  run: '#ad4938',
} satisfies Record<Discipline, string>

export const disciplineIcons = { swim: Waves, bike: Bike, run: Footprints }
export const disciplines = ['swim', 'bike', 'run'] as const

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
