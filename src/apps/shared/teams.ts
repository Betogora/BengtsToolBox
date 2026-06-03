export type TeamId = 'blue' | 'yellow'

export const appTeams: {
  id: TeamId
  name: string
  buttonLabel: string
  className: string
  dotClassName: string
}[] = [
  {
    id: 'blue',
    name: 'Blau',
    buttonLabel: 'Team Blau',
    className: 'border-primary/30 bg-primary/10 text-primary',
    dotClassName: 'bg-primary',
  },
  {
    id: 'yellow',
    name: 'Gelb',
    buttonLabel: 'Team Gelb',
    className: 'border-accent/40 bg-accent/20 text-accent-foreground',
    dotClassName: 'bg-accent',
  },
]

export function isTeamId(value: unknown): value is TeamId {
  return value === 'blue' || value === 'yellow'
}
