import type { TranslationKey } from '@/lib/i18n'

export type TeamId = 'blue' | 'yellow'

export const appTeams: {
  id: TeamId
  name: string
  nameKey: TranslationKey
  buttonLabel: string
  buttonLabelKey: TranslationKey
  className: string
  dotClassName: string
}[] = [
  {
    id: 'blue',
    name: 'Blau',
    nameKey: 'common.teamBlue',
    buttonLabel: 'Team Blau',
    buttonLabelKey: 'common.teamBlue',
    className: 'border-primary/30 bg-primary/10 text-primary',
    dotClassName: 'bg-primary',
  },
  {
    id: 'yellow',
    name: 'Gelb',
    nameKey: 'common.teamYellow',
    buttonLabel: 'Team Gelb',
    buttonLabelKey: 'common.teamYellow',
    className: 'border-accent/40 bg-accent/20 text-accent-foreground',
    dotClassName: 'bg-accent',
  },
]

export function isTeamId(value: unknown): value is TeamId {
  return value === 'blue' || value === 'yellow'
}
