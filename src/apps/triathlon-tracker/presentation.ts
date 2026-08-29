import type { Discipline } from '@/apps/triathlon-tracker/types'

export const disciplineColors = {
  swim: 'var(--primary)',
  bike: '#a45f00',
  run: 'var(--destructive)',
} satisfies Record<Discipline, string>
