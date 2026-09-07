import { Bike, Footprints, Waves } from 'lucide-react'
import type { Discipline } from './types'

export const disciplineColors = {
  swim: 'var(--primary)',
  bike: '#a45f00',
  run: 'var(--destructive)',
} satisfies Record<Discipline, string>

export const disciplineIcons = { swim: Waves, bike: Bike, run: Footprints }
export const disciplines = ['swim', 'bike', 'run'] as const

export function formatTrainingDuration(seconds: number | null) {
  if (seconds === null) return '—'
  const minutes = Math.round(seconds / 60)
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}`.trim()
    : `${minutes} min`
}
