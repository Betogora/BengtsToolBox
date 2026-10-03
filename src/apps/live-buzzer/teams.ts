import { appTeams } from '@/apps/shared/teams'
import type { BuzzerTeamId } from './types'

export const buzzerTeams = [
  ...appTeams.map((team) => ({ ...team, className: `${team.className} text-foreground` })),
  {
    id: 'red' as const,
    name: 'Rot',
    nameKey: 'liveBuzzer.teamRed' as const,
    className: 'border-destructive/30 bg-destructive/10 text-foreground',
    dotClassName: 'bg-destructive',
  },
]

export function isBuzzerTeamId(value: unknown): value is BuzzerTeamId {
  return value === 'blue' || value === 'yellow' || value === 'red'
}
